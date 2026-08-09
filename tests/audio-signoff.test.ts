// audio-signoff — 사인오프 오디오 단서 순수 계층(§152) 테스트
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MORNING_WIDE_SIGNOFF_PATTERN,
  SIGNOFF_PATTERN,
  createWavWindowSlicer,
  encodeWavPcm16,
  findSignoffs,
  planSignoffWindows,
  signoffProbeTimes,
} from "../src/audio-signoff";
import { parseWavPcm } from "../src/wav-pcm";

const makeWav = (seconds: number, sampleRate = 16000): Uint8Array => {
  const samples = new Float32Array(Math.round(seconds * sampleRate));
  // 시각을 값으로 심어 슬라이스가 옳은 구간을 잘랐는지 확인할 수 있게 한다.
  for (let index = 0; index < samples.length; index += 1) samples[index] = (index / sampleRate) / 1000;
  return encodeWavPcm16(samples, sampleRate);
};

describe("SIGNOFF_PATTERN — 실측으로 고른 규칙(§152)", () => {
  it("KBC 이름입니다를 잡는다", () => {
    assert.equal(SIGNOFF_PATTERN.test("공모 여부를 들여다보고 있습니다. KBC 임경섭입니다."), true);
    assert.equal(SIGNOFF_PATTERN.test("KBC 뉴스 김정은입니다."), true);
    assert.equal(SIGNOFF_PATTERN.test("KBC허재입니다"), true);
  });

  it("리포트 본문·앵커 멘트는 잡지 않는다", () => {
    assert.equal(SIGNOFF_PATTERN.test("투표는 오는 12일부터 진행됩니다."), false);
    assert.equal(SIGNOFF_PATTERN.test("KBC 8시 뉴스 시작합니다."), false);
  });

  // 1차 실측에서 이 가정으로 0/10을 냈다 — 규칙을 추측으로 쓰면 신호가 있어도 못 본다.
  it("기자입니다 형식은 이 방송 관습이 아니다", () => {
    assert.equal(SIGNOFF_PATTERN.test("현장에서 홍길동 기자입니다."), false);
  });
});

describe("MORNING_WIDE_SIGNOFF_PATTERN — 방송사명 ASR 오인 허용(§7-ap)", () => {
  it("KBC를 잘못 들은 전사도 잡는다 — 19회차 실측에서 실제로 나온 형태", () => {
    assert.equal(MORNING_WIDE_SIGNOFF_PATTERN.test("MBC 뉴스 김성현입니다."), true);
    assert.equal(MORNING_WIDE_SIGNOFF_PATTERN.test("KBC 박승연입니다."), true);
    assert.equal(MORNING_WIDE_SIGNOFF_PATTERN.test("케이비씨 정지협입니다."), true);
  });

  it("흔한 문장 종결은 방송사명 토큰이 없어 그대로 걸러진다", () => {
    assert.equal(MORNING_WIDE_SIGNOFF_PATTERN.test("올해 안에 마무리할 계획입니다."), false);
    assert.equal(MORNING_WIDE_SIGNOFF_PATTERN.test("추가 규제입니다."), false);
    assert.equal(MORNING_WIDE_SIGNOFF_PATTERN.test("현장에서 홍길동 기자입니다."), false);
  });

  // 완화는 매치를 늘리기만 하므로 8뉴스에 적용하면 검증된 오검출 0을 재검증 없이 흔든다.
  it("8뉴스 패턴은 완화되지 않았다 — 동결 경로 불변의 증거", () => {
    assert.equal(SIGNOFF_PATTERN.test("MBC 뉴스 김성현입니다."), false);
    assert.equal(SIGNOFF_PATTERN.test("케이비씨 정지협입니다."), false);
  });

  it("findSignoffs는 기본값이 8뉴스 패턴이고, 넘긴 패턴을 쓴다", () => {
    const segments = [{ text: "MBC 뉴스 김성현입니다.", start: 1, end: 3 }];
    assert.deepEqual(findSignoffs(segments, 100), []);
    assert.deepEqual(
      findSignoffs(segments, 100, MORNING_WIDE_SIGNOFF_PATTERN).map((hit) => hit.at),
      [103],
    );
  });
});

