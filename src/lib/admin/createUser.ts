import { supabase } from "@/integrations/supabase/client";

function parseFnError(error: unknown, data: unknown): string | null {
  if (data && typeof data === "object" && "error" in data && data.error) {
    return humanizeAdminUserError(String(data.error));
  }
  if (error && typeof error === "object" && "message" in error) {
    return humanizeAdminUserError(String((error as { message: string }).message));
  }
  return null;
}

export function humanizeAdminUserError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("already been registered") || m.includes("already exists")) {
    return "Пользователь с таким e-mail уже есть";
  }
  if (m.includes("invalid email")) return "Некорректный e-mail";
  if (m.includes("password must be at least")) return "Пароль минимум 6 символов";
  if (m.includes("forbidden")) return "Нет прав администратора";
  if (m.includes("unauthorized")) return "Войдите в аккаунт администратора";
  return msg;
}

export async function inviteUserByEmail(
  email: string,
  name?: string,
): Promise<{ ok: true } | { error: string }> {
  const { data, error } = await supabase.functions.invoke("admin-invite-user", {
    body: {
      email: email.trim().toLowerCase(),
      name: name?.trim() || undefined,
      redirectTo: `${window.location.origin}/dashboard`,
    },
  });

  const parsed = parseFnError(error, data);
  if (parsed) return { error: parsed };

  return { ok: true };
}

export async function createUserByAdmin(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<{ ok: true } | { error: string }> {
  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: {
      email: input.email.trim().toLowerCase(),
      password: input.password,
      name: input.name?.trim() || undefined,
    },
  });

  const parsed = parseFnError(error, data);
  if (parsed) return { error: parsed };

  return { ok: true };
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
