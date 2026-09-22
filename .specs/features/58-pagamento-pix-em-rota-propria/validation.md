# 58 · Pagamento PIX em rota própria — Validação

**Spec**: `spec.md` · **Design**: `design.md` · **Tasks**: `tasks.md`
**Escopo deste relatório**: fases 3 e 4 (T11 … T15), na árvore que já carrega as fases 1 e 2.
**Data**: 2026-09-22 · **Autor = verificador** (não houve verificação independente — ver *O que
falta*, abaixo).

---

## 1 · Gate de testes — cinco workspaces, um por vez, exit code fora de pipe

| Workspace | Entrada (medida antes de tocar em nada) | Saída | Delta |
| --- | --- | --- | --- |
| store | 3716 / 230 | **3733 / 230** | **+17 / 0** |
| core | 2459 / 97 | **2459 / 97** | 0 — não tocado, remedido |
| backoffice | 3024 / 166 | **3024 / 166** | 0 — não tocado, remedido |
| functions | 660 / 14 | **660 / 14** | 0 — não tocado, remedido |
| catalog-import | 512 / 23 | **512 / 23** | 0 — não tocado, remedido |

- **Lint**: **26 erros / 6 warnings** (backoffice 24/4 · store 2/2) — igual à entrada.
- **Tipos**: **0 · 0** (`npx tsc --noEmit -p apps/<app>/tsconfig.app.json`).
- **Build**: `pnpm build` verde nos dois apps.
- **`packages/core/src/payment/**`**: `git diff --name-only` devolve **zero** arquivos.

### O +17 do store, e a queda declarada dentro dele

O número de **arquivos** não mudou porque um entrou e um saiu:

| Arquivo | Antes → depois | O quê |
| --- | ---: | --- |
| `shared/lib/__tests__/pagamentoComDonoUnico.test.ts` | — → **19** | guarda novo (T13) |
| `features/checkout/ui/__tests__/PixPayment.test.tsx` | 24 → **apagado** | sai com o componente (T13) |
| `pages/__tests__/CheckoutPage.test.tsx` | 95 → **104** | +9 — a entrega do bastão e a ordem |
| `pages/__tests__/OrderConfirmationPage.test.tsx` | 29 → **35** | +6 — o caminho de voltar a pagar |
| `pages/__tests__/OrderPaymentPage.test.tsx` | 25 → **30** | +5 — a limpeza recortada de `PIX-P1-08` |
| `pages/__tests__/AccountPage.test.tsx` | 3 → **5** | +2 — a conta linka em vez de montar |
| `features/checkout/ui/__tests__/PaymentBlock.test.tsx` | 36 → **36** | 0 — três casos **invertidos**, não removidos |

`19 − 24 + 9 + 6 + 5 + 2 + 0 = **+17**`, que é o delta medido.

**A queda de 24 é declarada e o número reaparece do outro lado.** `PixPayment.test.tsx` media a
máquina (timer, Realtime, pergunta de 5s, copiar, regenerar) **e** o desenho, no mesmo arquivo. A
fase 2 extraiu a máquina para `usePixPayment` (**24** casos), o desenho de espera para
`PaymentProgress` (**21**) e as quatro telas para `PixSurface` (**45**) — **90 casos** sobre as
mesmas regras, escritos antes de o arquivo antigo sair. O que morreu com ele foi a **segunda**
medição das mesmas regras, num componente que já não existe.

---

## 2 · Sensores de mutação — 9 injetados nos arquivos REAIS

Cada mutante foi escrito no arquivo de produção, o arquivo de teste que deveria acusá-lo foi
executado, e o original restaurado com **comparação byte a byte**. O arnês **lança** quando a string
alvo não é encontrada — mutação que vira no-op não passa por morte (a lição do `mutar()` da `52`).

| M | Mutação | Resultado |
| --- | --- | --- |
| M1 | o checkout pede o código **antes** de navegar | **morto** (asserção) |
| M2 | a tela de progresso some — o CTA volta a ficar apagado no lugar | **morto** |
| M3 | o progresso passa a cobrir o **cartão** e desmonta o Brick | **morto** |
| M4 | a limpeza perde o recorte (`orderId !== id`) | **morto** |
| M5 | "Pagar com PIX" vira incondicional — pedido pago ganha o botão | **morto** |
| M6 | "Acompanhar pedido" continua pílula cheia ao lado do botão de pagar | **morto** |
| M7 | `/conta` volta a oferecer PIX para pedido de **cartão** | **morto** |
| M8 | uma segunda tela importa `qrcode.react` | **morto** (guarda novo) |
| M9 | o link de `/conta` deixa de apontar para a rota do pagamento | **morto** (metade positiva) |

**9 mortos, 0 sobreviventes, nenhum por compilação** — o arnês distingue os dois modos e nenhum caiu
por sintaxe quebrada (a lição da `56`: mutante que morre por compilação prova o esbuild e mais nada).

> **Dois defeitos foram achados ESCREVENDO as réguas, não rodando os mutantes.**
> 1. A primeira escrita de `REGUA_PEDIDO_DE_PIX` acusava `useCreatePayment.ts` — **a porta que o
>    guarda existe para proteger** —, porque o tipo dela declara `order_id: string` e
>    `method: 'pix' | 'card'`. Um guarda que nasce reprovando o arquivo certo é um guarda que alguém
>    desliga. O conserto foi exigir o **fecho** (`,`, `}` ou `)`) depois do literal, que separa
>    *chamar* de *declarar*, com sensor próprio.
> 2. `OrderPaymentPage.test.tsx` (fase 2) carregava um **erro de tipo** que derrubava o `tsc` do app
>    inteiro: o dublê de `usePixPayment` era `vi.fn(() => …)` (zero argumentos) chamado com um. O
>    `as never` na chamada não salva — `tsc` confere **aridade**. Corrigido declarando o parâmetro.

---

## 3 · Prova em navegador — Chromium, 390 × 844 e 1440 × 900

### Como foi medido, e por que assim

O **Docker não estava de pé**, então a stack do Supabase local não responde. A saída foi
`pnpm dev:store` + Playwright **interceptando** `/rest/v1/**` e `/functions/v1/**` — o que, além de
contornar a ausência, é mais determinístico que esperar o relógio: os cinco estados do PIX são
forçados um a um, e a resposta do banco é atrasada de propósito para a linha dos 8s ser observável.

**O bundle SERVIDO foi conferido antes de medir** (este repositório já reportou uma medição feita
contra módulo não retransformado): `curl` do módulo transformado pelo Vite confirmou
`PaymentProgress` em `CheckoutPage.tsx`, `podePagarComPix` + "Pagar com PIX" em
`OrderConfirmationPage.tsx`, e `orderPaymentPath` **sem** `PixPayment` em `AccountPage.tsx`.

> ⚠️ **Duas armadilhas do arnês, registradas porque custaram tempo e produziriam medida falsa.**
> (1) **O Playwright avalia rotas em ordem INVERSA de registro**: com `**/rest/v1/**` registrado por
> último, ele devolvia `[]` para o pedido e a tela caía em "Pedido não encontrado" — a medição
> diria que a rota não funciona. Os coringas vão primeiro. (2) A fixture do pedido perdeu o
> `...extra` do argumento: a aprovação nunca chegava (S5) e o "pedido já pago" media o pendente de
> novo (S6b) — **dois cenários que teriam passado medindo o estado errado**.

### O percurso inteiro (S7) — CTA → progresso → rota → QR

| | 390 × 844 | 1440 × 900 |
| --- | --- | --- |
| altura do CTA "Pagar R$ …" | **64px** | **67px** |
| depois do clique — URL | `/checkout` | `/checkout` |
| depois do clique — título | "Estamos registrando seu pedido" | idem |
| CTA ainda na tela? | **não** | **não** |
| blocos do checkout na tela? | **não** | **não** |
| passo 2 marcado como concluído? | **não** | **não** |
| pedido criado — URL | **`/pedido/ord-teste-58/pagamento`** | idem |
| título | "Gerando seu código PIX" | idem |
| passo 1 concluído · `#0244` na tela · "Ambiente seguro" | **sim · sim · sim** | **sim · sim · sim** |
| código chega — título | "Agora é só o PIX" | idem |
| **F5 na rota** | QR volta · **0 chamadas de `create-order`** | idem |

`PIX-P1-01`, `PIX-P1-02`, `PIX-P1-04` e `PIX-P1-05` conferidos em navegador, não por proxy de classe.

### Os cinco estados do PIX

| Estado | 390 — `scrollWidth` doc/body | pílula cheia (altura × largura) | outras medidas |
| --- | --- | --- | --- |
| gerando (antes dos 8s) | **390 / 390** | — | doc 844px, cabe na viewport |
| gerando (depois dos 8s) | **390 / 390** | — | a linha entra; os passos **não se movem** |
| pronto (09:47) | **390 / 390** | "Copiar código" **48 × 302** | QR 174×176 · campo copia-e-cola 44×302 |
| pronto (últimos 5 min) | **390 / 390** | idem | tempo `03:59` em `text-estrelinha-primary` |
| expirado | **390 / 390** | "Gerar um código novo" **48 × 302** | — |
| falha | **390 / 390** | "Tentar gerar o código de novo" **48 × 302** | — |
| confirmado | **390 / 390** | — (nenhuma) | **batida de 1194 ms** → `/pedido/:id` |

Em 1440 × 900: `scrollWidth` **1440 / 1440** em todos, "Copiar código" **48 × 304**, "Gerar um código
novo" e "Tentar gerar" **48 × 568**, batida de **1188 ms**.

**Rolagem horizontal do body: ZERO em 18 medições** (9 cenários × 2 viewports).

**`PIX-P2-05` medido, não suposto**: com 09:46 restantes o tempo sai `font-bold text-estrelinha-ink`;
com 03:59, `font-bold text-estrelinha-primary`. Nenhuma classe de vermelho, nenhum `animate-pulse`.

