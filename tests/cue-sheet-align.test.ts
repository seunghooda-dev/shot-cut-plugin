// 큐시트 정렬·국소 보간 회수 계약 — 큐시트 절대 시각을 쓰지 않는다는 성질을 고정한다
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CUE_PREDICT_WINDOW_BOTH,
  CUE_PREDICT_WINDOW_ONE_SIDED,
  alignCueToBoundaries,
  pickCueRecovery,
  predictMissingCueItems,
  recoverFromCueSheet,
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

  it("경계가 큐 꼭지보다 많아도 짝을 짓는다 — 남는 경계가 오검출 후보다", () => {
    // 종전에는 여기서 빈 배열을 돌려줘 큐시트 기능이 통째로 무력화됐다(7/16·7/20 실제 발생).
    const pairs = alignCueToBoundaries([0, 100, 200], [0, 50, 100, 200]);
    assert.equal(pairs.length, 3);
    // 짝지어진 경계 인덱스는 오름차순이고 서로 다르다 — 50(인덱스 1)이 남는다.
    assert.deepEqual(pairs.map((pair) => pair.cueIndex), [0, 1, 2]);
    assert.deepEqual(pairs.map((pair) => pair.boundaryIndex), [0, 2, 3]);
  });

  it("경계가 많을 때도 순서를 지키고 인덱스가 뒤집히지 않는다", () => {
    const pairs = alignCueToBoundaries([10, 120], [8, 60, 118, 300, 500]);
    assert.equal(pairs.length, 2);
    for (let index = 1; index < pairs.length; index += 1) {
      assert.ok(pairs[index]!.cueIndex > pairs[index - 1]!.cueIndex);
      assert.ok(pairs[index]!.boundaryIndex > pairs[index - 1]!.boundaryIndex);
    }
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

describe("recoverFromCueSheet", () => {
  it("빈자리를 창 안 후보로 채우고 무엇을 골랐는지 함께 돌려준다", () => {
    const cue = items([0, 100, 200]);
    const accepted = [10, 210];
    const candidates = [{ time: 108, refDist: 0.05 }, { time: 400, refDist: 0.01 }];
    const result = recoverFromCueSheet(cue, accepted, candidates, 0.08);
    assert.deepEqual(result.merged, [10, 108, 210]);
    assert.equal(result.gaps.length, 1);
    assert.deepEqual(result.picks.map((pick) => pick.recovery?.time), [108]);
  });

  it("창 안에 후보가 없으면 아무것도 더하지 않되 못 고른 사실을 남긴다", () => {
    // 침묵 금지(§7-aw) — 회수 0이어도 호출부가 "빈자리는 있었다"를 말할 수 있어야 한다.
    const result = recoverFromCueSheet(items([0, 100, 200]), [10, 210], [{ time: 400, refDist: 0.01 }], 0.08);
    assert.deepEqual(result.merged, [10, 210]);
    assert.equal(result.picks.length, 1);
    assert.equal(result.picks[0]?.recovery, null);
  });

  it("빈자리가 없으면 확정을 그대로 돌려준다", () => {
    const result = recoverFromCueSheet(items([0, 100]), [0, 100], [{ time: 50, refDist: 0.01 }], 0.08);
    assert.deepEqual(result.merged, [0, 100]);
    assert.deepEqual(result.gaps, []);
    assert.deepEqual(result.picks, []);
  });

  it("연속한 빈자리를 회수할 때 앞서 회수한 시각도 중복 판정에 넣는다", () => {
    // 회수분을 즉시 반영하지 않으면 같은 후보를 두 빈자리가 각각 집어 경계가 겹친다.
    const cue = items([0, 100, 105, 200]);
    const result = recoverFromCueSheet(cue, [0, 200], [{ time: 102, refDist: 0.02 }], 0.08);
    assert.equal(result.merged.filter((time) => time === 102).length, 1);
  });

  it("입력 배열을 건드리지 않는다", () => {
    const accepted = [10, 210];
    recoverFromCueSheet(items([0, 100, 200]), accepted, [{ time: 108, refDist: 0.05 }], 0.08);
    assert.deepEqual(accepted, [10, 210]);
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

describe("회수 임계 경계값", () => {
  // 세 비교의 **정확한 경계**를 고정한다. 감사 실측(2026-08-10)에서 전부 미테스트였다 —
  // 특히 중복 규칙을 `< 8`로 뒤집으면 채점 허용오차와 같은 자리에 경계가 하나 더 생겨
  // TP 1 + FP 1이 된다. 회수 경로가 정밀도를 파는 가장 전형적인 형태다.
  const gap = { cueIndex: 1, predicted: 100, window: 20, title: "꼭지", isReport: false };

  it("창 끝은 포함하고 한 뼘 밖은 버린다", () => {
    assert.deepEqual(pickCueRecovery(gap, [{ time: 120, refDist: 0.05 }], [], 0.16), { time: 120, refDist: 0.05 });
    assert.equal(pickCueRecovery(gap, [{ time: 120.001, refDist: 0.05 }], [], 0.16), null);
  });

  it("참조 거리 상한은 같은 값까지 받고 그 위는 버린다", () => {
    assert.deepEqual(pickCueRecovery(gap, [{ time: 100, refDist: 0.16 }], [], 0.16), { time: 100, refDist: 0.16 });
    assert.equal(pickCueRecovery(gap, [{ time: 100, refDist: 0.1601 }], [], 0.16), null);
  });

  it("중복은 정확히 8초까지 거르고 그 밖은 받는다 — 채점 허용오차와 같은 값", () => {
    assert.equal(pickCueRecovery(gap, [{ time: 100, refDist: 0.05 }], [92], 0.16), null);
    assert.deepEqual(pickCueRecovery(gap, [{ time: 100, refDist: 0.05 }], [91.999], 0.16), { time: 100, refDist: 0.05 });
  });
});
