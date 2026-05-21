const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/segments
router.get("/", requireAuth, async (req, res) => {
  const segments = await prisma.segment.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(segments);
});

// POST /api/segments
router.post("/", requireAuth, async (req, res) => {
  const { name, filterType, filterValue, contacts } = req.body;
  if (!name || !filterType) {
    return res.status(400).json({ error: "name and filterType required" });
  }

  let finalFilterValue = filterValue ?? null;

  if (filterType === "manual") {
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: "contacts required for manual segments" });
    }

    const emails = new Set();
    for (const contact of contacts) {
      if (!contact.email) continue;
      const email = String(contact.email).trim().toLowerCase();
      if (!email) continue;
      emails.add(email);
      await prisma.contact.upsert({
        where: { email_userId: { email, userId: req.user.id } },
        create: { email, name: contact.name ?? null, phone: contact.phone ?? null, company: contact.company ?? null, tags: contact.tags ?? null, userId: req.user.id },
        update: { name: contact.name ?? undefined, phone: contact.phone ?? undefined, company: contact.company ?? undefined, tags: contact.tags ?? undefined },
      });
    }
    finalFilterValue = JSON.stringify(Array.from(emails));
  }

  const segment = await prisma.segment.create({
    data: { name, filterType, filterValue: finalFilterValue, userId: req.user.id },
  });
  res.status(201).json(segment);
});

// DELETE /api/segments
router.delete("/", requireAuth, async (req, res) => {
  const { id } = req.body;
  await prisma.segment.delete({ where: { id, userId: req.user.id } });
  res.json({ ok: true });
});

// GET /api/segments/:id/contacts
router.get("/:id/contacts", requireAuth, async (req, res) => {
  const segment = await prisma.segment.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!segment) return res.status(404).json({ error: "Not found" });

  let contacts = [];

  if (segment.filterType === "manual") {
    const emails = JSON.parse(segment.filterValue || "[]");
    contacts = await prisma.contact.findMany({ where: { email: { in: emails }, userId: req.user.id } });
  } else if (segment.filterType === "tag") {
    contacts = await prisma.contact.findMany({
      where: { userId: req.user.id, tags: { contains: segment.filterValue ?? "" } },
    });
  } else if (segment.filterType === "status") {
    const where = { userId: req.user.id };
    if (segment.filterValue === "unsubscribed") where.unsubscribed = true;
    else if (segment.filterValue === "bounced") where.bouncedAt = { not: null };
    contacts = await prisma.contact.findMany({ where });
  } else if (segment.filterType === "date") {
    const days = parseInt(segment.filterValue ?? "30");
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    contacts = await prisma.contact.findMany({ where: { userId: req.user.id, createdAt: { gte: since } } });
  }

  res.json({ count: contacts.length, contacts });
});

module.exports = router;
