## 02 · [acme-web] Login — botão "Entrar com a Microsoft"

**Status:** done

`UC-01, UC-02` — ACME-14

**Objetivo.** O usuário entra e sai pelo Azure AD a partir da tela de login.

**Trecho da costura.** §2 · spec.md — Código — acme-web

**Depende de.** 01 — as rotas `/auth/sso/*` e `/auth/logout` da acme-api.

### Pronto quando

- o botão leva a `GET /auth/sso/start`; o "Sair" chama `POST /auth/logout`
