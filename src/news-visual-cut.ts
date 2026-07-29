// 자막 없이 화면(앵커 샷)만으로 뉴스 방송을 분할하는 순수 계층 — 후보 도출·정적 꼬리·경계 재스냅
import { frameDifference, type BmpFrame } from "./frame-diff";
import { MAX_NEWS_ITEMS, findShotSegments, mergeShortItemsForward, type NewsItem } from "./news-cut";

export interface GridSample {
  time: number;
  grid: Float64Array | null;
}

/** 긴 샷 후보로 인정하는 최소 샷 길이(초) — 앵커 리드는 통상 8초 이상 이어진다(§62). */
export const VISUAL_LONG_SHOT_MIN_SECONDS = 8;
/** 긴 샷 후보의 참조 가중거리 상한 — 이보다 멀면 앵커일 가능성이 낮아 비전도 안 보낸다. */
export const VISUAL_LONG_SHOT_MAX_DIST = 0.16;
/** 저거리 런 후보 임계 — §62 리드 런 탐지(0.14)보다 살짝 넓혀 짧은 스튜디오 리드를 포함한다. */
export const VISUAL_RUN_MAX_DIST = 0.145;
/** 구독 범퍼(정적 꼬리) 판정 — 인접 프레임 휘도차가 이 값 미만으로 끝까지 이어지면 정적. */
export const VISUAL_STATIC_TAIL_DIFF = 0.02;
/** 정적 꼬리로 인정하는 최소 길이(초) — 16회차 실측에서 범퍼는 14초 이상이었다. */
export const VISUAL_STATIC_TAIL_MIN_SECONDS = 12;

export interface AnchorMatcher {
  distance(grid: ArrayLike<number>): number;
}

/**
 * 참조 그리드 은행으로 분산 가중 매처를 만든다 — 셀별 표준편차가 큰 곳(기사별로 바뀌는
 * 사이드 그래픽·배너)은 자동으로 가중이 낮아져 무시된다(§58 확립).
 */
export function buildAnchorMatcher(referenceGrids: ReadonlyArray<ArrayLike<number>>): AnchorMatcher {
  if (referenceGrids.length === 0) throw new Error("참조 그리드가 없습니다.");
  const cells = referenceGrids[0]!.length;
  const mean = new Array<number>(cells).fill(0);
  for (const grid of referenceGrids) {
    for (let index = 0; index < cells; index += 1) mean[index]! += Number(grid[index]) / referenceGrids.length;
  }
  const std = new Array<number>(cells).fill(0);
  for (const grid of referenceGrids) {
    for (let index = 0; index < cells; index += 1) {
      std[index]! += (Number(grid[index]) - mean[index]!) ** 2 / referenceGrids.length;
    }
  }
  const weights = std.map((value) => 1 / (Math.sqrt(value) + 8));
  const weightSum = weights.reduce((sum, value) => sum + value, 0);
  return {
    distance(grid: ArrayLike<number>): number {
      if (grid.length !== cells) return Number.POSITIVE_INFINITY;
      let best = Number.POSITIVE_INFINITY;
      for (const reference of referenceGrids) {
        let total = 0;
        for (let index = 0; index < cells; index += 1) {
          total += weights[index]! * Math.abs(Number(grid[index]) - Number(reference[index]));
        }
        best = Math.min(best, total / weightSum / 255);
      }
      return best;
    },
  };
}

/**
 * 에피소드 단위 포맷 라우팅 — 스캔 전체에서 최소 거리가 가장 낮은 뱅크 하나를 고른다.
 * 회차는 한 포맷이므로(평일/레터박스/신형) 다른 포맷 뱅크를 섞지 않아 교차 오탐이 없고,
 * 평일 회차는 항상 첫 번째(평일) 뱅크로 라우팅돼 기존 동작이 그대로 보존된다(min 합성은
 * 전 회차 FP 급증으로 기각 — sunday-format-reference-bank.design.md).
 */
/**
 * 학습 범위 밖 경고 임계(§100). 코퍼스 82회차 실측에서 0.10이 실패 회차 2건(F1 47·73)을 모두
 * 포착하고 놓치는 실패가 0이었다(경고 6회차 = 오경보 4). 거리가 높아도 정상인 회차가 있으므로
 * (20260603_Wed 거리 0.110·F1 100) 이것은 실패 판정이 아니라 "결과를 확인하라"는 신호다.
 */
