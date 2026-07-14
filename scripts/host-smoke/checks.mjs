// Host 스모크 체크 정의 — 기본 티어(비파괴)와 full 티어(자체 정리 E2E)로 구분
import { evalAsyncProbe, readActivityLog, sleep } from "./lib.mjs";

// 페이지 코드 문자열 규칙: 백슬래시 이스케이프 금지, 개행은 String.fromCharCode(10) (§40-d).

async function clickTab(panel, name) {
  await panel.evalJs(
    `(() => { for (const t of document.querySelectorAll('[data-tab]')) { if (t.getAttribute('data-tab') === '${name}') { t.click(); return true; } } return false; })()`,
  );
  await sleep(250);
}

/** 자막 편집기에 2큐 SRT를 피커 스텁으로 불러온다(full 티어 공용). 반환: 큐 행 수. */
async function importSampleSrt(panel) {
  const seeded = await evalAsyncProbe(panel, `
    const uxp = require('uxp'); const lfs = uxp.storage.localFileSystem;
    const df = await lfs.getDataFolder();
    const NL = String.fromCharCode(10);
    const srt = '1' + NL + '00:00:00,400 --> 00:00:02,600' + NL + '스모크 첫 큐' + NL + NL
              + '2' + NL + '00:00:03,000 --> 00:00:05,200' + NL + '스모크 둘째 큐' + NL + NL;
    const file = await df.createFile('host_smoke.srt', { overwrite: true });
    await file.write(srt, { format: uxp.storage.formats.utf8 });
    window.__smokePicker = lfs.getFileForOpening.bind(lfs);
    lfs.getFileForOpening = async (opts) => (opts && opts.allowMultiple ? [file] : file);
    out.ready = true;
  `);
  if (seeded.err) throw new Error("SRT 시드 실패: " + seeded.err);
  await clickTab(panel, "voice");
  await panel.evalJs(`(() => { document.getElementById('subtitle-import-btn')?.click(); return true; })()`);
  await sleep(2500);
  return panel.evalJs(`(() => { const list = document.getElementById('subtitle-cue-list'); return list ? list.children.length : null; })()`);
}

/** 피커 원복 + 시드 SRT 삭제(full 티어 공용 정리). */
async function cleanupSampleSrt(panel) {
  await evalAsyncProbe(panel, `
    const uxp = require('uxp'); const lfs = uxp.storage.localFileSystem;
    if (window.__smokePicker) { lfs.getFileForOpening = window.__smokePicker; delete window.__smokePicker; }
    const df = await lfs.getDataFolder();
    try { const entry = await df.getEntry('host_smoke.srt'); await entry.delete(); } catch {}
    out.cleaned = true;
  `);
}

