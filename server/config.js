const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const rootDir = path.join(__dirname, "..");

function cleanEnv(value) {
  return String(value || "").trim();
}

function getAdminSeedConfig() {
  const username = cleanEnv(process.env.ADMIN_USERNAME).toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "");
  const email = cleanEnv(process.env.ADMIN_EMAIL).toLowerCase();
  const missing = [];

  if (!username) missing.push("ADMIN_USERNAME");
  if (!password) missing.push("ADMIN_PASSWORD");
  if (!email) missing.push("ADMIN_EMAIL");

  if (missing.length) {
    throw new Error(
      `Missing required admin environment variable(s): ${missing.join(", ")}`
    );
  }

  return { username, password, email };
}

module.exports = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  supabaseUrl: process.env.SUPABASE_URL || "",
  // Prefer secret/service_role for server; fall back to publishable/anon
  supabaseKey:
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    "",
  pdfsDir: process.env.PDFS_DIR
    ? path.resolve(process.env.PDFS_DIR)
    : path.join(rootDir, "public", "pdfs"),
  buildDir: path.join(rootDir, "build"),
  seedFile: path.join(rootDir, "src", "data", "articles.json"),
  /** Admin account values are seeded only from private environment variables. */
  adminUsername: cleanEnv(process.env.ADMIN_USERNAME).toLowerCase(),
  adminEmail: cleanEnv(process.env.ADMIN_EMAIL).toLowerCase(),
  getAdminSeedConfig,
  jwtSecret:
    process.env.JWT_SECRET || "articlehub-dev-secret-change-in-production",
  tokenTtlSeconds: Number(process.env.TOKEN_TTL_SECONDS) || 60 * 60 * 24 * 7,
};