export const BANK_FIT_WARN_DISTANCE = 0.1;

/**
 * 참조 뱅크가 이 회차와 얼마나 맞는지 — 스캔 전체에서 가장 앵커에 가까운 프레임의 거리.
 * 이 값이 크면 뱅크가 회차의 앵커샷을 못 알아본다는 뜻이고, 뱅크 거리는 학습 모델의 특징이기도
 * 해서 후보 생성과 모델이 **함께** 약해진다(§100 — 두 경로가 독립이 아니다).
 */
export function bankFitDistance(samples: readonly GridSample[], matcher: AnchorMatcher): number {
  let best = Number.POSITIVE_INFINITY;
  for (const sample of samples) {
    if (!sample.grid) continue;
    best = Math.min(best, matcher.distance(sample.grid));
  }
  return best;
}

export interface BandSample {
  time: number;
  band: Float64Array | null;
}

/**
 * 하단 띠 이벤트 감지(§110) — "띠가 크게 변한 뒤(changeMin 초과) stableCount 표본 동안
 * 안정(stableMax 미만)"인 시각들. 새 헤드라인 띠는 등장 후 수십 초 유지되고 인용띠·자막은
 * 수 초 단위로 바뀌므로 이 조합이 새 아이템 시작을 가린다(8회차 실측 재현 96% — §109).
 * 이벤트는 minGapSeconds 안에 하나만 남긴다(같은 전환의 중복 발화 방지).
 */
export function detectBandEvents(
  samples: readonly BandSample[],
  { changeMin = 0.1, stableMax = 0.06, stableCount = 4, minGapSeconds = 10 } = {},
): number[] {
  const usable = samples.filter((sample): sample is { time: number; band: Float64Array } => sample.band !== null);
  const events: number[] = [];
  for (let index = 1; index < usable.length - stableCount; index += 1) {
    if (frameDifference(usable[index]!.band, usable[index - 1]!.band) <= changeMin) continue;
    let stable = true;
    for (let k = 0; k < stableCount; k += 1) {
      if (frameDifference(usable[index + k + 1]!.band, usable[index + k]!.band) >= stableMax) { stable = false; break; }
    }
    if (!stable) continue;
    const time = usable[index]!.time;
    if (events.length === 0 || time - events[events.length - 1]! > minGapSeconds) events.push(time);
  }
  return events;
}

export interface RescueProbePlan {
  /** 훑을 시각들 — 이 시각의 프레임이 앵커샷이면 그 앞 컷이 놓친 경계다. */
  times: number[];
  /** 대상이 된 긴 구간(진단 로그용). */
  spans: Array<{ from: number; to: number }>;
}

/**
 * 놓친 경계 회수용 훑기 계획(§101) — 비정상적으로 긴 아이템 안쪽을 균등 간격으로 훑는다.
 *
 * 뱅크 거리·컷 크기 같은 무료 신호는 이 구간에서 원리적으로 실패한다(§100 — 놓친 앵커의 뱅크
 * 거리가 회차 중앙값보다 나쁜 경우까지 있다). 판별 정보는 픽셀에 있으므로 여기서는 **후보를
 * 고르지 않고 균등하게 훑기만** 하고, 앵커 여부 판정은 비전에 맡긴다.
 *
 * 되짚기는 재스냅이 담당한다 — `refineBoundaryToTransition`이 뒤로 최대 36초를 훑고 앞으로는
 * 스냅하지 않으므로, 경계보다 뒤에 있는 훑기 시각을 그대로 넘겨도 컷으로 정확히 당겨진다.
 */
