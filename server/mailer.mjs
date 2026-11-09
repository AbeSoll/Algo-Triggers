import nodemailer from "nodemailer";
import { loadEnv } from "./env.mjs";

loadEnv();

export function alertEmail() {
  loadEnv();
  return (process.env.ALERT_TO || "").trim();
}

export function smtpConfigured() {
  loadEnv();
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );
}

export async function deliver({ to, subject, text }) {
  if (!smtpConfigured()) {
    return {
      status: "held",
      detail:
        "Saved for " +
        to +
        ". Add SMTP_USER and SMTP_PASS to .env (a Gmail app password) and the next check will send it.",
    };
  }
  const port = Number(process.env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  try {
    const info = await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
    });
    return { status: "sent", detail: info.messageId || "sent" };
  } catch (error) {
    return {
      status: "failed",
      detail: error instanceof Error ? error.message : "Email send failed.",
    };
  }
}
