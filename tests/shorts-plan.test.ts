// segmentsFromModelPlan(순수 변환) + validateAnalysisResponse shorts-plan 검증 테스트
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { segmentsFromModelPlan, snapSegmentsToSilence } from "../src/shorts-plan";
import type { HighlightCutSegment } from "../src/highlight-cut";
import { validateAnalysisResponse, type ShortsPlanItem, type SubtitleAnalysisRequest } from "../src/subtitle-controller";
import type { SubtitleCue, SubtitleDocument } from "../src/subtitles";

function cue(id: string, start: number, end: number, words: SubtitleCue["words"] = []): SubtitleCue {
  return { cueId: id, start, end, text: "말.", enabled: true, hidden: false, words };
}

// cue i: start=3i, end=3i+3
function doc(n: number): SubtitleDocument {
  const cues: SubtitleCue[] = [];
  for (let i = 0; i < n; i += 1) cues.push(cue(`c${i}`, 3 * i, 3 * i + 3));
  return { version: 1, projectKey: "sp", cues };
}

const short = (cueIds: string[], score: number, extra: Partial<ShortsPlanItem> = {}): ShortsPlanItem => ({
  cueIds, hook: "훅", title: "제목", score, reason: "이유", ...extra,
});

describe("segmentsFromModelPlan", () => {
  it("maps model cueIds to a timed segment", () => {
    const segments = segmentsFromModelPlan(doc(10), [short(["c1", "c2", "c3"], 0.8, { title: "핵심 순간" })]);
    assert.equal(segments.length, 1);
    const s = segments[0]!;
    assert.equal(s.start, 3);
    assert.equal(s.end, 12);
    assert.equal(s.duration, 9);
    assert.equal(s.title, "핵심 순간");
    assert.equal(s.score, 0.8);
    assert.deepEqual(s.cueIds, ["c1", "c2", "c3"]);
  });

  it("ignores cueIds absent from the document", () => {
    const segments = segmentsFromModelPlan(doc(10), [short(["c1", "nope", "c2"], 0.5)]);
    assert.equal(segments.length, 1);
    assert.deepEqual(segments[0]!.cueIds, ["c1", "c2"]);
  });

  it("drops a short whose cueIds are all invalid", () => {
    assert.deepEqual(segmentsFromModelPlan(doc(5), [short(["x", "y"], 0.9)]), []);
  });

  it("clamps a segment longer than maxDuration", () => {
    const segments = segmentsFromModelPlan(doc(10), [short(["c0", "c9"], 0.7)], { maxDuration: 20 });
    assert.ok(segments[0]!.duration <= 20, `duration ${segments[0]!.duration}`);
  });

  it("word-snaps a mid-cue clamp when the last cue has word timings", () => {
    const words = [5, 10, 15, 20, 25, 30].map((e, i) => ({ wordId: `w${i}`, s: e - 5, e, t: "말", hidden: false }));
    const single: SubtitleDocument = { version: 1, projectKey: "one", cues: [cue("c0", 0, 30, words)] };
    const s = segmentsFromModelPlan(single, [short(["c0"], 0.6)], { maxDuration: 22 })[0]!;
    assert.equal(s.end, 20);
  });

  it("drops a lower-scored overlapping short", () => {
    const segments = segmentsFromModelPlan(doc(10), [
      short(["c1", "c2", "c3"], 0.9),
      short(["c2", "c3", "c4"], 0.5),
    ]);
    assert.equal(segments.length, 1);
    assert.equal(segments[0]!.score, 0.9);
  });

  it("respects maxSegments and orders by score", () => {
    const segments = segmentsFromModelPlan(doc(20), [
      short(["c0"], 0.4), short(["c3"], 0.9), short(["c6"], 0.7), short(["c9"], 0.6),
    ], { maxSegments: 2 });
    assert.equal(segments.length, 2);
    assert.ok(segments[0]!.score >= segments[1]!.score);
    assert.equal(segments[0]!.score, 0.9);
  });

  it("carries the hook through to the segment (news-layout top text)", () => {
    const s = segmentsFromModelPlan(doc(10), [short(["c1", "c2"], 0.8, { hook: "충격 발언?", reason: "근거" })])[0]!;
    assert.equal(s.hook, "충격 발언?");
    assert.equal(s.reason, "근거"); // hook은 reason 폴백이 아니라 별도 보존
  });

  it("returns [] for no shorts", () => {
    assert.deepEqual(segmentsFromModelPlan(doc(5), []), []);
  });

  it("uses the latest-ending cue for the segment end (overlapping cues)", () => {
    const overlap: SubtitleDocument = {
      version: 1,
      projectKey: "ov",
      cues: [cue("a", 0, 30), cue("b", 5, 10)], // a가 b보다 늦게 끝남
    };
    const s = segmentsFromModelPlan(overlap, [short(["a", "b"], 0.8)])[0]!;
    assert.equal(s.start, 0);
    assert.equal(s.end, 30); // b.end(10)이 아니라 max end
  });
});

describe("validateAnalysisResponse (shorts-plan)", () => {
  const request: SubtitleAnalysisRequest = { action: "shorts-plan", document: doc(6) };

  it("keeps only existing cueIds and clamps score", () => {
    const result = validateAnalysisResponse({
      shorts: [{ cueIds: ["c1", "ghost", "c2"], hook: "h", title: "t", score: 5, reason: "r" }],
    }, request);
    assert.equal(result.action, "shorts-plan");
    if (result.action !== "shorts-plan") return;
    assert.equal(result.shorts.length, 1);
    assert.deepEqual(result.shorts[0]!.cueIds, ["c1", "c2"]);
    assert.equal(result.shorts[0]!.score, 1);
  });

  it("drops shorts with no valid cueIds and defaults a blank title/score", () => {
    const result = validateAnalysisResponse({
      shorts: [
        { cueIds: ["ghost"], hook: "h", title: "t", score: 0.5, reason: "r" },
        { cueIds: ["c0"], hook: "", title: "", score: "bad", reason: "" },
      ],
    }, request);
    if (result.action !== "shorts-plan") throw new Error("wrong action");
    assert.equal(result.shorts.length, 1);
    assert.equal(result.shorts[0]!.score, 0.5);
    assert.ok(result.shorts[0]!.title.length > 0);
  });

  it("returns an empty plan for a malformed shorts field", () => {
    const result = validateAnalysisResponse({ shorts: "nope" }, request);
    if (result.action !== "shorts-plan") throw new Error("wrong action");
    assert.deepEqual(result.shorts, []);
  });
});

describe("snapSegmentsToSilence", () => {
  const seg = (start: number, end: number): HighlightCutSegment => ({
    start, end, duration: end - start, cueIds: ["c"], title: "t", reason: "r", score: 0.5, highlightCount: 1,
  });

  it("snaps segment boundaries to nearby silence gap centers", () => {
    const gaps = [{ start: 9.5, end: 10.5 }, { start: 40, end: 41 }];
    const [s] = snapSegmentsToSilence([seg(9.7, 40.3)], gaps, 1);
    assert.equal(s!.start, 10);
    assert.equal(s!.end, 40.5);
    assert.equal(s!.duration, 30.5);
  });

  it("leaves segments unchanged when there are no gaps", () => {
    const input = [seg(5, 20)];
    assert.deepEqual(snapSegmentsToSilence(input, [], 1), input);
  });

  it("keeps the original when snapping would collapse the segment", () => {
    const original = seg(9.95, 10.05);
    const [s] = snapSegmentsToSilence([original], [{ start: 9.9, end: 10.1 }], 1);
    assert.deepEqual(s, original);
  });
});