### `/pedido/:id` pendente (board `58 I`)

| | 390 | 1440 |
| --- | --- | --- |
| "Pagar com PIX" | **64 × 358**, `bg-estrelinha-primary` | **64 × 736**, cheia |
| "Acompanhar pedido" | **64 × 358**, contorno | **64 × 362**, contorno |
| pedido **já pago** | "Pagar com PIX" **ausente**; "Acompanhar pedido" volta a ser a cheia | idem |
| `scrollWidth` | 390 / 390 | 1440 / 1440 |

### O alvo de 44px que `getBoundingClientRect` não mede

"Ver os detalhes do pedido" usa `TAP_ROW`, que cresce o alvo por **pseudo-elemento**: a caixa
pintada mede **20 × 162** e `getBoundingClientRect` não enxerga o `::before`. A prova é
**funcional**, no molde da feature `53`: um clique **10px acima** da borda pintada **navegou** para
`/pedido/ord-teste-58`, nos dois viewports.

---

## 4 · Achados

### ACHADO 1 — a linha dos 8s empurra o bloco de valor (medido, aceito)

`PIX-P1-07` pede que a linha **acrescente** sem substituir os passos, e é o que ela faz: o rótulo do
passo em curso fica no mesmo lugar (`passoContinuaNoLugar: true` nas duas larguras). Mas a linha
entra **no fluxo**, entre o cartão dos passos e o valor, e empurra o que vem abaixo:

| viewport | deslocamento do bloco "Valor do pedido" |
| --- | ---: |
| 390 × 844 | **+104px** |
| 1440 × 900 | **+84px** |

**Nada sai da dobra**: a altura do documento continua 844 em 390 (cabe na viewport inteira), então o
valor e o rodapé permanecem visíveis depois do empurrão. **Reservar o espaço seria pior**: a linha só
aparece em uma espera anormal, e reservar sua altura deixaria um vão permanente na tela que 100% das
compras veem. Registrado como comportamento medido, não como defeito.

### ACHADO 2 — o WhatsApp da tela de falha não aparece com as settings padrão

Na tela de falha, a ação "Falar com a gente no WhatsApp" **não renderizou** em nenhuma das medições.
Não é defeito: as medições rodaram com `store_settings` vazio (a stack local está fora), e
`PixSurface` tem portão de menos de 10 dígitos — mesma régua de `PolicyContact`. Em produção o
número está configurado. **A ausência do número em produção não foi conferida nesta rodada.**

### ACHADO 3 — a "única pílula cheia" é da área de ação, não da página inteira

Em `/pedido/:id` a varredura de `bg-estrelinha-primary` encontra **duas**: "Pagar com PIX" e o CTA
"Siga-nos no Instagram" do **rodapé** da loja, que é `StoreLayout` e é anterior a esta feature.
`CNF-05` e `PIX-P3-02` falam da área de ação da confirmação, e ali há **uma** só — que é o que o
teste de componente mede. Registrado para o número da varredura não surpreender quem reler.

---

## 5 · O que NÃO foi medido, e por quê

1. **Escrita real no banco nesta rodada.** O Docker está fora; a numeração `0170`/`0171` foi provada
   na **fase 1**, com dois `insert` reais no Postgres local. Nada da fase 3 escreve no banco.
2. **O QR escaneado por um celular de verdade.** O desenho é `qrcode.react` sobre a string que o
   Mercado Pago devolve; aqui a string é sintética. O tamanho (174×176 em 390, dentro de uma caixa
   de 200) está medido; a legibilidade por câmera não.
3. **O caminho do CARTÃO em navegador.** Ele precisa do SDK do Mercado Pago montando o Brick, que
   não sobe sem chave e sem rede. O que esta fase garante sobre ele é **ausência de mudança**: o
   mutante M3 prova que a tela de progresso não o alcança, e os 12 casos de `PGM-06 … PGM-08`
   seguem verdes sem uma asserção tocada.
4. **Rede lenta e CPU limitada (Slow 4G, 4× CPU), LCP e CLS.** Nenhuma AC desta feature fala de
   métrica de carregamento, e o percurso é pós-clique — mas a rota nova é uma página `lazy` a mais,
   e ninguém mediu o custo da primeira pintura dela.
5. **`prefers-reduced-motion`.** O único movimento das telas novas é o `animate-spin` do anel de
   progresso, que é **indicador de progresso** e não enfeite (a mesma distinção que
   `animacaoRespeitaMovimento.test.ts` faz no painel). Não há par `motion-reduce:` e não foi
   conferido em navegador com a preferência ligada.
6. **Verificação independente.** Autor = verificador. Os nove mutantes reduzem o viés; não o
   eliminam.
7. **A gaveta do carrinho e o `AuthOverlay` durante a espera.** A tela de progresso substitui o
   checkout inteiro, inclusive os dois — decisão de implementação, sem AC que a cubra, e sem
   consequência observável (nenhum dos dois pode ser aberto enquanto a espera está na tela).

---

## 6 · Rastreabilidade das ACs desta fase

| AC | Como foi provada |
| --- | --- |
| `PIX-P1-01` | `CheckoutPage.test.tsx` (dois passos nomeados, passo 2 não concluído) **+ navegador S7** |
| `PIX-P1-02` | asserção de **ordem** (`chamadasDeCodigoAoMontar === 0`) + M1 **+ navegador S7** |
| `PIX-P1-04` | navegador: **F5 na rota, 0 chamadas de `create-order`** |
| `PIX-P1-05` | `CheckoutPage.test.tsx` + `PaymentBlock.test.tsx` (invertidos) + M2 · M3 **+ navegador** |
| `PIX-P1-08` | `OrderPaymentPage.test.tsx`, os dois sentidos do recorte + M4 |
| `PIX-P2-05` | navegador: `ink` a 09:46, `primary` a 03:59 |
| `PIX-P3-01` · `PIX-P3-02` · `PIX-P3-03` | `OrderConfirmationPage.test.tsx` + M5 · M6 **+ navegador S6/S6b** |
| `PIX-P3-04` | `AccountPage.test.tsx` + `pagamentoComDonoUnico.test.ts` + M7 · M8 · M9 |

---
---

# Verificação INDEPENDENTE — autor ≠ verificador

**Data**: 2026-09-22 · **Escopo**: as **22 ACs** da `spec.md`, contra a working tree inteira
(`git diff HEAD` sobre `0fcc42d` + os não rastreados). Quem escreve esta seção **não implementou
nada** da feature e **não leu a autoavaliação antes de medir** — as seções 1–6 acima são do autor e
ficam preservadas como estão.

**Veredito: ❌ FAIL.** Um botão morto numa tela de recusa (viola uma borda da spec **e** um Success
Criteria), e **5 mutantes sobreviventes em 21** — três deles em ACs que a rodada do autor não
sensoriou, porque ela se declarou limitada às fases 3 e 4.

---

## V1 · Gate remedido do zero, cinco workspaces, um por vez, exit code fora de pipe

| Workspace | Medido | Baseline informada | Veredito |
| --- | --- | --- | --- |
| store | **3733 / 230** | 3733 / 230 | ✅ (ver a flake abaixo) |
| core | **2459 / 97** | 2459 / 97 | ✅ |
| backoffice | **3024 / 166** | 3024 / 166 | ✅ |
| functions | **660 / 14** | 660 / 14 | ✅ |
| catalog-import | não tocado, não remedido | 512 / 23 | — |

- **Lint: 26 erros / 6 warnings** (store 2/2 · backoffice 24/4) — igual à baseline.
- **Tipos: 0 · 0** (`npx tsc --noEmit -p apps/<app>/tsconfig.app.json`).
- **`packages/core/src/payment/**`: zero arquivos** (`git status --porcelain`).
- ⚠️ **1 reprovação na suíte cheia do store**: `src/app/__tests__/routing.test.tsx > /produtos/:slug
  monta a ProductPage`, com a árvore parada em `aria-busy="true"` (Suspense não resolvido). **Passa
  isolada, 17/17.** É a assinatura de contenção que este `CLAUDE.md` já registra — não é regressão
  desta feature, mas fica anotada porque o `App.tsx` ganhou a **18ª** página `lazy` e o arquivo que
  flakeia é justamente o que monta o roteador inteiro.

---

## V2 · Probe REAL no banco local — o que a rodada do autor não pôde medir

A seção 5 acima declara que o Docker estava fora e que a numeração foi provada "na fase 1". **Aqui o
Docker estava de pé**, e as duas ACs de numeração foram medidas contra o Postgres local de verdade,
com `rollback` onde possível e limpeza das duas linhas que precisaram commitar.

| O quê | Como | Resultado |
| --- | --- | --- |
| a migration está aplicada | `supabase_migrations.schema_migrations` | `20260921120000` presente |
| o `default` da coluna | `information_schema.columns` | `lpad((nextval('orders_number_seq'))::text, 4, '0')` |
| a sequência | `select last_value, is_called` | `170 / f` — nunca chamada antes do probe |
| **`PIX-P4-01`** | dois `insert` sem `order_number`, em transação | **`0170`, `0171`** |
| valor explícito vence o default | `insert … order_number = 'NS-999'` | **`NS-999`** — o importador segue intacto |
| **`PIX-P4-02`** | duas transações **sobrepostas** (a primeira segura 2s antes do commit) | **`0172` e `0173`, nenhuma falhou** |
| a borda "sequência com buraco" | o `rollback` do primeiro probe | confirmada: o número é consumido e não volta |

**E uma leitura que fecha `PIX-P1-06` sem suposição.** A AC diz "já está aprovado" e o código lê
`paid_at`. Não é aproximação: `apply_payment_approval` grava `payment_status='approved'` **e**
`paid_at = now()` no MESMO `update`, e `select count(*) … where payment_status='approved' and
paid_at is null` devolve **0**. A leitura é fiel ao estado.

