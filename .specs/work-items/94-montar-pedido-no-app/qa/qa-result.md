```json
{
  "schema": "qa-result/v1",
  "verdict": "partial",
  "executed_at": "2026-11-08T16:40:00Z",
  "branch": "feature/94",
  "duration_min": 89,
  "gates": [
    {
      "name": "build",
      "command": "pnpm build",
      "status": "pass",
      "summary": "PASS — 3/3 apps, com as envs locais no shell; na Re-Validation 2 (e8b20c6c) o build do mobile-adm verde"
    },
    {
      "name": "lint",
      "command": "npx eslint . (por app)",
      "status": "pass",
      "summary": "store 2/2 · backoffice 23/5 · mobile-adm 0/0, igual à baseline"
    },
    {
      "name": "test",
      "command": "pnpm --filter @estrelinha/<ws> test --testTimeout=20000",
      "status": "pass",
      "summary": "22063/22063"
    },
    {
      "name": "e2e",
      "command": "—",
      "status": "skip",
      "summary": "sem rodada E2E"
    }
  ],
  "coverage": {
    "acceptance_total": 10,
    "acceptance_covered": 3,
    "items": [
      { "criterion": "UC-01", "validated_by": { "tc_ref": "TC-SMOKE-001", "type": "e2e" }, "status": "partial" },
      { "criterion": "UC-02", "validated_by": { "tc_ref": "TC-FUNC-002", "type": "e2e" }, "status": "covered" },
      { "criterion": "UC-03", "validated_by": { "tc_ref": "TC-FUNC-006", "type": "e2e" }, "status": "covered" },
      { "criterion": "UC-04", "validated_by": { "tc_ref": "TC-FUNC-008", "type": "e2e" }, "status": "partial" },
      { "criterion": "UC-05", "validated_by": { "tc_ref": "TC-FUNC-011", "type": "manual" }, "status": "covered" },
      { "criterion": "UC-06", "validated_by": { "tc_ref": "TC-FUNC-016", "type": "e2e" }, "status": "partial" },
      { "criterion": "UC-07", "validated_by": { "tc_ref": "TC-FUNC-021", "type": "e2e" }, "status": "partial" },
      { "criterion": "UC-08", "validated_by": { "tc_ref": "TC-FUNC-024", "type": "e2e" }, "status": "partial" },
      { "criterion": "UC-09", "validated_by": { "tc_ref": "TC-FUNC-027", "type": "e2e" }, "status": "partial" },
      { "criterion": "UC-10", "validated_by": { "tc_ref": "TC-FUNC-032", "type": "e2e" }, "status": "partial" }
    ],
    "missing": []
  },
  "test_cases": [
    { "tc_ref": "TC-SMOKE-001", "verdict": "pass" },
    { "tc_ref": "TC-SMOKE-002", "verdict": "pass" },
    { "tc_ref": "TC-SMOKE-003", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-001", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-002", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-003", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-004", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-005", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-006", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-001", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-002", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-003", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-004", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-005", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-006", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-007", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-008", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-009", "verdict": "skip" },
    { "tc_ref": "TC-FUNC-010", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-011", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-012", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-013", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-014", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-015", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-016", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-017", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-018", "verdict": "skip" },
    { "tc_ref": "TC-FUNC-019", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-020", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-021", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-022", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-023", "verdict": "skip" },
    { "tc_ref": "TC-FUNC-024", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-025", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-026", "verdict": "skip" },
    { "tc_ref": "TC-FUNC-027", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-028", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-029", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-030", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-031", "verdict": "skip" },
    { "tc_ref": "TC-FUNC-032", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-033", "verdict": "pass" },
    { "tc_ref": "TC-INT-001", "verdict": "skip" },
    { "tc_ref": "TC-INT-002", "verdict": "pass" },
    { "tc_ref": "TC-INT-003", "verdict": "blocked" },
    { "tc_ref": "TC-SEC-001", "verdict": "pass" },
    { "tc_ref": "TC-SEC-002", "verdict": "pass" },
    { "tc_ref": "TC-SEC-003", "verdict": "skip" },
    { "tc_ref": "TC-UI-001", "verdict": "pass" },
    { "tc_ref": "TC-UI-002", "verdict": "blocked" },
    { "tc_ref": "TC-CFR-001", "verdict": "pass" },
    { "tc_ref": "TC-CFR-002", "verdict": "pass" },
    { "tc_ref": "TC-CFR-003", "verdict": "skip" },
    { "tc_ref": "TC-CFR-004", "verdict": "pass" },
    { "tc_ref": "TC-PERSONA-001", "verdict": "pass" },
    { "tc_ref": "TC-PERSONA-002", "verdict": "pass" },
    { "tc_ref": "TC-REG-001", "verdict": "pass" },
    { "tc_ref": "TC-REG-002", "verdict": "skip" }
  ],
  "evidence": [
    { "label": "CH-01-r2-01-cartao-cliente.png", "path": "screenshots/CH-01-r2-01-cartao-cliente.png" },
    { "label": "CH-01-r2-02-duplo-toque-sacola.png", "path": "screenshots/CH-01-r2-02-duplo-toque-sacola.png" },
    { "label": "CH-01-r2-03-duplo-toque-segunda.png", "path": "screenshots/CH-01-r2-03-duplo-toque-segunda.png" },
    { "label": "CH-01-r2-04-revisar-entrega.png", "path": "screenshots/CH-01-r2-04-revisar-entrega.png" },
    { "label": "CH-01-r2-05-link-criado.png", "path": "screenshots/CH-01-r2-05-link-criado.png" },
    { "label": "CH-01-r2-06-voltar-montados.png", "path": "screenshots/CH-01-r2-06-voltar-montados.png" },
    { "label": "CH-01-r2-08-avancar.png", "path": "screenshots/CH-01-r2-08-avancar.png" },
    { "label": "CH-01-r2-09-voltar-montados-2.png", "path": "screenshots/CH-01-r2-09-voltar-montados-2.png" },
    { "label": "CH-03-r2-01-teto-soma-sacola.png", "path": "screenshots/CH-03-r2-01-teto-soma-sacola.png" },
    { "label": "CH-04-r2-01-folha-sair-so-cliente.png", "path": "screenshots/CH-04-r2-01-folha-sair-so-cliente.png" },
    { "label": "CH-04-r2-02-folha-sair-com-pecas.png", "path": "screenshots/CH-04-r2-02-folha-sair-com-pecas.png" },
    { "label": "CH-04-r2-03-voltar-fecha-folha.png", "path": "screenshots/CH-04-r2-03-voltar-fecha-folha.png" },
    { "label": "CH-04-r2-04-rascunho-retomado.png", "path": "screenshots/CH-04-r2-04-rascunho-retomado.png" },
    { "label": "CH-04-r2-05-criar-link-sem-nome.png", "path": "screenshots/CH-04-r2-05-criar-link-sem-nome.png" },
    { "label": "CH-04-r2-06-voltar-montados.png", "path": "screenshots/CH-04-r2-06-voltar-montados.png" },
    { "label": "CH-06-r2-01-cancelado-por-voce.png", "path": "screenshots/CH-06-r2-01-cancelado-por-voce.png" },
    { "label": "CH-06-r2-02-historico-renovado.png", "path": "screenshots/CH-06-r2-02-historico-renovado.png" },
    { "label": "CH-06-r2-03-historico-concluido.png", "path": "screenshots/CH-06-r2-03-historico-concluido.png" },
    { "label": "CH-06-r2-04-loja-pix-pedido-criado.png", "path": "screenshots/CH-06-r2-04-loja-pix-pedido-criado.png" },
    { "label": "CH-07-r2-01-falha-gravacao.png", "path": "screenshots/CH-07-r2-01-falha-gravacao.png" },
    { "label": "CH-07-r2-02-editar-endereco-uma-vez.png", "path": "screenshots/CH-07-r2-02-editar-endereco-uma-vez.png" },
    { "label": "CH-07-r2-03-alana-caixa-marcada.png", "path": "screenshots/CH-07-r2-03-alana-caixa-marcada.png" },
    { "label": "CH-07-r2-04-alana-padrao.png", "path": "screenshots/CH-07-r2-04-alana-padrao.png" },
    { "label": "CH-08-r2-01-teclado-200-email-visivel.png", "path": "screenshots/CH-08-r2-01-teclado-200-email-visivel.png" },
    { "label": "CH-08-r2-02-320-200-opcional-transborda.png", "path": "screenshots/CH-08-r2-02-320-200-opcional-transborda.png" },
    { "label": "CH-09-r2-01-montados.png", "path": "screenshots/CH-09-r2-01-montados.png" },
    { "label": "CH-09-r2-02-concluida.png", "path": "screenshots/CH-09-r2-02-concluida.png" },
    { "label": "CH-09-r2-03-aberta.png", "path": "screenshots/CH-09-r2-03-aberta.png" },
    { "label": "CH-09-r2-04-passo1.png", "path": "screenshots/CH-09-r2-04-passo1.png" },
    { "label": "CH-09-r2-05-folha-variacao.png", "path": "screenshots/CH-09-r2-05-folha-variacao.png" },
    { "label": "RT-r2-BUG-001-voltar-montados.png", "path": "screenshots/RT-r2-BUG-001-voltar-montados.png" },
    { "label": "RT-r2-BUG-002-duplo-toque.png", "path": "screenshots/RT-r2-BUG-002-duplo-toque.png" },
    { "label": "RT-r2-BUG-003-cancelar-1.png", "path": "screenshots/RT-r2-BUG-003-cancelar-1.png" },
    { "label": "RT-r2-BUG-003-entorno-leitura.png", "path": "screenshots/RT-r2-BUG-003-entorno-leitura.png" },
    { "label": "RT-r2-BUG-004-200-teclado.png", "path": "screenshots/RT-r2-BUG-004-200-teclado.png" },
    { "label": "RT-r2-BUG-007-folha-sair.png", "path": "screenshots/RT-r2-BUG-007-folha-sair.png" },
    { "label": "RT-r2-BUG-009-cancelado.png", "path": "screenshots/RT-r2-BUG-009-cancelado.png" },
    { "label": "RT-r2-BUG-011-concluida.png", "path": "screenshots/RT-r2-BUG-011-concluida.png" },
    { "label": "RT-r2-BUG-013-combinado-zera.png", "path": "screenshots/RT-r2-BUG-013-combinado-zera.png" },
    { "label": "RT-r2-BUG-014-cep.png", "path": "screenshots/RT-r2-BUG-014-cep.png" },
    { "label": "RT-r2-BUG-014-cupom.png", "path": "screenshots/RT-r2-BUG-014-cupom.png" },
    { "label": "RT-r2-BUG-015-aberta.png", "path": "screenshots/RT-r2-BUG-015-aberta.png" },
    { "label": "RT-r2-BUG-016-total-barra.png", "path": "screenshots/RT-r2-BUG-016-total-barra.png" },
    { "label": "RT-r2-BUG-017-cliente-nova.png", "path": "screenshots/RT-r2-BUG-017-cliente-nova.png" },
    { "label": "RT-r2-BUG-018-acima-do-estoque.png", "path": "screenshots/RT-r2-BUG-018-acima-do-estoque.png" },
    { "label": "RT-r2-BUG-019-revisar.png", "path": "screenshots/RT-r2-BUG-019-revisar.png" },
    { "label": "RT-r2-BUG-019-sinal-desconto.png", "path": "screenshots/RT-r2-BUG-019-sinal-desconto.png" },
    { "label": "RT-r2-BUG-020-manter.png", "path": "screenshots/RT-r2-BUG-020-manter.png" },
    { "label": "RT-r2-BUG-020-continuar-montando.png", "path": "screenshots/RT-r2-BUG-020-continuar-montando.png" },
    { "label": "RT-r2-BUG-020-montados.png", "path": "screenshots/RT-r2-BUG-020-montados.png" }
  ],
  "issues": {
    "total": 0,
    "by_severity": { "critical": 0, "high": 0, "medium": 0, "low": 0 }
  }
}
```

