import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AuthState = {
  session: Session | null;
  user: SupabaseUser | null;
  loading: boolean;
  /** true, если включён режим без входа (демо). */
  guest: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error?: string }>;
  signInWithMagicLink: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

const GUEST_FLAG = "growcontrol_guest_mode";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [guest, setGuest] = useState<boolean>(() => localStorage.getItem(GUEST_FLAG) === "1");

  useEffect(() => {
    let mounted = true;

    const apply = (s: Session | null) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      if (s?.user) {
        localStorage.removeItem(GUEST_FLAG);
        setGuest(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => apply(s));
    supabase.auth.getSession().then(({ data: { session: s } }) => apply(s));

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback<AuthState["signIn"]>(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: humanizeAuthError(error.message) };
    return {};
  }, []);

  const signUp = useCallback<AuthState["signUp"]>(async (email, password, name) => {
    const redirectTo = `${window.location.origin}/dashboard`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: name ? { name } : undefined,
      },
    });
    if (error) return { error: humanizeAuthError(error.message) };
    return {};
  }, []);

  const signInWithMagicLink = useCallback<AuthState["signInWithMagicLink"]>(async (email) => {
    const redirectTo = `${window.location.origin}/dashboard`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) return { error: humanizeAuthError(error.message) };
    return {};
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(GUEST_FLAG);
    setGuest(false);
  }, []);

  const continueAsGuest = useCallback(() => {
    localStorage.setItem(GUEST_FLAG, "1");
    setGuest(true);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ session, user, loading, guest, signIn, signUp, signInWithMagicLink, signOut, continueAsGuest }),
    [session, user, loading, guest, signIn, signUp, signInWithMagicLink, signOut, continueAsGuest],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}

function humanizeAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "Неверный e-mail или пароль";
  if (m.includes("email not confirmed")) return "Подтвердите e-mail по ссылке из письма";
  if (m.includes("user already registered")) return "Пользователь уже зарегистрирован — войдите";
  if (m.includes("password should be at least")) return "Пароль слишком короткий (минимум 6 символов)";
  if (m.includes("rate limit")) return "Слишком много попыток. Подождите минуту";
  if (m.includes("invalid email")) return "Некорректный e-mail";
  if (m.includes("signup is disabled")) return "Регистрация временно отключена";
  if (m.includes("over_email_send_rate_limit")) return "Письмо уже отправлено. Подождите минуту";
  return msg;
}
