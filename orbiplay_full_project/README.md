# OrbiPlay (Cloudflare Pages) — Login real + cadastro + recuperação por e-mail

## O que vem pronto
- Front-end (index.html) com layout mobile profissional + skins Netflix/Spotify no player
- Login e cadastro REAL (D1 + PBKDF2)
- Esqueci a senha: envia código (6 dígitos) via e-mail e redefine senha
- Demo/Player liberado apenas via login ADM (pré-lançamento)

## Deploy (Cloudflare Pages)
1) Suba este projeto em um repo (GitHub).
2) Cloudflare Dashboard -> Pages -> Create a project -> conecte o repo.
3) Em **Settings -> Functions -> D1 bindings**:
   - Add binding: `DB` (apontando para seu banco D1).
4) Em **Settings -> Environment variables** (Production + Preview):
   - `ADMIN_EMAIL` = seu email de admin
   - `ADMIN_PASS` = sua senha de admin
   - `AUTH_SECRET` = um segredo grande (ex: UUID)  (recomendado)
   - `RESEND_API_KEY` = sua key do Resend
   - `MAIL_FROM` = exemplo: `OrbiPlay <no-reply@seu-dominio.com>`

## Banco (D1)
- Crie um D1 e rode o arquivo `schema.sql` no console do D1.

## Rotas de API
- POST `/api/auth/register`
- POST `/api/auth/login`
- POST `/api/auth/admin-login`
- POST `/api/auth/request-reset`
- POST `/api/auth/reset`
