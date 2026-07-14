// 오디오 무음·에너지 분석 — 컷을 자연스러운 무음 경계에 맞추는 순수 로직
export interface SilenceGap {
  start: number;
  end: number;
}

export interface SilenceOptions {
  windowMs: number;
  hopMs: number;
  silenceRatio: number;
  minSilenceMs: number;
}

export const DEFAULT_SILENCE_OPTIONS: Readonly<SilenceOptions> = Object.freeze({
  windowMs: 50,
  hopMs: 25,
  silenceRatio: 0.15,
  minSilenceMs: 200,
});

function positive(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

export interface RmsEnvelope {
  times: number[];
  rms: number[];
}

// 창(window) 단위 RMS 에너지 곡선. times[i]는 창의 중심 시각(초).
export function computeRmsEnvelope(
  samples: ArrayLike<number>,
  sampleRate: number,
  windowMs = DEFAULT_SILENCE_OPTIONS.windowMs,
  hopMs = DEFAULT_SILENCE_OPTIONS.hopMs,
): RmsEnvelope {
  const rate = positive(sampleRate, 1);
  const windowSize = Math.max(1, Math.round((positive(windowMs, 50) / 1000) * rate));
  const hopSize = Math.max(1, Math.round((positive(hopMs, 25) / 1000) * rate));
  const total = samples.length;
  const times: number[] = [];
  const rms: number[] = [];
  if (total === 0) return { times, rms };
  for (let start = 0; start < total; start += hopSize) {
    const end = Math.min(total, start + windowSize);
    let sum = 0;
    for (let i = start; i < end; i += 1) {
      const value = samples[i]!;
      sum += value * value;
    }
    const count = end - start;
    rms.push(count > 0 ? Math.sqrt(sum / count) : 0);
    times.push((start + count / 2) / rate);
    if (end >= total) break;
  }
  return { times, rms };
}

// 피크 RMS 대비 silenceRatio 미만이 minSilenceMs 이상 이어지는 구간을 무음 gap으로 반환한다.
export function detectSilenceGaps(
  samples: ArrayLike<number>,
  sampleRate: number,
  options?: Partial<SilenceOptions>,
): SilenceGap[] {
  const opt = { ...DEFAULT_SILENCE_OPTIONS, ...options };
  const rate = positive(sampleRate, 1);
  const { times, rms } = computeRmsEnvelope(samples, rate, opt.windowMs, opt.hopMs);
  if (rms.length === 0) return [];
  const peak = rms.reduce((max, value) => (value > max ? value : max), 0);
  if (!(peak > 0)) return [];
  // silenceRatio·minSilenceMs는 명시적 0(임계 0·무음 하한 없음)도 유효한 설정이라 그대로 존중한다.
  const ratio = Number.isFinite(opt.silenceRatio) && opt.silenceRatio >= 0 ? Math.min(1, opt.silenceRatio) : 0.15;
  const threshold = peak * ratio;
  const minSilence = (Number.isFinite(opt.minSilenceMs) && opt.minSilenceMs >= 0 ? opt.minSilenceMs : 200) / 1000;
  const hop = positive(opt.hopMs, 25) / 1000;

  const gaps: SilenceGap[] = [];
  let runStart = -1;
  for (let i = 0; i < rms.length; i += 1) {
    const quiet = rms[i]! <= threshold;
    if (quiet && runStart < 0) runStart = i;
    if ((!quiet || i === rms.length - 1) && runStart >= 0) {
      const lastQuiet = quiet ? i : i - 1;
      const start = times[runStart]! - hop / 2;
      const end = times[lastQuiet]! + hop / 2;
      if (end - start >= minSilence) gaps.push({ start: Math.max(0, start), end });
      runStart = -1;
    }
  }
  return gaps;
}

// 컷 시각을 maxShift 이내의 가장 가까운 무음 gap 중심(가장 조용한 지점)에 맞춘다.
export function snapCutPointToSilence(time: number, gaps: SilenceGap[], maxShiftSeconds: number): number {
  if (!Number.isFinite(time) || !Array.isArray(gaps) || gaps.length === 0) return time;
  const maxShift = positive(maxShiftSeconds, 0);
  let best = time;
  let bestDistance = maxShift;
  for (const gap of gaps) {
    if (!gap || !Number.isFinite(gap.start) || !Number.isFinite(gap.end)) continue;
    const center = (gap.start + gap.end) / 2;
    const distance = Math.abs(center - time);
    if (distance <= bestDistance) {
      bestDistance = distance;
      best = center;
    }
  }
  return best;
}
