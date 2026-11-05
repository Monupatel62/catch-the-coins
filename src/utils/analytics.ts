/**
 * Thin, failure-proof wrapper around GA4's global `gtag`.
 *
 * `gtag` is defined by the inline snippet in index.html. If it is missing (blocked,
 * not loaded yet) or throws, analytics is silently skipped so it can never break the game.
 * No personal data is sent: only game-play numbers.
 */
type EventParams = Record<string, string | number | boolean>;

declare global {
  interface Window {
    gtag?: (command: "event", eventName: string, params?: EventParams) => void;
  }
}

export function trackEvent(name: string, params: EventParams = {}): void {
  try {
    window.gtag?.("event", name, params);
  } catch {
    // Analytics must never interrupt gameplay.
  }
}
