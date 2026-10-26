// Guards for server-side requests to user-supplied addresses (SSRF protection).
// Refuses localhost, internal TLDs, and raw IP addresses.
export function isPublicHost(hostname: string) {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.localhost')) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(':') || h.startsWith('[')) return false;
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(h);
}

/** Only allow http(s) links in hrefs built from stored data. */
export function safeHref(url: string | null | undefined) {
  if (!url) return undefined;
  return /^https?:\/\//i.test(url.trim()) ? url.trim() : undefined;
}
