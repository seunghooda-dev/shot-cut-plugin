// shot-focus — 샘플 시각 계획·샷 단위 초점 스팬 순수 로직 테스트
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { annotateSpanTransitions, correctedFocalX, planSampleTimes, planShotFocalSpans, planSpanHoldWindows } from "../src/shot-focus";

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

describe("planShotFocalSpans v2 (median·merge·zoom)", () => {
  it("uses the median focal, not the blended mean (mixed-shot contamination)", () => {
    // 0.50 다수 + 0.56 소수가 한 그룹(점프 0.06<0.08) → 평균 0.523이 아니라 중간값 0.50.
    const spans = planShotFocalSpans(
      [sample(2, 0.5), sample(4, 0.5), sample(6, 0.56), sample(8, 0.5)],
      0,
      10,
    );
    assert.equal(spans.length, 1);
    assert.equal(spans[0]!.x, 0.5);
  });

  it("merges adjacent groups whose medians are nearly equal (noise split)", () => {
    // 0.50그룹 → 점프(0.085)로 분할된 0.56그룹(중간값 0.56): 기본 임계 0.05로는 유지(차 0.06),
    // mergeThreshold 0.07로 넓히면 병합돼 스팬 1개. (한 샘플 노이즈 0.585는 중간값이 흡수)
    const samples = [sample(1, 0.5), sample(3, 0.5), sample(5, 0.585), sample(7, 0.56), sample(9, 0.56)];
    assert.equal(planShotFocalSpans(samples, 0, 10).length, 2);
    assert.equal(planShotFocalSpans(samples, 0, 10, { mergeThreshold: 0.07 }).length, 1);
  });

  it("zooms in on the speaker for multi-person wide shots", () => {
    const wide = (time: number) => ({ time, x: 0.62, y: 0.35, confidence: 0.9, faceHeight: 0.11, personCount: 2 });
    const spans = planShotFocalSpans([wide(2), wide(5), wide(8)], 0, 10);
    assert.equal(spans.length, 1);
    assert.equal(spans[0]!.zoom, 1.5); // min(1.5, 0.22/0.11=2)
  });

  it("does not zoom single-person or large-face shots", () => {
    const single = (time: number) => ({ time, x: 0.5, y: 0.3, confidence: 0.9, faceHeight: 0.11, personCount: 1 });
    const bigFace = (time: number) => ({ time, x: 0.5, y: 0.3, confidence: 0.9, faceHeight: 0.3, personCount: 2 });
    assert.equal(planShotFocalSpans([single(2), single(5)], 0, 10)[0]!.zoom, undefined);
    assert.equal(planShotFocalSpans([bigFace(2), bigFace(5)], 0, 10)[0]!.zoom, undefined);
  });

  it("refines a boundary toward the true cut when a boundary sample is added", () => {
    // 1차: 샘플 4/6 사이 경계=5. 실제 컷이 5.6쯤이면 경계 샘플(5)이 왼쪽 샷(0.5)으로 판정되고
    // 재계산 경계가 (5+6)/2=5.5로 이동 — 실제 컷에 절반 수렴.
    const first = [sample(2, 0.5), sample(4, 0.5), sample(6, 0.75), sample(8, 0.75)];
    const coarse = planShotFocalSpans(first, 0, 10);
    assert.equal(coarse[0]!.end, 5);
    const refined = planShotFocalSpans([...first, sample(5, 0.5)], 0, 10);
    assert.equal(refined[0]!.end, 5.5);
  });
});

describe("correctedFocalX (측정 피드백 보정)", () => {
  it("moves the focal toward the measured face position scaled by visible fraction", () => {
    // 얼굴이 화면 0.33(왼쪽)에 보임 → 실제 얼굴 = 0.18 + (0.33-0.5)×0.316 = 0.126 → 새 초점.
    assert.equal(correctedFocalX(0.18, 0.33, 0.316), 0.126);
  });
  it("does not touch focals already within the dead zone", () => {
    assert.equal(correctedFocalX(0.58, 0.47, 0.316), 0.58); // |0.47-0.5|=0.03 ≤ 0.06
  });
  it("clamps the correction magnitude and the result into 0..1", () => {
    assert.equal(correctedFocalX(0.5, 1.0, 0.9), 0.7); // delta 0.45 → maxCorrection 0.2
    assert.equal(correctedFocalX(0.01, 0.0, 0.316), 0); // 결과 0..1 클램프
  });
  it("returns the input for non-finite values", () => {
    assert.equal(correctedFocalX(Number.NaN, 0.3, 0.316), Number.NaN);
    assert.equal(correctedFocalX(0.5, Number.NaN, 0.316), 0.5);
  });
});

describe("annotateSpanTransitions + planSpanHoldWindows (경계 전환)", () => {
  const spans = [
    { start: 0, end: 5, x: 0.5, y: 0.3 },
    { start: 5, end: 10, x: 0.75, y: 0.3 },
    { start: 10, end: 16, x: 0.5, y: 0.3 },
  ];

  it("marks a boundary as cut when a nearby sample jump exists, pan otherwise", () => {
    // 경계 5 주변에 점프(4.8: 0.5 → 5.2: 0.75) 존재 → cut. 경계 10 주변엔 점프 샘플 없음 → pan.
    const annotated = annotateSpanTransitions(spans, [
      sample(4.8, 0.5), sample(5.2, 0.75), sample(12, 0.5),
    ]);
    assert.equal(annotated[0]!.transition, undefined); // 첫 스팬은 경계 없음
    assert.equal(annotated[1]!.transition, "cut");
    assert.equal(annotated[2]!.transition, "pan");
  });

  it("holds to the boundary minus epsilon for cut, and leaves pan leads on both sides", () => {
    const annotated = annotateSpanTransitions(spans, [sample(4.8, 0.5), sample(5.2, 0.75)]);
    const windows = planSpanHoldWindows(annotated);
    // span0: 다음 경계(5)는 cut → end = 5-0.05
    assert.deepEqual(windows[0], { start: 0, end: 4.95 });
    // span1: 시작 cut → start=5 그대로, 다음 경계(10)는 pan → end = 10-0.25
    assert.deepEqual(windows[1], { start: 5, end: 9.75 });
    // span2: 시작 pan → start = 10+0.25 (10~10.25 사이 선형 보간 = 0.5초 팬)
    assert.deepEqual(windows[2], { start: 10.25, end: 15.95 });
  });

  it("skips the pan lead when a span is too short", () => {
    const shortSpans = [
      { start: 0, end: 5, x: 0.5, y: 0.3 },
      { start: 5, end: 5.5, x: 0.7, y: 0.3, transition: "pan" as const },
    ];
    const windows = planSpanHoldWindows(shortSpans);
    assert.deepEqual(windows[1], { start: 5, end: 5.45 }); // 팬 생략, epsilon만
  });
});
