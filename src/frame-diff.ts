// 24-bit BMP 프레임의 휘도 그리드 비교로 "거의 같은 프레임"을 걸러내는 순수 계층(비전 비용 프리필터)
// 배경: UXP 웹뷰는 Canvas·DecompressionStream이 없어 PNG/JPEG 픽셀 디코드가 불가능하다.
// 대신 Exporter가 무압축 BMP를 내보낼 수 있어(§44 실측) 초소형 BMP로 픽셀 비교를 한다.

export interface BmpFrame {
  width: number;
  height: number;
  /** BGR 픽셀 시작 오프셋·행 스트라이드·상하 방향을 캡슐화한 휘도 조회. */
  lumaAt(x: number, y: number): number;
}

export interface FrameSamplePlan {
  /** 비전에 실제로 보낼 프레임 인덱스(입력 순서 기준). */
  keptIndices: number[];
  /** 스킵된 프레임 — 감지 결과를 복제할 원본 시각과 함께. */
  reused: Array<{ time: number; fromTime: number }>;
}

export const FRAME_DIFF_GRID_COLS = 16;
export const FRAME_DIFF_GRID_ROWS = 9;
/** 정규화(0..1) 평균 휘도차가 이 값 미만이면 같은 샷의 같은 그림으로 본다(실측: 동일 샷 ~0.01, 컷 경계 ≥0.08). */
export const FRAME_DIFF_DEFAULT_THRESHOLD = 0.02;

function readU16(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! | (bytes[offset + 1]! << 8);
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (bytes[offset]! | (bytes[offset + 1]! << 8) | (bytes[offset + 2]! << 16)) + bytes[offset + 3]! * 0x1000000;
}

function readI32(bytes: Uint8Array, offset: number): number {
  const value = readU32(bytes, offset);
  return value > 0x7fffffff ? value - 0x100000000 : value;
}

/**
 * 내보낸 프레임 파일이 끝까지 기록됐는지 검사한다 — Exporter는 성공 반환 후에도 파일을 늦게
 * 쓰므로(§44 실측) 비어있지 않아도 잘린 파일일 수 있다. PNG는 IEND 트레일러, BMP는 헤더의
 * 선언 크기로 판정한다. 잘린 이미지를 비전 API에 보내면 요청 전체가 거부된다.
 */
export function looksCompleteImage(bytes: Uint8Array, kind: "png" | "bmp"): boolean {
  if (kind === "png") {
    if (bytes.byteLength < 20) return false;
    const magic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (!magic.every((value, index) => bytes[index] === value)) return false;
    const trailer = [0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82];
    const base = bytes.byteLength - trailer.length;
    return trailer.every((value, index) => bytes[base + index] === value);
  }
  if (bytes.byteLength < 54 || bytes[0] !== 0x42 || bytes[1] !== 0x4d) return false;
  const declaredSize = readU32(bytes, 2);
  return declaredSize === 0 || bytes.byteLength >= declaredSize;
}

/**
 * 24-bit 무압축 BMP(BITMAPINFOHEADER)를 해석한다. 그 외 형식은 null — 호출자는
 * 필터 없이 전량 전송으로 폴백해야 한다(프리필터는 정확성보다 안전이 우선).
 */
export function parseBmp24(bytes: Uint8Array): BmpFrame | null {
  if (bytes.byteLength < 54 || bytes[0] !== 0x42 || bytes[1] !== 0x4d) return null;
  const dataOffset = readU32(bytes, 10);
  const headerSize = readU32(bytes, 14);
  if (headerSize < 40) return null;
  const width = readI32(bytes, 18);
  const heightRaw = readI32(bytes, 22);
  const bitCount = readU16(bytes, 28);
  const compression = readU32(bytes, 30);
  if (width <= 0 || heightRaw === 0 || bitCount !== 24 || compression !== 0) return null;
  const height = Math.abs(heightRaw);
  const bottomUp = heightRaw > 0;
  const stride = Math.ceil((width * 3) / 4) * 4;
  if (dataOffset + stride * height > bytes.byteLength) return null;
  return {
    width,
    height,
    lumaAt(x: number, y: number): number {
      const row = bottomUp ? height - 1 - y : y;
      const offset = dataOffset + row * stride + x * 3;
      // BGR → ITU-R 601 휘도 근사.
      return 0.114 * bytes[offset]! + 0.587 * bytes[offset + 1]! + 0.299 * bytes[offset + 2]!;
    },
  };
}

