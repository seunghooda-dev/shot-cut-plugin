# ShortFlow Studio

Adobe Premiere Pro UXP panel for short-form video editing. Goal: a Premiere internal beta (not a commercial release) — see [docs/INTERNAL_BETA_SCOPE.md](docs/INTERNAL_BETA_SCOPE.md) and [docs/ROADMAP.md](docs/ROADMAP.md) for what's in/out of scope before adding features.

## 뉴스 분할 최우선 목표 — 신규 회차 F1 100

사용자가 명시한 이 프로젝트의 1순위 목표는 **뉴스 자동 분할의 경계 F1 100**이다. 단, 그 100이 무엇의 100인지가 핵심이다.

**목표는 코퍼스 F1이 아니라 "사용자가 실제로 넣는 새 회차"의 F1이다.** 상용 배포판이 만나는 것은 학습에 쓴 회차가 아니라 오늘 방송된 회차다.

### 세 수치를 절대 섞어 말하지 말 것

| 지표 | 뜻 | 2026-07-31 실측 |
|---|---|---|
| ① 코퍼스 전량(111회차) 오프라인 | 무료 경로, 학습셋 포함이라 낙관적 | **92.7** |
| ② **홀드아웃**(24회차) | 무료 경로 일반화 | P 89 R 82 **F1 85.5** |
| ③ **실기 비전 ON 블라인드** | **이것이 목표 대상** | **41회차 중 40회차 100** · 남은 하나는 4/07 96.3(§125 4형). 단 **현행 빌드(§170-d)로 재확인한 것은 13회차**이고 나머지는 이전 빌드 결과다 — 아래 주의 참조 |

**①이 96.5 → 92.7로 내려간 것은 회귀가 아니다.** 1~4월 어려운 회차를 코퍼스에 대거 편입해
분모가 바뀌었다(90 → 111회차). **①이 낮은 회차가 실기에서 나쁜 것도 아니다** — 2/10은 ①이
10.5인데 실기 100이고, 3/03·3/12도 ① 16.7에 실기 100이다.

**①은 편향이 양방향이라 제품 품질의 대리 지표가 될 수 없다(§162).** 학습셋을 포함해
낙관적인 동시에, 오프라인 채점 경로(`lib.mjs predictItemStarts`)에 **제품의 §138 병합·재스냅·
비전 검증이 빠져 있어** 비관적이다 — 실측: ① FP 94건 중 9건이 "같은 앵커 블록 안 중복"인데
그중 3/10·5/08은 실기에서 FP 0이었다. **①은 후보 생성 회귀 감시용으로만 쓰고, 제품 판단은
③으로 한다.**

**"N회차 전원 F1 100"이라고 쓰지 말 것(§126).** 같은 회차·같은 빌드가 실행마다 다른 결과를 낸다(3/10 97.1↔100, 1/20 92.3↔100, 2/10 76.9↔100 — 코드 변경 없이도 바뀐다). 변동은 전부 **후보 생성 단계**에서 나온다. 지표는 **회차당 실행 수와 최솟값**을 함께 적고, 완료 조건의 "3연속 100"도 **같은 회차 복수 실행 전부 100**으로 판정한다.

**①이 100이어도 목표 달성이 아니다.** 실제로 ①이 97.9일 때 ②는 47.1이었다(§100). 진척을 보고할 때는 반드시 ②·③을 함께 적을 것.

③의 회차는 **코퍼스에 없거나 DEFAULT_HOLDOUT에 있는 것만 센다.** 2026-07-28 배치에서 6/26을 블라인드로 돌렸다가 뒤늦게 코퍼스 학습셋에 있는 회차임을 발견해 명단에서 뺐다(§122) — 학습 모델이 그 회차 시작 14개를 정확히 재현한 것이 in-sample 신호였다. 2026-07-30에도 같은 함정이 재발했다(§151) — 라벨 28회차 중 9회차가 §127 등록분(학습셋)이라 ③에서 제외했고, 4/16은 채점 전에 적발돼 오염 0이었다. **새 회차를 블라인드로 쓰기 전에 `training-data/news-anchor/`에 있는지, 있다면 홀드아웃인지 반드시 먼저 확인할 것.**

③은 2026-07-31에 41회차로 확장 실측했고(§156~§159), 2026-08-01에 **40회차 100 · FP 0**이
됐다 — 7/29 데스크 칼럼이 §170에서 닫혔다(82.8 → **5실행 전부 100**). 남은 미달은
**4/07 96.3(§125 4형) 하나**이고 실행 간 동일값이라 요동이 아니라 구조 상수다.
**진짜 미학습 신규 회차** 7/27·7/28·7/29·7/30·7/31은 전부 복수 실행 100이다.
과거 요동 이력 회차(2/10 76.9↔100 · 1/06 FP 250 · 2/19 FN)는 2실행씩 전부 100으로
**요동이 소멸했다**(§156).

