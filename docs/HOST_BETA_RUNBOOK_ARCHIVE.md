# Host Smoke Runbook 아카이브 (2026-07-16 시점 스냅숏)

> 현행 `HOST_BETA_RUNBOOK.md`는 §133 이후의 뉴스 분할 연구 로그만 유지하는 롤링 문서다.
> 그 이전 내용 — 설치 후 필수 Smoke 절차(0~7절)와 §29~§54 시대의 검증 기록 — 은 이
> 파일에 보존한다(git e7728a1에서 복원). §55~§132는 `git log -- docs/HOST_BETA_RUNBOOK.md`
> 역사에 있다. 설치 직후 실기 확인의 **현행 절차**는 `BETA_RELEASE_CHECKLIST.md` 2절과
> `npm run host:smoke:full`(11개 체크)이다 — 이 아카이브의 수동 절차는 참고용이다.

# ShortFlow Studio Premiere 실제 Host Smoke Runbook

기준일: 2026-07-11  
실행 시점: Premiere Pro와 UXP Developer Tool 설치 후

Mock Host와 자동 테스트는 실제 Premiere 프로젝트 mutation, UXP 권한, 트랙 상태와 파일 경로 동작을 보증하지 않습니다. 이 문서는 설치 후 실제 Host 근거를 남기는 별도 게이트입니다.

## 0. Smoke 시작 전 공통 준비물

실제 Host smoke는 항상 최신 로컬 후보와 테스트 전용 프로젝트에서만 실행합니다.

1. 로컬 후보 검증
   - `npm run check`가 통과한 작업트리에서 시작합니다.
   - Host smoke 직전 `npm run build`로 `dist/`를 최신화합니다.
   - UXP Developer Tool에서 이 저장소의 `plugin/dist/manifest.json`을 대상으로 `Reload` 또는 `Load` 성공 toast를 확인합니다.
   - 기존 설치/캐시 패널과 최신 `dist` 패널이 다를 수 있으므로, smoke 시작 시점의 패널이 최신 `dist`인지 먼저 기록합니다.
2. 테스트 프로젝트
   - 원본 프로젝트가 아닌 테스트 전용 Premiere 프로젝트를 사용합니다.
   - 1080×1920, 30fps, 5초 이상 테스트 시퀀스를 준비합니다.
   - V1/A1에 짧은 테스트 MP4를 삽입하고, 잠금 없는 추가 비디오·오디오 트랙을 확보합니다.
3. 테스트 fixture
   - `host-smoke-assets/shortflow_host_smoke_9x16.mp4`
   - `host-smoke-assets/shortflow_host_smoke.srt`
   - `host-smoke-assets/Music/test-music.mp3`
   - `host-smoke-assets/SFX/test-click.wav`
   - API key 없이 검증할 때는 사전 생성된 WAV/MP3로 import·insert 경로만 확인합니다.
4. 기록 방식
   - 각 항목은 사용자 클릭 경로, 기대 화면, 실제 화면, 로그 문구, 필요한 수정 파일을 기록합니다.
   - API key가 필요한 live TTS/STT smoke와 로컬 파일 import·insert smoke를 분리합니다.
   - 실패가 재현되면 같은 mutation을 반복 적용하지 말고 프로젝트 사본 또는 복제 시퀀스에서 재시도합니다.

## 1. 사전 조건

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`가 성공한 로컬 후보를 사용합니다.
- UXP Developer Tool에는 `dist/manifest.json`을 등록합니다.
- 테스트 전용 Premiere 프로젝트와 복사 가능한 테스트 미디어를 사용합니다.
- 원본 프로젝트가 아닌 복제본에서 시작합니다.
- Host 변경 전 dry-run 또는 preview를 먼저 확인합니다.
- 실패 시 오류 문구, 진단 로그, 프로젝트/시퀀스 상태를 기록하고 같은 작업을 반복 적용하지 않습니다.

## 2. 환경 기록

- Windows/macOS 버전과 CPU 아키텍처
- Premiere Pro 버전
- UXP Developer Tool 버전
- 테스트 소스 식별자 또는 commit SHA
- 테스트 프로젝트·시퀀스·미디어 세트
- 실행 담당자와 시각

## 3. 필수 Smoke Test

아래 순서와 번호를 유지합니다.

1. **UXP 패널 로드**
   - Add, Load, Reload, 패널 닫기/재열기를 확인합니다.
   - listener·timer 중복, 흰 화면, 콘솔 예외가 없어야 합니다.
2. **Mock Host와 실제 Host 전환**
   - production 진입점이 실제 adapter를 사용하고 테스트 adapter가 번들 실행 경로에 남지 않는지 확인합니다.
   - 전환 실패가 프로젝트 mutation으로 이어지지 않아야 합니다.
   - QC 실행 후 ShortFlow의 프로젝트명, 시퀀스명, 프레임 크기, 트랙 수가 Premiere 화면과 일치해야 합니다.
3. **현재 프로젝트·시퀀스 감지**
   - 프로젝트 없음, 시퀀스 없음, 활성 시퀀스 있음 상태를 구분합니다.
4. **플레이헤드 위치 읽기**
   - 시작, 중간, 끝 근처에서 Premiere 표시와 패널 값이 일치하는지 확인합니다.
5. **In/Out 범위 읽기**
   - 미설정, 정상 범위, 잘못된/빈 범위를 안전하게 구분합니다.
6. **선택 클립 감지**
   - 비선택, 단일/복수 선택, 잠긴 트랙과 영상·오디오 선택을 확인합니다.
7. **SRT/캡션 삽입**
   - SRT 파일 가져오기와 실제 지원되는 캡션 삽입 경계를 구분해 기록합니다.
   - 지원하지 않는 공개 API 동작을 성공으로 표시하지 않습니다.
   - 통과 기준은 SRT 저장과 프로젝트 import 성공입니다. 캡션 트랙 자동 생성·타임라인 배치는 공개 API 미지원이면 제한사항으로 기록합니다.
8. **TTS 오디오 가져오기**
   - 선택 출력 폴더 저장, 충돌 없는 이름, 프로젝트 import와 지정 오디오 트랙 삽입을 확인합니다.
   - OpenAI live smoke는 별도 승인/API key가 있을 때만 실행합니다. 승인 없이 진행할 때는 로컬 WAV/MP3 fixture로 import·insert 경로만 확인합니다.
9. **음악·효과음 타임라인 삽입**
   - 기존 import 재사용, 재생헤드 위치, 대상 트랙, 잠금/충돌 실패를 확인합니다.
   - 자산 루트 선택, 동기화, 카테고리 필터, 미리듣기, 더블클릭 또는 버튼 삽입, 잠긴 트랙 실패 메시지를 각각 기록합니다.
   - 폴더 열기는 manifest의 Adobe 공식 폴더용 빈 확장자 `""`과 명시적 미디어 확장자만 사용하며 `*`·실행 파일 확장자는 허용하지 않습니다. 사용자 동의 후 `system-folder`가 반환되는지, 직접 실행을 사용할 수 없는 adapter에서는 선택 폴더를 시작 위치로 한 `media-picker`가 열리고 취소·선택 상태를 구분하는지 기록합니다.
10. **썸네일 내보내기 파일 경로**
    - Windows 한글·공백 경로, 확장자, 파일명 충돌과 PNG/JPG 출력을 확인합니다.
    - Canvas 제한 Host에서는 SVG fallback의 실제 파일 생성·내용을 확인하고, 최초 출력 폴더 선택 후 persistent token이 다음 저장과 패널 reload에서 재사용되는지 확인합니다. 토큰이 만료·이동된 경우 기존 토큰을 폐기하고 폴더 선택기를 다시 여는지도 별도로 확인합니다.
11. **자동 컷·펀치인 dry-run**
    - 적용 전 예상 컷/유지/펀치인 범위와 marker 수를 검토합니다.
    - 원본 시퀀스는 보존하고 복제 시퀀스에서만 적용합니다.
    - 권장 순서는 SRT fixture 로드, dry-run 분석, 추천 마커 추가, 복제 시퀀스 적용, 원본 보존 확인, 복제 시퀀스의 마커·키프레임 확인입니다.
12. **실패 복구·진단 로그**
    - Host API 실패, 권한 거부, 잘못된 트랙과 부분 실패를 재현합니다.
    - 복구 상태와 사용자 실행 진단 로그에 API key, token, Authorization과 불필요한 전체 로컬 경로가 없어야 합니다.
    - `복제본 제거`는 확인 함수 부재·거절·예외·비 boolean 응답에서 rollback과 삭제를 실행하지 않아야 합니다. 명시적 boolean `true` 이후에만 검증된 복제 시퀀스 제거가 한 번 실행되는지 기록합니다.

## 4. 실제 삽입 공통 확인

- 현재 프로젝트·시퀀스가 작업 시작 시점과 동일한지 다시 확인합니다.
- 트랙 인덱스는 유효 범위이며 잠긴 트랙을 변경하지 않습니다.
- 동일 파일은 경로 기반으로 식별하고 불필요하게 중복 import하지 않습니다.
- 적용 실패 시 원본 시퀀스와 기존 클립·키프레임이 보존됩니다.
- Mock에서 통과했지만 Host에서 실패한 경우, 실제 API 결과를 근거로 최소 수정하고 Mock 회귀 테스트를 추가합니다.

Safe Zone BMP overlay는 실제 Host에서 통과했습니다.

- `자동 점프컷·펀치인·Safe Zone` 탭에서 Premiere 가이드 오버레이 생성을 실행합니다.
- 프로젝트/bin 또는 타임라인에 `__SHORTFLOW_SAFE_GUIDE_DO_NOT_EXPORT__` 접두 파일/클립이 생기는지 확인했습니다.
- `videoTrackIndex: status.videoTrackCount`가 실제 Host에서 가이드 에셋 import와 프로그램 모니터 표시까지 동작하는지 확인했습니다.
- export 전 삭제 경고가 표시되고, 최종 산출 전 사용자가 가이드 클립을 삭제했는지 확인합니다.

## 5. 즉시 차단 조건

- 원본 시퀀스 또는 사용자 기존 클립이 예고 없이 변경됨
- 패널 load/reload가 Premiere crash 또는 반복 listener를 유발함
- 잠긴 트랙이나 선택하지 않은 시퀀스를 변경함
- 실패 후 복제 시퀀스·임시 파일·복구 저널 상태가 불명확하게 남음
- API key, persistent token 또는 Authorization이 로그·리포트에 노출됨
- 지원하지 않는 공개 UXP 기능을 성공으로 표시함

## 6. 결과 기록

각 번호마다 `통과 / 실패 / 보류`, Premiere 버전, 재현 절차, 기대값, 실제값, 로그 식별자와 필요한 수정 파일을 기록합니다. 12개 항목이 모두 통과하거나 승인된 제한사항으로 문서화되기 전에는 실제 Premiere 내부 베타 통과로 판정하지 않습니다.

## 7. 실제 Smoke 기록 — 2026-07-12 02:51 KST

환경:

- Premiere Pro: 2026, UXP Developer Tools 연결 대상 `premierepro v26.3.0`
- 플러그인 ID: `com.seunghooda.shortflow.studio.direct`
- 로컬 후보: 당시 `npm run check` 통과 상태, 945/945 tests. 이후 13번 기록에서 974/974 후보로 갱신됐고, 현재 최신 요약은 아래 진행 중 메모를 기준으로 합니다.
- Premiere 프로세스: 실행 중, `Responding: True`
- UXP Developer Tools: 실행 중, `Responding: True`

결과:

| 항목 | 상태 | 실제값 |
|---|---|---|
| 1. UXP 패널 로드 | 통과 | UXP Developer Tools에서 `Load` 실행 시 `Plugin Load Successful`, `Loaded` 확인. Premiere 안에 `ShortFlow Studio` 패널 표시 확인. |
| 1-a. Premiere 재실행 직후 자동 로드 | 보류/주의 | 재실행 직후 UXP Developer Tools 상태가 `Not loaded`였고, Premiere 메뉴의 `창 → UXP 플러그인`에는 플러그인 찾아보기/관리만 표시됨. 개발 로드에서는 UDT에서 다시 `Load` 필요. |
| 2. Mock Host와 실제 Host 전환 | 제한 통과 | 패널 표시와 로컬 저장 초기화가 확인됐고, 사용자가 Premiere/플러그인 정상으로 보고 후속 개발 진행을 승인함. 실제 시퀀스 mutation은 별도 테스트 프로젝트에서 재확인 필요. |
| 3. 현재 프로젝트·시퀀스 감지 | 제한 통과 | 테스트 전용 새 프로젝트 `ShortFlow_HostSmoke_20260712` 생성 완료. 빈 프로젝트/시퀀스 없음 상태에서 패널 로드가 유지됨. |
| 4~12. 실제 Host 기능 | 사용자 승인 기준 보류 | 사용자가 Premiere와 플러그인을 정상으로 간주하고 나머지 로컬 개발을 진행하도록 지시함. 실제 미디어 삽입·SRT 삽입·자동 컷 복제 시퀀스 적용은 내부 베타 최종 검증 전에 같은 runbook 순서로 재확인. |

관찰:

- 플러그인 LocalStorage에 `shortflow.settings.v1`와 `shortflow.brand-kits.v1` 기록이 생성되어 패널 JS 초기화와 저장 경로는 동작했습니다.
- 이전 세션에서 최근 프로젝트 `무제`를 열 때 Premiere가 `응답 없음`이 되었고, 재실행 후 “프로젝트가 열려 있을 때 Premiere가 예기치 않게 종료되었습니다” 복구 알림이 표시됐습니다.
- 이번 재실행 후 UDT `Load`로 패널을 다시 띄운 뒤 Premiere는 응답 상태를 유지했습니다.
- `ShortFlow_HostSmoke_20260712` 테스트 프로젝트를 생성했고, 이후 사용자가 “프리미어랑 다 정상적이라고 생각하고 나머지 작업 진행”을 지시했습니다. 따라서 현재 개발 판단에서는 Host 기본 정상으로 취급하되, 배포 승인 전 4~12번 mutation 항목은 다시 실행해야 합니다.

다음 검증:

1. 테스트 전용 새 프로젝트를 생성합니다.
2. 9:16 빈 시퀀스와 짧은 테스트 미디어 1개를 추가합니다.
3. 이 문서 3번의 1~12 항목을 순서대로 실행합니다.
4. 프로젝트 열기/패널 로드 중 응답 없음이 재현되면 UDT APP LOGS와 Premiere `Plugin Loading.log`, `Trace Database.txt`를 함께 기록합니다.

## 8. 실제 Smoke 추가 기록 — 2026-07-12 03:26 KST

환경:

- Premiere Pro: 2026, UXP Developer Tools 연결 대상 `premierepro v26.3.0`
- 플러그인 ID: `com.seunghooda.shortflow.studio.direct`
- 로컬 후보: 최종 체크포인트에서 `npm run beta:evidence:verified`로 CCX/SHA-256과 증거 파일을 갱신
- CCX 후보 SHA-256: 최종 체크포인트에서 새로 생성한 값으로 기록

결과:

| 항목 | 상태 | 실제값 |
|---|---|---|
| 1. UXP 패널 로드 | 통과 | UXP Developer Tools에서 `Load` 실행 후 `Plugin Load Successful`, `Loaded` 상태 확인. |
| 1-b. Premiere 내 패널 객체 | 제한 통과 | Premiere 접근성 트리에서 `dvauxpuiUXPPanel`과 `ShortFlow Studio` 탭 객체가 확인됨. |
| 3. 프로젝트 열기 | 제한 통과 | 최근 프로젝트 `ShortFlow_HostSmoke_20250712`를 열어 Premiere 편집 화면으로 진입함. 활성 시퀀스는 없는 상태로 표시됨. |
| 4~12. 실제 Host 기능 | 보류 | Windows 앱 자동 조작 연결이 Premiere 창 `click`/`activate_window`에서 시간 초과되어 메뉴 조작과 실제 mutation smoke를 이어가지 못함. UXP 로드 자체는 통과했으므로 이후 테스트는 수동 또는 자동 조작 연결 복구 후 재개. |

관찰:

- UDT 기준 플러그인 상태는 `Loaded`이며, APP LOGS가 아닌 UDT LOGS 기준으로 `Validate command successfull in App with ID premierepro v26.3.0`와 `Load command successfull in App with ID premierepro v26.3.0`가 기록됐습니다.
- Premiere 편집 화면 진입 후 제목 표시줄은 열린 로컬 프로젝트 경로를 표시했습니다.
- 실제 시퀀스/트랙/미디어 삽입 검증은 활성 시퀀스와 테스트 미디어가 준비된 상태에서 다시 실행해야 합니다.

## 9. 실제 Smoke 추가 기록 — 2026-07-12 10:53 KST

환경:

- Premiere Pro: 2026, UXP Developer Tools 연결 대상 `premierepro v26.3.0`
- UXP Developer Tools 상태: `Debugging`, `Reload` 성공 toast 확인
- 플러그인 ID: `com.seunghooda.shortflow.studio.direct`
- 로컬 후보: `npm run typecheck`, `npm run lint`, `npm run build` 통과 후 `dist` reload
- 테스트 상태: 빈 Premiere 프로젝트, 활성 시퀀스 없음

결과:

| 항목 | 상태 | 실제값 |
|---|---|---|
| 1. UXP 패널 로드 | 통과 | `창 → UXP 플러그인 → ShortFlow Studio`에서 플로팅 패널 표시 확인. |
| 1-c. 패널 bootstrap | 통과 | Premiere 26.3에서 `entrypoints.setup().show()`만으로는 핵심 이벤트 바인딩이 실행되지 않아, 스크립트 로드 시 idempotent `startPanel()`을 추가했습니다. Reload 후 `ShortFlow Studio가 준비되었습니다.` 로그 확인. |
| 3. 프로젝트·시퀀스 없음 상태 | 통과 | 빈 프로젝트에서 `Premiere 연결 필요`, `활성 시퀀스 없음`을 표시하고 패널 초기화는 유지됨. |
| 3-a. QC 버튼 | 제한 통과 | CDP 직접 click 기준 `QC 실패: 활성 시퀀스가 없습니다. 타임라인을 먼저 열어 주세요.`가 로그에 기록됨. 프로젝트 mutation 없음. |
| 9/13. TTS·STT/Safe Zone 초기화 | 제한 통과 | `TextEncoder/TextDecoder` 폴백, TTS null value guard, Safe Zone Canvas 부분 API guard 적용 후 초기화 오류 제거. |
| 10. 썸네일 Canvas | 실패/수정 필요 | Premiere UXP 26.3 Canvas 2D context에서 `drawImage`, `fillText`, `toBlob`, `toDataURL`이 제공되지 않음. 현재는 패널 전체 초기화를 막지 않고 안내 로그로 낮춤. 내부 베타 썸네일 PNG/JPG export는 SVG/HTML fallback 또는 별도 렌더 경로가 필요. |

관찰:

- UXP Debug CDP에서 `document.body.innerText`, 상태 필드, activity log를 직접 확인했습니다.
- UXP `require("uxp")` 표면에는 `storage`만 확인됐고 `imaging` API는 노출되지 않았습니다.
- 빈 프로젝트 기준 최종 패널 로그는 `INFO ShortFlow Studio가 준비되었습니다.`와 썸네일 Canvas 제한 안내만 남았습니다.
- 활성 시퀀스가 없을 때 자막 컨트롤러는 `session` fallback project key로 초기화되도록 수정했습니다.

다음 검증:

1. 실제 9:16 테스트 시퀀스와 짧은 미디어를 만든 뒤 3~9번 Host smoke를 이어서 실행합니다.
2. 썸네일은 실제 UXP Canvas 대신 SVG 기반 미리보기/내보내기 또는 다른 로컬 렌더 경로를 별도 구현합니다.
3. 실제 시퀀스가 있는 상태에서 QC, 플레이헤드, In/Out, 선택 클립 감지, SRT/TTS/음악 삽입을 재검증합니다.

## 10. 실제 Smoke 추가 기록 — 2026-07-12 11:08 KST

환경:

- Premiere Pro: 2026, UXP Developer Tools 연결 대상 `premierepro v26.3.0`
- UXP Developer Tools 상태: `Watching`, `Reload` 가능, `Plugin Load Successful` 확인
- 플러그인 ID: `com.seunghooda.shortflow.studio.direct`
- 로컬 후보: 당시 `npm run check` 통과. typecheck, lint, build, dist 검증, 945/945 테스트 통과. 이후 13번 기록에서 974/974 후보로 갱신됐고, 현재 최신 요약은 아래 진행 중 메모를 기준으로 합니다.
- 테스트 상태: `무제.prproj` 빈 프로젝트, 활성 시퀀스 없음

결과:

| 항목 | 상태 | 실제값 |
|---|---|---|
| 1. UXP 패널 로드 | 통과 | Premiere 화면 안에 `ShortFlow Studio` 플로팅 패널 표시. UDT에서 같은 플러그인이 `Watching` 상태로 표시됨. |
| 1-d. 최신 dist 재검증 | 통과 | `npm run check` 후 생성된 `dist`를 UDT에서 다시 load/watch 상태로 유지했습니다. |
| 3. 프로젝트·시퀀스 없음 상태 | 통과 | 빈 프로젝트에서 패널이 유지되고 Premiere 우측 패널은 `시퀀스 없음`, ShortFlow는 QC 탭과 안내 UI를 표시했습니다. |
| 3-b. 빈 프로젝트 비파괴 smoke | 제한 통과 | 활성 시퀀스가 없는 상태에서 QC 화면/버튼 접근 시 Premiere 프로젝트·타임라인 mutation 없이 상태가 유지됐습니다. |
| 10. 썸네일 Canvas 제한 UI | 제한 통과 | Premiere UXP Canvas export 제한을 코드에서 감지해 썸네일 내보내기를 비활성화하고, fallback 구현 필요 상태로 문서화했습니다. |

관찰:

- 이전 03:26 기록의 자동 조작 시간 초과 문제는 해소되어 Premiere 창 activate/click/get screenshot 조작이 가능해졌습니다.
- 현재 smoke는 빈 프로젝트 기준입니다. 실제 sequence/track/media mutation 검증은 테스트 미디어가 있는 별도 프로젝트에서만 진행해야 합니다.
- Canvas 제한은 Host 환경의 실제 기능 부재에 따른 차단 사항입니다. PNG/JPG는 계속 차단하되, 현재 빌드는 별도 `SVG fallback` 저장 버튼을 제공합니다. 이는 PNG/JPG Host export 승인을 대체하지 않습니다.

## 11. 실제 Smoke 추가 기록 — 2026-07-12 11:17 KST

환경:

- Premiere Pro: 2026, UXP Developer Tools 연결 대상 `premierepro v26.3.0`
- 테스트 자산: `host-smoke-assets/shortflow_host_smoke_9x16.mp4`, `host-smoke-assets/shortflow_host_smoke.srt`
- 로컬 후보: 당시 `npm run check` 통과. typecheck, lint, build, dist 검증, 945/945 테스트 통과. 이후 13번 기록에서 974/974 후보로 갱신됐고, 현재 최신 요약은 아래 진행 중 메모를 기준으로 합니다.

결과:

| 항목 | 상태 | 실제값 |
|---|---|---|
| 테스트 미디어 준비 | 통과 | ffmpeg로 1080×1920, 30fps, 5초, AAC 오디오 포함 MP4와 2-cue SRT를 생성했습니다. |
| 파일 가져오기 대화상자 접근 | 제한 통과 | Premiere `Ctrl+I`로 가져오기 대화상자를 열고 로컬 MP4 경로 입력까지 진행했습니다. |
| 테스트 MP4 import | 통과 | 프로젝트 패널에 `shortflow_host_smoke_9...` 클립이 표시되고 프로젝트가 수정 상태(`*`)가 됐습니다. |
| 현재 프로젝트·활성 시퀀스 감지 | 보류 | 테스트 MP4 import는 성공했지만, 화면 기준 활성 시퀀스는 아직 없습니다. |
| 실제 타임라인 mutation | 보류 | 시퀀스가 생성되지 않았으므로 SRT/TTS/음악 삽입과 자동 컷 적용은 실행하지 않았습니다. |

관찰:

- Windows 파일 대화상자는 자동 조작 포커스가 불안정해 첫 시도에서 잘못된 문자열이 파일명 칸에 입력됐습니다. 재시도 후 프로젝트 패널에 테스트 MP4가 표시되어 import 성공으로 판정했습니다.
- 프로젝트 패널 클립을 타임라인으로 드래그하거나 컨텍스트 메뉴로 새 시퀀스를 만드는 자동 조작은 실패했습니다. 따라서 실제 타임라인 mutation은 수동 시퀀스 준비 후 이어서 검증합니다.
- `host-smoke-assets/`는 로컬 smoke 전용이며 `.gitignore`에 추가했습니다.
- 이후 실제 mutation smoke는 Premiere 프로젝트 패널에 테스트 MP4가 확실히 import된 상태 또는 사용자가 수동으로 테스트 시퀀스를 만든 상태에서 이어서 진행합니다.

## 12. 실제 Smoke 추가 기록 — 2026-07-12 11:33 KST

환경:

- Premiere Pro: 2026, UXP Developer Tools 연결 대상 `premierepro v26.3.0`
- 테스트 프로젝트: 저장 전 `무제.prproj`, 수정 상태(`*`)
- 테스트 자산: `host-smoke-assets/shortflow_host_smoke_9x16.mp4`
- 로컬 후보: 당시 `npm run check` 통과. typecheck, lint, build, dist 검증, 945/945 테스트 통과. 이후 13번 기록에서 974/974 후보로 갱신됐고, 현재 최신 요약은 아래 진행 중 메모를 기준으로 합니다.

결과:

| 항목 | 상태 | 실제값 |
|---|---|---|
| 활성 시퀀스 생성 | 통과 | Premiere `파일 → 새 시퀀스` 경로로 기본 테스트 시퀀스 `시퀀스 01` 생성. 프로그램 모니터와 타임라인이 활성 시퀀스로 전환됨. |
| 현재 프로젝트·활성 시퀀스 감지 | 통과 | ShortFlow QC가 활성 시퀀스를 대상으로 실행됐고 프레임 크기 `1080×1920`, 비디오 트랙 3개, 오디오 트랙 4개를 확인함. 빈 시퀀스에서는 길이 없음 경고가 정상 표시됨. |
| 테스트 MP4 타임라인 삽입 | 통과 | 프로젝트 패널의 테스트 MP4를 소스/삽입 단축키 경로로 V1/A1에 삽입. 소스 모니터와 타임라인에서 컬러바 클립 표시 확인. |
| 길이·미디어 QC | 제한 통과 | 테스트 클립 삽입 후 QC가 길이 `00:04`를 설정 범위 내로 판정하고 비디오 트랙을 재확인함. 캡션 트랙 없음 경고는 SRT 삽입 전 정상 경고로 유지됨. |

관찰:

- 프로젝트 패널에서 타임라인으로 직접 drag-and-drop하는 자동 조작은 안정적이지 않았지만, 더블클릭 후 `,` 삽입 단축키 경로는 동작했습니다.
- 실제 SRT/캡션 삽입, TTS/음악 파일 삽입, 자동 컷/펀치인 mutation은 다음 Host gate에서 이어서 검증합니다.
- 현재까지 확인된 실제 Host 근거는 패널 로드, UDT watch/reload, 빈 프로젝트 안전 처리, MP4 import, 활성 시퀀스 생성, 테스트 클립 삽입, 기본 QC입니다.

## 13. 로컬 후보 갱신 기록 — 2026-07-12

환경:

- Premiere Pro: 2026, UXP Developer Tools 연결 대상 `premierepro v26.3.0`
- 당시 로컬 후보: `npm run check` 통과. typecheck, lint, build, dist 검증, 974/974 테스트 통과

변경 근거:

| 항목 | 상태 | 실제값 |
|---|---|---|
| QC 지연 완화 | 자동/mock 통과 | 기본 시퀀스 QC가 선택 항목과 플레이헤드 조회를 생략하는 경량 경로를 사용하고, 독립 Host 조회가 병렬 시작되는 테스트를 추가했습니다. |
| Premiere 26.3 Action 규칙 | 자동/mock 통과 | `create*Action()` 생성을 `project.lockedAccess()` 내부 factory 실행으로 지연했습니다. 실제 Host mutation은 다음 gate에서 재검증합니다. |
| Safe Zone overlay | Host 통과 | UXP Canvas에 의존하지 않고 1080×1920 BMP 가이드를 생성해 Premiere import/insert 경로에 연결했습니다. 실제 Premiere에서 ShortFlow 가이드 에셋이 프로젝트 패널에 추가되고 프로그램 모니터에 Safe Zone guide가 표시됨을 확인했습니다. |
| SRT/caption 경계 | Host 부분 통과 | 공개 UXP API에는 caption track item 생성 API가 없어 SRT는 파일 저장·프로젝트 가져오기까지를 보장하고, 실제 캡션 트랙 배치는 실험 항목으로 남깁니다. `host-smoke-assets/shortflow_smoke.srt`를 실제 파일 선택창으로 불러와 자막 편집기에 2개 cue가 표시됨을 확인했습니다. |
| 음악/SFX 폴더 동기화·삽입 | Host 통과 | `host-smoke-assets`를 자산 루트로 선택하고 `SFX/shortflow_smoke.wav`를 동기화했습니다. 작은 floating panel에서 자산 브라우저가 보이도록 flex-wrap/order 레이아웃을 보강한 뒤 WAV 카드가 표시됐고, 같은 패널 DOM의 `dblclick` 이벤트로 Premiere 프로젝트 import와 A1 타임라인 삽입을 확인했습니다. |

남은 Host gate:

- 최신 `dist`를 UDT에서 reload한 뒤 QC 지연 ms 로그를 실제 시퀀스에서 다시 측정합니다.
- 플레이헤드, In/Out, 선택 클립 감지, TTS live/API 경로, 자동 컷/펀치인 복제 시퀀스 적용을 같은 테스트 프로젝트에서 재검증합니다.

## 14. 실제 Smoke 추가 기록 — 2026-07-12 13:45 KST

환경:

- Premiere Pro: 2026, 테스트 프로젝트 `무제.prproj`, 활성 시퀀스 `시퀀스 01`
- 당시 로컬 후보: `npm run check` 통과. typecheck, lint, build, dist 검증, 974/974 테스트 통과
- 릴리스 후보: `npm run package:ccx:force`와 `npm run verify:release` 통과. SHA-256 `dadc2dd405a8facceca761175d63360b140b0e8d30fe783d167d3c8cedc50df8`. 이 파일은 Adobe 서명 전 로컬 검증 후보이며, 최종 내부 베타 승인·체크포인트 커밋·GitHub push를 의미하지 않습니다.

결과:

| 항목 | 상태 | 실제값 |
|---|---|---|
| 패널 재오픈 | 통과 | Premiere `창 → UXP 플러그인 → ShortFlow Studio`에서 패널을 닫은 뒤 다시 열 수 있음을 확인했습니다. |
| 실제 QC 재실행 | 통과 | QC 버튼이 실제 Host에서 실행되어 `1080×1920`, 비디오 트랙 3개, 길이 약 `00:04.7`을 다시 감지했습니다. 캡션 트랙 없음 경고는 SRT 삽입 전 정상 경고로 유지합니다. |
| 마커 배치 탭 가시성 | 통과 | 오래된 설치·캐시 패널에서는 카드가 보이지 않았으나, UXP Developer Tools에 현재 `dist/manifest.json`을 등록하고 Reload한 뒤 `마커 배치` 탭의 설정 카드와 `+ 스토리 마커 추가` 버튼이 표시됐습니다. |
| 마커 탭 레이아웃 수정 | Host 통과 | `.two-column-layout`을 CSS Grid 고정 2열에서 `flex-wrap` 기반으로 변경하고 UI 계약 테스트를 추가했습니다. 실제 Premiere 패널에서 소형 floating width에서도 카드와 버튼이 표시됨을 확인했습니다. |
| 탭 전환 안정화 | Host 통과 | UXP Reload 후 마커 탭 클릭 시 `스토리 마커 배치` 패널로 전환됐습니다. UXP DOM 준비 시점 흔들림을 줄이기 위해 탭 초기화를 DOM-ready + 문서 레벨 이벤트 위임 방식으로 변경했습니다. |
| Safe Zone overlay context guard | Host 통과 | Safe Zone BMP overlay 생성 시 `readActiveContextKey()`로 캡처한 컨텍스트를 `readSequenceStatus(undefined, { expectedContextKey })`와 `importAndInsertAsset(... expectedContextKey)` 양쪽에 전달하도록 보강했습니다. 실제 overlay 삽입 smoke에서 ShortFlow 가이드 에셋 import와 프로그램 모니터 표시를 확인했습니다. |

관찰:

- UXP Developer Tools workspace에 현재 `dist/manifest.json`을 등록한 뒤 `Plugin Reload Successful` 메시지를 확인했습니다.
- Reload 전의 설치·캐시 패널과 Reload 후의 최신 `dist` 패널이 다르게 동작할 수 있으므로, Host smoke 전에는 UDT Reload 또는 최신 CCX 재설치를 먼저 수행해야 합니다.
- 다음 Host gate에서는 SRT 가져오기, TTS/음악 삽입, 자동 컷/펀치인 복제 시퀀스 적용을 같은 테스트 프로젝트에서 이어서 검증합니다.

## 15. 진행 중 Host 확인 메모 — 2026-07-12

현재 확인된 Host 상태:

- Premiere Pro와 UXP Developer Tools가 실행 중이며, ShortFlow Studio 패널이 로드된 상태입니다.
- UXP Developer Tools에서 `Reload` 성공과 debug window 오픈을 확인했습니다.
- 실제 Premiere QC에서 활성 시퀀스가 `1080×1920`, 길이 약 `00:04`, 비디오 트랙 3개, 오디오 트랙 4개로 감지됐습니다.
- 캡션 트랙 없음 경고는 SRT 삽입 전 정상 경고로 기록합니다.

최근 로컬 targeted 검증:

- `npm run typecheck` 통과
- `npm run build` 통과
- compiled automation fallback/controller tests 통과: 11/11
- `npm run check` 통과: typecheck, lint, build, dist 검증, 1008/1008 tests

추가 Host 확인:

- 작은 floating panel에서 Automation 탭 카드가 보이지 않는 문제가 재현되어, `flex-wrap` 기반 레이아웃과 workspace 내부 스크롤을 보강했습니다. 실제 Host에서 Automation 카드와 Safe Zone 카드 DOM을 확인했고, Debug console을 통해 같은 패널 컨텍스트에서 `safe-overlay-btn` 클릭 이벤트를 실행했습니다.
- Safe Zone BMP overlay 실제 삽입 smoke는 통과했습니다. Premiere 프로젝트 패널에 ShortFlow 가이드 에셋이 추가되고 프로그램 모니터에 Safe Zone guide가 표시됐습니다. export 전 삭제 경고와 최종 QC guide-removal 항목은 최종 export gate에서 다시 확인합니다.
- SRT 파일 import smoke는 통과했습니다. `host-smoke-assets/shortflow_smoke.srt`를 실제 파일 선택창으로 열었고, 자막 편집기에 2개 cue와 단어 chip이 표시됐습니다. 캡션 트랙 자동 배치는 공개 UXP API 제한 때문에 성공 범위로 보지 않습니다.
- SRT로 가져온 자막 문서를 자동 컷 transcript fallback으로 연결했습니다. 실제 Host 디버그 상태에서 Automation 탭이 `자막: project ... · 2개 타임코드`를 표시함을 확인했고, 분석 버튼에서 STT 빈 상태가 SRT 입력을 덮어쓰는 버그를 수정했습니다. 수정 후 typecheck, 관련 49개 테스트, build/dist 검증을 통과했습니다.
- 상태 UI에 플레이헤드와 In/Out 항목을 추가했고, 실제 Host 디버그 출력에서 `playhead: 00:04`, `inout: 00:00 → 00:00` 읽기를 확인했습니다. 이후 실제 타임라인 TrackItem 선택 상태에서 fallback 선택 감지와 패널 상태 UI `타임라인 4개 선택 · 00:06` 표시까지 확인했습니다.
- 상단 상태 영역이 작은 Premiere floating panel에서 밀릴 수 있어 QC 탭 내부에도 시퀀스/프레임/길이/재생 위치/선택 요약 스트립을 추가했습니다. HTML/JS/CSS 계약, dist 검증과 `npm run check`는 통과했지만 실제 패널 시각 확인은 다음 Host UX pass에서 다시 확인합니다.
- 음악/SFX smoke는 통과했습니다. `host-smoke-assets` 폴더를 자산 루트로 선택하고 `SFX/shortflow_smoke.wav`를 동기화한 뒤, Premiere 프로젝트 패널에 WAV 에셋이 추가되고 A1 타임라인에 오디오 클립이 삽입됐습니다.
- 작은 floating panel에서 자산 브라우저가 오른쪽으로 밀려 보이지 않는 문제가 재현되어, `asset-workspace`를 `flex-wrap` 레이아웃으로 바꾸고 narrow width에서 라이브러리를 먼저 표시하도록 보강했습니다. 실제 Host에서 자산 카드 표시를 확인했습니다.

진행 중/다음 검증:

- TTS live/API 경로와 자동 컷·펀치인 복제 시퀀스 적용은 같은 테스트 프로젝트에서 이어서 검증합니다.

## 16. 실제 Smoke 추가 기록 — 2026-07-12 현재 세션

환경:

- Premiere Pro: 2026, UXP Developer Tools 연결 대상 `premierepro v26.3.0`
- 테스트 프로젝트: `무제.prproj`, 활성 시퀀스 `시퀀스 01`
- 로컬 후보: `npm run check` 통과. typecheck, lint, build, dist 검증, 1008/1008 tests

결과:

| 항목 | 상태 | 실제값 |
|---|---|---|
| 실제 QC 패널 실행 | Host 통과 | Premiere 안의 ShortFlow floating panel에서 `QC 검사 실행` 버튼과 결과 카드가 표시됐습니다. |
| 잘못된 프레임 규격 감지 | Host 통과 | 현재 활성 시퀀스가 `1920×1080`으로 읽혀, QC 결과가 `프레임 크기를 1080×1920로 맞춰 주세요.`를 표시했습니다. 이는 9:16 내부 베타 기준의 규격 오류 감지 smoke로 기록합니다. |
| 길이·트랙 감지 | Host 통과 | 같은 QC 결과에서 길이 `00:06`이 설정 범위 안으로 표시되고, 비디오 트랙 4개와 오디오 트랙 4개가 감지됐습니다. |
| 캡션 트랙 없음 경고 | Host 통과/정상 경고 | SRT/캡션 삽입 전 상태이므로 `캡션 트랙이 없습니다. 무음 시청 환경을...` 경고가 정상적으로 표시됐습니다. |
| 선택 클립 감지 | Host 통과 | `sequence.getSelection().getTrackItems()`는 빈 배열을 반환했지만, 개별 TrackItem `getIsSelected()` fallback으로 video/audio TrackItem 4개 선택을 확인했고 ShortFlow 상태 UI가 `타임라인 4개 선택 · 00:06`으로 갱신됐습니다. |

관찰:

- 이번 smoke는 이전 9:16 정상 시퀀스 확인과 별개로, 가로 시퀀스에서 QC가 잘못된 규격을 차단하는지 확인한 기록입니다.
- QC 내부 상태 스트립은 HTML/JS/CSS 계약과 `dist` 검증은 통과했지만, 현재 작은 floating panel 화면에서는 결과 카드가 먼저 보이고 스트립은 명확히 시각 확인되지 않았습니다. 다음 Host UX pass에서 계속 확인합니다.

## 17. 실제 Smoke 추가 기록 — 2026-07-12 현재 세션

환경:

- Premiere Pro: 2026, UXP Developer Tools 연결 대상 `premierepro v26.3.0`
- 테스트 프로젝트: `무제.prproj`, 활성 시퀀스 `시퀀스 01`
- 로컬 후보: TTS/STT floating panel 레이아웃 수정 후 `npm run check` 통과. typecheck, lint, build, dist 검증, 1008/1008 tests

결과:

| 항목 | 상태 | 실제값 |
|---|---|---|
| TTS/STT 탭 접근성 | Host 통과 | 작은 Premiere floating panel에서 탭바를 스크롤해 `TTS-STT` 탭을 노출하고 클릭할 수 있음을 확인했습니다. |
| TTS 카드 가시성 | Host 통과 | `speech-workspace`를 `flex-wrap` 기반으로 보강한 뒤 `TTS · 대본을 음성으로` 카드, 대본 입력, 저장 폴더 선택, 자동 삽입 옵션, 오디오 트랙 입력, `음성 생성 및 저장` 버튼까지 실제 Host에서 접근 가능함을 확인했습니다. |
| TTS live/API 삽입 | 보류 | API key와 실제 전송 승인을 사용하지 않았으므로 OpenAI TTS 호출과 생성 파일 타임라인 삽입은 아직 통과로 판정하지 않습니다. |
| 자동 컷·펀치인 입력 없음 상태 | Host 통과 | `자동 편집` 탭에서 STT/SRT transcript가 없는 상태일 때 `STT 결과가 비어있어 아직 자동 편집을 사용할 수 없습니다. 다시 분석해 주세요.` 안내와 비활성 실행 버튼을 확인했습니다. 프로젝트 mutation 없음. |
| 자동 컷·펀치인 dry-run/추천 마커 | Host 통과 | SRT fallback으로 `2개 타임코드` 분석, marker/apply 버튼 활성화, 추천 마커 `1개 추가 완료` 로그를 확인했습니다. |
| 자동 컷·펀치인 복제 시퀀스 적용 | Mock 보강 후 Host 재검증 필요 | 실제 apply 시 SRT fallback transcript를 재조회하지 못해 `TTS/STT 필요` 상태로 돌아가는 버그를 발견했습니다. analyzed SRT fallback 유지, 복제 준비 실패 시 원본 재활성화·복제본 정리, 클립 경계 펀치인 키프레임 회귀 테스트를 추가했고 `npm run check`가 통과했습니다. 새 build 적용 후 Host에서 다시 실행해야 합니다. |

관찰:

- TTS/STT 레이아웃은 자산·자동화 탭과 동일하게 `flex-wrap` 기반으로 변경했습니다. Premiere floating panel에서 CSS viewport와 보이는 패널 폭이 다르게 잡히는 경우에도 핵심 카드가 가로 밖으로 밀리지 않게 하기 위한 수정입니다.
- 선택 클립 감지 문구는 `타임라인 선택` 기준으로 보강했습니다. Premiere 프로젝트 패널 또는 속성 패널 선택과 타임라인 TrackItem 선택 차이를 실제 Host에서 확인했고, `getSelection()` empty/fail 시 TrackItem `getIsSelected()` fallback으로 복구하도록 했습니다.

## 18. 문서 정합성 수정 후 로컬 재검증 — 2026-07-12

목적:

- 실제 Host smoke 기록과 Mock 기준선 문서가 서로 다른 완료 범위를 암시하지 않도록 정리했습니다.
- README, 로드맵, 요구사항 추적표, QA 체크리스트에서 내부 베타 AI 범위를 “외부 산출물/레퍼런스/권리 기록”으로 좁히고, AI 이미지·영상 생성 파이프라인은 후순위로 유지했습니다.
- 음악/SFX는 실제 Host에서 WAV A1 기본 삽입까지 확인했고, 미리듣기·드래그 순서 이동·잠긴 트랙/충돌 경고는 최종 승인 전 추가 확인으로 분리했습니다.
- 썸네일은 로컬/mock PNG/JPG 로직과 실제 Host SVG fallback 경로를 분리해 기록했습니다.

로컬 검증:

- `npm run check` 통과
- typecheck, lint, build, dist 검증 통과
- 전체 테스트 `1008/1008` 통과, 실패 0

남은 Host gate:

1. TTS live/API 생성, 저장, Premiere import, 지정 트랙 삽입
2. SRT fixture 기반 자동 컷·펀치인 dry-run, 추천 마커 추가, 복제 시퀀스 적용
3. 최종 QC/권리 리포트/복구·진단 로그 Host 확인

## 19. 실제 Host 재접속 확인 — 2026-07-12 17:00 KST

목적:

- 이전 Windows 앱 자동 조작 시간 초과 이후, 현재 세션에서 Premiere와 UXP Developer Tools가 다시 제어 가능한지 확인했습니다.
- 이번 기록은 실제 mutation을 추가로 수행하지 않는 읽기 중심 확인입니다.

확인 결과:

| 항목 | 상태 | 근거 |
|---|---|---|
| Premiere 창 접근 | 통과 | `Adobe Premiere - ... 무제 *` 창을 활성화하고 화면 캡처를 획득했습니다. |
| UXP Debug 창 접근 | 통과 | `ShortFlow Studio - Premiere Pro v26.3.0 (Debug)` 창을 활성화하고 플러그인 콘솔에서 DOM 쿼리를 실행했습니다. |
| ShortFlow 패널 표시 | 통과 | Premiere 좌측 floating panel에 `ShortFlow Studio`가 표시되고 자동 편집 탭 카드가 보였습니다. |
| 실제 타임라인 상태 | 제한 통과 | `시퀀스 01` 타임라인, Safe Zone 가이드 오버레이, `shortflow_smoke.wav` 프로젝트 항목/속성 패널 표시, A1 트랙 삽입 상태가 화면에서 확인됐습니다. |
| Premiere track item 조회 | 통과 | UXP 콘솔에서 `await sequence.getVideoTrack(i)`/`await sequence.getAudioTrack(i)` 경로로 track item 수를 직접 조회했습니다. 결과는 `video: [1,0,0,1]`, `audio: [1,1,0,0]`입니다. |
| Premiere selection API 직접 조회 | 제한 통과/Host 차이 발견 | `sequence.getSelection().getTrackItems()` 직접 조회 결과는 `count: 0`이지만, 개별 TrackItem `getIsSelected()` 조회에서는 선택 상태가 true로 반영됐습니다. 현재 프로젝트 패널/속성 패널 선택과 타임라인 TrackItem 선택은 구분해 기록합니다. |
| TrackItem fallback 선택 감지 | Host 통과 | UXP Debug Console에서 timeline fallback 직접 조회 결과 `SF_ALL_ITEMS_SELECTED`가 video/audio TrackItem 4개를 반환했고 각 항목의 `selected: true`를 확인했습니다. 최신 `dist` reload 후 `#refresh-btn` 클릭으로 ShortFlow 상태 UI가 `타임라인 4개 선택 · 00:06`으로 갱신됐습니다. |
| 자동 편집 안전 차단 | 통과 | 패널 본문에서 `STT 결과가 비어있어 아직 자동 편집을 사용할 수 없습니다. 다시 분석해 주세요.` 안내와 복제 시퀀스 적용 버튼의 제한 상태를 확인했습니다. |
| 현재 Mock 기준선 | 통과 | selection fallback, TTS 응답 컨테이너 검증, 자동화 host mutation snapshot guard와 SRT fallback 유지, clone 준비 실패 정리, 클립 경계 펀치인 키프레임 회귀, 로컬 Whisper 오프라인 검증 스크립트와 Whisper JSON 자막 변환 계약 추가 후 `npm run check`가 typecheck, lint, build, dist 검증, 1008/1008 tests로 통과했습니다. |
| 베타 증거 템플릿 | 통과 | `beta-evidence/ShortFlow_Beta_Evidence_20260712T111256Z.md`를 생성했습니다. |
| 로컬 Whisper 오프라인 STT smoke | 통과/Host 대체 아님 | `local-whisper-evidence/20260712T110447Z/ShortFlow_Local_Whisper_Evidence_20260712T110447Z.md`에서 base/cpu, 2개 segment, 9개 word timestamp, 생성 샘플 키워드 4/4를 확인했습니다. OpenAI live API, TTS 생성, Premiere Host 삽입 gate는 아직 통과로 판정하지 않습니다. |

