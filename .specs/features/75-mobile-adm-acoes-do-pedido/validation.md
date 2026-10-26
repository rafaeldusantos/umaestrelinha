# 75 — Validação independente

## Rodada 1 — 2026-10-24 — **FAIL** (lacunas de cobertura; nenhum defeito de produto)

> Verificador ≠ autor. Evidência ou zero: toda afirmação abaixo vem de comando rodado nesta rodada, no
> worktree `store-75-mobile-adm-acoes-do-pedido` (branch `feat/75-mobile-adm-acoes-do-pedido`, sobre
> `2a285bab`), com a árvore sem commit da `75`. Nenhum arquivo de produto ou de teste foi editado pelo
> verificador: todo mutante foi reinjetado no arquivo real e restaurado com SHA-256 conferido (o arnês
> lança se o alvo não aparece exatamente uma vez, e aborta se a restauração diverge). `git diff --stat`
> antes e depois da rodada: **idêntico** (37 arquivos, +1407/−222).

### 1. Suítes, tipos e lint (um workspace por vez, `--testTimeout=20000` sem o `--`, exit fora de pipe)

| Workspace | Arquivos | Testes | Exit | Contra a baseline (`baseline.md`) |
| --- | --- | --- | --- | --- |
| core | 166 | 4206 | 0 | +190/+8 |
| mobile-adm | 76 | 1060 | 0 | +249/+15 |
| backoffice | 212 | 3696 | 0 | +25/+2 |
| store | 320 | 5885 | 0 | +33/+1 |
| functions | 21 | 957 | 0 | = |
| catalog-import | 23 | 512 | 0 | = |
| **Total** | **818** | **16316** | | **+497/+26**, nenhuma queda |

- `tsc --noEmit`: store app 0, store server 0, backoffice 0, mobile-adm app 0, mobile-adm node 0,
  catalog-import 0; `packages/core` **11**, arquivo por arquivo os herdados (`carousel` 5,
  `pickHomeBanners` 1, `pickHomeCollections` 1, `sitemap/urls` 2, `supabase/client.ts` 2).
- `eslint .`: store **2/2**, backoffice **23/5**, mobile-adm **0/0** — iguais à baseline.
- Painel "sem asserção tocada" (`MAA-27`): o único arquivo de teste pré-existente do painel alterado é
  `useAdminOrders.test.ts`, e o diff é **só o dublê** (`update → eq → select`), como a AC autoriza. Os
  outros dois arquivos de teste do painel são novos (`lembreteNoCore`, `useAdminOrders.delega`).

### 2. Probe contra o banco local (re-rodado pelo verificador)

`probes/01-paridade.sh` com a `send-notification` servida de forma aditiva
(`supabase functions serve send-notification --env-file <scratchpad>`, chave do Resend inválida de
propósito — nenhum e-mail saiu), conferida viva (`401` sem auth) e **derrubada no fim** (o gateway
voltou ao `503` de antes; nenhum `stop`/`start`): **exit 0, 71 `ok —`, "TUDO OK"**, banco restaurado
(54/9 → 54/9). Cobre a paridade app × painel em colunas, histórico e eventos para as cinco ações, a
guarda de status, a normalização (A8, com a diferença esperada do painel) e a conta **sem papel com
pedido próprio** (`MAA-23`: `nenhuma-linha` nos dois pedidos, `sem-papel` na RPC, nada mudou,
`atelie_clock` ⇒ `42501`).

### 3. Sensor de mutação — 82 mutantes nos arquivos reais

Classificação pela saída do vitest: **asserção** (algum teste falhou) × **compilação** (falha sem
teste falhando). **Nenhum mutante morreu por compilação.**