export function planRescueProbes(
  starts: readonly number[],
  endTime: number,
  // maxSpan 100(§101-b 실측): 7/23의 872→982 구간(110s)에 단신 2개가 통째로 숨어 있었다 —
  // 리포트 아이템(105~152s)과 길이가 겹쳐 확률로는 구분할 수 없으므로, 경고 회차에 한해
  // 리포트 길이 구간도 훑는 쪽을 택한다(정상 구간 훑기는 비전이 non-anchor로 자연 소거).
  // 알려진 사각: 단신 2개짜리 60~84s 구간은 여전히 안 잡힌다 — 증거가 생기면 재조정.
  //
  // step 4s(§105-b): §101-b에서 5s로 "≥5s 리드에 프로브 1개"는 보장했지만, 그 1개가 리드
  // **종반**(디졸브 직전)에 걸리면 판정이 실행마다 흔들린다 — 6/28 3회 실행이 각기 다른
  // 1개(841→768)를 놓친 원인. 4s면 리드 시작 4초 안(초중반, 판정 안정 구간)에 프로브 1개가
  // 기하학적으로 보장된다. 비용 +25%는 경고 회차에만 붙는다.
  //
  // 앞 여유 30s(§104 실측): 관측된 회수 FP 2건(6/28 27.25·6/03 35.0)은 모두 프로브가 직전 확정
  // 경계의 **앵커 리드 연장부**(26s 인사 테이크·25s 개표 스튜디오)에 떨어진 경우다 — 프레임
  // 판정은 옳았지만 아이템 경계가 아니다. 리드가 20초를 넘는 특집·일요일 유형을 덮으려면
  // 구간 앞 여유가 30초여야 한다. 길이 임계는 쓰지 않는다(진짜 16~21s 아이템이 코퍼스에 15개).
  //
  // 뒤 여유는 20s 유지(§104-b 실측): 뒤쪽에서 난 FP는 관측 0인데, 뒤를 30으로 늘리면 아웃트로
  // 직전 마지막 단신(6/28 841~872 = 31s)의 리드가 프로브 격자에서 통째로 잘린다 — edge 30 일괄
  // 적용 실행에서 마지막 프로브가 838로 끊겨 명백한 앵커 리드(841~848)를 못 물었다(배치 구성
  // 효과로 오인했으나 A/B 진단으로 기각 — footage 위주 배치에서도 842는 3회 전부 anchor 0.99).
  { maxSpan = 100, stepSeconds = 4, edgeSeconds = 30, tailEdgeSeconds = 20, maxProbes = 250 } = {},
): RescueProbePlan {
  const times: number[] = [];
  const spans: Array<{ from: number; to: number }> = [];
  const bounds = [...starts].sort((a, b) => a - b);
  if (endTime > (bounds.at(-1) ?? 0)) bounds.push(endTime);
  for (let index = 0; index < bounds.length - 1; index += 1) {
    const from = bounds[index]!;
    const to = bounds[index + 1]!;
    if (to - from < maxSpan) continue;
    spans.push({ from, to });
    for (let time = from + edgeSeconds; time <= to - tailEdgeSeconds; time += stepSeconds) {
      if (times.length >= maxProbes) break;
      times.push(Math.round(time * 10) / 10);
    }
  }
  return { times, spans };
}

/** 특수 포맷 뱅크 채택 상한 — 진짜 포맷 일치는 0.001~0.025, 평일 오라우팅은 0.07~0.09 실측(완벽 분리). */
const ROUTE_MAX_DIST = 0.05;
const ROUTE_RATIO = 0.5;

export function selectAnchorMatcher(samples: readonly GridSample[], matchers: readonly AnchorMatcher[]): AnchorMatcher {
  if (matchers.length === 0) throw new Error("선택할 매처가 없습니다.");
  if (matchers.length === 1) return matchers[0]!;
  const minDistOf = (matcher: AnchorMatcher): number => {
    let minDist = Number.POSITIVE_INFINITY;
    for (const sample of samples) {
      if (!sample.grid) continue;
      minDist = Math.min(minDist, matcher.distance(sample.grid));
    }
    return minDist;
  };
  const primary = minDistOf(matchers[0]!);
  let best = 0;
  let bestDist = primary;
  for (let index = 1; index < matchers.length; index += 1) {
    const minDist = minDistOf(matchers[index]!);
    // 기본(평일) 뱅크가 우선 — 특수 뱅크는 압도적으로 가까울 때만 채택(근소 차 오라우팅 방지).
    if (minDist < ROUTE_MAX_DIST && minDist < primary * ROUTE_RATIO && minDist < bestDist) {
      bestDist = minDist;
      best = index;
    }
  }
  return matchers[best]!;
}