> ⚠️ **Um achado de segurança-documental, medido e não explorável.** A migration afirma, por
> extenso, que "`anon` NÃO aparece aqui, e a ausência é a regra: nenhum grant de escrita alcança o
> papel público". O banco discorda:
> `has_sequence_privilege('anon','public.orders_number_seq','USAGE')` devolve **verdadeiro** — o
> `anon` herda `USAGE` das *default privileges* do schema `public`, sem nenhum `grant` no arquivo.
> **Não é explorável**: `set local role anon; insert into orders …` foi medido e morre com
> `new row violates row-level security policy` (não há policy de `INSERT` para `anon`).
> O problema é de outra natureza: é uma **afirmação sobre schema escrita à mão e nunca verificada**,
> dentro de um repositório cuja regra `AD-012` existe exatamente contra isso — e
> `orderNumberSchema.test.ts` a "confirma" medindo o **texto do arquivo**, não o banco.

---

## V3 · Sensor de discriminação — 21 mutações nos arquivos REAIS

Cada mutação foi escrita no arquivo de produção por um arnês que **lança** quando a string alvo não
é encontrada (mutação no-op não passa por morte), o arquivo restaurado, e a restauração conferida
por **sha256 de todos os alvos** ao fim de cada rodada. **Nenhum mutante morreu por compilação** —
todas as formas são sintaticamente válidas, e todas as mortes vieram com `Failed Tests N`.

**O foco é deliberado**: a rodada do autor (9 mutantes) declara escopo de **fases 3 e 4**. As fases
1 e 2 — o número do pedido, a migration, a máquina do PIX, as duas telas novas — não tinham sensor
nenhum. É onde estão 3 dos 5 sobreviventes.

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| M1 | `core/orders/format.ts` | `formatOrderNumber` devolve o número **sem** o prefixo | ✅ morto (11) |
| M2 | `core/orders/format.ts` | `stripOrderNumberPrefix` vira no-op | ✅ morto (8) |
| M3 | migration `58` | `start with 170` vira `start with 1` | ✅ morto (3) |
| M4 | migration `58` | o `default` perde o `lpad(…, 4, '0')` | ✅ morto (4) |
| **M5** | `usePixPayment.ts` | **`PIX_SLOW_MS` 8000 vira 30000** | ❌ **SOBREVIVEU** |
| **M6** | `OrderPaymentPage.tsx` | **`BATIDA_MS` 1200 vira 45000** | ❌ **SOBREVIVEU** |
| M7 | `usePixPayment.ts` | `failed` passa na frente de `approved` | ✅ morto (1) |
| M8 | `usePixPayment.ts` | `setSlow(false)` some da entrada do efeito | ✅ morto (10) |
| M9 | `usePixPayment.ts` | a pergunta da convidada aprova **qualquer** resposta | ✅ morto (1) |
| M10 | `PixSurface.tsx` | `ATENCAO_S` 300 vira 60 | ✅ morto (2) |
| M11 | `PaymentProgress.tsx` | o passo 1 nasce **concluído** | ✅ morto (6) |
| **M12** | `podePagarComPix.ts` | **a igualdade com `pending` vira "diferente de `approved`"** | ❌ **SOBREVIVEU** |
| M13 | `orderQuery.ts` | a busca perde o recorte do prefixo | ✅ morto (5) |
| M14 | `checkout/handlers.ts` | a function volta a cunhar `order_number` | ✅ morto (3) |
| M15 | `send-notification/render/vars.ts` | o e-mail volta a citar o número cru | ✅ morto (5) |
| M16 | `OrderConfirmationPage.tsx` | o prefixo colado à mão volta a uma tela | ✅ morto (2, pelo guarda novo) |
| M17 | `AccountPage.tsx` | uma segunda tela pede código PIX ao `create-payment` | ✅ morto (1, pelo guarda novo) |
| M18 | `App.tsx` + `routes.ts` + `podePagarComPix.ts` | a rota renomeada nas três pontas, o literal do checkout deixado para trás | ⚠️ morto (2) — **mas por nenhuma régua do checkout** |
| M19 | `CheckoutPage.tsx` | o checkout navega para o endereço errado | ✅ morto (6) |
| **M20** | `OrderPaymentPage.tsx` | a limpeza perde a trava de execução única (`jaConcluiu`) | ❌ **SOBREVIVEU** |
| **M21** | `send-notification/render/layout.ts` | o import relativo de `format.ts` perde a extensão | ❌ **SOBREVIVEU** (nos **dois** workspaces) |

**21 injetados · 16 mortos · 5 sobreviventes · 0 mortes por compilação.**

---

## V4 · Os achados, por custo

### A1 · BLOQUEADOR — "Entrar com código" é um botão MORTO em `/pedido/:id/pagamento`

Não é mutante: é o estado atual da árvore.

`OrderAccessRefusal` chama `openAuth({ returnTo })`, que só liga uma flag numa store. Quem
**renderiza** o overlay são exatamente dois lugares, conferidos por varredura do `apps/store/src`
inteiro: `StoreLayout.tsx:99` e `CheckoutPage.tsx:548`. A rota nova está **fora do `StoreLayout`**
por decisão (`App.tsx`, irmã de `/checkout`) e `OrderPaymentPage.tsx` **não monta o overlay**. Uma
convidada cujo token expirou abre o endereço do próprio pagamento, lê "Pedido não encontrado", toca
em **"Entrar com código"** — e **nada acontece**.

Bate em três coisas ao mesmo tempo:

- a **borda da spec**: *"…ou sem a credencial da convidada THEN a loja SHALL mostrar a mesma recusa
  que `/pedido/:id` mostra hoje (pedido não encontrado / **entrar com código**)"*. A recusa
  renderiza; a única ação que existe para quem não tem sessão não funciona;
- o **Success Criteria**: *"Nenhuma tela do fluxo mostra um CTA que não faz nada"* — que é o defeito
  que abre o `Problem Statement` desta própria feature;
- o **achado nº 1 recorrente deste repositório**: as duas pontas provadas e o fio entre elas não.
  `OrderPaymentPage.test.tsx:318` assere `openAuth` ter sido chamado **com o módulo
  `@/features/auth` inteiro dublado** — o dublê torna o furo invisível por construção.

E o comentário desse mesmo dublê (`OrderPaymentPage.test.tsx:91`) diz *"a recusa tem arquivo próprio
no widget"*. **Não tem**: `widgets/order-access-refusal/` tem `index.ts` e `ui/OrderAccessRefusal.tsx`
e nenhum `__tests__`. É *comentário que afirma cobertura inexistente*, o defeito que a `51` nomeou.

**Conserto mínimo**: montar `<AuthOverlay />` em `OrderPaymentPage` (a rota já é "fora do layout",
como o checkout), com a asserção **espelho** da que já existe em `CheckoutPage.test.tsx:475` —
`expect(screen.getByTestId('auth-overlay')).toBeInTheDocument()` —, e um teste próprio para
`OrderAccessRefusal` cobrindo os três ramos (`isError`, com sessão, sem sessão).

### A2 · MAIOR — `PIX-P1-07`: os **8 segundos** não têm régua (M5)

A AC é literal: *"WHEN a geração do código passa de **8 segundos**"*. `usePixPayment.test.tsx:111`
mede `PIX_SLOW_MS - 100` contra `PIX_SLOW_MS` — **importando a própria constante**. A régua é o
objeto medido, e a suíte é uma tautologia sobre o valor.

Medido: `PIX_SLOW_MS = 30000` deixa **5 arquivos verdes**. E a consequência não é cosmética: o
timeout de `useCreatePayment` é **15s**, então qualquer valor acima dele faz a linha de espera longa
**nunca aparecer** — a tela vai de progresso silencioso direto para a de falha, que é exatamente o
estado que a AC existe para remover.

**Conserto mínimo**: `expect(PIX_SLOW_MS).toBe(8000)` e, melhor, a relação que o `design.md` declara
("metade do timeout de 15s") asserida contra o timeout **lido do dono** (`useCreatePayment`), para
que subir o timeout sem subir a linha também reprove.

### A3 · MAIOR — `PIX-P3-03` / `podePagarComPix`: o literal `pending` não é medido (M12)

`podePagarComPix` foi extraído **exatamente** por ser regra pura com dois leitores — e **não tem
arquivo de teste**: a varredura do `apps/store/src` só o encontra nas duas páginas e no guarda de
dono único. As duas suítes de página cobrem `payment_method`, `paid_at`, `cancelled` e
`pending` contra `approved`, e **nenhuma cobre `rejected` nem `refunded`**.

