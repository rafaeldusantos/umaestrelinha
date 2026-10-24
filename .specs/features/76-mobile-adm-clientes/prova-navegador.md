# 76 — prova em navegador (T32)

Medida em **2026-10-24**, Chromium (`chrome-headless-shell` do Playwright 1.64.1, dirigido por scripts
Node — `prova/lib.cjs`, `medir.cjs`, `matriz.cjs`, `percurso.cjs`), contra o **build servido**
(`pnpm --filter @estrelinha/mobile-adm build` + `vite preview --port 4376 --strictPort`, porta livre —
8082–8084 são de outras sessões), apontando para o **Supabase local** (`127.0.0.1:54441`, o `.env` do app,
gitignored e apagado no fim). Nada interceptado do banco: `atelie_clock`, `customer_list`, `order_list`,
`customer_directory` e `order_items` são os de verdade. `*.supabase.co` e `**/g/collect*` bloqueados **por
caminho/host** (nunca por domínio de GA); o service worker foi bloqueado (`serviceWorkers: 'block'`) para
nenhuma resposta velha ser servida. **Bundle servido conferido**: o único `index-DjYbbA3P.js` do `dist/`
contém "Não encontrei esta cliente". Conta: a admin do `seed.sql`.

**A varredura de privacidade e as capturas usam fixturas.** O banco local tem clientes que parecem
reais; por isso as capturas guardadas em `prova/` são só de **fichas de fixtura** (`@exemplo.invalid`) — as
da lista, que mostravam e-mails de verdade, foram **apagadas**.

## Fixturas e restauração do banco

`prova/fixturas.sql` (ids `…-d076-…`): uma convidada com nome de 70 caracteres e e-mail de 100, **22 pedidos**
(2 em aberto) — "Ver mais pedidos" e a quebra de linha; um cadastro sem nome; o par `P76VROSA_RJ` /
`P76VROSAXRJ`; um cadastro com telefone. `probes/03-fixturas.sql` (a conta sem papel `probe76-cliente`).
`prova/limpa.sql` + `probes/03-limpa.sql` + `probes/01-limpa.sql` apagam tudo.

| | antes | depois |
| --- | --- | --- |
| `orders` · `order_items` · `customers` | 54 · 82 · 9 | **54 · 82 · 9** |
| `customer_list` · `auth.users` | 48 · 9 | **48 · 9** |
| `orders_number_seq` | 183/true | **183/true** |

(A primeira execução de `prova/limpa.sql` falhou por ordem de `delete` — o cadastro da conta sem papel
antes do pedido dela. Conserto: a ordem no arquivo; a contagem acima é a final, conferida depois de uma
semeadura e limpeza novas.)

## 1 — o percurso (390 × 844, teclado virtual emulado, sessão da admin)

Início → Pedidos (busca por nome acha a convidada) → pedido → **"Ver cliente"** → a ficha dela (o `id` é o
da view: `md5(lower(email))`) → um pedido dela → **Voltar** (à ficha) → **Voltar** (ao pedido de onde veio):
todas as passagens verdes. Lista: o chip troca o endereço **só com o recorte** (`?recorte=em-aberto`); o termo
de busca **nunca** vai ao endereço; "rosa" acha as mesmas pessoas que o `psql` (as duas de prova, mais quem
já tinha Rosa no nome); busca por telefone com máscara `(51) 98877-6655` acha a pessoa pelos dígitos.

## 2 — o voltar traz o mesmo recorte, busca e posição

Lista de 54 linhas rolada até `scrollY = 1500`, uma linha aberta, **Voltar**: `scrollY` 1500 → 1500, 54 → 54
linhas. Recorte "Compraram mais de uma vez" → busca "rosa" → "Todas" → abre uma linha → Voltar: o campo volta
com `rosa`, o chip é `todas`, as mesmas linhas.

## 3 — layout (360, 390, 412, 1440 × fonte 100/130/200 %: **60 medidas, 0 falhas**)

`html { font-size }` trocado; telas: lista, lista "Com pedido em aberto", ficha da convidada longa (com
"Ver mais pedidos" tocado: **20 → 22 linhas, o botão some**), ficha sem nome, ficha com telefone. Cada
medida confere, **em todas as 60**: `scrollWidth ≤ innerWidth` (sem rolagem horizontal do corpo, também ao
fim da lista rolada pela sentinela real: 54 linhas, 54 `id` distintos); nenhum texto cortado (`text-overflow`,
`line-clamp`, `overflow` oculto — `sr-only` fora); nenhuma sobreposição entre os textos de uma linha, de um
pedido ou de um número, nem texto fora da própria caixa; alvos **≥ 44 px** (linha do cliente 64 a 100 %, chips
44, WhatsApp 44, "Ver mais pedidos", pedido da cliente 94, busca 48 e abas); a faixa de chips **rola dentro de
si** (`scrollWidth` 511 em `clientWidth` 390, `overflow-x: auto`) com a afordância visível, e a 1440 cabe e a
afordância some; a 200 % os três números **empilham** em 360, 390 e 412 (a 100 % ficam dois a dois; a 1440,
os três lado a lado). Capturas de fixtura: `prova/360-ficha-longa-fonte-200.png` e as `390-ficha-*`.

## 4 — teclado emulado e voltar

`visualViewport` falso instalado antes da carga (como na `75`; **SPEC_DEVIATION de método**, o Chromium de mesa
não reduz o `visualViewport` sem mudar o layout). Teclado de 338 px: o último resultado termina em 305 (visível
até 506), o campo em 128–176; **Enter** tira o foco; `history.back()` com o campo focado sai da aba e a tela
seguinte desenha (`h1` presente).

## 5 — menos movimento

`reducedMotion: reduce` × `no-preference`: os **mesmos estados** (`h1`, contagem, linhas, chip pressionado); a
única diferença é a transição do chip (`transition-property: none` × cores).

## 6 — privacidade

Em **cada passo** (Início, Pedidos com busca, detalhe, ficha pelo "Ver cliente", ficha pela linha, lista com
busca por nome e por telefone): `location.href`, `history.state`, `document.title`, `localStorage` (só o
`sb-127-auth-token` do supabase-js, a sessão **da admin**), `sessionStorage` (vazio), IndexedDB (vazio):
**nenhum nome, e-mail ou telefone de cliente**. Títulos vistos: `Início · Ateliê`, `Pedidos · Ateliê`,
`Cliente · Ateliê`, `Clientes · Ateliê` — e o do pedido, `Pedido #P76-L02 · Ateliê`, que é o **número do
pedido** (desde a `74`), não dado de pessoa (o prefixo `P76` é o da fixtura). Console: **1 mensagem**, sem dado;
nenhum `pageerror`. Hosts: só `localhost:4376` e `127.0.0.1:54441`; nada para `*.supabase.co` nem GA.

## 7 — a conta sem papel

`probe76-cliente@exemplo.invalid` (com um pedido próprio): o login a recusa (`Esta conta não tem acesso ao
painel.`); abrindo `/clientes` direto, a cada 250 ms por 4 s **nenhum texto dela** e o app a leva ao `/login`.

## O que NÃO foi provado

**Android real** (TQ10, pendente do usuário): o teclado de verdade, o gesto de voltar com o campo focado, a
área segura e a fonte do aparelho; o arrasto do dedo na faixa de chips. Tudo acima foi emulado em Chromium de
mesa. Nenhum defeito achado nesta rodada; nenhuma entrada de conserto.
