# 멀티소스 리프레임 (multi-source-reframe) Planning Document

> **Feature**: D-1 (장기 보류 → 계획 수립) · **Project**: shortflow-studio · **Date**: 2026-07-14
> **상태**: 계획만 수립 — 사용자 승인 후 착수

## 1. 범위

자동 컷 → 9:16 숏폼 생성이 현재는 활성 시퀀스가 **단일 소스 미디어**로 구성된 경우만 정확하다. 인터뷰+B롤처럼 **여러 클립이 섞인 타임라인**에서도 세그먼트별로 올바른 원본 미디어와 소스 구간을 찾아 숏폼을 만들도록 확장한다.

핵심 관찰 — 비전 샘플링(`detectSegmentShotSpans`)은 이미 **타임라인 프레임 기준**이라 소스 개수와 무관하게 동작한다. 문제는 생성 단계뿐이다. 세그먼트 시각 → 어느 트랙 아이템인가 → 그 클립의 projectItem·소스 in/out으로의 사상(mapping)이 없다.

## 2. 아키텍처 — 순수 사상 계층 + Host 리졸버 (기존 패턴)

- **순수 코어**(완전 단위 테스트):
  - `resolveSegmentSources(segments, trackItems) → PerSourceSegment[]` — 타임라인 구간을 트랙 아이템 목록(start/end/inPoint/mediaPath)에 투영해, 세그먼트별 `{ mediaPath, sourceStart, sourceEnd }`를 계산. 클립 경계에 걸친 세그먼트는 경계에서 분할.
  - 속도 100% 가정(v1). 배속·리맵 클립은 검출 시 해당 세그먼트를 스킵하고 사유를 보고.
- **Host 어댑터**(`src/premiere.ts`):
  - `listVideoTrackItems(sequence, trackIndex) → { start, end, inPoint, mediaPath, projectItem }[]` — V1 트랙 아이템 열거(기존 트랙 순회 코드 재사용).
  - 생성기(`createShortsFromSegments`)가 세그먼트별 projectItem을 받아 삽입하도록 시그니처 확장 — 삽입 자체는 §38에서 확정한 트림 삽입(`createSetInOutPointsAction` + 원본 ProjectItem) 재사용.

## 3. 단계

| 단계 | 내용 | 규모 | 예상 |
|---|---|---|---|
| 1 | 순수 코어 `resolveSegmentSources` + 단위 테스트(경계 분할·gap·다중 클립·스킵 사유) | 중 | 1h |
| 2 | premiere.ts `listVideoTrackItems` + 생성기 세그먼트별 projectItem 삽입 확장 | 중 | 1~1.5h |
| 3 | index.ts 파이프라인 연결(단일 소스일 때는 기존 경로 그대로 — 회귀 0) | 소 | 0.5h |
| 4 | Host E2E — 프로젝트에 2클립 합성 시퀀스 구성(기존 newswide 세그먼트 2개로 충분) → 자동 컷 → 각 숏폼이 올바른 소스·구간인지 프레임 검증 | 중 | 1~2h |

**총 예상 3.5~5시간** (Host 검증 포함, 단일 세션 워처 사용).

## 4. 검증

- 유닛 — 클립 2개 타임라인에서 세그먼트가 (a) 클립 내부, (b) 경계 걸침(분할), (c) gap 위(스킵) 각각 올바른 사상.
- Host — 2클립 시퀀스에서 생성된 숏폼의 첫/끝 프레임을 exportFrame으로 뽑아 원본 해당 시각 프레임과 시각적 일치 확인.
- 회귀 — 단일 소스 시퀀스에서 기존 결과와 동일(기존 E2E 시퀀스 재생성 비교).

## 5. 리스크

| 리스크 | 완화 |
|---|---|
| 배속·타임리맵 클립 | v1 스킵+사유 보고(불가능 시나리오 에러 처리 아님 — 실제 존재) |
| 중첩 시퀀스(시퀀스 안 시퀀스) | v1 미지원 명시, 감지 시 스킵 |
| 오디오 트랙 소스가 비디오와 다른 경우 | v1은 비디오 기준 삽입(A/V 링크 유지), 어긋나면 보고만 |
