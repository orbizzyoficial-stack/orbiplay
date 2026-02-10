export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(request) });
  }

  try {
    const path = url.pathname;

    if (path.endsWith("/api/auth/register")) return register(context);
    if (path.endsWith("/api/auth/login")) return login(context);
    if (path.endsWith("/api/auth/admin-login")) return adminLogin(context);
    if (path.endsWith("/api/auth/request-reset")) return requestReset(context);
    if (path.endsWith("/api/auth/reset")) return resetPassword(context);

    return json({ ok: false, error: "Not found" }, 404, request);
  } catch (e) {
    return json({ ok: false, error: e.message }, 500, request);
  }
}

function corsHeaders(req) {
  const origin = req.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, status, req) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(req) },
  });
}

async function safeJson(request) {
  try { return await request.json(); }
  catch { return {}; }
}

/* ================= LOGIN ================= */

async function login({ request, env }) {
  const { email, password } = await safeJson(request);
  if (!email || !password) return json({ ok:false,error:"missing" },400,request);

  const user = await env.DB.prepare(
    "SELECT pass_hash,salt,name FROM users WHERE email=?"
  ).bind(email.toLowerCase()).first();

  if (!user) return json({ ok:false,error:"invalid" },401,request);

  const hash = await hashPassword(password, user.salt);
  if (hash !== user.pass_hash)
    return json({ ok:false,error:"invalid" },401,request);

  return json({ ok:true, name:user.name },200,request);
}

/* ================= REGISTER ================= */

async function register({ request, env }) {
  const { email, password, name } = await safeJson(request);
  if (!email || !password) return json({ ok:false },400,request);

  const exists = await env.DB.prepare(
    "SELECT email FROM users WHERE email=?"
  ).bind(email.toLowerCase()).first();

  if (exists) return json({ ok:false,error:"exists" },409,request);

  const salt = crypto.randomUUID();
  const hash = await hashPassword(password, salt);

  await env.DB.prepare(
    "INSERT INTO users (id,email,name,pass_hash,salt,created_at) VALUES (?,?,?,?,?,?)"
  ).bind(
    crypto.randomUUID(),
    email.toLowerCase(),
    name||"",
    hash,
    salt,
    Date.now()
  ).run();

  return json({ ok:true },200,request);
}

/* ================= ADMIN DEMO ================= */

async function adminLogin({ request, env }) {
  const { email, password } = await safeJson(request);

  if (
    email === env.ADMIN_EMAIL &&
    password === env.ADMIN_PASS
  ) {
    return json({ ok:true, role:"admin" },200,request);
  }

  return json({ ok:false },401,request);
}

/* ================= RESET ================= */

async function requestReset({ request, env }) {
  const { email } = await safeJson(request);
  const code = String(Math.floor(100000+Math.random()*900000));

  await env.DB.prepare(
    "INSERT INTO reset_codes (email,code_hash,expires_at,attempts) VALUES (?,?,?,0)"
  ).bind(
    email,
    await sha(code),
    Date.now()+600000
  ).run();

  await sendEmail(env, email, code);

  return json({ ok:true },200,request);
}

async function resetPassword({ request, env }) {
  const { email, code, newPassword } = await safeJson(request);

  const row = await env.DB.prepare(
    "SELECT code_hash FROM reset_codes WHERE email=?"
  ).bind(email).first();

  if (!row) return json({ ok:false },400,request);

  if (await sha(code) !== row.code_hash)
    return json({ ok:false },400,request);

  const salt = crypto.randomUUID();
  const hash = await hashPassword(newPassword, salt);

  await env.DB.prepare(
    "UPDATE users SET pass_hash=?,salt=? WHERE email=?"
  ).bind(hash,salt,email).run();

  return json({ ok:true },200,request);
}

/* ================= HELPERS ================= */

async function hashPassword(pass, salt) {
  return sha(pass + "|" + salt);
}

async function sha(txt) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(txt)
  );
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

async function sendEmail(env,to,code){
  if(!env.RESEND_API_KEY) return;

  await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{
      Authorization:`Bearer ${env.RESEND_API_KEY}`,
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      from: env.MAIL_FROM,
      to,
      subject:"Código OrbiPlay",
      html:`Seu código: <b>${code}</b>`
    })
  });
}
