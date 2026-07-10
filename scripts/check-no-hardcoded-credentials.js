const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const rootDir = path.join(__dirname, "..");
const skippedFiles = new Set([
  "scripts/check-no-hardcoded-credentials.js",
]);
const skippedExtensions = new Set([
  ".ico",
  ".jpg",
  ".jpeg",
  ".png",
  ".pdf",
]);

const blockedPatterns = [
  {
    name: "public default admin password",
    pattern: new RegExp("admin" + "123", "i"),
  },
  {
    name: "default admin username in env example",
    pattern: new RegExp("ADMIN_USERNAME\\s*=\\s*" + "admin\\b", "i"),
  },
  {
    name: "hard-coded admin username fallback",
    pattern: new RegExp("ADMIN_USERNAME\\s*\\|\\|\\s*['\\\"]" + "admin['\\\"]", "i"),
  },
];

const tracked = execFileSync("git", ["ls-files", "-z"], {
  cwd: rootDir,
  encoding: "buffer",
})
  .toString("utf8")
  .split("\0")
  .filter(Boolean);

const findings = [];

for (const file of tracked) {
  if (skippedFiles.has(file)) continue;
  if (skippedExtensions.has(path.extname(file).toLowerCase())) continue;

  const fullPath = path.join(rootDir, file);
  const text = fs.readFileSync(fullPath, "utf8");
  const lines = text.split(/\r?\n/);

  for (const { name, pattern } of blockedPatterns) {
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        findings.push(`${file}:${index + 1} ${name}`);
      }
    });
  }
}

if (findings.length) {
  console.error("Hard-coded credential references found:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("No hard-coded admin credentials found in tracked files.");
