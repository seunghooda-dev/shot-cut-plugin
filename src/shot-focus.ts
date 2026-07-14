// 프레임 샘플 시각 계획과 샷 단위 초점 스팬(카메라 컷 추적)을 계산하는 순수 로직
import type { SubjectPoint } from "./subject-focus";

export interface TimedSubjectSample extends SubjectPoint {
  /** 소스 시퀀스 절대 시각(초). */
  time: number;
  /** 얼굴 세로 크기(프레임 높이 대비 0..1). 풀샷 판단·확대 배율 계산에 쓴다. */
  faceHeight?: number;
  /** 프레임에 보이는 인물 수. 2명 이상 풀샷이면 화자를 확대한다. */
  personCount?: number;
}

export interface FocalSpan {
  start: number;
  end: number;
  x: number;
  y: number;
  /** 펀치인 배율(기본 1). 멀티인물 풀샷에서 화자를 키워 잡을 때 >1. */
  zoom?: number;
  /** 이 스팬 "시작" 경계의 전환: cut=하드 점프(실제 컷 정렬), pan=짧은 팬(경계 불확실). */
  transition?: "cut" | "pan";
}

export interface ShotFocalOptions {
  /** 인접 샘플의 x 차이가 이 이상이면 카메라 컷으로 본다. */
  jumpThreshold: number;
  /** 이 미만 confidence 샘플은 무시한다. */
  minConfidence: number;
  /** 인접 샷의 초점(중간값) 차이가 이 미만이면 같은 샷으로 병합한다(노이즈 분할 방지). */
  mergeThreshold: number;
  /** 확대 시 목표 얼굴 세로 크기(프레임 높이 대비). */
  faceTargetHeight: number;
  /** 최대 펀치인 배율. */
  zoomMax: number;
}

export const DEFAULT_SHOT_FOCAL_OPTIONS: Readonly<ShotFocalOptions> = Object.freeze({
  jumpThreshold: 0.08,
  minConfidence: 0.3,
  mergeThreshold: 0.05,
  faceTargetHeight: 0.22,
  zoomMax: 1.5,
});

