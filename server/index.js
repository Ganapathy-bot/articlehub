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
const store = require("./db/store");
const articlesRouter = require("./routes/articles");
const filesRouter = require("./routes/files");
const authRouter = require("./routes/auth");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", async (_req, res) => {
  res.json({
    ok: true,
    app: "ArticleHub",
    env: nodeEnv,
    storage: store.getMode(),
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
  console.log(`Supabase URL: ${supabaseUrl || "(not set)"}`);

  if (!fs.existsSync(pdfsDir)) {
    fs.mkdirSync(pdfsDir, { recursive: true });
  }

  const mode = await store.detectMode();
  console.log(`Storage mode: ${mode}`);
  await store.seedAll({ force: process.env.SEED_FORCE === "1" });

  app.listen(port, "0.0.0.0", () => {
    console.log(`ArticleHub LIVE at http://localhost:${port}`);
    console.log(`Admin: ${adminUsername} / (ADMIN_PASSWORD from .env)`);
    console.log(`Register: http://localhost:${port}/register`);
    console.log(`Login:    http://localhost:${port}/login`);
    console.log(`Admin:    http://localhost:${port}/admin`);
  });
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
