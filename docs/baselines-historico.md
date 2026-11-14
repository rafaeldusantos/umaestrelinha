# Baselines — o histórico das medições

Saiu do `CLAUDE.md` da raiz em 2026-11-14: o arquivo inteiro entra no contexto de toda sessão e de todo
subagente, e este histórico era metade dele (~205 KB, relidos a cada chamada). O que vale agora — a tabela
atual e a regra do gate — está no `CLAUDE.md` › Baselines; aqui fica o registro de cada medição, **a mais
nova no topo**, e as lições de medição que saíram delas (os blocos `>`). Procure por `grep` antes de medir
de novo: `packages/core` com 11 erros de tipo herdados, o `loading` do `packages/auth`, o Playwright recusado
pelo filtro de robô, a ordem de publicação de cada WI.

Abaixo, o conteúdo da seção como estava no `CLAUDE.md` em 2026-11-14 (a tabela de então inclusa), sem edição.


O gate é **"sem regressão"**, não "tudo limpo": compare contra estes números e **atualize-os aqui**
quando mudarem de verdade.

| Medida | Baseline | Como medir |
| --- | --- | --- |
| **Lint** | **25 erros / 7 warnings** — backoffice 23/5 · store 2/2 · mobile-adm 0/0 (remedido em 2026-11-08 na Validation do WI 94, depois do conserto do `no-irregular-whitespace` que a tarefa 07 tinha deixado em `montarPedido.pecas.test.tsx`) | `npx eslint .` em cada app (o `pnpm lint` para no primeiro app que reprova) |
| **Tipos** | **0 · 7 · 0 · 0 · 0** (store · backoffice · catalog-import · `apps/store/tsconfig.server.json`, desde a `69` · mobile-adm, desde a `72`) — e **`packages/core` em 11**, herdados (medido na `73`: idênticos na base, nenhum em arquivo tocado). **Os 7 do backoffice** (medido em 2026-11-08, no fecho da tarefa 10 do WI 94) estão todos em `apps/backoffice/src/features/order-proposal/ui/__tests__/ProposalStateBadge.test.tsx` (sem `import` do vitest; commit `4c6e9a16`, anterior ao WI 94) — herdados. catalog-import e `tsconfig.server.json` não remedidos | `npx tsc --noEmit -p apps/<app>/tsconfig.app.json` · `npx tsc --noEmit -p packages/core/tsconfig.json` |
| **Testes** | store **7091/378** · backoffice **5183/288** · core **5510/229** · functions **1566/41** · mobile-adm **2655/167** (Validation do WI 94 — a montagem do pedido no app —, 2026-11-08, um workspace por vez, exit 0 fora de pipe, `--testTimeout=20000` sem o `--`; catalog-import não remedido) · antes: store **6865/364** · backoffice **5043/280** · core **5310/213** · functions **1439/39** · mobile-adm **2365/148** · catalog-import 512/23 (fecho do WI-01 Compre Junto, 2026-11-02, um workspace por vez, exit 0 fora de pipe, `--testTimeout=20000` sem o `--`; o mobile-adm reprovou 1 caso por contenção na primeira volta — `useFolhaNoHistorico.test.tsx`, verde isolado duas vezes — e fechou 2365/148 remedido) · antes: store **6475/347** · backoffice **4888/268** · core **5126/202** · functions **1390/37** · mobile-adm **2281/140** · catalog-import 512/23 (fecho da `89`, 2026-10-31, um workspace por vez, exit 0 fora de pipe, `--testTimeout=20000` sem o `--`; a entrada medida na T01 foi backoffice **4744**, não 4746) · antes: store **6275/336** · backoffice **4746/257** (+9 do conserto do reteste da `88` — o foco do "Tentar de novo" e do "Dispensar", e a rolagem a 390/200 % —, 2026-10-30, store remedido idêntico; um workspace por vez, exit 0 fora de pipe; antes **4737/257**, +22 do conserto do QA da `88`, 2026-10-30, store remedido idêntico; um workspace por vez, exit 0 fora de pipe; antes **4715/257**, +8 do fecho das lacunas da rodada 3 do Verifier da `88`, 2026-10-30, store remedido idêntico; um workspace por vez, exit 0 fora de pipe; antes **4707/257**, do conserto da rodada 2) · core **4994/192** · mobile-adm **2281/140** · functions **1250/34** (medidos no conserto da rodada 1 do Verifier da `88`, 2026-10-30, um workspace por vez, exit 0 fora de pipe; backoffice era **4701/257**) · antes: store **6271/336** · backoffice **4694/257** · core **4990/192** · functions **1247/34** (fecho da `88`, antes do Verifier) · antes: store **6231/335** · backoffice **4516/244** (+12/+1 do conserto do `BUG-20261029-produto-inexistente-abre-formulario-vazio`, 2026-10-29; era 4504/243) · core **4924/190** · mobile-adm **2279/140** (medidos no fecho da `87` com a qualidade 80, 2026-10-29, um workspace por vez, exit 0 fora de pipe — a entrada da `87` mediu backoffice **4491/243**: a linha de 4474 estava velha pelo commit `bcc11ce1`) · antes: store **6219/333** · backoffice **4474/243** · core **4918/190** (medidos no fecho das lacunas da r3 da `86`, 2026-10-29, um workspace por vez, exit 0 fora de pipe) · functions **1230/33** (fecho da `86`, 2026-10-28) · antes: store 6216/333 · backoffice 4343/242 · core 4878/190 (fecho da `86`, antes do Verificador) · antes: store **6176/330** · backoffice **4301/240** (medidos no fecho da `85`, com o adendo da ordem pelo teclado, 2026-10-28, sobre a master com a `84`) · e, de antes:  **18776 em 932 arquivos** — store **6150/329** · backoffice **4033/230** · mobile-adm **2279/140** · core **4697/184** · functions **1105/26** · catalog-import 512/23 (medidos na árvore mesclada da `82` com a `83`, 2026-10-27, um workspace por vez, exit fora de pipe; catalog-import não remedido; backoffice remedido no mesmo dia depois das ações da linha de produto, +13/+1, e de novo com o recorte das listas de pedidos e de produtos na URL, +71/+3; store +7/+1 com `pagamentoMarcaPagoSchema`; e de novo com vários fornecedores por produto, store 6150/329, backoffice 4033/230, core 4697/184, medidos) | `pnpm --filter @estrelinha/<w> test --testTimeout=20000` (store e backoffice) |

**O WI 99 (o frete grátis por região — Sul, Sudeste, Centro-Oeste, Nordeste e Norte, pela região do CEP, com dono único em `core/shipping/region.ts` —, o ⓘ da loja `InfoTip`, as regiões em Configurações › Frete e Material, o pedido montado conferido no servidor pela região do CEP, a faixa v2 e a prévia de frete na gaveta da sacola, e o checkout recebendo dela o CEP e a opção; traz junto os critérios do WI 97, a prévia de frete na sacola) fechou as tarefas em** core **6091/253** · functions **1711/49** · store **7635/413** · backoffice **5398/307** · mobile-adm **2734/176** (2026-11-14, no fecho da tarefa 11, branch `feature/99`, um workspace por vez, exit 0 fora de pipe, `--testTimeout=20000` sem o `--`; mobile-adm não foi tocado e foi remedido; catalog-import não remedido). **O delta do WI não é a diferença contra a linha do WI 98**: a `master` recebeu o WI 102 (preço de campanha) entre os dois sem esta tabela ser remedida. Tipos 0 · 7 · 0 · core 11 (herdados: os 7 do painel em `ProposalStateBadge.test.tsx`); lint 2/2 · 23/5 · 0/0. Uma migration (`20261130150000_99-frete-gratis-por-regiao.sql`: só acrescenta o campo das regiões a `store_settings.shipping`, com as cinco, aditiva e idempotente), aplicada **só no local**. Ordem de publicação: migration → functions (`checkout`, `mercado-pago`) → bundles. **Validation 1 PASS** (com a ressalva do `Timeout calling "onTaskUpdate"` do worker na suíte da loja com o paralelismo padrão; exit 0 com `--maxWorkers=2`). **QA real-user em duas rodadas** (2026-11-14): a 1ª abriu 7 bugs (critical 1 · high 1 · low 5), corrigidos nas fix tasks 12–14; a **Validation 2 PASS** mediu store **7646/413** (exit 0 com `--maxWorkers=2`), tipos 0, lint 2/2, build 3/3; a 2ª rodada (confirmação) deu os 7 como `resolved`, veredito `partial` (o design-check não rodou: o protótipo ficou ilegível sem o escopo do Claude Design; o CEP do RS e a gaveta em 1440 sem prova na tela). Detalhe em `.specs/work-items/99-frete-gratis-por-regiao-e-previa-na-sacola/qa/qa-result.md`.

**O WI 98 (o pagamento que falhou: registrar pagamento feito por fora no painel, desfazer, cobrança fechada ao cancelar ou registrar, "pago duas vezes"/"pago depois de cancelado", preço travado ao pagar de novo, link de cartão `/pagar-com-cartao`, o que a cliente vê no pedido e em `/conta`, cancelamento automático em 7 dias e o registro no app do ateliê) fechou a Validation em** core **5718/238** · functions **1669/46** · store **7188/382** · backoffice **5266/297** · mobile-adm **2729/175** (2026-11-10, rodada 4, depois do QA real-user com três rodadas e das fix tasks 10–21 — 13 bugs, 12 resolved e 1 cannot-reproduce por massa, e a decisão QA-P1: pedido sem cobrança da loja mostra o WhatsApp, sem PIX novo nem valor; um workspace por vez, exit 0 fora de pipe). Tipos 0 · 7 · 0 · 0 · core 11 (herdados); lint 2/2 · 23/5 · mobile-adm **0/0**. Oito migrations (`20261112120000`…`20261119120000`), aplicadas **só no local**; uma function nova (`cancel-unpaid-orders`). Ordem de publicação: migrations → functions (`mercado-pago`, `checkout`, `send-notification`, `cancel-unpaid-orders`) → bundles. O cancelamento automático depende de `pg_cron` + `pg_net` e de dois segredos no Vault (`cancel_unpaid_orders_url`, `cancel_unpaid_orders_key`); o e-mail `order_cancelled_unpaid` nasce desligado. Detalhe em `.specs/work-items/98-pagamento-que-falhou/qa-report.md`.

**A recusa de data center na function `visit` (2026-11-09, fora de feature) somou core +38/+1 (`datacenter.test.ts` e duas réguas em `denoReach`) e functions +4** — medidos: core **5548/230**, functions **1570/41**, store **7091/378** (todos verdes; a suíte da loja saiu com 1 `Timeout calling "onTaskUpdate"` do worker, contenção, não teste). Um robô (Chrome comum, cookies aceitos, perfil zerado, 157 IPs da ColoCrossing) gravou 351 visitas falsas em 08/11 15h e 09/11 5h, 6h, 12h e 13h; as linhas foram apagadas em produção (cópia no scratchpad da sessão). Sem migration.

**O WI 94, tarefa 10 (o rascunho da montagem no celular e a folha de sair) mediu, no fecho** (2026-11-08, um workspace por vez, exit 0 fora de pipe): store **7091/378** · backoffice **5183/288** · mobile-adm **2650/166**. O delta da tarefa é **+40/+3 no mobile-adm** (`montarPedido.rascunho.test.tsx` 8, `rascunhoComDonoUnico.test.ts` 8, `rascunhoSemDadoDaCliente.test.ts` 10, +11 em `semDadoDeClienteNoAparelho` e +3 em `trocaDeContaLimpaCache`); store e backoffice sem teste novo — a diferença contra a linha anterior é das tarefas 01–09 do WI 94 e do que entrou na `master` antes dele, sem esta tabela ser remedida. Tipos: mobile-adm **0**, store **0**, `packages/core` **11** herdados; **backoffice 7**, todos em `src/features/order-proposal/ui/__tests__/ProposalStateBadge.test.tsx` (sem `import` do vitest; commit `4c6e9a16`, anterior ao WI 94) — herdados, não desta tarefa. Lint: store 2/2 · backoffice 23/5 · **mobile-adm 1/0** (`no-irregular-whitespace` em `src/pages/__tests__/montarPedido.pecas.test.tsx:110`, da tarefa 07) — herdado. Sem migration.

**O WI-01 (Compre Junto: listas de peças, até três adicionais por joia, o bloco na página do produto, o conjunto na sacola, a marca "acompanha" no pedido, a forma do bloco e o relatório de adesão) fechou em** store **6865/364** · backoffice **5043/280** · core **5310/213** · functions **1439/39** · mobile-adm **2365/148** · catalog-import 512/23 (2026-11-02, medidos no fecho, um workspace por vez, exit 0 fora de pipe). **O delta do WI inteiro NÃO é a diferença contra a linha anterior**: entre o fecho da `89` e a abertura do WI a `master` recebeu o ajuste do `AD-071` e a `90` (Loja ao vivo, Fases 2 e 3) sem esta tabela ser remedida. O que foi medido ponta a ponta é a tarefa 06 (o relatório de adesão), contra a entrada medida com a árvore parada: **store 6811/363 → 6865/364 (+54/+1)** (`compreJuntoAdesaoSchema`, 53, e a RPC nova em `marcacaoSoPorAcao`, +1) e **backoffice 5028/279 → 5043/280 (+15/+1)** (`AdminBuyTogetherAdoption.test.tsx`, a página real; `navItems`, `focusRoutes` e `animacaoRespeitaMovimento` ganharam asserção sem caso novo). Tipos 0 · 0 · 0 · 0 · 0, core 11 herdados; lint 23/5 · 2/2 · 0/0. Quatro migrations (`20261105120000_compre-junto`, `20261105130000_compre-junto-conversao`, `20261106120000_compre-junto-no-pedido`, `20261107120000_compre-junto-adesao`), aplicadas **só no banco local**. Probes em `.specs/work-items/WI-01-compre-junto/probes/` (o `05-adesao.sh`: 17 `ok —`). Decisão `AD-072`.

**A feature `89` (o pedido montado pelo painel) somou +616/+35 em QUATRO workspaces**, medidos no fecho (2026-10-31, um workspace por vez, exit 0 fora de pipe) contra a entrada medida na T01 (`.specs/features/89-pedido-montado-pelo-painel/baseline.md`, que divergiu desta tabela só no backoffice: 4744, não 4746): **store 6475/347 (+200/+11)** (`pedidoMontadoSchema`, `proposalTokenComDonoUnico`, o `checkoutStore` por instância, os blocos com props novas, a página `/pedido-montado` real, o `page_view` sem fragmento, `CollapsedBlock` que quebra), **backoffice 4888/268 (+144/+11)** (montar, a proposta, a aba "Montados", a origem no pedido, `VariantPicker`, busca de cliente), **core 5126/202 (+132/+10)** (`core/proposals`, `core/coupons/rules`, `manualDiscount` em `payment/pricing`, `useCepLookup` em `core/hooks`, `whatsappChatUrl` com texto) e **functions 1390/37 (+140/+3)** (`order-proposals`, `get-proposal`/`create-order` com token, o ramo travado do `create-payment`). Mobile-adm e catalog-import idênticos. Tipos 0 · 0 · 0 · 0 · 0, core 11 herdados; lint 23/5 · 2/2 · 0/0; `pnpm build` verde. Uma migration, só no local. **Duas medidas do fecho**: o `originZipNotRead` do painel acusou `origin_zip` em duas fixtures da loja (a chave saiu delas), e o lint do store estava 3/3 (consertado, volta a 2/2). `packages/core/src/payment/pricing.ts` **mudou** (`manualDiscount`, opcional; sem ele a saída é a de antes, com a suíte de `payment` intocada).

**O ajuste da montagem do pedido pelo protótipo (`AD-071`, 2026-11-01) somou +56/+3 no backoffice**: **4944/271** (era 4888/268), medido com exit 0 fora de pipe. A store mediu **6501/347**, mas a árvore tinha trabalho de outra frente sem commit em `apps/store` (o checkout do pedido montado), então os +26 não são deste ajuste. Tipos 0, lint 23/5, build do painel verde. Sem migration. Mudou: a foto na busca da montagem (`mostrarFoto`, `useProductCovers`), as variações em chips com foto, o desenho do protótipo `Pedido - Montar.html` e o item "Pedidos montados" na sidebar (`isNavActive` marca o destino mais específico). Provado em navegador contra o banco local em 1440, 390 e 360, sem rolagem lateral. A lista e a edição de um montado não foram vistas em navegador: o runtime local das edge functions deste projeto estava fora do ar.

**A qualidade das rendições subiu de 75 para 80 logo depois da `87`** (2026-10-29, decisão do usuário, `RENDITION_QUALITY` em `core/media/rendition.ts`): +1,3 a +1,5 dB de PSNR contra o original da Nuvemshop por ~25% a mais de peso (a foto principal medida passou de 57 a 74 KB). As asserções com `quality=75` foram reescritas para 80 (core +1, a constante cravada). ⚠️ A qualidade está na URL: a troca invalida o cache de todas as rendições no CDN.

**A feature `88` (o aviso à cliente vira escolha, e o pedido mostra que está trabalhando) somou +303/+18 em CINCO workspaces**, medidos no fecho (2026-10-30, um workspace por vez, exit 0 fora de pipe, `--testTimeout=20000` sem o `--`) contra a entrada medida na T01 (`.specs/features/88-aviso-opcional-nas-acoes-do-pedido/baseline.md`, que bateu esta tabela): **backoffice 4694/257 (+178/+13)** (o portão de aviso, `ActionButton`/`usePendingAction`, as releituras `'revalidar'`, os esqueletos, as duas páginas reais com o client dublado e o guarda `avisoComDonoUnico`), **core 4990/192 (+66/+2)** (`notifications/notice.ts`, o ramo `skipped` de `buildHistory`, `avisarCliente` no dono da escrita), **store 6271/336 (+40/+1)** (`avisoPuladoSchema` e a RPC nova em `marcacaoSoPorAcao`), **functions 1247/34 (+17/+1)** (o modo pular do motor e a porta `trigger` × `notify`) e **mobile-adm 2281/140 (+2)** (a linha pulada no histórico, em tom neutro). Tipos 0 · 0 · 0 · 0 · 0, core 11 herdados; lint 23/5 · 2/2 · 0/0; build do painel verde; `payment/**` sem diff. Uma migration, aplicada só no local; probes `01-aviso-pulado.sql` (22 `ok —`) e `02-motor.sh` (16 `ok —`, o motor servido com o envio contido). Sensor do autor em cada task, nos arquivos reais (SHA-256 conferido): o do Lote 4 injetou 22, todos mortos por asserção; os sobreviventes das fases anteriores estão no `tasks.md` (um mutante do probe morto pelo guarda; duas travas redundantes do portão removidas em vez de testadas). **O Verifier independente reprovou a rodada 1** (48 mutantes, 1 sobrevivente — o resultado do gesto fora da região viva, `CRG-09` — e um defeito de produto: o código do envelope com a caixa marcada dizia "o e-mail não saiu" com o e-mail entregue, porque `setMaterialTracking` descartava `emailSent`). **O conserto r1 somou +14** (core 4994 · functions 1250 · backoffice 4701 · store 6275 · mobile-adm idêntico, exit 0 os cinco): o motor passou a responder `customer_sent` (só e-mail de público `customer`) e `triggerOrderNotification` o lê, com recuo para `sent` só no motor antigo — `emailSent` deixou de contar o aviso à dona em todo o painel e no lote; `setMaterialTracking` devolve `emailSent`; a RPC `skip_order_notification` renova `created_at` (`AVS-12`, a hora da escolha; migration reescrita e reaplicada só no local, probe 01 com **23** `ok —`); a frase "o e-mail não saiu — o pedido foi alterado"; e a exceção do lote em `CRG-07` comentada no código. 7 mutantes reinjetados (SHA-256 conferido), 7 mortos por asserção. Tipos 0 · 0 · core 11; lint 23/5; build do painel verde. **A rodada 2 do Verifier reprovou só por cobertura** (`CRG-09`: os anúncios do cancelamento, do avião, do "Reenviar" e da falha do gesto sem diálogo na região viva sem asserção; N11, N13, N22, N23 sobreviventes, nenhum defeito de produto). **O conserto r2 somou +6 no backoffice (4707/257)**, só teste, pela página real (`AdminOrderPage.aviso.test.tsx`), lendo `[aria-live="polite"]`; os 4 mutantes reinjetados (SHA-256 conferido) morreram por asserção. Store remedido, idêntico (6275/336); tipos 0; lint 23/5. **A rodada 3 do Verifier reprovou só por cobertura** (34 mutantes; V04, V14, V20, V28 sobreviventes: a nota interna sem asserção na região viva, o cartão do celular com a leitura dos envios falhando, o corte de 50 no diálogo do lote e a frase "sem e-mail" no cancelamento; nenhum defeito de produto). **As lacunas foram fechadas sem rodada 4** (precedente da `72`, `73` e `83`): +8 no backoffice (**4715/257**), só teste, pelas páginas reais e pelo diálogo; os 4 mutantes reinjetados (SHA-256 conferido) morreram por asserção, só nos casos novos. Store remedido, idêntico (6275/336); tipos 0; lint 23/5. **Verifier: 3 rodadas, a 3ª FAIL só por cobertura, lacunas fechadas sem rodada 4.** **O QA** (`docs/qa/reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos.md`) achou 7 bugs da `88`, **todos consertados** (2026-10-30) com teste vermelho antes e 23 mutantes reinjetados, 23 mortos por asserção: a leitura de `order_notifications` falhando passou a recusar o gesto que dependeria da previsão (`A-14`, fecha a decisão aberta da r3), a linha do avião que falha diz "A tentativa de envio falhou" com o erro cru recolhido (`A-15`, AVS-13 emendado), a lista não afirma "Nada esperando" enquanto conta, o foco volta a um lugar (dono único `shared/lib/foco.ts`; os testes simulam o foco do Chromium com `src/test/focoDoNavegador.ts`), o resumo do lote fica até ser dispensado e diz o motivo, o botão do cartão nomeia o pedido, os filtros do Histórico embrulham; e dois paper cuts (o título do lote com o número dos que mudam, e **um anúncio por desfecho** — os casos de CRG-09 que liam a frase na região do gesto foram invertidos). backoffice **4737/257**, store idêntico; tipos 0; lint 23/5; build verde. **O reteste em navegador** verificou 6 dos 7, reabriu a rolagem a 390/200 % (431 no pedido, 478 na lista) e achou um bug novo (o foco no `<body>` depois do "Tentar de novo" do Histórico e do "Dispensar" do resumo). **O conserto do reteste somou +9 no backoffice (4746/257)**, com teste vermelho antes e 10 mutantes mortos por asserção: o foco pelo dono `shared/lib/foco.ts` (o `h2` do Histórico; o `h1` da lista), as ações do `PageHeader`/`RecordPageHeader` quebrando linha só abaixo de `md` (`shared/ui/acoesDoCabecalho.ts`), a grade do pedido com `grid-cols-1` no celular, o preço do item com `min-w` (nunca cortado) e quantidade + preço descendo para baixo do nome quando não cabem, os números da cliente em `auto-fit` e o botão do cartão da lista quebrando texto. Segundo reteste: `scrollWidth` 390 em 390 a 100/130/200 % no pedido, na lista e na Fila; 1440 sem mudança medida; o foco em `H2 "Histórico"` e `H1 "Pedidos"`. Store idêntico; tipos 0; lint 23/5; build verde. **A-14 e A-15 confirmadas pelo usuário em 2026-10-30.**

**A feature `87` (a qualidade das imagens) somou +30/+2 em TRÊS workspaces**, medidos no fecho
(2026-10-29, um workspace por vez, exit 0 fora de pipe) contra a entrada medida com a árvore parada
(`.specs/features/87-qualidade-das-imagens/baseline.md`: core 4918/190 · store 6219/333 · backoffice
4491/243): **core 4923/190 (+5)**, **store 6231/335 (+12/+2: `ImageZoom.test.tsx` e
`ProductGalleryZoom.test.tsx`, este do fecho do Verificador)** e **backoffice 4504/243 (+13)**. Tipos 0 · 0 ·
core 11; lint 2/2 · 23/5; `pnpm build` verde; `payment/**` intocado. **Sem migration.** Testes antigos
reescritos por mudança de VALOR da spec (três larguras → quatro, 720 → 1080, 1600 px → 2400, a frase da
dropzone), nenhum afrouxado. Verificador: 31 mutantes, 29 mortos por asserção, 2 sobreviventes (o palco
da galeria provado só com o `ImageZoom` dublado, e o dublê que fundia "sem atributo" com "vazio"),
fechados e reinjetados. Prova em navegador e QA (`docs/qa/reports/2026-10-29-qualidade-das-imagens.md`):
a foto principal em 390 @3x vem a 1080 uma vez (32 → 58,6 KB, 1,83×; LCP em Slow 4G 4,84 s, +0,5 s
estimado), a categoria segue em 720, o zoom só pede 1600 com o ponteiro, e o painel grava o WebP que
cabe byte a byte. As fotos importadas da Nuvemshop têm 1024 px na origem — esse é o teto de nitidez
delas.

**A feature `86` (o menu montado pela dona) somou +193/+9 em TRÊS workspaces**, medidos no fecho
(2026-10-28, um workspace por vez, exit fora de pipe, `--testTimeout=20000` sem o `--`) contra a
entrada medida com a árvore parada (`.specs/features/86-menu-montado-pela-dona/baseline.md`: core
4767/186 · backoffice 4301/240 · store 6176/330): **core 4878/190 (+111/+4)** (`structure`, `legacy`,
`refusals`, a porta nova), **backoffice 4343/242 (+42/+2)** — com a **queda declarada de −66/−4** dos
editores da `39` apagados na T20 (onde cada caso reaparece está no `tasks.md` da `86`) — e **store
6216/333 (+40/+3)**. Functions remedido, idêntico (1230/33; `packages/supabase` mudou). Tipos 0 ·
0 · 0 · 0 · core 11 herdados; lint 2/2 · 23/5; `pnpm build` verde. **Sem migration** (`AD-068`). A
prova em navegador achou três defeitos que a suíte aprovava, consertados com teste antes: o nome do
item espremido a 29 px em 390, o "Ver na loja" abrindo o painel, e a prévia do celular que não abria a
folha (o latch da `38`). **Verificada em três rodadas** (as três FAIL só por cobertura, nenhum defeito de produto), com as correções de QA no meio; o fecho das lacunas da r3 (H01..H03: o conflito verdadeiro da reconciliação, o gatilho `focus` e o filho externo da folha do celular) foi feito sem rodada 4, como na `72`, na `73` e na `83`, e mediu **core 4918/190 · backoffice 4474/243 · store 6219/333** (2026-10-29, exit 0 os três); tipos 0 · 0 · core 11; lint 2/2 · 23/5; `pnpm build` verde. QA ready.

**A feature `84` (SEO do produto com IA) somou +399/+19 em QUATRO workspaces**, medidos no fecho
(2026-10-28, um workspace por vez, exit fora de pipe, `--testTimeout=20000` sem o `--`) contra a entrada
medida com a árvore parada (`.specs/features/84-seo-do-produto-com-ia/baseline.md`: core 4697/184 ·
functions 1105/26 · backoffice 4016/230 · store 6146/329, com trabalho não commitado de outra frente
dentro): **core 4767/186 (+70/+2)** (`seo/suggestion.ts`), **functions 1230/33 (+125/+7)** (a porta
`_shared/claude*.ts` e a function `seo-suggest`), **backoffice 4142/235 (+126/+5)** (checklist sem
bloqueio de SEO, `SeoPreview` com o servido, `features/seo-suggestion` e a página real) e **store
6168/330 (+22/+1)** (`claudeSoNoServidor`). Tipos 0 no painel, core 11 herdados; lint do painel 23/5;
build do painel verde. **Sem migration.** Decisão `AD-067`. Verificador independente em três rodadas
(as três FAIL só por cobertura; lacunas da r3 fechadas com os mutantes reinjetados, sem rodada 4);
prova em navegador e QA com reteste (5 bugs consertados e retestados) e probe contra a Claude API real,
**tudo no ambiente local** (decisão do usuário): 5/5 sugestões na régua, p95 9,1 s, ≈ US$ 0,001 cada.

