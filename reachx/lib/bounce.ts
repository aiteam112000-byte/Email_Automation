import imaps from "imap-simple";
import { simpleParser } from "mailparser";
import { prisma } from "./prisma";

const imapConfig = {
  imap: {
    user: process.env.BOUNCE_IMAP_USER,
    password: process.env.BOUNCE_IMAP_PASS,
    host: process.env.BOUNCE_IMAP_HOST,
    port: parseInt(process.env.BOUNCE_IMAP_PORT ?? "993", 10),
    tls: process.env.BOUNCE_IMAP_TLS !== "false",
    authTimeout: 30000,
    tlsOptions: { rejectUnauthorized: false },
  },
};

const bounceMailbox = process.env.BOUNCE_MAILBOX ?? "INBOX";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function extractBounceAddresses(raw: string): string[] {
  const emails = new Set<string>();
  const patterns = [
    /Final-Recipient:\s*rfc822;\s*([^\s>;,]+)/gi,
    /Original-Recipient:\s*rfc822;\s*([^\s>;,]+)/gi,
    /Recipient:\s*rfc822;\s*([^\s>;,]+)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(raw)) !== null) {
      emails.add(normalizeEmail(match[1]));
    }
  }

  if (emails.size === 0) {
    const fallback = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    let match;
    while ((match = fallback.exec(raw)) !== null) {
      emails.add(normalizeEmail(match[1]));
    }
  }

  return [...emails];
}

function extractBounceReason(raw: string): string {
  const reasonMatch = raw.match(/Diagnostic-Code:\s*[^\r\n]+/i);
  if (reasonMatch) return reasonMatch[0].trim();

  const statusMatch = raw.match(/Status:\s*[^\r\n]+/i);
  if (statusMatch) return statusMatch[0].trim();

  return "Bounce detected";
}

export async function checkBounceMailbox(): Promise<number> {
  if (!process.env.BOUNCE_IMAP_HOST || !process.env.BOUNCE_IMAP_USER || !process.env.BOUNCE_IMAP_PASS) {
    return 0;
  }

  try {
    const connection = await imaps.connect(imapConfig as any);
    await connection.openBox(bounceMailbox);

    const searchCriteria = ["UNSEEN"];
    const fetchOptions = {
      bodies: [""],
      markSeen: true,
      struct: true,
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    let processed = 0;

    for (const message of messages) {
      const rawBody = message.parts?.find((part: any) => part.which === "")?.body;
      if (!rawBody) continue;

      const raw = typeof rawBody === "string" ? rawBody : rawBody.toString("utf-8");
      const parsed = await simpleParser(raw);
      const content = raw + "\n" + (parsed.text ?? "");
      const emails = extractBounceAddresses(content);
      const reason = extractBounceReason(content);

      for (const email of emails) {
        const recipients = await prisma.recipient.findMany({
          where: { email },
          include: { campaign: { select: { userId: true } } },
        });

        for (const recipient of recipients) {
          const existing = await prisma.emailEvent.findFirst({
            where: {
              recipientId: recipient.id,
              campaignId: recipient.campaignId,
              eventType: "BOUNCED",
            },
          });

          if (existing) continue;

          await prisma.emailEvent.create({
            data: {
              eventType: "BOUNCED",
              campaignId: recipient.campaignId,
              recipientId: recipient.id,
              metadata: { reason, source: "bounce-imap" },
            },
          });

          if (recipient.status !== "INVALID") {
            await prisma.recipient.update({
              where: { id: recipient.id },
              data: { status: "INVALID" },
            });
          }

          if (recipient.campaign?.userId) {
            await prisma.contact.updateMany({
              where: { email, userId: recipient.campaign.userId },
              data: { bouncedAt: new Date() },
            });
          }
        }
      }

      processed += 1;
    }

    await connection.end();
    return processed;
  } catch (error) {
    console.error("Bounce mailbox check failed:", error);
    return 0;
  }
}
