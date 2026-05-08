// Cloudflare Turnstile injects a `turnstile` global once
// challenges.cloudflare.com/turnstile/v0/api.js loads.
// This file just types the parts we use.
export {};

declare global {
  interface Window {
    turnstile?: {
      reset: (widgetId?: string) => void;
      remove?: (widgetId?: string) => void;
    };
  }
}
