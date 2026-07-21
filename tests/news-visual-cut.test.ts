// news-visual-cut — 화면 기반 원클릭 분할 순수 로직(매처·후보·정적 꼬리·아이템 구성·재스냅) 테스트
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAnchorMatcher,
  buildItemsFromStarts,
  collectAnchorCandidates,
  selectAnchorMatcher,
  detectModelStarts,
  detectStaticTailStart,
  fallbackAnchorTimes,
  freeAnchorTimes,
  hybridAnchorTimes,
  refineBoundaryToTransition,
  scoreAnchorSamples,
  type AnchorCandidate,
  type GridSample,
} from "../src/news-visual-cut";

const CELLS = 144;

function grid(value: number): Float64Array {
  const cells = new Float64Array(CELLS);
  cells.fill(value);
  return cells;
}

function samplesFrom(spec: Array<{ from: number; to: number; value: number }>): GridSample[] {
  const samples: GridSample[] = [];
  for (const range of spec) {
    for (let time = range.from; time <= range.to; time += 2) {
      samples.push({ time, grid: grid(range.value) });
    }
  }
  return samples.sort((left, right) => left.time - right.time);
}

describe("buildAnchorMatcher", () => {
  it("동일 그리드는 거리 0, 먼 그리드는 큰 거리를 준다", () => {
    const matcher = buildAnchorMatcher([grid(100), grid(102)]);
    assert.equal(matcher.distance(grid(100)), 0);
    assert.ok(matcher.distance(grid(200)) > 0.3);
  });

  it("셀 수가 다른 그리드는 무한대 거리로 거른다", () => {
    const matcher = buildAnchorMatcher([grid(100)]);
    assert.equal(matcher.distance(new Float64Array(10)), Number.POSITIVE_INFINITY);
  });
});

describe("selectAnchorMatcher", () => {
  it("단일 매처는 그대로 돌려준다", () => {
    const single = buildAnchorMatcher([grid(100)]);
    assert.equal(selectAnchorMatcher([], [single]), single);
  });

  it("특수 뱅크가 압도적으로 가까울 때만 라우팅한다(포맷별 분리)", () => {
    const weekday = buildAnchorMatcher([grid(100), grid(102)]);
    const sunday = buildAnchorMatcher([grid(30), grid(32)]);
    const weekdayScan = samplesFrom([{ from: 0, to: 20, value: 210 }, { from: 22, to: 30, value: 101 }]);
    assert.equal(selectAnchorMatcher(weekdayScan, [weekday, sunday]), weekday);
    const sundayScan = samplesFrom([{ from: 0, to: 20, value: 210 }, { from: 22, to: 30, value: 31 }]);
    assert.equal(selectAnchorMatcher(sundayScan, [weekday, sunday]), sunday);
  });

  it("근소하게 가까운 특수 뱅크에는 라우팅하지 않는다(평일 우선)", () => {
    const weekday = buildAnchorMatcher([grid(100), grid(102)]);
    const near = buildAnchorMatcher([grid(120), grid(122)]);
    // 평일 최소거리도 충분히 작아(101≈100) 근소 차 특수 뱅크(118≈120)는 기각돼야 한다.
    const scan = samplesFrom([{ from: 0, to: 10, value: 101 }, { from: 12, to: 20, value: 118 }]);
    assert.equal(selectAnchorMatcher(scan, [weekday, near]), weekday);
  });

  it("빈 매처 배열은 던진다", () => {
    assert.throws(() => selectAnchorMatcher([], []));
  });
});

describe("collectAnchorCandidates", () => {
  it("긴 앵커 샷과 짧은 스튜디오 리드(런)를 모두 후보로 모은다", () => {
    const matcher = buildAnchorMatcher([grid(100), grid(102)]);
    const samples = samplesFrom([
      { from: 0, to: 8, value: 200 },
      { from: 10, to: 30, value: 100 },   // 긴 앵커 샷(20s)
      { from: 32, to: 48, value: 220 },
      { from: 50, to: 54, value: 101 },   // 짧은 리드(샷 6s < 8s → 런으로만 검출)
      { from: 56, to: 80, value: 230 },
    ]);
    const candidates = collectAnchorCandidates(samples, matcher);
    const times = candidates.map((candidate) => candidate.time);
    assert.ok(times.includes(10), `긴 샷 시작 10 누락: ${JSON.stringify(candidates)}`);
    const run = candidates.find((candidate) => candidate.kind === "run");
    assert.ok(run && run.time === 50, `런 시작 50 누락: ${JSON.stringify(candidates)}`);
    assert.deepEqual([...times].sort((a, b) => a - b), times, "시간순 정렬이어야 한다");
  });

  it("참조가 안 통하는 포맷이면(후보<3) 긴 샷 전부로 넓힌다", () => {
    const matcher = buildAnchorMatcher([grid(10)]); // 모든 샘플과 멀다
    const samples = samplesFrom([
      { from: 0, to: 20, value: 200 },
      { from: 22, to: 40, value: 120 },
      { from: 42, to: 60, value: 240 },
    ]);
    const candidates = collectAnchorCandidates(samples, matcher);
    assert.ok(candidates.length >= 3, `긴 샷 확대 실패: ${JSON.stringify(candidates)}`);
    assert.ok(candidates.every((candidate) => candidate.kind === "shot"));
  });
});

describe("fallbackAnchorTimes", () => {
  it("가장 큰 간극의 중점 아래 긴 샷만 시간순으로 채택한다", () => {
    const shots: AnchorCandidate[] = [0.05, 0.06, 0.07, 0.08, 0.09, 0.19, 0.21].map((refDist, index) => ({
      time: index * 100,
      refDist,
      kind: "shot" as const,
    }));
    const runs: AnchorCandidate[] = [{ time: 999, refDist: 0.01, kind: "run" }];
    const accepted = fallbackAnchorTimes([...shots, ...runs]);
    assert.deepEqual(accepted, [0, 100, 200, 300, 400]);
  });
});

