```json
{
  "schema": "qa-result/v1",
  "verdict": "fail",
  "executed_at": "2026-11-02T05:02:00Z",
  "branch": "master",
  "duration_min": 0,
  "gates": [
    {
      "name": "build",
      "command": "pnpm --filter (store, backoffice, mobile-adm) build",
      "status": "pass",
      "summary": "PASS — store, backoffice e mobile-adm, exit 0"
    },
    {
      "name": "lint",
      "command": "npx eslint . (store, backoffice, mobile-adm)",
      "status": "pass",
      "summary": "PASS — store 2/2 · backoffice 23/5 · mobile-adm 0/0, iguais à baseline"
    },
    {
      "name": "test",
      "command": "pnpm --filter @estrelinha/<w> test --testTimeout=20000 (um workspace por vez)",
      "status": "pass",
      "summary": "21103/21103"
    },
    {
      "name": "e2e",
      "command": "—",
      "status": "skip",
      "summary": "sem rodada E2E"
    }
  ],
  "coverage": {
    "acceptance_total": 29,
    "acceptance_covered": 22,
    "items": [
      { "criterion": "LAV-01", "validated_by": { "tc_ref": "TC-SMOKE-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "LAV-02", "validated_by": { "tc_ref": "TC-FUNC-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "LAV-03", "validated_by": { "tc_ref": "TC-SMOKE-001", "type": "e2e" }, "status": "partial" },
      { "criterion": "LAV-05", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "LAV-10", "validated_by": { "tc_ref": "TC-FUNC-003", "type": "e2e" }, "status": "covered" },
      { "criterion": "LAV-11", "validated_by": { "tc_ref": "TC-FUNC-003", "type": "e2e" }, "status": "covered" },
      { "criterion": "LAV-12", "validated_by": { "tc_ref": "TC-FUNC-003", "type": "e2e" }, "status": "partial" },
      { "criterion": "LAV-20", "validated_by": { "tc_ref": "TC-FUNC-004", "type": "e2e" }, "status": "partial" },
      { "criterion": "LAV-21", "validated_by": { "tc_ref": "TC-FUNC-004", "type": "e2e" }, "status": "covered" },
      { "criterion": "LAV-22", "validated_by": { "tc_ref": "TC-FUNC-006", "type": "e2e" }, "status": "covered" },
      { "criterion": "LAV-30", "validated_by": { "tc_ref": "TC-FUNC-009", "type": "e2e" }, "status": "covered" },
      { "criterion": "LAV-31", "validated_by": { "tc_ref": "TC-FUNC-010", "type": "e2e" }, "status": "covered" },
      { "criterion": "LAV-32", "validated_by": { "tc_ref": "TC-FUNC-011", "type": "e2e" }, "status": "covered" },
      { "criterion": "LAV-40", "validated_by": { "tc_ref": "TC-FUNC-012", "type": "e2e" }, "status": "covered" },
      { "criterion": "LAV-45", "validated_by": { "tc_ref": "TC-FUNC-013", "type": "e2e" }, "status": "covered" },
      { "criterion": "LAV-51", "validated_by": { "tc_ref": "TC-FUNC-025", "type": "e2e" }, "status": "partial" },
      { "criterion": "LAV-60", "validated_by": { "tc_ref": "TC-SEC-006", "type": "e2e" }, "status": "partial" },
      { "criterion": "LAV-61", "validated_by": { "tc_ref": "TC-FUNC-023", "type": "e2e" }, "status": "covered" },
      { "criterion": "LAV-62", "validated_by": { "tc_ref": "TC-SMOKE-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "LAV-63", "validated_by": { "tc_ref": "TC-CFR-001", "type": "manual" }, "status": "partial" },
      { "criterion": "LAV-64", "validated_by": { "tc_ref": "TC-CFR-002", "type": "manual" }, "status": "covered" },
      { "criterion": "LAV-65", "validated_by": { "tc_ref": "TC-SEC-005", "type": "manual" }, "status": "covered" },
      { "criterion": "§10.1", "validated_by": { "tc_ref": "TC-FUNC-025", "type": "e2e" }, "status": "partial" },
      { "criterion": "§10.2", "validated_by": { "tc_ref": "TC-FUNC-004", "type": "e2e" }, "status": "covered" },
      { "criterion": "§10.3", "validated_by": { "tc_ref": "TC-SEC-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "§10.4", "validated_by": { "tc_ref": "TC-JOURNEY-002", "type": "e2e" }, "status": "covered" },
      { "criterion": "§10.5", "validated_by": { "tc_ref": "TC-FUNC-022", "type": "e2e" }, "status": "covered" },
      { "criterion": "R-01 — PRD §7, item 1", "validated_by": { "tc_ref": "TC-SEC-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "R-02 — PRD §7, último item", "validated_by": { "tc_ref": "TC-FUNC-017", "type": "manual" }, "status": "covered" }
    ],
    "missing": []
  },
  "test_cases": [
    { "tc_ref": "TC-SMOKE-001", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-001", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-002", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-003", "verdict": "fail", "bug_ref": "BUG-001" },
    { "tc_ref": "TC-FUNC-001", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-002", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-003", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-004", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-005", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-006", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-007", "verdict": "blocked" },
    { "tc_ref": "TC-FUNC-008", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-009", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-010", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-011", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-012", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-013", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-014", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-015", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-016", "verdict": "skip" },
    { "tc_ref": "TC-FUNC-017", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-018", "verdict": "fail", "bug_ref": "BUG-001" },
    { "tc_ref": "TC-FUNC-019", "verdict": "blocked" },
    { "tc_ref": "TC-FUNC-020", "verdict": "fail", "bug_ref": "BUG-002" },
    { "tc_ref": "TC-FUNC-021", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-022", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-023", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-024", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-025", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-026", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-027", "verdict": "blocked" },
    { "tc_ref": "TC-FUNC-028", "verdict": "blocked" },
    { "tc_ref": "TC-FUNC-029", "verdict": "blocked" },
    { "tc_ref": "TC-FUNC-030", "verdict": "blocked" },
    { "tc_ref": "TC-SEC-001", "verdict": "pass" },
    { "tc_ref": "TC-SEC-002", "verdict": "pass" },
    { "tc_ref": "TC-SEC-003", "verdict": "pass" },
    { "tc_ref": "TC-SEC-004", "verdict": "pass" },
    { "tc_ref": "TC-SEC-005", "verdict": "pass" },
    { "tc_ref": "TC-SEC-006", "verdict": "pass" },
    { "tc_ref": "TC-SEC-007", "verdict": "blocked" },
    { "tc_ref": "TC-REG-001", "verdict": "pass" },
    { "tc_ref": "TC-REG-002", "verdict": "blocked" },
    { "tc_ref": "TC-REG-003", "verdict": "pass" },
    { "tc_ref": "TC-CFR-001", "verdict": "fail", "bug_ref": "BUG-003" },
    { "tc_ref": "TC-CFR-002", "verdict": "pass" },
    { "tc_ref": "TC-CFR-003", "verdict": "pass" },
    { "tc_ref": "TC-CFR-004", "verdict": "pass" },
    { "tc_ref": "TC-UI-001", "verdict": "fail", "bug_ref": "BUG-007" },
    { "tc_ref": "TC-UI-002", "verdict": "fail", "bug_ref": "BUG-006" },
    { "tc_ref": "TC-UI-003", "verdict": "fail", "bug_ref": "BUG-005" }
  ],
  "evidence": [
    { "label": "CH-01-05-inicio-1-pessoa.png", "path": "screenshots/CH-01-05-inicio-1-pessoa.png" },
    { "label": "CH-01-06-ao-vivo-1-olhando.png", "path": "screenshots/CH-01-06-ao-vivo-1-olhando.png" },
    { "label": "CH-01-07-inicio-2-sacola.png", "path": "screenshots/CH-01-07-inicio-2-sacola.png" },
    { "label": "CH-01-08-ao-vivo-3-funil-nota.png", "path": "screenshots/CH-01-08-ao-vivo-3-funil-nota.png" },
    { "label": "CH-02-01-estatisticas-recusada.png", "path": "screenshots/CH-02-01-estatisticas-recusada.png" },
    { "label": "CH-02-08-oraculo-helena-recusada-fora.png", "path": "screenshots/CH-02-08-oraculo-helena-recusada-fora.png" },
    { "label": "CH-03-05-ao-vivo-1-checkout.png", "path": "screenshots/CH-03-05-ao-vivo-1-checkout.png" },
    { "label": "CH-05-02-acessos-semana.png", "path": "screenshots/CH-05-02-acessos-semana.png" },
    { "label": "CH-07-03-login-recusa.png", "path": "screenshots/CH-07-03-login-recusa.png" },
    { "label": "CH-07-04-ao-vivo-primeiros-instantes.png", "path": "screenshots/CH-07-04-ao-vivo-primeiros-instantes.png" },
    { "label": "CH-07-07-recarregar.png", "path": "screenshots/CH-07-07-recarregar.png" },
    { "label": "CH-06-12-inicio-cartao-velho-sem-aviso.png", "path": "screenshots/CH-06-12-inicio-cartao-velho-sem-aviso.png" },
    { "label": "CH-06-09-ao-vivo-falha-fria-atualizado-agora.png", "path": "screenshots/CH-06-09-ao-vivo-falha-fria-atualizado-agora.png" },
    { "label": "CH-06-14-ao-vivo-carregando.png", "path": "screenshots/CH-06-14-ao-vivo-carregando.png" },
    { "label": "CH-08-02-inicio-cartao-130.png", "path": "screenshots/CH-08-02-inicio-cartao-130.png" },
    { "label": "CH-08-03-inicio-cartao-200.png", "path": "screenshots/CH-08-03-inicio-cartao-200.png" },
    { "label": "CH-08-04-inicio-cartao-360-200.png", "path": "screenshots/CH-08-04-inicio-cartao-360-200.png" },
    { "label": "CH-08-06-ao-vivo-200.png", "path": "screenshots/CH-08-06-ao-vivo-200.png" },
    { "label": "CH-08-08-ao-vivo-320-200-joias.png", "path": "screenshots/CH-08-08-ao-vivo-320-200-joias.png" },
    { "label": "CH-09-01-inicio-cartao.png", "path": "screenshots/CH-09-01-inicio-cartao.png" },
    { "label": "CH-09-02-ao-vivo-cheio.png", "path": "screenshots/CH-09-02-ao-vivo-cheio.png" },
    { "label": "CH-09-04-cartao-cheio.png", "path": "screenshots/CH-09-04-cartao-cheio.png" }
  ],
  "issues": {
    "total": 8,
    "by_severity": { "critical": 0, "high": 2, "medium": 2, "low": 4 }
  }
}
```

