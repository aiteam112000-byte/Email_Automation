const express = require("express");
const { prisma } = require("../lib/prisma");
const { workflowQueue } = require("../lib/workflowQueue");
const { triggerWorkflows } = require("../lib/triggerWorkflows");

const router = express.Router();

// GET /api/track
router.get("/", async (req, res) => {
  const { rid: recipientId, cid: campaignId, type, url, pid: pixelAssetId } = req.query;

  // Only filter known Google bot/proxy user agents — not IPs (Gmail proxies real opens too)
  const ua = req.headers["user-agent"] ?? "";
  const isBot = /Googlebot-Image|GoogleImageProxy|AdsBot-Google|bingbot|crawler|spider/i.test(ua);

  if (!isBot && recipientId && campaignId) {
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
        // Deduplicate: only count one click per recipient per campaign, regardless of how many links they click
        const clickUrl = url ? decodeURIComponent(url) : null;
        const existingClick = await prisma.emailEvent.findFirst({
          where: {
            recipientId,
            campaignId,
            eventType: "CLICKED",
          },
        });
        if (!existingClick) {
          await prisma.emailEvent.create({
            data: { eventType: "CLICKED", campaignId, recipientId, metadata: clickUrl ? { url: clickUrl } : undefined },
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
      }
    } catch {
      // Never fail a tracking request
    }
  }

  if (type === "click" && url) {
    // Decode the provided url param and defensively unwrap nested tracking
    // redirects (where the tracked 'url' itself contains another /api/track
    // with its own url=...). Then ensure a scheme (default to https).
    try {
      let target = decodeURIComponent(url || "");

      // Try to unwrap up to a few nested tracking layers.
      for (let i = 0; i < 5; i++) {
        try {
          const parsed = new URL(target);
          const nested = parsed.searchParams.get("url");
          if (nested && /\/api\/track/i.test(parsed.pathname)) {
            target = decodeURIComponent(nested);
            continue;
          }
          break;
        } catch (e) {
          // target is not an absolute URL; check for inline /api/track?query-style strings
          const apiIdx = target.indexOf("/api/track?");
          if (apiIdx !== -1) {
            const qs = target.slice(apiIdx + "/api/track?".length);
            const params = new URLSearchParams(qs);
            const nested = params.get("url");
            if (nested) {
              target = decodeURIComponent(nested);
              continue;
            }
          }
          break;
        }
      }

      // Strip leading slashes and default to https if no scheme provided
      target = target.replace(/^\s+|\s+$/g, "");
      if (!/^https?:\/\//i.test(target) && target) {
        target = `https://${target.replace(/^\/+/, "")}`;
      }

      return res.redirect(target);
    } catch (e) {
      return res.redirect("/");
    }
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
