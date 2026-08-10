// 큐시트를 검출 경계에 맞춰 정렬하고, 놓친 꼭지의 위치를 이웃 간격으로 예측하는 순수 계층
import type { CueSheetItemStart } from "./cue-sheet";

/**
 * **큐시트의 절대 시각은 쓰지 않는다.** 실측(모닝와이드 8회차 129경계)에서 큐시트 시각과
 * 실제 경계의 편차가 평균 19.5초·최대 122초였고, 전역 선형 드리프트 보정도 소용없었다
 * (7/16은 보정 후에도 평균 23.7초). 꼭지가 중간에 빠지면 편차가 **계단**으로 튀는데 직선은
 * 그 계단을 전 구간에 문대기 때문이다.
 *
 * 대신 **이웃과의 간격만** 쓴다. 확정된 앞뒤 경계에 큐시트 간격을 얹어 사이를 보간하면
 * 오차가 평균 4.1초·최대 17.6초로 떨어지고 ±20초 창이 113건 전부를 덮었다(실측).
 * 한쪽 이웃만 있을 때는 평균 6.5초·최대 28초라 창을 넓혀야 한다.
 */
export const CUE_PREDICT_WINDOW_BOTH = 20;
export const CUE_PREDICT_WINDOW_ONE_SIDED = 30;

export interface CueAlignPair {
  cueIndex: number;
  /** 짝지어진 검출 경계의 인덱스. */
  boundaryIndex: number;
}

export interface CueGap {
  cueIndex: number;
  /** 이웃 간격으로 예측한 시각(초). */
  predicted: number;
  /** 이 예측을 믿을 창 반경(초) — 양쪽 이웃이 있으면 좁고, 한쪽뿐이면 넓다. */
  window: number;
  title: string;
  isReport: boolean;
}

/**
 * 큐시트 꼭지와 검출 경계를 순서를 지키며 짝짓는다. **큐시트 쪽 건너뜀만 허용한다** —
 * 방송에서 빠지는 꼭지는 있어도(사용자 증언: 뒤쪽일수록 잦다) 큐시트에 없는 경계가 방송에
 * 나가지는 않기 때문이다. 검출 경계가 남으면 그건 오검출이거나 큐시트 판독 누락이므로
 * 여기서 임의로 흡수하지 않고 짝 없이 남긴다.
 */
export function alignCueToBoundaries(cueStarts: readonly number[], boundaries: readonly number[]): CueAlignPair[] {
  const n = cueStarts.length;
  const m = boundaries.length;
  if (n === 0 || m === 0 || m > n) return [];
  const INF = Number.POSITIVE_INFINITY;
  // best[i][j] = 큐시트 i를 경계 j에 짝지었을 때, 0..j를 모두 채운 최소 비용.
  // 비용은 **간격 차이**다 — 직전 짝과의 간격이 큐시트와 검출에서 얼마나 다른가. 절대 시각을
  // 쓰면 회차 전체가 밀렸을 때 엉뚱한 짝을 고른다(실측: 절대 비용은 예측 오차 최대 194.6초,
  // 간격 비용으로 바꾸면 그 붕괴가 사라진다). 첫 짝은 비교할 간격이 없어 비용 0이다.
  const best: Float64Array[] = [];
  const from: Int32Array[] = [];
  for (let i = 0; i < n; i += 1) {
    best.push(new Float64Array(m).fill(INF));
    from.push(new Int32Array(m).fill(-1));
  }
  for (let i = 0; i < n; i += 1) best[i]![0] = 0;
  for (let j = 1; j < m; j += 1) {
    for (let i = j; i < n; i += 1) {
      const deltaBoundary = boundaries[j]! - boundaries[j - 1]!;
      for (let prev = j - 1; prev < i; prev += 1) {
        const earlier = best[prev]![j - 1]!;
        if (earlier === INF) continue;
        const total = earlier + Math.abs(deltaBoundary - (cueStarts[i]! - cueStarts[prev]!));
        if (total < best[i]![j]!) { best[i]![j] = total; from[i]![j] = prev; }
      }
    }
  }
  let endIndex = -1;
  let endCost = INF;
  for (let i = m - 1; i < n; i += 1) {
    if (best[i]![m - 1]! < endCost) { endCost = best[i]![m - 1]!; endIndex = i; }
  }
  if (endIndex < 0) return [];
  const pairs: CueAlignPair[] = [];
  let i = endIndex;
  for (let j = m - 1; j >= 0; j -= 1) {
    pairs.push({ cueIndex: i, boundaryIndex: j });
    if (j > 0) i = from[i]![j]!;
  }
  return pairs.reverse();
}