# Resultado de QA — 90 · Loja ao vivo, Fases 2 e 3

**Gate 3:** confirmado em 2026-11-02 (o usuário mandou corrigir os bugs: "Após o push, ajuste os bugs")

## Resumo

**Veredito:** fail — dois bugs `high` abertos (o cartão do Início e a lista de joias quebram com a fonte a 200 %); nenhum TC P0 falhou

A rodada percorreu as seis jornadas com as cinco personas, em nove sessões. O núcleo da mudança funciona: a
cliente que entra aparece no cartão do Início e na Loja ao vivo em 20–60 s, o funil soma o total em todas as
transições (olhando, sacola, checkout, volta do checkout), quem fecha a aba ou esconde a loja sai em até ~5 min,
a sacola guardada conta ao voltar, a recusa de estatística e o `?nao-contar=1` param a presença (também na
outra aba), `127.0.0.1` não conta, nada identifica a cliente logada, quem não tem acesso ao ateliê nunca vê
número, Visitas e Vendas de Acessos batem com a faixa do Início, e "Com sacola" conta cada navegador uma vez no
dia. Nenhum TC P0 falhou.

O que a Adri ainda não tem: com a fonte do celular no máximo, o cartão do Início espreme o texto a zero de
largura e o funil pinta por cima do mini gráfico (BUG-003), e a lista "Joias sendo vistas agora" vira tiras de
muitas linhas, cobrindo o "1 pessoa" em 320 (BUG-004). Com a leitura ao vivo falhando depois de já ter número,
o cartão do Início segue mostrando o número antigo sem aviso (BUG-001), e o topo da Loja ao vivo diz
"Atualizado agora" acima de blocos em falha (BUG-002). Quatro divergências pequenas contra o protótipo
(BUG-005..008) completam a lista.

