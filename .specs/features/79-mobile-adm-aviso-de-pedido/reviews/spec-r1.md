# Revisão — Specify (rodada 1)
Veredito: REPROVADO

> Nota de caminho: a pasta pedida (`.specs/features/81-79-mobile-adm-aviso-de-pedido/`) **não existia**
> e não tem `spec.md`. A spec revisada é `.specs/features/79-mobile-adm-aviso-de-pedido/spec.md`
> (293 linhas, modificada e sem commit, título "79 — mobile-adm: aviso de pedido no celular"). Esta
> revisão foi gravada no caminho pedido; a pasta `81-79-…` foi criada só para conter este arquivo.
> `context.md` não existe — a spec declara isso no topo e registra as quatro decisões do usuário
> como `y` na tabela de assunções.

## Achados

### R1 — O botão "Reenviar" do painel numa linha de push falha não tem comportamento definido (importante)
- Onde: `spec.md`, Out of Scope ("Reenviar um push pelo histórico do pedido | O reenvio do painel é por e-mail; push perdido não volta") e `MAN-34`. Código: `apps/backoffice/src/features/order-detail/ui/OrderHistory.tsx:112-118` mostra "Reenviar" em **toda** linha de notificação com `falhou && ev.emailType`, chamando `onResendEmail(ev.emailType, ev.emailChannel ?? 'email')`; `send-notification/handlers.ts:111-112` repassa o `channel` a `dispatchEventFull`; e `claim_order_notification` (`20260907120000_42-notificacoes.sql`, §5) reivindica de novo qualquer linha `failed`.
- Problema: `MAN-34` faz a linha de push aparecer no histórico do painel; com `status = failed` (MAN-09), o painel desenha "Reenviar" e, pelo código atual, o reenvio **sairia** pelo canal push. A spec declara o contrário ("push perdido não volta") sem nenhum AC que diga o que o painel faz com essa linha (sem botão? botão só para e-mail?). Também o texto de falha cai em `e.error ?? 'A cliente NÃO foi avisada'` — frase errada para um aviso à dona.
- Cenário: o Design segue `MAN-34` à letra, o painel passa a oferecer "Reenviar" num push e ou reenvia (contradizendo o Out of Scope) ou devolve erro (`handlers.ts:186` recusa canal ≠ email na prévia; o caminho de envio não recusa).
- Sugestão: acrescentar a `MAN-34` (ou um MAN novo) o que a linha de push falha mostra no painel e no app — com ou sem "Reenviar" — e a frase do detalhe da falha.

### R2 — O caminho de gravação da inscrição não fecha com a RLS prometida nem com os guardas do app (importante)
- Onde: `MAN-23` ("Uma conta admin SHALL ler e mexer **só** nas próprias inscrições"), `MAN-27` ("o mesmo `endpoint` gravado por outra conta → uma linha só, da conta que gravou por último"), `MAN-28` (despejo da mais antiga), `MAN-25` ("o servidor SHALL recusar"). Código: `apps/mobile-adm/src/entities/order/api/__tests__/escritaSoPelaPorta.test.ts` (régua 1: nenhuma escrita de tabela, nenhuma `functions.invoke`, nenhuma `rpc(` fora de `lerComPapel.ts`; régua 2: exatamente oito importadores do client).
- Problema: (a) com RLS "só as próprias", a conta B não pode atualizar nem apagar a linha da conta A para o mesmo `endpoint` — `MAN-27` só é possível por um caminho que ignora a RLS (RPC `security definer` ou edge function), e a spec não diz qual nem quem valida `MAN-25`; (b) qualquer um dos caminhos (PostgREST, RPC, `functions.invoke`) é **proibido hoje** no app pelo guarda da `75`, e a spec só cita a extensão de `chaveDeServidorForaDoNavegador` (`MAN-24`). Se for RPC nova chamada pelo app, também entra na lista literal de `marcacaoSoPorAcao.test.ts` (CLAUDE.md: "Toda RPC nova chamada pelo painel ou por uma function quebra este guarda").
- Cenário: o Design escolhe upsert por PostgREST sob a RLS de `MAN-23`; a troca de conta no mesmo celular (`MAN-27`) falha com zero linhas ou cria a duplicata que A8 quer evitar; ou o Design afrouxa um guarda do app sem a spec ter autorizado.
- Sugestão: declarar a porta de escrita (ex.: RPC `security definer` com a validação de `MAN-25`, o upsert por `endpoint` e o teto de `MAN-28`) e listar os guardas que a feature amplia por decisão (`escritaSoPelaPorta`, `leituraSoComPapel`, `marcacaoSoPorAcao`), com a razão.

