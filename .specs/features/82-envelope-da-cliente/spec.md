# 82 · Envelope da cliente — Especificação

> Protótipo: Claude Design, projeto `a780eec8-…`, arquivo `Ateliê Admin.dc.html`, seção
> `data-screen-label="Envelope da cliente"` (linhas 527–559 do markup; lógica em `od.env`, `saveTrack`
> modo `material`). O pedido original está em `prompts/Claude Code - Envelope da cliente.md` do mesmo
> projeto.

## Problem Statement

No app do ateliê (`apps/mobile-adm`), o bloco "Material afetivo" do detalhe do pedido mostra o estado
do material, mas a Adri **não consegue registrar nem consultar direito o código do envelope** que a
cliente posta com o material (cinzas, leite, cabelo…). Quando a cliente manda o código pelo WhatsApp,
hoje só o painel no computador grava. E nenhuma tela diz **quem** informou o código nem **quando**:
o banco não guarda isso (`set_material_tracking` só grava o código e o estado).

É a remessa de **entrada** (cliente → ateliê, `orders.material_tracking_code`), oposta ao rastreio de
saída da joia (`orders.tracking_code`), que já tem folha própria no bloco Entrega (`75`).

## Goals

- [ ] A Adri registra e altera o código do envelope pelo celular, com o mesmo efeito do painel
      (mesma RPC, mesmo aviso), e lê quem informou e quando.
- [ ] O bloco Material mostra os materiais exigidos (snapshot dos itens) e há quanto tempo o envelope
      está sendo esperado, na mesma régua da fila.
- [ ] "Colocar em produção" e a frase do pedido cancelado chegam ao celular.
- [ ] Zero regra ou frase nova no app: tudo de `packages/core`, com teste lá.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Mudar a tela da **loja** (`OrderMaterialBlock`, `useSetMaterialTracking`) | Público e copy diferentes; a loja continua chamando a mesma RPC. A autoria passa a ser gravada para ela também, sem mudança de tela |
| Mudar o card do **painel** além de (a) delegar a escrita a `core` e (b) usar a frase única do cancelado | O pedido é o celular. O painel não ganha "Copiar" nem "Ver nos Correios" |
| Histórico de **todas** as alterações do código | A migration guarda só a ÚLTIMA autoria/data (`material_tracking_set_*`). Trocas anteriores não viram linhas do histórico |
| Rastrear o envelope dentro do app (API dos Correios) | A página dos Correios exige captcha; o app só abre o link |
| Remover o código do envelope | A RPC não aceita código vazio (`empty_code`) e nenhuma tela remove hoje |
| "Marcar recebimento" no bloco | Já é a ação primária do rodapé ("Recebi o material", `75`) |

---

## Assumptions & Open Questions

