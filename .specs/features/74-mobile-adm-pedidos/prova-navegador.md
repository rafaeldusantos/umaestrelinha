# 74 — prova em navegador (T31)

Medida em 2026-10-24 (madrugada de Brasília, ~01h de 24/10), Chromium dirigido pelo Playwright MCP,
contra o **build servido** (`pnpm --filter @estrelinha/mobile-adm build` + `vite preview --port 4374
--strictPort`, porta livre — 8082–8084 são de outras sessões), apontando para o **Supabase local**
(`VITE_SUPABASE_URL=http://127.0.0.1:54441`, o `.env` do app). Nada interceptado: `atelie_clock`,
`order_list`, as tabelas do detalhe, o Realtime e o `user_roles` são os de verdade. Conta: a admin do
`seed.sql` (`admin@umaestrelinha.dev`), sem tocar no papel dela.

Bundle servido: `assets/index-BNsPq-d3.js`, conferido pelo `<script>` carregado **e** contra o
`dist/` (o único `index-*.js`, que contém `atelie_clock`). O service worker e os `caches` foram
desregistrados/limpos antes de medir (lição da `73`: o SW serve o bundle velho depois de um rebuild).

Capturas em `prova/`: `390-lista.png`, `390-lista-fonte-200.png`, `390-detalhe.png` (página inteira).
**Os nomes nelas são fixturas** (`Cliente Prova N`, `@exemplo.invalid`), apagadas no fim.

## Fixturas e restauração do banco

`prova/fixturas.sql` (60 pedidos `P74-01`..`P74-60`, id `00000000-0000-4000-d074-…`, `order_number`
**explícito** — a sequência não andou; estados variados: pago, em separação, enviado com e sem
rastreio, entregue, Pix pendente, aguardando material, retirada; `P74-01` com nome longo, item com
gravação, histórico e um e-mail que FALHOU; `P74-02` com total de R$ 99.999,90) e `prova/limpa.sql`.

| | antes | durante | depois |
| --- | --- | --- | --- |
| `orders` | 54 | 114 | **54** |
| `order_items` | 82 | 83 | **82** |
| `customers` · `auth.users` · `user_roles` | 9 · 9 · 3 | inalterados | **9 · 9 · 3** |
| `orders_number_seq` · `orders_order_number_seq` | 183/true · 1/false | inalteradas | **183/true · 1/false** |

## Os números contra o banco, no mesmo instante

Banco contado com os tradutores de `core` (`toSqlPredicate(bloco)` e `needsActionSqlPredicate()`),
nunca uma cópia à mão:

| Bloco da Início | Número no bloco | Toque ⇒ endereço | Contagem da lista | Linhas carregadas | Banco |
| --- | --- | --- | --- | --- | --- |
| Aguardando material | 33 | `/pedidos?bloco=aguardando` | "33 pedidos" | 25 + 8 na 2ª página | 33 |
| Pago, a separar | 15 | `/pedidos?bloco=a-separar` | "15 pedidos" | 15 | 15 |
| Enviado sem rastreio | 6 | `/pedidos?bloco=sem-rastreio` | "6 pedidos" | 6 | 6 |
| Pix aguardando | 10 | `/pedidos?bloco=pix-aguardando` | "10 pedidos" | 10 | 10 |
| **Selo da aba** ("Pedidos, 54 precisam de você") | 54 | `/pedidos` (padrão "Precisa de ação", chip pressionado) | "54 pedidos precisam de você, do mais antigo para o mais novo." | 54 | precisa **54** (a união; o Pix fora) |
| "Tudo" | — | `/pedidos?visao=tudo` | "114 pedidos" | 114 | 114 |

## A rolagem paginada

`/pedidos?visao=tudo` rolado até o fim de verdade (`scrollTo` ao fundo, a sentinela real com
`IntersectionObserver`): **114 linhas no DOM, 114 ids distintos**, em cinco páginas, nenhum
`aria-busy` no fim, `documentElement.scrollWidth` 390 o tempo todo.

## O percurso e o voltar

