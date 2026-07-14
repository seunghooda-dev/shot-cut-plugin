# AI 숏폼 플랜 + 샘플 학습 (ai-shorts-plan-learning) Design

> **Summary**: 자동 컷의 "판단"을 모델로 더 옮기는 `shorts-plan` 분석 액션(Phase 1)과, 사용자가 준 (원본+숏폼) 샘플에서 편집 스타일을 few-shot으로 학습하는 파이프라인(Phase 2). 파인튜닝이 아니라 예시 학습 — 샘플 몇 개로 즉시, 재학습 없이 스타일을 반영한다.
>
> **Project**: shortflow-studio · **Date**: 2026-07-14 · **Status**: ✅ 전 단계 완료·게이트 1645/1645·Tier1 Host 통과. P1(shorts-plan 판단) + P2(정렬·예시·코퍼스 저장·"샘플로 학습" UI·코퍼스 주입) 배선 완료. 실제-AI 엔드투엔드만 사용자 게이트(자막 로드+유료). (사용자: "샘플 학습 파이프라인까지 한번에 · 끝까지 완벽하게")

## 1. 배경·범위

`planHighlightCuts`(순수 휴리스틱)는 하이라이트 클러스터를 결정적으로 조립한다. 사용자 방향: **판단을 모델에서 더 빌려오기** + **내 숏폼 샘플로 스타일 학습**. 파인튜닝은 샘플 몇 개론 과적합·인프라 부담이라 제외; **few-shot in-context 학습**이 이 규모에 맞고 즉시·투명·저비용이다. 학습의 성격은 "보편 바이럴 예측"이 아니라 **사용자 편집 취향 모방**.

## 2. 아키텍처 (3계층·신뢰 경계 유지)

- **어댑터** `src/openai-text.ts`: `shorts-plan` 분석 액션 추가(기존 read-only 분석 플럼빙 재사용 — 스키마·시스템 프롬프트 불변 원칙 유지, cueId만 참조).
- **순수 로직** `src/shorts-plan.ts`(신규): `segmentsFromModelPlan`(모델 플랜 cueIds→검증된 `HighlightCutSegment[]`), `alignShortToOriginal`(숏폼 전사→원본 cueIds 역추적), `buildStyleExample`/`distillStyleProfile`(샘플→few-shot 예시·프로필). 전부 결정적 순수.
- **컨트롤러** `SubtitleController`: `planAutoCuts`가 shorts-plan 우선, 실패·빈 결과면 기존 `interview-highlight+edit-outline+planHighlightCuts` 폴백. provider 반환은 `validateAnalysisResponse`로 검증 후에만 사용(신뢰 경계). 스타일 코퍼스 주입.
- **저장** 스타일 코퍼스(예시 N개)는 `src/settings.ts`와 별개 저장소 키(용량 커서). 큐레이트 상한.
- **index.ts** 오케스트레이션: "이 원본+숏폼으로 학습" 흐름(STT 숏폼→align→예시 저장) + 자동 컷이 코퍼스 주입.

## 3. Phase 1 — `shorts-plan` 분석 액션

### 3.1 스키마·프롬프트
- `ANALYSIS_ACTIONS`에 `"shorts-plan"` 추가. `SubtitleAnalysisAction` 유니온·`SubtitleAnalysisResult` 변형 추가.
- `SHORTS_PLAN_SCHEMA`: `{ shorts: [{ cueIds: string[], hook: string, title: string, score: number, reason: string }] }`.
- 시스템 프롬프트(불변 유지 + ): "Propose self-contained short-form segments (each ~15–60s), each starting on a strong hook. Return cueIds in chronological order, present in input only. score 0..1 = expected retention/shareability. Provide a hook line and a short title." + few-shot 예시 주입.
- **cueId 반환 이유**: 프로젝트의 cueId 주소 체계 + `validateAnalysisResponse`가 존재 cueId만 통과시켜 untrusted 출력 방어. 컨트롤러가 cueIds→시간(min start~max end)으로 변환.

### 3.2 순수 변환 `segmentsFromModelPlan(document, shorts, options)`
- 각 short의 cueIds를 문서 존재분만 필터→시간 구간(min/max) 계산→`maxDuration` 클램프 + 워드 스냅(`highlight-cut`의 `wordSnapEnd` 재사용)→모델 score 클램프[0,1]·title/hook/reason 정제→`HighlightCutSegment` 생성. 겹침 제거·상한은 기존 `planHighlightCuts`와 동일 로직 공유. 출력 타입 동일이라 UI·`createShortsFromMarkers` 매핑 불변.

### 3.3 컨트롤러 통합·폴백
- `planAutoCuts`: (1) 코퍼스에서 few-shot 예시 로드→`shorts-plan` 실행→`segmentsFromModelPlan` → ≥1이면 반환. (2) 실패·빈 결과·문서 과대(청크 필요)면 기존 휴리스틱 폴백. 휴리스틱은 항상 안전망.
- v1 제약: shorts-plan은 청킹 없이 전체 문서 1회 호출(숏 일관성). 크기 초과 시 폴백.

## 4. Phase 2 — 샘플 학습 파이프라인