Oito TC ficaram `blocked` (massa, painel :8083 fora do ar, conta sem papel para retirar) e um `skip` — todos P1
ou P2; com os `high` abertos, o veredito já é `fail`, mas eles seriam `partial` sozinhos.

| TC                                   | Critérios       | Bugs novos | Reabertos | Reteste                                                    |
| ------------------------------------ | --------------- | ---------- | --------- | ---------------------------------------------------------- |
| pass 35 · fail 7 · blocked 8 · skip 1 | 22 de 29 cobertos (7 partial, 0 missing) | 8 | 0 | resolved 0 · still-open 0 · cannot-reproduce 0 · blocked 0 |

**Vereditos revistos na triagem** (o explorer marcou `fail`; a triagem marcou `pass`, e o porquê):

- **TC-SEC-001** — os passos 1–4 passaram (depois da recusa, nada sai e nada aparece). O que falhou foi a
  variação "fecha o aviso sem escolher ⇒ não aparece", que contradiz a fonte: o PRD manda a presença usar "o
  mesmo consentimento do `VisitCounter`", e o modelo dele, decidido na feature 61, é legítimo interesse — "fechar
  ou seguir navegando não é recusar: a medição continua", com Estatísticas ligado de fábrica. A carga antes da
  escolha conta; isso é `conforme a fonte`, não defeito desta feature. O TC precisa de ajuste no plano
- **TC-FUNC-017** — o texto novo da Política confere com o §7 em todos os pontos. O passo 6 falhou porque a
  página rola de lado a 390/200 % pelo **cabeçalho da loja** — defeito anterior, registrado no `CLAUDE.md` da
  raiz como decisão pendente desde a 83, fora do que este Work Item muda. Vai a Sugestões de backlog

## Rodada

- **Ambiente:** app do ateliê http://localhost:8084 (dev) · loja http://localhost:8082 (build, `vite preview`) · Supabase local 54441/54442 · painel :8083 não servido
- **Branch / build:** `master`, com o Work Item 90 na árvore sem commit; build do app não exposto
- **Execução:** rodada de exploração 1, em 2026-11-02; o briefing não trouxe início e fim — a última hora registrada numa sessão é 05:02 UTC (fim do CH-05); `duration_min` não informado
- **Browser:** Chromium headless (Playwright MCP) · **Viewports:** 390 × 844, 360 × 800, 320 × 568, 768 × 1024 (loja, iPad), 1280 × 800 (loja), 1440 × 900
- **Personas e acesso:** PER-01, PER-02 → `admin-atelie`; PER-03, PER-04 → `anonima`; PER-05 → `qa.semacesso` (conta local sem papel admin, no lugar de `admin-secundaria`); credenciais pelo arquivo de credenciais do QA local, sem valores
- **Massa:** `production_host = localhost` no banco local durante a rodada; visitas e marcas de sacola de 20/10 a 01/11 e o marco de medição em 19/10 semeados durante o CH-05; tudo restaurado pelo orquestrador

