# QA Run Report — 2026-10-04 — parcelas do cartão

- **Scope:** branch/PR run sobre `45a8845` (parcelas do cartão pela tabela do Mercado Pago, até 10x, sem juros em destaque, CTA no fluxo, campo "Parcelas sem juros" do painel). Relato da dona: com 4 no painel, todas as parcelas aparecem com juros na loja; e o painel ainda dizia "Máximo de parcelas".
- **Cadence tier:** targeted
- **Build:** `bef4efa` (master, com `45a8845`) · **Environment:** PRODUÇÃO — loja `umaestrelinha-store-five.vercel.app`, painel `umaestrelinha-backoffice.vercel.app`, Supabase `hgkrsfpupypxtygjgthf`, Mercado Pago com a chave pública da loja. Nenhum pagamento é enviado: o percurso para antes de "Pagar".
- **Started:** 2026-10-04T21:00-03:00 · **Status:** closed

## Personas

| Persona | Base | Device / Network / Locale | Sessions |
|---|---|---|---|
| Cliente no celular | primeira compra, sem conta, quer parcelar | 390×844, toque, pt-BR | S1, S2, S3 |
| Cliente no computador | idem | 1440×900, mouse, pt-BR | S4 |
| Adri (dona) | configura a loja no painel | 1440×900, pt-BR | S5 |

## Flows in Scope

- Checkout → bloco 3 Pagamento → Cartão → escolher parcelas → CTA (sem clicar).
- Página do produto → anúncio de parcelas.
- Painel → Configurações → Vendas → Pagamento.

## Session Matrix & Results

| # | Charter | Journey / Scenario | Persona | Tour | Status | Issue | Fix commit |
|---|---|---|---|---|---|---|---|
| S1 | parcelas com a tabela real | Checkout / lista de parcelas com a conta como está | Cliente no celular | Fedex (o dado do Mercado Pago atravessa a tela) | Pass | | |
| S2 | o anúncio e o caixa concordam? | Produto → checkout / "sem juros" prometido × cobrado | Cliente no celular | Supermodel (o que a tela afirma) | Blocked (human decision) | BUG-20261004-sem-juros-anunciado-cobrado-com-juros | |
| S3 | escolher e pagar | Checkout / escolha → rótulo do CTA, CTA no fluxo | Cliente no celular | Back alley (trocar de escolha, de cartão) | Pass | | |
| S4 | o mesmo no computador | Checkout / lista, card de cartão e resumo lateral | Cliente no computador | Fedex | Pass | | |
| S5 | o painel diz o que o número faz? | Painel / campo "Parcelas sem juros" | Adri | Guidebook (a ajuda da tela) | Blocked (needs human verify) | (copy reescrita, ver *What Was Fixed*) | sem commit |

Status legend: `Pending | Pass | Fixed | Skipped | Blocked (needs human verify) | Blocked (human decision)`

## Session Debriefs

### S1 — Cliente no celular (produção, 390×844)

- **Ran:** produto `piramide-afetiva-pet` → sacola → checkout → Contato (convidada) → CEP 90010-000 →
  SEDEX → Cartão → número com BIN Nubank (`5162 92…`, sem pagar).
- **Findings:** a lista mostra exatamente a tabela do Mercado Pago: só **"À vista · R$ 255,61"** de
  cara e "Mais parcelas, com juros (até 10x)". O card de cartão passou de "Até 4x de R$ 63,90 sem
  juros" (antes do número) para **"Parcele em até 10x"** (depois) — não promete o que a tabela não
  dá. Sem rolagem horizontal (`scrollWidth` 390).
- **Scenarios settled:** lista de parcelas → Pass.
- **Surprises:** nenhuma no código; a tabela da conta é a mesma da manhã (nenhuma parcela sem juros).

### S2 — Cliente no celular (produção)

- **Findings:** a página do produto diz **"ou 4x de R$ 59,98 sem juros"**; o caixa cobra juros desde
  2x. **Trust-Damage**: a cliente decide pelo anúncio e descobre os juros com o cartão na mão.