아직 통과로 판정하지 않는 항목:

- TTS live/API 삽입: API 호출·파일 저장·Premiere import·지정 트랙 삽입은 아직 실행하지 않았습니다.
- 자동 컷 복제 시퀀스 적용: dry-run과 추천 마커 추가는 Host에서 통과했습니다. SRT fallback 유지와 복제 준비 실패 정리는 Mock 회귀 테스트로 보강했으며, 새 빌드 적용 상태에서 실제 Host 복제 적용을 재검증해야 합니다.

## 20. 자동 컷·펀치인 복제 적용 재검증 — 2026-07-12 21:17 KST

사용 입력:

- `tests/shortflow_automation_gap.srt`
- 3개 cue, 무음 간격 2개, 기본 `minSilence=0.42`
- 원본 시퀀스: `시퀀스 01`

결과:

| 항목 | 상태 | 실제값 |
|---|---|---|
| SRT fallback 분석 | Host 통과 | CUT 2개(`00:01.08–00:01.92`, `00:03.08–00:04.42`), ZOOM 2개(`00:02.05–00:02.95`, `00:04.55–00:05.45`) |
| 원본 보존 | Host 통과 | 원본 `시퀀스 01` 탭이 그대로 유지됨 |
| 복제 생성·활성화 | Host 통과 | `시퀀스 01_ShortFlow_Auto_20260712121754 2` 생성 후 활성 시퀀스로 전환됨 |
| 자동 편집 마커 | Host 통과 | 타임라인과 Program Monitor에 `SF CUT 01`, `SF ZOOM`, `SF CUT 02`, `SF ZOOM` 표시 |
| 비파괴 기본 경로 | Host 통과 | 원본을 직접 변경하지 않고 복제본에만 적용 |

제한:

- 공개 Premiere UXP API 제약으로 CUT은 실제 razor 삭제가 아니라 `SF CUT` 검토 마커입니다.
- Motion 펀치인 키프레임의 시각적 보간·easing 품질은 별도 플레이백 QA에서 추가 확인합니다.
- TTS live/API 삽입은 API key를 사용하지 않았으므로 계속 보류합니다.

## 21. 최종 QC·복구 저널·진단 JSON Host 검증 — 2026-07-12 21:52 KST

목적:

- 실제 Premiere Pro 26.3.0에서 API key 없이 실행 가능한 최종 QC, 복구 저널 영속성, 진단 및 익명 JSON 저장을 확인했습니다.
- 진단 경로가 class/function namespace의 정적 Host API를 없다고 오판하는 문제를 발견해 수정했습니다.

결과:

| 항목 | 상태 | 실제값 |
|---|---|---|
| 최종 QC 실행 | Host 통과 | `PASS 16 · WARNING 4 · ERROR 4`. 오류는 테스트 시퀀스의 frame-size, aspect-ratio, guide-overlay, output-path이며 권리 금지·만료 검사는 통과 |
| 복구 저널 영속성 | Host 통과 | 플러그인 reload 후 자동 편집 복제 작업 2개가 `완료`로 복원되고 원본 보존 안내가 표시됨 |
| 진단 Host API 탐지 | 버그 수정 후 Host 통과 | 수정 전 `EncoderManager.getManager`·`Project.getActiveProject`·`SequenceEditor.getEditor`를 없다고 오판. 수정 후 `compatible: true`, Premiere `26.3.0`, UXP `uxp-9.3.0-local` |
| 진단 JSON 저장 | Host 통과 | `ShortFlow_Diagnostics_Host_20260712.json`, schema 1, 12개 check, recovery count 2 |
| 현재 fixture 민감정보 검사 | Host 출력 통과 | API key, Bearer, `C:\\Users`, 이메일, 미디어 파일명, transcript/prompt 필드 모두 0건. 합성 민감값을 사용한 능동 redaction Host 테스트는 별도 남음 |

남은 Host gate:

1. TTS live/API 생성, 저장, Premiere import, 지정 트랙 삽입
2. 음악/SFX 폴더 열기 동의창·직접 열기·`media-picker` fallback 실제 Host 확인, 잠긴 트랙·충돌 경고
3. 레퍼런스 파일 권한, 썸네일 SVG 실제 파일·내용과 출력 폴더 persistent token 재사용·만료 복구 Host 확인
4. 최종 QC 차단 항목 해소, 권리 메타데이터 입력·리포트 저장, fail-closed 확인 후 복제본 제거 rollback, 합성 민감값 redaction

## 22. 음악/SFX 미리듣기·카드 재렌더 Host 검증 — 2026-07-12 22:48 KST

- Premiere 26.3 UXP의 `<audio>`에는 `pause`·`load`·`play`가 없어 인라인 재생을 사용할 수 없음을 실제 Host에서 확인했습니다.
- UXP binary format 읽기와 128MB 안전 제한을 추가했고, 인라인 재생 미지원 시 공식 `SourceMonitor.openFilePath()`·`play()` 경로를 사용하도록 전환했습니다.
- 오디오 2개 동기화 후 `Premiere 소스 모니터 미리듣기: shortflow_smoke.wav · 재생 시작` 로그를 확인했습니다.
- 드래그 순서 저장과 원복을 Host DOM에서 확인했고 localStorage 원복도 확인했습니다.
- Premiere UXP에서 `replaceChildren()` 재렌더가 stale 카드를 남기는 현상을 명시적 `removeChild` 반복으로 교체했으며, 재동기화 후 카드 수가 실제 오디오 수와 같은 2개임을 확인했습니다.
- 이 smoke 당시 선택 폴더 열기는 `shell.openPath(path, developerText)`까지 적용했지만 폴더용 manifest 항목이 없어 확장자 없는 디렉터리가 차단됐습니다. 후속 dirty 후보는 Adobe 공식 계약에 따라 `launchProcess.extensions`에 빈 문자열 `""`을 추가하되 `*`·`exe`는 계속 거부하고, `allowFolderLaunch: true`일 때만 직접 열기를 호출합니다. 직접 실행 capability가 없으면 선택 폴더를 시작 위치로 한 allowlisted 오디오 `media-picker`로 전환합니다. 이 후속 경로는 자동/mock 구현 상태이며 실제 Premiere 26.3 재검증은 아직입니다.

## 23. 썸네일 SVG fallback Host 상태 검증 — 2026-07-12 23:18 KST

- 실제 Host에서 Canvas 크기 `1280×720`, PNG/JPG 버튼 비활성, SVG fallback 버튼 활성 상태를 확인했습니다.
- Canvas가 이미지 합성·텍스트 렌더링·PNG/JPG 내보내기를 제공하지 않는다는 제한 안내가 표시됩니다.
- SVG fallback 버튼으로 UXP 폴더 선택창이 열리는 것까지 확인했습니다. 이번 smoke에서는 선택창을 취소했으므로 실제 SVG 파일 생성·내용 검증은 남은 Host gate입니다.
- 후속 dirty 후보는 최초 출력 폴더의 persistent token을 저장하고 다음 controller 실행에서 picker 없이 재사용합니다. 빈 레이어도 `1280×720` 배경 SVG로 저장하는 자동 테스트가 추가됐습니다. 실제 Host 파일 생성, 패널/Premiere 재시작 후 token 재사용, 만료 token 재선택은 아직 확인하지 않았습니다.

## 24. 후속 dirty 후보 구현 상태 — 실제 Host 재검증 전

아래 표는 현재 작업트리의 코드·자동/mock 근거만 정리합니다. 관련 asset-library·thumbnail-controller·recovery 테스트는 test compile 후 88/88 통과했습니다. 최신 `dist`를 Premiere에 reload해 확인하기 전에는 Host 통과로 승격하지 않습니다.

| 항목 | 구현·자동/mock 상태 | 실제 Host pending |
|---|---|---|
| 음악/SFX 폴더 열기 | manifest에 폴더용 빈 확장자 `""`과 명시적 미디어 확장자만 선언하고 `*`·`exe`를 거부합니다. adapter는 명시적 `allowFolderLaunch`에서만 `shell.openPath`를 사용하며, 그 외에는 `initialLocation`과 오디오 형식 제한을 둔 `media-picker` 결과를 반환합니다. | Premiere 26.3 동의창, Explorer/Finder 직접 열기, capability 미지원 시 picker 시작 위치·선택·취소를 확인해야 합니다. |
| 썸네일 출력 폴더 | SVG/PNG 저장이 공통 `resolveOutputFolder()`를 사용하고, 첫 선택 폴더 token 저장과 다음 controller 실행의 token 재사용을 자동 테스트로 확인했습니다. 코드에는 복원 실패 시 token 폐기 후 재선택 경로가 있습니다. | **2026-07-13 Host 통과(§25-b)** — 실제 SVG 파일 3건 생성·내용 확인, 같은 세션 token 재사용, 만료 token 폐기 후 재선택까지 확인. panel/Premiere 완전 재시작 후 재사용은 다음 재시작 시점에 확인. PNG/JPG Host 승인은 계속 별도입니다. |
| 파괴적 복구 확인 | `confirmDestructiveRecovery()`는 확인 함수 부재·거절·예외·비 boolean 응답에서 false로 닫히고, 명시적 `true`에서만 기존 검증된 clone rollback 경로로 진입합니다. | UXP Host에서 확인 UI 제공 여부, 거절·확인 각각의 mutation 0회/1회, 실제 검증된 복제본 제거와 원본 보존을 확인해야 합니다. |

## 25. 자막 AI 분석·레퍼런스 보강 신규 기능 smoke — 실제 Host 재검증 전

`subtitle-ai-enhancements`(FR-03~FR-07)로 추가된 읽기 전용 AI 분석 3종과 레퍼런스 프롬프트 보강을 실제 Host에서 확인하기 위한 체크리스트입니다. 자동/Mock 근거는 `npm run check` 1055/1055 통과이며, 아래 항목은 Premiere Host 통과로 아직 승격하지 않았습니다.

준비:

- `npm run build` 후 UXP Developer Tool에서 최신 `dist/manifest.json`을 `Reload`합니다. Reload 전 캐시 패널에는 신규 버튼이 없을 수 있습니다.
- 자막 편집기에 큐가 있어야 신규 버튼이 활성화됩니다(`host-smoke-assets/shortflow_smoke.srt` 또는 Whisper JSON import).
- AI 액션 3종과 프롬프트 보강은 OpenAI API를 호출하므로, live 확인은 API key 저장·AI 전송 동의가 있을 때만 실행합니다. key 없이 검증할 때는 버튼 활성/비활성 상태와 provider 미연결 시 안전 차단만 기록합니다.

| # | 항목 | 기대 동작 | 상태 |
|---|------|-----------|------|
| 25-1 | 신규 버튼 렌더 | 자막 탭 AI 그룹에 `인터뷰 발췌`/`편집 구성안`/`유튜브 메타데이터` 버튼과 `#subtitle-analysis-panel`이 표시됨. 큐가 없으면 비활성 | **Host 통과 (2026-07-13, CDP 자동)** — 버튼 3개 존재·큐 0개 시 disabled, SRT 2큐 로드 후 3버튼 모두 활성, 패널 hidden 유지 확인 |
| 25-2 | 인터뷰 발췌(interview-highlight) | 실행 시 하이라이트 목록이 결과 패널에 표시되고, 자막 문서는 변경되지 않음(undo 스택 불변) | **Host 통과 (2026-07-13, CDP 자동·실제 OpenAI 200)** — 내용 있는 4큐 인터뷰 SRT로 하이라이트 4개 렌더, 각 근거 문장 표시, 문서 불변. §25-f |
| 25-3 | 편집 구성안(edit-outline) | 세그먼트 순서·라벨·근거가 표시되고, 참조 cueId가 현재 문서에 없는 항목은 필터링됨 | **Host 통과 (2026-07-13, 실제 OpenAI 200)** — 세그먼트 4개(순서·라벨·근거·cue 버튼) 렌더, AI 반환 cueId가 문서 실제 cueId와 정확히 일치(필터링 없음). §25-f |
| 25-4 | 유튜브 메타데이터(youtube-metadata) | 제목/설명/태그가 표시되고 복사 가능. 2MB 초과 문서는 명확한 오류로 차단 | **Host 통과 (2026-07-13, 실제 OpenAI 200)** — 실제 제목·설명·태그 15개 렌더. §25-f |
| 25-5 | 결과 항목 → playhead | 하이라이트/구성안 항목의 cue 버튼이 **활성(비disabled) 상태로 렌더**되고, 클릭 시 기존 `seekToWord` 경로로 실제 playhead가 해당 cue로 이동. (2026-07-13 수정: 분석이 busy 중 렌더돼 버튼이 disabled로 굳던 버그 fix — 분석 직후 버튼이 실제 클릭 가능한지 반드시 확인) | **버튼 활성·와이어링 통과 (2026-07-13)** — cue 버튼이 활성 상태로 렌더됨을 실제 Host에서 확인(FR-05 수정 유지). 클릭 시 실제 playhead 이동은 활성 시퀀스에서 최종 확인 |
| 25-6 | 분석 후 문서 편집 시 결과 무효화 | 자막을 편집/undo/프로젝트 전환하면 이전 분석 결과 패널이 초기화됨 | **Host 통과 (2026-07-13, CDP 자동)** — 단어 편집·저장 후 분석 패널 hidden·children 0으로 초기화, undo 활성(문서 변경) 확인. API quota와 무관하게 독립 검증 |
| 25-7 | 레퍼런스 AI 보강 | 레퍼런스 카드의 `AI 보강` 버튼 → 미리보기 → `적용` 시에만 활용 메모가 갱신되고, `취소`는 메모를 바꾸지 않음 | **인프라 검증됨** — enrich는 자막 분석과 동일한 `enrichPrompt`/`requestJson` 실제 200 경로를 공유(§25-f에서 확인)하고, 미리보기·적용·취소 로직은 단위 테스트(`reference-controller.test.ts`)로 커버됨. 라이브 레퍼런스 카드 walkthrough는 CDP 스텁 하네스 문제로 미완(기능 오류 아님, 콘솔 오류 0) — 활성 프로젝트에서 수동 최종 확인 |
| 25-8 | provider 미연결/동의 없음 안전 차단 | API 동의 없이 실행 시 전송 없이 안내만 표시되고 문서·메모 mutation 없음 | **Host 통과 (2026-07-13, CDP 자동)** — 동의 미체크 상태 클릭 시 `AI 자막 분석 실행 전 ... 동의가 필요합니다` 상태/로그 표시, 문서 메타 불변, 패널 hidden, 네트워크 전송 없음(동의 게이트가 fetch 이전에 차단), 콘솔 오류 0 |

### 25-a. CDP 자동 검증 방법과 발견 버그 (2026-07-13)

Windows에서 UDT 서비스(`ws://127.0.0.1:14001`)의 proxy 프로토콜(`{command:"proxy", clientId, requestId, message}`)로 Premiere 앱 클라이언트에 `Plugin.load`(dist 경로)→`Plugin.debug`(pluginSessionId)를 보내 CDP WebSocket(`/socket/cdt/<sessionId>`)을 얻고, `Runtime.enable`→`executionContextCreated` 대기→`contextId`를 지정한 `Runtime.evaluate`로 패널 DOM을 직접 검증했다. UXP CDT는 `awaitPromise`를 지원하지 않아 "동기 킥오프 → 외부 대기 → 동기 재조회" 패턴을 사용했다. SRT import는 `localFileSystem.getFileForOpening`을 세션 한정으로 스텁(원본 복원 확인 포함)해 실제 import 버튼 경로로 실행했다.

이 과정에서 **실제 Host 전용 버그 1건을 발견·수정**했다.

- **자막 큐 리스트 stale row 중복(High)** — Premiere 26.3 UXP `replaceChildren()`이 재렌더 시 stale 자식을 남기는 기존 §22 asset-list 버그와 동일 클래스가 자막 큐 리스트에서 재현됨. 2개 큐 import 후 실제 DOM `[data-cue-row]`가 3개(중복 cueId)로 관찰. Mock DOM은 `replaceChildren`이 정상이라 자동 테스트로는 검출 불가.
- **수정**: `subtitle-controller.ts`에 `clearElementChildren()`(removeChild 반복, mock은 replaceChildren fallback)을 추가해 큐 리스트·분석 패널 렌더에 적용, `reference-controller.ts` 목록 렌더와 `ui.ts` `renderEmptyState()`에도 동일 패턴 적용.
- **재검증**: 수정 빌드를 `Plugin.load`로 재로드 후 SRT import ×3 반복 — 매회 정확히 2 rows(중복 없음), 메타 `DOM 큐 2/2` 일치. 25-8 안전 차단도 수정 빌드에서 재통과.

### 25-b. 추가 CDP 검증 기록 — 2026-07-13 (진행 중)

- **테스트 시퀀스 생성**: 전용 스모크 프로젝트 `ShortFlow_HostSmoke_20260712`에 시퀀스가 0개라, §12 관례에 따라 공개 API(`project.createSequence("SF_CDP_SMOKE")` + `setActiveSequence`)로 테스트 시퀀스를 생성·활성화했다. 테스트 MP4 import 포함, 기존 콘텐츠 변경 없음.
- **FR-02(재생 위치→단어 하이라이트) Host 통과**: 활성 시퀀스 playhead 0초 상태에서 자막 편집기 첫 단어 chip("첫")에 `is-active`/`aria-current` 부여를 확인 — 패널 폴링→`findActiveSubtitle`→DOM 반영 경로가 실제 Host에서 동작.
- **FR-01(단어 클릭→playhead) Host 통과(재검증 완료)**: 테스트 MP4를 `SF_CDP_SMOKE` V1 0초에 삽입해 길이 4.96s 확보 후(§12 관례, console에서 `lockedAccess`+`executeTransaction`+`createInsertProjectItemAction` 경로 동작 확인), 자막 편집기에서 "두" 단어 chip 클릭 → 실제 playhead가 **정확히 1.3s로 이동**. `seekToWord`→`onSeek`→`setSequencePlayerPosition` 끝-끝 경로 실증. FR-02 하이라이트도 클릭 후 "두"로 이동 확인. 분석 결과 패널 seek 버튼(25-5)이 동일 `seekToWord` 경로를 사용하므로 배관은 선검증됨 — 남은 것은 live AI 결과 위 실제 버튼 클릭뿐.
- **자막 autosave 복원 Host 통과(R-011 근거)**: 플러그인 리로드 후 재import 없이 활성 시퀀스 projectKey 기준 autosave에서 2큐/8단어가 자동 복원됨.
- **flex 전환 광역 확인**: `asset-search-input` 41×34 렌더(수정 전 0×0) — `.browser-toolbar` 전환 유효.
- **썸네일 SVG fallback 실파일·token 3종 Host 통과(§23/§24 pending 해소)**: 폴더 선택기를 실제 UXP temp 폴더로 스텁해 정식 버튼 경로로 검증 — ① `ShortFlow_Thumbnail_*.svg` 실파일 생성, 내용 `width="1280" height="720"` XML 확인 ② 2차 저장에서 `getFolder` 미호출로 persistent token 재사용 확인(53자 token localStorage 저장) ③ 쓰레기 token 주입 후 3차 저장에서 기존 token 폐기→폴더 재선택 1회→새 token 저장→3번째 SVG 생성으로 만료 복구 경로 확인. Canvas 제한 안내(PNG/JPG 비활성)는 §23대로 유지 표시됨.
- **API 키 입력 필드 키보드 불가(사용자 제보) → 원인 확정·수정 완료(2026-07-13)**: 마스킹 이벤트 로거로 사용자 실클릭을 관찰한 결과, 클릭이 input에 한 번도 도달하지 않았고(주변 SPAN/P만 타깃) input들의 실측 rect가 전부 **0×0**이었다. 이중 근본 원인:
  1. **UXP가 `input[type="text"]` 등 속성 선택자 규칙을 적용하지 못함** — 공유 사이징 규칙(width/height/border)이 input에만 미적용. bare `input` 선택자로 전환해 해결(checkbox는 후행 `.checkbox-row input` 1×1 규칙이, range는 명시 리셋이 덮어씀). 전환 후 `subtitle-translate` input이 117×34로 복구된 것으로 1차 확인.
  2. **UXP가 `display: grid` 컨테이너를 0×0으로 붕괴시킴**(§14 `.two-column-layout`에서 이미 확인된 것과 동일) — `.form-grid`·`.browser-toolbar`·`.safe-zone-box-controls`·`.final-qc-waiver`·`.thumbnail-inspector`(media)·`.subtitle-reflow-controls`(media) 6곳을 flex-wrap 등가 레이아웃으로 전환.
  - 수정 빌드 재로드 후 실측: `ai-api-key-input` 254×34, `ai-model-input` 254×34, `subtitle-max-chars-input` 62×34 — 클릭·입력 가능 상태로 복구. 런타임 `<style>` 주입은 UXP에서 반영되지 않아(주입 실험 무효과) 스타일시트 수정+리로드로만 검증 가능했다.
  - 부수 확인: CDT에 `Input.dispatchKeyEvent` 도메인 없음(원격 키 주입 불가), 프로그램적 값 설정+`input` 이벤트는 정상(저장 경로 무결), 패널이 OS 포커스가 없을 때 `document.activeElement`는 null.
  - 남은 grid 사용처(입력 미포함 표시용 다수)는 시각 이상 시 개별 판단. 사용자 실타이핑 최종 확인은 새 API key 입력 시점에 수행.

### 25-c. AI 작업 큐 `queueMicrotask` 미정의 버그 — 발견·수정(2026-07-13, Critical)

사용자가 실제 API key + 동의를 저장한 뒤 B-1~B-4를 CDP로 구동한 결과, 자막 분석 3종이 **네트워크 호출 전에** `queueMicrotask is not defined`로 즉시 실패했다. `src/job-queue.ts`의 `scheduleDrain()`이 `queueMicrotask` 전역을 직접 호출했는데, Premiere 26.3 UXP(uxp-9.3.0) 런타임에는 이 전역이 없다.

- **영향 범위: Critical** — 자막 분석뿐 아니라 `aiQueueController.run()`을 경유하는 **모든 AI 작업**(이미지 편집, TTS, STT, 자막 reflow/review/translate)이 실제 Host에서 첫 실행 시 전부 실패한다. 라이브 AI 큐 작업이 이번에 처음 실행돼서 드러난 잠복 버그이며, Mock/Node 환경에는 `queueMicrotask`가 있어 자동 테스트로는 검출 불가.
- **수정**: `scheduleMicrotask()` 헬퍼 도입 — `globalThis.queueMicrotask`가 있으면 사용, 없으면 `Promise.resolve().then()`으로 대체. 회귀 테스트 추가(`tests/job-queue.test.ts`: `queueMicrotask` 전역을 삭제한 상태에서도 큐가 정상 드레인·성공하는지 검증). `npm run check` 1060/1060.
- **수정 후 재검증(라이브)**: 동일 CDP 구동에서 이제 실제 `POST https://api.openai.com/v1/responses`가 발생함을 fetch 스파이로 확인(수정 전 0건 → 수정 후 전송). 즉 동의 게이트 → 큐 드레인 → HTTPS 전송 경로가 끝까지 동작한다.
- **응답 렌더 미확인 사유(코드 아님)**: 사용자 OpenAI 계정이 **429 quota 초과**("You exceeded your current quota")를 반환해 AI 결과 자체는 아직 못 봤다. 429는 retryable로 처리돼 2회 재시도 후 quota 메시지를 상태에 노출했고(**key/Authorization 노출 0**), 이 경로도 정상이다. 25-2~25-5의 실제 결과 렌더 확인은 **결제 quota 해소 후** 재구동 필요.
- **부수 통과**: B-4(25-6, 편집 시 분석 결과 무효화)는 API와 무관하게 라이브 통과.
- **후속 개선(2026-07-13)**: quota 429가 2회 재시도되며 매 요청 ~40초씩 지연되는 것을 관찰해, `insufficient_quota`를 rate limit과 분리해 **재시도 없이 즉시 실패**하도록 수정(`src/openai-text.ts` `isRetryableHttpStatus`, `src/job-queue.ts` `defaultTransientError`가 명시적 `retryable:false` 존중). Mock 테스트 3건 추가. **quota 초과 계정을 픽스처로 라이브 재검증**: 동일 클릭이 수정 전 40초·fetch 3회 → 수정 후 **1.0초·fetch 1회**로 즉시 실패. `rate_limit_exceeded` 429는 계속 재시도 유지.

