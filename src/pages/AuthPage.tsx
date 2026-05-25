import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Loader2, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveAuthEmail, validateLogin } from "@/lib/authLogin";
import { useAuth } from "@/hooks/useAuth";

type Mode = "login" | "signup" | "magic";

export default function AuthPage() {
  const { user, loading, guest, signIn, signUp, signInWithMagicLink, continueAsGuest } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const next = new URLSearchParams(location.search).get("next") || "/dashboard";

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user) return <Navigate to={next} replace />;
  if (guest && next === "/dashboard") return <Navigate to={next} replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;

    if (mode === "magic") {
      if (!email.trim()) {
        toast.error("Введите e-mail");
        return;
      }
      setBusy(true);
      const { error } = await signInWithMagicLink(email.trim());
      setBusy(false);
      if (error) {
        toast.error(error);
      } else {
        toast.success("Письмо со ссылкой отправлено. Проверьте почту.");
      }
      return;
    }

    if (!email.trim() || password.length < 6) {
      toast.error("Логин и пароль (от 6 символов) обязательны");
      return;
    }

    const authEmail = email.includes("@") ? email.trim().toLowerCase() : resolveAuthEmail(email);
    if (!email.includes("@")) {
      const loginError = validateLogin(email);
      if (loginError) {
        toast.error(loginError);
        return;
      }
    }

    setBusy(true);
    const result =
      mode === "signup"
        ? await signUp(authEmail, password, name.trim() || undefined)
        : await signIn(authEmail, password);
    setBusy(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (mode === "signup") {
      toast.success("Аккаунт создан. Если включено подтверждение — проверьте e-mail.");
    } else {
      toast.success("Вход выполнен");
    }
    nav(next, { replace: true });
  };

  const handleGuest = () => {
    continueAsGuest();
    nav("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <aside className="hidden lg:flex flex-col justify-between p-10 relative overflow-hidden">
        <div className="absolute inset-0 grid-noise opacity-40 pointer-events-none" />
        <div
          className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.18), transparent 70%)" }}
        />
        <div
          className="absolute -bottom-40 -right-20 w-[460px] h-[460px] rounded-full blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.18), transparent 70%)" }}
        />

        <div className="relative flex items-center gap-2 font-display font-bold text-lg">
          <span className="h-9 w-9 rounded-xl bg-gradient-money flex items-center justify-center text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          GrowControl
        </div>

        <div className="relative space-y-6 max-w-md">
          <h1 className="font-display text-4xl font-bold tracking-tight leading-tight">
            Управляйте ростом
            <br />
            <span className="bg-gradient-money bg-clip-text text-transparent">через гипотезы</span>
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Воронка → материалы → AI-аудит → метрики → 10 SMART-гипотез → план тестов. Без хаоса в
            Notion и табличках.
          </p>
          <ul className="space-y-3 text-sm">
            {[
              "AI-аудит воронки на базе CRO-фреймворков",
              "Гипотезы по метрикам, не по «здравому смыслу»",
              "План тестов по приоритету ICE",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-xs text-muted-foreground">
          © {new Date().getFullYear()} GrowControl · controlgrow.ru
        </div>
      </aside>

      <main className="flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-6 fade-in">
          <div className="space-y-1 text-center lg:text-left">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              {mode === "signup" ? "Создать аккаунт" : mode === "magic" ? "Вход по ссылке" : "Войти"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === "signup"
                ? "Бесплатно. Без карты."
                : mode === "magic"
                  ? "Отправим письмо с одноразовой ссылкой"
                  : "Введите логин и пароль"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Имя</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Как к вам обращаться" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">{mode === "magic" ? "E-mail" : "Логин"}</Label>
              <Input
                type={mode === "magic" ? "email" : "text"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === "magic" ? "you@example.com" : "ivan_petrov"}
                autoComplete={mode === "magic" ? "email" : "username"}
                required
              />
            </div>

            {mode !== "magic" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Пароль</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  required
                  minLength={6}
                />
              </div>
            )}

            <Button type="submit" className="w-full bg-gradient-money text-primary-foreground" disabled={busy}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              {mode === "signup" ? "Создать аккаунт" : mode === "magic" ? "Отправить ссылку" : "Войти"}
            </Button>
          </form>

          <div className="space-y-2 text-center text-xs text-muted-foreground">
            {mode === "login" && (
              <>
                <button
                  type="button"
                  onClick={() => setMode("magic")}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Войти по ссылке без пароля
                </button>
                <p>
                  Нет аккаунта?{" "}
                  <button type="button" onClick={() => setMode("signup")} className="text-primary hover:underline">
                    Зарегистрироваться
                  </button>
                </p>
              </>
            )}
            {mode === "signup" && (
              <p>
                Уже есть аккаунт?{" "}
                <button type="button" onClick={() => setMode("login")} className="text-primary hover:underline">
                  Войти
                </button>
              </p>
            )}
            {mode === "magic" && (
              <p>
                <button type="button" onClick={() => setMode("login")} className="text-primary hover:underline">
                  ← Назад к паролю
                </button>
              </p>
            )}
          </div>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider text-muted-foreground">
              <span className="bg-background px-2">или</span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleGuest}>
            Продолжить без входа (демо)
          </Button>

          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            В демо-режиме данные хранятся только в этом браузере. Войдите, чтобы они сохранялись на
            всех устройствах.
          </p>
        </div>
      </main>
    </div>
  );
}