| # | Assunção / decisão | Padrão escolhido | Por quê | Confirmado? |
| --- | --- | --- | --- | --- |
| A1 | Autoria e data do código não existem no banco | **Migration nova** com `orders.material_tracking_set_at` e `material_tracking_set_by` (`'customer'`/`'admin'`), gravadas DENTRO de `set_material_tracking`; expostas ao fim de `order_list` | Medido: a RPC da `22` só faz `update … set material_tracking_code, material_status`; nada em `order_status_history`/`order_notes`. SQL no `design.md` §2 | y (2026-10-26) |
| A2 | Enquanto a migration não estiver aplicada (ou a linha for anterior a ela, `set_at` nulo) | Linha de origem cai para **"Código informado {idade do pedido}"**; o histórico **não** ganha a linha do envelope | Nunca inventar autoria (prompt) | y (prompt) |
| A3 | Rótulo da idade | `queueAgeLabel` de `core` como está hoje: **"há N dias" nos três degraus**; o degrau `stale` muda só a **cor** (`estrelinha-wait`) | O protótipo diz "parado há", mas `core/material/aging.ts` registra **decisão do usuário de 2026-10-26** removendo "parado". Decisão mais nova vence; uma frase só para painel e app | y (2026-10-26) |
| A4 | Data-base da idade | `rowQueueAge(pedido, new Date(lido_em))` (`queueSince` = `material_received_at ?? created_at`) | É a régua da linha da lista e do lembrete. Com `aguardando`/`enviado` o recebimento é nulo ⇒ `created_at`, igual ao `min(created_at)` do tile da Início e ao `o.d` do protótipo | y |
| A5 | URL "Ver nos Correios" | `https://rastreamento.correios.com.br/app/index.php?objetos={CÓDIGO}` | Medido em 2026-10-26 com `curl`: o parâmetro **preenche o campo** do formulário (`value="AN123456789BR"`), mas a página **ainda pede captcha**. É o link oficial; o repositório já tem `parcelTrackingUrl` (Melhor Rastreio), que é de outra pergunta (rastreio de saída, para a cliente) | y (2026-10-26, link oficial) |
| A6 | A frase da folha promete "ela recebe a confirmação por e-mail" | Mantida **como no protótipo** | O protótipo manda; MAS o evento `material_tracking_registered` nasce desligado (feature `42`/`53`). Se estiver desligado, a frase é falsa. Alternativa: frase sem a promessa, e só o aviso pós-salvar cita e-mail quando `emailSent` | y (2026-10-26, mantém o protótipo) |
| A7 | Aviso ao salvar | Gatilho `material_tracking_set` (o mesmo do painel e da loja) ⇒ `material_tracking_registered` (cliente) **e** `owner_material_incoming` (Adri) | Um gatilho por fato (`AD-032`). Consequência herdada do painel: registrar pelo celular manda à própria Adri o aviso "material a caminho" (se ligado) | y (comportamento atual do painel) |
| A8 | `not_allowed` da RPC | Não é recusa direta: a porta pergunta a `conferirPapel` (`42501` ⇒ recusa padrão do app; papel de pé ⇒ "pedido mudou/não encontrado") | `set_material_tracking` responde `not_allowed` tanto para "sem papel" quanto para "pedido não existe" (de propósito) — não existe `not_admin` nela | y |
| A9 | Falha do `navigator.clipboard.writeText` | Aviso **"Não consegui copiar. Toque e segure o código para copiar."** (core) e o código fica selecionável (`select-all`) | A API falha sem permissão/contexto seguro; sem aviso o toque parece morto | y (2026-10-26) |
| A10 | "Colocar em produção" × rodapé | O botão do bloco grava SÓ o material (`em_producao`); o rodapé continua oferecendo "Iniciar separação" (material + status, `75`) | O protótipo tem os dois; são ações distintas | y |
| A11 | `materialSubline` | **Mantida** ("Rastreio do envelope: CÓDIGO") acima dos passos, mesmo com o cartão do código abaixo | Protótipo mantém `matSub` igual; prompt diz "manter" | y |
| A12 | Commits | **Nenhum commit até o usuário pedir** | Preferência registrada (`commit-so-quando-pedir`) | y (2026-10-26) |

**Open questions:** nenhuma — o usuário aceitou os padrões em 2026-10-26.

---

## User Stories

### P1: Registrar o código do envelope pelo celular ⭐ MVP

**User Story**: Como Adri, quero registrar o código que a cliente me mandou pelo WhatsApp, para o
pedido passar para "A caminho" e a cliente receber a confirmação, sem abrir o computador.

**Acceptance Criteria** (`ENV-01`..`ENV-14`):

1. `ENV-01` WHEN o pedido tem material (`material_status ≠ nao_aplicavel`) THEN o bloco Material SHALL
   mostrar, abaixo dos passos e separada por divisor `estrelinha-line`, a subseção com ícone `envio` e o
   título **"Envelope da cliente"** (font-display 15/700).
2. `ENV-02` `materialTrackingEdit(pedido)` (core) SHALL devolver "editável" sse
   `material_status ∈ {aguardando_material, material_enviado}` **e** `status ≠ 'cancelled'`; nos demais
   casos, `null`.
3. `ENV-03` WHEN sem código e editável THEN SHALL haver o botão secundário de largura total, ícone `+`,
   **"Informar código do envelope"**, ≥ 44 px; sem código e não editável, nenhum botão.
4. `ENV-04` WHEN com código e editável THEN SHALL haver o link **"Alterar"** à direita do cabeçalho
   (alvo ≥ 44 px, nome acessível "Alterar o código do envelope"); com código e não editável, nenhum.
