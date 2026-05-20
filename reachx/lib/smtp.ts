import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export async function sendEmail(options: SendEmailOptions) {
  const fromEmail = options.fromEmail ?? process.env.SMTP_FROM_EMAIL;
  const fromName = options.fromName ?? process.env.SMTP_FROM_NAME ?? "ReachX";
  const bounceEmail = process.env.SMTP_BOUNCE_EMAIL ?? fromEmail;

  if (!fromEmail) {
    throw new Error("SMTP_FROM_EMAIL is not configured");
  }
  if (!bounceEmail) {
    throw new Error("SMTP_BOUNCE_EMAIL or SMTP_FROM_EMAIL must be configured");
  }

  return transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: options.to,
    subject: options.subject,
    html: options.htmlContent,
    replyTo: options.replyTo || undefined,
    envelope: {
      from: bounceEmail,
      to: options.to,
    },
    headers: {
      ...(options.headers ?? {}),
      "Return-Path": bounceEmail,
    },
  });
}
