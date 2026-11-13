# Sessão CH-03 · Achar a oferta pelo celular

| Campo       | Valor |
| ----------- | ----- |
| Charter     | `test-plans/charters/CH-03-achar-a-oferta-pelo-celular.md` · exploratório · P0 |
| Status      | done |
| Persona     | PER-02 Marina · conta: anonima |
| Tour · modo | Feature · com tour (rodada de confirmação: sem tour novo) |
| Rodada      | confirmação (rodada 3) |
| Orçamento   | 23 ações de browser de 25 |
| Ambiente    | http://localhost:8092 · build não exposto · agent-browser (Chromium) · viewport 390 × 844 · rotas abortadas: `**/*.supabase.co/**`, `**/g/collect*` |
| Paridade    | Supabase local; fotos do Storage hospedado bloqueadas de propósito; data de referência 2026-11-13, "Dia das Mães" em vigência |

## Missão

Como quem nunca abriu a loja e chegou pelo celular, confirmar que dá para achar as peças em oferta pela Home e por
`/ofertas` e entender, sem fazer conta, quanto cada uma custa — procurando cartão e página discordando do preço,
faixa cobrindo o que a cliente quer tocar, e promessa que a tela faz e não cumpre.

Nesta rodada: reconferir TC-FUNC-020 (fail na r2) e o entorno da correção do BUG-002 no preço de M-C (10 % sobre o "de" ⇒ R$ 336,60 contra "de" R$ 374,00).

## Passos

| #  | A persona tentou | Viu | Evidência |
| -- | ---------------- | --- | --------- |
| 01 | Abriu `/ofertas?ordem=menor-preco` (390) | Loja carregou normalmente (sem tela em branco). Título "Dia das Mães", chips "Todas · 4", "10% · 2", "15% · 2", ordenação "Menor preço". Ordem: M-D "De R$ 340,00 R$ 289,00" · M-B "De R$ 439,00 R$ 373,15" · M-C "De R$ 374,00 R$ 336,60" · M-A "De R$ 385,00 R$ 346,50". M-B (R$ 373,15 no cartão) vem antes de M-C (R$ 336,60) e de M-A (R$ 346,50) — igual à r2 | `screenshots/CH-03-r3-01-ofertas-menor-preco-390.png` |
| 02 | Tocou no cartão de M-C (antes fechou o aviso de cookies, que cobria o cartão) | Página `/produtos/pulseira-esferas-leite-materno-prata-925`: selo "DIA DAS MÃES, 10% de desconto", R$ 336,60, "de" R$ 374,00 · 4x de R$ 84,15 sem juros, R$ 313,04 com Pix. Bate com o cartão em `/ofertas` | `screenshots/CH-03-r3-02-pdp-mc-390.png` |
| 03 | Abriu a coleção pulseiras-afetivas com "Apenas com desconto" (`?desconto=1`) | 4 peças: M-C (De R$ 374,00 R$ 336,60), M-B (De R$ 439,00 R$ 373,15), M-D (De R$ 340,00 R$ 289,00), M-A (De R$ 385,00 R$ 346,50). M-A entra pela campanha | — |
| 04 | Pôs a faixa de preço com teto 360 (`?preco=192-360`, entre R$ 346,50 e R$ 385,00 de M-A) | 12 peças, com M-A (R$ 346,50) e M-C (R$ 336,60, cartão "De R$ 374,00"). M-B também aparece, com o cartão mostrando R$ 373,15, acima do teto — igual à r2 | `screenshots/CH-03-r3-03-colecao-ate-360-390.png` |

**Edge cases tentados:** nada (rodada de confirmação)

## Casos

| TC          | Veredito | Passo   | Evidência | Nota |
| ----------- | -------- | ------- | --------- | ---- |
| TC-FUNC-020 | fail     | 01, 03, 04 | `screenshots/CH-03-r3-01-ofertas-menor-preco-390.png` · `screenshots/CH-03-r3-03-colecao-ate-360-390.png` | Mesmo resultado da r2: "Com desconto" (passo 2) e a faixa (passo 3) funcionam pelo preço com desconto — M-A entra nos dois. Falha o passo 1, "a ordem segue o preço com desconto que cada cartão mostra": o cartão de M-B mostra R$ 373,15 e fica antes de M-C (R$ 336,60) e de M-A (R$ 346,50); M-B também aparece no teto de 360 com R$ 373,15 no cartão. Não é regressão (já falhava na r2) nem critical/high: continua como sugestão de backlog SB-1 da r2, sem achado novo |

Contagem: pass 0 · fail 1 · blocked 0 · skip 0

Entorno da correção do BUG-002 (preço de M-C): conferido e correto em `/ofertas` (cartão), na página do produto e no cartão da coleção — R$ 336,60 contra "de" R$ 374,00, 4x de R$ 84,15, R$ 313,04 no Pix. Sem regressão.

## Achados

nada

Sugestão de backlog (já registrada na r2, mantida): SB-1 · [Cartão de M-B] o preço do cartão (R$ 373,15, variação de R$ 439,00) não é o da variação que ordena e filtra (R$ 325,55) — medium proposta.

## Spec-gaps

nada

## Fora da cobertura

- Mini-carrinho com M-C — fora do pedido desta rodada (confirmação restrita a cartão, página do produto e `/ofertas`); a sacola é do CH-04
- Bloco "Joias em oferta" da Home e viewport 1440 — não pedidos na confirmação
- TC-FUNC-020, variações "maior preço" e "limites da régua" — não conferidas, como na r2 (orçamento da confirmação)

## Debrief

- **Surpresas:** o aviso de cookies cobre o cartão de M-C no 390 até ser fechado (mesmo comportamento das rodadas anteriores; fora da Mudança). A loja abriu normalmente, sem tela em branco
- **Próximo charter:** nada
- **Padrão novo:** nada