- **Bugs filed:** `BUG-20261004-sem-juros-anunciado-cobrado-com-juros` (causa: conta do Mercado Pago
  sem parcelamento sem juros; o painel só anuncia).
- **Scenarios settled:** anúncio × cobrança → Blocked (human decision).

### S3 — Cliente no celular (produção)

- **Findings:** "Mais parcelas" abre a lista; tocar em **4x** marca o rádio, a linha mostra "4x de
  R$ 71,16 · Total R$ 284,65", e o CTA vira **"Pagar 4x de R$ 71,16"**. O CTA está no fluxo
  (`position: static`), logo abaixo do pagamento. Trocar para outro cartão (Banco do Brasil,
  `4011 78…`) volta a escolha para à vista e o CTA para "Pagar R$ 255,61 no cartão".
- **Paper cuts:** apagar o número do cartão (selecionar tudo + apagar) **não** derruba a escolha nem
  desabilita "Pagar" — o Brick não avisa `onBinChange` quando o campo é esvaziado assim. Clicar cai na
  validação do próprio Brick (nenhum pedido, nenhuma cobrança). Dull.
- **Scenarios settled:** escolha → CTA → Pass; CTA no fluxo → Pass; troca de cartão → Pass.

### S4 — Cliente no computador (produção, 1440×900)

- **Findings:** com a mesma tabela, o card diz "Parcele em até 10x" e a linha "no cartão … sem juros"
  do resumo lateral **some** — nenhuma das três superfícies promete sem juros. Sem rolagem horizontal.
- **Scenarios settled:** coerência card × lista × resumo → Pass.

### S5 — Adri no painel

- **Findings:** o print da dona mostra **"Máximo de parcelas"** — rótulo de antes de `45a8845`. O
  bundle **servido** em produção (`umaestrelinha-backoffice.vercel.app/assets/index-CYE92WyZ.js`)
  contém "Parcelas sem juros": o print é de uma aba aberta antes do deploy, e um F5 resolve.
  Mesmo com o rótulo novo, a dona leu o número como "o que a loja cobra" — a ajuda não dizia, no
  campo, que quem cobra é o Mercado Pago. Copy reescrita (ver *What Was Fixed*).
- **Blocked:** a sessão não entrou no painel — não há credencial de admin nesta máquina. **Para
  verificar:** depois do próximo deploy, abrir Configurações → Vendas e conferir o aviso âmbar
  "Quem deixa de cobrar os juros é o Mercado Pago…" acima de "Parcelas sem juros", e a dica mudando ao
  digitar (4 → "Até 4x sem juros. De 5x a 10x, com os juros do Mercado Pago.").

## What Was Fixed

### Copy do campo "Parcelas sem juros" (paper cut afiado, pedido da dona)
- **Symptom:** com 4 no campo, a dona viu todas as parcelas com juros na loja e concluiu que o campo
  não funcionava.
- **Root cause:** a dica era fixa e longa, e não respondia "o que este número faz?"; o fato decisivo
  (quem cobra os juros é o Mercado Pago) estava no fim de uma frase abaixo do campo.
- **Fix:** aviso âmbar acima do campo (`MERCADO_PAGO_SEM_JUROS_AVISO`, com o caminho no painel do
  Mercado Pago) e dica calculada do número digitado (`parcelasSemJurosHint`). `SalesSection.tsx`.
  Sem commit ainda.
- **Regression test:** `AdminSettingsPage.test.tsx` — "a dica diz o que o número digitado faz" e "o
  aviso acima do campo diz que quem deixa de cobrar os juros é o Mercado Pago" (posição medida).
- **Retested:** suíte do painel (ver exit gate). Em navegador: **não** (sem credencial — S5).

## Paper Cuts