| Lote | Onde | Mutantes | Mortos por asserção | Sobreviventes |
| --- | --- | --- | --- | --- |
| M01–M12, M50, N16 | a regra (`core/orders/appAction.ts`: corte de cancelado, retirada, rastreio na retirada, `materialAntes`, guarda A25, frases de A10, `citaEmailSeEnviado`, `canChargeMaterial`, A11, `trackingEdit`, origem da folha) | 14 | 14 | 0 |
| M13–M24, M51, M53 | o dono da escrita (`core/order-actions`: guarda `expectedFrom`, zero linhas, histórico, `shipping_carrier` A9, `statusIn`, `not_admin`, material recusado antes do status, o pulo de `MAA-15`, aviso único, parcial, `materialMudou`, `sent === true`, `avisar`) | 14 | 14 | 0 |
| M25–M27, M54, N09, N14 | a porta (`gravarAcao`, `conferirPapel`, `useAcaoDoPedido`: zero linhas como pergunta, rede nunca é recusa, `sem-papel` lança, a recusa lançada vira `erroBruto`, parcial confere o papel, 200 sem `lido_em`) | 6 | 6 | 0 |
| M28–M32, N01, N21, N24 | trava, releitura das três chaves, `soltar` no `finally`, troca de conta, retentativa | 8 | 8 | 0 |
| M33–M40, M48, M49, N03, N04, N06–N08, N12, N13, N15, N17–N20, N22 | a tela (exclusividade, lembrete com `lido_em`/nova aba/`rel`, F5, `MAA-26`, recusa do código, normalização, recusa do cartão, `role="status"`, reserva, prazo do aviso, teclado, fechar no sucesso, parcial fecha, recusa por leitura, `push` do histórico, ponto do cartão, "Salvando…") | 23 | 23 | 0 |
| M41, M42, N10, N11 | painel (`toBe` do lembrete, texto byte a byte, A24 `nenhuma-linha` ⇒ erro, `not_admin`) | 4 | 4 | 0 |
| M43–M47, M52 | guardas (`pedidoGravadoSoPeloDono`, `escritaSoPelaPorta`/`leituraSoComPapel`, `regraDePedidoSoNoCore`, `movimentoDosPedidos`, `fraseDaAcaoSoNoCore`, a composição do cartão) | 6 | 5 | **1** (M45) |
| N02, N05, N23, N25–N28 | o "enquanto salva" da folha e as travas de tela | 7 | 0 | **7** |
| **Total** | | **82** | **74** | **8** |

(M01–M54 e N01–N28. Um alvo, N24, foi reescrito antes de rodar porque o primeiro não existia — a checagem de alvo (a mesma régua do arnês) o recusou antes de aplicar.)

### 4. Sobreviventes — leitura de cada um

**Relevantes (motivam o FAIL):**

- **N05 e N25 — a folha fecha com a gravação no ar, e nada acusa (`MAA-13`).** A AC diz "A folha SHALL
  fechar só depois do sucesso", e o cabeçalho de `FolhaDoRastreio.tsx` promete "enquanto salva, nada
  fecha". Trocar `if (!abrir && !acao.travado) fechar()` por `if (!abrir) fechar()` (o fundo e o
  Escape) e tirar o `if (!acao.travado)` de "Agora não" deixam a suíte do mobile-adm inteira verde. Não
  há caso de fechar a folha com a ação travada. Consequência real com o mutante: a Adri toca fora da
  folha enquanto o código está indo, a folha some antes da resposta, e um erro (`mudou`, falha) só
  aparece no rodapé/cartão. Sem confirmação falsa — o erro ainda é desenhado —, mas a letra da AC fica
  sem régua. **Conserto pedido**: um caso com a porta pendente que dispara Escape, clique no fundo e
  "Agora não" e cobra a folha ainda aberta (e "Salvando…"), mais o par depois de resolver.
- **M45 — o guarda `regraDePedidoSoNoCore` não acusa uma condição de status escrita no app, e o código
  e o design afirmam que acusa.** Acrescentar `&& pedido.status !== 'cancelled'` ao `temBotao` do
  `RodapeDaAcao` passa no guarda (e na suíte: o mutante é equivalente em comportamento, porque
  `appPrimaryAction` já corta o cancelado). `MAA-29` só exige que `MAP-49` "continue valendo" — e ele
  continua, no alcance que a `74` lhe deu (chaves de mapa/`case` e predicados de recorte por chamada).
  O problema é a afirmação: o design (§3.1, "Por que a guarda de origem mora aqui") e o cabeçalho de
  `packages/core/src/orders/appAction.ts` dizem que `regraDePedidoSoNoCore` "acusa no app qualquer
  condição sobre `status`", o que este mutante desmente. Comentário que afirma sensibilidade
  inexistente encerra a investigação (lição da `51`). **Hoje o app não tem nenhuma comparação de
  `status` de pedido** (conferido por busca: só `PromiseSettledResult.status` em `lerComPapel.ts`).
  **Conserto pedido**: ampliar a régua à comparação (`.status ===`/`!==` com literal do vocabulário de
  status/material, com sensor e o inverso do `PromiseSettledResult`) **ou** corrigir as duas afirmações
  para o alcance real.