/**
 * 프레임 불일치(예: 720p 클립이 1080 시퀀스에 원본 크기로 배치) 감지 — 회차 전 구간에서
 * 고르게 뽑은 프로브 그리드의 상·하단 행(또는 좌·우 열)이 전부 검으면 렌더 테두리 아티팩트로
 * 본다(§73-d 사고의 제품화 가드). 실제 방송 내용은 전 구간이 동시에 검을 수 없다.
 */
export function detectMismatchBorder(
  grids: ReadonlyArray<ArrayLike<number> | null>,
  cols = 16,
  rows = 9,
  darkMax = 6,
): boolean {
  const usable = grids.filter((grid): grid is ArrayLike<number> => !!grid && grid.length === cols * rows);
  if (usable.length < 4) return false;
  const rowDark = (grid: ArrayLike<number>, row: number): boolean => {
    let sum = 0;
    for (let col = 0; col < cols; col += 1) sum += Number(grid[row * cols + col]);
    return sum / cols <= darkMax;
  };
  const colDark = (grid: ArrayLike<number>, col: number): boolean => {
    let sum = 0;
    for (let row = 0; row < rows; row += 1) sum += Number(grid[row * cols + col]);
    return sum / rows <= darkMax;
  };
  const allTopBottom = usable.every((grid) => rowDark(grid, 0) && rowDark(grid, rows - 1));
  const allLeftRight = usable.every((grid) => colDark(grid, 0) && colDark(grid, cols - 1));
  return allTopBottom || allLeftRight;
}

export interface AnchorCandidate {
  time: number;
  refDist: number;
  kind: "shot" | "run";
}

/**
 * 앵커 시작 후보를 모은다 — ①긴 샷(≥8s) 중 참조 거리 상한 이내 ②저거리 연속 런(짧은 스튜디오
 * 리드 포함, §62)의 시작. 같은 지점(±6s)은 하나로 합친다. 후보가 3개 미만이면 참조가 안 통하는
 * 포맷(주말 등)으로 보고 긴 샷 전부를 후보로 넓힌다 — 최종 판정은 비전이 한다.
 */
export function collectAnchorCandidates(samples: readonly GridSample[], matcher: AnchorMatcher): AnchorCandidate[] {
  const usable = samples.filter((sample) => sample.grid);
  const longShots = findShotSegments(usable)
    .filter((shot) => shot.end - shot.start >= VISUAL_LONG_SHOT_MIN_SECONDS)
    .map((shot) => {
      const mid = usable.reduce((best, sample) =>
        Math.abs(sample.time - shot.midTime) < Math.abs(best.time - shot.midTime) ? sample : best, usable[0]!);
      return { time: shot.start, refDist: matcher.distance(mid.grid!) };
    });
  const candidates: AnchorCandidate[] = longShots
    .filter((shot) => shot.refDist < VISUAL_LONG_SHOT_MAX_DIST)
    .map((shot) => ({ ...shot, kind: "shot" as const }));
  // 저거리 런 — 긴 샷 필터가 놓치는 5~8초 스튜디오 리드를 잡는다.
  let run: { start: number; end: number; min: number } | null = null;
  const flushRun = () => {
    if (!run) return;
    const span = run.end - run.start;
    if (span >= 2 && span <= 40 && !candidates.some((candidate) => Math.abs(candidate.time - run!.start) <= 6)) {
      candidates.push({ time: run.start, refDist: run.min, kind: "run" });
    }
    run = null;
  };
  for (const sample of usable) {
    const dist = matcher.distance(sample.grid!);
    if (dist < VISUAL_RUN_MAX_DIST) {
      if (!run) run = { start: sample.time, end: sample.time, min: dist };
      else { run.end = sample.time; run.min = Math.min(run.min, dist); }
    } else {
      flushRun();
    }
  }
  flushRun();
  if (candidates.length < 3) {
    for (const shot of longShots) {
      if (!candidates.some((candidate) => Math.abs(candidate.time - shot.time) <= 6)) {
        candidates.push({ ...shot, kind: "shot" });
      }
    }
  }
  return candidates.sort((left, right) => left.time - right.time);
}

