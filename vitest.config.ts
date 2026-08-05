import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["server/**/*.test.ts", "src/lib/firebase.load.test.ts"],
    environment: "node",
  },
});