### R3 — A7/MAN-30: a "tela de saída" não existe e a remoção "no login seguinte" não tem AC (importante)
- Onde: A7 ("se a rede falhar, a sessão sai mesmo assim … o login seguinte neste aparelho a remove, e até lá a tela de saída avisa 'Este celular pode continuar recebendo avisos.'") e `MAN-30` (só "apagada antes do `signOut`; se a remoção falhar, a sessão sai mesmo assim"). Código: `apps/mobile-adm/src/widgets/account-menu/ui/AccountMenu.tsx:8,47` — "Sair encerra a sessão; quem leva ao Login é o `RequireAdmin`": não há tela de saída; o destino é `/login`.
- Problema: a frase de aviso e a limpeza no próximo login estão só na assunção, sem AC testável; a "tela de saída" que mostraria a frase não existe. E "o login seguinte a remove" é ambíguo: vale também quando quem entra é a **mesma** conta? Se sim, ela perde os avisos em silêncio e cai em `MAN-36`; se não, a regra precisa dizer como o app sabe de quem era a inscrição.
- Cenário: celular emprestado — a Adri sai sem rede, a inscrição continua ativa sob uma conta admin (A6 não a apaga), e nada na tela diz isso; ou o Design inventa onde a frase aparece.
- Sugestão: transformar A7 em ACs: onde a frase aparece (ex.: na tela de Login, com estado guardado), e a regra exata da limpeza no login seguinte (mesma conta × outra conta).

### R4 — MAN-21 exige um comportamento novo no `@estrelinha/auth` compartilhado sem declarar o alcance (importante)
- Onde: `MAN-21` ("WHEN a sessão expirou THEN o app SHALL pedir o login e, depois de entrar, SHALL levar ao mesmo pedido"). Código: `packages/auth/src/RequireAdmin.tsx:74` (`<Navigate to={loginPath} replace />`, sem `state`) e `apps/mobile-adm/src/pages/LoginPage.tsx:50` (`navigate('/', { replace: true })`).
- Problema: hoje nenhum caminho guarda a rota de origem; o app sempre volta à Início. Implementar exige mexer no `RequireAdmin` compartilhado (o painel usa o mesmo, e a `72` registrou o custo de mexer em `packages/auth`) ou num mecanismo próprio do app. A spec trata como se fosse só a abertura do aviso e não declara se o painel muda junto.
- Cenário: o Design altera `RequireAdmin` para todos os apps e o painel passa a redirecionar diferente sem AC que o cubra, ou implementa só para a abertura pelo aviso e `MAN-21` vale pela metade.
- Sugestão: dizer em `MAN-21` se a volta à rota de origem vale para qualquer rota do app ou só para a aberta pelo aviso, e se o painel fica fora (Out of Scope) ou muda junto.