**Não relevantes (equivalentes ou redundantes, declarados):**

- **N02** — o prazo do aviso chamando `limparAviso()` sem a chave: equivalente, porque o efeito depende
  de `[chave]` e a limpeza do efeito cancela o prazo velho antes de o novo aviso aparecer. A guarda por
  chave é cinto-e-suspensório.
- **N23, N26, N27, N28** — os `if (acao.travado) return` de "Informar/Alterar", do toque do rodapé, do
  toque do cartão e do `submit` da folha: redundantes com a trava em módulo (`travar(id)` síncrono), que
  é quem impede a segunda escrita — e ela tem régua (M28 e M31 mortos, 10 e 19 falhas). Nenhum dos
  quatro produz escrita dupla.

### 5. Conferência por requisito (resumo)

- `MAA-01..05`, `MAA-06..09`, `MAA-40`, `MAA-10..16`, `MAA-17..19`, `MAA-20..26`, `MAA-41`, `MAA-27..30`,
  `MAA-36..38`, `MAA-39`: implementados e com régua que morre por mutação (tabela acima), mais a
  paridade do probe.
- `MAA-13`: implementado; a metade "fecha só depois do sucesso" frente a fundo/Escape/"Agora não"
  **sem régua** (N05/N25).
- `MAA-29`: o guarda vale no alcance da `74`; a afirmação de alcance maior no design e no código é
  falsa (M45).
- `MAA-31..35`: provas de forma na suíte (mortas por mutação) e medida em navegador no
  `prova-navegador.md` do autor (não re-rodada nesta rodada).
- Desvios declarados pelo autor e conferidos no código, sem objeção do verificador: o F5 por
  `navigate(-1)` em vez de `replace` (B01, A23 é **n — confirmar**), a frase de e-mail de "Iniciar
  separação" com material (A11 não a escreve), a parcial do rastreio fechando a folha, a geração das
  ações no lugar do `user.id`, a chave da folha com a origem, a conferência sem rede de um `parcial`
  devolvendo o próprio `parcial`.

### 6. Veredito

**FAIL** — três sobreviventes relevantes em duas lacunas (N05+N25 em `MAA-13`; M45 no alcance
afirmado de `MAP-49`), nenhum defeito de produto, nenhuma regressão de suíte, tipos ou lint, e o probe
de paridade verde contra o banco local.

---

## Rodada 2 — 2026-10-24 — **PASS**