/** 프레임을 cols×rows 셀 평균 휘도 그리드(0..255)로 축약한다. */
export function lumaGrid(frame: BmpFrame, cols = FRAME_DIFF_GRID_COLS, rows = FRAME_DIFF_GRID_ROWS): Float64Array {
  const grid = new Float64Array(cols * rows);
  for (let cellY = 0; cellY < rows; cellY += 1) {
    const y0 = Math.floor((cellY * frame.height) / rows);
    const y1 = Math.max(y0 + 1, Math.floor(((cellY + 1) * frame.height) / rows));
    for (let cellX = 0; cellX < cols; cellX += 1) {
      const x0 = Math.floor((cellX * frame.width) / cols);
      const x1 = Math.max(x0 + 1, Math.floor(((cellX + 1) * frame.width) / cols));
      let sum = 0;
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) sum += frame.lumaAt(x, y);
      }
      grid[cellY * cols + cellX] = sum / ((y1 - y0) * (x1 - x0));
    }
  }
  return grid;
}

/**
 * 에지(윤곽) 격자 — `lumaGrid`와 같은 16×9 셀에 **밝기 대신 기울기 크기**를 담는다.
 *
 * 픽셀마다 중심차분 |dx| + |dy|를 구해 셀 평균을 낸다(테두리 1픽셀은 0). 같은 프레임에서
 * `lumaGrid`와 나란히 뽑히므로 **프레임 내보내기 비용이 0**이다(`bandRow`와 같은 선례).
 *
 * 배경 합성 앵커가 luma에서 뱅크와 멀어지는 문제를 겨냥한다 — 진행자 의상·조명은 밝기를
 * 바꾸지만 인물 윤곽 구조는 유지되기 때문이다(기전은 추론, 미검증). 오프라인 실측(23회차,
 * 제품 후보 생성기에 매처만 교체한 공정 비교): 무료 경로 F1 88.7 → 97.8, 23회차 18↑·0↓,
 * **19/19에서 놓치는 라벨이 luma가 놓치는 것의 진부분집합**.
 *
 * **아직 제품 판정 경로에 쓰이지 않는다** — Premiere `exportSequenceFrame` 프레임에서
 * 에지가 ffmpeg 디코드와 얼마나 다른지 미측정이고(luma는 평균 12/255·최대 189 차이가
 * 실측됐다), 에지는 고주파 통계라 더 민감할 수 있다. 그 측정을 위한 진단용으로 먼저 넣는다.
 */
export function edgeGrid(frame: BmpFrame, cols = FRAME_DIFF_GRID_COLS, rows = FRAME_DIFF_GRID_ROWS): Float64Array {
  const { width, height } = frame;
  const magnitude = new Float64Array(width * height);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      magnitude[y * width + x] =
        Math.abs(frame.lumaAt(x + 1, y) - frame.lumaAt(x - 1, y)) +
        Math.abs(frame.lumaAt(x, y + 1) - frame.lumaAt(x, y - 1));
    }
  }
  const grid = new Float64Array(cols * rows);
  for (let cellY = 0; cellY < rows; cellY += 1) {
    const y0 = Math.floor((cellY * height) / rows);
    const y1 = Math.max(y0 + 1, Math.floor(((cellY + 1) * height) / rows));
    for (let cellX = 0; cellX < cols; cellX += 1) {
      const x0 = Math.floor((cellX * width) / cols);
      const x1 = Math.max(x0 + 1, Math.floor(((cellX + 1) * width) / cols));
      let sum = 0;
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) sum += magnitude[y * width + x]!;
      }
      grid[cellY * cols + cellX] = sum / ((y1 - y0) * (x1 - x0));
    }
  }
  return grid;
}

/** 띠 영역의 비율 좌표(0..1) — bandRow가 프레임 크기와 무관하게 같은 영역을 읽게 한다. */
export interface BandRegion {
  x0r: number;
  x1r: number;
  y0r: number;
  y1r: number;
}