| Persona | Where (journey/step) | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Cliente no celular | Checkout / apagar o número do cartão | a escolha de 4x e o "Pagar" continuam de pé com o campo vazio | dull | registrado; o clique cai na validação do Brick, sem efeito |
| Adri | Painel / "Parcelas sem juros" | o número parece não fazer nada | sharp | corrigido (copy) |

## Decisions for a Human

### A loja anuncia "sem juros" e o Mercado Pago cobra juros (BUG-20261004-sem-juros-anunciado-cobrado-com-juros)
- What's broken: produto diz "ou 4x de R$ 59,98 sem juros"; o caixa mostra 4x de R$ 71,16 (total
  R$ 284,65). Evidência: `s2-produto-390.png`, `s3-escolha-390.png`.
- Why not auto-fixed: trade-off de produto e de dinheiro — cada saída custa de um jeito.
- Options:
  1. **Ligar "Oferecer parcelamento sem juros" no painel do Mercado Pago, até 4x** — nenhuma linha de
     código; o caixa passa a mostrar 2x, 3x e 4x com o selo "Sem juros" sozinho (provado em navegador
     com a tabela simulada). Custo para a loja: a taxa de parcelamento do Mercado Pago, que ele
     anuncia de até 3,38% (2x) a 14,90% (10x).
  2. **A loja absorver os juros no código** — cobrar do Mercado Pago um valor menor para que a
     cliente pague exatamente o preço em até 4x. Custo: a taxa de juros do PAGADOR (9,64% em 2x,
     11,36% em 4x — ~8,8% a ~10,2% do valor), mais cara que a opção 1; mexe em
     `packages/core/src/payment/**` e na edge function `mercado-pago`; o valor que a loja recebe deixa
     de ser o valor do pedido. Pede spec.
  3. **Parar de anunciar sem juros** até decidir — "Parcelas sem juros" = 1 no painel. A vitrine passa
     a dizer só o preço, e o caixa segue igual.
- Recommendation: **1**, e **3 até a 1 ser feita** — é a mesma configuração que Nuvemshop e Yampi
  pedem, custa menos que a 2, e não toca no código de dinheiro.

## Re-diagnóstico depois da resposta da dona

A conta da dona TEM "parcelado vendedor" até 4x (print do painel do Mercado Pago). As duas chaves do
repositório — inclusive a do bundle de produção, `APP_USR-c79bf0c6…` — devolvem juros desde 2x, e a
QA anterior aprovou cartão de teste em produção. Causa provável: **a loja nova usa credenciais de uma
conta de teste**. Ver o bug, seção *Re-diagnóstico*. A decisão de produto (opções 1–3 acima) fica
suspensa até a troca de credencial: com a conta real, a opção 1 já está feita.

## Final Status

**O código das parcelas está pronto e faz o que promete; a loja não está pronta para dizer "sem
juros" enquanto a conta do Mercado Pago não oferecer parcelas sem juros.** O caixa mostra a tabela
real do Mercado Pago (S1, S3, S4 em Pass, em produção, 390 e 1440); a página do produto promete "4x
sem juros" que o Mercado Pago cobra com juros (S2, Blocked — decisão da dona, recomendação: ligar o
parcelamento sem juros no painel do Mercado Pago e, até lá, pôr 1 em "Parcelas sem juros"). O painel
ganhou o aviso de quem cobra os juros (S5 — falta ver logada, depois do deploy).

Totais por impacto: Trust-Damage 1 (blocked-decision) · paper cut sharp 1 (corrigido, sem commit) ·
paper cut dull 1 (registrado).

**Exit gate** (2026-10-04, um workspace por vez, exit code fora de pipe, `--testTimeout=20000`):
backoffice **3026/166, exit 0**; store **4287/257, exit 0**. `tsc` do painel 0.

**Paridade:** produção de verdade (loja, painel, Supabase e Mercado Pago). Nenhum pagamento enviado;
nenhum pedido criado (o percurso para antes de "Pagar"). A entrada no painel não foi feita (sem
credencial).
