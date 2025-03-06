import alias from "@rollup/plugin-alias";
import json from "@rollup/plugin-json";
import replace from "@rollup/plugin-replace";
import typescript from "@rollup/plugin-typescript";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "rollup";
import { nodeExternals } from "rollup-plugin-node-externals";

const packageName = process.env.npm_package_name;
const packageVersion = process.env.npm_package_version;

export default defineConfig({
  input: "./src/index.ts",
  output: [
    {
      dir: "lib",
      entryFileNames: "[name].js",
      exports: "named", // change to "default" or "auto" will cause verdaccio error
      format: "cjs",
    },
    {
      dir: "lib",
      entryFileNames: "[name].mjs",
      format: "es",
    },
  ],
  plugins: [
    nodeExternals({
      deps: true,
      devDeps: true,
      peerDeps: true,
    }),
    alias({
      entries: [{ find: "@", replacement: fileURLToPath(new URL("src", import.meta.url)) }],
    }),
    replace({
      preventAssignment: true,
      values: {
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
        "process.env.npm_package_name": JSON.stringify(packageName),
        "process.env.npm_package_version": JSON.stringify(packageVersion),
      },
    }),
    json(),
    typescript(),
  ],
});
