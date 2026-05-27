/** Несколько посадочных страниц (клип-ленд и т.п.) хранятся в одном поле url через перевод строки */

export function parseMaterialUrlList(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinMaterialUrlList(urls: string[]): string {
  return urls.map((u) => u.trim()).filter(Boolean).join("\n");
}

/** Проверка http(s) для одной строки */
export function isValidHttpUrl(value: string): boolean {
  if (!value.trim()) return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function materialHasAnyValidUrl(raw: string): boolean {
  return parseMaterialUrlList(raw).some(isValidHttpUrl);
}
