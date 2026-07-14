// audio-silence — RMS 에너지·무음 gap 검출·컷 스냅 순수 로직 테스트
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeRmsEnvelope, detectSilenceGaps, snapCutPointToSilence } from "../src/audio-silence";

// 1kHz, [0,1)s 소리 + [1,2)s 무음 + [2,3)s 소리
function loudSilentLoud(): { samples: number[]; rate: number } {
  const rate = 1000;
  const samples: number[] = [];
  for (let i = 0; i < 3 * rate; i += 1) {
    const t = i / rate;
    samples.push(t >= 1 && t < 2 ? 0 : 0.5);
  }
  return { samples, rate };
}

describe("audio-silence", () => {
  it("computes an RMS envelope that drops in the silent region", () => {
    const { samples, rate } = loudSilentLoud();
    const env = computeRmsEnvelope(samples, rate, 50, 25);
    assert.ok(env.rms.length > 0);
    const midIndex = env.times.findIndex((t) => t > 1.4 && t < 1.6);
    assert.ok(midIndex >= 0);
    assert.ok(env.rms[midIndex]! < 0.05, `mid rms ${env.rms[midIndex]}`);
    const loudIndex = env.times.findIndex((t) => t > 0.4 && t < 0.6);
    assert.ok(env.rms[loudIndex]! > 0.4, `loud rms ${env.rms[loudIndex]}`);
  });

  it("detects the silent gap around 1..2s", () => {
    const { samples, rate } = loudSilentLoud();
    const gaps = detectSilenceGaps(samples, rate);
    assert.equal(gaps.length, 1);
    assert.ok(Math.abs(gaps[0]!.start - 1) < 0.1, `start ${gaps[0]!.start}`);
    assert.ok(Math.abs(gaps[0]!.end - 2) < 0.1, `end ${gaps[0]!.end}`);
  });

  it("returns no gaps for a fully loud or empty signal", () => {
    const rate = 1000;
    const loud = Array.from({ length: rate }, () => 0.5);
    assert.deepEqual(detectSilenceGaps(loud, rate), []);
    assert.deepEqual(detectSilenceGaps([], rate), []);
  });

  it("snaps a cut point to the nearest silence-gap center within maxShift", () => {
    const gaps = [{ start: 1, end: 2 }];
    assert.equal(snapCutPointToSilence(1.4, gaps, 0.5), 1.5); // 중심 1.5로
    assert.equal(snapCutPointToSilence(1.4, gaps, 0.05), 1.4); // maxShift 밖이면 그대로
    assert.equal(snapCutPointToSilence(5, gaps, 0.5), 5); // 먼 지점은 그대로
  });

  it("respects an explicit silenceRatio of 0 instead of the default", () => {
    const rate = 1000;
    const samples: number[] = [];
    for (let i = 0; i < 3 * rate; i += 1) {
      const t = i / rate;
      samples.push(t >= 1 && t < 2 ? 0.05 : 0.5); // 조용하지만 완전 무음은 아님
    }
    assert.equal(detectSilenceGaps(samples, rate).length, 1); // 기본 0.15: 조용한 구간을 무음으로
    assert.equal(detectSilenceGaps(samples, rate, { silenceRatio: 0 }).length, 0); // 0: 순수 무음만
  });

  it("respects an explicit minSilenceMs of 0", () => {
    const rate = 1000;
    const samples: number[] = [];
    for (let i = 0; i < rate; i += 1) {
      const t = i / rate;
      samples.push(t >= 0.5 && t < 0.55 ? 0 : 0.5); // 50ms 무음
    }
    assert.equal(detectSilenceGaps(samples, rate).length, 0); // 기본 200ms 하한 → 무시
    assert.ok(detectSilenceGaps(samples, rate, { minSilenceMs: 0 }).length >= 1); // 0 → 검출
  });

  it("ignores short quiet dips below minSilenceMs", () => {
    const rate = 1000;
    const samples: number[] = [];
    for (let i = 0; i < rate; i += 1) {
      const t = i / rate;
      samples.push(t >= 0.5 && t < 0.55 ? 0 : 0.5); // 50ms 무음 < 기본 200ms
    }
    assert.deepEqual(detectSilenceGaps(samples, rate), []);
  });
});