# Resultado de QA — 94 · Montar pedido no app do ateliê, com a leitura dos dados da cliente por IA

**Gate 3:** confirmado em 2026-11-08

## Resumo

**Veredito:** partial — os 20 bugs da rodada 1 passam no reteste e nada regrediu, mas o TC-INT-003 (P1, concluir
pelo PIX e o pedido montado virar Concluída) segue `blocked` pelo ambiente.

A rodada de confirmação rodou os sete charters que tinham TC `fail` ou `blocked` na rodada 1 (CH-01, CH-03, CH-04,
CH-06, CH-07, CH-08, CH-09) e retestou os 20 bugs abertos, em 390 × 844 no app, a 200 % de fonte com teclado
simulado, em 320 × 568 e no painel em 1440 × 900. Os 13 TC que falharam na r1 passam agora, e o TC-FUNC-033
(blocked na r1) passou com a falha da gravação provocada no browser. A Adri monta pelo celular, toca duas vezes em
"Acrescentar" sem duplicar a peça (também com quantidade 5 e promoção), vê o total na barra desde o passo das
peças, vê a Retirada na prévia de entrega, cria o link e o voltar a leva a Montados sem reabrir a montagem (três
caminhos, inclusive a partir de um rascunho retomado); a 200 % de fonte o campo digitado fica visível com o teclado
aberto; "Cancelar" e Esc durante "Lendo o texto…" fecham a folha sem trocar o que ela digitou; e o histórico do
pedido montado diz o que aconteceu com o link. As doze divergências de desenho da r1 batem com o protótipo nas
telas conferidas, e o painel diz a frase certa quando a gravação falha, sem gravar nada.

