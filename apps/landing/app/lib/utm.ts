export type UtmParams = {
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  term?: string;
};

/**
 * Append UTM parameters to a URL. Works for both absolute and relative URLs.
 * Existing query parameters are preserved. Existing utm_* keys are overwritten.
 */
export function appendUtm(url: string, params: UtmParams): string {
  const pairs: string[] = [
    `utm_source=${encodeURIComponent(params.source)}`,
    `utm_medium=${encodeURIComponent(params.medium)}`,
    `utm_campaign=${encodeURIComponent(params.campaign)}`,
  ];
  if (params.content) pairs.push(`utm_content=${encodeURIComponent(params.content)}`);
  if (params.term) pairs.push(`utm_term=${encodeURIComponent(params.term)}`);

  const hashIndex = url.indexOf("#");
  const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : url.slice(hashIndex);
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}${pairs.join("&")}${hash}`;
}

/**
 * Append a `?s=<slot>` query param to mark the on-page origin of an outbound
 * link. Used for targets that don't read UTM (e.g. GitHub): the full URL then
 * appears in Ahrefs Web Analytics outbound-link reports grouped by slot.
 * See docs/analytics/PLAN-4.md.
 */
export function appendSlot(url: string, slot: string): string {
  const hashIndex = url.indexOf("#");
  const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : url.slice(hashIndex);
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}s=${encodeURIComponent(slot)}${hash}`;
}
