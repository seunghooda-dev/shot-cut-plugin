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
