import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowRight,
  FlaskConical,
  LineChart,
  Loader2,
  Mail,
  ScanSearch,
} from "lucide-react";
import { AppBrand } from "@/components/layout/AppBrand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { resolveAuthEmail, validateLogin } from "@/lib/authLogin";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup" | "magic";

const HERO_THESES = [
  {
    icon: ScanSearch,
    title: "AI-аудит воронки",
    body: "CRO-фреймворки находят узкие места в материалах и этапах.",
    accent: "from-primary/20 to-primary/5",
  },
  {
    icon: LineChart,
    title: "Гипотезы по метрикам",
    body: "Не «здравый смысл», а plan/fact и главный ограничитель.",
    accent: "from-accent/20 to-accent/5",
  },
  {
    icon: FlaskConical,
    title: "План тестов ICE",
    body: "Приоритет, очерёдность запуска и контроль результата.",
    accent: "from-success/20 to-success/5",
  },
] as const;

export default function AuthPage() {
  const { user, loading, signIn, signUp, signInWithMagicLink } = useAuth();
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

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 grid-noise opacity-40 pointer-events-none" />
      <div
        className="auth-orb absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.22), transparent 68%)" }}
      />
      <div
        className="auth-orb auth-orb-delay absolute -bottom-48 right-[10%] h-[520px] w-[520px] rounded-full blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.16), transparent 70%)" }}
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-5 py-8 sm:px-8 lg:px-10">
        <div className="auth-hero-rise mb-8 lg:mb-10">
          <AppBrand iconClassName="h-9 w-9 rounded-xl" />
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,380px)] lg:gap-14 xl:gap-16">
          <section className="relative space-y-7 lg:space-y-8">
            <h1 className="auth-hero-rise auth-hero-rise-delay-1 relative font-display text-[1.75rem] font-bold leading-[1.12] tracking-tight sm:text-4xl lg:text-[2.75rem] xl:text-5xl">
              Управляйте ростом через{" "}
              <span className="bg-gradient-money bg-clip-text text-transparent">
                тест и&nbsp;внедрение гипотез
              </span>
            </h1>

            <p className="auth-hero-rise auth-hero-rise-delay-2 relative max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:max-w-xl lg:text-lg lg:leading-relaxed">
              AI-система анализирует воронку, материалы и ключевые метрики проекта, чтобы помочь вам
              быстро находить точки роста, тестировать гипотезы и масштабировать то, что реально влияет
              на прибыль.
            </p>

            <ul className="relative hidden space-y-3 sm:grid sm:grid-cols-1 sm:gap-3 lg:max-w-xl">
              {HERO_THESES.map((item, i) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.title}
                    className={cn(
                      "auth-thesis-card auth-hero-rise rounded-2xl p-4",
                      i === 0 && "auth-hero-rise-delay-2",
                      i === 1 && "auth-hero-rise-delay-3",
                      i === 2 && "auth-hero-rise-delay-4",
                    )}
                  >
                    <div className="flex gap-3.5">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br",
                          item.accent,
                        )}
                      >
                        <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <p className="font-display text-sm font-semibold tracking-tight text-foreground sm:text-base">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                          {item.body}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <main className="auth-hero-rise auth-hero-rise-delay-3 w-full">
            <div className="auth-form-panel fade-in space-y-5 rounded-2xl border border-border/50 p-6 backdrop-blur-md sm:p-7">
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
                    <PasswordInput
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Минимум 6 символов"
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      required
                      minLength={6}
                    />
                  </div>
                )}

                <Button type="submit" className="w-full bg-gradient-money text-primary-foreground shadow-glow" disabled={busy}>
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
            </div>
          </main>
        </div>

        <p className="auth-hero-rise auth-hero-rise-delay-4 mt-10 text-center text-xs text-muted-foreground lg:mt-12 lg:text-left">
          © {new Date().getFullYear()} GrowControl · controlgrow.ru
        </p>
      </div>
    </div>
  );
}
