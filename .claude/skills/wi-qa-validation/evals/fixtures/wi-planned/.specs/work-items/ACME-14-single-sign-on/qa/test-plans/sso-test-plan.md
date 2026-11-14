```json
{
  "schema": "qa-plan/v1",
  "title": "Plano de QA — SSO com Azure AD",
  "summary": { "total_cases": 2, "by_priority": { "P0": 1, "P1": 1, "P2": 0, "P3": 0 } },
  "acceptance_criteria_covered": 2,
  "strategy": ["Exploração por charter no browser real, uma persona por sessão", "Manual p/ logout no IdP"],
  "cases": [
    { "id": "TC-FUNC-001", "title": "Login SSO redireciona ao Azure AD e retorna sessão", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "existing" } },
    { "id": "TC-FUNC-002", "title": "Logout encerra a sessão no IdP", "priority": "P1", "type": "functional", "automation": { "target": "manual", "status": "na" } }
  ]
}
```

# Plano de QA — ACME-14 · Single sign-on com Azure AD

**Work Item:** ACME-14 (feature) · **Escopo:** completo · **Foco:** —
**Versão do plano:** 1 · **Escrito em:** 2026-10-29 · **Modo:** criar
**Gate 1:** aprovado em 2026-10-29

## Resumo

- **Contagens:** personas 2 · jornadas 1 · charters 2 (CFR 1 · design-check 0) · TC 2 (P0 1 · P1 1 · P2 0 · P3 0)
- **Automação:** e2e 1 (existing 1) · integration 0 · manual 1

## Charters

| Ordem | Lote | ID    | Missão                                         | Persona | Conta    | Massa  | Driver | Tour    | Time-box | Prioridade | TC          | Arquivo                                  |
| ----- | ---- | ----- | ---------------------------------------------- | ------- | -------- | ------ | ------ | ------- | -------- | ---------- | ----------- | ---------------------------------------- |
| 1     | L1   | CH-01 | quem nunca entrou chega ao painel pelo SSO     | PER-01  | novo-sso | só lê  | —      | Feature | 60 min   | P0         | TC-FUNC-001 | [CH-01](charters/CH-01-primeiro-login.md) |
| 2     | L2   | CH-02 | CFR — J-01                                     | PER-01  | novo-sso | só lê  | —      | —       | 30 min   | P1         | TC-FUNC-002 | [CH-02](charters/CH-02-cfr-login.md)      |

## Ambiente da execução

- **App:** http://localhost:3000 (front) · http://localhost:3001 (api)
- **Bloquear:** `**/login.microsoftonline.com/**` fora do fluxo de login do charter; `**/g/collect*`
- **E-mail de dev:** http://localhost:8025
- **Viewport alvo:** o da persona
- **Nunca:** trocar a senha da conta de teste no Azure AD
- **Uploads:** não há
- **Massa:** a do seed

