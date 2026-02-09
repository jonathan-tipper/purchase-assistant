import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const VENICE_API_URL = "https://api.venice.ai/api/v1/chat/completions";
const VENICE_API_KEY = Deno.env.get("VENICE_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a purchase parameter extractor. Given a natural language description of an item someone wants to buy, extract structured purchase parameters.

You must respond with ONLY valid JSON in this exact format:
{
  "name": "Item name",
  "price": 0,
  "lifespanYears": 0,
  "usesPerWeek": 0,
  "minutesPerUse": 0,
  "depreciationRatePercent": 0
}

Rules:
- price: The purchase price in the user's currency. If not specified, estimate a reasonable mid-range price.
- lifespanYears: Expected useful lifespan. Estimate based on product type if not specified.
- usesPerWeek: How many times per week. "Daily" = 7, "twice a week" = 2, etc.
- minutesPerUse: Average minutes per use session. Estimate based on product type.
- depreciationRatePercent: Annual depreciation percentage. Electronics ~20-30%, furniture ~10-15%, vehicles ~15-20%.
- name: A concise, descriptive name for the item.

Respond with ONLY the JSON object, no other text.`;

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

    const { description } = await req.json();

    const response = await fetch(VENICE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VENICE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen3-4b",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: description },
        ],
        max_tokens: 256,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Venice API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON from the response (handle potential markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response as JSON");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({ item: parsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
