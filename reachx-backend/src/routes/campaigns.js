const express = require("express");
const dns = require("dns/promises");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { sendEmail } = require("../lib/smtp");
const { rewriteLinksForTracking } = require("../lib/rewriteLinks");
const { workflowQueue } = require("../lib/workflowQueue");
const { emailQueue } = require("../lib/queue");
const { getNextGmailTransporter } = require("../lib/gmail");

const router = express.Router();

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
  "yopmail.com", "sharklasers.com", "spam4.me", "trashmail.com", "dispostable.com",
]);

async function quickValidate(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "INVALID";
  const domain = email.split("@")[1].toLowerCase();
  if (DISPOSABLE_DOMAINS.has(domain)) return "INVALID";
  try {
    const records = await dns.resolveMx(domain);
    return records?.length ? "RISKY" : "INVALID";
  } catch {
    return "INVALID";
  }
}

// GET /api/campaigns
router.get("/", requireAuth, async (req, res) => {
  const campaigns = await prisma.campaign.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { recipients: true, events: true } } },
  });
  res.json(campaigns);
});

// POST /api/campaigns
router.post("/", requireAuth, async (req, res) => {
  const { name, subject, content, recipients } = req.body;
  if (!name || !subject || !content) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const campaign = await prisma.campaign.create({
    data: {
      name, subject, content,
      userId: req.user.id,
      recipients: {
        create: (recipients || []).map((email) => ({ email })),
      },
    },
  });
  res.status(201).json(campaign);
});

// GET /api/campaigns/:id
router.get("/:id", requireAuth, async (req, res) => {
  const campaign = await prisma.campaign.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: { recipients: true, events: { orderBy: { createdAt: "desc" } } },
  });
  if (!campaign) return res.status(404).json({ error: "Not found" });
  res.json(campaign);
});

// PATCH /api/campaigns/:id/edit
router.patch("/:id/edit", requireAuth, async (req, res) => {
  const { name, subject, content, fromName, replyTo } = req.body;
  const campaign = await prisma.campaign.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!campaign) return res.status(404).json({ error: "Not found" });

  const updated = await prisma.campaign.update({
    where: { id: req.params.id },
    data: {
      name, subject, content,
      ...(fromName !== undefined && { fromName: fromName || null }),
      ...(replyTo !== undefined && { replyTo: replyTo || null }),
    },
  });
  res.json(updated);
});

// POST /api/campaigns/:id/send
router.post("/:id/send", requireAuth, async (req, res) => {
  const campaign = await prisma.campaign.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: { recipients: true },
  });
  if (!campaign) return res.status(404).json({ error: "Not found" });
  if (campaign.status === "SENDING" || campaign.status === "SENT") {
    return res.status(400).json({ error: "Campaign already sent" });
  }

  await prisma.campaign.update({ where: { id: req.params.id }, data: { status: "SENDING" } });

  const appUrl = process.env.APP_URL ?? "http://localhost:4000";
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true, senderName: true, replyTo: true } });
  const resolvedFromName = campaign.fromName ?? user?.senderName ?? undefined;
  const resolvedReplyTo = campaign.replyTo ?? user?.replyTo ?? undefined;

  const unsubscribed = await prisma.contact.findMany({
    where: { userId: req.user.id, unsubscribed: true },
    select: { email: true },
  });
  const unsubscribedEmails = new Set(unsubscribed.map((c) => c.email.toLowerCase()));

  // Check if user has active Gmail accounts
  const gmailAccounts = await prisma.gmailAccount.findMany({
    where: { userId: req.user.id, isActive: true },
  });
  const useGmail = gmailAccounts.length > 0;

  let successCount = 0;
  let gmailRRIndex = 0;

  for (const recipient of campaign.recipients) {
    if (unsubscribedEmails.has(recipient.email.toLowerCase())) continue;
    if (recipient.status === "INVALID") continue;

    try {
      const unsub = await prisma.unsubscribeToken.create({
        data: { email: recipient.email, userId: req.user.id, campaignId: campaign.id },
      });
      const unsubLink = `${appUrl}/api/unsubscribe?token=${unsub.token}`;
      const unsubFooter = `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#94a3b8;">
        Don't want to receive these emails? <a href="${unsubLink}" style="color:#6366f1;">Unsubscribe</a>
      </div>`;
      const trackingPixel = `<img src="${appUrl}/api/track?rid=${recipient.id}&cid=${campaign.id}&type=open" width="1" height="1" style="display:none" />`;
      const htmlWithTracking = rewriteLinksForTracking(campaign.content, recipient.id, campaign.id, appUrl) + trackingPixel + unsubFooter;

      if (useGmail) {
        // Round-robin across active Gmail accounts
        const account = gmailAccounts[gmailRRIndex % gmailAccounts.length];
        gmailRRIndex++;
        const { getTransporterForAccount } = require("../lib/gmail");
        const transporter = await getTransporterForAccount(account);
        const fromName = resolvedFromName ?? account.email;
        await transporter.sendMail({
          from: `"${fromName}" <${account.email}>`,
          to: recipient.email,
          subject: campaign.subject,
          html: htmlWithTracking,
          replyTo: resolvedReplyTo || undefined,
          headers: { "X-ReachX-Recipient-Id": recipient.id, "X-ReachX-Campaign-Id": campaign.id },
        });
      } else {
        await sendEmail({
          to: recipient.email,
          subject: campaign.subject,
          htmlContent: htmlWithTracking,
          fromName: resolvedFromName,
          replyTo: resolvedReplyTo,
          headers: { "X-ReachX-Recipient-Id": recipient.id, "X-ReachX-Campaign-Id": campaign.id },
        });
      }

      await prisma.emailEvent.create({ data: { eventType: "SENT", campaignId: campaign.id, recipientId: recipient.id } });
      successCount++;
    } catch (err) {
      console.error(`Failed to send to ${recipient.email}:`, err);
      await prisma.emailEvent.create({
        data: { eventType: "BOUNCED", campaignId: campaign.id, recipientId: recipient.id, metadata: { error: String(err) } },
      });
    }
  }

  await prisma.campaign.update({ where: { id: req.params.id }, data: { status: "SENT" } });

  // Auto-enroll into follow-up workflow
  if (campaign.followUpWorkflowId) {
    const workflow = await prisma.workflow.findFirst({
      where: { id: campaign.followUpWorkflowId },
      include: { steps: { orderBy: { order: "asc" } } },
    });
    if (workflow && workflow.status === "ACTIVE" && (campaign.followUpTrigger ?? "all") === "all") {
      const firstStep = workflow.steps.find((s) => s.type === "TRIGGER") ?? workflow.steps[0];
      for (const recipient of campaign.recipients) {
        try {
          const enrollment = await prisma.workflowEnrollment.upsert({
            where: { workflowId_contactEmail: { workflowId: workflow.id, contactEmail: recipient.email } },
            create: { workflowId: workflow.id, contactEmail: recipient.email, currentStepId: firstStep?.id },
            update: workflow.allowReEnrollment ? { status: "ACTIVE", currentStepId: firstStep?.id } : {},
          });
          if (enrollment.status === "ACTIVE") {
            await workflowQueue.add("process-enrollment", { enrollmentId: enrollment.id, workflowId: workflow.id });
          }
        } catch { /* skip duplicates */ }
      }
    }
  }

  res.json({ sent: successCount, total: campaign.recipients.length });
});

