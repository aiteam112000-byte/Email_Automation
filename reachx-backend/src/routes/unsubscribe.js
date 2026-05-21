const express = require("express");
const { prisma } = require("../lib/prisma");

const router = express.Router();

// GET /api/unsubscribe
router.get("/", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "Missing token" });

  const record = await prisma.unsubscribeToken.findUnique({ where: { token } });
  if (!record) return res.status(404).json({ error: "Invalid token" });

  await prisma.contact.updateMany({
    where: { email: record.email, userId: record.userId },
    data: { unsubscribed: true },
  });

  if (record.campaignId) {
    const recipient = await prisma.recipient.findFirst({
      where: { email: record.email, campaignId: record.campaignId },
    });
    if (recipient) {
      await prisma.emailEvent.create({
        data: { eventType: "UNSUBSCRIBED", campaignId: record.campaignId, recipientId: recipient.id },
      });
    }
  }

  const enrollments = await prisma.workflowEnrollment.findMany({
    where: { contactEmail: record.email, status: "ACTIVE" },
    include: { workflow: { select: { exitOnUnsubscribe: true } } },
  });
  for (const e of enrollments) {
    if (e.workflow.exitOnUnsubscribe) {
      await prisma.workflowEnrollment.update({ where: { id: e.id }, data: { status: "PAUSED" } });
    }
  }

  await prisma.unsubscribeToken.update({ where: { token }, data: { usedAt: new Date() } });

  const appUrl = process.env.APP_URL ?? "http://localhost:4000";
  res.redirect(`${process.env.FRONTEND_URL ?? "http://localhost:3000"}/unsubscribed`);
});

module.exports = router;
