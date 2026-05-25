import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/** Гарантирует строку в profiles после создания/приглашения через service role. */
export async function ensureProfile(
  adminClient: SupabaseClient,
  userId: string,
  email: string,
  name?: string,
): Promise<void> {
  const displayName = name?.trim() || email.split("@")[0] || email;
  const { error } = await adminClient.from("profiles").upsert(
    {
      user_id: userId,
      email,
      display_name: displayName,
    },
    { onConflict: "user_id" },
  );
  if (error) {
    throw new Error(`Profile upsert failed: ${error.message}`);
  }
}
