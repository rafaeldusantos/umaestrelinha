# Reteste — 102-desconto-de-campanha (rodada 3, confirmação)

| Campo     | Valor                                                                     |
| --------- | ------------------------------------------------------------------------- |
| Rodada    | 2026-11-13 · início 19:24 · fim 19:37                                     |
| Ambiente  | loja http://localhost:8092 · painel http://localhost:8093/admin · Supabase local 127.0.0.1:54441 (preconnect da loja confere) · build não exposto (worktree `feature/102`, HEAD `1f0d6dbb`) · Chromium headless (agent-browser 0.39.1, sessão `retest`); `*.supabase.co` e `**/g/collect*` bloqueados por rota antes do primeiro `open` |
| Bugs lidos | 4 de `issues/` com status `open` ou `still-open` (BUG-002, BUG-007, BUG-008, BUG-009) |

Contagem: resolved 3 · still-open 1 · cannot-reproduce 0 · blocked 0

Pedidos criados nesta rodada (convidada, PIX, até a página de pagamento; o PIX falhou ao gerar, como esperado no
ambiente): #0609 (M-C + M-E + QA10), #0610 (M-C + 2× M-E + M-E2), #0611 (M-C + 2× M-E2 + M-E).

## BUG-002 · [Preço de campanha] Peça com “de/por” leva os 10 % sobre o “por”: R$ 314,91 em vez de R$ 336,60

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Resultado   | still-open                                                             |
| Persona     | PER-03 Helena (convidada, `anonima`) na loja · PER-01 Adri · conta: `admin-loja` (seed local, seção 5) no painel |
| Passos de   | `issues/BUG-002.md`                                                    |
| Tentativas  | 2 · 3 pedidos (#0609, #0610, #0611) e as superfícies da loja em 390 e 1440 |
| Viewport    | 390 × 844 (página, `/ofertas`) e 1440 × 900 (sacola, checkout, pedido, painel) |

**Passos seguidos** — de um estado limpo, como estão no bug (a campanha em vigência hoje é a "Dia das Mães", M-C a 10 %; o passo 2 do painel só foi lido, sem salvar):

1. Painel, Produtos › M-C › "Preços & variações": ler o cartão "Dia das Mães"
2. Loja, sem login: `/produtos/pulseira-esferas-leite-materno-prata-925` e `/ofertas` em 390
3. "Adicionar à sacola", checkout como convidada, PIX, "Pagar" e abrir `/pedido/:id`
4. Abrir o mesmo pedido no painel, `/admin/pedidos/:id`

**Esperado:** R$ 336,60 com "De R$ 374,00" riscado, igual no painel, cartão, página, sacola, checkout, pedido e feed.

**Observado:**

- Painel, cartão da campanha: "R$ 374,00 → R$ 336,60"; tabela "Variação 1 · R$ 374,00 · R$ 336,60". Certo
- Página (390): "R$ 336,60 · De R$ 374,00 · 4x de R$ 84,15"; `/ofertas` (390): "De R$ 374,00 · R$ 336,60". Certo
- Sacola e checkout: "de R$ 374,00 por R$ 336,60". Certo
- Pedido na loja (#0609, #0610): "de R$ 374,00 por R$ 336,60". Certo, e o resíduo da rodada 2 ("de R$ 349,90") sumiu da loja
- Feed local: `price 374.00 BRL` / `sale_price 336.60 BRL`. Certo
- **Pedido no painel** (#0609 e #0610, "Itens · Preços congelados no momento da compra"): a M-C aparece com
  **R$ 349,90 riscado** (`<s>`, `line-through`) e R$ 336,60. A loja mostra o mesmo pedido com "de R$ 374,00".
  O preço cobrado está certo. Mas o "de" do pedido gravado continua R$ 349,90 numa superfície, o painel. É o
  mesmo sintoma que deixou o bug `still-open` na rodada 2, agora só no painel. Por isso fica `still-open` e não
  `resolved`. O Gate 3 decide se a tela de pedido do painel está no Esperado ("igual no painel… no pedido")

**Entorno:**

| Onde                         | Resultado          | Nota                         |
| ---------------------------- | ------------------ | ---------------------------- |
| Passo anterior da jornada    | ok                 | painel: cartão e tabela da campanha batem (R$ 336,60); `/ofertas` e página em 390 |
| Passo seguinte da jornada    | ok                 | o total do pedido fecha nas três superfícies; o Subtotal soma o "por" (R$ 349,90) e a linha "Desconto de campanha −R$ 13,30" leva a R$ 336,60, igual em checkout, loja e painel |
| Mesma ação com outro dado    | ok                 | 2 unidades de M-C na sacola: "de R$ 748,00 por R$ 673,20" |

**Evidência:**

- `screenshots/retest-r3-BUG-002.png` — o pedido #0609 no painel, com a M-C "R$ 349,90" riscado → R$ 336,60
- `screenshots/retest-r3-BUG-002-pedido-0609.png` — o mesmo pedido na loja, "de R$ 374,00 por R$ 336,60"
- `screenshots/retest-r3-BUG-002-pdp-390.png` — página da M-C em 390, R$ 336,60 "De R$ 374,00"
- `screenshots/retest-r3-BUG-002-ofertas-390.png` — cartão da M-C em `/ofertas`, 390
- `screenshots/retest-r3-BUG-002-painel-produto.png` — o cartão "Dia das Mães" da M-C no painel, R$ 374,00 → R$ 336,60
- console: nada lido · rede: nada

## BUG-007 · [Edição em massa · campanha] O aviso do lote não tem “Desfazer” — a dona não volta um lote errado

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Resultado   | resolved                                                               |
| Persona     | PER-01 Adri · conta: `admin-loja` (seed local, seção 5)                |
| Passos de   | `issues/BUG-007.md`                                                    |
| Tentativas  | 2 · 2 desfeitos com sucesso. Houve outras tentativas de lote. Elas estão abaixo |
| Viewport    | 1440 × 900                                                             |

**Passos seguidos** — de um estado limpo, como estão no bug:

1. Painel como `admin-loja`, Campanhas › "Natal" › "Ver as peças": as quatro M-G em "Natal · 15%"
2. "Selecionar a página" › "Editar em massa"
3. Ligar "Editar campanha", "Natal", "Natal: 10%". Prévia: "4 peça(s) entram na Natal com 10%; o preço de sempre não muda."
4. "Aplicar a 4 produto(s)" e ler o aviso. Tocar em "Desfazer"

**Esperado:** o aviso traz "Desfazer". Tocá-lo devolve as quatro peças a "Natal · 15%", na lista e na aba de preços.
O filtro "Natal · 10%" fica vazio.

**Observado:** o aviso diz "4 peça(s) na Natal com 10%" e traz o botão **"Desfazer"**. Antes de tocar, a lista
filtrada "Natal · 15%" ficou com "Nenhum produto encontrado": o lote gravou. Depois de "Desfazer":

- Tentativa 1, lista só da campanha: as quatro peças voltaram a "Natal · 15%". O filtro "Natal · 10%"
  (`percentual=10`) mostrou "Nenhum produto encontrado"
- Tentativa 2, a partir da lista filtrada `percentual=15`, como no bug: o lote esvaziou a lista. "Desfazer" trouxe
  as quatro peças de volta a "Natal · 15%"
- A aba "Preços & variações" do Colar Afetivo Pata mostra o cartão "Natal" com "15%" marcado e "Dia das Mães"
  com "Nenhum". Só leitura, nada foi salvo

Antes dessas duas, o primeiro "Desfazer" não foi alcançado a tempo, e as peças foram devolvidas a 15 % com outro
lote (o caminho que a massa permite). Duas causas, as duas da automação:

- o `find role button` não acha o botão enquanto o modal da edição ainda está aberto
- o aviso tinha sumido quando chegou o clique, que veio vários segundos depois

Numa amostragem, o botão ficou visível por pelo menos ~9 s depois do lote. Não é achado.

**Saída da massa:** a lista filtrada pela "Natal" termina com as quatro M-G em "Natal · 15%", como entraram.
"Dia das Mães" e "Black Friday" não foram tocadas.

**Entorno:**

| Onde                         | Resultado          | Nota                         |
| ---------------------------- | ------------------ | ---------------------------- |
| Passo anterior da jornada    | ok                 | Campanhas › "Natal" › "Ver as peças" leva à lista filtrada; prévia do impacto certa |
| Passo seguinte da jornada    | ok                 | filtro por percentual depois do Desfazer (10 % vazio, 15 % com as quatro) e aba de preços da peça com 15 % |
| Mesma ação com outro dado    | ok, parcial        | lote "Natal: 15%" sobre as peças a 10 % grava; o "Desfazer — sem campanha" não rodou porque a massa não permite mexer em outras peças |

**Evidência:**

- `screenshots/retest-r3-BUG-007.png` — o aviso do lote "4 peça(s) na Natal com 10%" com "Desfazer"
- `screenshots/retest-r3-BUG-007-desfeito-15.png` — a lista depois do Desfazer, quatro peças em "Natal · 15%"
- `screenshots/retest-r3-BUG-007-desfeito-2.png` — a segunda tentativa, a partir de `percentual=15`, de volta a 15 %
- `screenshots/retest-r3-BUG-007-antes-natal-15.png` — o estado de entrada
- console: nada lido · rede: nada

## BUG-008 · [Cupom] QA10 desconta a peça de campanha que tem “de/por” — sacola, checkout e pedido

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Resultado   | resolved                                                               |
| Persona     | PER-03 Helena · conta: `anonima` (convidada, e-mail @exemplo.invalid)  |
| Passos de   | `issues/BUG-008.md`                                                    |
| Tentativas  | 2 · 4 (só M-C ×2, M-C + M-E até o pedido, M-C + M-E2, só M-C depois de tirar a M-E2) |
| Viewport    | 1440 × 900 (sacola, checkout, pedido) e 390 × 844 (sacola)             |

**Passos seguidos** — de um estado limpo, como estão no bug:

1. Sem login, sacola vazia: M-C na sacola (de R$ 374,00 por R$ 336,60)
2. Aplicar `QA10`
3. Acrescentar a M-E e reaplicar `QA10`
4. Checkout como convidada, PIX, "Pagar" e abrir `/pedido/:id` (#0609), na loja e no painel

**Esperado:** só com a M-C, o cupom é recusado com "Este cupom não vale para peças da Dia das Mães.". Com M-E + M-C,
o desconto é só os 10 % da M-E (−R$ 34,00) na sacola, no checkout e no pedido.

**Observado:**

- Só a M-C: "Este cupom não vale para peças da Dia das Mães." nas duas tentativas. Sem linha de cupom, e o Total
  fica em R$ 336,60
- M-C + M-E: "QA10 aplicado −R$ 34,00", Total R$ 642,60
- Checkout: "Cupom QA10 −R$ 34,00", Desconto PIX −R$ 44,98, Frete R$ 19,90, Total R$ 617,52
- Pedido #0609, na loja e no painel: "Cupom QA10 −R$ 34,00", Total R$ 617,52

**Entorno:**

| Onde                         | Resultado          | Nota                         |
| ---------------------------- | ------------------ | ---------------------------- |
| Passo anterior da jornada    | ok                 | página e sacola da M-C com R$ 336,60 "de R$ 374,00" |
| Passo seguinte da jornada    | ok                 | o cupom continua só na M-E com 2 unidades de M-C (−R$ 34,00) e ao trocar a quantidade |
| Mesma ação com outro dado    | ok                 | M-C + M-E2 (390): "QA10 aplicado −R$ 34,99", só a M-E2. Tirada a M-E2, a sacola recusa o cupom com a frase e marca "Não aplicado" (o cupom não fica preso à M-C, como na rodada 2) |

**Evidência:**

- `screenshots/retest-r3-BUG-008.png` — a sacola só com a M-C, depois de aplicar QA10
- `screenshots/retest-r3-BUG-008-sacola-mc-me-qa10.png` — M-C + M-E, "QA10 aplicado −R$ 34,00"
- `screenshots/retest-r3-BUG-008-checkout-1440.png` — checkout com "Cupom QA10 −R$ 34,00", Total R$ 617,52
- `screenshots/retest-r3-BUG-008-mc-me2-390.png` — M-C + M-E2, −R$ 34,99
- `screenshots/retest-r3-BUG-008-so-mc-recusado-390.png` — só a M-C, "Este cupom não vale para peças da Dia das Mães." · "Não aplicado"
- `screenshots/retest-r3-BUG-002-pedido-0609.png` — o pedido #0609 com "Cupom QA10 −R$ 34,00"
- console: nada lido · rede: nada

## BUG-009 · [Pedido] Com promoção progressiva, o resumo omite o “Desconto PIX” e as linhas não fecham o total

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Resultado   | resolved                                                               |
| Persona     | PER-03 Helena · conta: `anonima` (convidada, e-mail @exemplo.invalid)  |
| Passos de   | `issues/BUG-009.md`                                                    |
| Tentativas  | 2 · 2 pedidos (#0610 como no bug; #0611 com outro dado)               |
| Viewport    | 1440 × 900                                                             |

**Passos seguidos** — de um estado limpo, como estão no bug:

1. Sacola com M-C, 2× M-E e M-E2. "Desconto progressivo −R$ 102,99" aparece na sacola, depois de um instante
2. Checkout com PIX: "Subtotal R$ 1.379,80 · Desconto de campanha −R$ 13,30 · Desconto progressivo −R$ 102,99 ·
   Desconto PIX (7%) −R$ 88,45 · Frete R$ 19,90 · Total R$ 1.194,96"
3. Convidada, "Pagar R$ 1.194,96 com PIX", pedido #0610
4. Abrir `/pedido/:id` na loja e `/admin/pedidos/:id` no painel

**Esperado:** o resumo do pedido traz as linhas do checkout (Subtotal, Desconto de campanha, Desconto progressivo,
Desconto PIX, Frete), e elas somam o Total.

**Observado:**

- #0610 na loja e no painel: "Subtotal R$ 1.379,80 · Desconto de campanha −R$ 13,30 · Desconto progressivo
  −R$ 102,99 · Desconto PIX −R$ 88,45 · Frete R$ 19,90 · Total R$ 1.194,96". 1.379,80 − 13,30 − 102,99 − 88,45 +
  19,90 = 1.194,96. As linhas fecham e são as do checkout
- #0611 (M-C + 2× M-E2 + M-E): o checkout e o pedido na loja trazem "Subtotal R$ 1.389,70 · −R$ 13,30 ·
  −R$ 103,98 · PIX −R$ 89,07 · Frete R$ 19,90 · Total R$ 1.203,25". Fecha

**Entorno:**

| Onde                         | Resultado          | Nota                         |
| ---------------------------- | ------------------ | ---------------------------- |
| Passo anterior da jornada    | ok                 | sacola e checkout com as mesmas linhas e o mesmo total |
| Passo seguinte da jornada    | não verificável    | o e-mail do pedido no Mailpit: nenhum e-mail de pedido chegou para #0609–#0611. A aba "E-mails" do pedido no painel diz "Nada por aqui ainda", e a página do pedido diz "Eu aviso por e-mail assim que ele cair". O e-mail só sai com o pagamento aprovado, e concluir um PIX é proibido no ambiente |
| Mesma ação com outro dado    | ok                 | #0611, outra composição; também #0609 (cupom + PIX, sem promoção) fecha com "Desconto PIX" |

**Evidência:**

- `screenshots/retest-r3-BUG-009.png` — o pedido #0610 na loja, com "Desconto PIX −R$ 88,45" e Total R$ 1.194,96
- `screenshots/retest-r3-BUG-009-admin-0610.png` — o mesmo pedido no painel, mesmas linhas
- `screenshots/retest-r3-BUG-009-checkout-1440.png` — o checkout do #0610
- `screenshots/retest-r3-BUG-009-sacola-promo.png` — a sacola com "Desconto progressivo −R$ 102,99"
- `screenshots/retest-r3-BUG-009-pedido-0611.png` — o pedido #0611, que também fecha
- console: nada lido · rede: nada

## Achados novos no entorno

nada

Observação, não registrada como achado: no pedido #0610 da loja, as linhas das peças comuns já trazem a promoção
progressiva ("de R$ 680,00 por R$ 612,00"; "de R$ 349,90 por R$ 314,91"). O checkout mostra as mesmas linhas sem
ela ("R$ 680,00"). O desconto também aparece na linha "Desconto progressivo". Os valores fecham.
