const esbuild = require("esbuild");

const entryPoints = ["src/wt.ts"];

const CONFIGS = [
  {
    target: "esnext",
    entryPoints,
    bundle: true,
    format: "esm",
    outfile: "dist/wt.esm.js",
  },
  {
    target: "es2017",
    entryPoints,
    bundle: true,
    format: "cjs",
    outfile: "dist/wt.dev.js",
  },
  {
    target: "es2017",
    entryPoints,
    bundle: true,
    minify: true,
    format: "cjs",
    outfile: "dist/wt.min.js",
  },
];

Promise.all(CONFIGS.map((c) => esbuild.build(c))).catch(() => process.exit(1));
