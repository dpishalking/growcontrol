import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FlaskConical,
  FolderKanban,
  LogOut,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin", end: true, label: "Обзор", icon: LayoutDashboard },
  { to: "/admin/users", label: "Пользователи", icon: Users },
  { to: "/admin/projects", label: "Проекты", icon: FolderKanban },
  { to: "/admin/hypotheses", label: "Гипотезы", icon: FlaskConical },
];

export function AdminLayout() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border/60 bg-card/60 backdrop-blur">
        <div className="px-5 py-5 border-b border-border/60">
          <Link to="/admin" className="flex items-center gap-2 font-display font-semibold">
            <span className="h-7 w-7 rounded-lg bg-gradient-money flex items-center justify-center text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span className="tracking-tight">GrowControl</span>
            <span className="ml-1 text-[10px] uppercase tracking-widest text-muted-foreground">admin</span>
          </Link>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 space-y-2 border-t border-border/60">
          <Button asChild variant="ghost" size="sm" className="w-full justify-start">
            <Link to="/dashboard">
              <ExternalLink className="mr-2 h-4 w-4" />В сервис
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={async () => {
              await signOut();
              nav("/auth");
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Выйти
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border/60 bg-background/80 backdrop-blur-xl px-4 md:px-6 py-3">
          <h1 className="font-display text-base font-semibold truncate">{titleFromPath(pathname)}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline text-xs text-muted-foreground truncate max-w-[200px]">
              {user?.email}
            </span>
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard">
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">В сервис</span>
              </Link>
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function titleFromPath(p: string): string {
  if (p === "/admin" || p === "/admin/") return "Обзор";
  if (p.startsWith("/admin/users/")) return "Кабинет пользователя";
  if (p.startsWith("/admin/users")) return "Пользователи";
  if (p.startsWith("/admin/projects")) return "Проекты";
  if (p.startsWith("/admin/hypotheses")) return "Гипотезы";
  return "Admin";
}
