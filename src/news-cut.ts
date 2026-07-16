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

/** 같은 날짜의 기존 `YYYYMMDD_news_NN` 시퀀스 뒤에 이어 붙일 다음 번호(없으면 0). */
export function nextNewsItemIndex(existingNames: readonly string[], date: Date): number {
  const prefix = newsItemName(date, 0).slice(0, -2);
  let next = 0;
  for (const name of existingNames) {
    if (typeof name !== "string" || !name.startsWith(prefix)) continue;
    const suffix = name.slice(prefix.length);
    if (!/^\d{2,}$/.test(suffix)) continue;
    next = Math.max(next, Number(suffix) + 1);
  }
  return next;
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
 * 앵커 스냅 인점 리드(초) — §57에서 0.3s로 도입했으나 앞 기사 꼬리 그림이 보이는 부작용으로
 * §61 사용자 지시에 따라 0으로 확정(인점 = 앵커 샷 전환 컷 정확히). 상수는 정책 기록용으로 유지.
 */
export const NEWS_CUT_ANCHOR_LEAD_SECONDS = 0;

/** 앵커 샷 시작 시각에 인점 리드를 적용한다(0.1초 반올림, 0 미만 방지). */
function leadAdjusted(anchorStart: number): number {
  return Math.max(0, Math.round((anchorStart - NEWS_CUT_ANCHOR_LEAD_SECONDS) * 10) / 10);
}

/**
 * 아이템 시작을 앵커 샷 시작 시각(리드 적용)으로 스냅하고, 끝은 다음 아이템의 (스냅된)
 * 시작으로 잇는다 — 아이템 사이 내용이 잘려 나가지 않는 무결 분할. 스냅 시각이 없으면(null)
 * 텍스트 경계를 유지한다.
 */
export function snapItemsToAnchorStarts(
  items: readonly NewsItem[],
  anchorStarts: ReadonlyArray<number | null>,
): NewsItem[] {
  const snapped = items.map((item, index) => {
    const anchorStart = anchorStarts[index];
    return {
      ...item,
      start: typeof anchorStart === "number" && Number.isFinite(anchorStart) ? leadAdjusted(anchorStart) : item.start,
    };
  });
  return snapped
    .map((item, index) => {
      const next = snapped[index + 1];
      return { ...item, end: next ? next.start : item.end };
    })
    .filter((item) => item.end > item.start);
}

/** 내부 앵커 스캔을 수행하는 최소 아이템 길이(초) — 전형적 아이템(30초~3분)보다 길면 병합 의심. */
export const NEWS_CUT_INTERIOR_SPLIT_MIN_SECONDS = 180;

/**
 * 텍스트 분석이 경계를 만들지 못한 병합 아이템을 내부 앵커 컷에서 쪼갠다 — 아이템당
 * 내부 앵커 시작 시각 목록(비전 분류 결과)을 받아 각 컷(리드 적용)에서 분할하고, 새 조각의
 * 제목은 titleAt(컷 시각)으로 채운다. 경계에 너무 가까운(15초 미만 조각) 컷은 무시한다.
 */
export function splitItemsAtInteriorAnchors(
  items: readonly NewsItem[],
  interiorStarts: ReadonlyArray<readonly number[]>,
  titleAt: (time: number) => string,
  minPieceSeconds = 15,
): NewsItem[] {
  const out: NewsItem[] = [];
  for (const [index, item] of items.entries()) {
    const cuts = [...(interiorStarts[index] ?? [])]
      .filter((time) => Number.isFinite(time))
      .map((time) => leadAdjusted(time))
      .filter((time) => time - item.start >= minPieceSeconds && item.end - time >= minPieceSeconds)
      .sort((left, right) => left - right);
    let pieceStart = item.start;
    let first = true;
    for (const cut of cuts) {
      if (cut - pieceStart < minPieceSeconds) continue;
      out.push({ start: pieceStart, end: cut, title: first ? item.title : titleAt(pieceStart) || item.title });
      pieceStart = cut;
      first = false;
    }
    out.push({ start: pieceStart, end: item.end, title: first ? item.title : titleAt(pieceStart) || item.title });
  }
  return out;
}

/**
 * 스냅·분할 뒤에 남은 짧은 조각(전형: 앵커 리드 한 문장이 별도 아이템으로 쪼개진 경우)을
 * 다음 아이템으로 병합한다 — 리드가 곧 기사 헤드라인이므로 제목은 앞(짧은) 조각을 유지한다.
 * 마지막 아이템이 짧으면 앞 아이템으로 흡수한다(제목은 앞 것 유지).
 */
export function mergeShortItemsForward(items: readonly NewsItem[], minSeconds = 15): NewsItem[] {
  const out: NewsItem[] = [];
  let pending: NewsItem | null = null;
  for (const item of items) {
    const current: NewsItem = pending
      ? { start: pending.start, end: item.end, title: pending.title }
      : { ...item };
    pending = null;
    if (current.end - current.start < minSeconds) {
      pending = current;
      continue;
    }
    out.push(current);
  }
  if (pending) {
    const last = out.pop();
    out.push(last ? { ...last, end: pending.end } : pending);
  }
  return out;
}

/** UI 목록 표기 — mm:ss 구간과 제목. */
export function describeNewsItem(item: NewsItem, index: number): string {
  const clock = (seconds: number) => {
    const whole = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
  };
  return `${String(index).padStart(2, "0")} · ${clock(item.start)}~${clock(item.end)} · ${item.title}`;
}
