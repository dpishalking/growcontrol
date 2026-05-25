/** Служебный домен для входа по логину (Supabase Auth принимает только e-mail). */
export const LOGIN_EMAIL_DOMAIN = "login.controlgrow.ru";

export function normalizeLogin(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "");
}

export function isLoginEmail(email: string | null | undefined): boolean {
  return Boolean(email?.toLowerCase().endsWith(`@${LOGIN_EMAIL_DOMAIN}`));
}

export function loginFromEmail(email: string | null | undefined): string | null {
  if (!email || !isLoginEmail(email)) return null;
  return email.slice(0, -(LOGIN_EMAIL_DOMAIN.length + 1));
}

/** Логин или e-mail → e-mail для Supabase Auth. */
export function resolveAuthEmail(identifier: string): string {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) return trimmed.toLowerCase();
  return `${normalizeLogin(trimmed)}@${LOGIN_EMAIL_DOMAIN}`;
}

export function validateLogin(login: string): string | null {
  const n = normalizeLogin(login);
  if (n.length < 3) return "Логин — минимум 3 символа";
  if (n.length > 32) return "Логин — максимум 32 символа";
  if (!/^[a-z0-9._-]+$/.test(n)) return "Логин: латиница, цифры, точка, _ или -";
  return null;
}

export function profileIdentifier(p: {
  email: string | null;
  display_name: string | null;
}): string {
  const login = loginFromEmail(p.email);
  if (login) return login;
  return p.display_name || p.email || "—";
}
