const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/pixels
router.get("/", requireAuth, async (req, res) => {
  const assets = await prisma.pixelAsset.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(assets);
});

// POST /api/pixels
router.post("/", requireAuth, async (req, res) => {
  const { name, type, imageUrl } = req.body;
  if (!name || !type) return res.status(400).json({ error: "name and type are required" });
  if (!["pixel", "image"].includes(type)) return res.status(400).json({ error: "type must be pixel or image" });

  const asset = await prisma.pixelAsset.create({
    data: { name, type, imageUrl: imageUrl ?? null, userId: req.user.id },
  });
  res.status(201).json(asset);
});

// PATCH /api/pixels/:id
router.patch("/:id", requireAuth, async (req, res) => {
  const asset = await prisma.pixelAsset.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!asset) return res.status(404).json({ error: "Not found" });

  const { name, imageUrl } = req.body;
  const updated = await prisma.pixelAsset.update({
    where: { id: req.params.id },
    data: { ...(name !== undefined && { name }), ...(imageUrl !== undefined && { imageUrl }) },
  });
  res.json(updated);
});

// DELETE /api/pixels/:id
router.delete("/:id", requireAuth, async (req, res) => {
  const asset = await prisma.pixelAsset.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!asset) return res.status(404).json({ error: "Not found" });

  await prisma.pixelAsset.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

module.exports = router;
