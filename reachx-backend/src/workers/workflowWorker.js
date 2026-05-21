require("dotenv/config");
const { Worker, Queue } = require("bullmq");
const { connection } = require("../lib/queue");
const { prisma } = require("../lib/prisma");
const { sendEmail } = require("../lib/smtp");
const { triggerWorkflows } = require("../lib/triggerWorkflows");

const workflowQueue = new Queue("workflow-process", { connection });

function getNextStep(steps, currentId, branch) {
  return steps.find((s) => s.parentId === currentId && s.branch === branch) ?? null;
}

async function evaluateCondition(cfg, email) {
  const { field, operator, value = "" } = cfg;

  if (field === "tag") {
    const contact = await prisma.contact.findFirst({ where: { email } });
    if (!contact?.tags) return operator === "excludes";
    const tags = contact.tags.split(",").map((t) => t.trim().toLowerCase());
    if (operator === "includes") return tags.includes(value.toLowerCase());
    if (operator === "excludes") return !tags.includes(value.toLowerCase());
  }

  if (field === "email") {
    if (operator === "includes") return email.toLowerCase().includes(value.toLowerCase());
    if (operator === "excludes") return !email.toLowerCase().includes(value.toLowerCase());
  }

  return false;
}

const workflowWorker = new Worker(
  "workflow-process",
  async (job) => {
    const { enrollmentId } = job.data;

    const enrollment = await prisma.workflowEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { workflow: { include: { steps: { orderBy: { order: "asc" } } } } },
    });

    if (!enrollment || enrollment.status !== "ACTIVE") return;

    const steps = enrollment.workflow.steps;
    const currentStep = steps.find((s) => s.id === enrollment.currentStepId);
    if (!currentStep) {
      await prisma.workflowEnrollment.update({ where: { id: enrollmentId }, data: { status: "COMPLETED" } });
      return;
    }

    const cfg = currentStep.config ?? {};

    switch (currentStep.type) {
      case "SEND_EMAIL": {
        const subject = cfg.subject ?? "(no subject)";
        const htmlContent = cfg.htmlContent ?? "";
        const contact = await prisma.contact.findFirst({
          where: { email: enrollment.contactEmail, userId: enrollment.workflow.userId },
        });
        const vars = {
          email: enrollment.contactEmail,
          name: contact?.name ?? enrollment.contactEmail.split("@")[0],
          company: contact?.company ?? "",
          phone: contact?.phone ?? "",
        };
        const interpolate = (s) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");

        await sendEmail({ to: enrollment.contactEmail, subject: interpolate(subject), htmlContent: interpolate(htmlContent) });
        await prisma.workflowEnrollmentEvent.create({ data: { enrollmentId, stepId: currentStep.id, eventType: "EMAIL_SENT" } });
        break;
      }

      case "WAIT": {
        const amount = cfg.delayMinutes ?? 60;
        const unit = cfg.unit ?? "minutes";
        const multiplier = unit === "days" ? 24 * 60 * 60 * 1000 : unit === "hours" ? 60 * 60 * 1000 : 60 * 1000;
        const delayMs = amount * multiplier;
        const nextStep = getNextStep(steps, currentStep.id, null);
        if (nextStep) {
          await prisma.workflowEnrollment.update({ where: { id: enrollmentId }, data: { currentStepId: nextStep.id } });
          await workflowQueue.add("process-enrollment", { enrollmentId, workflowId: enrollment.workflowId }, { delay: delayMs });
        }
        return;
      }

      case "IF_CONDITION": {
        const conditionMet = await evaluateCondition(cfg, enrollment.contactEmail);
        const branch = conditionMet ? "yes" : "no";
        const nextStep = getNextStep(steps, currentStep.id, branch);
        if (nextStep) {
          await prisma.workflowEnrollment.update({ where: { id: enrollmentId }, data: { currentStepId: nextStep.id } });
          await workflowQueue.add("process-enrollment", { enrollmentId, workflowId: enrollment.workflowId });
        }
        return;
      }

      case "UPDATE_TAG": {
        const tags = cfg.tags ?? [];
        const contact = await prisma.contact.findFirst({
          where: { email: enrollment.contactEmail, userId: enrollment.workflow.userId },
        });
        if (contact) {
          const existing = contact.tags ? contact.tags.split(",").map((t) => t.trim()) : [];
          const newTags = tags.filter((t) => !existing.map((e) => e.toLowerCase()).includes(t.toLowerCase()));
          const merged = Array.from(new Set([...existing, ...tags])).join(", ");
          await prisma.contact.update({ where: { id: contact.id }, data: { tags: merged } });
          for (const tag of newTags) {
            triggerWorkflows(enrollment.workflow.userId, "TAG_ADDED", enrollment.contactEmail, { tag }).catch(() => {});
          }
        }
        await prisma.workflowEnrollmentEvent.create({ data: { enrollmentId, stepId: currentStep.id, eventType: "TAG_UPDATED", metadata: { tags } } });
        break;
      }

      case "REMOVE_TAG": {
        const tagsToRemove = (cfg.tags ?? []).map((t) => t.toLowerCase());
        const contact = await prisma.contact.findFirst({
          where: { email: enrollment.contactEmail, userId: enrollment.workflow.userId },
        });
        if (contact?.tags) {
          const remaining = contact.tags.split(",").map((t) => t.trim()).filter((t) => !tagsToRemove.includes(t.toLowerCase())).join(", ");
          await prisma.contact.update({ where: { id: contact.id }, data: { tags: remaining || null } });
        }
        await prisma.workflowEnrollmentEvent.create({ data: { enrollmentId, stepId: currentStep.id, eventType: "TAG_REMOVED", metadata: { tags: tagsToRemove } } });
        break;
      }

      case "GO_TO": {
        const targetStepId = cfg.targetStepId;
        if (!targetStepId) break;
        const existingEvents = await prisma.workflowEnrollmentEvent.count({
          where: { enrollmentId, stepId: currentStep.id, eventType: "GOTO_JUMPED" },
        });
        const maxJumps = cfg.maxJumps ?? 3;
        if (existingEvents >= maxJumps) {
          await prisma.workflowEnrollmentEvent.create({ data: { enrollmentId, stepId: currentStep.id, eventType: "GOTO_MAX_REACHED" } });
          break;
        }
        await prisma.workflowEnrollmentEvent.create({
          data: { enrollmentId, stepId: currentStep.id, eventType: "GOTO_JUMPED", metadata: { targetStepId, jump: existingEvents + 1 } },
        });
        await prisma.workflowEnrollment.update({ where: { id: enrollmentId }, data: { currentStepId: targetStepId } });
        await workflowQueue.add("process-enrollment", { enrollmentId, workflowId: enrollment.workflowId });
        return;
      }

      case "END": {
        await prisma.workflowEnrollment.update({ where: { id: enrollmentId }, data: { status: "COMPLETED" } });
        return;
      }
    }

    const nextStep = getNextStep(steps, currentStep.id, null);
    if (nextStep) {
      await prisma.workflowEnrollment.update({ where: { id: enrollmentId }, data: { currentStepId: nextStep.id } });
      await workflowQueue.add("process-enrollment", { enrollmentId, workflowId: enrollment.workflowId });
    } else {
      await prisma.workflowEnrollment.update({ where: { id: enrollmentId }, data: { status: "COMPLETED" } });
    }
  },
  { connection, concurrency: 5 }
);

workflowWorker.on("failed", (job, err) => {
  console.error(`Workflow job ${job?.id} failed:`, err.message);
});

console.log("[workflowWorker] Started");