## Gate técnico

- **Validation do Dev:** `.specs/work-items/90-loja-ao-vivo-presenca/qa-report.md` — PASS, de 2026-11-02
- **Rodada E2E:** sem rodada E2E

| Gate  | Status | Resumo |
| ----- | ------ | ------ |
| build | pass   | store, backoffice e mobile-adm, exit 0 |
| lint  | pass   | store 2/2 · backoffice 23/5 · mobile-adm 0/0, iguais à baseline |
| test  | pass   | 21103/21103, um workspace por vez; probes 01–04 exit 0 |
| e2e   | skip   | sem rodada E2E |

## Cobertura — critério → TC

| Critério | Fonte | TC | Veredito | Status |
| -------- | ----- | -- | -------- | ------ |
| LAV-01 | prd | TC-FUNC-002, TC-CFR-003, TC-SMOKE-001 | pass | covered |
| LAV-02 | prd | TC-FUNC-001, TC-JOURNEY-001, TC-CFR-002, TC-UI-001 | pass · fail (BUG-007) | covered |
| LAV-03 | prd | TC-FUNC-018, TC-FUNC-019, TC-FUNC-020, TC-JOURNEY-003, TC-SMOKE-001 | fail (BUG-001, BUG-002) · blocked (TC-FUNC-019) | partial |
| LAV-05 | prd | TC-FUNC-021, TC-FUNC-022, TC-JOURNEY-001, TC-JOURNEY-003 | pass · fail (BUG-001) | covered |
| LAV-10 | prd | TC-FUNC-003, TC-JOURNEY-001, TC-UI-002 | pass · fail (BUG-006) | covered |
| LAV-11 | prd | TC-FUNC-003, TC-JOURNEY-001, TC-UI-002 | pass · fail (BUG-006) | covered |
| LAV-12 | prd | TC-FUNC-003, TC-JOURNEY-002, TC-FUNC-014, TC-FUNC-016 | pass · skip (TC-FUNC-016) | partial |
| LAV-20 | prd | TC-FUNC-004, TC-FUNC-005, TC-FUNC-007, TC-FUNC-015, TC-UI-002 | pass · blocked (TC-FUNC-007) · fail (BUG-006) | partial |
| LAV-21 | prd | TC-FUNC-004 | pass | covered |
| LAV-22 | prd | TC-FUNC-006, TC-CFR-004 | pass | covered |
| LAV-30 | prd | TC-FUNC-009, TC-UI-003 | pass · fail (BUG-005) | covered |
| LAV-31 | prd | TC-FUNC-010, TC-FUNC-011 | pass | covered |
| LAV-32 | prd | TC-FUNC-011 | pass | covered |
| LAV-40 | prd | TC-FUNC-012, TC-UI-003 | pass · fail (BUG-005) | covered |
| LAV-45 | prd | TC-FUNC-013, TC-UI-003 | pass · fail (BUG-005) | covered |
| LAV-51 | prd | TC-FUNC-025…030, TC-UI-003 | pass (025, 026) · blocked (027–030) · fail (BUG-005) | partial |
| LAV-60 | prd | TC-SEC-006, TC-SEC-007 | pass · blocked (TC-SEC-007) | partial |
| LAV-61 | prd | TC-FUNC-023 | pass | covered |
| LAV-62 | prd | TC-FUNC-024, TC-CFR-003, TC-SMOKE-001 | pass | covered |
| LAV-63 | prd | TC-CFR-001, TC-FUNC-030 | fail (BUG-003, BUG-004) · blocked (TC-FUNC-030) | partial |
| LAV-64 | prd | TC-CFR-002 | pass | covered |
| LAV-65 | prd | TC-SEC-005 | pass | covered |
| §10.1 | prd | TC-FUNC-025, TC-REG-002 | pass · blocked (TC-REG-002) | partial |
| §10.2 | prd | TC-FUNC-004 | pass | covered |
| §10.3 | prd | TC-SEC-001…004 | pass | covered |
| §10.4 | prd | TC-JOURNEY-002 | pass | covered |
| §10.5 | prd | TC-FUNC-022 | pass | covered |
| R-01 — PRD §7, item 1 | prd | TC-SEC-001, TC-FUNC-008 | pass | covered |
| R-02 — PRD §7, último item | prd | TC-FUNC-017 | pass | covered |

**Sem cobertura:** nada — os critérios fora do plano (LAV-04, §10.7, LAV-48, LAV-50/52/53/54, LAV-41, §10.6) estão justificados no test-plan

## Sessões

