const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const count = (events, type) => events.filter((e) => e.eventType === type).length;

// GET /api/stats
router.get("/", requireAuth, async (req, res) => {
  const campaigns = await prisma.campaign.findMany({
    where: { userId: req.user.id },
    include: { events: true, _count: { select: { recipients: true } } },
  });

  const totalSent = campaigns.reduce((acc, c) => acc + count(c.events, "SENT"), 0);
  const totalOpened = campaigns.reduce((acc, c) => acc + count(c.events, "OPENED"), 0);
  const totalClicked = campaigns.reduce((acc, c) => acc + count(c.events, "CLICKED"), 0);

  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : null;
  const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : null;

  res.json({
    totalCampaigns: campaigns.length,
    totalSent,
    openRate,
    clickRate,
    recentCampaigns: campaigns.slice(0, 5).map((c) => ({
      id: c.id, name: c.name, subject: c.subject, status: c.status,
      recipients: c._count.recipients,
      sent: count(c.events, "SENT"),
      opened: count(c.events, "OPENED"),
      clicked: count(c.events, "CLICKED"),
      createdAt: c.createdAt,
    })),
  });
});

module.exports = router;