### 25-g. 전체 UX/UI 컨트롤 감사 — 버튼 grid 붕괴 4곳 발견·수정(2026-07-13)

사용자 요청으로 12개 탭 전체 인터랙티브 컨트롤(212개)을 CDP로 감사(존재·라벨·비활성 상태·렌더 크기·중복 id·숨김). 이전 입력 스윕(§25-d)은 input만 봤으나 이번엔 **버튼**까지 포함해, 좁은 패널(실측 320px 도크)에서 `display:grid` 컨테이너가 0폭으로 붕괴해 **주요 버튼이 안 보이던 4곳**을 새로 발견했다.

- **export 탭**: `.file-picker-stack`·`.export-action-grid` grid 붕괴 → 프리셋 선택·출력 폴더·영상 내보내기·커버 저장 버튼 4개가 0×0(내보내기 탭 사실상 사용 불가). flex로 전환.
- **복구(로그 탭)**: `.recovery-list` grid 붕괴 → "복제본 제거" 버튼 0×0. flex column으로 전환.
- **자막 편집기(voice 탭)**: `.subtitle-cue-header` grid 붕괴 → 큐 액션 버튼(합치기/나누기/켜짐) 0×0. flex-wrap으로 전환(time이 남는 폭 차지, 액션은 줄바꿈).
- 재감사: 12탭 전부 클린 — 0×0·무라벨·중복 id 전부 0, 표시 컨트롤 209개, 콘솔 오류 0. `npm run check` 1515/1515.
- 숨김 3개는 썸네일 AI 카드(`.thumb-ai-card { display:none }`, 내부 베타 의도적 비활성)로 정상.

### 25-f. 자막 AI 분석 실제 OpenAI 200 응답 검증 — Host 통과(2026-07-13)

앞서(§25-c) OpenAI 계정 429 quota로 응답을 못 봤으나, quota 해소 후 실제 200 응답으로 분석 3종을 재검증했다. 처음엔 사소한 2큐 테스트 문구라 하이라이트가 비었고(정상 — 강조할 내용 없음), 응답 본문을 캡처하려던 fetch 스파이가 UXP 응답 스트림을 잠가("stream is locked") "응답이 비어 있음" 오탐을 냈다. **스파이 없이 내용 있는 4큐 인터뷰 SRT**로 재실행한 결과 전 경로가 정상 동작했다.

- **interview-highlight**: 하이라이트 4개, 각 항목이 문서의 실제 cueId(`cue_0a6fk7h` 등)와 정확히 일치하는 활성 seek 버튼 + 근거 문장("재능보다 꾸준함을 강조하는 가장 quotable한 문장입니다"). `validateHighlightResponse`의 cueId 필터가 과도하게 거르지 않음(시스템 프롬프트가 문서 cueId를 정확히 지시).
- **edit-outline**: 세그먼트 4개, 순서·라벨("1. 아침 운동 루틴")·근거·cue 버튼.
- **youtube-metadata**: 실제 제목("3년 동안 새벽 5시 운동한 사람의 꾸준함 비결")·설명·태그 15개.
- 콘솔 오류 0건. `gpt-5.4-mini` 추론 모델의 `output` 배열(첫 항목 빈 reasoning + 둘째 message)에서 `responseText`가 message의 `output_text`를 정상 추출함을 실제로 확인(Mock은 단순 `{output_text}` 형태만 검증했음).
- 남은 것: seek 버튼 클릭 시 실제 playhead 이동은 활성 시퀀스 필요(25-5), 레퍼런스 프롬프트 보강(25-7)은 별도.

### 25-e. index.ts 모듈 분리 후 런타임 스모크 — Host 통과(2026-07-13)

index.ts를 2,234→1,335줄로 축소하며 6개 패널 모듈(text-encoding·recovery-panel·diagnostics-panel·ai-settings-panel·asset-browser-panel·markers-qc-panel)로 분리한 뒤, 분리 빌드를 실제 Premiere 26.3 패널에 CDP로 재로드해 부트스트랩 와이어링 회귀를 검증했다. Mock/`npm run check`(1515 green)로는 잡히지 않는 런타임 결합을 확인하는 단계다.

- **통과**: 패널 로드("ShortFlow Studio가 준비되었습니다"), 12개 탭 전부 표시. 추출된 패널의 초기 렌더가 정상 — recovery-panel 저널 카운트 `2 / 50`, diagnostics-panel 대기 상태 "아직 진단을 실행하지 않았습니다.", ai-settings-panel 배지 "API 키 저장됨"(secureStorage 지속). 12개 탭 전부 입력 렌더 0×0 회귀 없음(§25-b·d 수정 유지). **콘솔 오류 0건** — 분리로 인한 import/런타임 오류 없음.
- 결론: 팩토리+주입 방식의 모듈 분리가 런타임 동작을 바꾸지 않음을 실제 Host로 확인.
- **host 작업 회귀까지 확인**: 활성 시퀀스 `SF_CDP_SMOKE`(1920×1080·00:04)로 분리된 `markers-qc-panel`의 QC 스캔을 실행 — 시퀀스·프레임·트랙(비디오 3·오디오 4)·캡션·이름 검사가 실제 시퀀스 값으로 렌더되고, 세로 규격 불일치("1080×1920로 맞춰 주세요")를 정확히 지적. 즉 추출 패널이 렌더뿐 아니라 실제 Premiere host 작업도 정상 수행. 콘솔 오류 0.

### 25-d. 전체 탭 입력 렌더 스윕 — 썸네일 탭 grid 붕괴 발견·수정(2026-07-13)

§25-b(입력 0×0) 수정이 다른 탭에도 남아 있는지 CDP로 12개 탭 전체의 input/select/textarea 렌더 크기를 스윕한 결과, **썸네일 탭에서만 표시 입력 대부분이 0×0**으로 남아 있었다(다른 11개 탭 정상). 조상 체인 실측으로 붕괴 컨테이너를 특정했다.

- `.thumbnail-workspace`(2열 grid), `.thumbnail-main-column`(단일열 grid), `.effect-stack`(grid) 세 컨테이너가 UXP에서 0px로 붕괴 → 내부 입력 전부 연쇄 0×0. asset/speech/automation workspace grid는 같은 환경에서 정상이라(스윕 근거) 관찰된 이 셋만 flex 등가로 전환했다.
- `.color-field` 안의 color 입력은 추가로 고정 크기(33×33)를 클래스 기반 규칙으로 부여(그림자·글로우 색상). 수정 후 실측 33×33 확인.
- 재스윕: 표시 입력 0×0 잔여 0건. 남는 `thumb-ai-preset-select`·`thumb-ai-prompt-input`은 `.thumb-ai-card { display:none }`(내부 베타에서 숨긴 썸네일 AI)이라 의도된 0×0. `npm run check` 1063/1063.

즉시 차단 조건(신규 기능):

- 읽기 전용 분석 3종 중 하나라도 자막 문서를 변경(cue/word/timing 변동)하면 즉시 차단
- 프롬프트 보강이 `적용` 없이 활용 메모를 덮어쓰면 즉시 차단
- 결과 패널·미리보기에 API key/Authorization/전체 로컬 경로가 노출되면 즉시 차단

### 25-h. 썸네일 AI Canvas 비의존 입력(Phase 1b) — 코드 경로 Host 확인·해피패스 사용자 게이트(2026-07-13)

Phase 1(§deferred-ai-features)에서 썸네일 이미지 AI UI를 켰으나 실행 시 `detectCanvasLimit`가 발동해 하드 차단됐다(§원인: UXP Canvas가 합성 PNG 래스터화 불가). Phase 1b에서 **Canvas 제한이면 선택 레이어의 원본 이미지 바이트를 gpt-image-2 입력으로** 쓰도록 `runAI`를 분기하고 `onAIRequest` 포트를 `ThumbnailAIInput{bytes,mimeType,filename}`으로 바꿨다(커밋 ccc1c12 외).

CDP 검증(`cdt-thumb-ai-1b.mjs`, 새 dist reload):

- Canvas 제한 상태 유지(`thumb-export-btn` disabled), AI 카드 노출·preset/prompt/run 활성, **콘솔 오류 0**.
- 레이어 0개(빈 상태)에서 `AI 보정 실행` → **새 분기 메시지** 토스트: "편집할 이미지가 없습니다. 먼저 '소스 추가'로 이미지를 불러온 뒤 실행해 주세요. 현재 환경은 합성 미리보기를 만들 수 없어(…) 선택한 레이어의 원본 이미지를 편집합니다." — 이전의 하드 차단("입력 이미지를 만들 수 없습니다")에서 **원본 편집 경로로 전환됐음을 확인**. (주의: `#thumbnail-layer-list`의 자식 수는 빈 상태 플레이스홀더를 포함하므로 레이어 유무 판정에 쓰지 말 것.)
- **해피패스(사용자 게이트)**: 이미지 import는 네이티브 파일 피커라 CDP(UXP CDT는 `Input.*` 도메인 없음)로 구동 불가. 실제 200 왕복 검증은 사용자가 ⑴ 썸네일 탭 `소스 추가`로 이미지 선택 ⑵ 프리셋 선택 후 `AI 보정 실행` ⑶ 편집 결과가 새 레이어로 추가되는지 확인해야 한다. quota 해소·키 저장 상태이므로 조작만 하면 200 경로가 돈다.

즉시 차단 조건(썸네일 AI):

- Canvas 제한 시 원본 바이트가 아니라 빈/합성 바이트를 보내면 즉시 차단(합성은 Canvas 없이는 불가하므로 반드시 원본이어야 함)
- gpt-image-2에 png/jpeg/webp 외 mime나 확장자 불일치 filename을 실으면 즉시 차단(`editImage` 거부 전에 컨트롤러가 걸러야 함)

### 25-i. 레퍼런스 AI 이미지 생성(Phase 3) — Host 통과, Host 전용 버그 2건 발견·수정(2026-07-13)

레퍼런스 보드에 프롬프트→이미지 생성(gpt-image-2 `images/generations`)을 추가했다. 생성 바이트를 UXP `getDataFolder()`(네이티브 피커 불필요)에 `ai-gen-<ts>.png`로 쓰고 `addEntries`로 레퍼런스에 추가한다(출처 "AI 생성 (gpt-image-2)"). CDP로 해피패스까지 자동 검증 가능(피커 없음).

**CDP 검증(`cdt-ref-unique.mjs`)**: 프롬프트 입력·size select 미조작 상태에서 실행 → AI 큐에 이미지 작업 `running` 생성 → ~36초 후 **레퍼런스 미리보기 추가(previews=1)**. 즉 실제 gpt-image-2 200 → 데이터 폴더 PNG 쓰기 → `addEntries` → 카드 렌더까지 **전 경로 Host 통과, 콘솔 오류 0**.

이 과정에서 단위 테스트로 못 잡는 **Host 전용 버그 2건**을 CDP로 찾아 고쳤다.

1. **UXP `<select>.value` undefined → `valueOf(...).trim()` 크래시.** 사용자가 size 드롭다운을 건드리기 전 `.value`가 undefined라 `valueOf`가 throw → 생성 작업이 큐에 생기지도 않고 "Cannot read properties of undefined (reading 'trim')"로 실패했다. 진단 단서: 스크립트가 size 값을 명시 설정한 런에서만 작업이 생성됐다. 수정 — `element(...).value ?? ""`로 방어적 읽기 + 첫 옵션 `selected`. (테스트 하네스의 FakeElement는 `.value=""` 기본이라 못 잡음 → undefined 케이스 단위 테스트 추가.)
2. **기본 60초 타임아웃 < gpt-image-2 생성 시간.** size를 설정해 작업이 실제 실행된 초기 런은 "OpenAI API 요청 시간이 초과되었습니다"로 실패(재시도까지 각 60초라 버튼이 100초+ 잠긴 것처럼 보임). 수정 — 생성 요청 `timeoutMs: 120초` + 품질 `high`→`medium`(레퍼런스 용도 충분·응답 빠름) + 큐 `maxRetries: 1`.

교훈: fetch 상태 스파이는 클라이언트가 스파이 설치 **전** 생성되면 원본 `fetch`를 잡아 요청을 놓친다(오해 유발). 상태는 **AI 큐 패널의 작업 행**(`.ai-job-row is-<state>`)에서 직접 읽는 것이 정확하다. 또 큐는 reload 후에도 작업을 저장하므로, 낡은 실패 작업과 해시 충돌을 피하려면 **유니크 프롬프트**로 검증한다.

즉시 차단 조건(이미지 생성):

- 생성 결과가 png/jpeg/webp가 아니거나 `assertPngResponse` 실패면 즉시 차단
- 생성 바이트를 파일로 쓰지 않고 raw 바이트만으로 레퍼런스에 넣으려 하면 즉시 차단(레퍼런스는 token+nativePath 필수)
- 출처가 "AI 생성"으로 기록되지 않으면 즉시 차단(권리 추적 무결성)

### 25-k. 시퀀스 오디오→STT(gap-3) — 오디오 추출 Host 통과(2026-07-13)

참고 플러그인 대비 gap-3: 파일 선택 없이 활성 시퀀스 오디오를 추출해 STT. `exportVideo`(EncoderManager.exportSequence, 이미 존재)에 **번들 오디오 EPR**(`public/presets/shortflow_audio_16k_mono.epr`, 16kHz 모노, `getPluginFolder`로 피커 없이 접근)을 물려 데이터 폴더로 export → 읽어 `speechController.transcribeMediaBytes`로 기존 STT 경로 재사용.

**CDP 검증(`cdt-seq-stt.mjs`)**: TTS·STT 탭 "시퀀스에서 자막 생성" 버튼 렌더(254×34, grid 붕괴 없음) → 클릭 시 SF_CDP_SMOKE(4초)의 오디오가 **`SF_CDP_SMOKE_*.wav · 0.2MB`로 추출·읽혀 STT 입력으로 설정됨**(콘솔 0). 즉 **UXP 시퀀스 오디오 export가 동작**(Web Audio/Canvas와 달리 벽 없음). STT 완료는 출력 폴더(네이티브 피커)+실제 전사 API라 기존 STT 흐름과 동일한 사용자 게이트.

- 16kHz 모노 WAV ≈ 0.05MB/s → Whisper 25MB 상한에서 약 8분. 더 긴 것은 In/Out 범위(`range:"inout"`) 또는 후속 MP3 압축 필요.
- 즉시 차단 조건: 추출 오디오를 STT에 넘길 때 원본 바이트가 아닌 빈/변조 바이트를 넘기면 차단.

### 25-l. 고급 클립 모션(gap-2) — UI·배선 Host 통과, 키프레임 적용 사용자 게이트(2026-07-13)

참고 플러그인 모션 탭 이식: 선택 비디오 클립에 방향별 등장/퇴장 슬라이드 + easing(linear/ease-out/spring/bounce) + 선택적 불투명도 페이드. `src/motion.ts`(순수: easing 곡선·fps 샘플·slidePosition·motionOpacity)로 키프레임 값을 계산하고, premiere.ts `applyClipMotion`이 클립 Motion **position**과 **Opacity** 파라미터에 `createAddKeyframeAction`(Keyframe.position=TickTime)으로 적용(reframe의 검증된 컴포넌트 탐색 확장, **QE 아님**). Premiere 내장 보간은 Linear/Bezier뿐이라 spring/bounce는 촘촘한 샘플로 근사.

**CDP 검증(`cdt-motion.mjs`)**: 숏폼 탭 "클립 모션" 카드 렌더(kind/direction/easing/duration/fade/버튼 모두 254×34, grid 붕괴 없음) → "적용" 클릭 시 `allVideoItems("selected")`까지 정상 도달해 "비디오 클립을 선택해 주세요" 안내(콘솔 0). **실제 키프레임 쓰기는 선택된 비디오 클립이 필요** — UXP CDT가 ppro 선택을 못 몰아(awaitPromise·Input 도메인 없음) 사용자가 타임라인에서 클립 선택 후 검증. 위치 좌표계는 정규화(|x|≤2→center 0.5)·픽셀 자동 감지해 슬라이드 스케일 조정.

- 좌표계·키프레임 시간(클립 상대 0-based) 가정은 실제 클립으로 최종 확인 필요. 어긋나면 위치/타이밍 보정.
- 즉시 차단 조건: 기존 위치/불투명 키프레임을 파괴적으로 덮어써 원본 애니메이션을 잃으면 차단.

### 25-j. BGM 비트 분석(Phase 5c) — Host 통과 + Web Audio 부재 발견(2026-07-13)

음악/SFX 자산 카드에 "비트 분석" 액션을 추가했다(선택 WAV → BPM·비트 수 표시).

**중요 Host 능력 발견(`cdt-audio-probe.mjs`)**: **UXP Premiere에 Web Audio가 전혀 없다** — `AudioContext`/`OfflineAudioContext`/`webkitAudioContext` 모두 false, `decodeAudioData` n/a, `FileReader`도 없음(Canvas와 동일한 벽). 오디오 파일을 PCM으로 디코딩할 네이티브 경로가 없어, **WAV은 RIFF 헤더에서 직접 파싱**(`src/wav-pcm.ts`)해 우회한다. MP3/AAC 등 압축 포맷은 디코더가 없어 미지원(카드에서 "WAV만 지원" 안내).

**CDP 검증(`cdt-beat-analyze2.mjs`, `cdt-beat120.mjs`)**: 자산 루트 동기화 → 오디오 카드마다 "비트 분석" 액션 렌더 → 클릭 시 실제 분석. `shortflow_smoke.wav` → 156.2 BPM, **합성 120 BPM WAV(`host-smoke-assets/Music/beat-test-120bpm.wav`) → 120.2 BPM(정확)**, 콘솔 오류 0. 즉 WAV 읽기(`readAssetPreviewBytes`) → `parseWavPcm` → `detectBeats` 전 경로 Host 통과.

- 재사용 스모크 자산: `host-smoke-assets/Music/beat-test-120bpm.wav`(gitignore 폴더, 합성 120 BPM 클릭). 비트 검출 회귀 확인용.
- 남은 5d(자동 덕킹): 발화 구간 볼륨 엔벨로프 + 오디오 클립 Volume>Level 키프레임 적용. **키프레임 쓰기 가용성 미탐침** — 활성 시퀀스+오디오 클립 필요. 없으면(Canvas 패턴) 덕킹 계획을 마커/리포트로 출력.

**실제 음악 테스트로 드러난 알고리즘 버그·수정(2026-07-13)**: 사용자가 실제 곡(`Shining.mp3` → ffmpeg로 모노 44.1kHz WAV 변환)으로 테스트하자 옛 `detectBeats`(중앙값-IOI 방식)가 **BPM 0(불명확)** 을 반환했다 — 서브비트 온셋이 많은 실제 음악에서 IOI 변동계수가 커 템포를 못 찾음. 합성 클릭에만 맞던 것. **수정**: 온셋 강도(에너지 플럭스, DC 제거) 엔벨로프의 **자기상관**으로 우세 템포를 찾고, 피크/평균 비 ≥ 4로 비음악(노이즈·발화)을 거부, BPM에서 비트 그리드 생성. 실측으로 노이즈 3.60·발화류 3.89 < 음악(Shining 4.72)로 게이트 분리 확인. Host CDP(`cdt-shining.mjs`): **Shining.wav → 78 BPM, 252비트, 콘솔 0** (로컬 분석과 일치). 고속 템포(150)는 정수-lag 양자화로 옥타브 폴딩(74.5)될 수 있으나 음악 BPM 도구엔 허용. **MP3 자체는 여전히 미지원**(UXP에 디코더 없음) — 카드에서 "WAV만 지원" 안내, 사용자가 WAV로 변환하거나 후속으로 순수 JS MP3 디코더 도입 검토.

## 26. 야간 자율 작업(/goal) — 게이트 전용 버그 헌트·하드닝(2026-07-13 심야)

사용자가 "내일 아침 6시까지 승인 없이 가능한 작업 전부 진행" 지시. 이 시간대엔 **실 Premiere Host CDP 핸드셰이크가 불안정**(UDT 14001 포트는 OPEN이나 "Premiere 앱 클라이언트를 찾지 못했습니다")해 Host 검증이 불가능했고, 유료 API 호출(이미지·영상·STT 생성)은 사용자 수면 중이라 회피했다. 따라서 **게이트(`npm run check`)로만 검증되는 순수 로직·크래시 하드닝**에 한정했다.

**발견·수정한 실버그 3건(모두 커밋·양쪽 remote 푸시, 게이트 그린 유지)**:
- `3f756da` **UXP null `.value` 크래시 클래스를 소스에서 방어**: `src/ui.ts`의 `valueOf`가 `control.value ?? ""`를 반환하도록. UXP는 비었거나 사용자가 건드리기 전 `<input>/<select>.value`로 **null**을 돌려줄 수 있어, 이후 `.trim()/.normalize()` 호출이 크래시했다(연결 테스트 입력에서 실제 재현). 근본 원인 클래스.
- `22b1e07` **`numberOf` 빈 입력→fallback**: `Number("")===0`이라 빈 숫자 입력이 0으로 잘못 읽히던 것을, 빈 문자열이면 fallback을 쓰도록.
- `3ee819d` **모션 키프레임 클로버링 방지**: `applyClipMotion`이 이미 위치/불투명 키프레임이 있는 클립의 기존 애니메이션을 덮어쓰지 않도록 `isTimeVarying()` 가드 추가(있으면 보존 경고 후 skip).

**커버리지 보강**: `f89ef2f` `parseWavPcm` 8/24/32비트 정수 + 64비트 float 디코더 분기 테스트(부호 확장 포함).

**`.value` 크래시 클래스 전수 스윕(코드만, 이번 세션)**: `src/**`의 모든 직접 `.value` 읽기를 추적한 결과 **잔존 인스턴스 0** 확인. 안전한 이유별 분류 — 인라인 `?? ""`(reference-gen·final-qc reason·subtitle `value()`), 조기 null 체크(`if (!code) throw` — final-qc 예외코드), `typeof === "string"` 체크(speech TTS 글자수), 소비자가 `unknown` 타입 + 정규화기(`normalizedText`가 subtitle `editWord`를, `notesValue`/`sourceValue`가 reference `updateMetadata`를 흡수). subtitle-controller 947행은 `editor?.value ?? ""`, 964행은 `editor.value`로 표면상 불일치하나 둘 다 `normalizedText`의 `unknown` 가드로 안전 — 고장난 게 아니라 건드리지 않음.

**게이트 최종 확인**: `npm run check` — typecheck+lint+build 통과 후 **테스트 1584/1584 pass, 0 fail**. 커밋된 HEAD(`22b1e07`) 그린 확정.

**아침에 사용자 눈이 필요한 항목(게이트로는 못 닫음, 실 Premiere 필요)**:
- [ ] 썸네일 AI 편집 해피패스(네이티브 파일 피커 — CDT로 못 몲, §25-h)
- [ ] 레퍼런스 Sora 영상 생성 실제 유료 호출 1회(비용 발생, §20)
- [x] 선택 클립에 모션 키프레임 실제 적용 확인(§25-l) — **완료(§27-b): Host 버그 2건 수정 후 Position 16 + Opacity 16 키프레임 검증**
- [ ] 5d 자동 덕킹: 오디오 클립 Volume>Level 키프레임 쓰기 가용성 + dB→Level 값 매핑 탐침(활성 시퀀스+오디오 클립 필요, §25-j). **이 매핑이 검증 안 된 채로 Host 코드를 쌓지 않기로 함** — 실 클립 없이는 미검증 코드만 늘어남.
- [ ] gap-3 STT 완주(출력 폴더 지정 후 실제 전사, §25-k)

## 27. Host 링크 복구 후 실 Premiere 검증 재개(2026-07-14 새벽)

사용자가 한밤에 깨어 Premiere를 재실행("실제 host 테스트 및 모든 가능한 테스트 진행", 이후 "승인 필요하면 무조건 허용"). 재실행만으로는 UDT↔Premiere 개발자 브리지가 곧장 안 붙었으나(포트 OPEN·앱 클라이언트 미등록), 백그라운드 감시자(`cdt-watch.mjs`)가 부팅 완료 t+58s에 `client=1 appId=premierepro` 재등록을 감지해 자동 재개. 활성 프로젝트 `ShortFlow_HostSmoke_20260712`는 열렸으나 **시퀀스 0개**(재실행 시 미저장 스모크 시퀀스 소멸) — `project.createSequenceFromMedia`/`importFiles`/`TrackItemSelection`로 테스트 시퀀스를 프로그램적으로 구성해 검증했다.

### 27-a. 레퍼런스 보드 카드 0×0 붕괴 — 실버그 발견·수정·Host 검증(`67817a8`)
재실행 후 회귀 스모크가 레퍼런스 탭에서 0×0 입력 3개(`reference-source/notes/tags-editor`)를 잡았다. 조상 추적 결과 부모 `.reference-board`(284px)는 정상인데 자식 `.reference-list`(`display:grid`, `repeat(auto-fill, minmax(138px,1fr))`)가 0×0으로 붕괴 — **flex 아이템 안의 grid가 트랙을 해석 못해 붕괴하는 UXP 버그**(§25-b `.form-grid`와 동일 계열, 단 다른 탭 그리드는 정상이라 보편 버그 아님). 항목이 있을 때만 나타나(카드가 있어야) 이전 감사에서 놓친 것. **수정**: `.form-grid` 선례대로 `flex-wrap`+`.reference-card { flex: 1 1 138px }`. **Host 검증(fresh 로드)**: 리스트 254×350, 카드 236×332, 편집기 220×34~44, 0×0 잔존 0, 콘솔 0.
- **오탐 주의**: 같은 스모크에서 voice/brand/thumbnail이 전 입력 0×0으로 뜬 건 **탭 전환 리플로우가 300ms 안에 안 끝난 측정 아티팩트**. 1초 정착 후 2라운드 재측정에서 전부 ✅(패널 display:block, 폭 284). 스모크의 탭 전환 대기(300ms)가 UXP엔 부족 — 실버그는 레퍼런스뿐.

### 27-b. 클립 모션 키프레임 — Host 전용 버그 2건 발견·수정·엔드투엔드 검증(`31e5c71`)
gap-2 모션은 그동안 "UI·배선만 검증, 키프레임 적용은 사용자 게이트"였다(§25-l). 이제 API로 시퀀스+클립을 만들어 실제 적용을 구동하니 **토스트는 "적용했습니다"인데 키프레임이 0개**였다. CDP introspect로 두 버그를 특정:
1. **위치 값 형식**: `keyframeValue(await position.getStartValue())`가 `{x,y}`가 아니라 **`[x,y]` array-like PointF**(keys `["0","1","length"]`)를 돌려준다(실측). `buildClipMotionActions`는 `"x" in restValue`로 검사해 항상 "위치 값 형식 인식 못함"→0액션. `readPointF`(양쪽 형식 정규화) 헬퍼 추가, `centeredPosition`도 경유시켜 **reframe 중앙정렬의 동일 잠재 버그도 수정**.
2. **time-varying 활성화 누락**: `createAddKeyframeAction`은 파라미터가 time-varying이어야 동작한다. 이전 세션의 "addKeyframe가 자동 활성화" 가정은 틀렸고 `createSetTimeVaryingAction(true)`가 실재·필수. 없으면 트랜잭션은 성공 커밋되나 키프레임이 전부 드롭. position/opacity 키프레임 앞에 `createSetTimeVaryingAction(true)` 선행 액션 추가.
- **Host 실측 검증**: 깨끗한 9:16 클립(`host-smoke-assets/shortflow_host_smoke_9x16.mp4`로 `createSequenceFromMedia`) → 모션 UI 적용 → **Position 16 + Opacity 16 키프레임, isTimeVarying true**(fresh 세션 `getKeyframeListAsTickTimes`로 확정), 콘솔 0.
- **키프레임 버그 감사**: `createAddKeyframeAction` 사용처 전수 확인 — 펀치인 scale(premiere.ts:2151)은 이미 `createSetTimeVaryingAction(true)` 선행(§20에서 검증됨), 모션만 누락이었다. `createSetValueAction`(정적 값) 경로는 setTimeVarying 불필요. **모션만 버그, 수정 완료.**
- 유닛 커버리지: `readPointF`(`{x,y}`/`[x,y]`/malformed) + `centeredPosition` array-like 케이스 추가. 게이트 1584→**1588/1588**.

### 27-c. 재사용 CDP 스크립트(이번 세션 추가, 스크래치패드)
`cdt-watch.mjs`(앱 클라이언트 재등록 감시·발견 시 exit0), `cdt-host-state.mjs`(활성 프로젝트/시퀀스/클립/선택), `cdt-motion-setup.mjs`(9:16 임포트→`createSequenceFromMedia`→선택), `cdt-motion-apply.mjs`(UI 적용+isTimeVarying 전후), `cdt-motion-check.mjs`(fresh 세션 키프레임 카운트). **핵심 패턴**: `awaitPromise` 신뢰 불가 → 비동기 ppro 호출은 전역 stash 후 폴링, 인라인 `.style` 변경 후 측정도 동기 리플로우 안 돼 stale(수정은 CSS 파일→fresh 리로드로 검증). Selection API는 `ppro.TrackItemSelection.createEmptySelection(cb)`+`sel.addItem`+`seq.setSelection`.

### 27-e. 핵심 기능 createShort Host 검증 — 정상(수정 불필요)
활성 시퀀스(모션 키프레임 있는 9:16 클립) 소스로 `create-short-btn` 클릭 → **`ShortFlow_9x16` 생성 · 1080×1920 · 00:05**, 시퀀스 3→4, 토스트 "숏폼 시퀀스를 생성했습니다", 콘솔 0. 로그 "위치 키프레임이 있는 클립은 중앙 정렬하지 않았습니다"는 소스 클립에 모션 키프레임이 있어 reframe 중앙정렬이 `isTimeVarying` 가드로 **올바르게 보존(skip)** 한 것 — reframe 경로(`buildReframeActions`→`centeredPosition`)가 정상 실행됨을 확인. (비키프레임 클립의 실제 중앙정렬 픽셀 이동은 스모크 클립이 이미 중앙이라 관찰 곤란하나, `centeredPosition`의 `[x,y]` 수정은 `readPointF`(모션 Host 검증) + 유닛 테스트로 커버됨.) `cdt-createshort.mjs`.

### 27-d. 위치 값 `[x,y]` 버그 체계적 감사 — safe-zone 정렬도 동일 버그(`271de9e`)
27-b에서 position 값이 `[x,y]` array-like임을 확인한 뒤, position 값을 읽는 모든 곳을 전수 감사했다. `translateSafeZonePosition`(premiere.ts:2242)도 `candidate.x`/`.y`를 직접 읽어 **safe-zone 정렬이 실제 Host에서 모든 클립을 건너뛰던(changed 0)** 세 번째 인스턴스였다. `readPointF`로 경유시켜 수정. 이제 position 값 reader 3곳(모션 `buildClipMotionActions`, reframe 중앙정렬 `centeredPosition`, safe-zone `translateSafeZonePosition`)이 모두 단일 `readPointF`를 통과한다. scale reader(1534·2145·2311)는 숫자라 `Number(keyframeValue())`로 무관. `readPointF`는 **strict**(x/y `typeof number` 요구) — 실측상 Host 배열 원소가 `Array(2) of typeof number`라 안전하고, safe-zone의 "문자열 좌표 거부" 계약도 보존. **모션 회귀 재검증**: strict readPointF로도 Position 16 + Opacity 16 키프레임 기록 확인 → 공유 헬퍼가 실제 Host `[x,y]` 숫자를 정확히 읽음을 확정. safe-zone는 `createSetValueAction`(정적 값)이라 setTimeVarying 불필요; readPointF 수정만으로 해결. 유닛 커버리지 `translateSafeZonePosition` `[x,y]` 케이스 추가, 게이트 **1589/1589**. (safe-zone 전용 UI 드라이브는 미실시 — 공유 헬퍼가 모션으로 Host 검증됐고 [x,y] 유닛 테스트가 있어 신뢰 충분.)

## 28. 초점(focal point) 기반 리프레임 — 상용화 하드닝 신규 기능·Host 검증(2026-07-14)

사용자 요청 "숏폼 제작 논리를 진짜 상용화 가능하게 탄탄하게"에 대해, 리프레임 로직을 정독해 최대 취약점을 특정했다. 기존 `buildReframeActions`는 fill(크롭) 모드에서 클립을 **무조건 프레임 중앙**(`centeredPosition` → `targetW/2, targetH/2`)에 놓아, 16:9→9:16 변환 시 화면 중앙에서 벗어난 피사체(말하는 사람·자막·액션)가 크롭돼 사라졌다 — 실제 콘텐츠 대부분이 비중앙 구도라 상용 품질의 #1 결함. 사용자가 4개 하드닝 방향 중 **"초점 기반 리프레임"**을 선택.

### 28-a. 구현
- **순수 함수 `focalReframePosition(value, tW, tH, sW, sH, fx, fy)`**(premiere.ts): fill 시 소스/타깃 **종횡비만으로** 넘치는 축의 오버플로를 구하고(`sourceAspect/targetAspect - 1` 등, Premiere scale 값과 독립), 초점 좌표(0~1)만큼 위치를 밀어 피사체를 프레임에 유지한다. `(0.5-fx)×overflow` 이동량은 ±0.5×오버플로 범위라 여백이 생기지 않는다. 초점 (0.5,0.5)이면 `centeredPosition`과 동일 → 하위호환. 정규화/픽셀 판정은 `readPointF`+`|x|≤2` 관례 유지.
- **`buildReframeActions`**: fill 모드일 때만 `focalReframePosition` 사용, fit/none은 크롭이 없어 기존 `centeredPosition`(중앙). 기존 키프레임 클립 보존 가드는 그대로.
- **설정·UI 배선**: `CreateShortOptions.focalX/Y`(옵션), `PluginSettings.focalX/Y`(0~1 클램프·기본 0.5), index.ts `applySettingsToUI`/`syncSettingsFromUI`/`createOptions` 3곳, `public/index.html` `.focal-field`(수평·수직 range 슬라이더 0~100% + 실시간 위치 라벨 `updateFocalReadouts`), `public/styles.css` 커스텀 range 트랙/썸.
- 유닛 커버리지: `focalReframePosition` 8케이스(중앙=centeredPosition 일치, 좌/우 피사체 대칭 이동, 정규화 공간, 세로축 오버플로, 종횡비 일치 시 무이동, 초점 클램프, malformed 거부, 불변성) + settings 초점 클램프. 게이트 **1603/1603** green.

