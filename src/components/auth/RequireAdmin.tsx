import { Navigate } from "react-router-dom";
import { Loader2, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { isAdminUser } from "@/lib/admin/access";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth?next=/admin" replace />;

  if (!isAdminUser(user.email)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <ShieldOff className="h-10 w-10 text-muted-foreground" />
        <h1 className="font-display text-xl font-bold">Доступ закрыт</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Эта секция доступна только администраторам GrowControl.
        </p>
        <Button asChild variant="outline">
          <a href="/dashboard">Вернуться</a>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
