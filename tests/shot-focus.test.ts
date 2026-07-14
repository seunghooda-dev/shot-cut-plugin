// shot-focus — 샘플 시각 계획·샷 단위 초점 스팬 순수 로직 테스트
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planSampleTimes, planShotFocalSpans } from "../src/shot-focus";

describe("planSampleTimes", () => {
  it("uses cue midpoints inside the segment and fills with a uniform grid", () => {
    const times = planSampleTimes(10, 40, [12, 25, 38, 5, 60]);
    assert.ok(times.length >= 3);
    assert.ok(times.includes(12) && times.includes(25) && times.includes(38));
    for (const t of times) assert.ok(t > 10 && t < 40, `범위 밖 ${t}`);
  });

  it("respects the minimum gap between samples", () => {
    const times = planSampleTimes(0, 30, [10, 10.2, 10.4, 20], { minGapSeconds: 2 });
    for (let i = 1; i < times.length; i += 1) {
      assert.ok(times[i]! - times[i - 1]! >= 2 - 1e-9, `간격 위반 ${times[i - 1]}→${times[i]}`);
    }
  });

  it("caps the sample count while keeping both ends", () => {
    const times = planSampleTimes(0, 60, [], { maxSamples: 8 });
    assert.ok(times.length <= 8, `개수 ${times.length}`);
  });

  it("returns [] for an invalid range", () => {
    assert.deepEqual(planSampleTimes(10, 10, [5]), []);
    assert.deepEqual(planSampleTimes(Number.NaN, 5, []), []);
  });
});

const sample = (time: number, x: number, confidence = 0.9) => ({ time, x, y: 0.3, confidence });

describe("planShotFocalSpans", () => {
  it("keeps one span with the mean focal when the subject is stable", () => {
    const spans = planShotFocalSpans([sample(2, 0.5), sample(5, 0.52), sample(8, 0.48)], 0, 10);
    assert.equal(spans.length, 1);
    assert.deepEqual(spans[0], { start: 0, end: 10, x: 0.5, y: 0.3 });
  });

  it("splits at a camera cut (x jump) with the boundary midway between samples", () => {
    const spans = planShotFocalSpans([sample(2, 0.5), sample(4, 0.5), sample(6, 0.75), sample(8, 0.75)], 0, 10);
    assert.equal(spans.length, 2);
    assert.equal(spans[0]!.start, 0);
    assert.equal(spans[0]!.end, 5); // (4+6)/2
    assert.equal(spans[1]!.start, 5);
    assert.equal(spans[1]!.end, 10);
    assert.equal(spans[0]!.x, 0.5);
    assert.equal(spans[1]!.x, 0.75);
  });

  it("handles multiple alternating cuts", () => {
    const spans = planShotFocalSpans(
      [sample(1, 0.5), sample(3, 0.72), sample(5, 0.5), sample(7, 0.72)],
      0,
      8,
    );
    assert.equal(spans.length, 4);
    assert.equal(spans[3]!.end, 8);
  });

  it("ignores low-confidence samples and out-of-range times", () => {
    const spans = planShotFocalSpans(
      [sample(2, 0.5), sample(5, 0.9, 0.1), sample(20, 0.9), sample(8, 0.52)],
      0,
      10,
    );
    assert.equal(spans.length, 1);
    assert.equal(spans[0]!.x, 0.51);
  });

  it("returns [] when no usable samples", () => {
    assert.deepEqual(planShotFocalSpans([], 0, 10), []);
    assert.deepEqual(planShotFocalSpans([sample(2, 0.5, 0.1)], 0, 10), []);
    assert.deepEqual(planShotFocalSpans([sample(2, 0.5)], 5, 5), []);
  });

  it("covers the whole segment (first span starts at start, last ends at end)", () => {
    const spans = planShotFocalSpans([sample(93, 0.5), sample(100, 0.7), sample(110, 0.5)], 86, 146);
    assert.equal(spans[0]!.start, 86);
    assert.equal(spans[spans.length - 1]!.end, 146);
  });

  it("is deterministic", () => {
    const input = [sample(2, 0.5), sample(6, 0.75)];
    assert.deepEqual(planShotFocalSpans(input, 0, 10), planShotFocalSpans(input, 0, 10));
  });
});
