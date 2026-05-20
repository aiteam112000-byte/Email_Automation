import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/smtp";
import { workflowQueue } from "@/lib/workflowQueue";
import { rewriteLinksForTracking } from "@/lib/rewriteLinks";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: session.user.id },
    include: { recipients: true },
  });

  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (campaign.status === "SENDING" || campaign.status === "SENT") {
    return NextResponse.json({ error: "Campaign already sent" }, { status: 400 });
  }

  await prisma.campaign.update({ where: { id }, data: { status: "SENDING" } });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  let successCount = 0;

  // Load user's sender profile for fallback
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true },
  });
  const userAny = user as unknown as Record<string, string | null>;
  const campaignAny = campaign as unknown as Record<string, string | null>;
  const resolvedFromName = campaignAny.fromName ?? userAny.senderName ?? undefined;
  const resolvedReplyTo  = campaignAny.replyTo  ?? userAny.replyTo   ?? undefined;

  // Get unsubscribed emails for this user to skip them
  const unsubscribed = await prisma.contact.findMany({
    where: { userId: session.user.id, unsubscribed: true },
    select: { email: true },
  });
  const unsubscribedEmails = new Set(unsubscribed.map((c) => c.email.toLowerCase()));

  for (const recipient of campaign.recipients) {
    // Skip unsubscribed contacts
    if (unsubscribedEmails.has(recipient.email.toLowerCase())) {
      continue;
    }
    // Skip recipients that failed format/MX validation
    if (recipient.status === "INVALID") {
      continue;
    }

    try {
      // Generate unsubscribe token for this recipient
      const unsub = await prisma.unsubscribeToken.create({
        data: { email: recipient.email, userId: session.user.id, campaignId: campaign.id },
      });
      const unsubLink = `${appUrl}/api/unsubscribe?token=${unsub.token}`;
      const unsubFooter = `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#94a3b8;">
        Don't want to receive these emails? <a href="${unsubLink}" style="color:#6366f1;">Unsubscribe</a>
      </div>`;

      const trackingPixel = `<img src="${appUrl}/api/track?rid=${recipient.id}&cid=${campaign.id}&type=open" width="1" height="1" style="display:none" />`;
      const htmlWithTracking = rewriteLinksForTracking(campaign.content, recipient.id, campaign.id, appUrl) + trackingPixel + unsubFooter;

      await sendEmail({
        to: recipient.email,
        subject: campaign.subject,
        htmlContent: htmlWithTracking,
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

      successCount++;
    } catch (err) {
      console.error(`Failed to send to ${recipient.email}:`, err);
      await prisma.emailEvent.create({
        data: {
          eventType: "BOUNCED", campaignId: campaign.id, recipientId: recipient.id,
          metadata: { error: String(err) },
        },
      });
    }
  }

  await prisma.campaign.update({ where: { id }, data: { status: "SENT" } });

  // ── Auto-enroll into follow-up workflow ──────────────────────────────────
  if (campaign.followUpWorkflowId) {
    const workflow = await prisma.workflow.findFirst({
      where: { id: campaign.followUpWorkflowId },
      include: { steps: { orderBy: { order: "asc" } } },
    });

    if (workflow && workflow.status === "ACTIVE") {
      const trigger = (campaign.followUpTrigger ?? "all") as string;
      const firstStep = workflow.steps.find((s) => s.type === "TRIGGER") ?? workflow.steps[0];

      // "opened" and "clicked" triggers are handled lazily via /api/track
      // when the actual event fires. Only enroll immediately for "all".
      if (trigger === "all") {
        for (const recipient of campaign.recipients) {
          try {
            const enrollment = await prisma.workflowEnrollment.upsert({
              where: { workflowId_contactEmail: { workflowId: workflow.id, contactEmail: recipient.email } },
              create: { workflowId: workflow.id, contactEmail: recipient.email, currentStepId: firstStep?.id },
              update: workflow.allowReEnrollment
                ? { status: "ACTIVE", currentStepId: firstStep?.id }
                : {},
            });
            if (enrollment.status === "ACTIVE") {
              await workflowQueue.add("process-enrollment", {
                enrollmentId: enrollment.id,
                workflowId: workflow.id,
              });
            }
          } catch {
            // Skip duplicate enrollments silently
          }
        }
      }
      // "opened" / "clicked" → enrollment happens in /api/track when the event fires
    }
  }

  return NextResponse.json({ sent: successCount, total: campaign.recipients.length });
}
