# 비전 비용 최적화 (vision-cost-optimization) — Plan

- 작성: 2026-07-15 (야간 자율 배치, /goal 3번)
- 상태: **완료** — 런북 §44. 프리필터·캐시 구현, 임계값 0.02를 실프레임 조사로 확정
  (정적 0.0005~0.0049 vs 샷 전환 0.14~0.24), 게이트 1749/1749. 성공 기준 전부 충족.

## 배경

샷 추적은 세그먼트당 1차 최대 14프레임 + 경계 버스트 최대 36프레임을 비전 API로 보낸다.
인터뷰류(정적 샷 위주) 소스에서는 인접 샘플이 거의 같은 그림이라 토큰 낭비가 크고,
같은 구간을 재생성할 때마다 감지를 처음부터 다시 한다.

## 제약(실기 확정)

- UXP 웹뷰에 Canvas 없음(§14 썸네일 블로커)·`DecompressionStream` 없음(실측) → PNG/JPEG 픽셀 디코드 불가.
- 대신 `Exporter.exportSequenceFrame`이 **BMP(24-bit 무압축)** 를 지원(실측: 64×36 = 6,966B, 'BM' 매직).

## 설계

1. **프레임 diff 프리필터** — 샘플 시각마다 초소형 BMP(64px)를 먼저 내보내 휘도 그리드(16×9)를
   만들고, 직전 채택 프레임과의 평균 절대차가 임계값 미만이면 비전 전송을 건너뛴다(스킵 시각은
   직전 채택 샘플의 감지값을 복제해 스팬 계획에 연속성 유지). BMP 해석 실패 시 필터 없이 전량 전송(안전 폴백).
   - 순수 계층 `src/frame-diff.ts`: parseBmp24 → lumaGrid → frameDifference → planFrameSampling.
2. **감지 결과 캐시** — 같은 (컨텍스트, 구간)의 샷 스팬을 localStorage에 TTL 6h·최대 24건으로
   보관, 재생성 시 비전 0회. `src/vision-cache.ts` (스토리지 주입, shot-plan-store 패턴).
3. index.ts `detectSegmentShotSpans` 통합: 캐시 조회 → BMP 프리필터 → 채택 프레임만 PNG 내보내
   기존 배치 감지 → 캐시 저장. `exportFrameToFolder`에 format("png"|"bmp") 인자 추가.

## 성공 기준

- 유닛: BMP 파서(정상·손상·비24bit), 그리드 diff 수학, 샘플링 계획(A,A,B,A 패턴), 캐시 TTL/상한/왕복.
- 실기: newswide 실제 프레임으로 같은 샷 diff ≪ 컷 경계 diff 분리 확인(비전 호출 없는 물리 검증).
- 게이트 초록 유지. 트레이드오프(정적 샷 아닌 소스는 BMP 이중 내보내기 오버헤드) 문서화.

## 예상 소요

2~3h.
