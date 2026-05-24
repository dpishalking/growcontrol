import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { CreditCard, LayoutDashboard, LogOut, Shield, Sparkles, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppData } from "@/context/AppDataContext";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isAdminUser } from "@/lib/admin/access";

const NAV = [
  { to: "/dashboard", label: "Проекты", icon: LayoutDashboard },
  { to: "/billing", label: "Тариф", icon: CreditCard },
];

export function AppLayout() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { user: appUser, currentPlan } = useAppData();
  const { user: authUser, guest, signOut } = useAuth();

  const displayName =
    (authUser?.user_metadata as { name?: string } | undefined)?.name ||
    authUser?.email?.split("@")[0] ||
    appUser.name;
  const initials = (displayName || "G").slice(0, 1).toUpperCase();
  const email = authUser?.email ?? (guest ? "Демо-режим" : appUser.email);
  const admin = isAdminUser(authUser?.email ?? null);

  const handleSignOut = async () => {
    await signOut();
    nav("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Link to="/dashboard" className="flex items-center gap-2 font-display font-semibold text-foreground">
            <span className="h-7 w-7 rounded-lg bg-gradient-money flex items-center justify-center text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span className="tracking-tight">GrowControl</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith(to)
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            {admin ? (
              <Link
                to="/admin"
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                )}
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            ) : null}
          </nav>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:inline-flex tabular-nums chip">
              {appUser.credits} кр.
            </Badge>
            <Badge variant="secondary" className="hidden md:inline-flex">{currentPlan.name}</Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 ml-1" aria-label="Меню пользователя">
                  <span className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold">
                    {initials}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="space-y-0.5">
                  <p className="text-sm font-medium truncate">{displayName}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => nav("/billing")}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Тариф и кредиты
                </DropdownMenuItem>
                {admin ? (
                  <DropdownMenuItem onSelect={() => nav("/admin")}>
                    <Shield className="mr-2 h-4 w-4" />
                    Админ-панель
                  </DropdownMenuItem>
                ) : null}
                {authUser ? (
                  <DropdownMenuItem onSelect={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Выйти
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => nav("/auth")}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    Войти / регистрация
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md sm:hidden">
        <div className="flex justify-around py-2">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-1 text-[10px] font-medium",
                pathname.startsWith(to) ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
