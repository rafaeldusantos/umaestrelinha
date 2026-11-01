## 01 · [acme-api] Callback OIDC e logout no IdP

**Status:** done

`UC-01, UC-02` — ACME-14

**Objetivo.** A API conclui o login pelo Azure AD e encerra a sessão também no IdP.

**Trecho da costura.** §3 · spec.md — Código — acme-api

### Pronto quando

- `GET /auth/sso/callback` cria a sessão; `POST /auth/logout` chama o `end_session_endpoint`
