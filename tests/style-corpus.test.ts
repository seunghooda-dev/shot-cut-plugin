// 스타일 코퍼스 저장·정규화·상한 테스트
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_STYLE_EXAMPLES,
  addStyleExample,
  clearStyleCorpus,
  loadStyleCorpus,
  normalizeStyleCorpus,
  saveStyleCorpus,
} from "../src/style-corpus";
import type { StyleExample } from "../src/shorts-learning";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    removeItem: (key: string) => { map.delete(key); },
    setItem: (key: string, value: string) => { map.set(key, value); },
  } as Storage;
}

const example = (title: string): StyleExample => ({
  transcript: `[c1] ${title}`,
  chosen: [{ cueIds: ["c1", "c2"], title, durationSeconds: 20 }],
});

describe("style corpus", () => {
  it("round-trips through save and load", () => {
    const storage = memoryStorage();
    saveStyleCorpus([example("A")], storage);
    assert.deepEqual(loadStyleCorpus(storage), [example("A")]);
  });

  it("prepends new examples and caps at the maximum", () => {
    const storage = memoryStorage();
    for (const t of ["A", "B", "C", "D", "E", "F"]) addStyleExample(example(t), storage);
    const corpus = loadStyleCorpus(storage);
    assert.equal(corpus.length, MAX_STYLE_EXAMPLES);
    // 최신(F)이 맨 앞, 가장 오래된 것부터 잘림
    assert.equal(corpus[0]!.chosen[0]!.title, "F");
  });

  it("drops malformed examples and choices during normalization", () => {
    const corpus = normalizeStyleCorpus([
      { transcript: "", chosen: [{ cueIds: ["c1"], title: "빈 전사", durationSeconds: 1 }] },
      { transcript: "ok", chosen: [] },
      { transcript: "ok", chosen: [{ cueIds: [], title: "빈 cue", durationSeconds: 1 }] },
      { transcript: "good", chosen: [{ cueIds: ["c1"], title: "정상", durationSeconds: 12 }] },
      "not an object",
    ]);
    assert.equal(corpus.length, 1);
    assert.equal(corpus[0]!.chosen[0]!.title, "정상");
  });

  it("returns [] for corrupt stored JSON", () => {
    const storage = memoryStorage();
    storage.setItem("shortflow.style-corpus.v1", "{not json");
    assert.deepEqual(loadStyleCorpus(storage), []);
  });

  it("clears the corpus", () => {
    const storage = memoryStorage();
    addStyleExample(example("A"), storage);
    clearStyleCorpus(storage);
    assert.deepEqual(loadStyleCorpus(storage), []);
  });
});
