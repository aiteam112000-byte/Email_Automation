const express = require("express");
const { prisma } = require("../lib/prisma");
const { sendEmail } = require("../lib/smtp");
const { rewriteLinksForTracking } = require("../lib/rewriteLinks");
const { checkBounceMailbox } = require("../lib/bounce");

const router = express.Router();

// POST /api/cron/send-scheduled
router.post("/send-scheduled", async (req, res) => {
  const secret = req.headers["x-cron-secret"];
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const now = new Date();
  const bounceCount = await checkBounceMailbox();

  const dueCampaigns = await prisma.campaign.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: now } },
    include: { recipients: true },
  });

  const appUrl = process.env.APP_URL ?? "http://localhost:4000";
  const results = [];

  for (const campaign of dueCampaigns) {
    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: "SENDING" } });

    const user = await prisma.user.findUnique({ where: { id: campaign.userId }, select: { senderName: true, replyTo: true } });
    const resolvedFromName = campaign.fromName ?? user?.senderName ?? undefined;
    const resolvedReplyTo = campaign.replyTo ?? user?.replyTo ?? undefined;

    const unsubscribed = await prisma.contact.findMany({
      where: { userId: campaign.userId, unsubscribed: true },
      select: { email: true },
    });
    const unsubscribedEmails = new Set(unsubscribed.map((c) => c.email.toLowerCase()));

    let sent = 0, skipped = 0, errors = 0;

    for (const recipient of campaign.recipients) {
      if (unsubscribedEmails.has(recipient.email.toLowerCase())) { skipped++; continue; }
      if (recipient.status === "INVALID") { skipped++; continue; }

      try {
        const unsub = await prisma.unsubscribeToken.create({
          data: { email: recipient.email, userId: campaign.userId, campaignId: campaign.id },
        });
        const unsubLink = `${appUrl}/api/unsubscribe?token=${unsub.token}`;
        const unsubFooter = `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#94a3b8;">
          Don't want these emails? <a href="${unsubLink}" style="color:#6366f1;">Unsubscribe</a>
        </div>`;
        const trackingPixel = `<img src="${appUrl}/api/track?rid=${recipient.id}&cid=${campaign.id}&type=open" width="1" height="1" style="display:none" />`;

        await sendEmail({
          to: recipient.email,
          subject: campaign.subject,
          htmlContent: rewriteLinksForTracking(campaign.content, recipient.id, campaign.id, appUrl) + trackingPixel + unsubFooter,
          fromName: resolvedFromName,
          replyTo: resolvedReplyTo,
          headers: { "X-ReachX-Recipient-Id": recipient.id, "X-ReachX-Campaign-Id": campaign.id },
        });

        await prisma.emailEvent.create({ data: { eventType: "SENT", campaignId: campaign.id, recipientId: recipient.id } });
        sent++;
      } catch (err) {
        errors++;
        await prisma.emailEvent.create({
          data: { eventType: "BOUNCED", campaignId: campaign.id, recipientId: recipient.id, metadata: { error: String(err) } },
        });
      }
    }

    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: "SENT" } });
    results.push({ campaignId: campaign.id, sent, skipped, errors });
  }

  res.json({ processed: dueCampaigns.length, bounceCount, results });
});

module.exports = router;