O veredito não é `pass` por cobertura, não por defeito: o link criou o pedido #0388 "Aguardando pagamento", mas sem
um Mercado Pago real o PIX não é aprovado e a volta "Concluída" não pôde ser vista. O TC-UI-002 (peça sem foto, P2)
segue `blocked` por massa. Nenhum achado novo é regressão nem `critical`/`high`; foram a Sugestões de backlog, como
pede a rodada de confirmação. O mais pesado — uma cliente cadastrada **sem nome** pode ser escolhida e só é recusada
no "Criar link", sem como corrigir no app — está também em Riscos residuais.

| TC                                    | Critérios                     | Bugs novos | Reabertos | Reteste                                                     |
| ------------------------------------- | ----------------------------- | ---------- | --------- | ----------------------------------------------------------- |
| pass 47 · fail 0 · blocked 2 · skip 9 | 3 de 10 cobertos (7 parciais) | 0          | 0         | resolved 20 · still-open 0 · cannot-reproduce 0 · blocked 0 |

## Rodada

- **Ambiente:** app `http://localhost:8084`, painel `http://localhost:8083` (CH-07), loja `http://localhost:8082`
  (CH-06); Supabase local (API 54441) e edge functions locais; `*.supabase.co` bloqueado por rota; Mercado Pago não
  configurado (de propósito)
