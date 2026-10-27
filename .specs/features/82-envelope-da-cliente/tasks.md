# 82 · Envelope da cliente — Tasks

Antes de qualquer task: **baseline medida com a árvore parada** (core, mobile-adm, store, backoffice, um por
vez, exit fora de pipe, `--testTimeout=20000`) em `baseline.md`. A árvore tem alterações sem commit de outra
sessão (`git status`); a baseline é do disco, não do último commit.

| # | Task | Requisitos | Done when |
| --- | --- | --- | --- |
| **Fase 1 · Dados** (só depois do "ok" do SQL) | | | |
| 01-migration-autoria-do-envelope | `20261028120000_82-envelope-da-cliente.sql` (design §2); `DbOrder` com as duas colunas | ENV-22 | `supabase db reset`/aplicar local OK; probe `01-rpc.sql` com os 6 casos `ok —` |
| 02-guardas-da-migration | `envelopeSchema.test.ts` novo; `materialTransitions.test.ts` passa a ler a RPC vigente | ENV-22 | suíte da loja verde; cada régua com `mutar()` que derruba |
| **Fase 2 · Core** | | | |
| 03-regras-do-envelope | `core/material/envelope.ts` + `orderMaterialKinds` + `materialWaitAge`; testes; `stepsDenoReach` com o arquivo novo | ENV-02, 05, 09, 16, 20, 23, 24, 26 | testes de core verdes; frases conferidas literalmente |
| 04-escrita-do-codigo | `core/order-actions/materialTracking.ts` (`writeMaterialTracking`) + testes (ok, recusado ×2, nao-permitido, falhou, aviso só no ok) | ENV-07, 14 | `purity` verde; dublê registra RPC, args e gatilho |
| 05-acoes-no-run-app-action | `PedidoDaAcao` `rastreio-do-material` e `producao`; `actionConfirmation` e frases novas | ENV-07, 08, 10, 11, 25 | casos: ok com e sem mudança, recusado, não-permitido⇒nenhuma-linha, falhou, código recusado sem rede, linha não editável⇒mudou |
| 06-historico-do-envelope | 4º argumento opcional de `buildHistory` | ENV-21 | casos cliente/admin/sem `set_at`; chamadas de 3 argumentos intactas |
| 07-painel-delega | `useAdminOrders.setMaterialTracking` → `writeMaterialTracking`; `OrderMaterialCard` com `MATERIAL_CANCELLED_NOTE` | ENV-14, 26 | `useAdminOrders.delega` +4 linhas; nenhuma asserção antiga afrouxada; suíte do painel verde |
| **Fase 3 · App** | | | |
| 08-colunas-do-detalhe | `COLUNAS_DO_DETALHE` + `COLUNAS_DOS_ITENS`; tipos; probe de colunas da `74` | ENV-16, 23 | probe `ok —` contra o banco local |
| 09-folha-por-origem | `FolhaDoRastreio` e `useFolhaNoHistorico` com `origem: 'material'`; `erros.ts` | ENV-05, 06, 09..13 | testes antigos da folha intocados e verdes; novos: abrir, recusa local sem rede, ok fecha, erro mantém, foco volta, fecha ao deixar de ser editável |
| 10-envelope-da-cliente | `EnvelopeDaCliente.tsx` + `shared/config/correios.ts` | ENV-01, 03, 04, 15, 17..20 | com/sem código, recebido sem código, cancelado, editável × não; copiar (ok e falha); link (nova aba, `aria-label`) |
| 11-chips-producao-cancelado | `MaterialChips.tsx`, `ColocarEmProducao.tsx`, `BlocoMaterial` com os nós, `PedidoPage` compõe | ENV-23..27 | chips do snapshot; idade só nos dois estados; produção ok/recusa; frase do cancelado; lembrete por último |
| 12-pedido-pagina-releitura | teste pela `PedidoPage` real: salvar ⇒ invalida `chaveDoPedido` e `STORE_OVERVIEW_KEY`; histórico com a linha | ENV-08, 21 | estado do cache conferido (`isInvalidated`), não a chamada |
| 13-client-real | caso em `acoesComClientReal`: `set_material_tracking` com `not_allowed` + `atelie_clock` `42501` ⇒ recusa e nenhum aviso | ENV-10 | mutante (tratar `not_allowed` como recusa direta) morto |
| **Fase 4 · Fecho** | | | |
| 14-gate-e-documentacao | as 6 suítes um workspace por vez; tipos; lint; build do app; baselines e `apps/mobile-adm/CLAUDE.md`; `STATE.md` (AD-065) e `BACKLOG.md` | todos | sem regressão contra `baseline.md` |
| 15-prova-em-navegador | 360/390/1440 × fonte 100/130/200 %; folha com teclado; "Ver nos Correios" abre com o campo preenchido | Success Criteria | `prova-navegador.md` |

