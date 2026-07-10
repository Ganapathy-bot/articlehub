/**
 * Data layer: prefers Supabase tables; falls back to local JSON "tables"
 * so the app can run live even before SQL is applied in the dashboard.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { createSupabase } = require("../supabase");
const { seedFile, pdfsDir, adminUsername, adminPassword, adminEmail } = require("../config");
const { slugify } = require("../slug");

const dataDir = path.join(__dirname, "..", "..", "data");
const storePath = path.join(dataDir, "local-db.json");

let mode = "local"; // 'supabase' | 'local'
let supabase = null;

function emptyLocal() {
  return { articles: [], users: [] };
}

function readLocal() {
  if (!fs.existsSync(storePath)) return emptyLocal();
  try {
    return JSON.parse(fs.readFileSync(storePath, "utf8"));
  } catch {
    return emptyLocal();
  }
}

function writeLocal(db) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(db, null, 2), "utf8");
}

function mapArticle(row) {
  if (!row) return null;
  return {
    id: row.slug,
    title: row.title,
    topic: row.topic,
    description: row.description || "",
    content: row.content || "",
    publishedAt: row.published_at || row.publishedAt || "",
    image: row.image || "",
    pdfUrl: row.pdf_url || row.pdfUrl || "",
    source: row.source || "ArticleHub Library",
  };
}

async function detectMode() {
  try {
    supabase = createSupabase();
    const { error: aErr } = await supabase.from("articles").select("slug").limit(1);
    const { error: uErr } = await supabase.from("users").select("id").limit(1);
    if (!aErr && !uErr) {
      mode = "supabase";
      return mode;
    }
    console.warn(
      "Supabase tables missing (" +
        (aErr || uErr).message +
        "). Using local JSON tables at data/local-db.json"
    );
  } catch (e) {
    console.warn("Supabase unavailable:", e.message);
  }
  mode = "local";
  return mode;
}

function getMode() {
  return mode;
}

async function listArticles({ topic, q } = {}) {
  if (mode === "supabase") {
    let query = supabase
      .from("articles")
      .select(
        "slug, title, topic, description, content, published_at, image, pdf_url, source"
      )
      .order("published_at", { ascending: false });
    if (topic && topic !== "all") query = query.eq("topic", String(topic).toLowerCase());
    if (q && String(q).trim()) {
      const term = String(q).trim().replace(/%/g, "\\%");
      query = query.or(
        `title.ilike.%${term}%,description.ilike.%${term}%,content.ilike.%${term}%,topic.ilike.%${term}%,source.ilike.%${term}%`
      );
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapArticle);
  }

  let list = readLocal().articles.map(mapArticle);
  if (topic && topic !== "all") {
    list = list.filter((a) => a.topic === String(topic).toLowerCase());
  }
  if (q && String(q).trim()) {
    const term = String(q).trim().toLowerCase();
    list = list.filter((a) =>
      [a.title, a.description, a.content, a.topic, a.source]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }
  return list.sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
}

async function getArticleBySlug(slug) {
  if (mode === "supabase") {
    const { data, error } = await supabase
      .from("articles")
      .select(
        "slug, title, topic, description, content, published_at, image, pdf_url, source"
      )
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return mapArticle(data);
  }
  return mapArticle(readLocal().articles.find((a) => a.slug === slug));
}

async function getTopics() {
  const articles = await listArticles();
  const topics = Array.from(new Set(articles.map((a) => a.topic).filter(Boolean))).sort();
  return ["all", ...topics];
}

async function createArticle(row) {
  if (mode === "supabase") {
    const { data, error } = await supabase
      .from("articles")
      .insert(row)
      .select(
        "slug, title, topic, description, content, published_at, image, pdf_url, source"
      )
      .single();
    if (error) throw error;
    return mapArticle(data);
  }
  const db = readLocal();
  if (db.articles.some((a) => a.slug === row.slug)) {
    row.slug = `${row.slug}-${Date.now()}`;
  }
  db.articles.unshift(row);
  writeLocal(db);
  return mapArticle(row);
}

async function deleteArticle(slug) {
  if (mode === "supabase") {
    const { data: article, error: findError } = await supabase
      .from("articles")
      .select("slug, pdf_filename")
      .eq("slug", slug)
      .maybeSingle();
    if (findError) throw findError;
    if (!article) return null;
    const { error } = await supabase.from("articles").delete().eq("slug", slug);
    if (error) throw error;
    return article;
  }
  const db = readLocal();
  const idx = db.articles.findIndex((a) => a.slug === slug);
  if (idx < 0) return null;
  const [article] = db.articles.splice(idx, 1);
  writeLocal(db);
  return article;
}

async function findUserByUsername(username) {
  const u = String(username || "").trim().toLowerCase();
  if (mode === "supabase") {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, email, full_name, role, password_hash")
      .eq("username", u)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  return readLocal().users.find((x) => x.username === u) || null;
}

async function createUser({ username, email, full_name, password_hash, role }) {
  const row = {
    id: crypto.randomUUID(),
    username: String(username).toLowerCase(),
    email: String(email).toLowerCase(),
    full_name: full_name || username,
    password_hash,
    role: role || "user",
    created_at: new Date().toISOString(),
  };

  if (mode === "supabase") {
    const { data, error } = await supabase
      .from("users")
      .insert({
        username: row.username,
        email: row.email,
        full_name: row.full_name,
        password_hash: row.password_hash,
        role: row.role,
      })
      .select("id, username, email, full_name, role")
      .single();
    if (error) throw error;
    return data;
  }

  const db = readLocal();
  if (db.users.some((u) => u.username === row.username || u.email === row.email)) {
    const err = new Error("Username or email already registered");
    err.code = "23505";
    throw err;
  }
  db.users.push(row);
  writeLocal(db);
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
  };
}

async function listUsers() {
  if (mode === "supabase") {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, email, full_name, role, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }
  return readLocal().users.map((u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    created_at: u.created_at,
  }));
}

function buildSeedArticles() {
  const bySlug = new Map();
  if (fs.existsSync(seedFile)) {
    const catalog = JSON.parse(fs.readFileSync(seedFile, "utf8"));
    for (const item of catalog) {
      const slug = item.id || slugify(item.title);
      const pdfFilename = item.pdfUrl
        ? path.basename(String(item.pdfUrl).replace(/^\/+/, ""))
        : "";
      bySlug.set(slug, {
        slug,
        title: item.title,
        topic: (item.topic || "general").toLowerCase(),
        description: item.description || "",
        content: (item.content || "").replace(/BlogMania|PaperShelf/g, "ArticleHub"),
        published_at: item.publishedAt || new Date().toISOString().slice(0, 10),
        image: item.image || "",
        pdf_filename: pdfFilename,
        pdf_url: pdfFilename
          ? `/api/files/${encodeURIComponent(pdfFilename)}`
          : "",
        source: (item.source || "ArticleHub Library").replace(
          /BlogMania|PaperShelf/g,
          "ArticleHub"
        ),
      });
    }
  }
  if (fs.existsSync(pdfsDir)) {
    for (const filename of fs.readdirSync(pdfsDir).filter((f) => f.endsWith(".pdf"))) {
      const slug = slugify(filename.replace(/\.pdf$/i, ""));
      if (bySlug.has(slug)) {
        const e = bySlug.get(slug);
        e.pdf_filename = filename;
        e.pdf_url = `/api/files/${encodeURIComponent(filename)}`;
        continue;
      }
      const title = filename
        .replace(/\.pdf$/i, "")
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      bySlug.set(slug, {
        slug,
        title,
        topic: "general",
        description: `PDF document: ${title}`,
        content: `${title}\n\nOpen the PDF for full content.`,
        published_at: new Date().toISOString().slice(0, 10),
        image: "",
        pdf_filename: filename,
        pdf_url: `/api/files/${encodeURIComponent(filename)}`,
        source: "ArticleHub Library",
      });
    }
  }
  return Array.from(bySlug.values());
}

async function seedAll({ force = false } = {}) {
  const password_hash = await bcrypt.hash(adminPassword, 10);
  const adminUser = {
    username: String(adminUsername).toLowerCase(),
    email: String(adminEmail).toLowerCase(),
    full_name: "Site Administrator",
    password_hash,
    role: "admin",
  };

  if (mode === "supabase") {
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("username", adminUser.username)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("users")
        .update({
          role: "admin",
          password_hash,
          email: adminUser.email,
          full_name: adminUser.full_name,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("users").insert(adminUser);
    }
    console.log(`Admin ready: ${adminUser.username}`);

    const { count } = await supabase
      .from("articles")
      .select("*", { count: "exact", head: true });
    if (count > 0 && !force) {
      console.log(`Supabase has ${count} article(s); skip seed`);
      return;
    }
    if (force) await supabase.from("articles").delete().neq("slug", "");
    const rows = buildSeedArticles();
    if (rows.length) {
      const { error } = await supabase.from("articles").upsert(rows, {
        onConflict: "slug",
      });
      if (error) throw error;
      console.log(`Seeded ${rows.length} articles into Supabase`);
    }
    return;
  }

  // Local tables
  let db = force ? emptyLocal() : readLocal();
  const adminIdx = db.users.findIndex((u) => u.username === adminUser.username);
  const adminRow = {
    id: crypto.randomUUID(),
    ...adminUser,
    created_at: new Date().toISOString(),
  };
  if (adminIdx >= 0) {
    db.users[adminIdx] = {
      ...db.users[adminIdx],
      ...adminUser,
    };
  } else {
    db.users.push(adminRow);
  }

  if (db.articles.length === 0 || force) {
    db.articles = buildSeedArticles();
  }
  writeLocal(db);
  console.log(
    `Local tables ready: ${db.articles.length} articles, ${db.users.length} users (admin: ${adminUser.username})`
  );
}

module.exports = {
  detectMode,
  getMode,
  listArticles,
  getArticleBySlug,
  getTopics,
  createArticle,
  deleteArticle,
  findUserByUsername,
  createUser,
  listUsers,
  seedAll,
};
