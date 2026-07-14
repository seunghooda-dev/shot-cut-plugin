# AI 하이라이트 → 자동 컷 파이프라인 (highlight-auto-cut) Design

> **Summary**: 자막 타임코드 + AI 분석(`interview-highlight`·`edit-outline`)을 숏폼 컷 구간 후보로 변환하는 순수 판단 로직. 사람이 In/Out을 찍지 않아도 "긴 인터뷰 → 랭킹된 숏폼 후보 여러 개"를 자동 판단한다.
>
> **Project**: shortflow-studio · **Date**: 2026-07-14 · **Status**: 구현 완료·게이트 1616/1616·Tier1 Host 통과 (실제-AI 엔드투엔드는 사용자 게이트, runbook §29)

## 1. 배경·범위

현재 컷 구간 근거는 전부 사람 신호(In/Out·선택·재생헤드·마커)다. AI 분석은 하이라이트를 **제안만** 하고 `onSeek`(재생헤드 점프)로만 타임라인에 연결된다 — 하이라이트→구간→생성의 자동 경로가 없다(런북 §28 답변, `docs/03-analysis` 참조). 이 기능은 그 한 가닥을 잇는다. 상용 롱폼→숏폼 도구(Opus Clip류)의 핵심인 "자동 판단"에 해당.

**재료는 이미 있다**: `analyzeSubtitles`가 `interview-highlight`(중요 cueId+이유)·`edit-outline`(cueId 그룹+라벨)을 반환하고, 각 cue에 정확한 start/end(초)가 있으며, `createShortsFromMarkers(MarkerSegment[], baseOptions, onProgress)`가 구간 배열을 일괄 생성한다. 빠진 건 **판단 로직**뿐.

## 2. 아키텍처 (3계층·신뢰 경계 준수)

- **순수 로직** `src/highlight-cut.ts` `planHighlightCuts(...)` — I/O·host·network 없음. 여기에 모든 추론이 산다. 완전 유닛 테스트.
- **오케스트레이션** index.ts(합성 루트) — subtitleController에서 document·analysis를 얻고, 필요 시 `analysisProvider` 포트로 하이라이트/아웃라인 분석 실행, `planHighlightCuts` 호출, 결과를 `MarkerSegment[]`로 매핑해 기존 `createShortsFromMarkers`에 넘김. 컨트롤러는 순수 함수(planHighlightCuts)만 임포트(어댑터 아님) 가능.
- **Host** 변경 없음 — `createShortsFromMarkers`·`createShortFromSource`(복제→프레임→초점 리프레임) 그대로 재사용.

## 3. 순수 함수 계약

```ts
export interface HighlightCutOptions {
  minDuration: number;   // 최소 길이(초) 기본 12
  idealDuration: number; // 목표 길이(초) 기본 30
  maxDuration: number;   // 최대 길이(초) 기본 60 (설정의 maxDuration을 캡으로)
  maxSegments: number;   // 최대 후보 수 기본 8 (Host 일괄 상한 30 이하)
  hookWindow: number;    // 시작 직후 훅 판정(초) 기본 3
  mergeGap: number;      // 이 간격(초) 이내 하이라이트는 한 세그먼트 기본 8
}
export interface HighlightCutSegment {
  start: number; end: number; duration: number;
  cueIds: string[]; title: string; reason: string;
  score: number;          // 0~1 랭킹
  highlightCount: number;
}
export function planHighlightCuts(
  document: SubtitleDocument,
  highlights: SubtitleHighlight[],
  outline: EditOutlineSegment[] | null,
  options?: Partial<HighlightCutOptions>,
): HighlightCutSegment[];
```

## 4. 알고리즘 (결정적·순수)

