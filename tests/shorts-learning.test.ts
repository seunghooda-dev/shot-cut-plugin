// alignShortToOriginal — 숏폼 전사를 원본 cueId로 역추적하는 순수 정렬 로직 테스트
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { alignShortToOriginal, buildStyleExample, formatStyleExamplesForPrompt } from "../src/shorts-learning";
import type { SubtitleCue, SubtitleDocument } from "../src/subtitles";

function cue(id: string, text: string): SubtitleCue {
  return { cueId: id, start: 0, end: 1, text, enabled: true, hidden: false, words: [] };
}

// 각 cue가 고유 토큰을 갖도록(alphaN betaN) 만들어 매칭을 명확히 한다.
function original(n: number): SubtitleDocument {
  const cues: SubtitleCue[] = [];
  for (let i = 0; i < n; i += 1) cues.push(cue(`c${i}`, `alpha${i} beta${i}`));
  return { version: 1, projectKey: "orig", cues };
}

function shortFrom(texts: string[]): SubtitleDocument {
  return { version: 1, projectKey: "short", cues: texts.map((t, i) => cue(`s${i}`, t)) };
}

describe("alignShortToOriginal", () => {
  it("recovers the contiguous original cueIds a short was cut from", () => {
    const result = alignShortToOriginal(original(10), shortFrom(["alpha2 beta2", "alpha3 beta3", "alpha4 beta4"]));
    assert.equal(result.spans.length, 1);
    assert.deepEqual(result.spans[0]!.cueIds, ["c2", "c3", "c4"]);
    assert.ok(result.coverage > 0.99, `coverage ${result.coverage}`);
  });

  it("returns two spans when a short was edited from two separate moments", () => {
    const result = alignShortToOriginal(original(10), shortFrom(["alpha1 beta1", "alpha7 beta7"]));
    assert.equal(result.spans.length, 2);
    assert.deepEqual(result.spans[0]!.cueIds, ["c1"]);
    assert.deepEqual(result.spans[1]!.cueIds, ["c7"]);
  });

  it("fails (no spans) when the short does not come from the original", () => {
    const result = alignShortToOriginal(original(10), shortFrom(["zzz1 zzz2", "qqq3 qqq4"]));
    assert.deepEqual(result.spans, []);
    assert.ok(result.coverage < 0.5, `coverage ${result.coverage}`);
  });

  it("ignores punctuation and case when matching", () => {
    const orig: SubtitleDocument = { version: 1, projectKey: "o", cues: [cue("c0", "Hello, World!"), cue("c1", "다른 문장.")] };
    const result = alignShortToOriginal(orig, shortFrom(["hello world"]));
    assert.deepEqual(result.spans, [{ cueIds: ["c0"] }]);
  });

  it("returns empty for an empty short", () => {
    assert.deepEqual(alignShortToOriginal(original(5), shortFrom([])).spans, []);
  });

  it("is deterministic", () => {
    const orig = original(12);
    const short = shortFrom(["alpha3 beta3", "alpha4 beta4"]);
    assert.deepEqual(alignShortToOriginal(orig, short), alignShortToOriginal(orig, short));
  });
});

describe("buildStyleExample + formatStyleExamplesForPrompt", () => {
  const timed: SubtitleDocument = {
    version: 1,
    projectKey: "timed",
    cues: [
      { cueId: "c0", start: 0, end: 5, text: "인트로.", enabled: true, hidden: false, words: [] },
      { cueId: "c1", start: 5, end: 12, text: "핵심 순간 하나.", enabled: true, hidden: false, words: [] },
      { cueId: "c2", start: 12, end: 20, text: "핵심 순간 둘.", enabled: true, hidden: false, words: [] },
      { cueId: "c3", start: 20, end: 24, text: "마무리.", enabled: true, hidden: false, words: [] },
    ],
  };

  it("turns aligned spans into a style example with duration and transcript", () => {
    const example = buildStyleExample(timed, [{ cueIds: ["c1", "c2"] }], { title: "핵심 모음" });
    assert.ok(example);
    assert.equal(example!.chosen.length, 1);
    assert.deepEqual(example!.chosen[0]!.cueIds, ["c1", "c2"]);
    assert.equal(example!.chosen[0]!.title, "핵심 모음");
    assert.equal(example!.chosen[0]!.durationSeconds, 15); // 20 - 5
    assert.ok(example!.transcript.includes("[c1]") && example!.transcript.includes("[c2]"));
    assert.ok(!example!.transcript.includes("[c0]"));
  });

  it("returns null when no span maps to real cues", () => {
    assert.equal(buildStyleExample(timed, [{ cueIds: ["ghost"] }]), null);
    assert.equal(buildStyleExample(timed, []), null);
  });

  it("formats examples into few-shot prompt text with cueIds and title", () => {
    const example = buildStyleExample(timed, [{ cueIds: ["c1", "c2"] }], { title: "핵심 모음" })!;
    const text = formatStyleExamplesForPrompt([example]);
    assert.ok(text.includes("Chosen shorts"));
    assert.ok(text.includes("\"c1\"") && text.includes("핵심 모음"));
    assert.equal(formatStyleExamplesForPrompt([]), "");
  });
});
