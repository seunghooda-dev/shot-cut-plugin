// anchor-corpus — 앵커 샷 예시 저장소(라운드트립·라벨 중복 방지·상한·손상·잘린 PNG 방어) 테스트
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  ANCHOR_CORPUS_STORAGE_KEY,
  MAX_ANCHOR_EXEMPLARS,
  base64ToBytes,
  bytesToBase64,
  loadAnchorExemplars,
  normalizeAnchorExemplars,
  saveAnchorExemplar,
} from "../src/anchor-corpus";

/** 매직+IEND 트레일러를 갖춘 최소 완결 PNG 페이로드(내용 바이트는 자유). */
function fakePng(payload: number[]): Uint8Array {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...payload,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
}

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

describe("anchor-corpus", () => {
  let storage: Storage;
  beforeEach(() => { storage = memoryStorage(); });

  it("round-trips exemplar bytes through base64", () => {
    const bytes = fakePng([137, 80, 78, 71, 0, 255, 10, 13]);
    assert.deepEqual([...base64ToBytes(bytesToBase64(bytes))], [...bytes]);
    saveAnchorExemplar({ label: "anchor:테스트", bytes }, storage, new Date("2026-07-15T03:00:00Z"));
    const loaded = loadAnchorExemplars(storage);
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0]!.label, "anchor:테스트");
    assert.deepEqual([...base64ToBytes(loaded[0]!.pngBase64)], [...bytes]);
  });

  it("keeps the first exemplar per label and caps the corpus", () => {
    const bytes = fakePng([1, 2, 3]);
    saveAnchorExemplar({ label: "anchor:A", bytes }, storage);
    const again = saveAnchorExemplar({ label: "anchor:A", bytes: fakePng([9, 9]) }, storage);
    assert.equal(again.length, 1);
    assert.deepEqual([...base64ToBytes(again[0]!.pngBase64)], [...fakePng([1, 2, 3])]);
    for (let index = 0; index < MAX_ANCHOR_EXEMPLARS + 3; index += 1) {
      saveAnchorExemplar({ label: `anchor:${index}`, bytes }, storage);
    }
    assert.equal(loadAnchorExemplars(storage).length, MAX_ANCHOR_EXEMPLARS);
  });

  it("rejects truncated png bytes — a broken reference poisons every later request", () => {
    const truncated = fakePng([1, 2, 3]).subarray(0, 12);
    assert.equal(saveAnchorExemplar({ label: "anchor:잘림", bytes: truncated }, storage).length, 0);
    assert.deepEqual(loadAnchorExemplars(storage), []);
  });

  it("drops corrupt records and tolerates corrupt storage", () => {
    assert.deepEqual(normalizeAnchorExemplars([{ id: "x" }, null, 5, { id: "ok", pngBase64: "QQ==" }]).map((e) => e.id), ["ok"]);
    storage.setItem(ANCHOR_CORPUS_STORAGE_KEY, "{broken");
    assert.deepEqual(loadAnchorExemplars(storage), []);
  });
});
