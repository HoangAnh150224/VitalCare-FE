import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

// Unit tests (Report-5.1_Unit Test.xlsx): npx vitest run -c vitest.unit.config.ts
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  define: { "import.meta.env.VITE_API_URL": JSON.stringify("http://api.test/api") },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/__unit__/setup.ts"],
    include: ["src/__unit__/**/*.test.ts", "src/__unit__/**/*.test.tsx"],
    css: false,
    // Refine's ESM builds import lodash without the ".js" Node needs; let Vite resolve them.
    server: { deps: { inline: [/@refinedev\//] } },
    testTimeout: 20_000,
  },
});
