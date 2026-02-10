export async function onRequest(context) {
  return new Response(
    JSON.stringify({ ok: true, msg: "API funcionando ✅" }),
    { headers: { "Content-Type": "application/json" } }
  );
}