describe("freeAnchorTimes", () => {
  it("주 앵커에 강한 저거리 런(숨은 단신)을 더하고, 약한 런은 버린다", () => {
    const shots: AnchorCandidate[] = [0.05, 0.06, 0.07, 0.08, 0.09, 0.19, 0.21].map((refDist, index) => ({
      time: index * 100,
      refDist,
      kind: "shot" as const,
    }));
    const strongRun: AnchorCandidate = { time: 450, refDist: 0.07, kind: "run" };
    const weakRun: AnchorCandidate = { time: 550, refDist: 0.12, kind: "run" };
    const nearMainRun: AnchorCandidate = { time: 104, refDist: 0.05, kind: "run" };
    const accepted = freeAnchorTimes([...shots, strongRun, weakRun, nearMainRun]);
    assert.deepEqual(accepted, [0, 100, 200, 300, 400, 450]);
  });
});

describe("scoreAnchorSamples · detectModelStarts · hybridAnchorTimes", () => {
  it("참조 거리 특징에 반응하는 가중치로 앵커 구간만 높은 확률을 받는다", () => {
    const matcher = buildAnchorMatcher([grid(100)]);
    const samples = samplesFrom([
      { from: 0, to: 8, value: 220 },
      { from: 10, to: 16, value: 100 },  // 앵커 리드(4샘플)
      { from: 18, to: 30, value: 220 },
    ]);
    const weights = new Array(CELLS + 3).fill(0);
    weights[CELLS + 2] = -10; // 참조 거리 가까울수록 확률↑
    const probabilities = scoreAnchorSamples(samples, matcher, weights, 5);
    const starts = detectModelStarts(samples, probabilities, 0.75);
    assert.deepEqual(starts, [10]);
  });

  it("가중치 길이가 특징 수와 다르면 전부 0으로 안전 강하한다", () => {
    const matcher = buildAnchorMatcher([grid(100)]);
    const samples = samplesFrom([{ from: 0, to: 10, value: 100 }]);
    const probabilities = scoreAnchorSamples(samples, matcher, [1, 2, 3], 0);
    assert.ok(probabilities.every((probability) => probability === 0));
  });

  it("하이브리드는 현행 결정에 모델 검출을 중복 없이 합친다", () => {
    const shots: AnchorCandidate[] = [0.05, 0.06, 0.07, 0.08, 0.09, 0.19, 0.21].map((refDist, index) => ({
      time: index * 100,
      refDist,
      kind: "shot" as const,
    }));
    const accepted = hybridAnchorTimes(shots, [104, 450]);
    assert.deepEqual(accepted, [0, 100, 200, 300, 400, 450]);
  });
});

describe("detectStaticTailStart", () => {
  it("끝까지 이어지는 12초 이상 정적 접미(구독 범퍼)를 찾는다", () => {
    const samples = [
      ...samplesFrom([{ from: 0, to: 78, value: 0 }]).map((sample, index) => ({
        time: sample.time,
        grid: grid((index % 2) * 40 + 60), // 계속 변하는 본편
      })),
      ...samplesFrom([{ from: 80, to: 100, value: 30 }]), // 정적 꼬리 20s
    ];
    assert.equal(detectStaticTailStart(samples), 80);
  });

  it("짧은 정적 꼬리(<12s)는 무시한다", () => {
    const samples = [
      ...samplesFrom([{ from: 0, to: 90, value: 0 }]).map((sample, index) => ({
        time: sample.time,
        grid: grid((index % 2) * 40 + 60),
      })),
      ...samplesFrom([{ from: 92, to: 100, value: 30 }]),
    ];
    assert.equal(detectStaticTailStart(samples), null);
  });
});

describe("buildItemsFromStarts", () => {
  it("시작 목록을 구간으로 잇고 마지막 끝은 지정한 끝 시각으로 둔다", () => {
    const items = buildItemsFromStarts([208, 58, 493], 830);
    assert.deepEqual(items.map((item) => [item.start, item.end]), [[58, 208], [208, 493], [493, 830]]);
  });

  it("15초 미만 조각은 다음 아이템과 병합된다", () => {
    const items = buildItemsFromStarts([58, 60, 208], 400);
    assert.deepEqual(items.map((item) => [item.start, item.end]), [[58, 208], [208, 400]]);
  });
});

describe("refineBoundaryToTransition", () => {
  const samplerWithTransition = (transition: number) =>
    async (time: number): Promise<Float64Array | null> => (time < transition ? grid(200) : grid(100));

  it("경계를 전환 컷 종료 시점으로 뒤로 스냅한다", async () => {
    const snapped = await refineBoundaryToTransition(samplerWithTransition(57.3), 58);
    assert.equal(snapped, 57.5);
  });

  it("정착 직전까지 상이하면 경계를 그대로 둔다(앞으로 이동 금지)", async () => {
    const snapped = await refineBoundaryToTransition(samplerWithTransition(58.4), 58);
    assert.equal(snapped, 58);
  });

  it("스캔 창 전체가 정착과 동일하면 블록 확장으로 리드 시작까지 되돌린다", async () => {
    const snapped = await refineBoundaryToTransition(samplerWithTransition(47), 58);
    assert.equal(snapped, 47);
  });

  it("정착 프레임을 얻지 못하면 원 경계를 유지한다", async () => {
    const snapped = await refineBoundaryToTransition(async () => null, 58);
    assert.equal(snapped, 58);
  });
});
