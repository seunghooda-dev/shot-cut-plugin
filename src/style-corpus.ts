// 사용자 편집 스타일 few-shot 예시(스타일 코퍼스)를 영속 저장·정규화하는 모듈
import type { StyleExample, StyleExampleChoice } from "./shorts-learning";

const STYLE_CORPUS_KEY = "shortflow.style-corpus.v1";
export const MAX_STYLE_EXAMPLES = 4;
const MAX_TRANSCRIPT_CHARS = 6_000;
const MAX_CHOICES_PER_EXAMPLE = 12;
const MAX_CUEIDS_PER_CHOICE = 400;

function normalizeChoice(value: unknown): StyleExampleChoice | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const cueIds = Array.isArray(record.cueIds)
    ? record.cueIds.filter((id): id is string => typeof id === "string").slice(0, MAX_CUEIDS_PER_CHOICE)
    : [];
  if (cueIds.length === 0) return null;
  return {
    cueIds,
    title: typeof record.title === "string" ? record.title.slice(0, 60) : "",
    durationSeconds: typeof record.durationSeconds === "number" && Number.isFinite(record.durationSeconds)
      ? Math.max(0, record.durationSeconds) : 0,
  };
}

function normalizeExample(value: unknown): StyleExample | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const transcript = typeof record.transcript === "string" ? record.transcript.slice(0, MAX_TRANSCRIPT_CHARS) : "";
  if (!transcript) return null;
  const rawChosen = Array.isArray(record.chosen) ? record.chosen : [];
  const chosen: StyleExampleChoice[] = [];
  for (const item of rawChosen) {
    const choice = normalizeChoice(item);
    if (choice) chosen.push(choice);
    if (chosen.length >= MAX_CHOICES_PER_EXAMPLE) break;
  }
  if (chosen.length === 0) return null;
  return { transcript, chosen };
}

export function normalizeStyleCorpus(value: unknown): StyleExample[] {
  const raw = Array.isArray(value) ? value : [];
  const out: StyleExample[] = [];
  for (const item of raw) {
    const example = normalizeExample(item);
    if (example) out.push(example);
    if (out.length >= MAX_STYLE_EXAMPLES) break;
  }
  return out;
}

export function loadStyleCorpus(storage: Storage = localStorage): StyleExample[] {
  try {
    const raw = storage.getItem(STYLE_CORPUS_KEY);
    return raw ? normalizeStyleCorpus(JSON.parse(raw) as unknown) : [];
  } catch {
    return [];
  }
}

export function saveStyleCorpus(examples: StyleExample[], storage: Storage = localStorage): StyleExample[] {
  const normalized = normalizeStyleCorpus(examples);
  storage.setItem(STYLE_CORPUS_KEY, JSON.stringify(normalized));
  return normalized;
}

// 최신 예시를 앞에 넣고 상한(MAX_STYLE_EXAMPLES)을 넘으면 오래된 것부터 버린다.
export function addStyleExample(example: StyleExample, storage: Storage = localStorage): StyleExample[] {
  return saveStyleCorpus([example, ...loadStyleCorpus(storage)], storage);
}

export function clearStyleCorpus(storage: Storage = localStorage): void {
  storage.removeItem(STYLE_CORPUS_KEY);
}
