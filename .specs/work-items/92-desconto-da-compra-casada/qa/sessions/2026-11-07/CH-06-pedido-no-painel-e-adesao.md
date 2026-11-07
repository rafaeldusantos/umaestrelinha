# Sessão CH-06 · A dona confere no painel do pedido e na Adesão quanto houve de desconto

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-06-pedido-no-painel-e-adesao.md` · exploratório · P1 |
| Status      | done                                                                   |
| Persona     | PER-02 Adri · conta: `admin-painel` — o usuário de desenvolvimento de `supabase/seed.sql` (seção 5, só local), premissa da thread; `QA_ADMIN_PAINEL_*` não definidas |
| Tour · modo | Feature · por cenário                                                  |
| Rodada      | confirmação (rodada 2)                                                 |
| Orçamento   | 9 ações de browser de 25                                               |
| Ambiente    | painel http://localhost:8083 (worktree feature/92) · build não exposto · Chromium (Playwright MCP, headless) · viewports 1440×900 e 390×844 |
| Paridade    | banco local; os pedidos novos (#0373–#0376) estão Pendentes (Mercado Pago local com chave inválida); `*.supabase.co` e `**/g/collect*` bloqueados por rota |

## Missão

Percorrer, como a dona no fim do dia, os pedidos com desconto, um pedido antigo e o relatório de Adesão, e
confirmar que cada número fecha com o que a cliente pagou e que nada antigo mudou de cara.

Rodada de confirmação: o único TC não-pass da rodada 1 (TC-FUNC-032, `blocked` por massa) e o entorno —
os pedidos novos #0373, #0375 e #0376 no painel, com a ordem do resumo coerente com a loja.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrou no painel e abriu `/admin/pedidos`, aba Tudo | #0376 R$ 272,32 · #0375 R$ 484,60 · #0374 R$ 345,21 · #0373 R$ 383,75 — os quatro **Pendente/Pendente**. Nenhum pedido cancelado no topo da lista. Na aba padrão "Precisa de ação" só o #0374 aparece (os outros não têm material) | — |
| 02 | Abriu o #0373 (P + Berloque pelo bloco + oferta Veneziana) | Berloque "Acompanha o QA Pingente Estrela" R$ 69,90 → R$ 59,42; Veneziana R$ 89,90 → R$ 71,92, **sem** "Acompanha". Pagamento: Subtotal R$ 419,70 · Desconto do Compre Junto − R$ 10,48 · Desconto da oferta − R$ 17,98 · Desconto PIX − R$ 27,39 · Frete R$ 19,90 · Total R$ 383,75. Fecha a centavo; as linhas dos itens (391,24) = Subtotal − CJ − oferta. Mesmos valores e ordem que a loja mostrou no CH-02 r2 | `screenshots/CH-06-r2-01-pedido-0373-1440.png` |
| 03 | Abriu o #0375 (P + Cartier ×2 em promoção + oferta Veneziana) | Cartier "Acompanha", 2 un, R$ 119,90 → R$ 83,93; Veneziana R$ 71,92. Subtotal R$ 589,60 · CJ − R$ 11,99 · Desconto progressivo − R$ 59,95 · Desconto da oferta − R$ 17,98 · PIX − R$ 34,98 · Frete R$ 19,90 · Total R$ 484,60. Fecha; itens 499,68 = Subtotal − os descontos não-PIX. Igual à loja (CH-03 r2) e ao #0362 da r1 | `screenshots/CH-06-r2-02-pedido-0375-1440.png` |
| 04 | Abriu o #0376 (P + Berloque pelo bloco + cupom) | Berloque "Acompanha" R$ 69,90 → R$ 59,42. Subtotal R$ 329,80 · CJ − R$ 10,48 · Cupom QA92CUPOM15 − R$ 47,90 · PIX − R$ 19,00 · Frete R$ 19,90 · Total R$ 272,32. Fecha; igual à loja e à prévia do e-mail (CH-03 r2) | `screenshots/CH-06-r2-03-pedido-0376-1440.png` |
| 05 | Abriu a Adesão (`/admin/compre-junto/adesao`, 30 dias) | 4 pedidos com Compre Junto ("57% dos 7 pedidos pagos") · 6 peças · R$ 405,53 · Por joia: QA Pingente Estrela, 4, 6, R$ 405,53, Desconto concedido R$ 113,87. Os mesmos números da r1; os pedidos novos, pendentes, não entram (a régua é "pagos e não cancelados"). O denominador passou de 8 para 7 pedidos pagos com a janela de 30 dias andando três dias — não é efeito da massa nova | `screenshots/CH-06-r2-04-adesao-30d-1440.png` |
| 06 | Abriu o #0376 em 390×844 | `scrollWidth` 390; o cartão de pagamento com a mesma ordem | `screenshots/CH-06-r2-05-pedido-0376-390-pagamento.png` |
| 07 | Saiu da conta pelo menu "Conta e saída" | Voltou a `/admin/login` | — |

**Edge cases tentados:** nada novo (rodada de confirmação). Viewport 390 no pedido refeito no #0376.

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-032 | blocked | 01, 05 | `screenshots/CH-06-r2-04-adesao-30d-1440.png` | por `massa`, de novo: a Adesão só conta pedidos pagos, e os quatro pedidos novos estão Pendentes. O único com corrente sem a marca (#0373, Veneziana pela oferta do checkout — que nem é "pelo catálogo") não é pago, e não há pedido cancelado com a marca. Marcar como pago ou cancelar é mudar status, o que o briefing proíbe |

Contagem: pass 0 · fail 0 · blocked 1 · skip 0

Entorno conferido (não são TC desta rodada): #0373, #0375 e #0376 no painel mostram o desconto do Compre Junto
na linha certa, a ordem Subtotal · descontos · Frete · Total igual à loja, e os totais fecham a centavo.

## Achados

nada

## Spec-gaps

nada (rodada de confirmação)

## Fora da cobertura

- TC-FUNC-032 e a variação "pedido cancelado com a marca": continua sem massa pela tela. Para fechar, é preciso um pedido **pago** com a corrente posta pelo catálogo (com P na sacola, sem a marca) e um pedido **cancelado** com a marca — os dois exigem mudar status (pagamento local falha com chave inválida do Mercado Pago), o que fica com a thread.
- Os pedidos novos no app do ateliê: fora deste charter (CH-07).
- O período de 7 e 90 dias da Adesão não foi refeito (não houve massa paga nova que mudasse os números).

## Debrief

- **Surpresas:** nenhuma. Os três pedidos novos fecham no painel com a mesma ordem e os mesmos valores da loja.
- **Próximo charter:** se a thread quiser fechar o TC-FUNC-032, precisa gravar M-07 de verdade: marcar como pago um pedido com a corrente pelo catálogo e cancelar um pago com a marca.
- **Padrão novo:** nada.
- **Limpeza:** esta sessão não criou nem alterou dados.