**A feature `85` (o Resumo com as imagens do produto) somou +139/+5 no backoffice**, medidos em 2026-10-28 um workspace por vez, exit fora de pipe, contra a entrada medida num worktree descartável da master com a `84` (backoffice 4162/235 · store 6176/330): **backoffice 4301/240**, store idêntica. Tipos 0, lint 23/5, build verde. Sem migration, sem `core`. Executada num worktree próprio por sub-agentes (três em paralelo na Fase 2, com arquivos disjuntos). O Verifier reprovou a r1 por um defeito latente real — dois envios resolvidos no mesmo tique perdiam uma foto (o `onUploaded` lia o `form` do render; `setFields` ganhou forma funcional) — e por fiação do progresso sem teste pela página; a r2 passou, com as lacunas fechadas. QA (`docs/qa/reports/2026-10-28-backoffice-resumo-com-imagens*.md`): 4 bugs da `85` consertados e retestados em navegador; 3 anteriores à `85` registrados (ordenar só arrastando, foco do modal de imagem da variação, "Alterações não salvas" ao abrir).

**A feature `82` (o envelope da cliente) somou +297/+6 em QUATRO workspaces**, medidos em 2026-10-27 um por vez, exit fora de pipe, contra a entrada medida com a árvore parada (`.specs/features/82-envelope-da-cliente/baseline.md`: core 4466/178 · mobile-adm 2021/126 · store 6013/326 · backoffice 3916/225 — a linha anterior desta tabela estava velha pelo commit `744da7ea`): **core +134/+2**, **mobile-adm +111/+3**, **store +22/+1** (`envelopeSchema`, `materialTransitions` lendo a RPC vigente, e a loja gravando o código pelo dono de `core`) e **backoffice +10** (o painel delega `setMaterialTracking` a `core`). Tipos 0 nos apps, core 11 herdados; lint 0/0 · 23/5. Uma migration (`20261028120000_82-envelope-da-cliente.sql`), aplicada só no local. Verificador r1 FAIL por cobertura (4 de 42 mutantes), lacunas fechadas com os mutantes reinjetados; prova em navegador achou 3 defeitos de layout/foco, consertados; QA achou 8 bugs: 7 consertados com teste e retestados em navegador (inclusive o erro com dono, o "Tentar de novo" do envelope, a carência de 5 s do "Sem conexão" e o código normalizado no dono da escrita) e 1 mantido por decisão (`BL-055`); a verificação r2 (consertos) fechou com as lacunas cobertas. O lembrete do WhatsApp deixou de dizer "Oi, Oi!" sem nome.


**A feature `83` (Loja ao vivo, Fase 1) somou +352/+17 em QUATRO workspaces** no fecho, depois das três rodadas do Verificador e do QA (2026-10-27, um workspace por vez, exit fora de pipe, `--testTimeout=20000` sem o `--`), contra a entrada medida com a árvore parada (`.specs/features/83-loja-ao-vivo/baseline.md`, 17521/881 em cinco workspaces, sobre `744da7ea` — a linha anterior desta tabela estava velha por esse commit): **mobile-adm +145/+11** (a tela, o cartão, o período com dono único, os guardas de relógio e de tom, `aoVivoComClientReal`, o foco no `h1` e o do "Tentar de novo"), **store +104/+1** (`visitasPorHoraSchema` e as réguas de `visitasSchema` aplicadas também à migration vigente por `visitasRegras.ts`; a política com a hora; o arroba do rodapé), **core +97/+4** (`core/live`, `counterNotes`, o tipo e o intervalo do hook) e **backoffice +6/+1** (`notasDoContadorNoCore`; nenhuma asserção antiga tocada). Functions remedido, idêntico; catalog-import não tocado. Tipos 0 · 0 · 0 nos apps, core 11 herdados; lint 0/0 · 23/5 · 2/2; build do app verde; probe `01-acessos.sql` exit 0, **90** `ok —`. Uma migration (`20261029120000_83-loja-ao-vivo.sql`), aplicada só no local. **O Verificador independente reprovou três rodadas, sempre por cobertura e nunca por defeito de produto** (63, 58 e 64 mutantes; os sobreviventes eram régua faltando no SQL de `LAV-71`..`LAV-73`, com os dois lados da comparação valendo o mesmo número na fixtura), e as lacunas da r3 foram fechadas com os mutantes reinjetados, sem rodada 4. **O QA** (`docs/qa/reports/2026-10-27-mobile-adm-loja-ao-vivo.md` e o reteste) achou três bugs de atrito: o foco do "Tentar de novo" caindo no `<body>` (consertado, `5b23601d`), o arroba do rodapé da loja rolando de lado a 200 % (anterior à `83`, consertado, `49f8bbb5` — a página ainda rola a 390/200 % pelo **cabeçalho** da loja, decisão pendente) e o F5 que desfaz o período escolhido na própria tela (esperando decisão). **Esta árvore não tem a `82`**: no merge, a linha *Testes* é remedida — a soma não é aritmética.

**A árvore mesclada — `feature/mobile-adm` (72..79) encontrando a `master` com a `80` e a `81`** (merge de 2026-10-26), medida depois do merge, um workspace por vez, exit fora de pipe: **core 4461/177 · functions 1105/26 · catalog-import 512/23 · mobile-adm 2014/125 · backoffice 3915/225 · store 6006/325**, os seis exit 0. Tipos 0 nos cinco projetos (`packages/core` segue em 11, herdados); lint backoffice 23/5 · store 2/2 · mobile-adm 0/0; `pnpm build` verde. **A soma não é aritmética**: os guardas da loja e do painel varrem os dois lados, e os números que valem são estes, medidos. No merge, o `AD-057` da `80` passou a `AD-064` (o da `73` veio antes) e as lições L-045..L-048 da `81` passaram a L-068..L-071.

**O fecho da rodada 4 do Verificador da `81` somou +1 no backoffice** (3852/218 → **3853/218**, 2026-10-26, exit fora de pipe): o limite de OPV-04 (`orders: 1` ⇒ pausa) em `orphans.test.ts`, que mata G13 (`> 0` → `> 1`) por asserção, SHA-256 conferido na restauração. G17 segue declarado como candidato a equivalente.

**O reteste de QA da `81` somou +4 no backoffice** (3848/218 → **3852/218**, 2026-10-26, um workspace por vez, exit fora de pipe): um bug novo, com teste vermelho antes — ligar "Ativa" na linha vendida, como o aviso de pausa manda, não tirava a linha do aviso (+1 pela página real em `AdminProductFormPage.variacoes.test.tsx`, +3 de unidade em `orphans.test.ts` para `mergePausedIds`/`stillPausedLabels`). Store remedida, idêntica (5754/314); tipos 0 · 0; lint 23/5 · 2/2; build dos dois apps verde. Relatório: `docs/qa/reports/2026-10-26-opcoes-e-variacoes-reteste.md`.

**As três decisões do QA da `81` somaram +13 no backoffice** (3823/218 → **3836/218**, 2026-10-26, um workspace por vez, exit fora de pipe), decididas pela recomendação do QA e a confirmar: os conjuntos de valores no lugar da união (+6 em `optionLibrary.test.ts`), os chips que ficam enquanto sobrar valor (+3 em `optionLibrary.test.ts`; `OptionsEditor.test.tsx` trocou os 8 casos do bloco antigo por 11), e o aviso da vendida devolvida, que continua pausada (+1 na página real, e o literal novo nos três casos que o cravavam). Cada um vermelho antes do código. Store remedida, idêntica (5754/314); tipos 0 · 0; lint 23/5 · 2/2.

**O QA da `81` somou +8 no backoffice** (3815/218 → **3823/218**, 2026-10-26, um workspace por vez, exit fora de pipe): quatro bugs, cada um com teste vermelho antes — o modal de imagem perdendo o topo com as 28 fotos do maior produto (+1, `VariantImagePicker.test.tsx`), a posição repetida da linha nova depois de tirar e devolver um valor do meio (+1, `gridSync.test.ts`; a fixture de um caso antigo, com duas linhas em 0, ganhou as posições 0 e 1, asserção intocada), a rolagem lateral com a fonte a 200 % em 390 (+5, token exato em `OptionsEditor`, `PricingTab` ×2, `GridActions` e na página real) e o resumo "3 × 2 × 1 = 2" com o nome apagado (+1). Store remedida, idêntica (5754/314); tipos 0; lint 23/5; build verde. Cinco achados esperam decisão (ver o relatório).

**O conserto da rodada 3 do Verificador da `81` somou +6 no backoffice** (3842/218 → **3848/218**, 2026-10-26, um workspace por vez, exit fora de pipe): +1 no `VariantImagePicker` (URL fora da galeria, G10), +1 no `OptionsEditor` (chips sem conjunto restante, G11), +4 em `orphans.test.ts` (`mergePausedLabels`, a dedupe do aviso que saiu da página sem mudar de régua, G12), e o caso OPV-27 da página passou a salvar e asserir `image_url: null` no banco (G10). P02, I03, E04 e P06 reinjetados com SHA-256 conferido: mortos por asserção; a fiação da página para `mergePausedLabels` (P06w) sobrevive e está declarada. Store idêntica (5754/314); tipos 0; lint 23/5.

**O conserto da rodada 2 do Verificador da `81` somou +6 no backoffice** (3836/218 → **3842/218**, 2026-10-26, um workspace por vez, exit fora de pipe), só teste: +2 pela página real com a biblioteca semeada (G6, inclusive o Success Criterion 1 na grade), +2 do acréscimo digitado pela dobra (G8), +1 da grafia do primeiro produto no conjunto (G7) e +1 do seletor "Grupo de origem" (G9). Os quatro sobreviventes (N34, N29, N18, N11) reinjetados com SHA-256 conferido: mortos por asserção, só pelos casos novos. Store idêntica (5754/314); tipos 0; lint 23/5. Nenhum código de produto mudou.

**O conserto da rodada 1 do Verificador da `81` somou +7 no backoffice** (3808/218 → **3815/218**, 2026-10-26, um workspace por vez, exit fora de pipe): +4 casos pela página real (G1..G4), +2 em `orphans.test.ts` (o par de G2) e +1 em `VariantsTable.test.tsx` (o contêiner da grade como bloco de contenção, achado na prova em navegador). Store remedida, idêntica (5754/314); tipos 0; lint 23/5. Os três mutantes sobreviventes (M29, M07, M32) reinjetados com SHA-256 conferido: mortos por asserção. Detalhe no `validation.md` da feature.

**A feature `81` (opções e variações do produto) somou +102/+7 em UM workspace**, medidos em
2026-10-26 um workspace por vez, exit code fora de pipe, contra a entrada medida com a árvore parada
em `fc2b3b60` (`.specs/features/81-opcoes-e-variacoes-do-produto/baseline.md`: backoffice 3706/211 ·
store 5754/314): **backoffice 3808/218** (`gridSync` 22, `orphans` 7, `optionLibrary` 16,
`useOptionLibrary` 9, `OptionsEditor` +29, `VariantImagePicker` 17, `VariantsTable` +7, a página real
em `AdminProductFormPage.variacoes.test.tsx` 13, a grade rápida +3). **Duas quedas declaradas**: −16
do "Regerar do cruzamento" (`gridActions.test.ts` −10, `GridActions.test.tsx` −6; o que importava
deles está em `gridSync.test.ts`) e −5 do card "Imagem por variação" (`VariantImageCard.test.tsx`
apagado com o card; os 9 casos de `clearMissingVariantImages` e `StorefrontPreview` que moravam no
mesmo arquivo mudaram de casa sem uma linha alterada). Store remedida, idêntica (os guardas dela
varrem `apps/**`). Tipos 0 no painel, lint 23/5, `pnpm --filter @estrelinha/backoffice build` verde.
**Sem migration, sem `core`.** Core, functions e catalog-import não foram tocados e não foram
remedidos. Decisão `AD-063`.

**A feature `80` (o fornecedor da peça) somou +87/+7 em TRÊS workspaces**, medidos em 2026-10-22 um
por vez, exit code fora de pipe, contra a entrada medida em `41ea7040` (store 5733/312 · backoffice
3654/207 — a linha anterior desta tabela estava velha, sem os commits das categorias em reticências
e do salvar que fica na página): **backoffice +52/+4** (a página do produto com o diário de escritas,
`persistSupplier`, a sugestão, o filtro no servidor, a coluna, o chip e as visões antigas), **store
+21/+2** (`fornecedorSchema`, `fornecedorForaDaLoja`) e **core +9/+1** (`core/suppliers`). Functions e
catalog-import não foram tocados e não foram remedidos. Tipos 0 · 0, lint 23/5 · 2/2. Uma migration
(`20261022150000_80-fornecedor-da-peca.sql`), sem escrita de dado, aplicada só no banco local.

> **A verificação independente reprovou a rodada 1 por cobertura** (42 mutantes, 7 sobreviventes,
> nenhum defeito de produto), e o conserto achou um defeito de verdade: salvar **antes** de a lista de
> fornecedores carregar criava "Atelie Prata" ao lado de "Ateliê Prata" (o índice único só segura a
> duplicata exata). `persistSupplier` passou a reler a lista antes de criar. Outro achado da rodada: no
> "Salvar e publicar" a recusa do fornecedor vinha DEPOIS do checklist e nunca era alcançada — ela
> subiu para antes dele. E uma asserção de ausência com o menu do Radix aberto era verdadeira nos dois
> mundos (o menu deixa a tela `aria-hidden`).

> **O guarda `buscaDeProdutoComDonoUnico` (BUS-21) acusou um `.ilike('name', …)` em `suppliers`** — falso
> positivo (a régua mira `products`), mas o conserto foi pelo código e não pelo guarda: a corrida do
> nome único passou a reler a lista e casar pela mesma régua sem acento da sugestão, o que também
> tirou uma segunda comparação de nome do caminho.