| Charter | Persona | Tour | Status | Ações | TC | Achados | Bugs |
| ------- | ------- | ---- | ------ | ----- | -- | ------- | ---- |
| CH-01 | PER-01 | Feature | done (2ª tentativa; a 1ª ficou blocked por a loja em dev recusar contar por ambiente) | ~70 de 70 | pass 9 · blocked 1 | 0 | — |
| CH-02 | PER-04 | Multi-Tab | done | 49 de 50 | pass 5 (2 revistos de fail) | 2 | — |
| CH-07 | PER-05 | Back-Button | done | 16 de 25 | pass 1 · blocked 1 | 0 | — |
| CH-03 | PER-03 | Interrupt | done | 50 de 50 | pass 4 · skip 1 | 0 | — |
| CH-05 | PER-01 | Feature | done | 49 de 50 | pass 3 · blocked 5 | 0 | — |
| CH-04 | PER-01 | Feature | done | 37 de 50 | pass 6 | 0 | — |
| CH-06 | PER-01 | Network | done | 49 de 50 | pass 4 · fail 3 · blocked 1 | 3 | BUG-001, BUG-002 |
| CH-08 | PER-02 | — | done | 19 de 35 | pass 3 · fail 1 | 3 | BUG-003, BUG-004 |
| CH-09 | PER-01 | — | done | 28 de 40 | fail 3 | 4 | BUG-005, BUG-006, BUG-007, BUG-008 |

## CFR

| Categoria             | Jornadas | Resultado | Bugs |
| --------------------- | -------- | --------- | ---- |
| Acessibilidade        | J-01, J-02 | fricção — fonte 200 % no cartão e na lista de joias; na falha, cinco "Tentar de novo" iguais sem região viva (sugestão de backlog) | BUG-003, BUG-004 |
| Responsividade        | J-01, J-02 | falha — 390/360 a 200 % (cartão), 320 a 200 % (lista); sem rolagem lateral em nenhum caso; 1440 ok | BUG-003, BUG-004 |
| Performance percebida | J-01, J-02 | ok — 20–60 s até o número mudar (dentro do atraso declarado); troca de estado em ~2 s com a tela aberta | — |
| Segurança visível     | J-04, J-06 | ok — recusa, opt-out, host interno e conta sem papel sem número; nada identifica a cliente | — |

Movimento reduzido ok (nenhuma animação em curso; barras mudam num quadro). Teclado na ordem visual com foco
visível. Usabilidade e tom sem exclamação, emoji nem urgência.

## Design-check

- **Protótipo:** `claude_design` `a780eec8-8aba-4d6e-8b4c-2c485e2750c7`, `Ateliê Admin.dc.html` (etag `1793064028832969`) — Início e Loja ao vivo, 390, estado cheio
- **Status:** done
- **Divergências:** 4 — BUG-005 (rótulos serifados), BUG-006 (cores do bloco escuro), BUG-007 (recuo do cartão do Início), BUG-008 (altura do cabeçalho). As 18 divergências resolvidas a favor do PRD na `spec.md` não foram tratadas como achado

## Bugs novos

Por nível: Bloqueia a conclusão 0 · Perda de dados 0 · Dano à confiança 2 (rebaixados a medium: se corrigem sozinhos) · Fricção 2 (subidos a high: jornada P0) · Cosmético 4
Por severidade: critical 0 · high 2 · medium 2 · low 4

| Bug | Nível | Severidade | Prioridade | Título | Persona · jornada, passo | TC |
| --- | ----- | ---------- | ---------- | ------ | ------------------------ | -- |
| BUG-003 | Fricção (+1, J-01 P0) | high | P1 | [Início] Com a fonte a 200 %, o cartão "Agora na loja" espreme o texto e o funil cobre o mini gráfico — para quem usa fonte grande | PER-02 · J-01, passo 2 | TC-CFR-001 |
| BUG-004 | Fricção (+1, J-02 P0) | high | P1 | [Loja ao vivo] Com a fonte a 200 %, o nome em "Joias sendo vistas agora" vira tira estreita e cobre "1 pessoa" em 320 | PER-02 · J-02, passo 2 | TC-CFR-001 |
| BUG-001 | Dano à confiança (−1) | medium | P2 | [Início] Cartão "Agora na loja" segue mostrando o último número quando a leitura ao vivo falha, sem aviso | PER-01 · J-06, passo 2 | TC-FUNC-018 |
| BUG-002 | Dano à confiança (−1) | medium | P2 | [Loja ao vivo] "Atualizado agora" no topo quando uma das duas leituras falhou ou ainda não chegou | PER-01 · J-06, passo 2 | TC-FUNC-020 |
| BUG-005 | Cosmético | low | P3 | [Loja ao vivo] Rótulos "Agora na loja" e "No celular" saem em fonte serifada, fora do protótipo | PER-01 · J-02, passo 2 | TC-UI-003 |
| BUG-006 | Cosmético | low | P3 | [Loja ao vivo] No bloco escuro "Agora na loja", textos e barras antigas em creme opaco no lugar do branco translúcido | PER-01 · J-02, passo 2 | TC-UI-002 |
| BUG-007 | Cosmético | low | P3 | [Início] Cartão "Agora na loja" com recuo e espaçamento do número fora do protótipo | PER-01 · J-01, passo 1 | TC-UI-001 |
| BUG-008 | Cosmético | low | P3 | [Loja ao vivo] Cabeçalho com 61 px de altura, 1 px acima do protótipo | PER-01 · J-02, passo 2 | TC-UI-002 |

