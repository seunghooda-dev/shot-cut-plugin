// 업로드 패키지(자막 SRT·유튜브 메타데이터·썸네일 SVG·권리 리포트) 파일 구성을 계획하는 순수 계층
import { sanitizeFileName } from "./core";

export interface UploadPackageInput {
  /** 패키지 폴더 이름의 기반(시퀀스/프로젝트 이름). */
  baseName: string;
  /** 파일명에 붙일 타임스탬프 문자열(호출자가 생성, 예: 20260715T031500). */
  timestamp: string;
  srt: string | null;
  metadata: { title: string; description: string; tags: string[] } | null;
  thumbnails: Array<{ label: string; svg: string }>;
  rightsMarkdown: string | null;
  rightsJson: string | null;
}

export interface UploadPackagePlan {
  folderName: string;
  files: Array<{ name: string; content: string }>;
  /** 이번 패키지에서 빠진 구성물의 한국어 라벨(README에도 안내된다). */
  missing: string[];
}

function metadataMarkdown(metadata: NonNullable<UploadPackageInput["metadata"]>): string {
  const tags = metadata.tags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" ");
  return [
    "# 업로드 메타데이터",
    "",
    "## 제목",
    metadata.title,
    "",
    "## 설명",
    metadata.description,
    "",
    "## 해시태그",
    tags || "(없음)",
    "",
  ].join("\n");
}

function readmeMarkdown(input: UploadPackageInput, files: ReadonlyArray<{ name: string }>, missing: readonly string[]): string {
  const lines = [
    `# ${input.baseName} 업로드 패키지`,
    "",
    `생성: ${input.timestamp} · ShortFlow Studio`,
    "",
    "## 포함 파일",
    ...files.map((file) => `- ${file.name}`),
    "",
    "## 영상 파일",
    "영상은 이 패키지에 포함되지 않습니다. 내보내기 탭에서 렌더한 결과 파일을 이 폴더에 복사해 주세요.",
  ];
  if (missing.length > 0) {
    lines.push("", "## 빠진 항목", ...missing.map((label) => `- ${label} — 패널에서 준비한 뒤 다시 내보내면 포함됩니다.`));
  }
  lines.push("");
  return lines.join("\n");
}

/** 입력에서 실제 만들 파일 목록과 빠진 구성물을 계산한다(파일 IO 없음 — 쓰기는 호출자 몫). */
export function planUploadPackage(input: UploadPackageInput): UploadPackagePlan {
  const base = sanitizeFileName(input.baseName.trim() || "ShortFlow").replace(/\.+$/u, "");
  const folderName = `${base}_upload_${input.timestamp}`;
  const files: Array<{ name: string; content: string }> = [];
  const missing: string[] = [];
  if (input.srt && input.srt.trim().length > 0) {
    files.push({ name: "subtitles.srt", content: input.srt });
  } else {
    missing.push("자막 SRT");
  }
  if (input.metadata && input.metadata.title.trim()) {
    files.push({ name: "metadata.md", content: metadataMarkdown(input.metadata) });
  } else {
    missing.push("유튜브 메타데이터(자막 탭 AI 분석)");
  }
  if (input.thumbnails.length > 0) {
    for (const thumbnail of input.thumbnails) {
      files.push({ name: `thumbnail_${sanitizeFileName(thumbnail.label) || "A"}.svg`, content: thumbnail.svg });
    }
  } else {
    missing.push("썸네일 변형(썸네일 탭)");
  }
  if (input.rightsMarkdown) {
    files.push({ name: "rights.md", content: input.rightsMarkdown });
  }
  if (input.rightsJson) {
    files.push({ name: "rights.json", content: input.rightsJson });
  }
  if (!input.rightsMarkdown && !input.rightsJson) {
    missing.push("에셋 권리 리포트");
  }
  files.push({ name: "README.md", content: readmeMarkdown(input, files, missing) });
  return { folderName, files, missing };
}