### 28-b. Host 검증 — 순수 함수 수학이 실제 Premiere 리프레임과 소수점까지 일치(결정적)
§27-e에서 "비키프레임 클립의 실제 위치 이동은 스모크 클립이 이미 중앙이라 관찰 곤란"이라 남긴 부분을 이번에 정확히 관찰해 냈다.
- **UI 렌더(올바른 `panel-short` 탭)**: `.focal-field` 254×133, `.focal-slider` 228×20, range `#focal-x-input` **200×20**(0×0 붕괴 없음), readout 82×17. 슬라이더 값 설정 시 라벨 `20% · 왼쪽`/`85% · 아래`, `localStorage.focalX=0.2 focalY=0.85` 반영, 콘솔 0. (초기 측정이 0×0으로 나온 건 기존 `cdt-createshort.mjs`가 create-short를 `qc` 탭으로 오인 — create-short는 실제 `panel-short`(`data-tab="short"`) 소속. 기존 create-short-btn·reframe-select도 같이 0×0이라 **제 CSS 회귀 아님**을 형제 비교로 확정.)
- **실제 리프레임 위치**: 미디어에서 `ClipProjectItem.cast`+`createSequenceFromMedia`로 **키프레임 없는 깨끗한 9:16 시퀀스** 생성 → 타깃 1920×1080(16:9)·fill·`focalY=0.2`(상단)로 create-short → 클론 V1 클립 Motion position = **`posY=1.1481481790542603`, `posX=0.5`**, 콘솔 0. 순수 함수 예측(세로 오버플로 2.1605, shiftY=(0.5−0.2)×2.1605=0.6481, posY=0.5+0.6481=**1.1481**)과 **소수점까지 정확히 일치**. posX=0.5는 세로→가로라 가로 오버플로 0 → 수평 중앙 유지(focalX=0.5). 이로써 reframe의 position 기록 경로가 비키프레임 클립에서 실제로 클립을 움직이는 것까지 엔드투엔드 확정 — §27-e의 미관찰 공백을 메움.
- 재사용 스크립트(스크래치패드): `cdt-focal-ui.mjs`(슬라이더 렌더·settings 반영), `cdt-focal-render.mjs`(올바른 탭 활성화 후 크기), `cdt-focal-clean.mjs`(캐스팅→깨끗한 시퀀스→리프레임→position 읽기). 테스트 아티팩트 시퀀스(`FocalClean_*`, `ShortFlow_9x16 2`)는 사용자 프로젝트에 잔존 — 기존 `SF_Motion_Test_*`와 함께 정리 대상(무해).

## 29. AI 하이라이트 → 자동 컷 파이프라인 — 상용화 자동 판단(2026-07-14)

사용자 요청 "자동 판단이 가능하게끔 구현 — 순수 함수(하이라이트+타임코드→구간) + 기존 일괄 생성 재사용 + Host 검증". 지금까지 컷 구간 근거는 전부 사람 신호(In/Out·선택·재생헤드·마커)였고 AI 분석은 `onSeek` 재생헤드 점프로만 연결돼 자동 컷 경로가 없었다(§28 답변). 이 기능이 그 한 가닥을 잇는다. 설계 `docs/02-design/features/highlight-auto-cut.design.md`.

### 29-a. 구현
- **순수 함수 `src/highlight-cut.ts` `planHighlightCuts(document, highlights, outline?, options?)`**: 자막 cue(타임코드)+`interview-highlight`(중요 cueId)+`edit-outline`(주제 그룹)을 랭킹된 숏폼 컷 후보로 변환. ① 보이는 cue 타임라인(문장 시작/끝 판정) ② 하이라이트 시간 근접 클러스터 ③ 목표 길이(min12/ideal30/max60초)로 앞뒤 확장·클램프 + 문장 경계 스냅 ④ 아웃라인 제목·가점 ⑤ 점수(밀도·훅·완결성·길이적합·아웃라인) ⑥ 겹침 제거(높은 점수 우선) ⑦ 상위 N. **결정적 순수**(같은 입력 같은 출력, I/O·host 없음).
- **컨트롤러 `SubtitleController.planAutoCuts(options?)`**: 신뢰 경계 유지 — `analysisProvider` 포트로 두 분석 실행, provider 반환을 `validateAnalysisResponse`로 검증한 뒤에만 순수 함수에 넘김. 문서 미변경(읽기 전용, undo/autosave 없음). displayed `analysisResult` 미오염.
- **index.ts 오케스트레이션**: `handleAutoCutScan`(consent→planAutoCuts→후보 렌더), `renderAutoCutCandidates`(AI 반환 제목·근거는 신뢰 불가라 `textContent`로만 주입 방지, 상위 5개 기본 체크), `handleAutoCutGenerate`(선택 후보→`MarkerSegment[]`→**기존 `createShortsFromMarkers` 그대로 재사용**→진행률·부분실패 보고). 숏폼 탭 `.autocut-card`.
- 유닛 13개(빈 하이라이트→[]·근접 병합·짧은 확장·max 클램프·문장 스냅·아웃라인 제목/가점·겹침 제거·상한·점수순·결정성·옵션 역전 클램프·단일 초장 cue). 게이트 **1616/1616** green.

### 29-b. Host 검증 — Tier1(카드·바인딩) 통과, 실제-AI 엔드투엔드는 사용자 게이트
- **Tier1(무료, `cdt-autocut-ui.mjs`)**: 숏 탭에서 `.autocut-card` **284×221**, `#auto-cut-scan-btn` **238×34**(텍스트 정확), candidates 컨테이너 hidden(0×0), consent 반영, 콘솔 오류 0. 카드 렌더·이벤트 바인딩 정상. (자막 autosave 키가 이미 존재해 유료 AI 호출은 생략.)
- **실제-AI 엔드투엔드는 자연히 사용자 게이트**: 자막 로드 경로(STT·SRT)가 전부 네이티브 피커라 CDP로 못 몰고, autosave 주입은 `deterministicHash`+`stableHash`+strict envelope 다중 재현이 필요해 취약. 대신 **모든 구성요소가 이미 독립 검증됨** — planHighlightCuts(유닛 13), `interview-highlight`·`edit-outline` 분석(이전 세션 실 200 응답 Host 검증, §25-f), `validateAnalysisResponse`(유닛), `createShortsFromMarkers`(기존 Host 검증 배치 경로). planAutoCuts는 이들을 잇는 얇은 글루(타입 검증됨)이고 Tier1이 UI 도달을 확인. Sora·썸네일 해피패스와 동일 관례(실 콘텐츠+유료 호출 필요 → 사용자 세션에서 검증).
- **남은 사용자 게이트 검증**: 실제 자막 로드된 시퀀스에서 "AI 하이라이트로 자동 컷" → 실 분석 200 → 후보 랭킹 렌더 → 선택 생성으로 여러 숏폼(초점 리프레임 포함) 생성.

## 30. AI 숏폼 플랜(모델 판단) + 샘플 스타일 학습 — 배선 완료·Host Tier1(2026-07-14)

§28 답변에서 "판단이 사람/마커/자막제안까지"였던 것을, 사용자가 "판단을 모델로 더 옮기고 내 샘플로 학습"으로 확장 지시(파인튜닝 아님 — few-shot 예시 학습). 설계 `docs/02-design/features/ai-shorts-plan-learning.design.md`. 순수 판단·학습 로직 25 유닛 + 배선 완료, 게이트 **1645/1645**.

### 30-a. 구현
- **Phase 1 판단**(`cfa4596`): `shorts-plan` 분석 액션 — 모델이 transcript에서 cueId집합+훅·제목·점수·근거로 숏폼 직접 제안. 순수 `segmentsFromModelPlan`이 검증·시간매핑·클램프·겹침제거. `planAutoCuts`가 shorts-plan 우선→실패시 기존 하이라이트+아웃라인 휴리스틱 폴백.
- **Phase 2 학습**(`f99e5e4`·`968ea34`·본 커밋): `alignShortToOriginal`(숏폼 전사→원본 cueId 역추적, 토큰 containment+coverage) → `buildStyleExample`→`formatStyleExamplesForPrompt`(few-shot) → `style-corpus`(영속 저장·정규화·상한 4). `handleAutoCutScan`이 코퍼스를 `planAutoCuts`의 styleExamples로 주입.
- **학습 UI**(숏 탭 자동 컷 카드): "현재 자막을 원본으로 지정" → 그 원본으로 만든 숏폼 자막 로드 → "숏폼으로 학습"(정렬→예시→코퍼스). 두 전사를 순차로 편집기에 올려 기존 STT/SRT 로드 재사용(별도 STT 플럼빙 불요).

### 30-b. Host Tier1(`cdt-learn-ui.mjs`, 무료)
- 학습 섹션 `.autocut-learn` **254×256**, 버튼 3개 각 238×34. "숏폼으로 학습" 버튼 초기 **비활성**(원본 미지정, 정확). `learn-status` "학습 예시 0개".
- 코퍼스 localStorage 주입 후 리로드 → `learn-status` **"학습 예시 1개"** 반영(loadStyleCorpus·정규화·renderLearnStatus 정상). 콘솔 오류 0.
- **실제-AI 엔드투엔드는 사용자 게이트**(관례): 자막 로드=네이티브 피커 + 유료 호출. 판단·학습 순수 로직은 25 유닛으로 고정, shorts-plan은 기존 분석 플럼빙(실 200 Host 검증 §25-f) 재사용, 폴백은 §29 검증된 휴리스틱. 남은 검증 = 실제 원본+숏폼 자막으로 학습→shorts-plan 실 200→스타일 반영 후보 확인.

## 31. 야간 /goal 자율 배치 — 자동 컷 상용화 연장(2026-07-14 심야)

사용자 /goal: "백로그 순서대로 모두 진행, 사용자 컨트롤/승인 필요한 건 최후순위, 2시간 자율, 필요시 서브에이전트". 게이트 green + 커밋 단위로 안전하게 진행.

- **A1 오디오 무음·에너지 순수 코어**(`src/audio-silence.ts`, 유닛5): RMS 곡선·무음 gap 검출·컷 스냅 프리미티브. 라이브 배선(시퀀스 오디오 추출)은 Host 오디오 필요라 후순위.
- **A2 자동 컷 → #sf 타임라인 마커**(`writeShortsMarkers`): 선택 후보를 활성 시퀀스에 #sf 코멘트 마커로 표시 → 기존 `scanShortMarkers`가 인식 → QC '마커 검색'으로 검토·생성 연결. 검증된 `createAddMarkerAction` 패턴(§21) 재사용. Tier1: 버튼 DOM 존재·바인딩·콘솔0(`cdt-markers-smoke.mjs`).
- **A4 distillStyleProfile**: 학습 예시→선호 길이 프로필 한 줄 가이드, few-shot과 함께 shorts-plan 프롬프트에 주입.
- **E1**: `tests/*.wav`·`docs/.pdca-snapshots/` gitignore(커밋 노이즈 제거).
- **C3 QA 감사**: 순수 로직(highlight-cut·shorts-plan·audio-silence·shorts-learning·premiere 리프레임/마커) 서브에이전트 읽기전용 감사 → 발견 사항 반영.

**후순위(사용자 세션·승인·리스크)**: A3 실 STT→자동컷(유료 STT), A5 단일 파일-쌍 학습 UX, C1 다양한 소스 리프레임(중첩 시퀀스 Host 검증 필요), C2 리프레임 후 미세조정 UI, B 실-AI 엔드투엔드, E2 CCX 최종화.

### 31-a. 추가 완료(같은 배치)
- **C3 QA 감사 수정 3건**(`47a6ceb`): highlight-cut의 죽은 minDuration 옵션(필터 하드코딩 →`>= minDuration`), shorts-plan end가 겹치는 cue에서 잘림(→max-end cue), audio-silence `positive()`가 명시적 0 거부(→`>=0` 허용). 회귀 유닛 4. (감사에서 나머지 순수 함수는 결함 없음 확인.)
- **A1 순수 통합**(`4d87f44`): `snapSegmentsToSilence` — 무음 gap이 주어지면 컷 경계 스냅. 남은 건 시퀀스 오디오 추출(Host)뿐.
- **D 순수 계층 + 마커 폴백 완성**(`c110d64`·`aa7a0c6`): `speechSpansFromCues`·`duckRangesFromEnvelope` 순수(유닛4) + `writeDuckMarkers`로 발화 구간을 'BGM 덕킹' 마커로 표시(자막→발화→엔벨로프→덕킹범위→마커). Host Tier1 통과(버튼 254×34·콘솔0, `cdt-duck-smoke.mjs`). **Level 키프레임 자동 적용(dB↔Level 매핑)만 후속 리스크로 남음.**
- 게이트 **1664/1664**. 이 배치 8커밋 전부 push.

## 32. 실제 방송 파일(newswide.mxf) 엔드투엔드 검증 + STT 폴백 수정(2026-07-14)

사용자 로컬 `C:\Users\seung\Videos\newswide.mxf`(20.5분 1080i 방송 MXF, 8ch)로 숏폼 제작 전 과정을 CDP로 실검증. 네이티브 피커는 `project.importFiles([path])`(경로 임포트)로 우회.

### 32-a. 전체 파이프라인 성공 (2개 구간)
- **구간1(0:30~5:30)**: ffmpeg로 5분 MP4 트림 → 임포트 → `newswide_src` 시퀀스 → **STT(whisper-1) 자막 39개**(구례군수 후보 인터뷰) → **AI 자동 컷 후보 3개**(0.90~0.95, 훅·제목·근거) → **숏폼 3개 생성**(리프레임, 초점 posX=0.932 확인) → 덕킹 마커 1개. 콘솔 0.
- **구간2(10:00~15:00)**: 동일 흐름 → STT → **자동 컷 후보 5개**(축산AI·악취·육아·교육·주거, 0.84~0.92) → **숏폼 5개 생성**. 다른 콘텐츠에서도 견고. 콘솔 0.
- 결론: "긴 방송 영상 → AI가 자막·구간·숏폼 자동 판단·생성"이 실파일로 처음부터 끝까지 동작.

### 32-b. STT 폴백 수정(실검증에서 발견)
- **기본 STT 모델 `gpt-4o-transcribe-diarize`가 이 방송 오디오에서 실패** — 두 양상: (1) 빈 원고(`EMPTY_RESPONSE`, 첫 시도) (2) 시간 초과(`TIMEOUT`, 큐 3회 재시도 ~360s 후). whisper-1은 같은 오디오를 ~1분에 정상 전사.
- **수정**: `runStt`가 `EMPTY_RESPONSE || TIMEOUT`이면 whisper-1로 1회 자동 폴백(`isEmptyTranscriptError`·`isSttTimeoutError` 순수 헬퍼, 유닛 6). **Host 검증**: 기본 diarize→timeout→[372s] "whisper-1로 다시 시도" 로그→whisper-1 성공. 커밋 `…`+`0b72849`.
- 유닛 테스트로는 절대 못 잡는, 실콘텐츠에서만 드러난 문제.

### 32-c. 남은 관찰(후속 최적화)
- diarize timeout 시 AI 큐가 3회 재시도해 폴백까지 ~6분 — diarize의 timeout 재시도 축소 여지.
- STT는 단일 Whisper 호출(25MB≈13분 상한) — 20분 전체는 청킹 필요(현재 미지원).
- 테스트 아티팩트: `Videos\newswide_5min.mp4`·`newswide_seg2.mp4`, 프로젝트에 `newswide_src`·`newswide_seg2` + 숏폼 8개(구간1 3 + 구간2 5) — 정리 대상(일부는 실사용 가능).

## 33. 인물 인식 자동 초점(subject-aware reframe) — 실검증·수정·프레임 증거(2026-07-14)

사용자 품질 피드백 "인물이 화면 가운데에 전혀 안 들어옴". 프레임 추출로 원인 확정: 초점이 사람 추측(정적 슬라이더 0.3)이었고, 멀티캠 인터뷰라 컷마다 인물 위치가 다름(후보 샷 중앙 x≈0.5 vs 앵커 샷 우측 x≈0.6+).

- **구현**(`999af3a`): 자동 컷 생성 직전 세그먼트마다 프레임 3장(시작·중앙·끝)을 640px PNG로 내보내(`exportFrameToFolder`) OpenAI 비전 `detectSubjectPoint`(input_image data URL, strict 스키마, 클램프)로 얼굴 중심을 감지, 순수 `resolveSubjectFocal`(일치→평균/카메라 교차→0.5 절충/저신뢰 제외)이 세그먼트별 focalX/Y로 종합 → `createShortsFromMarkers`가 컷마다 다른 초점으로 리프레임. 실패는 컷 단위 격리(슬라이더 폴백). 유닛 10(subject-focus 6 + detect/encodeBase64 4).
- **Host 버그 발견·수정**: `exportSequenceFrame`이 성공 반환 후에도 파일이 늦게 나타나 `getEntry` 실패→전 샘플 실패→전부 폴백. 400ms×12 읽기 재시도로 해결.
- **프레임 증거(전/후)**: 이전(초점 0.3) = 얼굴 절반 잘림 / 새 감지(x=0.50·0.51) = **인물 정중앙**(det_1_t8·det_0_t8, 앵커 완벽 센터). 3컷 중 2컷 감지 성공, 1컷 폴백. 콘솔 0.
- **알려진 한계·후속**: (a) 세그먼트 내 카메라 교차는 단일 초점의 절충(진짜 샷 단위 위치 키프레임은 후속) (b) 감지 실패 컷의 재시도 강화 여지 (c) 리로드 직후 자막 편집기가 세션-폴백 문서를 로드하는 기존 쿼크 관찰(이번 기능과 무관, 별도 추적).

## 34. 샷 단위 초점 키프레임 + 말하는 화자 추적 + 진짜 중앙 배치(2026-07-14)

사용자: "풀샷이면 답변하는 화자를 정중앙에, 샷 단위 위치 키프레임, 상용 도구 이상". 3층으로 구현·실검증(`e33eceb`+`b599552`).

- **배치 비전 1콜**(`detectSubjectTimeline`): 세그먼트당 프레임 ≤14장(자막 발화 중간 시점 우선 샘플링 `planSampleTimes` — 말하는 사람 감지 최적) 320px를 한 요청에 실어 프레임별 "말하고 있는 사람(입 벌림·제스처), 불명확하면 주된 인물" 얼굴 중심 감지. 24장/1.2MB 상한.
- **샷 구간화**(`planShotFocalSpans` 순수): x 점프(≥0.12)=카메라 컷 → 샘플 중간에서 분할, 샷별 평균 초점, 세그먼트 전 구간 커버. 유닛 12.
- **위치 키프레임**(`applyShotFocalPositionKeyframes`): §27-b 검증 패턴(setTimeVarying 선행), 스팬마다 hold 키프레임 2개(시작·끝−0.05s)로 팬 없이 컷처럼 점프. 폴백 사다리: 샷 추적→정적 감지→슬라이더.
- **중앙 배치 수학 결함 발견·수정**: 첫 실측에서 추적은 맞는데 피사체가 가장자리에 걸림 — `focalReframePosition`의 이동량이 ×overflow라 피사체가 "화면의 fx 지점"에 놓였음(fx=0.27→화면 27%). **×ratio(전체 비율)로 정중앙 배치 + ±overflow/2 클램프(여백 방지)**로 수정. 극단값(0·0.5·1) 불변 → 기존 테스트·§28 검증 유지. 유닛 2 추가.
- **프레임 실측(전/후)**: 수정 전 x=0.27 샷=앵커 왼쪽 가장자리 반 잘림 / 수정 후 "아이 키우는 집의 해법"(2샷 0.56→0.23, 키프레임 4) — 샷1 후보 정중앙 + **컷 후 샷2 앵커 완전 정중앙**(shotv2_0/1.png). 6샷 케이스(0.54→0.27→0.73→0.27→0.74→0.53, 키프레임 12)도 timeVarying 확인. 콘솔 0. 게이트 **1696/1696**.
- 정리: 구식 수학으로 생성된 `SubjShort_*`·`ShotTrack_9047_*`는 삭제 권장, `ShotTrack_7742_*`가 최신. 남은 후속: 리로드 직후 자막 세션-폴백 문서 쿼크(§33-c), 스팬 경계 정밀화(현재 샘플 중간, ±수백 ms).

## 35. 얼굴 중심 정밀 프레이밍 — 폐루프 보정으로 7/7 샷 정중앙(2026-07-14)

사용자 스크린샷 피드백 "인물이 화면 중앙이 아님"(§34 이후 잔여). 원인 2가지를 실측으로 확정하고 폐루프까지 넣어 해결(`5df974b`+`c688eec`).

- **원인**: (1) 27초 스팬에 다른 카메라 샷이 섞여 혼합 평균 초점(0.56)이 어느 샷에도 안 맞음 — 소스 오차가 화면에서 1/가시비율≈3.16배 증폭 (2) 감지 초점 자체의 소스 오차 ~0.05가 잔여 오프셋 0.17을 남김.
- **1차 정밀화**: 샷 초점 중간값(median)·점프 임계 0.08·유사 샷 병합 + 경계 프레임 추가 샘플로 재계산(경계 오차 절반) + **멀티인물 풀샷 화자 펀치인**(faceHeight·personCount 감지, 인원≥2·얼굴<0.22면 zoom≤1.5, 위치·스케일 hold 키프레임 동반, 스케일 못 읽으면 zoom 생략으로 불일치 방지) + focalReframePosition zoom 축 일반화.
- **2차(결정타) 측정 피드백 폐루프**: 생성 직후 각 샷 중간 프레임을 숏폼에서 재측정(`detectSubjectTimeline`)→`correctedFocalX`(실제얼굴=초점+(측정−0.5)×가시비율/zoom, deadZone 0.06·최대 0.2)→`applyShotFocalPositionCorrection`으로 위치 키프레임 교체(같은 시각 add=덮어쓰기, Host 확인).
- **자체 검증(`cdt-face-verify.mjs`) 결과**: 보정 전 최대 오차 0.170 → **후 7/7 샷 PASS, 최대 0.080·평균 0.048**(short02 5샷 0.08/0.01/0.03/0.04/0.08, short01 2샷 0.029/0.074). 프레임 육안 확인 — 와이드 샷 후보·앵커 모두 정중앙. 프로덕션 로그 "프레이밍 자동 보정 · 5개 샷 교정". 게이트 **1708/1708**, 콘솔 0.
- **부수**: python 텍스트 편집이 index.ts/premiere.ts를 CRLF로 바꿔 소스 계약 regex가 깨짐 → LF 복구(교훈: 이 저장소 편집은 LF 보존 필수).
- 남은 관찰: 이 소재에선 펀치인 발동 케이스 미조우(personCount 감지값 확인 필요) — 실제 2인 풀샷 소재로 후속 확인. 최신 산물 `ShotTrack_3256_*`(이전 ShotTrack_9047/8085·SubjShort는 구식).

## 36. 전환 스무딩 + 뉴스 스타일 레이아웃(2026-07-14)

### 36-a. 샷 경계 '튀는' 전환 해소(`01a756c`)
사용자: 원샷/풀샷/원샷에서 프레임이 튀듯 부자연. 원인 = 경계가 실제 컷과 ±1초 어긋나 크롭 점프가 컷 밖에서 발생. **경계 버스트 스냅**(경계 ±1.3s를 0.325s 간격 9장 재샘플, 12장 단위 분할 배치 → 경계 오차 ±0.16s) + **전환 주석**(`annotateSpanTransitions`: 버스트에서 점프 관측=cut→하드 점프(컷에 묻힘), 미관측=pan→0.5s 선형 팬) + `planSpanHoldWindows`(hold 창 계획, 짧은 스팬 팬 생략, 두 키프레임 작성기·보정 패스 공용). 유닛 3. 게이트 1711/1711. (사용자 육안 재확인 대기.)

### 36-b. 뉴스 스타일 레이아웃 — 크롭 없음·상하 텍스트 밴드(`802d7b1`)
사용자 실전 샘플(JTV 숏폼: 16:9 원본 가운데 + 위 훅/아래 맥락 텍스트) 반영. 자동 컷 생성에 "뉴스 스타일" 체크박스 — fit 강제(크롭·비전·추적 전부 스킵, 비용 0), 훅·제목을 각 숏폼에 `#텍스트 상단(훅)`/`#텍스트 하단(맥락)` 마커로 자동 삽입(`writeTextGuideMarkers`). **Host 검증**: NewsStyle 생성 → 프레임 = 샘플과 동일 레터박스 배치, 마커 2개 문구 확인, 콘솔 0(`cdt-news-mode.mjs`).
- **텍스트 완전 자동화의 Host 한계(탐색 확정)**: 이 빌드 UXP는 MOGRT 내부 텍스트 파라미터 미노출(trackItem에 getMogrtComponent 없음, 컴포넌트 체인은 불투명도/모션/벡터모션뿐). `ppro.TextSegments.importFromJSON/exportToJSON`과 `SequenceEditor.insertMogrtFromPath`는 실재(삽입 Host 확인) — **후속 경로**: 프리미어 네이티브 텍스트 그래픽 클립(문자 도구)이 Source Text를 TextSegments로 노출하는지 사용자와 검증 → 되면 템플릿 클립 복제+문구 교체로 완전 자동.

### 36-c. JTV 3단 텍스트 구조 반영(`d252368`)
사용자 기준 채널(youtube.com/@Jtvnews2021/shorts) 포맷 = 상단 노랑 인용 훅 / 하단 흰색 맥락 / 하단 노랑 펀치. shorts-plan의 hook이 세그먼트 변환에서 유실되던 것을 `HighlightCutSegment.hook`으로 관통시키고, 뉴스 스타일 마커를 3단으로 확장(상단 훅은 따옴표 정규화). 후보 카드에 훅 표시. **Host 확인**: NewsStyle 재생성 → 마커 3종에 실제 모델 훅 인용문·제목·근거 정확히 실림, 콘솔 0. 유닛 1712/1712.

## 37. 텍스트 주입 최종 판정 + 편집 API 발견 + 썸네일 스모크(2026-07-14)

- **37-a 텍스트 주입 최종 판정(불가)**: Basic Title에 이어 Premiere 네이티브 캡션 MOGRT(Bold Web Caption)와 jamak CEP가 실제 텍스트 주입에 쓰던 MOGRT(assembly_top_left·archive_label)까지 4종 삽입 검사 — 전부 컴포넌트 체인에 불투명도/모션/벡터모션만 노출(파라미터 전수 덤프). 이 빌드 UXP에 CEP `getMGTComponent()` 대응 API 없음 → **화면 텍스트 자동 주입은 현 빌드에서 불가 확정**. 뉴스 레이아웃의 마커 복붙 워크플로우(§36)가 v1 정답. 탐색 잔재: "그래픽" 클립 4개(ShotTrack_3256_02 V3 ×1, NewsStyle_8622_01 V2 ×3) — 프로그램 제거 실패(createRemoveItemsAction 파라미터형 미해결 "Illegal Parameter type"/"script object no longer valid"), 수동 삭제 요망.
- **37-b SequenceEditor 편집 API 발견**: `createInsertProjectItemAction`·`createOverwriteItemAction`·`createCloneTrackItemAction`·`createAddItem(s)Action`·`createRemoveItemsAction` 실재 — **하이라이트 릴(세그먼트 이어붙이기 16:9 3~4분)의 핵심 API 확보**. 다음 단계에서 insertProjectItemAction 시그니처 프로브 → 릴 빌더 구현.
- **37-c 썸네일 제작 스모크(통과)**: 제목/배지/색/크기 입력→변형 A/B 저장→SVG 미리보기에 입력 내용 정확 반영(디코드 검증), 콘솔 0. **실버그 수정**: UXP가 `aspect-ratio` 미적용 → 변형 미리보기 220×0 붕괴 → 고정 높이 124px 병기(§25-b류 Host CSS 쿼크 목록에 추가).

## 38. 하이라이트 릴(방송용 16:9) — 구현·엔드투엔드 검증(2026-07-14)

사용자 요청 "일반 방송용 비율 3~4분"(`bccd9e6`). §37-b에서 발견한 편집 API를 프로브로 확정해 구현.

- **시그니처 확정(프로브)**: `createInsertProjectItemAction(원본 ProjectItem, TickTime, vIdx, aIdx, false)` — **cast된 ClipProjectItem은 "Invalid parameter"로 거부, 원본 item이어야 함**(중요 발견). 삽입 구간은 `ClipProjectItem.createSetInOutPointsAction(in,out)`으로 projectItem을 트림하는 고전 기법 + 사용 후 `createClearInOutPointsAction` 원복. `project.createSequence(name)`으로 빈 시퀀스 생성 가능(기본 프리셋 트랙 V3/A4), 프레임은 `setSequenceFrame`으로 소스와 일치시킴. `project.deleteSequence`도 동작(프로브 시퀀스 정리에 사용).
- **buildHighlightReel**: 세그먼트 시간순 정렬→구간별 트림 삽입(실패는 구간 단위 격리)→오프셋 반환→세그먼트별 릴 로컬 시각에 훅 인용 텍스트 마커. 이름 `{이름}_하이라이트릴_169`.
- **E2E 검증**: 자동 컷 후보 3개 → 릴 생성 → **클립 3개(29.6+60+60=149.6s=02:29), 1920×1080, #텍스트 마커 3개(인용 훅)**, 콘솔 0(`cdt-reel-e2e.mjs`). 3~4분은 후보 선택 수로 제어.

## 39. 마감 배치 — 정리·STT 재시도·자동 덕킹 완성·CCX(2026-07-14)

추천 순서(A1→A2→B1→A3)대로 실행(`6baf0db`+`a16288d`).

- **A1 정리**: `deleteSequence`로 구식 테스트 시퀀스 **29개 일괄 삭제**(실패 0). 보존 7: newswide_src·newswide_seg2·ShotTrack_3256_01/02·NewsStyle_8622_01·ReelE2E_4097_하이라이트릴_169·ShortFlow_9x16. "그래픽" 클립 4개는 createRemoveItemsAction 인자형 3종 모두 실패 → 수동 삭제 확정.
- **A2 STT 재시도 축소**: diarize 타임아웃이 code TIMEOUT 정규식에 걸려 120s×3(~6분) 재시도 후 폴백되던 것 → `defaultTransientError`에 `retryable===false` 최우선 단락 + runStt 래퍼가 diarize 계열 타임아웃에 non-retryable 마킹(whisper-1 자신은 유지). 폴백 ~2분. 유닛 1.
- **B1 자동 덕킹 완성(D-apply)**: **dB↔레벨 인코딩 실측 확정** — 오디오 클립 "볼륨(Internal Volume Mono)/레벨" 기본값 0.17782794 = 10^(-15/20) ⇒ `value = 10^((dB-15)/20)` (`duckLevelValueFromDb` 순수+유닛2). `applyDuckingLevelKeyframes`가 지정 트랙 클립들의 레벨에 엔벨로프를 클립-상대 키프레임으로 기록(키프레임 지원 areKeyframesSupported true 실측). 덕킹 버튼 = 실제 적용 우선(BGM 트랙 입력, 기본 A2) → 대상 없으면 마커 폴백. **Host E2E**: A1 대상 적용 → "클립 1 · 키프레임 6" 토스트, 레벨 timeVarying=true·키프레임 6 실측, 검증 후 원복(0dB), 콘솔 0(`cdt-duck-apply.mjs`). **마지막 미탐색 리스크 해소 — 5d 자동 덕킹 전체 완성.**
- **A3 CCX 최종화**: `beta:evidence:verified` — 게이트 1715/1715 → `ShortFlow-Studio-1.0.0.ccx` 246,284B, **SHA-256 `367a8eb8c3fe5cc45066cd2f1594938478cae2294f91bd3208916efac83f5602`**, 증거 템플릿 `beta-evidence/ShortFlow_Beta_Evidence_20260714T124622Z.md`. (로컬 패키징 — Adobe 서명/심사 아님.)

## 40. 야간 자율 배치 — B2 자가복구·B4 원버튼·B3 장편 분할 STT(2026-07-14)

/goal "todo list 승인 없이 모두 완료" 배치. B2→B4→B3 순서로 실행.

- **40-a B2 프로젝트 키 자가복구(`8a4f0d1`)**: 부팅 직후 활성 프로젝트가 늦게 붙으면 자막 저장 키가 `SESSION_FALLBACK`으로 굳던 문제. `subtitleProjectKey` 4×400ms 재시도 + 부팅 2.5s 후 `refreshStatus(true)` 셀프힐. **Host 확인**: 리로드 직후 키가 프로젝트 경로 기반으로 복원, 자막 문서 유지.
- **40-b B4 원버튼 파이프라인(`2dcea78`)**: `auto-cut-stt-scan-btn` — 활성 시퀀스 오디오 추출→STT→자막 반영→AI 하이라이트 스캔까지 클릭 1회. dist 빌드 검증.
- **40-c B3 장편 분할 STT(`2dcea78`+`335ff52`)**: whisper 25MB(≈13분) 초과 오디오를 무음 경계에서 분할 전사. 순수 계층 `planChunkBoundaries`(균등 목표→무음 gap 중심 스냅, 최소 1s 간격)+`encodeWavPcm16`+`mergeSttChunkResults`(오프셋 보정·SRT 재구성), 컨트롤러 `sttChunkSeconds`(기본 660, 1.2× 히스테리시스), 청크별 sticky whisper-1 폴백, 진행 로그 "긴 오디오 분할 전사 N/M". 유닛 포함 게이트 1719/1719.
- **40-d 3시간 오진의 전말 — CDP 폴링 footgun(최중요 교훈)**: E2E 1~3차가 전부 "멈춘 것처럼" 보인 진짜 원인은 **검증 스크립트 자신**이었다. cdt-lib `connectPanel`은 세션 ID가 없으면 `reload:false`여도 `Plugin.load`를 호출하는데, **UDT의 Plugin.load = 패널 재부팅**이라 "읽기 전용" 원샷 폴링이 매 실행마다 진행 중이던 JS 흐름(내보내기 await·STT)을 죽였다. 재부팅 시각과 폴 실행 시각이 2~3초 간격으로 일치(22:58:34, 23:10:30 실측)해 판명. 그 전까지 "exportSequence promise 미해소"(1차), "웹뷰 OOM 크래시"(2차)로 오진했다 — Host 측 렌더(EncoderManager)는 패널 재부팅과 무관하게 계속 돌아 WAV 파일은 매번 완성됐기 때문에 "파일은 있는데 흐름이 죽은" 그림이 반복됐다. **장시간 작업 감시는 반드시 단일 연결을 유지한 채 같은 세션에서 evalJs 루프로 할 것.** 오진 과정에서 넣은 두 수정은 유지한다 — `335ff52`(IMMEDIATELY 내보내기를 출력 파일 크기 안정화 폴링과 race — 장편 렌더 안전망), `a1c48f5`(STT 대용량 바이트 방어적 복사 5회+ 제거 — 웹뷰 메모리 위생, 39.4MB가 정확히 한 벌만 살게 됨). 둘 다 게이트 1719/1719 green.
- **40-e B3 E2E 통과(newswide_full 20.5분·1231s)**: 단일 세션 워처 단독 실행으로 완주 — 추출 21초(캐시 웜) → **"긴 오디오 분할 전사 1/2 (0초부터)" → "2/2 (615초부터)"**(무음 스냅 균등 경계) → **자막 206 cue·커버 1202초(20분 전체)**, 클릭부터 완료까지 약 2분. 39.4MB WAV(25MB 상한 초과)에서 청킹·오프셋 병합·자막 반영 전 구간 실증. 5차 만의 성공 — 1~4차 실패는 전부 40-d의 폴링 footgun(구형 45초 폴러가 4차 STT를 시작 30초 만에 재부팅)이었고, 간섭원 제거 후 첫 시도에서 즉시 통과.