## Progresso

| # | Feito? | Nota |
| --- | --- | --- |
| baseline | feito (2026-10-26) | `baseline.md` |
| 01 | feito | migration aplicada no local por `psql` (registrada à mão); probe `probes/01-rpc.sql` → `01-rpc.out`, 8 `ok —`, exit 0 |
| 02 | feito | `envelopeSchema.test.ts` (15); `materialTransitions.test.ts` lê a RPC da `82` (+2); suíte da loja 6030/327 exit 0 |
| 03 | feito | `material/envelope.ts`, `orderMaterialKinds`; `envelope.test.ts` (44); `stepsDenoReach` +3 |
| 04 | feito | `order-actions/materialTracking.ts`; `materialTracking.test.ts` (11); `purity` ancora o arquivo |
| 05 | feito | `runAppAction` + `actionConfirmation` + 4 frases; +18 casos em `order-actions/appAction.test.ts`, +5 em `orders/appAction.test.ts` |
| 06 | feito | `buildHistory(…, envelope?)`; +5 casos |
| 07 | feito | painel delega; +6 casos em `useAdminOrders.delega`; `OrderMaterialCard` +1 |
| gate lote A | feito | core 4553/180 · mobile-adm 2021/126 · store 6030/327 · backoffice 3923/225, os quatro exit 0; tipos 0·0·0, core 11 (idênticos); lint painel 23/5. 5 mutantes reinjetados, 5 mortos por asserção, SHA-256 restaurado |
| 08 | feito | `COLUNAS_DO_DETALHE` + `material_tracking_set_at/_by`; `COLUNAS_DOS_ITENS` + `requires_material, material_kinds` (`ItemDoPedido extends MaterialRequirement`); `usePedido` passa o pedido a `buildHistory`. Probe `02-lista` da `74` (lê as listas de `linha.ts`): 50 `ok —`, exit 0, banco restaurado (`probes/02-colunas-da-74.saida.txt`) |
| 09 | feito | `useFolhaNoHistorico` com sobrecarga `origem: 'material'` (chave `<id>:material:editar`, estável enquanto editável) e `FolhaDoRastreio` parametrizada (rótulo/placeholder da cópia; `rastreio-do-material`); `useAcaoDoPedido` (confirmação + `materialPassou`) e `erroDe` (`materialTrackingRefusal`); `mostrarAviso` com `frase` opcional. `FolhaDoEnvelope.test.tsx` (19). Testes da `75` intocados e verdes. **Defeito achado e consertado**: o campo voltava ao valor do banco quando a releitura mudava `valorInicial` com a folha aberta (Edge Case da `82`); agora só reinicia na abertura — vale também para a folha da `75` |
| 10 | feito | `EnvelopeDaCliente.tsx`, `shared/config/correios.ts`; `novaAbaAvisada` (âncora 3 → 4 links) |
| 11 | feito | `MaterialChips.tsx`, `ColocarEmProducao.tsx`, `BlocoMaterial` (`itens`/`envelope`/`producao`, cancelado por `materialCancelledNote`); `PedidoPage` compõe. Core: `canStartProduction` e `materialCancelledNote` em `material/envelope.ts` (+16 casos), e `runAppAction` passou a usar `canStartProduction` (dono único da guarda). `ColocarEmProducao.test.tsx` (8). `movimentoDosPedidos` 28 → 31 arquivos (âncora 8/6, medida) |
| 12 | feito | `pages/__tests__/envelopeDaCliente.test.tsx` (35, `<App />` real): T10/T11 por estado, e salvar ⇒ RPC, gatilho, aviso, releitura, histórico; `isInvalidated` das duas chaves (releituras penduradas) e a vizinha intacta |
| 13 | feito | +3 em `acoesComClientReal` (par ok; `not_allowed` + `42501` ⇒ recusa sem aviso em ~80 instantes; `not_allowed` + relógio 200 ⇒ `ORDER_CHANGED` na folha) |
| gate lote B | feito | mobile-adm **2087/129** (era 2021/126) · core **4569/180** (+16) · store 6030/327 · backoffice 3923/225 — os quatro exit 0, um por vez. Tipos 0 (app, node, painel, loja), core 11 (herdados). Lint do app 0/0. Build do app verde. Sensor: 12 mutantes, 12 mortos por asserção, SHA-256 restaurado (`probes/sensor-lote-b.txt`); M6 sobreviveu na 1ª rodada (o bloco mascara o botão) e morreu com `ColocarEmProducao.test.tsx` |
| guarda alterado | a confirmar | `semDadoSensivelDeClienteNoApp` (`MAC-29`, `76`) recusava `material_kinds` no app inteiro; `ENV-23` exige a coluna. Exceção de UMA linha, por arquivo e texto (`entities/order/model/linha.ts`), com a régua 1b (o termo segue proibido em toda a aba Clientes e no resto do dono) e sensor |
| 14 | — | fecho |
| 15 | feito (2026-10-26) | `prova-navegador.md`: 45 combinações (360/390/1440 × fonte 100/130/200 × A..E) sem rolagem horizontal e alvos ≥ 44; percursos contra o banco local. **Três defeitos achados e consertados** com teste antes (D1 grade Copiar/Correios partindo palavra a 200 % — `SPEC_DEVIATION` de ENV-17, asserção `grid-cols-2` reescrita, a confirmar; D2 título partido ao lado de "Alterar"; D3 foco no `<body>` depois de "Colocar em produção"). mobile-adm 2090/129 (+3), store 6030/327 idêntica; tsc 0, lint 0/0. Banco restaurado |
| 16 | feito (2026-10-27) | `useAcaoDoPedido.falhaDe`: `falhou`/exceção do `rastreio-do-material` ⇒ `ACTION_FAILED` com `retentativa { tipo: 'rastreio-do-material', codigo }` (normalizado); "Tentar de novo" na folha (fecha no sucesso) e no bloco do envelope com a folha fechada (`ui/AlertaDaAcao.tsx`). Testes: +5 `useAcaoDoPedido`, +2 página (`envelopeDaCliente`, T16), caso "a rede caiu" de `FolhaDoEnvelope` reescrito (ver bug). Reprovaram antes; mutante M16 morto por asserção |
| 17 | feito (2026-10-27) | o erro guarda a ORIGEM ao lado (`erros.ts`: `definirErro(id, erro, de)`, `useEntradaDoErro`, `ERROS_DO_RODAPE`; `acao.erroDe(origens)`) — `{ frase, retentativa }` intocado. Rodapé e cartão: `primaria`+`rastreio`; folha do envelope e bloco do envelope: `rastreio-do-material`; folha de saída: `rastreio`; "Colocar em produção": `producao`, junto do botão. +4 página, +4 `ColocarEmProducao`, +5 `useAcaoDoPedido`; dois casos da `82` (ENV-25) que liam o erro no rodapé reescritos. Mutantes M17a..e mortos por asserção |
| 18 | feito (2026-10-27) | `useOnline` com `CARENCIA_SEM_CONEXAO_MS = 5000` (`shared/lib/useOnline.ts`, único): abrir offline continua imediato, a volta também; queda < 5 s não desmonta. `SPEC_DEVIATION` de `MAF-19` na spec da `72` e no `apps/mobile-adm/CLAUDE.md`. +5 `useOnline`, +2 página (T18); cinco testes antigos só andam o relógio até os 5 s (ver bug). Mutantes M18/M18b mortos por asserção |
| gate Fase 5 (16–18) | feito (2026-10-27) | mobile-adm **2122/129** (era 2096/129) exit 0; tsc 0; lint 0/0; build verde. Core e store não tocados. 8 mutantes, 8 mortos por asserção, SHA-256 restaurado. Reteste em navegador pendente |

