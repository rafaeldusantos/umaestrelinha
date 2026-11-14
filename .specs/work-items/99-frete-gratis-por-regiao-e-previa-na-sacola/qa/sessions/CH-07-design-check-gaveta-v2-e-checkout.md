# Sessão CH-07 · design-check — a gaveta v2 e o checkout recebendo o CEP

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-07-design-check-gaveta-v2-e-checkout.md` · design-check · P1 |
| Status      | not-run (design): nenhuma das três fontes de design abriu na sessão     |
| Persona     | PER-01 Luana · conta: anonima                                          |
| Tour · modo | — · —                                                                  |
| Rodada      | confirmação (rodada 2): BUG-003, BUG-004, BUG-005, BUG-006, BUG-007     |
| Orçamento   | 7 ações de browser de 25                                               |
| Ambiente    | http://localhost:8092 (não chegou a ser aberta) · build não exposto · Chromium (playwright-cli 0.1.24, headless) · viewport 390 × 844 |
| Paridade    | rotas aplicadas antes de abrir: cotação `**/functions/v1/melhor-envio*` com a fixture A (com CORS); `https://*.supabase.co/**` e `**/g/collect*` abortados |

## Missão

Conferir, estado a estado, a gaveta v2 e o bloco Entrega recebendo o CEP contra os protótipos do Work Item,
registrando cada diferença com o valor do design e o observado.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Ler a fonte `claude_design` (projeto `4abe021d-d77e-4fe7-affd-524180315fa3`) pelo MCP do Claude Design | `list_files` recusou: `needs_design_scopes` (`user:design:read`). O token da sessão não tem acesso ao Claude Design; a mensagem diz para rodar `/design-login` no Claude Code | — |
| 02 | Preparar o browser: abrir, 390 × 844, rotas do `ambiente` | Sessão `CH-07` aberta, rotas aplicadas | — |
| 03 | Abrir a cópia publicada `https://claude.ai/artifact/2yUJyqwYr6tipVWQEh8xdd` (página "Sacola v2 (compacta)") numa aba separada | "Um momento…" em `claude.ai/api/challenge_redirect`, HTTP 403: a verificação de bot do claude.ai barra o browser headless. A costura já registrava que essa cópia não abria | — |
| 04 | Abrir a cópia migrada do checkout `https://claude.ai/code/artifact/41e4046b-6433-4e30-9670-f714f2dc2b75` | "Something went wrong — A network check stopped this artifact from loading." | — |
| 05 | Encerrar sem conferir | Pelo guia de conferência visual, fonte ilegível ⇒ `not-run (design)`. Não conferi pelos valores citados nos BUG nem pelas screenshots da rodada 1: seria conferir de memória. A loja (8092) não foi aberta | — |

**Edge cases tentados:** nada

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-UI-001 | blocked | 01, 03 | — | design: a fonte (`Black Friday - Sacola v2.html`) não abriu, nem pelo MCP nem pela cópia publicada. BUG-004 e BUG-005 seguem sem confirmação |
| TC-UI-002 | blocked | 01, 03 | — | design: a mesma fonte. BUG-003, BUG-006 e BUG-007 seguem sem confirmação |
| TC-UI-003 | blocked | 04 | — | design: `sf-checkout.jsx` (projeto `69224d8a-…`) sem MCP, e a cópia migrada não carregou |

Contagem: pass 0 · fail 0 · blocked 3 · skip 0

## Achados

nada

## Design

**Protótipo:** `4abe021d-d77e-4fe7-affd-524180315fa3` · Uma Estrelinha - Black Friday · `claude_design` · ilegível: o MCP respondeu `needs_design_scopes` e a cópia publicada respondeu 403 (challenge). `69224d8a-17ae-4b1f-a251-a8105b41edc2` · Uma Estrelinha - Loja · `claude_design`: a cópia migrada `claude.ai/code/artifact/41e4046b-…` parou em "A network check stopped this artifact from loading."

| #  | Tela · frame         | Elemento        | Propriedade   | Design                 | Observado              | Evidência                          | Achado |
| -- | -------------------- | --------------- | ------------- | ---------------------- | ---------------------- | ---------------------------------- | ------ |

Nenhuma diferença registrada: não houve comparação.

**Telas não conferidas:** gaveta da sacola: faixa e balão do ⓘ (TC-UI-001); rodapé da gaveta (TC-UI-002); `/checkout` › Entrega (TC-UI-003). Todas sem fonte legível.

## Spec-gaps

nada

## Fora da cobertura

- A confirmação de BUG-003 (rodapé ≤ 270 px), BUG-004 (balão a 12 px de cada borda), BUG-005 (faixa liberada de 42 px), BUG-006 (ícone de 20 px) e BUG-007 (gap de 10 px) contra o desenho. Motivo: as fontes de design não abriram na sessão
- O entorno das correções em FreeShippingBand, InfoTip, CartDrawer e CartShipping, pelo mesmo motivo
- TC-UI-003, pelo mesmo motivo
- Para destravar: dar à sessão o escopo do Claude Design (`/design-login` no Claude Code), ou informar como fonte de design um arquivo legível (o CSS e o JSX exportados, ou uma imagem dos frames)

## Debrief

- **Surpresas:** o token do MCP do Claude Design perdeu, ou nunca teve, o escopo `user:design:read` nesta sessão. Na rodada 1 a fonte foi lida
- **Próximo charter:** rodar de novo esta confirmação (CH-07, rodada 2) com o MCP autorizado. As 18 ações que sobraram bastam para os três TC: a faixa liberada e o balão, o rodapé recolhido e o botão
- **Padrão novo:** nada
