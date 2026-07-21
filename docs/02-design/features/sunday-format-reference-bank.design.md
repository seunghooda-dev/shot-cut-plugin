# 일요일 포맷 참조 뱅크 확장 (sunday-format-reference-bank) Design Document

> **Plan**: docs/01-plan/features/sunday-format-reference-bank.plan.md · **Date**: 2026-07-21
> **승인**: 사용자 /goal — design→구현→테스트→학습 무승인 연속 진행

## 1. 데이터 흐름

```
training-data 캐시+검증 라벨 (6/21·7/18·7/19)
  → [Host] 아이템 시작 프레임 몽타주 → 앵커 리드 시각만 육안 선별   ← 신형·레터박스는 footage 시작 단신이 섞여 있어 필수
  → extract-refs.mjs: 선별 시각의 144셀 그리드 추출
  → src/news-anchor-reference-grids.ts 에 뱅크 상수 2개 추가
       NEWS_ANCHOR_REFERENCE_GRIDS_LETTERBOX (6/21)
       NEWS_ANCHOR_REFERENCE_GRIDS_SUNDAY_NEW (7/18·7/19)
```

## 2. 코드 변경

| 파일 | 변경(구현 확정 — 측정으로 2회 피벗) |
|---|---|
| `src/news-anchor-reference-grids.ts` | `NEWS_ANCHOR_REFERENCE_GRIDS_SUNDAY_NEW` 18장 추가(기존 13장 불변). **레터박스 뱅크는 기각** — 검은 띠가 저분산 셀이 되어 가중치가 커지고 footage까지 매칭(6/21 F1 17·7/12 31로 목표 ≥60 미달, 전체도 87.7로 하락). extract-refs.mjs로 재추출 가능 |
| `src/news-visual-cut.ts` | ~~min 합성~~(전 회차 FP 노출로 88.0→81.6 기각) → ~~전역 min 라우팅~~(평일 근소차 오라우팅 0224 100→58.8 기각) → **`selectAnchorMatcher`: 특수 뱅크가 압도적으로 가까울 때만 채택(dist<0.05 그리고 평일의 절반 미만)** — 실측상 진짜 포맷 0.001~0.025 vs 오라우팅 0.07~0.09로 완벽 분리 |
| `index.ts:2210` | `buildAnchorMatcher(GRIDS)` → `selectAnchorMatcher(samples, [평일, 신형])` |
| `scripts/news-train/lib.mjs` | `loadMatcherBanks()` + `routeMatcher()` — 학습·추론 동일 라우팅(§71-e 정합) |
| `tests/news-visual-cut.test.ts` | selectAnchorMatcher 유닛 4종(단일 동치·포맷 라우팅·근소차 기각·빈 배열 throw) |
| `scripts/news-train/extract-refs.mjs` | 캐시에서 시각 목록의 그리드를 TS 리터럴로 출력(재추출 대비 저장소 보존) |

## 3. 검증 순서 (plan §4 그대로)

1. 유닛: `npm run check` 1816+3 그린.
2. 매처만(모델 불변) 46회차 offline eval — 일요일(6/21·7/12·7/19) 개선, 평일·전체 F1 88.0 무회귀 확인. 회귀 시 뱅크 구성 재검토(템플릿 수 축소 등).
3. `train.mjs` 게이트 재학습 — 홀드아웃(0709·0711·0712레터박스·0628신형) F1로 현행을 이기면 반영.
4. 실기: 미사용 일요일 회차 다운로드→원클릭 버튼 E2E→시작 프레임 몽타주 전수 판독(§72-e 방식).
5. 런북 §73 기록 → 커밋·푸시(newplugin) → 프로젝트 저장.

## 4. 결정 근거

- **min 합성 vs 뱅크 병합**: 병합 시 `1/(std+8)` 셀 가중치가 이질 세트로 전역 변형 → 평일 회귀 위험. min 합성은 평일 경로 바이트 불변(plan §2).
- **7/12·6/28 학습 제외**: 같은 포맷의 미학습 회차 전이를 홀드아웃으로 실측 — "뱅크가 그 회차를 외웠다"가 아니라 "포맷을 커버한다"를 증명.
- **레터박스 크롭 그리드는 후속**: 포맷별 가중치로 검은 띠 셀이 저분산→저가중이 되므로 1차는 크롭 없이 간다(plan 리스크 표).
