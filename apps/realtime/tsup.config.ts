import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  clean: true,
  noExternal: ["@sandcastle/shared", "@sandcastle/db"],
  external: ["@prisma/client", "prisma"]
});