- **Branch / build:** `feature/94` @ `e8b20c6c` (informado; o build não é exposto na tela)
- **Execução:** 2026-11-08 ~12:11 → ~13:40 BRT (≈ 89 min), modo `confirmação`, rodada 2; o reteste correu de 12:50
  a 13:00
- **Browser:** Chromium headless (Playwright MCP) · **Viewports:** 390 × 844, 390 × 500 (teclado simulado) e
  320 × 568 com a fonte da raiz a 200 %; painel 1440 × 900
- **Personas e acesso:** PER-01, PER-02, PER-03 e PER-04 → `admin-atelie`; PER-06 → `anonima` (contexto isolado na
  loja, CH-06). PER-05 sem sessão nesta rodada (o CH-05 passou inteiro na r1)

## Gate técnico

- **Validation do Dev:** `.specs/work-items/94-montar-pedido-no-app/qa-report.md` — PASS, de 2026-11-08 (Re-Validation
  2 sobre `e8b20c6c`)
- **Rodada E2E:** sem rodada E2E

| Gate  | Status | Resumo |
| ----- | ------ | ------ |
| build | pass   | `pnpm build` 3/3 apps com as envs locais no shell; o build do mobile-adm verde de novo na Re-Validation 2 |
| lint  | pass   | store 2/2 · backoffice 23/5 · mobile-adm 0/0, igual à baseline |
| test  | pass   | 22063/22063 — core 5510, functions 1566, mobile-adm 2713 (remedido em `e8b20c6c`), backoffice 5183, store 7091 (remedido) |
| e2e   | skip   | sem rodada E2E |

## Cobertura — critério → TC

| Critério | Fonte | TC | Veredito | Status |
| -------- | ----- | -- | -------- | ------ |
| UC-01 | spec | TC-SMOKE-001, TC-FUNC-001, TC-JOURNEY-004, TC-INT-003, TC-SEC-001, TC-REG-001 | pass · blocked (TC-INT-003) | partial |
| UC-02 | spec | TC-FUNC-002, 003, 004, 005, 025, TC-JOURNEY-001, TC-JOURNEY-003, TC-SEC-001, TC-SEC-002 | pass | covered |
| UC-03 | spec | TC-FUNC-006, TC-FUNC-007, TC-JOURNEY-002, TC-SMOKE-002 | pass | covered |
| UC-04 | spec | TC-FUNC-008, 009, 010, TC-INT-001, TC-SEC-003 | pass · skip (TC-FUNC-009, TC-INT-001, TC-SEC-003) | partial |
| UC-05 | spec | TC-FUNC-011–015, TC-JOURNEY-001 | pass | covered |
| UC-06 | spec | TC-FUNC-016–020, TC-UI-002 | pass · skip (TC-FUNC-018) · blocked (TC-UI-002) | partial |
| UC-07 | spec | TC-FUNC-021, 022, 023 | pass · skip (TC-FUNC-023) | partial |
| UC-08 | spec | TC-FUNC-024, 025, 026, TC-SMOKE-002 | pass · skip (TC-FUNC-026) | partial |
| UC-09 | spec | TC-FUNC-027–031, TC-INT-002, TC-SMOKE-003, TC-JOURNEY-004 | pass · skip (TC-FUNC-031) | partial |
| UC-10 | spec | TC-FUNC-032, 033, TC-JOURNEY-005, TC-REG-002 | pass · skip (TC-REG-002) | partial |

