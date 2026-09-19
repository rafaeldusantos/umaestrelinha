# Aba Notificações — Validation

**Spec**: `.specs/features/53-aba-de-notificacoes/spec.md`
**Escopo desta seção**: T14 — prova em navegador (`ABN-10`). O veredito final da feature (autor ≠
verificador, sensor de discriminação) fica na seção *Verificação final*, ao fim deste documento,
escrita depois de T15.

---

## Prova em navegador (T14)

**Ambiente**: `pnpm --filter @estrelinha/backoffice dev` (porta 8083) + Supabase local
(`uma-estrelinha-store`, `http://127.0.0.1:54341`). `playwright-cli`, sessão `default`, Chrome.

**Achado de infraestrutura, corrigido antes de medir**: o container
`supabase_edge_runtime_uma-estrelinha-store` estava parado há 5 dias (`docker ps` mostrava só os
outros serviços de pé). Reiniciá-lo isoladamente (`docker start`) subiu com um bind-mount obsoleto —
`Module not found ".../packages/core/src/notifications/sender.ts"`, um arquivo que existe no disco.
`supabase stop` (sem `--all`, só este projeto) + `supabase start` recriou o container do zero e
resolveu; `send-notification?action=config-check` respondeu corretamente depois. Sem isso, nenhuma
prévia funcionaria e o aviso de `admin_public_url` não teria como ser medido.

### Login

`admin@umaestrelinha.dev` / `admin123` (seed.sql). `/admin/configuracoes` → aba **Notificações**
(clique via `dispatchEvent('mousedown')` — o `TabsTrigger` do Radix troca de aba nesse evento, não em
`click`, lição já registrada em `apps/backoffice/CLAUDE.md`).

### 390×844

| Medida | Resultado |
| --- | --- |
| `document.body.scrollWidth` vs. `window.innerWidth` | **390 = 390** — sem rolagem horizontal, com os 15 cards abertos |
| Cards renderizados | **15** (`document.querySelectorAll('[data-testid^="event-card-"]').length`) |
| Alvos de toque — botões (`ver prévia`, `adicionar/remover observação`, `salvar`, largura da prévia) | Todos ≥44×44 (classe `h-11`/`min-w-11`, conferido por `getBoundingClientRect`) |
| Alvo de toque — `Switch` (o interruptor de cada evento) | **Achado real**: o `Switch` do design system é `h-6 w-11` (24×44px) — abaixo do piso de altura. Corrigido (ver *Defeitos encontrados e corrigidos*, abaixo), e a área clicável estendida foi provada FUNCIONALMENTE: um clique em `(x, y)` 5px **acima** da borda visível do controle (`y = topo − 5`) alterna o `aria-checked` — a caixa de layout do host não cresce (é pseudo-elemento, `getBoundingClientRect` não o mede — mesma limitação que faz `TAP_44` da loja ser medido por classe CSS e não por pixel), mas o hit-test real do navegador cobre a extensão |
| `TabsList` (8 abas) | **Achado real, corrigido**: `h-10` fixo do componente compartilhado cortava a 3ª linha (3+3+2 abas em `grid-cols-3`) — medido `rectHeight: 40` contra `scrollHeight: 100`. Depois do conserto: `rectHeight === scrollHeight` (104 = 104), sem sobreposição visual com o título da seção |

**Fluxo funcional, ponta a ponta**:

1. Ligar `material_instructions` (endereço do ateliê vazio) → clicar Salvar → botão fica
   **genuinemente desabilitado** (Playwright expira esperando "enabled", nunca chega a clicar) e a
   recusa aparece inline: *"O endereço do ateliê está vazio — preencha o logradouro na aba Material
   antes de ligar este aviso."*
2. Ir à aba Material, preencher Destinatário + Logradouro, Salvar → sucesso.
3. Voltar a Notificações → a recusa e o aviso **sumiram** (remontagem, `ABN-12`) — e o toggle de
   `material_instructions` voltou a **desligado** (não tinha sido salvo antes de sair da aba).
