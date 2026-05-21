const express = require("express");
const { prisma } = require("../lib/prisma");

const router = express.Router();

const EVENT_MAP = {
  delivered: "SENT",
  hard_bounce: "BOUNCED",
  soft_bounce: "BOUNCED",
  spam: "SPAM",
  opened: "OPENED",
  click: "CLICKED",
  unsubscribed: "UNSUBSCRIBED",
};

// POST /api/webhooks/brevo
router.post("/brevo", async (req, res) => {
  const body = req.body;
  const event = body.event;
  const email = body.email;
  const messageId = body["message-id"];
  const link = body.link;

  const eventType = EVENT_MAP[event];
  if (!eventType || !email) return res.json({ ok: true });

  const recipient = await prisma.recipient.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  });

  if (recipient) {
    if (eventType === "OPENED") {
      const existing = await prisma.emailEvent.findFirst({
        where: { recipientId: recipient.id, campaignId: recipient.campaignId, eventType: "OPENED" },
      });
      if (existing) return res.json({ ok: true });
    }

    await prisma.emailEvent.create({
      data: { eventType, campaignId: recipient.campaignId, recipientId: recipient.id, metadata: { messageId, ...(link ? { url: link } : {}) } },
    });

    if (eventType === "UNSUBSCRIBED" || eventType === "SPAM") {
      const campaign = await prisma.campaign.findUnique({ where: { id: recipient.campaignId }, select: { userId: true } });
      if (campaign) {
        await prisma.contact.updateMany({
          where: { email, userId: campaign.userId },
          data: { unsubscribed: true, ...(eventType === "SPAM" ? { spamAt: new Date() } : {}) },
        });
        const enrollments = await prisma.workflowEnrollment.findMany({
          where: { contactEmail: email, status: "ACTIVE" },
          include: { workflow: { select: { exitOnUnsubscribe: true } } },
        });
        for (const e of enrollments) {
          if (e.workflow.exitOnUnsubscribe) {
            await prisma.workflowEnrollment.update({ where: { id: e.id }, data: { status: "PAUSED" } });
          }
        }
      }
    }

    if (eventType === "BOUNCED") {
      const campaign = await prisma.campaign.findUnique({ where: { id: recipient.campaignId }, select: { userId: true } });
      if (campaign) {
        await prisma.contact.updateMany({ where: { email, userId: campaign.userId }, data: { bouncedAt: new Date() } });
      }
    }
  }

  res.json({ ok: true });
});

module.exports = router;