function median(values: readonly number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

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

interface CleanSample {
  time: number;
  x: number;
  y: number;
  faceHeight: number | null;
  personCount: number | null;
}

/**
 * 시각순 인물 감지 샘플을 샷 단위 초점 스팬으로 묶는다. x가 jumpThreshold 이상 점프하면
 * 카메라 컷으로 보고 두 샘플의 중간에서 스팬을 나눈다. 각 스팬의 초점은 소속 샘플의
 * **중간값**(혼합 평균은 화면에서 ~3배 증폭돼 §34 실측처럼 얼굴이 밀린다). 초점이 비슷한
 * 인접 샷은 병합(노이즈 분할 방지)하고, 멀티인물 풀샷(인원≥2·얼굴 작음)은 화자를 목표
 * 크기까지 확대(zoom)한다. 유효 샘플이 없으면 빈 배열. 결정적 순수 함수.
 */
export function planShotFocalSpans(
  samples: readonly TimedSubjectSample[],
  startSeconds: number,
  endSeconds: number,
  options?: Partial<ShotFocalOptions>,
): FocalSpan[] {
  if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) || endSeconds <= startSeconds) return [];
  const defaults = DEFAULT_SHOT_FOCAL_OPTIONS;
  const numberOr = (value: unknown, fallback: number, min: number): number =>
    typeof value === "number" && Number.isFinite(value) ? Math.max(min, value) : fallback;
  const jumpThreshold = numberOr(options?.jumpThreshold, defaults.jumpThreshold, 0.01);
  const minConfidence = clamp01(numberOr(options?.minConfidence, defaults.minConfidence, 0));
  const mergeThreshold = numberOr(options?.mergeThreshold, defaults.mergeThreshold, 0);
  const faceTargetHeight = clamp01(numberOr(options?.faceTargetHeight, defaults.faceTargetHeight, 0.01));
  const zoomMax = numberOr(options?.zoomMax, defaults.zoomMax, 1);

  const valid: CleanSample[] = (Array.isArray(samples) ? samples : [])
    .filter((sample) => sample
      && Number.isFinite(sample.time) && Number.isFinite(sample.x) && Number.isFinite(sample.y)
      && Number.isFinite(sample.confidence) && sample.confidence >= minConfidence
      && sample.time >= startSeconds - 1e-6 && sample.time <= endSeconds + 1e-6)
    .map((sample) => ({
      time: sample.time,
      x: clamp01(sample.x),
      y: clamp01(sample.y),
      faceHeight: typeof sample.faceHeight === "number" && Number.isFinite(sample.faceHeight) && sample.faceHeight > 0
        ? clamp01(sample.faceHeight)
        : null,
      personCount: typeof sample.personCount === "number" && Number.isFinite(sample.personCount) && sample.personCount >= 0
        ? Math.round(sample.personCount)
        : null,
    }))
    .sort((a, b) => a.time - b.time);
  if (valid.length === 0) return [];

  // 1) 샷 그룹화: 인접 샘플 x 점프 시 컷.
  let groups: CleanSample[][] = [[valid[0]!]];
  for (let i = 1; i < valid.length; i += 1) {
    if (Math.abs(valid[i]!.x - valid[i - 1]!.x) >= jumpThreshold) groups.push([valid[i]!]);
    else groups[groups.length - 1]!.push(valid[i]!);
  }

  // 2) 초점(중간값)이 비슷한 인접 그룹은 병합 — 감지 노이즈로 갈라진 같은 샷을 다시 합친다.
  const merged: CleanSample[][] = [];
  for (const group of groups) {
    const last = merged[merged.length - 1];
    if (last && Math.abs(median(last.map((s) => s.x)) - median(group.map((s) => s.x))) < mergeThreshold) {
      last.push(...group);
    } else {
      merged.push(group.slice());
    }
  }
  groups = merged;

  // 3) 그룹 → 스팬: 초점은 중간값, 경계는 인접 샘플 중간, 멀티인물 풀샷은 확대 배율 계산.
  const spans: FocalSpan[] = [];
  for (let g = 0; g < groups.length; g += 1) {
    const items = groups[g]!;
    const focalX = median(items.map((item) => item.x));
    const focalY = median(items.map((item) => item.y));
    const faceHeights = items.map((item) => item.faceHeight).filter((value): value is number => value !== null);
    const personCounts = items.map((item) => item.personCount).filter((value): value is number => value !== null);
    let zoom = 1;
    if (faceHeights.length > 0 && personCounts.length > 0) {
      const faceMedian = median(faceHeights);
      const personMedian = median(personCounts);
      // 인물이 2명 이상 보이는 풀샷에서 화자의 얼굴이 목표보다 작으면 펀치인으로 키워 잡는다.
      if (personMedian >= 2 && faceMedian > 0 && faceMedian < faceTargetHeight) {
        zoom = Math.min(zoomMax, faceTargetHeight / faceMedian);
      }
    }
    const start = g === 0 ? startSeconds : (groups[g - 1]![groups[g - 1]!.length - 1]!.time + items[0]!.time) / 2;
    const end = g === groups.length - 1 ? endSeconds : (items[items.length - 1]!.time + groups[g + 1]![0]!.time) / 2;
    if (end > start) {
      spans.push({
        start: round3(start),
        end: round3(end),
        x: round3(focalX),
        y: round3(focalY),
        ...(zoom > 1.01 ? { zoom: round3(zoom) } : {}),
      });
    }
  }
  return spans;
}

/**
 * 결과 프레임에서 재측정한 얼굴 위치(measuredX, 0=좌 1=우)로 샷 초점을 보정한다.
 * 크롭 창 중심이 focalX일 때 실제 얼굴은 focalX + (measuredX-0.5)×visibleFraction —
 * 그 지점을 새 초점으로 삼으면 다음 적용에서 얼굴이 정중앙에 온다(폐루프 1스텝).
 * visibleFraction = 타깃에 보이는 소스 가로 비율(예: 16:9→9:16 fill이면 ≈0.316/zoom).
 */
