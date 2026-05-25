import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FlaskConical,
  FolderKanban,
  LogOut,
  ExternalLink,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddParticipantDialog } from "@/components/admin/AddParticipantDialog";
import { AppBrand } from "@/components/layout/AppBrand";
import { AdminShellProvider, useAdminShell } from "@/components/admin/AdminShellContext";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin", end: true, label: "Обзор", icon: LayoutDashboard },
  { to: "/admin/users", label: "Участники", icon: Users },
  { to: "/admin/projects", label: "Проекты", icon: FolderKanban },
  { to: "/admin/hypotheses", label: "Гипотезы", icon: FlaskConical },
];

export function AdminLayout() {
  return (
    <AdminShellProvider>
      <AdminLayoutInner />
    </AdminShellProvider>
  );
}

function AdminLayoutInner() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const {
    addParticipantOpen,
    openAddParticipant,
    closeAddParticipant,
    notifyParticipantsChanged,
  } = useAdminShell();

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border/60 bg-card/60 backdrop-blur">
        <div className="px-5 py-5 border-b border-border/60">
          <Link to="/admin" className="block">
            <AppBrand
              suffix={
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  admin
                </span>
              }
            />
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
          <Button
            size="sm"
            className="w-full justify-start bg-gradient-money text-primary-foreground"
            onClick={openAddParticipant}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Добавить участника
          </Button>
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
            <AddParticipantDialog
              open={addParticipantOpen}
              onOpenChange={(next) => (next ? openAddParticipant() : closeAddParticipant())}
              onSuccess={notifyParticipantsChanged}
              trigger={
                <Button size="sm" className="bg-gradient-money text-primary-foreground">
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                  <span className="hidden sm:inline">Добавить участника</span>
                  <span className="sm:hidden">Добавить</span>
                </Button>
              }
            />
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
  if (p.startsWith("/admin/users/")) return "Кабинет участника";
  if (p.startsWith("/admin/users")) return "Участники";
  if (p.startsWith("/admin/projects")) return "Проекты";
  if (p.startsWith("/admin/hypotheses")) return "Гипотезы";
  return "Admin";
}
