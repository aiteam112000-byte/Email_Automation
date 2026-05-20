import "dotenv/config";
import { Worker } from "bullmq";
import { connection } from "../lib/queue";
import { sendEmail } from "../lib/smtp";
import { prisma } from "../lib/prisma";
import { rewriteLinksForTracking } from "../lib/rewriteLinks";

export const emailWorker = new Worker(
  "email-send",
  async (job) => {
    // ── Scheduled campaign send ──────────────────────────────────────────
    if (job.name === "send-campaign") {
      const { campaignId } = job.data;
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { recipients: true },
      });
      if (!campaign || campaign.status !== "SCHEDULED") return;

      await prisma.campaign.update({ where: { id: campaignId }, data: { status: "SENDING" } });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

      // Load user's sender profile for fallback
      const user = await prisma.user.findUnique({
        where: { id: campaign.userId },
        select: { name: true },
      });
      const userAny = user as unknown as Record<string, string | null>;
      const campaignAny = campaign as unknown as Record<string, string | null>;
      const resolvedFromName = campaignAny.fromName ?? userAny.senderName ?? undefined;
      const resolvedReplyTo  = campaignAny.replyTo  ?? userAny.replyTo   ?? undefined;

      const unsubscribed = await prisma.contact.findMany({
        where: { userId: campaign.userId, unsubscribed: true },
        select: { email: true },
      });
      const unsubscribedEmails = new Set(unsubscribed.map((c) => c.email.toLowerCase()));

      let successCount = 0;
      for (const recipient of campaign.recipients) {
        if (unsubscribedEmails.has(recipient.email.toLowerCase())) continue;
        if (recipient.status === "INVALID") continue;
        try {
          const unsub = await prisma.unsubscribeToken.create({
            data: { email: recipient.email, userId: campaign.userId, campaignId },
          });
          const unsubLink = `${appUrl}/api/unsubscribe?token=${unsub.token}`;
          const unsubFooter = `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#94a3b8;">
            Don't want these emails? <a href="${unsubLink}" style="color:#6366f1;">Unsubscribe</a>
          </div>`;
          const trackingPixel = `<img src="${appUrl}/api/track?rid=${recipient.id}&cid=${campaignId}&type=open" width="1" height="1" style="display:none" />`;

          await sendEmail({
            to: recipient.email,
            subject: campaign.subject,
            htmlContent: rewriteLinksForTracking(campaign.content, recipient.id, campaignId, appUrl) + trackingPixel + unsubFooter,
            fromName: resolvedFromName,
            replyTo: resolvedReplyTo,
            headers: {
              "X-ReachX-Recipient-Id": recipient.id,
              "X-ReachX-Campaign-Id": campaignId,
            },
          });
          await prisma.emailEvent.create({
            data: { eventType: "SENT", campaignId, recipientId: recipient.id },
          });
          successCount++;
        } catch (err) {
          console.error(`Scheduled send failed for ${recipient.email}:`, err);
          await prisma.emailEvent.create({
            data: { eventType: "BOUNCED", campaignId, recipientId: recipient.id, metadata: { error: String(err) } },
          });
        }
      }

      await prisma.campaign.update({ where: { id: campaignId }, data: { status: "SENT" } });
      console.log(`Scheduled campaign ${campaignId} sent to ${successCount} recipients`);
      return;
    }

    // ── Individual email send ────────────────────────────────────────────
    const { recipientId, campaignId, to, subject, htmlContent } = job.data;
    await sendEmail({
      to,
      subject,
      htmlContent,
      headers: {
        "X-ReachX-Recipient-Id": recipientId,
        "X-ReachX-Campaign-Id": campaignId,
      },
    });
    await prisma.emailEvent.create({
      data: { eventType: "SENT", campaignId, recipientId },
    });
  },
  { connection, concurrency: 5 }
);

emailWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});
