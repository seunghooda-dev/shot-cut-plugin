// planUploadPackage — 업로드 패키지 파일 구성·빠짐 안내 계획 테스트
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planUploadPackage, type UploadPackageInput } from "../src/upload-package";

function input(overrides: Partial<UploadPackageInput> = {}): UploadPackageInput {
  return {
    baseName: "뉴스와이드 숏폼",
    timestamp: "20260715T031500",
    srt: "1\n00:00:00,000 --> 00:00:01,000\n첫 큐\n",
    metadata: { title: "제목", description: "설명", tags: ["뉴스", "#지역"] },
    thumbnails: [{ label: "A", svg: "<svg>A</svg>" }, { label: "B", svg: "<svg>B</svg>" }],
    rightsMarkdown: "# 권리",
    rightsJson: "{\"items\":[]}",
    ...overrides,
  };
}

describe("planUploadPackage", () => {
  it("plans every file with a sanitized folder name and README manifest", () => {
    const plan = planUploadPackage(input());
    assert.equal(plan.folderName, "뉴스와이드 숏폼_upload_20260715T031500");
    assert.deepEqual(plan.missing, []);
    const names = plan.files.map((file) => file.name);
    assert.deepEqual(names, [
      "subtitles.srt",
      "metadata.md",
      "thumbnail_A.svg",
      "thumbnail_B.svg",
      "rights.md",
      "rights.json",
      "README.md",
    ]);
    const readme = plan.files.at(-1)!.content;
    assert.match(readme, /subtitles\.srt/u);
    assert.match(readme, /영상은 이 패키지에 포함되지 않습니다/u);
    assert.doesNotMatch(readme, /빠진 항목/u);
    const metadata = plan.files[1]!.content;
    assert.match(metadata, /## 해시태그\n#뉴스 #지역/u);
  });

  it("lists missing pieces in the plan and README when inputs are absent", () => {
    const plan = planUploadPackage(input({ srt: null, metadata: null, thumbnails: [], rightsMarkdown: null, rightsJson: null }));
    assert.deepEqual(plan.files.map((file) => file.name), ["README.md"]);
    assert.equal(plan.missing.length, 4);
    const readme = plan.files[0]!.content;
    assert.match(readme, /## 빠진 항목/u);
    assert.match(readme, /자막 SRT/u);
    assert.match(readme, /에셋 권리 리포트/u);
  });

  it("falls back to a safe folder name and treats blank fields as missing", () => {
    const plan = planUploadPackage(input({ baseName: "   ", srt: "   ", metadata: { title: " ", description: "", tags: [] } }));
    assert.match(plan.folderName, /^ShortFlow_upload_/u);
    assert.ok(plan.missing.includes("자막 SRT"));
    assert.ok(plan.missing.some((label) => label.includes("유튜브 메타데이터")));
  });
});
