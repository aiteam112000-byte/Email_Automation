const { connection } = require("./queue");

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const memStore = new Map();

async function checkRateLimit(key) {
  const redisKey = `rl:${key}`;
  const now = Date.now();
  const windowSec = Math.floor(WINDOW_MS / 1000);

  try {
    const multi = connection.multi();
    multi.incr(redisKey);
    multi.pttl(redisKey);
    const results = await multi.exec();

    const count = results?.[0]?.[1] ?? 1;
    const pttl = results?.[1]?.[1] ?? -1;

    if (count === 1 || pttl < 0) {
      await connection.pexpire(redisKey, WINDOW_MS);
    }

    const resetAt = now + (pttl > 0 ? pttl : WINDOW_MS);
    return { allowed: count <= MAX_ATTEMPTS, remaining: Math.max(0, MAX_ATTEMPTS - count), resetAt };
  } catch {
    const entry = memStore.get(key);
    if (!entry || now > entry.resetAt) {
      memStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetAt: now + WINDOW_MS };
    }
    entry.count++;
    return { allowed: entry.count <= MAX_ATTEMPTS, remaining: Math.max(0, MAX_ATTEMPTS - entry.count), resetAt: entry.resetAt };
  }
}

module.exports = { checkRateLimit };