| Percurso | Resultado |
| --- | --- |
| Início → bloco "Aguardando material" → lista → rolar até a 2ª página (33 linhas, `scrollY` 3676) → toque na 29ª → detalhe | `/pedidos/…-020`, `h1` "Pedido #P74-20", título "Pedido #P74-20 · Ateliê", `scrollY` 0, foco no `h1` |
| "Voltar" do detalhe | `/pedidos?bloco=aguardando`, **`scrollY` 3676 e 33 linhas** — mesmo recorte e mesma posição |
| Linha → detalhe → voltar do histórico (`goBack`) | `/pedidos?bloco=aguardando` |
| Início → "Últimos pedidos" (link "Pedido #P74-01, …") → detalhe → "Voltar" | `/pedidos/…-001` → `/` |

## Realtime e selo

Com o detalhe de `P74-01` aberto, `update orders set status='separating'` no banco: o selo do pedido
foi a "Em produção" e o selo da aba de 54 a **53** em < 1,5 s, sem recarregar. `realtime.subscription`
com **1** linha (o canal do detalhe). O selo sumindo em 0 **não** foi medido em navegador: zerar
"Precisa de ação" exigiria mexer em pedidos do seed, que não são fixturas; está provado pela árvore
real em `seloDaAba.test.tsx`.

## Layout — 360 × 800, 390 × 844, 412 × 915 (fonte 100/130/200 %) e 1440 × 900

30 medições (a lista "Tudo", o detalhe de `P74-02` com R$ 99.999,90 e o de `P74-01` com nome longo,
item, gravação e histórico; a fonte trocada em `html { font-size }`):

| Medida | Resultado nas 30 |
| --- | --- |
| `documentElement.scrollWidth == innerWidth` | sim, em todas |
| Folhas de texto de `main` com retângulos sobrepostos | **zero** pares |
| Filho de linha passando da borda do card | nenhum |
| Texto cortado (`scrollWidth > clientWidth` com `overflow` não visível) | só o rótulo `sr-only` "Buscar pedido" (proposital) |
| Alvos (`main a/button/input`, abas, "Sua conta") abaixo de 44 px | **nenhum** — "Voltar" 79 × 44, "WhatsApp" 75 × 44 (`wa.me/5551999990001`, `_blank`), chips e linhas ≥ 44, abas 98 × 64 |
| Faixa de chips rolada ao fim (390) | `scrollLeft` 312 de 702/390 **dentro de si**, `window.scrollX` 0, `scrollWidth` do documento 390 |

## A busca

"Cliente Prova 2" ⇒ "11 pedidos" (P74-02 e P74-20..29), o endereço continua `?visao=tudo` (o termo
não vai para a URL); "zzznada" ⇒ "Nada por aqui." + "Nenhum pedido com “zzznada”.", recorte intacto.

## `prefers-reduced-motion`

Com a leitura de `order_list` segurada 2,5 s para o esqueleto aparecer: `reduce` ⇒ **0 de 4** nós
do esqueleto com animação; `no-preference` ⇒ 4 de 4. Os chips: `transition-property` `none` com
`reduce`, `color, background-color, …` sem.

## Zero hit para fora

`*.supabase.co`, `google-analytics`, `googletagmanager` e `/g/collect` bloqueados por rota no
contexto; ouvindo `request` em Início → lista → detalhe, os hosts foram **só** `localhost:4374` e
`127.0.0.1:54441`.

## Defeitos achados

Nenhum defeito da `74`. Duas observações de texto, **ambas herdadas e iguais no painel** (a `74` as
subiu para `core` byte a byte, `MAP-48`), registradas para decisão da dona, não consertadas:

| # | Observação | Onde mora |
| --- | --- | --- |
| O1 | A idade da espera do material sai "há 0 dias" num pedido de horas | `queueAgeLabel` (`core/material/aging.ts`, `73`), o mesmo rótulo do bloco da Início e do painel |
| O2 | O histórico diz "Falha ao enviar aviso de pagamento aprovado **enviado** (E-mail)" — o nome do evento no passado dentro de "Falha ao enviar" | `buildHistory` (`core/orders/history.ts`, frase do painel no `775e407e`), sobre `NOTIFICATION_EVENT_LABELS` |

## O que NÃO foi medido

- O app instalado (standalone) num Android real — fica com o usuário, como na `72`/`73`.
- O selo sumindo em 0 (acima) e a recusa por papel em navegador (provada pelo client real na T29 e
  pelo probe `03-cliente-sem-papel`).
- Rede lenta (3G) além do esqueleto segurado.
