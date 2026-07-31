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
| ③ **실기 비전 ON 블라인드** | **이것이 목표 대상** | **41회차 중 39회차 100** · 나머지 4/07 96.3(§125 4형)·7/29 82.8(데스크 칼럼) — 둘 다 실행 간 동일값(구조 상수, 요동 아님) |

**①이 96.5 → 92.7로 내려간 것은 회귀가 아니다.** 1~4월 어려운 회차를 코퍼스에 대거 편입해
분모가 바뀌었다(90 → 111회차). **①이 낮은 회차가 실기에서 나쁜 것도 아니다** — 2/10은 ①이
10.5인데 실기 100이고, 3/03·3/12도 ① 16.7에 실기 100이다. 무료 경로의 약점을 비전·회수가
메우는 구조라, **①만 보고 제품 상태를 판단하지 말 것.**

**"N회차 전원 F1 100"이라고 쓰지 말 것(§126).** 같은 회차·같은 빌드가 실행마다 다른 결과를 낸다(3/10 97.1↔100, 1/20 92.3↔100, 2/10 76.9↔100 — 코드 변경 없이도 바뀐다). 변동은 전부 **후보 생성 단계**에서 나온다. 지표는 **회차당 실행 수와 최솟값**을 함께 적고, 완료 조건의 "3연속 100"도 **같은 회차 복수 실행 전부 100**으로 판정한다.

**①이 100이어도 목표 달성이 아니다.** 실제로 ①이 97.9일 때 ②는 47.1이었다(§100). 진척을 보고할 때는 반드시 ②·③을 함께 적을 것.

③의 회차는 **코퍼스에 없거나 DEFAULT_HOLDOUT에 있는 것만 센다.** 2026-07-28 배치에서 6/26을 블라인드로 돌렸다가 뒤늦게 코퍼스 학습셋에 있는 회차임을 발견해 명단에서 뺐다(§122) — 학습 모델이 그 회차 시작 14개를 정확히 재현한 것이 in-sample 신호였다. 2026-07-30에도 같은 함정이 재발했다(§151) — 라벨 28회차 중 9회차가 §127 등록분(학습셋)이라 ③에서 제외했고, 4/16은 채점 전에 적발돼 오염 0이었다. **새 회차를 블라인드로 쓰기 전에 `training-data/news-anchor/`에 있는지, 있다면 홀드아웃인지 반드시 먼저 확인할 것.**

③은 2026-07-31에 41회차로 확장 실측했다(§156~§159). **39회차 100 · FP 0**이고, 미달 둘은
실행 간 동일값이라 요동이 아니라 구조 상수다 — 4/07 96.3(§125 4형)·7/29 82.8(데스크 칼럼).
**진짜 미학습 신규 회차** 7/27·7/28·7/30(당일 방송분)은 각 3실행 전부 100이고, 7/29만
새 포맷에 막혔다(3실행 82.8 동일). 과거 요동 이력 회차(2/10 76.9↔100 · 1/06 FP 250 ·
2/19 FN)는 2실행씩 전부 100으로 **요동이 소멸했다**(§156).

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
| §125 4형 (앵커 단신 사이 전환) | 4/07 220.8 | 오디오·어휘·의미·후보 생성 전부 소진 — **수단 없음, 데이터 보류** |
| 데스크 칼럼 (서서 진행하는 논평) | 7/29 294.3 | **후보는 이미 잡힌다** — 비전이 "앉은 왼쪽 데스크 앵커" 정의 밖이라 배제. 정의 확장이 유일한 길이나 §92 오배제 0을 위협하므로 신중히 |

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

## 공통 지침

행동 지침·모델 선택·문맥/토큰 효율은 전역 `~/.claude/CLAUDE.md`로 이동했다(모든 세션 공통 적용).
비자명한 작업의 계획 문서는 이 프로젝트에서는 bkit PDCA 문서가 그 역할을 한다 — Plan(docs/01-plan/features/), Design(docs/02-design/features/), 분석(docs/03-analysis/), 상태(docs/.pdca-status.json). 사용자가 계획만 주고 코딩을 요청하면, Plan/Design 문서를 먼저 만들지 물어본다.