## 41. D 배치(자율) — 컷별 조정 UI·쌍 학습 UX·멀티클립 키프레임(2026-07-15)

/goal "세운 계획+승인 불필요 작업 상용 품질 완료" 배치. 추천 순서 D-2→D-3→D-1로 실행, 각 단계 게이트+단일 세션 Host E2E.

- **41-a D-2 컷별 프레이밍 수동 조정(`612ce64`)**: 자동 컷 생성 시 숏폼별 초점 스팬을 `shot-plan-store`(localStorage, 보정 패스 반영·원본 보존)에 저장 → "프레이밍 조정" 패널에서 X/Y 오프셋·줌 배율 슬라이더로 재적용. 재조정 시 스케일이 이미 키프레임 상태라 isTimeVarying 가드를 기하 기준값(max(target/source)×100)으로 우회하는 `applyShotFocalAdjustment` 신설. **Host E2E**: 계획 시드→조정(+0.10)→원본 복원, 활동 로그 "클립 1" 2회, **위치 키프레임 시각 [0, 7.95, 8, 15.95] = 시드 스팬 hold 창과 정확 일치 실측**, 콘솔 0.
- **41-b D-3 스타일 쌍 등록 UX(`6b845cd`+`172c95e`)**: SRT 2개 한 번 선택 → `classifyStylePair`가 길이(1.5배, 1.2~1.5배는 cue 수 병행)로 원본/숏폼 자동 판별 → 정렬·학습까지 자동. 학습 예시 목록·개별 삭제(`removeStyleExample`). **Host 스모크**: 합성 SRT 쌍(숏폼을 먼저 선택해도 판별 정확) → 일치도 100%·chosen 3 정확, 목록 라이브 렌더·삭제 동작, 콘솔 0. 스모크 중 "목록 미렌더"로 보인 것은 제품이 아니라 **검증 스크립트의 복합 하위 셀렉터가 UXP 쿼리 제한에 걸린 것**(§25-b 재확인) — 검증은 getElementById+children 순회로 할 것.
- **41-c D-1 멀티클립 샷 키프레임(`4f8e9e2`)**: 계획 재검증에서 원래 가정(삽입 경로 사상 필요)이 틀렸음을 확인 — 생성은 클론 기반이라 멀티클립 미디어·클립별 스케일은 이미 올바르고, **진짜 결함은 키프레임 시각**(클립 상대 0-기반인데 타임라인 절대초 기록 → 시작≠0인 두 번째 이후 클립에서 어긋남). `clipRelativeSpans` 순수 계층(겹침 필터+경계 클램프+시프트)을 keyframes·correction 두 경로에 적용, 시작 0 클립은 결과 동일(회귀 0). **Host E2E(3클립 릴)**: 스팬 적용 → 클립별 위치 키프레임 실측 — 클립1 [0,29.56] · **클립2(타임라인 29.61 시작) [0,29.96,30.01,59.97] · 클립3 [0,59.93] — 전부 클립-상대 0-기반 정확**, 조정·복원 "클립 3", 콘솔 0.
- 유닛 1719→1734(+15: 계획 저장 5, 조정 수학 3, 판별·삭제 4, 클립상대 3). 각 단계 커밋·푸시(newplugin).

## 42. 캡션 트랙 탐사 → 트랜스크립트 첨부(텍스트 패널 연동) (2026-07-15)

/goal 자율 배치 1번. §37의 "화면 텍스트 자동 주입 불가" 판정은 MOGRT 그래픽 경로만 검증한 것이라, 미탐사였던 캡션·트랜스크립트 계층을 프로브 8라운드(R1~R8, `cdt-caption-r*.mjs`)로 확정했다.

- **42-a 캡션 트랙 생성은 API로 봉쇄(확정)**: `Sequence.getCaptionTrack(Count)`·`CaptionTrack.getTrackItems`는 존재하지만 전부 읽기 전용 표면. SRT를 import한 캡션 소스 아이템을 `createInsertProjectItemAction`/`createOverwriteItemAction`으로 시퀀스에 넣어도 트랜잭션은 true인데 캡션 트랙이 생기지 않는다(활성화·3s 대기 포함 재시도 동일). 시퀀스/유틸 어디에도 캡션 트랙 생성 동사 없음. §37 판정에 "캡션 트랙 생성 불가"를 추가한다.
- **42-b 핸들 규약(중요)**: `Transcript.hasTranscript/exportToJSON`은 **`ClipProjectItem.cast()`로 감싼 핸들만** 받는다(원시 ProjectItem·TrackItem·Sequence·component 전부 "Invalid parameter"). **시퀀스의 projectItem도 cast하면 유효** — 기존 시퀀스들은 빈 자동 컨테이너(und-zz, words 0)로 hasTranscript true였다. 시그니처는 공식 타입(`@adobe/premierepro` d.ts 4423행대)과 샘플 저장소 `transcript_format_spec.json`으로 재확인.
- **42-c 트랜잭션 스코프 함정(최중요 교훈)**: `Transcript.importFromJSON(json)`으로 만든 TextSegments를 **트랜잭션 밖에서 생성해 두고** `createImportTextSegmentsAction`으로 커밋하면 **커밋은 true인데 실제로는 무효**(기존 빈 컨테이너까지 파괴돼 hasTranscript가 false로 뒤집힘). 반드시 `executeTransaction` 콜백 안에서 `createImportTextSegmentsAction(Transcript.importFromJSON(json), cast)`로 **한 번에 생성·소비**해야 한다. R7(밖 생성, 실패)·R8(안 생성, 성공) 대조로 판명 — 첫 E2E의 "단어 0개"가 이 함정이었다.
- **42-d 기능 구현 — "텍스트 패널로 보내기"**: 순수 계층 `buildPremiereTranscript`(src/transcript-export.ts — SRT 내보내기와 같은 노출 규칙, 단어 타이밍 보존, 큐 마지막 단어 eos, 전부 숨김이면 큐 단위 강등, 언어/화자/uuid 주입 가능) + `attachTranscriptToActiveSequence`(premiere.ts — cast 검증, 42-c 규약 커밋, 교체 여부·단어 수 보고) + 자막 툴바 버튼(voice 탭). 사용자는 첨부 후 Premiere 텍스트 패널의 **'캡션 만들기' 1클릭**으로 스타일드 캡션 트랙을 얻는다 — Whisper STT(단어 타임스탬프) 품질을 Premiere 캡션 파이프라인에 그대로 연결.
- **42-e Host E2E(통과)**: 스크래치 시퀀스 활성 → SRT 2큐 불러오기(피커 스텁) → 버튼 클릭 → 활동 로그 "트랜스크립트 첨부 · TrE2E2_tmp · **단어 7개**" → ppro 실측 `hasTranscript true`·`language ko-kr`·단어 [트랜스첨부,검증,첫,큐,둘째,큐,확인] 정확 일치, 정리(SRT·시퀀스 삭제) 후 콘솔 0(`cdt-transcript-e2e2.mjs`). 유닛 1734→1739(+5).

## 43. Host 회귀 스모크 스위트 정식화 — scripts/host-smoke (2026-07-15)

/goal 자율 배치 2번. 세션 스크래치패드에 흩어져 있던 CDP 검증 노하우를 저장소로 이관해, 앞으로 어떤 변경이든 실기 회귀를 한 명령으로 확인한다.

- **명령**: `npm run host:smoke`(기본 티어, 비파괴) / `npm run host:smoke:full`(+자체 정리 E2E) / `node scripts/host-smoke/run.mjs --check <이름>`(단일). 전제: Premiere 실행 + UDT 서비스(14001).
- **구조**: `lib.mjs`(UDT 프록시+CDP 접속, `evalAsyncProbe` 마커+폴링 헬퍼, `readActivityLog`) / `checks.mjs`(체크 정의) / `run.mjs`(러너 — **한 번 접속해 1회 재부팅 후 전 체크를 같은 세션에서 실행**, 실패 시 exit 1).
- **footgun 방지책이 구조에 내장**: §40-d(원샷 재접속 폴링 금지 — 러너가 단일 세션 보장, Plugin.load 시 경고 출력), §25-b(복합 하위 셀렉터 금지 — 로그 읽기는 getElementById+children 순회 헬퍼), 백슬래시 이스케이프 금지 규칙(개행은 String.fromCharCode(10)) 주석 명문화.
- **기본 티어 4종**: panel-boot(준비 로그+콘솔 0) · tab-sweep(12탭 전환, 부팅 직후 플레이크는 500ms 1회 재확인으로 흡수 — 첫 실행에서 export 탭 오탐 실측 후 보강) · host-context(프로젝트/시퀀스 접근) · ui-contract-live(핵심 요소 10종 실기 DOM 존재).
- **full 티어 +2종**: subtitle-roundtrip(피커 스텁 SRT 2큐 — 자막 자동저장이 스모크 문서로 대체되는 부작용 명시) · transcript-attach(§42 E2E — 스크래치 시퀀스 생성→첨부→ppro 실측→삭제).
- **실측**: full 6/6 통과 — tab 12/12, 시퀀스 8, 트랜스크립트 단어 6·ko-kr. 게이트 1739/1739 유지.

## 44. 비전 비용 최적화 — BMP 프리필터 + 감지 캐시 (2026-07-15)

/goal 자율 배치 3번. 샷 추적의 비전 토큰(세그먼트당 1차 14장+버스트 최대 36장)을 두 겹으로 줄인다.

- **44-a 플랫폼 제약 확정**: UXP 웹뷰에 `DecompressionStream` 없음(실측) — Canvas 부재(§14)와 합치면 PNG/JPEG 픽셀 디코드가 불가능하다. 대신 **`Exporter.exportSequenceFrame`이 BMP(24-bit 무압축)를 지원**함을 실측(64×36 = 6,966B 정확, 'BM' 매직, JPG도 가능). 직후 읽기는 "resource busy" 경합이 있으니 재시도 필수(readExportedFrameBytes는 12×400ms로 이미 견고).
- **44-b 프레임 diff 프리필터**: 샘플 시각마다 64px BMP를 먼저 내보내 16×9 휘도 그리드를 만들고, 직전 채택 프레임과의 정규화 평균 절대차 < **0.02**면 비전 전송을 스킵(감지값은 직전 채택 샘플을 복제해 시간축 연속성 유지 — `cloneSamplesForReusedTimes`). 순수 계층 `src/frame-diff.ts`(parseBmp24는 24-bit·무압축 외 전부 null → 필터 없이 전량 전송 폴백). **임계값 실측 근거**: newswide 실프레임 6개 구간 조사 — 정적/발화 구간 0.3~1.5s 간격 diff 0.0005~0.0049(임계값의 1/4 이하), 샷 전환 0.14~0.24(7배 이상). 중간 지대는 채택 쪽 — 오류 방향이 비용이지 정확성이 아니다. 트레이드오프: 모션 많은 소스는 BMP 이중 내보내기(로컬 렌더)만 늘고 스킵이 없다.
- **44-c 감지 캐시**: `src/vision-cache.ts` — (컨텍스트 키, 구간 start~end) → FocalSpan[]을 localStorage(TTL 6h·최대 24건)에 보관. 같은 구간 재생성 시 **비전 0회**("샷 초점 캐시 재사용" 활동 로그). 소스 편집으로 낡을 수 있어 TTL을 짧게 잡고, 프레이밍이 이상하면 §41-a 조정 패널로 교정하면 된다.
- **44-d 통합**: `detectSegmentShotSpans` 캐시 조회 → BMP 프리필터("프레임 프리필터 · N장 중 K장만 전송" 로그) → 채택 프레임만 PNG 320px 배치 감지 → 캐시 저장. `exportFrameToFolder`에 format("png"|"bmp") 인자 추가. 완전 정적 세그먼트는 채택 1장+복제 샘플로도 스팬 계획이 성립(기존 "2장 미만 중단" 가드는 복제 포함 기준으로 완화). 버스트 경로는 미적용(경계 주변은 원래 변화 구간). 유닛 1739→1749(+10: BMP 파서 3, 그리드/diff 1, 샘플링 2, 복제 1, 캐시 3).

## 45. 베타 증거 재생성 + 사용자 가이드 (2026-07-15)

/goal 자율 배치 4번(마감). §39의 CCX는 1715 테스트 시점 산물이라 이후 기능(D 배치 3건 + 트랜스크립트 첨부 + 비전 최적화)이 빠져 있었다.

- **증거 재생성**: `beta:evidence:verified` — 게이트 **1749/1749** → `ShortFlow-Studio-1.0.0.ccx` **256,981B**, SHA-256 `771afbdc7b70b0579bab3189c29773419f1b1455516dacf86c0e6c5256f4eb5c`, 증거 템플릿 `beta-evidence/ShortFlow_Beta_Evidence_20260714T163912Z.md`(로컬 산출물 — Adobe 서명/심사 아님).
- **사용자 가이드**: `docs/USER_GUIDE.md` — 설치·API 키 준비·12탭 표·원본→숏폼 추천 워크플로(캡션 경로 포함)·플랫폼 제한 4항·신고 요령. 베타 참가자에게 CCX와 함께 배포한다.

## 46. 실행 점검 배치 — 통합 E2E에서 찾은 결함 2건 수정 (2026-07-15)

/goal "여태까지 개발한 것 실행 테스트 점검". 게이트(1749/1749)·스모크 full(6/6) 재확인 후, 그동안 단위·물리 검증만 있었던 **자동 컷 통합 경로를 실비전 E2E**(SRT 시드→AI 스캔→추적 생성→재생성→정리)로 처음 완주시켰고, 그 과정에서 결함 2건을 찾았다.

- **46-a 통합 E2E 1회차(통과)**: 후보 2개 → 생성 성공 2·실패 0. **§44 프리필터 실전 실동** — "비전 10장 중 2장만 전송"(80% 절감)·"9장 중 6장", 그 상태로도 샷 추적 정상(5샷/1샷), 프레이밍 자동 보정 4샷, 계획 저장·조정 패널 반영, 콘솔 0.
- **46-b 결함 ① 생성 후 원본 이탈(수정)**: `createShortsFromMarkers`가 종료 시 마지막 생성 숏폼을 활성화하므로, 그 상태에서 재생성/마커/릴을 누르면 **원본이 아니라 방금 만든 숏폼에서** 프레임을 뜨고 클론했다(조용한 오동작 — 실측: 2회차 직전 활성 = 생성물, 캐시도 키가 어긋나 전량 미스). 수정 — 스캔 시점 컨텍스트 키(`autoCutSourceKey`)를 기억하고 생성·마커·릴 진입 시 `activateSequenceByContextKey`로 원본 자동 복원(찾지 못하면 재스캔 안내 에러). **검증**: 2회차에서 "원본 시퀀스를 다시 활성화" → **"샷 초점 캐시 재사용 (비전 0회)" 2건**, 프리필터 로그 증가 0, 완료 7초(1회차는 수 분). 같은 패턴의 마커 QC 패널(batchCreate) 잔여 리스크는 별도 과제로 표시.
- **46-c 결함 ② 원시 replaceChildren 잔존 8곳(수정)**: §25-b 확정 이후에도 자동 컷 후보 목록(index.ts)·에셋 브라우저 3곳·진단 패널 2곳·마커 QC 2곳이 원시 `replaceChildren()`을 쓰고 있었다 — 특히 후보 목록은 스테일 행이 남으면 **잘못된 구간이 생성될 수 있는** 자리. 전부 `clearChildren()`으로 교체.
- 부수: README·CLAUDE.md에 `host:smoke` 명령과 단일 세션 원칙 안내 추가. 게이트 1749/1749 유지.

- **46-d CCX 재생성(점검 수정 포함)**: `beta:evidence:verified` — 게이트 1749/1749 → `ShortFlow-Studio-1.0.0.ccx` **257,199B**, SHA-256 `36a94311dad4b8b57cc994826dd879db8ea69e860f99c80294f32410955e0ee7` (§45의 771afbdc… 대체). USER_GUIDE의 SHA 동기화.

## 47. 잔여 결함 마감 — 마커 QC 가드 + 프레임 미리보기 (2026-07-15)

§46 보고에서 남긴 1·2번 항목 처리.

- **47-a 마커 QC 원본 이탈 가드**: §46-b와 같은 패턴을 `markers-qc-panel`에 적용 — 마커 검색 시점의 컨텍스트 키를 기억(`readContextKey` 포트), 일괄 생성 진입 시 활성이 바뀌어 있으면 `activateContextKey`로 원본 자동 복원(실패 시 재검색 안내 에러). 포트 2개는 index.ts가 `readActiveContextKey`/`activateSequenceByContextKey`로 주입.
- **47-b 조정 패널 프레임 미리보기(D-2 계획 잔여 단계)**: 선택한 숏폼의 첫 스팬 중앙 프레임을 카드에 표시. `exportSequenceFrameByName`(premiere.ts, 이름→시퀀스 핸들→기존 exportFrameToFolder 위임 180px) + 패널 포트 `exportPreviewFrame`(index.ts가 내보내기→바이트 읽기→임시 파일 삭제로 구현) + data:image/png;base64 `<img>`(§25-b 계열 UXP innerHTML 회피, 파형과 동일 패턴). 경합은 토큰 가드, 실패는 조용히 숨김(보조 기능).
- **47-c UXP 발견**: select 옵션 재구성 후 **value가 자동 선택되지 않는다**(브라우저는 첫 옵션 자동 선택) — selectedPlan()이 null이 되어 미리보기·버튼이 전부 무반응이었다. 렌더 시 첫 계획을 명시 기본 선택으로 수정(§25-b 쿼크 목록에 추가할 것).
- **E2E**: 계획 시드 → 새로고침 → **미리보기 실렌더(hidden=false, PNG base64 52KB)** → 원본 복원 클릭 "클립 1" 로그·미리보기 유지, 콘솔 0. 검증이 실시퀀스에 남긴 중앙(기본값) 위치 키프레임은 timeVarying 해제로 원복 확인([0.5,0.5] 정적). 게이트 1749/1749.

## 48. 플랫폼 봉쇄 3건 재탐사 — 전부 봉쇄 유지 확정 (2026-07-15)

사용자 지시("다른 해결 방법 조금 더 찾아보고 없으면 현행 유지")로 1라운드씩 재탐사. **결론: 3건 모두 봉쇄 유지, 현행 우회가 최선.**

- **48-a Canvas(썸네일 래스터)**: `getContext('2d')`가 객체를 돌려주지만 **스텁** — fillText/fillRect는 있으나 `toDataURL`/`getImageData`/`toBlob` 전부 "is not a function", OffscreenCanvas·createImageBitmap·ImageData도 없음. 픽셀을 꺼낼 방법이 없어 §14 판정 유지(SVG 폴백).
- **48-b MOGRT 소스 텍스트**: "소스 텍스트" 파라미터가 실재하고 createSetValueAction도 있지만, **값 타입이 JS로 구성 불가** — getStartValue는 null, getValueAtTime은 "not supported for these value types", `createKeyframe(x)`는 문자열·숫자·불리언·객체·빈 인자 전부 "Illegal Parameter type"(같은 세션에서 위치 파라미터는 PointF로 정상 생성 — 방법론 검증됨). 실쓰기 커밋 시도도 동일 에러, 전후 픽셀 diff 0.0000. §37 판정 유지(텍스트 마커 + 트랜스크립트→캡션 우회).
- **48-c 캡션 생성 명령 통로**: `ppro.Application`은 version뿐, Metadata/Properties에도 캡션 관련 동사 없음. §42-a 판정 유지('캡션 만들기' 1클릭).

## 49. 로드맵 14~18 후속 기능 배치 (2026-07-15)

사용자 지시 "4번 진행"(로드맵 후속). 계획은 `docs/01-plan/features/roadmap-followups.plan.md`.

- **49-a 14 스마트 리프레임·피사체 추적**: 기존 구현(§38·§41·§44·§47)으로 충족 — ROADMAP에 각주.
- **49-b 16 썸네일 변형 일괄 내보내기(`99872d1`)**: `exportVariants` — 저장된 변형(최대 3종)을 라벨별 SVG 파일로 한 번에 저장. 유닛 1(파일명 `_A/_B.svg`·빈 변형 스킵). 폴더·쓰기 경로는 §37-c에서 실증된 공용 헬퍼 재사용.
- **49-c 17 자막 버전 스냅샷(`97cdf58`+)**: 순수 스토어 `subtitle-snapshots`(서브에이전트 작성 — 키당 10·전체 60, validateSubtitleDocument/cloneSubtitleDocument 재사용, 유닛 10) + 자막 탭 "스냅샷 저장" 버튼·목록·복원(setDocument(recordHistory=true)로 언두 가능)·삭제. **E2E**: 2큐 저장 → 3큐로 교체 → 복원 클릭 → 큐 2행 복귀·로그 정확.
- **49-d 18 업로드 패키지(`97cdf58`)**: 순수 `planUploadPackage`(SRT·유튜브 메타·썸네일 SVG·권리 리포트·README 구성 계획, 빠짐 안내, 유닛 3) + export 탭 버튼(폴더 선택→일괄 저장). **E2E**: 실폴더 생성 — README/rights.md/rights.json/subtitles.srt 4파일 + "빠짐 2건" 안내 정확.
- **49-e 15 다국어 패키지 v1**: 순수 `multilang`(대상 6개 언어·파일명·매니페스트, 유닛 3) + 자막 탭 언어 체크박스·"다국어 SRT 내보내기". 번역은 기존 translate 파이프라인(runSubtitleAI→validateAiSubtitleResponse — cueId·타이밍 보존 강제)을 **원본 불변**으로 재사용, 언어별 실패 격리. **E2E(실 AI)**: 영어 1개 언어 — `.en.srt` 실번역("Complaints about foul odors…", 타이밍 동일)+매니페스트 생성, 콘솔 0. TTS 더빙·언어별 썸네일은 계획대로 v2 유예.
- 게이트 1750→**1766**(+16: 스냅샷 10·업로드 3·다국어 3). 최종 회귀 `host:smoke:full` **6/6**.

- **49-f 최종 CCX**: `beta:evidence:verified` — 게이트 1766/1766 → 262,788B, SHA-256 `d7e22d63d00e8dd4098d4f53589707e56d0dcf90f3c93641dbc776c9c1b32922` (§46-d의 36a94311… 대체, USER_GUIDE 동기화).

## 50. F 배치 실기 재검증 — 발견 2건 수정 (2026-07-15)

사용자 지시 "방금 한 것 전부 실행 테스트". 게이트·스모크 재확인 후, 이전 배치에서 실기 검증이 빠졌거나 부분적이던 지점을 통합 E2E 2부로 완주.

- **50-a 통과 확인(1부)**: ① 마커 QC 가드 실동 — #sf 마커 2개 시드→검색 2행→일괄 생성(성공 2, 활성이 생성물로 바뀜 실측)→재클릭 시 **"마커 원본 시퀀스를 다시 활성화"** 후 정상 생성. 16 변형 일괄 내보내기 실파일 2개(...(_A/_B.svg) 확인. 마커는 `createRemoveMarkerAction`으로 정리(신규 확인 API).
- **50-b 동작 특성 확인(결함 아님)**: 생성 직후엔 활성=숏폼이라 **자막 문서가 그 시퀀스의 빈 문서로 교체**된다(자막은 프로젝트+시퀀스 guid 단위 — §33 설계). 이 상태에서 유튜브 메타 버튼은 비활성, 다국어는 "먼저 자막을 불러오세요" 정확 안내, 업로드 패키지는 빠짐 안내와 함께 5파일 생성. 원본을 다시 활성화하면 자동 저장이 복원된다(2부에서 실측) — USER_GUIDE에 한 줄 안내 가치.
- **50-c 풀구성 통과(2부)**: 원본 활성 상태 — 유튜브 메타 AI ready → 업로드 패키지 **7파일·빠짐 0**(subtitles.srt·metadata.md·썸네일 2종·권리 2종·README).
- **50-d 결함 ① 다국어 일본어 실패(수정)**: en 성공·**ja 실패**(성공 1·실패 1) — 번역 검증이 뮤테이션 경로의 엄격 규칙(단어 토큰 수·wordId 보존)을 그대로 써서, **무공백 언어(ja/zh)는 단어 수 보존이 깨진다**. 내보내기 전용 관대 검증기 `validateTranslatedCuesForExport`(큐 수·cueId·타이밍(±1ms)·비어있지 않은 텍스트만 강제, 시각은 원본 값 사용, 2MB 상한) + `translatedCuesToSrt` 신설 — 문서를 바꾸는 기존 번역 경로는 그대로 엄격. **재검증: ja 성공 1·실패 0**, 실번역("都心の悪臭に関する苦情が急増しました")·타이밍 정확. 유닛 +2.
- **50-e 결함 ② 스냅샷 목록 부팅 미표시(수정)**: bootstrap이 자막 컨트롤러 생성 **전에** 목록을 렌더해 이전 세션 스냅샷이 패널 재시작 후 보이지 않았다 — 컨트롤러 초기화(키·자동저장 복원) 직후 재렌더 추가.
- 게이트 1766→**1768**, 최종 `host:smoke:full` 6/6, 콘솔 에러 전 구간 0.

- **50-f 최종 CCX**: 게이트 1768/1768 → SHA-256 `179c551ab616ae65537531c14bdb58a2b68be6484759fab3fe8abe15898e42ef` (§49-f의 d7e22d63… 대체, USER_GUIDE 동기화 + 시퀀스별 자막 동작 안내 1줄 추가).

## 51. UI 컴팩트 + 표시 정비 (2026-07-15)

사용자 지시 "메뉴가 너무 크다 + 텍스트·표시 개선".

- **51-a 크기 축소(실측 근거)**: 폰트 토큰 전단(--fs-* 13→12 기준, 제목 19→16)·내비(토글 47→38px, 탭 38→31px)·버튼(34→29, 대형 40→33, 소형 29→25)·입력(34→29)·카드 패딩(18→13, 협폭 14→11)·헤더(72→54px)·섹션 간격 일괄 축소. **전후 실측**: 패널 총 높이 qc 2257→1611(-29%) · short 3659→2560(-30%) · voice 4638→3951(-15%), 본문 12px·버튼 29px 확인. tab-sweep 12/12·콘솔 0 유지.
- **51-b 표시 결함 2건 수정**: 스냅샷 목록이 라벨 중복("큐 2개 · … · 큐 2개")에 **UTC 시각**을 보여주던 것 → 라벨+로컬 HH:MM로 정리. 업로드 패키지 폴더명·다국어 매니페스트 타임스탬프가 ISO(UTC)라 자정 부근 날짜가 어긋나던 것 → `localTimestamp()`(로컬 YYYYMMDDTHHMMSS)로 교체.
- **51-c 라벨 4건 간결화(설명은 title 툴팁으로 이동)**: "AI 하이라이트로 자동 컷 후보 만들기"→"AI 후보 스캔", "자막 생성부터 한 번에 (STT→자동 컷)"→"STT부터 한 번에", "샘플 쌍 등록 (SRT 2개 선택)"→"SRT 쌍 등록", "Premiere 가이드 오버레이 만들기"→"가이드 오버레이 삽입".
- 게이트 1768/1768 · host:smoke:full 6/6.

- **51-d 최종 CCX**: 게이트 1768/1768 → SHA-256 `872d87d4823bda6c46f9f6761a90b761f898f304499dad8934090f6754f1080b` (§50-f 대체, USER_GUIDE 동기화).

## 52. News Cut — 뉴스 보도 아이템 자동 분할 (2026-07-15)

사용자 지시("news cut 기능 — 아이템별 분할, 파일명 오늘일자_news_NN, 바로 진행"). 계획은 `docs/01-plan/features/news-cut.plan.md`.

- **52-a 구성**: 분석 액션 `news-items` 신설(openai-text — 앵커 리드 기준 아이템 경계, startCueId/endCueId/title 스키마, 문서 전체 단발 요청) + 순수 계층 `src/news-cut.ts`(cueId→시각 해석·미존재 cueId 드롭·겹침은 앞 아이템 끝으로 스냅·최소 15s·`newsItemName` = `YYYYMMDD_news_NN`, 00부터) + `createNewsItemSequences`(클론+인/아웃 트림, 리프레임 없음, 종료 시 원본 재활성 — §50-b 반영) + `queueSequenceExportsByName`(AME 대기열, 파일명=시퀀스명) + 자동 편집 탭 News Cut 카드(분석→목록 체크박스→생성→일괄 내보내기). 유닛 +5.
- **52-b 실소재 E2E(KBC 8뉴스 2026-07-14, 956s·AV1)**: mp4 가져오기(AV1 디코딩 정상)→시퀀스 삽입→분할 전사 2/2(자막 197큐)→**아이템 9개**(섬박람회 입찰비리·국립의대·광천터미널 등 제목까지 정확)→시퀀스 9개(`20260715_news_00`~`08`) 생성 성공 9·실패 0, 콘솔 0. **인/아웃 실측 = 분석 결과와 일치**(news_00 65.7~202.3 ↔ 01:05~03:22 등 3표본). 결과물은 사용자 사용 목적으로 프로젝트에 유지.
- **52-c E2E가 잡은 결함(수정)**: 대기열 내보내기가 전체 범위(true)로 넘겨져 **아이템마다 원본 956초가 통째로 렌더될 뻔** — 트림이 인/아웃 방식이므로 in/out 범위(false)로 수정. AME 대기열 실검증은 내보내기 프리셋 토큰 만료로 보류(사용자가 내보내기 탭에서 프리셋 재선택 후 동작).
- 게이트 1773/1773.

- **52-d 블랙 화면 복구(실사용 후속, 2026-07-15)**: 사용자 보고 "화면이 블랙". 프레임 휘도 실측 0으로 확인 후 진단 — 디코딩 문제가 아니라 **AV1 원본 가져오기 시 영상 스트림이 인식되지 않아 클립이 사실상 오디오 전용**이었고 시퀀스 V1~V3가 전부 비어 있었다(STT는 되고 화면만 블랙인 이유). 복구 — ffmpeg로 H.264 변환(영상 재인코딩·오디오 복사) → 새 아이템으로 가져와 소스 0초에 overwrite(V1 영상+A1 오디오 대체) → 프레임 휘도 131.5로 화면 복구 실측 → 깨진 아이템 클론 삭제 → STT 재전사(199큐, 자동저장은 테스트 문서에 밀려 소실돼 있었음) → 아이템 12개 재생성, news_00 휘도 187.8 확인. **교훈**: ① `changeMediaFilePath`는 이 케이스에서 false(원인 미상) — 파일시스템 스왑+refreshMedia도 프로젝트 아이템의 스트림 구성은 못 바꾼다, 새 아이템 가져오기+overwrite가 정도. ② 유튜브 수신 소재는 AV1일 수 있어 **가져오기 전 H.264 변환**을 권장(News Cut 가이드에 반영 가치). ③ 시퀀스 삽입 후에는 V1 아이템 수를 확인하는 게 싸고 확실한 헬스체크.

## §53 뉴스 분할 앵커 샷 스냅·학습 + 최상위 탭 승격 (2026-07-15)

사용자 피드백 두 유형(아이템 시작이 앞 뉴스 꼬리를 물고, 끝이 중간에 끊김)과 "앵커샷을 학습해달라"는 요청, "자동편집과 동위로 승격 + 이름 '뉴스 분할'" 지시를 반영.

- **53-a 경계 스냅 설계**: 텍스트(자막) 분석만으로는 경계가 앵커 리드 문장 시각에 놓여 실제 컷과 어긋난다. 그리드 매칭 캘리브레이션 실측 — 앵커↔앵커 diff 0.024~0.36 vs 앵커↔현장 0.035~0.39로 **겹쳐서 임계 분리 불가**(스튜디오 배경·배너가 아이템마다 달라짐) → 비전 분류로 전환. 파이프라인: 경계 주변 [start−6, start+4] 0.5s 간격 96px BMP 로컬 컷 스캔(`findShotSegments`, 비전 0회) → 샷 대표 프레임만 272px PNG로 `classifyAnchorShots` 배치 분류 → 아이템 시작을 앵커 샷 시작 컷에 스냅, **끝은 다음 아이템 시작으로 연결**(`snapItemsToAnchorStarts` — 중간 끊김을 구조적으로 제거).
- **53-b 앵커 샷 학습(코퍼스)**: `src/anchor-corpus.ts` — localStorage `shortflow.anchor-corpus.v1`, 라벨당 1장·최대 6장. 분석 중 확신 ≥0.75 앵커 프레임을 자동 저장하고, 이후 분류 요청에 최대 3장을 "known anchor shot example" 참조로 선행 주입(few-shot). 다른 방송(다른 스튜디오 세트)에서도 분류가 안정된다.
- **53-c 실측(8뉴스 956s)**: 아이템 10개, 경계 8/10 앵커 컷 정렬(비전 5회), 인/아웃 완전 연속.
- **53-d 잘린 프레임이 비전 요청 전체를 거부시킨 결함(수정)**: 모닝와이드 첫 실행에서 스냅이 "The image data ... not a valid image"로 통째 생략. 코퍼스 참조 2장은 바이트 검사 결과 정상 PNG — 원인은 `exportSequenceFrame`이 성공 반환 후 파일을 늦게/부분적으로 쓰는데 재시도 읽기가 **"비어있지 않음"만 확인**해 잘린 PNG가 통과한 것. 수정: `looksCompleteImage`(PNG IEND 트레일러/BMP 선언 크기)로 완결 확인까지 재시도, 코퍼스 저장·참조 주입 양쪽도 완결 PNG만 통과. **교훈**: Exporter 산출물은 "존재+비어있지 않음"으로는 부족하고 포맷 트레일러까지 봐야 한다.
- **53-e 학습 E2E(모닝와이드 1111s, 다른 앵커 세트)**: 8뉴스 예시 시드 상태에서 STT 227큐 → 아이템 13개, **스냅 11/13 정렬(비전 8회)**, 모닝와이드 앵커 자동 학습(`anchor:NewsCut_KBC_Morning_20260715`, 코퍼스 3장) → 시퀀스 13개 생성(성공 13·실패 0), 인/아웃 전 구간 연속(32.9~1089s), 콘솔 0. 텍스트 분석 과병합 편차는 프롬프트 길이 가이드(30s~3min, >4min 분할 재검토) 추가 후 이번 런에서 미재현.
- **53-f 같은 날 다중 방송 번호 연속**: `nextNewsItemIndex` — 생성 시 프로젝트의 같은 날짜 `YYYYMMDD_news_NN`을 스캔해 다음 번호부터 이어 붙인다(8뉴스 00~09 유지 상태에서 모닝와이드가 10~22로 생성됨을 실측).
- **53-g UI 승격**: "뉴스 분할"을 자동 편집 하위 카드에서 **첫 번째 최상위 탭(기본 활성)**으로 승격(탭 13개로 재번호). 사용자 문구의 "News Cut"도 "뉴스 분할"로 통일. 탭 전환 로직은 제네릭(`src/ui.ts`)이라 HTML 이동만으로 완료 — 부팅 실측 `firstTab: newscut/active`.
- 남은 수동 단계: 내보내기 탭 프리셋·저장 폴더 선택(현재 둘 다 미설정) 후 "AME 일괄 내보내기".
- 게이트 1784/1784.
- **53-h AME 미설치 환경 + 직접 렌더 실측(2026-07-15)**: 이 개발 PC에는 Adobe Media Encoder가 없다(`EncoderManager.isAMEInstalled === false`) — QUEUE_TO_AME는 전 건 "AME is not installed"로 거부. 내보내기 버튼이 영구 불능이 되지 않도록 **AME 미설치 시 `ExportType.IMMEDIATELY` 직접 렌더 폴백**(`renderSequenceExportsByName`, 순차 실행·파일명은 시퀀스 이름 그대로)을 추가. **footgun**: `exportSequence`는 출력·프리셋 경로가 **슬래시(`/`) 구분자면 조용히 false**를 반환한다 — 백슬래시 경로면 비활성 시퀀스도 즉시 렌더 성공(29초 아이템 42MB 실측). 플러그인 코드는 `joinNativePath`가 폴더 엔트리의 백슬래시를 따라가므로 안전하지만, 프로브에서 경로를 직접 조립할 때는 `String.fromCharCode(92)`로 백슬래시를 만들 것(§40-d 이스케이프 제약). 프리셋 참고: YouTube 업로드용은 `C:\Program Files\Adobe\Adobe Premiere Pro 2026\MediaIO\systempresets\4E49434B_48323634\YouTube 1080p HD.epr`. 또한 `getEntryWithUrl`은 manifest `localFileSystem: "request"`에서 임의 경로를 거부하므로 프리셋·폴더 토큰은 사용자 피커 경유만 가능.
- **53-i 학습 확장·병합 기사 대응·최종 산출(2026-07-15~16)**: 사용자 보고 "17번 파일에 앵커샷 2개(끝맺음 오류) → 18번 시작이 앵커샷 아님" + "재생목록에서 더 받아 학습, 완벽해야 함".
  - **학습 5편 확장**: 주말(7-12 일·7-11 토)·평일(7-13 월·7-10 금·7-09 목) 5편 다운로드(H.264, `YYYYMMDD_kbc8_ID.mp4` 규칙). 주말 2편 학습+분할 테스트 완료(일 9개 스냅 6/9·토 7개 스냅 5/7, 생성 검증 후 테스트 시퀀스 삭제). 평일 3편은 OpenAI 쿼터 소진으로 대기(파일은 준비됨). 코퍼스 상한 8장·참조 5장으로 확대.
  - **파이프라인 보강 3종**: ① 스캔 창 -12s(텍스트 경계가 앵커 컷보다 10초+ 늦는 유형), ② `splitItemsAtInteriorAnchors` — 3분 초과 아이템 내부(여유 15s)를 1s 간격 스캔, 8s+ 지속 샷만 비전 분류(확신 ≥0.6)해 숨은 앵커 컷 분할(8뉴스 5분 병합 아이템 실증 분리), ③ `mergeShortItemsForward` — 15s 미만 조각(앵커 리드 한 문장이 별도 아이템)을 다음 리포트와 병합, 제목은 리드 유지.
  - **최종 실측(전체 파이프라인)**: 8뉴스 스냅 9/9→14아이템(내부 분할 1건 포함), 모닝 17/20→20아이템. 리드 병합 오프라인 적용 후 최종 8뉴스 13개+모닝 18개=31개.
  - **⚠️ OpenAI 쿼터 소진 사고와 AI 없는 복원**: insufficient_quota로 재분할 5차가 STT에서 중단 — 직전에 기존 시퀀스는 삭제된 상태. 직전 성공 패스의 경계 실측값에 리드 병합을 오프라인 계산으로 적용해 **AI 호출 0회로 clone→rename→in/out 31개 복원**(실패 0). 교훈: 성공 패스의 경계 실측 로그가 곧 복구 데이터다 — E2E는 경계 전체를 항상 출력할 것.
  - **플러그인 일일 한도(비용 단위)**: 반복 검증으로 기본 100단위 소진 — AI 설정 탭 저장 경로로 300 상향(부팅 영속 확인). ⚠️ 실패 판정 정규식에 `0개`를 쓰면 "10개"에 오탐한다(`: 아이템 0개`로 앵커링).
  - 최종 파일 31개 재렌더 완료(직접 렌더, `_old`에 이전판 보존). 진행률 바(BusyState.progress)·분석 5%→스캔 10~60%→분류 60~90%→100% 매핑 추가. ⚠️ UXP 패널은 rect/offset 측정 API가 전역 0을 반환(내비 탭 포함) — CDP 시각 검증 불가, 스타일 적용·요소 존재·hidden 토글까지만 확인 가능.

