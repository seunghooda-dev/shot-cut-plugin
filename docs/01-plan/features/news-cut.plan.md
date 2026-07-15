# News Cut — 뉴스 보도 아이템 자동 분할 (news-cut) — Plan

- 작성: 2026-07-15 (사용자 지시 — "news cut 기능, 아이템별 분할, 파일명 오늘일자_news_NN, 바로 진행")
- 상태: 진행

## 목표

뉴스 전체 방송(예: KBC 8뉴스 다시보기, 16분)을 보도 아이템 단위로 잘라 아이템별 시퀀스를 만들고,
`YYYYMMDD_news_NN` 파일명으로 Media Encoder에 일괄 내보내기까지 연결한다.

## 설계 (기존 검증 블록 조립)

1. **경계 감지 = STT + 텍스트 AI** — 자막 문서에서 앵커 리드/클로징 패턴으로 아이템 경계를 찾는
   읽기 전용 분석 액션 `news-items` 신설(기존 interview-highlight/edit-outline과 같은 계열).
   응답은 `{ items: [{ startCueId, endCueId, title }] }` — cueId 참조만 허용(하우스 불변식),
   존재하지 않는 cueId는 드롭. 비전 불사용(비용 0에 가깝게).
2. **순수 계층 `src/news-cut.ts`** — 응답 정규화(`normalizeNewsItems`): cueId→시각 해석, 최소 길이,
   정렬·겹침 해소(다음 시작 = 이전 끝 스냅), 제목 정리. `newsItemName(date, index)` = `YYYYMMDD_news_NN`.
3. **시퀀스 생성** — 숏폼 생성이 검증한 클론+범위 경로 재사용, 단 리프레임 없이 원본 규격 유지.
4. **일괄 내보내기** — 아이템 시퀀스들을 내보내기 탭의 프리셋·폴더 설정으로 AME 큐에 추가
   (파일명 = 시퀀스명). 즉시 모드도 지원(직렬).
5. **UI** — 자동 편집(04) 탭에 News Cut 카드: [보도 아이템 분석] → 목록(체크박스·제목·구간) →
   [아이템 시퀀스 생성] · [Media Encoder 일괄 내보내기].

## 성공 기준

- 유닛: normalizeNewsItems(정렬·겹침·최소길이·cueId 드롭), newsItemName, 분석 응답 검증.
- 실기 E2E(다운로드한 KBC 8뉴스 실소재): import → 시퀀스 → STT(분할 전사) → 아이템 분석 →
  시퀀스 N개(`YYYYMMDD_news_NN`) 생성 → 1개 즉시 렌더로 실파일 확인. 게이트 초록.

## 비범위(v2)

- 비전 기반 앵커 샷 감지, 아이템별 썸네일/메타 자동 생성, 자동 업로드.
