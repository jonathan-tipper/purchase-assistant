import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const VENICE_API_URL = "https://api.venice.ai/api/v1/chat/completions";
const VENICE_API_KEY = Deno.env.get("VENICE_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a personal purchase analyst. Given a user's purchase journal entries, identify patterns and provide insights.

Your analysis should cover:
1. Spending patterns — categories or price ranges where the user tends to be most/least satisfied
2. Value insights — which purchases gave the best value (high satisfaction, frequent use)
3. Regret patterns — any common factors in purchases they wouldn't buy again
4. Actionable advice — specific, personalized recommendations for future buying decisions

Be specific and reference actual entries when possible. Keep your response concise and friendly (under 250 words).`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { entries, userItems = [] } = await req.json();

    const entryDescriptions = entries
      .map(
        (e: any) =>
          `"${e.name}" — £${e.actual_price}, bought ${e.purchase_date}, satisfaction: ${e.satisfaction_score}/10, ${e.would_buy_again ? "would buy again" : "would NOT buy again"}, uses/week: ${e.actual_uses_per_week || "unknown"}${e.notes ? `, notes: "${e.notes}"` : ""}`
      )
      .join("\n");

    const response = await fetch(VENICE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VENICE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "zai-org-glm-4.7",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Here are my purchase journal entries:\n${entryDescriptions}\n\nPlease analyze my purchasing patterns and give me insights.`,
          },
        ],
        max_tokens: 512,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Venice API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "Unable to generate insights.";

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
