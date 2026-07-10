/**
 * Cross-platform production build (OpenSSL legacy flag for old react-scripts).
 * Uses cwd + npx so paths with spaces/commas work on Windows.
 */
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");

const env = {
  ...process.env,
  NODE_OPTIONS: [process.env.NODE_OPTIONS, "--openssl-legacy-provider"]
    .filter(Boolean)
    .join(" "),
  CI: process.env.CI || "false",
  GENERATE_SOURCEMAP: "false",
};

const result = spawnSync("npx", ["react-scripts", "build"], {
  env,
  stdio: "inherit",
  shell: true,
  cwd: root,
});

process.exit(result.status === null ? 1 : result.status);
