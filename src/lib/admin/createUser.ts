import { validateLogin } from "@/lib/authLogin";
import { supabase } from "@/integrations/supabase/client";

type FnErrorBody = { error?: string; message?: string; code?: string };

async function readFnErrorBody(error: unknown): Promise<FnErrorBody | null> {
  if (!error || typeof error !== "object") return null;
  const ctx = (error as { context?: Response }).context;
  if (!ctx || typeof ctx.json !== "function") return null;
  try {
    return (await ctx.clone().json()) as FnErrorBody;
  } catch {
    return null;
  }
}

async function parseFnError(error: unknown, data: unknown): Promise<string | null> {
  if (data && typeof data === "object") {
    const body = data as FnErrorBody;
    if (body.error) return humanizeAdminUserError(String(body.error));
    if (body.message && body.code) return humanizeAdminUserError(String(body.message));
    if ("ok" in data && (data as { ok?: boolean }).ok === true) return null;
  }

  const body = await readFnErrorBody(error);
  if (body?.error) return humanizeAdminUserError(String(body.error));
  if (body?.message) return humanizeAdminUserError(String(body.message));

  if (error && typeof error === "object" && "name" in error) {
    const name = String((error as { name: string }).name);
    if (name === "FunctionsFetchError") {
      return "Не удалось связаться с сервером. Проверьте интернет и попробуйте снова.";
    }
    if (name === "FunctionsRelayError") {
      return "Ошибка Supabase Relay при вызове функции.";
    }
    if ("message" in error) {
      const message = String((error as { message: string }).message);
      if (message !== "Edge Function returned a non-2xx status code") {
        return humanizeAdminUserError(message);
      }
    }
  }

  return "Не удалось создать участника. Проверьте права администратора и деплой admin-create-user.";
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
  if (m.includes("profile upsert failed")) return "Аккаунт создан, но профиль не сохранился — напишите в поддержку";
  if (m.includes("forbidden")) return "Нет прав администратора";
  if (m.includes("unauthorized")) return "Войдите в аккаунт администратора";
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

  const parsed = await parseFnError(error, data);
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

  const parsed = await parseFnError(error, data);
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
