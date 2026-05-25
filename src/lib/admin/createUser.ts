import { validateLogin } from "@/lib/authLogin";
import { supabase } from "@/integrations/supabase/client";

function parseFnError(error: unknown, data: unknown): string | null {
  if (data && typeof data === "object") {
    if ("error" in data && data.error) {
      return humanizeAdminUserError(String(data.error));
    }
    if ("ok" in data && data.ok === true) {
      return null;
    }
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: string }).message);
    if (data && typeof data === "object" && "error" in data && data.error) {
      return humanizeAdminUserError(String(data.error));
    }
    return humanizeAdminUserError(message);
  }
  return null;
}

export function humanizeAdminUserError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("already been registered") || m.includes("already exists")) {
    return "Такой логин уже занят";
  }
  if (m.includes("invalid login")) return "Некорректный логин";
  if (m.includes("invalid email")) return "Некорректный e-mail";
  if (m.includes("password must be at least")) return "Пароль минимум 6 символов";
  if (m.includes("login must be at least")) return "Логин минимум 3 символа";
  if (m.includes("forbidden")) return "Нет прав администратора";
  if (m.includes("unauthorized")) return "Войдите в аккаунт администратора";
  if (m.includes("edge function") || m.includes("failed to send")) {
    return "Не удалось вызвать серверную функцию. Проверьте деплой admin-create-user / admin-invite-user.";
  }
  return msg;
}

export type AdminUserActionResult =
  | { ok: true; userId: string | null; login?: string | null }
  | { error: string };

export async function inviteUserByEmail(
  email: string,
  name?: string,
): Promise<AdminUserActionResult> {
  const { data, error } = await supabase.functions.invoke("admin-invite-user", {
    body: {
      email: email.trim().toLowerCase(),
      name: name?.trim() || undefined,
      redirectTo: `${window.location.origin}/dashboard`,
    },
  });

  const parsed = parseFnError(error, data);
  if (parsed) return { error: parsed };

  const userId =
    data && typeof data === "object" && "userId" in data
      ? (data.userId as string | null)
      : null;

  return { ok: true, userId };
}

export async function createUserByAdmin(input: {
  login: string;
  password: string;
  name?: string;
}): Promise<AdminUserActionResult> {
  const loginError = validateLogin(input.login);
  if (loginError) return { error: loginError };

  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: {
      login: input.login.trim(),
      password: input.password,
      name: input.name?.trim() || undefined,
    },
  });

  const parsed = parseFnError(error, data);
  if (parsed) return { error: parsed };

  const userId =
    data && typeof data === "object" && "userId" in data
      ? (data.userId as string | null)
      : null;
  const login =
    data && typeof data === "object" && "login" in data
      ? (data.login as string | null)
      : input.login.trim().toLowerCase();

  return { ok: true, userId, login };
}

export function generateTempPassword(length = 10): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}