**"40회차 100"은 여러 빌드에 걸친 누적치다.** 2026-08-02 현행 빌드(§170-d)로 실제 재확인한
것은 13회차다 — 7/27·7/28·7/29·7/30·7/31(신규) · 1/06·2/10·2/19·3/10·5/08·1/20·3/24(과거 FP·요동
이력) · 4/07(4형 감시). 나머지 28회차는 §168 이전 빌드의 결과이고, 사용자 지시("전량 재검증
금지, 표적+대조 소수로 판정")에 따라 재검증하지 않는다. **회귀가 의심되면 전량이 아니라
과거 FP 이력 회차부터 본다** — 회수 경로의 위험은 깨끗한 회차에서 드러나지 않는다.

**같은 회차·같은 빌드라도 실행마다 결과가 다르다**(§121-b 실측: 3/24 후보 7개 vs 9개, 놓친 아이템이 920 → 248로 바뀜). 후보 생성 비결정성(§59)이 이 정밀도에서는 회차 판정을 좌우한다 — **"3연속 100" 판정은 회차당 복수 실행으로 해야 하고, 1회 실행 결과를 달성 근거로 쓰지 말 것.**

### 측정 규약

- 경계 F1, **±8초 허용**, 아이템 시작 시각 1:1 매칭 — `scripts/news-train/lib.mjs`의 `boundaryF1`이 유일한 기준이다. 다른 방식으로 계산해 보고하지 말 것.
- **실기 채점의 예측값은 로그의 후보·회수 값이 아니라 실제 산출물이어야 한다(§134).** 후보·회수 값은 하단 띠 필터·재스냅 **이전**이라 실제와 다르다(4/09를 90.9로 보고했으나 실제는 95.2였다). `최종 아이템 시작:` 로그 줄을 쓰거나, 시퀀스에서 `sequence.getInPoint()`를 읽는다 — 트랙 아이템의 `getInPoint()`는 언제나 0이라 쓸 수 없다.
- 새 회차를 `training-data/news-anchor/`에 추가하면 **반드시 `scripts/news-train/train.mjs`의 `DEFAULT_HOLDOUT`에도 넣는다.** 넣지 않으면 다음 학습이 그 회차를 삼켜 실패가 지표에서 사라진다(이 함정이 §100에서 실제로 발생했다).
- 라벨링 절차: 1차 판독은 서브에이전트(프레임 스트립)에 위임 가능하나, **라벨 삭제·이동·신규 확정은 넓은 창으로 본인이 재검증**한 뒤에만 반영한다. FN 검증은 FP와 달리 **이웃 라벨 목록이 필수**다(§97).
- **실기 채점 전에 로그를 두 가지로 검문한다.** ①`비전 검증 시작`이 있는가 — 없으면 API 키 미설정으로 무료 강등된 실행이다(§155). ②`no credits remaining`·`한도`·`초과`가 0건인가 — 있으면 유료 경로가 죽은 실행이라 **F1을 계산하면 안 된다**(§160, 실사고). `score-run.mjs`에 가드가 있지만 다른 도구를 쓸 때도 같은 검문을 한다.

### 완료 조건 (이걸 만족하기 전에는 "F1 100 달성"이라고 말하지 않는다)

1. **미학습 신규 회차 3회 연속** 실기 비전 ON에서 F1 100
2. 코퍼스 전량 ① 무하락
3. 비전 오배제 0 유지(§92 — 진짜 앵커를 지우지 않는다)

### 이미 기각된 접근 (근거와 함께 문서에 있다 — 다시 파지 말 것)

`docs/01-plan/features/long-item-rescue.plan.md` §2에 5종이 표로 정리돼 있다. 요약하면 **매처·모델·영역·움직임을 손보는 길은 전부 막혔다** — 판별 정보가 픽셀에는 있고 luma 격자 표현에는 없기 때문이다. 남은 유효 방향은 **비전을 검증자가 아니라 제안자로 쓰는 것**이다(2026-07-27 실험: 무료 신호 천장 63.2인 구간에서 비전이 놓친 경계 5/5 포착, 48프레임 중 오검출 0).

2026-07-30~31 배치에서 기각된 것들(런북에 근거 있음) — **오디오** 무음 경계(§154, 비경계
82.2%도 통과) · 오프너 어휘(§154-b, 고전 전환어 0/355) · 사인오프 고정 오프셋(§155-b 정정,
성금 카드는 가변 길이) · 의미 수준 LLM 제안자(§155-c, 대조 오검출 5/7) · mel·F0. **뱅크
라우팅** 문턱 완화·후보 합집합·시점 병합·대체 신호 10종(§161~§161-c) — 전부 재현율↑
정밀도↓ 맞바꿈이고, **그 재현율은 실기에서 이미 회수 경로가 가지고 있다.**

### 남은 미해결 두 유형 (2026-07-31 기준)

| 유형 | 대표 | 상태 |
|---|---|---|
| §125 4형 (앵커 VO + b-roll 직행) | 4/07 220.8 | **수단 없음 최종 확정(§171).** 일곱 경로(후보·모델·오디오·어휘·의미·띠·긴 공백 스윕) 전부 소진. §171 스윕이 표적 ±8초(216·224)에 도달해 비전 판정까지 받았는데 **비앵커가 정답**이었다 — §170-b의 "정보가 222.0에 있다"(d=0.160)는 luma 유사도였고 픽셀에는 앵커가 없다. 시각·청각 신호로는 원리적으로 못 잡는 유형. 다시 파지 말 것 |
| ~~데스크 칼럼 (서서 진행하는 논평)~~ | 7/29 294.3 | **해결(§170~§170-d)** — 82.8 → **7실행 전부 100**. ①비전에 세 번째 답(`standingPresenterOnly`)을 주어 배제된 후보 중 첫 등장만 회수 ②2/19에서 연단 발언자를 칼럼으로 오인한 FP는 띠 줄 수·배경 단서로 시정(§170-c) ③되짚기가 칼럼 중간을 앵커로 오판하는 요동은 프롬프트로 못 막아 구조로 막았다(§170-d, 재발 실행에서 폐기 실증). **회수 경로 검증에는 과거 FP 이력 회차를 반드시 대조에 넣을 것** — 깨끗한 회차만으로는 위험이 안 드러난다 |

## Commands

Run from this directory (`npm install` first).

- `npm run check` — typecheck + lint + build + test; the required gate before any checkpoint commit
- `npm run typecheck` / `npm run lint` / `npm test` / `npm run build` — individual gates
- `npm run dev` — `vite build --watch`
- `npm run host:smoke` / `host:smoke:full` — 실행 중인 Premiere 실기 회귀 스모크(UDT 서비스 14001 필요). 새 실기 프로브는 `scripts/host-smoke/lib.mjs`를 import해 단일 세션 원칙을 지킬 것(런북 §40-d·§43)
- `npm run check:news` — 뉴스 분할 오프라인 회귀 게이트(고정 회차 경계 F1 스냅샷). **분할 로직(src/news-visual-cut.ts·news-cut.ts·참조 뱅크·모델) 수정 후 반드시 실행**하고, 통과 없이 해당 변경을 커밋하지 말 것(§77). 스캔 캐시(training-data, gitignore)가 필요해 메인 check에는 미포함.

## Architecture: 3 layers

```
public/index.html, public/styles.css, index.ts   (UI — event wiring, rendering; no network/host calls of its own)
        |
src/*-controller.ts, src/*.ts adapters            (Application/Infrastructure — file IO, OpenAI network calls,
        |                                          AI queue, DOM state management)
src/premiere.ts                                    (Host bridge — Premiere UXP DOM only, mutations wrapped in
                                                     lockedAccess() transactions)
```

Rules:
- `index.ts` never calls `src/openai-text.ts` (or any adapter) directly to drive a controller's internal state — it goes through the relevant `*-controller.ts`'s public API. `index.ts` *does* wire concrete adapters into a controller's options (composition root), e.g. `aiProvider: runSubtitleAI` in `index.ts`, where `runSubtitleAI` builds an `OpenAITextClient` and routes through `aiQueueController`.
- Controllers (`SubtitleController`, `ReferenceController`, etc.) never import `src/openai-text.ts` or other concrete adapters. They declare a port (a callback option, e.g. `aiProvider?`, `analysisProvider?`, `enrichPromptProvider?`) and treat whatever it returns as untrusted `unknown`, re-validating before using it. This is why a compromised or buggy adapter can't corrupt project data — the controller is the trust boundary.
- Only `src/premiere.ts` touches the Premiere UXP DOM. Action-creating calls go through `lockedAccess()`.

## Subtitle data model

`src/subtitles.ts` already has stable `cueId`/`wordId` identifiers (not array indices), with duplicate/normalization/sort-order validation, `splitCue`/`mergeCues`, and character-proportional word-time interpolation when real word timestamps aren't available. Don't reintroduce index-based addressing for cues/words.

AI subtitle actions (`src/openai-text.ts`, `OpenAITextClient`) split into two shapes:
- **Mutating** (`editSubtitles`: `reflow`/`review`/`translate`) — returns a full `SubtitleDocument`; the controller's `validateAiSubtitleResponse` enforces exact cueId/wordId/timing preservation before `commit()`.
- **Read-only analysis** (`analyzeSubtitles`: `interview-highlight`/`edit-outline`/`youtube-metadata`, plus `enrichPrompt` for reference notes) — returns derived data, never mutates the document, no undo/redo/autosave entry. `validateAnalysisResponse` only checks that referenced `cueId`s exist in the current document, filtering out ones that don't rather than hard-failing.

Both reuse the same OpenAI safety plumbing (HTTPS `api.openai.com` pinned, secureStorage-only API key, timeout/abort, 2MB request cap, "treat subtitle text as untrusted data" system-prompt invariant) — see `requestChunk` vs `requestJson` in `src/openai-text.ts`; they're intentionally separate methods so the mutating path's error-message contract (asserted in tests) never changes.

## Commit/push convention

Checkpoint commits require a passing `npm run check` first — never commit a red tree. As of 2026-07-13 (user directive), commit and push to the `newplugin` remote (https://github.com/seunghooda-dev/shot-cut-plugin — 2026-07-24 사용자가 비공개 전환·shot-cut-plugin으로 개명, 로컬 원격 별칭은 `newplugin` 유지) whenever a meaningful validated unit of work completes; the older "one commit per milestone" rule from "실행 원칙" in [docs/ROADMAP.md](docs/ROADMAP.md) is superseded. The `origin` remote (seunghooda-dev/plugin) is the legacy Codex repo — leave it untouched unless asked.

## Things not to carry over from other CEP/UXP reference projects

If porting ideas from older Adobe CEP-based plugins: don't reintroduce QE DOM dependency, filename-only project-item lookup, or single-point track search with `overwriteClip`. This project identifies media by file path, checks the full insertion range for conflicts, checks locked tracks, and rolls back on failure (see `src/recovery.ts`, `src/premiere.ts`).

## 장시간 자율 배치 규약 (2026-08-01 사용자 지시 — 모든 배치에 적용)

사용자가 장시간(수 시간~하루) 자율 작업을 맡길 때 아래를 **기본값으로** 따른다. 매번 다시
확인하지 않는다.

1. **멈추지 않는다 — 보고보다 착수가 먼저다.**
   **순서를 반드시 지킨다: ①다음 작업을 먼저 건다 → ②그다음에 보고 문장을 쓴다.**
   보고를 먼저 쓰면 "잘 마무리했다"는 느낌에 턴이 끝나 버린다. 실제로 2026-08-01에 두 번
   그랬다 — "바로 구현에 들어갑니다"라고 쓰고 착수하지 않았고, 결과 보고 후 다음 체인을
   걸지 않은 채 사용자가 "작업 중이야?"라고 물을 때까지 멈춰 있었다.
   - 다음 작업이 즉시 시작 가능하면 **그 턴에서 실행**한다(백그라운드로 띄우고 보고).
   - 즉시 시작할 수 없으면(대기·의존) **깨우기를 반드시 건다**(`ScheduleWakeup`/`CronCreate`).
   - **"다음은 ~하겠습니다"로 끝나는 턴은 실패다.** 그 문장을 쓸 것 같으면 먼저 도구를 부른다.
2. **정기 보고 스케줄을 건다.** 2시간마다 ①지금 하는 일 ②직전 완료분과 수치 ③다음 할 일
   ④막힌 것을 보고하고, 보고 후 대기하지 말고 이어서 진행한다. 공백 2시간 초과 금지.
3. **5시간마다 새 Premiere 프로젝트로 전환한다.** 과부하 예방이 목적이다. 전환은 **회차 경계에서만**
   한다(실행 중간 전환은 §40-d 단일 세션 원칙을 깨고 그 회차를 무효로 만든다).
   도구는 scratchpad `run-rotating.sh`(자동) · `cdt-rotate-project.mjs`(수동).
4. **승인이 필요한 지점에서는 권장안으로 진행한다.** 묻고 기다리지 않는다. 다만 되돌릴 수 없는
   작업(파일 영구 삭제, 원격 푸시 외의 외부 발신)은 예외이며, 판단 근거를 보고에 남긴다.
5. **서브에이전트를 적극 쓴다.** 프레임 판독·대량 탐색·보고서 작성처럼 실기(단일 CDP 세션)와
   자원이 겹치지 않는 일은 병렬로 돌린다.
6. **실기 검증은 표적+대조 소수로만 한다.** 전량(41회차) 재검증은 하지 않는다 — 무료 오프라인
   전량 실측은 무방하다.

## 공통 지침

행동 지침·모델 선택·문맥/토큰 효율은 전역 `~/.claude/CLAUDE.md`로 이동했다(모든 세션 공통 적용).
비자명한 작업의 계획 문서는 이 프로젝트에서는 bkit PDCA 문서가 그 역할을 한다 — Plan(docs/01-plan/features/), Design(docs/02-design/features/), 분석(docs/03-analysis/), 상태(docs/.pdca-status.json). 사용자가 계획만 주고 코딩을 요청하면, Plan/Design 문서를 먼저 만들지 물어본다.
