// 자막 문서의 버전 스냅샷을 localStorage에 저장·복원하는 순수 계층 스토어 모듈(UI 배선 없음)
import {
  cloneSubtitleDocument,
  validateSubtitleDocument,
  type SubtitleDocument,
} from "./subtitles";

export const SUBTITLE_SNAPSHOT_STORAGE_KEY = "shortflow.subtitle-snapshots.v1";
export const MAX_SNAPSHOTS_PER_PROJECT = 10;
export const MAX_SNAPSHOTS_TOTAL = 60;

export interface SubtitleSnapshotRecord {
  /** 스냅샷 고유 id(저장 시 무작위 생성). */
  id: string;
  projectKey: string;
  label: string;
  /** 저장 시각(ISO 8601 문자열). */
  createdAt: string;
  /** 저장 당시 자막 문서의 복제본. */
  document: SubtitleDocument;
}

function randomSnapshotId(): string {
  return `snap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeSnapshotRecord(value: unknown): SubtitleSnapshotRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  const projectKey = typeof record.projectKey === "string" ? record.projectKey.trim() : "";
  if (!id || !projectKey) return null;
  if (!validateSubtitleDocument(record.document).valid) return null;
  return {
    id: id.slice(0, 80),
    projectKey: projectKey.slice(0, 500),
    label: typeof record.label === "string" ? record.label.slice(0, 80) : "",
    createdAt: typeof record.createdAt === "string" ? record.createdAt : "",
    document: cloneSubtitleDocument(record.document as SubtitleDocument),
  };
}

/** 손상·규격외 레코드를 버리고, 최신순 입력이라는 전제에서 프로젝트별·전체 상한을 적용한다(초과분은 가장 오래된 것부터 폐기). */
export function normalizeSnapshotRecords(value: unknown): SubtitleSnapshotRecord[] {
  const raw = Array.isArray(value) ? value : [];
  const out: SubtitleSnapshotRecord[] = [];
  const seenIds = new Set<string>();
  const perProject = new Map<string, number>();
  for (const item of raw) {
    if (out.length >= MAX_SNAPSHOTS_TOTAL) break;
    const record = normalizeSnapshotRecord(item);
    if (!record || seenIds.has(record.id)) continue;
    const count = perProject.get(record.projectKey) ?? 0;
    if (count >= MAX_SNAPSHOTS_PER_PROJECT) continue;
    seenIds.add(record.id);
    perProject.set(record.projectKey, count + 1);
    out.push(record);
  }
  return out;
}

function loadAllSnapshots(storage: Storage): SubtitleSnapshotRecord[] {
  try {
    const raw = storage.getItem(SUBTITLE_SNAPSHOT_STORAGE_KEY);
    return raw ? normalizeSnapshotRecords(JSON.parse(raw) as unknown) : [];
  } catch {
    return [];
  }
}

function saveAllSnapshots(records: SubtitleSnapshotRecord[], storage: Storage): SubtitleSnapshotRecord[] {
  const normalized = normalizeSnapshotRecords(records);
  try {
    storage.setItem(SUBTITLE_SNAPSHOT_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // 저장 실패(quota 등)는 조용히 무시한다 — 스냅샷은 보조 데이터라 편집 흐름을 막지 않는다.
  }
  return normalized;
}

/** 해당 프로젝트 키의 스냅샷을 최신순으로 반환한다(문서는 복제본이라 수정해도 안전). */
export function loadSubtitleSnapshots(
  projectKey: string,
  storage: Storage = localStorage,
): SubtitleSnapshotRecord[] {
  return loadAllSnapshots(storage).filter((item) => item.projectKey === projectKey);
}

/** 문서를 검증해 스냅샷으로 저장하고, 해당 프로젝트 키의 최신순 목록을 반환한다. 빈 라벨은 "큐 N개"로 자동 생성한다. */
export function saveSubtitleSnapshot(
  document: SubtitleDocument,
  label: string,
  storage: Storage = localStorage,
  now: Date = new Date(),
): SubtitleSnapshotRecord[] {
  if (!validateSubtitleDocument(document).valid) {
    const projectKey = document && typeof document.projectKey === "string" ? document.projectKey : "";
    return loadSubtitleSnapshots(projectKey, storage);
  }
  const trimmedLabel = label.trim();
  const record: SubtitleSnapshotRecord = {
    id: randomSnapshotId(),
    projectKey: document.projectKey,
    label: (trimmedLabel || `큐 ${document.cues.length}개`).slice(0, 80),
    createdAt: now.toISOString(),
    document: cloneSubtitleDocument(document),
  };
  return saveAllSnapshots([record, ...loadAllSnapshots(storage)], storage)
    .filter((item) => item.projectKey === record.projectKey);
}

/** id가 일치하는 스냅샷을 삭제하고, 해당 프로젝트 키의 최신순 목록을 반환한다. */
export function removeSubtitleSnapshot(
  projectKey: string,
  id: string,
  storage: Storage = localStorage,
): SubtitleSnapshotRecord[] {
  const rest = loadAllSnapshots(storage)
    .filter((item) => !(item.projectKey === projectKey && item.id === id));
  return saveAllSnapshots(rest, storage).filter((item) => item.projectKey === projectKey);
}