describe("createWavWindowSlicer — 출하 경로의 창 슬라이서(파싱 1회)", () => {
  // 구 sliceWavWindow의 테스트를 그대로 계승한다 — 실제 제품(index.ts 창 루프)이 쓰는 것은
  // 이 팩토리다. 감사에서 미출하 쌍둥이만 테스트되고 출하 경로가 무검증임이 드러나 이전했다.
  it("요청한 길이만큼 자르고 16비트 모노 PCM으로 낸다", () => {
    const sliced = createWavWindowSlicer(makeWav(30))(10, 22);
    const pcm = parseWavPcm(sliced);
    assert.equal(pcm.sampleRate, 16000);
    assert.equal(pcm.channels, 1);
    assert.equal(pcm.samples.length, 12 * 16000);
  });

  it("자른 구간이 원본의 그 시각이다 — 오프셋 계산 검증", () => {
    const pcm = parseWavPcm(createWavWindowSlicer(makeWav(30))(10, 22));
    // 심어 둔 값 = 초/1000. 창 시작(원본 10초) 값이 0.01 근처여야 한다.
    assert.ok(Math.abs(pcm.samples[0]! - 0.01) < 1e-3, `창 시작값 ${pcm.samples[0]}`);
    const last = pcm.samples[pcm.samples.length - 1]!;
    assert.ok(Math.abs(last - 0.022) < 1e-3, `창 끝값 ${last}`);
  });

  it("같은 슬라이서로 여러 창을 잘라도 각 창이 독립적으로 옳다", () => {
    const slice = createWavWindowSlicer(makeWav(30));
    const first = parseWavPcm(slice(10, 22));
    const second = parseWavPcm(slice(5, 9));
    assert.ok(Math.abs(first.samples[0]! - 0.01) < 1e-3);
    assert.ok(Math.abs(second.samples[0]! - 0.005) < 1e-3);
    assert.equal(second.samples.length, 4 * 16000);
  });

  it("창이 소스 끝을 넘어도 잘라낸 만큼만 낸다", () => {
    const pcm = parseWavPcm(createWavWindowSlicer(makeWav(10))(5, 20));
    assert.equal(pcm.samples.length, 5 * 16000);
  });

  it("끝이 시작보다 앞이면 거부한다", () => {
    assert.throws(() => createWavWindowSlicer(makeWav(10))(5, 5), /끝이 시작보다/u);
  });
});

describe("planSignoffWindows — 볼 창만 고른다", () => {
  it("후보 지점 +2초까지 닿는 16초 창을 만든다 — 경계 ±1초 사인오프를 자르지 않게(§155)", () => {
    const windows = planSignoffWindows([200], [], 900);
    assert.deepEqual(windows, [{ begin: 186, end: 202 }]);
  });

  it("확정 경계가 창 안에 있으면 건너뛴다 — 그 경계가 이미 리포트 끝을 표시한다", () => {
    assert.deepEqual(planSignoffWindows([200], [190], 900), []);
  });

  it("겹치는 창은 하나로 접는다", () => {
    const windows = planSignoffWindows([200, 204, 208], [], 900);
    assert.equal(windows.length, 1);
    assert.deepEqual(windows[0], { begin: 186, end: 202 });
  });

  it("소스 범위를 벗어난 창은 만들지 않는다", () => {
    assert.deepEqual(planSignoffWindows([10], [], 900), []);      // begin < 0
    assert.deepEqual(planSignoffWindows([920], [], 900), []);      // end > endTime
  });

  it("소스 끝에 닿는 창은 만든다 — 마지막 리포트의 사인오프를 놓치지 않게", () => {
    assert.deepEqual(planSignoffWindows([895], [], 900), [{ begin: 881, end: 897 }]);
  });

  it("상한을 넘지 않는다 — 비용 상한", () => {
    const probes = Array.from({ length: 60 }, (_value, index) => 100 + index * 20);
    assert.equal(planSignoffWindows(probes, [], 2000, { maxWindows: 24 }).length, 24);
  });
});

describe("findSignoffs — 창 안 상대 시각을 절대 시각으로", () => {
  it("사인오프 세그먼트만 절대 시각으로 낸다", () => {
    const hits = findSignoffs([
      { start: 0, end: 3.2, text: "농민들의 시름은 깊어지고 있습니다." },
      { start: 3.3, end: 6.8, text: "KBC 허재입니다." },
    ], 486);
    assert.deepEqual(hits.map((hit) => hit.at), [492.8]);
  });

  it("끝 시각이 숫자가 아니면 버린다", () => {
    assert.deepEqual(findSignoffs([{ start: 0, end: Number.NaN, text: "KBC 허재입니다." }], 100), []);
  });
});

describe("signoffProbeTimes — §144와 같은 이유로 두 점", () => {
  it("사인오프마다 +0·+2 두 점을 낸다", () => {
    assert.deepEqual(signoffProbeTimes([{ at: 492.8, text: "KBC 허재입니다." }], []), [492.8, 494.8]);
  });

  it("확정 경계 ±8초 안은 새 후보로 보지 않는다", () => {
    assert.deepEqual(signoffProbeTimes([{ at: 492.8, text: "x" }], [496.8]), []);
  });

  it("서로 1.5초 안에 붙은 후보는 하나만 남긴다", () => {
    const times = signoffProbeTimes([{ at: 100, text: "a" }, { at: 101, text: "b" }], []);
    assert.deepEqual(times, [100, 102]);
  });
});
