# QA Run Report — 2026-10-30 — aviso opcional nas ações do pedido (feature 88), reteste

- **Scope:** reteste em navegador dos 7 bugs do QA de `reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos.md`, consertados na seção "Conserto do QA" (`Q1`..`Q8`) de `.specs/features/88-aviso-opcional-nas-acoes-do-pedido/tasks.md`, os paper cuts do Q8 e uma passada de regressão dos fluxos centrais em 390 e 1440.
- **Cadence tier:** targeted (reteste)
- **Build:** árvore de trabalho sobre `358334d6` com a 88 e o conserto do QA (sem commit) · **Environment:** só local — painel `pnpm dev:backoffice` :8083, Supabase local (API 54441, Postgres 54442, migration `20261102120000` aplicada), `send-notification` servida por `supabase functions serve` com o desvio do `probes/02-motor.sh` (chave do Resend inválida, `RESEND_DEV_REDIRECT_TO` em `@exemplo.invalid`, `HTTPS_PROXY=http://127.0.0.1:9`). Chromium 1228 dirigido por Playwright (script, não MCP), admin do `seed.sql`; `*.supabase.co`, GA/GTM bloqueados **por host** e `/g/collect` por caminho (a primeira tentativa bloqueava por texto da URL e derrubava o módulo `src/features/google-analytics` do próprio painel — corrigido antes de medir).
- **Started:** 2026-10-30 · **Status:** closed

## Session Matrix & Results

| # | Bloco | Cenários | Status | Issue |
|---|---|---|---|---|
| R1 | Q1 — leitura de envios falhando (A-14) | PNL-aviso-leitura-de-envios-falha | Pass | BUG-20261030-leitura-de-envios-falha-em-silencio → verified; novo BUG-20261030-foco-cai-no-body-ao-reler-e-ao-dispensar (Low) |
| R2 | Q2 — lista carregando com rede lenta | PNL-carregar-esqueleto | Pass | BUG-20261030-lista-diz-nada-esperando-enquanto-carrega → verified |
| R3 | Q3 — foco no Chromium, caso a caso | PNL-aviso-teclado-e-leitor; PNL-aviso-fechar-sem-gravar | Pass | BUG-20261030-foco-cai-no-body-nas-acoes-do-pedido → verified (os casos dele); o cenário teclado-e-leitor segue fail pelo bug novo e pelo "Close" (re-found) |
| R4 | Q4 — avião que falha (A-15) | PNL-aviso-aviao-envia-depois | Pass | BUG-20261030-aviao-que-falha-apaga-a-escolha → verified |
| R5 | Q5 — resumo do lote | PNL-lote-avancar-com-progresso | Pass | BUG-20261030-resumo-do-lote-some-em-quatro-segundos → verified; o cenário segue fail pelo foco no "Dispensar" (bug novo) |
| R6 | Q6 — nome acessível dos botões do cartão | PNL-lote-cartao-do-celular | Pass | BUG-20261030-recebi-o-material-sem-o-pedido-no-nome → verified |
| R7 | Q7 — 390×844 a 200 % | PNL-aviso-fonte-grande-e-telas | Blocked (human decision) | BUG-20261030-pedido-rola-de-lado-com-fonte-200 → **reaberto** (`scrollWidth` 431, não 390) |
| R8 | Q8 — paper cuts (número do lote, um anúncio por desfecho) | PNL-lote-avancar-com-progresso; PNL-aviso-teclado-e-leitor | Pass | |
| R9 | Regressão 390 e 1440 | PNL-aviso-marcar-enviado-com-aviso; -desmarcar-e-gravar; -ja-enviado-nao-pergunta | Pass | |

Status legend: `Pending | Pass | Fixed | Skipped | Blocked (needs human verify) | Blocked (human decision)`. Nenhum conserto nesta rodada (pedido: só reteste). R7 fica `Blocked (human decision)` porque o conserto que falta é do cabeçalho/grade da página (anterior à 88) e precisa de decisão de escopo.

## Personas

| Persona | Device / Network / Locale | Blocos |
|---|---|---|
| Adri despachando pedidos | 1440×900 mouse e 390×844 toque (`isMobile`), wifi local e 2 s por resposta do Supabase (R2), fonte 130/200 % por `html { font-size }`, pt-BR | todos |

