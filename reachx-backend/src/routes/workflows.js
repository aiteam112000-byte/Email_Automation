const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { workflowQueue } = require("../lib/workflowQueue");

const router = express.Router();

// GET /api/workflows
router.get("/", requireAuth, async (req, res) => {
  const workflows = await prisma.workflow.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { steps: true, enrollments: true } } },
  });
  res.json(workflows);
});

// POST /api/workflows
router.post("/", requireAuth, async (req, res) => {
  const { name, triggerType, triggerConfig } = req.body;
  if (!name || !triggerType) return res.status(400).json({ error: "Missing required fields" });

  const workflow = await prisma.workflow.create({
    data: { name, triggerType, triggerConfig: triggerConfig ?? {}, userId: req.user.id },
  });
  res.status(201).json(workflow);
});

// GET /api/workflows/templates
router.get("/templates", requireAuth, async (req, res) => {
  res.json([
    { id: "welcome-series", name: "Welcome Series", desc: "3-email onboarding sequence", icon: "👋" },
    { id: "re-engagement", name: "Re-engagement", desc: "Win back inactive contacts", icon: "🔄" },
    { id: "lead-nurture", name: "Lead Nurture", desc: "Educate and qualify leads", icon: "🌱" },
  ]);
});

// POST /api/workflows/templates
router.post("/templates", requireAuth, async (req, res) => {
  const { templateId } = req.body;
  const templates = {
    "welcome-series": { name: "Welcome Series", triggerType: "CONTACT_CREATED" },
    "re-engagement": { name: "Re-engagement", triggerType: "MANUAL" },
    "lead-nurture": { name: "Lead Nurture", triggerType: "TAG_ADDED" },
  };
  const template = templates[templateId];
  if (!template) return res.status(404).json({ error: "Template not found" });

  const workflow = await prisma.workflow.create({
    data: { name: template.name, triggerType: template.triggerType, triggerConfig: {}, userId: req.user.id },
  });
  res.status(201).json(workflow);
});

// GET /api/workflows/:id
router.get("/:id", requireAuth, async (req, res) => {
  const workflow = await prisma.workflow.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  if (!workflow) return res.status(404).json({ error: "Not found" });
  res.json(workflow);
});

// PATCH /api/workflows/:id
router.patch("/:id", requireAuth, async (req, res) => {
  const wf = await prisma.workflow.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!wf) return res.status(404).json({ error: "Not found" });

  const body = req.body;
  const updated = await prisma.workflow.update({
    where: { id: req.params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.triggerType !== undefined && { triggerType: body.triggerType }),
      ...(body.triggerConfig !== undefined && { triggerConfig: body.triggerConfig }),
      ...(body.allowReEnrollment !== undefined && { allowReEnrollment: body.allowReEnrollment }),
      ...(body.exitOnUnsubscribe !== undefined && { exitOnUnsubscribe: body.exitOnUnsubscribe }),
    },
  });
  res.json(updated);
});

// DELETE /api/workflows/:id
router.delete("/:id", requireAuth, async (req, res) => {
  const wf = await prisma.workflow.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!wf) return res.status(404).json({ error: "Not found" });
  await prisma.workflow.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// PUT /api/workflows/:id/steps
router.put("/:id/steps", requireAuth, async (req, res) => {
  const wf = await prisma.workflow.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!wf) return res.status(404).json({ error: "Not found" });

  const { steps } = req.body;

  // Snapshot current steps as version
  const currentSteps = await prisma.workflowStep.findMany({ where: { workflowId: req.params.id } });
  if (currentSteps.length > 0) {
    const lastVersion = await prisma.workflowVersion.findFirst({
      where: { workflowId: req.params.id },
      orderBy: { version: "desc" },
    });
    await prisma.workflowVersion.create({
      data: { workflowId: req.params.id, version: (lastVersion?.version ?? 0) + 1, stepsJson: currentSteps },
    });
    const allVersions = await prisma.workflowVersion.findMany({
      where: { workflowId: req.params.id },
      orderBy: { version: "desc" },
    });
    if (allVersions.length > 10) {
      const toDelete = allVersions.slice(10).map((v) => v.id);
      await prisma.workflowVersion.deleteMany({ where: { id: { in: toDelete } } });
    }
  }

  await prisma.workflowStep.deleteMany({ where: { workflowId: req.params.id } });

  if (steps && steps.length > 0) {
    await prisma.workflowStep.createMany({
      data: steps.map((s) => ({
        id: s.id,
        workflowId: req.params.id,
        type: s.type,
        config: s.config ?? {},
        notes: s.notes ?? null,
        positionX: s.positionX ?? 0,
        positionY: s.positionY ?? 0,
        parentId: s.parentId ?? null,
        branch: s.branch ?? null,
        order: s.order ?? 0,
      })),
    });
  }

  const updated = await prisma.workflowStep.findMany({ where: { workflowId: req.params.id } });
  res.json(updated);
});

