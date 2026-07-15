# 라이선스 킷 — 배포 보호(minify+난독화) + 오프라인 시리얼 키(30일/연장) — Plan

사용자 지시(2026-07-16): "CCX를 받은 사람이 코드를 그대로 카피하는 것을 막고, 시리얼 키로 30일 사용·30일 연장 방식을 서버 없이" + "개발·수정·실행 워크플로에는 지장 없어야 함".

## 배경·현황

- CCX는 ZIP이고 dist/index.js가 `minify: false`로 빌드돼 **사실상 소스 공개 수준**.
- 원칙: 클라이언트 JS는 100% 보호 불가 — 목표는 "카피 비용을 크게 높이고(난독화), 선량한 사용자 대상 사용 기간을 통제(서명 시리얼 키)"이다. 작정한 해적 차단은 범위 아님(서버 검증은 상용화 영역).

## 결정

1. **빌드 이원화** — dev 빌드(기본)는 지금처럼 minify 없음(디버깅·스모크 유지). `vite build --mode release`에서만 esbuild minify + `__SHORTFLOW_RELEASE__=true` define. 패키징(`package:ccx`)만 release 모드를 쓴다. → 개발 워크플로 무변경.
2. **난독화** — `javascript-obfuscator`(MIT)로 release dist/index.js를 패키징 단계에서 변환. UXP 호환 보수 설정(selfDefending·controlFlowFlattening·deadCodeInjection **끔**, stringArray+base64 켬, renameGlobals 끔). 패키징 후 dist는 난독화 상태로 남을 수 있으나 `npm run check`/`npm run build`가 dev dist를 복원한다.
3. **오프라인 시리얼 키** — Ed25519(tweetnacl, 순수 JS) 서명. 형식 `SFS1.<b64url(payload)>.<b64url(sig)>`, payload `{ id, exp: "YYYY-MM-DD", plan? }`. 공개키는 `src/license-public-key.ts`에 내장, 검증은 `src/license.ts`(순수·테스트 가능). 30일 연장 = 새 키 발급·재입력.
4. **시계 역행 가드** — 실행 시 `max(lastSeen, now)`를 저장하고, `now < lastSeen − 6h`면 키가 유효해도 잠금("시스템 시계 변경 감지").
5. **강제 범위** — `__SHORTFLOW_RELEASE__` 빌드에서만 잠금 오버레이(키 입력 UI) 표시. dev 빌드는 상태 표시만 하고 차단하지 않는다. 부팅 시 남은 일수 로그, 7일 이하면 경고.
6. **발급 도구** — `scripts/license-issue.mjs`. `--init`: 키쌍 생성, 개인키는 저장소 밖 `~/.shortflow-license/private.key`에 저장(커밋 금지), 공개키 파일 갱신. `--id <이름> --days <N>`: 시리얼 키 1줄 출력.

## 검증 계획

- 단위: license.ts — 유효/만료/변조 서명/쓰레기 입력/시계 역행, 발급→검증 라운드트립(테스트 내 임시 키쌍).
- 실기: release+난독화 dist를 UDT로 부팅 → 잠금 오버레이 표시 확인 → 실제 발급 키 입력 → 해제·남은 일수 표시 확인 → dev dist 복원 후 기존 스모크 6/6 재확인.
- 게이트 `npm run check` 전 통과 후 커밋(체크포인트 규칙).

## 비범위

- 서버 검증·기기 바인딩·키 회수(상용화 영역), 코드 사이닝, JS 검증 우회의 완전 차단.