## Dados e contenção do e-mail

- 24 pedidos `QA88R-…` (`id` `00000000-0000-4000-c288-…`, e-mails `@exemplo.invalid`): 01–10 Em Separação com rastreio (03 e 04 com `order_shipped` já `sent`), 11–13 Pago (cancelamento), 21–24 Em Separação + 25–26 Entregue (lote), 31–35 material a caminho (cartões).
- `store_settings.notifications` guardado antes; `order_cancelled` ligado durante a sessão e `order_shipped` desligado por um momento (avião com o evento desligado). Devolvido no fim e conferido por `cmp` (idêntico).
- Todo envio terminou `failed` (provedor inalcançável): **nenhum e-mail saiu**. Por isso o avião **com sucesso** não foi visto.
- Dublados por rota no navegador só as falhas forçadas: `GET order_notifications` 500 (A-14 e cartão), `PATCH orders` 500 (cancelamento), `GET orders` 500 (faixa da releitura) e o atraso de 2 s (R2). As respostas do motor são da função real.

## Session Debriefs

### R1. Q1 — leitura dos envios falhando (1440)

- QA88R-03 (Em Separação, "Pedido postado" `sent`), `GET order_notifications` 500: Histórico "Não consegui ler os e-mails deste pedido." + "Tentar de novo" (`role=alert`); nunca "Nada por aqui ainda.".
- "Enviado": recusado sem diálogo e **sem escrita** (zero PATCH/POST medidos), aviso "Não consegui conferir os e-mails já enviados. Nada foi alterado."; banco `separating`, 0 histórico; foco fica no "Enviado".
- Nota interna: POST `order_notes`, a nota aparece no Histórico ao lado do aviso de falha.
- Cancelamento (QA88R-04): a recusa aparece dentro do diálogo, zero escrita.
- "Tentar de novo" com a leitura de volta: o envio antigo reaparece — **e o foco cai no `<body>`** (com a leitura falhando de novo, fica no botão). Novo bug Low.

### R2. Q2 — lista com 2 s por resposta (390)

- 2,1 s → 7,8 s: "Contando o que espera por você…", cartões sem número (`aria-busy` no grupo), abas sem contagem. 8,5 s: "25 esperando alguma coisa sua", 18/6/1/0. "Nada esperando" e "0" nunca vistos.

### R3. Q3 — foco no Chromium

| Caso | `document.activeElement` |
| --- | --- |
| "Outro status" → Enviado → Esc | `BUTTON[role=combobox] "Outro status"` |
| "Outro status" → Enviado → Voltar | `BUTTON[role=combobox] "Outro status"` |
| botão "Enviado" → Esc | `BUTTON "Enviado"` |
| Enviado confirmado (marcada / desmarcada; 1440 e 390) | `BUTTON "Entregue"` |
| "já enviado" sem diálogo (1440 e 390) | `BUTTON "Entregue"` |
| avião que falha (1440 e 390) | `BUTTON "Reenviar"` |
| avião com o evento desligado | `BUTTON "Enviar agora o e-mail “Pedido postado” para a cliente"` |
| cancelamento com sucesso | `BUTTON "Cancelar pedido"` |
| cancelamento com PATCH 500 | `DIV[role=dialog]` (diálogo aberto, alert "O pedido não foi cancelado…"); Esc → `BUTTON "Cancelar pedido"` |
| cancelamento → Voltar | `BUTTON "Cancelar pedido"` |
| "Tentar de novo" da faixa da releitura | `H1 "Pedido #QA88R-07"` |
| cartão "Recebi o material" com sucesso (390) | `BUTTON "Iniciar separação — pedido #QA88R-31, QA88R Cliente 31"` |
| cartão com a leitura dos envios falhando (390) | `BUTTON "Recebi o material — pedido #QA88R-32, QA88R Cliente 32"` |
| resumo do lote ao aparecer | `DIV[role=status] "Resumo do lote"` |
| **"Tentar de novo" do Histórico (A-14), com sucesso** | **`BODY`** (novo) |
| **"Dispensar o resumo do lote"** | **`BODY`** (novo) |

