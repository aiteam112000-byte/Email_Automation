const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { getAuthUrl, exchangeCodeForTokens } = require("../lib/gmail");

const router = express.Router();

// GET /api/gmail/auth-url?clientId=...&clientSecret=...
// Returns the Google OAuth URLcalled with Bearer token from frontend
router.get("/auth-url", requireAuth, (req, res) => {
  const clientId = req.query.clientId || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = req.query.clientSecret || process.env.GOOGLE_CLIENT_SECRET;

  const state = Buffer.from(
    JSON.stringify({ userId: req.user.id, clientId, clientSecret })
  ).toString("base64url");

  const url = getAuthUrl(clientId, clientSecret) + `&state=${state}`;
  res.json({ url });
});

// GET /api/gmail/callbackGoogle redirects here after user authorizes
router.get("/callback", async (req, res) => {
  const { code, state, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";

  if (error || !code || !state) {
    return res.redirect(`${frontendUrl}/dashboard/settings?gmail=error`);
  }

  try {
    const { userId, clientId, clientSecret } = JSON.parse(
      Buffer.from(state, "base64url").toString()
    );

    const { email, tokens } = await exchangeCodeForTokens(code, clientId, clientSecret);

    await prisma.gmailAccount.upsert({
      where: { userId_email: { userId, email } },
      create: {
        userId,
        email,
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token ?? null,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        clientId: clientId ?? null,
        clientSecret: clientSecret ?? null,
        isActive: true,
      },
      update: {
        refreshToken: tokens.refresh_token ?? undefined,
        accessToken: tokens.access_token ?? null,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        clientId: clientId ?? null,
        clientSecret: clientSecret ?? null,
        isActive: true,
      },
    });

    res.redirect(`${frontendUrl}/dashboard/settings?gmail=connected`);
  } catch (err) {
    console.error("[gmail callback]", err);
    res.redirect(`${frontendUrl}/dashboard/settings?gmail=error`);
  }
});

// GET /api/gmail/accounts
router.get("/accounts", requireAuth, async (req, res) => {
  const accounts = await prisma.gmailAccount.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, isActive: true, createdAt: true },
  });
  res.json(accounts);
});

// PATCH /api/gmail/accounts/:idtoggle active
router.patch("/accounts/:id", requireAuth, async (req, res) => {
  const account = await prisma.gmailAccount.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!account) return res.status(404).json({ error: "Not found" });

  const updated = await prisma.gmailAccount.update({
    where: { id: req.params.id },
    data: { isActive: req.body.isActive ?? !account.isActive },
    select: { id: true, email: true, isActive: true },
  });
  res.json(updated);
});

// DELETE /api/gmail/accounts/:iddisconnect
router.delete("/accounts/:id", requireAuth, async (req, res) => {
  const account = await prisma.gmailAccount.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!account) return res.status(404).json({ error: "Not found" });

  await prisma.gmailAccount.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

module.exports = router;
