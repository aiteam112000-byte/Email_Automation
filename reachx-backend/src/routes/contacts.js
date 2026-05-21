const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { triggerWorkflows } = require("../lib/triggerWorkflows");

const router = express.Router();

// GET /api/contacts
router.get("/", requireAuth, async (req, res) => {
  const contacts = await prisma.contact.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(contacts);
});

// POST /api/contacts
router.post("/", requireAuth, async (req, res) => {
  const { email, name, phone, company, tags } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  const existing = await prisma.contact.findUnique({
    where: { email_userId: { email, userId: req.user.id } },
  });

  const contact = await prisma.contact.upsert({
    where: { email_userId: { email, userId: req.user.id } },
    update: { name, phone, company, tags },
    create: { email, name, phone, company, tags, userId: req.user.id },
  });

  if (!existing) {
    triggerWorkflows(req.user.id, "CONTACT_CREATED", email).catch(() => {});
  }

  if (tags) {
    const existingTags = existing?.tags ? existing.tags.split(",").map((t) => t.trim().toLowerCase()) : [];
    const newTags = tags.split(",").map((t) => t.trim()).filter((t) => t && !existingTags.includes(t.toLowerCase()));
    for (const tag of newTags) {
      triggerWorkflows(req.user.id, "TAG_ADDED", email, { tag }).catch(() => {});
    }
  }

  res.status(201).json(contact);
});

// DELETE /api/contacts
router.delete("/", requireAuth, async (req, res) => {
  const { id } = req.body;
  await prisma.contact.delete({ where: { id, userId: req.user.id } });
  res.json({ ok: true });
});

// POST /api/contacts/import
router.post("/import", requireAuth, async (req, res) => {
  const { contacts } = req.body;
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ error: "No contacts provided" });
  }

  let imported = 0;
  const newEmails = [];

  for (const c of contacts) {
    if (!c.email) continue;
    const existing = await prisma.contact.findUnique({
      where: { email_userId: { email: c.email, userId: req.user.id } },
    });
    await prisma.contact.upsert({
      where: { email_userId: { email: c.email, userId: req.user.id } },
      update: { name: c.name, phone: c.phone, company: c.company, tags: c.tags },
      create: { email: c.email, name: c.name ?? null, phone: c.phone ?? null, company: c.company ?? null, tags: c.tags ?? null, userId: req.user.id },
    });
    if (!existing) newEmails.push(c.email);
    imported++;
  }

  for (const email of newEmails) {
    triggerWorkflows(req.user.id, "CONTACT_CREATED", email).catch(() => {});
  }

  res.json({ imported });
});

// POST /api/contacts/bulk
router.post("/bulk", requireAuth, async (req, res) => {
  const { action, ids, tag } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "No contacts selected" });
  }

  const contacts = await prisma.contact.findMany({ where: { id: { in: ids }, userId: req.user.id } });
  if (contacts.length === 0) return res.status(404).json({ error: "No valid contacts" });

  if (action === "delete") {
    await prisma.contact.deleteMany({ where: { id: { in: ids }, userId: req.user.id } });
    return res.json({ affected: contacts.length });
  }

  if (action === "tag" && tag) {
    for (const contact of contacts) {
      const existing = contact.tags ? contact.tags.split(",").map((t) => t.trim()) : [];
      if (!existing.map((t) => t.toLowerCase()).includes(tag.toLowerCase())) {
        const merged = [...existing, tag].join(", ");
        await prisma.contact.update({ where: { id: contact.id }, data: { tags: merged } });
      }
    }
    return res.json({ affected: contacts.length });
  }

  if (action === "untag" && tag) {
    for (const contact of contacts) {
      if (!contact.tags) continue;
      const remaining = contact.tags.split(",").map((t) => t.trim()).filter((t) => t.toLowerCase() !== tag.toLowerCase()).join(", ");
      await prisma.contact.update({ where: { id: contact.id }, data: { tags: remaining || null } });
    }
    return res.json({ affected: contacts.length });
  }

  res.status(400).json({ error: "Invalid action" });
});

// GET /api/contacts/export
router.get("/export", requireAuth, async (req, res) => {
  const contacts = await prisma.contact.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
  });

  const header = "email,name,phone,company,tags,unsubscribed,createdAt";
  const rows = contacts.map((c) =>
    [c.email, c.name ?? "", c.phone ?? "", c.company ?? "", c.tags ?? "", c.unsubscribed ? "true" : "false", c.createdAt.toISOString()]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );

  const csv = [header, ...rows].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="contacts-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});

// GET /api/contacts/activity
router.get("/activity", requireAuth, async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: "Missing email" });

  const decodedEmail = decodeURIComponent(email);
  const contact = await prisma.contact.findFirst({ where: { email: decodedEmail, userId: req.user.id } });

  const emailEvents = await prisma.emailEvent.findMany({
    where: { recipient: { email: decodedEmail }, campaign: { userId: req.user.id } },
    include: { campaign: { select: { id: true, name: true, subject: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const enrollments = await prisma.workflowEnrollment.findMany({
    where: { contactEmail: decodedEmail, workflow: { userId: req.user.id } },
    include: { workflow: { select: { id: true, name: true } }, events: { orderBy: { createdAt: "desc" }, take: 5 } },
    orderBy: { enrolledAt: "desc" },
  });

  res.json({ contact, emailEvents, enrollments });
});

module.exports = router;
