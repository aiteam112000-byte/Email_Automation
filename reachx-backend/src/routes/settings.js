const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/settings
router.get("/", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { name: true, email: true, senderName: true, replyTo: true },
  });
  res.json(user);
});

// PATCH /api/settings
router.patch("/", requireAuth, async (req, res) => {
  const { name, senderName, replyTo } = req.body;
  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(name !== undefined && { name: name || null }),
      ...(senderName !== undefined && { senderName: senderName || null }),
      ...(replyTo !== undefined && { replyTo: replyTo || null }),
    },
    select: { name: true, email: true, senderName: true, replyTo: true },
  });
  res.json(updated);
});

module.exports = router;
