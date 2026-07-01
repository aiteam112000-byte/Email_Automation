const express = require("express");
const dns = require("dns/promises");
const { getTokenForSession } = require("./auth");

const router = express.Router();

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
  "yopmail.com", "sharklasers.com", "spam4.me", "trashmail.com", "dispostable.com",
  "guerrillamail.info", "grr.la", "guerrillamailblock.com",
]);

async function verifyWithApify(emails, token) {
  if (!token) throw new Error("No Apify token — please set your token in Settings");

  const runRes = await fetch(
    `https://api.apify.com/v2/acts/account56~email-verifier/runs?token=${token}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emails }) }
  );
  const runData = await runRes.json();
  const runId = runData?.data?.id;
  if (!runId) throw new Error(`Failed to start Apify actor: ${JSON.stringify(runData)}`);

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
    return { email: r.email, status: "VALID", reason: r.free ? "Valid free provider" : r.role ? "Valid role-based address" : "Mailbox verified" };
  }
  if (r.resultcode === 2 || r.result === "catch_all") {
    return { email: r.email, status: "RISKY", reason: "Catch-all domain — cannot verify mailbox" };
  }
  return { email: r.email, status: "INVALID", reason: r.error || "Mailbox does not exist" };
}

async function fastValidate(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { email, status: "INVALID", reason: "Invalid email format" };

  const domain = email.split("@")[1].toLowerCase();
  if (DISPOSABLE_DOMAINS.has(domain))
    return { email, status: "INVALID", reason: "Disposable email provider" };

  try {
    const records = await dns.resolveMx(domain);
    if (!records?.length)
      return { email, status: "INVALID", reason: "No MX records found for domain" };
    return { email, status: "RISKY", reason: "Format and MX valid — deep check not run" };
  } catch {
    return { email, status: "INVALID", reason: "Domain does not exist or has no mail server" };
  }
}

// POST /api/validate
router.post("/", async (req, res) => {
  const { emails } = req.body;
  if (!Array.isArray(emails) || emails.length === 0)
    return res.status(400).json({ error: "Provide a non-empty array of emails" });
  if (emails.length > 500)
    return res.status(400).json({ error: "Maximum 500 emails per request" });

  const token = getTokenForSession(req.headers["x-session-id"]);

  try {
    const apifyResults = await verifyWithApify(emails, token);
    return res.json({ results: apifyResults.map(mapApifyResult), method: "apify" });
  } catch (err) {
    console.warn("[validator] Apify failed, using fast fallback:", err.message);
    const results = await Promise.all(emails.map(fastValidate));
    return res.json({ results, method: "fast" });
  }
});

// GET /api/validate/single?email=...
router.get("/single", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "email query param required" });

  const token = getTokenForSession(req.headers["x-session-id"]);

  try {
    const apifyResults = await verifyWithApify([email], token);
    return res.json(mapApifyResult(apifyResults[0]));
  } catch {
    return res.json(await fastValidate(email));
  }
});

module.exports = router;
