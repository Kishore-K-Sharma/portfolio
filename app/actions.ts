'use server'

import { z } from 'zod'
import nodemailer from 'nodemailer'
import { headers } from 'next/headers'

const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address').max(254),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
});

// In-memory rate limiter — best-effort only (resets on cold start, not shared across instances).
// For stronger guarantees, swap for Upstash/Redis.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 3;
const submissions = new Map<string, number[]>();

function getClientIp(): string {
  const h = headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return h.get('x-real-ip') ?? 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const recent = (submissions.get(ip) ?? []).filter((t) => t > cutoff);
  if (recent.length >= RATE_LIMIT_MAX) {
    submissions.set(ip, recent);
    return true;
  }
  recent.push(now);
  submissions.set(ip, recent);
  return false;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function submitContactForm(prevState: any, formData: FormData) {
  if (isRateLimited(getClientIp())) {
    return {
      message: 'Too many submissions. Please wait a minute and try again.',
      success: false,
      errors: undefined,
    };
  }

  const validatedFields = contactFormSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    message: formData.get('message'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Please correct the errors and try again.',
      success: false,
    };
  }

  const { name, email, message } = validatedFields.data;

  // ── Nodemailer via Gmail SMTP ──────────────────────────────────────────────
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    // Graceful dev fallback — no credentials configured yet
    console.log('📬 [DEV] Contact form (Gmail not configured):', { name, email, message });
    return {
      message: "Thank you for reaching out! I'll get back to you soon.",
      success: true,
      errors: undefined,
    };
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message);

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword, // Use a Gmail App Password, NOT your account password
      },
    });

    await transporter.sendMail({
      from: `"Portfolio Contact" <${gmailUser}>`,
      to: gmailUser,           // sends to yourself
      replyTo: email,          // so you can Reply directly to the sender
      subject: `💼 New inquiry from ${name} via Portfolio`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
          <h2 style="color: #111827; margin-bottom: 4px;">New Contact Form Submission</h2>
          <p style="color: #6b7280; margin-top: 0;">Received via your portfolio contact form</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #374151; width: 80px;">Name</td>
              <td style="padding: 8px 0; color: #111827;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #374151;">Email</td>
              <td style="padding: 8px 0;">
                <a href="mailto:${safeEmail}" style="color: #7c3aed;">${safeEmail}</a>
              </td>
            </tr>
          </table>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <h3 style="color: #374151; margin-bottom: 8px;">Message</h3>
          <p style="color: #111827; line-height: 1.7; white-space: pre-wrap;">${safeMessage}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">
            Sent from kishore-kumar-sharma.dev · Hit Reply to respond directly to ${safeName}.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Nodemailer error:', err);
    return {
      message: 'Failed to send message. Please try contacting me directly via email.',
      success: false,
      errors: undefined,
    };
  }

  return {
    message: "Message sent! I'll get back to you soon.",
    success: true,
    errors: undefined,
  };
}