**A feature `79` (o aviso de pedido no celular) somou +555/+21 em CINCO workspaces** no fecho (mobile-adm
**2005/125**, functions **1105/26**, core **4452/176**, depois do conserto do Verificador r1 — V01..V05 — e do
QA); os números por workspace abaixo são da entrega, medidos em
2026-10-25 um workspace por vez, exit code fora de pipe, contra a entrada medida com a árvore parada
(`.specs/features/79-mobile-adm-aviso-de-pedido/baseline.md`, 17214/866, que bateu esta tabela):
**mobile-adm +217/+13** (a tela `/avisos`, a porta, o hook do aparelho, o "Parar" único, o SW dos avisos,
a volta ao destino depois do login, a tradução da recusa e os guardas), **functions +142/+5** (o ramo
`deliverPush` do motor, o orçamento de tempo, o desfecho do serviço de push, a function `atelie-avisos` e
`pushSoNoMotor`), **core +86/+1** (`core/notifications/push.ts`, o canal na pré-condição, nas
configurações e no histórico do pedido), **store +77/+1** (`pushSubscriptionsSchema` e as réguas novas em
`orderNotificationsSchema`, `marcacaoSoPorAcao` e `chaveDeServidorForaDoNavegador`) e **backoffice
+3** (o histórico com o canal "Celular" e o `RequireAdmin` com `state.from`; nenhuma asserção antiga
afrouxada). Catalog-import remedido, idêntico. Tipos 0 nos apps, 11 herdados em core; lint 0/0 · 23/5 ·
2/2; builds do mobile-adm (`dist/sw.js` com o `importScripts` dos avisos) e do backoffice verdes;
`payment/**` e `deno.lock` sem diff. **Uma migration** (`20261026120000_79-avisos-no-celular.sql`),
aplicada só no local. Decisão `AD-062`. **Um defeito achado pelo probe e não pela suíte**: o teto de 30 s do
aviso de teste morava na linha da inscrição, e apagar a inscrição (o serviço de push responde 410) o
zerava — mudou para `push_test_claims`, por conta (`probes/05-teto-do-teste`, que reprova a regra antiga).
**NÃO provado**: o aviso chegando num Chrome real e no Android real — pendente do usuário. O Verificador
independente reprovou a r1 por cobertura (76 mutantes, 4 sobreviventes, nenhum defeito de produto), e as
cinco lacunas foram fechadas com o mutante reinjetado (sem r2); a lacuna 4 levou `destinoDepoisDoLogin` a
recusar `/\` como o worker. O QA (`docs/qa/reports/2026-10-25-mobile-adm-avisos-no-celular.md`) achou dois
bugs: o foco caindo no `<body>` (consertado, +7 casos) e a tela que segue "ligada" depois de o aviso de
teste receber 410 — **consertado em 2026-10-26 pela decisão do usuário** (opção 1: volta a "Avisar neste
celular" com "Este celular deixou de receber avisos. Ative de novo."; mobile-adm **2014/125**, +9, 7 mutantes
mortos por asserção; reteste em navegador pendente).

**A feature `76` (Clientes no app do ateliê) somou +843/+48 em QUATRO workspaces** no fecho (números do fecho final, depois do QA e do Verificador; os por workspace abaixo são da entrega), medidos em
2026-10-24 um workspace por vez, exit code fora de pipe, contra a entrada medida com a árvore parada
(`.specs/features/76-mobile-adm-clientes/baseline.md`, 16371/818 — a linha desta tabela, 15819/792, estava
**envelhecida** desde o fecho da `74`/`75`): **mobile-adm +596/+31** (a lista, a ficha, o "Ver cliente", a
infra extraída de Pedidos e os guardas), **core +94/+9** (`core/customers` e `whatsappChatUrl`), **store
+23/+2** (`clientesSchema`, `emAbertoComDonoUnico`) e **backoffice +10/+1** (`regrasDeClienteNoCore`; nenhum
teste antigo tocado). Functions e catalog-import remedidos, idênticos. Tipos 0 nos apps, 11 herdados em core;
lint 0/0 · 23/5 · 2/2; builds do mobile-adm e do backoffice verdes; `payment/**` sem alteração. **Uma
migration** (`20261025120000_76-clientes-em-aberto.sql`, `orders_open`), aplicada só no local; ordem de
publicação **migration → bundle**. Provas: `probes/03-paridade` (42 `ok`, 2 mutantes em `core` mortos),
`clientesComClientReal` (12 casos, 5 mutantes mortos) e `prova-navegador.md` (60 medidas de layout em
360/390/412/1440 × 100/130/200 %, privacidade, conta sem papel). **NÃO provado: o Android real** (teclado,
gesto de voltar com o campo focado, área segura, fonte do aparelho) — TQ10, pendente do usuário.

**Fecho final da `76` medido em 2026-10-24: mobile-adm 1765/111 (+663/+35), core 4365/175 (+146/+9), store 5908/322 (+23/+2), backoffice 3707/214 (+11/+2); functions e catalog-import idênticos.**

**O conserto do QA da `76` somou +63/+4 em TRÊS workspaces** (medidos em 2026-10-24, um workspace por vez,
exit code fora de pipe, contra o fecho do Verificador): **mobile-adm +38/+3** (1698/107 → 1736/110: a vigia
da recusa, o aviso de aba nova, a barra de abas diante da busca, o anúncio do vazio e do "Limpar", o foco de
"Ver mais pedidos", o nome acessível da linha e o cabeçalho da ficha), **core +24** (4313 → 4337: o que se
cola na busca) e **backoffice +1/+1** (3706/213 → 3707/214: o vínculo da ficha do painel). Store remedido,
idêntico (5908/322). Tipos 0 nos apps, 11 herdados em core; lint 0/0 · 23/5 · 2/2; build do mobile-adm verde.
**Dez dos doze bugs consertados** (cada um com teste que reprovou antes e mutante reinjetado, 20 mortos por
asserção); **dois esperam decisão humana**: a busca sem acento (`unaccent` no banco) e o material no nome do
item da ficha (`MAC-18` × `MAC-35`). Uma armadilha nova: a vigia de `useRecusaDePapel` só encerra o episódio
com uma LEITURA BOA (segundo argumento), porque o React Query apaga o erro de uma consulta sem dado enquanto
ela relê — `test/setup.ts` esquece o episódio entre os casos (import dinâmico: um estático carregaria o
client do supabase antes do `vi.mock`).

**A feature `75` (ações no pedido no app do ateliê) somou +552/+26 em QUATRO workspaces** no fecho
(core **+203/+8** · mobile-adm **+291/+15** · store **+33/+1** · backoffice **+25/+2**, remedidos em
2026-10-24 depois do QA e das lacunas da rodada 3, um workspace por vez, exit fora de pipe); os números
por workspace abaixo são da entrega, antes do Verificador e do QA (+497/+26). A entrega, medidos em
2026-10-24 um por vez, exit code fora de pipe, contra a entrada medida com a árvore parada
(`.specs/features/75-mobile-adm-acoes-do-pedido/baseline.md`, 15819/792, que bateu esta tabela):
**core +190/+8** (`core/order-actions` — o dono da escrita, com o client e o notificador injetados e o
efeito conferido por `.select('id')` —, `orders/appAction.ts`, `orders/tracking.ts` e o lembrete
`orders/charge.ts`, subido do painel), **mobile-adm +249/+15** (a porta `gravarAcao`, a trava, o aviso e
o erro em módulo, a folha no histórico, o teclado virtual, o rodapé, o cartão, o lembrete, os guardas
`escritaSoPelaPorta` e `fraseDaAcaoSoNoCore`, e `acoesComClientReal` — a recusa sobre o supabase-js
real), **store +33/+1** (`pedidoGravadoSoPeloDono`) e **backoffice +25/+2** (`lembreteNoCore` e
`useAdminOrders.delega`; **nenhuma asserção antiga tocada** — `useAdminOrders.test.ts` mudou só no
dublê, que ganhou `.select`). Functions e catalog-import remedidos, idênticos. Tipos 0 nos apps, 11
herdados em core; lint 0/0 · 23/5 · 2/2; os builds do mobile-adm e do backoffice verdes;
`packages/core/src/payment/**` sem alteração. **Sem migration.** Decisão `AD-059`. `packages/ui`
ganhou `overlayClassName?` no `SheetContent` (aditivo, B02). Probe de paridade
(`probes/01-paridade.*`): 71 `ok —` contra o banco local, com a `send-notification` servida do
worktree por `functions serve` e uma chave do Resend inválida de propósito; dois mutantes no dono
mortos pelo probe. A prova em navegador (`prova-navegador.md`) achou **dois defeitos que a suíte
aprovava**: o F5 com a folha aberta deixava um voltar morto (o teste montava um histórico que o app
nunca produz; e, consertado, os DOIS usuários da folha no detalhe voltavam duas vezes — no jsdom as
duas voltas caem na mesma entrada, no Chromium se somam) e o fundo da folha animava com "menos
movimento". Os dois com teste antes do conserto e reteste no build servido.

**O Verificador e o QA da `75` (2026-10-24)**: três rodadas do Verificador independente — a 1 FAIL por
cobertura (a folha fechando com a gravação no ar, a guarda de status cega à comparação), a 2 PASS, e a 3,
sobre os consertos do QA, FAIL por cobertura (V05: o conserto do C01 provado só no rodapé, não no
cartão; V10: "o aviso saiu?" com a leitura em erro; V12: a folha aberta com o `<body>` focado). **As três
lacunas da r3 foram fechadas com +6 casos e os mutantes reinjetados, sem rodada 4** (precedente da `72`
e da `73`). O QA (`docs/qa/reports/2026-10-24-mobile-adm-acoes-do-pedido*.md`) achou quatro bugs, todos
com teste antes e retestados em navegador: o "Tentar de novo" dizendo falha sem ir à rede depois de outra
escrita levar o pedido adiante (C01, `espera` + o desfecho `mudou` em `runAppAction`; o mutante achou que
uma retirada relida em `separating` gravaria `delivered`), o "Alterar rastreio" afirmando o aviso de
postagem que falhou (C02, `shippedNoticeSent`; `SPEC_DEVIATION` em A10), o foco caindo no `<body>` ao
fechar a folha (C03) e o botão do cartão sem o pedido no nome acessível (C04, `nomeDaLinha`). Tipos 0
nos apps e 11 herdados em core; lint 0/0 · 23/5 · 2/2; build do mobile-adm verde. **Falta o Android
real** (TalkBack, o gesto de voltar, o teclado).

**A feature `74` (Pedidos no app do ateliê) somou +635/+36 em QUATRO workspaces** no fecho (store
**+37/+2** · backoffice **+23/+1** · mobile-adm **+405/+22** · core **+170/+11**, remedidos em 2026-10-24
depois do QA); os números por workspace abaixo são da entrega, antes das rodadas 4 do Verificador e
do QA (+582/+35). A entrega, medidos em
2026-10-24 um por vez, exit code fora de pipe, contra a entrada medida com a árvore parada
(`.specs/features/74-mobile-adm-pedidos/baseline.md`, 15184/756, que bateu esta tabela):
**mobile-adm +384/+22** (os dois hooks com `lerComPapel`, a lista, o detalhe, o selo da aba, os
endereços, a troca de conta, os guardas `regraDePedidoSoNoCore` e `movimentoDosPedidos`, e
`pedidosComClientReal` — a recusa pelo `<App />` real sobre o supabase-js real), **core +142/+11**
(`orders/views`, `search`, `row`, `rowSummary`, `nextStep`, `history`, `delivery`, `list` e
`material/steps`, subidos do painel byte a byte), **store +34/+1** (`atelieClockSchema` e
`atelie_clock` em `marcacaoSoPorAcao`) e **backoffice +22/+1** (`regrasDoPedidoNoCore`, a
reexportação por `toBe`, e a cadeia da lista e das contagens de aba escrita por extenso em
`useAdminOrderList.test.ts`; **nenhuma asserção antiga tocada**). Functions e catalog-import
remedidos, idênticos. Tipos 0 nos apps, 11 herdados em core; lint 0/0 · 23/5 · 2/2;
`pnpm --filter @estrelinha/mobile-adm build` verde; `packages/core/src/payment/**` sem
alteração (`filterChips.ts` mudou no conserto B01 do QA: o rótulo de meio de pagamento veio de `core`). Uma migration (`20261024120000_74-relogio-do-atelie.sql`, a RPC
`atelie_clock`, sem tabela e sem escrita), aplicada só no local. Decisão `AD-058`. O arnês do client
real (`clientReal.ts`, nas DUAS cópias, `clientRealPareado`) ganhou `tabelas` — a resposta por tabela
ou view —, para a recusa ser provada com as linhas da cliente do outro lado. Sensor do autor: 30
mutantes na Fase 4 e 5 em `lerComPapel` na Fase 5, SHA-256 conferido, todos mortos por asserção.
Prova em navegador (`prova-navegador.md`): os quatro blocos da Início, o selo e a lista iguais ao
banco, 114 linhas sem id repetido, voltar no mesmo recorte e posição, 30 medições de layout limpas.

**O Verificador e o QA da `74` (2026-10-24)**: quatro rodadas do Verificador independente, as quatro
FAIL — por cobertura, e na 4ª por um defeito de `MAP-36` (a recusa da página seguinte perdida na
remontagem do `RequireAdmin`, D2), consertado guardando a recusa em módulo e levando "é recusa?" a
`isAccessDenied` (`core/hooks`); **a rodada 5 não correu**. O QA (`docs/qa/reports/2026-10-24-mobile-adm-pedidos*.md`)
achou três bugs, os três consertados com teste antes e retestados: o cartão aparecendo "card" (B01,
`PAYMENT_METHOD_FALLBACK` em `core`, e o rótulo lido nos três apps), o voltar do pedido buscado
perdendo a busca (B02, `useTermoDaEntrada`, só em memória) e a falha de aviso dizendo "enviado" (B03,
`buildHistory` com `NOTIFICATION_EVENT_NAMES`). **B03 muda a frase da linha de falha também no PAINEL**
e reescreveu duas asserções dele — `SPEC_DEVIATION` em `MAP-47`/`MAP-48`, a confirmar pelo usuário.

**Os dois bugs que o QA da `73` deixou para decisão somaram +32/+2** (2026-10-23, um workspace por vez,
exit code fora de pipe; functions e catalog-import não tocados): **core +20/+1**
(`situationAudience.test.ts`: o selo com dois públicos), **mobile-adm +6** (o par do material e a
linha que quebra com a fonte grande, em `RecentOrders.test.tsx`), **store +3** (o guarda
`situacaoComDonoUnico` ampliado a `apps/mobile-adm/src`, com âncora e sensor; nenhuma outra asserção
da loja tocada) e **backoffice +3/+1** (`rotulosDoPainel.test.ts`: os rótulos de status subiram para
`core/orders/labels.ts` e o painel os reexporta por referência). Tipos 0 · 0 · 0, lint 0/0 · 23/5. 8
mutantes reinjetados com SHA-256 conferido, 8 mortos por asserção. Reteste em navegador:
`docs/qa/reports/2026-10-23-mobile-adm-inicio-reteste-2.md`.

**A feature `73` (a Início do ateliê) somou +478/+22 em QUATRO workspaces**, medidos em
2026-10-22 um por vez, exit code fora de pipe, contra a entrada medida com a árvore parada
(`.specs/features/73-mobile-adm-inicio/baseline.md`, 14644/731, que bateu esta tabela):
**core +304/+8** (`orders/queue.ts`, `stats/*`, `formatPriceWhole` e os três hooks em `core/hooks`),
**mobile-adm +120/+13** (o arnês com `rpc`/`channel`, o `QueryClient`, a vigia da recusa, o puxar, os
seis blocos, a página pelo `<App />` real e o contrato com o client real), **store +64/+2** (os guardas
`overviewSchema` e `filaComDonoUnico`, e `store_overview` em `marcacaoSoPorAcao`) e **backoffice
−10/−1** — **queda declarada**: os 14 casos de `useStoreMovement`/`useOrdersRealtime` mudaram de casa
para `core` sem asserção tocada, e o painel ganhou +4 da reexportação (`toBe`). Functions e
catalog-import remedidos, idênticos. Tipos 0 nos apps; lint 0/0 · 23/5 · 2/2;
`pnpm --filter @estrelinha/mobile-adm build` verde; `packages/core/src/payment/**` com zero arquivos
alterados. Uma migration (`20261023120000_73-resumo-do-atelie.sql`, a RPC `store_overview`, sem
escrita de dado), aplicada só no local. Decisão `AD-057`. A prova em navegador
(`prova-navegador.md`) achou que **o app parava de reler depois de a rede cair e voltar** (o
`QueryClientProvider` dentro do ramo offline desligava o `onlineManager` do React Query) — consertado
com teste; e a T18 achou, pelo `<App />` real, **o laço da vigia da recusa** com o papel ainda admin —
consertado com teste. Sensor do autor: 15 mutantes nos arquivos reais da página, da vigia e do hook,
SHA-256 conferido na restauração, 15 mortos por asserção.

**O QA da `73` (2026-10-22, `docs/qa/reports/2026-10-22-mobile-adm-inicio.md` e o reteste) somou +1
no mobile-adm** (399/39 → **400/39**): com a fonte do sistema a 130 %+, o faturamento era pintado por
cima das vendas ("R$ 99.1099") e o card do mês por cima das clientes novas
(`BUG-20261022-numeros-se-sobrepoem-com-fonte-grande`). As duas grades (`MovementHero`, `MonthCards`)
viraram `auto-fit` com piso em `rem`; a régua de `MAI-28` do `MonthCards` foi reescrita com o sentido
que faltava (não afrouxada). 3 mutantes reinjetados, SHA-256 na restauração, 3 mortos por asserção.
Core, store e backoffice remedidos, idênticos; `tsc` 0 · 0 · 0; eslint 0/0 · 23/5. Toda tela nova do
programa deve ser andada também a 130 % e 200 % de fonte.

**O fecho das lacunas da r3 da `73` somou +5 no mobile-adm** (394/39 → **399/39**, medidos em
2026-10-22 um workspace por vez, exit fora de pipe): os casos de borda do puxar (`scrollY = 1` e o dedo
subindo), o esqueleto no lugar de cada número do topo, o piso de 4 px num dia de R$ 10 e o bloco
vencendo a visão em `lerDestinoDePedidos`; o resto foram asserções novas em casos existentes (o aviso
de releitura ausente na falha inicial, e `aria-busy` ausente na falha de cinco blocos). O probe ganhou
duas fixturas (a conta com pedido antigo de outro e-mail, e o 5º produto empatado no corte do 4º) e
segue 23 `ok —`. Só teste e fixtura: nenhum código de produto mudou. Core, store e backoffice
remedidos, idênticos. Autor = verificador nesta passada (a r3 era a última rodada; precedente da
`72`).

**O conserto da r2 da verificação da `73` somou +4/+1** (medidos em 2026-10-22, um workspace por vez,
exit fora de pipe): **mobile-adm 392 → 394** (o irmão de `MAI-18` para o resumo, e `MAI-22` com troca
de conta; o caso da volta da rede foi reescrito, sem mudar de contagem) e **backoffice 3643/207 →
3645/208** (`useAdminOrderList.test.ts`: a cadeia da consulta da idade por igualdade). Core e store
remedidos, idênticos. Só teste e dublê (o canal ganhou `unsubscribe`); nenhum código de produto
mudou. Os quatro sobreviventes (N15, N02, P04, N20) e o inválido N09 foram reinjetados: 5 mortos por
asserção.

> **Os tipos de `packages/core` nunca estiveram na baseline, e não são zero.** `tsc -p
> packages/core/tsconfig.json` dá 11 erros (`home/__tests__/carousel` 5, `pickHomeBanners` 1,
> `pickHomeCollections` 1, `sitemap/__tests__/urls` 2, `packages/supabase/src/client.ts` 2),
> **idênticos linha a linha** na base `feature/mobile-adm` medida num `git worktree` fora do
> repositório. Herdados; a linha *Tipos* agora os registra para a próxima feature não os ler como
> regressão.

**A feature `72` (fundação do app do ateliê) somou +147/+19 em DOIS workspaces**, medidos em
2026-10-22 um por vez, exit code fora de pipe, contra a entrada medida com a árvore parada
(`.specs/features/72-mobile-adm-fundacao/baseline.md`: store 5733/312 — a linha anterior desta tabela
estava velha em +2, pelo commit `214ae94d`): **mobile-adm 135/18, novo** (splash, guarda de rotas,
abas, sem conexão, login, recuperação por código, menu da conta, PWA e `vercel.json`, todos pela
árvore real do `<App />` sobre o `AuthProvider` real) e **store +10/+1** (`palette.test.ts` com a
régua de identidade do dono em `packages/ui`, `fontesDoAteliePareadas.test.ts` e `buttonShape.test.ts`
lendo o dono). Backoffice remedido, idêntico, **sem asserção tocada** (o `fallback` do `RequireAdmin`
é opcional). Core, functions e catalog-import não foram tocados e não foram remedidos. Tipos **0** nos
três apps, lint do app novo **0/0**, `pnpm build` verde nos três, `apps/backoffice/**` e
`packages/core/src/payment/**` sem uma linha alterada. Sem migration. Decisão `AD-056`. Prova em
navegador no build servido (`prova-navegador.md`): instalabilidade sem erro pelo próprio Chromium,
390 e 1440 sem rolagem horizontal; três defeitos de layout achados e consertados, e uma recusa falsa
sem internet (o `checkAdmin` do `AuthProvider`) achada e **não** consertada (`BL-048`) — **fechada na
Fase 6 da mesma feature**, abaixo.

**A Fase 6 da `72` (a rodada de conserto do QA, `MAF-22`..`MAF-30`) somou +64/+4 no mobile-adm e +3
no backoffice**, medidos em 2026-10-22 um workspace por vez, exit code fora de pipe, contra a entrada
da fase (mobile-adm **140/18** — os +5 dos dois consertos do ciclo de QA —, store 5743/313, backoffice
3648/207): **mobile-adm 204/22** e **backoffice 3651/207** (três casos novos em `AdminLoginPage.test.tsx`,
nenhuma asserção antiga tocada). Store remedido, idêntico; core remedido, idêntico em contagem (3507/138:
duas constantes novas em `core/auth`, sem teste próprio — elas são provadas pelos leitores). Tipos 0
nos três apps, lint do painel 23/5 e do app 0/0, `pnpm --filter @estrelinha/mobile-adm build` verde.
Sensor do autor: 19 mutantes reinjetados nos arquivos reais (SHA-256 conferido), **19 mortos por
asserção** (tabela no `tasks.md` da `72`). **O verificador independente reprovou a rodada 1** (por
cobertura: 7 sobreviventes em 28, duas provas vazias de `MAF-24`, e a corrida P3).

**O conserto r1 da Fase 6 somou +33/+1 no mobile-adm e +2/+1 no backoffice** (medidos em 2026-10-22,
um workspace por vez, exit code fora de pipe): **mobile-adm 237/23**, **backoffice 3653/208**
(`papelDaSessaoQueCaiu.test.tsx`, o `AuthProvider`, a `AdminLoginPage` e o `RequireAdmin` reais).
Store e core remedidos, idênticos. Tipos 0 nos três apps e no `tsconfig.node.json` do app, lint do
painel 23/5 e do app 0/0. 14 mutantes reinjetados (SHA-256 conferido): 13 mortos por asserção e 1
equivalente declarado (o e-mail só de espaços: `type="email"` apaga os espaços antes do `onChange`).

**O conserto r2 da Fase 6 somou +12/+1 no mobile-adm e +2/+1 no store** (medidos em 2026-10-22, um
workspace por vez, exit code fora de pipe): **mobile-adm 249/24** (`contratoComClientReal.test.tsx`, 10,
sobre o supabase-js REAL, e 2 casos no `corridasDoPapel` sobre o dublê com paridade de eventos) e
**store 5745/314** (`contaSobreviveAVoltaDaAba.test.tsx`, a `AccountPage` real sob o `AuthProvider` real
e o client real). Backoffice e core remedidos, idênticos. Tipos 0 nos três apps e no
`tsconfig.node.json` do app, lint 0/0 · 23/5 · 2/2. A r2 do verificador reprovou a r1 **contra o client
de verdade**: o dublê não emitia `INITIAL_SESSION` nem o `SIGNED_IN` da volta da aba (`L-055`).

**O fecho das lacunas da r3 da Fase 6 somou +12/+2 no mobile-adm e +3/+1 no store** (medidos em
2026-10-22, um workspace por vez, exit code fora de pipe): **mobile-adm 261/26**
(`reentradaComClientReal.test.tsx`, 6 — a reentrada da mesma conta e o "Tentar de novo" com uma
repergunta em voo, pelo provider e pelo `<App />` —, 1 vizinha de `not-admin` em
`contratoComClientReal`, e `clientRealPareado.test.ts`, 5, o guarda da cópia do arnês) e **store
5748/315** (`checkoutSobreviveAVoltaDaAba.test.tsx`, o `CheckoutPage` real sob o `AuthProvider` e o
client reais). Backoffice e core remedidos, idênticos. **Só testes e guarda**: `AuthContext.tsx` com o
mesmo SHA-256. Os mutantes X04–X07 do verificador, o defeito da r2 no checkout e dois no arnês foram
reinjetados: 7 mortos por asserção. Autor = verificador (a r3 era a última rodada), declarado no
`validation.md`. A lacuna 6 (o arnês com `autoRefreshToken: false` e o 401 sem régua) é `BL-049`.
O guarda `originZipNotRead` do **painel** acusou o mock de settings do checkout da loja — mais um caso
de guarda de um app varrendo o outro.

> **`packages/auth`: `loading` só muda na PRIMEIRA resolução e na TROCA DE IDENTIDADE — e a loja
> depende disso.** `CheckoutPage` e `AccountPage` desenham "Carregando..." no lugar da página enquanto
> `loading` é verdadeiro; piscá-lo desmonta a página e leva o Brick do cartão e o que a cliente
> preencheu. A r1 tinha feito o papel `unknown` ser reperguntado em todo evento de auth **pondo
> `loading`**, e o supabase-js emite `SIGNED_IN` a cada volta da aba: com o papel de uma cliente
> falhando uma vez (3G), o checkout se desmontava a cada troca de aba. Agora o evento do MESMO usuário
> já presente só repergunta o que falta (o papel `unknown`, o cadastro que estourou o teto), sem tocar
> em `loading`; o "Tentar de novo" é a única exceção, e devolve `loading` ao terminar. **O
> `INITIAL_SESSION` sem sessão é ignorado**: o client o emite com `null` também quando a leitura
> FALHA, e obedecê-lo levava ao Login (app e painel) quem tem a sessão salva. Quem decide é a leitura
> do provider (`{ error }` ⇒ `unknown`). O logout de verdade (`SIGNED_OUT`, sessão ausente) continua.
> A prova é contra o supabase-js real (`apps/mobile-adm/src/test/clientReal.ts` e a cópia da loja).

> **A corrida P1 do `packages/auth` está CONSERTADA, e ela existia antes da `72` — no painel também.**
> A resposta da consulta do papel que chegava depois de a sessão cair (logout em outra aba, token
> revogado) promovia a admin a conta que já tinha saído, e a `AdminLoginPage` a levava ao painel. O
> `AuthProvider` agora numera cada resolução (`geracao`) e toda conclusão — sucesso, falha ou teto —
> só grava se ainda for a vigente; a mesma régua fecha a P3 (o teto de um "Tentar de novo" apagando um
> `admin` conferido). O sensor do conserto achou mais dois defeitos no código de antes, também
> consertados: a leitura da sessão que respondia `{ error }` virava "sem sessão", e a que lançava na
> hora não gravava estado nenhum.

> **O que mudou em `packages/auth` (API, aditiva)**: `useAuthContext()` ganhou `adminStatus:
> 'admin' | 'not-admin' | 'unknown'` e `retryAdminCheck()`; `isAdmin` continua, e é
> `adminStatus === 'admin'`. `unknown` é "não sei": a consulta do papel FALHOU (antes virava `false`,
> a `BL-048`) ou não respondeu no teto de `ADMIN_CHECK_TIMEOUT_MS` (8 s, exportado). A leitura
> inicial da sessão tem o MESMO teto, e na abertura ele é **um só** para a sessão e o papel juntos.
> `RequireAdmin` ganhou `unknownFallback` (opcional): sem ele, desenha a frase do painel com "Tentar de
> novo"; nunca o `Navigate` ao login, que levaria à recusa falsa. A frase mora em `@estrelinha/core/auth`
> (`ACCESS_UNCHECKED`, "Não consegui conferir seu acesso."), lida pelos dois apps. `AdminLoginPage` do
> painel passou a dizê-la no `unknown`, com uma vizinha provando que `not-admin` ainda recebe a recusa.
> **Quem lê `isAdmin` sozinho trata `unknown` como "não é admin"** — é o comportamento de antes, e é
> por isso que a mudança é aditiva; tela que DECIDE recusar tem de olhar `adminStatus`.

> **A verificação independente da `72` REPROVOU a rodada 1 por cobertura** (25 mutantes, 2
> sobreviventes, nenhum defeito de produto), e o conserto somou **+8/+1 no mobile-adm** (118/17 →
> 126/18): o ícone de cada aba provado contra o par aba → ícone **escrito por extenso** (derivar de
> `TABS` deixaria passar a troca dentro de `TABS`), a troca de conta sem `SIGNED_OUT` que é o único
> estado em que o `!authLoading` da recusa decide, e `scaffold.test.ts` (`MAF-03`: o script da raiz, a
> porta 8084 e a `VITE_BACKOFFICE_URL` no `env` do Turbo). Os mutantes M24 (ícone apagado, ícones
> trocados em `TABS`, ícone da aba vizinha no `TabBar`) e M06 foram reinjetados nos arquivos reais,
> SHA-256 conferido: todos mortos por asserção. Store e backoffice remedidos, idênticos.

> **A rodada 2 reprovou de novo por cobertura** (18 mutantes, 3 sobreviventes, nenhum defeito de
> produto), e o conserto somou **+2 no mobile-adm** (126 → 128). N9: um `<a>` sem `href` com o texto
> do link passava, porque a ausência era procurada por `queryByRole('link')` e um `<a>` sem `href`
> não tem papel de link. A régua passou a ser o texto e a tag. N5: a env só com espaços não tinha
> caso. N12: `scaffold.test.ts` não conferia que o workspace `@estrelinha/mobile-adm` existe, e
> `pnpm --filter` com nome sem correspondência sai com 0. Os três foram reinjetados nos arquivos
> reais e morreram por asserção.

> **A rodada 3 reprovou por cobertura** (21 mutantes, 6 sobreviventes, nenhum defeito de produto) e
> fechou as 3 iterações. O usuário mandou ajustar as lacunas, e o conserto somou **+7 no mobile-adm**
> (128 → 135), com o mesmo arnês das rodadas (alvo que não existe é mutante inválido, SHA-256 na
> restauração): a gravação da senha que falha não leva à Início (S09, o que importava: o código já
> abriu a sessão no passo 2), `navigateFallback` e `autoUpdate` com régua (S15, S21), a splash
> segurando a abertura também em `/login` (S05), o toque duplo em "Sair" (S11), a região viva da tela
> sem conexão (S04) e o rodapé sem controle nenhum sem a env (H1). Os 7 reinjetados morreram por
> asserção. O caso do toque duplo reprovou na primeira escrita por **método**: dois cliques dentro do
> mesmo `act` não são o que um celular entrega, porque o React aplica o update de um evento discreto
> antes do próximo.

**A feature `71` (visitas únicas no Dashboard) somou +673/+28 em QUATRO workspaces**, remedidos no
fecho (2026-10-22, um workspace por vez, exit code fora de pipe, `--testTimeout=20000` sem o `--`)
contra a **entrada medida com a árvore parada** (`.specs/features/71-visitas-unicas-no-dashboard/baseline.md`:
13677/673 — a linha anterior desta tabela estava velha em +1 no store, pelo commit do balão do
WhatsApp): **core +93/+5** (`core/time` e `core/visits`), **functions +67/+2** (`_shared/rateLimit.ts`,
movido da `checkout` sem queda, e a function `visit`), **store +376/+13** (o guarda da migration, o
contador e os guardas novos) e **backoffice +137/+8** (o bloco "Movimento da loja", o canal único de
pedidos, o `StatCard` com esqueleto e ⓘ, o Dashboard pela página real e o item "Abrir a loja sem
contar"). Catalog-import não foi tocado e foi remedido, idêntico. **Nenhuma queda**: nenhum arquivo de
teste saiu, e os casos do limitador por IP mudaram de casa com a reexportação provada por `toBe`. Do
total, +68 vieram depois da entrega (14287 → 14355: a régua de `store_clock` que fechou a G9 da r3, os consertos das verificações r1 e r2 e os dois do ⓘ achados na
prova de ponta a ponta). **Lint caiu para 25/7** (o painel de 24/5 para 23/5: o `(sum, o: any)` de
`revenueToday` saiu com os cards de "hoje"), tipos **0** nos quatro projetos, `packages/core/src/payment/**`
com zero arquivos alterados. Uma migration (`20261021120000_71-visitas-unicas.sql`), sem escrita de
dado, aplicada só no banco local. Decisão `AD-055`. Verifier independente em **três rodadas**, a
terceira **FAIL por uma lacuna de cobertura (G9)**, sem defeito de produto aberto — ver *Estado
conhecido*.

> **O guarda de RPCs da `67` (`marcacaoSoPorAcao.test.ts`, suíte da LOJA) reprovou duas vezes, e
> foi o guarda certo nas duas**: ele compara por igualdade a lista de RPCs chamadas em `apps/**`, e a
> `71` passou a chamar `record_store_visit`/`store_clock` (pela function) e `store_movement` (pelo
> painel). As três entraram na lista literal, com `it.each` conferindo o `create function` na
> migration. **Toda RPC nova chamada pelo painel ou por uma function quebra este guarda** — e é por
> isso que o gate de uma feature do painel inclui a suíte da loja.

> **A prova em navegador achou que o Playwright é recusado pelo próprio filtro de robô**
> (`navigator.webdriver` verdadeiro e `HeadlessChrome` no UA): sem neutralizar os dois, a prova mede
> **zero** visitas — e convida alguém a afrouxar o filtro. A prova registra o par: sem neutralização,
> zero chamadas no cliente e `robô` na function chamada direto. Achou também que o **banco local**
> guarda `image_url` de seções da Home no Storage **hospedado**: abrir a Home local faz GETs públicos
> de imagem lá. Desde então a prova bloqueia `*.supabase.co` por rota.

**O menu da conta na sidebar do painel (2026-10-21, fora de feature) somou +18/+1 no backoffice**
(3493/198 → 3511/199): `AccountMenu.test.tsx` novo, mais os casos do rodapé em `AdminLayout.test.tsx`
e `navItems.test.ts`. Store remedido, idêntico (5349/299). Tipos 0, lint do painel 24/5, sem mexer.

**A feature `70` (o sitemap servido de dentro da Vercel) somou +32/+1**, medidos em 2026-10-20 um
workspace por vez: **core +32/+1** (`core/sitemap/serve.ts`, os 30 casos da function `sitemap`
mudaram de casa mais 2), **store +36/+2** (`server/sitemap.ts` com erro em cada tabela e a régua de colunas por comportamento, o guarda do `turbo.json`, o gerador do `robots.txt` executado
de verdade com o par positivo, `robotsSource` reescrito) e **functions −36/−2** — **queda
declarada**: os 34 casos da function `sitemap` reaparecem em core e store, e o `wiringResolve` perde
os 2 dela. O XML servido pela função foi comparado com o da function antiga contra o banco local:
**idêntico** (`cmp`, 2.327 `<loc>`, 3.735 `<image:loc>`). Decisão `AD-054`.

**A feature `69` (o `<head>` servido de dentro da Vercel) somou +273/+13**, medidos em 2026-10-19
um workspace por vez, exit code fora de pipe: **core +266/+9** (`core/page`: classificação,
`servePage`, `applyHead`, `resolveCategoryRoute` movida, `productPageImages`, e o sitemap com
imagens), **store +91/+5** (a função `api/page`, a leitura do shell do build, `rotasDeApp`, `paginasFixasServidas`,
`categoryFallbackSchema`, `vercelRedirects` reescrito; −12 de `resolveCategoryRoute`, que subiu) e
**functions −84/−1** — **queda declarada**: os 90 casos da `product-page` reaparecem em
`core/page/__tests__` (78 portados; os 12 restantes mediam o cache e a busca do shell e o grafo Deno
dela, que deixaram de existir), −2 do `wiringResolve` (derivado por function) e +8 do sitemap.
Backoffice e catalog-import remedidos, idênticos. Lint **26/7**, tipos **0** nos quatro projetos,
`pnpm build` verde (gera `apps/store/.server/page.mjs`), `packages/core/src/payment/**` com zero
arquivos alterados e `shoppingParity.test.ts` com zero linhas. Uma migration
(`20261020120000_69-categoria-inativa.sql`, a RPC `category_fallback`, sem escrita de dado).
Decisão `AD-053`. **Executada por cinco agentes em paralelo** (pedido do usuário), com propriedade
de arquivo disjunta escrita no `tasks.md`: a árvore foi uma só, e o único choque foi um guarda de
`core/menu` acusando o literal de coleção num teste de outra frente — pego pela suíte inteira, não
pela do arquivo.

**A feature `68` (SEO por variação) somou +202/+4 em QUATRO workspaces**, medidos em 2026-10-19 um
por vez, exit code fora de pipe, contra a entrada medida com a árvore parada (que bateu exatamente a
linha anterior, 13151/654): **core +105/+1** (`core/seo/variant.ts` — a regra de quais opções têm
página, `productHead` e `publicOptionMarks` —, `variantPath`, `ProductGroup`/`withPageUrl` e o sitemap
com as `<loc>` de opção), **functions +33** (a canônica servida e o `<head>` de opção na
`product-page`; variações e marcações paginadas no `sitemap`), **store +58/+3** (a página real com
`productHead`, o guarda `paginaDeOpcaoComDonoUnico` e o `sitemapCheckWorkflow`) e **backoffice +6**
("Tem página própria no Google"). Lint **26/7**, tipos **0 · 0 · 0**, `pnpm build` verde,
`packages/core/src/payment/**` com zero arquivos alterados e `shoppingParity.test.ts` com **zero
linhas** alteradas. **Sem migration.** Decisão `AD-052`.

> **O lint pegou duas coisas que a suíte aprovava, e as duas foram consertadas pela causa.** Um
> `?? []` recriado a cada render virou dependência do `useMemo` novo do painel (warning de
> `exhaustive-deps`), e o teste que prova o SVR-14 com o `PageViewTracker` real morava em
> `pages/__tests__` importando de `app/` — fronteira FSD ao contrário. Ele mudou para
> `app/__tests__`, que é a camada que compõe página e rastreador.

> **A prova servida achou que o ambiente local não sabia servir a `product-page`**, e o desenho
> vale como receita (`.specs/features/68-seo-por-variacao/prova-servida.md`): dentro do container,
> `localhost` é o próprio container (502 no shell), e o Vite recusa `Host: host.docker.internal`
> (403). O shell estático numa porta própria + `supabase functions serve --env-file` com
> `STORE_PUBLIC_URL=http://host.docker.internal:<porta>` dá a mesma origem ao sitemap e à canônica.
> O feed foi provado **idêntico byte a byte** contra o HEAD servido de um `git worktree`.

> ⚠️ **Um hit real saiu para o GA4 durante a prova** (uma requisição, `tt=internal`, de
> `localhost`): a interceptação cobria `*google-analytics.com` e o `gtag` envia para
> `analytics.google.com`. **Intercepte por caminho (`**/g/collect*`), nunca por domínio.** Em
> desenvolvimento a loja não mede — o `page_view` só existe num build (`vite preview`).

**A feature `67` (os filtros enxergam as variações) somou +462/+20 em TRÊS workspaces**, medidos em
2026-10-18/19 um por vez, exit code fora de pipe, contra a entrada medida com a árvore parada (que
bateu exatamente a linha anterior, 12689/634): **core +82/+2** (`match.ts`, `suggest.ts` e a faceta
delegando, com os casos da `66` intocados), **store +218/+5** (o mapper, a listagem pela variação, o
card, e os guardas `variantFiltersSchema`, `marcacaoPorOpcaoComDonoUnico` e `marcacaoSoPorAcao`) e
**backoffice +162/+13** (o bloco "Pelas variações", a fila de sugestões, as contagens, os termos e o
`AdminLayout` sem `overflow`). Lint **26/7**, tipos **0 · 0**, `pnpm build` verde,
`packages/core/src/payment/**` com zero arquivos alterados. Uma migration
(`20261019120000_67-filtros-nas-variacoes.sql`), sem escrita de dado. Decisão `AD-051`.

> **A prova em navegador achou quatro defeitos de UI que a suíte aprovava, e um deles era do painel
> inteiro**: a barra de Aprovar da fila era `sticky` e ficava a 14 mil pixels, porque o `<main>` do
> `AdminLayout` tinha `overflow-auto`. Com ele, **nenhum** `sticky` do painel grudava de verdade.
> Tirá-lo expôs três estouros horizontais em 390 que já existiam e estavam escondidos.

> **A verificação independente reprovou a rodada 1 por cobertura** (64 mutantes, 4 sobreviventes, e o
> guarda prometido pelo Success Criterion SC5 não existia). A rodada 2 aprovou, mas mostrou que o
> guarda novo, escrito por regex, deixava passar 14 de 26 formas de escrita: tabela em variável, alias
> de import, vírgula final, porta nova não listada. A rodada 3 o reescreveu sobre a AST do TypeScript,
> com 25 de 26 mutantes mortos (o sobrevivente é o inverso, que tem de passar). **Régua de uso por
> regex mede a grafia, não a chamada.**

**A feature `66` (filtros de produto) somou +373/+19 em TRÊS workspaces**, medidos em 2026-10-18 um
por vez, exit code fora de pipe e `--testTimeout=20000` nos dois apps, **contra a entrada medida com a
árvore parada** depois do commit da `65` (store 4795/278 · backoffice 3206/176 · core 2826/116 ·
functions 977/22 · catalog-import 512/23 — a linha anterior desta tabela estava velha em core,
functions e backoffice): **core +103/+4** (`core/filters`: regra, facetas, URL e a pureza do módulo),
**store +151/+6** (o guarda da migration, `filtroSemTag`, os blocos do painel, a URL na categoria e a
busca) e **backoffice +119/+9** (as telas de filtros, a marcação em massa, os blocos no produto e na
categoria). Lint **26/7**, tipos **0 · 0**, `pnpm build` verde, `packages/core/src/payment/**` com
**zero** arquivos alterados. Uma migration (`20261018120000_66-filtros-de-produto.sql`), sem escrita
de dado. Decisão `AD-050`.

> **A verificação independente reprovou três rodadas, sempre por cobertura e nunca por defeito de
> produto**, e o fecho foi decisão do usuário (`validation.md`). 52 + 23 + 37 + 2 mutantes nos
> arquivos reais. Os sobreviventes tinham as assinaturas de sempre: a fixture "cheia" movendo as
> duas pontas do preço (mexer só no máximo nunca chegava à URL), o token de sequência declarado em
> três hooks e provado em nenhum, e o limite de 8 do "Ver todos" testado só com 10.

> ⚠️ **Ordem de publicação**: a vitrine e a árvore de categorias pedem as tabelas novas por embed.
> A migration precisa ser aplicada **antes** do bundle — push da migration sozinho, depois o código.

**A feature `65` (convite para o Instagram na Home) somou +63/+3 no store**, medido em 2026-10-18 com
exit code fora de pipe e `--testTimeout=20000`: **4732/275 → 4795/278** (o convite, as cores da marca
do terceiro em `shared/config`, e os dois consertos que a QA dela achou — a loja em branco sem
armazenamento e o rodapé estourando em 768). Lint do store em **2/2** e tipos em **0**, sem mexer. Os
outros quatro workspaces não foram tocados e não foram remedidos.

**A feature `64` (lista de categorias na Home) somou +166 em TRÊS workspaces**, medidos em
2026-10-12 um por vez, exit code fora de pipe e `--testTimeout=20000` nos dois apps, **contra a
entrada** (core 2757/114 · store 4672/273 · backoffice 3145/174, que bate a linha anterior desta tabela;
core medido com a árvore parada, store e backoffice descontando os casos que o próprio lote 1 já
tinha escrito quando a medição correu): **core +49/+1** (`categoryList.ts`, `ordinalF`, a resolução por tipo e o catálogo
invertido), **store +60/+2** (o guarda `categoryListSchema`, o widget `category-list` com as setas, o
`title` na leitura e o `HomeRenderer` invertido) e **backoffice +57/+2** (o editor, a recusa pelo
`HomeSectionEditor` real, o rascunho de oito colunas, a bandeja invertida e o resumo da linha).
Functions e catalog-import não foram tocados e foram remedidos — idênticos. Lint **26/7**, tipos
**0 · 0**, `pnpm build` verde, `packages/core/src/payment/**` com **zero** arquivos alterados. Uma
migration (`20261012120000_64-lista-de-categorias.sql`), sem escrita de dado.

> **A prova em navegador achou um defeito de layout que a suíte inteira aprovava**, e ele custou
> **+1** no store: com o `<ul>` em 100% do rolador, o recuo final ficava fora da área rolável — em
> 1440 com 8 itens a seta "Próximas" rolava **8px**, e em 390 o último círculo encostava na borda.
> jsdom devolve 0 para toda medida de layout, então os 33 casos do widget passavam. O teste novo
> exige `w-max min-w-full` e reprovou antes do conserto; o número de verdade foi remedido no bundle
> servido (56px em 1440, 16px de recuo em 390).

> **A-14 provada, não suposta**: a arte circular transparente (PNG RGBA) passa pelo canvas do painel,
> vira WebP no Storage e chega à loja com **alfa 0 nos cantos** — no objeto gravado e nas rendições
> de 104 e 208, decodificadas no navegador. O `title` foi provado gravando **pelo painel**, não só
> pelo probe HTTP: o `curateSection` lista as colunas à mão (`AD-012`).

> **A verificação independente APROVOU, com 42 mutantes nos arquivos reais: 41 mortos por asserção,
> 0 por compilação, 1 sobrevivente** — e o sobrevivente é a lição de sempre: o comentário de
> `categoryListRefusal` afirmava que contar o título CRU (como o `check` do banco) era necessário, e
> trocar por `.trim().length` deixava a suíte verde, porque nenhum caso tinha espaço no fim. As
> lacunas que ela ranqueou viraram **+5 casos** (o título com espaço final, a tipografia do título e
> do rótulo no celular e no `md`, o `accept` do upload e a coleção **desativada** pulada também na
> loja), cada um provado por mutante reinjetado — 5 mortos por asserção. A precedência título >
> `alt` > nome, que vem do `design.md` e não da letra da spec, virou `SPEC_DEVIATION` declarado na
> `LCT-02`.

**A feature `63` (retirada no escritório) somou +161 em QUATRO workspaces**, medidos em 2026-10-11
um por vez, exit code fora de pipe e `--testTimeout=20000` nos dois apps, **contra a entrada medida
com a árvore parada** (core 2704/112 · store 4605/271 · backoffice 3119/173 · functions 923/19 ·
catalog-import 512/23 = 11863/598): **core +51/+2** (`pickup.ts`, o `denoReach` de `shipping`, a
pré-condição, a jornada e o selo), **store +56/+2** (`entities/pickup`, calculadora, checkout, payload,
pedido, resumo), **backoffice +26/+1** (o interruptor, a página do pedido de retirada com o
`MelhorEnvioTab` real, o próximo passo) e **functions +28/+1** (a recusa da retirada forjada no
`checkout`, o guarda `retiradaSemEtiqueta`, o e-mail de retirada pelo render **e** pelo motor).
Catalog-import não foi tocado e foi remedido. Lint **26/7**, tipos **0 · 0 · 0**, `pnpm build` verde,
`packages/core/src/payment/**` com **zero** arquivos alterados. Decisão `AD-049`.

> **A verificação independente da `63` REPROVOU a rodada 1 por cobertura (7 mutantes sobreviventes
> em 45, nenhum defeito de produto), e o conserto somou +23** — medidos em 2026-10-11 um workspace por
> vez: **store 4661 → 4671** (+10: a pré-seleção com a cotação chegando DEPOIS da configuração, os
> dois grupos nomeados, o cupom de frete grátis com a retirada, e o `422 pickup_unavailable` pela
> página real e pelo hook), **core 2755 → 2757** (`enabled` ausente ou nulo não liga) e **functions
> 951/20 → 962/21** (a prévia de e-mail de um pedido de retirada com `order_id`, e a recusa da
> `melhor-envio` extraída para `melhor-envio/pickupGate.ts`, puro e com teste de unidade, com o
> guarda de fonte passando a medir a FIAÇÃO — a linha inteira chega ao portão e o `if` decide só por
> ele). Os 7 sobreviventes foram reinjetados nos arquivos reais e morreram por asserção. **O conserto
> também mudou comportamento**: a recusa da retirada pelo servidor deixou de cair no toast genérico
> ("Tente novamente", que nunca passaria) e passou a desfazer a escolha, reabrir o bloco Entrega e
> pedir outra forma de envio. Backoffice e catalog-import remedidos, idênticos; lint 26/7; tipos 0 · 0.

> **A rodada 2 da verificação REPROVOU de novo por cobertura (28 mutantes, 7 sobreviventes, nenhum
> defeito de produto), e o conserto somou +8**: **functions 962 → 969** e **store 4671 → 4672**. O
> achado é a lição da `48` repetida: extrair a decisão para `pickupGate.ts` **moveu** o ônus de
> RET-15 para o guarda de fonte, e ele aceitava a recusa montada **sem `return`**, o resultado em
> `let` reatribuído antes do `if`, e a API chamada por `globalThis.fetch` — três formas que ainda
> comprariam a etiqueta. RET-12 só era provada **sem sessão**. Os 7 reinjetados nos arquivos reais
> morreram por asserção; nenhum código de produto mudou. Medido um workspace por vez: core, backoffice
> e catalog-import idênticos; lint 26/7; tipos 0 · 0; `payment/**` intocado.

> **A rodada 3 REPROVOU por cobertura só no guarda de RET-15 (7 formas novas, G01–G07), e o
> conserto foi de FORMA, não de régua: `handleCreate` virou `melhor-envio/handlers.ts` (`AD-004`).**
> functions **969/21 → 974/22**: `+10` no teste de unidade do handler, `−5` no guarda de fonte, que
> encolheu de 18 para 13 casos porque o que ele tentava enumerar agora é medido executando. Os 7
> sobreviventes (G01–G07), mais N01, N07, F05, F06, a leitura sem a coluna e dois mutantes da fiação
> do `index.ts`, foram reinjetados nos arquivos reais (SHA-256 conferido na restauração): **14 mortos
> por asserção, zero por compilação**. Comportamento dos pedidos dos Correios idêntico (mesmas
> chamadas, mesma ordem, mesmos corpos, mesma gravação — pinados no teste). Boot local conferido:
> `create` sem header 401, `create` de admin com pedido inexistente 404 vindo do handler novo,
> `quote` 200 com PAC e SEDEX. Os outros quatro workspaces remedidos, idênticos.

> **A linha anterior desta tabela estava velha em core (+42/+3) e store (+46/+1)** quando a `63`
> abriu — o trabalho da `62` não tinha sido remedido aqui. O delta acima é contra a entrada medida.

> **PROVA EM NAVEGADOR da `63`** (2026-10-11, Chromium, dev server em :8082, **Supabase local de pé**,
> cotação real do Melhor Envio, com rodadas extras interceptadas para dois serviços e para a falha):
> RET-01..11 e RET-19 passam em **390×844 e 1440×900**. Zero rolagem horizontal; a linha do
> escritório embrulha dentro da caixa (3 linhas em 390, 2 em 1440); a retirada nunca é
> pré-selecionada; trocar para CEP de SP desfaz a escolha; RET-04 com a cotação em 500 mostra a
> retirada. **Pedido real gravado** (`0181`, convidada, PIX): `shipping_service_id = 'retirada'`,
> custo 0, sem datas de transportadora, total = itens − desconto PIX — e depois **apagado** do banco
> local. Fora da `63`: o `mercado-pago` local responde **503 BOOT_ERROR** (`Failed resolving types`
> em `core/pricing/index.ts`, o `import type` de `@estrelinha/supabase/types` — arquivos não tocados
> aqui), e a página do produto mostra "Últimas unidades — apenas 3 restantes", que este arquivo
> proíbe.

> **Medição anterior, sem Verifier e sem prova em navegador.** 31 mutações nas
> fases 3–4 (T07–T13), 33 execuções (duas medidas também na suíte do consumidor), reinjetados nos arquivos reais com restauração conferida byte a byte: **33
> mortes por asserção, zero por compilação, zero sobreviventes** — autor = verificador, então isso
> reduz o viés e não o elimina. Na medição do lote, a suíte de `core` reprovou **1 caso por
> `Test timed out in 5000ms`** (`menu.test.ts`, varredura de disco) e passou inteira remedida sozinha.

**A feature `61` (Google Analytics 4 na loja) somou +559 em QUATRO workspaces**, medidos em
2026-10-06 um por vez, exit code fora de pipe e `--testTimeout=20000` nos dois apps: **store
4311/258 → 4559/270**, **backoffice 3026/166 → 3119/173**, **core 2554/102 → 2662/109** e
**functions 798/15 → 908/18**. Catalog-import não foi tocado e foi remedido. Lint em **26/7** (a
feature acrescentou 6 warnings e os consertou no fecho), tipos **0 · 0**, `pnpm build` verde,
`packages/core/src/payment/**` com **zero** arquivos alterados. Decisões `AD-046` e `AD-047`.

> **A verificação independente REPROVOU duas rodadas e aprovou a terceira — por cobertura, nunca
> por defeito de produto.** 79 + 28 + 28 mutantes nos arquivos reais. Os sobreviventes tinham a
> assinatura de sempre: a seção nova da política reescrita para dizer o OPOSTO passava (o guarda
> contava seções, não lia o corpo — `L-036` em texto jurídico); o dublê de erro de rede não tinha a
> forma do Deno, que põe a URL **com a chave** na mensagem, então "nenhum log contém a chave" era
> verdadeiro nos dois mundos; e o recuo do próprio hook (`?? DEFAULT`) era provado só por uma função
> vizinha.

> **A prova em navegador achou um defeito que NÃO é de código**: a propriedade `G-SQL517XDQZ` tem a
> medição otimizada de histórico ligada, e numa SPA ela soma um `page_view` a cada troca de rota
> (8 para 6 páginas). Desligá-la é passo de operação **obrigatório antes de ligar a medição** —
> Apêndice B da spec.

**A feature `60` (a marca no cabeçalho dos e-mails) somou +145 em DOIS workspaces**, medidos em
2026-10-05 um por vez, exit code fora de pipe e `--testTimeout=20000` nos dois apps, **contra a
entrada medida com a árvore parada** e não contra a linha anterior desta tabela: **functions
677/14 → 798/15** (`brandHeader.test.ts` novo, os 17 eventos em `render.test.ts`, a fiação em
`dispatch`/`handlers`) e **store 4287/257 → 4311/258** (`emailBrandImage.test.ts` novo, 15; +7 em
`authEmailTemplates`, +2 em `vercelRedirects`). Backoffice, core e catalog-import não foram tocados
e foram remedidos. Tipos 0 · 0, `pnpm build` verde, `packages/core/src/payment/**` com zero arquivos
alterados. Verificação independente: **23 mutantes nos arquivos reais, 23 mortos por asserção**.

> ⚠️ **A linha anterior desta tabela estava velha em QUATRO workspaces quando a `60` abriu** —
> store +72/+6, backoffice +2, core +8, functions +3 — e o lint em **+1 warning** no painel
> (`react-refresh/only-export-components` em `features/settings/ui/SalesSection.tsx`). Tudo isso
> veio dos commits das parcelas do cartão (`45a8845`, `bef4efa`, `c5bb8bc`), feitos sem a tabela
> ser remedida. A `60` não tocou `apps/backoffice`; o warning é dela só no sentido de que foi ela
> quem mediu.

**A feature `59` (Minha Conta V2) somou +525 em TRÊS workspaces**, medidos em 2026-10-04 um por
vez, exit code fora de pipe e `--testTimeout=20000` nos dois apps: **store 3791/232 → 4215/251**,
**core 2459/97 → 2546/102** (`situation`, `repix`, `journey`, `tracking` e a pureza de `core/orders`)
e **functions 660/14 → 674/14** (`get-order` com eventos, `persistirConveniencias`). Backoffice e
catalog-import não foram tocados e foram remedidos — idênticos. Lint em **26/6** e tipos em
**0 · 0**; `packages/core/src/payment/**` com **zero** arquivos alterados.

> ⚠️ **Cerca de 13 dos +424 do store são de OUTRA sessão** que editava o checkout na mesma working
> tree durante esta feature (`CardPaymentBrick`, `CheckoutPage`). A linha da tabela é a árvore
> medida; o delta atribuível à `59` é ~+411. Quem abrir a próxima feature mede de novo.

> **A verificação independente REPROVOU a rodada 1 e aprovou a rodada 2.** O achado nº 1 foi o de
> sempre — a asserção ao lado do ponto: apagar a releitura do pedido depois de enviar o código do
> material (`MAT-05`) deixava 92 testes verdes, porque o único caso conferia o campo esvaziar. A
> régua nova é o **estado do cache** (`isInvalidated`), nos dois sentidos: a chave certa vira e a
> vizinha não. Rodada 2: 58 mutantes, 57 mortos por asserção; o sobrevivente era um ponto cego
> **herdado do guarda copiado** (`motion-reduce:` qualquer na linha valia como par) e foi fechado.

> **Dois guardas antigos mudaram de ENDEREÇO, não de régua.** `pagamentoComDonoUnico` e
> `numeroDoPedidoComDonoUnico` exigiam o link do PIX e o formatador dentro de `AccountPage.tsx`; a
> conta virou lista + pendências e quem escreve isso são os widgets. As réguas passaram a ler os
> widgets **e** a exigir que a página os monte — só a primeira metade seria "peça certa, endereço
> errado".

**A feature `58` (pagamento PIX em rota própria) somou +281 em QUATRO workspaces**, com a SAÍDA
medida em 2026-09-22 um por vez, exit code fora de pipe e `--testTimeout=20000` nos dois apps:
**store 3548/223 → 3787/232** (+239/+9 — o formatador do número, os três guardas novos, a máquina do
PIX, as duas telas e a rota), **core 2432/96 → 2459/97** (+27/+1 — `core/orders/format.ts` e a rota
nova em `NON_INDEXABLE_PATHS`), **functions 652/14 → 660/14** (+8 — a régua de `createOrder`
**invertida**: ela exigia `/^NP-/` e passou a exigir que a function **não mande** `order_number`) e
**backoffice 3017/166 → 3024/166** (+7 — a busca aceitando `#0244`, `0244` e `244`). Catalog-import
não foi tocado e foi remedido, idêntico. Lint em **26/6** e tipos em **0 · 0**, sem mexer;
`pnpm build` verde nos dois apps, e `packages/core/src/payment/**` com **zero** arquivos alterados.

> ⚠️ **O "antes" desta linha é a tabela acima, não uma medição da sessão.** As fases 1 e 2 correram
> em outra sessão e o que foi medido com a árvore parada no começo da fase 3 é a **entrada dela**
> (store 3716/230 · core 2459/97 · backoffice 3024/166 · functions 660/14 · catalog 512/23) — que
> bateu exatamente o que as fases 1 e 2 tinham deixado. O delta de **+227** é `saída − tabela`; o
> delta que esta sessão mediu ponta a ponta é o **+17 do store** da fase 3.

> **A fase 3 sozinha somou +17 no store, e dentro dela há uma queda de 24 declarada.**
> `PixPayment.test.tsx` foi apagado com o componente, e os 24 casos dele reaparecem — com folga — em
> `usePixPayment.test.tsx` (24), `PaymentProgress.test.tsx` (21) e `PixSurface.test.tsx` (45), todos
> escritos na fase 2, **antes** de o arquivo antigo sair. A aritmética fecha:
> `19 (guarda novo) − 24 + 9 + 6 + 5 + 2 = +17`.

> **A VERIFICAÇÃO INDEPENDENTE REPROVOU a primeira entrega, e os +54 do store entre 3733 e 3787 são
> o conserto** — 21 mutações na rodada 1, **5 sobreviventes**, e um CTA morto em produção.
>
> **O achado nº 1 é o defeito que esta própria feature existe para remover.** "Entrar com código" em
> `/pedido/:id/pagamento` chamava `openAuth()`, que só liga uma flag: os **dois** lugares que
> renderizam o `AuthOverlay` são o `StoreLayout` e o `CheckoutPage`, e a rota nova está fora dos
> dois. A convidada com token expirado via um botão que não fazia nada — o mesmo `Success Criteria`
> que a spec escreve ("nenhuma tela do fluxo mostra um CTA que não faz nada"). O teste não via
> porque **dublava `@/features/auth` inteiro** e media a chamada da função, não o overlay; e um
> comentário no código afirmava que o widget da recusa tinha teste próprio — **não tinha**. O
> conserto trocou o dublê pela **store real** e provou por mutação **de posição**: mover o overlay
> para dentro do ramo da recusa (mutação sintaticamente válida) também morre.
>
> Os outros quatro sobreviventes têm a assinatura de sempre — a asserção verdadeira nos dois mundos:
>
> | Mutante | O que passava | Consequência real |
> | --- | --- | --- |
> | `PIX_SLOW_MS` 8000 → 30000 | 5 arquivos verdes: o teste importava a própria constante e media contra ela | acima do timeout de 15s a linha "a espera está mais longa" **nunca aparece**, e a tela vai de progresso silencioso direto para a falha |
> | `podePagarComPix` alargado | as duas suítes de página verdes | `rejected`/`refunded` passariam a exibir "Pagar com PIX". O módulo foi extraído **por ser regra pura com dois leitores** e nasceu sem arquivo de teste |
> | `layout.ts` sem a extensão `.ts` | functions 14/14 e os dois guardas do store verdes | **worker de e-mail morto antes da primeira linha** — a régua de extensão nomeava `vars.ts` e lia **um** dos dois importadores (`L-035` de novo) |
> | a trava `jaConcluiu` apagada | tudo verde | limpeza e `markCartRecovered` repetindo |
>
> **E a rodada 2 procurou o buraco que o CONSERTO criou** — a lição da `48`, de que consolidar num
> dono só **move** o ônus da prova em vez de eliminá-lo. `orderIdentity` é estado novo em
> `sessionStorage`: das 9 mutações sobre ele, 7 morreram e 2 sobreviveram, as duas fechadas no
> fecho. A segunda tem mecanismo estreito e real: `ensureRequestId()` cunha a chave de idempotência
> **antes** de `setOrder` gravar o `orderId`, e sem o recorte `!orderId` um evento de auth naquela
> janela apagaria a chave em uso — a retentativa criaria um **segundo pedido** (`PED-04`).
>
> **Um achado é do verificador contra si mesmo**: a rodada 1 marcou `PIX-P2-03` como lacuna de
> precisão por não exercitar o timeout de 15s; a rodada 2 mostrou que a régua existe **na casa do
> dono** (`useCreatePayment.test.tsx`) e a cadeia fecha em dois arquivos. Ele tinha procurado num só.
>
> **`BATIDA_MS` continua sem régua, declarado e não consertado**: a duração da batida de confirmação
> é *assumption* não confirmada da spec, não AC, e cravar `toBe(1200)` escreveria no teste um número
> que ninguém mediu. A distinção contra `PIX_SLOW_MS` — cujo 8000 tem origem declarada e por isso
> ganhou régua **relacional lida do dono** — é o padrão a seguir.

> **A limpeza do carrinho MUDOU DE CASA e ganhou um recorte que antes não precisava existir.**
> Com o QR dentro do checkout, o pedido aprovado era **por construção** o que aquele rascunho tinha
> criado. Com o pagamento em rota própria isso deixa de ser verdade: a rota é alcançável por link,
> por `/conta` e por `/pedido/:id`, e quem chega por ali pode estar pagando um pedido **antigo** com
> uma sacola **nova** montada. O recorte é `checkoutStore.orderId === id` (`PIX-P1-08`), com caso
> nos dois sentidos — sem ele, pagar um pedido de ontem esvaziaria o carrinho de hoje, em silêncio,
> no instante em que a cliente mais confia na loja.

> **Três casos de `IDN-07` mudaram de CAMINHO, não de assunto.** Eles precisam da página montada
> **depois** de o pedido existir, e no PIX ela já entregou o bastão para a rota. O único caminho que
> mantém a cliente no checkout com um pedido `pending` em curso é o **cartão recusado** (`PGM-08`).
> Medido: pelo PIX, dois deles passavam a reprovar e o terceiro virava **verdadeiro sobre o nada** —
> a asserção era sobre o store, e o store continua igual com a página desmontada. O caso inverso
> ganhou uma asserção de que a região "Pagamento" ainda está no DOM, exatamente por isso.

> **A asserção de ORDEM de `PIX-P1-02` não pode ser "o checkout não chamou `create-payment`"** —
> isso é verdade nos dois mundos, porque quem chama é a rota, e ela chama depois. A régua é o número
> de chamadas medido **de dentro da rota de destino**, no instante em que ela monta: tem de ser
> **zero**. O mutante que pede o código antes de navegar morre por essa asserção e por nenhuma outra.

> **Um erro de tipo da fase 2 derrubava o `tsc` do app inteiro, e o gate anterior não o viu.** O
> dublê de `usePixPayment` em `OrderPaymentPage.test.tsx` era `vi.fn(() => …)` — zero argumentos —
> chamado com um, e `as never` na chamada **não salva**: `tsc` confere **aridade**, não só tipo.
> Corrigido declarando o parâmetro. A lição prática: `pnpm build` não checa tipo, e um dublê mal
> tipado num arquivo de teste é erro de compilação do app, não do teste.

> **PROVA EM NAVEGADOR, com os cinco estados forçados e o percurso inteiro medido** (2026-09-22,
> Chromium, dev server em :8082). O Docker não estava de pé, então `/rest/v1/**` e `/functions/v1/**`
> foram **interceptados** — mais determinístico que esperar o relógio. O bundle **servido** foi
> conferido antes de medir.
>
> | | 390 × 844 | 1440 × 900 |
> | --- | --- | --- |
> | rolagem horizontal do body, em 9 cenários | **zero** | **zero** |
> | clique no CTA → `PaymentProgress` em `/checkout`, sem CTA e sem blocos | **sim** | **sim** |
> | pedido criado → `/pedido/:id/pagamento`, com `#0244` e o passo 1 concluído | **sim** | **sim** |
> | **F5 na rota** | QR volta · **0 chamadas de `create-order`** | idem |
> | "Copiar código" · "Gerar um código novo" · "Tentar de novo" | **48px** | 48px |
> | "Pagar com PIX" em `/pedido/:id` pendente | **64 × 358**, cheia | 64 × 736 |
> | a batida da confirmação | **1194 ms** → `/pedido/:id` | 1188 ms |
> | o tempo a 09:46 / a 03:59 | `ink` / `primary` | idem |
>
> ⚠️ **A linha dos 8s empurra o bloco de valor em +104px (390) e +84px (1440)** — os passos **não**
> se movem, e nada sai da dobra (o documento continua com 844px em 390). Reservar o espaço seria
> pior: a linha só aparece numa espera anormal, e a reserva deixaria um vão permanente que 100% das
> compras veem. Medido e aceito.
>
> ⚠️ **Duas armadilhas do arnês de medição**, registradas porque produziriam medida falsa: o
> **Playwright avalia rotas em ordem INVERSA de registro** (um `**/rest/v1/**` registrado por último
> devolvia `[]` para o pedido, e a tela caía em "Pedido não encontrado"), e a fixture do pedido
> perdeu o `...extra` do argumento — dois cenários teriam **passado medindo o estado errado**.

**A máscara de telefone e CEP nos formulários da loja somou +19 em DOIS workspaces**, medidos em
2026-09-21 um por vez, com exit code fora de pipe e `--testTimeout=20000` nos dois apps: **core
2420/95 → 2432/96** (`maskPhone`/`stripPhone`/`isValidBrPhone`, o dono único da regra, ao lado de
`maskCep`) e **store 3541/223 → 3548/223** (+6 na máscara do campo real do `ContactBlock`, +1 no
payload). Backoffice foi **remedido** porque o barrel de `core/validators` mudou, e veio idêntico
(3017/166); functions e catalog-import não foram tocados e não foram remedidos. Lint em **26/6** e
tipos em **0 · 0**, sem mexer; `pnpm build` verde nos dois apps, e `packages/core/src/payment/**`
com zero arquivos alterados.

> **O campo WhatsApp era o único da loja que aceitava qualquer coisa**, e a ausência não aparecia
> em teste nenhum: `isContactComplete` conta **dígitos** (10 ou 11), então `abc11987654321xyz`
> reprovava e `11987654321` passava — a regra estava certa e a tela não ajudava ninguém a chegar
> nela. O CEP já tinha `maskCep` nos dois campos desde a `SHP-03`.

> **`maskPhone` NÃO foi fundida com `normalizeBrPhone`** (`core/notifications/phone.ts`), e o
> motivo está escrito no arquivo: aquela responde *"para que número o `wa.me` aponta?"* — prefixa
> `55` e devolve `null` —, esta responde *"como se escreve isto enquanto a pessoa digita?"* e nunca
> recusa. Elas compartilham um passo (só dígitos) e divergem no que fazem depois, como
> `dobrarTexto` × `slugify` no painel. Ligá-las custaria uma dependência
> `core/notifications → core/validators`, e o grafo de `notifications` é resolvido pelo **Deno** na
> function `send-notification`, onde todo especificador relativo precisa de `.ts` — que o barrel de
> `validators` não tem.

> **O payload grava só dígitos, pelo precedente do CEP (`ADR-05`).** O caso que já existia entrava
> com dígitos crus e por isso era **verdadeiro nos dois mundos**: apagar `stripPhone` do payload o
> deixava verde. O par novo entra com `(11) 98888-7777`. Sem ele, `customers.phone` passaria a ter
> duas grafias do mesmo telefone conforme a cliente tivesse ou não passado pelo campo.

> **Seis mutantes reinjetados nos arquivos reais, com restauração e comparação byte a byte — 6
> mortos, 0 sobreviventes, todos por asserção** (nenhum por compilação, que prova o esbuild e mais
> nada). O arnês **lança** quando a string alvo não é encontrada. Os dois que mais importam:
> a máscara apagada do `onChange` (o campo do `ContactBlock`, não o `maskPhone` de `core` — o dono
> ter teste não prova que o campo o chama) e apagada da **semeadura** de `customers.phone`, que
> abriria o checkout do cliente recorrente com o número cru.

**O conserto da Home que mostrava a seção DESLIGADA somou +6 em UM workspace**, medidos em
2026-09-21 com a árvore parada antes de qualquer edição, um workspace por vez e exit code fora de
pipe: **store 3535/222 → 3541/223** (o arquivo de regressão novo). Os outros quatro não foram
tocados e foram remedidos assim mesmo — os quatro vieram **idênticos** (backoffice 3017/166, core
2420/95, functions 652/14, catalog-import 512/23), e a baseline de entrada bateu **exatamente** a
linha desta tabela. Lint em **26/6** e tipos em **0 · 0**, sem mexer; `packages/core/src/payment/**`
com zero arquivos alterados.

> **A loja afirmava uma composição que ela não sabia ser verdadeira, e o bloco fantasma não vinha do
> banco.** `useHomeSections` usava `DEFAULT_HOME_COMPOSITION` como `placeholderData`, e no React
> Query v5 isso volta como `data` com `status` de sucesso em **toda carga fria** (o cache é só em
> memória). Com a "Chamada principal" desligada e o "Banner principal" ligado, a cliente via a
> chamada semeada entrar, animar e sumir — a policy pública devolve só `active = true`, então a linha
> desligada nunca trafegou: o hero vinha do **bundle**.
>
> A premissa que sustentava aquele piso era **do banco**, e tinha caído: a `24` criou
> `guard_hero_home_section` (hero indelével, verdade em 100% dos bancos) e a `41` o derrubou
> (`AD-029`) para a dona poder pôr a campanha no topo. `defaults.ts` nunca foi revisitado. **É a
> mesma classe da `41` e da `50`: o estado que sobrevive à regra que o justificava.**

> **`HOME-07` nunca pediu isso, e é o que torna a remoção uma RESTAURAÇÃO.** A AC escrita é *"WHEN a
> leitura das seções **falha**"* (`.specs/features/24-home-gerenciavel/spec.md:123`) — erro e lista
> vazia, que continuam no `queryFn` intocados. Pintar o piso com a leitura **em curso** era escopo
> além da AC. O terceiro estado passou a ser um esqueleto que **não afirma conteúdo nenhum**.

> **A régua da altura do esqueleto é o `<footer>`, e é medida — não "mais ou menos a altura do
> hero".** O CLS só conta nó presente nos dois quadros: header é `sticky`, `MobileNav` e a bolha do
> WhatsApp são `fixed`, e o esqueleto desmonta enquanto o `HomeRenderer` monta. Sobra o rodapé — que
> foi exatamente quem produziu os **CLS 0,244** que a `40` mediu e fechou. `min-h-screen` o mantém
> fora de vista em 390×844 (header 64) e em 1440×900 (header 136).

> **O guarda mais protegido do repositório ficou MAIS APERTADO, e é por isso que mexer nele foi
> legítimo.** `homeComposition.test.tsx` diz que o gate é *"continua verde SEM uma única alteração
> aqui"*. Só o helper mudou (`renderHome` virou `async`, 11 chamadas ganharam `await`); **nenhuma
> asserção foi tocada** — mesmos papéis, nomes e contagens. E o ganho é real: até aqui as asserções
> corriam **antes** de a consulta resolver, então um mutante que apagasse o `return piso()` do
> `queryFn` sobrevivia ao arquivo inteiro. Com a espera, ele morre (M4). É "não perde asserção, só
> ganha".

> **Cinco mutantes reinjetados no arquivo real, com restauração e comparação byte a byte — 3 mortos,
> 2 sobreviventes DECLARADOS.** O arnês **lança** quando a string alvo não é encontrada, para mutação
> que vira no-op não passar por morte (a lição do `mutar()` da `52`).
>
> | M | mutação | resultado |
> | --- | --- | --- |
> | M1 | `placeholderData` de volta no hook | **morto** — o caso invertido e o de regressão |
> | M2 | `isLoading` → `isPending` na página | **SOBREVIVEU** |
> | M3 | o ramo de carregamento apagado da página | **morto** |
> | M4 | o piso trocado por lista vazia no `queryFn` | **morto** |
> | M5 | `min-h-screen` → meia viewport no esqueleto | **SOBREVIVEU** (esperado) |
>
> **M2 é achado, não lacuna a tapar**: o ramo da prévia devolve **antes** de o esqueleto ser
> alcançado, então hoje as duas leituras se comportam igual e nenhum teste pode distingui-las. O
> comentário escrito na primeira passada dizia que ali a regra "tem dente" — afirmação falsa, e é o
> defeito que a `51` nomeou: *comentário que afirma sensibilidade inexistente é pior que comentário
> nenhum, porque encerra a investigação*. Corrigido para declarar o limite; `isLoading` fica por ser
> a leitura que continua certa se a ordem dos ramos mudar. **M5 também é declarado**: jsdom devolve 0
> para layout, a altura só se prova em navegador, e o próprio `HomeSkeleton.tsx` diz isso.

> **PROVA EM NAVEGADOR, com o defeito reproduzido e medido A/B** (2026-09-21, Chromium, dev server
> em :8082). O Docker não estava de pé, então `supabase start` falhou e a leitura de `home_sections`
> foi **interceptada** — o que é mais determinístico que esperar o relógio: a resposta é atrasada
> 1,5 s de propósito, e a página é medida **no meio do atraso** e depois. Composição de 4 seções
> (carrossel, vantagens, faixa institucional, newsletter), sem o `hero`.
>
> | viewport | antes — hero na tela · CLS | depois — hero na tela · CLS |
> | --- | --- | --- |
> | 390 × 844 | **sim** · **0,2488** | **não** · **0,0995** |
> | 1440 × 900 | **sim** · **0,1548** | **não** · **0,0589** |
>
> O "antes" é o mutante M1 reinjetado no arquivo real, com o dev server **conferido** servindo o
> código mutado antes de medir (a primeira tentativa mediu com o módulo ainda não retransformado e
> reportou o hero ausente em 390 — leitura errada que só o `grep` no bundle servido pegou).
>
> **A régua da altura se confirmou**: o esqueleto mede 844 em 390×844 e 900 em 1440×900, e o
> `<footer>` nasce em **972** e **1048** — fora de vista nos dois. O CLS restante tem `footer` como
> **única** fonte e cai ~60%. Nenhuma rolagem horizontal do `body` em nenhum dos dois.
>
> ⚠️ **O `<footer>` continua sendo a fonte, e o número depende do tamanho da Home.** Com uma
> composição de **uma seção curta** o mesmo teste deu **0,3073** em 390: aí o conteúdo é mais BAIXO
> que o esqueleto e o rodapé sobe. É o limite que o `HomeSkeleton.tsx` já declara — reservar uma
> viewport é uma aposta de que a Home real é mais alta que uma tela, verdadeira para qualquer
> composição de verdade e falsa para uma Home de um bloco só.


**A feature `53` (a aba de Notificações, os 15 eventos do motor ficam alcançáveis) somou +116 em
TRÊS workspaces, medidos em 2026-09-19 um por vez, exit code fora de pipe e `--testTimeout=20000`
na loja e no painel** — sobre a entrada real de **9742/498**: **backoffice 2711/148 → 2818/158**
(+107/+10 — `EmailPreviewFrame`, `EventCard`, `NotificationsTab`, o guarda
`notificationCopySingleOwner`, mais `sections`/`preconditions`/`notificationsWrite`/
`useNotificationsDraft`/`previewNotification`/`checkNotificationConfig`, e +13 espalhados no fecho —
3 na fiação de `AdminSettingsPage.test.tsx`, 2 no `FieldGroup.test.tsx`, 1 no `EventCard.test.tsx`
(os três achados de T14, abaixo) e 3 em `NotificationsTab.test.tsx` (o `order_id` da prévia — achado
da verificação final, também abaixo) — 4 novos), **core 2372/93 → 2383/93** (+11 —
`notificationDraftRefusal` movida para cá na T01 (+6), `useNotificationSettings` na T02 (+3), e +2 no
fecho, o achado do guarda da loja abaixo) e **functions 654/14 → 652/14** (**−2**, esperado: a T01
consolidou `handlers.test.ts` para wiring-only depois de mover os casos substantivos para `core`, sem
perda de cobertura — ver a nota de fecho da T01 em `tasks.md`). `catalog-import` não foi tocado.
Lint em **26/6** e tipos em **0 · 0 · 0**, sem mexer; `packages/core/src/payment/**` sem uma linha
alterada (`git diff --name-only -- packages/core/src/payment`, zero arquivos).

> **A verificação final (autor = verificador, `BL-012` não separou os papéis nesta feature) achou uma
> LACUNA, e não só mutantes.** `ABN-07` ("informar um `order_id` real reflete os dados daquele
> pedido") nunca tinha UI: o `design.md` já tinha decidido a forma ("campo de texto simples, UUID,
> sem busca") na seção *Tech Decisions*, mas nenhuma das tasks T09–T11 listou construir o campo no
> próprio "Done when" — só a chamada (`previewNotification({ orderId? })`, T07) e o selo de exemplo
> (`EmailPreviewFrame`, T09) tinham teste. Resultado: a metade do requisito que dependia da OUTRA
> metade nunca foi cobrada por nenhuma task, e a suíte inteira ficou verde sem o campo existir.
> Corrigido: um `<Input>` único no topo da aba (`NotificationsTab.tsx`), compartilhado pelos 15
> cards, alimentando `orderId` em toda chamada de prévia. Provado em UNIDADE (3 casos novos em
> `NotificationsTab.test.tsx` — sem digitar nada não manda `order_id`; digitando, manda; o valor vale
> para qualquer card) **e em navegador real**: digitar um UUID e clicar "ver prévia" produziu uma
> requisição com `order_id` no corpo e uma resposta com **dados reais** de um pedido do banco local
> (`"sample":false`, itens, totais, endereço de entrega) — contra `sample:true` do caso sem pedido.

> **Um código do painel quebrou um guarda da LOJA, e o achado vale mais que o número.**
> `useNotificationsDraft.ts` (T06) e `NotificationsTab.tsx` (T11) escreviam o nome de dois eventos
> como **literal** — `event === 'material_instructions'` e
> `['owner_order_paid', 'owner_material_incoming']` — e `notificationSingleOwner.test.ts`
> (`apps/store/shared/lib/__tests__`, feature `42`) varre `apps/**` **e** `supabase/functions/**`
> proibindo exatamente isso: "quem responde que eventos existem, e como se chamam" é
> `NOTIFICATION_EVENTS`/`NOTIFICATION_EVENT_LABELS`, nunca uma string solta. Nenhuma das tasks
> T01–T13 mediu a suíte da LOJA — o `tasks.md` desta feature só listava `core`/`functions`/
> `backoffice` como "workspaces tocados", e o guarda só foi encontrado ao medir os cinco de fecho
> (T15). **A mesma lição que `brandScan.test.ts` já tinha ensinado na feature `51`**: o gate de uma
> feature do painel inclui a suíte da loja, porque os guardas de lá varrem os dois apps.
>
> O conserto foi **em `core`, não um `// @ts-ignore` local**: `MATERIAL_INSTRUCTIONS_EVENT` (um
> único evento nomeado, ao lado de `NOTIFICATION_EVENTS`/`MATERIAL_EVENTS`) em
> `core/notifications/events.ts`, e `OWNER_EVENTS` **apagado** em troca de reusar
> `sections.owner` — a mesma lista que `groupedEvents()` já calculava, evitando uma segunda
> classificação que divergiria da primeira (o "defeito 01", de novo, um nível abaixo do que o
> guarda mede). +2 casos em `core/notifications/__tests__/events.test.ts` — é isso que fecha os
> **2383** de `core` acima, não os 2392 que a soma ingênua das tasks sugeriria.

> **Dois defeitos de layout achados na prova em navegador (T14, `ABN-10`), e os dois corrigidos
> antes de fechar — nenhum como dívida.** (1) O `Switch` de cada evento mede `h-6 w-11` (24×44px):
> abaixo do piso de 44px de altura. `ToggleField` (`shared/ui/FieldGroup.tsx`) ganhou um prop
> **aditivo e opcional**, `switchClassName` — default `undefined`, os 7 chamadores de antes desta
> feature não mudam nem um pixel (provado por teste) —, e só `EventCard.tsx` o usa, com uma classe
> `before:` que estende a área CLICÁVEL sem mudar o desenho, no molde do `TAP_44` da loja (nunca
> importado: criaria um segundo dono da medida). Provado FUNCIONALMENTE em navegador real: um
> clique 5px acima da borda visível do controle alterna o estado — `getBoundingClientRect` não
> mede pseudo-elemento, então a prova não podia ser por pixel. (2) A `TabsList` de
> `AdminSettingsPage.tsx` tem `h-10` fixo (do componente compartilhado), e com 8 abas em
> `grid-cols-3` (mobile) são **3 linhas** de conteúdo (~100px) cortadas em 40px — a 3ª linha
> sobrepunha visualmente o título da seção. **Não é defeito desta feature**: 7 abas já precisavam
> de 3 linhas antes (3+3+1); a 8ª não mudou a contagem (3+3+2). Corrigido com `h-auto` acrescentado
> ao `className` desta **única** `<TabsList>` — nenhuma outra tela do painel é afetada. Detalhe
> completo, com as medidas de antes/depois, em `.specs/features/53-aba-de-notificacoes/validation.md`.

> **O container do edge runtime local estava parado havia 5 dias**, e a fila de `docker ps` não
> mostrava nem sinal dele — as outras 12 peças do Supabase local seguiam de pé. Religá-lo sozinho
> (`docker start`) subiu com bind-mount obsoleto (`Module not found ".../notifications/sender.ts"`,
> um arquivo que existe no disco); só `supabase stop` (sem `--all`) + `supabase start` recriou o
> container do zero e resolveu. Sem isso, a prova em navegador desta feature (que depende de
> `send-notification?action=preview`/`?action=config-check`) não teria como acontecer.

**A feature `57` (os avisos para a dona, e o endereço que os recebe) somou +52 em TRÊS
workspaces**, medidos em 2026-09-20 um por vez, com exit code fora de pipe e `--testTimeout=20000`
nos dois apps: **core 2395/94 → 2420/95** (`resolveOwnerEmail` e as duas pré-condições novas),
**store 3517/221 → 3535/222** (o guarda do dono único, mais as asserções novas nos dois guardas de
schema) e **backoffice 3008/166 → 3017/166** (o campo novo e o aviso pelo dono único). Functions e
catalog-import não foram tocados e foram remedidos — idênticos. Lint em **26/6** e tipos em
**0 · 0**, sem mexer; `pnpm build` verde, e `packages/core/src/payment/**` com zero arquivos
alterados.

> **A pergunta que abriu a feature já tinha resposta, e a resposta era "já está".** O e-mail que
> recebe os avisos sempre foi lido **na hora de enviar** (`recipientFor`, `dispatch.ts`), então
> trocar o valor no painel já valia no próximo e-mail — sem deploy e sem secret. O que **não** era
> verdade era a separação: `general.email` acumulava dois papéis, o endereço interno e o e-mail
> **público** que `PolicyContact` mostra nas páginas de política. Agora são dois campos, e o novo
> vazio significa *"use o de contato"* — regra, não dado faltando, e é o que faz o deploy não mudar
> o comportamento de ninguém.

> **"Qual é o endereço que recebe os avisos?" virou REGRA, e regra lida em três lugares diverge.**
> Três superfícies fazem essa pergunta: o motor ao escolher o destino, a pré-condição, e o aviso do
> painel. Escrita três vezes, a queda diverge — e a forma da divergência é a pior possível porque
> nenhum lado quebra: **o painel avisando "nenhum e-mail cadastrado" enquanto o motor manda
> alegremente para o de contato**. `resolveOwnerEmail` (`core/notifications/owner.ts`) é o dono, e
> `ownerEmailComDonoUnico.test.ts` tem allowlist de UM **mais a metade positiva** — os três
> consumidores chamam o dono. Um guarda de ausência sem a presença ao lado sobrevive à feature
> medindo o nada (`originZipNotRead`).

> **O `check` de `event` estava numa migration JÁ APLICADA, e `AD-017` a torna imutável.** A
> constraint foi **recriada** em migration nova (molde da `41` com `home_sections.type`), e os
> **dois guardas que a mediam tiveram de aprender o endereço novo** — senão continuariam comparando
> com uma lista que o banco não tem mais: **peça certa, endereço errado, suíte verde** (`PRF-05`).
> Cada um ganhou a **metade que o mantém vivo**: o de schema assere que a da 42 **não é mais** a
> vigente, e o de defaults assere que a semente da 42 **não cobre mais os dezessete sozinha**. Sem
> essas duas, apagar o `check` da 57 faria as réguas voltarem a medir os quinze antigos e aprovarem
> a divergência.

> **O guarda de defaults passou a comparar a COMPOSIÇÃO, e isso não é remendo.** Ele exigia que o
> jsonb semeado pela `42` fosse igual a `DEFAULT_NOTIFICATIONS`. Com dois eventos acrescentados por
> outra migration, o que o banco fica não está em nenhum arquivo sozinho: é a semente da 42 **mais**
> o acréscimo da 57 — num banco novo e num existente. A alternativa preguiçosa era afrouxar para
> `toMatchObject`, que deixaria o texto divergir em silêncio; a cara era repetir os dezessete na
> migration nova, sobrescrevendo o texto que a Adri já editou.

> **A checagem contra a PRODUÇÃO achou um defeito que teste nenhum pegaria.** `ADMIN_PUBLIC_URL`
> **não existia** nos secrets, e o código faz `envOr("ADMIN_PUBLIC_URL", "http://localhost:8083")`
> — os **quatro** avisos para a dona usam `{{link_pedido_admin}}`, então eles sairiam com link para
> `localhost`. O default é sintaticamente válido, a function sobe, o e-mail é enviado: o defeito só
> existe no corpo da mensagem que chega. Gravado em 2026-09-20, com a URL conferida por `curl`.
>
> A mesma consulta mostrou que **nenhum aviso para a dona estava ligado** — nem os dois que existem
> desde a `42`. A feature não leva de dois a quatro: leva de **zero em uso** a quatro disponíveis.

> **`MELHOR_ENVIO_SENDER_JSON` foi restaurado no mesmo movimento, e o `{"count":2}` é a prova.**
> O procedimento seguro de `BL-044` é arquivo com **só** as chaves pretendidas e
> `secrets set --env-file` rodado de um diretório **sem `.env`**. O retorno da CLI dizendo `count: 2`
> é o que separa "gravei duas" de "gravei oito" — que é exatamente como sete secrets de produção
> foram sobrescritos com valores de dev em 2026-09-19. O conteúdo foi conferido antes de subir.

**A feature `56` (Notificações legíveis, e o padrão das Configurações) somou +73 em DOIS
workspaces**, medidos em 2026-09-20 um por vez, com exit code fora de pipe e `--testTimeout=20000`
nos dois apps: **backoffice 2947/164 → 3008/166** (+61/+2 — o card recolhível, o mapa de ícones, o
contador com dono, a moldura da prévia, o acordeão e os contadores das outras seções) e **core
2383/93 → 2395/94** (+12 — o catálogo de apresentação dos 15 eventos). **Store, functions e
catalog-import não foram tocados e foram remedidos assim mesmo — os três vieram idênticos.** Lint em
**26/6** e tipos em **0 · 0 · 0**, sem mexer; `pnpm build` verde nos dois apps, e
`packages/core/src/payment/**` com **zero** arquivos alterados.

> **A baseline de entrada bateu EXATAMENTE a tabela acima** — 10011 em 515, os cinco workspaces. É a
> primeira vez em muitas features que a linha escrita aqui não estava envelhecida, e o motivo é que a
> `55` mediu de verdade ao fechar. Vale como confirmação da regra: **quem fecha a feature mede; quem
> abre a próxima mede de novo** — e quando as duas medições concordam, a próxima pessoa pode confiar
> no gate em vez de recalculá-lo.

> **O defeito que motivou a feature era MEDIDO, não impressão.** A seção Notificações tinha
> **13.292px** de rolagem em 1440 e **13.592px** em 390 — ~16 telas para responder *"quais destes
> quinze avisos eu quero ligar?"*, sem nenhuma visão em que os quinze coubessem juntos. Os 15 cards
> nasciam todos abertos, com 5 campos cada. Depois: **1.693px** e **1.833px**, medidos no mesmo
> Chromium, com os 15 recolhidos.

> **O título de cada card era a frase do HISTÓRICO do pedido, e isso é um segundo dono com duas
> perguntas diferentes.** `NOTIFICATION_EVENT_LABELS` (feature 42) responde *"o que aconteceu com
> este pedido?"* e está no passado — "Confirmação do pedido enviada". Numa tela onde se configura o
> que **vai** ser enviado, ela se lê como registro de log, acima de um interruptor desligado.
> `NOTIFICATION_EVENT_NAMES` (`core/notifications/catalog.ts`) responde *"que evento é este?"*. O
> risco de alguém achar que são cópias e apagar uma é real, e a contenção é uma asserção que **recusa
> a igualdade nos 15** — mais uma que recusa o particípio, para a cópia não voltar por reescrita em
> vez de por `ctrl+C`.

> **O sensor de discriminação achou UM sobrevivente em 17, e ele tem a assinatura de sempre: a
> asserção verdadeira nos DOIS mundos.** Apagar `setPreview(null)` de `alternarCard` deixava a suíte
> inteira verde, porque a régua de `LEG-10` media a prévia **dentro do card já recolhido** — e lá o
> iframe está ausente de qualquer jeito, pois o corpo sai do DOM por `LEG-05`. A asserção estava
> **subsumida pela vizinha** e não media nada próprio. A consequência real só aparece na **volta**: o
> card reabre mostrando a prévia de um texto que pode ter mudado, com o botão dizendo "Fechar prévia".
> O caso novo volta ao card e cobra as duas coisas.
>
> **E um mutante morreu pelo MOTIVO ERRADO**, o que é quase tão ruim quanto sobreviver: o primeiro de
> `LEG-16` foi escrito com um fragmento JSX sem fechar e derrubou a suíte **por erro de compilação**.
> Um mutante assim prova que o compilador funciona, e nada mais. Refeito como mutação sintaticamente
> válida, morre por asserção. **A rodada 2 passou a imprimir, por mutante, se a morte foi por
> asserção ou por compilação** — a distinção que a rodada 1 não fazia. Total: **18 mutantes, 18
> mortos**, todos reinjetados nos arquivos reais com restauração e comparação byte a byte.

> **DOIS defeitos de layout achados só em navegador, e os dois corrigidos antes de fechar.** (1) O
> título "Notificações" aparecia **duas vezes** no celular — o cabeçalho de voltar da
> `AdminSettingsPage` já nomeia a seção, e o título da aba o repetia logo abaixo com outra descrição,
> antes do primeiro evento. **A duplicação é anterior a esta feature**, e não aparecia nas outras três
> seções porque lá os títulos vêm do `FormCard` e são diferentes do nome da seção. Corrigido com
> `hidden lg:block`, a mesma alternância que o resto da tela usa: **−84px** acima da dobra em 390.
> (2) O rótulo da moldura da prévia quebrava em **três linhas** em 390, partindo no hífen de
> "e-mail", porque o selo "Prévia de exemplo" espremia a frase; com `flex-wrap` mais piso de largura
> no título, quem desce de linha passou a ser o selo.

> ⚠️ **O edge runtime local NÃO enxerga arquivo novo em `packages/core`, e isso custa uma sessão de
> depuração.** Ao acrescentar `catalog.ts` ao barrel que a function `send-notification` importa, ela
> passou a responder **503** com `worker boot error: Module not found ".../catalog.ts"` — para um
> arquivo que **existe no disco**. É bind-mount obsoleto, o mesmo sintoma que a `53` registrou por
> outro caminho. `supabase stop` (sem `--all`) + `supabase start` recria o container e resolve: a
> mesma requisição passou a responder **401**, que é só a falta do header de auth no `curl` e é a
> prova de que o worker inicializa e o grafo de tipos resolve. **É local, não produção** —
> `functions deploy` empacota na hora. Antes de investigar um 503 depois de criar arquivo em `core`,
> confira o log do container: se a mensagem nomeia um arquivo que existe, é o mount.

**A feature `55` (configurações por seções) somou +129 em UM workspace**, medidos em 2026-09-19 um
por vez, com exit code fora de pipe e `--testTimeout=20000` nos dois apps: **backoffice 2818/158 →
2947/164** (o registro das seções, o guarda das rotas, a navegação, o mapa de painéis, o
`InfoBanner`, o guarda das "abas", e a suíte da página indo de 21 para 68 casos — dos quais **+17
vieram DEPOIS da verificação independente**, consertando o que ela achou) — **e +1 no store**, a
âncora da leitura cruzada que ensinou o guarda de posição a conhecer o auxiliar do painel. Os outros quatro
**não mudaram de comportamento e foram remedidos**: store **3516/221 → 3517/221** (só a âncora
acima), core 2383/93, functions 652/14, catalog-import 512/23. Lint em **26/6** e tipos em **0 · 0**, sem mexer;
`pnpm build` verde nos dois apps, e `packages/core/src/payment/**` sem uma linha alterada
(`git diff --name-only`, zero arquivos).

> **A verificação independente REPROVOU a primeira entrega — 7 mutantes sobreviventes em 26 — e
> achou DOIS defeitos de produto que teste nenhum podia ver.** É a leitura mais cara desta feature, e
> os dois defeitos têm a mesma causa: **a coisa que sumiu da tela não tinha dono em teste nenhum.**
>
> 1. **O card do Checkout ficou SEM NOME.** Quem escrevia a palavra "Checkout" era o
>    `<TabsTrigger>`; o `CheckoutSettingsCard` sempre renderizou um `<FormCard>` **sem título**, e
>    ninguém notou porque a aba o nomeava por fora. Com as abas removidas, a seção *Vendas* passou a
>    mostrar "Pagamento", **um card sem nome**, e "Carrinho abandonado" — e `CFG-05` nomeia os três.
>    Nenhum teste podia pegar: a suíte da página **dubla** aquele card.
> 2. **O alvo de toque de 44px valia só para a linha do rail.** A AC nomeia três coisas — a lista, o
>    botão de voltar e **os controles de uma seção** —, e a terceira não estava implementada: o
>    `Switch` é `h-6` (24px) e o `<Button>` padrão é `h-10` (40px). **A feature `53` já tinha topado
>    com esse defeito** e criado o `switchClassName` para corrigi-lo num card; a `55` *editou aquele
>    comentário* e não usou o prop. O conserto trouxe a classe para `shared/ui` como
>    `SWITCH_TAP_44` — ela estava escrita **dentro** do `EventCard`, e a segunda escrita seria o
>    "defeito 01" no tamanho de uma classe.
>
> **Dos 7 mutantes, cinco tinham a assinatura de sempre — a asserção verdadeira nos DOIS mundos:**
>
> - **`CFG-08` provava IDENTIDADE, não POSIÇÃO.** `expect(header).toBe(antesDaTroca)` continua
>   valendo com o cabeçalho **dentro** do painel, porque o React reconcilia por posição e tipo. Mover
>   o `<PageHeader>` para dentro do painel deixava 112 casos verdes — e no celular, na rota-mãe, o
>   título **sumiria de vez** (o painel carrega `hidden lg:block`). Identidade prova que ele não
>   remonta; só a posição prova que ele não se move.
> - **A régua de `CFG-13` filtrava o defeito para fora da própria amostra.** Ela colhia só os `div`
>   que **já** tinham `sm:grid-cols-`, e depois asseria que nenhum deles tinha `grid-cols-` pelado —
>   um `grid-cols-2` fixo nunca entrava na lista. E o "sensor" dela exercitava só o `filter` interno
>   sobre um array escrito à mão, sem nunca chamar o colhedor, que era onde o defeito morava.
>   **Sensor que não chama a função da asserção não é sensor.**
> - **`CFG-21` era provado no componente, nunca no PRODUTOR.** `EventCard.test.tsx` monta a prop
>   `warnings` ele mesmo; apagar o `action` de quem a produz de verdade (`warningsFor`, em
>   `NotificationsTab`) deixava as 9 suítes verdes com o link simplesmente inexistente. É a quarta
>   ocorrência de *"teste não monta a árvore que prova"* neste repositório.
> - **`CFG-26` tinha um consumidor com zero cobertura, e a varredura era CEGA a ele por
>   construção.** A varredura de `bg-muted` mora na suíte da página — que **dubla** o
>   `CheckoutSettingsCard`. Um guarda nunca alcança o que o próprio arquivo substituiu por um stub.
> - **`CFG-24` estava provado para 1 dos 3 campos**, embora o `design.md` prometesse "um caso por
>   campo". E o caso novo do frete só discrimina com o interruptor **desligado**: com ele ligado,
>   `freeShippingRefusal` recusa tanto `0` quanto `null` (`null <= 0` é `true`), então aquele caminho
>   é verdadeiro nos dois mundos.
>
> **O `Success Criteria` "sem nenhum campo removido" não tinha teste nenhum**: apagar o campo
> *Imagem Open Graph* deixava a suíte verde. Agora há um inventário de 24 rótulos, escrito por
> extenso — derivá-lo do componente provaria que ele é igual a si mesmo.
>
> **Os 12 mutantes foram reinjetados nos arquivos reais depois do conserto, com restauração e
> comparação byte a byte: 12 morreram, 0 sobreviveram.** O arnês **lança** quando a string alvo não
> é encontrada — mutação que vira no-op em silêncio não prova nada (a lição do `mutar()` da `52`).

> **A rodada 2 passou (19 mutantes, 19 mortos) e ainda assim achou um buraco — criado pelo
> CONSERTO.** Extrair `SWITCH_TAP_44` para `shared/ui` resolveu a duplicação e, no mesmo movimento,
> levou a classe de **um** arquivo para ~200: ela começa com `relative` igual aos auxiliares da loja,
> e `alvoDeToqueNaoRoubaPosicao.test.ts` — que varre `apps/backoffice/src` — **não sabia o nome
> novo**, porque `(TAP_44|TAP_ROW)` não casa dentro de `SWITCH_TAP_44` (`_` é caractere de
> palavra). A sonda pareada que provou isso é o molde: a mesma linha, só trocando o identificador —
> com `SWITCH_TAP_44` passava cega, com `TAP_44` reprovava.
>
> O guarda passou a ler a constante **do disco** em vez de importá-la (a suíte da loja importar um
> módulo do painel seria o segundo dono que ele existe para impedir), e a leitura **lança** quando
> não acha. A primeira escrita dessa leitura casava aspas simples e cortava a string em
> `before:content-['']` — quem pegou foi a âncora que assere um pedaço do conteúdo, não o
> `toBeGreaterThan(0)` do tamanho. **Ampliar o alcance de um guarda é uma feature em si**, e vale a
> mesma régua: sonda pareada, controle, e o inverso que prova que ele não virou "qualquer coisa
> reprova".

> **A suíte da LOJA reprovou, e o guarda que pegou fez isso pelos DOIS lados.** A `55` moveu o card
> de Frete da `AdminSettingsPage` para `ShippingMaterialSection`, e
> `freeShippingSingleOwner.test.ts` (que mora em `apps/store` e varre `apps/**`) acusou **duas**
> coisas de uma vez: o arquivo novo lendo `free_shipping_threshold` fora do allowlist, **e** a
> entrada velha do allowlist não lendo mais o campo. O segundo sentido é o que impede uma allowlist
> de virar cemitério — sem ele, a entrada morta ficaria lá autorizando um arquivo que já não existe
> naquele papel. É a terceira feature seguida em que um arquivo do PAINEL quebra um guarda da LOJA
> (a `51` com `brandScan`, a `53` com `notificationSingleOwner`): **o gate de uma feature do painel
> inclui a suíte da loja, e workspace verde não é o gate.**

> **Um guarda de 2026-09-05 estava medindo o arquivo errado, e só a asserção POSITIVA o pegou.**
> `originZipNotRead.test.ts` lia `AdminSettingsPage.tsx` do disco e asseria duas coisas: que ele
> **não** contém `origin_zip` e que ele **contém** "Melhor Envio". Com o formulário mudando de
> arquivo, a negativa passaria por ausência de assunto — o arquivo não tem mais formulário nenhum —
> e o guarda sobreviveria à feature medindo o nada. Quem reprovou foi a vizinha. É o modo de falha
> do `PRF-05` entre as features `38` e `39`: **peça certa, endereço errado, suíte verde** — e a
> lição prática é que todo guarda que lê UM arquivo do disco precisa de uma asserção positiva ao
> lado da negativa.

> **`size="icon"` do design system é 40×40, e `CFG-14` pede 44.** O cabeçalho de voltar do celular é
> o **primeiro consumidor** do prop `backTo` do `PageHeader` — ele existia na interface desde sempre
> e nenhuma tela o usava —, então subir a medida ali não move um pixel em nenhuma outra tela do
> painel. Achado ao conferir a AC contra o `button.tsx`, não por teste: nenhuma asserção media a
> altura daquele botão porque ele nunca tinha sido renderizado.

> **Dois sensores acharam duas réguas nascidas quebradas, e as duas passavam "verdes" sobre o nada.**
> (1) O parser de rotas de `rotasDeConfiguracoes.test.ts` era um regex preguiçoso
> (`[\s\S]*?(\/>|>)`), e `element={<X />}` contém um `/>` **dentro** da tag: ele declarava toda
> rota auto-fechada, inclusive a aninhada, que é a única coisa que o guarda existe para recusar. As
> asserções principais passavam; quem acusou foram os dois sensores. (2) A régua de `aba` acusava
> `Configurações → Dados da loja` — **a copy que a própria feature escreveu** —, porque os rótulos
> de seção viva estavam na mesma lista dos mortos; e depois acusava `→ Frete e Material` porque
> `Frete` é prefixo dele e o recorte à direita via um espaço. **Régua que reprova o conserto é pior
> que régua nenhuma**: ela empurra quem consertou de volta para a frase velha.

**A feature `54` (templates de e-mail de auth) somou +23/+1 no store**, medidos em 2026-09-19:
`authEmailTemplates.test.ts` (23 casos), guardando os 3 templates de `supabase/templates/` entre si e
contra a paleta de `layout.ts` — nenhum outro comando lia aquele diretório. Tipos em **0** e lint em
**2/2** no store, sem mexer; `packages/core/src/payment/**` e `apps/backoffice/**` sem uma linha
tocada, conferido por `git diff --name-only`.

> **A linha do store NÃO foi atualizada na tabela acima, de propósito** — a árvore estava
> **compartilhada com outra sessão** no momento da medição (a `53`, em andamento, sem commit:
> `apps/backoffice/src/features/notification-settings/**`), e a suíte completa reprovou **1 caso**
> alheio a esta feature: `notificationSingleOwner.test.ts` acusando literais de evento nos arquivos
> daquela feature. Não é regressão desta `54` — `git diff --name-only` confirma zero linha tocada
> fora de `supabase/templates/**`, `apps/store/src/shared/lib/__tests__/authEmailTemplates.test.ts`
> e este arquivo, e a contagem bate exatamente: `3493 + 23 = 3516`, os mesmos 3516 que a árvore
> mostrou (220 → 221 arquivos). Quem fechar a `53` mede a tabela de novo.

**A feature `52` (entrega de e-mail comprovada) somou +188 em TRÊS workspaces**, medidos em
2026-09-19 um por vez, com exit code capturado fora de pipe e `--testTimeout=20000` na loja:
**store 3376/218 → 3493/220** (+117/+2 — o guarda da migration, 43, e o do `email-check.yml`, 74) e
**functions 599/13 → 654/14** (+55 — a porta `config-check`, com o dublê que **lança** em qualquer
acesso ao banco, tornando "não toca no banco" medido em vez de suposto; e o guarda de wiring que
achou a function de pagamento fora do ar) e **core 2356/92 → 2372/93**
(+16 — `senderFrom`, o dono único da composição do remetente, na T8). Backoffice e catalog-import
**não foram tocados e foram remedidos** — idênticos (2711/148 e 512/23). Lint em **26/6** e tipos em **0 · 0 · 0**, sem mexer; `packages/core/src/payment/**`
sem uma linha alterada, conferido por `git status --porcelain` (zero arquivos).

> **A suíte da loja reprovou 1 caso, e o culpado era a documentação desta própria feature.**
> `authSenderDomain.test.ts` recusa o subdomínio antigo em qualquer arquivo fora de `.specs/` — e os
> textos novos do `.env.example` e do `config.toml`, escritos para **explicar** como aquele domínio
> derrubou a loja, o citavam por extenso. Dois arquivos, os dois existindo para impedir o defeito que
> reintroduziram. É a segunda ocorrência desta classe no repositório (a primeira matou o
> `supabase start` por um comentário com um import proibido), e virou regra na seção dos guardas.

> **Duas réguas desta feature nasceram medindo a coisa errada, e os sensores acharam as duas.**
> (1) `/\[1\/7\][\s\S]*?"\$COD" != "200"/` sobre o arquivo inteiro **atravessa passos**: com a
> ocorrência do passo 1 mutada, ela casava a do passo 5 e seguia verde — media "existe um `!= 200`
> em algum lugar depois do passo 1". Trocada por recorte de bloco que devolve `null` e **reprova**.
> (2) A janela de 200 caracteres de `authLidoDoConfigToml` reprovou o arquivo **certo** quando o
> `grep` de uma linha virou um `awk` de várias — régua calibrada pela forma que o código tinha no dia
> em que ela foi escrita.

> **O `config.toml` tem DOIS `admin_email`, e o placeholder vem primeiro.** O da seção `[inbucket]`
> (`admin@email.com`, linha 100) precede o do `[auth.email.smtp]` (linha 289). A extração do passo 7
> do `Email check` é **recortada pelo bloco** por isso: um `grep | head -1` que tolerasse o `#`
> pegaria o placeholder, e o sensor passaria a provar um endereço que não é de ninguém — 200 do
> Resend sobre um domínio que não é nosso.

> **A `52` não ligou o SMTP local, e a razão é melhor que a decisão.** A pendência `C-08` mandava
> ligar para validar que o remetente é aceito pela chave; quem faz isso agora é o `Email check`, todo
> dia, sem efeito colateral. Ligar custaria o Mailpit (dev deixa de funcionar offline e passa a
> mandar e-mail real, sujeito a limite) e não compraria garantia nova. A pergunta que expôs isso —
> *"por que SMTP, se os transacionais saem pela API HTTP?"* — também abriu a `BL-045`: o **Send Email
> Hook** faria o GoTrue chamar uma function nossa, e aí o SMTP deixaria de ser usado.

**A feature `51` (a busca de produto do painel, com dono único) somou +172 em UM workspace**,
medidos em 2026-09-14/15 um por vez, com exit code capturado fora de pipe e `--testTimeout=20000` na
loja e no painel: **backoffice 2539/140 → 2711/148** (a dobra com dono, a régua pura, os dois hooks
de leitura, o componente compartilhado, as cinco superfícies, o guarda novo, e os **+7 que a
verificação independente cobrou**). Os outros quatro
**não foram tocados e foram remedidos assim mesmo**, e os quatro vieram **idênticos** — store
3376/218, core 2356/92, functions 599/13, catalog-import 512/23. Tipos em **0 · 0**, `pnpm build`
verde nos dois apps, e `packages/core/src/payment/**` e `supabase/**` sem uma linha alterada
(`git diff --name-only` e `git status --porcelain` = zero arquivos).

> **A verificação independente devolveu PASS, e mesmo assim cobrou +7 — os dois buracos que ela
> nomeou são a assinatura de sempre: a asserção verdadeira nos DOIS mundos.**
>
> - **`BUS-16` era mais larga que a implementação.** A AC diz "criado, alterado ou apagado **pelo
>   painel**", e os três caminhos de **lote** — import de CSV, edição em massa e grade rápida —
>   gravam em `products` sem passar por `createProduct`. Eles reliam a **listagem**, que não é o
>   pool, e por até `PRODUCT_POOL_STALE_TIME` as cinco telas de busca ficariam sem as peças
>   recém-importadas, sem nada em tela dizendo por quê. A régua nova é a **chave** invalidada, nunca
>   "`invalidateQueries` foi chamado": invalidar a chave errada chamaria o método do mesmo jeito.
> - **`BUS-26` não tinha asserção própria, e o comentário do dublê AFIRMAVA que tinha.** Ele dizia
>   que devolver o `products` à página do produto "cairia no render"; o verificador fez exatamente
>   isso e a suíte ficou **14/14 verde** — aqueles casos nunca abriam a aba *Relacionados*, então
>   `products={undefined}` não chegava a renderizar nada. Quem prendia a regressão era só o `tsc`.
>   **Comentário que afirma sensibilidade inexistente é pior que comentário nenhum**, porque ele
>   encerra a investigação. Três casos novos abrem a aba e semeiam o pool com uma peça que o dublê
>   **não** devolve — ver a peça é ver o pool —, e a mutação foi reinjetada no arquivo real: os 3
>   novos caem e os **14 antigos seguem verdes**, que é a medida exata da cegueira deles.
>
> **E a correção quase custou o dobro do que comprou**: pôr `useQueryClient()` em
> `useAdminProductList` derrubou **22 casos em 2 arquivos** com `No QueryClient set` — *no render, e
> não na asserção*, que é a `L-030` do projeto acontecendo com quem tinha acabado de avisar sobre
> ela. Em produção nunca falta (o `App.tsx` embrulha o painel inteiro); o que faltava era o provedor
> no `renderHook`. E o caso novo da aba precisou de **`fireEvent.mouseDown`, não `click`**: o
> `TabsTrigger` do Radix troca de aba no `onMouseDown`, e `click` não dispara mousedown — a aba não
> mudava e o caso reprovava por "não achei o rótulo", que se lê como defeito do componente errado.

> **O LINT CAIU de 27/6 para 26/6, e a queda tem causa nomeada.** O erro que sumiu é o
> `no-explicit-any` de `data.map((p: any) => …)` em `useAdminProducts.ts` — o mapeamento do catálogo
> inteiro, que **deixou de existir** quando o hook parou de carregá-lo (`BUS-27`). Baseline que cai
> também precisa ser anotada: senão a feature seguinte compara contra folga que não existe mais.

> **O número do STORE inclui trabalho de OUTRA sessão, e isso precisa estar escrito.** A `51` não
> encostou em `apps/store/**`; as bandeiras de pagamento do rodapé (`Footer.tsx`, `Footer.test.tsx`,
> `public/pagamentos/`) estavam na árvore sem commit quando esta feature correu. O 3376/218 é o mesmo
> número que a linha acima já registrava — **idêntico, não somado** —, mas quem ler o delta desta
> feature não deve atribuir aquele trabalho a ela.

> **A suíte da LOJA reprovou por causa de um arquivo do PAINEL, e o achado é de método.**
> `brandScan.test.ts` varre `apps/`, `packages/` e `supabase/` — inclusive **testes** —, e o caso que
> prova que a dobra alcança o `ñ` usava `dobrarTexto('Mañana')`, cuja saída **contém a marca
> anterior** como substring. O caso trocou de palavra e continua provando exatamente a mesma coisa.
> A regra prática: **o gate de uma feature do painel inclui a suíte da loja**, porque os guardas de
> lá varrem os dois apps — e um workspace verde não é o gate.

> **O filtro de nome do dono NÃO tinha a forma que a spec presumiu, e uma régua ingênua teria
> nascido verde sobre nada.** `useAdminProducts` monta `` `name.ilike.%…%` `` como **string** para o
> `.or()` do PostgREST; a chamada de método que existe naquele arquivo é sobre `sku`, em
> `product_variants`. Um guarda que só casasse `.ilike('name'` varreria o painel inteiro, encontraria
> **zero** e passaria — num guarda cuja asserção é uma ausência, isso não reprova: **aprova em
> silêncio**. É `L-033` de novo (régua por comando, nunca uma para a família), e o conserto foi casar
> as duas formas com sensor para cada. O recorte à esquerda é por token exato, senão
> `customer_name.ilike.` — a busca de PEDIDO, legítima — cairia junto (`L-034`).

> **`BUS-23` foi ESCRITA, e o alcance dela está declarado em vez de escondido.** A régua que recusa
> o catálogo virando `<option>`/`<SelectItem>` é ancorada no **nome** da variável, não na estrutura:
> uma régua estrutural ("uma iteração produzindo uma opção") acusaria as **doze** listas legítimas de
> categoria e de coleção do painel, que têm a forma idêntica, e um guarda que nasce reprovando doze
> vezes é um guarda que alguém desliga. **E a âncora dela não pôde ser a de sempre**: o dono é `<ul>`
> de `<li>` por exigência de `BUS-17`, então não existe ocorrência legítima dentro dele — inventar
> uma para satisfazer a forma da âncora seria uma âncora falsa. Ela é ancorada no **extrator de
> JSX**, que precisa continuar enxergando as doze listas que ela tem de NÃO acusar.

**As bandeiras de pagamento do rodapé somaram +5 no store**, medidos em 2026-09-14 com exit code
capturado fora de pipe e `--testTimeout=20000`: **3371/218 → 3376/218**, no arquivo que já guardava o
rodapé (`Footer.test.tsx`, 20 → 25). Os outros quatro workspaces **não foram tocados e não foram
remedidos** — a linha da tabela é a soma de um número medido com quatro de 2026-09-14. Lint ficou em
**2/2** no store e tipos em **0**; `pnpm build` verde, e os três guardas novos tiveram a sensibilidade
provada por **injeção real no arquivo real** (o CDN de volta em `PAYMENTS`, o Hipercard na fileira, e
o `loading="lazy"` removido), cada um derrubando **só** o caso que o nomeia.

> ⚠️ **O `--` antes da flag ENGOLE a flag, e a suíte volta ao teto de 5 s sem avisar.** Medido na
> verificação da `50`: `pnpm --filter <ws> test -- --testTimeout=20000` repassa o `--` **literal** ao
> vitest, o teto continua em 5000 ms, e o painel reprova 1 caso por timeout num arquivo alheio ao que
> se está medindo (`AdminLayout.test.tsx`, na ocasião). As duas formas que **funcionam** são
> `pnpm --filter <ws> test --testTimeout=20000` (sem o `--`) e
> `pnpm --filter <ws> exec vitest run --testTimeout=20000`. **A forma de invocar é parte da
> medição**: com a flag engolida, a reprovação parece defeito do arquivo que caiu, e o arquivo muda a
> cada execução.

**A feature `50` (produtos em destaque, e o painel que não recarrega) somou +278 em três
workspaces**, medidos em 2026-09-14 um por vez, com exit code capturado fora de pipe e
`--testTimeout=20000` na loja e no painel: **backoffice +194/+4** (o editor novo, o seletor, os dois
hooks com modo de leitura, o cabeçalho com `Salvo`, o movimento da lista, três guardas e os **+17 que
as duas rodadas de verificação independente cobraram**),
**store +49/+3** (`useProductsByIds`, o bloco, as três formas do `ProductCarousel`) e **core +35/+1**
(o módulo `featured` e o catálogo invertido). `functions` e `catalog-import` **não foram tocados e
foram remedidos** — idênticos. Lint ficou em **27/6** (backoffice 25/4 · store 2/2), tipos em
**0 · 0**, `pnpm build` verde nos dois apps, e `packages/core/src/payment/**` sem uma linha alterada,
conferido por `git diff --name-only -- packages/core/src/payment` (zero arquivos).

> **A baseline de entrada desta tabela estava velha em +3/+1 no store**, e é a **sexta** feature
> seguida a encontrar isso: a linha dizia `3319/214` e o disco tinha **3322/215** no commit
> `6c362bd`, de outra sessão. O delta acima é calculado sobre a **entrada medida**
> (core 2321/91 · store 3322/215 · backoffice 2345/136 · functions 599/13 · catalog-import 512/23 =
> 9099/478), nunca sobre o número que estava escrito aqui. **Meça com a árvore parada, antes de tocar
> em qualquer coisa** — e some conferindo.

> **Nenhuma migration, e é isso que `DST-23` prova.** O tipo `product_carousel` já estava no `check`
> desde a feature `24`, esperando renderer e editor; `display` é **valor** em `config jsonb`
> (`AD-014`). `homeSections.test.ts` fechou a feature **sem uma asserção tocada** — e o guarda que
> mudou foi `catalog.test.ts`, **invertido** e não descartado: ele asseria que
> `['product_carousel','category_grid']` eram "em breve", e passou a asserir que **só `category_grid`**
> é. Sem a inversão, entregar o bloco deixaria um guarda verde a favor do estado que a feature
> removeu — que é exatamente o que a `41` achou no cadeado do hero.

> **`ANI-07` é a AC que não se prova pelo resultado, e sim pela ORDEM.** "A animação não atrasa a
> gravação" é verdadeira nos dois mundos quando o teste só espera o fim: com a requisição atrás de um
> `setTimeout(…, 300)` a linha some do mesmo jeito, só que 300 ms depois. O caso que a prende
> (`HomeSectionList.test.tsx:528`) clica no `Remover`, **não põe um único `await` entre as duas
> asserções** e cobra as duas no mesmo tique — `onRemove` já foi chamado **e** a linha já carrega
> `data-saindo`. A mutação foi reinjetada no arquivo real: com o `setTimeout` na frente da chamada,
> reprovam três casos (o de `ANI-07` e os dois de `FOCO-25`, que medem a mesma chamada).
> **Microtarefa não roda entre duas linhas síncronas de teste**, e é essa propriedade do JavaScript
> que torna a asserção de ordem possível sem relógio falso.

> **O interruptor otimista precisou de um dublê que ENXERGA a janela** (`VIV-10`). Com a escrita
> respondendo na hora, "otimista" e "pessimista" produzem exatamente a mesma tela no fim, e toda
> asserção sobre o meio é verdadeira nos dois mundos — medido: a primeira escrita do caso "a
> revalidação não pisca" **sobreviveu** à remoção do otimismo. O conserto foi dar ao dublê um
> `segurarEscritas` (irmão do `segurarLeituras` que a fase 4 criou) e medir o valor **enquanto a
> releitura está no ar**. Os três mutantes — sem otimismo, sem a volta em caso de falha, e a
> revalidação piscando — foram reinjetados no hook real, e cada um derruba pelo menos um caso.

> **O guarda do movimento tem escopo LITERAL de oito arquivos, e isso é declarado, não escondido.**
> O painel carrega ~50 classes de `transition-*` de antes desta feature, **nenhuma com par**; uma
> régua sobre `apps/backoffice/**` nasceria reprovando cinquenta vezes, e guarda que nasce vermelho é
> guarda que alguém desliga. Os oito são os arquivos de UI que a `50` tocou — e duas classes antigas
> que moravam neles **ganharam o par** no caminho (`AdminMenuPage.tsx`, a aba Computador/Celular;
> `HomeSectionEditor.tsx`, o botão de remover). O resto fica como dívida, abaixo.

**A feature `48` (usuários do painel) somou +324 em quatro workspaces**, medidos em 2026-09-13 um por
vez e com exit code capturado fora de pipe: **backoffice +117/+7** (as duas telas, os dois diálogos,
o hook, o cartão de senha, o fluxo de recuperação e o guarda das rotas), **core +86/+4** (as recusas
puras e a pureza do módulo), **functions +73/+1** (a `admin-users`, mais 8 casos nos dublês de
`_shared/testing`) e **store +48/+2** (os dois guardas novos — a migration e a chave de servidor).
`catalog-import` não foi tocado e foi remedido — idêntico. `packages/core/src/payment/**` sem uma
linha alterada, conferido por `git status --porcelain`.

> **A verificação independente REPROVOU a primeira entrega, e o achado nº 1 é o pior tipo: o contrato
> de autorização do painel inteiro não tinha UMA asserção.** O verificador moveu `/admin/usuarios` e
> `/admin/conta` para fora do `<Route>` do `RequireAdmin` e rodou a suíte completa do backoffice —
> **2328 verdes**. As duas telas (a lista de quem administra a loja, com e-mail e último acesso, e o
> formulário de senha) renderizariam para visitante deslogado. `grep -rn RequireAdmin
> --include=*.test.*` devolvia **uma** ocorrência no painel, e era um comentário.
>
> **O guarda que existia não alcançava, e o motivo é reutilizável**: `navItems.test.ts` lê o
> `App.tsx` com `/path="(\/admin[^"]*)"/g` — um regex **plano**, cego a aninhamento. Para ele, uma
> rota dentro e uma rota fora do bloco guardado são a mesma coisa. **Régua que mede PRESENÇA não mede
> POSIÇÃO**, e autorização é posição. O guarda novo (`app/__tests__/rotasSobGuarda.test.ts`) recorta
> o bloco e compara índices, cobre a **classe** inteira (toda rota `/admin/*`, não só as duas que
> vazaram), e a mutação exata do verificador foi reinjetada no `App.tsx` real para ver as duas
> asserções reprovarem — com o `navItems.test.ts` seguindo verde em 25/25 ao lado.
>
> Os outros dois mutantes sobreviventes tinham a assinatura de sempre — **a asserção verdadeira nos
> dois mundos**: (1) o único teste de `delete` no hook exercitava o ramo de **recusa**, que retorna
> antes da releitura, então apagar o `refetch` de `remove()` deixava a linha da pessoa apagada na
> tela até um F5 — o irmão `revoke` tinha a asserção certa, `remove` não; (2) o caso do `23503`
> montava a corrida com as quatro contagens em **zero**, então a releitura devolvia `null`, a
> resposta caía no literal de fallback, e as duas asserções passavam com a releitura trocada por
> `null`. O conserto foi fazer a contagem **mudar entre as duas leituras** (0 → 4), que é a corrida
> de verdade, e asserir o **número** na frase.
>
> **E uma duplicação foi REMOVIDA em vez de testada**: `passwordChangeRefusal` era chamada no
> `ChangePasswordCard` **e** no `changeOwnPassword`, e as duas se mascaravam — remover qualquer uma
> deixava a suíte verde. A do componente não comprava nada (a do contexto já recusa antes da rede),
> então saiu. `ForgotPasswordFlow` mantém a dele, e ali é carga: `updatePassword` não confere nada.
>
> **A rodada 2 achou a lacuna que o conserto acima CRIOU, e esta é a lição mais reutilizável da
> feature.** Com a régua num dono só, mover o `supabase.auth.getUser()` para **antes** dela em
> `changeOwnPassword` passou a deixar a suíte verde — e `getUser` no supabase-js v2 **vai ao
> servidor** validar o JWT, então a mutação viola a letra de `USR-11`/`USR-23` ("antes de QUALQUER
> chamada de rede"). Na rodada 1 aquele mutante era **inalcançável**, porque o cartão já tinha
> recusado. Consolidar foi certo, e transferiu para a **ordem interna** de uma função uma promessa
> que as duas cópias sustentavam por acidente: **remover uma cópia move o ônus da prova, não o
> elimina.** O conserto é `expect(getUser).not.toHaveBeenCalled()` nos três casos de recusa local.

> ⚠️ **O teto de 5s da contenção alcança a LOJA também, não só o painel.** Medido duas vezes na
> verificação da `48`: a suíte do store reprovou com `Test timed out in 5000ms` em **5 casos de 4
> arquivos, todos de varredura de disco** — e os 4 passam isolados (44/44). Com
> `--testTimeout=20000` a suíte fecha **3176/205, contagem idêntica**. É a mesma assinatura que o
> achado da `46` descreve para o backoffice, e a instrução vale igual aqui: **antes de investigar uma
> reprovação da loja, confira se o erro diz `Test timed out in 5000ms`** — se disser, feche o que
> estiver rodando e remeça sozinho, ou suba o teto.

> **A baseline do backoffice estava velha em +24 quando esta feature começou** (dizia 2204/129, e o
> disco tinha **2228/129**). É a **quinta** feature seguida a encontrar isso. As outras quatro linhas
> batiam — e o motivo de baterem é que a `47` mediu de verdade ao fechar.
>
> **E a medição de entrada foi CONTAMINADA por mim mesmo**: a corrida de `core` pegou o
> `refusals.test.ts` que eu tinha acabado de escrever, e reportou 2221/85 em vez de 2199/84.
> Descontar os 22 casos devolveu o número certo, e o erro só foi visível porque o log nomeia cada
> arquivo. **Meça com a árvore parada** — a regra deste arquivo diz "meça na hora", e faltava dizer
> "antes de tocar em qualquer coisa".

> ⚠️ **Esta feature correu numa working tree COMPARTILHADA com outra sessão** — o quarto caso do
> projeto, depois da `45`, da `46`/`47` e do conserto dos diálogos. A outra sessão commitou quatro
> vezes durante a execução (`403c924`..`f8609b6`, 12:19–12:20), **inclusive a `spec.md` desta
> feature**. Os números acima não sofreram com isso porque aquele trabalho **já estava no disco** às
> 12:36, quando a baseline de entrada foi medida — mas a coincidência é sorte, não método. A âncora
> de contagem compartilhada é **esta tabela**, e é onde duas sessões somando +1 cada produzem um
> número que nenhuma das duas mediu.

> **Um erro de fuso horário quase entrou na listagem de acessos.** A fixture do teste usava
> `2026-09-10T00:00:00Z`, e meia-noite UTC renderizada em Porto Alegre é **o dia anterior** — o teste
> reprovou pedindo `10/09` e recebendo `09/09`. O conserto foi a fixture (meio-dia UTC, mesmo dia
> civil em qualquer fuso de −11 a +11), não a asserção: o componente estava certo, o teste é que
> media a máquina. Mesma família de `storeOrigin.test.ts`.
**Os números acima são da ÁRVORE MESCLADA — a `49` encontrando a `48`** (merge de 2026-09-13), e não
a soma de duas baselines. Os cinco workspaces foram medidos **um por vez**, com exit code capturado
fora de pipe, **depois** do merge, e os cinco passam limpos:

| Workspace | `48` sozinha (`master`) | `49` sozinha | **Árvore mesclada** |
| --- | --- | --- | --- |
| store | 3176/205 | 3271/212 | **3319/214** |
| backoffice | 2345/136 | 2228/129 | **2345/136** |
| core | 2285/88 | 2235/87 | **2321/91** |
| functions | 509/9 | 526/12 | **599/13** |
| catalog-import | 512/23 | 512/23 | **512/23** |

**A soma não é aritmética, e não deve ser lida como se fosse**: o store mesclado tem +2 arquivos
sobre a `49` sozinha e +9 sobre a `48`, e `functions` ganhou casos que **só existem porque as duas se
encontraram** — o guarda do CORS passou a cobrir a quarta function.

> **O merge da `49` com a `48` produziu QUATRO achados, e três são de âncora compartilhada.** O
> primeiro é o mais caro, e é novo neste repositório.
>
> - **As duas migrations nasceram com o MESMO timestamp — `20260913120000`.** Git não acusa: são
>   arquivos de nomes diferentes, o merge é limpo, os testes passam e `pnpm build` fica verde. Quem
>   acusaria é o banco, e tarde: `supabase_migrations.schema_migrations` tem `version` como chave, e
>   **version é só o prefixo numérico** — as duas disputam a mesma linha. O resultado seria uma
>   aplicada e a outra **permanentemente invisível para o `db push`**, sem erro em lugar nenhum,
>   exatamente o modo de falha que `AD-017` descreve ("o `db push` só olha o que falta, nunca o que
>   mudou no que já passou"). A da `48` chegou primeiro; a da `49` foi renomeada para
>   `20260913130000`, e o guarda dela acompanhou. **Antes de mergear feature paralela, compare o
>   prefixo das migrations — não o nome do arquivo.**
> - **As duas sessões reivindicaram `AD-034`.** A `48` chegou à `master` primeiro; a decisão da `49`
>   foi **renumerada para `AD-035`** no merge, com o motivo escrito na própria entrada. É a mesma
>   família do que este arquivo registra desde a `45` — duas sessões somando +1 no mesmo contador —,
>   só que desta vez no log de decisões em vez de na contagem de testes. **As duas não conflitam**:
>   o `AD-034` proíbe `apps/**` de tocar `auth.admin.*`, e a function `checkout` vive em
>   `supabase/functions/`. Conformidade, não exceção.
> - **O guarda do CORS da `49` acusou uma QUARTA cópia, e ela veio da `48`.** `admin-users/handlers.ts`
>   nasceu com a sua própria declaração de `corsHeaders` enquanto as outras três eram unificadas em
>   `_shared/http.ts`, em branches paralelas. O guarda reprovou na **primeira execução da árvore
>   mesclada** e a quarta passou a delegar. É exatamente o trabalho que ele existe para fazer, e o
>   caso mostra por quê: a cópia não veio de descuido, veio de **duas pessoas trabalhando ao mesmo
>   tempo sem se ver**.
> - **O quarto não é de âncora, e é o mais surpreendente: o `supabase start` MORRE por causa de um
>   COMENTÁRIO.** O bundler de functions do CLI varre dependências **por texto e não remove
>   comentário**. As duas features tinham escrito, em prosa, a forma literal de um import sem
>   extensão — para explicar por que ela é proibida —, e o CLI tentou montar arquivos que não
>   existem:
>
>   ```
>   failed to read file: open packages/core/src/admin-users/refusals: no such file or directory
>   failed to read file: open packages/core/src/checkout/types: no such file or directory
>   ```
>
>   O segundo só apareceu depois de o primeiro ser corrigido — a ferramenta para no primeiro. **É o
>   mesmo defeito que os guardas deste repositório combatem — casar MENÇÃO em vez de USO —, agora
>   dentro da ferramenta**, e o modo de falha é o ambiente local inteiro fora do ar. Nenhum teste
>   pega: `pnpm test`, `tsc` e `pnpm build` passam com o comentário ali.
>
>   **Regra prática**: ao explicar em comentário por que um import precisa de `.ts`, **não escreva a
>   forma proibida por extenso** — descreva-a. Vale para todo arquivo alcançável pelo grafo de uma
>   edge function.

**A feature `49` (checkout sem conta) somou +279 em três workspaces**, medidos em 2026-09-13 um por
vez e com exit code capturado fora de pipe, no worktree `49-checkout-sem-conta`: **store +143/+9**
(o convite, o desafio inline, `orderAccess`, `buildOrderPayload` e quatro guardas novos), **core
+36/+3** (`identity`, `guestAccess`, a identidade em `isContactComplete` e o guarda de alcance do
Deno) e **functions +90/+4** (a function `checkout` inteira, a segunda prova de posse do
`create-payment` e o dono único do CORS). Lint ficou em **27/6** e tipos em **0**; `pnpm build`
verde nos dois apps, e `packages/core/src/payment/**` sem uma linha alterada — conferido por
`git status --porcelain`.

> **Dos +279, exatamente 22 vieram DEPOIS da verificação independente**, consertando o que ela
> achou: 11 no store (a fiação do token nas duas pontas, `ENT-05`, `IDN-01`) e 11 em functions (os
> filtros de coluna, o log sem segredo, `ADR-G2`, a colisão de `order_number` e o vazamento de
> `client_request_id`). Nenhuma régua foi afrouxada — são asserções que **faltavam**.

> ⚠️ **A linha do BACKOFFICE mudou sem esta feature encostar nele**, e o registro importa mais que
> o número: a tabela dizia **2204/129** e o medido é **2228/129**, com `git status` e
> `git diff --name-only HEAD -- apps/backoffice packages/ui` devolvendo **zero** arquivo. O `+24`
> **não é desta feature** — é baseline envelhecida, a **quarta** ocorrência seguida (a `45` achou
> três linhas velhas, a `46`, a `47` achou quatro). O total anterior de `8479` portanto nunca
> existiu na árvore. O número acima é **medido**, não somado.

> **Três ACs seriam FALSAS com o plano cumprido à risca**, e as três só apareceram ao implementar:
>
> 1. **`CSC-05` — a convidada nunca receberia a aprovação do PIX.** Ela é detectada por Supabase
>    Realtime, que **respeita RLS**, e a única policy de `SELECT` em `orders` é `TO authenticated`
>    (conferido no banco). Quem compra sem conta é `anon`: o canal conecta, o filtro casa e o
>    payload **nunca chega** — sem erro nenhum. Ela pagaria e ficaria na tela do QR para sempre.
> 2. **`CSC-08` — o pedido órfão não seria pagável.** Com `customer_id` nulo, `buildPayer` não acha
>    CPF e o `create-payment` devolve 422 `missing_payer_cpf`: o pedido existiria, a cliente teria o
>    token, e o pagamento seria recusado por falta de um documento que ela já informou. O recuo para
>    `orders.customer_document` é o que torna a promessa verdadeira.
> 3. **`PED-04` — a retentativa devolveria o pedido SEM o acesso.** A retentativa que importa é
>    aquela em que a primeira resposta se perdeu na rede: o pedido foi gravado, o token foi emitido
>    e a cliente nunca o recebeu. O servidor guarda só o hash, então ele **reemite** e substitui —
>    quem chega ali apresentou o mesmo `client_request_id`, a mesma prova que autorizou a criação.
>
> As três têm a mesma assinatura: **a peça que o plano descreve funciona, e o CAMINHO não fecha.**
> Nenhuma apareceria num teste de unidade das peças — só ao perguntar "e depois, o que acontece?".

> **A verificação independente REPROVOU a primeira entrega, com 6 mutantes sobreviventes em 27, e o
> achado nº 1 é o da `41`/`44` pela terceira vez: as duas pontas provadas e o FIO entre elas não.**
>
> Duas mutações, cada uma sozinha suficiente para a convidada **nunca conseguir pagar**, passavam
> com **o store inteiro verde (3260/3260)**: apagar `rememberAccess(...)` de `CheckoutPage.tsx`
> (o token chega e é jogado fora) e remover `access_token` do corpo em `useCreatePayment.ts` (403
> no caixa). `guestAccess` provava o token, `orderAccess` provava o storage e `createOrder.test.ts`
> provava a emissão — **nenhum teste da loja citava `access_token` num corpo de `create-payment`**.
>
> Os outros quatro, por ordem de utilidade do padrão:
>
> - **Nenhum filtro de coluna de `create-order` era observável.** O dublê compartilhado só enxerga
>   o `.eq()` quando a fixtura é **função**, e todos os cenários usavam fixtura de valor: trocar
>   `client_request_id` por `customer_email` no filtro da idempotência deixava **66/66 verdes** — e
>   faria a segunda compra devolver o pedido da primeira, com a pessoa pagando o pedido errado.
>   **A capacidade do dublê é parte da régua**: um dublê que não enxerga o filtro torna o filtro
>   inauditável, e nada acusa.
> - **A asserção de ordem era verdadeira nos DOIS mundos.** `tabelasGravadas[0] === 'orders'` mais
>   `adminCreateUsers.length === 1` sobrevivia à inversão da ordem — as duas listas são
>   independentes, e `orders` seria a primeira gravação de qualquer jeito. Quem matava o mutante
>   eram os vizinhos, por acidente. A régua virou **temporal**: o dublê é perguntado de dentro do
>   `createUser`, e nesse instante `orders` e `order_items` já têm de estar gravados.
> - **`ADR-G2` tinha só o nome de um `describe`**, sem um caso sequer, e a dimensão *Observabilidade*
>   ("nunca registra o token") não tinha asserção nenhuma — pôr o token no log deixava 518/518
>   verdes.
> - **`BL-031` e um comentário de código afirmavam o OPOSTO do schema.** Diziam que
>   `orders.order_number` era "text sem índice único" e que a colisão seria "silenciosa";
>   `orders_order_number_key` existe desde `20260415090935_…:49` e está aplicada. É `AD-012`
>   cometido dentro da feature que o cita — **afirmação à mão sobre schema, sem verificação** —, e a
>   consequência real era pior que a descrita: colisão **derruba a venda com 500**. O conserto foi
>   o sufixo aleatório, com o caso medindo 40 números distintos sob **relógio fixo**.

**O conserto da posição dos alvos de toque somou +16 em UM workspace**, medidos em 2026-09-13 com
exit code capturado fora de pipe: **store 3111/202 → 3128/203** (o guarda novo, 14, e os dois casos
de posição em `HeroCarousel.test.tsx`; o +1 restante veio da sessão vizinha durante a medição). Os
outros quatro não foram tocados. Tipos em **0**, e `packages/core/src/payment/**` sem uma linha
alterada.

> **O auxiliar de toque apagava a posição do controle, e o sintoma não aparecia em diff nenhum.**
> `TAP_44` começa com `relative` — precisa começar, senão o pseudo de 44px sobe para o ancestral
> posicionado —, e isso colide com o `absolute` do próprio controle de **duas** maneiras: em
> `cn(classes, TAP_44)` o `twMerge` **apaga** o `absolute`; em `` `${TAP_44} absolute …` `` não há
> fusão, as duas classes chegam ao DOM e `.relative` vence por vir **depois** de `.absolute` na folha
> de estilo. Nos dois caminhos o controle cai no fluxo normal, com build, `tsc` e suíte verdes.
>
> Medido no navegador, num palco de 400px: a forma antiga centrava a seta em **600** (200px abaixo da
> faixa); a corrigida, em **200** — o meio exato. Eram **9 pontos**: as 2 setas do Banner principal
> (o defeito relatado), o coração e o "+" do `ProductCard` — **32 elementos na home**, com os botões
> fora do card — e as 5 setas da `ProductGallery`.
>
> **A primeira escrita do guarda só olhava `cn()`, e 7 dos 9 pontos eram template literal.** Ela
> passaria vazia parecendo saudável. É a lição de sempre numa forma nova: **a régua tem de medir a
> propriedade, não o formato em que ela apareceu da primeira vez** — e a âncora que a salvou foi a
> que exige encontrar **as duas formas**, não só uma contagem acima de zero.
>
> **E nenhuma asserção existente pegava isso.** Os 12 casos das setas em `HeroCarousel.test.tsx`
> conferiam rótulo, `hidden`, `md:flex` e `before:h-11` — todos verdadeiros **nos dois mundos**. A
> asserção que faltava é a de token exato nos dois lados: o `absolute` **está** e o `relative`
> **não está**.

**O conserto da trilha dos diálogos somou +10 em UM workspace**, medidos em 2026-09-13 um por vez e
com exit code capturado fora de pipe: **store 3087/200 → 3111/202**. Os outros quatro foram remedidos
e vieram idênticos. Lint ficou em **27/6** e tipos em **0 · 0 · 0**; `pnpm build` verde nos dois apps,
e `packages/core/src/payment/**` sem uma linha alterada.

> ⚠️ **Do +24 do store, só +10 são deste trabalho — e a linha do store já nasceu envelhecendo.**
> A working tree estava sendo **compartilhada com outra sessão** (terceiro caso do projeto, depois da
> `45` e da `46`/`47`), que entregou `folgaDoHeader.test.ts` (+10) e casos em `FaqPage.test.tsx` (+4)
> enquanto esta medição corria — e, **depois** de medida, seguiu para `HeroCarousel` e
> `alvoDeToqueNaoRoubaPosicao.test.ts`, que **não estão** no 3111. O número é um instantâneo honesto
> de 2026-09-13, não o estado da árvore agora.
>
> A propriedade dos arquivos ficou disjunta por sorte, não por combinação: ela em `pages/**`,
> `shared/ui/**` e `widgets/hero-carousel/**`; esta em `packages/ui/src/{dialog,alert-dialog}.tsx` e
> `shared/lib/__tests__/dialogGridTrack.test.ts`. **A âncora de contagem compartilhada é esta
> tabela** — é onde duas sessões somando +1 cada produzem um número que nenhuma das duas mediu. O
> que sobrevive à próxima leitura é o **+10 atribuído**; o total do store, remeça antes de usar como
> gate.

> **O defeito que motivou o guarda estava no PRIMITIVO, não na tela que o exibiu.** A cliente viu
> `AddQuestionDialog` estourando; a causa era `DialogContent` — o `grid` sem trilha —, e a mesma
> linha estava copiada em `alert-dialog.tsx`, servindo as 15 telas de diálogo do painel. Quando uma
> tela quebra num contêiner compartilhado, a busca por "quem mais tem esta linha" não pode parar na
> tela.

> **Nenhuma suíte deste repositório poderia ter pego isso, e não é falha de cobertura.** jsdom
> devolve 0 para toda medida de layout, então `getBoundingClientRect`, `scrollWidth` e trilha de grid
> valem zero lá dentro. A prova foi um **navegador de verdade**: uma página de repro servida pelo
> Vite do painel, montando o diálogo com 66 entradas, e o Chromium medindo `gridTemplateColumns`.
> Vale como método para o próximo defeito de layout — **o guarda que sobra depois lê o fonte do
> disco, porque é o que jsdom alcança**.

> ⚠️ **A suíte da LOJA também precisa de `--testTimeout=20000`** — achado da `49`, e o `CLAUDE.md`
> registrava isso só para o painel. Sem o teto maior, **seis casos reprovam em três arquivos que
> varrem disco** (`routes`, `accentText`, `touchTarget`), todos com `Test timed out in 5000ms`, e
> **o arquivo muda a cada execução** — a assinatura de contenção. Com o teto: **3128/203, exit 0**,
> na mesma árvore em que a execução anterior tinha reprovado. Os três passam isolados.
>
> A armadilha é de diagnóstico: a primeira leitura desta feature concluiu "não são timeouts" porque
> o `grep` foi feito no **arquivo de saída do comando em background** (11 linhas, só o resumo) em
> vez do log completo. Antes de investigar uma reprovação, confira a mensagem no log inteiro.

> ⚠️ **A suíte do backoffice precisa de `--testTimeout=20000` para ser medida com confiança**, e isso
> é achado da `46`, não preferência. Os guardas que varrem disco (`SlugField`, `CategoryInspector`)
> levam segundos cada; sob a contenção da suíte completa eles cruzam o teto padrão de **5s** e
> reprovam por **timeout, nunca por asserção** — e o arquivo que reprova **muda a cada execução**,
> que é a assinatura de contenção. Medido três vezes: passam isolados (49 testes, 4,39s só de
> execução), reprovam 1–2 por vez na suíte cheia, e com o teto em 20s a suíte fecha **123/123**.
> `--no-file-parallelism` também resolve, mas passa de 10 minutos.
>
> **Isto não conserta o CI**, que já roda `--concurrency=1` no nível do turbo. É instrução de
> medição local: antes de investigar uma reprovação do painel, confira se o erro diz
> `Test timed out in 5000ms` — se disser, remeça com o teto maior.
>
> **A `47` confirmou o achado sem saber dele**: a flake apareceu duas vezes no fecho dela, em
> arquivos diferentes (`CategoryInspector` numa execução, `SlugField` na outra), e sumiu com o teto
> maior. Duas sessões chegaram ao mesmo diagnóstico em paralelo.

**Os números acima são da ÁRVORE MESCLADA — a `47` encontrando a `46`** (merge de 2026-09-13), e não
a soma de duas baselines. Os cinco workspaces foram medidos **um por vez**, com exit code capturado
fora de pipe, **depois** do merge, e os cinco passam limpos:

| Workspace | `47` sozinha | `46` sozinha (`master`) | **Árvore mesclada** |
| --- | --- | --- | --- |
| store | 3069/198 | 3087/200 | **3087/200** |
| backoffice | 2204/129 (1 ✗) | 2073/123 | **2204/129** |
| core | 2199/84 | 2186/84 | **2199/84** |
| functions | 436/8 (1 ✗) | 436/8 | **436/8** |
| catalog-import | 512/23 | 512/23 | **512/23** |

> **O merge APAGOU as duas reprovações e os cinco erros de tipo que a `47` carregava na baseline.**
> Ela fechou com `FaqEditorDialog.test.tsx` e o `handlers.test.ts` do sitemap vermelhos, e com o
> typecheck do store em 5 — tudo herdado da `46` pelo `ff-only` do começo, e **registrado em vez de
> consertado**, porque eram arquivos de outra sessão. Os três últimos commits da `46` consertaram os
> três. **A decisão de não consertar de passagem estava certa**, e o registro é o que fez a
> diferença: sem ele, a `47` teria fechado ou escondendo reprovações ou mexendo em arquivo alheio.

**A feature `47` (painel em foco) somou +144 em dois workspaces**, medidos em 2026-09-12/13 um por
vez e com exit code capturado fora de pipe, no worktree `../store-47-painel-em-foco`: **backoffice
2073/123 → 2204/129** (+131/+6) e **core 2186/84 → 2199/84** (+13). Store, functions e
catalog-import não foram tocados por ela e foram remedidos assim mesmo. `pnpm build` verde nos dois
apps, e `packages/core/src/payment/**` sem uma linha alterada.

> **A verificação independente REPROVOU a primeira entrega, e os dois mutantes sobreviventes tinham a
> mesma assinatura: a asserção que é verdadeira nos DOIS mundos.**
>
> 1. Apagar o `removeEventListener` de `useFullscreenStage` deixava **52 testes verdes**. O caso
>    asseria `expect(() => teclar('Escape')).not.toThrow()` — e em React 18 um `setState` depois do
>    unmount é **no-op silencioso**, então não lançar é verdade com o ouvinte vazando. A régua virou
>    **identidade do handler**: o que entra no `addEventListener` tem de ser exatamente o que sai.
> 2. Trocar a altura do quadro por `PREVIEW_DEVICES[device].height` deixava **26 verdes**: a barra
>    imprimiria `1024 × 948` e o iframe sairia com **768**. `FOCO-16`/`FOCO-17` estavam provados **só
>    em `core`**, nunca na superfície — e em jsdom a caixa do palco é `{0,0}`, então os dois modos
>    imprimiam o mesmo texto. O conserto foi **dar ao palco uma medida**: um `ResizeObserver` dublê,
>    porque jsdom não implementa o observador.
>
> **A lição de método é a segunda**: quando a regra pura está testada em `core` com caixas
> sintéticas, é tentador considerar a superfície coberta pelo teste de "a métrica vem do dono". Não
> está — em jsdom, *todos* os caminhos colapsam no mesmo valor de piso, e o teste passa a medir a
> ausência de layout em vez da regra. **Prova de geometria em componente exige palco medido.**

> **A tabela de baselines estava desatualizada em QUATRO das cinco linhas quando esta feature
> começou**, e o total de `8054` **nunca existiu na árvore** — era a soma de números anteriores à
> `46`. Medido do disco com `git status` vazio: store dizia 2955/189 e era **3069/198**; backoffice
> dizia 2023/119 e era **2073/123**; core dizia 2128/80 e era **2186/84**. Só catalog-import batia.
> É a terceira feature seguida a encontrar isto (a `45` achou três linhas velhas, a `44` uma). O
> padrão é estável o bastante para virar regra: **quem fecha a feature mede; quem abre a próxima
> mede de novo.**

> **Dois achados de método, e os dois são o mesmo erro em lugares diferentes: a régua que casa
> MENÇÃO em vez de USO.** O guarda do trilho reprovou o próprio `NavRail.tsx` porque o arquivo
> explica em comentário por que `TAP_44` **não** é importado; o de `HomeLivePreview` reprovou porque o
> arquivo diz em comentário que a `FOLGA` saiu dali. Nos dois casos a régua acusava exatamente o
> arquivo que estava certo. O conserto é o mesmo dos guardas antigos — remover comentário de linha e
> de bloco na **mesma** varredura, com `[^\n\r]` fechando antes do `\r` — e cada um ganhou sensor
> provando que um `import` de verdade **continua** sendo acusado.

> **O ponto cego do `classesDe` era real, e foi consertado ANTES de o componente mudar.** A régua do
> `<aside>` casava só `className="literal"`; a largura do trilho obrigava um `cn()`, e sem a extensão
> a **âncora passaria a medir string vazia** — as quatro asserções de posição continuariam verdes
> sobre nada. A ordem importou: T5 estendeu a régua (com sensor de que um `cn()` sem os invariantes
> reprova, e outro de que uma sintaxe ilegível derruba a âncora) e só T7 tocou no componente.

**A feature `46` (perguntas frequentes da loja) somou +240 em quatro workspaces**, medidos em
2026-09-12 um por vez e com exit code capturado fora de pipe: **store +132/+11** (a página, o slice
`entities/faq`, os dois hooks de `<head>` e três guardas novos), **core +58/+4** (`text`, `page`,
`jsonld` e a pureza de `core/faq`), **backoffice +50/+4** (a curadoria) e **functions +0** (o teste
do sitemap mudou de número, não de contagem). `catalog-import` não foi tocado e foi remedido —
idêntico. Lint ficou em **27/6** e tipos em **0·0·0**; `packages/core/src/payment/**` e
`supabase/functions/mercado-pago/**` não tiveram uma linha alterada, conferido por
`git diff --name-only bd35225..HEAD`.

> **Três consequências apareceram FORA do workspace que a task estava medindo**, e as três valem
> como método:
>
> - **Mudança em `packages/core` tem gate de TRÊS workspaces, não dois.** O gate da task que subiu
>   `FAQ_ANSWER_MAX` rodou core e store; o `FaqEditorDialog` do **painel** lê a mesma constante e o
>   contador dele seguiu dizendo "0 / 600". Os números dele passaram a vir da constante, com âncora
>   ao lado — senão as duas linhas passariam com a constante zerada.
> - **Acrescentar rota a `SITEMAP_STATIC_PATHS` muda a saída da edge function do sitemap**, e o
>   teste dela conta `<loc>`. Foi o guarda bidirecional pegando uma consequência a um workspace de
>   distância.
> - **Seis âncoras de contagem dispararam** ao declarar a rota (17→18 slugs, 20→21 reservados, 6→7
>   institucionais, 16→17 páginas lazy, 21→22 rotas, 10→11 `<loc>`). Todas atualizadas para o número
>   verdadeiro, nenhuma afrouxada — é exatamente o trabalho que elas existem para fazer.


**A feature `45` (as políticas da loja) foi medida em 2026-09-12 na árvore COMBINADA**, um workspace
por vez e com exit code capturado fora de pipe. "Combinada" é literal: **duas sessões trabalharam na
mesma working tree ao mesmo tempo** — a `45` (as duas páginas de política, o `PolicyDocument` e os
guardas) e um trabalho paralelo que entregou `/cuidados-com-sua-joia-afetiva` sobre o mesmo
`PolicyDocument` **e removeu `/politicas`**. Os números abaixo são das duas coisas juntas, e **não
devem ser lidos como delta de uma feature só**.

| Workspace | Entrada medida | Saída | Delta |
| --- | --- | --- | --- |
| store | 2853/184 | **2955/189** | +102/+5 |
| core | 2121/80 | **2128/80** | +7 |
| functions | 436/8 | **436/8** | 0 |
| backoffice | 2023/119 | **2023/119** | 0 — não tocado, remedido |
| catalog-import | 512/23 | **512/23** | 0 — não tocado, remedido |

Lint ficou em **27/6** (backoffice 25/4 · store 2/2), tipos em **0·0·0**, `pnpm build` verde nos dois
apps, e `packages/core/src/payment/**` sem uma linha alterada — conferido por `git diff --name-only`.

> **TRÊS das cinco baselines desta tabela estavam DESATUALIZADAS antes desta feature**, e o achado é
> o mais reutilizável dela. Medidas do disco com a árvore limpa em `3fe19b1`, **antes** de qualquer
> edição: core dizia `1811/70` e era **2121/80** (+310/+10); functions dizia `370/7` e era **436/8**
> (+66/+1); backoffice dizia `2002/119` e era **2023/119** (+21). Só o store batia.
>
> O total anterior (`7548 em 403`) portanto **nunca existiu na árvore** — é a soma de três números
> velhos com dois certos. Pelos deltas, o envelhecimento vem do fecho da `42`/`43`. A correção está
> aplicada acima: o número novo é **medido**, não `7548 + 506`.
>
> É a lição que este arquivo já repete desde a `32` — *"baseline anotada de memória, ou de uma
> execução anterior à última alteração, mente sem quebrar nada"* —, agora com a consequência
> concreta: **uma baseline velha faz o gate da feature seguinte comparar contra folga que não
> existe**, e o erro se acumula em silêncio por features inteiras.

> **O full run de um workspace acha o que o arquivo tocado não acha.** A remoção de `/politicas`
> passou nos testes de `routes.test.ts` e derrubou `core/home/__tests__/refusals.test.ts`, que usava
> `/politicas/troca/prazo` como exemplo de **"uma rota de verdade"**. O caso passou a medir o oposto
> do que o nome dele diz — sem ninguém tocar em `ctaHrefRefusal`. Conserto: fixture sob `/produtos` e
> **a asserção `expect(ROUTE_SLUGS).toContain('produtos')` ao lado**. *Fixture que nomeia uma rota
> precisa provar que ela existe*, senão a próxima remoção o apodrece de novo em silêncio.

**A feature `44` (gaveta de material na página do produto) somou +106 em UM workspace**, medidos em
2026-09-11 com exit code capturado fora de pipe: **store 2747/175 → 2853/184**. Os outros quatro não
foram tocados — `git status` só acusa `apps/store/**` e `.specs/**`. Lint ficou em **27/6**, tipos em
**0·0**, e `packages/core/src/payment/**` não teve uma linha alterada.

> **A baseline de entrada do store NÃO era a que este arquivo dizia.** A tabela registrava 2664/169;
> o medido no início da `44` foi **2747/175**. A diferença (+83/+6) era o trabalho da página do
> produto que estava **na árvore sem commit** e que virou o commit `9d873d6` no meio desta feature —
> não uma baseline errada. É a mesma lição de sempre numa forma nova: **baseline é do que está no
> disco, não do último commit**, e medir na hora é o que separa "+106" de um número inventado.

> **A verificação independente REPROVOU a primeira entrega da `44`, e o achado nº 1 é o da `41`
> repetido letra por letra.** O teste que provava "o fio entre o gatilho e a gaveta" **montava a
> própria árvore**: ele renderizava `<ProductInfo />` e `<MaterialDrawer />` lado a lado, escritos
> dentro do próprio arquivo de teste. Apagar `<MaterialDrawer />` de `ProductPage.tsx` fazia a gaveta
> sumir da loja inteira com **2828 testes verdes** — e o comentário que dizia "este é o caso que
> reprova se a gaveta sair da página" era falso. **Um teste que monta a árvore que quer provar não
> prova árvore nenhuma**: quem monta tem de ser a página.
>
> Os outros três mutantes sobreviventes tinham a mesma assinatura — asserção ao lado do ponto:
> `MaterialAviso` foi extraído **para o tom `alerta` não ter dois donos** e saiu sem uma asserção
> sequer sobre o tom; a gaveta só era testada com `cinzas`, que tem **um** aviso, então
> `avisos.slice(0,1)` passava; e o chip escolhido era provado só por `aria-pressed`, então colapsar
> os dois ramos de classe deixava a cliente tocando num chip que não mudava de cara.

> **Um guarda estreitado é um guarda com sensor nos DOIS sentidos.**
> `semMaterialNaPaginaDoProduto.test.ts` deixou de recusar `requiresMaterial` e continua recusando as
> outras sete formas. Sem o segundo grupo de sensores — **um por forma**, e não um bloco só —, um
> regex que perdesse tudo passaria como "estreitado", e a página do produto voltaria a anunciar
> `material_kinds` com a suíte verde. A sensibilidade foi provada por injeção real no arquivo real:
> `materialKindsOf` em `ProductInfo.tsx` reprova, `requiresMaterial` passa.

> **O mock com dado de mentira custou uma reescrita, e teria custado a feature.** O desenho no Paper
> usava rótulos curtos inventados para os chips; o dado real (`ATALHOS_DE_MATERIAL`) tem títulos como
> `Unhas (humanas ou de pet)`, e com eles os chips ocupam **7 fileiras** e empurram a ficha para fora
> da tela de 390×844. O conserto foi um campo `rotuloCurto` no mesmo registro — não uma segunda
> lista. É `AD-012` noutra roupa, e a mesma armadilha das vagas do carrossel na `41`: **medida
> suposta é afirmação; o dado do repositório é a verificação.**

**A feature `41` (banner principal da home) somou +265 em três workspaces**, medidos em 2026-09-06 um
por vez e com exit code capturado fora de pipe: **store +126/+4** (o widget, o hook, os dois guardas
novos e a fiação), **core +83/+2** (`surfaceArt`, `carousel` e os casos de `resolve`) e **backoffice
+56/+1** (o editor, a remoção de seção e as ACs que a verificação cobrou). Functions e catalog-import
não foram tocados e foram remedidos assim mesmo — idênticos. Lint ficou em **27/5** e tipos em
**0 · 0**, sem mexer; `packages/core/src/payment/**` não teve uma linha alterada, conferido por
`git diff --name-only`.

> **A `41` teve DUAS rodadas de verificação independente, e as duas acharam o mesmo tipo de coisa em
> escalas diferentes.** A rodada 2 achou o achado nº 1 **um nível acima**: as duas pontas da remoção
> de seção estavam provadas — o hook e a lista — e **o fio entre elas não**. Apagar
> `onRemove={handleRemove}` da página fazia o botão sumir da tela inteira com a suíte do backoffice
> verde. É a mesma forma pela qual `deleteSection` viveu uma feature inteira exportada e sem
> consumidor.
>
> **A régua de opacidade errou duas vezes pela mesma razão, e a segunda por UM caractere**: ela via o
> `fade-in` do `tailwindcss-animate` e era cega a `animate-fade-in`, `animate-scale-in` e
> `animate-slide-up` — as três declaradas pelo **próprio preset deste repositório**, as três com
> `opacity: "0"` no primeiro quadro. O caractere anterior ali é um hífen, não um espaço.

> **A verificação independente REPROVOU a primeira entrega, e o achado nº 1 era o pior tipo possível:
> `AD-029` tinha parado no banco.** O trigger fora trocado, mas o painel continuava trancando a
> Chamada principal com um cadeado — e `HomeSectionList.test.tsx` **asseria a trava**, ou seja, a
> suíte estava verde a favor do comportamento que a spec mandava remover. `deleteSection` existia no
> hook desde a feature 24 e **nenhuma tela a consumia**. Resultado: a Adri arrastaria o Banner
> principal para o topo e o hero continuaria acima dele — exatamente o problema que a feature existe
> para resolver, entregue "completo" com 7307 testes passando.
>
> **A lição de método é a mais reutilizável desta feature**: quando uma AC remove uma trava, o teste
> que a defendia tem de ser **invertido**, não deixado de lado — e a busca por "quem mais aplica esta
> regra" não pode parar na camada onde a mudança começou.

**A `41` derrubou a última exceção estrutural da Home: o hero deixou de ser indelével** (`AD-029`).
`HOME-08` nunca existiu para proteger o hero — existiu para tornar impossível uma Home com zero
seções ativas —, e a invariante foi **generalizada**, não apagada: `guard_last_active_home_section`
recusa desligar ou apagar a **última seção ativa**, qualquer que seja o tipo. `homeSections.test.ts`
guarda a troca nos **dois sentidos**: o guarda novo existe **e** o antigo não existe mais. Sem o
segundo sentido, uma migration que criasse um sem derrubar o outro deixaria o hero indelével com a
suíte verde.

> **O `tsc` pegou três construções de `ResolvedItem` que a varredura da loja não tinha**, e isso é
> registro de método, não de bug: `useAdminResolvedHome` (backoffice) monta o mesmo tipo em três
> ramos, e `strictNullChecks: false` **não** dispensa propriedade obrigatória. Campo novo em tipo
> compartilhado se conta com `tsc`, nunca com grep.

**A feature `40` (estabilidade da home) somou +48 em um workspace só**, medidos em 2026-09-06 com
exit code capturado fora de pipe: **store 2490/161 → 2538/165**. Os outros quatro não foram tocados
e foram remedidos assim mesmo — idênticos. Lint ficou em **27/5** e tipos em **0**, sem mexer;
`packages/core/src/payment/**` não teve uma linha alterada, conferido por `git diff --name-only`.

**Quatro arquivos de guarda novos, e os quatro nasceram de um defeito medido no Lighthouse**, não de
zelo: `categoryTreeSingleOwner` (5), `cardSkeletonBox` (8), `heroSemOpacidadeZero` (9) e
`arbitraryTextColor` (11). Os outros +15 cresceram dentro de arquivos que já guardavam o assunto.

> **A verificação independente derrubou TRÊS mutantes desta feature, e os três estavam em cima de um
> AC.** Foi a primeira `validation.md` do projeto com autor ≠ verificador — a fila que a `39`, `37`,
> `35`, `34`, `33` e `32` acumularam —, e o retorno pagou na hora: apagar `loading={isLoading}` do
> `HomeCollectionRow` devolvia **o CLS inteiro** com os 2531 testes verdes; uma chave de categorias
> compartilhada entre as fileiras mas **diferente da do header** media 1 requisição no teste e 2 na
> home; e o guarda do hero, ancorado na sintaxe do variant, não via `<motion.p initial={{ opacity: 0
> }}>` — a porta ao lado, com o mesmo efeito. **Guarda ancorado em sintaxe guarda a sintaxe, não a
> regra.**

**A sidebar fixa e os grupos colapsáveis somaram +32 no backoffice**, medidos em 2026-09-06 um
workspace por vez e com exit code capturado fora de pipe: **1914 em 116 → 1946 em 118**, em dois
arquivos novos (`navCollapse.test.ts`, 16, e `AdminLayout.test.tsx`, 16). Os outros quatro workspaces
não foram tocados e não foram remedidos. Lint ficou em **27/5** (backoffice 25/4) e tipos em
**0·0·0**; `packages/core/src/payment/**` não foi tocado, conferido por `git diff --name-only`.

**O número anterior (7014/375) é da ÁRVORE MESCLADA — a `39` encontrando a `38` na `master`** (merge de 2026-09-06),
e não a soma de duas baselines. Os cinco workspaces foram medidos **um por vez**, com exit code
capturado fora de pipe, e os cinco passam limpos.

| Workspace | `39` sozinha | `38` sozinha (`master`) | **Árvore mesclada** |
| --- | --- | --- | --- |
| store | 2212/144 | 2270/152 | **2490/161** |
| backoffice | 1908/116 | 1789/109 | **1914/116** |
| core | 1691/67 | 1524/61 | **1728/68** |
| functions | 350/7 | 370/7 | **370/7** |
| catalog-import | 509/23 | 512/23 | **512/23** |

**O merge acrescentou 7 casos, e nenhum deles é herança de uma das pontas** — são o trabalho que só
existe porque as duas se encontraram. Os banners do menu passaram a pedir a foto no tamanho da vaga
(`renditionUrl`/`renditionSrcSet`), que a `39` **não pôde** usar porque o módulo vivia só na
`master`, e o `design.md` dela registra isso por escrito:

| Onde | Casos | O quê |
| --- | --- | --- |
| store `MegaMenu.test.tsx` | **+2** | a vaga de 320px pede 640 no `src`, `srcset` de `[320, 640]` e `sizes`; e o par — arte de fora do Storage sai **inalterada**, sem `srcset` inventado |
| store `MobileMenu.test.tsx` | **+2** | o mesmo, na vaga quadrada de 104px da folha do celular |
| backoffice `MenuBannerEditor.test.tsx` | **+2** | o mesmo, na miniatura de 64px do painel |
| backoffice `shared/lib/__tests__/uploadImage.test.ts` | **+1** | o sensor de que o endereço ANTIGO do upload não pode voltar a gravar `cacheControl` — os 3 casos do `PRF-05` não são novos, **mudaram de arquivo** |

**Os 3 casos do `PRF-05` da `38` não caem em lugar nenhum, e a mudança de casa é a razão de terem
se mexido.** A `38` pôs `cacheControl: STORAGE_CACHE_CONTROL` em
`features/product-form/lib/uploadProductImage.ts`; a `39` mudou o motor de upload para
`shared/lib/uploadImage.ts` e o merge automático manteve as duas coisas sem conflito — com o
resultado de o painel voltar a gravar **uma hora** de cache e o guarda ler um arquivo que já não faz
upload nenhum. Peça certa, endereço errado, suíte verde. O conserto foi portar a constante para o
endereço novo e mover os casos com ela.

**A soma não é aritmética, e não deve ser lida como se fosse.** As duas features mexeram nos mesmos
arquivos de teste (`SearchOverlay.test.tsx`, `routing.test.tsx`, `MegaMenu.test.tsx`,
`uploadProductImage.test.ts`), e cada baseline escrita abaixo é anterior aos últimos commits da
própria feature — a `38` registra esse envelhecimento no bloco dela. **O número que vale é o
medido**, e ele foi medido aqui.

Lint ficou em **27/5** (backoffice 25/4 · store 2/1) e tipos em **0 · 0 · 0**, os dois medidos na
árvore mesclada. `pnpm build` passa nos dois apps. `packages/core/src/payment/**` não teve uma linha
alterada pelo merge — conferido pelo diff de nomes de arquivo do merge.


**As duas dívidas que a `39` registrou somaram +22, todas no store**, medidas em 2026-09-06 um
workspace por vez e com exit code capturado. **Nenhum arquivo novo de teste**: as duas cresceram
dentro dos arquivos que já guardavam o assunto.

| Dívida | Onde | Delta |
| --- | --- | --- |
| **`BL-027`** — o ponto cego do removedor de comentário do guarda do frete grátis | store `freeShippingSingleOwner.test.ts` (15 → 17) | **+2**, os dois sensores novos (o glob que cegava, e a leitura fora do allowlist ao lado dele). Nenhuma asserção de regra tocada, e nenhuma passou a reprovar — o ponto cego não escondia leitura nenhuma |
| **`BL-028`** — a barra cheia sem afordância de rolagem para mouse | store `Header.test.tsx` (26 → 38) e `menuSemTeto.test.ts` (15 → 23) | **+20**: 12 casos de estado (cabe · começo · meio · fim · fim fracionário · os dois cliques · rótulos · alvo de 44 · a camada fora do `<nav>` · o teclado intacto) e 8 de forma, com as duas réguas escritas como **predicado** para asserção e sensor chamarem a mesma função |

Lint ficou em **27/5** (store 2/1 · backoffice 25/4) e tipos em **0 · 0**, sem mexer. Core,
functions e catalog-import não foram tocados e foram remedidos assim mesmo: 1691/67, 350/7 e 509/23.
`packages/core/src/payment/**` não teve uma linha alterada.

**A feature `39` (menu configurável) somou +484 em três workspaces**, medidos em 2026-09-05 um por
vez, na ordem, e com exit code capturado: **core +198/+7**, **store +181/+9** e **backoffice
+105/+6**. Functions e catalog-import não foram tocados. Lint ficou em **27/5** e tipos em **0 · 0**,
sem mexer; `packages/core/src/payment/**` e `supabase/functions/mercado-pago/**` seguem intocados —
conferido por `git diff --name-only`. **Três quedas declaradas**, e nenhuma é deleção silenciosa:

| Queda | Onde | Por quê |
| --- | --- | --- |
| **−3 e −3** | store `MegaMenu.test.tsx` (19 → 31) e `MobileMenu.test.tsx` (15 → 30) | saíram a faixa `TrendingLane` (3 produtos automáticos por `is_featured`, que a Adri não escolhia nem via) e o card `menu_promo` (retângulo de cor sem imagem). Os dois arquivos **cresceram** na mesma reescrita: entram os banners com arte, o ícone, as colunas curadas e o item de link |
| **−0** | backoffice `MenuBarPreview.tsx` | apagado — era o **segundo desenho** da barra, com os tokens do admin, anunciando `/crie-seu-botton`, que nunca foi rota. **Não custou contagem**: nunca teve teste. `previaUnica.test.ts` cobre as duas features e recusa a volta |
| **−34** | core `menu.test.ts` (58 → 24) | saíram `menuEntries` (10), `slotsUsed`/`menuSlotRefusal` (6) e `resolvePromo` (13) — funções **apagadas** na T30, que liam um booleano só e não conheciam dispositivo. O que as substituiu tem cobertura maior (`menuItems.test.ts` 62, `banners.test.ts` 46). Os 3 casos de `URL-03` **não** caíram: foram reescritos contra `menuItems`, no mesmo arquivo |

**As lacunas que a verificação da `39` achou somaram +25**, medidos em 2026-09-05 um workspace por
vez e com exit code capturado: **store +8** (a régua dos três backfills da migration, a cor do rótulo
da barra e o escopo do dono único) e **backoffice +17/+1** (`MenuPanelEditor.test.tsx`, que não
existia, e o par painel × loja do predicado da arte). Core, functions e catalog-import não mudaram de
contagem. **Duas delas eram mutante sobrevivente**, e é isso que as torna dignas de registro:

- **A migration tinha UMA régua para TRÊS backfills, e era a forma do primeiro.** O segundo traz
  `from public.categories p` entre o `set` e o `where` e escapava dela: reduzi-lo a
  `set menu_desktop = true` deixava os 2182 testes verdes, e no `db push` **todo painel do menu do
  celular nasceria vazio** — ~90% dos acessos — com o do computador intacto. Cada backfill passou a
  ter asserção própria que o nomeia, com sensor ao lado, e as três mutações foram reinjetadas no
  arquivo real para ver a suíte reprovar.
- **`text-estrelinha-on-primary` podia sair de `NAV_ITEM` sem nada acusar.** A metade "o rótulo
  continua em `on-primary`" não tinha asserção nenhuma, e a que existia (`toContain
  ('text-estrelinha-accent')`) casava **também** `accent-strong` — o token que a AC opõe. A régua
  agora é de token exato (`(?:^|\s)token(?![-\w])`), porque `\b` não fecha nada quando o vizinho é
  hífen.
- **O predicado da herança de arte tinha dois donos**: o painel o recalculava por truthiness da
  string crua e `core` apara espaço, então `image_mobile: "   "` fazia a loja reaproveitar a arte do
  computador **sem a tela avisar**. `menuBannerArt`/`menuBannerImage` passaram a ser exportados de
  `@estrelinha/core/menu`, o painel os chama, e um caso novo compara os dois vereditos no mesmo
  teste.
- **O escopo de `menuSurfaceSingleOwner.test.ts` era `['apps']`**, e a function do sitemap pedia
  `show_in_menu` no `select`. A coluna saiu da lista e o escopo passou a incluir
  `supabase/functions/**` — guarda com alcance menor que a regra é allowlist com outro nome.

**A feature `38` (performance no celular) somou +326 em quatro workspaces**, medidos em 2026-09-05 um
por vez e com exit code capturado sem pipe: **store +269**, **core +31** (o módulo `rendition`),
**functions +20** (o `preload` da página do produto) e **catalog-import +3** (a constante de cache).
O backoffice ficou em +3, e `packages/core/src/payment/**` não foi tocado — conferido por
`git diff --name-only`. Lint e tipos não mudaram.

> **A baseline desta feature esteve errada DUAS vezes antes de ser escrita certa**, e as duas foram
> pegas pelo verificador independente, nenhuma pelo autor: primeiro `6127 em 351` — desatualizada
> **e** mal somada —, depois `6454 em 352`, que envelheceu em 4 testes no commit seguinte. É a
> própria lição desta seção acontecendo de novo: **meça na hora de escrever, e some conferindo**.

**A feature `37` (frete grátis configurável) somou +86 em três workspaces**, medidos em 2026-09-05 um
por vez e com exit code capturado: **store +45**, **core +32** (a regra pura, 26, e o hook, 6) e
**backoffice +9** (o interruptor e a recusa de "ligado sem faixa"). Functions e catalog-import não
foram tocados, e `packages/core/src/payment/**` também não — conferido por `git diff --name-only`.
Lint ficou em **27/5** e tipos em **0·0·0**, sem mexer.

**A integração do Melhor Envio somou +26 em três workspaces**, medidos em 2026-09-05 um por vez e com
exit code capturado: **core +17/+1** (`quotePayload`, o dono único do corpo da cotação), **store +5**
(o mapper delegando, e o prazo com `handling_days` na página do produto) e **backoffice +4/+1**
(`originZipNotRead`). Lint ficou em **27/5** e tipos em **0·0·0**. `packages/core/src/payment/**` não
foi tocado.

> **A cotação de frete nunca tinha funcionado, e nada acusava.** As três `MELHOR_ENVIO_*` não
> existiam em lugar nenhum — nem no `config.toml`, nem no `.env.example`, nem na checagem de secrets
> do CI. A function respondia 500 `Unauthenticated.` no local **e em produção**, `DeliveryBlock`
> convertia a falha na opção única "Frete padrão" (SHP-05), e **todo pedido cobrava R$ 9,90 fixo**,
> para qualquer CEP e qualquer peso. Medido no dia do conserto: a mesma sacola cotava R$ 17,89–34,86
> para São Paulo e R$ 62,31–163,64 para Rio Branco.
>
> **Os 46 testes do caminho de frete passavam** — eles mockam `supabase.functions.invoke`, então
> provam o mapeamento e nunca a integração. É a lição do `AD-012` noutra roupa: **mock é afirmação, e
> integração só se prova com probe contra o serviço**. Detalhe em [`supabase/CLAUDE.md`](supabase/CLAUDE.md).

> **A queda de 3 em `drawerFacts.test.ts` (15 → 12) é contrapartida declarada**: os três casos de
> `freeShippingProgress` reapareceram em `core/src/shipping/__tests__/freeShipping.test.ts`, e o
> terceiro teve o **veredito invertido de propósito** — faixa zerada devolvia "frete grátis sempre",
> que era a leitura que custava dinheiro. `FreeShippingBar.tsx` foi apagado **sem** perda de
> contagem: nunca teve teste, porque nunca teve consumidor.

Os cinco workspaces foram remedidos em **2026-08-30**, por workspace e com exit code capturado, e os
cinco passam limpos. A feature `35` (clientes e pedidos da Nuvemshop) somou **+201** em três deles:
**catalog-import +174** (parser de CSV, recorte dos dois negócios, de-para de status, casamento com o
catálogo, snapshot e escrita idempotente), **store +21** (o guarda da migration) e **backoffice +6**
(o guarda de proveniência e a cobrança por WhatsApp com telefone). Core e functions não mudaram.

**O backoffice foi a 1773/108 em 2026-08-30**, fora de feature: a foto e o link do produto na tela
do pedido (`+11` — 6 casos novos em `AdminOrderPage.test.tsx`, e o arquivo novo
`entities/order/api/useAdminOrder.test.ts`, que guarda o recorte dos `product_id` procuráveis).
Lint e tipos não mudaram (25/4 · 0). Os outros quatro workspaces não foram tocados e não foram
remedidos.

> **O lote sequencial dos cinco workspaces REPROVOU store e backoffice, e os dois passam sozinhos.**
> Medido na `35`, com o servidor de dev e um navegador de cima. Não é a mesma flake do `pnpm test`
> paralelo — é a mesma **causa**: jsdom sob carga estoura o timeout de 5s dos testes que varrem
> disco. Antes de investigar uma reprovação, feche o que estiver rodando e repita o workspace
> sozinho; se reprovar sozinho, é defeito.

> **Rode um workspace por vez.** Duas suítes concorrentes saturam a máquina e produzem timeout de 5s
> em testes que varrem disco — medido na `34`, em `routes.test.ts` (store) e `AdminOrdersPage.test.tsx`
> (backoffice), os dois verdes isolados. É a mesma flake que motiva o `--concurrency=1` no CI, e ela
> aparece igual na máquina de quem desenvolve.

**O lint MELHOROU de 30/8 para 27/5**, e não por trabalho de lint: `OrderDetailDialog.tsx` foi apagado
na `34` e levou junto três `no-explicit-any`. Baseline que cai também precisa ser anotada — senão a
próxima feature compara contra folga que não existe mais. **A `35` manteve 27/5**, medido em
2026-08-30 (store 2/1 · backoffice 25/4).

> **A baseline anterior do store estava 3 testes curta, e o erro era de bookkeeping.** Ela dizia
> **1874/129**; o número medido no HEAD da `31`, por `git stash` em 2026-08-29, é **1877/129**. Nada
> havia sido removido — o fecho da `31` simplesmente registrou um número que não era o da árvore. O
> delta da `32` é **+24**, não os +27 que a diferença contra o número errado sugeria, e o total sai
> de 5468 (não 5465) para 5492. **A lição vale mais que a correção: baseline anotada de memória, ou
> de uma execução anterior à última alteração, mente sem quebrar nada** — meça na hora de escrever.
Os erros de lint são **pré-existentes**, em boa parte `@typescript-eslint/no-explicit-any` nos hooks
admin (`entities/*/api/useAdmin*`). **Zero é a baseline de tipos: qualquer erro de tipo é novo.**

**Regras de leitura da baseline de testes:**

- **Queda só vale se o número reaparece do outro lado.** Duas exceções foram declaradas até hoje: a
  `25` (os 14 casos de `HomePreview.test.tsx`, que viraram verdadeiros por construção quando a prévia
  passou a ser a loja) e a `31` (os 14 de `HowToSendMaterialPage.test.tsx`, reescrito de 14 para 34
  no mesmo lugar). Fora dessas, queda é deleção silenciosa.
- **Asserção de guarda pode ser reescrita quando a régua ganha casos, nunca afrouxada** — e a
  reescrita tem de **ganhar vizinha**. Se uma precisou ser enfraquecida, o comportamento mudou.
- **Teste que reprova isolado nunca é flake.** `pnpm test` roda os cinco workspaces em paralelo e já
  produziu falha de timeout de RTL sob carga (medida hoje: `AdminCouponFormPage.test.tsx` reprovou no
  paralelo e passou isolada, com os 1556 verdes). **Rode por workspace antes de investigar** — mas
  se reprovar sozinho, é defeito.
- **O código de dinheiro não muda por acaso.** `packages/core/src/payment/**` fechou as features 22,
  23, 24 e 25 **sem uma linha alterada**, conferido por `git diff --name-only` no gate. Identidade
  visual, importação de catálogo, composição de home e prévia não têm por que mexer em `payment/`.
- **Teste que lê `import.meta.env` mede a MÁQUINA, não o código.** Duas ocorrências, e a segunda só
  apareceu quando houve CI:
  - `storeOrigin.test.ts` afirmava "sem env devolve `null`" chamando `storeOrigin(undefined)`, que cai
    no **parâmetro default** lido de `import.meta.env` no carregamento do módulo: passava em quem não
    tinha `VITE_STORE_URL` e falhava em quem tinha. Corrigido na `27` com `vi.stubEnv` +
    `vi.resetModules()` + import dinâmico.
  - **O client de `@estrelinha/supabase` LANÇA no carregamento do módulo** sem `VITE_SUPABASE_URL` e
    `VITE_SUPABASE_PUBLISHABLE_KEY` — de propósito, para que falta de configuração não vire fallback
    silencioso. Mas o `.env` é gitignored: quem fornecia os valores era a máquina de quem já tinha
    rodado a loja. A suíte passava local e **morria no CI, em 8 arquivos, antes da primeira
    asserção**. Os dois `vitest.config.ts` agora fixam os valores em `test.env`. No backoffice a
    fixação é **preventiva**: ele passa hoje só porque 109 arquivos mockam o client à mão, o que é
    coincidência mantida a dedo, não propriedade do app.
