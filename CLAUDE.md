# ShortFlow Studio

Adobe Premiere Pro UXP panel for short-form video editing. Goal: a Premiere internal beta (not a commercial release) — see [docs/INTERNAL_BETA_SCOPE.md](docs/INTERNAL_BETA_SCOPE.md) and [docs/ROADMAP.md](docs/ROADMAP.md) for what's in/out of scope before adding features.

## Commands

Run from this directory (`npm install` first).

- `npm run check` — typecheck + lint + build + test; the required gate before any checkpoint commit
- `npm run typecheck` / `npm run lint` / `npm test` / `npm run build` — individual gates
- `npm run dev` — `vite build --watch`
- `npm run host:smoke` / `host:smoke:full` — 실행 중인 Premiere 실기 회귀 스모크(UDT 서비스 14001 필요). 새 실기 프로브는 `scripts/host-smoke/lib.mjs`를 import해 단일 세션 원칙을 지킬 것(런북 §40-d·§43)

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

Checkpoint commits require a passing `npm run check` first — never commit a red tree. As of 2026-07-13 (user directive), commit and push to the `newplugin` remote (https://github.com/seunghooda-dev/newplugin) whenever a meaningful validated unit of work completes; the older "one commit per milestone" rule from "실행 원칙" in [docs/ROADMAP.md](docs/ROADMAP.md) is superseded. The `origin` remote (seunghooda-dev/plugin) is the legacy Codex repo — leave it untouched unless asked.

## Things not to carry over from other CEP/UXP reference projects

If porting ideas from older Adobe CEP-based plugins: don't reintroduce QE DOM dependency, filename-only project-item lookup, or single-point track search with `overwriteClip`. This project identifies media by file path, checks the full insertion range for conflicts, checks locked tracks, and rolls back on failure (see `src/recovery.ts`, `src/premiere.ts`).

## 공통 지침

행동 지침·모델 선택·문맥/토큰 효율은 전역 `~/.claude/CLAUDE.md`로 이동했다(모든 세션 공통 적용).
비자명한 작업의 계획 문서는 이 프로젝트에서는 bkit PDCA 문서가 그 역할을 한다 — Plan(docs/01-plan/features/), Design(docs/02-design/features/), 분석(docs/03-analysis/), 상태(docs/.pdca-status.json). 사용자가 계획만 주고 코딩을 요청하면, Plan/Design 문서를 먼저 만들지 물어본다.
