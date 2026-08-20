export type ReframeMode = "fill" | "fit" | "none";
export type RangeMode = "full" | "inout" | "playhead";

export interface ShortProfile {
  id: string;
  label: string;
  width: number;
  height: number;
  maxDuration: number;
}

export const PROFILES: readonly ShortProfile[] = Object.freeze([
  Object.freeze({
    id: "youtube-shorts",
    label: "YouTube Shorts (9:16)",
    width: 1080,
    height: 1920,
    maxDuration: 180,
  }),
  Object.freeze({
    id: "instagram-reels",
    label: "Instagram Reels (9:16)",
    width: 1080,
    height: 1920,
    maxDuration: 90,
  }),
  Object.freeze({
    id: "tiktok",
    label: "TikTok (9:16)",
    width: 1080,
    height: 1920,
    maxDuration: 600,
  }),
  Object.freeze({
    id: "square",
    label: "Square (1:1)",
    width: 1080,
    height: 1080,
    maxDuration: 60,
  }),
] as const);

// RegExp 생성자를 사용해 정적 분석기의 no-control-regex 오탐을 피하면서
// Windows 제어 문자를 포함한 파일명 금지 문자를 동일하게 제거합니다.
const CONTROL_CHARACTERS = new RegExp("[\\x00-\\x1f]", "gu");
const INVALID_NAME_CHARACTERS = new RegExp("[<>:\"/\\\\|?*\\x00-\\x1f]", "gu");
const WINDOWS_RESERVED_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu;

function safeLimit(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value) || !value || value < 1) {
    return fallback;
  }
  return Math.max(1, Math.floor(value));
}

export function sanitizeSequenceName(value: unknown, maxLength = 120): string {
  const limit = safeLimit(maxLength, 120);
  const cleaned = String(value ?? "")
    .replace(CONTROL_CHARACTERS, " ")
    .replace(/[<>:"/\\|?*]/gu, "")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, limit)
    .trim();
  return cleaned || "ShortFlow";
}

function splitExtension(value: string): { stem: string; extension: string } {
  const lastDot = value.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === value.length - 1) {
    return { stem: value, extension: "" };
  }
  return {
    stem: value.slice(0, lastDot),
    extension: value.slice(lastDot),
  };
}

export function sanitizeFileName(value: unknown, maxLength = 180): string {
  const limit = safeLimit(maxLength, 180);
  let cleaned = String(value ?? "")
    .replace(INVALID_NAME_CHARACTERS, "_")
    .replace(/\.\.+/gu, "_")
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/[. ]+$/gu, "");

  if (!cleaned || /^[_ .-]+$/u.test(cleaned)) {
    return "shortflow".slice(0, limit);
  }

  if (WINDOWS_RESERVED_NAME.test(cleaned)) {
    cleaned = `_${cleaned}`;
  }

  if (cleaned.length > limit) {
    const { stem, extension } = splitExtension(cleaned);
    const safeExtension = extension.length < limit ? extension : "";
    cleaned = `${stem.slice(0, Math.max(1, limit - safeExtension.length))}${safeExtension}`;
  }

  cleaned = cleaned.replace(/[. ]+$/gu, "");
  return cleaned || "shortflow".slice(0, limit);
}

