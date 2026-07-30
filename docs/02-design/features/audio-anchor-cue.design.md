# 설계 — 오디오 사인오프 회수 (audio-anchor-cue, A안)

Plan: [audio-anchor-cue.plan.md](../../01-plan/features/audio-anchor-cue.plan.md) (§152 판별력 실측 완료)

## 1. 제약이 설계를 결정했다

| 제약 | 근거 | 설계 귀결 |
|---|---|---|
| UXP 패널은 로컬 프로세스를 못 띄운다 | `child_process`·`spawn`이 소스에 없음 | 로컬 Whisper는 **제품 경로 불가** |
| localhost·사설망 엔드포인트 금지 | `speech.ts:forbiddenHostname` (SSRF 방어 — 뚫지 않는다) | 로컬 STT 서버 우회도 불가 |
| 전량 STT 타임스탬프 최대 8초 드리프트 | Plan §2 8차 실측 | **창 한정**이 정확도에도 유리 |

→ **A안: 창 한정 OpenAI STT.** 제약이 오히려 비용·정확도를 동시에 개선한다.

## 2. 핵심 착상 — 오디오는 한 번만 뽑고, 창은 바이트로 자른다

`exportActiveSequenceAudio()`가 이미 전체 시퀀스를 **16kHz 모노 WAV**로 로컬 추출한다(무료,
번들 프리셋 `shortflow_audio_16k_mono.epr`). 16kHz 모노 PCM은 **바이트 오프셋으로 자를 수 있다**
— 창마다 Premiere 재추출이 필요 없다.

```
전체 WAV 1회 추출(로컬·무료)
  └→ parseWavPcm으로 sampleRate·channels·bitsPerSample·dataOffset 획득
      └→ 창 [t, t+12] → 바이트 오프셋 계산 → 잘라서 새 WAV 헤더 부착
          └→ OpenAI STT(whisper-1, verbose_json) → 세그먼트 타임스탬프
              └→ 창 안 상대 시각 + 창 시작 = 절대 시각(드리프트 없음)
```

창당 16초 · 회차당 20창 ≈ **5분 20초 오디오**. 비전 프레임 수백 장보다 훨씬 저렴하다.

## 3. 어디에 창을 걸 것인가

전량 스캔은 필요 없다 — **회수 경로가 이미 후보 지점을 알고 있다.**

1. `planRescueProbes`의 격자 프로브 시각(경고 회차)
2. 띠 이벤트 시각 `bandProbeTimes` (전 회차)
3. 확정 경계들 사이가 60초 이상인 구간의 중앙

각 지점의 **직전** 창 `[t − 14, t − 2]`을 본다. 사인오프는 리포트 끝(다음 경계 직전
1~3초)에 있으므로, 후보 지점이 경계보다 뒤에 있을 때 그 창이 사인오프를 품는다.

상한 — 회차당 창 24개(`AUDIO_CUE_MAX_WINDOWS`). 초과 시 구간이 긴 쪽 우선.

## 4. 계층 배치 (하우스 규칙 준수)

| 계층 | 파일 | 책임 |
|---|---|---|
| 순수 | `src/audio-signoff.ts` (신규) | WAV 창 슬라이스 · 사인오프 정규식 · 세그먼트→경계 후보 변환. **네트워크·UXP 무의존, 전량 단위 테스트** |
| 어댑터 | `src/speech.ts` (기존) | `transcribe()` 재사용 — 신규 네트워크 코드 없음 |
| 조립 | `index.ts` | 전체 WAV 1회 추출 → 창 슬라이스 → `transcribe` 호출 → 후보를 회수 프로브에 합류 |

`index.ts`는 순수 계층이 만든 후보를 **회수 프로브 목록에 넣기만** 한다. 판정은 기존 비전
경로가 한다(§149 위계).

## 5. 순수 계층 API

```ts
export interface SignoffWindow { begin: number; end: number; }
export interface SignoffHit { at: number; text: string; }

/** 16kHz 모노 PCM WAV에서 [begin, end] 구간만 잘라 새 WAV 바이트를 만든다. */
export function sliceWavWindow(bytes: Uint8Array, begin: number, end: number): Uint8Array;

/** 후보 지점들로부터 볼 창 목록을 만든다(중복·경계 인접 제거, 상한 적용). */
export function planSignoffWindows(
  probeTimes: readonly number[], confirmed: readonly number[], endTime: number,
  options?: { maxWindows?: number },
): SignoffWindow[];

/** STT 세그먼트에서 사인오프를 찾아 절대 시각으로 변환한다. */
export function findSignoffs(
  segments: readonly { start: number; end: number; text: string }[],
  windowBegin: number,
): SignoffHit[];

/** 사인오프 시각 → 회수 프로브 후보(§144와 같은 이유로 두 점). */
export function signoffProbeTimes(
  hits: readonly SignoffHit[], confirmed: readonly number[],
): number[];
```

## 6. 규칙 상수 (실측 근거와 함께 고정)

| 상수 | 값 | 근거 |
|---|---|---|
| `SIGNOFF_PATTERN` | `/KBC\s*(뉴스\s*)?[가-힣]{2,4}\s*입니다/u` | Plan §2 — `기자입니다`로 가정했다가 0/10 |
| 창 길이 | 16초 (`[t−14, t+2]`) | 11.7초 창은 마지막 문장을 잘라 0/10. 초기값 `[t−14, t−2]`도 경계 ±1초에 끝나는 사인오프를 잘랐다(§155 실측: 3/24 193.1 Δ−1.0·580.2 Δ+1.0) — 창은 후보 지점을 2초 지나야 한다 |
| 후보 오프셋 | 사인오프 끝 `+0`, `+2` | 끝→경계 0.5~2.8초 실측, §144와 같은 이유로 두 점 |
| 기존 경계 근접 제거 | ±8초 | F1 허용오차와 동일 |
| 창 상한 | 24 | 비용 상한 |

## 7. 안전·비용

- **동의 게이트** — 비전 ON(=유료 동의 완료) 회차에서만 동작한다. `visionEnabled`가 false면
  창을 아예 만들지 않는다. 별도 동의 UI를 추가하지 않는다(§99 게이트 재사용).
- **실패 무해** — 오디오 추출·STT 실패는 경고 로그 후 건너뛴다. 오디오는 보조 신호이고,
  없으면 현재 동작 그대로다.
- **한도** — 기존 `runVisionBatch`의 한도 처리와 같은 방침: 한도 소진 시 남은 창을 포기하고
  개수·시각을 로그에 남긴다(§110-c — 한도 기각을 유실로 위장하지 않는다).
- **API 키** — `speech.ts`의 secureStorage 경로를 그대로 쓴다. 신규 저장·전송 경로 없음.

## 8. 검증

1. 순수 계층 단위 테스트 — WAV 슬라이스 바이트 정확성, 창 계획(중복·상한), 정규식
   (`기자입니다`는 안 걸리고 `KBC 김동수입니다`는 걸림), 두 점 후보 생성.
2. `npm run check` + `npm run check:news`.
3. 실기 3연전 — **4/09**(3형 202.4 회수 기대) · **3/18**(사인오프 다수 회차) ·
   **1/28**(카나리아 100 유지). 채점은 `최종 아이템 시작:` 로그(§134).

## 9. 하지 않을 것

- 전량 STT(비용·드리프트 둘 다 불리).
- localhost STT 서버(§1 가드 — 보안 결정을 뒤집지 않는다).
- 오디오로 비전 앵커 판정 취소(§149 위계 위반).
