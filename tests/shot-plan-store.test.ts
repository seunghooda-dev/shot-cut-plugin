// shot-plan-store 영속화·정규화 + adjustFocalSpans 조정 수학 테스트
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { adjustFocalSpans, type FocalSpan } from "../src/shot-focus";
import {
  MAX_SHOT_PLANS,
  loadShotPlans,
  normalizeShotPlans,
  pruneShotPlans,
  removeShotPlan,
  updateShotPlanSpans,
  upsertShotPlan,
  type ShotPlanRecord,
} from "../src/shot-plan-store";

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

function plan(name: string, overrides?: Partial<ShotPlanRecord>): ShotPlanRecord {
  return {
    sequenceName: name,
    createdAt: "2026-07-14T15:00:00.000Z",
    segment: { start: 10, end: 40, title: "테스트 컷" },
    spans: [{ start: 10, end: 25, x: 0.4, y: 0.5 }, { start: 25, end: 40, x: 0.7, y: 0.5, zoom: 1.3, transition: "cut" }],
    originalSpans: [{ start: 10, end: 25, x: 0.4, y: 0.5 }, { start: 25, end: 40, x: 0.7, y: 0.5, zoom: 1.3, transition: "cut" }],
    target: { width: 1080, height: 1920 },
    source: { width: 1920, height: 1080 },
    ...overrides,
  };
}

describe("shot-plan-store", () => {
  let storage: Storage;
  beforeEach(() => { storage = memoryStorage(); });

  it("round-trips a plan and upserts by sequence name", () => {
    upsertShotPlan(plan("Short_01_9x16"), storage);
    upsertShotPlan(plan("Short_02_9x16"), storage);
    const replaced = plan("Short_01_9x16", { segment: { start: 5, end: 20, title: "교체" } });
    const plans = upsertShotPlan(replaced, storage);
    assert.equal(plans.length, 2);
    assert.equal(plans[0]!.sequenceName, "Short_01_9x16"); // 최신이 앞
    assert.equal(plans[0]!.segment.title, "교체");
    assert.equal(loadShotPlans(storage).length, 2);
  });

  it("updates spans only and keeps originalSpans for reset", () => {
    upsertShotPlan(plan("Short_01"), storage);
    const adjusted: FocalSpan[] = [{ start: 10, end: 25, x: 0.5, y: 0.5 }];
    const plans = updateShotPlanSpans("Short_01", adjusted, storage);
    assert.equal(plans[0]!.spans.length, 1);
    assert.equal(plans[0]!.spans[0]!.x, 0.5);
    assert.equal(plans[0]!.originalSpans.length, 2); // 원본 보존
    assert.equal(plans[0]!.originalSpans[0]!.x, 0.4);
  });

  it("removes and prunes plans for missing sequences", () => {
    upsertShotPlan(plan("A"), storage);
    upsertShotPlan(plan("B"), storage);
    upsertShotPlan(plan("C"), storage);
    assert.equal(removeShotPlan("B", storage).length, 2);
    const pruned = pruneShotPlans(["C"], storage);
    assert.deepEqual(pruned.map((item) => item.sequenceName), ["C"]);
  });

  it("drops corrupt records and fills originalSpans from spans when absent", () => {
    const legacy = { ...plan("Legacy") } as Record<string, unknown>;
    delete legacy.originalSpans;
    const plans = normalizeShotPlans([legacy, { junk: true }, null, plan("OK")]);
    assert.equal(plans.length, 2);
    assert.equal(plans[0]!.originalSpans.length, 2); // spans에서 복제
    assert.deepEqual(loadShotPlans(memoryStorage()), []); // 빈 저장소 안전
  });

  it("caps stored plans and rejects invalid spans/dims", () => {
    for (let index = 0; index < MAX_SHOT_PLANS + 5; index += 1) {
      upsertShotPlan(plan(`Seq_${index}`), storage);
    }
    assert.equal(loadShotPlans(storage).length, MAX_SHOT_PLANS);
    assert.equal(normalizeShotPlans([plan("Bad", { spans: [{ start: 5, end: 5, x: 0.5, y: 0.5 }] })]).length, 0);
    assert.equal(normalizeShotPlans([plan("Bad2", { target: { width: 0, height: 1920 } })]).length, 0);
  });
});

describe("adjustFocalSpans", () => {
  const spans: FocalSpan[] = [
    { start: 0, end: 10, x: 0.4, y: 0.5 },
    { start: 10, end: 20, x: 0.9, y: 0.5, zoom: 1.4, transition: "pan" },
  ];

  it("applies offsets with 0..1 clamping and preserves times/transitions", () => {
    const adjusted = adjustFocalSpans(spans, { dx: 0.2, dy: -0.1, zoomScale: 1 });
    assert.equal(adjusted[0]!.x, 0.6);
    assert.equal(adjusted[0]!.y, 0.4);
    assert.equal(adjusted[1]!.x, 1); // 0.9+0.2 → 1로 클램프
    assert.equal(adjusted[1]!.transition, "pan");
    assert.equal(adjusted[1]!.start, 10);
    assert.equal(adjusted[1]!.end, 20);
  });

  it("scales zoom within 1..2 and drops zoom near 1", () => {
    const zoomed = adjustFocalSpans(spans, { zoomScale: 1.2 });
    assert.equal(zoomed[0]!.zoom, 1.2); // 줌 없던 샷도 배율로 펀치인이 켜진다
    assert.equal(zoomed[1]!.zoom, 1.68);
    const reduced = adjustFocalSpans(spans, { zoomScale: 0.5 });
    assert.equal(reduced[1]!.zoom, undefined); // 1.4×0.5=0.7 → 1로 클램프 → 제거
    const capped = adjustFocalSpans([{ start: 0, end: 5, x: 0.5, y: 0.5, zoom: 1.9 }], { zoomScale: 2 });
    assert.equal(capped[0]!.zoom, 2); // 상한 2
  });

  it("treats invalid adjustment values as neutral", () => {
    const same = adjustFocalSpans(spans, { dx: Number.NaN, zoomScale: 0 });
    assert.deepEqual(same[0], spans[0]);
    assert.equal(same[1]!.zoom, 1.4);
  });
});
