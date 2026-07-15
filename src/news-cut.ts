// 뉴스 전체 방송을 보도 아이템 단위로 나누는 순수 계층 — AI 경계 응답 정규화·아이템 이름 규칙
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

/** UI 목록 표기 — mm:ss 구간과 제목. */
export function describeNewsItem(item: NewsItem, index: number): string {
  const clock = (seconds: number) => {
    const whole = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
  };
  return `${String(index).padStart(2, "0")} · ${clock(item.start)}~${clock(item.end)} · ${item.title}`;
}
