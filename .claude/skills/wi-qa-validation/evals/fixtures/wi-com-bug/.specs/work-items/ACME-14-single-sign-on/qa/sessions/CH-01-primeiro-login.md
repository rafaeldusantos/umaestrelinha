# Sessão CH-01 · Primeiro login por SSO

| Campo       | Valor |
| ----------- | ----- |
| Charter     | `test-plans/charters/CH-01-primeiro-login.md` · exploratório · P0 |
| Status      | done |
| Persona     | PER-01 Novo usuário · conta: `colaborador` — `QA_COLABORADOR_*` |
| Rodada      | exploração |
| Ambiente    | http://localhost:3000 · build `não exposto` · chromium · viewports 1280 · 375 |

## Veredito por TC

| TC | Veredito |
| -- | -------- |
| TC-FUNC-001 | pass |
| TC-FUNC-002 | fail |

## Achados

### A-01 · Depois de "Sair", "Entrar com a Microsoft" volta logado sem pedir senha

Gravidade proposta: high · TC-FUNC-002 · evidência `screenshots/CH-01-04-logout-sessao-ativa.png`
