/**
 * Допуск к админ-панели. По умолчанию — закрытый список e-mail.
 * Список настраивается переменной `VITE_ADMIN_EMAILS` (через запятую).
 */

const FALLBACK_ADMINS = [
  "d.pishalkin@gmail.com",
  "dpishalking@gmail.com",
];

function getAdmins(): string[] {
  const raw = import.meta.env.VITE_ADMIN_EMAILS as string | undefined;
  const list = raw ? raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) : [];
  return list.length ? list : FALLBACK_ADMINS.map((s) => s.toLowerCase());
}

export function isAdminUser(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdmins().includes(email.toLowerCase());
}

export function listAdminEmails(): string[] {
  return getAdmins();
}
