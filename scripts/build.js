const esbuild = require("esbuild");
const deps = require("../package.json").dependencies;

const sharedConfig = {
  entryPoints: ["src/wt.ts"],
  external: ["react"].concat(...Object.keys(deps)),
};

const CONFIGS = [
  {
    ...sharedConfig,
    target: "esnext",
    bundle: true,
    format: "esm",
    outfile: "dist/wt.esm.js",
  },
  {
    ...sharedConfig,
    target: "es2017",
    bundle: true,
    format: "cjs",
    outfile: "dist/wt.dev.js",
  },
  {
    ...sharedConfig,
    target: "es2017",
    bundle: true,
    minify: true,
    format: "cjs",
    outfile: "dist/wt.min.js",
  },
];

Promise.all(CONFIGS.map((c) => esbuild.build(c))).catch(() => process.exit(1));