// POST /api/campaigns/:id/recipients
router.post("/:id/recipients", requireAuth, async (req, res) => {
  const { emails } = req.body;
  const campaign = await prisma.campaign.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!campaign) return res.status(404).json({ error: "Not found" });

  const existing = await prisma.recipient.findMany({ where: { campaignId: req.params.id } });
  const existingEmails = new Set(existing.map((r) => r.email));
  const newEmails = (emails || []).filter((e) => !existingEmails.has(e));

  const withStatus = await Promise.all(
    newEmails.map(async (email) => ({ email, campaignId: req.params.id, status: await quickValidate(email) }))
  );

  await prisma.recipient.createMany({ data: withStatus });
  res.json({ added: newEmails.length });
});

// DELETE /api/campaigns/:id/recipients
router.delete("/:id/recipients", requireAuth, async (req, res) => {
  const { recipientId } = req.body;
  await prisma.emailEvent.deleteMany({ where: { recipientId } });
  await prisma.recipient.delete({ where: { id: recipientId, campaignId: req.params.id } });
  res.json({ ok: true });
});

// POST /api/campaigns/:id/schedule
router.post("/:id/schedule", requireAuth, async (req, res) => {
  const campaign = await prisma.campaign.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!campaign) return res.status(404).json({ error: "Not found" });
  if (campaign.status !== "DRAFT") return res.status(400).json({ error: "Only DRAFT campaigns can be scheduled" });

  const { scheduledAt } = req.body;
  const sendAt = new Date(scheduledAt);
  if (isNaN(sendAt.getTime()) || sendAt <= new Date()) {
    return res.status(400).json({ error: "scheduledAt must be a future date" });
  }

  const updated = await prisma.campaign.update({
    where: { id: req.params.id },
    data: { scheduledAt: sendAt, status: "SCHEDULED" },
  });
  res.json(updated);
});

// DELETE /api/campaigns/:id/schedule
router.delete("/:id/schedule", requireAuth, async (req, res) => {
  const campaign = await prisma.campaign.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!campaign) return res.status(404).json({ error: "Not found" });

  const updated = await prisma.campaign.update({
    where: { id: req.params.id },
    data: { scheduledAt: null, status: "DRAFT" },
  });
  res.json(updated);
});

// PATCH /api/campaigns/:id/followup
router.patch("/:id/followup", requireAuth, async (req, res) => {
  const campaign = await prisma.campaign.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!campaign) return res.status(404).json({ error: "Not found" });

  const { followUpWorkflowId, followUpTrigger } = req.body;
  const updated = await prisma.campaign.update({
    where: { id: req.params.id },
    data: { followUpWorkflowId: followUpWorkflowId ?? null, followUpTrigger: followUpTrigger ?? null },
  });
  res.json(updated);
});

// POST /api/campaigns/:id/duplicate
router.post("/:id/duplicate", requireAuth, async (req, res) => {
  const source = await prisma.campaign.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: { recipients: true },
  });
  if (!source) return res.status(404).json({ error: "Not found" });

  const copy = await prisma.campaign.create({
    data: {
      name: `${source.name} (copy)`,
      subject: source.subject,
      content: source.content,
      userId: req.user.id,
      recipients: { create: source.recipients.map((r) => ({ email: r.email })) },
    },
  });
  res.status(201).json(copy);
});

// DELETE /api/campaigns/:id/delete
router.delete("/:id/delete", requireAuth, async (req, res) => {
  const campaign = await prisma.campaign.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!campaign) return res.status(404).json({ error: "Not found" });

  try {
    const job = await emailQueue.getJob(`campaign-${req.params.id}`);
    if (job) await job.remove();
  } catch { /* Redis might be down */ }

  await prisma.emailEvent.deleteMany({ where: { campaignId: req.params.id } });
  await prisma.unsubscribeToken.deleteMany({ where: { campaignId: req.params.id } });
  await prisma.recipient.deleteMany({ where: { campaignId: req.params.id } });
  await prisma.campaign.delete({ where: { id: req.params.id } });

  res.json({ success: true });
});

module.exports = router;