export function correctedFocalX(
  focalX: number,
  measuredX: number,
  visibleFraction: number,
  options?: { deadZone?: number; maxCorrection?: number },
): number {
  if (!Number.isFinite(focalX) || !Number.isFinite(measuredX) || !Number.isFinite(visibleFraction)) return focalX;
  const deadZone = Number.isFinite(options?.deadZone) ? Math.max(0, options!.deadZone!) : 0.06;
  const maxCorrection = Number.isFinite(options?.maxCorrection) ? Math.max(0, options!.maxCorrection!) : 0.2;
  const offset = measuredX - 0.5;
  if (Math.abs(offset) <= deadZone) return focalX; // 이미 충분히 중앙 — 흔들지 않는다.
  const delta = offset * Math.min(1, Math.max(0, visibleFraction));
  const clamped = Math.min(maxCorrection, Math.max(-maxCorrection, delta));
  return round3(Math.min(1, Math.max(0, focalX + clamped)));
}

/**
 * 각 스팬의 시작 경계가 실제 카메라 컷과 정렬됐는지 판정한다. 경계 주변 샘플에서
 * 인접 x 점프(≥jumpThreshold)가 관측되면 "cut"(하드 점프 — 원본 컷에 묻힘),
 * 아니면 "pan"(경계가 불확실 — 짧은 팬으로 부드럽게 이동). 첫 스팬은 경계가 없다.
 */
export function annotateSpanTransitions(
  spans: readonly FocalSpan[],
  samples: readonly TimedSubjectSample[],
  options?: { jumpThreshold?: number; windowSeconds?: number },
): FocalSpan[] {
  const jumpThreshold = typeof options?.jumpThreshold === "number" && Number.isFinite(options.jumpThreshold)
    ? Math.max(0.01, options.jumpThreshold)
    : DEFAULT_SHOT_FOCAL_OPTIONS.jumpThreshold;
  const window = typeof options?.windowSeconds === "number" && Number.isFinite(options.windowSeconds)
    ? Math.max(0.1, options.windowSeconds)
    : 0.8;
  const ordered = (Array.isArray(samples) ? samples : [])
    .filter((sample) => sample && Number.isFinite(sample.time) && Number.isFinite(sample.x))
    .slice()
    .sort((a, b) => a.time - b.time);
  return spans.map((span, index) => {
    if (index === 0) {
      const rest = { ...span };
      delete rest.transition; // 첫 스팬은 시작 경계가 없다.
      return rest;
    }
    const boundary = span.start;
    const near = ordered.filter((sample) => Math.abs(sample.time - boundary) <= window);
    let cutSeen = false;
    for (let i = 1; i < near.length; i += 1) {
      if (Math.abs(near[i]!.x - near[i - 1]!.x) >= jumpThreshold) {
        cutSeen = true;
        break;
      }
    }
    return { ...span, transition: cutSeen ? "cut" as const : "pan" as const };
  });
}

/**
 * 스팬별 hold 키프레임 시각 [start, end]을 계획한다. 경계 전환이 "pan"이면 경계 양쪽에
 * panLead 만큼 여유를 둬 키프레임 사이 선형 보간이 짧은 팬이 되게 하고, "cut"(또는 미지정)
 * 이면 홀드 끝을 경계-ε에 붙여 즉시 점프(원본 컷에 정렬)한다. 스팬이 짧으면 팬을 생략한다.
 */
export function planSpanHoldWindows(
  spans: readonly FocalSpan[],
  options?: { panLeadSeconds?: number; holdEpsilon?: number },
): Array<{ start: number; end: number }> {
  const panLead = typeof options?.panLeadSeconds === "number" && Number.isFinite(options.panLeadSeconds)
    ? Math.max(0, options.panLeadSeconds)
    : 0.25;
  const holdEpsilon = typeof options?.holdEpsilon === "number" && Number.isFinite(options.holdEpsilon)
    ? Math.max(0.01, options.holdEpsilon)
    : 0.05;
  return spans.map((span, index) => {
    const next = spans[index + 1];
    const duration = span.end - span.start;
    const canPan = duration >= panLead * 2 + 0.2;
    const inPan = span.transition === "pan" && canPan;
    const outPan = next?.transition === "pan" && duration >= panLead * 2 + 0.2;
    const start = span.start + (inPan ? panLead : 0);
    const end = Math.max(start, span.end - (outPan ? panLead : holdEpsilon));
    return { start: round3(start), end: round3(end) };
  });
}
