import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const VENICE_API_URL = "https://api.venice.ai/api/v1/chat/completions";
const VENICE_API_KEY = Deno.env.get("VENICE_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a knowledgeable purchase advisor. You help users make smart buying decisions by analyzing products, comparing options, and estimating value metrics.

When a user asks about a product, provide:
1. A brief overview and key considerations
2. Typical price ranges (budget, mid-range, premium)
3. Expected lifespan in years
4. Typical usage frequency (uses per week)
5. Average session duration (minutes per use)
6. Estimated depreciation rate (% per year)

When you have enough information to suggest specific parameters, include a JSON block in your response wrapped in <purchase-item> tags:
<purchase-item>
{"name": "Product Name", "price": 500, "lifespanYears": 5, "usesPerWeek": 3, "minutesPerUse": 30, "depreciationRatePercent": 20}
</purchase-item>

Be conversational, helpful, and specific. If the user hasn't provided enough context, ask clarifying questions about their intended use, budget, and preferences.`;

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

    const { message, conversationHistory = [], userItems = [] } = await req.json();

    const itemsContext =
      userItems.length > 0
        ? `\n\nThe user has these items in their calculator: ${JSON.stringify(userItems.map((i: any) => i.name))}`
        : "";

    const messages = [
      { role: "system", content: SYSTEM_PROMPT + itemsContext },
      ...conversationHistory.map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const response = await fetch(VENICE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VENICE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "zai-org-glm-4.7",
        messages,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Venice API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "I couldn't generate a response.";

    // Extract suggested item if present
    let suggestedItem = null;
    const itemMatch = content.match(/<purchase-item>([\s\S]*?)<\/purchase-item>/);
    if (itemMatch) {
      try {
        suggestedItem = JSON.parse(itemMatch[1].trim());
      } catch {
        // Ignore parse errors
      }
    }

    const cleanContent = content.replace(/<purchase-item>[\s\S]*?<\/purchase-item>/g, "").trim();

    return new Response(
      JSON.stringify({ content: cleanContent, suggestedItem }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
