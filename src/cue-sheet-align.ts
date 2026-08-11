// 큐시트를 검출 경계에 맞춰 정렬하고, 놓친 꼭지의 위치를 이웃 간격으로 예측하는 순수 계층
import type { CueSheetItemStart } from "./cue-sheet";

/** 회수 후보 — 화면 매칭이 낸 시각과 그 참조 거리. */
export interface CueRecoveryCandidate {
  time: number;
  refDist: number;
}

export interface CueRecoveryPick {
  gap: CueGap;
  /** 창 안에서 고른 후보. 없으면 null이고, 그 자체가 보고할 사실이다. */
  recovery: CueRecoveryCandidate | null;
}

export interface CueRecoveryResult {
  /** 확정 경계 + 회수분(오름차순). 회수가 없으면 입력과 같은 내용이다. */
  merged: number[];
  pairs: CueAlignPair[];
  gaps: CueGap[];
  picks: CueRecoveryPick[];
}

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
 * 큐시트 꼭지와 검출 경계를 순서를 지키며 짝짓는다. 짧은 쪽을 전부 쓰고 **긴 쪽에서
 * 건너뛴다** — 방송에서 빠지는 꼭지도 있고(사용자 증언: 뒤쪽일수록 잦다) 큐시트에 없는
 * 오검출 경계도 있으므로 양쪽 다 남을 수 있다. 짝 없이 남은 경계는 그 자체가 오검출 후보다.
 *
 * 경계가 꼭지보다 많을 때는 **역할을 바꿔 같은 DP를 돌린다.** 비용이 간격 차의 절댓값이라
 * 대칭이므로 결과가 같고, 짝 인덱스만 되돌리면 된다. 종전에는 이 경우 빈 배열을 돌려줘
 * **큐시트 기능이 통째로 무력화**됐다(7/16 경계 24 > 꼭지 20 · 7/20 12 > 11에서 실제 발생).
 * 그런데도 로그는 다른 회차와 똑같이 "빈자리 0"으로 찍혀 구별되지 않았다(§7-ax).
 * 건너뛸 개수를 문턱으로 두지 않는 것이 핵심이다 — 짧은 쪽 길이가 그 개수를 정하므로
 * **새로 고를 하이퍼파라미터가 없다.**
 */
