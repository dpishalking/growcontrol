import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut, Shield, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
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
import { AppBrand } from "@/components/layout/AppBrand";

const NAV = [{ to: "/dashboard", label: "Главная", icon: LayoutDashboard }];

export function AppLayout() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { user: authUser, guest, signOut } = useAuth();

  const displayName =
    (authUser?.user_metadata as { name?: string } | undefined)?.name ||
    authUser?.email?.split("@")[0] ||
    "Пользователь";
  const initials = (displayName || "G").slice(0, 1).toUpperCase();
  const email = authUser?.email ?? (guest ? "Демо-режим" : "");
  const admin = isAdminUser(authUser?.email ?? null);

  const handleSignOut = async () => {
    await signOut();
    nav("/auth", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex h-[3.75rem] max-w-6xl items-center justify-between gap-3 px-4">
          <Link to="/dashboard" className="min-w-0">
            <AppBrand />
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith(to)
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
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
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            ) : null}
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ml-1 h-9 w-9 rounded-full"
                aria-label="Меню пользователя"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-money text-xs font-semibold text-primary-foreground">
                  {initials}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="space-y-0.5">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <p className="truncate text-[11px] text-muted-foreground">{email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
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
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 sm:py-8">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md sm:hidden">
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
          {admin ? (
            <Link
              to="/admin"
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-1 text-[10px] font-medium",
                pathname.startsWith("/admin") ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Shield className="h-5 w-5" />
              Admin
            </Link>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
