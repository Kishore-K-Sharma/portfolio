'use server'

import { z } from 'zod'
import nodemailer from 'nodemailer'
import { encode as escapeHtml } from 'html-entities'
import { headers } from 'next/headers';
import { isRateLimited } from '@/lib/rate-limit';
import { verifyTurnstile } from '@/lib/turnstile';
import { siteConfig } from '@/config/site';

const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address').max(254),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
});

export type ContactFormState = {
  message?: string;
  errors?: Partial<Record<'name' | 'email' | 'message', string[]>>;
  success: boolean;
};

async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return h.get('x-real-ip') ?? 'unknown';
}

// CR/LF in user input can inject extra SMTP headers when interpolated into
// Subject / From / etc. (header fields are line-delimited). Body is safe via
// escapeHtml, but these need stripping before reaching Nodemailer headers.
function stripHeaderNewlines(input: string): string {
  return input.replace(/[\r\n]+/g, ' ').trim();
}

export async function submitContactForm(
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const ip = await getClientIp();

  if (await isRateLimited(ip)) {
    return {
      message: 'Too many submissions. Please wait a minute and try again.',
      success: false,
      errors: undefined,
    };
  }

  const turnstileToken = formData.get('cf-turnstile-response');
  const turnstileOk = await verifyTurnstile(
    typeof turnstileToken === 'string' ? turnstileToken : null,
    ip,
  );
  if (!turnstileOk) {
    return {
      message: 'Could not verify you are human. Please refresh and try again.',
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

  const headerSafeName = stripHeaderNewlines(name);
  const safeName = escapeHtml(headerSafeName);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message);

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    const siteUrl = siteConfig.baseUrl;
    const displayUrl = siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const submittedAt = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const labelStyle = "font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280;";
    const valueStyle = "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 14px; color: #111827;";

    await transporter.sendMail({
      from: `"Portfolio · /contact" <${gmailUser}>`,
      to: gmailUser,
      // Safe to pass `email` raw: Zod's .email() regex rejects CR/LF, so the
      // value can't contain header-injection characters by the time it reaches
      // Nodemailer. `name` doesn't have that property — see headerSafeName.
      replyTo: email,
      subject: `New inquiry · ${headerSafeName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 28px; background: #ffffff; color: #111827;">
          <p style="${labelStyle} margin: 0 0 6px;">/contact · new inquiry</p>
          <h1 style="font-family: Georgia, 'Times New Roman', serif; font-weight: 500; font-size: 26px; line-height: 1.2; margin: 0 0 24px; color: #0a0a0b;">
            <span style="font-style: italic; color: #6028d9;">${safeName}</span> wants to talk.
          </h1>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="${labelStyle} padding: 10px 0; width: 110px; vertical-align: top;">Name</td>
                <td style="${valueStyle} padding: 10px 0;">${safeName}</td>
              </tr>
              <tr>
                <td style="${labelStyle} padding: 10px 0; vertical-align: top;">Email</td>
                <td style="${valueStyle} padding: 10px 0;">
                  <a href="mailto:${safeEmail}" style="color: #6028d9; text-decoration: none;">${safeEmail}</a>
                </td>
              </tr>
              <tr>
                <td style="${labelStyle} padding: 10px 0; vertical-align: top;">Submitted</td>
                <td style="${valueStyle} padding: 10px 0; color: #6b7280;">${submittedAt} IST</td>
              </tr>
            </table>
          </div>

          <div style="border-top: 1px solid #e5e7eb; margin-top: 8px; padding: 20px 0;">
            <p style="${labelStyle} margin: 0 0 12px;">Message</p>
            <p style="${valueStyle} line-height: 1.65; white-space: pre-wrap; margin: 0;">${safeMessage}</p>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; ${labelStyle}">
            Reply to this email to respond directly · <a href="${siteUrl}" style="color: #6b7280; text-decoration: none;">${displayUrl}</a>
          </div>
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
