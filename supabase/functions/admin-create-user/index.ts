import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { ensureProfile } from "../_shared/ensureProfile.ts";
import { loginToAuthEmail, normalizeLogin, validateLogin } from "../_shared/authLogin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { data: isAdmin, error: adminError } = await userClient.rpc("is_admin");
    if (adminError || !isAdmin) {
      return json({ error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const loginRaw = String(body.login ?? "").trim();
    const emailRaw = String(body.email ?? "").trim().toLowerCase();
    const name = String(body.name ?? "").trim();
    const password = String(body.password ?? "");

    let email = emailRaw;
    let login = loginRaw ? normalizeLogin(loginRaw) : "";

    if (login) {
      const loginError = validateLogin(login);
      if (loginError) {
        return json({ error: loginError }, 400);
      }
      email = loginToAuthEmail(login);
    } else if (!email || !email.includes("@")) {
      return json({ error: "Invalid login or email" }, 400);
    }

    if (password.length < 6) {
      return json({ error: "Password must be at least 6 characters" }, 400);
    }

    const displayName = name || login || email.split("@")[0];
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        login: login || undefined,
        name: displayName,
        full_name: displayName,
      },
    });

    if (error) {
      return json({ error: error.message }, 400);
    }

    const userId = data.user?.id;
    if (userId) {
      await ensureProfile(adminClient, userId, email, displayName);
    }

    return json({ ok: true, userId: userId ?? null, login: login || null });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