export function alignCueToBoundaries(cueStarts: readonly number[], boundaries: readonly number[]): CueAlignPair[] {
  const n = cueStarts.length;
  const m = boundaries.length;
  if (n === 0 || m === 0) return [];
  if (m > n) {
    return alignCueToBoundaries(boundaries, cueStarts)
      .map((pair) => ({ cueIndex: pair.boundaryIndex, boundaryIndex: pair.cueIndex }));
  }
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
 * 산출 아이템마다 붙일 큐시트 기사제목을 정한다(§CUE-4). **경계를 만들지도 지우지도 않는다** —
 * 이름만 바꾸므로 F1과 무관하고, 틀려도 분할 결과는 그대로다.
 *
 * 짝을 못 얻은 아이템은 **빈 문자열**이다. 남는 꼭지를 순서대로 밀어 넣지 않는 것이 핵심이다 —
 * 8뉴스는 미출고가 잦아(§CUE-2) 한 꼭지가 빠지면 그 뒤가 전부 한 칸씩 밀린 제목을 달게 된다.
 * 이름은 편집자가 눈으로 믿는 정보라 **틀린 제목이 없는 제목보다 나쁘다.**
 *
 * 정렬은 회수와 **같은 DP**를 쓴다. 별도 매칭을 두면 같은 회차에서 회수와 이름이 서로 다른
 * 꼭지를 가리키게 된다.
 */
export function titleItemsFromCueSheet(
  itemStarts: readonly number[],
  items: readonly CueSheetItemStart[],
): string[] {
  const titles = itemStarts.map(() => "");
  if (itemStarts.length === 0 || items.length === 0) return titles;
  for (const pair of alignCueToBoundaries(items.map((item) => item.start), itemStarts)) {
    if (pair.boundaryIndex < 0 || pair.boundaryIndex >= titles.length) continue;
    titles[pair.boundaryIndex] = items[pair.cueIndex]?.title ?? "";
  }
  return titles;
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
/**
 * 정렬 → 보간 → 회수를 한 번에 돈다. **이 함수가 회수의 전부다** — 호출부(index.ts)는 큐시트
 * 유무만 가리고 결과를 로그로 옮길 뿐이다. 글루를 여기 둔 이유는 `index.ts`가 테스트에서
 * 불릴 수 없어, 글루가 거기 있으면 오프라인 실측이 **제품이 아니라 재구현본을 재는** 일이
 * 되기 때문이다(실제로 이번 도입에서 프로토타입과 제품이 평균 4.1초 vs 13.8초로 갈렸다).
 *
 * 결과는 무엇을 골랐는지뿐 아니라 **무엇을 못 골랐는지도** 담는다(`picks[].recovery === null`).
 * 회수 경로가 조용히 무동작하면 "배선 안 됨"과 구별할 수 없다는 것이 §7-aw의 교훈이다.
 */
export function recoverFromCueSheet(
  items: readonly CueSheetItemStart[],
  accepted: readonly number[],
  candidates: readonly CueRecoveryCandidate[],
  maxRefDist: number,
): CueRecoveryResult {
  const base = [...accepted];
  const pairs = alignCueToBoundaries(items.map((item) => item.start), base);
  const gaps = predictMissingCueItems(items, base, pairs);
  const merged = [...base];
  const picks: CueRecoveryPick[] = [];
  for (const gap of gaps) {
    const recovery = pickCueRecovery(gap, candidates, merged, maxRefDist);
    // 회수분을 즉시 merged에 넣어야 다음 빈자리의 중복 판정이 이번 회수까지 본다.
    if (recovery) merged.push(recovery.time);
    picks.push({ gap, recovery });
  }
  merged.sort((a, b) => a - b);
  return { merged, pairs, gaps, picks };
}

/**
 * 큐시트를 **참고용으로만** 써서 과분할을 깎는다 — **경계를 절대 만들지 않는다.**
 *
 * 사용자 지시(2026-08-11): "자체 필터를 우선시하고 큐시트는 참고용으로 사용한다.
 * 8뉴스는 중간에 끊기는 경우가 많아 큐시트를 전적으로 기대하면 안 된다."
 *
 * 확정 경계가 큐 꼭지보다 많으면 **초과분만큼은 반드시 오검출**이다(큐시트는 방송된 것보다
 * 많거나 같지 적지 않다 — 미출고는 있어도 큐시트에 없는 꼭지가 방송되지는 않는다).
 * 어느 것을 깎을지는 `confidence`가 낮은 순이다.
 *
 * **confidence는 반드시 두 검출 경로가 공유하는 점수여야 한다.** 뱅크 참조 거리로 순위를
 * 매기면 학습 모델이 잡은 경계(뱅크가 못 잡는 것을 잡는 상보 경로라 거리가 나쁜 것이 정상)를
 * 먼저 잘라 오히려 나빠진다 — §7-az에서 −5.5로 실측했고, 모델 확률로 바꾸니 +6.7이 됐다.
 *
 * 실측(100 미만 11회차 · 오프라인): 91.4 → 94.4. 그중 홀드아웃 7회차는 90.1 → 94.0.
 * **오른 회차 4 · 내린 회차 0.** 오른 것은 전부 과분할 회차이고, 나머지는 깎을 것이 없어
 * 불변이다(그 회차들의 오차는 FN이라 깎기로는 원리적으로 못 고친다).
 *
 * **⚠️ 제품 미배선 — §7-bm 실기 기각(재배선 금지).** 위 오프라인 +3 이득은 실기에서
 * 뒤집혔다: 97.4 → 91.9, 깎은 3개 중 2개가 TP(과분할 회차의 정답 경계)였다. `index.ts`는
 * 이 함수를 분할 경로에 배선하지 않는다(비전 앞 가지치기 금지 — index.ts §CUE-4 주석 참조).
 * 이 docstring의 낙관 수치만 보고 재배선하면 기각된 "정답 경계 삭제"가 그대로 되살아난다.
 */
export function trimByCueSheetCount(
  itemCount: number,
  accepted: readonly number[],
  confidence: (time: number) => number,
): number[] {
  const excess = accepted.length - itemCount;
  if (!Number.isFinite(itemCount) || itemCount <= 0 || excess <= 0) return [...accepted];
  const weakest = new Set(
    [...accepted].sort((left, right) => confidence(left) - confidence(right)).slice(0, excess),
  );
  return accepted.filter((time) => !weakest.has(time));
}

export function pickCueRecovery(
  gap: CueGap,
  candidates: readonly CueRecoveryCandidate[],
  accepted: readonly number[],
  maxRefDist: number,
): CueRecoveryCandidate | null {
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
