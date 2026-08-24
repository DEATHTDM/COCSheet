import vue from "@vitejs/plugin-vue";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

import packageMetadata from "./package.json" with { type: "json" };

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    base: "./",
    define: {
      __APP_VERSION__: JSON.stringify(packageMetadata.version),
      __BUILD_SHA__: JSON.stringify(env.VITE_BUILD_SHA || "dev"),
    },
    plugins: [vue()],
    test: {
      environment: "node",
      include: ["src/**/*.test.ts"],
    },
  };
});
