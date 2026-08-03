// frame-diff(BMP 휘도 프리필터)·vision-cache(감지 스팬 캐시) 테스트
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  BOTTOM_BAND_REGION,
  FRAME_DIFF_GRID_COLS,
  FRAME_DIFF_GRID_ROWS,
  bandRow,
  cloneSamplesForReusedTimes,
  frameDifference,
  looksCompleteImage,
  lumaGrid,
  parseBmp24,
  planFrameSampling,
} from "../src/frame-diff";
import {
  VISION_CACHE_MAX_ENTRIES,
  VISION_CACHE_TTL_MS,
  loadCachedSpans,
  saveCachedSpans,
} from "../src/vision-cache";
import type { FocalSpan } from "../src/shot-focus";

function writeU32(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

/** 테스트용 24-bit bottom-up BMP 생성기(스트라이드 4바이트 패딩 포함). */
function bmp24(width: number, height: number, pixel: (x: number, y: number) => [number, number, number]): Uint8Array {
  const stride = Math.ceil((width * 3) / 4) * 4;
  const bytes = new Uint8Array(54 + stride * height);
  bytes[0] = 0x42;
  bytes[1] = 0x4d;
  writeU32(bytes, 2, bytes.byteLength);
  writeU32(bytes, 10, 54);
  writeU32(bytes, 14, 40);
  writeU32(bytes, 18, width);
  writeU32(bytes, 22, height);
  bytes[26] = 1;
  bytes[28] = 24;
  writeU32(bytes, 30, 0);
  for (let y = 0; y < height; y += 1) {
    const fileRow = height - 1 - y;
    for (let x = 0; x < width; x += 1) {
      const [red, green, blue] = pixel(x, y);
      const offset = 54 + fileRow * stride + x * 3;
      bytes[offset] = blue;
      bytes[offset + 1] = green;
      bytes[offset + 2] = red;
    }
  }
  return bytes;
}

describe("looksCompleteImage", () => {
  const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const PNG_IEND = [0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82];

  it("accepts a PNG with magic and IEND trailer, rejects truncated payloads", () => {
    const complete = new Uint8Array([...PNG_MAGIC, 1, 2, 3, ...PNG_IEND]);
    assert.equal(looksCompleteImage(complete, "png"), true);
    assert.equal(looksCompleteImage(complete.subarray(0, complete.byteLength - 3), "png"), false);
    assert.equal(looksCompleteImage(new Uint8Array([...PNG_MAGIC, 1, 2]), "png"), false);
    assert.equal(looksCompleteImage(new Uint8Array(0), "png"), false);
  });

  it("checks BMP payloads against the declared header size", () => {
    const bmp = bmp24(4, 2, () => [0, 0, 0]);
    assert.equal(looksCompleteImage(bmp, "bmp"), true);
    assert.equal(looksCompleteImage(bmp.subarray(0, bmp.byteLength - 1), "bmp"), false);
    assert.equal(looksCompleteImage(new Uint8Array([0x42, 0x4d, 0, 0]), "bmp"), false);
  });
});

describe("parseBmp24", () => {
  it("parses dimensions and luma for a bottom-up 24-bit BMP", () => {
    const bmp = parseBmp24(bmp24(4, 2, (x, y) => (y === 0 ? [255, 255, 255] : [0, 0, 0])));
    assert.ok(bmp);
    assert.equal(bmp.width, 4);
    assert.equal(bmp.height, 2);
    assert.ok(Math.abs(bmp.lumaAt(0, 0) - 255) < 0.01); // 윗줄 흰색
    assert.ok(Math.abs(bmp.lumaAt(0, 1)) < 0.01); // 아랫줄 검정
  });

  it("computes ITU-601 luma from BGR channels", () => {
    const bmp = parseBmp24(bmp24(1, 1, () => [255, 0, 0]));
    assert.ok(bmp);
    assert.ok(Math.abs(bmp.lumaAt(0, 0) - 0.299 * 255) < 0.01);
  });

  it("rejects non-BMP, non-24bit, compressed, and truncated inputs", () => {
    assert.equal(parseBmp24(new Uint8Array(10)), null);
    const wrongMagic = bmp24(2, 2, () => [0, 0, 0]);
    wrongMagic[0] = 0x50;
    assert.equal(parseBmp24(wrongMagic), null);
    const thirtyTwoBit = bmp24(2, 2, () => [0, 0, 0]);
    thirtyTwoBit[28] = 32;
    assert.equal(parseBmp24(thirtyTwoBit), null);
    const compressed = bmp24(2, 2, () => [0, 0, 0]);
    writeU32(compressed, 30, 1);
    assert.equal(parseBmp24(compressed), null);
    const truncated = bmp24(4, 4, () => [0, 0, 0]).slice(0, 60);
    assert.equal(parseBmp24(truncated), null);
  });
});

describe("lumaGrid + frameDifference", () => {
  it("returns 0 for identical frames and ~1 for black vs white", () => {
    const black = lumaGrid(parseBmp24(bmp24(32, 18, () => [0, 0, 0]))!);
    const black2 = lumaGrid(parseBmp24(bmp24(32, 18, () => [0, 0, 0]))!);
    const white = lumaGrid(parseBmp24(bmp24(32, 18, () => [255, 255, 255]))!);
    assert.equal(black.length, FRAME_DIFF_GRID_COLS * FRAME_DIFF_GRID_ROWS);
    assert.equal(frameDifference(black, black2), 0);
    assert.ok(frameDifference(black, white) > 0.99);
    assert.equal(frameDifference(black, new Float64Array(3)), 1); // 크기 불일치 = 다름
  });
});

describe("planFrameSampling", () => {
  const grid = (value: number): Float64Array => new Float64Array(4).fill(value);

  it("skips near-identical frames and records reuse from the last kept frame", () => {
    const plan = planFrameSampling([
      { time: 0, grid: grid(100) },
      { time: 1, grid: grid(100.5) }, // ≈ 직전 → 스킵
      { time: 2, grid: grid(200) }, // 컷 → 채택
      { time: 3, grid: grid(100) }, // 다시 컷백 → 채택
    ]);
    assert.deepEqual(plan.keptIndices, [0, 2, 3]);
    assert.deepEqual(plan.reused, [{ time: 1, fromTime: 0 }]);
  });

  it("always keeps frames whose grid is unavailable", () => {
    const plan = planFrameSampling([
      { time: 0, grid: grid(50) },
      { time: 1, grid: null },
      { time: 2, grid: grid(50) }, // 직전 채택(null 그리드)과 비교 불가 → 채택
    ]);
    assert.deepEqual(plan.keptIndices, [0, 1, 2]);
    assert.deepEqual(plan.reused, []);
  });
});

describe("cloneSamplesForReusedTimes", () => {
  it("clones detection samples onto skipped times and keeps time order", () => {
    const samples = [
      { time: 0, x: 0.3, y: 0.5 },
      { time: 2, x: 0.7, y: 0.5 },
    ];
    const expanded = cloneSamplesForReusedTimes(samples, [
      { time: 1, fromTime: 0 },
      { time: 5, fromTime: 9 }, // 원본 없음 → 무시
      { time: 2, fromTime: 0 }, // 이미 실측 존재 → 무시
    ]);
    assert.deepEqual(expanded.map((sample) => sample.time), [0, 1, 2]);
    assert.equal(expanded[1]!.x, 0.3);
  });
});

describe("vision-cache", () => {
  let storage: Storage;
  const span = (start: number, end: number): FocalSpan => ({ start, end, x: 0.4, y: 0.5 });
  beforeEach(() => {
    const map = new Map<string, string>();
    storage = {
      get length() { return map.size; },
      clear: () => map.clear(),
      getItem: (key: string) => map.get(key) ?? null,
      key: (index: number) => [...map.keys()][index] ?? null,
      removeItem: (key: string) => { map.delete(key); },
      setItem: (key: string, value: string) => { map.set(key, value); },
    } as Storage;
  });

  it("round-trips spans and returns a safe copy", () => {
    saveCachedSpans("k1", [span(0, 10), { ...span(10, 20), zoom: 1.3, transition: "cut" }], storage, 1000);
    const loaded = loadCachedSpans("k1", storage, 2000);
    assert.equal(loaded?.length, 2);
    assert.equal(loaded?.[1]?.zoom, 1.3);
    loaded![0]!.x = 0.99;
    assert.equal(loadCachedSpans("k1", storage, 2000)?.[0]?.x, 0.4);
  });

  it("expires entries after the TTL and replaces same keys", () => {
    saveCachedSpans("k1", [span(0, 10)], storage, 1000);
    assert.ok(loadCachedSpans("k1", storage, 1000 + VISION_CACHE_TTL_MS));
    assert.equal(loadCachedSpans("k1", storage, 1001 + VISION_CACHE_TTL_MS), null);
    saveCachedSpans("k1", [span(5, 15)], storage, 2000);
    assert.equal(loadCachedSpans("k1", storage, 3000)?.[0]?.start, 5);
  });

  it("caps entries and rejects invalid spans/corrupt storage", () => {
    for (let index = 0; index < VISION_CACHE_MAX_ENTRIES + 6; index += 1) {
      saveCachedSpans(`k${index}`, [span(index, index + 1)], storage, 1000 + index);
    }
    assert.equal(loadCachedSpans("k0", storage, 2000), null); // 가장 오래된 것 밀려남
    assert.ok(loadCachedSpans(`k${VISION_CACHE_MAX_ENTRIES + 5}`, storage, 2000));
    saveCachedSpans("bad", [{ start: 5, end: 5, x: 0.5, y: 0.5 }], storage, 1000);
    assert.equal(loadCachedSpans("bad", storage, 1500), null);
    storage.setItem("shortflow.vision-cache.v1", "{corrupt");
    assert.equal(loadCachedSpans("k1", storage, 1500), null);
    saveCachedSpans("fresh", [span(0, 1)], storage, 1600);
    assert.ok(loadCachedSpans("fresh", storage, 1700));
  });
});

describe("bandRow — 하단 헤드라인 띠 휘도 벡터(§110)", () => {
  // 감사에서 드러난 공백 — 이 함수는 detectBandEvents(띠 이벤트 열)의 유일한 입력인데
  // 픽셀→벡터 변환 자체가 무테스트였다(이벤트 감지는 합성 벡터로만 검증됨).
  const W = 96;
  const H = 54;
  const inBand = (x: number, y: number): boolean =>
    x >= Math.floor(W * BOTTOM_BAND_REGION.x0r) && x < Math.floor(W * BOTTOM_BAND_REGION.x1r)
    && y >= Math.floor(H * BOTTOM_BAND_REGION.y0r) && y < Math.floor(H * BOTTOM_BAND_REGION.y1r);
  const frameWithBand = (bright: boolean): ReturnType<typeof parseBmp24> =>
    parseBmp24(bmp24(W, H, (x, y) => (inBand(x, y) === bright ? [255, 255, 255] : [0, 0, 0])));

  it("기본 크기는 80×6 = 480 셀이다", () => {
    assert.equal(bandRow(frameWithBand(true)!).length, 480);
  });

  it("띠 영역을 읽는다 — 띠만 밝은 프레임은 벡터가 밝고, 띠 밖만 밝은 프레임은 어둡다", () => {
    const bandBright = bandRow(frameWithBand(true)!);
    const outsideBright = bandRow(frameWithBand(false)!);
    const mean = (vector: Float64Array): number => vector.reduce((sum, value) => sum + value, 0) / vector.length;
    assert.ok(mean(bandBright) > 200, `띠 프레임 평균 ${mean(bandBright)}`);
    assert.ok(mean(outsideBright) < 55, `띠 밖 프레임 평균 ${mean(outsideBright)}`);
  });

  it("띠 안 픽셀 변화는 벡터를 바꾸고, 띠 밖 변화는 못 바꾼다 — 이벤트 감지의 전제", () => {
    const base = bandRow(frameWithBand(true)!);
    // 띠 안 왼쪽 절반을 지운 프레임 = 헤드라인 텍스트 교체의 근사.
    const halfCleared = parseBmp24(bmp24(W, H, (x, y) => (inBand(x, y) && x >= W / 2 ? [255, 255, 255] : [0, 0, 0])))!;
    // 띠 밖(상단)만 바뀐 프레임 — 벡터는 그대로여야 한다.
    const outsideChanged = parseBmp24(bmp24(W, H, (x, y) => (inBand(x, y) || y < 10 ? [255, 255, 255] : [0, 0, 0])))!;
    assert.ok(frameDifference(base, bandRow(halfCleared)) > 0.2, "띠 안 변화가 감지돼야 한다");
    assert.equal(frameDifference(base, bandRow(outsideChanged)), 0, "띠 밖 변화는 벡터에 없어야 한다");
  });
});