> Verificador ≠ autor. Mesmo worktree e branch, sobre o conserto V01/V02 (`tasks.md`, "Conserto da
> rodada 1 do Verificador"). Nenhum arquivo de produto ou de teste foi editado pelo verificador: os 19
> mutantes foram aplicados no arquivo real por um arnês que exige o alvo exatamente uma vez, roda a
> suíte INTEIRA do workspace e restaura conferindo SHA-256 (abortaria se divergisse). `git diff --stat`
> antes e depois da rodada: **idêntico** (37 arquivos, +1471/−225).

### 1. Suítes, tipos e lint (um workspace por vez, `--testTimeout=20000` sem o `--`, exit fora de pipe)

| Workspace | Arquivos | Testes | Exit | Contra a rodada 1 |
| --- | --- | --- | --- | --- |
| core | 166 | 4206 | 0 | = |
| mobile-adm | 76 | 1080 | 0 | +20 (V01 +5, V02 +15) |
| backoffice | 212 | 3696 | 0 | = |
| store | 320 | 5885 | 0 | = |

functions e catalog-import não foram tocados pelo conserto e não foram remedidos (rodada 1: 957/21 e
512/23). `tsc --noEmit`: store app 0, store server 0, backoffice 0, mobile-adm app 0, mobile-adm node 0;
`packages/core` **11**, os herdados arquivo por arquivo (`carousel` 5, `pickHomeBanners` 1,
`pickHomeCollections` 1, `sitemap/urls` 2, `supabase/client.ts` 2). `eslint .`: mobile-adm **0/0**,
store **2/2**, backoffice **23/5** — iguais à baseline.

### 2. Sensor de mutação — 19 mutantes nos arquivos reais

Classificação pela saída do vitest: **asserção** (teste falhou) × **compilação** (falha sem teste
falhando). **Nenhum morreu por compilação.** Mutante de `core` que sobrevive à suíte de `core` é
rodado também na do mobile-adm (o consumidor).

| Id | Onde | Mutação | Resultado |
| --- | --- | --- | --- |
| R01 (= N05) | `FolhaDoRastreio.tsx` | `onOpenChange`: `if (!abrir) fechar()` (sem a trava) | morto, 2 falhas (Escape, fundo) |
| R02 (= N25) | `FolhaDoRastreio.tsx` | "Agora não" fecha sem a trava | morto, 1 falha |
| R03 (= M45) | `RodapeDaAcao.tsx` | `temBotao … && pedido.status !== 'cancelled'` | morto, 1 falha (o guarda nomeia o arquivo) |
| R04 | `regraDePedidoSoNoCore.test.ts` | régua 3 sem a forma "literal à esquerda" | morto, 1 falha (sensor `'separating' === pedido.status`) |
| R05 | idem | régua 3 sem a fronteira à esquerda da coluna | morto, 1 falha (inverso `customer_status`) |
| R06 | idem | `rejected` no vocabulário de `status` | morto, 4 falhas (âncora, inversos, `lerComPapel.ts` real) |
| R07 | `FolhaDoRastreio.tsx` | `aoConcluir` não fecha a folha no sucesso | morto, 5 falhas |
| R08 | `LembreteDoEnvio.tsx` | o lembrete aparece sem `canChargeMaterial` | morto, 4 falhas |
| R09 | `core/orders/appAction.ts` | `canChargeMaterial` sem a exigência do telefone | morto, 2 falhas |
| R10 | idem | `trackingEdit` sem o corte da retirada | morto, 1 falha |
| R11 | idem | `trackingSheet` sem o corte da retirada | **sobreviveu** (core e mobile-adm) — equivalente, abaixo |
| R12 | `travas.ts` | `travar` nunca recusa o segundo toque | morto, 11 falhas |
| R13 | `useAcaoDoPedido.ts` | sem reler a lista | morto, 9 falhas |
| R14 | idem | sem reler a Início (`store_overview`) | morto, 8 falhas |
| R15 | `core/order-actions/status.ts` | sem a guarda `expectedFrom` no `update` | morto, 6 falhas |
| R16 | idem | zero linhas deixa de ser `nenhuma-linha` | morto, 4 falhas |
| R17 | `gravarAcao.ts` | `sem-papel` deixa de lançar a recusa | morto, 3 falhas |
| R18 | `LembreteDoEnvio.tsx` | `rel` sem `noreferrer` | morto, 1 falha |
| R19 | idem | idade pelo relógio do aparelho em vez do `lido_em` | morto, 1 falha |

**R11 é equivalente, e não relevante**: com o corte apagado, `trackingSheet` ainda devolve `null` para
retirada pelos dois caminhos de `oferece` — `origem === 'acao'` lê `appPrimaryAction`, que nunca dá
plano `folha` à retirada (`if (retirada) break`, e a retirada em separação vai a `marcar-retirado`), e
`origem === 'entrega'` lê `trackingEdit`, cujo corte da retirada TEM régua (R10 morto). O `if` é
cinto-e-suspensório; `MAA-16` continua provado.

### 3. Os achados da rodada 1

- **N05/N25 (`MAA-13`)**: fechados — os dois mutantes da rodada 1, reinjetados como R01/R02, morrem por
  asserção nos três casos novos (um por gesto) e os inversos `it.each` provam que o gesto não é inerte
  no jsdom.
- **M45 (`MAP-49`)**: fechado pela causa — a régua 3 (`COMPARACAO_DE_ESTADO`) acusa a forma exata
  (R03), e as três peças dela (literal à esquerda, fronteira da coluna, vocabulário por coluna) têm
  sensor que morde (R04–R06). As afirmações do `design.md` (§3.1, §8.3) e do cabeçalho de
  `appAction.ts` agora descrevem o alcance real e declaram o que fica de fora (`includes`/`in`, literal
  guardado em variável).
- **Observação, sem FAIL**: a régua 3 também não alcança o acesso por colchete
  (`pedido['status'] !== 'cancelled'`) nem uma comparação quebrada em linhas; nenhum dos dois existe no
  app hoje. Vale acrescentá-los à lista do que está declarado fora, numa próxima passada pelo guarda.

### 4. Veredito

**PASS** — os três sobreviventes relevantes da rodada 1 estão mortos por asserção, 18 de 19 mutantes
desta rodada mortos por asserção (o sobrevivente é equivalente, com a razão acima), nenhuma regressão
de suíte, tipos ou lint, nenhum defeito de produto. O probe de paridade contra o banco local não foi
re-rodado: o conserto não tocou código de produto (só testes, um comentário e o `design.md`), e a
rodada 1 o deixou verde.

---

## Rodada 3 — 2026-10-24 — depois do conserto do QA (C01..C04) — **FAIL** (lacunas de cobertura; nenhum defeito de produto)

> Verificador ≠ autor. Mesmo worktree e branch, sobre os consertos C01–C04 (`tasks.md`, "Conserto do
> QA"). Nenhum arquivo de produto ou de teste foi editado pelo verificador: os 17 mutantes foram
> aplicados no arquivo real por um arnês que exige o alvo exatamente uma vez, roda a suíte INTEIRA de
> cada workspace afetado (core ⇒ core e mobile-adm) e restaura conferindo SHA-256 (abortaria se
> divergisse). Hash da árvore (diff + não rastreados) antes e depois da rodada: **idêntico**
> (`855e4e6d…`; `git diff --stat` 47 arquivos, +1550/−237).

### 1. Suítes, tipos e lint (um workspace por vez, `--testTimeout=20000` sem o `--`, exit fora de pipe)

| Workspace | Arquivos | Testes | Exit | Contra a rodada 2 |
| --- | --- | --- | --- | --- |
| mobile-adm | 76 | 1096 | 0 | +16 (C01 +2, C02 +7, C03 +5, C04 +2) |
| core | 166 | 4219 | 0 | +13 (C01 +4, C02 +9) |
| store | 320 | 5885 | 0 | = |
| backoffice | 212 | 3696 | 0 | = |

Os números batem com o que cada task C01–C04 declara. functions e catalog-import não foram tocados
pelos consertos e não foram remedidos. `tsc --noEmit`: mobile-adm app 0, mobile-adm node 0, store app
0, store server 0, backoffice 0; `packages/core` **11**, os herdados arquivo por arquivo (`carousel` 5,
`pickHomeBanners` 1, `pickHomeCollections` 1, `sitemap/urls` 2, `supabase/client.ts` 2). `eslint .`:
mobile-adm **0/0**, store **2/2**, backoffice **23/5** — iguais à baseline.

### 2. Sensor de mutação — 17 mutantes nos arquivos reais

Nenhum morreu por compilação. Mutante de `core` roda também na suíte do mobile-adm (o consumidor).

| Id | Bug | Onde | Mutação | Resultado |
| --- | --- | --- | --- | --- |
| V01 | C01 | `core/order-actions/appAction.ts` | `mudou` só quando a linha relida não tem ação (`=== 'nenhuma'`), não quando tem OUTRA | morto (core 2, app 1) |
| V02 | C01 | `useAcaoDoPedido.ts` | `espera: 'marcar-enviado'` em vez de `'separar'` | morto, 3 |
| V03 | C01 | `gravarAcao.ts` | a porta converte `mudou` em `falhou` | morto, 2 |
| V04 | C01 | `useAcaoDoPedido.ts` | `mudou` desenhado COM "Tentar de novo" | morto, 4 |
| V05 | C01 | `BotaoDaAcao.tsx` | o "Tentar de novo" **do cartão** reenvia `{ tipo: 'primaria' }`, sem `espera` | **sobreviveu** |
| V06 | C01 | `RodapeDaAcao.tsx` | o "Tentar de novo" do rodapé descarta `espera` | morto, 2 |
| V07 | C02 | `core/orders/appAction.ts` | `shippedNoticeSent` aceita tudo que não é `failed` | morto em core (3); app verde (o dono tem a régua) |
| V08 | C02 | idem | frase 2 com o aviso desconhecido (`!== false`) | morto (core 1, app 1) |
| V09 | C02 | idem | frase 2 também em `delivered` | morto em core (1); app verde (o dono tem a régua) |
| V10 | C02 | `usePedido.ts` | leitura de `order_notifications` FALHOU ⇒ `avisoDePostagemSaiu = true` | **sobreviveu** |
| V11 | C02 | `core/orders/appAction.ts` | o evento lido é `order_delivered` | morto (core 2, app 2) |
| V12 | C03 | `FolhaDoRastreio.tsx` | guarda `<body>` como "quem abriu" (sem o `!== document.body`) | **sobreviveu** |
| V13 | C03 | idem | `main h1` sem `tabindex="-1"` | morto, 1 |
| V14 | C03 | idem | o campo é focado ANTES de ler quem abriu | morto, 4 |
| V15 | C03 | idem | `focus()` sem `preventScroll` | sobreviveu — cego no jsdom, declarado |
| V16 | C04 | `nomeDaLinha.ts` | sem o recuo para o e-mail | morto, 1 |
| V17 | C04 | `BotaoDaAcao.tsx` | sem `aria-label` durante a trava | morto, 1 |

### 3. Sobreviventes — leitura de cada um

**Relevantes (motivam o FAIL):**

- **V05 — o conserto do C01 não tem régua na SEGUNDA superfície (o cartão da lista).** O teste do C01
  (`acoesDoPedido.test.tsx`, o `it.each` de `separating`/`cancelled`) toca só o rodapé do detalhe. O
  cartão (`BotaoDaAcao`) tem o seu próprio "Tentar de novo", e trocar o repasse da retentativa por
  `{ tipo: 'primaria' }` deixa a suíte inteira do mobile-adm verde. Consequência real com o mutante: no
  cartão volta exatamente o bug do QA (zero rede e "Não consegui salvar. Tente de novo." num laço), e,
  num pedido de **retirada** relido em `separating`, a retentativa cai no plano `status` e grava
  `delivered` — o achado que o próprio C01 registrou (M1). O código de hoje repassa a retentativa
  certa; falta a prova. É a lição "duas pontas provadas, o fio não". **Conserto pedido**: o mesmo
  `it.each` do C01 pelo cartão em `/pedidos` (o `<App />` real), cobrando zero RPC/escrita/invocação,
  a frase "mudou" e a ausência de "Tentar de novo".
- **V10 — "`false` se a leitura falhou" é afirmado e não é provado.** O bug, a task C02 e o código
  (`usePedido.ts`) dizem que, com a leitura de `order_notifications` em erro, o detalhe não afirma o
  aviso. Os três casos novos de `usePedido.test.tsx` cobrem `sent`, `failed` e id inválido — nenhum o
  erro de leitura. Com o mutante (erro ⇒ `true`), "Alterar" em `shipped` volta a dizer "A cliente já
  recebeu o aviso de postagem…" justamente quando ninguém sabe — a frase do bug, por outro caminho. O
  histórico já cai em `falhou` nesse caso, então a tela mostraria "não consegui ler o histórico" e, ao
  lado, a afirmação. **Conserto pedido**: um caso com `order_notifications` respondendo erro ⇒
  `avisoDePostagemSaiu === false` (e, de preferência, o par pela página: a folha com a frase neutra).
- **V12 — o ramo "ninguém tinha o foco ao abrir" não tem régua.** O código descarta o `<body>` como
  "quem abriu" para cair no título da página; nenhum caso abre a folha com `document.activeElement ===
  document.body`. É o caso real do Safari do iPhone, onde tocar num `<button>` não o foca: com o
  mutante, o foco volta ao `<body>` — o bug C03 de novo, nesse navegador. **Conserto pedido**: um caso
  que abre a folha sem foco em controle nenhum (por `controle.abrir()` com o `body` ativo) e cobra o
  foco no `main h1` ao fechar.

**Não relevantes (declarados):**

- **V07, V09** — mortos na suíte de `core`, que é o dono de `shippedNoticeSent`/`trackingSheet`; o app
  só consome. A régua mora onde a regra mora.
- **V15** — `preventScroll` não é observável no jsdom (rolagem é medida de layout, que vale 0). Fica
  para o reteste em navegador do C03.

### 4. Conferência dos consertos e das MAA tocadas

- **C01 (`MAA-40`, `MAA-21`, `MAA-22`)**: conserto pela causa no dono (`espera` + `mudou` em
  `runAppAction`), provado no detalhe (V01–V04, V06 mortos); **o cartão sem régua (V05)**. A frase
  parcial da PRIMEIRA resposta por zero linhas segue a letra de `MAA-40` — decisão de spec em aberto,
  declarada pelo autor (nota b do bug); sem objeção do verificador.
- **C02 (A10, `MAA-11`, A11)**: `shippedNoticeSent` e o contexto da folha com régua em `core` (V07–V09,
  V11) e na fiação (V08, V11 mortos no app); **o ramo de leitura falha sem régua (V10)**. O
  SPEC_DEVIATION em A10 está declarado no código (`core/orders/appAction.ts`), no bug e na task, **mas
  não no `spec.md`** — fica a confirmar pelo usuário, como os da `74` (`MAP-47`/`MAP-48`).
- **C03 (`MAA-32`, `MAA-35`)**: foco devolvido a quem abriu, com o ponto estável (V13, V14 mortos);
  **o ramo do `<body>` ao abrir sem régua (V12)**; `preventScroll` só em navegador (V15).
- **C04 (`MAA-36`)**: `nomeDaLinha` dono único (link e botão), o rótulo visível primeiro e a trava
  (V16, V17 mortos). Observação sem FAIL: o "Tentar de novo" do cartão também não diz de qual pedido é
  (está dentro do `role="alert"` com a frase, mas a navegação por botões ouve vários "Tentar de novo"
  iguais); vale avaliar o mesmo tratamento.
- O probe de paridade contra o banco local não foi re-rodado: os consertos não tocaram SQL, a RPC nem
  as colunas gravadas (C01 só retira uma escrita, C02–C04 são leitura e tela).
- O reteste em navegador dos quatro bugs continua pendente (escopo do QA, não desta rodada).

### 5. Veredito

**FAIL** — 13 de 17 mutantes mortos por asserção; 3 sobreviventes relevantes, todos lacunas de
cobertura dos próprios consertos (V05: o C01 no cartão; V10: o C02 com a leitura falha; V12: o C03 com
o `<body>` ativo ao abrir) e 1 cego ao jsdom (V15). Nenhum defeito de produto: o código de hoje faz o
certo nos três caminhos (lido no fonte). Nenhuma regressão de suíte, tipos ou lint.

## Fecho das lacunas da rodada 3 — 2026-10-24 (sem rodada 4)

> Não é uma rodada independente: as três lacunas da r3 foram fechadas por casos novos ("Revalidação
> V05/V10/V12" nos próprios arquivos), sem código de produto mudado, e não houve rodada 4 do Verificador
> — o mesmo precedente da `72` e da `73` (a r3 era a última rodada).

- **V05** — `pages/__tests__/acoesDoPedido.test.tsx`: o `it.each` do C01 pelo **cartão** em `/pedidos`
  (o `<App />` real), com o caso da retirada relida em `separating`: zero RPC, zero escrita, zero
  invocação, "Este pedido mudou enquanto você olhava." e nenhum "Tentar de novo".
- **V10** — `entities/order/api/__tests__/usePedido.test.tsx` e o par pela página: a leitura de
  `order_notifications` em erro ⇒ `avisoDePostagemSaiu === false` e a folha com a frase neutra.
- **V12** — `features/order-actions/ui/__tests__/FolhaDoRastreio.test.tsx`: a folha aberta com o `<body>`
  ativo e o foco no `main h1` ao fechar.
- **Medido no fecho** (um workspace por vez, `--testTimeout=20000` sem o `--`, exit fora de pipe):
  mobile-adm **1102/76** (+6 sobre a r3), core 4219/166, store 5885/320, backoffice 3696/212, functions
  957/21, catalog-import 512/23 — todos exit 0. `tsc`: os apps 0, core 11 herdados. eslint 0/0 · 23/5 ·
  2/2. Build do mobile-adm verde.
- **V15** (`preventScroll`) segue cego ao jsdom; o reteste do QA conferiu o foco em navegador.
