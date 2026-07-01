const express = require("express");
const router = express.Router();

// Users with their own Apify tokens (token can be updated via UI)
const USERS = {
  smita:    { password: "smita123",    apifyToken: process.env.APIFY_API_TOKEN ?? "" },
  shubhra:  { password: "shubhra123",  apifyToken: process.env.APIFY_API_TOKEN ?? "" },
  vidhisha: { password: "vidhisha123", apifyToken: process.env.APIFY_API_TOKEN ?? "" },
};

// In-memory active tokens per user (reset on server restart)
const userTokens = {
  smita:    USERS.smita.apifyToken,
  shubhra:  USERS.shubhra.apifyToken,
  vidhisha: USERS.vidhisha.apifyToken,
};

// Simple session store (in-memory, keyed by a random token)
const sessions = {};

function generateSessionId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = USERS[username?.toLowerCase()];
  if (!user || user.password !== password)
    return res.status(401).json({ error: "Invalid username or password" });

  const sessionId = generateSessionId();
  sessions[sessionId] = { username: username.toLowerCase() };
  res.json({ sessionId, username: username.toLowerCase() });
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  const { sessionId } = req.body;
  delete sessions[sessionId];
  res.json({ ok: true });
});

// GET /api/auth/token  — returns the active Apify token for logged-in user
router.get("/token", (req, res) => {
  const sessionId = req.headers["x-session-id"];
  const session = sessions[sessionId];
  if (!session) return res.status(401).json({ error: "Not authenticated" });
  res.json({ apifyToken: userTokens[session.username] ?? "", username: session.username });
});

// POST /api/auth/set-token  — update Apify token for logged-in user
router.post("/set-token", (req, res) => {
  const sessionId = req.headers["x-session-id"];
  const session = sessions[sessionId];
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const { apifyToken } = req.body;
  if (!apifyToken?.trim()) return res.status(400).json({ error: "Token is required" });

  userTokens[session.username] = apifyToken.trim();
  res.json({ ok: true, username: session.username });
});

// Internal helper — get token for a session (used by validate route)
function getTokenForSession(sessionId) {
  const session = sessions[sessionId];
  if (!session) return null;
  return userTokens[session.username] ?? null;
}

module.exports = { router, getTokenForSession };
