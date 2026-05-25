export const LOGIN_EMAIL_DOMAIN = "login.controlgrow.ru";

export function normalizeLogin(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "");
}

export function loginToAuthEmail(login: string): string {
  return `${normalizeLogin(login)}@${LOGIN_EMAIL_DOMAIN}`;
}

export function validateLogin(login: string): string | null {
  const n = normalizeLogin(login);
  if (n.length < 3) return "Login must be at least 3 characters";
  if (n.length > 32) return "Login must be at most 32 characters";
  if (!/^[a-z0-9._-]+$/.test(n)) return "Invalid login characters";
  return null;
}
