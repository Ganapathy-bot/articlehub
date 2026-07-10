const crypto = require("crypto");
const { jwtSecret, tokenTtlSeconds } = require("./config");

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromBase64url(str) {
  const pad = str + "=".repeat((4 - (str.length % 4)) % 4);
  return Buffer.from(pad.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
    "utf8"
  );
}

function sign(payload) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const sig = crypto
    .createHmac("sha256", jwtSecret)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${data}.${sig}`;
}

function verify(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const data = `${header}.${body}`;
  const expected = crypto
    .createHmac("sha256", jwtSecret)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(fromBase64url(body));
    if (!payload.exp || Date.now() / 1000 > payload.exp) return null;
    if (payload.role !== "admin" && payload.role !== "user") return null;
    return payload;
  } catch {
    return null;
  }
}

function issueToken(user) {
  const now = Math.floor(Date.now() / 1000);
  return sign({
    sub: user.username,
    uid: user.id,
    role: user.role,
    email: user.email,
    fullName: user.full_name || "",
    iat: now,
    exp: now + tokenTtlSeconds,
  });
}

function getBearerPayload(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return verify(token);
}

/** Any logged-in user (user or admin) */
function requireAuth(req, res, next) {
  const payload = getBearerPayload(req);
  if (!payload) {
    return res.status(401).json({ error: "Login required" });
  }
  req.user = payload;
  next();
}

/** Admin privileges only */
function requireAdmin(req, res, next) {
  const payload = getBearerPayload(req);
  if (!payload) {
    return res.status(401).json({ error: "Login required" });
  }
  if (payload.role !== "admin") {
    return res.status(403).json({ error: "Admin privileges required" });
  }
  req.user = payload;
  req.admin = payload;
  next();
}

module.exports = {
  issueToken,
  verify,
  requireAuth,
  requireAdmin,
  getBearerPayload,
};