**Sem cobertura:** nada — todo critério teve ao menos um TC executado.

Os TC dos charters que não rodaram nesta rodada (CH-02, CH-05) e os demais que passaram na r1 herdam o `pass` de
`qa-result-2026-11-08-r1.md`; os `skip` da r1 seguem `skip`. O TC-FUNC-025 passou no CH-01 e no CH-04 e ficou `skip`
no CH-03 só por orçamento (o mesmo voltar, com o olhar do dinheiro); como o total do cartão em Montados igual ao da
revisão foi conferido no CH-01 (R$ 489,80), o `skip` ali é não-execução, e o veredito fica `pass`.

## Sessões

| Charter | Persona | Tour | Status | Ações | TC | Achados | Bugs |
| ------- | ------- | ---- | ------ | ----- | -- | ------- | ---- |
| CH-01 | PER-01 | Feature | done | 34 de 35 | pass 7 | 0 (1 sugestão) | — |
| CH-03 | PER-01 | Money | done | 23 de 25 | pass 1 · blocked 1 · skip 1 | 0 | — |
| CH-04 | PER-02 | Back-Button | done | 25 de 35 | pass 2 | 0 (1 sugestão) | — |
| CH-06 | PER-02 (+ PER-06) | Feature | done | 27 de 25 | pass 1 · blocked 1 | 0 (2 sugestões) | — |
| CH-07 | PER-04 | Feature | done | 25 de 25 | pass 1 | 0 (3 observações) | — |
| CH-08 | PER-03 | — (CFR) | done | 17 de 18 | pass 2 | 0 (2 sugestões) | — |
| CH-09 | PER-01 | — (design-check) | done | 25 de 25 | pass 1 · blocked 1 | 0 | — |
| CH-02 | PER-01 | Paste | not-run (confirmação: todos os TC passaram na r1; o BUG-003 foi retestado à parte) | — | herdados da r1 | — | — |
| CH-05 | PER-05 | Feature | not-run (confirmação: todos os TC passaram na r1) | — | herdados da r1 | — | — |

## CFR

| Categoria             | Jornadas | Resultado | Bugs |
| --------------------- | -------- | --------- | ---- |
| Acessibilidade        | —        | não remedida nesta rodada (o estado de erro de BUG-014 — `aria-invalid`, `aria-describedby` — passou no reteste) | — |
| Responsividade        | J-01     | fricção   | — (a 200 % o campo digitado fica visível e cabeçalho e barra não se sobrepõem; ressalvas S-1 e S-2 em Sugestões de backlog) |
| Performance percebida | —        | não medida — rede lenta não emulada | — |
| Segurança visível     | J-03     | ok        | — (o rascunho guarda só peças, cupom, combinado e o id da conta — CH-04 passo 04) |

## Design-check

- **Protótipo:** Claude Design `a780eec8-8aba-4d6e-8b4c-2c485e2750c7` › `Montar Pedido.dc.html` — Montados, passo 1,
  folha da variação, a confirmação "Peça acrescentada.", pedido montado Aberta e Concluída. Os valores de referência
  são os da tabela D1–D30 da r1; nesta rodada o protótipo foi relido só nas linhas 1–60
- **Status:** done
- **Divergências:** 0 novas. As de BUG-010 a BUG-020 batem com o desenho nas telas conferidas pelo CH-09 e pelo
  reteste

## Bugs novos

Por nível: Bloqueia a conclusão 0 · Perda de dados 0 · Dano à confiança 0 · Fricção 0 · Cosmético 0
Por severidade: critical 0 · high 0 · medium 0 · low 0

nada

**Reabertos:** nada

## Lotes de correção sugeridos

nada — sem bug aberto ao fim da rodada (os 20 estão propostos `resolved`).

## Transições propostas

