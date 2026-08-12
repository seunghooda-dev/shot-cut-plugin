// 플러그인 데이터 폴더에 일자별 로그 파일을 남기는 지속 로그 — 패널 재로드·크래시 후에도 남는 진단 기록
//
// 왜 필요한가(운영 감사·사용자 요청 2026-08-12): 활동 로그는 DOM 인메모리라 패널을 다시 열면
// 사라진다. 다른 PC에서 분할 도중 오류가 나면 "무슨 일이 있었는지" 알 방법이 없었다.
//
// 설계 원칙:
// - 핫패스에 파일 I/O를 넣지 않는다 — 메모리 버퍼에 쌓고 주기 flush(기본 5초)로만 쓴다.
// - 파일은 일자별(shortflow-log-YYYYMMDD.log) 통째 덮어쓰기 — UXP write의 append 지원이 버전마다
//   달라 의존하지 않는다. 버퍼 상한(기본 2,000줄)이 파일 크기를 자연히 묶는다(~300KB).
// - 어떤 실패도 앱을 깨지 않는다 — 모든 경로가 조용히 삼키고, 다음 flush가 재시도한다.
// - 보존 기한(기본 7일)이 지난 로그 파일은 init에서 지운다.

export interface PersistentLogFolderEntry {
  name?: unknown;
  isFile?: boolean;
  delete?: () => Promise<unknown>;
  read?: (options?: unknown) => Promise<unknown>;
  write?: (data: string, options?: unknown) => Promise<unknown>;
  nativePath?: unknown;
}

export interface PersistentLogFolder {
  getEntries?: () => Promise<PersistentLogFolderEntry[]>;
  getEntry?: (name: string) => Promise<PersistentLogFolderEntry>;
  createFile?: (name: string, options?: { overwrite?: boolean }) => Promise<PersistentLogFolderEntry>;
  nativePath?: unknown;
}

export interface PersistentLogOptions {
  /** 버퍼·파일에 유지할 최대 줄 수 — 넘치면 오래된 줄부터 버린다. */
  maxLines?: number;
  /** 주기 flush 간격(ms). */
  flushIntervalMs?: number;
  /** 로그 파일 보존 일수 — init에서 이보다 오래된 파일을 지운다. */
  retainDays?: number;
  /** 테스트 주입용 현재 시각. */
  now?: () => Date;
  /** 테스트 주입용 인터벌 스케줄러. */
  setIntervalFn?: (handler: () => void, ms: number) => unknown;
  clearIntervalFn?: (handle: unknown) => void;
}

const FILE_PREFIX = "shortflow-log-";
const FILE_SUFFIX = ".log";

