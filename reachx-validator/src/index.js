require("dotenv/config");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const validateRouter = require("./routes/validate");
const { router: authRouter } = require("./routes/auth");

const app = express();
const PORT = process.env.PORT ?? 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.use("/api/auth", authRouter);

// Rate limit — 10 requests per minute per IP
app.use("/api/validate", rateLimit({ windowMs: 60_000, max: 10, message: { error: "Too many requests, try again in a minute." } }));
app.use("/api/validate", validateRouter);

app.get("/health", (req, res) => res.json({ status: "ok", service: "reachx-validator" }));

app.listen(PORT, "0.0.0.0", () => {
  const { networkInterfaces } = require("os");
  const nets = networkInterfaces();
  let localIP = "localhost";
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) { localIP = net.address; break; }
    }
  }
  console.log(`[reachx-validator] Running on http://localhost:${PORT}`);
  console.log(`[reachx-validator] Network access: http://${localIP}:${PORT}`);
});
