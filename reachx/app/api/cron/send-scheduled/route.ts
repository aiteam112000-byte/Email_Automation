import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/smtp";
import { rewriteLinksForTracking } from "@/lib/rewriteLinks";
import { checkBounceMailbox } from "@/lib/bounce";

// Called by Railway cron every minute
// Secure with a shared secret so only Railway can trigger it
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  console.log(`[cron] Checking for scheduled campaigns at ${now.toISOString()}`);

  const bounceCount = await checkBounceMailbox();
  console.log(`[cron] Processed ${bounceCount} bounce message(s)`);

  // Find all SCHEDULED campaigns whose scheduledAt has passed
  const dueCampaigns = await prisma.campaign.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
    },
    include: { recipients: true },
  });

  console.log(`[cron] Found ${dueCampaigns.length} due campaign(s)`);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const results: Array<{ campaignId: string; sent: number; skipped: number; errors: number }> = [];

  for (const campaign of dueCampaigns) {
    console.log(`[cron] Processing campaign: ${campaign.id} "${campaign.name}"`);

    // Mark as SENDING immediately to prevent double-send
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "SENDING" },
    });

    // Load user's sender profile for fallback
    const user = await prisma.user.findUnique({
      where: { id: campaign.userId },
      select: { senderName: true, replyTo: true },
    });
    const campaignAny = campaign as unknown as Record<string, string | null>;
    const resolvedFromName = campaignAny.fromName ?? user?.senderName ?? undefined;
    const resolvedReplyTo  = campaignAny.replyTo  ?? user?.replyTo  ?? undefined;

    const unsubscribed = await prisma.contact.findMany({
      where: { userId: campaign.userId, unsubscribed: true },
      select: { email: true },
    });
    const unsubscribedEmails = new Set(unsubscribed.map((c) => c.email.toLowerCase()));

    let sent = 0, skipped = 0, errors = 0;

    for (const recipient of campaign.recipients) {
      if (unsubscribedEmails.has(recipient.email.toLowerCase())) {
        skipped++;
        console.log(`[cron] Skipping unsubscribed: ${recipient.email}`);
        continue;
      }
      if (recipient.status === "INVALID") {
        skipped++;
        console.log(`[cron] Skipping invalid recipient: ${recipient.email}`);
        continue;
      }

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
          headers: {
            "X-ReachX-Recipient-Id": recipient.id,
            "X-ReachX-Campaign-Id": campaign.id,
          },
        });

        await prisma.emailEvent.create({
          data: { eventType: "SENT", campaignId: campaign.id, recipientId: recipient.id },
        });

        sent++;
        console.log(`[cron] Sent to ${recipient.email}`);
      } catch (err) {
        errors++;
        console.error(`[cron] Failed to send to ${recipient.email}:`, err);
        await prisma.emailEvent.create({
          data: {
            eventType: "BOUNCED",
            campaignId: campaign.id,
            recipientId: recipient.id,
            metadata: { error: String(err) },
          },
        });
      }
    }

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "SENT" },
    });

    console.log(`[cron] Campaign ${campaign.id} done — sent: ${sent}, skipped: ${skipped}, errors: ${errors}`);
    results.push({ campaignId: campaign.id, sent, skipped, errors });
  }

  return NextResponse.json({ processed: dueCampaigns.length, results });
}

// Also support GET for easy manual testing
export async function GET(req: NextRequest) {
  return POST(req);
}
