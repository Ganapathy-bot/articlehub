const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const rootDir = path.join(__dirname, "..");

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
  /** Default admin account (seeded into users table if missing) */
  adminUsername: process.env.ADMIN_USERNAME || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || "admin123",
  adminEmail: process.env.ADMIN_EMAIL || "admin@articlehub.local",
  jwtSecret:
    process.env.JWT_SECRET || "articlehub-dev-secret-change-in-production",
  tokenTtlSeconds: Number(process.env.TOKEN_TTL_SECONDS) || 60 * 60 * 24 * 7,
};
