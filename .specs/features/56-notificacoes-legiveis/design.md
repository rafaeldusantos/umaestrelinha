# 56 — Design

## As quatro decisões estruturais

### 1. O catálogo de apresentação mora em `core`, e responde uma pergunta NOVA

`packages/core/src/notifications/catalog.ts` (novo), reexportado pelo barrel **com `.ts` explícito**
— a edge function `send-notification` importa o barrel por caminho relativo e o Deno resolve o grafo
de tipos inteiro (lição da `33`).

```ts
export const NOTIFICATION_ICON_KEYS = [...] as const          // vocabulário fechado, 15 chaves
export type NotificationIconKey = (typeof NOTIFICATION_ICON_KEYS)[number]
export const NOTIFICATION_EVENT_NAMES:        Record<NotificationEvent, string>
export const NOTIFICATION_EVENT_DESCRIPTIONS: Record<NotificationEvent, string>
export const NOTIFICATION_EVENT_ICONS:        Record<NotificationEvent, NotificationIconKey>
```

**Por que não é um segundo dono de `NOTIFICATION_EVENT_LABELS`** — e este parágrafo é a defesa que o
próximo leitor vai cobrar. Os dois mapas respondem perguntas diferentes:

| Mapa | Pergunta | Tempo verbal | Onde aparece |
| --- | --- | --- | --- |
| `NOTIFICATION_EVENT_LABELS` (feature `42`) | *"o que aconteceu com este pedido?"* | passado | histórico do pedido |
| `NOTIFICATION_EVENT_NAMES` (esta) | *"que evento é este?"* | nome | Configurações → Notificações |

O risco é real — alguém vai achar que são cópias e apagar uma. A contenção é uma asserção que
**recusa a igualdade nos 15**: se um nome virar cópia do rótulo de histórico, o card volta ao passado
e a suíte reprova.

**Por que `core`, e não `entities/` do painel** (`AD-033`): os consumidores estão em apps/serviços
diferentes — hoje o painel, e o motor de notificação é o candidato natural ao segundo. Além disso,
**não há alternativa**: `notificationSingleOwner.test.ts` proíbe qualquer arquivo de `apps/**`
escrever nome de evento como literal, e um `Record<NotificationEvent, …>` escrito no painel teria os
15 literais como chaves.

**Por que a chave de ícone e não o componente**: `purity.test.ts` de `core/notifications` proíbe React
ali. Mesma solução de `core/menu/icons.ts` — `core` guarda a chave, o painel guarda o mapa
`chave → componente`, e um guarda bidirecional recusa os dois sentidos (molde de
`menuIconCatalog.test.ts`).

### 2. "Qual card está aberto" é estado do PAI, e é um só

`NotificationsTab` já é dono de `preview` (um por vez). Ele passa a ser dono de
`aberto: NotificationEvent | null`, pelo mesmo motivo: **`LEG-06` não se expressa dentro do card.**
Um `useState` por card produziria 15 verdades independentes e nenhum lugar onde "no máximo um" mora.

`EventCard` recebe `expanded` e `onToggleExpanded` — continua **controlado**, como já era para o
preview.

`LEG-10` (fechar o card fecha a prévia) cai de graça na mesma função que troca `aberto`: ela zera
`preview` junto. Escrito num lugar só, não em dois `useEffect`.

`LEG-07` (fechar não descarta a edição) **já é verdade** — o rascunho é de `useNotificationsDraft`, e
o card nunca o teve. O AC existe para que isso seja **medido**: sem asserção, nada impede a próxima
feature de mover um campo para dentro do card e perder o texto ao recolher, com tudo verde.

### 3. O contador é uma peça, e o `FieldGroup` ganha a linha do rótulo

`LEG-14` e `LEG-19` são a mesma peça em dois lugares. Hoje o painel escreve
`` `${(v ?? '').length}/${limit}` `` à mão dentro do `EventCard`, cinco vezes, num `<p>` abaixo do
campo.

- `shared/ui/CharCounter.tsx` — `value` + `limit`, devolve `n/limite`.
- `FieldGroup` ganha `counter?: ReactNode`, renderizado **na linha do rótulo, à direita**
  (`flex items-baseline justify-between`). Sem `counter`, o markup é o de hoje.

**Guarda**: `contadorComDonoUnico.test.ts` recusa a forma `.length}/` em qualquer arquivo de
`apps/backoffice/src/**` fora de `CharCounter.tsx`. É barato e fecha exatamente o caminho pelo qual
a sexta escrita entraria.

### 4. O botão de salvar tem um dono, e ele é de `shared/ui`

A **mesma string de classes** está escrita em três arquivos de Configurações hoje
(`settingsParts.tsx:37`, `NotificationsTab.tsx:191`, `CheckoutSettingsCard.tsx:155`) — e `LEG-20`
teria de ser escrita nas três. `SettingsSaveButton` sai de `features/settings/ui/settingsParts.tsx`
para `shared/ui/SettingsSaveButton.tsx`, ganha `disabled` opcional (a `NotificationsTab` desabilita
por `!canSave`) e `w-full sm:w-auto`.

