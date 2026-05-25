import { supabase } from "@/integrations/supabase/client";

export type AdminProfile = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
};

const PROFILE_SELECT = "user_id,email,display_name,created_at";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Повторяет запрос — профиль может появиться с небольшой задержкой после edge function. */
export async function fetchAdminProfiles(options?: {
  retries?: number;
  delayMs?: number;
}): Promise<{ data: AdminProfile[]; error: string | null }> {
  const retries = options?.retries ?? 4;
  const delayMs = options?.delayMs ?? 350;
  let lastError: string | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .order("created_at", { ascending: false });

    if (!error) {
      return { data: (data ?? []) as AdminProfile[], error: null };
    }

    lastError = error.message;
    if (attempt < retries - 1) await sleep(delayMs);
  }

  return { data: [], error: lastError };
}