function dayKey(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

function sanitizeLine(message: string): string {
  return message.replace(/[\r\n]+/gu, " ").slice(0, 500);
}

export class PersistentLog {
  private folder: PersistentLogFolder | null = null;
  private buffer: string[] = [];
  private currentDay = "";
  private dirty = false;
  private intervalHandle: unknown = null;
  private readonly maxLines: number;
  private readonly flushIntervalMs: number;
  private readonly retainDays: number;
  private readonly now: () => Date;
  private readonly setIntervalFn: (handler: () => void, ms: number) => unknown;
  private readonly clearIntervalFn: (handle: unknown) => void;
  private nativePathValue: string | null = null;

  constructor(options: PersistentLogOptions = {}) {
    this.maxLines = Math.max(100, options.maxLines ?? 2_000);
    this.flushIntervalMs = Math.max(1_000, options.flushIntervalMs ?? 5_000);
    this.retainDays = Math.max(1, options.retainDays ?? 7);
    this.now = options.now ?? (() => new Date());
    this.setIntervalFn = options.setIntervalFn ?? ((handler, ms) => setInterval(handler, ms));
    this.clearIntervalFn = options.clearIntervalFn ?? ((handle) => clearInterval(handle as ReturnType<typeof setInterval>));
  }

  /** 로그 파일이 놓이는 폴더 경로(부팅 안내용) — init 후에만 값이 있다. */
  folderPath(): string | null {
    return this.nativePathValue;
  }

  fileName(): string {
    return `${FILE_PREFIX}${this.currentDay || dayKey(this.now())}${FILE_SUFFIX}`;
  }

  /** 폴더를 붙이고, 오늘 파일을 이어받고, 보존 기한 지난 파일을 지운다. 실패는 조용히 무시. */
  async init(folder: PersistentLogFolder): Promise<void> {
    this.folder = folder;
    this.currentDay = dayKey(this.now());
    this.nativePathValue = typeof folder.nativePath === "string" ? folder.nativePath : null;
    // 오늘 파일 이어받기 — 같은 날 여러 세션의 기록이 한 파일에 쌓이게.
    try {
      const entry = await folder.getEntry?.(this.fileName());
      const raw = await entry?.read?.();
      if (typeof raw === "string" && raw.length > 0) {
        this.buffer = raw.split("\n").filter((line) => line.length > 0).slice(-this.maxLines);
      }
    } catch { /* 없으면 새로 시작 */ }
    // 보존 기한 지난 파일 정리 — 파일명 날짜 기준(메타데이터 의존 없음).
    try {
      const entries = (await folder.getEntries?.()) ?? [];
      const cutoff = new Date(this.now().getTime() - this.retainDays * 86_400_000);
      const cutoffKey = dayKey(cutoff);
      for (const entry of entries) {
        const name = String(entry?.name ?? "");
        if (!name.startsWith(FILE_PREFIX) || !name.endsWith(FILE_SUFFIX)) continue;
        const key = name.slice(FILE_PREFIX.length, FILE_PREFIX.length + 8);
        if (/^\d{8}$/u.test(key) && key < cutoffKey) {
          try { await entry.delete?.(); } catch { /* 다음 부팅에 재시도 */ }
        }
      }
    } catch { /* 정리 실패는 무시 */ }
    this.log("info", "── 세션 시작(패널 부팅) ──");
  }

  /** 한 줄 기록(메모리) — 파일 반영은 flush가 한다. */
  log(level: string, message: string): void {
    const nowDate = this.now();
    const key = dayKey(nowDate);
    if (this.currentDay && key !== this.currentDay) {
      // 날짜가 바뀌면 이전 날 버퍼를 마지막으로 내보내고 새 파일로 시작한다.
      void this.flush();
      this.buffer = [];
      this.currentDay = key;
    } else if (!this.currentDay) {
      this.currentDay = key;
    }
    const pad = (value: number): string => String(value).padStart(2, "0");
    const stamp = `${pad(nowDate.getHours())}:${pad(nowDate.getMinutes())}:${pad(nowDate.getSeconds())}`;
    this.buffer.push(`${stamp} [${level.toUpperCase()}] ${sanitizeLine(message)}`);
    if (this.buffer.length > this.maxLines) {
      this.buffer.splice(0, this.buffer.length - this.maxLines);
    }
    this.dirty = true;
  }

  /** 버퍼를 오늘 파일에 통째로 쓴다. 실패는 조용히 무시(다음 주기 재시도). */
  async flush(): Promise<void> {
    if (!this.folder || !this.dirty) return;
    const payload = this.buffer.join("\n") + "\n";
    const name = this.fileName();
    try {
      const file = await this.folder.createFile?.(name, { overwrite: true });
      await file?.write?.(payload);
      this.dirty = false;
    } catch { /* 잠금·권한 등 — 버퍼는 유지되고 다음 flush가 재시도 */ }
  }

  /** 주기 flush 시작(중복 호출 안전). */
  start(): void {
    if (this.intervalHandle) return;
    this.intervalHandle = this.setIntervalFn(() => { void this.flush(); }, this.flushIntervalMs);
  }

  stop(): void {
    if (!this.intervalHandle) return;
    this.clearIntervalFn(this.intervalHandle);
    this.intervalHandle = null;
  }
}