5. `ENV-05` WHEN a Adri abre a folha THEN SHALL ver: título **"Código do envelope"** (sem código) ou
   **"Alterar código do envelope"** (com código); frase **"Use quando {PrimeiroNome} mandar o código pelo
   WhatsApp. O pedido passa para "A caminho" e ela recebe a confirmação por e-mail."** quando
   `material_status = aguardando_material`, e **"Use quando {PrimeiroNome} mandar o código pelo WhatsApp."**
   quando já `material_enviado` (A6); rótulo **"Código de rastreio do envio da cliente"**; placeholder
   **"Ex.: AN123456789BR"**; valor inicial = código atual (ou vazio); botões **"Agora não"** e **"Salvar"**.
   `{PrimeiroNome}` = primeiro nome de `customer_name`, ou "A cliente" sem nome.
   > **Nota (decisão de 2026-10-27, Fase 5, T20, `BUG-20261026-a-cliente-no-meio-da-frase`)**: a forma
   > SEM nome mudou. No meio da frase ela é **"a cliente"**, minúscula: "Use quando a cliente mandar o
   > código pelo WhatsApp." (`customerFirstNameMidSentence`). Com nome, igual.
   > **Nota (T19, `BL-054`)**: o código do envelope passa por `normalizeMaterialTrackingCode` (também sem
   > hífen e ponto), ao digitar e no dono da escrita — o `normalizeTrackingCode` de `ENV-06`/`ENV-07` vale
   > para o rastreio de saída.
6. `ENV-06` WHEN ela digita THEN o campo SHALL passar por `normalizeTrackingCode`; WHEN salva com código
   recusado por `trackingCodeRefusal` THEN a recusa SHALL aparecer no campo, com foco nele, e **nenhuma
   requisição** sair.
7. `ENV-07` WHEN salva um código válido THEN `runAppAction(deps, row, { tipo: 'rastreio-do-material',
   codigo })` SHALL chamar **`set_material_tracking`** (`p_order_id`, `p_code` normalizado) e, só no `ok`,
   o gatilho **`material_tracking_set`**. Nenhuma outra RPC, nenhum `update` em `orders`, e o cliente
   **não** muda `material_status` (a RPC já move `aguardando_material → material_enviado`).
8. `ENV-08` WHEN o desfecho é `ok` THEN a folha SHALL fechar e o aviso SHALL dizer **"Código do envelope
   registrado."** + **"O pedido #NNNN passou para "A caminho"."** quando o estado mudou
   (`aguardando_material` antes, `material_enviado` depois), senão **"Pedido #NNNN atualizado."**; e SHALL
   invalidar `chaveDoPedido(id)` e `STORE_OVERVIEW_KEY`.
9. `ENV-09` WHEN a RPC recusa (`empty_code`, `material_not_applicable`) THEN a folha SHALL ficar aberta com
   a frase de `materialTrackingRefusal(reason)` (core) em `role="alert"`.
10. `ENV-10` WHEN a RPC responde `not_allowed` THEN a porta SHALL conferir o papel (A8): `42501` ⇒ a
    recusa padrão do app (episódio único); papel de pé ⇒ `ORDER_CHANGED`, folha aberta.
11. `ENV-11` WHEN a rede/RPC falha THEN a folha SHALL ficar aberta com `ACTION_FAILED` em `role="alert"`.
12. `ENV-12` A folha SHALL reaproveitar o comportamento da `FolhaDoRastreio`: foco volta a quem abriu (ou ao
    `main h1`), teclado virtual, voltar do Android (`useFolhaNoHistorico`), `hideClose`, fecha só no
    sucesso, "Salvando…" com `aria-disabled`, mesma trava da ação do pedido, `motion-reduce` no mesmo
    seletor.
13. `ENV-13` WHEN o pedido muda com a folha aberta e deixa de ser editável (releitura/realtime) THEN a folha
    SHALL fechar (molde `MAA-26`).
14. `ENV-14` A escrita SHALL ter UM dono: `writeMaterialTracking` em `core/order-actions`; o painel
    (`useAdminOrders.setMaterialTracking`) SHALL delegar a ele, mantendo a forma de retorno
    `{ ok, reason }` e o refetch de hoje.

**Independent Test**: pedido `aguardando_material` sem código → "Informar código do envelope" → digitar
`an 123456789 br` → Salvar → aviso "Código do envelope registrado." / "O pedido #0244 passou para "A
caminho"." → bloco relido mostra o cartão do código e o passo "A caminho" atual.

