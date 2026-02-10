function corsHeaders(req){
  const origin = req.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
function json(req, data, status=200){
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type":"application/json; charset=utf-8", ...corsHeaders(req) }
  });
}
function randomBytes(n){
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}
function base64(u8){
  let s = "";
  u8.forEach(b => s += String.fromCharCode(b));
  return btoa(s);
}
async function sha256(text){
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return base64(new Uint8Array(buf));
}
function timingSafeEqual(a,b){
  if (!a || !b || a.length !== b.length) return false;
  let out = 0;
  for (let i=0;i<a.length;i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
async function hashPassword(password, saltB64){
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name:"PBKDF2", salt, iterations: 120000, hash:"SHA-256" },
    keyMaterial,
    256
  );
  return base64(new Uint8Array(bits));
}
// simple signed token (body.sig) - not a full JWT
async function signToken(payload, secret){
  const body = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const sig = await sha256(body + "|" + secret);
  return `${body}.${sig}`;
}
async function sendEmail(env, to, code){
  const apiKey = env.RESEND_API_KEY;
  const from = env.MAIL_FROM;
  if (!apiKey || !from) return;

  const html = `
    <div style="font-family:Arial,sans-serif">
      <h2>OrbiPlay - Código de recuperação</h2>
      <p>Seu código é:</p>
      <div style="font-size:28px;letter-spacing:6px;font-weight:700">${code}</div>
      <p>Ele expira em 10 minutos.</p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject: "Seu código OrbiPlay", html }),
  });

  if (!res.ok){
    console.log("Email send failed:", await res.text());
  }
}

export async function onRequest(context){
  const { request, env } = context;
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { ok:false, error:"Method not allowed" }, 405);

  const body = await request.json();
  const email = String(body.email||"").trim().toLowerCase();
  const password = String(body.password||"");

  const adminEmail = String(env.ADMIN_EMAIL || "").trim().toLowerCase();
  const adminPass = String(env.ADMIN_PASS || "");

  if (!adminEmail || !adminPass){
    return json(request, { ok:false, error:"Admin não configurado" }, 500);
  }

  if (email !== adminEmail || password !== adminPass){
    return json(request, { ok:false, error:"Acesso negado" }, 401);
  }

  const secret = String(env.AUTH_SECRET || env.ADMIN_PASS || "change-me");
  const token = await signToken({ email, role:"admin", ts: Date.now() }, secret);

  return json(request, { ok:true, token, role:"admin" });
}