### R5 — Tela nova sem nenhuma exigência de mobile/layout/acessibilidade (importante)
- Onde: P1 "Ativar os avisos neste celular" (`MAN-10..17`) e a tabela "Dimensões implícitas", que não tem linha de mobile/layout nem de acessibilidade. CLAUDE.md: "Toda tela nova precisa de prova em viewport móvel … QA e UAT começam em 390×844", alvo de toque de 44px, e (QA da `73`) "Toda tela nova do programa deve ser andada também a 130 % e 200 % de fonte"; specify.md:50 (Complex: toda dimensão resolve em requisito ou `N/A`).
- Problema: os quatro interruptores com rótulos de evento, o botão, as frases de `MAN-12/13/16` e o teste (`MAN-31`) não têm critério de alvo de 44px, de nome acessível do interruptor (qual evento ele liga), de quebra de linha a 130/200 %, nem de ausência de rolagem horizontal. `MAN-17` também não diz o rótulo/posição do item novo no menu da conta além do texto.
- Cenário: a feature fecha com a suíte verde (jsdom devolve 0 para layout) e o interruptor de 24px ou o rótulo cortado só aparece no Android real.
- Sugestão: acrescentar a linha "Mobile/layout e acessibilidade" à varredura com ACs (390×844, 44px por `SWITCH_TAP_44`/equivalente, nome acessível de cada interruptor = o nome do evento, 130/200 % sem sobreposição).

### R6 — MAN-05/MAN-07 dizem "reivindicada uma vez" e "não retenta", mas `failed` é reivindicável de novo (menor)
- Onde: `MAN-05`, `MAN-07`, `MAN-09`. Código: `claim_order_notification` faz `do update … where n.status <> 'sent'` — linha `failed` volta a `pending` na próxima chamada.
- Problema: com falha em todos os aparelhos (`MAN-09` ⇒ `failed`), a próxima retentativa do webhook manda o push de novo. É provavelmente o desejado (ninguém recebeu), mas contradiz a letra "reivindicada uma vez" e "não retenta" (este último só vale dentro do mesmo envio).
- Sugestão: escrever que "não retenta" é dentro do envio, e que uma linha `failed` volta a sair numa retentativa do gatilho; e decidir se `budget_exhausted` no `pix_created` (2500 ms compartilhados, dona depois da cliente — `dispatch.ts:19-23`) é aceitável para um canal que a spec diz não ter reenvio.

### R7 — Strings não totalmente definidas: `{v}` e o rótulo do canal no histórico (menor)
- Onde: `MAN-08` ("`{v}` = o total formatado em reais") e `MAN-34` ("o canal escrito ('no celular')"). Código: `core` tem `formatPrice` e `formatPriceWhole` (CLAUDE.md, feature `73`); `packages/core/src/orders/history.ts:96-97,149` escreve o canal entre parênteses — "(E-mail)", "(WhatsApp)".
- Problema: "R$ 189,90" × "R$ 190" ficam ambos conformes; "no celular" não segue o padrão "(Canal)" e não define a string exata da linha de sucesso nem de falha.
- Sugestão: nomear o formatador em `MAN-08` e dar a string exata (ex.: "(Celular)") das duas formas do título em `MAN-34`.

### R8 — Persistência/publicação não estão na varredura (menor)
- Onde: tabela "Dimensões implícitas". Código: `order_notifications_channel_check` aceita só `('email','whatsapp')` (`20260907120000_42-notificacoes.sql:101-104`).
- Problema: falta a linha de persistência (tabela nova, `check` de canal recriado em migration nova — `AD-017`, aplicada é imutável) e a ordem de publicação (migration → function → bundle, como `71`/`76`). O Design acharia, mas a spec é Complex e a varredura deveria registrar.
- Sugestão: acrescentar a linha com "N/A como requisito de usuário; ordem migration → function → bundle" ou equivalente.

### R9 — Numeração/caminho da feature (menor)
- Onde: caminho pedido `81-79-mobile-adm-aviso-de-pedido` × pasta real `79-mobile-adm-aviso-de-pedido`; CLAUDE.md: "A `72`..`79` são o programa mobile-adm … A próxima livre é a `80`."
- Problema: o prefixo `81-79` não segue a convenção (dois dígitos + kebab-case, número imutável) e não corresponde a nenhuma pasta. A spec em si usa `79`, coerente com o programa.
- Sugestão: manter `79` e apagar a pasta `81-79-…` criada só para esta revisão (ou mover a revisão para `79-…/reviews/`).

