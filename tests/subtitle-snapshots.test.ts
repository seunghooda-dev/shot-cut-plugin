// subtitle-snapshots 스토어의 저장·복원·상한·삭제·손상 방어 테스트
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { createSubtitleDocument, type SubtitleDocument } from "../src/subtitles";
import {
  MAX_SNAPSHOTS_PER_PROJECT,
  MAX_SNAPSHOTS_TOTAL,
  SUBTITLE_SNAPSHOT_STORAGE_KEY,
  loadSubtitleSnapshots,
  normalizeSnapshotRecords,
  removeSubtitleSnapshot,
  saveSubtitleSnapshot,
  type SubtitleSnapshotRecord,
} from "../src/subtitle-snapshots";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => { map.delete(key); },
    setItem: (key: string, value: string) => { map.set(key, value); },
  } as Storage;
}

function doc(projectKey: string, texts: readonly string[] = ["안녕하세요", "반갑습니다"]): SubtitleDocument {
  return createSubtitleDocument(
    projectKey,
    texts.map((text, index) => ({ start: index * 2, end: index * 2 + 1.5, text })),
  );
}

function record(id: string, projectKey: string, overrides?: Partial<SubtitleSnapshotRecord>): SubtitleSnapshotRecord {
  return {
    id,
    projectKey,
    label: "라벨",
    createdAt: "2026-07-15T00:00:00.000Z",
    document: doc(projectKey),
    ...overrides,
  };
}