| Bug | Título (do arquivo, letra por letra) | Origem | De → para | Severidade | Evidência |
| --- | ------------------------------------ | ------ | --------- | ---------- | --------- |
| BUG-001 | [Pedido montado] Voltar depois de "Criar link" reabre a montagem vazia em vez de Montados | reteste | open → resolved | mantida (high) | `screenshots/RT-r2-BUG-001-voltar-montados.png` |
| BUG-002 | [Montagem · Peças] Duplo toque em "Acrescentar" põe a mesma peça duas vezes na sacola | reteste | open → resolved | mantida (high) | `screenshots/RT-r2-BUG-002-duplo-toque.png` |
| BUG-003 | [Folha "Colar texto"] Cancelar durante a leitura não fecha, e a leitura troca o que a Adri digitou | reteste | open → resolved | mantida (high) | `screenshots/RT-r2-BUG-003-cancelar-1.png` |
| BUG-004 | [Montagem] A 200 % de fonte, cabeçalho e barra fixos cobrem a tela e escondem o campo digitado — fonte grande | reteste | open → resolved | mantida (high) | `screenshots/RT-r2-BUG-004-200-teclado.png` |
| BUG-005 | [Montagem · barra fixa] O total fica "—" no passo das peças, com peças na sacola | reteste | open → resolved | mantida (medium) | `screenshots/RT-r2-BUG-016-total-barra.png` |
| BUG-006 | [Montagem · Passo 1] O cartão da cliente escolhida não mostra o telefone nem "N pedidos na loja" | reteste | open → resolved | mantida (medium) | `screenshots/CH-01-r2-01-cartao-cliente.png` |
| BUG-007 | [Montagem] Voltar com a folha "Sair sem criar o link?" aberta sai da montagem em vez de fechar a folha | reteste | open → resolved | mantida (medium) | `screenshots/RT-r2-BUG-007-folha-sair.png` |
| BUG-008 | [Montagem · Revisar] A prévia de entrega para CEP de Porto Alegre não mostra a Retirada no escritório | reteste | open → resolved | mantida (medium) | `screenshots/CH-01-r2-04-revisar-entrega.png` |
| BUG-009 | [Pedido montado · Histórico] Renovar, cancelar e concluir gravam linhas sem o que aconteceu com o link | reteste | open → resolved | mantida (low) | `screenshots/RT-r2-BUG-009-cancelado.png` |
| BUG-010 | [Montagem] A confirmação "Peça acrescentada." não some e segue no topo até o Revisar | reteste | open → resolved | mantida (low) | `screenshots/RT-r2-BUG-019-revisar.png` |
| BUG-011 | [Pedido montado · Concluída] A faixa não tem o tom de concluído e "Ver o pedido" fica no fim da rolagem | reteste | open → resolved | mantida (low) | `screenshots/RT-r2-BUG-011-concluida.png` |
| BUG-012 | [Montagem · indicador de passos] Sem os nomes dos passos e sem o destaque do passo atual | reteste | open → resolved | mantida (low) | `screenshots/CH-09-r2-04-passo1.png` |
| BUG-013 | [Montagem · barra fixa] Motivo sem a cor de espera, botão estreito e a recusa do combinado fora da barra | reteste | open → resolved | mantida (low) | `screenshots/RT-r2-BUG-013-combinado-zera.png` |
| BUG-014 | [Campo de texto com erro] CEP não achado e cupom recusado não marcam o campo como erro | reteste | open → resolved | mantida (low) | `screenshots/RT-r2-BUG-014-cep.png` |
| BUG-015 | [Pedido montado · Aberta] Cartão do link, mensagem, histórico e ações com outro desenho | reteste | open → resolved | mantida (low) | `screenshots/RT-r2-BUG-015-aberta.png` |
| BUG-016 | [Valores em dinheiro e nome da cliente] Sem a tipografia de destaque do protótipo | reteste | open → resolved | mantida (low) | `screenshots/RT-r2-BUG-016-total-barra.png` |
| BUG-017 | [Montagem · Passo 1] Resultados da busca, convite de colar e formulário de endereço com outra estrutura | reteste | open → resolved | mantida (low) | `screenshots/RT-r2-BUG-017-cliente-nova.png` |
| BUG-018 | [Folha da variação] Chip escolhido, aviso de material e linha de estoque diferentes do protótipo | reteste | open → resolved | mantida (low) | `screenshots/RT-r2-BUG-018-acima-do-estoque.png` |
| BUG-019 | [Textos da montagem e do pedido montado] Rótulos e sinais que divergem do protótipo | reteste | open → resolved | mantida (low) | `screenshots/RT-r2-BUG-019-revisar.png` |
| BUG-020 | [Medidas] Foto da peça no pedido montado, raios, espaços e botões secundários fora do protótipo | reteste | open → resolved | mantida (low) | `screenshots/RT-r2-BUG-020-manter.png` |

**Reteste `blocked`:** nada

Texto sugerido para o Histórico de cada um: `2026-11-08 · open → resolved · reteste da rodada 2 (confirmação) sobre
feature/94 @ e8b20c6c — ver retest.md › BUG-NNN`.

## Achados que não viraram bug

- Cliente cadastrada sem nome (só e-mail) escolhida no passo 1 só é recusada no "Criar link" do passo 4, com
  "Informe o nome da cliente." (`order-proposals?action=save → 400`), sem campo para corrigir no app; contorno:
  "Alterar" e outra cliente (CH-04 passo 08, 1 de 1) — `spec-gap`: a spec lista "Falta o nome da cliente." entre os
  motivos da barra, mas não diz o que acontece com uma ficha cadastrada sem nome. Rodada de confirmação → Sugestões
  de backlog, e Riscos residuais