/** 하단 헤드라인 띠(§110) — 1080 기준 하단 배너 위치. */
export const BOTTOM_BAND_REGION: BandRegion = { x0r: 9 / 96, x1r: 89 / 96, y0r: 44 / 54, y1r: 50 / 54 };
/**
 * 띠 영역의 휘도 벡터(§110) — 스캔 프레임(96px 폭 BMP)에서 지정 비율 영역을 cols×rows 셀
 * 평균으로 뽑는다. 기본은 하단 헤드라인 띠(80×6): 띠 텍스트가 바뀌면 이 벡터가 크게 변하고,
 * 새 헤드라인은 이후 수십 초 유지된다 — 8회차 실측 재현 96%(런북 §109). 추가 프레임 내보내기 없이 스캔 BMP를 재사용한다.
 */
export function bandRow(frame: BmpFrame, cols = 80, rows = 6, region: BandRegion = BOTTOM_BAND_REGION): Float64Array {
  const band = new Float64Array(cols * rows);
  const { x0r, x1r, y0r, y1r } = region;
  const bx0 = Math.floor(frame.width * x0r);
  const bx1 = Math.max(bx0 + cols, Math.floor(frame.width * x1r));
  const by0 = Math.floor(frame.height * y0r);
  const by1 = Math.max(by0 + rows, Math.floor(frame.height * y1r));
  for (let cellY = 0; cellY < rows; cellY += 1) {
    const y0 = by0 + Math.floor((cellY * (by1 - by0)) / rows);
    const y1 = Math.max(y0 + 1, by0 + Math.floor(((cellY + 1) * (by1 - by0)) / rows));
    for (let cellX = 0; cellX < cols; cellX += 1) {
      const x0 = bx0 + Math.floor((cellX * (bx1 - bx0)) / cols);
      const x1 = Math.max(x0 + 1, bx0 + Math.floor(((cellX + 1) * (bx1 - bx0)) / cols));
      let sum = 0;
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) sum += frame.lumaAt(Math.min(x, frame.width - 1), Math.min(y, frame.height - 1));
      }
      band[cellY * cols + cellX] = sum / ((y1 - y0) * (x1 - x0));
    }
  }
  return band;
}

/** 두 그리드의 평균 절대 휘도차를 0..1로 정규화해 돌려준다. 크기가 다르면 1(무조건 다름). */
export function frameDifference(a: Float64Array, b: Float64Array): number {
  if (a.length !== b.length || a.length === 0) return 1;
  let sum = 0;
  for (let index = 0; index < a.length; index += 1) sum += Math.abs(a[index]! - b[index]!);
  return sum / a.length / 255;
}

/**
 * 스킵된 시각에 원본 시각의 감지 샘플을 복제해 시간축 연속성을 복원한다
 * (스팬 계획이 스킵 구간을 "샘플 없음"이 아니라 "같은 위치"로 보게 한다).
 */
export function cloneSamplesForReusedTimes<T extends { time: number }>(
  samples: readonly T[],
  reused: ReadonlyArray<{ time: number; fromTime: number }>,
): T[] {
  const byTime = new Map(samples.map((sample) => [sample.time, sample]));
  const out = [...samples];
  for (const entry of reused) {
    const source = byTime.get(entry.fromTime);
    if (source && !byTime.has(entry.time)) out.push({ ...source, time: entry.time });
  }
  return out.sort((a, b) => a.time - b.time);
}

/**
 * 시간순 프레임 그리드에서 비전에 보낼 프레임을 고른다 — 직전 채택 프레임과의 차이가
 * threshold 미만이면 스킵하고 그 감지값을 복제하도록 표시한다. grid가 null인 프레임
 * (BMP 해석 실패)은 무조건 채택해 안전을 지킨다.
 */
export function planFrameSampling(
  frames: ReadonlyArray<{ time: number; grid: Float64Array | null }>,
  threshold = FRAME_DIFF_DEFAULT_THRESHOLD,
): FrameSamplePlan {
  const keptIndices: number[] = [];
  const reused: Array<{ time: number; fromTime: number }> = [];
  let lastKeptGrid: Float64Array | null = null;
  let lastKeptTime = Number.NaN;
  frames.forEach((frame, index) => {
    const skippable = frame.grid !== null
      && lastKeptGrid !== null
      && frameDifference(frame.grid, lastKeptGrid) < threshold;
    if (skippable) {
      reused.push({ time: frame.time, fromTime: lastKeptTime });
      return;
    }
    keptIndices.push(index);
    lastKeptGrid = frame.grid;
    lastKeptTime = frame.time;
  });
  return { keptIndices, reused };
}