Depois da 15: **Verifier independente** (sempre) e, pela preferência registrada, QA (`qa-report` → `qa-execution`).

São 15 tasks ⇒ mais de um lote de ~7: posso executar inline ou por 2–3 sub-agentes em sequência (Fases 1–2,
Fase 3, Fase 4). Decido com você antes de começar.

## Decisões (2026-10-26)

O usuário aceitou os padrões da spec: SQL do `design.md` §2 aprovado; A3 "há N dias" com cor; A5 link oficial dos Correios; A6 texto do protótipo; A9 texto proposto; **sem commits** até ele pedir. Execução por sub-agentes em lotes sequenciais (Fases 1–2, Fase 3), depois o gate, a prova em navegador, o Verifier e o QA.

- 14-gate-e-documentacao: feito (2026-10-27) — baselines no CLAUDE.md da raiz, seção no `apps/mobile-adm/CLAUDE.md`, `AD-065` e handoff no `STATE.md`, `BL-054` no `BACKLOG.md`. Números finais: core 4575/180 · mobile-adm 2096/129 · store 6031/327 · backoffice 3923/225.

## Fase 5 · Conserto dos bugs do QA (decidido pelo usuário em 2026-10-27: seguir as recomendações do QA)

| # | Task | Bug (`docs/qa/bugs/`) | Recomendação seguida |
| --- | --- | --- | --- |
| 16-tentar-de-novo-do-envelope | o erro de falha do envelope ganha "Tentar de novo" (retentativa = o mesmo `rastreio-do-material` com o código digitado), como o rastreio de saída; a regravação vai à RPC e o aviso sai | `BUG-20261026-rede-cai-ao-salvar-diz-que-nao-salvou` | idem |
| 17-erro-com-dono | o erro do pedido carrega a ação que o gerou; folha do envelope, folha do rastreio, rodapé e "Colocar em produção" mostram só o seu | `BUG-20261026-erro-de-uma-acao-aparece-em-outra` | idem (muda o modelo de erro da `75`) |
| 18-sem-conexao-com-carencia | "Sem conexão" só depois de alguns segundos offline (5 s); queda curta não desmonta a tela | `BUG-20261026-queda-curta-de-rede-apaga-o-codigo` | idem (ajusta `MAF-19` da `72`) |
| 19-codigo-normalizado-no-dono | a normalização do código do envelope mora no dono da escrita (`writeMaterialTracking`): sem espaços, sem invisíveis, sem hífen e ponto, maiúsculas; painel e loja passam a gravar pelo mesmo dono | `BUG-20261026-codigo-com-hifen-ou-espaco-gravado` (`BL-054`) | idem; exigir formato dos Correios fica fora |
| 20-a-cliente-no-meio-da-frase | formas de meio de frase em core ("a cliente" / "da cliente") quando não há nome | `BUG-20261026-a-cliente-no-meio-da-frase` | idem |
| 21-esperando-ha | a idade ao lado dos chips diz "Esperando há N dias" (função própria em core; `queueAgeLabel` intocado) | `BUG-20261026-idade-da-espera-sem-contexto` | idem |
| 22-codigo-corrigido-registrado | NÃO muda comportamento: registrar em `apps/mobile-adm/CLAUDE.md` e `BACKLOG.md` que corrigir o código não reavisa | `BUG-20261026-codigo-corrigido-nao-reavisa` | manter e registrar |

