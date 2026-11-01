# Spec — ACME-14 Single sign-on com Azure AD

## Escopo

UC-01 entrar pelo Azure AD · UC-02 sair encerrando a sessão no IdP

## Código — acme-web

- **O que muda** — `src/pages/Login.tsx` ganha o botão "Entrar com a Microsoft"; `src/auth/logout.ts` chama o `end_session_endpoint`

## Cobertura dos UCs

| UC | Critérios | Reivindicado por |
|---|---|---|
| UC-01 | P1-AC01 | acme-web |
| UC-02 | P1-AC02 | acme-web |
