// 큐시트 정렬·국소 보간 회수 계약 — 큐시트 절대 시각을 쓰지 않는다는 성질을 고정한다
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CUE_PREDICT_WINDOW_BOTH,
  CUE_PREDICT_WINDOW_ONE_SIDED,
  alignCueToBoundaries,
  pickCueRecovery,
  predictMissingCueItems,
} from "../src/cue-sheet-align";
import type { CueSheetItemStart } from "../src/cue-sheet";

const items = (starts: number[], reports: number[] = []): CueSheetItemStart[] =>
  starts.map((start, index) => ({
    order: index + 2, start, title: `꼭지${index + 1}`, isReport: reports.includes(index),
  }));

describe("alignCueToBoundaries", () => {
  it("전부 짝이 맞으면 순서대로 짝짓는다", () => {
    const pairs = alignCueToBoundaries([26, 169, 275], [28, 162, 264]);
    assert.deepEqual(pairs, [
      { cueIndex: 0, boundaryIndex: 0 }, { cueIndex: 1, boundaryIndex: 1 }, { cueIndex: 2, boundaryIndex: 2 },
    ]);
  });

  it("방송에서 빠진 꼭지를 건너뛴다 — 뒤쪽 짝이 밀리지 않는다", () => {
    // 큐시트 4개 중 세 번째(275)가 방송에 안 나갔다.
    const pairs = alignCueToBoundaries([26, 169, 275, 305], [28, 162, 301]);
    assert.deepEqual(pairs.map((pair) => pair.cueIndex), [0, 1, 3]);
    assert.deepEqual(pairs.map((pair) => pair.boundaryIndex), [0, 1, 2]);
  });

  it("전체가 통째로 밀려 있어도 순서만 맞으면 짝짓는다 — 절대 시각에 기대지 않는다", () => {
    const pairs = alignCueToBoundaries([26, 169, 275], [126, 269, 375]);
    assert.equal(pairs.length, 3);
    assert.deepEqual(pairs.map((pair) => pair.boundaryIndex), [0, 1, 2]);
  });

  it("한쪽이 비면 짝이 없다", () => {
    assert.deepEqual(alignCueToBoundaries([], [10, 20]), []);
    assert.deepEqual(alignCueToBoundaries([10, 20], []), []);
  });
});

describe("predictMissingCueItems", () => {
  it("양쪽 이웃이 있으면 간격 비율로 보간하고 좁은 창을 준다", () => {
    // 검출은 큐시트보다 일정하게 +10초 밀려 있다 — 보간은 그 밀림을 그대로 따라가야 한다.
    const cue = items([0, 100, 200]);
    const pairs = [{ cueIndex: 0, boundaryIndex: 0 }, { cueIndex: 2, boundaryIndex: 1 }];
    const gaps = predictMissingCueItems(cue, [10, 210], pairs);
    assert.equal(gaps.length, 1);
    assert.equal(gaps[0]?.cueIndex, 1);
    assert.equal(gaps[0]?.predicted, 110);
    assert.equal(gaps[0]?.window, CUE_PREDICT_WINDOW_BOTH);
  });

  it("앞뒤 밀림이 다르면 비율만큼 섞는다", () => {
    const cue = items([0, 100, 200]);
    const gaps = predictMissingCueItems(cue, [0, 220], [
      { cueIndex: 0, boundaryIndex: 0 }, { cueIndex: 2, boundaryIndex: 1 },
    ]);
    // 앞 편차 0 · 뒤 편차 +20 · 중간 지점 비율 0.5 → +10
    assert.equal(gaps[0]?.predicted, 110);
  });

  it("앞 이웃만 있으면 앞 간격을 더하고 넓은 창을 준다", () => {
    const cue = items([0, 100]);
    const gaps = predictMissingCueItems(cue, [30], [{ cueIndex: 0, boundaryIndex: 0 }]);
    assert.equal(gaps[0]?.predicted, 130);
    assert.equal(gaps[0]?.window, CUE_PREDICT_WINDOW_ONE_SIDED);
  });

  it("뒤 이웃만 있으면 뒤에서 간격을 뺀다", () => {
    const cue = items([0, 100]);
    const gaps = predictMissingCueItems(cue, [130], [{ cueIndex: 1, boundaryIndex: 0 }]);
    assert.equal(gaps[0]?.predicted, 30);
    assert.equal(gaps[0]?.window, CUE_PREDICT_WINDOW_ONE_SIDED);
  });

  it("이웃이 하나도 없으면 예측하지 않는다 — 큐시트 절대 시각을 쓰지 않는다", () => {
    assert.deepEqual(predictMissingCueItems(items([0, 100]), [], []), []);
  });

  it("예측이 음수로 나오면 버린다", () => {
    const gaps = predictMissingCueItems(items([0, 100]), [10], [{ cueIndex: 1, boundaryIndex: 0 }]);
    assert.deepEqual(gaps, []);
  });

  it("리포트 여부를 예측에 실어 보낸다", () => {
    const gaps = predictMissingCueItems(items([0, 100, 200], [1]), [0, 200], [
      { cueIndex: 0, boundaryIndex: 0 }, { cueIndex: 2, boundaryIndex: 1 },
    ]);
    assert.equal(gaps[0]?.isReport, true);
  });
});

describe("pickCueRecovery", () => {
  const gap = { cueIndex: 1, predicted: 100, window: 20, title: "꼭지", isReport: false };

  it("창 안에서 가장 가까운 후보를 고른다", () => {
    const picked = pickCueRecovery(gap, [
      { time: 95, refDist: 0.12 }, { time: 105, refDist: 0.09 }, { time: 118, refDist: 0.30 },
    ], [], 0.16);
    assert.deepEqual(picked, { time: 105, refDist: 0.09 });
  });

  it("창 밖 후보는 아무리 가까워도 안 쓴다", () => {
    assert.equal(pickCueRecovery(gap, [{ time: 130, refDist: 0.01 }], [], 0.16), null);
  });

  it("참조 거리 상한을 넘는 후보는 거른다 — 없는 경계를 만들지 않는다", () => {
    assert.equal(pickCueRecovery(gap, [{ time: 100, refDist: 0.5 }], [], 0.16), null);
  });

  it("창 안에 후보가 없으면 회수하지 않는다", () => {
    assert.equal(pickCueRecovery(gap, [], [], 0.16), null);
  });

  it("이미 채택된 경계와 8초 안에서 겹치면 중복이라 거른다", () => {
    assert.equal(pickCueRecovery(gap, [{ time: 100, refDist: 0.05 }], [96], 0.16), null);
    assert.deepEqual(pickCueRecovery(gap, [{ time: 100, refDist: 0.05 }], [80], 0.16), { time: 100, refDist: 0.05 });
  });

  it("시각이 숫자가 아닌 후보를 건너뛴다", () => {
    assert.equal(pickCueRecovery(gap, [{ time: Number.NaN, refDist: 0.01 }], [], 0.16), null);
  });
});
