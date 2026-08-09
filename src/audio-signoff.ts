// 리포터 사인오프("KBC ◯◯◯입니다") 오디오 단서로 놓친 경계를 회수하는 순수 계층(§152).
// 네트워크·UXP에 의존하지 않는다 — 조립은 index.ts가 하고, STT는 src/speech.ts를 재사용한다.
import { parseWavPcm } from "./wav-pcm";

/**
 * 사인오프 정규식 — 이 방송의 리포터 클로징은 `KBC ◯◯◯입니다` 형식이다.
 *
 * `기자입니다`로 가정했다가 5회차 20건 중 **0건**을 잡았다(§152 1차). 규칙을 추측으로 쓰면
 * 신호가 있어도 없다고 결론 내린다 — 관습은 실측으로 확인한다.
 */
export const SIGNOFF_PATTERN = /KBC\s*(?:뉴스\s*)?[가-힣]{2,4}\s*입니다/u;

/**
 * 모닝와이드용 완화형 — 같은 관습이되 **방송사명 토큰의 ASR 오인을 허용**한다.
 *
 * 모닝와이드 19회차 로컬 STT 실측에서 실제 사인오프가 `MBC 뉴스 김성현입니다`로 전사됐다
 * (KBC를 MBC로 잘못 들음). 8뉴스는 `KBC` 고정으로 실기가 검증돼 있으므로 **그 경로는 건드리지
 * 않고** 모닝와이드에서만 완화한다 — 완화는 매치를 늘리기만 하므로, 8뉴스에 적용하면 검증된
 * 오검출 0을 재검증 없이 흔들게 된다.
 *
 * 실측: 경계 적중 6/19(고정형) → 7/19(완화형) · **대조 오검출 둘 다 0/19**.
 * `계획입니다`·`규제입니다` 같은 흔한 종결은 방송사명 토큰이 앞에 없어 그대로 걸러진다.
 */
export const MORNING_WIDE_SIGNOFF_PATTERN = /(?:[A-Z]{1,3}C|케이비씨)\s*(?:뉴스\s*)?[가-힣]{2,4}\s*입니다/u;

/**
 * 후보 지점 직전에 볼 창 — 사인오프는 대개 경계 1~3초 앞에서 끝나지만 **경계 ±1초에 끝나는
 * 것도 실재한다**(§155 실측: 3/24 193.1 Δ−1.0 · 580.2 Δ+1.0, J-컷 겹침 포함). 창이 경계에
 * 닿지 않으면 마지막 문장이 잘려 신호가 있어도 못 본다(§152 1차의 11.7초 창이 0/10) —
 * 그래서 창 끝을 후보 지점 +2초까지 연장한다([t−14, t+2], 창당 STT 4초 증가).
 */
export const SIGNOFF_WINDOW_LEAD = 14;
export const SIGNOFF_WINDOW_LENGTH = 16;
/** 회차당 창 상한 — 비용 상한(창당 12초 오디오). */
export const SIGNOFF_MAX_WINDOWS = 24;
/** 이미 확정된 경계와 이만큼 안이면 새 후보로 보지 않는다 — F1 허용오차와 같은 값. */
export const SIGNOFF_NEAR_CONFIRMED = 8;

export interface SignoffWindow {
  begin: number;
  end: number;
}

export interface SignoffHit {
  /** 사인오프 발화가 끝난 절대 시각. */
  at: number;
  text: string;
}

export interface TranscriptLike {
  start: number;
  end: number;
  text: string;
}

const clampInt = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, Math.round(value)));

/**
 * 16비트 모노 PCM WAV 바이트를 만든다 — OpenAI STT가 받는 최소 형식.
 * 원본 비트depth·채널 수와 무관하게 안전하도록 parseWavPcm이 모노화한 Float32에서 재인코딩한다.
 */
export function encodeWavPcm16(samples: Float32Array, sampleRate: number): Uint8Array {
  if (!(samples instanceof Float32Array) || samples.length === 0) {
    throw new Error("WAV로 인코딩할 샘플이 없습니다.");
  }
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new Error("WAV 샘플레이트가 올바르지 않습니다.");
  }
  const dataSize = samples.length * 2;
  const bytes = new Uint8Array(44 + dataSize);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, text: string): void => {
    for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
  };
  ascii(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // 모노
  view.setUint32(24, Math.round(sampleRate), true);
  view.setUint32(28, Math.round(sampleRate) * 2, true); // byteRate
  view.setUint16(32, 2, true); // blockAlign
  view.setUint16(34, 16, true); // bitsPerSample
  ascii(36, "data");
  view.setUint32(40, dataSize, true);
  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index]!));
    view.setInt16(44 + index * 2, Math.round(clamped * 32767), true);
  }
  return bytes;
}

