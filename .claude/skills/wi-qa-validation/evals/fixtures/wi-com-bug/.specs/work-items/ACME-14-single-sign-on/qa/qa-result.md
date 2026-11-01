```json
{
  "schema": "qa-result/v1",
  "verdict": "fail",
  "executed_at": "2026-10-30T15:10:00Z",
  "branch": "feature/ACME-14",
  "duration_min": 22,
  "gates": [
    { "name": "build", "command": "npm run build", "status": "pass", "summary": "ok" },
    { "name": "lint", "command": "npm run lint", "status": "pass", "summary": "0 erros" },
    { "name": "test", "command": "npm test", "status": "pass", "summary": "38/38" },
    { "name": "e2e", "command": "—", "status": "skip", "summary": "sem qa/e2e/qa-e2e-report.md" }
  ],
  "coverage": {
    "acceptance_total": 2,
    "acceptance_covered": 2,
    "items": [
      { "criterion": "P1-AC01", "validated_by": { "tc_ref": "TC-FUNC-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "P1-AC02", "validated_by": { "tc_ref": "TC-FUNC-002", "type": "manual" }, "status": "covered" }
    ],
    "missing": []
  },
  "test_cases": [
    { "tc_ref": "TC-FUNC-001", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-002", "verdict": "fail", "bug_ref": "BUG-001" }
  ],
  "evidence": [{ "label": "CH-01-04-logout-sessao-ativa.png", "path": "screenshots/CH-01-04-logout-sessao-ativa.png" }],
  "issues": {
    "total": 1,
    "by_severity": { "critical": 0, "high": 1, "medium": 0, "low": 0 }
  }
}
```

# Resultado de QA — ACME-14 · Single sign-on com Azure AD

**Gate 3:** confirmado em 2026-10-30

## Resumo

**Veredito:** fail — o logout não encerra a sessão no Azure AD (BUG-001).

| TC                                   | Critérios       | Bugs novos | Reabertos | Reteste |
| ------------------------------------ | --------------- | ---------- | --------- | ------- |
| pass 1 · fail 1 · blocked 0 · skip 0 | 2 de 2 cobertos | 1          | 0         | —       |

## Rodada

Exploração · CH-01 (done) · CH-02 cfr (done)

## Achados que não viraram bug

nada
