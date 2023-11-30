import { resolve } from "path";
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import dts from "vite-plugin-dts";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    emptyOutDir: false, // keep the dist folder to avoid errors with pnpm go when folder is empty during build
    minify: "terser",
    sourcemap: true,
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, "src/index.ts"),
      name: "formbricks-surveys",
      formats: ["cjs", "es", "umd"],
      // the proper extensions will be added
      fileName: "index",
    },
  },
  plugins: [preact(), dts({ rollupTypes: true }), tsconfigPaths()],
});
