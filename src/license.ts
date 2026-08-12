// 오프라인 시리얼 키 검증 — Ed25519 서명·만료일·시계 역행 가드(서버 없는 30일/연장 배포용)
import nacl from "tweetnacl";

export const LICENSE_STORAGE_KEY = "shortflow.license.v1";
export const LICENSE_CLOCK_KEY = "shortflow.license.lastSeen.v1";
/**
 * 시계 역행 허용 오차 — 표준시 변경·이중 부팅·NTP 재동기 수준은 눈감고, 날짜 되돌리기는 잡는다.
 * 6h → 48h(2026-08-12 운영 감사): CMOS 방전·VM 복원·NTP 오류로 시계가 하루쯤 어긋났다 돌아오는
 * 정직한 사용자를 영구 잠그는 오탐이 실익(만료 우회는 며칠 되돌려야 의미)보다 컸다.
 */
export const LICENSE_CLOCK_TOLERANCE_MS = 48 * 60 * 60 * 1000;
const KEY_PREFIX = "SFS1";

export interface LicenseInfo {
  id: string;
  /** 만료일(포함) — YYYY-MM-DD, 그날 23:59:59까지 유효. */
  exp: string;
  plan?: string;
}

export type LicenseCheck =
  | { ok: true; info: LicenseInfo; daysLeft: number }
  | { ok: false; reason: "EMPTY" | "FORMAT" | "SIGNATURE" | "PAYLOAD" | "EXPIRED" | "CLOCK_ROLLBACK" };

function base64UrlToBytes(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/gu, "+").replace(/_/gu, "/")
      + "=".repeat((4 - (value.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return null;
  }
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.byteLength; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/u, "");
}

function parseInfo(payloadBytes: Uint8Array): LicenseInfo | null {
  try {
    let json = "";
    for (const byte of payloadBytes) json += String.fromCharCode(byte);
    const decoded = JSON.parse(decodeURIComponent(escape(json))) as Record<string, unknown>;
    if (typeof decoded.id !== "string" || decoded.id.length === 0 || decoded.id.length > 80) return null;
    if (typeof decoded.exp !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(decoded.exp)) return null;
    const info: LicenseInfo = { id: decoded.id, exp: decoded.exp };
    if (typeof decoded.plan === "string" && decoded.plan.length <= 40) info.plan = decoded.plan;
    return info;
  } catch {
    return null;
  }
}

/** 만료일 포함 자정(로컬)까지 유효 — 만료 시각(exclusive)을 ms로 돌려준다. */
export function licenseExpiryMs(info: LicenseInfo): number {
  const [year, month, day] = info.exp.split("-").map(Number);
  return new Date(year!, month! - 1, day!, 23, 59, 59, 999).getTime() + 1;
}

/**
 * 시리얼 키(`SFS1.<b64url(payload)>.<b64url(sig)>`)를 검증한다. 서명은 payload 원문 바이트에
 * 대한 Ed25519, 만료는 exp 날짜(포함)의 로컬 자정 기준. 시계 역행은 lastSeenMs로 별도 판정.
 */
export function verifyLicenseKey(
  key: string,
  publicKeyBase64Url: string,
  nowMs = Date.now(),
  lastSeenMs = 0,
): LicenseCheck {
  const trimmed = typeof key === "string" ? key.trim() : "";
  if (!trimmed) return { ok: false, reason: "EMPTY" };
  const parts = trimmed.split(".");
  if (parts.length !== 3 || parts[0] !== KEY_PREFIX) return { ok: false, reason: "FORMAT" };
  const payload = base64UrlToBytes(parts[1]!);
  const signature = base64UrlToBytes(parts[2]!);
  const publicKey = base64UrlToBytes(publicKeyBase64Url);
  if (!payload || !signature || !publicKey || signature.length !== 64 || publicKey.length !== 32) {
    return { ok: false, reason: "FORMAT" };
  }
  if (!nacl.sign.detached.verify(payload, signature, publicKey)) {
    return { ok: false, reason: "SIGNATURE" };
  }
  const info = parseInfo(payload);
  if (!info) return { ok: false, reason: "PAYLOAD" };
  if (Number.isFinite(lastSeenMs) && lastSeenMs - nowMs > LICENSE_CLOCK_TOLERANCE_MS) {
    return { ok: false, reason: "CLOCK_ROLLBACK" };
  }
  const expiry = licenseExpiryMs(info);
  if (nowMs >= expiry) return { ok: false, reason: "EXPIRED" };
  const daysLeft = Math.ceil((expiry - nowMs) / 86_400_000);
  return { ok: true, info, daysLeft };
}

/** 사용자에게 보여줄 실패 사유 문구. */
export function licenseFailureMessage(reason: Extract<LicenseCheck, { ok: false }>["reason"]): string {
  switch (reason) {
    case "EMPTY": return "시리얼 키를 입력해 주세요.";
    case "FORMAT": return "시리얼 키 형식이 올바르지 않습니다. 전달받은 키 전체를 붙여넣어 주세요.";
    case "SIGNATURE": return "유효하지 않은 시리얼 키입니다.";
    case "PAYLOAD": return "시리얼 키 내용이 손상되었습니다. 발급자에게 재발급을 요청해 주세요.";
    case "EXPIRED": return "시리얼 키 사용 기간이 만료되었습니다. 연장 키를 요청해 주세요.";
    case "CLOCK_ROLLBACK": return "시스템 시계가 과거로 변경된 것이 감지되었습니다. 시계를 올바르게 맞춘 뒤에도 이 메시지가 계속되면 발급 담당자에게 문의해 주세요(시계 오류 잔재를 초기화해 드립니다).";
  }
}
