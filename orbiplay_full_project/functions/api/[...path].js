export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // CORS básico
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // pega o que vem depois de /api/auth/
  const sub = url.pathname.replace(/^\/api\/auth\/?/, "");

  try {
    if (sub === "register") return register(context);
    if (sub === "login") return login(context);
    if (sub === "admin-login") return adminLogin(context);
    if (sub === "request-reset") return requestReset(context);
    if (sub === "reset") return resetPassword(context);

    return json({ ok: false, error: "Not found" }, 404);
  } catch (e) {
    return json({ ok: false, error: e?.message || String(e) }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/* =========================
   IMPLEMENTE/COLE AQUI
   SUAS FUNÇÕES REAIS:
   register/login/adminLogin/requestReset/resetPassword
   (as mesmas que já estavam no seu auth.js)
   ========================= */

// TEMPORÁRIO (pra testar que roteou): depois você troca pelas suas reais
async function register() { return json({ ok: true, route: "register" }); }
async function login() { return json({ ok: true, route: "login" }); }
async function adminLogin() { return json({ ok: true, route: "admin-login" }); }
async function requestReset() { return json({ ok: true, route: "request-reset" }); }
async function resetPassword() { return json({ ok: true, route: "reset" }); }
