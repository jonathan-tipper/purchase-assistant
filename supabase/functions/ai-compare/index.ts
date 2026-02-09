import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const VENICE_API_URL = "https://api.venice.ai/api/v1/chat/completions";
const VENICE_API_KEY = Deno.env.get("VENICE_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a purchase comparison analyst. Given two or more items with their metrics, provide a clear, actionable comparison.

Your analysis should include:
1. A brief summary of which item offers the best overall value and why
2. Key tradeoffs between the items (e.g., "Item A costs more upfront but lasts 3x longer")
3. Who each item is best for (e.g., "Best for heavy users", "Best for budget-conscious buyers")
4. A clear recommendation with your confidence level

Consider factors beyond raw numbers: durability implications, usage patterns, total cost of ownership, and the diminishing returns of premium options.

Keep your response concise (under 200 words). Use a conversational but authoritative tone.`;

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

    const { items, metrics } = await req.json();

    const itemDescriptions = items
      .map((item: any, i: number) => {
        const m = metrics[i];
        return `**${item.name}**: £${item.price}, ${item.lifespanYears}yr lifespan, ${item.usesPerWeek}x/week, ${item.minutesPerUse}min/use, ${item.depreciationRatePercent}% depreciation/yr. Cost/use: £${m?.costPerUse?.toFixed(2)}, Cost/year: £${m?.costPerYear?.toFixed(2)}, Value retained: ${m?.valueRetainedPercent?.toFixed(0)}%`;
      })
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
          { role: "user", content: `Compare these items:\n${itemDescriptions}` },
        ],
        max_tokens: 512,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Venice API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "Unable to generate comparison.";

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