// POST /api/workflows/:id/enroll
router.post("/:id/enroll", requireAuth, async (req, res) => {
  const wf = await prisma.workflow.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  if (!wf) return res.status(404).json({ error: "Not found" });
  if (wf.status !== "ACTIVE") return res.status(400).json({ error: "Workflow is not active" });

  const { emails } = req.body;
  if (!emails?.length) return res.status(400).json({ error: "No emails provided" });

  const firstStep = wf.steps.find((s) => s.type === "TRIGGER") ?? wf.steps[0];

  const enrollments = await Promise.all(
    emails.map((email) =>
      prisma.workflowEnrollment.upsert({
        where: { workflowId_contactEmail: { workflowId: req.params.id, contactEmail: email } },
        create: { workflowId: req.params.id, contactEmail: email, currentStepId: firstStep?.id },
        update: { status: "ACTIVE", currentStepId: firstStep?.id },
      })
    )
  );

  for (const enrollment of enrollments) {
    await workflowQueue.add("process-enrollment", { enrollmentId: enrollment.id, workflowId: req.params.id });
  }

  res.json({ enrolled: enrollments.length });
});

// GET /api/workflows/:id/enrollments
router.get("/:id/enrollments", requireAuth, async (req, res) => {
  const wf = await prisma.workflow.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!wf) return res.status(404).json({ error: "Not found" });

  const { status } = req.query;
  const enrollments = await prisma.workflowEnrollment.findMany({
    where: { workflowId: req.params.id, ...(status ? { status } : {}) },
    orderBy: { enrolledAt: "desc" },
    include: { events: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  res.json(enrollments);
});

// GET /api/workflows/:id/stats
router.get("/:id/stats", requireAuth, async (req, res) => {
  const wf = await prisma.workflow.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: { steps: true },
  });
  if (!wf) return res.status(404).json({ error: "Not found" });

  const [total, active, completed, failed] = await Promise.all([
    prisma.workflowEnrollment.count({ where: { workflowId: req.params.id } }),
    prisma.workflowEnrollment.count({ where: { workflowId: req.params.id, status: "ACTIVE" } }),
    prisma.workflowEnrollment.count({ where: { workflowId: req.params.id, status: "COMPLETED" } }),
    prisma.workflowEnrollment.count({ where: { workflowId: req.params.id, status: "FAILED" } }),
  ]);

  const stepFunnel = await Promise.all(
    wf.steps.map(async (step) => {
      const reached = await prisma.workflowEnrollmentEvent.count({ where: { stepId: step.id } });
      return { stepId: step.id, stepType: step.type, reached };
    })
  );

  const emailSent = await prisma.workflowEnrollmentEvent.count({ where: { enrollment: { workflowId: req.params.id }, eventType: "EMAIL_SENT" } });
  const emailOpened = await prisma.workflowEnrollmentEvent.count({ where: { enrollment: { workflowId: req.params.id }, eventType: "EMAIL_OPENED" } });
  const emailClicked = await prisma.workflowEnrollmentEvent.count({ where: { enrollment: { workflowId: req.params.id }, eventType: "EMAIL_CLICKED" } });

  const activity = await prisma.workflowEnrollmentEvent.findMany({
    where: { enrollment: { workflowId: req.params.id } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { enrollment: { select: { contactEmail: true } } },
  });

  res.json({
    total, active, completed, failed,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    emailSent, emailOpened, emailClicked,
    openRate: emailSent > 0 ? Math.round((emailOpened / emailSent) * 100) : 0,
    clickRate: emailSent > 0 ? Math.round((emailClicked / emailSent) * 100) : 0,
    stepFunnel, activity,
  });
});

// POST /api/workflows/:id/archive
router.post("/:id/archive", requireAuth, async (req, res) => {
  const wf = await prisma.workflow.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!wf) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.workflow.update({ where: { id: req.params.id }, data: { archived: !wf.archived } });
  res.json(updated);
});

// POST /api/workflows/:id/duplicate
router.post("/:id/duplicate", requireAuth, async (req, res) => {
  const source = await prisma.workflow.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: { steps: true },
  });
  if (!source) return res.status(404).json({ error: "Not found" });

  const copy = await prisma.workflow.create({
    data: {
      name: `${source.name} (copy)`,
      triggerType: source.triggerType,
      triggerConfig: source.triggerConfig ?? {},
      userId: req.user.id,
    },
  });
  res.status(201).json(copy);
});

// GET /api/workflows/:id/versions
router.get("/:id/versions", requireAuth, async (req, res) => {
  const versions = await prisma.workflowVersion.findMany({
    where: { workflowId: req.params.id },
    orderBy: { version: "desc" },
  });
  res.json(versions);
});

module.exports = router;
