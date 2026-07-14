// 프레임 샘플 시각 계획과 샷 단위 초점 스팬(카메라 컷 추적)을 계산하는 순수 로직
import type { SubjectPoint } from "./subject-focus";

export interface TimedSubjectSample extends SubjectPoint {
  /** 소스 시퀀스 절대 시각(초). */
  time: number;
}

export interface FocalSpan {
  start: number;
  end: number;
  x: number;
  y: number;
}

export interface ShotFocalOptions {
  /** 인접 샘플의 x 차이가 이 이상이면 카메라 컷으로 본다. */
  jumpThreshold: number;
  /** 이 미만 confidence 샘플은 무시한다. */
  minConfidence: number;
}

export const DEFAULT_SHOT_FOCAL_OPTIONS: Readonly<ShotFocalOptions> = Object.freeze({
  jumpThreshold: 0.12,
  minConfidence: 0.3,
});

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * 세그먼트 안에서 프레임을 샘플링할 시각을 고른다. 자막 cue 중간 시점(발화 중 — 말하는
 * 사람 감지가 가장 잘 됨)을 우선 쓰고, 촘촘히 커버되도록 균일 그리드를 보충한 뒤
 * 최소 간격·최대 개수로 솎는다. 결정적 순수 함수.
 */
export function planSampleTimes(
  startSeconds: number,
  endSeconds: number,
  cueMidpoints: readonly number[],
  options?: { maxSamples?: number; minGapSeconds?: number },
): number[] {
  if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) || endSeconds <= startSeconds) return [];
  const maxSamples = Math.max(2, Math.round(options?.maxSamples ?? 18));
  const minGap = Math.max(0.2, options?.minGapSeconds ?? 1.5);
  const duration = endSeconds - startSeconds;

  // 1) 자막 발화 중간 시점을 먼저 선점한다(말하는 사람 감지가 가장 잘 되는 순간).
  const midpoints = cueMidpoints
    .filter((midpoint) => Number.isFinite(midpoint) && midpoint > startSeconds && midpoint < endSeconds)
    .slice()
    .sort((a, b) => a - b);
  const picked: number[] = [];
  for (const time of midpoints) {
    if (picked.length === 0 || time - picked[picked.length - 1]! >= minGap) picked.push(round3(time));
  }
  // 2) 균일 그리드로 빈 구간을 보충한다(카메라 컷이 발화 사이에 있을 수 있음).
  const gridStep = Math.max(minGap, duration / maxSamples);
  for (let t = startSeconds + gridStep / 2; t < endSeconds; t += gridStep) {
    const time = round3(t);
    if (picked.every((existing) => Math.abs(existing - time) >= minGap)) picked.push(time);
  }
  picked.sort((a, b) => a - b);
  if (picked.length <= maxSamples) return picked;
  // 개수 초과면 균등 간격으로 솎는다(양 끝 유지).
  const thinned: number[] = [];
  for (let i = 0; i < maxSamples; i += 1) {
    const index = Math.round((i * (picked.length - 1)) / (maxSamples - 1));
    const value = picked[index]!;
    if (thinned.length === 0 || value > thinned[thinned.length - 1]!) thinned.push(value);
  }
  return thinned;
}

/**
 * 시각순 인물 감지 샘플을 샷 단위 초점 스팬으로 묶는다. x가 jumpThreshold 이상 점프하면
 * 카메라 컷으로 보고 두 샘플의 중간에서 스팬을 나눈다. 각 스팬의 초점은 소속 샘플 평균.
 * 유효 샘플이 없으면 빈 배열(호출부는 정적 초점 폴백). 결정적 순수 함수.
 */
export function planShotFocalSpans(
  samples: readonly TimedSubjectSample[],
  startSeconds: number,
  endSeconds: number,
  options?: Partial<ShotFocalOptions>,
): FocalSpan[] {
  if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) || endSeconds <= startSeconds) return [];
  const jumpThreshold = typeof options?.jumpThreshold === "number" && Number.isFinite(options.jumpThreshold)
    ? Math.max(0.01, options.jumpThreshold)
    : DEFAULT_SHOT_FOCAL_OPTIONS.jumpThreshold;
  const minConfidence = typeof options?.minConfidence === "number" && Number.isFinite(options.minConfidence)
    ? clamp01(options.minConfidence)
    : DEFAULT_SHOT_FOCAL_OPTIONS.minConfidence;

  const valid = (Array.isArray(samples) ? samples : [])
    .filter((sample) => sample
      && Number.isFinite(sample.time) && Number.isFinite(sample.x) && Number.isFinite(sample.y)
      && Number.isFinite(sample.confidence) && sample.confidence >= minConfidence
      && sample.time >= startSeconds - 1e-6 && sample.time <= endSeconds + 1e-6)
    .map((sample) => ({ time: sample.time, x: clamp01(sample.x), y: clamp01(sample.y) }))
    .sort((a, b) => a.time - b.time);
  if (valid.length === 0) return [];

  // 샷 그룹화: 인접 샘플 x 점프 시 컷.
  const groups: Array<{ items: Array<{ time: number; x: number; y: number }> }> = [{ items: [valid[0]!] }];
  for (let i = 1; i < valid.length; i += 1) {
    const previous = valid[i - 1]!;
    const current = valid[i]!;
    if (Math.abs(current.x - previous.x) >= jumpThreshold) groups.push({ items: [current] });
    else groups[groups.length - 1]!.items.push(current);
  }

  const spans: FocalSpan[] = [];
  for (let g = 0; g < groups.length; g += 1) {
    const items = groups[g]!.items;
    const meanX = items.reduce((sum, item) => sum + item.x, 0) / items.length;
    const meanY = items.reduce((sum, item) => sum + item.y, 0) / items.length;
    // 스팬 경계: 첫 스팬은 세그먼트 시작부터, 마지막은 끝까지. 사이 경계는 인접 샘플 중간.
    const start = g === 0 ? startSeconds : (groups[g - 1]!.items[groups[g - 1]!.items.length - 1]!.time + items[0]!.time) / 2;
    const end = g === groups.length - 1 ? endSeconds : (items[items.length - 1]!.time + groups[g + 1]!.items[0]!.time) / 2;
    if (end > start) spans.push({ start: round3(start), end: round3(end), x: round3(meanX), y: round3(meanY) });
  }
  return spans;
}
