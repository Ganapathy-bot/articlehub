const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const {
  port,
  buildDir,
  pdfsDir,
  supabaseUrl,
  adminUsername,
  nodeEnv,
} = require("./config");
const { assertConfig, createSupabase } = require("./supabase");
const { seedArticles } = require("./seed");
const { seedAdminUser } = require("./seedUsers");
const articlesRouter = require("./routes/articles");
const filesRouter = require("./routes/files");
const authRouter = require("./routes/auth");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", async (_req, res) => {
  let supabaseStatus = "not_configured";
  try {
    assertConfig();
    const supabase = createSupabase();
    const { error } = await supabase
      .from("articles")
      .select("slug", { head: true, count: "exact" });
    supabaseStatus = error ? `error: ${error.message}` : "connected";
  } catch (err) {
    supabaseStatus = `error: ${err.message}`;
  }

  res.json({
    ok: true,
    app: "ArticleHub",
    env: nodeEnv,
    supabase: supabaseStatus,
    supabaseUrl: supabaseUrl || null,
    roles: {
      user: "register + login, read articles",
      admin: "full privileges: add / remove articles, view users",
    },
  });
});

app.use("/api/auth", authRouter);
app.use("/api/articles", articlesRouter);
app.use("/api/files", filesRouter);
app.use("/pdfs", express.static(pdfsDir));

if (fs.existsSync(buildDir)) {
  app.use(express.static(buildDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(buildDir, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res
      .status(503)
      .send(
        "Frontend build missing. Run npm run build, then restart the server."
      );
  });
}

async function start() {
  console.log("ArticleHub server starting…");
  console.log(`NODE_ENV=${nodeEnv}`);
  assertConfig();
  console.log(`Supabase URL: ${supabaseUrl}`);

  try {
    const supabase = createSupabase();
    const { error: aErr } = await supabase
      .from("articles")
      .select("slug", { head: true, count: "exact" });
    if (aErr) throw new Error(`articles: ${aErr.message}`);
    const { error: uErr } = await supabase
      .from("users")
      .select("id", { head: true, count: "exact" });
    if (uErr) throw new Error(`users: ${uErr.message}`);
    console.log("Connected to Supabase (articles + users)");
  } catch (err) {
    console.error("\n❌ Supabase connection / tables failed.");
    console.error(`   ${err.message}`);
    console.error("\n1. Run supabase/schema.sql in Supabase SQL Editor");
    console.error("2. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env\n");
    process.exit(1);
  }

  if (!fs.existsSync(pdfsDir)) {
    fs.mkdirSync(pdfsDir, { recursive: true });
  }

  await seedAdminUser();
  await seedArticles({ force: process.env.SEED_FORCE === "1" });

  app.listen(port, () => {
    console.log(`ArticleHub running at http://localhost:${port}`);
    console.log(`Admin login: username "${adminUsername}" (password from ADMIN_PASSWORD)`);
    console.log(`Register:    http://localhost:${port}/register`);
    console.log(`Login:       http://localhost:${port}/login`);
    console.log(`Admin panel: http://localhost:${port}/admin`);
  });
}

start();