describe("subtitle-snapshots", () => {
  let storage: Storage;
  beforeEach(() => { storage = memoryStorage(); });

  it("saves and loads a snapshot round-trip with clone safety", () => {
    const original = doc("proj-a", ["첫 큐", "둘째 큐"]);
    const saved = saveSubtitleSnapshot(original, "버전 1", storage, new Date("2026-07-15T09:30:00Z"));
    assert.equal(saved.length, 1);
    const snapshot = saved[0]!;
    assert.ok(snapshot.id);
    assert.equal(snapshot.projectKey, "proj-a");
    assert.equal(snapshot.label, "버전 1");
    assert.equal(snapshot.createdAt, "2026-07-15T09:30:00.000Z");
    assert.deepEqual(snapshot.document, original);

    original.cues[0]!.text = "저장 후 변조";
    const loaded = loadSubtitleSnapshots("proj-a", storage);
    assert.equal(loaded[0]!.document.cues[0]!.text, "첫 큐"); // 원본 변조와 격리

    loaded[0]!.document.cues[0]!.text = "로드본 변조";
    assert.equal(loadSubtitleSnapshots("proj-a", storage)[0]!.document.cues[0]!.text, "첫 큐"); // 로드본 변조와 격리
  });

  it("auto-generates 큐 N개 label when label is blank", () => {
    const document = doc("proj-a", ["하나", "둘", "셋"]);
    assert.equal(saveSubtitleSnapshot(document, "", storage)[0]!.label, "큐 3개");
    assert.equal(saveSubtitleSnapshot(document, "   ", storage)[0]!.label, "큐 3개");
  });

  it("keeps at most 10 snapshots per project, newest first", () => {
    const document = doc("proj-a");
    let list: SubtitleSnapshotRecord[] = [];
    for (let index = 1; index <= MAX_SNAPSHOTS_PER_PROJECT + 1; index += 1) {
      list = saveSubtitleSnapshot(document, `v${index}`, storage, new Date(Date.UTC(2026, 6, 15, 0, 0, index)));
    }
    assert.equal(list.length, MAX_SNAPSHOTS_PER_PROJECT);
    assert.deepEqual(
      list.map((item) => item.label),
      Array.from({ length: MAX_SNAPSHOTS_PER_PROJECT }, (_, index) => `v${MAX_SNAPSHOTS_PER_PROJECT + 1 - index}`),
    ); // v11이 맨 앞, 가장 오래된 v1은 폐기
    assert.equal(loadSubtitleSnapshots("proj-a", storage).length, MAX_SNAPSHOTS_PER_PROJECT);
  });

  it("caps total snapshots at 60 across projects, dropping oldest", () => {
    const projectCount = 7; // 7 × 10 = 70 > 60
    for (let project = 0; project < projectCount; project += 1) {
      const document = doc(`proj-${project}`);
      for (let index = 0; index < MAX_SNAPSHOTS_PER_PROJECT; index += 1) {
        saveSubtitleSnapshot(document, `p${project}-v${index}`, storage);
      }
    }
    const counts = Array.from(
      { length: projectCount },
      (_, project) => loadSubtitleSnapshots(`proj-${project}`, storage).length,
    );
    assert.equal(counts.reduce((sum, count) => sum + count, 0), MAX_SNAPSHOTS_TOTAL);
    assert.equal(counts[0], 0); // 가장 먼저 저장한 프로젝트의 스냅샷부터 폐기
    assert.equal(counts[projectCount - 1], MAX_SNAPSHOTS_PER_PROJECT);
  });

  it("removes a snapshot by id and ignores wrong project or unknown id", () => {
    const document = doc("proj-a");
    saveSubtitleSnapshot(document, "v1", storage);
    saveSubtitleSnapshot(document, "v2", storage);
    const list = saveSubtitleSnapshot(document, "v3", storage);
    const target = list.find((item) => item.label === "v2")!;
    const afterRemove = removeSubtitleSnapshot("proj-a", target.id, storage);
    assert.deepEqual(afterRemove.map((item) => item.label), ["v3", "v1"]);
    assert.equal(removeSubtitleSnapshot("proj-a", "없는-id", storage).length, 2);
    assert.equal(removeSubtitleSnapshot("proj-b", afterRemove[0]!.id, storage).length, 0); // 다른 키로는 삭제되지 않는다
    assert.equal(loadSubtitleSnapshots("proj-a", storage).length, 2);
  });

  it("drops corrupt JSON and malformed records silently", () => {
    assert.equal(SUBTITLE_SNAPSHOT_STORAGE_KEY, "shortflow.subtitle-snapshots.v1");
    storage.setItem(SUBTITLE_SNAPSHOT_STORAGE_KEY, "{손상된 json");
    assert.deepEqual(loadSubtitleSnapshots("proj-a", storage), []);

    storage.setItem(SUBTITLE_SNAPSHOT_STORAGE_KEY, JSON.stringify([
      null,
      42,
      { junk: true },
      { ...record("snap_noid", "proj-a"), id: "" },
      { ...record("snap_badver", "proj-a"), document: { ...doc("proj-a"), version: 2 } },
      { ...record("snap_badcues", "proj-a"), document: { version: 1, projectKey: "proj-a", cues: "배열 아님" } },
      record("snap_ok", "proj-a"),
    ]));
    const loaded = loadSubtitleSnapshots("proj-a", storage);
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0]!.id, "snap_ok");
  });

  it("normalizeSnapshotRecords deduplicates ids and rejects non-arrays", () => {
    const normalized = normalizeSnapshotRecords([
      record("snap_dup", "proj-a", { label: "먼저" }),
      record("snap_dup", "proj-a", { label: "나중" }),
    ]);
    assert.equal(normalized.length, 1);
    assert.equal(normalized[0]!.label, "먼저");
    assert.deepEqual(normalizeSnapshotRecords("junk"), []);
    assert.deepEqual(normalizeSnapshotRecords(undefined), []);
  });

  it("isolates snapshots between project keys", () => {
    saveSubtitleSnapshot(doc("proj-a", ["에이"]), "a1", storage);
    saveSubtitleSnapshot(doc("proj-b", ["비"]), "b1", storage);
    const listA = loadSubtitleSnapshots("proj-a", storage);
    assert.deepEqual(listA.map((item) => item.label), ["a1"]);
    assert.deepEqual(loadSubtitleSnapshots("proj-b", storage).map((item) => item.label), ["b1"]);
    removeSubtitleSnapshot("proj-a", listA[0]!.id, storage);
    assert.equal(loadSubtitleSnapshots("proj-a", storage).length, 0);
    assert.equal(loadSubtitleSnapshots("proj-b", storage).length, 1); // 다른 프로젝트는 그대로
  });

  it("returns the computed list even when storage.setItem throws (quota)", () => {
    const quota = memoryStorage();
    quota.setItem = () => { throw new Error("QuotaExceededError"); };
    const saved = saveSubtitleSnapshot(doc("proj-a"), "v1", quota);
    assert.equal(saved.length, 1); // 반환 목록은 계산 결과 그대로
    assert.equal(loadSubtitleSnapshots("proj-a", quota).length, 0); // 실제 저장은 되지 않았다
  });

  it("rejects an invalid document on save and keeps the store unchanged", () => {
    saveSubtitleSnapshot(doc("proj-a"), "v1", storage);
    const badDoc = { version: 2, projectKey: "proj-a", cues: [] } as unknown as SubtitleDocument;
    const result = saveSubtitleSnapshot(badDoc, "나쁜 문서", storage);
    assert.deepEqual(result.map((item) => item.label), ["v1"]); // 기존 목록만 반환
    assert.equal(loadSubtitleSnapshots("proj-a", storage).length, 1);
  });
});
