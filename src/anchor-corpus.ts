// 앵커 샷 예시 코퍼스 — 뉴스 분할 분류에 참조 이미지(few-shot)로 쓰는 확신 높은 앵커 프레임 저장소
import { looksCompleteImage } from "./frame-diff";

export const ANCHOR_CORPUS_STORAGE_KEY = "shortflow.anchor-corpus.v1";
export const MAX_ANCHOR_EXEMPLARS = 8;
/** 272px PNG 기준 안전 상한 — localStorage 예산을 지킨다. */
export const MAX_ANCHOR_EXEMPLAR_BASE64_CHARS = 300_000;

export interface AnchorExemplar {
  id: string;
  label: string;
  capturedAt: string;
  pngBase64: string;
}

function randomId(): string {
  return `anchor-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.byteLength; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function normalizeAnchorExemplars(value: unknown): AnchorExemplar[] {
  if (!Array.isArray(value)) return [];
  const out: AnchorExemplar[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (typeof record.id !== "string" || record.id.length === 0) continue;
    if (typeof record.pngBase64 !== "string" || record.pngBase64.length === 0) continue;
    if (record.pngBase64.length > MAX_ANCHOR_EXEMPLAR_BASE64_CHARS) continue;
    if (out.some((existing) => existing.id === record.id)) continue;
    out.push({
      id: record.id,
      label: typeof record.label === "string" ? record.label.slice(0, 80) : "",
      capturedAt: typeof record.capturedAt === "string" ? record.capturedAt : "",
      pngBase64: record.pngBase64,
    });
  }
  return out.slice(0, MAX_ANCHOR_EXEMPLARS);
}

export function loadAnchorExemplars(storage: Storage = localStorage): AnchorExemplar[] {
  try {
    const raw = storage.getItem(ANCHOR_CORPUS_STORAGE_KEY);
    if (!raw) return [];
    return normalizeAnchorExemplars(JSON.parse(raw));
  } catch {
    return [];
  }
}

/**
 * 확신 높은 앵커 프레임을 예시로 저장한다(최신 우선, 상한 초과분 폐기).
 * 같은 label의 예시가 이미 있으면 갱신하지 않고 그대로 둔다(같은 방송 반복 분석이 코퍼스를 밀어내지 않게).
 */
export function saveAnchorExemplar(
  input: { label: string; bytes: Uint8Array },
  storage: Storage = localStorage,
  now = new Date(),
): AnchorExemplar[] {
  const existing = loadAnchorExemplars(storage);
  const label = input.label.trim().slice(0, 80);
  if (label && existing.some((exemplar) => exemplar.label === label)) return existing;
  // 잘린 PNG를 참조로 저장하면 이후 모든 분류 요청이 통째로 거부된다 — 완결 파일만 받는다.
  if (!looksCompleteImage(input.bytes, "png")) return existing;
  const pngBase64 = bytesToBase64(input.bytes);
  if (pngBase64.length === 0 || pngBase64.length > MAX_ANCHOR_EXEMPLAR_BASE64_CHARS) return existing;
  const next = [
    { id: randomId(), label, capturedAt: now.toISOString(), pngBase64 },
    ...existing,
  ].slice(0, MAX_ANCHOR_EXEMPLARS);
  try {
    storage.setItem(ANCHOR_CORPUS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    return existing;
  }
  return next;
}