Escrita nenhuma com o diálogo fechado sem confirmar (QA88R-05: `separating`, 0 histórico).

### R4. Q4 — avião que falha (1440 e 390)

- Linha "não enviado" → avião → "Enviando…" → aviso "O e-mail “Pedido postado” não saiu. Tente de novo."; a linha: "Falha ao enviar o aviso: Pedido postado (E-mail) · **A tentativa de envio falhou** · Detalhe técnico · Reenviar". O `<details>` nasce fechado e guarda o erro cru do provedor. Banco `failed`, attempts 2.

### R5/R8. Q5 e Q8 — lote (1440)

- 6 selecionados (4 Em Separação + 2 Entregue): título "Avançar 4 pedidos", botão "Avançar 4 pedidos" (o mesmo número), "4 mudam · 2 ficam como estão (já no fim do caminho)".
- Resumo persistente na lista: "4 avançaram · 2 ficaram como estavam (já no fim do caminho) · sem e-mail às clientes — anotado no histórico de 4 pedidos", foco nele ao aparecer, igual 20 s depois, "Dispensar" o tira (foco → `BODY`, novo bug).
- Um anúncio por desfecho (regiões vivas lidas a cada 150 ms): no gesto do pedido, a região `sr-only` só diz o gerúndio ("Marcando como enviado…", "Enviando…", "Cancelando…") e o desfecho sai uma vez, pela região do sonner; a falha do cancelamento sai pelo `role=alert` do diálogo; o desfecho do lote sai só pelo `status` "Resumo do lote" (nenhum toast). O progresso do lote ainda tem duas falas ("Avançando 4 pedidos…" na `sr-only` e "Avançando 1 de 4… Não feche a página" no `status`) — paper cut, não desfecho.

### R6. Q6 — cartões (390)

- Os 24 botões da Fila de material: "Recebi o material — pedido #<n>, <cliente>"; 0 sem o pedido. Texto visível inalterado.

### R7. Q7 — 390×844 a 200 %

| Página | 130 % | 200 % |
| --- | --- | --- |
| pedido (QA88R-01/02/03) | 390 | **431** |
| lista `/admin/pedidos` | 390 | **478** |
| Fila de material | 390 | **478** |

- Os filtros do Histórico embrulham (era 589). O que resta passa da tela: os cartões da página do pedido (largura 373 a partir de x=48) e o botão "Folha de separação" (`whitespace-nowrap`, 363 px); na lista, "Exportar N do filtro" (370) e "Folha de separação" (361). No print o valor do item sai cortado. Bug reaberto.

### R9. Regressão (390 e 1440)

- Caixa marcada (QA88R-09 em 390, -01 em 1440): diálogo cabe (390×416 em 390, `scrollWidth` 390), PATCH `{"status":"shipped"}` + `trigger` sem `customer`; "Status: Enviado — o e-mail não saiu — o pedido foi alterado"; banco `order_shipped:failed`.
- Desmarcada (QA88R-10 em 390, -02 em 1440): `trigger` com `customer:false`; "sem e-mail à cliente (anotado no histórico)"; linha `skipped` com avião 44×44.
- Já enviado (QA88R-04 em 390, -03 em 1440): sem diálogo; "“Pedido postado” já tinha sido enviado, não sai de novo"; linha continua `sent`.

## Paper Cuts

| Persona | Where | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Equipe com leitor | progresso do lote | "Avançando 4 pedidos…" e "Avançando 1 de 4…" em duas regiões | dull | watching |
| Adri despachando pedidos | página do pedido a 390/200 % | o cabeçalho fixo "Admin" sobrepõe o título do cartão ao rolar | dull | watching (anotado junto do bug reaberto) |
| Adri despachando pedidos | diálogos | "Close" em inglês (re-found `BUG-20261026-fechar-do-modal-em-ingles`) | dull | fora do escopo da 88 |

## Runtime Errors Observed

- Só as respostas forçadas. Nenhum `pageerror` do painel (os que apareceram na primeira medição a 200 % eram do script de fonte da própria prova, corrigido).

## Decisions for a Human

