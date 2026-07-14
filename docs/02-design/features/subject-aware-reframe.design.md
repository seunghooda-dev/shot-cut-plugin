# 인물 인식 자동 리프레임 (subject-aware-reframe) Design

> **Summary**: 자동 컷 생성 시 컷(세그먼트)마다 프레임을 샘플링해 AI 비전으로 인물 위치를 감지하고, 그 지점을 해당 세그먼트의 초점(focal)으로 자동 적용한다. "인물이 화면 중앙에 안 들어온다"(사용자 실검증 피드백)의 근본 수정.
>
> **Project**: shortflow-studio · **Date**: 2026-07-14 · **Status**: 구현

## 1. 문제 (실측)

newswide 실검증에서 숏폼 크롭이 인물을 놓쳤다. 프레임 추출로 확인한 원인 2가지.
1. 초점이 **사람의 추측**(정적 슬라이더, focalX=30% 가정)이라 실제 인물 위치(원본 x≈0.5)와 어긋남.
2. **멀티캠 인터뷰**라 컷마다 인물 위치가 다른데(후보 샷 중앙 vs 앵커 샷 우측) 전체에 초점 하나만 적용.

## 2. 해법 — 컷별 인물 감지 초점

자동 컷 생성 직전, 세그먼트마다:
1. **프레임 샘플 3장**(시작+0.7s·중앙·끝−0.7s)을 `ppro.Exporter.exportSequenceFrame`으로 데이터 폴더에 640px 폭 PNG로 내보냄(§23 검증된 API, 커버 내보내기와 동일).
2. 각 PNG를 **OpenAI 비전**(`gpt-5.4-mini`, 기존 Responses 플럼빙)에 보내 "가장 주된 인물 얼굴 중심의 정규화 x·y(0..1)와 confidence"를 strict JSON 스키마로 받음.
3. 순수 함수 `resolveSubjectFocal(points)`가 3점을 종합 — **일치**(x 편차 ≤0.2)하면 평균, **불일치**(카메라 교차)하면 x=0.5 절충(어느 샷에도 최악을 피함), 저신뢰(<0.3) 점 제외, 전부 무효면 null.
4. null이면 기존 슬라이더 초점 폴백. 감지 성공 시 세그먼트별 `focalX/Y`가 `createShortsFromMarkers`에 전달돼 **컷마다 다른 초점**으로 리프레임.

## 3. 계층·신뢰 경계

- **premiere.ts**: `exportFrameToFolder(seconds, folderPath, maxWidth)` — ppro만. 활성 시퀀스 프레임을 축소 PNG로.
- **openai-text.ts**: `detectSubjectPoint({bytes,mimeType})` — 기존 `requestJson` 재사용(userContent를 문자열|파츠배열로 확장, input_image data URL). 응답은 클램프(0..1)·유한성 검증. 이미지도 untrusted data 취급 프롬프트 불변 유지. 요청 바이트 상한은 기존 2MB 캡(640px PNG ≈ 수백 KB).
- **순수** `src/subject-focus.ts`: `resolveSubjectFocal` — 완전 유닛 테스트.
- **index.ts(합성 루트)**: 세그먼트 샘플 시각 계산→프레임 내보내기→바이트 읽기→비전→순수 종합→세그먼트에 부착. 소비자(`createShortsFromMarkers`)는 세그먼트별 focal을 옵션 스프레드로만 사용.
- 실패는 세그먼트 단위로 격리(한 컷 감지 실패가 전체 생성을 막지 않음, 폴백=슬라이더).

## 4. 비용·성능

세그먼트당 비전 3회(640px, ~수천 토큰) — 후보 5개 기준 15회 ≈ 수 센트. 프레임 내보내기는 즉시. AI 동의 게이트(`ensureAiConsent`)를 생성 단계에도 적용.

## 5. 성공 기준

- 유닛: resolveSubjectFocal(일치 평균·불일치 0.5 절충·저신뢰 제외·무효 null·클램프·결정성), detectSubjectPoint(payload 형태·클램프·malformed 거부).
- Host: newswide 세그먼트 재생성 → 새 숏폼 프레임 추출 → **인물이 중앙에 오는지 이미지로 직접 확인**(전후 비교).

## 6. 한계·후속

- 세그먼트 내 카메라 교차는 x=0.5 절충(v1) — 진짜 샷 단위 추적(샷 경계 감지+위치 키프레임)은 후속.
- y는 16:9→9:16에서 수직 오버플로가 없어 사실상 미사용(수평만 효과). 세로→가로 변환에선 y도 유효.
