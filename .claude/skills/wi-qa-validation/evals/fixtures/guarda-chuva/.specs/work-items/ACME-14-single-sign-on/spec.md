# Spec — ACME-14 Single sign-on com Azure AD

## Escopo

UC-01 entrar pelo Azure AD · UC-02 sair encerrando a sessão no IdP

## Código — acme-web

- **O que muda** — `acme-web/src/pages/Login.tsx:12` ganha o botão "Entrar com a Microsoft"
- **Testes** — componente do botão; o fluxo ponta a ponta fica com o QA
- **Depende / Expõe** — depende de `GET /auth/sso/start` e `POST /auth/logout` da acme-api

## Código — acme-api

- **O que muda** — `acme-api/src/auth/sso.ts` implementa o callback OIDC e o logout no IdP
- **Depende / Expõe** — expõe `GET /auth/sso/start`, `GET /auth/sso/callback`, `POST /auth/logout`

## Fronteira entre repositórios

| Depende (repo) | Expõe (repo) | Como casou |
|---|---|---|
| acme-web `GET /auth/sso/start` | acme-api | redirect 302 para o Azure AD |
| acme-web `POST /auth/logout` | acme-api | 204 e `end_session_endpoint` do IdP |

## Cobertura dos UCs

| UC | Reivindicado por |
|---|---|
| UC-01 | acme-web, acme-api |
| UC-02 | acme-web, acme-api |
