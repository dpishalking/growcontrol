import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isAdminUser } from "@/lib/admin/access";
import { useAuth } from "@/hooks/useAuth";

export function useAdminAccess() {
  const { user, loading: authLoading } = useAuth();
  const [dbAdmin, setDbAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let cancel = false;

    if (!user) {
      setDbAdmin(false);
      return;
    }

    if (!isAdminUser(user.email)) {
      setDbAdmin(false);
      return;
    }

    supabase.rpc("is_admin").then(({ data, error }) => {
      if (cancel) return;
      setDbAdmin(Boolean(data) && !error);
    });

    return () => {
      cancel = true;
    };
  }, [user]);

  const loading = authLoading || (user && isAdminUser(user.email) && dbAdmin === null);
  const isAdmin = Boolean(user && isAdminUser(user.email) && dbAdmin);

  return { isAdmin, loading: Boolean(loading), dbReady: dbAdmin !== null };
}
