const express = require("express");
const { prisma } = require("../lib/prisma");
const { workflowQueue } = require("../lib/workflowQueue");
const { triggerWorkflows } = require("../lib/triggerWorkflows");

const router = express.Router();

// Google's IP ranges used by Gmail Image Proxy (66.102.x.x, 74.125.x.x, 66.249.x.x, 209.85.x.x)
function isGoogleIPRange(ip) {
  if (!ip) return false;
  const googlePrefixes = ["66.102.", "74.125.", "66.249.", "209.85.", "216.239.", "64.233.", "72.14.", "108.177.", "142.250.", "172.217.", "173.194."];
  return googlePrefixes.some((prefix) => ip.startsWith(prefix));
}

// GET /api/track
router.get("/", async (req, res) => {
  const { rid: recipientId, cid: campaignId, type, url, pid: pixelAssetId } = req.query;

  const ua = req.headers["user-agent"] ?? "";
  const ip = (req.headers["x-forwarded-for"]?.split(",")[0] ?? req.ip ?? "").trim();

  const isGoogleProxy = /Googlebot-Image|GoogleImageProxy|Google Image Proxy|GoogleBot|AdsBot-Google/i.test(ua)
    || isGoogleIPRange(ip);
  const isSuspiciousUA = ua === "" || /bot|crawler|spider|prefetch|preview|scan/i.test(ua);

  if (!isGoogleProxy && !isSuspiciousUA && recipientId && campaignId) {
    try {
      const eventType = type === "click" ? "CLICKED" : "OPENED";

      if (eventType === "OPENED") {
        const existing = await prisma.emailEvent.findFirst({
          where: { recipientId, campaignId, eventType: "OPENED" },
        });
        if (!existing) {
          await prisma.emailEvent.create({
            data: {
              eventType: "OPENED",
              campaignId,
              recipientId,
              metadata: pixelAssetId ? { pixelAssetId } : undefined,
            },
          });
          await triggerFollowUpWorkflow(campaignId, recipientId, "opened");
          const recipient = await prisma.recipient.findUnique({ where: { id: recipientId } });
          if (recipient) {
            const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { userId: true } });
            if (campaign) {
              triggerWorkflows(campaign.userId, "CAMPAIGN_OPENED", recipient.email, { campaignId }).catch(() => {});
            }
          }
        } else if (pixelAssetId && !existing.metadata?.pixelAssetId) {
          // Update existing open event with pixel asset info if not already set
          await prisma.emailEvent.update({
            where: { id: existing.id },
            data: { metadata: { ...(existing.metadata ?? {}), pixelAssetId } },
          });
        }
      } else if (eventType === "CLICKED") {
        await prisma.emailEvent.create({
          data: { eventType: "CLICKED", campaignId, recipientId, metadata: url ? { url: decodeURIComponent(url) } : undefined },
        });
        await triggerFollowUpWorkflow(campaignId, recipientId, "clicked");
        const recipient = await prisma.recipient.findUnique({ where: { id: recipientId } });
        if (recipient) {
          const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { userId: true } });
          if (campaign) {
            triggerWorkflows(campaign.userId, "CAMPAIGN_CLICKED", recipient.email, { campaignId }).catch(() => {});
          }
        }
      }
    } catch {
      // Never fail a tracking request
    }
  }

  if (type === "click" && url) {
    return res.redirect(decodeURIComponent(url));
  }

  const pixel = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
  res.setHeader("Content-Type", "image/gif");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.send(pixel);
});

async function triggerFollowUpWorkflow(campaignId, recipientId, event) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { followUpWorkflowId: true, followUpTrigger: true },
  });
  if (!campaign?.followUpWorkflowId) return;

  const trigger = campaign.followUpTrigger ?? "all";
  if (trigger !== event) return;

  const recipient = await prisma.recipient.findUnique({ where: { id: recipientId } });
  if (!recipient) return;

  const workflow = await prisma.workflow.findFirst({
    where: { id: campaign.followUpWorkflowId, status: "ACTIVE" },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  if (!workflow) return;

  const firstStep = workflow.steps.find((s) => s.type === "TRIGGER") ?? workflow.steps[0];

  const enrollment = await prisma.workflowEnrollment.upsert({
    where: { workflowId_contactEmail: { workflowId: workflow.id, contactEmail: recipient.email } },
    create: { workflowId: workflow.id, contactEmail: recipient.email, currentStepId: firstStep?.id },
    update: workflow.allowReEnrollment ? { status: "ACTIVE", currentStepId: firstStep?.id } : {},
  });

  if (enrollment.status === "ACTIVE") {
    await workflowQueue.add("process-enrollment", { enrollmentId: enrollment.id, workflowId: workflow.id });
  }
}

module.exports = router;