- A 320 × 568 com a fonte a 200 %, o rótulo "Complemento" + "Opcional" sai colado e empurra a página 42 px para o
  lado (CH-08 passo 04, 2 de 2) — defeito de responsividade abaixo de `high` e não regressão (a r1 não mediu essa
  tela com o endereço aberto) → Sugestões de backlog; perto do nome acessível "ComplementoOpcional" que a r1 já sugeriu
- Com a fonte a 200 % e o teclado aberto, o foco vindo do teclado põe o campo atrás da barra fixa (CH-08 passo 02) —
  `spec-gap` `polimento` → Sugestões de backlog
- O segundo voltar depois de "Criar link" sai do app, porque a entrada de Pedidos foi substituída pela de Montados
  (CH-01 passo 08, CH-04 passo 11) — `conforme a fonte` (D-43 pede só que a montagem não volte); cair em Pedidos vai
  a Sugestões de backlog como `polimento`
- A lista de Montados mostra o estado antigo por ~1 s ao voltar de um cancelamento e se corrige sozinha (CH-06 passo
  05) — `polimento` → Sugestões de backlog
- O aviso de cookies cobre "Pagar … com PIX" em `/pedido-montado` a 390 até ser fechado (CH-06 passo 09) — loja,
  feature 89: `pré-existente` → Sugestões de backlog
- No painel, trocar de uma cliente com endereços para uma sem endereço deixa "Salvar no cadastro da cliente"
  desmarcada; numa montagem limpa ela vem marcada (CH-07) — `spec-gap` `polimento` → Sugestões de backlog
- No "Editar" do painel, o endereço do pedido reabre em "Outro endereço" mesmo já estando na lista de salvos (CH-07)
  — `polimento` → Sugestões de backlog (o mesmo padrão que a r1 sugeriu para o Editar do app)
- Apagar o código do cupom depois de "Cupom inválido." mantém a borda de erro até um novo "Aplicar" (entorno do
  reteste de BUG-014) — `polimento`, não é o BUG-014 → Sugestões de backlog
- Marta Lúcia QA com quatro endereços salvos idênticos, de antes da rodada (CH-07) — mesma assinatura da Sônia Teste
  QA na r1, mas sem a ação que os criou à vista e sem passos para reproduzir → Riscos residuais
- "Sair" não encontrado pela tela do app (CH-01 passo 11, CH-04 passo 13) — não investigado e fora da superfície da
  mudança; sem achado → Fora da cobertura

## Perguntas ao produto

nada — rodada de confirmação.

## Sugestões de backlog

| Comportamento | Onde | Classe | Título sugerido para o Work Item |
| ------------- | ---- | ------ | -------------------------------- |
| A cliente cadastrada sem nome pode ser escolhida e só é recusada no "Criar link", com "Informe o nome da cliente.", sem como pôr o nome no app | app, Montar pedido › passos 1 e 4 (CH-04 passo 08, `screenshots/CH-04-r2-05-criar-link-sem-nome.png`) | excedente (seria `mudança`; a rodada de confirmação não pergunta) | Ficha sem nome na montagem: avisar no passo 1 e deixar pôr o nome |
| A 320 × 568 com a fonte a 200 %, o rótulo "Complemento"/"Opcional" não quebra e a página rola 42 px para o lado | app, passo 1 › endereço (CH-08 passo 04, `screenshots/CH-08-r2-02-320-200-opcional-transborda.png`) | polimento | Rótulo do Complemento que quebra linha, sem rolagem lateral |
| Com a fonte a 200 % e o teclado aberto, o foco vindo do teclado põe o campo atrás da barra fixa | app, montagem (CH-08 passo 02) | polimento | Campo focado acima da barra fixa da montagem |
| Depois de "Criar link", o segundo voltar sai do app em vez de cair em Pedidos | app, Pedidos › Montados (CH-01 passo 08, CH-04 passo 11) | polimento | Voltar de Montados para Pedidos depois de criar o link |
| A lista de Montados mostra por ~1 s o estado antigo ao voltar de um cancelamento | app, Montados (CH-06 passo 05) | polimento | Montados atualizada ao voltar de um cancelamento |
| O aviso de cookies cobre "Pagar … com PIX" em `/pedido-montado` a 390 até ser fechado | loja, pedido montado (CH-06 passo 09) | pré-existente | Aviso de cookies sem cobrir o botão de pagar |
| "Salvar no cadastro da cliente" vem desmarcada depois de "Trocar" para uma cliente sem endereço | painel, Montar pedido (CH-07) | polimento | Caixa "Salvar no cadastro" igual ao trocar de cliente |
| No "Editar", o endereço do pedido já salvo reabre em "Outro endereço" | painel, Editar pedido montado (CH-07) | polimento | Editar reabre o endereço salvo escolhido |
| Apagar o código do cupom não limpa o estado de erro até um novo "Aplicar" | app, passo 3 (reteste de BUG-014) | polimento | Erro do cupom some ao apagar o código |

