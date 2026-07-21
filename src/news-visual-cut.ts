// 자막 없이 화면(앵커 샷)만으로 뉴스 방송을 분할하는 순수 계층 — 후보 도출·정적 꼬리·경계 재스냅
import { frameDifference } from "./frame-diff";
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