`shared/` e não `features/settings/`: `notification-settings` é **outra feature**, e o comentário de
`NotificationsSection` já registra que import lateral entre features "não é para ganhar habitante
novo". `SettingsLoading` fica onde está — só as três seções de `features/settings` o usam.

---

## O card, peça por peça (valores do artboard)

Fonte: `get_jsx` dos nós `EventCard / Pedido recebido (expandido)` e
`EventCard / Pagamento aprovado (resumido)`.

| Peça | Recolhido | Aberto |
| --- | --- | --- |
| Caixa | borda `border`, `rounded-2xl`, `px-[18px] py-[14px]` | idem + `p-5`, conteúdo em `space-y-4` |
| Ícone | caixa 34×34 `rounded-xl`, fundo **neutro** (`bg-muted`), traço `text-muted-foreground` | fundo **destaque** (`bg-primary/10`), traço `text-primary` |
| Nome | 14px semibold | idem |
| Descrição | **ausente** | 12px `text-muted-foreground` |
| Divisor | ausente | `h-px bg-border` entre cabeçalho e campos |
| Interruptor | `Switch` + `SWITCH_TAP_44` | idem |

**A altura recolhida é 14 + 34 + 14 = 62px**, acima do piso de 44 sem auxiliar: o cabeçalho inteiro é
o alvo (`LEG-21`).

**O interruptor fica FORA do `<button>` do cabeçalho** (irmão, não filho). Um controle dentro de
outro controle é HTML inválido e faz o clique no switch borbulhar para o botão — que é exatamente o
que `LEG-08` proíbe. Nada de `stopPropagation`: a estrutura resolve.

`LEG-15` cai junto: o `EventCard` **deixa de usar `ToggleField`**, que desenha a própria moldura. O
cabeçalho passa a ser `<button>` + `<Switch>` lado a lado, sem borda interna.

### O sinal de card travado (`LEG-11`)

No card **recolhido**, entre o nome e o interruptor:

- **recusa** → `AlertCircle` em `text-destructive`, com `<span className="sr-only">{refusal}</span>`
- **aviso** → `AlertTriangle` em `text-estrelinha-admin-amber`, com o texto do aviso em `sr-only`

O motivo inteiro vai no nome acessível, não um "atenção" genérico: quem usa leitor de tela recebe a
mesma informação que quem abre o card. Some quando o card abre — lá o banner e a recusa inline já
estão à vista, e repetir seria dizer a mesma coisa duas vezes na mesma tela.

### A prévia emoldurada (`LEG-16`)

```
┌─ bg-muted/40 ─ ● ●  Prévia — o mesmo e-mail que a cliente recebe ──── [Prévia de exemplo] ─┐
│  [390px] [600px]                                                                           │
│  ┌─ iframe ─┐                                                                              │
│  Versão texto                                                                              │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

A barra de título é **rótulo**, não controle: os botões de largura são `h-11` (`LEG-21`) e não cabem
numa faixa de 32px. Eles ficam no corpo, junto do iframe.

O selo `Prévia de exemplo` sobe para a barra — é informação *sobre* a prévia, que é o que a barra
nomeia.

---

## O cabeçalho da seção (`LEG-18`) e o fim de `NotificationsSection`

O campo `Pedido para a prévia` é estado de `NotificationsTab`; o título da seção é desenhado por
`NotificationsSection`. `LEG-18` os põe **na mesma linha** — então o dono da linha tem de ser quem
tem o estado.

`NotificationsTab` passa a renderizar o cabeçalho, e **`NotificationsSection.tsx` é apagado**: o
comentário no topo dele diz que ele existe *"só pelo cabeçalho que as outras seções ganham do
`FormCard`"*, e esse cabeçalho mudou de casa. `panels.tsx` passa a apontar para `NotificationsTab`, e
o barrel do widget perde o export.

Layout: `flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between`, campo `lg:w-[260px]
lg:shrink-0`. Abaixo de `lg` empilha — `LEG-18` tem as duas metades, e cada uma precisa de asserção
positiva (`L-029`).

---

## Cabeçalho de grupo (`LEG-17`)

```tsx
<div className="flex items-baseline justify-between pt-1">
  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">…</h3>
  <span className="text-xs text-muted-foreground">{n} {n === 1 ? 'evento' : 'eventos'}</span>