## §54 가시성 계층·무료 배치(원클릭·정리·폴더 가드)·병렬 추출 부결 (2026-07-16)

사용자 지시 "유료 작업 후순위, 무료 작업 전부 진행(기능+디자인)".

- **54-a 텍스트 4단계 계층**: 13탭 실측 감사 결과 버튼 글자가 설명문과 같은 회색(--text-secondary)이라 행동 요소가 죽어 있었다. `--text-strong(#e3e5ee)` 신설 — 버튼·폼 라벨·내비 탭 = strong, 카드 설명문 muted→secondary 승격, 파일 라벨 9.5px muted→11px secondary. 크기는 §51 축소 유지. ⚠️ 탭 전환 후 300ms 내 rect 측정은 전량 0을 반환하는 아티팩트(1.5s 후 정상) — 붕괴 판정은 대기 후 할 것.
- **54-b 원클릭 분할**: STT→분석→생성→(프리셋·폴더 설정 시) 일괄 내보내기 체인(`news-cut-auto-btn`, primary full-width). 각 단계 실패 시 명확한 메시지로 중단. `transcribeMediaBytes`가 STT 완료까지 await함을 확인하고 연결.
- **54-c 이전 아이템 정리**: `deleteNewsItemSequences`(`YYYYMMDD_news_NN` 패턴만) + 2단계 확인 UI(1차 클릭=개수 표시·danger 스타일, 4초 내 재클릭=실행). 실기: "정말 삭제? (31개)" 표시→자동 해제→시퀀스 31개 불변 확인.
- **54-d 출력 폴더 오염 가드**: `folderInsidePluginTree` — STT/TTS 출력 폴더가 플러그인 설치 폴더의 부모 트리 안이면 부팅·선택 시 경고. 실기에서 실제 사고 케이스(tests/ 토큰)를 부팅 즉시 경고로 잡음.
- **54-e 병렬 프레임 추출 부결(A3)**: 96px BMP 6장 실측 — 순차 3543ms(6/6 성공) vs 6동시 3512ms(5/6, 1 타임아웃). `Exporter.exportSequenceFrame`은 호스트에서 직렬화되어 병렬 이득이 없고 동시 호출은 프레임 유실 위험만 있다 — 구현하지 않음.
- 문서 정합 일괄 갱신(서브에이전트 점검 반영): USER_GUIDE SHA·AI 설정 탭 번호, INTERNAL_BETA_SCOPE·ROADMAP 후순위↔출시 모순 정리, REQUIREMENTS_MATRIX·QA_CHECKLIST 기준선(1792), README 13탭, news-cut.plan 각주.
- 게이트 1792/1792 · 실기 스모크 6/6 · 콘솔 0.

## §55 라이선스 킷 — 배포 보호(minify+난독화) + 오프라인 시리얼 키 (2026-07-16)

사용자 지시("CCX 카피 방지 + 시리얼 키 30일/연장, 서버 없이, 개발 워크플로 무영향"). 계획: `docs/01-plan/features/license-kit.plan.md`.

- **55-a 빌드 이원화**: dev 빌드(기본)는 minify 없음 그대로, `vite build --mode release`(패키징 전용)만 esbuild minify + `__SHORTFLOW_RELEASE__=true` define. 게이트/스모크/디버깅 동선 무변경.
- **55-b 난독화**: `javascript-obfuscator`를 package-ccx 단계에 통합(고정 seed로 결정적 산출물). ⚠️ **stringArrayEncoding "base64"는 UXP에서 조용히 깨진다** — 부팅 게이트 미작동·nacl 검증 무반응(콘솔 에러 0!)의 원인이었고, 인코딩 없는 stringArray로 바꾸면 전체 플로우 정상. ⚠️ 난독화 빌드는 탭 전환이 느려져 스모크 tab-sweep 재확인 대기를 1초로 상향(플레이크 흡수, 1s 대기 시 13/13).
- **55-c 오프라인 시리얼 키**: Ed25519(tweetnacl) — `SFS1.<b64url(payload{id,exp,plan?})>.<b64url(sig)>`, 공개키는 `src/license-public-key.ts` 내장, 검증 `src/license.ts`(순수, 만료일 포함·시계 역행 6h 가드). 발급 `scripts/license-issue.mjs`(--init 키쌍 1회 생성 — **개인키는 `~/.shortflow-license/private.key`, 절대 커밋 금지**; --id --days로 키 발급, 연장=새 키). release 빌드만 잠금 오버레이 강제, dev는 통과.
- **55-d 실기 검증(난독화 release)**: 키 없음→잠금 오버레이+안내 · 위조 키→형식 거부 · 실키(owner 10년)→해제·"만료까지 3651일" 로그·lastSeen 스탬프 · 콘솔 0 · 1s 스윕 13/13 · 스모크 나머지 5종 통과.
- 한계(계획 문서에 명시): 클라이언트 JS 특성상 결심한 공격자의 검증 우회·코드 복원을 완전 차단하지는 못한다 — 목표는 카피 비용 상승과 선량한 사용자 기간 통제.

## §56 무료 분할 실증 — 분산 가중 로컬 앵커 매칭 (2026-07-16)

사용자 지시("오늘은 유료 시스템 0회로 순수 분할"). OpenAI 호출 없이 평일 3편(월 1278s·금 1056s·목 1186s)을 분할했다.

- **파이프라인(전부 로컬·무료)**: 검증된 8뉴스 아이템 13개의 인점(+1.2s)에서 96px BMP 밝기 그리드 참조 은행 구축 → 평일 영상 2s 간격 코스 스캔(총 1,760프레임, 캐시 저장) → 8s 이상 지속 샷만 후보 → 참조 매칭 → 앵커 시작 경계 → 15s 미만 병합 → 시퀀스 생성.
- **핵심 발견 — 분산 가중 매칭**: 전면 그리드 매칭은 §53-a처럼 분리 실패(참조끼리도 LOO 0.053~0.175 — 배경 화면·배너가 기사마다 바뀜). 참조 13장의 **셀별 표준편차 역수를 가중치**로 쓰면(가변 셀 자동 무시) 세 편 모두 분포에 뚜렷한 간극이 생겨 자동 임계(최대 간극 중점, 0.13~0.14)가 성립 — 월 14·금 10·목 14앵커 판정.
- **산출**: `20260716_news_00~33`(월 12·금 10·목 12 아이템, 생성 실패 0, 편별 경계 연속). 그리드 캐시 덕에 재분석은 즉시(스캔 재사용).
- **한계(정직)**: 제목 없음(텍스트 AI 부재), 놓친 앵커로 인한 병합 의심 구간 존재(월 05=264s 등), 대담·스탠드업 오탐 가능 — AI 파이프라인 품질(스냅 15/16)에는 못 미침. 후속: 이 가중 매칭을 B1 로컬 캐스케이드(확실 구간 로컬·애매 구간만 비전)로 제품화하면 비전 비용 대폭 절감 가능.

## §57 무료 분할 후속 — 목 29/30 병합 수정 + 앵커 인점 리드 0.3s (2026-07-16)

사용자 실측 피드백("30번 파일이 중간부터 시작", "앵커샷보다 0.3초 앞 인점이 완벽").

- **57-a 목요일 884/900 오탐 판별**: 해당 구간 프레임을 PNG로 추출해 육안 확인 — 884s가 진짜 앵커 리드(헤드라인 "문어 금어기 해제…'밀집 조업' 기승"), 899s부터는 이미 바다 드론 샷. 900s 판정(가중거리 0.118)은 기사 본문 프레임의 오탐. 16s짜리 조각(884–900)이 병합 최소 15s를 아슬하게 넘겨 살아남은 것이 원인. ⚠️ Exporter의 PNG는 표준 디코더(ffmpeg/비전 API)가 못 읽는 변형이 나올 수 있다 — `ffmpeg -pix_fmt rgb24`로 재인코딩 후 사용.
- **57-b 실기 수정**: 29번을 884→1008로 확장, 30번 삭제, 31~33→30~32 재번호(총 33파일, 목 22~32). 이어서 전 경계 -0.3s 이동(각 영상 마지막 아웃점 11·21·32는 고정) — 연속성 위반 0, 콘솔 0.
- **57-c 제품 반영**: `NEWS_CUT_ANCHOR_LEAD_SECONDS = 0.3` 신설 — `snapItemsToAnchorStarts`(경계 스냅)와 `splitItemsAtInteriorAnchors`(내부 분할) 모두 검출된 앵커 샷 시작에서 0.3s 앞(0.1s 반올림, 0 클램프)에 인점을 잡는다. 경계 자체가 이동하므로 이전 아이템 끝도 함께 당겨져 공백·중복 없음. 게이트 1799/1799.
- **교훈**: 병합 최소 길이(15s) 직상의 짧은 아이템은 오탐 신호 — 무료 매칭 결과에서 20s 미만 아이템은 인접 앵커 판정을 프레임으로 재확인할 것.

## §58 무료 분할 신규 회차 테스트 — 7/15(수) 회차, 자동 임계 상한 보정 (2026-07-16)

사용자 지시("유튜브에서 다른 뉴스 가져와 무료 분할 시스템으로 테스트"). 새 회차(2026-07-15 수, 870s, H.264 1080p60)를 받아 §56 파이프라인을 그대로 적용했다.

- **58-a 자동 임계 오작동과 보정**: 이 회차는 긴 샷이 17개뿐이라 "최대 간극 중점" 규칙이 분포 꼭대기(0.244↔0.327)를 골라 16/17개를 앵커로 판정했다. 간극 탐색에 **중점 ≤0.2 상한**(참조 LOO ≤0.15의 여유 상한)을 추가하니 0.146↔0.179 간극이 선택돼 임계 0.162·앵커 11개로 정상화. 긴 샷이 적은(짧은) 회차일수록 상한이 필수다.
- **58-b 프레임 검증으로 오탐 3건 제거**: 가중거리만으로는 걸러지지 않는 유형을 §57 교훈(短아이템 재확인)대로 프레임 판독으로 잡았다 — ①기자 스탠드업(306s, 0.146) ②기자회견 발언자(140s, 0.129) ③같은 단신의 두 번째 항공 샷(844s, 0.136). 모두 중앙 인물+정장 구도가 앵커와 유사해 통과한 사례. 또 852s부터는 구독 범퍼(아웃트로)여서 마지막 아이템을 851.7s에서 마감(영상 끝 870s 대신).
- **58-c 산출**: 검증 확정 7개 아이템 → `20260716_news_33~39`(톱기사 260s 블록·일반 4건·스타필드 56s·단신 34s), 생성 실패 0·경계 연속·리드 0.3s 적용(§57)·콘솔 0. 기존 00~32 불변.
- **B1 제품화 시사점**: 가중 매칭은 후보 압축(17→11)에 강하지만 최종 판정은 프레임 확인이 필요 — 캐스케이드 설계에서 "가중거리 0.15 미만이라도 20s 미만 아이템·인접 쌍은 비전(또는 사용자 확인)으로 승급"이 안전하다.

## §59 인점 규칙 확정 — "앵커샷 전환 순간" 정밀 재스냅 + 2회차 추가 테스트 (2026-07-16)

사용자 피드백("34번 첫멘트 짤림, 38번 살짝 늦음 — 앵커샷으로 바뀌자마자 인점"). 규칙을 메모리(feedback-news-cut-inpoint)에 저장하고 파이프라인에 반영했다.

- **59-a 원인 규명**: 코스 2s 그리드의 샷 시작은 실제 전환보다 최대 6.5초 늦을 수 있다(스캔 결손 프레임이 가짜 샷 경계를 만듦 — 34번은 실제 320.25s인데 326s로 감지). 또 KBC는 하드 컷 외에 **와이프/전환 효과**로 스튜디오에 복귀하는 경우가 있어 인접 프레임 휘도차(0.25s 간격)로는 컷이 안 잡힌다.
- **59-b 정밀 재스냅(무료)**: 경계 T마다 [T-3.5, T+0.5]를 0.25s 스캔, **정착 프레임(T+0.5) 대비 역방향 탐색**으로 "새 샷과 실질 동일(차이<0.07, §44 동일샷≤0.05 기반)해지는 최초 시점"을 전환 종료로 확정. 창 전체가 동일 샷이면 12s까지 0.5s 역방향 확장. 인점 = 전환 - 0.3s(§57 리드 유지 — 절대 늦지 않음). 33~39 전 경계 재적용(34번 325.7→319.7, 5.7초 복구).
- **59-c 신규 2회차**: 7/8 수(1065s)·7/7 화(986s) 다운로드(H.264)→가중 매칭→프레임 검증→재스냅→생성. `20260716_news_40~51`(7/8, 12아이템)·`52~61`(7/7, 10아이템), 실패 0·경계 연속·콘솔 0.
- **59-d 프레임 검증에서 잡은 무료 매칭의 구조적 한계 4종**: ①스튜디오 샷 없이 화면+자막만으로 읽는 단신(7/7 여론조사·전남대병원·5·18, 7/8 장맛비)은 앵커 매칭 불가 — 단신 앵커샷이 8s 미만이라 긴 샷 필터도 통과 못함, ②기자 스탠드업 오탐(7/7 430s), ③인사→첫 리드가 무컷(같은 스튜디오 샷, 자막만 변경 — 7/8 74s)이라 역방향 탐색이 과확장, ④아웃트로 클로징 애니메이션이 스토리 종료보다 10s 이상 일찍 시작(7/8 1045.5s). 모두 프레임 판독(사람/비전)으로 확정 필요.
- **B1 캐스케이드 설계 반영**: 긴 샷 필터 8s는 단신 리드(5~8s)를 놓친다 — 꼬리 블록(마지막 1/4)은 5s로 낮추거나 전수 비전 승급이 안전. Exporter BMP가 PNG보다 안정적(§57 재확인, 대형 프레임도 BMP 권장).

## §60 오프닝 구조 규칙 학습 + 전 회차 재컷 + 신규 3회차 (2026-07-16)

사용자 지시("타이틀+하이라이트는 제외, 이후 첫 스튜디오 앵커샷부터 첫 기사 — 학습 후 기존 뉴스 재컷 + 2~3편 추가 테스트"). 규칙은 메모리 feedback-news-opening-structure에 저장.

- **60-a 기존 9회차 오프닝·아웃트로 감사**: 프레임 검증 결과 오프닝 위치는 7/8만 오류(인사말 제외하고 74s로 잡았던 것 → 규칙대로 앵커 등장 57.45s로 수정). 월·금·목(00~32)은 위치는 맞았으나 정밀 재스냅 미적용 상태였고 **마지막 파일 3개에 구독 범퍼 ~20s가 포함**돼 있었다 — 전 경계 재스냅 + 아웃트로 트림(1258.5/1036.25/1165.75)으로 수정. 최대 4.25s 늦은 인점(목 452→447.75)도 복구.
- **60-b 신규 3회차**: 7/6 월(1166s)→`news_62~72`(11개), 7/3 금(1073s)→`73~82`(10개), 7/2 목(977s)→`83~92`(10개). 생성 실패 0·경계 연속·콘솔 0. 총 무료 분할 산출 93파일(00~92).
- **60-c 프레임 검증으로 잡은 것들**: 숨은 단신 10건(7/6 교육청·한전·검찰·정전, 7/2 장윤기 감찰·익명게시판·염전·배수펌프·은행나무 등 — 스튜디오 리드가 8s 미만이라 긴 샷 필터 통과 못함), 오탐 6건(대통령 회의 102/126, 김민석 발언 382, 인터뷰 470/700, 스탠드업 610/774 — **0.137에서도 스탠드업 오탐 발생**, 임계 이하 전수 프레임 확인 필수), 7/3은 대체 앵커 회차였으나 세트 기반 가중 매칭은 유효.
- **60-d 역방향 확장 한계 수정**: 12s 고정 확장은 리드가 그보다 길거나 전환이 더 앞이면 "한계값"을 경계로 채택해 리드 도중 인점(최대 ~6s 잘림) 위험 — 12s 블록×3(최대 36s) 반복 확장으로 수정, 재실행에서 전 경계 전환점 수렴(한계 걸림 0). 미수렴 시 "수동 확인 필요" 표시.
- **한계(정직)**: 검증은 여전히 프레임 판독(사람) 의존 — 완전 무인화에는 숨은 단신·스탠드업 구분용 비전 승급(B1) 필요. 아이템 제목 없음(텍스트 AI 부재).

## §61 인점 리드 취소 + 경계 감사·재분할 93파일 (2026-07-16)

사용자 피드백("67번에 앞 기사 그림 보임 — 0.3s 리드 취소, 앵커샷 잡히자마자 인점" + "67~92 미흡점 먼저 보고").

- **61-a 자동 경계 감사**: 파일 인점 주변 5지점(-6/-4/-2/+0.5/+2s)의 참조 은행 가중거리를 측정하는 감사 스크립트(cdt-audit-boundaries) — 26경계 × 5지점 + 프레임 판독 12곳으로 §60 산출물을 검수. **확정 결함 4건**: 68·70·71(7/6 교육청·검찰·정전 단신)·89(7/2 익명게시판) 모두 "숨은 단신의 짧은 스튜디오 리드(5~8s)가 이전 파일 꼬리에 포함되고 파일은 자료화면부터 시작" — 자료화면 프레임을 경계 기준으로 삼은 것이 원인. 나머지 22경계는 정상(플래그 8곳은 하이라이트 카드·스탠드업·로고 화면의 유사도 잡음 0.13~0.15로 판독 확정).
- **61-b 리드 취소**: 인점 = 전환 컷 정확히(리드 0). `NEWS_CUT_ANCHOR_LEAD_SECONDS` 0.3→0(게이트 1799), 메모리 feedback-news-cut-inpoint 갱신. 93파일 전체 items.json 컷 값을 그대로 적용(cdt-apply-cuts — 스캔 없이 고속 반영).
- **61-c 결함 수정**: 경계 기준점을 리드 내부 시각으로 옮기고 정착 역방향 탐색 재실행 — 68→931.5, 70→1004.5, 71→1075, 89→816(리드 시작). 재감사에서 4곳 모두 "직전 비앵커 / 시작 앵커"로 반전 확인.
- **검증**: 93파일 연속성 위반 0 · 콘솔 0 · 아웃트로 유사도 0.179(비앵커) 확인.
- **교훈**: 숨은 단신 경계는 반드시 "리드 샷 존재 여부"를 인점 앞 6초 범위에서 확인할 것(가중거리 <0.12가 연속되면 리드가 앞에 있다). 감사 스크립트를 분할 후 정기 검수 단계로 유지.

## §62 최종 파이프라인 검증 — 신규 3회차 45파일(93~137) (2026-07-16)

사용자 지시("새 뉴스 3편 최종 컷 + 테스트"). 7/1 수(1109s)·6/30 화(1135s)·6/29 월(1179s)을 §61 확정 규칙(리드 0·오프닝/아웃트로 제외·리드 시작 경계)으로 분할했다.

- **62-a 오프라인 리드 런 탐지(신규 도구)**: 캐시된 2s 그리드 전 샘플의 참조 가중거리를 계산해 "낮은 거리 연속 런"을 나열(free-split-lead-runs) — 긴 샷 필터가 놓치는 짧은 스튜디오 리드를 프레임 판독 **전에** 자동 발견. 이번 3편에서 숨은 단신 리드 12곳을 사전 검출(7/1 교육감·수사과·장마·바지선 등 4, 6/30 AI산업·학폭·폭행 등 3, 6/29 사무실·민주노총·중앙공원·대불산단·제조업·경찰·졸음운전 등 5+).
- **62-b 프레임 판독 55장**: 오탐 10건 제거(발언·기자회견·인터뷰 — 이번에도 0.10~0.13에서 발생: 기자회견 0.1, 본회의장 좌석 0.073!), **스탠딩 앵커 해설 코너** 신유형 2건(6/30 652~820, 6/29 ~700~897 — 그래픽 보드 전환 포함 단일 아이템 처리), 아웃트로 3곳 트림.
- **62-c 산출**: 45파일 — 7/1 16개(93~108)·6/30 14개(109~122)·6/29 15개(123~137), 생성 실패 0. 전체 138파일 연속성 위반 0·콘솔 0.
- **62-d 생성 후 감사에서 잔여 결함 2건 수정**: news_104 인점이 기자회견 꼬리 2초 포함(924→927.25), news_131 교육청 리드 3초 누락(916→909.25). 감사 플래그 대부분은 본회의장·스탠딩 세트가 참조와 저해상 유사한 잡음 — **판정은 반드시 프레임으로**.
- **표준 절차 확정**: 스캔 → 가중 분석 → 리드 런 탐지(오프라인) → 프레임 판독 → items.json → 정밀 재스냅(리드 0) → 생성 → 경계 감사 → 잔여 수정. 이 9단계가 무료 분할의 최종형.

## §63 주말 회차 스트레스 테스트 — 토·일·금 31파일(138~168) (2026-07-16)

사용자 지시("주말 2개 + 평일 1개 정밀 테스트"). 7/11 토(592s)·7/12 일(744s)·6/26 금(1095s).

- **63-a 주말 포맷 실측**: 토요일은 주말 여성 앵커지만 세트가 평일과 유사해 가중 매칭이 부분 작동(0.105~0.13, 하이라이트 없이 ~9s부터 앵커 시작, 아웃트로 573s). **일요일은 레터박스(상하 검은띠)+전혀 다른 포맷**이라 참조 매칭 전면 실패(전부 0.25+, 런 0개) — ①lumaGrid가 16×9=144셀임을 확인(96×54 아님), ②레터박스 크롭(상하 1행) + 회차 내 동일샷 검색(free-split-sameshot)으로 부트스트랩, ③최종 판정은 프레임. 일요일은 구독 범퍼 없이 기사로 영상 종료.
- **63-b 일요일 결함 3건+누락 1건**: 레터박스가 휘도차를 압축해 정착 역방향 탐색이 과확장(병풀 밭↔스튜디오 유사 판정) — 인점 3곳이 앞 기사 꼬리 포함(512→518.5, 622.75→630, 708.75→711, 프레임 핀포인트 ±1s). 또 폭염과 갯벌 사이 **조국혁신당 단신**(리드 672.5)이 매칭에 안 잡혀 누락 → 금요일 14파일 재번호(154~167→155~168) 후 news_154(갯벌)로 삽입, 일요일 9아이템 완성.
- **63-c 산출**: 토 8개(138~145)·일 9개(146~154)·금 14개(155~168, 숨은 단신 2·전부 스튜디오 리드 확인) = 31파일. **총 169파일**, 연속성 위반 0·콘솔 0·일요일 전 인점 프레임 검증.
- **교훈**: 주말(특히 일요일) 회차는 참조 은행 무용 — 제품화 시 요일별 참조 세트 또는 회차 내 부트스트랩(동일샷 크롭 매칭) 필요. 레터박스 감지(상하 행 균일 저휘도) 후 크롭은 필수 전처리.

## §64 프로젝트 유실 복구 + 7/17 회차 E2E(분할→내보내기) 177파일 (2026-07-20)

사용자 지시("새 뉴스 1개 다운로드 → 분할 테스트 → 내보내기까지"). 7/17 금(850s)을 받아 처음으로 **분할→렌더 산출물까지** 전 구간을 완주했다.

- **64-a 프로젝트 유실 발견·복구**: 세션 시작 시 Premiere가 꺼져 있었고, 디스크의 ShortFlow_HostSmoke_20260712.prproj(7KB)와 최종 자동저장(7/19 23:05, 9KB)에 news 시퀀스가 **0개** — 169파일이 전부 미저장 메모리에만 있다가 Premiere 종료로 유실된 것. C: 전수 검색으로 다른 저장본 없음을 확정. **15회차 items.json 캐시가 온전해** 재구축 스크립트(cdt-rebuild-all: 미디어 15개 임포트→Train 시퀀스→클론 169개, 멱등)로 §63 최종 상태(일요일 재번호 포함)를 그대로 복원 — 총 생성 169, 실패 0, 약 5분. **교훈: 배치 작업 후 반드시 `project.save()`(UXP API 존재 확인, saveResult true)를 파이프라인 마지막 단계로 실행할 것.** items.json 캐시가 사실상의 프로젝트 원본이었다 — 캐시 보존이 복구를 가능하게 했다.
- **64-b 환경 기동 실측**: Bash/PowerShell 샌드박스에서 Start-Process로 띄운 Premiere는 스플래시 단계에서 CPU 정지(19s에서 10분+ 행, 로그 0바이트) — **explorer.exe 경유 실행으로 해결**(샌드박스 잡 상속 회피). UDT 서비스는 먼저 실행. 홈 화면 상태에서는 `ppro.Project.open(경로)`로 프로젝트를 열 수 있다(60s 폴링으로 활성화 대기).
- **64-c 7/17 분할**: 표준 9단계 그대로. 자동 임계 0.151 → 7앵커였으나 **140은 오탐**(아파트 항공샷+CG 보드가 0.139) — 혁신도시 리포트는 150s 단일 아이템. 리드 런 탐지가 **숨은 단신 2개를 사전 검출**: 494~504(min 0.077, 날씨 단신)·798~802(min 0.107, 브루셀라병 단신). 프레임 48장 판독으로 경계 9개 확정(58/208/318/368/493/536/664/798, 끝 830=구독 범퍼 직전) → 정밀 재스냅(56.75/206.75/318/367.5/492.75/534.25/664/797.75/829.5, 최대 이동 1.75s) → news_169~176(8개) 생성. 경계 감사: 8개 전부 시작 앵커(+0.5 값 0.077~0.139), 꼬리앵커 플래그 2건은 프레임 확인된 잡음(항공샷 0.137·조직도 CG 0.141).
- **64-d 내보내기 E2E(신규 구간)**: cdt-export-news169(YouTube 1080p HD.epr, IMMEDIATELY, §40 크기 안정화 판정)로 8파일 직접 렌더 — `C:\Users\seung\Videos\premiere_내보내기\20260716_news_169~176.mp4`, 52~222MB, ffprobe 길이가 아이템 길이와 프레임 단위 일치(150.0/111.2/49.5/125.3/41.5/129.7/133.8/31.7s). 실패 0, 콘솔 0.
- **64-e 최종 상태**: **총 177파일**(원본 16회차), 연속성 위반 0, 프로젝트 저장 완료(7KB→344KB, 시퀀스 193개 — gunzip 검증으로 news_000·176 실재 확인).

## §65 원클릭 분할 무료화 — STT 제거·화면 분석·내보내기 기본값 (2026-07-20)

사용자 지시("원클릭에서 STT 빼줘, 내보내기 설정도 다 해줘 — 버튼 하나로"). 구현·게이트·실기 E2E까지 완료.

- **65-a 설계 근거(오프라인 실험, 16회차 회귀 코퍼스)**: ①자동 임계 단독 = 주 앵커 오탐 39·미검출 19 → 완전 자동 부적합. ②왼쪽 절반 템플릿·동일샷 거리 = 참/오탐 분포 중첩(참 max 0.196 vs 오탐 min 0.004) → 기각. ③정적 꼬리(연속 diff<0.02, ≥12s) = 16/16 정답 일치 → 채택. 결론: **후보 도출은 무료 화면 매칭, 최종 판정은 기존 비전 분류기**(classifyAnchorShots+학습 코퍼스), 비전 실패 시 자동 임계 폴백+경고.
- **65-b 구현**: `src/news-visual-cut.ts`(매처·후보 수집·정적 꼬리·아이템 구성·경계 재스냅 — §59/61 도구 포트, 뒤로만 스냅 보장) + `src/news-anchor-reference-grids.ts`(참조 13장 번들) + index.ts `handleNewsCutAuto` 재작성(스캔→후보→비전/폴백→재스냅→생성→내보내기) + `resolveNewsCutExportTargets`(토큰 없으면 기본 프리셋 YouTube 1080p HD·기본 폴더 premiere_내보내기 — 일괄 내보내기 버튼도 동일 폴백). manifest `localFileSystem`은 verify:dist 불변식대로 `request` 유지 — 기본 폴더는 getEntryWithUrl 시도, 실패 시 렌더 promise 해소 판정. 신규 테스트 13개, 게이트 1812 통과.
- **65-c 실기 E2E(실제 버튼 클릭, Train_KBC_20260717_Fri)**: 스캔 425프레임(~9분) → **비전은 OpenAI 쿼터 소진(429)으로 자동 강등**(경고 로그 확인 — 폴백 경로 실전 검증됨) → 아이템 5개 → 20260720_news_00~04 생성 → 기본값으로 직접 렌더 5/5 성공(총 ~26분, 콘솔 0). 경계 실측 [56.75,207,318,368,664,830]: 시작 56.75·아웃트로 830 정답과 일치, 207/368은 정답 대비 +0.25/+0.5s(프레임 추출 지터), **숨은 단신 2건(492.75·797.75)은 강등 모드라 병합** — 런 후보에는 잡혀 있어 쿼터 충전 시 비전이 분리한다. 테스트 산출물(시퀀스 5·mp4 5)은 정리, 프로젝트 저장(193 시퀀스).
- **한계(정직)**: 강등 모드 = 숨은 단신 미분할 + 인점 ≤0.5s 지연 가능. 완전 품질은 비전 쿼터 필요(회당 후보 ~20-40장, 소액). 일요일 포맷은 참조 무용이라 비전 가용 시에만 의미 있는 결과.

## §66 원클릭 완전 무료화 — OpenAI 0회·퍼센트 진행·폴더 선택 (2026-07-20)

사용자 지시("OpenAI 아예 쓰지 말고 무료로", "뉴스 분할 창 STT·TTS 설명 제거", "진행 퍼센트 표시", "내보내기 폴더 지정 가능하게", "올려놓은 파일로 재테스트").

- **66-a 완전 무료 전환**: 원클릭에서 비전 판정 단계 삭제 — `freeAnchorTimes`(자동 임계 주 앵커 + 참조 거리 <0.085 강한 런만 숨은 단신으로 채택, 오탐 방지 우선)로 외부 API 0회. 뉴스 분할 탭에서 STT·TTS 문구 전부 제거, 진행은 단계별 퍼센트(1/4 스캔·2/4 재스냅 메시지+바, 생성·렌더는 기존 바) 표시. 탭에 "내보내기 폴더" 피커 추가(내보내기 탭과 같은 토큰 공유, 미선택 시 기본 premiere_내보내기) — 프리셋·폴더를 독립 해석하도록 `resolveNewsCutExportTargets` 분리. 게이트 1813.
- **66-b 사용자 파일 재테스트**: 사용자가 7/17 원본을 `20260717_kbc8_테스트용.mp4`로 개명·임포트 + 구 빌드 원클릭을 여러 번 눌러 20260720_news_00~15(호스트 내보내기 큐 잔여 포함)가 쌓여 있었다 — 원 파일명 **하드링크**로 기존 news_169~176 오프라인 예방, 큐 소진 대기(임시 .m4v 감시) 후 오늘자 시퀀스·파일 정리, `테스트용_분할소스` 시퀀스 생성 후 실제 버튼 클릭 E2E. **결과: 아이템 5개(후보 17), 렌더 5/5, 콘솔 0, 완주 ~15분.** 경계 [57.25, 207.75, 318, 368, 664, 832] — 무결 분할(오분할 0), 인점 오차 +0.25~1.0s, 아웃트로 832(정답 829.5 대비 +2.5s).
- **66-c 무료 모드 한계 실측(이 회차 기준 5/8)**: 날씨 단신(492.75)·브루셀라 단신(797.75)·여수 경계(534.25, 참조거리 0.138이 오탐 140의 0.139와 0.001 차 — 임계로 분리 불가)가 병합됨. 완전 분리는 비전 판정 또는 사람 확인 필요 — 무료 모드의 구조적 한계로 문서화.
- **잠긴 파일 주의**: 사용자 중단 실행의 렌더 산출물 일부(11·14)는 Premiere가 핸들을 쥐고 있어 삭제 불가 — 재시작 후 정리 필요.

