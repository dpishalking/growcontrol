/** Имя для hero-приветствия; null — только «Добрый день» без второй строки. */
export function greetingFirstName(name: string, email?: string | null): string | null {
  const trimmed = name.trim();
  if (!trimmed || trimmed === "Демо пользователь") return null;

  const emailLocal = email?.split("@")[0]?.trim().toLowerCase();
  if (emailLocal && trimmed.toLowerCase() === emailLocal) return null;

  const first = trimmed.split(/\s+/)[0]?.trim();
  return first || null;
}
