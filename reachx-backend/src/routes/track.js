const express = require("express");
const { prisma } = require("../lib/prisma");
const { workflowQueue } = require("../lib/workflowQueue");
const { triggerWorkflows } = require("../lib/triggerWorkflows");

const router = express.Router();

// ── Bot / scanner detection ──────────────────────────────────────────────────

// User-agent patterns that indicate automated requests (not real humans)
const BOT_UA_RE = /Googlebot-Image|GoogleImageProxy|Google-Safety|AdsBot-Google|bingbot|msnbot|Outlook-iOS|Outlook-Android|MailScanner|SpamAssassin|Barracuda|Proofpoint|Mimecast|IronPort|Sophos|Symantec|MessageLabs|AppRiver|Postmaster|mail\.ru|Mail\.RU_Bot|preview|prefetch|scan|crawler|spider|bot\b/i;

// Known Google and Microsoft datacenter CIDR prefixes (expand as needed)
// We convert them to prefix-match strings for simplicity (exact IP block checks
// would require an IP library; string prefix matching covers the majority).
const SCANNER_IP_PREFIXES = [
  // Google
  "66.249.", "64.233.", "72.14.", "74.125.", "209.85.", "216.58.", "216.239.", "108.177.", "142.250.", "172.217.",
  // Microsoft / Outlook
  "40.92.", "40.93.", "40.94.", "40.95.", "52.100.", "52.101.", "52.102.", "52.103.",
];

function isScannerIp(ip) {
  if (!ip) return false;
  // Handle IPv4-mapped IPv6 (::ffff:x.x.x.x)
  const v4 = ip.replace(/^::ffff:/i, "");
  return SCANNER_IP_PREFIXES.some((prefix) => v4.startsWith(prefix));
}

// Timing threshold: requests that arrive within this many ms of the campaign
// being sent are almost certainly automated scanner prefetches, not human opens.
const SCANNER_TIMING_MS = 8_000; // 8 seconds

function isTooFast(campaign) {
  if (!campaign) return false;
  // Use updatedAt as a proxy for "sent at" (status flips to SENT on update)
  const sentAt = campaign.updatedAt ?? campaign.createdAt;
  return (Date.now() - new Date(sentAt).getTime()) < SCANNER_TIMING_MS;
}

// GET /api/track
router.get("/", async (req, res) => {
  const { rid: recipientId, cid: campaignId, type, url, pid: pixelAssetId } = req.query;

  const ua = req.headers["user-agent"] ?? "";
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "";

  const isBot = BOT_UA_RE.test(ua) || isScannerIp(ip);

  if (!isBot && recipientId && campaignId) {
    try {
      const eventType = type === "click" ? "CLICKED" : "OPENED";

      if (eventType === "OPENED") {
        const existing = await prisma.emailEvent.findFirst({
          where: { recipientId, campaignId, eventType: "OPENED" },
        });
        if (!existing) {
          // Timing check: skip if request arrives suspiciously fast after send
          const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            select: { updatedAt: true, createdAt: true, status: true },
          });
          if (isTooFast(campaign)) {
            // Likely a scanner prefetch — serve the pixel but don't record the open
          } else {
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
              const fullCampaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { userId: true } });
              if (fullCampaign) {
                triggerWorkflows(fullCampaign.userId, "CAMPAIGN_OPENED", recipient.email, { campaignId }).catch(() => {});
              }
            }
          }
        } else if (pixelAssetId && !existing.metadata?.pixelAssetId) {
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
