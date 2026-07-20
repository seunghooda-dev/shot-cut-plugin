# 원클릭 분할 무료화(STT 제거) Design

## 파이프라인(버튼 1회)
1. **화면 스캔(무료)** — 활성 시퀀스를 2s 간격 96×54 BMP로 내보내 `lumaGrid`(16×9=144셀) 샘플 수집.
2. **후보 도출(무료)** — 참조 그리드 은행(번들, KBC 8뉴스 평일 앵커 13장) 분산 가중 거리로
   ①긴 샷(≥8s) 거리<0.16 ②저거리 런(<0.145, 2~40s) 시작점을 후보로. 3개 미만이면 긴 샷 전부로 확대.
3. **앵커 판정(비전, 실패 시 강등)** — 후보 시각+1s 프레임(272px PNG)을 `classifyAnchorShots`
   (학습 코퍼스 예시 포함) 12장 배치로 분류, confidence≥0.6 채택. API 실패 시:
   자동 임계(최대 간극 중점≤0.2) 긴 샷만 채택 + "비전 생략" 경고.
4. **아이템 구성(무료)** — 채택 시작점 오름차순 → [sᵢ, sᵢ₊₁), 마지막 끝 = **정적 꼬리 시작**
   (연속 frameDifference<0.02 접미 런 ≥12s = 구독 범퍼, 오프라인 16/16 검증) 또는 시퀀스 끝.
   `mergeShortItemsForward`로 15s 미만 병합, 최대 40개.
5. **경계 정밀 재스냅(무료)** — 각 경계 [T-3.5,T+0.5] 0.25s 스캔, 정착(T+0.5) 대비 역방향
   최초 동일(<0.07) 시점 = 전환 컷. 창 전체 동일 시 12s 블록×3 역방향 확장(§59·§61 도구 포트).
6. **생성** — 기존 `createNewsItemSequences`(YYYYMMDD_news_NN) 재사용.
7. **내보내기** — 내보내기 탭 토큰 있으면 그대로, 없으면 기본값:
   프리셋 `C:\Program Files\Adobe\Adobe Premiere Pro 2026\MediaIO\systempresets\4E49434B_48323634\YouTube 1080p HD.epr`,
   폴더 `C:\Users\seung\Videos\premiere_내보내기`. AME 유무에 따라 대기열/직접 렌더(기존 분기).

## 모듈·경계
- `src/news-anchor-reference-grids.ts` — 참조 그리드 상수(§58 스캔 캐시에서 생성, 정수 반올림).
- `src/news-visual-cut.ts` — 순수 로직(매처·후보·정적 꼬리·아이템 구성·재스냅). 프레임 샘플러는
  `(time)=>Promise<Float64Array|null>` 주입 — 테스트는 합성 샘플러로.
- `index.ts` — 오케스트레이션(스캔 루프·비전 호출·기본값 해석)만. 컨트롤러 불변식 유지:
  비전 결과는 unknown으로 받아 confidence·index 재검증(기존 classifyAnchorShots 반환 검증 재사용).
- manifest는 `localFileSystem: "request"` 유지(verify:dist 보안 불변식). 기본 출력 폴더는
  런타임 `getEntryWithUrl` 시도 — 성공하면 실제 엔트리로 크기 안정화 폴링, 실패하면 경로 셸로
  넘기고 exportSequence promise 해소가 완료 판정을 맡는다(§40 경합 유지).

## 실험 근거(2026-07-20 오프라인, 16회차)
- 자동 임계 단독: 주 앵커 오탐 39·미검출 19 → 완전 자동 부적합 → 비전 판정 필요.
- 왼쪽 절반 템플릿·동일샷 거리: 참/오탐 분포 중첩(참 max 0.196 vs 오탐 min 0.004) → 기각.
- 정적 꼬리(<0.02, ≥12s): 16/16 정답 일치(일요일 무범퍼 포함) → 채택.