Divergências da gravidade proposta pelo explorer: BUG-003 medium → high e BUG-004 low → high (fricção em
jornada P0 sobe um degrau; BUG-004 tem texto sobreposto ao número em 320, o que não é só estética); BUG-002 low →
medium (o frescor é o que diz que a tela está viva, e aqui contradiz os blocos; na dúvida, o maior). As demais
mantidas.

**Reabertos:** nada

## Lotes de correção sugeridos

| Lote | Bugs | Tela · componente | Por que juntos | Maior severidade |
| ---- | ---- | ----------------- | -------------- | ---------------- |
| L1 | BUG-003, BUG-001, BUG-007 | Início · cartão "Agora na loja" | mesmo componente na mesma tela (layout a 200 %, estado de releitura falha, recuo e espaçamento) | high |
| L2 | BUG-004 | Loja ao vivo · lista "Joias sendo vistas agora" | sozinho — outra tela e outro componente que o BUG-003, embora a quebra a 200 % seja da mesma família | high |
| L3 | BUG-002, BUG-008 | Loja ao vivo · cabeçalho | mesmo componente na mesma tela (a linha de frescor e a altura) | medium |
| L4 | BUG-005, BUG-006 | Loja ao vivo · bloco escuro "Agora na loja" (e o rótulo de "No celular") | mesma tela, o mesmo bloco e o mesmo padrão visual (tipografia e cor do texto sobre `ink`) | low |

## Transições propostas

sem bugs abertos no Work Item e nenhuma reabertura

**Reteste `blocked`:** nada

## Achados que não viraram bug

- CH-02 A-1 — a carga da primeira página, antes de responder ao aviso de cookies, já conta a visita e manda presença (Estatísticas ligado de fábrica) — `conforme a fonte`: o PRD (§3, Opção A, e §7) manda a presença usar o mesmo consentimento e as mesmas recusas do `VisitCounter`, cujo modelo é o legítimo interesse decidido na feature 61 (`context.md` › Base legal: "fechar ou seguir navegando não é recusar"); a contagem de Visitas antes da escolha vem da 61/71, não desta feature. Depois da recusa nada mais sai, nas duas abas. A variação de TC-SEC-001 que esperava o contrário precisa de ajuste no plano
- CH-02 A-2 — depois de desligar Estatísticas, `estrelinha-visitor` (do contador de visitas) continua guardado, e a Política diz que o código é apagado; não se verificou se guarda o código ou só o prazo — defeito do contador da feature 71, fora da Mudança, abaixo de high ⇒ Sugestões de backlog
- CH-02 — a Política rola de lado a 390/200 % (`scrollWidth` 434), pelo cabeçalho da loja — pré-existente (registrado no `CLAUDE.md` da raiz como decisão pendente desde a 83) ⇒ Sugestões de backlog
- CH-01 — com o dia sem visita, o cartão e a Loja ao vivo mostram "Nenhuma visita registrada ainda. O contador só conta na loja em localhost." no lugar de "Ninguém na loja agora" — `conforme a fonte`: é a frase de Acessos para a loja ainda não medida (`emptyCounterLine`, `contagem_desde` nulo), que LAV-03 e D-11 mandam usar no cartão e na seção; antes da massa do CH-05 o banco local não tinha visita nenhuma. Ver Riscos residuais
- CH-01 — `/pedido/<id>/pagamento` de um pedido de outra cliente conta "No checkout" pela rota — `conforme a fonte` (D-09 classifica pela rota) ⇒ polimento em Sugestões de backlog
- CH-03 — a joia aberta por `?utm_source=instagram` depois da Home, na mesma aba, contou "Direto" — `conforme a fonte` (D-08 e LAV-40: a faixa é calculada no pouso, a primeira página da aba)
- CH-04 — o bloco B diz "Olhando joias 3" acima de C "Ninguém olhando uma joia agora." com as três clientes numa categoria, na busca e na Home — `spec-gap` `polimento` (microcopy) ⇒ Sugestões de backlog
- CH-05 — a variação de Semana diz só "vs semana anterior", sem "até o mesmo ponto" — `spec-gap` `polimento` ⇒ Sugestões de backlog
- CH-05 — com base zero até o mesmo ponto, a variação some sem frase — `spec-gap` `polimento` ⇒ Sugestões de backlog
- CH-06 A-3 — com a leitura ao vivo falhando depois de carregar, a Loja ao vivo troca o frescor por "Não consegui atualizar agora." e mantém os números, sem "Tentar de novo" por bloco — `conforme a fonte`: decisão da feature 83 (frescor → `NAO_ATUALIZOU` quando a releitura falha com dado na tela), mantida pela costura (`spec.md` › Fontes, "frase de falha do app"); o TC-JOURNEY-003 passo 2 precisa de ajuste no plano
- CH-06 — com a rede do aparelho cortada, a tela inteira dá lugar a "Sem conexão" do app — `conforme a fonte` (tela de sem conexão da fundação, feature 72); volta sozinha
- CH-06 — o cartão do Início muda de altura conforme o estado (94,5 → 92 → 77) — `spec-gap` `polimento` ⇒ Sugestões de backlog
- CH-07 — a recusa de acesso aparece em `/login`, não dentro do Início ou da Loja ao vivo — `conforme a fonte` (o `RequireAdmin` e a recusa da feature 72); nenhum número aparece
- CH-08 A-3 — na falha, cinco "Não consegui carregar." e cinco "Tentar de novo" com o mesmo nome, sem região viva — `spec-gap` `polimento` (anúncio ao leitor de tela; D-20 manda seguir `shared/ui/leitura.tsx`) ⇒ Sugestões de backlog
- CH-08 — sem fonte para a forma de o mini gráfico ceder espaço com a fonte grande — absorvido no BUG-003 (o esperado "sem sobrepor" tem fonte; a forma é do Dev)
- CH-08 — a 130/200 % as legendas de "Visitas por horário" saem da tela, e "Semana"/"Ontem" do seletor se encostam em 320/360 a 200 % — pré-existente (Fase 1, feature 83), abaixo de high ⇒ Sugestões de backlog
- CH-09 — botões do seletor de Acessos com 44 px contra 40 px do protótipo — `conforme a fonte` (regra do projeto de alvo de 44 px)
- CH-02 · CH-03 · CH-04 — o Playwright acusa "fora da viewport" no "Adicionar à sacola" e em "Preferências de cookies" a 390 e só alcança por `dispatchEvent` — ambiente headless, não confirmado num toque real ⇒ Riscos residuais
- CH-03 — o convite do Instagram cobre a Home e tira a barra da sacola da árvore de acessibilidade até ser fechado — pré-existente (feature 65), fora da Mudança ⇒ Sugestões de backlog

