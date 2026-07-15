// license — 오프라인 시리얼 키 검증(서명·만료·변조·시계 역행) 테스트
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import nacl from "tweetnacl";
import {
  LICENSE_CLOCK_TOLERANCE_MS,
  bytesToBase64Url,
  licenseExpiryMs,
  licenseFailureMessage,
  verifyLicenseKey,
  type LicenseInfo,
} from "../src/license";

const pair = nacl.sign.keyPair();
const publicKeyB64 = bytesToBase64Url(pair.publicKey);

function issueKey(info: LicenseInfo, secretKey = pair.secretKey): string {
  const payload = new TextEncoder().encode(JSON.stringify(info));
  const signature = nacl.sign.detached(payload, secretKey);
  return `SFS1.${bytesToBase64Url(payload)}.${bytesToBase64Url(signature)}`;
}

describe("verifyLicenseKey", () => {
  const now = new Date(2026, 6, 16, 12, 0, 0).getTime();

  it("accepts a signed key before expiry and reports days left", () => {
    const key = issueKey({ id: "friend01", exp: "2026-08-15", plan: "beta" });
    const check = verifyLicenseKey(key, publicKeyB64, now);
    assert.ok(check.ok);
    assert.equal(check.info.id, "friend01");
    assert.equal(check.info.plan, "beta");
    assert.equal(check.daysLeft, 31); // 7-16 정오 → 8-15 자정까지
  });

  it("treats the expiry date as inclusive", () => {
    const key = issueKey({ id: "edge", exp: "2026-07-16" });
    const lastMoment = new Date(2026, 6, 16, 23, 59, 0).getTime();
    const nextDay = new Date(2026, 6, 17, 0, 0, 1).getTime();
    assert.ok(verifyLicenseKey(key, publicKeyB64, lastMoment).ok);
    const expired = verifyLicenseKey(key, publicKeyB64, nextDay);
    assert.ok(!expired.ok && expired.reason === "EXPIRED");
  });

  it("rejects tampered payloads and keys signed by another keypair", () => {
    const key = issueKey({ id: "victim", exp: "2026-08-15" });
    const parts = key.split(".");
    const forgedPayload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ id: "victim", exp: "2099-01-01" })));
    const tampered = verifyLicenseKey(`SFS1.${forgedPayload}.${parts[2]}`, publicKeyB64, now);
    assert.ok(!tampered.ok && tampered.reason === "SIGNATURE");
    const otherPair = nacl.sign.keyPair();
    const foreign = verifyLicenseKey(issueKey({ id: "x", exp: "2099-01-01" }, otherPair.secretKey), publicKeyB64, now);
    assert.ok(!foreign.ok && foreign.reason === "SIGNATURE");
  });

  it("rejects malformed input without throwing", () => {
    for (const [value, reason] of [
      ["", "EMPTY"],
      ["   ", "EMPTY"],
      ["ABCD.efgh.ijkl", "FORMAT"],
      ["SFS1.onlytwo", "FORMAT"],
      ["SFS1.!!!.???", "FORMAT"],
    ] as const) {
      const check = verifyLicenseKey(value, publicKeyB64, now);
      assert.ok(!check.ok && check.reason === reason, `${value} → ${reason}`);
      assert.ok(licenseFailureMessage(check.reason).length > 0);
    }
  });

  it("locks when the clock rolled back beyond tolerance, even with a valid key", () => {
    const key = issueKey({ id: "rollback", exp: "2026-12-31" });
    const lastSeen = now + LICENSE_CLOCK_TOLERANCE_MS + 60_000;
    const check = verifyLicenseKey(key, publicKeyB64, now, lastSeen);
    assert.ok(!check.ok && check.reason === "CLOCK_ROLLBACK");
    assert.ok(verifyLicenseKey(key, publicKeyB64, now, now - 1000).ok);
  });

  it("computes inclusive expiry milliseconds", () => {
    const expiry = licenseExpiryMs({ id: "x", exp: "2026-07-16" });
    assert.equal(expiry, new Date(2026, 6, 17, 0, 0, 0, 0).getTime());
  });
});