1. **`BUG-20261030-pedido-rola-de-lado-com-fonte-200` (reaberto):** o resto do estouro vem do cabeçalho da página (botões `whitespace-nowrap`: "Folha de separação", "Exportar N do filtro") e da coluna que toma o min-content deles. Opções: (a) deixar os botões do cabeçalho quebrarem linha (`whitespace-normal` nas ações do `PageHeader`) e a coluna da página com `minmax(0, …)`; (b) aceitar o estouro só a 200 % e fechar o bug; (c) tratar no conserto geral de fonte grande do painel. **Recomendação: (a)** — é o mesmo padrão da regra de mobile do `CLAUDE.md`, e cobre a lista junto.
2. **A-14 e A-15** seguem `n — confirmar` na spec: o comportamento observado é o que as decisões descrevem.

## Human Verifications Needed

- Envio real chegando (conta de teste do Resend): o avião com sucesso e o foco depois dele.
- Leitor de tela real (TalkBack/VoiceOver) ouvindo as regiões vivas; aqui foi lido o DOM.
- Fonte do sistema de verdade no celular (aqui, `font-size` do `html`).

## Não provado

- Avião com **sucesso** (todo envio falhou de propósito, pelo desvio).
- O "Outro status" → Esc em 390 com toque (medido em 1440 com teclado, que é o caso do bug).
- App do ateliê lendo a linha `skipped` (canário), como no QA original.
- `prefers-reduced-motion`.

## Final Status

**Pronto com ressalvas.** Dos 7 bugs, **6 verificados** em navegador (A-14, lista contando, foco nos casos do bug, A-15, resumo do lote, nome do cartão) e **1 reaberto** (página do pedido ainda rola de lado a 390/200 %: 431; a lista também, 478 — causa anterior à 88). **Um bug novo**: o foco cai no `<body>` depois do "Tentar de novo" do Histórico e do "Dispensar" do resumo (dois botões nascidos no conserto). Por impacto: Friction 2 abertos (1 Low reaberto, 1 Low novo), Cosmetic/Friction 1 re-found (Close). Nenhum Blocks-Completion, Data-Loss ou Trust-Damage aberto. Regressão dos fluxos centrais limpa em 390 e 1440.

**Exit gate:** `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` → **Test Files 257 passed (257) · Tests 4737 passed (4737)**, exit 0 (2026-10-30, fora de pipe). Outras suítes não rodadas (nada mudou fora do painel nesta rodada).

**Limpeza:** os 24 pedidos `QA88R-…` e seus itens, histórico, notas e `order_notifications` apagados (contagem 0 nas cinco tabelas); `store_settings.notifications` devolvido byte a byte (`cmp` idêntico); dev server :8083 e `functions serve` encerrados (edge runtime do Supabase local parado, como estava). Evidência em `evidence/2026-10-30-aviso-opcional-reteste/` (gitignored).

## Adendo — conserto do reteste e segundo reteste (2026-10-30)

A decisão da rolagem seguiu a recomendação **(a)**. Os dois bugs abertos foram consertados (seção
"Conserto do reteste" do `tasks.md` da `88`) com teste vermelho antes e 10 mutantes mortos por asserção, e
retestados no navegador. **Mesmo ambiente**: só local (painel `pnpm dev:backoffice` :8083, Supabase local,
`send-notification` servida com o desvio do `probes/02-motor.sh`), Chromium 1228 por script, `*.supabase.co`
e GA/GTM bloqueados por host; 24 pedidos `QA88F-…` (`00000000-0000-4000-c28f-…`) criados e apagados.

| Bug | Resultado |
|---|---|
| BUG-20261030-pedido-rola-de-lado-com-fonte-200 | **verified** |
| BUG-20261030-foco-cai-no-body-ao-reler-e-ao-dispensar | **verified** |

### Rolagem (`document.documentElement.scrollWidth`)

| Página | 390 · 100 % | 390 · 130 % | 390 · 200 % | 1440 |
|---|---|---|---|---|
| pedido QA88F-01/02/03 | 390 | 390 | **390** (era 431) | 1440 |
| lista `/admin/pedidos` | 390 | 390 | **390** (era 478) | 1440 |
| Fila de material | 390 | 390 | **390** (era 478) | 1440 |