/**
 * 비전 없이 쓸 보수 폴백 — 참조 거리 오름차순에서 가장 큰 간극의 중점(≤0.2)을 임계로 긴 샷만
 * 채택한다(§58 자동 임계). 숨은 단신은 놓칠 수 있어 호출부가 경고를 남긴다.
 */
export function fallbackAnchorTimes(candidates: readonly AnchorCandidate[]): number[] {
  const shots = candidates.filter((candidate) => candidate.kind === "shot")
    .slice()
    .sort((left, right) => left.refDist - right.refDist);
  let threshold = 0;
  let bestGap = 0;
  for (let index = 4; index < Math.min(shots.length - 1, 18); index += 1) {
    const gap = shots[index + 1]!.refDist - shots[index]!.refDist;
    const midpoint = (shots[index]!.refDist + shots[index + 1]!.refDist) / 2;
    if (midpoint > 0.2) continue;
    if (gap > bestGap) { bestGap = gap; threshold = midpoint; }
  }
  return shots.filter((shot) => shot.refDist < threshold).map((shot) => shot.time).sort((a, b) => a - b);
}

/**
 * 숨은 단신 분리로 인정하는 런 후보의 참조 거리 상한 — 16회차 실측에서 참 단신 리드는
 * 0.069~0.124, 확실한 오탐(본회의장 0.073 등)과 완전 분리가 불가능해 보수적으로 잡는다
 * (잘못된 분할(기사 중간 시작)이 병합 누락보다 사용자 체감 결함이 크다 — §59·§61 피드백).
 */
export const VISUAL_RUN_SPLIT_MAX_DIST = 0.085;

/**
 * 완전 무료 앵커 확정 — 자동 임계 긴 샷(주 앵커) + 강한 저거리 런(숨은 단신 리드)을 합친다.
 * 외부 API 없이 화면 매칭만 쓴다. 임계를 넘는 약한 런은 채택하지 않는다(오탐 방지 우선).
 */
export function freeAnchorTimes(candidates: readonly AnchorCandidate[]): number[] {
  const mains = fallbackAnchorTimes(candidates);
  const accepted = [...mains];
  for (const candidate of candidates) {
    if (candidate.kind !== "run" || candidate.refDist >= VISUAL_RUN_SPLIT_MAX_DIST) continue;
    if (accepted.some((time) => Math.abs(time - candidate.time) <= 8)) continue;
    accepted.push(candidate.time);
  }
  return accepted.sort((left, right) => left - right);
}

/** 학습 모델 검출을 채택하는 확률 임계 — LOO 교차검증에서 재현 93%·오분할 최소 지점. */
export const VISUAL_MODEL_TAU = 0.75;

/**
 * 학습된 로지스틱 분류기로 각 샘플의 "앵커 리드" 확률을 계산한다(추론 무료, 외부 API 0회).
 * 특징 = 144셀 luma/255 + 직전·직후 프레임차 + 참조 가중거리×4(학습 시와 동일 구성).
 */
export function scoreAnchorSamples(
  samples: readonly GridSample[],
  matcher: AnchorMatcher,
  modelWeights: readonly number[],
  modelBias: number,
): number[] {
  const usable = samples.filter((sample) => sample.grid);
  const cells = usable[0]?.grid?.length ?? 0;
  if (cells === 0 || modelWeights.length !== cells + 3) return usable.map(() => 0);
  return usable.map((sample, index) => {
    const prev = usable[index - 1];
    const next = usable[index + 1];
    let z = modelBias;
    for (let cell = 0; cell < cells; cell += 1) z += modelWeights[cell]! * (sample.grid![cell]! / 255);
    z += modelWeights[cells]! * (prev ? frameDifference(sample.grid!, prev.grid!) : 1);
    z += modelWeights[cells + 1]! * (next ? frameDifference(sample.grid!, next.grid!) : 1);
    z += modelWeights[cells + 2]! * Math.min(1, matcher.distance(sample.grid!) * 4);
    return 1 / (1 + Math.exp(-z));
  });
}

