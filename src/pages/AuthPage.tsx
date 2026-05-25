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
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 grid-noise opacity-40 pointer-events-none" />
      <div
        className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.18), transparent 70%)" }}
      />
      <div
        className="absolute -bottom-40 right-1/4 w-[460px] h-[460px] rounded-full blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.18), transparent 70%)" }}
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-5 py-8 sm:px-8 lg:px-10">
        <div className="mb-8 flex items-center gap-2 font-display text-lg font-bold lg:mb-10">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-money text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          GrowControl
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,380px)] lg:gap-14 xl:gap-20">
          <section className="space-y-6 lg:space-y-8">
            <h1 className="font-display text-[1.75rem] font-bold leading-[1.15] tracking-tight sm:text-4xl lg:text-[2.75rem] xl:text-5xl">
              Управляйте ростом через{" "}
              <span className="bg-gradient-money bg-clip-text text-transparent">
                тест и&nbsp;внедрение гипотез
              </span>
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:text-xl lg:leading-relaxed">
              AI-система анализирует воронку, материалы и ключевые метрики проекта, чтобы помочь вам
              быстро находить точки роста, тестировать гипотезы и масштабировать то, что реально влияет
              на прибыль.
            </p>
            <ul className="hidden space-y-2.5 text-sm text-muted-foreground sm:block lg:text-base">
              {[
                "AI-аудит воронки на базе CRO-фреймворков",
                "Гипотезы по метрикам, не по «здравому смыслу»",
                "План тестов по приоритету ICE",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <main className="w-full">
            <div className="fade-in space-y-5 rounded-2xl border border-border/60 bg-card/40 p-6 shadow-sm backdrop-blur-sm sm:p-7">
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
                  <span className="bg-card/80 px-2">или</span>
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={handleGuest}>
                Продолжить без входа (демо)
              </Button>

              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                В демо-режиме данные хранятся только в этом браузере. Войдите, чтобы они сохранялись на
                всех устройствах.
              </p>
            </div>
          </main>
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground lg:mt-12 lg:text-left">
          © {new Date().getFullYear()} GrowControl · controlgrow.ru
        </p>
      </div>
    </div>
  );
}
