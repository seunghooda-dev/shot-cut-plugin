# ShortFlow Studio

Adobe Premiere Pro UXP panel for short-form video editing. Goal: a Premiere internal beta (not a commercial release) — see [docs/INTERNAL_BETA_SCOPE.md](docs/INTERNAL_BETA_SCOPE.md) and [docs/ROADMAP.md](docs/ROADMAP.md) for what's in/out of scope before adding features.

## 뉴스 분할 최우선 목표 — 신규 회차 F1 100

사용자가 명시한 이 프로젝트의 1순위 목표는 **뉴스 자동 분할의 경계 F1 100**이다. 단, 그 100이 무엇의 100인지가 핵심이다.

**목표는 코퍼스 F1이 아니라 "사용자가 실제로 넣는 새 회차"의 F1이다.** 상용 배포판이 만나는 것은 학습에 쓴 회차가 아니라 오늘 방송된 회차다.

### 세 수치를 절대 섞어 말하지 말 것

| 지표 | 뜻 | 2026-07-28 실측 |
|---|---|---|
| ① 코퍼스 전량(90회차) 오프라인 | 무료 경로, 학습셋 포함이라 낙관적 | 96.5 |
| ② **홀드아웃 = 코퍼스에 없는 회차**(18회차) | 무료 경로 일반화 | P 90 R 80 **F1 84.7** |
| ③ **실기 비전 ON 블라인드** | **이것이 목표 대상** | 블라인드 20회차 × 1회 실행 · **최소 F1 96.3** |

**"N회차 전원 F1 100"이라고 쓰지 말 것(§126).** 같은 회차·같은 빌드가 실행마다 다른 결과를 낸다(3/10 97.1↔100, 1/20 92.3↔100, 2/10 76.9↔100 — 코드 변경 없이도 바뀐다). 변동은 전부 **후보 생성 단계**에서 나온다. 지표는 **회차당 실행 수와 최솟값**을 함께 적고, 완료 조건의 "3연속 100"도 **같은 회차 복수 실행 전부 100**으로 판정한다.

**①이 100이어도 목표 달성이 아니다.** 실제로 ①이 97.9일 때 ②는 47.1이었다(§100). 진척을 보고할 때는 반드시 ②·③을 함께 적을 것.

③의 회차는 **코퍼스에 없거나 DEFAULT_HOLDOUT에 있는 것만 센다.** 2026-07-28 배치에서 6/26을 블라인드로 돌렸다가 뒤늦게 코퍼스 학습셋에 있는 회차임을 발견해 명단에서 뺐다(§122) — 학습 모델이 그 회차 시작 14개를 정확히 재현한 것이 in-sample 신호였다. **새 회차를 블라인드로 쓰기 전에 `training-data/news-anchor/`에 있는지, 있다면 홀드아웃인지 반드시 먼저 확인할 것.**

③은 2026-07-28에 실측했다(§121). **연속 F1 100은 10회차까지 버텼고 11회차 3/24에서 깨졌다**(FN 1 — 앵커 블록 8초 + 배너 3초 지연으로 띠 이벤트가 컷 이후에 잡힘). 6/01·6/04는 그 회차 FP로 프롬프트를 고친 in-sample이고, 5/08은 §120, 3/24는 §121의 in-sample이다.

**같은 회차·같은 빌드라도 실행마다 결과가 다르다**(§121-b 실측: 3/24 후보 7개 vs 9개, 놓친 아이템이 920 → 248로 바뀜). 후보 생성 비결정성(§59)이 이 정밀도에서는 회차 판정을 좌우한다 — **"3연속 100" 판정은 회차당 복수 실행으로 해야 하고, 1회 실행 결과를 달성 근거로 쓰지 말 것.**

### 측정 규약

- 경계 F1, **±8초 허용**, 아이템 시작 시각 1:1 매칭 — `scripts/news-train/lib.mjs`의 `boundaryF1`이 유일한 기준이다. 다른 방식으로 계산해 보고하지 말 것.
- 새 회차를 `training-data/news-anchor/`에 추가하면 **반드시 `scripts/news-train/train.mjs`의 `DEFAULT_HOLDOUT`에도 넣는다.** 넣지 않으면 다음 학습이 그 회차를 삼켜 실패가 지표에서 사라진다(이 함정이 §100에서 실제로 발생했다).
- 라벨링 절차: 1차 판독은 서브에이전트(프레임 스트립)에 위임 가능하나, **라벨 삭제·이동·신규 확정은 넓은 창으로 본인이 재검증**한 뒤에만 반영한다. FN 검증은 FP와 달리 **이웃 라벨 목록이 필수**다(§97).

### 완료 조건 (이걸 만족하기 전에는 "F1 100 달성"이라고 말하지 않는다)

1. **미학습 신규 회차 3회 연속** 실기 비전 ON에서 F1 100
2. 코퍼스 전량 ① 무하락
3. 비전 오배제 0 유지(§92 — 진짜 앵커를 지우지 않는다)

### 이미 기각된 접근 (근거와 함께 문서에 있다 — 다시 파지 말 것)

`docs/01-plan/features/long-item-rescue.plan.md` §2에 5종이 표로 정리돼 있다. 요약하면 **매처·모델·영역·움직임을 손보는 길은 전부 막혔다** — 판별 정보가 픽셀에는 있고 luma 격자 표현에는 없기 때문이다. 남은 유효 방향은 **비전을 검증자가 아니라 제안자로 쓰는 것**이다(2026-07-27 실험: 무료 신호 천장 63.2인 구간에서 비전이 놓친 경계 5/5 포착, 48프레임 중 오검출 0).

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
