export const MAX_LANDING_URL_FIELDS = 4;

export function landingUrlFieldKeys(count = MAX_LANDING_URL_FIELDS): string[] {
  const keys = ["landingUrl"];
  for (let i = 2; i <= count; i++) keys.push(`landingUrl${i}`);
  return keys;
}

export function splitLandingUrls(stored: string | undefined | null): string[] {
  if (!stored?.trim()) return [];
  return stored
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinLandingUrls(parts: readonly string[]): string {
  return parts
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n");
}

export function landingUrlToQuizValues(
  stored: string,
  fieldCount = MAX_LANDING_URL_FIELDS,
): Record<string, string> {
  const parts = splitLandingUrls(stored);
  const keys = landingUrlFieldKeys(fieldCount);
  return Object.fromEntries(keys.map((key, i) => [key, parts[i] ?? ""]));
}

export function quizValuesToLandingUrl(
  values: Record<string, string>,
  fieldCount = MAX_LANDING_URL_FIELDS,
): string {
  return joinLandingUrls(landingUrlFieldKeys(fieldCount).map((k) => values[k] ?? ""));
}

export function formatLandingUrlsForDisplay(stored: string | undefined | null): string {
  const urls = splitLandingUrls(stored);
  if (urls.length <= 1) return urls[0] ?? "";
  return urls.map((u, i) => `${i + 1}. ${u}`).join(" · ");
}

export function formatLandingUrlsForAudit(stored: string | undefined | null): string {
  const urls = splitLandingUrls(stored);
  if (urls.length === 0) return "";
  if (urls.length === 1) {
    const u = urls[0];
    return u.startsWith("http") ? u : `https://${u}`;
  }
  return urls
    .map((u, i) => {
      const href = u.startsWith("http") ? u : `https://${u}`;
      return `Страница ${i + 1}: ${href}`;
    })
    .join("\n");
}
