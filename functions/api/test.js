export async function onRequest() {
  return new Response(JSON.stringify({ ok: true, api: "on" }), {
    headers: { "Content-Type": "application/json" },
  });
}
