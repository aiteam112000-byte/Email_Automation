const express = require("express");
const path = require("path");
const multer = require("multer");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, "../../uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

// POST /api/pixels/upload — upload an image file, returns its URL
router.post("/upload", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const appUrl = process.env.APP_URL ?? "http://localhost:4000";
  const url = `${appUrl}/uploads/${req.file.filename}`;
  res.json({ url });
});

// GET /api/pixels
router.get("/", requireAuth, async (req, res) => {
  const appUrl = process.env.APP_URL ?? "http://localhost:4000";
  const assets = await prisma.pixelAsset.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
  });
  // Inject trackUrl for pixel type assets so frontend shows the correct public URL
  const enriched = assets.map((a) => ({
    ...a,
    trackUrl: a.type === "pixel" ? `${appUrl}/api/track?pid=${a.id}&type=open` : null,
  }));
  res.json(enriched);
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

// GET /api/pixels/:id/stats — who opened emails containing this pixel
router.get("/:id/stats", requireAuth, async (req, res) => {
  const asset = await prisma.pixelAsset.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!asset) return res.status(404).json({ error: "Not found" });

  // Find all OPENED events that reference this pixel asset in metadata
  const events = await prisma.emailEvent.findMany({
    where: {
      eventType: "OPENED",
      metadata: { path: ["pixelAssetId"], equals: req.params.id },
    },
    include: {
      recipient: { select: { email: true } },
      campaign: { select: { name: true, id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    pixelAssetId: req.params.id,
    name: asset.name,
    totalOpens: events.length,
    opens: events.map((e) => ({
      recipientEmail: e.recipient.email,
      campaignName: e.campaign.name,
      campaignId: e.campaign.id,
      openedAt: e.createdAt,
    })),
  });
});

module.exports = router;