## Perguntas ao produto

nada — nenhum `spec-gap` desta rodada é `mudança` decisiva para a jornada. O mais perto disso (a presença antes da resposta ao aviso de cookies) segue a fonte; está em Sugestões de backlog e em Riscos residuais para o humano decidir se reabre a base legal

## Sugestões de backlog

| Comportamento | Onde | Classe | Título sugerido para o Work Item |
| ------------- | ---- | ------ | -------------------------------- |
| A loja conta a visita e manda presença na primeira carga, antes de a cliente responder ao aviso de cookies; quem recusa logo ao chegar aparece por até 5 min e em Visitas do dia | loja · aviso de cookies, contador e presença | pré-existente | Rever a base legal do aviso de cookies: medir só depois da escolha, ou dizer na Política que a primeira página conta |
| `estrelinha-visitor` fica no navegador depois de desligar Estatísticas, e a Política diz que o código é apagado | loja · contador de visitas e Política de Privacidade | pré-existente | Apagar o código do contador ao recusar Estatísticas, ou alinhar o texto da Política |
| A Política de Privacidade (e o resto da loja) rola de lado a 390/200 % pelo cabeçalho | loja · cabeçalho | pré-existente | Cabeçalho da loja sem rolagem lateral com a fonte a 200 % |
| As legendas de "Visitas por horário" saem da tela a 130/200 %, e "Ontem"/"Semana" se encostam em 320/360 a 200 % | app do ateliê · Loja ao vivo › Acessos | pré-existente | Acessos legível com a fonte grande: gráfico por horário e seletor de período |
| O convite do Instagram cobre a Home e esconde a barra da sacola da árvore de acessibilidade até ser fechado | loja · Home | pré-existente | Convite do Instagram sem esconder a sacola do leitor de tela |
| Na falha da presença, cinco "Não consegui carregar." e cinco "Tentar de novo" iguais, sem região viva | app do ateliê · Loja ao vivo | polimento | Falha da Loja ao vivo anunciada uma vez, com botões que dizem de qual bloco são |
| "Olhando joias 3" no funil logo acima de "Ninguém olhando uma joia agora." quando ninguém está numa página de joia | app do ateliê · Loja ao vivo, blocos B e C | polimento | Rótulo do funil para quem navega fora de uma joia |
| "vs semana anterior" sem dizer "até o mesmo ponto", como Hoje diz "até as 2h" | app do ateliê · Loja ao vivo › Acessos | polimento | Variação da Semana com o ponto de corte escrito |
| Com base zero até o mesmo ponto, a variação some sem nenhuma frase | app do ateliê · Loja ao vivo › Acessos | polimento | Variação de Acessos com base zero |
| O cartão do Início muda de altura entre carregando, com número e ninguém, empurrando o Início | app do ateliê · Início › cartão "Agora na loja" | polimento | Cartão "Agora na loja" com altura estável entre estados |
| O pagamento de um pedido de outra cliente conta "No checkout" pela rota | loja · `/pedido/:id/pagamento` | polimento | Presença no pagamento só para quem pode pagar o pedido |

## Riscos residuais