/** 확률 시계열에서 τ 초과 연속 런(≥2샘플)의 시작들을 앵커 후보 시각으로 돌려준다. */
export function detectModelStarts(
  samples: readonly GridSample[],
  probabilities: readonly number[],
  tau = VISUAL_MODEL_TAU,
): number[] {
  const usable = samples.filter((sample) => sample.grid);
  const detections: number[] = [];
  let run: { start: number; count: number } | null = null;
  for (let index = 0; index < usable.length; index += 1) {
    if ((probabilities[index] ?? 0) > tau) {
      if (!run) run = { start: usable[index]!.time, count: 1 };
      else run.count += 1;
    } else if (run) {
      if (run.count >= 2) detections.push(run.start);
      run = null;
    }
  }
  if (run !== null && (run as { count: number }).count >= 2) detections.push((run as { start: number }).start);
  return detections;
}

/** 하이브리드 확정 — 현행 무료 결정(freeAnchorTimes)에 학습 모델 고신뢰 검출을 합친다(±8s 중복 제거). */
export function hybridAnchorTimes(candidates: readonly AnchorCandidate[], modelStarts: readonly number[]): number[] {
  const accepted = freeAnchorTimes(candidates);
  for (const start of modelStarts) {
    if (!accepted.some((time) => Math.abs(time - start) <= 8)) accepted.push(start);
  }
  return accepted.sort((left, right) => left - right);
}

/**
 * 구독 범퍼 자동 트림 — 스캔 샘플 끝에서 인접 휘도차가 정적 임계 미만으로 이어지는 접미 런이
 * 충분히 길면 그 시작을 마지막 아이템의 끝으로 쓴다(16회차 오프라인 검증 16/16 일치).
 */
export function detectStaticTailStart(samples: readonly GridSample[]): number | null {
  const usable = samples.filter((sample) => sample.grid).sort((left, right) => left.time - right.time);
  if (usable.length < 2) return null;
  let tailStart = usable.at(-1)!.time;
  for (let index = usable.length - 1; index > 0; index -= 1) {
    if (frameDifference(usable[index]!.grid!, usable[index - 1]!.grid!) < VISUAL_STATIC_TAIL_DIFF) {
      tailStart = usable[index - 1]!.time;
    } else {
      break;
    }
  }
  return usable.at(-1)!.time - tailStart >= VISUAL_STATIC_TAIL_MIN_SECONDS ? tailStart : null;
}

/** 확정 앵커 시작 목록을 아이템 구간으로 잇는다 — 마지막 끝은 정적 꼬리 시작(없으면 영상 끝). */
export function buildItemsFromStarts(starts: readonly number[], endTime: number): NewsItem[] {
  const ordered = [...new Set(starts)].sort((left, right) => left - right).filter((start) => start < endTime - 1);
  const items: NewsItem[] = ordered.map((start, index) => ({
    start,
    end: index + 1 < ordered.length ? ordered[index + 1]! : endTime,
    title: `아이템 ${index + 1}`,
  }));
  return mergeShortItemsForward(items).slice(0, MAX_NEWS_ITEMS);
}

export interface RefineOptions {
  /** 정착 프레임과 "실질 동일"로 보는 휘도차 — 전환(디졸브) 종료 판정(§59). */
  sameThreshold?: number;
  /** 경계 앞 역방향 확장 블록 크기·횟수 — 리드가 스캔 창보다 길 때(§61). */
  extensionBlockSeconds?: number;
  extensionBlocks?: number;
}

/**
 * 경계를 전환 컷 종료 시점으로 정밀 재스냅한다(리드 0) — [T-3.5, T+0.5]를 0.25s로 스캔해
 * 정착(T+0.5) 프레임과 처음으로 실질 동일해지는 시점을 찾고, 창 전체가 동일하면(경계가 리드
 * 한가운데) 12s 블록으로 최대 3회 역방향 확장한다. 샘플러 실패 시 원 경계를 그대로 둔다.
 */
