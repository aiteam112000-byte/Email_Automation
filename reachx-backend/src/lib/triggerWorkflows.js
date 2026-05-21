const { prisma } = require("./prisma");
const { workflowQueue } = require("./workflowQueue");

async function triggerWorkflows(userId, triggerType, contactEmail, meta) {
  const workflows = await prisma.workflow.findMany({
    where: { userId, status: "ACTIVE", triggerType, archived: false },
    include: { steps: { orderBy: { order: "asc" } } },
  });

  for (const wf of workflows) {
    const cfg = wf.triggerConfig ?? {};

    if (triggerType === "TAG_ADDED" && cfg.tag && meta?.tag) {
      if (cfg.tag.toLowerCase() !== meta.tag.toLowerCase()) continue;
    }

    if ((triggerType === "CAMPAIGN_OPENED" || triggerType === "CAMPAIGN_CLICKED") && cfg.campaignId && meta?.campaignId) {
      if (cfg.campaignId !== meta.campaignId) continue;
    }

    const firstStep = wf.steps.find((s) => s.type === "TRIGGER") ?? wf.steps[0];
    if (!firstStep) continue;

    try {
      const enrollment = await prisma.workflowEnrollment.upsert({
        where: { workflowId_contactEmail: { workflowId: wf.id, contactEmail } },
        create: { workflowId: wf.id, contactEmail, currentStepId: firstStep.id },
        update: wf.allowReEnrollment ? { status: "ACTIVE", currentStepId: firstStep.id } : {},
      });

      if (enrollment.status === "ACTIVE") {
        await workflowQueue.add("process-enrollment", { enrollmentId: enrollment.id, workflowId: wf.id });
      }
    } catch {
      // Ignore duplicate enrollment conflicts
    }
  }
}

module.exports = { triggerWorkflows };
