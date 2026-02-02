import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Normalize skill names for deduplication
const normalizeSkillName = (name: string): string => {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
};

// Deduplicate skills
const dedupeSkills = (skills: string[], limit = 10): string[] => {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const skill of skills) {
    const trimmed = skill.trim();
    if (!trimmed) continue;
    const key = normalizeSkillName(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(trimmed);
    if (output.length >= limit) break;
  }
  return output;
};

// Call Lovable AI Gateway
const callAI = async (
  prompt: string,
  apiKey: string
): Promise<{ skills: string[] } | null> => {
  try {
    const response = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400,
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error("AI request failed:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.skills)) {
      return { skills: parsed.skills.filter((s: unknown) => typeof s === "string") };
    }
    return null;
  } catch (err) {
    console.error("AI call error:", err);
    return null;
  }
};

// Extract text from PDF using AI (since PDF parsing in Deno is complex)
const extractTextFromPdfWithAI = async (
  base64Content: string,
  apiKey: string
): Promise<string | null> => {
  try {
    const response = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "file",
                file: {
                  filename: "resume.pdf",
                  file_data: `data:application/pdf;base64,${base64Content}`,
                },
              },
              {
                type: "text",
                text: "Extract all the text content from this PDF resume. Return only the raw text, no formatting or markdown.",
              },
            ],
          },
        ],
        max_tokens: 4000,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      console.error("PDF extraction failed:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error("PDF extraction error:", err);
    return null;
  }
};

// Extract candidate skills from resume text
const extractCandidateSkills = async (
  resumeText: string,
  apiKey: string
): Promise<string[] | null> => {
  const maxChars = 8000;
  const sliced = resumeText.slice(0, maxChars);

  const prompt = `Extract concrete, course-searchable skills explicitly mentioned in the resume.
Return STRICT JSON only. No markdown or explanations.
Schema: {"skills":["string"]}
Rules:
- Only include concrete technologies, tools, frameworks, certifications, or domain skills.
- Exclude generic responsibilities, soft phrases, companies, locations, or vague nouns.
- Use concise canonical names (e.g., PostgreSQL, FastAPI, AWS, Git).
- Deduplicate.
- Return at most 30 skills.

Resume text:
${sliced}`;

  const result = await callAI(prompt, apiKey);
  if (!result) return null;
  return dedupeSkills(result.skills, 30);
};

// Select top skills for the target role
const selectTopSkills = async (
  targetRole: string,
  candidates: string[],
  apiKey: string
): Promise<string[] | null> => {
  if (candidates.length === 0) return [];

  const prompt = `Select the TOP 10 skills to improve for the target role.
Return STRICT JSON only. No markdown or explanations.
Schema: {"skills":["string"]}
Rules:
- Choose up to 10 total.
- Skills must come from the candidate list.
- Must be relevant to the target role and worth strengthening.
- Exclude vague, generic, or non-course-searchable items.
- Deduplicate and use canonical names.

Target role:
${targetRole}

Candidate skills:
${candidates.join(", ")}`;

  const result = await callAI(prompt, apiKey);
  if (!result) return null;
  return dedupeSkills(result.skills, 10);
};

// Categorize skills into groups
const categorizeSkills = (skills: string[]): Record<string, string[]> => {
  const categories: Record<string, string[]> = {
    technical: [],
    tools: [],
    frameworks: [],
    soft: [],
    other: [],
  };

  skills.forEach((skill) => {
    categories.technical.push(skill);
  });

  return categories;
};

// Helper to encode array buffer to base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("user_id") as string | null;
    const runId = formData.get("run_id") as string | null;
    const dreamRole = formData.get("dream_role") as string | null;
    const term = formData.get("term") as string | null;

    if (!file) {
      return new Response(JSON.stringify({ detail: "Missing file upload." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ detail: "user_id is required to persist resume data" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check file type
    if (!file.type.includes("pdf")) {
      return new Response(
        JSON.stringify({ detail: "Only PDF resumes are supported." }),
        {
          status: 415,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Convert PDF to base64 and extract text using AI
    const arrayBuffer = await file.arrayBuffer();
    const base64Content = arrayBufferToBase64(arrayBuffer);
    const text = await extractTextFromPdfWithAI(base64Content, lovableApiKey);

    if (!text) {
      return new Response(
        JSON.stringify({ detail: "Failed to extract text from PDF" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get dream role from profile if not provided
    let resolvedRole = dreamRole ?? undefined;
    if (!resolvedRole) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("dream_role")
        .eq("user_id", userId)
        .maybeSingle();
      resolvedRole = profile?.dream_role ?? undefined;
    }

    // Extract skills using AI
    const candidateSkills = await extractCandidateSkills(text, lovableApiKey);
    let topSkills: string[] | null = null;

    if (candidateSkills && candidateSkills.length > 0) {
      const roleForPrompt =
        resolvedRole && resolvedRole.trim().length > 0 ? resolvedRole : "the target role";
      topSkills = await selectTopSkills(roleForPrompt, candidateSkills, lovableApiKey);
    }

    // Fallback to candidate skills if top skills extraction failed
    if (!topSkills || topSkills.length === 0) {
      topSkills = candidateSkills?.slice(0, 10) ?? [];
    }

    const finalTopSkills = dedupeSkills(topSkills ?? [], 10);
    const canonicalSkills = categorizeSkills(finalTopSkills);

    // Create or get run
    let resolvedRunId: string;
    if (runId) {
      const { data: existing } = await supabase
        .from("runs")
        .select("id")
        .eq("id", runId)
        .maybeSingle();

      if (existing?.id) {
        resolvedRunId = existing.id as string;
      } else {
        await supabase.from("runs").insert({
          id: runId,
          user_id: userId,
          dream_role: resolvedRole ?? null,
          term: term ?? null,
        });
        resolvedRunId = runId;
      }
    } else {
      const { data, error } = await supabase
        .from("runs")
        .insert({
          user_id: userId,
          dream_role: resolvedRole ?? null,
          term: term ?? null,
        })
        .select("id")
        .single();

      if (error || !data?.id) {
        throw new Error(`Failed to create run: ${error?.message ?? "Unknown error"}`);
      }
      resolvedRunId = data.id as string;
    }

    // Save resume document
    await supabase.from("documents").delete().eq("user_id", userId).eq("type", "resume");
    await supabase.from("documents").insert({
      user_id: userId,
      type: "resume",
      raw_text: text,
    });

    // Save resume skills
    await supabase.from("skills").delete().eq("user_id", userId).eq("source", "resume");

    let skillsSaved = 0;
    if (finalTopSkills.length > 0) {
      const rows = finalTopSkills.map((skillName) => ({
        user_id: userId,
        source: "resume",
        skill_name: skillName,
        dream_role: resolvedRole ?? null,
      }));
      await supabase.from("skills").insert(rows);
      skillsSaved = rows.length;
    }

    console.log("Resume parsed and saved", {
      user_id: userId,
      run_id: resolvedRunId,
      skills_saved: skillsSaved,
    });

    const response = {
      education: [],
      work_experience: [],
      projects: [],
      canonical_skills: canonicalSkills,
      top_skills: finalTopSkills,
      learning_skills: {},
      user_id: userId,
      run_id: resolvedRunId,
      documents_saved: 1,
      skills_saved: skillsSaved,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Resume parse error:", err);
    return new Response(
      JSON.stringify({
        detail: `Resume parse failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
