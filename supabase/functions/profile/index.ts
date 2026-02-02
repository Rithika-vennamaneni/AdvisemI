import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Call AI to identify skill gaps
const identifyGaps = async (
  resumeSkills: string[],
  marketSkills: string[],
  apiKey: string
): Promise<string[]> => {
  if (marketSkills.length === 0) return [];
  
  const prompt = `Compare resume skills with market skills and identify gaps.

RESUME SKILLS (what the candidate has):
${resumeSkills.length > 0 ? resumeSkills.join(", ") : "(none)"}

MARKET SKILLS (what jobs require):
${marketSkills.join(", ")}

Task: Identify which market skills are MISSING from the resume. Consider:
- Semantic similarities (e.g., "React" = "React.js" = "ReactJS")
- Skill hierarchies (e.g., "Python" covers "Python programming")
- Common abbreviations (e.g., "JS" = "JavaScript")

Return STRICT JSON only: {"gaps": ["skill1", "skill2", ...]}
If no gaps, return: {"gaps": []}`;

  try {
    const response = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error("Gap analysis AI call failed:", response.status);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.gaps)) {
      return parsed.gaps.filter((s: unknown) => typeof s === "string" && s.trim());
    }
    return [];
  } catch (err) {
    console.error("Gap analysis error:", err);
    return [];
  }
};

// Generate market skills from dream role if none exist
const generateMarketSkills = async (
  dreamRole: string,
  apiKey: string
): Promise<string[]> => {
  const prompt = `List the top 15 most important technical skills required for a ${dreamRole} position.

Return STRICT JSON only: {"skills": ["skill1", "skill2", ...]}
Focus on:
- Programming languages and frameworks
- Tools and technologies
- Domain-specific skills
- Industry-standard certifications or methodologies`;

  try {
    const response = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400,
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error("Market skills generation failed:", response.status);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.skills)) {
      return parsed.skills.filter((s: unknown) => typeof s === "string" && s.trim());
    }
    return [];
  } catch (err) {
    console.error("Market skills generation error:", err);
    return [];
  }
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const { dream_role, term, user_id } = body;

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!dream_role) {
      return new Response(
        JSON.stringify({ error: "dream_role is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if profile exists
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user_id)
      .maybeSingle();

    if (existing?.id) {
      // Update existing profile
      const { error } = await supabase
        .from("profiles")
        .update({
          dream_role,
          term: term ?? null,
        })
        .eq("user_id", user_id);

      if (error) {
        console.error("Failed to update profile:", error);
        return new Response(
          JSON.stringify({ error: `Failed to update profile: ${error.message}` }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else {
      // Create new profile
      const { error } = await supabase.from("profiles").insert({
        user_id,
        dream_role,
        term: term ?? null,
      });

      if (error) {
        console.error("Failed to create profile:", error);
        return new Response(
          JSON.stringify({ error: `Failed to create profile: ${error.message}` }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    console.log("Profile saved", { user_id, dream_role, term });

    // Check for resume skills
    const { data: resumeSkillsData } = await supabase
      .from("skills")
      .select("skill_name")
      .eq("user_id", user_id)
      .eq("source", "resume");

    const resumeSkills = (resumeSkillsData || []).map((s) => s.skill_name);

    if (resumeSkills.length > 0) {
      console.log("Running gap analysis", { user_id, resume_skills: resumeSkills.length });

      // Get or generate market skills
      let { data: marketSkillsData } = await supabase
        .from("skills")
        .select("skill_name")
        .eq("user_id", user_id)
        .eq("source", "market");

      let marketSkills = (marketSkillsData || []).map((s) => s.skill_name);

      // If no market skills exist, generate them based on dream role
      if (marketSkills.length === 0) {
        console.log("Generating market skills for role:", dream_role);
        const generatedSkills = await generateMarketSkills(dream_role, lovableApiKey);
        
        if (generatedSkills.length > 0) {
          const marketRows = generatedSkills.map((skillName) => ({
            user_id,
            source: "market",
            skill_name: skillName,
            dream_role,
            score: 1.0,
          }));
          
          await supabase.from("skills").insert(marketRows);
          marketSkills = generatedSkills;
          console.log("Generated market skills:", generatedSkills.length);
        }
      }

      // Run gap analysis
      const gaps = await identifyGaps(resumeSkills, marketSkills, lovableApiKey);
      console.log("Gap analysis result:", { gaps_found: gaps.length });

      if (gaps.length > 0) {
        // Clear old gap skills for this user
        await supabase.from("gap_skills").delete().eq("user_id", user_id);

        // Insert new gap skills with priorities
        const gapRows = gaps.map((skillName, index) => ({
          user_id,
          skill_name: skillName,
          priority: Math.floor(index / 2) + 1, // Groups of 2 per priority level
          reason: "Missing from resume; appears in job listings.",
        }));

        const { error: gapError } = await supabase.from("gap_skills").insert(gapRows);
        if (gapError) {
          console.error("Failed to insert gap skills:", gapError);
        } else {
          console.log("Gap skills inserted:", gapRows.length);
        }
      }
    } else {
      console.log("No resume skills found, skipping gap analysis", { user_id });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Profile error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