</div>
```

`n` é `sections[section].length`. **Derivado, nunca escrito** — é a única forma de a contagem não
mentir quando a `43` acrescentar um evento.

Mesma linguagem do sobrescrito `SEÇÕES` do rail (`SettingsSectionNav`), que já é
`text-[11px] font-semibold uppercase tracking-wider text-muted-foreground`. Não é coincidência
escolhida: é a tela reusando a voz que ela já tinha.

---

## Nomes, descrições e ícones dos 15 eventos

| Evento | Nome (`LEG-01`) | Descrição (`LEG-02`) | Ícone |
| --- | --- | --- | --- |
| `order_received` | Pedido recebido | Enviado assim que o pedido é registrado, antes do pagamento | `mail` |
| `order_paid` | Pagamento aprovado | Enviado quando o pagamento é confirmado | `check` |
| `material_instructions` | Como enviar o material | Enviado com o endereço do ateliê, quando a peça pede material | `mail-open` |
| `payment_rejected` | Pagamento recusado | Enviado quando a operadora recusa o pagamento | `x` |
| `pix_expired` | PIX expirado | Enviado quando o código PIX vence sem pagamento | `clock` |
| `order_cancelled` | Pedido cancelado | Enviado quando o pedido é cancelado | `ban` |
| `payment_refunded` | Pagamento estornado | Enviado quando o valor é devolvido à cliente | `undo` |
| `material_tracking_registered` | Rastreio do material registrado | Enviado quando a cliente informa o código de postagem do material | `tracking` |
| `material_received` | Material recebido no ateliê | Enviado quando o material chega às suas mãos | `inbox` |
| `in_production` | Peça em produção | Enviado quando a peça entra na bancada | `craft` |
| `order_shipped` | Pedido postado | Enviado quando a peça é postada, com o código de rastreio | `truck` |
| `order_delivered` | Pedido entregue | Enviado quando a transportadora confirma a entrega | `delivered` |
| `post_delivery_care` | Cuidados com a joia | Enviado alguns dias depois da entrega | `care` |
| `owner_order_paid` | Pedido pago | Enviado para o seu e-mail quando um pedido é pago | `coins` |
| `owner_material_incoming` | Material a caminho | Enviado para o seu e-mail quando uma cliente posta o material | `bell` |

**Divergência declarada do artboard**: ele rotula `owner_order_paid` como
*"Pedido pago — avisar a dona"*. O grupo já se chama **"Avisos para você"**, e a tela é da própria
Adri — repetir "a dona" na linha é dizer em terceira pessoa o que o grupo já diz em segunda. Os dois
nomes de `owner_*` ficam curtos e a audiência vai na descrição.

`chave → componente` (`lucide-react`): `mail`→`Mail`, `check`→`CheckCircle2`, `mail-open`→`MailOpen`,
`x`→`XCircle`, `clock`→`Clock`, `ban`→`Ban`, `undo`→`RotateCcw`, `tracking`→`PackageSearch`,
`inbox`→`Inbox`, `craft`→`Hammer`, `truck`→`Truck`, `delivered`→`PackageCheck`,
`care`→`HeartHandshake`, `coins`→`Coins`, `bell`→`BellRing`.

---

## Guardas novos

| Guarda | Onde | Recusa |
| --- | --- | --- |
| `catalog.test.ts` | `packages/core/src/notifications/__tests__` | mapa incompleto; nome **igual** ao rótulo de histórico; nome ou descrição vazios ou repetidos; chave de ícone fora do vocabulário; duas chaves iguais; `core/notifications` importando React |
| `eventIcons.test.ts` | `apps/backoffice/src/features/notification-settings/ui/__tests__` | chave sem componente **ou** componente sem chave (bidirecional, com âncora de contagem) |
| `contadorComDonoUnico.test.ts` | `apps/backoffice/src/shared/ui/__tests__` | `.length}/` em `apps/backoffice/src/**` fora de `CharCounter.tsx` |

---

## O que só o navegador prova

jsdom devolve 0 para toda medida de layout — `LEG-12` é a única AC desta feature que **não** se prova
em teste de componente, e ela é medida por `document.scrollHeight` no Chromium, em 1440×1000 e
390×844, com o banco local. As demais provas de navegador (nome longo embrulhando ao lado do
interruptor, os 44px sob o dedo, ausência de rolagem horizontal do corpo) ficam registradas no
`validation.md`.

---

## Arquivos

**Novos**: `packages/core/src/notifications/catalog.ts` · `.../__tests__/catalog.test.ts` ·
`apps/backoffice/src/shared/ui/CharCounter.tsx` · `.../SettingsSaveButton.tsx` ·
`.../shared/ui/__tests__/contadorComDonoUnico.test.ts` ·
`.../notification-settings/ui/eventIcons.ts` · `.../ui/__tests__/eventIcons.test.ts`

**Alterados**: `core/notifications/index.ts` · `shared/ui/index.ts` · `shared/ui/FieldGroup.tsx` ·
`features/settings/ui/settingsParts.tsx` · `StoreDataSection.tsx` · `SalesSection.tsx` ·
`ShippingMaterialSection.tsx` · `CheckoutSettingsCard.tsx` ·
`notification-settings/ui/{EventCard,NotificationsTab,EmailPreviewFrame}.tsx` ·
`widgets/settings-sections/{index.ts,model/panels.tsx}` · os testes correspondentes

**Apagado**: `widgets/settings-sections/ui/NotificationsSection.tsx`
