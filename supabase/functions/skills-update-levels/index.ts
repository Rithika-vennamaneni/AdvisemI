import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SkillUpdate {
  skill_name: string;
  expertise_level: string;
}

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

    const body = await req.json();
    const { user_id, run_id, updates } = body as {
      user_id?: string;
      run_id?: string;
      updates?: SkillUpdate[];
    };

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!updates || !Array.isArray(updates)) {
      return new Response(
        JSON.stringify({ error: "updates array is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const updatedSkills: SkillUpdate[] = [];
    const notFoundSkills: string[] = [];

    for (const update of updates) {
      const { skill_name, expertise_level } = update;

      if (!skill_name || !expertise_level) {
        continue;
      }

      const { data, error } = await supabase
        .from("skills")
        .update({ expertise_level })
        .eq("user_id", user_id)
        .eq("skill_name", skill_name)
        .eq("source", "resume")
        .select("skill_name");

      if (error) {
        console.error("Failed to update skill:", skill_name, error);
        notFoundSkills.push(skill_name);
      } else if (data && data.length > 0) {
        updatedSkills.push({ skill_name, expertise_level });
      } else {
        notFoundSkills.push(skill_name);
      }
    }

    console.log("Skills updated", {
      user_id,
      run_id,
      updated_count: updatedSkills.length,
      not_found_count: notFoundSkills.length,
    });

    return new Response(
      JSON.stringify({
        updated_count: updatedSkills.length,
        updated: updatedSkills,
        not_found: notFoundSkills,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Skills update error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