export async function refineBoundaryToTransition(
  sampler: (time: number) => Promise<Float64Array | null>,
  boundary: number,
  options: RefineOptions = {},
): Promise<number> {
  const same = options.sameThreshold ?? 0.07;
  const blockSeconds = options.extensionBlockSeconds ?? 12;
  const blocks = options.extensionBlocks ?? 3;
  const step = 0.25;
  const settle = await sampler(Math.round((boundary + 0.5) * 100) / 100);
  if (!settle) return boundary;
  const scanWindow = async (from: number, to: number): Promise<{ time: number; similar: boolean }[]> => {
    const rows: { time: number; similar: boolean }[] = [];
    for (let time = from; time <= to + 0.001; time += step) {
      const rounded = Math.round(time * 100) / 100;
      if (rounded < 0) continue;
      const grid = await sampler(rounded);
      rows.push({ time: rounded, similar: grid ? frameDifference(grid, settle) < same : false });
    }
    return rows;
  };
  const rows = await scanWindow(boundary - 3.5, boundary + 0.5);
  let lastFar = -1;
  for (let index = 0; index < rows.length; index += 1) {
    if (!rows[index]!.similar) lastFar = index;
  }
  if (lastFar >= 0) {
    // 스냅은 뒤로만 — 정착 직전까지 상이하면(전환이 경계 바로 앞에서 끝남) 경계를 유지한다.
    const snapped = lastFar < rows.length - 1 ? rows[lastFar + 1]!.time : boundary;
    return snapped > boundary ? boundary : snapped;
  }
  // 창 전체가 정착과 동일 — 전환이 더 앞에 있다. 블록 단위로 역방향 확장.
  let windowStart = boundary - 3.5;
  for (let block = 1; block <= blocks; block += 1) {
    const from = windowStart - blockSeconds;
    const extended = await scanWindow(from, windowStart - step);
    windowStart = from;
    let farIndex = -1;
    for (let index = 0; index < extended.length; index += 1) {
      if (!extended[index]!.similar) farIndex = index;
    }
    if (farIndex >= 0) {
      return farIndex < extended.length - 1 ? extended[farIndex + 1]!.time : boundary;
    }
  }
  return boundary; // 36s 역방향에도 동일 — 수동 확인 영역, 원 경계 유지
}

// ── 하단 자막 띠(인용·이름표) 감지 — 발언/회견 샷 오검출 배제(anchor-lowerthird-band.plan.md) ──
// 관찰(2026-07-22 실측, 소스 33회차 377경계): 앵커샷의 헤드라인 띠는 흰 바탕에 큰 글자
// (270px 프레임 기준 글리프 세로 22~30행)가 한 덩어리로 들어가고, 발언·회견 순간에는 같은
// 자리가 작은 글자(6~12행)의 인용·이름표 띠로 교체된다. "흰 띠는 있는데 큰 글자가 없다"가
// 확정 후보 시각 +2s·+4s 양쪽에서 반복되면 발언 샷 오검출로 본다. 헤드라인 띠는 리포트
// 중에도 계속 떠 있으므로 이 신호는 인용띠 유형만 잡는다(부분 억제 — 전체 FP 제거 아님).

/** 하단 영역 행 통계 — dark: 어두운 픽셀(<110) 백분율, mean: 평균 휘도(0..255). */
export interface LowerThirdRowStat {
  dark: number;
  mean: number;
}

export interface QuoteBandResult {
  band: boolean;
  height: number;
  maxGlyph: number;
}

/** 하단 분석 영역 시작(프레임 높이 비율) — 270px 기준 y=195부터. */
export const QUOTE_BAND_REGION_TOP = 195 / 270;
/** 좌우 여백 비율 — 왼쪽 로고 블록·오른쪽 가장자리 제외(480px 기준 x=70~470). */
export const QUOTE_BAND_REGION_LEFT = 70 / 480;
export const QUOTE_BAND_REGION_RIGHT = 470 / 480;
/** 흰 띠로 보는 행 평균 휘도 하한 — 큰 글자 행(평균 122~166)도 띠에 포함되도록 낮게 잡는다. */
export const QUOTE_BAND_MEAN_MIN = 115;
/** 텍스트 행으로 보는 어두운 픽셀 백분율 하한. */
export const QUOTE_BAND_TEXT_DARK_MIN = 15;
/** 270px 프레임 기준 띠 최소 두께(행) — 얇은 스트립(오프닝·무헤드라인 앵커, 6~10행)을 띠로 안 본다. */
export const QUOTE_BAND_MIN_ROWS_AT_270 = 14;
/** 270px 프레임 기준 "큰 헤드라인 글자" 최소 세로(행) — 이 미만이면 인용·이름표 띠로 판정. */
export const QUOTE_BAND_MIN_GLYPH_AT_270 = 12;