| Task (lote D) | Estado | Notas |
| --- | --- | --- |
| 19-codigo-normalizado-no-dono | feito (2026-10-27) | `normalizeMaterialTrackingCode` (core/orders/tracking.ts) aplicado por `writeMaterialTracking` antes da RPC (vazio ⇒ `empty_code` sem rede); app (folha e retentativa), painel (já delegava) e loja (`useSetMaterialTracking` delega) gravam pelo dono. `BL-054` fechada. Sensores M19a–f mortos por asserção |
| 20-a-cliente-no-meio-da-frase | feito (2026-10-27) | `customerFirstNameMidSentence`/`customerFirstNameAfterDe`; "Use quando a cliente mandar…" e "O material da cliente está na bancada."; notas em ENV-05/ENV-25. M20a/b mortos |
| 21-esperando-ha | feito (2026-10-27) | `materialWaitLabel` ("Esperando há N dias") no `MaterialChips`; `queueAgeLabel` intocado; nota em ENV-24. M21a/b mortos |
| 22-codigo-corrigido-registrado | feito (2026-10-27) | sem código: `apps/mobile-adm/CLAUDE.md` e `BL-055` (manter, risco declarado) |
| gate Fase 5 (19–22) | feito (2026-10-27) | um workspace por vez, `--testTimeout=20000`, exit fora de pipe: core **4600/180** (era 4575/180, +25) · mobile-adm **2126/129** (era 2122, +4) · store **6035/327** (era 6031, +4) · backoffice **3926/225** (era 3923, +3); todos exit 0. tsc 0 · 0 · 0 nos apps, core 11 herdados; lint mobile-adm 0/0 · backoffice 23/5 · store 2/2. 10 mutantes, 10 mortos por asserção, SHA-256 restaurado. Reteste em navegador pendente |

- Lembrete do WhatsApp sem nome: "Oi, Oi!" virou "Oi!" (`core/orders/charge.ts`, achado da verificação r2; asserção de `charge.test.ts` reescrita e reprovou antes do conserto). Gate final 2026-10-27: core 4600/180 · mobile-adm 2132/129 · store 6035/327 · backoffice 3926/225, tipos 0 · 0 · 0 (core 11), lint 0/0 · 23/5 · 2/2.
