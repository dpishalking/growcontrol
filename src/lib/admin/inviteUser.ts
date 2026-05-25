import { supabase } from "@/integrations/supabase/client";

export async function inviteUserByEmail(email: string): Promise<{ ok: true } | { error: string }> {
  const { data, error } = await supabase.functions.invoke("admin-invite-user", {
    body: {
      email: email.trim().toLowerCase(),
      redirectTo: `${window.location.origin}/dashboard`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data && typeof data === "object" && "error" in data && data.error) {
    return { error: String(data.error) };
  }

  return { ok: true };
}
