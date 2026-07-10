const express = require("express");
const bcrypt = require("bcryptjs");
const { issueToken, requireAuth, requireAdmin } = require("../auth");
const store = require("../db/store");

const router = express.Router();

function publicUser(row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    fullName: row.full_name || "",
    role: row.role,
  };
}

router.post("/register", async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body || {};
    const u = String(username || "")
      .trim()
      .toLowerCase();
    const e = String(email || "")
      .trim()
      .toLowerCase();
    const p = String(password || "");
    const name = String(fullName || "").trim();

    if (!u || !e || !p) {
      return res
        .status(400)
        .json({ error: "Username, email, and password are required" });
    }
    if (u.length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters" });
    }
    if (p.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      return res.status(400).json({ error: "Invalid email address" });
    }
    if (u === "admin") {
      return res
        .status(400)
        .json({ error: "This username is reserved. Choose another." });
    }

    const password_hash = await bcrypt.hash(p, 10);
    const data = await store.createUser({
      username: u,
      email: e,
      full_name: name || u,
      password_hash,
      role: "user",
    });

    const token = issueToken(data);
    res.status(201).json({
      token,
      user: publicUser(data),
      message: "Registration successful",
    });
  } catch (err) {
    if (err.code === "23505" || /already registered|duplicate|unique/i.test(err.message)) {
      return res.status(409).json({ error: "Username or email already registered" });
    }
    console.error("POST /api/auth/register failed:", err);
    res.status(500).json({ error: "Registration failed", detail: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const u = String(username || "")
      .trim()
      .toLowerCase();
    const p = String(password || "");

    if (!u || !p) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const user = await store.findUserByUsername(u);
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const ok = await bcrypt.compare(p, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = issueToken(user);
    res.json({
      token,
      user: publicUser(user),
      role: user.role,
      username: user.username,
      message:
        user.role === "admin"
          ? "Admin session started"
          : "Logged in successfully",
    });
  } catch (err) {
    console.error("POST /api/auth/login failed:", err);
    res.status(500).json({ error: "Login failed", detail: err.message });
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({
    id: req.user.uid,
    username: req.user.sub,
    email: req.user.email || "",
    fullName: req.user.fullName || "",
    role: req.user.role,
  });
});

router.get("/users", requireAdmin, async (_req, res) => {
  try {
    const data = await store.listUsers();
    res.json(
      data.map((row) => ({
        id: row.id,
        username: row.username,
        email: row.email,
        fullName: row.full_name || "",
        role: row.role,
        createdAt: row.created_at,
      }))
    );
  } catch (err) {
    console.error("GET /api/auth/users failed:", err);
    res.status(500).json({ error: "Failed to list users", detail: err.message });
  }
});

module.exports = router;
