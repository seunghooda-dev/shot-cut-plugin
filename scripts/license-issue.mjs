#!/usr/bin/env node
// 시리얼 키 발급 도구 — Ed25519 키쌍 생성(--init)과 만료일 서명 키 발급(--id --days)
// 개인키는 저장소 밖(~/.shortflow-license/private.key)에만 저장한다. 절대 커밋 금지.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nacl from "tweetnacl";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const keyDir = join(homedir(), ".shortflow-license");
const privateKeyPath = join(keyDir, "private.key");
const publicKeyModulePath = join(projectRoot, "src", "license-public-key.ts");

const toB64Url = (bytes) => Buffer.from(bytes).toString("base64url");
const fromB64Url = (text) => new Uint8Array(Buffer.from(text.trim(), "base64url"));

function argValue(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function init() {
  try {
    await readFile(privateKeyPath, "utf8");
    console.error(`이미 키쌍이 있습니다: ${privateKeyPath}`);
    console.error("재생성하면 기존에 발급한 모든 시리얼 키가 무효화됩니다. 정말 원하면 파일을 직접 삭제 후 다시 실행하세요.");
    process.exit(1);
  } catch {
    // 없음 — 새로 생성
  }
  const pair = nacl.sign.keyPair();
  await mkdir(keyDir, { recursive: true });
  await writeFile(privateKeyPath, toB64Url(pair.secretKey), "utf8");
  const moduleSource = `// 시리얼 키 검증용 공개키 — scripts/license-issue.mjs --init 이 생성(개인키는 저장소 밖에 보관)\n`
    + `export const LICENSE_PUBLIC_KEY = "${toB64Url(pair.publicKey)}";\n`;
  await writeFile(publicKeyModulePath, moduleSource, "utf8");
  console.log(`개인키 저장: ${privateKeyPath} (커밋 금지, 백업 권장)`);
  console.log(`공개키 갱신: ${publicKeyModulePath}`);
}

async function issue() {
  const id = argValue("id");
  const days = Number(argValue("days"));
  const plan = argValue("plan");
  if (!id || !Number.isFinite(days) || days <= 0) {
    console.error("사용법: node scripts/license-issue.mjs --id <이름> --days <일수> [--plan <표시명>]");
    process.exit(1);
  }
  const secretKey = fromB64Url(await readFile(privateKeyPath, "utf8"));
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + Math.floor(days));
  const pad = (value) => String(value).padStart(2, "0");
  const exp = `${expiry.getFullYear()}-${pad(expiry.getMonth() + 1)}-${pad(expiry.getDate())}`;
  const payloadObject = plan ? { id, exp, plan } : { id, exp };
  const payload = new TextEncoder().encode(JSON.stringify(payloadObject));
  const signature = nacl.sign.detached(payload, secretKey);
  const key = `SFS1.${toB64Url(payload)}.${toB64Url(signature)}`;
  console.log(`발급 대상: ${id} · 만료일: ${exp}(포함)${plan ? ` · 플랜: ${plan}` : ""}`);
  console.log(key);
}

if (process.argv.includes("--init")) {
  await init();
} else {
  await issue();
}