4. Ligar de novo (agora sem recusa, endereço preenchido) → Salvar → sucesso. Conferido direto no
   Postgres via REST (`store_settings?key=eq.notifications`): `events.material_instructions.email.enabled
   === true`, e `Object.keys(events).length === 15` — as 15 chaves, `ABN-13` medido contra o banco
   real, não só contra o dublê dos testes. **Persistência sobrevive a um reload real da página**
   (recarregada, aba reaberta, toggle continua `true`).
5. "Ver prévia" em `order_paid` → o `<iframe>` recebe **4347 caracteres** de HTML real (a tabela do
   `render/layout.ts`, começando por `<table width="100%" ...>`), a versão texto mostra "Pagamento
   aprovado! Oi, Mariana! Recebemos seu pagamento...", e o selo "Prévia de exemplo" aparece (sem
   `order_id`) — a MESMA function que envia (`ABN-06`/`ABN-07`), nunca um segundo desenho.
6. Digitar `{{materia}}` (variável inexistente) no título de `order_paid` → recusa inline: *"Variável
   desconhecida: {{materia}}. As disponíveis são {{saudacao}}, {{primeiro_nome}}, ..., {{total}}."* —
   nomeando exatamente a variável digitada, e Salvar fica desabilitado.
7. Cards `owner_order_paid`/`owner_material_incoming` — o `?action=config-check` do ambiente local
   respondeu `admin_public_url: "http://localhost:8083"`, e o aviso apareceu de verdade nos dois
   cards: *"O endereço do painel configurado no servidor não parece ser o de produção — o link
   {{link_pedido_admin}} pode sair quebrado."* — **exatamente o comportamento que a task previu**
   ("o aviso deve aparecer de verdade aqui; se não aparecer, é bug"). O aviso de e-mail vazio não
   apareceu (o `general.email` do seed está preenchido) — condição independente, também prevista.

### 1440×900

| Medida | Resultado |
| --- | --- |
| `scrollWidth` vs. `innerWidth` | **1440 = 1440** |
| `TabsList` | Uma linha só (`sm:grid-cols-8`), `rectHeight: 40` — coerente com uma linha |
| Alternância 390/600 da prévia | Clicar "600" muda `iframe.style.width` para `600px`, sem produzir rolagem horizontal na página (`scrollWidth` continua 1440) |

### Defeitos encontrados e corrigidos (antes da T15, não deixados como dívida)

