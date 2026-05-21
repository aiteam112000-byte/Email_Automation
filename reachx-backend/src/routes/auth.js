const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { prisma } = require("../lib/prisma");
const { checkRateLimit } = require("../lib/rateLimit");

const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  const { allowed, remaining } = await checkRateLimit(`register:${ip}`);
  if (!allowed) {
    return res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
  }

  const { name, email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { name, email, password: hashed } });

  return res.status(201).json({ id: user.id, email: user.email });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const { allowed } = await checkRateLimit(`login:${email}`);
  if (!allowed) {
    return res.status(429).json({ error: "Too many login attempts. Try again in 15 minutes." });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.password) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
  return res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

module.exports = router;