## Conferido sem achado
- Os quatro eventos `owner_*` existem em `NOTIFICATION_EVENTS` (`core/notifications/events.ts:40-43`) e saem dos gatilhos `pix_created`, `payment_approved`, `payment_rejected`, `material_tracking_set` (`triggers.ts`) — A1 bate com o código.
- `no_owner_contact` é pré-condição dos `owner_*` checada antes do claim para todos os canais (`precondition.ts`, `dispatch.ts:436-441`), e o interruptor por evento lido é o do e-mail (`dispatch.ts:258`); a spec declara as duas independências como mudança (`MAN-06` e a linha "Transição de estado").
- O índice único `(order_id, event, channel)` e o claim atômico existem — `MAN-05` e o edge case de concorrência têm suporte real.
- `MAN-37`: com o e-mail registrado, um provider push ausente só sai da lista de canais; `no_provider` só aparece com lista vazia (`dispatch.ts:444-447`) — não derruba o e-mail.
- `MAN-19`: o contrato "nunca lança" e o orçamento compartilhado existem (`dispatch.ts:9-23`).
- Rotas `/pedidos/:id` e `/` existem sob o `RequireAdmin` do app (`App.tsx:105-107`) — `MAN-03` e `MAN-31` apontam para destinos reais; o item "Sair" existe no menu da conta.
- O service worker hoje é `generateSW` sem código próprio (`apps/mobile-adm/pwa.config.ts`); a spec reconhece no topo que precisará de código próprio.
- Escopo e fora de escopo explícitos; todo AC numerado (`MAN-01..37`) em WHEN/THEN/SHALL, com tabela de rastreabilidade; assunções não confirmadas marcadas `n`; idioma e IDs no padrão do projeto; nenhuma promessa de mexer em `payment/**`.

## Resposta do autor

Todos os achados foram aceitos e aplicados na `spec.md` (2026-10-25):

- **R1** → A13 reescrita e `MAN-38`: a linha de push que falhou diz "O aviso no celular não chegou." e não tem "Reenviar" (painel e app); canal `Celular`, no padrão de `rotuloDoCanal`.
- **R2** → A16 e `MAN-23` reescrito: a tabela não tem policy nem `grant` para `anon`/`authenticated`; toda leitura e escrita passa por uma porta no servidor (RPC ou function, no Design), que confere o papel, valida (`MAN-25`, regra em `core`, reconferida pelo motor), faz o upsert por `endpoint` e o despejo. Guardas a estender listados na spec (`escritaSoPelaPorta`, `marcacaoSoPorAcao` e os demais).
- **R3** → A7 e `MAN-30` reescritos: sem "tela de saída" e sem remoção no login seguinte; se a remoção falha, o menu da conta pergunta ("Sair mesmo assim" / "Tentar de novo"); sem inscrição, o "Sair" de hoje.
- **R4** → A17 e `MAN-21`: mudança aditiva em `@estrelinha/auth` declarada; a origem só vale se for caminho do app; o painel continua indo ao mesmo lugar.
- **R5** → história P1 nova, `MAN-39`..`MAN-41` (viewports, fonte a 130 % e 200 %, 44 px, nome acessível, `motion-reduce:`), e a linha na varredura.
- **R6** → `MAN-05` distingue `sent` × `failed`; `MAN-07` "não retenta dentro do mesmo envio".
- **R7** → `{v}` = `formatPrice(total)`; canal `Celular`.
- **R8** → linha "Persistência e publicação" na varredura e `MAN-42` (ordem migration → secrets → functions → bundle).
- **R9** → a pasta real é `79-mobile-adm-aviso-de-pedido` (número do programa `AD-056`); `81-79-mobile-adm-aviso-de-pedido` passou a ser um link simbólico para ela, para o orquestrador achar os arquivos sem criar um segundo dono da spec. O número 81 **não** é uma feature: a próxima livre continua sendo a `80`.
