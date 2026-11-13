# Sessão CH-07 · Design-check das telas da campanha

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-07-design-check.md` · design-check · P1        |
| Status      | not-run (design): a fonte `claude_design` não pôde ser lida nesta sessão |
| Persona     | PER-01 Adri · conta: `admin-loja` (conta de dev do `seed.sql`; não usada) |
| Tour · modo | — · —                                                                  |
| Rodada      | exploração                                                             |
| Orçamento   | 0 ações de browser de 50                                               |
| Ambiente    | painel http://localhost:8093/admin · loja http://localhost:8092 · build não exposto · Chromium (agent-browser, não aberto) · viewports 390 · 1440 (não usados) |
| Paridade    | nenhum (a sessão não chegou a abrir o app)                             |

## Missão

Conferir, tela a tela, o que foi entregue contra o protótipo do Claude Design, registrando cada diferença com o
valor do design e o observado — com atenção ao selo, que é a peça nova que a cliente mais vê.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência |
| -- | --------------------------- | ----------------------------------------- | --------- |
| 01 | Abrir a fonte de design: `list_files` no Claude Design MCP, projeto `4abe021d-d77e-4fe7-affd-524180315fa3` | Recusado: `needs_design_scopes` (`user:design:read`, `user:design:write`). O token da sessão não tem acesso ao Claude Design. A mensagem diz para rodar `/design-login` no Claude Code e que tentar de novo não resolve | — |

Nenhuma tela foi aberta no browser. Sem a régua não há o que comparar, e as regras da fonte (design-check.md,
regra 1; o briefing) proíbem conferir de memória ou por screenshot antiga.

**Edge cases tentados:** nada

## Casos

| TC        | Veredito | Passo | Evidência | Nota |
| --------- | -------- | ----- | --------- | ---- |
| TC-UI-002 | skip     | 01    | —         | not-run (design): o protótipo `Black Friday - Selo v2.html` não foi lido, porque o Claude Design MCP recusou com `needs_design_scopes` |
| TC-UI-005 | skip     | 01    | —         | not-run (design): os protótipos `Painel - Campanhas, faixa e perfil.html`, `Black Friday - Vitrine ofertas.html` e `Black Friday - Home.html` não foram lidos pelo mesmo motivo |

Contagem: pass 0 · fail 0 · blocked 0 · skip 2

## Achados

nada

## Design

**Protótipo:** `4abe021d-d77e-4fe7-affd-524180315fa3` · Uma Estrelinha - Black Friday · `claude_design` · não lido (MCP sem escopo de design)

| #  | Tela · frame | Elemento | Propriedade | Design | Observado | Evidência | Achado |
| -- | ------------ | -------- | ----------- | ------ | --------- | --------- | ------ |

**Telas não conferidas:** todas as telas do charter, porque a fonte de design não pôde ser lida: o cartão na
listagem (`/ofertas`, Home) › `Cartao`/`SeloFaixa`/`Cores`; a página do produto › `SeloLinha`; a sacola; `/ofertas`;
Home › "Joias em oferta"; `/admin/campanhas`; `/admin/campanhas/nova` (com os erros); `/admin/campanhas/:id`;
`/admin/produtos/:id/editar` › Preço e estoque.

## Spec-gaps

nada

## Fora da cobertura

- O charter inteiro (as tentativas 1 a 4): o Claude Design MCP recusou com `needs_design_scopes`. Para retomar,
  alguém precisa rodar `/design-login` no Claude Code (ou dar à sessão um token com `user:design:read`) e relançar o CH-07
- A variação 768 × 1024 do TC-UI-002 e a variação de tom do TC-UI-005 (RN-14): não rodaram pelo mesmo motivo.
  A leitura de tom não depende do protótipo e pode ir para outro charter se for preciso

## Debrief

- **Surpresas:** o token do MCP de design não tem os escopos de design. A sonda de ambiente da Fase 2 não pegou isso
- **Próximo charter:** relançar o CH-07 depois do `/design-login`, com o mesmo briefing
- **Padrão novo:** sondar a fonte de design (um `list_files`) no preflight dos charters `design-check`, antes do lote
