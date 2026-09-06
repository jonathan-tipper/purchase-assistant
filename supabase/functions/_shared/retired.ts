export function retired(req: Request) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  return new Response(
    JSON.stringify({
      error:
        "This assistant has moved into the decision workspace. Reload the app to continue.",
    }),
    { status: 410, headers },
  );
}
