import { defineConfig } from "vite";
import { resolve } from "node:path";

// dev 빌드(기본)는 디버깅·실기 스모크를 위해 minify 없이, release 모드(패키징 전용)만
// minify + __SHORTFLOW_RELEASE__=true — 라이선스 강제와 난독화는 배포 산출물에만 적용된다.
export default defineConfig(({ mode }) => ({
  publicDir: "public",
  define: {
    __SHORTFLOW_RELEASE__: JSON.stringify(mode === "release")
  },
  build: {
    emptyOutDir: true,
    target: "es2020",
    minify: mode === "release" ? "esbuild" : false,
    sourcemap: false,
    lib: {
      entry: resolve(import.meta.dirname, "index.ts"),
      formats: ["cjs"],
      fileName: () => "index.js"
    },
    rollupOptions: {
      external: ["premierepro", "uxp", "path"],
      output: {
        exports: "named"
      }
    }
  }
}));
