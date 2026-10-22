import { defineConfig } from "vitest/config";

const test = {
  include: ["tests/**/*.test.ts"],
  environment: "node",
};

// `vite build` builds the library (src/index.ts); `--mode app` builds the static intake page
// (index.html) into dist/app with relative paths and nothing inlined, to satisfy its CSP.
export default defineConfig(({ mode }) =>
  mode === "app"
    ? {
        base: "./",
        build: {
          outDir: "dist/app",
          assetsInlineLimit: 0,
          modulePreload: { polyfill: false },
          sourcemap: false,
        },
        test,
      }
    : {
        build: {
          lib: {
            entry: "src/index.ts",
            formats: ["es"],
            fileName: "dpdp-breach-core",
          },
          sourcemap: true,
        },
        test,
      },
);
