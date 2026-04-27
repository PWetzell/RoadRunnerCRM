/**
 * Open + click tracking helpers.
 *   - Every outgoing message gets a random `tracking_token` at send-time.
 *   - We append a 1×1 pixel `<img src="/api/track/pixel/{token}">` at the
 *     end of the HTML body so the `pixel` endpoint can mark the message as
 *     opened when the recipient's mail client fetches images.
 *   - We rewrite every `<a href="...">` in the HTML body to route through
 *     `/api/track/click/{token}?url=<encoded>` so the `click` endpoint can
 *     record the click and 302 to the real destination.
 *
 * All instrumentation lives in HTML. Plain-text bodies pass through
 * unchanged (no way to track).
 */

export function generateTrackingToken(): string {
  // 24 chars of url-safe alphabet is enough entropy and stays short in markup.
  const bytes = new Uint8Array(18);
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export interface InstrumentOptions {
  /** Absolute URL base for the tracking endpoints, e.g. "https://app.example.com". */
  appBaseUrl: string;
  /** Unique per-message token. */
  token: string;
}

/**
 * Instruments an HTML body with the tracking pixel + click wrapper.
 * Returns the rewritten HTML. Safe to call on any input; empty input
 * yields a wrapped minimal document.
 */
export function instrumentHtml(html: string, opts: InstrumentOptions): string {
  const pixelUrl = `${opts.appBaseUrl}/api/track/pixel/${opts.token}`;
  const clickBase = `${opts.appBaseUrl}/api/track/click/${opts.token}?url=`;

  // Rewrite anchor hrefs to route through the click endpoint.
  // We leave mailto: / tel: / anchor-only hrefs alone.
  const rewritten = html.replace(/href\s*=\s*"([^"]+)"/gi, (full, target: string) => {
    const t = target.trim();
    if (!t) return full;
    if (/^(mailto:|tel:|#)/i.test(t)) return full;
    if (t.startsWith(clickBase)) return full;
    return `href="${clickBase}${encodeURIComponent(t)}"`;
  });

  const pixelImg = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;border:0;margin:0;padding:0;max-width:1px;max-height:1px;opacity:0.01" />`;

  // Prefer inserting right before </body>. Otherwise append.
  if (/<\/body>/i.test(rewritten)) {
    return rewritten.replace(/<\/body>/i, `${pixelImg}</body>`);
  }
  return `${rewritten}${pixelImg}`;
}

/**
 * Convenience: if the caller only has plain text, wrap it into a minimal
 * HTML document and add the tracking pixel. That way every outgoing send
 * can opt into tracking, not just ones authored with rich-text UIs.
 */
export function wrapPlainTextAsTrackedHtml(text: string, opts: InstrumentOptions): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');
  const body = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#111827;white-space:normal">${escaped}</div>`;
  return instrumentHtml(`<html><body>${body}</body></html>`, opts);
}
