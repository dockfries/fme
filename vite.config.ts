import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  const isDev = mode === "development";
  return {
    build: {
      target: "node22",
      ssr: true,
      lib: {
        formats: ["es"],
        entry: {
          bundle: "src/main.ts",
        },
      },
      sourcemap: isDev,
      watch: isDev
        ? {
            clearScreen: true,
            include: ["src/**/*.ts"],
          }
        : null,
      rolldownOptions: {
        output: {
          minify: !isDev,
          cleanDir: !isDev,
          dir: "dist",
        },
      },
    },
    resolve: {
      alias: [{ find: "@", replacement: path.resolve(import.meta.dirname, "src") }],
    },
  };
});
