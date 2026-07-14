// 자막 하이라이트·아웃라인·타임코드를 숏폼 컷 구간 후보로 변환하는 순수 판단 로직
import type { SubtitleDocument, SubtitleWord } from "./subtitles";
import type { EditOutlineSegment, SubtitleHighlight } from "./subtitle-controller";

export interface HighlightCutOptions {
  minDuration: number;
  idealDuration: number;
  maxDuration: number;
  maxSegments: number;
  hookWindow: number;
  mergeGap: number;
}

export interface HighlightCutSegment {
  start: number;
  end: number;
  duration: number;
  cueIds: string[];
  title: string;
  reason: string;
  score: number;
  highlightCount: number;
}

export const DEFAULT_HIGHLIGHT_CUT_OPTIONS: Readonly<HighlightCutOptions> = Object.freeze({
  minDuration: 12,
  idealDuration: 30,
  maxDuration: 60,
  maxSegments: 8,
  hookWindow: 3,
  mergeGap: 8,
});

// 문장 종결부호(다국어)로 끝나면 문장 끝으로 본다. 따옴표·괄호·공백은 벗겨내고 검사.
const SENTENCE_END = /[.?!…。！？]["'”’»)\]]*$/u;

function isSentenceEnd(text: string): boolean {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return false;
  return SENTENCE_END.test(trimmed);
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function resolveOptions(options?: Partial<HighlightCutOptions>): HighlightCutOptions {
  const d = DEFAULT_HIGHLIGHT_CUT_OPTIONS;
  const maxDuration = Math.max(2, num(options?.maxDuration, d.maxDuration));
  const idealDuration = Math.min(maxDuration, Math.max(1, num(options?.idealDuration, d.idealDuration)));
  const minDuration = Math.min(idealDuration, Math.max(0, num(options?.minDuration, d.minDuration)));
  return {
    maxDuration,
    idealDuration,
    minDuration,
    maxSegments: Math.max(1, Math.round(num(options?.maxSegments, d.maxSegments))),
    hookWindow: Math.max(0, num(options?.hookWindow, d.hookWindow)),
    mergeGap: Math.max(0, num(options?.mergeGap, d.mergeGap)),
  };
}

interface CueMeta {
  cueId: string;
  start: number;
  end: number;
  text: string;
  words: SubtitleWord[];
  sentenceEnd: boolean;
  sentenceStart: boolean;
}

function overlaps(a: HighlightCutSegment, b: HighlightCutSegment): boolean {
  return a.start < b.end && b.start < a.end;
}

// 한 cue를 중간에서 잘라야 할 때, limit 이하의 마지막 단어 끝(무음 경계)에 스냅한다.
// 단어 타임스탬프가 없으면 limit 그대로.
function wordSnapEnd(cue: CueMeta, limit: number): number {
  let best = cue.start;
  for (const word of cue.words) {
    if (typeof word.e === "number" && Number.isFinite(word.e)
      && word.e > cue.start && word.e <= limit && word.e > best) {
      best = word.e;
    }
  }
  return best > cue.start ? best : limit;
}

// 짧은 클러스터를 idealDuration까지 앞뒤 cue로 확장한다(문장 경계·작은 공백 우선).
function expandRange(cluster: number[], cues: CueMeta[], opt: HighlightCutOptions): { lo: number; hi: number } {
  let lo = cluster[0]!;
  let hi = cluster[cluster.length - 1]!;
  let start = cues[lo]!.start;
  let end = cues[hi]!.end;

  while (end - start < opt.idealDuration) {
    const beforeGap = lo - 1 >= 0 ? cues[lo]!.start - cues[lo - 1]!.end : Number.POSITIVE_INFINITY;
    const afterGap = hi + 1 < cues.length ? cues[hi + 1]!.start - cues[hi]!.end : Number.POSITIVE_INFINITY;
    const canBefore = Number.isFinite(beforeGap) && beforeGap <= opt.mergeGap * 1.5
      && end - cues[lo - 1]!.start <= opt.maxDuration;
    const canAfter = Number.isFinite(afterGap) && afterGap <= opt.mergeGap * 1.5
      && cues[hi + 1]!.end - start <= opt.maxDuration;
    if (!canBefore && !canAfter) break;

    const wantAfter = !cues[hi]!.sentenceEnd;
    const wantBefore = !cues[lo]!.sentenceStart;
    let extendAfter: boolean;
    if (canAfter && wantAfter && !(canBefore && wantBefore)) extendAfter = true;
    else if (canBefore && wantBefore && !(canAfter && wantAfter)) extendAfter = false;
    else if (canAfter && canBefore) extendAfter = afterGap <= beforeGap;
    else extendAfter = canAfter;

    if (extendAfter) {
      hi += 1;
      end = cues[hi]!.end;
    } else {
      lo -= 1;
      start = cues[lo]!.start;
    }
  }
  return { lo, hi };
}

// 긴 cue 구간 [coreLo, coreHi]를 maxDuration 이내 윈도우로 나눈다. 가능하면 문장 끝에서 자른다.
function splitWindows(
  coreLo: number,
  coreHi: number,
  cues: CueMeta[],
  opt: HighlightCutOptions,
): Array<{ lo: number; hi: number }> {
  const windows: Array<{ lo: number; hi: number }> = [];
  let winLo = coreLo;
  for (let i = coreLo + 1; i <= coreHi; i += 1) {
    if (cues[i]!.end - cues[winLo]!.start <= opt.maxDuration) continue;
    // i를 넣으면 max 초과 → i 이전에서 윈도우를 닫는다. [winLo, i-1] 안 마지막 문장 끝 우선.
    let cutHi = i - 1;
    for (let j = i - 1; j >= winLo; j -= 1) {
      if (cues[j]!.sentenceEnd) { cutHi = j; break; }
    }
    if (cutHi < winLo) cutHi = winLo;
    windows.push({ lo: winLo, hi: cutHi });
    winLo = cutHi + 1;
  }
  windows.push({ lo: winLo, hi: coreHi });
  return windows;
}

// 고정된 cue 구간 [lo, hi]와 그 안의 하이라이트로 한 세그먼트를 만든다(확장 없음).
function buildSegmentFromRange(
  lo: number,
  hi: number,
  highlightIdxs: number[],
  cues: CueMeta[],
  reasonById: Map<string, string>,
  outline: EditOutlineSegment[] | null,
  opt: HighlightCutOptions,
): HighlightCutSegment {
  const start = cues[lo]!.start;
  // 단일 cue가 maxDuration보다 길면 단어 경계(없으면 그 지점)로 스냅해 자른다.
  let end = cues[hi]!.end;
  if (end - start > opt.maxDuration) end = wordSnapEnd(cues[hi]!, start + opt.maxDuration);
  const duration = end - start;
  const segCueIds = cues.slice(lo, hi + 1).map((c) => c.cueId);

  let outlineLabel = "";
  let bestOverlap = 0;
  if (outline) {
    const own = new Set(segCueIds);
    for (const segment of outline) {
      if (!segment || !Array.isArray(segment.cueIds)) continue;
      let overlap = 0;
      for (const id of segment.cueIds) if (own.has(id)) overlap += 1;
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        outlineLabel = typeof segment.label === "string" ? segment.label : "";
      }
    }
  }
  const outlineAligned = bestOverlap > 0;

  const firstHl = highlightIdxs[0]!;
  const firstHlReason = reasonById.get(cues[firstHl]!.cueId) ?? "";
  const reason = highlightIdxs
    .map((i) => reasonById.get(cues[i]!.cueId) ?? "")
    .filter((r) => r.length > 0)
    .slice(0, 2)
    .join(" · ");
  const title = (outlineLabel || firstHlReason || cues[lo]!.text).trim().slice(0, 60)
    || `구간 ${cues[lo]!.start.toFixed(0)}초`;

  const highlightCount = highlightIdxs.length;
  const density = Math.min(1, highlightCount / Math.max(1, duration / opt.mergeGap));
  const hook = cues[firstHl]!.start - start <= opt.hookWindow ? 1 : 0.3;
  const completeness = (cues[lo]!.sentenceStart ? 0.5 : 0) + (cues[hi]!.sentenceEnd ? 0.5 : 0);
  const durationFit = 1 - Math.min(1, Math.abs(duration - opt.idealDuration) / opt.idealDuration);
  const outlineScore = outlineAligned ? 1 : 0;
  const score = 0.35 * density + 0.2 * hook + 0.2 * completeness + 0.15 * durationFit + 0.1 * outlineScore;

  return {
    start,
    end,
    duration,
    cueIds: segCueIds,
    title,
    reason: reason || firstHlReason,
    score: Math.round(score * 1000) / 1000,
    highlightCount,
  };
}

/**
 * 자막 문서 + AI 하이라이트(+아웃라인)를 랭킹된 숏폼 컷 구간 후보로 변환한다.
 * 결정적 순수 함수: 같은 입력이면 항상 같은 출력. 하이라이트가 없으면 빈 배열.
 * 긴 하이라이트 런은 문장 경계에서 maxDuration 이내 여러 구간으로 분할한다.
 */
export function planHighlightCuts(
  document: SubtitleDocument,
  highlights: SubtitleHighlight[],
  outline: EditOutlineSegment[] | null = null,
  options?: Partial<HighlightCutOptions>,
): HighlightCutSegment[] {
  const opt = resolveOptions(options);

  const visible = document.cues
    .filter((c) => c.enabled && !c.hidden
      && Number.isFinite(c.start) && Number.isFinite(c.end) && c.end > c.start)
    .slice()
    .sort((a, b) => a.start - b.start);
  if (visible.length === 0) return [];

  const cues: CueMeta[] = visible.map((c, i) => ({
    cueId: c.cueId,
    start: c.start,
    end: c.end,
    text: c.text,
    words: Array.isArray(c.words) ? c.words : [],
    sentenceEnd: isSentenceEnd(c.text),
    sentenceStart: i === 0 ? true : isSentenceEnd(visible[i - 1]!.text),
  }));
  const indexById = new Map(cues.map((c, i) => [c.cueId, i]));

  const reasonById = new Map<string, string>();
  const hlIndices: number[] = [];
  for (const h of highlights) {
    if (!h || typeof h.cueId !== "string") continue;
    const idx = indexById.get(h.cueId);
    if (idx === undefined || reasonById.has(h.cueId)) continue;
    reasonById.set(h.cueId, typeof h.reason === "string" ? h.reason : "");
    hlIndices.push(idx);
  }
  if (hlIndices.length === 0) return [];
  hlIndices.sort((a, b) => a - b);

  // 근접도(gap ≤ mergeGap)만으로 묶는다. 길이 제한은 아래 분할이 처리한다.
  const clusters: number[][] = [];
  let current: number[] | null = null;
  for (const idx of hlIndices) {
    if (current && cues[idx]!.start - cues[current[current.length - 1]!]!.end <= opt.mergeGap) {
      current.push(idx);
      continue;
    }
    current = [idx];
    clusters.push(current);
  }

  const segments: HighlightCutSegment[] = [];
  for (const cluster of clusters) {
    const coreLo = cluster[0]!;
    const coreHi = cluster[cluster.length - 1]!;
    if (cues[coreHi]!.end - cues[coreLo]!.start <= opt.maxDuration) {
      const { lo, hi } = expandRange(cluster, cues, opt);
      segments.push(buildSegmentFromRange(lo, hi, cluster, cues, reasonById, outline, opt));
    } else {
      for (const window of splitWindows(coreLo, coreHi, cues, opt)) {
        const inWindow = cluster.filter((i) => i >= window.lo && i <= window.hi);
        if (inWindow.length === 0) continue;
        segments.push(buildSegmentFromRange(window.lo, window.hi, inWindow, cues, reasonById, outline, opt));
      }
    }
  }

  const usable = segments.filter((s) => s.duration >= 1 && s.end > s.start);
  usable.sort((a, b) => b.score - a.score || a.start - b.start);

  const accepted: HighlightCutSegment[] = [];
  for (const segment of usable) {
    if (accepted.some((a) => overlaps(a, segment))) continue;
    accepted.push(segment);
    if (accepted.length >= opt.maxSegments) break;
  }
  return accepted;
}