- O que estourava, medido folha por folha antes do conserto: a coluna da página (trilha implícita `auto`,
  373 px), os botões `nowrap` do cabeçalho (363–370), o preço `w-[110px]` (o valor mede 134), os números da
  cliente em `grid-cols-2` fixo e o botão do cartão da lista `nowrap`.
- Depois: os botões do cabeçalho a 200 % ocupam a coluna (294 × 88); o preço "R$ 100,00" inteiro
  (`scrollWidth` 134 = `clientWidth` 134) e dentro do cartão, com quantidade e preço numa linha abaixo do
  nome; o botão do cartão quebra o texto ao lado do WhatsApp.
- **1440 sem mudança medida**: botões do cabeçalho 183/136/135 × 36, linha do item numa linha (74 px),
  números da cliente em duas colunas de 144. **Em 390 a 100 %** a quantidade e o preço do item passaram
  para baixo do nome (antes o nome ficava com ~50 px) — mudança aceita, só abaixo de `md`.

### Foco (`document.activeElement`, teclado)

| Caso | 1440 | 390 |
|---|---|---|
| "Tentar de novo" do Histórico, a leitura falha de novo | `BUTTON "Tentar de novo"` | `BUTTON "Tentar de novo"` |
| "Tentar de novo" do Histórico, a leitura volta | **`H2 "Histórico"`** (era `BODY`) | **`H2 "Histórico"`** |
| resumo do lote ao aparecer | `DIV[role=status] "Resumo do lote"` | — |
| "Dispensar o resumo do lote" | **`H1 "Pedidos"`** (era `BODY`) | — |

### Regressão (390 e 1440)

- Caixa marcada (QA88F-09 em 390, -01 em 1440): diálogo cabe (390 × 416, `scrollWidth` 390), PATCH
  `{"status":"shipped"}` + `trigger` sem `customer`, "o e-mail não saiu — o pedido foi alterado", banco
  `order_shipped:failed`, foco `BUTTON "Entregue"`.
- Desmarcada (QA88F-10 / -02): `trigger` com `customer:false`, "sem e-mail à cliente (anotado no
  histórico)", linha `skipped` com avião 44 × 44; avião → "A tentativa de envio falhou" + "Reenviar", foco
  `BUTTON "Reenviar"`.
- Já enviado (QA88F-04 / -03): sem diálogo, "já tinha sido enviado, não sai de novo", linha segue `sent`.
- Lote de 6 (1440): título e botão "Avançar 4 pedidos", resumo "4 avançaram · 2 ficaram como estavam (já
  no fim do caminho) · nenhum e-mail saiu"; banco 4 `shipped` + 2 `delivered`, 4 `failed`.
- Cartão da Fila a 390/200 % (QA88F-31): botão 124 × 152 com o texto quebrado, WhatsApp 88 × 88 ao lado,
  `scrollWidth` 390; registrar → "material recebido — o e-mail não saiu — o pedido foi alterado", foco
  `BUTTON "Iniciar separação — pedido #QA88F-31, …"`, banco `material_recebido`.
- Nenhum `pageerror`.

**Evidência:** `evidence/2026-10-30-aviso-opcional-reteste-2/` (gitignored) — `p-pedido-*`, `p-itens-*`, `p-lista-*`, `p-fila-*` (390 a 100/130/200
e 1440), `f-historico-releu-1440.png`, `f-historico-releu-390.png`, `f-resumo-lote-1440.png`,
`f-cartao-390-200.png`, `g-*` (regressão).

**Gates:** backoffice 4737 → **4746**/257, store **6275**/336, exit 0 os dois (um por vez,
`--testTimeout=20000`, fora de pipe); `tsc` backoffice 0; eslint backoffice 23/5; build verde.

**Limpeza:** os 24 pedidos `QA88F-…` e itens, histórico, notas e `order_notifications` apagados (0 nas
cinco tabelas); `store_settings.notifications` idêntico ao de antes (`cmp`); dev server :8083 e
`functions serve` encerrados.

**Final Status (adendo):** os 8 bugs da `88` estão `verified`. Segue aberto só o re-found
`BUG-20261026-fechar-do-modal-em-ingles` (fora da `88`). Continuam pedindo verificação humana: envio real
(avião com sucesso), leitor de tela real e a fonte do sistema num celular real. `A-14`/`A-15` a confirmar.
