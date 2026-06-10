require("dotenv/config");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const validateRouter = require("./routes/validate");

const app = express();
const PORT = process.env.PORT ?? 5000;

app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "2mb" }));

// Rate limit — 10 requests per minute per IP
app.use("/api/validate", rateLimit({ windowMs: 60_000, max: 10, message: { error: "Too many requests, try again in a minute." } }));
app.use("/api/validate", validateRouter);

app.get("/health", (req, res) => res.json({ status: "ok", service: "reachx-validator" }));

app.listen(PORT, () => console.log(`[reachx-validator] Running on http://localhost:${PORT}`));