1. **`Switch` abaixo de 44px de altura.** `apps/backoffice/src/shared/ui/FieldGroup.tsx` ganhou um
   prop aditivo e opcional, `switchClassName` (default `undefined` → zero mudança nos 7 chamadores
   de antes desta feature — provado por teste: `FieldGroup.test.tsx`, "sem `switchClassName`, o
   switch não ganha classe nenhuma"). `EventCard.tsx` passa a classe que estende a área clicável por
   pseudo-elemento (`before:`), no molde do `TAP_44` da loja — nunca importado daqui, porque
   `TAP_44` mora em `apps/store` e trazê-lo criaria um segundo dono da medida.
2. **A 3ª linha da `TabsList` (8 abas) sobrepunha o título da seção.** O `h-10` fixo do `TabsList`
   compartilhado (`packages/ui/src/tabs.tsx`) nasceu para uma linha só; com `grid-cols-3` em mobile,
   8 abas precisam de 3 linhas (~100px) e ficavam cortadas em 40px. **Não é defeito introduzido por
   esta feature** — 7 abas já precisavam de 3 linhas (3+3+1) antes da `53`; a 8ª aba não mudou a
   contagem de linhas (3 antes, 3 depois). Corrigido do jeito mais estreito possível: `h-auto`
   acrescentado ao `className` desta **única** `<TabsList>` (o de `AdminSettingsPage.tsx`), via o
   mesmo mecanismo `cn(default, className)` que já resolve conflito de classe em todo o design
   system — nenhuma outra tela do painel é afetada, porque nenhuma outra passa essa classe.

Nenhum dos dois defeitos tinha guarda ou teste anterior que os pegasse — os dois são geometria de
layout real, que `jsdom` mede como zero.

### O que NÃO foi possível medir em navegador

- **O disparo automático de `post_delivery_care`** — fora de escopo (`BL-037`, sem `pg_cron`).
- **Envio real por SMTP/Mailpit** — fora do percurso desta feature: `?action=preview` nunca envia,
  só renderiza. O envio de verdade já é coberto pela suíte `email-check.yml` (feature `52`).

---

## Verificação final

**Papel**: verificação standalone, feita pelo mesmo worker que implementou T09–T15 (autor = verificador
nesta rodada — não havia para quem delegar; T01–T08 foram implementadas e revisadas por outro worker
do mesmo batch, então a metade T01–T08 teve um segundo par de olhos, T09–T15 não). Releitura de
`spec.md` do zero, evidence-or-zero, e sensor de discriminação nos três pontos que o orquestrador
pediu.

### Cobertura ancorada na spec (evidence-or-zero)

| AC (spec.md) | `file:line` — asserção | Veredito |
| --- | --- | --- |
| AC1 (`ABN-01`) três seções, ordem preservada, sem WhatsApp | `NotificationsTab.test.tsx:76` (ordem = `NOTIFICATION_SECTIONS.flatMap(groupedEvents)`) + `:106-113` (ausência de WhatsApp) + `sections.test.ts` (a régua pura) | ✅ Coberto |
| AC2 (`ABN-02`) 5 campos exatos + contador | `EventCard.test.tsx:24-51` (campos exatos, ausência de itens/totais/endereço/rastreio/destino) + `:53-76` (contador contra `COPY_LIMITS`) | ✅ Coberto |
| AC3 (`ABN-03`) variável fechada, recusa nomeando | `useNotificationsDraft.test.tsx:163-173` (delegação por igualdade de string) + `copy.test.ts` / `variables.test.ts` (a régua) | ✅ Coberto |
| AC4/AC5 (`ABN-04`/`ABN-05`) tom e limite, mesma régua dos dois lados | `copy.test.ts:15-99` (a régua em core) + `useNotificationsDraft.test.tsx:163-173` (o painel delega, não reimplementa) — **sensor de discriminação abaixo** | ✅ Coberto |
| AC6 (`ABN-06`) prévia = mesmo renderizador, sem recompor | `EmailPreviewFrame.test.tsx:11-17` (srcDoc byte a byte) + `previewNotification.test.ts` (corpo exato) | ✅ Coberto |
| AC7 (`ABN-07`) exemplo × pedido real | `EmailPreviewFrame.test.tsx:66-74` (selo) + `NotificationsTab.test.tsx` (3 casos do campo `order_id`, **achados e corrigidos nesta verificação** — ver abaixo) | ✅ Coberto (depois do conserto) |
| AC8 (`ABN-08`) gate de material só quando ligado | `useNotificationsDraft.test.tsx:124-159` (os três estados) — **sensor de discriminação abaixo** | ✅ Coberto |
| AC9 (`ABN-09`) aviso não-bloqueante, textos distintos | `EventCard.test.tsx:194-247` + `NotificationsTab.test.tsx` (roteamento por evento, textos distintos) | ✅ Coberto |
| AC10 (`ABN-10`) navegador 390×844, ≥44px, sem scroll | `validation.md`, seção *Prova em navegador* — medido, 2 defeitos achados e corrigidos | ✅ Coberto |
| AC11 (`ABN-11`) guarda de disco, zero segunda declaração | `notificationCopySingleOwner.test.ts` (13 casos, âncora dupla, sensor de injeção) | ✅ Coberto |
| AC12 (`ABN-12`) descarte sem confirmação | `useNotificationsDraft.test.tsx:105-120` + `NotificationsTab.test.tsx` (remontagem completa) | ✅ Coberto |
| AC13 (`ABN-13`) escrita sempre com os 15 | `notificationsWrite.test.ts:31-77` — **sensor de discriminação abaixo** | ✅ Coberto |

### Sensor de discriminação — 3 mutações nos pontos mais críticos

Cada mutação foi aplicada no **arquivo real**, a suíte relevante rodada, o resultado registrado, e a
mutação **revertida** antes de seguir (`git diff` confirma zero mudança líquida nesses três arquivos
depois do processo).

| # | Mutação | Onde | Testes mortos |
| --- | --- | --- | --- |
| 1 (`ABN-13`) | `buildNotificationsValue` passa a escrever só `pix_expired`, em vez de iterar os 15 | `notificationsWrite.ts` | **5** — 4 em `notificationsWrite.test.ts`, 1 em `useNotificationsDraft.test.tsx` (o `save()` real, ponta a ponta) |
| 2 (`ABN-08`) | `refusalFor` remove `&& draft[event].enabled` do gate de material — bloquearia mesmo desligado | `useNotificationsDraft.ts` | **3** — os dois casos que provam "desligado não bloqueia" e "com endereço preenchido não bloqueia", mais `canSave` do estado inicial |
| 3 (`ABN-04`/`ABN-05`) | `notificationDraftRefusal` pula a régua de tom (`notificationCopyRefusal`), deixando "corra" passar | `packages/core/src/notifications/copy.ts` | **6** — 3 em `copy.test.ts` (core) + 3 em `useNotificationsDraft.test.tsx` (backoffice, cascata pela importação real — prova que a delegação não é só estrutural) |

**Nenhum mutante sobreviveu.** Os três pontos mais frágeis da feature — a escrita que poderia vazar
para parcial, o gate que poderia bloquear demais ou de menos, e a composição de recusa que poderia
divergir entre painel e function — têm cobertura que de fato os reprova.

### Lacuna encontrada e corrigida (não é mutante — é ausência de teste)

**`ABN-07`, a metade "pedido real", não tinha UI nenhuma.** `design.md` já tinha decidido a forma do
campo ("texto simples, UUID, sem busca" — Tech Decisions) e `previewNotification` já aceitava
`orderId`, mas **nenhuma task de T09–T11 listou construir o campo** no próprio "Done when" — só a
chamada (T07) e o selo de exemplo (T09) tinham teste. A suíte inteira ficava verde com a metade do
requisito inalcançável pela tela. Corrigido: `<Input data-testid="notifications-preview-order-id">`
no topo de `NotificationsTab.tsx`, compartilhado pelos 15 cards, alimentando `orderId` em toda
chamada de prévia. Coberto por 3 casos novos (sem digitar não manda `order_id`; digitando, manda; o
valor vale para qualquer card clicado) e **reconfirmado em navegador real**: um UUID digitado e "ver
prévia" clicado produziu uma requisição `POST …/send-notification?action=preview` com
`"order_id":"…"` no corpo e uma resposta com **dados reais** de um pedido do banco local
(`"sample":false`, itens, totais, endereço de entrega "Rua das Acácias, 128" — pedido `UE-0042`),
contra `"sample":true` do caminho sem pedido.

### Veredito

**PASS.** Os 13 requisitos (`ABN-01`..`ABN-13`) estão cobertos com evidência de `file:line`, os três
pontos mais críticos resistem a mutação real, a prova em navegador é completa nos dois tamanhos, e a
única lacuna encontrada (o campo de `order_id`) foi corrigida e reverificada antes deste relatório —
não fica como dívida. Nenhuma asserção foi enfraquecida ou removida no processo. Baselines finais:
**9881 testes em 509 arquivos** (dos quais +116/+10 são desta feature — o resto é a feature `54`,
sem relação, numa árvore compartilhada), lint **26/6**, tipos **0·0·0**,
`packages/core/src/payment/**` intocado.