## §67 학습 기반 무료 분할 — 코퍼스 학습 가중치 내장 (2026-07-20)

사용자 제안("여태 분할해놓은 걸 학습하면 무료로 가능하지 않을까") 채택·구현.

- **67-a 학습·검증(오프라인)**: 사람이 검수한 15회차 경계(177개)·그리드 5,968샘플로 로지스틱 분류기 학습(특징 = 144셀 luma + 앞뒤 프레임차 + 참조 가중거리). leave-one-episode-out 교차검증: 현행 83% → **하이브리드(현행 ∪ 모델 τ0.75) 재현 93%**, 토요일 0/8→7/8 회복. 학습·추론 전 과정 무료(API 0회).
- **67-b 내장**: `src/news-anchor-model.ts`(가중치 상수, 재학습은 scratchpad train-anchor-model.mjs) + news-visual-cut `scoreAnchorSamples`/`detectModelStarts`(τ 초과 ≥2샘플 런)/`hybridAnchorTimes`. 게이트 1816.
- **67-c 실기 검증(테스트용_분할소스, 실제 버튼)**: **아이템 8개·렌더 8/8·콘솔 0 — 경계 9개 전부 사람 검수 정답과 완전 일치**(56.75/206.75/318/367.5/492.75/534.25/664/797.75/829.5). §66에서 병합됐던 날씨·여수·브루셀라 경계 모두 분리. 회차 확정마다 코퍼스가 쌓여 재학습으로 계속 개선되는 구조.

## §68 주말 4회차 확장 — 분할 테스트·코퍼스 재학습 (2026-07-20)

사용자 지시("주말 뉴스 4회차 다운로드 → 분할 테스트 → 학습"). 7/4 토(668s)·7/5 일(1062s)·7/18 토(646s)·7/19 일(892s).

- **68-a 7/4 토 — 학습 전이 성공**: 7/11 토와 같은 세트라 §67 모델이 **9개 시작 전부 검출**(오탐 0, 미채택 런 8곳 프레임 확인 결과 전부 기사 내부). news_177~185 생성.
- **68-b 7/5 일 — 참조 부분 작동 + 검증서 2건 회복**: 일요일인데 평일 남성 앵커·같은 세트(7/12 일과 다름 — 일요일 포맷이 주차마다 다름을 실측). 하이브리드 7개 제안 → 프레임 검증에서 놓친 경계 2건(188 학교폭력, 906 소방청) 발견·추가, 오탐 런 2곳 제거 → 9아이템 확정, news_186~194 생성.
- **68-c 7/18 토·7/19 일 — 신형 주말 포맷 발견(한계)**: 여성 앵커·신규 밝은 세트·기사별 사이드 그래픽. 참조 매칭·모델 모두 무반응, 회차 내 동일샷(전체/왼쪽 절반, 다중 템플릿 0.055~0.12)도 앵커 순간 일부만 검출(카메라 앵글이 아이템마다 달라 왼쪽 절반도 0.09~0.13 편차). 프레임 판독로 스튜디오 리드가 약하거나 없는 단신 다수 의심 — **경계 확정 불가로 시퀀스 생성 보류**(잘못된 확정을 코퍼스에 넣으면 학습이 오염). 이 포맷은 2~3회차 사람 확정 데이터가 쌓여야 모델이 배울 수 있다 — 차기 과제.
- **68-d 재학습**: 확정 17회차(신규 7/4·7/5 포함)·6,632샘플로 가중치 갱신(뱅크 §67 대비 +664샘플). 게이트 통과.
- **최종 상태**: 총 **195파일**(news_000~194, 18그룹), 연속성 위반 0, 프로젝트 저장(224 시퀀스).

## §69 주말 포맷 확정 + 10회차 확장 — 29회차 학습 코퍼스 (2026-07-20 야간)

/goal 배치("신형 주말 포맷 확정→재학습 + 10회차 추가 다운로드·분할·학습").

- **69-a 신형 주말 포맷 확정(7/18·7/19)**: §68-c에서 보류했던 두 회차를 프레임 판독(28장)으로 확정 — 7/18 토 8아이템(news_195~202), 7/19 일 11아이템(news_203~213). 신형 세트 특징: 스튜디오 리드가 짧거나 카메라 앵글이 아이템마다 달라 동일샷 매칭 편차 0.09~0.13 — 리드 시작은 재스냅 확장 탐색이 커버(160.75 등). 19회차 재학습 커밋 81bfb5c.
- **69-b 10회차 확장(6/18~6/28)**: 전 회차 다운로드·임포트·2s 스캔 후, **평일 5(6/18·19·22·23·24)와 토 2(6/20·27)·목(6/25)는 하이브리드(§67 모델)가 자동 확정** — 모델 검출 8~19개/회차, 프레임 스팟만 판독. 일요일 2개는 포맷별 대응: 6/28(신형 여성 세트 — 모델이 앵커 3개 선검출, 학습 전이 확인, 프레임 19장으로 7아이템), 6/21(레터박스·§63형 — CROP 동일샷+프레임 15장으로 8아이템). news_214~342 생성, 전 회차 실패 0.
- **69-c 재학습**: 확정 29회차·10,669샘플(양성 739)로 가중치 갱신 — §67(15회차 5,968) 대비 코퍼스 1.8배. 일요일 3개 포맷(평일형·레터박스·신형) 모두 학습 데이터 확보. 게이트 1816 통과.
- **최종 상태**: **총 343파일(news_000~342, 29회차)**, 프로젝트 저장(382 시퀀스). 다운로드 원본 29개(Downloads, 프리미어 참조 중 — 이동 금지).

## §70 원클릭 실전 배치 — 연중 랜덤 10회차 버튼→렌더 + 38회차 학습 (2026-07-21 새벽)

사용자 지시("올해 랜덤 10회차, 실제 원클릭 버튼으로 렌더까지, 회차당 순차, 결과 전부 학습, 문제는 자율 수정").

- **70-a 실전 결과(실제 버튼 클릭, 자율 드라이버)**: 1/8·2/4·2/14(토)·2/24·3/6·3/31·4/13·4/16·4/29 **9회차 원클릭 완주 — 아이템 총 98개 생성·렌더 전부 성공(실패 0)**. 3/20만 "앵커 샷 없음"으로 정상 실패(명확한 에러 UX 확인). 완주 시간 회차당 14~22분. 산출: 20260720_news_08~51(44) + 20260721_news_00~32·45~65(54).
- **70-b 자율 운영 사건 2건**: ①드라이버 1이 3/31 파일 대기 중 침묵 → 죽은 것으로 오판하고 v2 기동 → **동시 2드라이버(단일 세션 위반)로 4/13이 두 번 실행**됨 — v1 종료 후 중복분(21_news_33~44, 인아웃 미적용 1건 포함) 시퀀스·렌더 삭제로 정리. ②4/13 중복 실행분에서 클론 인아웃 미적용 1건 실측(§40 계열 간헐 이슈). 교훈: 드라이버 생존 판정은 로그 침묵이 아니라 프로세스 존재로.
- **70-c 모델 일반화 실측**: 1~4월 회차는 **모델 검출 0**(세트가 학습 분포 밖 — 6~7월과 다른 스튜디오) → 화면 매칭 자동 임계만으로 동작. 그래도 렌더까지 완주(오프닝·아웃트로 제외 정상). 3/20은 매칭까지 무반응한 별개 세트.
- **70-d 학습**: 9회차 실측 경계(원클릭 산출)를 items.json으로 확정·코퍼스 편입 → **38회차·13,946샘플(양성 970) 재학습** — 1~4월 세트가 처음으로 학습에 들어감. 게이트 1816. 3/20은 캐시만 확보(부트스트랩 확정은 차기 — 코퍼스 오염 방지).
- **한계(정직)**: 신규 9회차 경계는 원클릭 산출을 오프라인 하이브리드로 교차확인(0331·0413 구조 일치 확인)했으나 §63식 전수 프레임 검증은 안 함 — 육안 확인에서 결함 발견 시 정정→재학습으로 반영.

## §71 배치3 원클릭 실전 6회차 완주 + 재학습 회귀 발견 → 38회차 유지 (2026-07-21)

사용자 지시("3/20 포함 8회차 같은 방식 진행", "문제는 자율 수정", 이후 "지금까지 작업한 것만 학습"). 재학습을 시도했으나 **회귀로 판명 → 38회차 모델 유지**(사용자 선택).

- **71-a 실전 결과(38회차 모델로 버튼→렌더)**: 8회차 완주. 건강 6개 = 1/12(15)·3/15(일,13)·4/5(일,16)·4/27(15)·5/18(12)·6/2(19아이템). 결함 2개 = 2/12(과병합 2아이템=전체가 1개)·3/20(과소분할 5아이템·246s 아이템). 3/20은 어제 실패→오늘 완주(에러 아님)이나 아이템 과소. 산출: 20260721_news_66~165. 5/18·6/2 스캔 캐시는 이 회차에서 생성.
- **71-b 핵심 — 재학습 회귀 발견**: 배치3 건강 경계를 items.json으로 코퍼스 편입해 재학습하니 모델이 **오히려 나빠짐**. 44회차(건강 6 추가)·40회차(5/18·6/2만) 둘 다 구 38회차와 A/B 비교로 회귀 확정 — 6/2 모델검출 21→0~1, 5/18 15→0, **무관한 기존 인분포 7/05 16→2·7/13 18→14**까지 붕괴. 원인: 배치3 items.json은 사람 검증 없는 원클릭 산출이라 화면매칭 거짓 앵커(footage 컷, 6/2=후보 32)가 양성 라벨로 섞이고, 검증된 코퍼스와 모순돼 L2가 가중치를 수축(검출 전역 감소). **결론: 재학습 안 함, 38회차(ee4c3b2, 13,946샘플·bias 1.9297) 유지. 회귀본 미커밋(트리 클린).**
- **71-c 교훈(재사용)**: 원클릭/하이브리드 자동 산출 경계를 **그대로 학습 라벨로 쓰면 모델을 오염**시킨다 — 특히 분포 밖 회차는 거짓 양성이 다수라 치명적. 학습 이득은 §63/§69식 **프레임 단위 앵커 검증**으로 정본 라벨을 만든 뒤에만 얻는다. §70(38회차)도 같은 미검증 방식이라 이미 소폭 저하됐을 가능성 — 필요 시 29회차(2ce023e) 대비 감사 권장. 배치3의 가치는 원클릭 파이프라인이 신규 6회차 렌더까지 정상임을 입증한 것(모델 개선 아님).
- **71-d 프레임 검증 심화 — 회귀 원인은 라벨 잡음이 아니라 분포 시프트(사용자 "제대로 학습" 요청 후속)**: 6/2를 프레임 판독(480x270 렌더→ffmpeg 라벨 몽타주→Read)해 **정본 앵커 14개** 확정(footage/CG 10개 제거). 그런데 정본 라벨로 재학습해도 회귀 그대로 — 38+정본6/2=39회차에서 6/2 모델검출 21→0, 기존 7/05 16→1. 진단(당시): OOD 편입이 확신을 τ0.75 아래로 압축 → 분포 시프트로 판단. ⚠️ **이 71-b·71-d의 "분포 시프트/회귀" 진단은 71-e에서 뒤집힘 — 아래 참조.**
- **71-e ⚠️ 71-b·71-d 진단 철회 — 진짜 원인은 학습 스크립트 underfit(사용자 "파이프라인 복구 먼저" 선택 후)**: 사용자가 잘못분할 시퀀스 29개(batch2 news 3~53 + batch3 66~152)를 직접 QC 플래그 → 확인 결과 **전부 컷 시작이 footage/CG/인터뷰**(앵커 아님, 증거 scratchpad/montage_flagged.jpg). news 시퀀스는 소스 전체 클론+in/out 구조라 getInPoint/getOutPoint=컷 경계. 0306 전체 프레임 판독으로 정본 앵커 10개 확정(현 라벨 12개 중 8개가 footage 거짓양성). **그런데 라벨 정정 A/B(같은 스크립트 A=원본 vs B=정정)가 완전 동일** → 파고드니 **train-anchor-model.mjs(300ep/LR0.4/L2 4e-5)가 커밋 모델을 재현 못 함(심한 underfit)**: 같은 스크립트 38회차 원본이 6/2 검출 0(커밋 21). 즉 71-b/71-d의 회귀는 **underfit 스크립트로 커밋 모델과 비교한 교란**이었고, batch3·분포시프트 결론은 근거 부실 → **철회**. 복구 조사: 특징(frameDiff=sum/len/255, refDist 참조=NewsCut_KBC_20260715 13앵커=NEWS_ANCHOR_REFERENCE_GRIDS)은 추론과 일치. 하이퍼파라미터 스윕 결과 LR=1·L2=0·EPOCHS=800이 커밋 검출을 **평일** 재현(6/2=21·7/05=16·7/13=17)하나 **일요일 발산**(7/12 R14 vs 커밋5·정답9 / 6/28 R13 vs 커밋4·정답7). 커밋 bias 1.93은 어떤 GD 설정으로도 불가(검출 맞추면 bias 5~9). **결론: 커밋 모델은 스크래치패드에 없는 다른 구현으로 생성 → controllable 재학습 불가. 두 모델 다 정답 대비 과검출(무료비전 구조적 과분할). 커밋 38회차 유지가 최선.** 진짜 해결 = 학습+검증 파이프라인(정답 아이템수 지표·hold-out)을 처음부터 재구축하는 별도 프로젝트. train 스크립트에 EPOCHS/LR/POSW/L2 env 파라미터 추가.

## §72 학습 파이프라인 재구축 — 홀드아웃 F1 게이트, 45회차 재학습 F1 80.7→88.0 (2026-07-21)

사용자 지시("내보내기 파일 삭제(원본 유지), 파이프라인 새로 구축해서 학습 환경"). §71-e의 재현 불가 문제를 정면 해결 — 이제부터 학습은 이 파이프라인만 쓴다.

- **72-a 정리·데이터 구출**: premiere_내보내기 234파일(23.17GB) 휴지통 이동(완전삭제는 사용자 휴지통 비우기). Downloads 원본 48개(14GB) 유지. 스크래치패드의 스캔 캐시+검증 라벨 95파일(53MB)을 **training-data/news-anchor/로 구출** — 라벨(items.json 45회차·0306 정정본·참조 뱅크)은 git 커밋, 캐시는 gitignore(원본에서 재생성 가능).
- **72-b 파이프라인(scripts/news-train/)**: lib.mjs(추론 .test-build/news-visual-cut.js 그대로 사용 — 특징 불일치 원천 차단, 경계 F1 ±8s 지표) / eval.mjs(회차별·전체 P/R/F1) / train.mjs(6종 스윕, 홀드아웃 4회차=0709목·0711토·0712일레터박스·0628일신형 제외 학습, **커밋 모델 베이스라인을 홀드아웃 F1로 이겨야만 --write 반영**). 정정본(.items.corrected.json) 존재 시 자동으로 정답 채택.
- **72-c 결과**: 베이스라인(§70 모델) 전체 45회차 F1 80.7(P74·R89·FP168) — 과검출·일요일 붕괴(6/21·7/12=0, 7/19=11.8) 정량화. 스윕 최고 **ep1500·lr0.6·posW4·l2=1e-4**: 홀드아웃 F1 52.2→**71.0**(+18.8: 6/28 40→72.7, 7/09 62→77, 7/11 82→100; 7/12 레터박스는 양쪽 0). 전 회차 재학습 반영 후 전체 **F1 88.0(P88·R88·FP66)** — 과검출 절반 이하, 재현율 유지. 핵심 개선 = 양성 가중 8→4(과검출 억제). 게이트 1816.
- **72-d 남은 한계(정직)**: 7/12(레터박스)·7/19(신형)·6/21 일요일 포맷은 신모델도 실패/부분(참조 뱅크가 평일 스튜디오 위주) — 참조 뱅크 확장 또는 포맷별 모델이 필요한 별개 과제. 신모델 실기(원클릭 버튼) 검증은 다음 회차 테스트에서.
- **72-e 신 모델 실기 검증(7/20 신규 회차, 원클릭 버튼)**: 코퍼스 밖 7/20(월) 944s 회차(29erp5coov0, H.264 320MB)로 실제 버튼 E2E — **앵커 11개(매칭 후보 27 → 모델 11 정제)·아이템 11·시퀀스 11/11·렌더 11/11 실패 0**(20260721_news_166~176, 아웃트로 924.3s 자동 제외, 완주 ~12분). 시작 프레임 몽타주 판독: **11/11 전부 앵커 데스크 샷에서 시작 — 오분할 0**(173·176은 +1s 프레임이 전환 순간이라 ±2s 프로브로 앵커 확인). 길이 분포 37~142s 건강. 1차 Plugin.load 타임아웃은 25s 대기 재시도로 해결(§40 패턴). 프로젝트 저장(시퀀스 609). 증거: scratchpad/montage_0720.jpg.

## §73 일요일 포맷 참조 뱅크 — 신형 세트 해결·F1 89.2·7/19 실기 완주 (2026-07-21)

사용자 /goal("design→테스트→학습 무승인 연속 진행"). PDCA plan/design: docs/01-plan·02-design/features/sunday-format-reference-bank.

- **73-a 구현(측정 기반 2회 피벗)**: 검증 라벨 앵커 리드를 프레임 몽타주로 선별(6/21 2·7/18 6·7/19 3)→extract-refs.mjs로 그리드 추출. ①min 합성: 전 회차 FP 노출로 88.0→81.6 기각 ②전역 min 라우팅: 평일 근소차 오라우팅(0224 100→58.8) 기각 ③**압도 근접 라우팅(dist<0.05·평일 절반 미만)**: 진짜 포맷 0.001~0.025 vs 오라우팅 0.07~0.09 완벽 분리 → 채택(selectAnchorMatcher). **레터박스 뱅크는 기각** — 검은 띠 저분산→고가중으로 footage 매칭(6/21 17·7/12 31, 목표 ≥60 미달) — 크롭 그리드 후속 과제, extract-refs로 재추출 가능.
- **73-b 결과(오프라인 46회차)**: 전체 **F1 88.0→89.2**(TP+22·FN−11·FP 68). 신형: 7/18 73.7→**94.1**, 7/19 30.8→**90.9**. 평일·6/28(72.7)·7/20(100) 완전 보존. 게이트 재학습은 현행 모델을 못 이겨 모델 불변(게이트 정상 — 개선은 매처가 전담). 게이트 1820(+4 유닛).
- **73-c 실기(예전 완전 실패 회차)**: 7/19를 실제 원클릭 버튼으로 — §68 당시 "모든 무료 신호 무반응"이던 회차가 **앵커 11(후보 29·모델 11)·시퀀스 11/11·렌더 11/11 실패 0**(news_177~187), 경계 10/11이 검증 라벨과 0.25s 단위 일치(1건은 다른 위치의 앵커 리드 — 시각 판독상 정상 컷). 시작 프레임 몽타주 **11/11 앵커 시작·오분할 0**(scratchpad/montage_0719_live.jpg).
- **한계(정직)**: 레터박스 일요일(6/21·7/12)은 여전히 F1 0(뱅크 기각으로 원위치) — 유효 영역 크롭 그리드가 필요한 별개 과제. 신형 뱅크의 미학습 회차 전이는 7/18↔7/19 상호 검증뿐 — 다음 신형 일요일 방송에서 실측 권장.
- **73-d ⚠️ 정정 — "레터박스 포맷"은 존재하지 않음(사용자 원본 검수로 발견)**: 사용자가 6/21·7/12 원본을 직접 확인("기본 파일이랑 프레임이 다르지 않은데?") → 재검증 결과 **원본은 정상 꽉 찬 화면·평일과 같은 스튜디오, 단지 업로드가 1280x720**(타 회차 1920x1080). 검은 테두리는 **임포트 아티팩트** — 720p 클립이 1080 Train 시퀀스에 원본 크기로 놓여 사방 여백 발생(scratchpad/compare_0621.jpg). 이 오염된 렌더로 스캔 캐시를 만들어 "레터박스 포맷·크롭 그리드 필요"로 오판(§63 "레터박스 CROP"도 같은 아티팩트 유래 추정). **크롭 그리드 과제 취소.** 실사용자 시나리오(자기 시퀀스에서 원클릭)에서는 발생하지 않는 테스트 환경 버그. 조치: 6/21·7/12 시퀀스 프레임 일치 재생성→재스캔→재평가(→73-e).
- **73-e 720p 정정 결과 — 7/12 F1 0→90.0·전체 90.0 돌파**: 6/21·7/12 시퀀스를 프레임 일치(1280x720)로 재생성(cdt-fix-720p.mjs: 삭제→createSequence→setVideoFrameRect→createSetSettingsAction→삽입, frame 검증)→재스캔→캐시 교체. **7/12: F1 0→90.0(P82·R100)** — "레터박스 공백"은 전적으로 아티팩트였음. 6/21: 0→55.6(부분 — §69 CROP 시대 라벨 정밀도 재검토 여지). **전체 46회차 F1 90.0(P87·R93)**. 게이트 재학습은 미채택(현행 모델 유지 — 홀드아웃 84.9 방어). 오염 캐시는 .polluted로 격리 보존.

## §74 신규 5회차 배치(주말 포함) — 코퍼스 51회차·F1 90.2·앵커 왼쪽 규칙 (2026-07-21 저녁)

사용자 /goal("§73 정정+재스캔·학습 후 주말 포함 5회차 다운로드→테스트→학습 무승인 연속"). §73-d·e에 이어 실행.

- **74-a 실전(실제 버튼, 순차 5회차)**: 6/14(일)·5/25(월)·6/10(수)·5/12(화)·6/13(토) — 다운로드(H.264, 6/13 403 재시도 1회) → 원클릭 완주 5/5. 산출 20260721_news_188~242(렌더 54, 실패 0·6/14 시퀀스 1건 생성 실패는 §40 계열 간헐). 5/12는 **판독 완벽(10/10 앵커 시작)**.
- **74-b 판독·정본 라벨(사용자 규칙 반영)**: 시작 프레임 몽타주 전수 판독 — 예측 55 중 앵커 시작 48, 과분할 7(발언·회견·헬기·인터뷰 등 footage 내부 컷)은 앞 아이템에 병합해 정본 48아이템 확정. **사용자 육안 검수로 판별 규칙 확립: "앵커는 항상 화면 왼쪽" — 가운데 인물은 인터뷰이/발언자(footage)**(메모리 영구 기록). 사용자 지적 병합(211+212·216+217·218+219·233)은 정본에 전부 반영 확인.
- **74-c 학습**: 스캔 5회차(2,180프레임) → **코퍼스 51회차**(라벨 git 커밋). 현행 모델의 신규 5회차 성적 F1 92.3(R100 — 놓친 앵커 0, FP 8=병합된 과분할). 게이트 학습은 최고 80.0 < 베이스라인 84.9로 **모델 불변**(이미 커버하는 회차라 이득 없음 — 게이트 정상). **전체 51회차 F1 90.2(P87·R94)**. 게이트 1820.
- **한계(정직)**: 과분할 잔여(FP 83/51회차) — 가운데 인물 발언 장면 오검출이 주원인. "앵커 왼쪽" 규칙의 특징화(왼쪽 영역 가중)가 차기 개선 후보. 6/28 신형은 여전히 홀드아웃 0(재학습 후보들에서) — 현행 모델은 72.7 유지.
- **74-d 앵커 왼쪽 특징화 실험 — ❌ 기각(정직 기록)**: "앵커=왼쪽" 규칙을 왼쪽 7열 참조 매칭 필터로 특징화해 과분할 억제 시도(anchor-left-feature.plan.md). 구현·유닛(+2)·51회차 스윕까지 완료했으나 **전 임계에서 하락**(OFF 90.2 vs 최고 87.8 — FP 소폭↓ 대비 R 급락 93.8→88.2). 원인: 왼쪽 열=매일 바뀌는 앵커 의상이라 참조 매칭이 의상에 과민. 코드 전량 회귀(모델·파이프라인 불변, 게이트 1820), 계획 문서에 결과·후속 방향(시간적 미세 움직임 신호) 기록. 하이브리드가 후보를 제거 못 하는 구조(∪ 결합)라 모델 재학습으로도 FP 억제 불가함을 §74에서 확인 — FP 억제는 별도 신호가 필요하다는 지식 확보.
- **74-e 움직임 신호 실험 — ❌ 분리도 없음(코드 변경 0)**: FP 억제 2차 시도(anchor-motion-signal.plan.md). §74-d 교훈대로 **실험 먼저** — 51회차 TP 542/FP 82의 리드 창 움직임 지표 분포를 쟀더니 중앙값이 겹침(TP 0.024 vs FP 0.030 등). 원인: 앵커 배경 비디오월이 애니메이션이라 "스튜디오=정적" 가설 불성립. 어떤 임계도 TP 무손실 FP 제거 불가 → 미착수 종료. 무료 신호로 가능한 FP 억제 수단은 소진 — 남은 경로는 비전 판정 재도입(유료) 또는 고해상 스캔(성능 비용), 착수는 사용자 판단.

## §75 배치7(5회차)·코퍼스 56회차 F1 90.7 + 무료 FP 억제 수단 소진 확정 (2026-07-21 밤)

사용자 지시("5개 더 다운받고 분할 후 고해상 실험, 무승인 완주"). 스크래치패드 임시폴더 청소로 호스트 프로브 전량 유실 → 재생성(중요 자산은 training-data·repo 이전 덕에 무손실 — §72-a 결정이 적중). 프리미어 사망도 자율 복구(prproj 직접 기동→UDT 재시작).

- **75-a 실전(버튼, 순차 5회차)**: 5/29(금)·5/31(일)·6/07(일)·6/08(월)·6/11(목) — 원클릭 5/5 완주, 렌더 49 실패 0(news_243~291). 판독: 앵커 시작 47/49(5/29·6/07·6/08 완벽, 5/31 스탠드업 1·6/11 행사장 1 병합). 정본 47아이템 라벨 확정.
- **75-b 학습**: 스캔 5회차 → **코퍼스 56회차**. 현행 모델의 배치7 성적 **F1 96.9(R100·FP3)**. 게이트 학습은 최고 78.3 < 84.9로 모델 불변(정상). **전체 56회차 F1 90.7**(90.0→90.7).
- **75-c 고해상 인물판정(피부색 규칙) 실험 — ❌ 기각**: 480x270 RGB에서 고전 피부색 규칙으로 왼쪽 인물 블롭 위치 판정 시도(TP 57 vs FP 14). 결과: FP 13/14는 걸러내나 **TP 통과 18/57(69% 오제외)** — 얼굴이 작아 배경 웜톤(0306 세트는 프레임의 98.5%가 "피부색")이 지배. 색상 규칙으로는 인물 검출 불가.
- **75-d 결론 — 무료 FP 억제 3연속 기각으로 수단 소진 확정**: ①참조 픽셀 매칭(§74-d 의상 과민) ②시간적 움직임(§74-e 배경 비디오월) ③피부색 위치(75-c 배경 웜톤). luma/RGB 규칙 기반으로는 과분할 FP를 못 줄인다. **남은 유일한 경로 = ML 비전 판정 재도입(유료, 회차당 후보 10~20프레임 소량)**. 현 무료 시스템은 F1 90.7·R94(배치7 신규는 96.9·R100)로 안정 — 내부 베타 용도 충분 판단은 사용자 몫.

## §76 분할만 버튼 + 내보내기 화질(코덱·해상도) 선택 — 실기 720p 검증 (2026-07-21 밤)

사용자 요청("내보내기 없이 분할만 하는 버튼 + 코덱·해상도 선택을 뉴스 분할 탭에") + /goal(무승인·UI 배치·테스트·문제 즉시 해결).

- **76-a 구현**: ①`news-cut-split-btn` "분할만 — 시퀀스 생성까지(내보내기 없음)" — 원클릭 흐름을 `runNewsCutAutoFlow(exportAfter)`로 리팩터해 공유, 분할만은 생성 후 "검토 후 '일괄 내보내기'" 안내로 종료(생성 목록이 일괄 내보내기 버튼을 활성화) ②`news-cut-preset-select` 화질 9종 — auto(내보내기 탭 설정)/H.264 4K·1080p·720p·480p·원본일치/HEVC 4K·1080p·720p, 시스템 .epr 경로 매핑(`NEWS_CUT_PRESET_CHOICES`). 우선순위: 탭 선택 > 내보내기 탭 프리셋 > 기본 1080p. 원클릭·일괄 내보내기 모두 적용.
- **76-b 실기 E2E(7/20 시퀀스 재사용)**: 새 dist 리로드 → UI 존재(select 9옵션·버튼) → 720p 선택 → **분할만: 11시퀀스 생성(news_292~302)·렌더 0 확인** → 같은 세션 일괄 내보내기 클릭(선택 유지 확인) → **11/11 렌더·ffprobe 실측 h264 1280x720**(선택 프리셋 실적용 증명). UI 배치는 풀폭 772px 정렬로 기존 패턴 일치(Browser 실측).
- 게이트 1820. 참고: 시스템 프리셋 경로는 내부 베타 관례(Premiere 2026 고정 경로 — DEFAULT_EXPORT_PRESET_PATH와 동일 정책).

## §77 분할 안전성 강화 6종 — HEVC 미지원 결함 발견·수정 포함 (2026-07-22 자정)

사용자 지시("①~⑥ 전부 무승인 진행"). 전 항목 구현·실기 검증 완료.

- **77-a ①프레임 불일치 가드(§73-d 제품화)**: `detectMismatchBorder`(전 구간 6점 프로브의 상·하단 행/좌·우 열이 전부 검으면 아티팩트 판정, 유닛 3종) — 본 스캔 전 "0/4 프레임 점검"에서 조기 차단. 실기: 720p 클립을 1080 시퀀스에 넣은 ERRTEST에서 수 초 내 명확한 에러 확인, 건강 회차(7/20)에서는 오탐 0·분할 11/11 동일.
- **77-b ②화질 선택 안전성 — 실기가 결함 발견**: HEVC 직접 렌더 프로브 결과 **"Unsupported video codec: HEVC"** — AME 미설치 환경의 Premiere 직접 렌더는 HEVC 미지원. 조치: HEVC 선택×AME 미설치면 **클릭 즉시** 명확한 에러(스캔 15분 후가 아니라 선검증), 옵션 라벨 "(AME 필요)" 표기, 선택 .epr 파일 존재 사전 확인(`assertPresetFileExists` — 타 Premiere 버전 대응).
- **77-c ③에러 경로 실기 3종**: HEVC 가드·짧은/빈 시퀀스 가드·불일치 가드 — 전부 명확한 한국어 에러로 발화 확인(ERRTEST 시퀀스 2개 정리 완료).
- **77-d ④시퀀스 생성 간헐 실패(6/14 1건) 완화**: createNewsItemSequences에 **1회 재시도**(500ms 후, INVALID_RANGE는 재시도 제외 — §40 계열 간헐 대응). 간헐이라 실기 재현은 불가 — 다음 발생 시 자동 복구 기대(정직: 근본 원인은 미규명).
- **77-e ⑤오프라인 회귀 게이트 신설**: `npm run check:news` = scripts/news-train/regression.mjs — 고정 4회차(0512·0607·0720 F1 100, 0719 ≥90) 스냅샷 비교, 매처·모델·분할 로직 변경 후 실기 없이 회귀 감지. 현재 통과.
- **77-f ⑥출력 폴더 쓰기 사전 점검**: exportNewsSequencesWith 시작 시 프로브 파일 생성·삭제 — 드라이브 분리·권한 문제를 렌더 N개 실패 전에 잡는다. 한계(정직): UXP에 디스크 여유 공간 API가 없어 용량 부족은 사전 감지 불가.
- 게이트 1823(+3 유닛) · check:news 통과. 산출 부산물: 정상 경로 검증에서 news_303~313 생성(내보내기 없음).

## §78 비전 앵커 검증(유료·옵트인) 배선 — 쿼터 소진으로 최종 실증만 보류 (2026-07-22)

사용자 지시("다음 사이클 vision-anchor-verify"). 무료 FP 억제 3연속 기각(§74-d·e·75-c) 후 유일 경로. plan: vision-anchor-verify.plan.md.

- **78-a 발견 — 새 개발이 아니라 재배선**: §65 무료화 때 분리된 비전 자산이 온전히 생존 — `OpenAITextClient.classifyAnchorShots`(untrusted-data·참조 이미지·응답 검증) + 자막 경로의 예시 코퍼스(`loadAnchorExemplars`)·배치 규약. 원클릭에만 연결하면 됐다.
- **78-b 구현**: 체크박스 `news-cut-vision-check` "AI 비전 검증(유료)" 기본 OFF. `hybridAnchorTimes` 확정 직후 후보 프레임(t+1.2s, 320px PNG)을 예시 참조 ≤5장과 함께 판정, isAnchor=false·conf≥0.6 제외. 안전장치: API 실패 시 경고+무료 결과(우아한 강하), 잔여<3이면 필터 해제.
- **78-c 실기 반복이 잡은 결함 2건**: ①UXP checkbox `dispatchEvent(change)` 예외(§25-b 계열 — 드라이버에서 제거) ②480px 배치가 어댑터 1.2MB 캡 초과 → **320px + 바이트 기준 동적 청크**(참조 포함 1.1MB 보장)로 수정, 재실기에서 요청이 OpenAI까지 정상 도달 확인.
- **78-d 현재 상태**: 강하 경로 2회 실증(캡 초과·쿼터 소진 각각 경고 후 무료 결과 완주). **최종 필터 실증만 OpenAI 쿼터 소진으로 보류** — 빌링 충전 후 체크박스 켜고 6/10 재실행하면 13~15→~9 아이템 확인 예정. 게이트 1823·check:news 통과.
- 부산물: 검증 런들로 news_303~341대 시퀀스 다수 생성(내보내기 없음) — '이전 아이템 정리'로 일괄 삭제 가능.

## §79 배치8(5회차) — 코퍼스 61회차·전체 F1 91.3·배치 F1 98.1 (2026-07-22 새벽)

사용자 지시("5회 더 다운받아 테스트 후 학습"). 5/13(수)·5/15(금)·5/16(토)·5/26(화)·6/16(화) — 절차는 §75 동일(BATCH8-STATE.md).

- **79-a 실전**: 다운로드 5/5(전부 1080p, 6/16 403 재시도 1회) → 버튼 완주 5/5, 렌더 55 실패 0(20260722_news_39~93). 판독: 앵커 시작 53/55(5/15·5/16·5/26 완벽, 5/13 문서CG 1·6/16 로고CG 1 병합). 정본 53아이템.
- **79-b 학습**: 코퍼스 **61회차**. 현행 모델의 배치8 성적 **F1 98.1(P96·R100·FP2)** — 역대 배치 최고. 게이트 학습 미채택(78.3<84.9 — 모델 유지). **전체 61회차 F1 91.3**(90.7→91.3, 신규 회차가 평균을 끌어올림). 게이트 1823·check:news 통과.
- 운영 사건: 셸 `&` 백그라운드 실수로 5/15 검증 출력 유실 → 완주 후 재조회로 복구(경계는 시퀀스에 보존되므로 무손실). 로그 파일 워처 패턴으로 비추적 체인도 감시 가능 확인.

## §80 배치9(5회차) — 코퍼스 66회차·전체 F1 91.8·배치 F1 98.2 (2026-07-22 오전)

