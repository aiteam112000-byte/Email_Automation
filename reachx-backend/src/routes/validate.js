const express = require("express");
const dns = require("dns/promises");

const router = express.Router();

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
  "yopmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
  "guerrillamail.info", "spam4.me", "trashmail.com", "dispostable.com",
]);

async function verifyWithApify(emails) {
  const token = process.env.APIFY_API_TOKEN;
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/account56~email-verifier/runs?token=${token}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emails }) }
  );
  const runData = await runRes.json();
  const runId = runData?.data?.id;
  if (!runId) throw new Error("Failed to start Apify actor");

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
    const statusData = await statusRes.json();
    const status = statusData?.data?.status;

    if (status === "SUCCEEDED") {
      const datasetId = statusData.data.defaultDatasetId;
      const itemsRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`);
      return await itemsRes.json();
    }
    if (status === "FAILED" || status === "ABORTED") throw new Error("Apify actor run failed");
  }
  throw new Error("Apify actor timed out");
}

function mapApifyResult(r) {
  if (r.result === "ok" || r.resultcode === 1) {
    const reason = r.free ? "Valid free email provider" : r.role ? "Valid but role-based address" : "Mailbox verified";
    return { email: r.email, status: "VALID", reason };
  }
  if (r.resultcode === 2 || r.result === "catch_all") {
    return { email: r.email, status: "RISKY", reason: "Catch-all domain (cannot verify mailbox)" };
  }
  return { email: r.email, status: "INVALID", reason: r.error || "Mailbox does not exist" };
}

async function fastValidate(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { email, status: "INVALID", reason: "Invalid email format" };
  }
  const domain = email.split("@")[1].toLowerCase();
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { email, status: "INVALID", reason: "Disposable email provider" };
  }
  try {
    const records = await dns.resolveMx(domain);
    if (!records || records.length === 0) {
      return { email, status: "INVALID", reason: "No MX records found for domain" };
    }
    return { email, status: "RISKY", reason: "Format and MX valid (deep check unavailable)" };
  } catch {
    return { email, status: "INVALID", reason: "Domain does not exist or has no mail server" };
  }
}

// POST /api/validate
router.post("/", async (req, res) => {
  const { emails } = req.body;
  if (!Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ error: "Provide an array of emails" });
  }

  try {
    const apifyResults = await verifyWithApify(emails);
    const results = apifyResults.map(mapApifyResult);
    res.json({ results });
  } catch (err) {
    console.warn("Apify failed, falling back to fast validation:", err);
    const results = await Promise.all(emails.map(fastValidate));
    res.json({ results });
  }
});

module.exports = router;