Alargar a comparação de `payment_status` deixa as duas suítes verdes. O comentário do próprio módulo
afirma que o literal é deliberado (*"anunciar o caminho de pagamento de um pedido reembolsado ou
estornado seria convidar a cliente a pagar duas vezes"*) e o doc de `orderPaymentPath` declara a
assimetria com a rota (*"um pedido cujo `payment_status` ficou `rejected` **não é anunciado por tela
nenhuma**"*). **As duas afirmações não têm asserção nenhuma.**

**Conserto mínimo**: `entities/order/lib/__tests__/podePagarComPix.test.ts`, uma tabela por dimensão,
com `rejected`, `refunded`, `in_process` e `cancelled` no conjunto.

### A4 · MAIOR — o alcance Deno é guardado em **um** dos **dois** importadores (M21)

`format.ts` é alcançado por caminho relativo por **dois** arquivos da edge function:
`render/vars.ts` **e** `render/layout.ts`. A asserção de extensão explícita
(`numeroDoPedidoComDonoUnico.test.ts`, *"o e-mail alcança o formatador por caminho relativo COM
extensão"*) lê **só `vars.ts`**.

Medido: tirar a extensão do import de `layout.ts` deixa **functions 14/14 verdes e os dois guardas do
store verdes**. Vite e vitest resolvem as duas formas; quem não resolve é o Deno — e o preço já está
registrado neste repositório duas vezes (`33` e `52`), com a function fora do ar antes da primeira
linha rodar. **Escopo de varredura menor que a regra é allowlist com outro nome.**

**Conserto mínimo**: derivar os importadores em vez de nomear um — varrer `supabase/functions/**`
procurando quem cita `orders/format` e exigir a extensão em **todos**, com âncora de contagem de pelo
menos dois.

### A5 · MAIOR (exposição elevada, causa preexistente) — a borda `IDN-07` perdeu o gatilho no caminho PIX

A spec diz: *"WHEN a pessoa entra ou sai da conta com um pedido em curso THEN a mecânica de `IDN-07`
SHALL **continuar valendo**"*. Os três casos que a provavam foram **declaradamente migrados para o
caminho do cartão** (`CheckoutPage.test.tsx:670,684,698`), com o motivo escrito: no PIX a página
desmonta e o efeito não roda.

O efeito de `IDN-07` (`CheckoutPage.tsx:156`) guarda a identidade anterior num `useRef`, e
`undefined` significa "primeira passada, não invalide". **A cada remontagem do checkout o guarda
nasce cego.** Antes da `58` o checkout ficava montado atrás do QR; agora a saída para a rota do
pagamento é o caminho normal — e `PIX-P1-08` mantém, de propósito, `orderId` e carrinho intactos
(`CheckoutPage.test.tsx:1639` assere `orderId === 'order-1'` depois da entrega do bastão).

O percurso: convidada cria o pedido, não paga, sai da rota, **entra na conta** (pelo header, que só
existe fora desta rota), volta ao `/checkout` com a sacola cheia, toca no CTA — e
`payingOrderId = useCheckoutStore.getState().orderId` (`CheckoutPage.tsx:352`) **reusa o pedido de
convidada**, que é o 403 de `create-payment` que `IDN-07` existe para impedir.

O furo da remontagem é **anterior** à `58`; o que a feature muda é que sair da página deixou de ser
exceção e passou a ser o fluxo. Nenhum teste do caminho PIX cobre essa borda hoje.

**Conserto mínimo**: decidir e registrar — ou a identidade observada passa a viver no
`checkoutStore` (sobrevive à remontagem), ou a borda é reescrita na spec dizendo que ela vale para o
cartão e que o que protege o PIX é outra coisa. Hoje a spec afirma uma e a árvore faz outra.

### A6 · MENOR — `CheckoutPage.tsx:418` monta o endereço da rota à mão

`orderPaymentPath` é declarado, no próprio arquivo, como *"o endereço da superfície de pagamento de
um pedido — montado num lugar só"*, e é chamado por `/conta` e por `/pedido/:id`. O **checkout** não
o chama: escreve o caminho à mão.

M19 mostra que o literal está preso **num sentido** (mudá-lo sozinho derruba 6 casos). M18 mostra o
outro sentido: renomeando a rota em `App.tsx`, `routes.ts` e `orderPaymentPath`, quem reprova são os
literais de `AccountPage.test.tsx:86` e `OrderConfirmationPage.test.tsx:359` — **`CheckoutPage.test.tsx`
passa**, porque ele declara o próprio `<Route path="/pedido/:id/pagamento">` dentro do arquivo de
teste. Consertados aqueles dois literais (o reflexo natural), o checkout passa a navegar para uma URL
que não existe, com a suíte inteira verde. **Conserto mínimo**: uma chamada.

### A7 · MENOR — a batida de 1,2s não tem régua (M6)

`BATIDA_MS` 1200 para 45000 deixa `OrderPaymentPage.test.tsx` verde, pela mesma tautologia de A2 (o
teste importa a constante). `PIX-P2-04` **não** fixa a duração — ela é *assumption*, não AC —, então
isto é menor; mas a tela lida como travada é o defeito que a feature veio remover.

### A8 · MENOR — a trava de execução única da limpeza não tem régua (M20)

Apagar `jaConcluiu` deixa `OrderPaymentPage.test.tsx` verde: em jsdom a página renderiza uma vez e o
efeito roda uma vez de qualquer jeito. Consequência real: `markCartRecovered` gravado mais de uma
vez e o carrinho limpo de novo se o efeito reexecutar. Baixa, e declarada.

---

## V5 · As 22 ACs, uma a uma

| AC | Resultado da spec | `file:line` + asserção | Veredito |
| --- | --- | --- | --- |
| `PIX-P1-01` dois passos nomeados, concluído só por resposta | rótulos exatos; passo 1 ativo não marca o 2 | `PaymentProgress.test.tsx:34,43,63` · `CheckoutPage.test.tsx:1571` (`queryByText('Pedido registrado')` ausente com a promessa presa) · M11 | ✅ provada |
| `PIX-P1-02` navega **antes** de pedir o código; mesmo header, valor e passos | ordem | `CheckoutPage.test.tsx:1625` — `expect(chamadasDeCodigoAoMontar.current).toBe(0)`, medido **de dentro** da rota destino · `:1604` · `OrderPaymentPage.test.tsx:185` · M19 | ✅ provada |
| `PIX-P1-03` valor · QR · copia-e-cola com ação · validade | os quatro | `PixSurface.test.tsx:77` · `OrderPaymentPage.test.tsx:205` · M10 | ✅ provada |
| `PIX-P1-04` F5 / histórico / outro aparelho seguem funcionando, **sem criar um segundo pedido** | zero `create-order` | `usePixPayment.test.tsx:73` (uma chamada, sob `StrictMode`) · `OrderPaymentPage.test.tsx:178` | ⚠️ **por proxy** — "sem criar um segundo pedido" é verdade **por construção** (a rota não importa `useCreateOrder`) e não tem asserção; histórico e outro aparelho não são medíveis em jsdom. A única medida direta é a prova em navegador do autor, que não reproduzi |
| `PIX-P1-05` sem CTA "Pagar…", sem blocos, sem resumo editável | ausência das três coisas | `CheckoutPage.test.tsx:1587` · `OrderPaymentPage.test.tsx:239` (`input:not([readonly])` = 0) · `PaymentBlock.test.tsx` invertidos | ✅ provada |
| `PIX-P1-06` aprovado · cancelado · cartão levam a `/pedido/:id` | redirect **sem** gerar código | `OrderPaymentPage.test.tsx:266` (3 casos + `usePixPaymentMock` não chamado) + par inverso `:281` + **probe SQL** de que `approved` implica `paid_at` | ✅ provada |
| `PIX-P1-07` acima de **8s**, linha que acrescenta | o número 8000 | `usePixPayment.test.tsx:111` (mede `PIX_SLOW_MS ± 100` **importando a constante**) · `PaymentProgress.test.tsx:128` | ❌ **por proxy — M5 sobreviveu** (A2) |
| `PIX-P1-08` limpa só o pedido deste rascunho | recorte nos dois sentidos | `OrderPaymentPage.test.tsx:440,450,461,468,477` · M4 do autor | ✅ provada |
| `PIX-P2-01` expirou · nada cobrado · **uma** ação | `buttons.length === 1` | `PixSurface.test.tsx:183,190` · `usePixPayment.test.tsx:179` | ✅ provada |
| `PIX-P2-02` o mesmo pedido, sem alterar o valor | mesmo `order_id` nas duas chamadas | `usePixPayment.test.tsx:186` · `PixSurface.test.tsx:199` | ✅ provada |
| `PIX-P2-03` falha **ou timeout de 15s** · nomeia o pedido · nada cobrado · duas saídas | as quatro | `PixSurface.test.tsx:225,235,246,255` · `usePixPayment.test.tsx:201,213` | ⚠️ **precisão**: o *timeout de 15s* nunca é exercido nesta feature — `useCreatePayment` é dublado em todos os arquivos. O que se prova é a falha genérica; o `AbortController` é herdado e não foi remedido |
| `PIX-P2-04` confirma na própria tela antes de navegar, com caminho manual | ordem + link presente | `OrderPaymentPage.test.tsx:328,358,371,386,402` · `PixSurface.test.tsx:291,311` | ✅ provada (a **duração** não é AC — ver A7) |
| `PIX-P2-05` tempo como fato; `primary` nos últimos 5 min | token exato, fronteira em 300 | `PixSurface.test.tsx:130,138,148,157,174` · M10 | ✅ provada |
| `PIX-P3-01` pendente + pix oferece Pagar com PIX | `href` da rota | `OrderConfirmationPage.test.tsx:359` | ✅ provada |
| `PIX-P3-02` única pílula cheia; Acompanhar vira contorno | contagem + par inverso | `:366` e `:392` | ✅ provada |
| `PIX-P3-03` não pendente, botão não existe | ausência | `:378` (pago · cartão · cancelado) | ❌ **por proxy — M12 sobreviveu** (A3): `rejected`/`refunded` fora da amostra |
| `PIX-P3-04` `/conta` leva à rota em vez de montar | link, não botão; nenhuma superfície | `AccountPage.test.tsx:80,86,96,106` · `pagamentoComDonoUnico.test.ts` · M17 | ✅ provada |
| `PIX-P4-01` sequencial, ao menos 4 dígitos, zeros à esquerda, a partir de 170 | `0170`, `0171` | `orderNumberSchema.test.ts` (M3, M4) **+ probe real: `0170`/`0171` no banco local** | ✅ provada |
| `PIX-P4-02` simultâneos recebem números diferentes, nenhum falha | unicidade sob concorrência | **probe real: transações sobrepostas produziram `0172`/`0173`, ambas commitadas.** Em suíte só existe a AUSÊNCIA da coluna (`createOrder.test.ts`) | ✅ provada **por probe** (sem evidência persistida antes desta rodada) |
| `PIX-P4-03` o prefixo vem de UMA função; o gravado é só o valor | dono único + ausência do prefixo na gravação | `format.test.ts` · `numeroDoPedidoComDonoUnico.test.ts` (metade positiva, 8 arquivos) · `createOrder.test.ts` · M1, M14, M15, M16 | ✅ provada |
| `PIX-P4-04` legado legível, sem segundo prefixo | `#NS-169`, `#NP-…`, duplicata colapsa | `format.test.ts:35-65` · `PaymentProgress.test.tsx:98,107` · `OrderConfirmationPage.test.tsx:207` | ✅ provada |
| `PIX-P4-05` `244`, `0244` e `#0244` acham o mesmo pedido | mesma condição para as duas primeiras | `orderList.test.ts:104,116,122,134,149,153` · M13 | ✅ provada |

**18 provadas · 3 por proxy (`PIX-P1-04`, `PIX-P1-07`, `PIX-P3-03`) · 1 precisão (`PIX-P2-03`).**

### Bordas da spec

| Borda | Veredito |
| --- | --- |
| id inexistente / sem credencial devolve a recusa de `/pedido/:id`, nunca um QR vazio | ⚠️ a recusa **renderiza** (`OrderPaymentPage.test.tsx:301,310`), mas a ação da convidada é um **botão morto** — ver A1 |
| entrar/sair da conta com pedido em curso (`IDN-07`) | ❌ ver A5 |
| falha de criação volta ao checkout com rascunho e carrinho (`CHK-09`) | ✅ `CheckoutPage.test.tsx:1652` |
| `NeedsOtpError` segue no desafio, sem passar pelo progresso | ✅ `CheckoutPage.test.tsx`, bloco da `58` |
| aprovação que chega em expirado/falha segue para a confirmação | ✅ `usePixPayment.test.tsx:349,360` · M7 |
| buraco na sequência é aceito | ✅ confirmado no probe (o `rollback` consumiu o 170 e não o devolveu) |

---

## V6 · Guardas novos — auditados um a um

| Guarda | Âncora de contagem | Metade positiva | Acusa a forma que existe para recusar? |
| --- | --- | --- | --- |
| `orderNumberSchema.test.ts` | ✅ dupla — os **dois** arquivos lidos (tamanho e conteúdo conferidos) **e** exatamente **3 comandos** após remover comentário | ✅ `service_role` tem `usage`; o índice único da migration de origem existe | ✅ **M3 e M4 injetados no arquivo real** derrubam a suíte. Os sensores internos mutam o SQL **sem comentário**, o que evita a armadilha que o próprio arquivo documenta |
| `numeroDoPedidoComDonoUnico.test.ts` | ✅ dupla — mais de 400 arquivos dos dois apps **e das functions**, com 3 caminhos nomeados; **e** as duas formas encontradas no próprio arquivo | ✅ **8 consumidores por nome**, e `cita()` **lança** quando o caminho some (a lição de `originZipNotRead`) | ✅ **M16**. Régua por token exato dos dois lados, removedor de comentário com CRLF/LF e o glob de dois asteriscos, allowlist de UM com a prova de que outro teste seria acusado. **Furo: a metade positiva do lado Deno lê só `vars.ts`** — ver A4 |
| `pagamentoComDonoUnico.test.ts` | ✅ dupla — mais de 300 arquivos e mais de 200 de produção, com 4 caminhos nomeados; **e** as duas réguas encontradas no dono | ✅ o dono chama `useCreatePayment` e desenha o QR; `/conta` e `/pedido/:id` **linkam** | ✅ **M17**. O recorte de fecho depois do literal (que separa *chamar* de *declarar*) tem sensor próprio, e os inversos provam que a fixture de pedido e o caminho do cartão não são acusados |
| alcance Deno (`format.test.ts`, bloco final) | ✅ âncora lê `export function formatOrderNumber` do disco | — (a positiva mora no guarda acima) | ⚠️ **régua mais forte que o necessário e mais estreita que a regra**: exige **zero** imports em `format.ts` (ótimo) mas não alcança os importadores. **M21 sobreviveu** — ver A4 |

**Nenhum dos quatro tem a régua como objeto medido** (escopos e allowlists escritos literalmente).
Onde isso falha é **fora** dos guardas: em `PIX_SLOW_MS` e `BATIDA_MS`, cujos testes importam a
constante que deveriam medir (A2, A7).

---

## V7 · O que NÃO consegui medir

1. **A prova em navegador da seção 3.** Não a reproduzi. Aceito-a como registro do autor e não a
   conto como evidência independente — em particular as linhas de `PIX-P1-04` (F5 com 0 chamadas de
   `create-order`) e `PIX-P2-05` (`ink`/`primary` em pixel), que são as duas onde o navegador é a
   única régua possível.
2. **`deno check` sobre o grafo de `send-notification`.** A conclusão de A4 é estrutural (dois
   importadores, um guardado) e apoiada no que as features `33` e `52` já mediram — não em uma
   execução do Deno nesta rodada.
3. **O caminho do cartão de ponta a ponta.** Como o autor, herdo a garantia de *ausência de
   mudança*; o mutante M3 dele e o par inverso de `CheckoutPage.test.tsx` a sustentam.
4. **`catalog-import`.** Não tocado pela feature e não remedido.
5. **Se o botão morto de A1 já existia** em alguma outra rota fora do `StoreLayout`. Varri os mount
   sites do overlay, não o histórico.

---
---

# Rodada de conserto — depois da verificação independente

**Data**: 2026-09-22 · **Quem escreve**: quem consertou (≠ autor da feature, ≠ verificador).
**Entrada**: a árvore que a seção acima reprovou, sem commit, com `HEAD = 0fcc42d`.
**Escopo**: os oito itens de `V4` marcados para conserto. **Nenhuma régua foi afrouxada** — todo
conserto é asserção que **faltava**, e os dois guardas que mudaram de forma **ganharam** casos.

## R1 · Gate remedido

| Workspace | Entrada (medida) | Saída (medida) | Delta |
| --- | --- | --- | --- |
| store | 3733 / 230 | **3786 / 232** | **+53 / +2** |
| core | 2459 / 97 | **2459 / 97** | 0 — não tocado, remedido |
| functions | 660 / 14 | **660 / 14** | 0 — não tocado, remedido |
| backoffice | 3024 / 166 | não tocado, **não remedido** | — |
| catalog-import | 512 / 23 | não tocado, **não remedido** | — |

- **Tipos**: `npx tsc --noEmit -p apps/store/tsconfig.app.json` → **0**.
- **Lint**: **26 erros / 6 warnings** (store 2/2 · backoffice 24/4) — igual à baseline.
- **`packages/core/src/payment/**`**: `git diff --name-only` devolve **zero** arquivos.
- Fora de `apps/store/**`, esta rodada tocou **um** arquivo: a migration da `58`, e **só o
  comentário** — os três comandos SQL estão byte a byte iguais, e a âncora de contagem do guarda
  continua exigindo exatamente três.
- ⚠️ **A flake de `src/app/__tests__/routing.test.tsx` NÃO reapareceu** nesta execução (232/232
  verdes, exit 0). Ela continua sendo a assinatura de contenção que o `CLAUDE.md` registra, e a
  ausência numa execução não a desmente.

### Onde os 53 entraram

| Arquivo | Antes → depois | O quê |
| --- | ---: | --- |
| `entities/order/lib/__tests__/podePagarComPix.test.ts` | — → **22** | **novo** (A3) |
| `widgets/order-access-refusal/ui/__tests__/OrderAccessRefusal.test.tsx` | — → **8** | **novo** (A1) |
| `pages/__tests__/OrderPaymentPage.test.tsx` | 30 → **34** | +2 do overlay (A1), +2 da trava (A8) |
| `pages/__tests__/CheckoutPage.test.tsx` | 104 → **108** | o percurso do `IDN-07` com desmonte (A5) |
| `features/checkout/model/__tests__/checkoutStore.test.ts` | 26 → **30** | a identidade do pedido (A5) |
| `features/order-payment/model/__tests__/usePixPayment.test.tsx` | 24 → **27** | os 8s medidos (A2) |
| `shared/lib/__tests__/numeroDoPedidoComDonoUnico.test.ts` | 23 → **27** | os importadores derivados (A4) |
| `shared/lib/__tests__/pagamentoComDonoUnico.test.ts` | 19 → **23** | o endereço com dono (A6) |
| `shared/lib/__tests__/orderNumberSchema.test.ts` | 24 → **24** | só a AFIRMAÇÃO mudou (A7) |

`22 + 8 + 4 + 4 + 4 + 3 + 4 + 4 + 0 = **+53**`, que é o delta medido. **Nenhuma queda.**

## R2 · O que mudou, item a item, e qual mutante passou a morrer

Todo mutante foi injetado no **arquivo real** por um arnês que **lança** quando a string alvo não é
encontrada (mutação no-op não passa por morte), o arquivo foi restaurado e a restauração conferida
por **sha256 do conteúdo**. **Nenhum morreu por compilação** — o arnês distingue os dois modos e
imprime qual foi, e os oito saíram como `MORTE_POR=assercao`.

### A1 (bloqueador) · o CTA morto de `/pedido/:id/pagamento`

`OrderPaymentPage` passou a montar `<AuthOverlay />`, **no casco** (`Shell`) e não no ramo da
recusa — a rota vive fora do `StoreLayout`, que é quem monta o overlay para o resto da loja, e é o
mesmo lugar em que o `CheckoutPage` o monta pelo mesmo motivo.

O dublê de `@/features/auth` em `OrderPaymentPage.test.tsx` deixou de espionar `open` e passou a
usar a **store real**, com o overlay como selo. A diferença é a que o verificador apontou: com um
`open` espionado, *"o botão chamou `open`"* é verdade **com o overlay ausente da árvore** — que era
exatamente o estado da rota.

`widgets/order-access-refusal/` ganhou arquivo próprio (8 casos: erro de rede, pedido inexistente,
com sessão, sem sessão, o destino de volta, a ausência dele, e o alvo de 44px por token exato). **O
comentário que afirmava que ele já existia passou a ser verdadeiro**, e foi reescrito para dizer o
que o dublê faz e por quê.

| Mutante | Antes | Agora |
| --- | --- | --- |
| `<AuthOverlay />` some do casco da rota | — (o defeito **era** a árvore) | **morto** — 2 casos |
| o overlay migra para dentro do ramo da recusa | sobreviveria | **morto** pelo par |

### A2 · `PIX-P1-07`: os 8 segundos

Três casos novos em `usePixPayment.test.tsx`: `PIX_SLOW_MS` é **8000**; é **menor** que o timeout; e
é a **metade** dele, com o timeout **lido do dono** (`PAYMENT_TIMEOUT_MS`, de `useCreatePayment`).
O dublê daquele módulo passou a espalhar `importActual` em vez de declarar duas chaves à mão —
copiar o número do dono para dentro do teste faria a régua voltar a confirmar a si mesma, que é o
defeito que ela existe para consertar.

| Mutante | Antes | Agora |
| --- | --- | --- |
| `PIX_SLOW_MS` 8000 → 30000 (M5) | **SOBREVIVEU** (5 arquivos verdes) | **morto** — 3 casos |
| `PAYMENT_TIMEOUT_MS` 15s → 60s, sem mexer na linha | sobreviveria | **morto** — 1 caso |

### A3 · `podePagarComPix` sem arquivo de teste

`entities/order/lib/__tests__/podePagarComPix.test.ts`, 22 casos: uma tabela de `payment_status`
com `approved`, `rejected`, `refunded`, `in_process`, `cancelled` e vazio, **mais o par** que prova
que `pending` continua sendo o único que oferece; as outras três dimensões uma a uma (método, status
do pedido, `paid_at`), cada uma com o inverso; `orderPaymentPath`; e um bloco final que **compara os
dois vereditos** — o do botão e o da rota —, para a assimetria que os dois arquivos afirmam por
comentário passar a ser **medida** em vez de prometida.

| Mutante | Antes | Agora |
| --- | --- | --- |
| `=== 'pending'` vira `!== 'approved'` (M12) | **SOBREVIVEU** | **morto** — 7 casos |

### A4 · o alcance Deno guardado em UM dos DOIS importadores

A asserção deixou de nomear `vars.ts` e passou a **derivar** o conjunto: varre
`supabase/functions/**` procurando quem cita `orders/format`, exige a extensão em **todos**, e tem
âncora de contagem **≥ 2** com os dois caminhos nomeados. Um terceiro importador entra no escopo
sozinho, no instante em que passa a existir. Quatro sensores: a forma sem extensão × a com extensão,
o `import type` e o import dinâmico, e o vizinho de nome parecido (`orders/formatters.ts`) que **não**
pode ser confundido com o módulo.

| Mutante | Antes | Agora |
| --- | --- | --- |
| `render/layout.ts` perde a extensão (M21) | **SOBREVIVEU** (functions 14/14 e os 2 guardas verdes) | **morto** |
| `render/vars.ts` perde a extensão | morto | **morto** (a régua velha já tinha esta metade) |

### A5 · `IDN-07`: a identidade que sobrevive à remontagem

O guarda era um `useRef`, e **um ref nasce cego a cada montagem**. A identidade passou a viver no
`checkoutStore`, ao lado do `orderId` que ela descreve — `orderIdentity`, gravada por `setOrder`,
apagada por `invalidateOrder` e por `reset`, e **persistida** no mesmo `partialize` dos outros três
campos do pedido em curso. O efeito do `CheckoutPage` compara contra ela em vez de contra a passada
anterior, e **respeita `loading`**: enquanto a sessão é resolvida, `user` é `null` por ausência de
**resposta**, não por ausência de sessão.

Com isso o terceiro estado (`undefined` = "ainda não observei") **deixou de ser necessário**: sem
pedido em curso não há o que invalidar, então a pergunta só é feita quando ela tem sujeito.

Quatro casos novos em `CheckoutPage.test.tsx` **reproduzem o percurso** com o desmonte no meio —
convidada cria o pedido pelo PIX, o checkout sai de cena (`unmount`), ela entra na conta, volta ao
`/checkout` —, mais os pares que impedem o conserto de virar "invalide sempre que remontar": voltar
sem ter entrado, voltar já logada, e voltar com a sessão ainda carregando. Quatro casos novos em
`checkoutStore.test.ts` guardam a gravação, o `null` de convidada (nunca `undefined`), a queda junto
com o pedido, e a persistência.

| Mutante | Antes | Agora |
| --- | --- | --- |
| o guarda volta a ser uma caixa **por montagem** | — (era o estado da árvore) | **morto** — 1 caso |
| `setOrder` deixa de gravar a identidade | sobreviveria | **morto** — 1 caso |
| o recorte de `loading` some | sobreviveria | **morto** — 1 caso |

### A6 · o endereço da rota montado à mão

`CheckoutPage` passou a chamar `orderPaymentPath`, e `pagamentoComDonoUnico.test.ts` ganhou a
**quarta régua**: ninguém fora do dono monta o endereço com o id **interpolado ou concatenado**. O
recorte é o que separa *montar* de *declarar* — a rota em `App.tsx` e a rota de destino declarada
dentro de `CheckoutPage.test.tsx` são literais sem expressão, e continuam legítimas (sensor inverso
com as quatro formas). Ao lado dela, a **metade positiva**: o checkout é cobrado por **chamar** o
dono, senão apagar a navegação deixaria a ausência verdadeira e vazia — o modo de falha de
`originZipNotRead` na `55`.

| Mutante | Antes | Agora |
| --- | --- | --- |
| o checkout volta a escrever o endereço à mão | sobreviveria (M18) | **morto** — 2 casos |

### A7 · a afirmação da migration sobre `anon`

**O que mudou foi a AFIRMAÇÃO, não a régua.** A migration dizia, por extenso, que "nenhum grant de
escrita alcança o papel público"; o probe do verificador mediu o contrário —
`has_sequence_privilege('anon','public.orders_number_seq','USAGE')` é **verdadeiro**, herdado das
*default privileges* do schema `public`. O comentário passou a dizer as duas coisas: que **nenhum
grant explícito** deste arquivo alcança `anon`, e que quem barra a inserção forjada é a **RLS**
(medido: `set local role anon; insert into orders …` morre com *row-level security policy*).

O guarda manteve `concedeA(sql, 'anon') === false` **e** `concedeA(sql, 'public') === false`, com
todos os sensores intactos; o que mudou foi o nome do caso ("nenhum `grant` **EXPLÍCITO**") e um
comentário declarando o que ele mede e o que ele **não** mede. Era `AD-012` acontecendo dentro do
guarda escrito contra ele.

### A8 · a trava de execução única da limpeza (M20)

Em jsdom o efeito roda uma vez de qualquer jeito, então toda asserção de `toHaveBeenCalledTimes(1)`
já existente é verdadeira nos dois mundos. O caso novo monta a página **sob `StrictMode`**, que em
React 18 reexecuta o efeito de propósito (a mesma régua que `usePixPayment.test.tsx` já usava para
provar que o código é pedido uma vez só) — e vem com o **CONTROLE** ao lado: um efeito *sem* trava,
na mesma árvore e no mesmo modo, tem de contar **2**. Sem ele, o caso seria verdadeiro sobre o nada
no dia em que o `StrictMode` deixasse de dobrar.

| Mutante | Antes | Agora |
| --- | --- | --- |
| `jaConcluiu` apagado (M20) | **SOBREVIVEU** | **morto** — 1 caso |

## R3 · Declarado e NÃO consertado — M6, a duração da batida

`BATIDA_MS` 1200 → 45000 **continua sobrevivendo, de propósito.**

`PIX-P2-04` pede *"exibir a confirmação na própria tela antes de navegar, mantendo visível um
caminho manual"* — a **ordem** e a **presença do link**, que estão provadas (5 casos em
`OrderPaymentPage.test.tsx`, mais o par que prova que a batida não dispara em estado que não é
aprovado). A duração de ~1,2s é **assumption** da `spec.md`, não AC, e a própria tabela de
assumptions a marca como **não confirmada**: ela responde *"é curto demais para ler, ou longo demais
para esperar?"*, que é pergunta de navegador e de pessoa, não de asserção.

Cravar `expect(BATIDA_MS).toBe(1200)` seria escrever no teste um número que ninguém mediu, e cobrar
que uma decisão de ritmo passe por um guarda antes de poder ser ajustada. **A ausência de régua aqui
é deliberada, e fica registrada em vez de virar uma régua inventada.** O `design.md` já lista "a
batida de confirmação: se 1,2s é curto demais para ler, ou longo demais para esperar" entre *O que
só o navegador prova*; se a duração vier a importar, o que ela ganha primeiro é uma **AC** — e a
régua vem junto com ela.

## R4 · O que esta rodada NÃO fechou

1. **`PIX-P1-04` continua provada por proxy.** "Sem criar um segundo pedido" segue verdadeiro **por
   construção** (a rota não importa `useCreateOrder`) e sem asserção própria; histórico e outro
   aparelho não são medíveis em jsdom. A única medida direta continua sendo a prova em navegador do
   autor, que não foi reproduzida aqui.
2. **`PIX-P2-03`: o timeout de 15s nunca é exercido.** `useCreatePayment` é dublado em todos os
   arquivos; o que se prova é a falha genérica. O `AbortController` é herdado e não foi remedido.
3. **A prova em navegador não foi refeita, e o `<AuthOverlay />` novo NUNCA foi visto abrir.** Ele é
   um `Dialog`/`Drawer` do Radix, e a escolha entre os dois depende de `useIsMobile`, que jsdom não
   mede. O percurso a conferir: abrir `/pedido/<id>/pagamento` em aba anônima com o token expirado,
   tocar em "Entrar com código", e ver a gaveta subir em 390×844 e o diálogo em 1440 — **por cima do
   casco branco da rota**, que não tem o `StoreLayout` por trás. É o único conserto desta rodada com
   consequência visual.
4. **A `spec.md` não foi alterada.** `A5` dizia "ou a identidade passa a viver no `checkoutStore`,
   ou a borda é reescrita"; esta rodada escolheu a **primeira**, então a borda escrita continua
   verdadeira e não há nada a reescrever.
5. **O banco não foi remedido.** O probe de `V2` não foi repetido: nenhum comando SQL da migration
   mudou (só comentário), e a âncora de contagem do guarda continua exigindo exatamente três.
6. **`backoffice` e `catalog-import` não foram remedidos.** Esta rodada não tocou em nenhum arquivo
   deles, e nenhum guarda da loja que eles quebrariam mudou de escopo.

---
---

# Verificação INDEPENDENTE — RODADA 2

**Data**: 2026-09-22 · **Verificador**: o mesmo da rodada 1 (autor ≠ verificador continua valendo —
quem consertou foi outra pessoa). Medido contra a working tree com HEAD ainda em `0fcc42d`.
**Nada do que está acima foi apagado.** A rodada de conserto (seções `R1`–`R4`) é de quem consertou;
esta seção mede o que ela afirma, sem tomar nada como verdade.

**Veredito: ✅ PASS**, com **duas tarefas de conserto de custo baixo** (nenhuma com consequência
observável hoje) e **uma ausência de régua declarada e aceita**.

---

## W1 · Gate remedido do zero — cinco workspaces, um por vez, exit code fora de pipe

| Workspace | Rodada 1 | Rodada 2 | Delta |
| --- | --- | --- | --- |
| store | 3733 / 230 | **3786 / 232** | **+53 / +2** |
| core | 2459 / 97 | **2459 / 97** | 0 |
| backoffice | 3024 / 166 | **3024 / 166** | 0 |
| functions | 660 / 14 | **660 / 14** | 0 |
| catalog-import | não tocado | não tocado | — |

- **Lint 26/6** (store 2/2 · backoffice 24/4) e **tipos 0 · 0** — iguais.
- **Os +2 arquivos são os dois que faltavam**: `entities/order/lib/__tests__/podePagarComPix.test.ts`
  e `widgets/order-access-refusal/ui/__tests__/OrderAccessRefusal.test.tsx`.
- **Nenhum arquivo de teste desapareceu e nenhuma contagem caiu** — a regra de leitura da baseline
  ("queda só vale se o número reaparece do outro lado") não precisou ser invocada.
- ✅ **A flake da rodada 1 não reproduziu**: `src/app/__tests__/routing.test.tsx` passou dentro da
  suíte cheia, com exit 0 e **zero** reprovações. Fica como instabilidade de contenção conhecida,
  não como regressão.

**Superfície do conserto, medida e não relatada**: das 14 peças de produção que eu tinha em
checksum, **exatamente três mudaram** — a migration (só comentário), `OrderPaymentPage.tsx` e
`CheckoutPage.tsx` —, mais `checkoutStore.ts`, que não estava na minha lista da rodada 1. Nenhum
outro arquivo de produção foi tocado.

---

## W2 · Os 5 sobreviventes da rodada 1, reinjetados nos arquivos REAIS

| # | Mutação | Rodada 1 | Rodada 2 | Quem matou |
| --- | --- | --- | --- | --- |
| M5 | `PIX_SLOW_MS` 8000 → 30000 | ❌ sobreviveu | ✅ **morto (3)** | as três réguas novas: o literal, `< PAYMENT_TIMEOUT_MS` e a metade do timeout |
| M12 | `podePagarComPix` alarga para "diferente de aprovado" | ❌ sobreviveu | ✅ **morto (7)** | `podePagarComPix.test.ts` — a tabela com `rejected`, `refunded`, `in_process` |
| M21 | `layout.ts` perde a extensão do import | ❌ sobreviveu | ✅ **morto (1)** | a régua **derivada** de importadores do lado Deno |
| M20 | a trava `jaConcluiu` some | ❌ sobreviveu | ✅ **morto (1)** | o caso novo com controle ao lado |
| M6 | `BATIDA_MS` 1200 → 45000 | ❌ sobreviveu | ❌ **sobrevive — DECLARADO** | ver W5 |

**4 de 5 passaram a morrer. O quinto é ausência declarada, não lacuna.**

**Controles, para o conserto não ter sido um afrouxamento:**

| Controle | Resultado |
| --- | --- |
| `vars.ts` perde a extensão (o que a régua ANTIGA já cobria) | ✅ **morto (1)** — a derivação não trocou uma cobertura pela outra, somou |
| M4 da rodada 1 (o `default` perde o `lpad`), no arquivo de migration que MUDOU | ✅ **morto (4)** — os comentários novos não cegaram nenhuma régua |

---

## W3 · O conserto do bloqueador, com olhos de quem procura o buraco

**O overlay monta na árvore real da página?** Sim, e no lugar certo: `<AuthOverlay />` está no
`Shell` (`OrderPaymentPage.tsx:54`), que embrulha os **três** ramos que renderizam — carregando,
recusa e pagamento. O ramo de `PIX-P1-06` não passa por ele porque devolve `<Navigate>`, que é
correto.

**A asserção mede o overlay ou continua medindo a chamada da função?** Mede o overlay, e o dublê
mudou de forma para permitir isso: `vi.mock('@/features/auth')` passou a **reexportar a store real**
(`vi.importActual` de `authUiStore`) e a dublar **só o desenho**. A asserção antiga
(`expect(openAuth).toHaveBeenCalledWith(...)`) virou
`expect(useAuthUiStore.getState()).toMatchObject({ isOpen: true, returnTo: '/pedido/ord-1' })` —
estado consumível, não chamada.

**Medido por mutação, não por leitura:**

| # | Mutação | Resultado |
| --- | --- | --- |
| R6 | `<AuthOverlay />` some do `Shell` — o bloqueador de volta | ✅ **morto (2)** |
| R7b | o overlay migra do casco para **dentro do ramo da recusa** (mutação sintaticamente válida, dentro do mesmo arquivo) | ✅ **morto (1)** — e o caso da recusa **continua passando**, que é a prova de que o par discrimina posição e não presença |

**O teste do widget prova os três ramos?** Sim — `OrderAccessRefusal.test.tsx` cobre erro de rede
(manda para `/conta`, sem pedir prova), pedido inexistente **com** sessão (lista da conta) e **sem**
sessão (código por e-mail), mais o par que prova que a régua é o erro e não a identidade, mais os
dois de `returnTo` (com e sem destino) e o alvo de 44px por token exato.

**E o fio fecha de ponta a ponta**, em três arquivos que não se mascaram:

1. `OrderAccessRefusal.test.tsx:107` — o botão liga `isOpen` + `returnTo` na store **real**;
2. `OrderPaymentPage.test.tsx:355,361` — a página **monta** um `AuthOverlay`, na recusa e com o
   pedido aberto (R6/R7b provam a sensibilidade);
3. `AuthOverlay.test.tsx:45,85,100` — o overlay **real** renderiza com `isOpen`, no diálogo e na
   gaveta, e **não renderiza nada** fechado (arquivo pré-existente).

O único elo que segue sem prova é a composição dos três numa árvore só, em navegador — e quem
consertou a declarou em `R4.3` em vez de escondê-la. Concordo com a classificação.

---

## W4 · O buraco que o CONSERTO criou — 9 mutações no estado novo

`orderIdentity` é estado novo em `sessionStorage`, e é onde a feature `48` ensinou a procurar:
consolidar num dono só **move** o ônus da prova. Nove mutações, nos arquivos reais:

| # | Mutação | Resultado |
| --- | --- | --- |
| R8 | `orderIdentity` sai do `partialize` — não sobrevive ao reload | ✅ **morto (1)**, por `checkoutStore.test.ts` |
| R9 | `setOrder` sem identidade passa a gravar `undefined` em vez de `null` | ✅ **morto (1)** |
| R10 | o recorte `if (loading) return` some — a sessão em voo conta como logout | ✅ **morto (1)** |
| R11 | `invalidateOrder` deixa a identidade para trás | ✅ **morto (1)** |
| R13 | o checkout para de passar a identidade ao criar o pedido | ✅ **morto (1)** |
| **R12** | **`reset` deixa a identidade para trás** | ❌ **SOBREVIVEU** |
| **R14** | **o recorte `!orderId` some — identidade sem pedido passa a agir** | ❌ **SOBREVIVEU** |

E as três perguntas do escopo, respondidas com medida:

- **"a identidade existe e o pedido não"** → é o `!orderId`, que é a primeira metade do `if`. Ele
  **é** carga (ver `B2` abaixo), e é o que sobreviveu.
- **"o `reset` não a apaga"** → `reset` apaga (linha 145), mas **nada mede isso** (R12).
- **"a pessoa troca de aba"** → não é buraco: a persistência é `sessionStorage`
  (`checkoutStore.ts:160`, com asserção própria), então a segunda aba nasce **sem pedido em curso** e
  o `!orderId` devolve antes de qualquer comparação. O token da convidada continua em `localStorage`,
  que é o que faz a rota do pagamento abrir na aba nova — as duas escolhas continuam coerentes.

### B1 · BAIXO — `reset` não tem régua para a identidade (R12)

`invalidateOrder` tem (`R11` morre); `reset` não. O comentário do store diz que **"os quatro nascem e
morrem juntos"**, e a afirmação vale para três dos quatro caminhos.

**Consequência hoje: nenhuma observável.** Depois de `reset`, `orderId` é `null`, e o único leitor
devolve no `!orderId`; `reset` ainda chama `persist.clearStorage()`. O risco é de amanhã: no dia em
que alguém ler `orderIdentity` sem conferir `orderId` antes, o valor velho vira vivo.
**Conserto mínimo**: uma linha no caso de `reset` que já existe em `checkoutStore.test.ts`.

### B2 · BAIXO — o recorte `!orderId` não tem régua (R14)

Removê-lo deixa `CheckoutPage.test.tsx` inteiro verde. O comentário do arquivo afirma que *"sem
pedido em curso não há o que invalidar, então não existe mais o problema da primeira leitura"* — e a
afirmação não tem asserção.

**O mecanismo existe e é estreito**: `ensureRequestId()` cria `clientRequestId` **antes** de
`setOrder` gravar o `orderId`. Nessa janela, `orderId` é `null` e `orderIdentity` ainda é o valor
anterior. Sem o recorte, um evento de auth no meio do voo dispara `invalidateOrder()` e **apaga a
chave de idempotência em uso** — e a retentativa cria um SEGUNDO pedido, que é exatamente o que
`PED-04` existe para impedir. Com o recorte, a janela é inerte.

Probabilidade baixa (exige troca de sessão durante a criação do pedido), mecanismo real, cobertura
zero. **Conserto mínimo**: um caso com um pedido ausente e identidade divergente, asserindo que
`clientRequestId` **sobrevive**.

---

## W5 · M6 — a ausência de régua é declarada, e eu concordo

`BATIDA_MS` 1200 → 45000 continua deixando `OrderPaymentPage.test.tsx` verde. **Não conto como
falha**, e o motivo escrito na seção `R3` acima se sustenta contra a spec:

- `PIX-P2-04` cobra **ordem** ("antes de navegar") e **presença** ("caminho manual visível"). As
  duas estão provadas, e a ordem tem par negativo (a batida não dispara em estado que não é
  aprovado) — nenhuma delas depende do número;
- a duração de ~1,2s está na tabela de *Assumptions* da `spec.md` marcada como **não confirmada**, e
  o `design.md` já a lista em *O que só o navegador prova*;
- cravar `expect(BATIDA_MS).toBe(1200)` seria escrever no teste um número que ninguém mediu — a
  inversão do defeito que a rodada 1 apontou em `PIX_SLOW_MS`, onde o 8000 **tem** origem declarada
  (metade do timeout) e por isso ganhou régua **relacional**, lida do dono.

A distinção entre os dois casos está certa: um número com motivo escrito vira régua; um número de
ritmo, ainda não medido, vira pergunta de navegador.

---

## W6 · Alguma régua foi AFROUXADA?

**Não encontrei nenhuma.** O que procurei e o que achei:

| Verificação | Resultado |
| --- | --- |
| algum arquivo de teste sumiu ou encolheu? | não — 230 → **232** arquivos, 3733 → **3786** casos, sem queda em lugar nenhum |
| a asserção do `anon` na migration foi enfraquecida? | **não.** `expect(concedeA(sql, 'anon')).toBe(false)` continua idêntico, e o sensor que acusa um `grant` explícito também. O que mudou foi a **prosa**: ela passou a dizer o que a régua mede (o arquivo) e o que ela não mede (o banco), com o probe citado. É a correção certa — a régua não podia medir o banco, e a afirmação anterior era `AD-012` dentro do guarda que existe contra ele |
| os três casos de `IDN-07` que migraram para o cartão foram descartados? | **não** — continuam lá, e ganharam **quatro** vizinhos que medem o percurso do PIX com `unmount` de verdade, incluindo três pares inversos (volta sem entrar · quem já estava logada · sessão carregando) |
| o controle da migration ainda morre depois dos comentários novos? | sim (M4 reinjetado, **morto**, 4 reprovações) |
| a nova régua do Deno trocou cobertura em vez de somar? | **não** — `vars.ts` e `layout.ts` morrem cada um por conta própria |

⚠️ **Uma cópia declarada, que registro sem cobrar**: `podePagarComPix.test.ts:155` reescreve a régua
da rota (`aRotaRecusa`) dentro do arquivo de teste, para comparar as duas perguntas lado a lado. É
uma segunda escrita da mesma regra, e o arquivo diz isso por extenso e explica por quê (a régua da
rota é um `if` de componente, não uma função). Se o `if` da página mudar, este bloco segue afirmando
a relação antiga — mas o mutante correspondente morre em `OrderPaymentPage.test.tsx:266` de qualquer
jeito, então não há caminho por onde a divergência passe verde. Fica como observação.

---

## W7 · As ACs, reclassificadas

| AC | Rodada 1 | Rodada 2 | Por quê |
| --- | --- | --- | --- |
| `PIX-P1-07` | ⚠️ por proxy | ✅ **provada** | três réguas novas (`usePixPayment.test.tsx:127-142`); M5 morre |
| `PIX-P3-03` | ⚠️ por proxy | ✅ **provada** | `podePagarComPix.test.ts:76-95`; M12 morre |
| `PIX-P2-03` | ⚠️ precisão (o timeout de 15s nunca exercido) | ✅ **provada, por composição** | achado desta rodada: o timeout **tem** régua, na casa do dono — `useCreatePayment.test.tsx:137-141` prova que o `AbortController` rejeita com `PAYMENT_TIMEOUT_MESSAGE` em `PAYMENT_TIMEOUT_MS + 50`, e `usePixPayment.test.tsx:201` prova que a rejeição vira `failed` com a mensagem que veio. A cadeia fecha em dois arquivos; a rodada 1 procurou num só |
| Borda `IDN-07` | ❌ sem gatilho no PIX | ✅ **provada** | `CheckoutPage.test.tsx:739,752,765,785` — o percurso com `unmount` real, mais três pares inversos; R10 e R13 morrem |
| Borda "entrar com código" | ❌ CTA morto | ✅ **provada** | W3 |
| `PIX-P1-04` | ⚠️ por proxy | ⚠️ **por proxy — declarado** | "sem criar um segundo pedido" segue verdadeiro por construção e sem asserção; histórico e outro aparelho não são medíveis em jsdom. Registrado em `R4.1` |

**Placar final: 21 das 22 ACs provadas · 1 por proxy declarada.** Todas as seis bordas da spec
cobertas.

---

## W8 · Sensor da rodada 2 — consolidado

**16 mutações nos arquivos reais · 13 mortas · 3 sobreviventes** (1 declarada, 2 de higiene sem
consequência hoje) · **0 mortes por compilação**.

A única mutação que nasceu inválida (R7, com `<AuthOverlay />` num arquivo que não o importa) foi
**descartada e refeita** como R7b, sintaticamente válida e dentro do mesmo arquivo — mutante que
morre por compilação prova o esbuild e mais nada (lição da `56`).

Arnês idêntico ao da rodada 1: **lança** quando o alvo não é encontrado, restaura, e confere
**sha256 de todos os alvos** ao fim de cada rodada. Ao final: **0** arquivos `.bak`, todos os alvos
byte-idênticos, `git status --porcelain` com as mesmas 57 entradas do início desta rodada.

---

## W9 · O que continua sem medida

1. **A prova em navegador** — nem a da rodada do autor foi reproduzida, nem o `<AuthOverlay />` novo
   foi visto abrir. Concordo com `R4.3`: é o único conserto desta rodada com consequência visual, e
   a gaveta/diálogo sobem sobre um casco branco **sem `StoreLayout` atrás**, que é layout que
   ninguém olhou ainda.
2. **`deno check`** sobre o grafo de `send-notification` — a régua derivada é estrutural e
   convincente, mas o Deno não rodou aqui.
3. **O banco** não foi remedido, e concordo com o motivo (`R4.5`): nenhum comando SQL mudou. Os
   probes de `V2` continuam valendo — inclusive `0170`/`0171` e os `0172`/`0173` concorrentes.
4. **`catalog-import`** — não tocado.
5. **A composição real overlay + store real + página**, em uma árvore só (item 1, por outro ângulo).

---

# Fecho — B1 e B2, os dois furos de uma linha da rodada 2

Fechados pelo orquestrador depois do PASS, por serem de custo de uma linha cada. **Nenhuma régua
foi afrouxada**: os dois consertos são discriminação que faltava, não asserção enfraquecida.

## B1 · a asserção do `reset` existia e não media nada

`checkoutStore.test.ts` já asseria `expect(s.orderIdentity).toBeNull()` depois do `reset` — e a
asserção era **verdadeira nos dois mundos**, porque o caso chamava `setOrder` com dois argumentos e
a identidade já valia `null` antes. Apagar a linha do `reset` que a limpa não reprovava nada.

O conserto é a **semente**, não a asserção: o caso passou a gravar `'usr-1'`. Mutação reinjetada no
arquivo real (`orderIdentity: null` removido de `reset`): **1 caso reprova**, restaurado byte a byte
(`cmp`).

## B2 · o recorte `!orderId` não tinha régua

Caso novo em `CheckoutPage.test.tsx`, dentro do bloco de `IDN-02 … IDN-06`. A janela é estreita e
real: `ensureRequestId()` cunha a chave de idempotência **antes** de `setOrder` gravar o `orderId`,
então existe um instante com chave e sem pedido. Um evento de auth ali dentro, sem o recorte,
chamaria `invalidateOrder()` — que zera a chave junto —, e a retentativa apresentaria uma chave NOVA
ao servidor, que criaria um **segundo pedido** (`PED-04`).

A identidade diverge de propósito no caso: sem pedido, `orderIdentity` é `null` e `user.id` não é —
é exatamente a comparação que dispararia a invalidação se o recorte não existisse.

Mutação reinjetada no arquivo real (`!orderId ||` removido da condição do efeito): **1 caso
reprova**, e é o caso novo. Restaurado byte a byte (`cmp`).

## M6 continua declarado, não consertado

A duração da batida de confirmação (`BATIDA_MS`) é **assumption** não confirmada da spec, não AC.
Cravar `toBe(1200)` escreveria no teste um número que ninguém mediu. Se vier a importar, ganha uma
AC primeiro e a régua junto — a distinção contra `PIX_SLOW_MS`, cujo 8000 tem origem declarada e por
isso ganhou régua relacional lida do dono, está certa.