---

### P1: Ler o código, quem informou e quando

**Acceptance Criteria** (`ENV-15`..`ENV-22`):

1. `ENV-15` WHEN há código THEN SHALL haver o cartão `ground-deep`, raio 12: eyebrow **"Código dos
   Correios"**, o código em 18/600 com `letter-spacing: .08em`, e a linha de origem de
   `materialTrackingOrigin(pedido, lido_em)` (core).
2. `ENV-16` `materialTrackingOrigin` SHALL devolver **"Informado pela cliente {idade}"** com
   `set_by = 'customer'`, **"Registrado por você {idade}"** com `set_by = 'admin'`, e **"Código informado
   {idade do pedido}"** com `set_at`/`set_by` nulos (A2); acrescido de **" · chegou {idade}"** quando
   `material_received_at` existe. `{idade}` é `relativeAge(…, lido_em)` — o mesmo de `materialSubline` —,
   nunca o relógio do aparelho.
3. `ENV-17` WHEN há código THEN SHALL haver, em grade `1fr 1fr`, os botões secundários de 44 px
   **"Copiar código"** e **"Ver nos Correios"** — também quando não editável.
4. `ENV-18` WHEN toca "Copiar código" THEN SHALL chamar `navigator.clipboard.writeText(código)` e mostrar o
   `AvisoDaAcao` **"Código copiado."**; na falha, a frase de A9.
5. `ENV-19` "Ver nos Correios" SHALL ser `<a target="_blank" rel="noopener noreferrer">` para
   `correiosTrackingUrl(código)` (`shared/config/correios.ts`), com
   `aria-label={nomeDoLinkExterno('Ver nos Correios')}`; o código entra com `encodeURIComponent`.
6. `ENV-20` WHEN não há código THEN SHALL aparecer a frase de `materialTrackingEmpty(pedido, lido_em)` (core):
   recebido ⇒ **"Chegou sem código registrado. Recebido {idade}."**; cancelado ⇒ **"Nenhum código
   registrado."**; senão ⇒ **"{PrimeiroNome} ainda não informou o rastreio. É opcional: se ela mandar pelo
   WhatsApp, registre aqui. Também dá para marcar o recebimento direto."** (precedência nessa ordem).
7. `ENV-21` WHEN existe `material_tracking_set_at` THEN o histórico SHALL ganhar a linha
   **"Cliente informou o rastreio do envelope · CÓDIGO"** ou **"Você registrou o rastreio do envelope ·
   CÓDIGO"**, na data `set_at`, ordenada com as demais (`buildHistory`, core). Sem `set_at`, nenhuma linha.
8. `ENV-22` WHEN a cliente grava pela loja THEN a RPC SHALL gravar `set_by = 'customer'`; WHEN uma conta com
   papel admin grava THEN `set_by = 'admin'`; em ambos `set_at = now()`. Recusas não tocam nas colunas.

---

### P2: Materiais exigidos e idade da espera

1. `ENV-23` WHEN algum item do pedido tem `requires_material` THEN SHALL haver, abaixo dos passos, um chip
   por material distinto de `order_items.material_kinds` (snapshot), com `materialKindLabel`, na ordem de
   `MATERIAL_KINDS` — via `orderMaterialKinds(itens)` (core). Sem kinds declarados: nenhum chip.
   Itens em falha de leitura: nenhum chip.
2. `ENV-24` WHEN `material_status ∈ {aguardando_material, material_enviado}` e `status ≠ cancelled` THEN
   SHALL haver, ao lado dos chips, `queueAgeLabel(rowQueueAge(pedido, lido_em))` em `ink-soft`, e em
   `estrelinha-wait` com tier `stale` (A3, A4). Fora disso, nada.
   > **Nota (decisão de 2026-10-27, Fase 5, T21, `BUG-20261026-idade-da-espera-sem-contexto`)**: o texto
   > passou a ser `materialWaitLabel(…)` — **"Esperando há N dias"** ("Esperando há 1 dia"). `queueAgeLabel`
   > fica intacto para o painel e a Início; a cor continua a mesma régua.

### P2: Colocar em produção, e o pedido cancelado