### 4.1 정렬(순수) `alignShortToOriginal(originalDoc, shortDoc) → { spans: Array<{cueIds, coverage}> }`
- 숏폼 전사 텍스트를 원본 cue에 매칭해 "원본의 어느 구간이 숏폼이 됐는지" 역추적. 정규화(공백·문장부호 제거·소문자)→토큰 집합. 원본 cue를 슬라이딩하며 숏폼 토큰과 **containment**(숏폼 토큰이 원본 창에 포함되는 비율) 최대 연속 구간 탐색. 다중 구간(숏폼이 여러 순간 편집) 지원은 상위 K개. coverage=설명된 숏폼 비율.
- 실패 조건: 재더빙·무음 재편집이면 매칭 낮음 → 학습 스킵·수동 폴백 안내.

### 4.2 예시 추출(순수) `buildStyleExample(originalDoc, spans, meta) → StyleExample`
- `StyleExample = { transcript: 원본 관련 창 발췌, chosen: Array<{cueIds, hook, title, durationSeconds}> }`. hook/title은 숏폼 첫 줄·사용자 입력 또는 비움. few-shot에 "이 전사에서 이 사람은 이 cueIds를 이 훅·길이로 골랐다"를 보여준다.

### 4.3 스타일 코퍼스(저장) + 프로필 증류(순수)
- 코퍼스: `StyleExample[]` 영속(별도 키), 큐레이트 상한 N(예 4, 최신·고품질 우선).
- `distillStyleProfile(examples) → { avgDuration, hookStyles, pickDensity, ... }`: 여러 예시를 압축한 규칙(토큰 절감용). v1은 verbatim 예시 2~3개 주입, 프로필은 선택.

### 4.4 UI·흐름
- "이 원본+숏폼으로 학습": 원본(자막 있음)+숏폼 파일→숏폼 STT→`alignShortToOriginal`→`buildStyleExample`→코퍼스 저장→토스트. 이후 `planAutoCuts`가 코퍼스 주입.
- 코퍼스 관리 UI(예시 목록·삭제). 자동 컷 카드에 "학습됨 N개" 표시.

## 5. 데이터 타입

```ts
// shorts-plan 모델 반환(검증 전 raw)
interface ModelShort { cueIds: string[]; hook: string; title: string; score: number; reason: string; }
// 스타일 예시(few-shot)
interface StyleExample { transcript: string; chosen: Array<{ cueIds: string[]; hook: string; title: string; durationSeconds: number }>; }
```

## 6. 성공 기준 (단위 검증 우선)

- `segmentsFromModelPlan`: 존재 cueId만 통과·시간 계산·클램프·워드스냅·score 정제·겹침/상한. 결정성.
- `alignShortToOriginal`: 정확 매칭·부분 매칭·저커버리지 거부·다중 구간·정규화(문장부호/공백).
- `buildStyleExample`/`distill`: 발췌·집계 정확.
- `validateAnalysisResponse` shorts-plan: cueId 필터·score 클램프·개수/길이 캡.
- 게이트 green. Host: shorts-plan 실 200으로 후보 생성(사용자 게이트), 샘플 학습 후 스타일 반영 확인.

## 7. 정직한 한계

- **파인튜닝 아님**: 예시 학습이라 스타일 모방이지 학습된 바이럴 모델이 아니다. 예시 50개+ 쌓이면 별도 오프라인 파인튜닝 검토(플러그인 밖).
- **정렬 전제**: 숏폼이 원본 오디오를 잘라 쓴 경우 잘 맞음. 재더빙·자막만은 매칭 약함.
- **토큰 비용**: few-shot 예시가 매 호출 토큰. 2~4개 큐레이트 또는 프로필 증류.
- **개인정보**: 샘플 전사가 예시로 OpenAI 전송(기존 AI 동의 범위). 코퍼스는 로컬 저장.

## 8. 단계·순서

| 단계 | 내용 | 검증 |
|---|---|---|
| P1-a | `shorts-plan` 스키마·프롬프트·디스패치(openai-text) + 유니온/결과 변형 | ✅ 완료 `cfa4596` |
| P1-b | `segmentsFromModelPlan` 순수 + `validateAnalysisResponse` 확장 | ✅ 유닛 11 `cfa4596` |
| P1-c | `planAutoCuts` shorts-plan 우선·폴백 배선 | ✅ `cfa4596` |
| P2-a | `alignShortToOriginal` 순수 | ✅ 유닛 6 `f99e5e4` |
| P2-b | `buildStyleExample`·`formatStyleExamplesForPrompt` 순수 + `style-corpus` 저장(정규화·상한) | ✅ 유닛 3+5 `968ea34`·본 커밋 |
| P2-c | "샘플로 학습" UI(원본 지정→숏폼 정렬→코퍼스) + `handleAutoCutScan`이 코퍼스를 few-shot 주입 | ✅ 배선·Tier1 Host 통과 |

각 단계 독립 게이트·커밋. **전 단계 완료.** 실제-AI 엔드투엔드만 자막 로드+유료라 사용자 게이트. `distillStyleProfile`(다수 예시 압축)은 verbatim 예시로 충분해 보류. **학습 흐름 v1**: 원본 자막 로드→"원본으로 지정"→그 원본으로 만든 숏폼 자막 로드→"숏폼으로 학습"→`alignShortToOriginal`→`buildStyleExample`→코퍼스. 두 전사를 순차로 편집기에 올리는 방식이라 별도 STT 플럼빙 불요(기존 STT/SRT 로드 재사용). 단일 파일-쌍 UX는 후속 개선 여지.
