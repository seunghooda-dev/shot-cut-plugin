// 뉴스 전체 방송을 보도 아이템 단위로 나누는 순수 계층 — AI 경계 응답 정규화·앵커 샷 스냅·아이템 이름 규칙
import { frameDifference } from "./frame-diff";
import type { SubtitleDocument } from "./subtitles";

export interface NewsItem {
  start: number;
  end: number;
  title: string;
}

export const NEWS_ITEM_MIN_DURATION_SECONDS = 15;
export const MAX_NEWS_ITEMS = 40;
const MAX_TITLE_CHARS = 60;

interface RawNewsItem {
  startCueId?: unknown;
  endCueId?: unknown;
  title?: unknown;
}

/**
 * news-items 분석 응답을 검증·정규화한다. cueId 참조만 신뢰하며(하우스 불변식),
 * 존재하지 않는 cueId·역전 구간은 조용히 드롭하고, 겹침은 앞 아이템의 끝으로 스냅해 해소한다.
 */
export function normalizeNewsItems(
  payload: unknown,
  document: SubtitleDocument,
  minDurationSeconds = NEWS_ITEM_MIN_DURATION_SECONDS,
): NewsItem[] {
  const raw = payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).items)
    ? ((payload as Record<string, unknown>).items as unknown[])
    : Array.isArray(payload) ? payload : [];
  const cueById = new Map(document.cues.map((cue) => [cue.cueId, cue]));
  const resolved: NewsItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as RawNewsItem;
    const startCue = typeof item.startCueId === "string" ? cueById.get(item.startCueId) : undefined;
    const endCue = typeof item.endCueId === "string" ? cueById.get(item.endCueId) : undefined;
    if (!startCue || !endCue) continue;
    const start = startCue.start;
    const end = endCue.end;
    if (!(end > start)) continue;
    const title = (typeof item.title === "string" ? item.title : "").trim().slice(0, MAX_TITLE_CHARS);
    resolved.push({ start, end, title });
  }
  resolved.sort((left, right) => left.start - right.start);
  const items: NewsItem[] = [];
  for (const item of resolved) {
    const previous = items.at(-1);
    const start = previous && item.start < previous.end ? previous.end : item.start;
    if (!(item.end - start >= minDurationSeconds)) continue;
    items.push({ ...item, start });
    if (items.length >= MAX_NEWS_ITEMS) break;
  }
  return items.map((item, index) => ({ ...item, title: item.title || `아이템 ${index + 1}` }));
}

/** 아이템 시퀀스·파일 이름 — 사용자 규칙 `YYYYMMDD_news_NN`(00부터). */
export function newsItemName(date: Date, index: number): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const day = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  return `${day}_news_${pad(index)}`;
}

/** 경계 스냅 스캔에서 컷으로 판정하는 인접 프레임 휘도차(§44 실측: 컷 ≥0.14, 동일 샷 ≤0.05). */
export const NEWS_CUT_SHOT_DIFF_THRESHOLD = 0.1;

export interface ShotSegment {
  start: number;
  end: number;
  midTime: number;
}

/**
 * 시간순 프레임 그리드를 컷 경계로 잘라 샷 구간 목록을 만든다(그리드 없는 프레임은 경계로 취급해
 * 잘못 병합되지 않게 한다). 각 샷의 midTime은 비전 분류용 대표 프레임 시각으로 쓴다.
 */
export function findShotSegments(
  samples: ReadonlyArray<{ time: number; grid: Float64Array | null }>,
  cutThreshold = NEWS_CUT_SHOT_DIFF_THRESHOLD,
): ShotSegment[] {
  const ordered = [...samples].sort((left, right) => left.time - right.time);
  if (ordered.length === 0) return [];
  const shots: ShotSegment[] = [];
  let shotStart = ordered[0]!.time;
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1]!;
    const current = ordered[index]!;
    const isCut = !previous.grid || !current.grid
      || frameDifference(previous.grid, current.grid) >= cutThreshold;
    if (isCut) {
      shots.push({ start: shotStart, end: current.time, midTime: (shotStart + current.time) / 2 });
      shotStart = current.time;
    }
  }
  const last = ordered.at(-1)!;
  shots.push({ start: shotStart, end: last.time, midTime: (shotStart + last.time) / 2 });
  return shots;
}

/**
 * 아이템 시작을 앵커 샷 시작 시각으로 스냅하고, 끝은 다음 아이템의 (스냅된) 시작으로 잇는다 —
 * 아이템 사이 내용이 잘려 나가지 않는 무결 분할. 스냅 시각이 없으면(null) 텍스트 경계를 유지한다.
 */
export function snapItemsToAnchorStarts(
  items: readonly NewsItem[],
  anchorStarts: ReadonlyArray<number | null>,
): NewsItem[] {
  const snapped = items.map((item, index) => {
    const anchorStart = anchorStarts[index];
    return {
      ...item,
      start: typeof anchorStart === "number" && Number.isFinite(anchorStart) ? anchorStart : item.start,
    };
  });
  return snapped
    .map((item, index) => {
      const next = snapped[index + 1];
      return { ...item, end: next ? next.start : item.end };
    })
    .filter((item) => item.end > item.start);
}

/** UI 목록 표기 — mm:ss 구간과 제목. */
export function describeNewsItem(item: NewsItem, index: number): string {
  const clock = (seconds: number) => {
    const whole = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
  };
  return `${String(index).padStart(2, "0")} · ${clock(item.start)}~${clock(item.end)} · ${item.title}`;
}