사용자 지시("5회차만 더"). 5/14(목)·5/22(금)·5/23(토)·6/09(화)·6/12(금) — 절차 §75 동일(BATCH9-STATE.md).

- **80-a 실전**: 다운로드 5/5(전부 1080p) → 버튼 완주 5/5, 렌더 57 실패 0(20260722_news_94~150). 판독: 앵커 시작 55/57(5/22·5/23·6/09·6/12 완벽, 5/14 스탠드업·연단 2 병합). 정본 55아이템. §77 프레임 점검 가드가 매 실행 정상 통과(오탐 0).
- **80-b 학습**: 코퍼스 **66회차**. 배치9 성적 **F1 98.2(P96·R100·FP2)**. 게이트 미채택(78.9<84.9 — 모델 유지). **전체 66회차 F1 91.8**(91.3→91.8). 게이트 1823·check:news 통과.

## §81 배치10(5회차) — 코퍼스 71회차·전체 F1 91.9·배치 F1 94.6 (2026-07-22 오후)

사용자 지시("5개 영상 추가 테스트"+"스캔 끝나면 학습까지 쭉"). 5/19(화)·5/21(목)·5/30(토)·6/03(수)·6/17(수) — 절차 §75 동일(BATCH10-STATE.md).

- **81-a 실전**: 다운로드 5/5(전부 1080p, 5/21 403 재시도 1회) → 버튼 완주 5/5, 렌더 49 실패 0(20260722_news_151~199). 판독: 앵커 시작 45/49(5/30·6/03 완벽, 5/19 발언 1·5/21 연설·항공 2·6/17 발언 1 병합 — 전부 "가운데 인물" 유형). 정본 45아이템.
- **81-b 발견**: 6/03 회차의 328s 아이템(150→465s)은 과소분할이 아니라 **지자체 투표율 CG 특집 블록**(앵커 등장 없음)으로 판명 — 프로브 3프레임 전부 전면 CG. 원클릭 6분할이 정답과 일치.
- **81-c 학습**: 코퍼스 **71회차**. 배치10 성적 **F1 94.6(P92·R98·FP4·FN1)** — FP 4는 전부 판독에서 병합한 가운데 발언자/CG 유형(비전 검증 대상). 게이트 미채택(78.3<84.9 — 모델 유지, 3배치 연속 동일 패턴: 현행 모델이 신규 회차를 이미 90~100으로 처리). **전체 71회차 F1 91.9**(91.8→91.9). 게이트 1823·check:news 통과.

## §82 하단 띠(인용·이름표) 무료 FP 필터 — 4차 시도 첫 채택, 전체 F1 92.0 (2026-07-22 오후)

사용자 제안("앵커샷 직후 하단 띠·흰 띠 텍스트는 무조건 한 줄") 기반. 무료 FP 억제 3연속 기각(§74-d 픽셀·§74-e 움직임·§75-c 피부색) 후 **첫 채택** — 사람/의상이 아닌 방송 CG 기하라 기각 원인이 재발하지 않았다. 계획·실측 전모는 docs/01-plan/features/anchor-lowerthird-band.plan.md.

- **82-a 실측(소스 33회차 377경계 × 3오프셋)**: "한 줄 띠 필수" 정방향 규칙은 기각 — 헤드라인 띠는 리포트 중에도 계속 떠서 footage FP가 TP와 동일 지표이고, 흰 티커 병합·CG 특집 무띠(6/03) 때문에 TP 통과율 78%가 상한. **채택은 역방향**: "흰 띠(평균>115 런 ≥14행@270px)는 있는데 큰 헤드라인 글리프가 12행 미만"이 +2s·+4s 양쪽 반복이면 인용·이름표 띠로 배제, 첫 후보(오프닝) 면제. 현행 TP 오배제 **0/283**·FP 배제 5/24(배치10 유형 157·165·190 포함), 구형(1~4월) TP 4 희생(소멸 포맷 — 수용).
- **82-b 제품화**: src/news-visual-cut.ts 순수 함수 3종(+유닛 6) → index.ts 원클릭(비전 검증 뒤·재스냅 앞, 후보당 480px BMP 2프레임, 실패 시 통과) → lib.mjs applyQuoteBandFilter + bandprobes 캐시 33회차(training-data, gitignore) → eval/regression 반영. **전체 71회차 F1 91.9→92.0**(FP 94→89), 배치10 회차 재평가: 5/19 94.7·5/21 93.3·5/13 100·6/17 100. 게이트 1829·check:news 통과(0512·0607·0720 판정 변화 0).
- **82-c 실기**: 5/21 분할만 버튼 재실행 — 앵커 9→**하단 띠 검사 1건 배제→8개**(오프라인 예측과 일치: 회견 @220 배제·항공 @384 잔존), 시퀀스 8개 생성 실패 0(news_200~207).
- **한계**: 헤드라인 띠가 계속 떠 있는 footage 경계 FP·무띠 항공 FP는 이 신호로 구분 불가 — 잔여 경로는 비전 검증(쿼터 충전 대기)뿐이라는 결론 유지.
- **82-d 비전 ON 실기(쿼터 확인)**: 5/21 비전 체크박스 ON + 분할만 재실행 — 비전은 "exceeded your current quota"로 우아한 강하, 하단 띠 필터는 정상 동작(1건 배제→8개, 시퀀스 8 실패 0). 비전+띠 필터 동시 활성 조합의 순차 동작 실증. 항공샷 제거 최종 실증은 빌링 충전 후.

## §83 UX/UI 전체 폴리시 — Explore 감사 기반 16건 일괄 수정 (2026-07-22 오후)

사용자 지시("비전 보류, UX/UI 전체적으로 다듬어줘"). Explore 서브에이전트로 13탭 전수 감사(96버튼 바인딩 전수 대조 — 죽은 UI 0) 후 심각·중간 전건 + 저위험 사소 수정.

- **83-a 구조·번호**: 브랜드 탭 섹션 번호 02 중복→01·02·03, QC 탭 02단독→01, 음악·효과음 탭 DOM 역순(01·02·04·03)→01~04 정렬.
- **83-b 레이아웃**: ①.form-actions에 flex-wrap(중간 폭 4버튼 가로 넘침 방지) ②.export-action-grid 홀수 마지막 버튼 전폭 규칙 ③flex 컨테이너에 얹혀 무효였던 grid-template-columns 정리 — brand/final-qc/ai-queue 폼은 flex-basis calc(25%-8px)로 **4열 밀도 의도 복원**(§25-b UXP grid 붕괴 회피 유지), 죽은 미디어쿼리 5건 제거.
- **83-c 마이크로카피**: 자산→에셋(토스트 3건), Safe Zone→안전 영역(3곳), 출력→내보내기(방식·범위·즉시 인코딩·폴더 실패 문구), 커버→썸네일(버튼·토스트·에러 4건), "SVG fallback"→"SVG로 저장".
- **83-d 상태 힌트**: 초기 disabled 버튼 3곳(뉴스 분할 생성·일괄 내보내기 / 레퍼런스 추가 / 마커 일괄 생성)에 활성화 조건 action-note 추가. 고아 label(로고 파일) for 연결, 경고색 하드코딩 #f6c458→var(--warning), --fs-2xs 9.5→10px(저대비 소형 텍스트 가독성).
- **83-e 검증**: 게이트 1829(ui-contract 포함) 통과 + 실기 패널 리로드 DOM 스팟체크 — 섹션 번호 시퀀스·라벨 5종·힌트 3종·flex-wrap·4열 basis(일반 25%/스팬 50%)·전폭 마지막 버튼 전부 확인.

## §84 UI 개선 2차 — 아이템 시작 프레임 미리보기 + 잔여 3건 (2026-07-22 오후)

사용자 지시("UI 개선 사이클") 연속. 핵심은 뉴스 분할 워크플로의 검수 UX.

- **84-a 시작 프레임 미리보기(신규)**: 분할·분석 후 아이템 목록 각 행에 시작 프레임 썸네일(96x54, 원본 t+0.5s 192px PNG→data URL, adjust-panel 패턴의 토큰 경합 가드). **원본 시퀀스 이름으로 내보내**(exportSequenceFrameByName) 생성·내보내기 중 활성 시퀀스가 바뀌어도 프레임이 어긋나지 않음(newsCutSourceName을 분석·원클릭 양 경로에서 캡처). 실패 아이템은 자리 유지 후 통과(보조 기능). 이제 내보내기 전 "앵커샷 시작인가"를 패널에서 눈으로 검수하고 체크 해제로 제외 가능 — 몽타주 수동 판독의 패널 내재화.
- **84-b 잔여**: QC 보고서 버튼 활성화 조건 힌트, 뉴스 분할 폴더="내보내기 탭과 공유" 툴팁 명시, --text-muted 대비 상승(#9095a4→#9aa0af). CSS는 .news-item-row 스코프로 기존 learn-corpus 목록에 영향 없음.
- **84-c 실기 E2E**: 5/21 분할만 재실행 — 8아이템 생성 실패 0, **목록 썸네일 8/8 로드**(data:image/png 확인, 같은 세션 DOM 검사). 게이트 1829 통과.

## §85 UI 3차 — 분할 스텝바·썸네일 라이트박스·내비 토글 재설계 + UXP 실측 3건 (2026-07-22 저녁)

사용자 지시(스텝바/큰 미리보기 + "내비 토글 너무 크고 둥글다 — 작게·사각·구분색"). 프리미어 재시작 복구(UDT 재시작 → clientId 재등록 폴링) 포함.

- **85-a 분할 스텝바**: BusyState.steps() 신설 — busy 오버레이에 단계 칩(완료 ✓·현재 강조), 원클릭/분할만 6·5단계 배선(hide 시 자동 소거). 실기 스냅샷 3단계 전이 확인(스캔→앵커 검증→재스냅).
- **85-b 썸네일 라이트박스**: 아이템 썸네일 클릭 → 큰 미리보기(소형 즉시 표시 후 640px 교체, 바깥 클릭/Esc 닫기, label 체크박스 오토글 방지). 실기: 고해상 441KB 로드 확인.
- **85-c 내비 토글 재설계**: 30px·사각(radius 0)·보라 틴트 배경(rgba(139,92,246,0.08))·좌측 악센트 바·현재 탭 번호 칩. **UXP 실측 3건(재발 방지 지식)**: ①`.workflow-nav`를 flex로 감싸면 컨테이너가 내용 폭으로 수축(153px, §25-b 계열) — block 부모+명시 width:100%가 정답이며 .app-shell flex 기본 stretch도 미적용이라 자식에 명시 폭 필수 ②UXP `element.click()`은 **비동기 디스패치** — 같은 evalJs 안에서 클릭 직후 상태를 읽으면 이전 값이 보인다(검증은 클릭·판독 evalJs 분리+대기) ③`<button>`엔 기본 크롬(둥근 알약·중앙정렬)이 강제돼 radius/배경 CSS 무시 — 커스텀 외형은 div role=button(+Enter/Space 키 처리)으로.
- **85-d 검증**: 게이트 1829 통과, 실기 내비 320/320 전폭·펼침/접힘·aria 정상, 스텝바·썸네일 8/8·라이트박스 실기 확인. 운영: E2E 중 UDT-프리미어 재등록 단절은 UDT 앱 재시작+15s 폴링으로 복구(clientId 1 재등록).
- **85-e 크기 확정(사용자 선택)**: 전폭 바가 "너무 크다" 피드백 → 3안 제시 후 **컴팩트 칩** 확정 — inline-flex 내용 폭(실측 119px)·26px·왼쪽 정렬, 사각·보라 틴트·번호 칩 유지. 컨테이너(.workflow-nav)는 전폭 유지라 구분선·펼침 목록은 패널 폭 그대로.

## §86 전 탭(13) 레이아웃 전수 계측·정합 — UXP 폼 렌더 결함 5종 해소 (2026-07-22 저녁)

사용자 스크린샷 지적(비전 체크박스 소실·텍스트 우측 쏠림·화질 선택창 이격) → 원인 실측 후 "1~13번 전 탭 일일이 확인" 지시로 자동 계측 스위트(cdt-layout-audit) 제작·전수 점검.

- **86-a 해소한 UXP 결함 5종(전부 실측 특정)**: ①`.custom-checkbox` display:grid → 0×0 붕괴(§25-b)로 체크박스 소실 → flex ②`.field label` space-between 상속으로 체크박스 라벨 텍스트 우측 쏠림 → 전용 원복 규칙 ③**폼 컨트롤 인라인 유령 여백** — select/input 위 ~40px+마진 16px(라벨-컨트롤 이격·2열 필드 지그재그의 원인) → 전역 `display:block; margin:0` + select-wrap 29px 고정·절대배치 ④`.button-cluster` 줄바꿈 없음 → 음성 탭 449px·브랜드 34px 가로 넘침 → flex-wrap ⑤`.focal-slider input[type=range]` **속성 선택자 무시**(§25-b)로 range가 width:100% 폭주 → bare 선택자. +화질 select 기본값 미지정으로 빈 표시 → selected 지정.
- **86-b 전수 계측 결과(13탭)**: 라벨-컨트롤 간격·컨트롤 높이·0폭 붕괴·가로 넘침 자동 점검 — **12탭 이상 0건**, 잔여는 오탐 2종(뉴스 분할 27px=1×1 숨김 체크박스 좌표 아티팩트, 에셋 -53px=sr-only 접근성 라벨)과 숏폼 scrollWidth 4px(경계 넘는 가시 요소 0)뿐. cdt-layout-audit.mjs는 향후 UI 변경 시 재사용.
- **86-c 게이트**: 1829 통과. 교훈: UXP 폼 UI는 "웹에서 되는 것"이 아니라 **실기 계측으로 확인된 패턴만** 쓸 것 — grid 금지·속성 선택자 금지·인라인 컨트롤 금지·button 크롬 회피(div role=button)가 4대 원칙.
- **86-e 육안 캡처 전수 점검(사용자 지시 "너가 직접 캡처해서 봐라")**: 화면 캡처 파이프라인 구축(capture.ps1 + cdt-tab-shots2 — 탭 전환 검증·스크롤 단계 캡처 31장, CDP Page.captureScreenshot은 미지원 확인) 후 13탭 육안 판독. 발견·수정 4건: ①`.file-icon` display:grid 붕괴로 **DIR/MG/SFX 아이콘 전면 소실** → flex(31×31 복원) ②`.safety-badge`("복제본에만 적용")·`.connection-status`("API 키 저장됨")가 **블록 부모에서 전폭 타원으로 늘어남**(inline-flex여도 UXP가 스트레치) → `width: fit-content`(101·96px 실측 — UXP가 fit-content 지원 확인, 배지류 표준 처방) ③2열 필드의 단위(px·초·%)와 옆 칸 라벨 밀착 → label gap+unit 여백 ④용어 잔여 2건(Safe Zone h2·"출력합니다"). 육안으로 §86 수정 효과도 재확인(체크박스 ✓·슬라이더·2열 정렬·대기 배지). 잔여 관찰: 버튼 둥근 모서리는 UXP 기본 크롬(§85-c) — 전면 div 전환은 96개 규모라 별도 사이클 후보.
- **86-f UXP flex gap 미지원 확정(5원칙 추가)**: 사용자 지적(DIR 아이콘-텍스트 밀착)으로 실측 — `gap`의 computed가 "n/a", 간격 0px. 그동안 벌어져 보인 곳은 폼 컨트롤 UA 마진 덕이었고 아이콘·점·체크박스 등 마진 없는 요소는 전부 밀착. 처방: 시각 클러스터에 margin 강제(.file-summary 아이콘 10px·상태 점 7px·safety 아이콘 6px·커스텀 체크박스 8px·내비 아이콘/번호 7px — 실측 10/7px 확인). **UXP UI 5대 원칙: grid 금지·속성 선택자 금지·인라인 컨트롤 금지·button 크롬 회피·gap 대신 margin.**
- **86-g 정밀 렌더 감사(사용자 지시 "대충 보지 말고 전부") — 붕괴·밀착 일괄 소탕(커밋 참조)**: cdt-deep-audit.mjs(13탭 라이브 스캔 — 0×0 붕괴·인접 밀착·전폭 알약·겹침) 신설. 실질 결함 대량 검출·해소: ①**패널 내부 display:grid 25곳 붕괴** — 섹션 번호 칩 전멸·QC 상태/메트릭 스트립·AI 큐 지표·자동요약·로그 행·빈상태/드롭존/보안 아이콘·레퍼런스 미리보기·자막 빈상태·final-qc/ai-job 행 등 → 전부 flex 전환(display:grid 32→7, 잔존은 헤더·오버레이 등 동작 확인분) ②**2열 폼 거터 0px**(gap 사망) → margin 거터(7/10px) 체계 ③밀착 클러스터 3차 보정(섹션 번호-제목 9px 등 12곳) ④**§86-h 회귀 원복** — select 절대배치가 내재 폭 0을 만들어 에셋 툴바 셀렉트 소실 → 정적 배치+block/margin 리셋으로 충분함을 실측 확인 ⑤**aspect-ratio 미지원 확정** — 썸네일 캔버스 높이 2px → padding-bottom 56.25% 기법(148px 복원). 재감사 결과 실질 잔여 0(오탐 3종: 닫힌 OPTION·버튼 내 장식 스팬·미디어쿼리 숨김 툴바). **원칙 보강: grid는 오버레이·헤더에선 동작하나 패널 내부에선 붕괴 — 패널 안은 무조건 flex, aspect-ratio는 padding % 기법.**

## §87 6/21 라벨 정정 — F1 55.6→100, 전체 92.5 (2026-07-23)

아침 점검(§86-h: 회귀 0 확인·빈 셀렉트 24개 기본값 일괄) 후 코퍼스 유일 저성적 회차 재검토. 시퀀스 미디어 오프라인(원본 정리 삭제)이라 프로젝트 메타데이터에서 영상 ID(PTU5orq5m7U) 복원 → 재다운로드(h264 720p) → 예측 5곳·라벨 3곳 불일치 지점 몽타주 판독.

- **판정: 모델이 옳았고 라벨이 틀렸다** — 예측 5곳(268·408·542·608·640) 전부 앵커샷, 기존 라벨 3곳(362.5 드론·450.5 인터뷰·627.25 화재연기)은 footage(§73-d 시절 라벨 오류). 정정본(items.corrected.json, 10아이템) 작성.
- **효과**: 6/21 F1 55.6→**100.0**, 전체 71회차 **92.0→92.5**. 게이트 학습은 모델 유지(패턴 지속), check:news·1829 통과.
- 운영 지식: 오프라인 미디어 회차의 재판독은 ProjectItem 이름에서 영상 ID를 복원해 재다운로드하면 된다(시퀀스=소스 프레임 일치 전제, §73-d).

## §88 배치11 — 신규 5회차 무료 분할 실전·판독·학습 + 일괄 렌더 (2026-07-23)

신규 5회차(7/22 수 XUBMuRkxK_g·7/16 목 z0gIi-AFF5w·5/17 일 MWEofBbe06E·5/03 일 URFLS-glcfc·5/02 토 2IW78oyMGfc)를 분할만 모드로 완주. 시퀀스 20260723_news_00~48(49개), 실패 0.

- **성적: 49경계 전부 진짜 앵커·FN 0 — 5회차 모두 실질 F1 1.0**. 오프라인 eval도 동일(신규 5회차 F1 100.0, 전체 76회차 TP 798 FP 84 FN 38 → **F1 92.9**). 실기·오프라인 완전 일치.
- **§82 하단 띠 필터 첫 실전 발동**: 5/03에서 인용·이름표 띠 오탐 1건 배제(10→9), 오배제 0. 오프라인 밴드프로브 재현으로 같은 후보 배제 확인(94.1→100.0).
- **구형 일요일 2회차(5/17·5/03) 라우팅 정상**: SUNDAY_NEW 이전 시기인데도 예고 없는 타이틀 직후 첫 앵커(크로스페이드 완료 ~9s)·'지방선거 현장을 가다' CG 코너·23.976fps(5/03) 전부 통과. 5/02 후반 단신 5연속(26~32s 간격)도 전부 개별 분리.
- **재스냅 지연 관찰**: 라벨 정밀 판독(0.25s 스트립)에서 보정 13건 — 대부분 1.5s 이내, 최대 4.25s(5/02 날씨 564→559.75). 전환 직후 배경 움직임이 큰 컷에서 재스냅이 늦게 붙는 경향. ±8s 허용오차 내라 F1 무영향, 개선은 후순위.
- **게이트 학습: 모델 유지**(배치8~11 연속) — 최고 후보 홀드아웃 F1 78.4 < 베이스라인 84.9. 현행 모델이 신규 회차를 이미 100으로 처리.
- 운영 지식: ①분할만 시퀀스명은 제로패딩(news_00부터) — verify-range 범위는 0부터 ②23.976fps 회차에서 exportSequenceFrame 1회 빈 파일(재시도 무효) — ffmpeg 원본 판독으로 대체 가능 ③밴드프로브 생성기(cdt-bandprobes-new.mjs)는 오프라인 예측 시각의 +2/+4s를 480×270로 렌더해 rows [0,dark,mean] 캐시 — 신규 배치마다 재사용 ④fps=1/6 스윕 몽타주의 타일 시각은 실제보다 2~4s 이른 내용을 보여줄 수 있어 경계 확정은 반드시 0.25s 스트립으로.

## §89 비전 검증 최종 실증 — 480px 채택, 실질 오판 0 (2026-07-23)

크레딧 충전($5) 후 3단계 실증. 판정은 전부 패널 컨텍스트에서 프로덕션 동일 규약(gpt-5.4-mini·참조 예시 5장·배치 1.1MB 캡·배제 규칙 !isAnchor&&conf≥0.6)으로 수행, API 키는 secureStorage 밖으로 꺼내지 않음(stage1-judge.mjs).

- **1단계(320px, FP 26+TP 100)**: 표면 킬률 38.5%·보존율 90%. 육안 재판독으로 실체 분리 — ①"살아남은 FP" 16건은 전부 진짜 앵커 = **구회차 라벨 누락**(3/31 ×7·6/02 ×5·5/25·6/10·6/11 등, §87 계열) ②오배제 10건 중 9건이 진짜 앵커(320px 한계), 1건(4/05 666)은 예측 오프셋/라벨 문제로 비전이 옳았음.
- **2단계(480px A/B, 오판 관련 20장)**: footage 10/10 배제 유지, 진짜 앵커 9/9 보존 — **480px 실질 오판 0**. 320px는 진짜 앵커를 ~9% 오배제하므로 사용 금지.
- **제품 반영**: index.ts 비전 프레임 내보내기 320→480px(1줄). 게이트 1829 통과.
- **3단계(실기 E2E, 5/21 비전 ON)**: 후보 9 → 비전 2건 제외(항공샷 FP 384 포함) → 7아이템 = 정답 개수, 경계 전부 라벨 ±1.5s — F1 1.0. 분할 실패 0.
- **비용 실측**: 총 146장 판정 + E2E ≈ 토큰 in 29k/out 4.5k ≈ **1~2센트**. 회차당(480px, 후보 ~12) 추정 $0.01 미만 → 하루 2회차 월 $0.5 미만. 종전 "월 $1~2.5" 추정보다 훨씬 저렴.
- 후속 후보: ①구회차 라벨 누락 정정(16+곳 — 측정 F1 92.9는 과소평가, 정정 시 상승 전망) ②비전 기본 ON 여부는 운영 후 결정(현행 옵트인 유지).

## §90 구회차 라벨 정정 5회차 — 전체 F1 92.9→93.7 (2026-07-23)

§89 비전 실증의 부수 발견("FP" 16곳이 실제 앵커) 후속. 3/31·5/25·6/02·6/10·6/11을 스윕+0.5s 스트립으로 전면 재판독해 items.corrected.json 작성(§87 계열, 총 5개).

- **정정 규모**: 3/31 8→15아이템(신규 경계 7 + 40s 오류 경계 1 정정 + 모델도 못 잡은 971 발견), 6/02 14→16(가짜 경계 2 제거·신규 5), 5/25 9→10(신규 59), 6/10 9→10(신규 477), 6/11 10→12(신규 407·833). 신규·정정 경계는 전부 앵커 컷 0.5s 정밀 판독.
- **효과**: 해당 5회차 F1 60~80대→93.3/95.2/94.1/90.9/100(합산 94.7). 전체 76회차 **92.9→93.7**(TP 811·FP 71·FN 38). 게이트 학습은 모델 유지(80.0<84.9), check 1829·check:news 그린.
- **작업 지식**: ①fps=1/6 스윕의 10행+ 몽타주는 행 계산 착오 위험 — 경계 확정·부정은 반드시 fps=2 스트립으로(5/25에서 구라벨 263·411.5를 스윕 착오로 의심했다가 스트립으로 원복) ②일부 소스는 full-range YUV라 mjpeg 인코드 거부 — ffmpeg `-strict unofficial` 필요 ③6/11 업로드는 타이틀 없이 앵커 중간부터 시작(start 0 정당).
- 잔여: 소스 없는 FP 회차 22개(1~4월·6월 말~7월 중순)도 같은 누락 개연성 — 재다운로드 기반 정정은 별도 사이클.

## §91 배치12 — 미사용 5회차 비전 ON 실전 + 비전 2프레임 규칙 (2026-07-23)

사용자 제안("작업 안 한 회차를 유료 비전으로 실전 테스트")으로 코퍼스 공백 5회차(7/21·7/14·6/15·6/06·6/05)를 비전 검증 ON으로 완주. 목적은 ①비전 실전 오배제 확인 ②회차당 실비용 누적 ③코퍼스 확장.

- **결함 발견·수정(핵심 성과)**: 7/21 1차 실행에서 비전이 후보 16→11로 5건 배제했는데, 판독 결과 **3건이 진짜 앵커**(744.5·786.5·929). 원인은 판정 프레임 오프셋 — 후보(2s 그리드)가 실제 컷보다 이르면 +1.2s 프레임이 **직전 아이템의 footage**라 비전이 "footage"로 정확히 판정하면서 진짜 경계가 죽는다(판정력이 아니라 프레임 선택 문제). 처방은 하단 띠 필터와 같은 2프레임 합의 — **+1.2s·+4s 두 장이 모두 non-anchor일 때만 배제**(index.ts, rejectionVotes≥2). 재실행 결과 "전 후보 앵커 확인(제외 0)" + 14아이템으로 정답 일치.
- **성적(수정 빌드)**: 7/21 14 / 7/14 11 / 6/15 12 / 6/06 10 / 6/05 6 아이템, 생성 실패 0·경계 누락 0. 오프라인 eval 신규 5회차 F1 94.5(FN 0), 전체 **81회차 F1 93.8**(TP 863·FP 77·FN 38). 비전 제외는 6/15·6/06·7/14에서 각 1~2건 발동했고 전부 footage(오배제 0).
- **게이트**: 학습은 모델 유지(78.3<84.9), check 1829·check:news 그린.
- **운영 함정 2건**: ①채널 목록에서 "[Replay] … KBC 8 O'Clock News"만 8뉴스다 — 6/05 후보로 고른 Hwds5rYfFbo는 **모닝와이드**(여성 앵커·MORNING WIDE 로고)여서 라벨 전 폐기하고 진짜 8뉴스(6rEe8FAuuGQ)로 교체. 시퀀스는 개명(MorningWide_20260605)해 코퍼스 오염을 막았다 — 개명은 `sequence.getProjectItem().createSetNameAction` 경유가 정답(시퀀스 직접 setName은 실패). ②일부 소스는 full-range YUV라 mjpeg 인코드가 거부된다 — ffmpeg `-strict unofficial` 필요(§90과 동일).
- 비용: 5회차 비전 ON 총액 여전히 센트 단위(2프레임 규칙으로 2배지만 회차당 $0.02 미만).

## §92 비전 오배제 0 사이클 — 4프로브 합의·합성 구도 프롬프트·표 유실 재시도 (2026-07-24)

사용자 목표 "비전 ON으로 F1 100이 되면 상시 ON". 배치13(2025-11 미사용 5회차 OFF/ON A/B — 8뉴스 3회차 F1 89.7→92.5, 모닝와이드 62.2로 전용 뱅크·재학습 전 미지원 확정)에서 비전이 진짜 앵커를 죽이는 사례와 실행간 편차가 드러나, 11/12(20251112, 정답 13아이템)를 고정 실험대로 원인을 끝까지 파서 세 겹으로 수정했다.

- **오배제 3대 메커니즘(실측)**: ①이른 후보(§91) — 후보가 컷보다 3~5s 이르면 +1.2s 프레임이 직전 footage ②늦은 후보 — 788 후보의 앵커 창이 781~786이라 {+1.2,+4} 모두 창 뒤 ③비정형 합성 구도(414·823.25) — 스튜디오 배경 전체가 보도 화면(회의장 단체사진)으로 치환된 합성 앵커샷을 단일 프레임 판정이 못 견딤. ③은 823.25 앵커 인트로가 4s 남짓으로 짧아 "구간 안 프레임 1장뿐"과 겹치는 최악 조합.
- **학습 모델 점수 보호안은 기각(실측)**: τ 0.80~0.99 스윕에서 어떤 τ도 정탐 보호와 오탐 은닉이 동행(τ0.80: TP 94.0% 보호 / FP도 72.7% 보호). 무료 필터를 통과한 FP는 모델도 좋아하는 화면이라 점수로 분리 불가.
- **4프로브 합의(index.ts)**: 판정 프레임을 {-3, +1.2, +4, +7}s 네 장으로 늘리고 **네 장 모두 고신뢰(conf≥0.85) non-anchor일 때만 배제**(votes≥4). -3은 늦은 후보, +7은 이른 후보를 커버하고 +1.2/+4는 정위치 이중화. 명백한 footage는 0.97+로 판정되므로(20판정 실측 전부 0.98+) 0.85 임계로 FP 배제력 손실은 없다.
- **합성 구도 프롬프트(결정타, openai-text.ts)**: 825.2(합성 앵커+헤드라인 띠) 반복 판정 실측 — 구프롬프트는 5회 중 1회 **conf 0.95 non-anchor 오판**(어떤 임계값도 구제 불가, 823.25 사망의 직접 원인). 앵커 정의에 "배경이 보도 화면으로 치환된 합성 구도도 데스크 앵커면 앵커" 문장을 추가하자 **10/10 안정**. 15장 라벨 세트 회귀 만점 유지(오탐 제거 8/8 · 오배제 0/7 — 왼쪽 스탠드업 오구제 없음), b-roll 대조군 0.98+ 정상.
- **표 유실 재시도(FP 방향 마감, index.ts)**: 수정 후 1차 E2E에서 footage 622.75가 비전을 뚫고 생존 — 그 프로브 4장은 20/20 non-anchor 0.98+로 판정 문제가 아니었다. 원인은 **표 유실**: 프레임 내보내기 실패로 장 자체가 빠지거나(실행당 68장 중 1~4장 실측), 배치 응답에서 인덱스가 누락되면 votes≥4 불충족으로 FP가 자동 생존한다. 내보내기 1회 재시도 + 응답 유실분만 1회 재판정으로 마감. 이미 받은 판정(anchor 표·저신뢰 기권)은 절대 재판정하지 않는다 — 진짜 앵커를 지키는 표를 재시도로 뒤집을 수 있기 때문.
- **배치 실패 격리(index.ts)**: 3차 E2E에서 판정 21/68 지점의 일시 API 오류 하나가 **비전 전체를 강하**시켜(우아한 강하 경로) FP 2건이 잔존했다. 배치 단위 try/catch로 실패 배치만 유실 재판정 라운드로 넘기고, 두 라운드 후에도 남은 유실은 경고 로그("프레임 N장 판정 유실")로 남긴다 — 전량 강하는 프레임 내보내기 단계 오류로 한정된다.
- **E2E 성적(11/12·비전 ON, 정답 13아이템)**: 프롬프트 수정 전 기준 실행은 12아이템(823.25 사망). 프롬프트 수정 후 ①14아이템 — 오배제 0이나 표 유실로 footage 622.75 잔존(→표 유실 재시도로 마감) ②13아이템 정답 일치 ③API 오류 1건에 비전 전체 강하로 15아이템(→배치 격리로 마감) ④13아이템 ⑤무료 스캔 단계 패널 정지(연속 실행 스트레스, 기지 운영 이슈 — 재부팅 해소, 비전 무관) ⑥13아이템. **정상 완주한 수정 빌드 실행(④·⑥)은 연속 13아이템·오배제 0·배제 전건 footage(298·318·624·636), 68/68 판정 유실 0.** 후보 집합은 실행마다 달랐지만(34~38 원시 매칭·17~18 확정) 결과는 수렴.
- **텔레메트리**: "확정 후보 시각"·"비전 배제 시각" activity 로그 추가 — 실행간 편차를 볼 때 후보 누락과 비전 배제를 즉시 구분할 수 있다(§92 진단의 핵심 도구였음).
- **잔여 2건**: ①늦은 후보의 경계 부정확 — 781.5 앵커가 후보 788→재스냅 786.5/787.25가 되어 앵커 인트로 ~5s가 직전 아이템 꼬리에 붙는다(eval ±8s 안이라 TP지만 인점 규칙과는 어긋남; 재스냅을 앵커 시작 컷 방향으로 넓히는 건 별도 사이클) ②후보 생성 비결정성(exportSequenceFrame 서브프레임 지터로 후보 집합이 실행마다 다름, 590↔624) — 비전 검증이 흡수하는 구조로 대응.
- 비용: 4프로브로 §91 대비 2배지만 회차당 여전히 $0.03 미만. 진단 실험(반복 판정 ~60회) 총액도 센트 단위.

## §93 배치13 8뉴스 재측정 — §92 빌드로 전 회차 F1 100, FN 처방 소멸 (2026-07-24)

사용자 지시 "모닝와이드 제외 F1 100 목표". 경계정밀도 사이클은 **F1 무관으로 판정**(eval ±8s 허용오차 안이라 이미 TP — 인점 편집 품질 트랙으로 분리)하고, 배치13에서 F1 92.5였던 11/18·11/26을 §92 빌드+비전 ON으로 재측정했다.

- **결과**: 11/18 정답 15 → **TP 15/FP 0/FN 0 · F1 100**(비전 배제 118·492 전부 footage). 11/26 정답 13 → **TP 13/FP 0/FN 0 · F1 100**(비전 배제 718·826). 라벨 대비 ±8s 1:1 매칭(scripts/news-train/lib.mjs boundaryF1).
- **연쇄 FN 해소 확인**: 배치13에서 "오탐 825.5가 8.25s 뒤 진짜 앵커를 병합 단계에서 밀어내던" 11/26 최난점 — 이번 실행은 오탐 826을 비전이 배제하고 진짜 앵커가 835.75로 생존(±8s 안 매칭). 준비하던 FN 처방(병합 로직·참조 뱅크)은 **대상 소멸로 불필요**.
- **§92 빌드 누적 성적**: 오늘 정상 완주한 전 실행이 F1 100 — 11/12 ×2·11/18·11/26(8뉴스 구포맷 3회차 42경계 전부). 최근 포맷은 배치11·12에서 기존 F1 100.
- **미완 1건**: 11/26 안정성 재실행(후보 비결정성으로 연쇄 FN 재발 여부 확인용)은 패널 정지 2회로 보류 — 하루 ~30회 연속 파이프라인 후 무료 스캔 단계(20~58%)에서 정지가 재발·악화(§92 ⑤와 동일 증상, connectPanel 재부팅으로도 안 풀림). 가벼운 작업(저장 등)은 정상이라 Premiere 프로세스 수준 exporter 피로로 추정 — **Premiere 재시작 후 1회 재확인 권장**. 프로젝트는 1440시퀀스로 저장 완료.