function positiveFinite(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function calculateRelativeScale(
  currentScale: number,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  mode: ReframeMode,
): number {
  const baseScale = positiveFinite(currentScale, 100);
  if (mode === "none") {
    return baseScale;
  }

  const dimensions = [sourceWidth, sourceHeight, targetWidth, targetHeight];
  if (dimensions.some((dimension) => !Number.isFinite(dimension) || dimension <= 0)) {
    return baseScale;
  }

  const widthRatio = targetWidth / sourceWidth;
  const heightRatio = targetHeight / sourceHeight;
  const ratio = mode === "fit"
    ? Math.min(widthRatio, heightRatio)
    : Math.max(widthRatio, heightRatio);
  const next = baseScale * ratio;
  return positiveFinite(next, baseScale);
}

export interface ResolveTimeRangeInput {
  mode: RangeMode;
  sequenceEnd: number;
  inPoint?: number;
  outPoint?: number;
  playhead?: number;
  maxDuration?: number;
}

export interface ResolvedTimeRange {
  start: number;
  end: number;
  duration: number;
  usedFallback: boolean;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function validOptionalDuration(value: number | undefined): number | null {
  return Number.isFinite(value) && value !== undefined && value > 0 ? value : null;
}

export function resolveTimeRange(input: ResolveTimeRangeInput): ResolvedTimeRange {
  const sequenceEnd = Number.isFinite(input.sequenceEnd) && input.sequenceEnd > 0
    ? input.sequenceEnd
    : 0;
  const maximum = validOptionalDuration(input.maxDuration);
  let start = 0;
  let end = sequenceEnd;
  let usedFallback = false;

  if (input.mode === "inout") {
    const hasFinitePoints = Number.isFinite(input.inPoint) && Number.isFinite(input.outPoint);
    if (hasFinitePoints && input.inPoint !== undefined && input.outPoint !== undefined && input.outPoint > input.inPoint) {
      start = clamp(input.inPoint, 0, sequenceEnd);
      end = clamp(input.outPoint, 0, sequenceEnd);
      if (end <= start) {
        start = 0;
        end = sequenceEnd;
        usedFallback = true;
      }
    } else {
      usedFallback = true;
    }
  } else if (input.mode === "playhead") {
    if (Number.isFinite(input.playhead) && input.playhead !== undefined) {
      start = clamp(input.playhead, 0, sequenceEnd);
      end = sequenceEnd;
    } else {
      usedFallback = true;
    }
  }

  if (maximum !== null) {
    end = Math.min(end, start + maximum);
  }

  start = Number.isFinite(start) ? start : 0;
  end = Number.isFinite(end) ? Math.max(start, end) : start;
  const duration = Math.max(0, end - start);
  return { start, end, duration, usedFallback };
}

export interface MarkerInput {
  name: string;
  comments: string;
  start: number;
  duration: number;
  index: number;
}

export interface MarkerSegment {
  name: string;
  comments: string;
  start: number;
  end: number;
  duration: number;
  index: number;
}

export function markerToSegment(
  marker: MarkerInput,
  sequenceEnd: number,
  defaultDuration: number,
): MarkerSegment | null {
  if (
    !Number.isFinite(marker.start)
    || !Number.isFinite(marker.duration)
    || !Number.isFinite(sequenceEnd)
    || sequenceEnd <= 0
    || marker.start >= sequenceEnd
  ) {
    return null;
  }

  const start = Math.max(0, marker.start);
  const fallback = positiveFinite(defaultDuration, 1);
  const requestedDuration = marker.duration > 0 ? marker.duration : fallback;
  const end = Math.min(sequenceEnd, start + requestedDuration);
  if (end <= start) {
    return null;
  }

  return {
    name: sanitizeSequenceName(marker.name || `Short ${marker.index + 1}`),
    comments: String(marker.comments ?? ""),
    start,
    end,
    duration: end - start,
    index: Number.isInteger(marker.index) ? marker.index : 0,
  };
}

export function formatDuration(seconds: number): string {
  const whole = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const remainingSeconds = whole % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(remainingSeconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

// 기사 마커 조정 UI의 시각 직접 입력을 초로 파싱한다("M:SS"·"MM:SS"·"H:MM:SS"·"177"·"177.5").
// 콜론 표기는 60진 자리올림으로 해석하고, 잘못된 입력(음수·비수치·빈칸)은 fallback을 돌려준다.
export function parseTimecodeSeconds(text: unknown, fallback: number): number {
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) return fallback;
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":").map((part) => Number(part.trim()));
    if (parts.length === 0 || parts.some((value) => !Number.isFinite(value) || value < 0)) return fallback;
    let seconds = 0;
    for (const part of parts) seconds = seconds * 60 + part;
    return seconds;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

// 초를 프레임 타임코드(분:초:프레임 또는 시:분:초:프레임)로 만든다 — 인점을 프레임 단위로 보기 위함.
// fps<=0이면 프레임 자리 없이 분:초(formatDuration). fps는 정수로 반올림해 프레임 자리를 센다(논드롭).
export function formatTimecodeFrames(seconds: number, fps: number): string {
  const fpsInt = Number.isFinite(fps) && fps >= 1 ? Math.round(fps) : 0;
  if (fpsInt <= 0) return formatDuration(seconds);
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const totalFrames = Math.round(safe * fpsInt);
  const ff = totalFrames % fpsInt;
  const whole = Math.floor(totalFrames / fpsInt);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  const fftc = String(ff).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}:${fftc}` : `${mm}:${ss}:${fftc}`;
}

// 프레임 타임코드 입력을 초로 파싱한다. 콜론 3개(MM:SS:FF)·4개(H:MM:SS:FF)면 **마지막 자리를
// 프레임**으로 보고 fps로 초 환산하며, 그 외(초·MM:SS·H:MM:SS)는 parseTimecodeSeconds에 위임한다.
// fps<=0이면 프레임 개념이 없어 전부 위임한다(이때 콜론 3개는 H:MM:SS로 해석).
export function parseFrameTimecode(text: unknown, fps: number, fallback: number): number {
  const trimmed = typeof text === "string" ? text.trim() : "";
  const fpsInt = Number.isFinite(fps) && fps >= 1 ? Math.round(fps) : 0;
  if (fpsInt > 0 && trimmed.includes(":")) {
    const parts = trimmed.split(":").map((part) => part.trim());
    if (parts.length === 3 || parts.length === 4) {
      const frames = Number(parts.pop());
      if (!Number.isFinite(frames) || frames < 0 || frames >= fpsInt) return fallback;
      const base = parseTimecodeSeconds(parts.join(":"), Number.NaN);
      if (!Number.isFinite(base)) return fallback;
      return base + frames / fpsInt;
    }
  }
  return parseTimecodeSeconds(trimmed, fallback);
}

export interface NewsBoundaryItem {
  start: number;
  end: number;
}

// 기사 마커 조정의 핵심 셈 — 연속 기사(앞 끝 = 뒤 시작) 구간에서 index 기사의 시작을 desired로
// 옮긴다(연속성 유지). 앞 기사 시작보다 minLen 뒤, 이 기사 끝보다 minLen 앞으로 클램프하고,
// 첫 기사가 아니면 앞 기사의 끝을 같은 값으로 맞춘다. 잘못된 입력·역전이면 원본 값 그대로 둔다.
// 순수 함수 — 새 배열을 돌려주고 입력은 건드리지 않는다(index.ts UI 상태에서 호출).
export function adjustContiguousStart<T extends NewsBoundaryItem>(
  items: readonly T[],
  index: number,
  desiredStart: number,
  minLen = 1,
): T[] {
  const next = items.map((item) => ({ ...item }));
  const target = next[index];
  if (!target || !Number.isFinite(desiredStart)) return next;
  const lowerBound = index > 0 ? next[index - 1]!.start + minLen : 0;
  const upperBound = target.end - minLen;
  const clamped = Math.max(lowerBound, Math.min(upperBound, desiredStart));
  if (!Number.isFinite(clamped) || clamped >= target.end) return next;
  target.start = clamped;
  if (index > 0) next[index - 1]!.end = clamped;
  return next;
}

// 경계 삭제 = 병합. 첫 기사면 그 구간을 다음 기사가 흡수(다음 시작을 이 시작으로), 아니면 앞
// 기사가 이 기사를 흡수(앞 끝을 이 끝으로). 1개 이하거나 인덱스가 범위를 벗어나면 그대로 둔다.
export function mergeContiguousItem<T extends NewsBoundaryItem>(items: readonly T[], index: number): T[] {
  const next = items.map((item) => ({ ...item }));
  if (next.length <= 1 || index < 0 || index >= next.length) return next;
  const target = next[index]!;
  if (index > 0) {
    next[index - 1]!.end = target.end;
    next.splice(index, 1);
  } else {
    next[1]!.start = target.start;
    next.splice(0, 1);
  }
  return next;
}

export type QCLevel = "error" | "warning" | "pass";

export interface QCItem {
  level: QCLevel;
  code: string;
  message: string;
}

export interface ValidateShortInput {
  width: number;
  height: number;
  duration: number;
  captionTrackCount: number;
  videoTrackCount: number;
  audioTrackCount: number;
  expectedWidth: number;
  expectedHeight: number;
  maxDuration: number;
  name: string;
}

function qc(level: QCLevel, code: string, message: string): QCItem {
  return { level, code, message };
}

export function validateShort(input: ValidateShortInput): QCItem[] {
  const results: QCItem[] = [];
  const frameValid = Number.isFinite(input.width)
    && Number.isFinite(input.height)
    && input.width === input.expectedWidth
    && input.height === input.expectedHeight;
  results.push(frameValid
    ? qc("pass", "frame-size", `프레임 크기가 ${input.width}×${input.height}로 정확합니다.`)
    : qc("error", "frame-size", `프레임 크기를 ${input.expectedWidth}×${input.expectedHeight}로 맞춰 주세요.`));

  const durationValid = Number.isFinite(input.duration) && input.duration > 0;
  if (!durationValid) {
    results.push(qc("error", "duration", "내보낼 수 있는 유효한 길이가 없습니다."));
  } else if (Number.isFinite(input.maxDuration) && input.maxDuration > 0 && input.duration > input.maxDuration) {
    results.push(qc("warning", "duration-limit", `현재 길이가 플랫폼 권장 한도 ${formatDuration(input.maxDuration)}를 초과합니다.`));
  } else {
    results.push(qc("pass", "duration", `길이 ${formatDuration(input.duration)}가 설정 범위 안입니다.`));
  }

  results.push(input.videoTrackCount > 0
    ? qc("pass", "video-track", `비디오 트랙 ${input.videoTrackCount}개를 확인했습니다.`)
    : qc("error", "video-track", "비디오 트랙이 없습니다."));

  results.push(input.audioTrackCount > 0
    ? qc("pass", "audio-track", `오디오 트랙 ${input.audioTrackCount}개를 확인했습니다.`)
    : qc("warning", "audio-track", "오디오 트랙이 없습니다. 무음 숏폼인지 확인해 주세요."));

  results.push(input.captionTrackCount > 0
    ? qc("pass", "caption-track", `캡션 트랙 ${input.captionTrackCount}개를 확인했습니다.`)
    : qc("warning", "caption-track", "캡션 트랙이 없습니다. 무음 시청 환경을 고려해 주세요."));

  results.push(String(input.name ?? "").trim()
    ? qc("pass", "sequence-name", "시퀀스 이름이 지정되어 있습니다.")
    : qc("warning", "sequence-name", "시퀀스 이름이 비어 있습니다."));

  return results;
}
