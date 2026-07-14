// 샷 초점 감지 결과(FocalSpan)를 구간 단위로 재사용하는 localStorage 캐시 — 재생성 시 비전 호출 0회
import type { FocalSpan } from "./shot-focus";

export const VISION_CACHE_STORAGE_KEY = "shortflow.vision-cache.v1";
export const VISION_CACHE_MAX_ENTRIES = 24;
/** 소스 시퀀스가 편집되면 캐시가 낡는다 — 6시간 뒤 자동 폐기. */
export const VISION_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface VisionCacheEntry {
  key: string;
  createdAt: number;
  spans: FocalSpan[];
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeSpan(value: unknown): FocalSpan | null {
  if (!value || typeof value !== "object") return null;
  const span = value as Record<string, unknown>;
  if (!isFiniteNumber(span.start) || !isFiniteNumber(span.end) || span.end <= span.start) return null;
  if (!isFiniteNumber(span.x) || !isFiniteNumber(span.y)) return null;
  return {
    start: span.start,
    end: span.end,
    x: span.x,
    y: span.y,
    ...(isFiniteNumber(span.zoom) ? { zoom: span.zoom } : {}),
    ...(span.transition === "cut" || span.transition === "pan" ? { transition: span.transition } : {}),
  };
}

function normalizeEntries(value: unknown, now: number): VisionCacheEntry[] {
  if (!Array.isArray(value)) return [];
  const out: VisionCacheEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    if (typeof entry.key !== "string" || entry.key.length === 0) continue;
    if (!isFiniteNumber(entry.createdAt) || now - entry.createdAt > VISION_CACHE_TTL_MS) continue;
    if (!Array.isArray(entry.spans) || entry.spans.length === 0) continue;
    const spans = entry.spans.map(normalizeSpan);
    if (spans.some((span) => span === null)) continue;
    if (out.some((existing) => existing.key === entry.key)) continue;
    out.push({ key: entry.key, createdAt: entry.createdAt, spans: spans as FocalSpan[] });
  }
  return out.slice(0, VISION_CACHE_MAX_ENTRIES);
}

function loadEntries(storage: Storage, now: number): VisionCacheEntry[] {
  try {
    const raw = storage.getItem(VISION_CACHE_STORAGE_KEY);
    if (!raw) return [];
    return normalizeEntries(JSON.parse(raw), now);
  } catch {
    return [];
  }
}

function saveEntries(storage: Storage, entries: VisionCacheEntry[]): void {
  try {
    storage.setItem(VISION_CACHE_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // 저장 실패(용량 등)는 캐시 미사용과 동일 — 조용히 무시.
  }
}

/** 캐시된 스팬을 돌려준다(만료·손상은 miss). 반환 스팬은 복제본이라 수정해도 안전하다. */
export function loadCachedSpans(key: string, storage: Storage = localStorage, now = Date.now()): FocalSpan[] | null {
  const entry = loadEntries(storage, now).find((item) => item.key === key);
  return entry ? entry.spans.map((span) => ({ ...span })) : null;
}

/** 감지 결과를 캐시에 저장한다(같은 키 교체, 최신이 앞, 상한 초과분 폐기). */
export function saveCachedSpans(key: string, spans: FocalSpan[], storage: Storage = localStorage, now = Date.now()): void {
  const normalized = spans.map(normalizeSpan);
  if (key.length === 0 || normalized.length === 0 || normalized.some((span) => span === null)) return;
  const rest = loadEntries(storage, now).filter((item) => item.key !== key);
  const entries = [{ key, createdAt: now, spans: normalized as FocalSpan[] }, ...rest]
    .slice(0, VISION_CACHE_MAX_ENTRIES);
  saveEntries(storage, entries);
}