/**
 * 짝을 못 찾은 큐시트 꼭지마다 예측 시각을 낸다. 양쪽 확정 이웃이 있으면 두 이웃의
 * (검출−큐시트) 편차를 큐시트 간격 비율로 섞고, 한쪽뿐이면 그 이웃에 간격을 더한다.
 * 이웃이 하나도 없으면 예측하지 않는다 — 큐시트 절대 시각을 그대로 쓰는 셈이라 못 믿는다.
 */
export function predictMissingCueItems(
  items: readonly CueSheetItemStart[],
  boundaries: readonly number[],
  pairs: readonly CueAlignPair[],
): CueGap[] {
  const matched = new Map(pairs.map((pair) => [pair.cueIndex, pair.boundaryIndex]));
  const gaps: CueGap[] = [];
  for (let index = 0; index < items.length; index += 1) {
    if (matched.has(index)) continue;
    let prev: CueAlignPair | null = null;
    let next: CueAlignPair | null = null;
    for (const pair of pairs) {
      if (pair.cueIndex < index) prev = pair;
      else if (pair.cueIndex > index && next === null) next = pair;
    }
    const item = items[index]!;
    let predicted: number;
    let window: number;
    if (prev && next) {
      const prevGap = boundaries[prev.boundaryIndex]! - items[prev.cueIndex]!.start;
      const nextGap = boundaries[next.boundaryIndex]! - items[next.cueIndex]!.start;
      const span = items[next.cueIndex]!.start - items[prev.cueIndex]!.start;
      const ratio = span > 0 ? (item.start - items[prev.cueIndex]!.start) / span : 0.5;
      predicted = item.start + prevGap + (nextGap - prevGap) * ratio;
      window = CUE_PREDICT_WINDOW_BOTH;
    } else if (prev) {
      predicted = boundaries[prev.boundaryIndex]! + (item.start - items[prev.cueIndex]!.start);
      window = CUE_PREDICT_WINDOW_ONE_SIDED;
    } else if (next) {
      predicted = boundaries[next.boundaryIndex]! - (items[next.cueIndex]!.start - item.start);
      window = CUE_PREDICT_WINDOW_ONE_SIDED;
    } else {
      continue;
    }
    if (!Number.isFinite(predicted) || predicted < 0) continue;
    gaps.push({ cueIndex: index, predicted, window, title: item.title, isReport: item.isReport });
  }
  return gaps;
}

/**
 * 예측 창 안에서 회수할 후보 하나를 고른다. 창 안에 아무것도 없으면 회수하지 않는다 —
 * 큐시트가 있다고 없는 경계를 만들어내면 안 된다(§161 계열 기각의 핵심 사유가 그것이다).
 * 이미 채택된 경계와 8초 안에서 겹치는 후보는 중복이라 거른다(채점 허용오차와 같은 값).
 */
export function pickCueRecovery(
  gap: CueGap,
  candidates: ReadonlyArray<{ time: number; refDist: number }>,
  accepted: readonly number[],
  maxRefDist: number,
): { time: number; refDist: number } | null {
  let best: { time: number; refDist: number } | null = null;
  for (const candidate of candidates) {
    if (!Number.isFinite(candidate.time)) continue;
    if (Math.abs(candidate.time - gap.predicted) > gap.window) continue;
    if (candidate.refDist > maxRefDist) continue;
    if (accepted.some((time) => Math.abs(time - candidate.time) <= 8)) continue;
    if (!best || candidate.refDist < best.refDist) best = { time: candidate.time, refDist: candidate.refDist };
  }
  return best;
}
