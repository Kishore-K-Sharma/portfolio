// Cloudflare Turnstile server-side verification.
//
// In dev (no secret configured) the check is skipped so the form still works
// against a local server. Production deployments MUST set TURNSTILE_SECRET_KEY.
import { siteConfig } from "@/config/site";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function expectedHostname(): string | null {
  try {
    return new URL(siteConfig.baseUrl).hostname;
  } catch {
    return null;
  }
}

type TurnstileResponse = {
  success?: boolean;
  hostname?: string;
  "error-codes"?: string[];
};

export async function verifyTurnstile(token: string | null, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // dev fallback
  if (!token) return false;

  const body = new URLSearchParams({ secret, response: token, remoteip: ip });

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as TurnstileResponse;
    if (data.success !== true) return false;

    // Defense-in-depth: ensure the token was issued for this site, not replayed
    // from another property using the same secret.
    const expected = expectedHostname();
    if (expected && data.hostname && data.hostname !== expected) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
