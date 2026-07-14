// 자막 하이라이트·아웃라인·타임코드를 숏폼 컷 구간 후보로 변환하는 순수 판단 로직
import type { SubtitleDocument } from "./subtitles";
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

// 문장 종결부호(다국어)로 끝나면 문장 끝으로 본다. 따옴표·공백은 벗겨내고 마지막 글자를 검사.
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
  sentenceEnd: boolean;
  sentenceStart: boolean;
}

function overlaps(a: HighlightCutSegment, b: HighlightCutSegment): boolean {
  return a.start < b.end && b.start < a.end;
}

// 클러스터(하이라이트 cue 인덱스 묶음)를 목표 길이에 맞춰 앞뒤 cue로 확장/클램프하고 문장 경계에 스냅한다.
function buildSegment(
  cluster: number[],
  cues: CueMeta[],
  reasonById: Map<string, string>,
  outline: EditOutlineSegment[] | null,
  opt: HighlightCutOptions,
): HighlightCutSegment {
  let lo = cluster[0]!;
  let hi = cluster[cluster.length - 1]!;
  let start = cues[lo]!.start;
  let end = cues[hi]!.end;

  // 너무 길면 뒤를 잘라 maxDuration 이내로. 잘린 끝을 cue 경계에 맞춰 hi 재계산.
  if (end - start > opt.maxDuration) {
    const limit = start + opt.maxDuration;
    let newHi = lo;
    for (let i = lo; i <= hi; i += 1) {
      if (cues[i]!.end <= limit) newHi = i;
      else break;
    }
    hi = Math.max(lo, newHi);
    end = cues[hi]!.end;
    // 단일 cue가 maxDuration보다 길어 cue 경계로 못 줄이면 최후로 중간을 자른다.
    if (end - start > opt.maxDuration) end = start + opt.maxDuration;
  }

  // 너무 짧으면 인접 cue를 앞뒤로 붙여 idealDuration까지 확장.
  while (end - start < opt.idealDuration) {
    const beforeGap = lo - 1 >= 0 ? cues[lo]!.start - cues[lo - 1]!.end : Number.POSITIVE_INFINITY;
    const afterGap = hi + 1 < cues.length ? cues[hi + 1]!.start - cues[hi]!.end : Number.POSITIVE_INFINITY;
    const canBefore = Number.isFinite(beforeGap) && beforeGap <= opt.mergeGap * 1.5
      && end - cues[lo - 1]!.start <= opt.maxDuration;
    const canAfter = Number.isFinite(afterGap) && afterGap <= opt.mergeGap * 1.5
      && cues[hi + 1]!.end - start <= opt.maxDuration;
    if (!canBefore && !canAfter) break;

    // 문장 경계를 완성하는 방향을 우선한다. 끝이 문장 끝이 아니면 뒤로, 시작이 문장 시작이 아니면 앞으로.
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

  const duration = end - start;
  const segCueIds = cues.slice(lo, hi + 1).map((c) => c.cueId);

  // 아웃라인 정렬: cueId 겹침이 가장 큰 아웃라인 세그먼트의 라벨을 제목으로.
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

  const firstHlReason = reasonById.get(cues[cluster[0]!]!.cueId) ?? "";
  const reason = cluster
    .map((i) => reasonById.get(cues[i]!.cueId) ?? "")
    .filter((r) => r.length > 0)
    .slice(0, 2)
    .join(" · ");
  const title = (outlineLabel || firstHlReason || cues[cluster[0]!]!.text).trim().slice(0, 60)
    || `구간 ${cues[lo]!.start.toFixed(0)}초`;

  // 점수(0~1): 하이라이트 밀도·훅(시작 직후 하이라이트)·완결성(문장 경계)·길이 적합·아웃라인 정렬.
  const highlightCount = cluster.length;
  const density = Math.min(1, highlightCount / Math.max(1, duration / opt.mergeGap));
  const firstHlStart = cues[cluster[0]!]!.start;
  const hook = firstHlStart - start <= opt.hookWindow ? 1 : 0.3;
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

  const clusters: number[][] = [];
  let current: number[] | null = null;
  for (const idx of hlIndices) {
    if (current) {
      const gap = cues[idx]!.start - cues[current[current.length - 1]!]!.end;
      const span = cues[idx]!.end - cues[current[0]!]!.start;
      if (gap <= opt.mergeGap && span <= opt.maxDuration) {
        current.push(idx);
        continue;
      }
    }
    current = [idx];
    clusters.push(current);
  }

  const segments = clusters
    .map((cluster) => buildSegment(cluster, cues, reasonById, outline, opt))
    .filter((s) => s.duration >= 1 && s.end > s.start);

  segments.sort((a, b) => b.score - a.score || a.start - b.start);

  const accepted: HighlightCutSegment[] = [];
  for (const segment of segments) {
    if (accepted.some((a) => overlaps(a, segment))) continue;
    accepted.push(segment);
    if (accepted.length >= opt.maxSegments) break;
  }
  return accepted;
}