/** 프레임 하단 영역의 행별 (dark%, mean) 통계를 계산한다 — 오프라인 캐시와 같은 형식. */
export function lowerThirdRowStats(frame: BmpFrame): LowerThirdRowStat[] {
  const yStart = Math.round(frame.height * QUOTE_BAND_REGION_TOP);
  const xStart = Math.round(frame.width * QUOTE_BAND_REGION_LEFT);
  const xEnd = Math.round(frame.width * QUOTE_BAND_REGION_RIGHT);
  const rows: LowerThirdRowStat[] = [];
  for (let y = yStart; y < frame.height; y += 1) {
    let dark = 0;
    let sum = 0;
    for (let x = xStart; x < xEnd; x += 1) {
      const value = frame.lumaAt(x, y);
      if (value < 110) dark += 1;
      sum += value;
    }
    const count = Math.max(1, xEnd - xStart);
    rows.push({ dark: (100 * dark) / count, mean: sum / count });
  }
  return rows;
}

/**
 * 행 통계에서 흰 띠(최장 밝은 행 런)와 띠 내부 최대 글리프 세로(끊김 없는 어두운 행 런)를
 * 잰다. 임계는 270px 프레임 기준 행 수를 프레임 높이에 비례해 스케일한다.
 */
export function quoteBandFromStats(rows: readonly LowerThirdRowStat[], frameHeight: number): QuoteBandResult {
  const minBandRows = Math.max(4, Math.round((QUOTE_BAND_MIN_ROWS_AT_270 * frameHeight) / 270));
  let best: { start: number; len: number } | null = null;
  let runStart = -1;
  for (let index = 0; index <= rows.length; index += 1) {
    const isBand = index < rows.length && rows[index]!.mean > QUOTE_BAND_MEAN_MIN;
    if (isBand && runStart < 0) runStart = index;
    if (!isBand && runStart >= 0) {
      const len = index - runStart;
      if (!best || len > best.len) best = { start: runStart, len };
      runStart = -1;
    }
  }
  if (!best || best.len < minBandRows) return { band: false, height: 0, maxGlyph: 0 };
  let maxGlyph = 0;
  let current = 0;
  for (let index = best.start; index < best.start + best.len; index += 1) {
    current = rows[index]!.dark > QUOTE_BAND_TEXT_DARK_MIN ? current + 1 : 0;
    if (current > maxGlyph) maxGlyph = current;
  }
  return { band: true, height: best.len, maxGlyph };
}

/**
 * 띠 프로브를 후보와 같은 샷으로 보는 휘도 격자 거리 상한(§135).
 *
 * 실측(2026-07-29): 진짜 앵커의 +2s·+4s 거리는 0.002~0.060, 필터가 옳게 지운 발언·대담 샷은
 * 0.013~0.032. 반면 앵커 리드가 4초뿐이라 프로브가 **다음 꼭지**에 떨어진 1/28 687은 0.371·0.384였다.
 */
export const QUOTE_BAND_SAME_SHOT_MAX = 0.15;

/**
 * 두 휘도 격자가 같은 샷인지 — **같은 샷임을 확인했을 때만** true다.
 * 격자를 못 얻었거나 길이가 다르면 false를 준다(호출 측에서 배제를 보류하는 안전한 쪽).
 */
export function isSameShotGrid(a: Float64Array | null, b: Float64Array | null): boolean {
  if (!a || !b || a.length === 0 || a.length !== b.length) return false;
  let sum = 0;
  for (let index = 0; index < a.length; index += 1) sum += Math.abs(a[index]! - b[index]!);
  return sum / a.length / 255 < QUOTE_BAND_SAME_SHOT_MAX;
}

/** 인용·이름표 띠 판정 — 흰 띠는 있는데 큰 헤드라인 글자가 없다. */
export function isQuoteBandStats(rows: readonly LowerThirdRowStat[], frameHeight: number): boolean {
  const result = quoteBandFromStats(rows, frameHeight);
  const minGlyph = Math.max(3, Math.round((QUOTE_BAND_MIN_GLYPH_AT_270 * frameHeight) / 270));
  return result.band && result.maxGlyph < minGlyph;
}