## Riscos residuais

- **Cliente cadastrada sem nome:** se a base tiver fichas sem nome (por exemplo, contas criadas por login na loja sem
  compra), a Adri não monta o pedido delas pelo app — percorre os quatro passos e só no "Criar link" é recusada. Não
  foi medido quantas fichas sem nome existem; vale conferir antes de decidir a prioridade da sugestão
- **Endereços salvos duplicados** (Marta Lúcia QA, 4 iguais; Sônia Teste QA na r1) — duas clientes em duas rodadas,
  de origem não vista na tela. O CH-07 provou que o painel grava o endereço uma vez só, mesmo depois de duas falhas;
  falta um charter curto montando no **app** com "Salvar no cadastro" para cliente que já tem o mesmo endereço
- **TC-INT-003 passos 2–4** — o link criou o pedido #0388 "Aguardando pagamento", mas o estado do P-0038 depois disso
  (Aberta ou Concluída) e a origem "Pedido montado" no painel não foram vistos
- **Frete divergente na loja depois de editar** (r1, CH-06 A-2, 1 de 1) — não reconferido nesta rodada
- **Reteste de design por tabela:** BUG-010..020 foram conferidos contra os valores medidos na r1; o protótipo não foi
  relido por inteiro nesta rodada
- **Renovar ao vivo** — a linha "Prazo renovado · link novo…" foi conferida em renovações já gravadas; a folha e o
  aviso do renovar não rodaram (a massa não tem Expirada)

## Fora da cobertura

- **Charters `not-run`:** CH-02 e CH-05 — rodada de confirmação, todos os TC passaram na r1 (o BUG-003, do CH-02, foi
  retestado à parte); PER-05 sem sessão nesta rodada
- **`blocked`:** TC-INT-003 (P1 — Mercado Pago não configurado: o PIX não é aprovado), TC-UI-002 (P2 — a massa não tem
  peça sem foto)
- **TC P0 em `skip`, herdados da r1:** TC-FUNC-009 (usar a ficha / corrigir o e-mail) e TC-INT-001 (a ficha da cliente
  nova criada uma vez só com o link)
- **TC P1 em `skip`, herdados da r1:** TC-FUNC-018 (gravação), TC-FUNC-023 (ordem do resumo), TC-FUNC-026 (preço que
  mudou), TC-SEC-003 (Clientes e detalhe de pedido), TC-REG-002 (o pedido do painel aberto na loja e no app)
- **TC P2 em `skip`:** TC-FUNC-031, TC-CFR-003 (rede lenta)
- Cliente nova (J-01) até o link, a ficha e o endereço gravados só depois de "Criar link" e a conferência no painel —
  passavam na r1, fora do recorte
- Desconto combinado, troca de endereço salvo e gravação do TC-JOURNEY-002; duplo toque em "Criar link" e em
  "Cancelar pedido"
- A folha de sair com "Cliente nova" digitada; os demais TC do CH-04 (TC-JOURNEY-003, TC-FUNC-005, TC-SEC-002,
  TC-REG-001)
- Os passos 2 a 4 da montagem, as folhas e o pedido montado a 200 %; 100 % e 130 % não remedidos
- Pedido montado Expirada e a folha Renovar contra o protótipo; "Criando o link…" e "preço que mudou" no Revisar
- Falha da gravação no painel por erro devolvido pela function (500 com corpo) — só a conexão recusada foi exercitada
- "Sair" pelo menu da conta do app — não achado em duas sessões; o contexto foi limpo pelo armazenamento
- Android real: gesto físico de voltar, PWA instalado, teclado virtual real, TalkBack e fonte do sistema
- Rede lenta e rede cortada nas ações do pedido montado
- Massa alterada pela rodada: P-0038 (com o pedido #0388 criado na loja, não pago), P-0040, P-0041, P-0042 e P-0043
  criados e abertos; P-0039 cancelado; Bia QA ganhou o endereço Rua dos Andradas, 1001 (não padrão); Alana Muniz
  ganhou o endereço padrão Rua Siqueira Campos, 77