1. **타임라인**: `enabled && !hidden` cue만, start 오름차순. cue별 메타 — `sentenceEnd`(텍스트가 `. ? ! … 。 » " '` 등으로 끝), `sentenceStart`(직전이 sentenceEnd이거나 첫 cue). cueId→cue+index 맵.
2. **하이라이트 표시**: highlights의 cueId 중 타임라인에 존재하는 것만(dedup), cueId→reason. 하이라이트 0개면 `[]` 반환.
3. **클러스터**: 하이라이트 cue를 start순으로 훑어, `다음.start − 현재클러스터.end ≤ mergeGap` 이고 합쳐도 `≤ maxDuration`이면 같은 클러스터, 아니면 새로. 각 클러스터 = 인접 하이라이트 묶음.
4. **확장·스냅**(클러스터→세그먼트): core=[첫 HL.start, 끝 HL.end]. `duration<idealDuration`이면 인접 cue를 앞뒤로 번갈아 붙여 idealDuration 도달까지 확장하되 (a) 큰 시간 공백(>mergeGap×1.5, 장면 전환)·(b) maxDuration·(c) 문장 경계 우선. `duration>maxDuration`이면 end=start+maxDuration 클램프(분할은 후속). start=선택 시작 cue.start, end=선택 끝 cue.end로 스냅.
5. **아웃라인 정렬**: outline 있으면 cueIds 겹침 최대인 outline 세그먼트의 label을 title로, `outlineAligned=true` 가점. 없으면 title=첫 하이라이트 reason 또는 선두 cue 텍스트 60자.
6. **점수**(0~1 가중합): density=min(1, highlightCount/max(1, duration/mergeGap)) · hook=시작 hookWindow 내 하이라이트면 1 else 0.3 · completeness=(sentenceStart?0.5:0)+(sentenceEnd?0.5:0) · durationFit=1−min(1,|duration−ideal|/ideal) · outline=aligned?1:0. 가중치 density .35 / hook .2 / completeness .2 / durationFit .15 / outline .1.
7. **겹침 제거**: score 내림차순, 이미 채택된 구간과 시간 겹치면 버림(그리디). 근접 중복 클러스터 dedupe.
8. **상한**: 상위 maxSegments, score 내림차순 반환. end≤start·duration<1s는 필터.

## 5. UI·플로우 (사람 최종 확인 유지 — 프로젝트의 수동 A/B 철학)

숏폼 탭 "AI 하이라이트로 자동 컷":
1. 자막 없으면 안내. 있으면 `interview-highlight`(+`edit-outline`) 분석 실행(진행 토스트).
2. `planHighlightCuts` → 후보 리스트 렌더(순번·시각 mm:ss–mm:ss·길이·제목·점수·근거). 상위 N 기본 체크.
3. "선택 구간 생성" → 체크된 세그먼트를 `MarkerSegment[]`로 매핑 → `createShortsFromMarkers`(기존 진행률·부분실패 처리 재사용). 자동 "판정"이 아니라 **랭킹 제안 + 사람 확정**.

## 6. 성공 기준

- `planHighlightCuts` 유닛: 빈 하이라이트→[], 근접 하이라이트 병합, 짧은 클러스터 ideal까지 확장, 긴 클러스터 max 클램프, 문장 경계 스냅, 아웃라인 제목·가점, 겹침 제거, 상한, 점수 순서, 결정성(같은 입력 같은 출력). 
- 게이트 `npm run check` green.
- Host: 자막 있는 시퀀스에서 자동 컷 실행 → 랭킹 후보 생성 → 선택 일괄 생성으로 여러 숏폼 시퀀스 생성(초점 리프레임 포함) 확인.

## 7. 비목표(후속)

발화 밀도/무음(오디오) 기반 훅 정교화, 학습된 "바이럴 점수" 모델. v1은 하이라이트·아웃라인·타임코드·오프닝 텍스트만으로 판단.

**텍스트 훅 점수(2026-07-14 완료)**: `hookTextStrength`가 세그먼트 오프닝 텍스트의 훅 강도(질문 `?`·호기심 단어·숫자, 0~1)를 매겨 점수에 가산 보너스(최대 +0.1)로 얹는다. 동점·근소 차의 순위를 훅 강한 쪽으로 기울인다. 기존 점수는 불변(가산이라 회귀 없음). 유닛 1개.

**완료된 후속(2026-07-14)**: 긴 하이라이트 런의 **문장 경계 분할**(근접도 클러스터 → `splitWindows`로 maxDuration 이내 윈도우) + 단일 초장 cue의 **워드 단위 스냅**(`wordSnapEnd`, `words[].e` 경계) + 분할 컷 지점을 **아웃라인(주제) 경계 > 문장 끝 > 하드컷** 순으로 선택(각 숏폼이 한 주제로 응집). 유닛 3개 추가(게이트 1619/1619).