/**
 * 전체 시퀀스 WAV를 한 번만 파싱해 [begin, end] 창을 잘라 주는 슬라이서를 만든다.
 *
 * 창마다 Premiere를 다시 부르지 않는 것이 요점이다 — 전체 오디오는 이미 16kHz 모노로 한 번
 * 로컬 추출돼 있고(무료), 창은 샘플 오프셋으로 자르면 된다. 창이 독립적이라 전량 STT의
 * 타임스탬프 드리프트(최대 8초 — §152 8차)도 원리적으로 생기지 않는다. 파싱 1회 고정은
 * 안정화 감사 #3 — 창마다 재파싱하던 구 sliceWavWindow는 40분 회차 기준 창당 ~150MB 할당이
 * 최대 24회 반복돼 폐기했다.
 */
export function createWavWindowSlicer(bytes: Uint8Array): (begin: number, end: number) => Uint8Array {
  const pcm = parseWavPcm(bytes);
  return (begin: number, end: number): Uint8Array => {
    if (!(end > begin)) throw new Error("오디오 창의 끝이 시작보다 뒤여야 합니다.");
    const first = clampInt(begin * pcm.sampleRate, 0, pcm.samples.length);
    const last = clampInt(end * pcm.sampleRate, first + 1, pcm.samples.length);
    return encodeWavPcm16(pcm.samples.slice(first, last), pcm.sampleRate);
  };
}

/**
 * 회수 후보 지점들로부터 볼 창 목록을 만든다.
 *
 * 전량 STT는 하지 않는다 — 회수 경로가 이미 "여기 뭔가 있다"는 지점(격자 프로브·띠 이벤트·
 * 긴 구간 중앙)을 알고 있으므로 그 **직전** 창만 본다. 창이 겹치면 하나로 접고, 확정 경계에
 * 붙은 창은 볼 필요가 없어 뺀다.
 */
export function planSignoffWindows(
  probeTimes: readonly number[],
  confirmed: readonly number[],
  endTime: number,
  options: { maxWindows?: number; lead?: number; length?: number } = {},
): SignoffWindow[] {
  const maxWindows = options.maxWindows ?? SIGNOFF_MAX_WINDOWS;
  const lead = options.lead ?? SIGNOFF_WINDOW_LEAD;
  const length = options.length ?? SIGNOFF_WINDOW_LENGTH;
  const windows: SignoffWindow[] = [];
  for (const time of [...new Set(probeTimes)].sort((left, right) => left - right)) {
    const begin = time - lead;
    const end = begin + length;
    if (begin < 0 || end > endTime) continue;
    // 확정 경계가 창 안에 있으면 그 경계가 이미 그 리포트의 끝을 표시한다 — 볼 이유가 없다.
    if (confirmed.some((start) => start > begin && start < end)) continue;
    const previous = windows.at(-1);
    if (previous && begin < previous.end) continue;
    windows.push({ begin, end });
    if (windows.length >= maxWindows) break;
  }
  return windows;
}

/** 창 STT 세그먼트에서 사인오프를 찾아 절대 시각으로 옮긴다. */
export function findSignoffs(
  segments: readonly TranscriptLike[],
  windowBegin: number,
  pattern: RegExp = SIGNOFF_PATTERN,
): SignoffHit[] {
  const hits: SignoffHit[] = [];
  for (const segment of segments) {
    if (!segment || typeof segment.text !== "string") continue;
    if (!pattern.test(segment.text)) continue;
    const end = Number(segment.end);
    if (!Number.isFinite(end)) continue;
    hits.push({ at: Math.round((windowBegin + end) * 10) / 10, text: segment.text.trim() });
  }
  return hits;
}

/**
 * 사인오프 시각 → 회수 프로브 후보.
 *
 * 사인오프 끝과 실제 컷 사이가 0.5~2.8초로 흔들리므로(§152 실측) 고정 오프셋 하나는 컷을
 * 지나칠 수 있다 — §144와 같은 이유로 **두 점**(+0, +2)을 낸다. 확정 경계에 붙은 것은 뺀다.
 */
export function signoffProbeTimes(
  hits: readonly SignoffHit[],
  confirmed: readonly number[],
): number[] {
  const out: number[] = [];
  for (const hit of hits) {
    for (const offset of [0, 2]) {
      const time = Math.round((hit.at + offset) * 10) / 10;
      if (confirmed.some((start) => Math.abs(start - time) <= SIGNOFF_NEAR_CONFIRMED)) continue;
      if (out.some((existing) => Math.abs(existing - time) < 1.5)) continue;
      out.push(time);
    }
  }
  return out.sort((left, right) => left - right);
}
