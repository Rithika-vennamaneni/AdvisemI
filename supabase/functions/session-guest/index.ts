import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let existingId: string | undefined;
    try {
      const body = await req.json();
      existingId = typeof body?.user_id === "string" ? body.user_id : undefined;
    } catch {
      // No body or invalid JSON
    }

    // Check if existing user_id is valid
    if (existingId) {
      const { data, error } = await supabase.auth.admin.getUserById(existingId);
      if (data?.user?.id) {
        return new Response(JSON.stringify({ user_id: data.user.id }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.warn("Provided guest user_id not found", error?.message ?? "Unknown error");
    }

    // Create new guest user
    const email = `guest+${crypto.randomUUID()}@advisemi.local`;
    const password = crypto.randomUUID();

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { guest: true },
    });

    if (error || !data?.user?.id) {
      console.error("Failed to create guest user", error?.message ?? "Unknown error");
      return new Response(
        JSON.stringify({ error: "Failed to create guest user" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Guest user created", data.user.id);
    return new Response(JSON.stringify({ user_id: data.user.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Session guest error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
