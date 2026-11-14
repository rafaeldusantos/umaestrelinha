# Sessão CH-01 · A prévia de frete na sacola, dentro da região da campanha (continuação 2)

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-01-previa-de-frete-na-sacola-dentro-da-regiao.md` · exploratório · P0 |
| Status      | done (orçamento esgotado: o passo 4 (RS) e a gaveta em 1440 × 900 ficaram de fora) |
| Persona     | PER-01 Luana · conta: anonima |
| Tour · modo | Feature · por cenário (J-01), mas rodada de confirmação: sem tour |
| Rodada      | confirmação (rodada 2, segunda continuação de `sessions/CH-01-previa-de-frete-na-sacola-dentro-da-regiao-continuacao.md`) |
| Orçamento   | 25 ações de browser de 25 (o `close` final fora da conta) |
| Ambiente    | http://localhost:8092 (worktree store__feature-99) · build não exposto · Chromium headless (`playwright-cli -s=CH-01c`) · viewports 390 × 844 · 1440 × 900 (só o checkout) |
| Paridade    | cotação interceptada com a fixture A (200 + CORS); `https://*.supabase.co/**` e `**/g/collect*` abortados; frete grátis ligado, R$ 450,00, Sul + Sudeste (não alterado) |

## Missão

Como Luana, no celular, confirmar que dá para saber o frete de São Paulo e se o frete grátis vale para ela ainda na
sacola, e chegar ao checkout com o mesmo Total e sem digitar o CEP de novo, procurando qualquer promessa da gaveta
que o checkout desmente.

Nesta continuação: o passo 3 do TC-FUNC-006 (Entrega e Resumo do checkout, Total na mesma forma de pagamento, pela
decisão Q1 de `decisoes-produto.md`), o passo 4 (90010-000) e a variação 1440 × 900.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Preparar: abrir o browser, 390 × 844, rota da cotação (fixture A + CORS), bloqueio do Storage hospedado e do GA4, entrar direto na página do Pingente Afetivo Bebê na Barriga com Cabelo (5 ações) | a página da peça a R$ 279,90 | — |
| 02 | Rolar 700 px, aceitar os cookies, tocar "Adicionar à sacola" | a gaveta "Sua sacola" abre com a peça, quantidade 1, "Faltam R$ 170,10 para o frete grátis", barra R$ 279,90 / R$ 450,00, Total R$ 279,90 | — |
| 03 | Subir a quantidade para 2, digitar 01310-100, tocar "Calcular" | "Frete grátis liberado" com o ⓘ, sem barra; "Frete para 01310-100 · São Paulo/SP"; PAC · Correios marcado, "Grátis" e "R$ 21,40" (estilo `line-through`, conferido por `eval` no elemento); SEDEX · Correios R$ 38,90; Subtotal (2 itens) R$ 559,80; "Frete · PAC" Grátis; **Total R$ 559,80** | — (a gaveta SP/390 já tem print: `screenshots/CH-01-r2b-03-gaveta-sp-liberado-390.png`) |
| 04 | Tocar "Finalizar Pedido" e abrir o passo Entrega ("Preencher") | /checkout; Entrega com o CEP **01310-100 já preenchido**, "Trazido da sua sacola · Bela Vista — São Paulo/SP", Rua, Bairro, Cidade e UF preenchidos; "Forma de envio": PAC · Correios **marcado**, "Grátis" com "R$ 21,40" ao lado, mesmo prazo da gaveta ("Chega entre 25 e 27 de novembro"); SEDEX R$ 38,90, mesmo prazo ("19 e 20 de novembro"), mesma ordem | `screenshots/CH-01-r2c-01-checkout-sp-entrega-resumo-390.png` |
| 05 | Abrir o Resumo do pedido | "Frete grátis liberado"; Subtotal R$ 559,80; Desconto PIX (7%) −R$ 39,19; "Frete · Correios PAC" Grátis; Total R$ 520,61 (no PIX, pré-marcado). Sem o desconto do meio de pagamento, o Total é R$ 559,80 = Total da gaveta (559,80 − 39,19 = 520,61; o frete não entra em nenhum dos dois) | `screenshots/CH-01-r2c-01-checkout-sp-entrega-resumo-390.png` |
| 06 | Redimensionar o checkout para 1440 × 900 | mesma Entrega (01310-100 trazido, PAC Grátis R$ 21,40 marcado) e mesmo Resumo (Subtotal R$ 559,80, Desconto PIX, Frete Grátis, Total R$ 520,61). Orçamento esgotado aqui (25ª ação) | — |

**Edge cases tentados:** nada (rodada de confirmação)

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-006 | blocked | 03–06 | `screenshots/CH-01-r2c-01-checkout-sp-entrega-resumo-390.png` · `screenshots/CH-01-r2b-03-gaveta-sp-liberado-390.png` | bloqueado por orçamento: passos 1, 2 (sessão anterior) e 3 em SP conferem. Passo 3: CEP trazido, PAC "Grátis" com o R$ 21,40 riscado e marcado, SEDEX cobrado, e o Total da gaveta (R$ 559,80) é o do checkout no mesmo preço cheio (Subtotal R$ 559,80 + frete grátis; o checkout aplica só o Desconto PIX do meio pré-marcado, Q1). Não escolhi "cartão": comparei pelo preço cheio, como o briefing permite. Falta o passo 4 (90010-000) e a gaveta em 1440 × 900; o checkout em 1440 confere. Sem falha observada |

Contagem: pass 0 · fail 0 · blocked 1 · skip 0

## Achados

nada

## Spec-gaps

nada (rodada de confirmação)

## Fora da cobertura

- TC-FUNC-006 passo 4 (90010-000, Porto Alegre/RS, região Sul): gaveta, ⓘ e checkout. Motivo: orçamento (25 de 25)
- Variação 1440 × 900 na gaveta: só o checkout foi visto em 1440 (passo 06). Motivo: orçamento
- Total com "cartão" escolhido no checkout: não escolhido. O preço cheio do Resumo (Subtotal R$ 559,80, frete Grátis) foi a comparação. Motivo: orçamento; o passo Pagamento ainda pedia Contato e o número da Entrega
- O riscado do R$ 21,40 no checkout: o snapshot mostra o valor ao lado de "Grátis"; o `eval` do estilo só foi feito na gaveta. O print do passo 04 mostra o checkout

## Debrief

- **Surpresas:** nada. O checkout bate com a gaveta em SP: CEP, endereço, opção, prazo e preço cheio
- **Próximo charter:** reteste curto (cerca de 15 ações) só do RS: entrar na peça, rolar, adicionar, quantidade 2, calcular 90010-000, ⓘ, "Finalizar Pedido", abrir Entrega e Resumo; depois `resize 1440 900` com a gaveta aberta
- **Padrão novo:** nada