- **A base legal da presença** — a rodada mostrou, com prova, que quem recusa na primeira visita entra uma vez em Visitas e em "Agora na loja" por até 5 min. Segue a fonte (61), mas a nota da tela diz "Conta só quem aceitou cookies de estatística." e o plano assumiu opt-in; se o humano entender que a promessa ao cliente é outra, é Work Item novo (Sugestões de backlog, 1ª linha)
- **O estado "não medida" × "medida, ninguém hoje"** — o CH-01 viu a frase de loja não medida com o banco sem visita nenhuma; a fronteira entre os dois estados (marco de medição presente, zero visitas no dia) não foi exercitada, e TC-FUNC-019 ficou `blocked`
- **Fricção repetida com a fonte a 200 % nas duas superfícies novas** (BUG-003, BUG-004) — o padrão é elementos de tamanho fixo (mini gráfico, foto, "1 pessoa") que não cedem espaço; vale olhar o resto das telas novas a 200 % no reteste, não só os dois pontos
- **Falha "quente" (com número na tela)** — os dois bugs de leitura estão nela (BUG-001, BUG-002); a falha "fria" passa
- **Toque real na loja a 390** — "Adicionar à sacola" e "Preferências de cookies" só receberam clique por `dispatchEvent` no headless (CH-02, CH-03, CH-04); não se sabe se um dedo real alcança
- **A comparação de Vendas entre Acessos e a faixa** (TC-FUNC-025) foi feita com Vendas 0 nos três períodos — fraca

## Fora da cobertura

- TC-FUNC-007 ("Compraram" com pedido pago nos últimos 30 min) — massa: nenhum pedido pago recente no banco local
- TC-FUNC-019 e a variação "loja não medida" de TC-FUNC-024 — massa: tirar o `production_host` exige escrita no banco, fora da sessão
- TC-FUNC-027, TC-FUNC-028, TC-FUNC-029, TC-FUNC-030 — massa e horário: a semana em curso era só a segunda-feira de madrugada, sem o segundo estado do marco, sem período com zero visitas nem com vendas
- TC-REG-002 — o painel :8083 não estava servido
- TC-SEC-007 — sem conta com acesso para retirar e sem o painel servido
- TC-FUNC-016 (duas abas da mesma loja) — `skip` por orçamento no CH-03
- TC-FUNC-005 passo 2 (pedido montado) — sem link `/pedido-montado#<token>` alcançável
- Estados de saída cronometrados depois de fechar a aba (TC-JOURNEY-002 passo 3, TC-FUNC-001 passo 5, TC-FUNC-003 passo 4, TC-FUNC-004 passo 5) — só o estado aos 7 min 12 s; o corte de 5 min foi medido pelo caminho da aba escondida
- TC-REG-003 passo 3 (presença bloqueada no checkout) e a recusa no checkout — orçamento
- Robô de verdade (TC-SEC-004 passo 1, Googlebot) — o Playwright MCP sai com `webdriver` falso e UA sem "HeadlessChrome"
- Aba em segundo plano de verdade, fonte do sistema real, puxar com o dedo, Android real, TalkBack, Safari e Firefox — fora do browser da sessão (emulados por `visibilitychange`, `font-size` na raiz e eventos de toque sintéticos)
- Rede lenta (Slow 4G) no app do ateliê — o app em dev não passou da casca; precisa do build
- Joia sem foto, Guia sozinho, cliente em `/conta`, cliente logada preenchendo telefone e cidade, faixa "Outros" no design-check
- Variações não feitas por orçamento: 1440 e teclado no CH-01, fonte 200 % da nota de consentimento, foco não roubado com o leitor ao vivo, barras de "De onde vieram" com movimento reduzido
- Virada da meia-noite com a tela aberta e teto de 5.000 visitas — sem massa nem horário

---

## Rodada 2 — confirmação (2026-11-02)

**Veredito: pass.** Reteste dos oito bugs depois das fix tasks 05–08 (`qa/retest.md`): **8 resolved**, 0 still-open, 0 cannot-reproduce, 0 blocked. Nenhum achado novo no entorno.

| Bug | Severidade | Antes | Depois |
| --- | --- | --- | --- |
| BUG-003 | high | open | resolved — a 200 % em 390/360/320 a coluna de texto mede 244/214/174 px, gráfico e seta descem, sem rolagem lateral |
| BUG-004 | high | open | resolved — o nome mede 196/166/126 px (eram 124/94/54), "1 pessoa" desce, nada sobreposto |
| BUG-001 | medium | open | resolved — o cartão mantém o número e diz "Não consegui atualizar agora." com "Tentar de novo" |
| BUG-002 | medium | open | resolved — sem frescor com uma das leituras sem dado; com as duas, a mais antiga |
| BUG-005..008 | low | open | resolved — fonte, cores, recuo e 60 px conforme o protótipo |

Observações do entorno, sem bug: a 200 % em 320 o "s" do frescor fica sozinho na segunda linha; em 320 a 100 % o gráfico do cartão desce para baixo do texto; "Precisa de você" a 16 px (o protótipo desenha 20), anterior a este lote.

**Gate 3 (rodada 2):** registrado em 2026-11-02 no fecho do laço de conserto pedido pelo usuário ("ajuste os bugs"); as oito transições `open → resolved` foram gravadas nos `BUG-*`.