export const checks = [
  {
    name: "panel-boot",
    tier: "default",
    about: "패널 부팅 완료 로그 존재 + 콘솔 에러 0",
    async run(panel) {
      const probe = await evalAsyncProbe(panel, `
        const list = document.getElementById('log-list');
        out.logCount = list ? list.children.length : 0;
        out.ready = false;
        if (list) {
          for (const child of list.children) {
            if (/준비되었습니다/.test(String(child.textContent || ''))) { out.ready = true; break; }
          }
        }
      `);
      const errors = panel.consoleErrors.length;
      return {
        pass: probe.out?.ready === true && errors === 0,
        details: `준비로그=${probe.out?.ready} 활동로그=${probe.out?.logCount} 콘솔에러=${errors}${probe.err ? " err=" + probe.err : ""}`,
      };
    },
  },
  {
    name: "tab-sweep",
    tier: "default",
    about: "12개 워크플로 탭 전환 — 패널 표시 + 신규 콘솔 에러 0",
    async run(panel) {
      const before = panel.consoleErrors.length;
      const probe = await evalAsyncProbe(panel, `
        out.tabs = [];
        const tabs = [...document.querySelectorAll('.nav-tab[data-tab]')];
        for (const tab of tabs) {
          const name = tab.getAttribute('data-tab');
          tab.click();
          await new Promise((resolve) => setTimeout(resolve, 150));
          let panelEl = document.getElementById('panel-' + name);
          let shown = Boolean(panelEl) && panelEl.hidden === false;
          if (!shown) {
            // 부팅 직후 첫 스윕은 간헐적으로 늦게 반영된다 — 1회 재확인으로 플레이크 흡수.
            await new Promise((resolve) => setTimeout(resolve, 500));
            panelEl = document.getElementById('panel-' + name);
            shown = Boolean(panelEl) && panelEl.hidden === false;
          }
          out.tabs.push({ name, shown });
        }
      `, { timeoutMs: 45000 });
      const tabs = probe.out?.tabs ?? [];
      const broken = tabs.filter((tab) => !tab.shown).map((tab) => tab.name);
      const newErrors = panel.consoleErrors.length - before;
      return {
        pass: tabs.length >= 12 && broken.length === 0 && newErrors === 0,
        details: `탭 ${tabs.length}개, 실패 [${broken.join(",")}], 신규 콘솔에러 ${newErrors}${probe.err ? " err=" + probe.err : ""}`,
      };
    },
  },
  {
    name: "host-context",
    tier: "default",
    about: "ppro 프로젝트/시퀀스 컨텍스트 접근",
    async run(panel) {
      const probe = await evalAsyncProbe(panel, `
        const ppro = require('premierepro');
        const project = await ppro.Project.getActiveProject();
        out.project = Boolean(project);
        const sequences = project ? await project.getSequences() : [];
        out.sequences = sequences.length;
        const active = project ? await project.getActiveSequence() : null;
        out.active = active ? String(active.name) : null;
      `);
      return {
        pass: probe.out?.project === true,
        details: `project=${probe.out?.project} sequences=${probe.out?.sequences} active=${probe.out?.active}${probe.err ? " err=" + probe.err : ""}`,
      };
    },
  },
  {
    name: "ui-contract-live",
    tier: "default",
    about: "핵심 UI 요소가 실기 DOM에 존재",
    async run(panel) {
      const ids = [
        "log-list", "subtitle-import-btn", "subtitle-export-btn", "subtitle-attach-transcript-btn",
        "learn-pair-btn", "learn-corpus-list", "adjust-plan-select", "adjust-apply-btn",
        "auto-cut-reel-btn", "subtitle-cue-list",
      ];
      const missing = await panel.evalJs(
        `(() => ${JSON.stringify(ids)}.filter((id) => !document.getElementById(id)))()`,
      );
      return { pass: Array.isArray(missing) && missing.length === 0, details: `누락 [${(missing ?? []).join(",")}]` };
    },
  },
  {
    name: "subtitle-roundtrip",
    tier: "full",
    about: "SRT 불러오기(피커 스텁) → 큐 2행 렌더 (자막 자동저장이 스모크 문서로 대체되는 부작용 있음)",
    async run(panel) {
      try {
        const cueRows = await importSampleSrt(panel);
        const logs = await readActivityLog(panel, "SRT 자막", 2);
        return { pass: cueRows === 2, details: `큐행=${cueRows} 로그=${JSON.stringify(logs)}` };
      } finally {
        await cleanupSampleSrt(panel);
      }
    },
  },
  {
    name: "transcript-attach",
    tier: "full",
    about: "스크래치 시퀀스에 트랜스크립트 첨부 E2E(§42) — 시퀀스 생성/삭제 자체 정리",
    async run(panel) {
      try {
        const created = await evalAsyncProbe(panel, `
          const ppro = require('premierepro');
          const project = await ppro.Project.getActiveProject();
          const scratch = await project.createSequence('HostSmoke_tr_tmp');
          await project.setActiveSequence(scratch);
          out.name = String(scratch.name);
        `);
        if (created.err) return { pass: false, details: "스크래치 생성 실패: " + created.err };
        const cueRows = await importSampleSrt(panel);
        if (cueRows !== 2) return { pass: false, details: `SRT 불러오기 실패(큐행=${cueRows})` };
        await panel.evalJs(`(() => { document.getElementById('subtitle-attach-transcript-btn')?.click(); return true; })()`);
        await sleep(4000);
        const verify = await evalAsyncProbe(panel, `
          const ppro = require('premierepro');
          const project = await ppro.Project.getActiveProject();
          const sequences = await project.getSequences();
          let scratch = null;
          for (const sequence of sequences) { if (String(sequence.name) === 'HostSmoke_tr_tmp') scratch = sequence; }
          if (!scratch) { out.missing = true; } else {
            const cast = ppro.ClipProjectItem.cast(await scratch.getProjectItem());
            const parsed = JSON.parse(String(await ppro.Transcript.exportToJSON(cast)));
            out.words = (parsed.segments || []).reduce((sum, segment) => sum + ((segment.words || []).length), 0);
            out.language = parsed.language;
          }
        `);
        return {
          pass: verify.out?.words >= 2 && verify.out?.language === "ko-kr",
          details: `단어=${verify.out?.words} 언어=${verify.out?.language}${verify.err ? " err=" + verify.err : ""}`,
        };
      } finally {
        await cleanupSampleSrt(panel);
        await evalAsyncProbe(panel, `
          const ppro = require('premierepro');
          const project = await ppro.Project.getActiveProject();
          const sequences = await project.getSequences();
          let scratch = null;
          for (const sequence of sequences) { if (String(sequence.name) === 'HostSmoke_tr_tmp') scratch = sequence; }
          out.deleted = scratch ? await project.deleteSequence(scratch) : "none";
        `);
      }
    },
  },
];