1. `ENV-25` WHEN `material_status = material_recebido` e `status ≠ cancelled` THEN SHALL haver, no fim do
   bloco (antes do lembrete), o botão secundário de largura total **"Colocar em produção"**, que chama
   `runAppAction(…, { tipo: 'producao' })` ⇒ `writeMaterialStatus({ to: 'em_producao' })`. `ok` ⇒ aviso
   **"Pedido em produção."** + **"O material de {PrimeiroNome} está na bancada."**; `material-recusado` ⇒
   `materialTransitionRefusal(status, 'em_producao')` (ou `ORDER_CHANGED`); `sem-papel` ⇒ recusa padrão;
   falha ⇒ `ACTION_FAILED`. Mesma trava da ação do pedido.
   > **Nota (decisão de 2026-10-27, Fase 5, T20)**: sem nome, a frase é **"O material da cliente está na
   > bancada."** (`customerFirstNameAfterDe`), e não "O material de A cliente…". Com nome, igual.
2. `ENV-26` WHEN `status = cancelled` e há material THEN, no lugar das ações do bloco, SHALL aparecer
   `MATERIAL_CANCELLED_NOTE` (core): **"Pedido cancelado, saiu da fila de material. Se o envelope já tiver
   chegado, devolva à cliente."** — a mesma constante no `OrderMaterialCard` do painel.
3. `ENV-27` "Lembrar do envio no WhatsApp" (`LembreteDoEnvio`) SHALL continuar como está, por último.

---

## Edge Cases

- WHEN o código salvo é igual ao atual THEN SHALL ir à RPC mesmo assim (ela é idempotente e atualiza
  `set_at`/`set_by`) — a Adri confirmou o código. *(Decisão de precisão: diferente de `rastreio` de saída,
  que pula; aqui não há status de pedido a avançar.)*
- WHEN `customer_name` é nulo THEN `{PrimeiroNome}` = "A cliente".
- WHEN o código tem 30+ caracteres THEN o cartão SHALL quebrar (`[overflow-wrap:anywhere]`) sem rolagem
  horizontal em 360/390 e fonte 200 %.
- WHEN dois toques rápidos em Salvar THEN a trava SHALL deixar sair uma requisição só.
- WHEN a realtime relê o pedido com a folha aberta e ele segue editável THEN a folha SHALL continuar aberta
  com o que ela digitou.
- WHEN `prefers-reduced-motion` THEN folha e aviso sem animação.

## Dimensões implícitas

| Dimensão | Resolução |
| --- | --- |
| Validação | `normalizeTrackingCode` + `trackingCodeRefusal` (≥ 8) no cliente; `empty_code` na RPC |
| Falha parcial | Não há: uma RPC; o aviso falhar não desfaz (`notify` nunca lança) |
| Idempotência | RPC idempotente; trava única da ação |
| Auth | RPC confere papel/dona; `not_allowed` ⇒ conferência de papel (A8) |
| Concorrência | A RPC decide o estado no próprio `update`; o app não calcula transição |
| Ciclo de vida | Só a última autoria fica (Out of Scope) |
| Observabilidade | O aviso vai a `order_notifications` como hoje |
| Dependência externa | Correios: link apenas; captcha é deles (A5) |
| Transição de estado | Só por RPC (`set_material_tracking`, `set_material_status`) |

## Requirement Traceability

| ID | Story | Fase | Status |
| --- | --- | --- | --- |
| ENV-01..ENV-14 | P1 registrar | Design | Pending |
| ENV-15..ENV-22 | P1 ler | Design | Pending |
| ENV-23..ENV-24 | P2 chips e idade | Design | Pending |
| ENV-25..ENV-27 | P2 produção e cancelado | Design | Pending |

**Coverage:** 27 total, 27 mapeados em `tasks.md`.

## Success Criteria

- [ ] Registrar o código pelo celular grava o mesmo que o painel (probe contra o banco local: código, estado,
      `set_by = 'admin'`, `set_at`, e a linha em `order_notifications`).
- [ ] Os seis guardas do app listados no pedido e os da loja (`materialTransitions`, `marcacaoSoPorAcao`,
      `pedidoGravadoSoPeloDono`) passam sem afrouxar régua.
- [ ] 390×844, 360 e 1440, fonte 100/130/200 %: sem rolagem horizontal, alvos ≥ 44 px (prova em navegador).
