# Configurações por Seções — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path.

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/55-configuracoes-por-secoes/design.md`
**Status**: Implementada — 14 de 14 tasks (2026-09-19)

---

## Convenções deste repositório que valem em toda task

- **Um commit por FEATURE, não por task** (`CLAUDE.md`, `BL-012` fechado). Cada task roda o gate do
  workspace que tocou; o commit sai inteiro na T14.
- **Gate por workspace, um por vez, exit code fora de pipe e `--testTimeout=20000` SEM `--`**:
  `pnpm --filter @estrelinha/<ws> test --testTimeout=20000`. O `--` antes da flag **engole** a flag
  e o teto volta a 5 s.
- **O gate desta feature do PAINEL inclui a suíte da LOJA.** Os guardas de varredura moram em
  `apps/store/src/shared/lib/__tests__` e varrem `apps/**` — foi assim que a `51` (`brandScan`) e a
  `53` (`notificationSingleOwner`) descobriram, no fecho, que um arquivo do painel quebrava um
  guarda de lá. **Workspace verde não é o gate.**
- **Baseline de entrada, medida do DISCO com a árvore parada em `5104239`, um workspace por vez,
  exit code fora de pipe** — as cinco verdes:

  | Workspace | Testes / arquivos |
  | --- | --- |
  | store | **3516 / 221** |
  | backoffice | **2818 / 158** |
  | core | **2383 / 93** |
  | functions | **652 / 14** |
  | catalog-import | **512 / 23** |
  | **Total** | **9881 / 509** |

  Lint **26 erros / 6 warnings** (backoffice 24/4 · store 2/2). Tipos **0 · 0**.
  Os cinco números batem com a tabela do `CLAUDE.md` — o que **não** aconteceu nas seis features
  anteriores. Ainda assim foram remedidos, porque é a medição que vale, não a tabela.

- **Workspaces que esta feature toca**: só **`backoffice`**. `store`, `core`, `functions` e
  `catalog-import` não deveriam mudar de contagem — remeça e compare (a suíte da loja é gate, as
  outras três são controle).
- `packages/core/src/payment/**` fecha sem uma linha alterada — `git diff --name-only` no fecho.
- **A working tree está COMPARTILHADA.** Antes de medir qualquer coisa, `git status --porcelain`:
  só deve haver `.specs/features/55-*`, `apps/backoffice/**` e os dois `.pyc` da skill (que não
  entram no commit).

---

## Test Coverage Matrix

| Requisito | Onde é provado | Tipo | Sensor de mutação |
| --- | --- | --- | --- |
| `CFG-01` 4 seções no rail, nesta ordem | `SettingsSectionNav.test.tsx` | componente | reordenar o registro ⇒ a asserção derivada da fonte cai |
| `CFG-02` rota-mãe = 1ª seção, marcada, **sem índice** | `AdminSettingsPage.test.tsx` | componente | trocar `secaoExibida` por `secaoValida` ⇒ painel vazio na rota-mãe |
| `CFG-03` escolher seção troca painel e marcador | idem | componente | marcar por `slug` fixo ⇒ o marcador não acompanha |
| `CFG-04` Dados da loja = Geral + SEO | idem | componente | trocar o painel de slug ⇒ os cards nomeados não aparecem |
| `CFG-05` Vendas = Pagamento + Checkout + Carrinho | idem | componente | idem |
| `CFG-06` Frete e Material = Frete + Material | idem | componente | idem |
| `CFG-07` Notificações monta `NotificationsTab` | idem | componente | um segundo desenho no painel ⇒ o stub não é encontrado |
| `CFG-08` cabeçalho fixo na troca | idem | componente | pôr o `PageHeader` dentro do painel ⇒ o nó muda entre as duas rotas |
| `CFG-09` modo de foco | `focusRoutes.test.ts` | unidade pura | tirar a rota de `FOCUS_ROUTES` ⇒ a asserção **invertida** cai |
| `CFG-10` celular na rota-mãe: só a lista | `AdminSettingsPage.test.tsx` | componente | apagar `hidden lg:block` do painel ⇒ o caso cai |
| `CFG-11` tocar abre a rota, com seta e largura cheia | idem | componente | apagar o cabeçalho de voltar ⇒ cai |
| `CFG-12` a seta volta à lista | idem | componente | apontar a seta para outro lugar ⇒ cai |
| `CFG-13` grade de 2-3 colunas empilha no celular | seções | componente | trocar `sm:grid-cols-2` por `grid-cols-2` ⇒ o caso de token exato cai |
| `CFG-14` alvo ≥ 44px | `SettingsSectionNav.test.tsx` | componente | reduzir o `py` da linha ⇒ o caso de token exato cai |
| `CFG-15` a URL reflete a seção | `AdminSettingsPage.test.tsx` | componente | `href` do rail apontando para a rota-mãe ⇒ cai |
| `CFG-16` URL direta abre a seção | idem | componente | ignorar o param ⇒ cai |
| `CFG-17` rota-mãe **sem redirect** | idem | componente | pôr um `<Navigate>` ⇒ o caso que assere a ausência cai |
| `CFG-18` slug inválido = rota-mãe | idem | componente | `findSettingsSection` devolvendo a 1ª sem validar ⇒ o caso do slug inválido no celular cai |
| `CFG-19` link interno aponta para a seção | `TextSectionEditor.test.tsx` | componente | voltar ao link único ⇒ os dois `href` caem |
| `CFG-20` a copy nomeia a seção | `useNotificationsDraft.test.tsx` · `EventCard.test.tsx` | componente | voltar a "aba Material" ⇒ cai |
| `CFG-21` a mensagem oferece link | `EventCard.test.tsx` | componente | apagar `action` do aviso ⇒ o `href` some |
| `CFG-22` varredura: sem "aba" de Configurações | `semAbaEmConfiguracoes.test.ts` | varredura de disco | injeção real de cada frase proibida num arquivo real |
| `CFG-23` os 3 campos usam `MoneyInput` | seções | componente | trocar por `<Input type="number">` ⇒ o `R$` some |
| `CFG-24` payload idêntico ao de hoje | idem | componente | propagar `null` em vez de `0` ⇒ o caso do payload cai |
| `CFG-25` % e horas ficam como estão | idem | componente | pôr `MoneyInput` no Pix ⇒ o caso que assere a ausência de `R$` cai |
| `CFG-26` `InfoBanner` nos 4 lugares | `InfoBanner.test.tsx` + os 4 | componente | um banner ad hoc de volta ⇒ o caso do consumidor cai |
| `CFG-27` equivalente, não redesenhado | idem | componente | apagar o ícone/o texto ⇒ cai |
| Edge: descarte ao trocar | `AdminSettingsPage.test.tsx` | componente | montar as 4 seções escondidas ⇒ a edição sobrevive e o caso cai |
| Edge: prévia fecha | idem | componente | idem |
| Edge: teclado (Enter/Espaço) | `SettingsSectionNav.test.tsx` | componente | apagar o `onKeyDown` ⇒ o caso do Espaço cai |
| Edge: estado de carga | seções | componente | renderizar os cards com `isLoading` ⇒ cai |
| **âncora** registro ↔ painéis | `panels.test.tsx` | unidade | apagar uma entrada do mapa ⇒ bidirecional acusa nos dois sentidos |

## Gate Check Commands

```bash
# por task
pnpm --filter @estrelinha/backoffice test --testTimeout=20000

# no fecho — um workspace por vez, exit code fora de pipe
pnpm --filter @estrelinha/store test --testTimeout=20000     # GATE, não controle
pnpm --filter @estrelinha/core test
pnpm --filter @estrelinha/functions test
pnpm --filter @estrelinha/catalog-import test
npx tsc --noEmit -p apps/backoffice/tsconfig.app.json
npx tsc --noEmit -p apps/store/tsconfig.app.json
pnpm lint
pnpm build
git diff --name-only -- packages/core/src/payment    # tem de sair vazio
```

---

## Execution Plan

```
Fase 1 — o registro e o endereço          T01 → T02 → T03
Fase 2 — a navegação (uma árvore)         T04 → T05
Fase 3 — os painéis                       T06 → T07, T08, T09 → T10
Fase 4 — a copy e os links                T11, T12
Fase 5 — migração da suíte e fecho        T13 → T14
```

---

## Tasks

### T01 — `SETTINGS_SECTIONS`: o dono único de "quais seções existem"

- **Arquivos**: `shared/lib/settingsSections.ts` (novo) · `shared/lib/__tests__/settingsSections.test.ts` (novo)
- **Faz**: o registro das 4 seções (`slug`, `label`, `description`, `icon`), `SETTINGS_ROOT`,
  `settingsSectionPath(slug)` e `findSettingsSection(slug)`. Ícones do artboard: `House`,
  `CreditCard`, `Truck`, `Mail`.
- **Não faz**: não conhece componente React nenhum (seria `shared` importando `features`).
- **Done when**:
  - as 4 seções, na ordem `dados-da-loja · vendas · frete-e-material · notificacoes`;
  - todo slug é kebab-case e único; todo `path` começa por `SETTINGS_ROOT`;
  - `findSettingsSection` devolve `null` para `undefined`, para string vazia e para slug inexistente
    (é o recorte de `CFG-18` morando num lugar só);
  - todo item tem `label` e `description` não vazios e ícone renderizável (molde de `navItems.test.ts`).
- **Gate**: backoffice.
- **Requisitos**: base de CFG-01, CFG-15, CFG-18, CFG-19, CFG-21.

### T02 — As duas rotas, irmãs e auto-fechadas

- **Arquivos**: `app/App.tsx` · `app/__tests__/rotasDeConfiguracoes.test.ts` (novo)
- **Faz**: acrescenta `<Route path="/admin/configuracoes/:secao" element={<AdminSettingsPage />} />`
  logo abaixo da rota-mãe, **auto-fechada**, dentro do bloco do `RequireAdmin`.
- **Done when**:
  - as duas rotas existem e apontam para o mesmo `element`;
  - `rotasSobGuarda.test.ts` continua verde — **inclusive o caso de UM `</Route>`**;
  - `navItems.test.ts` continua verde (a rota com `:secao` não é destino de rodapé e é filtrada);
  - o guarda novo recusa a forma aninhada: um `<Route path="/admin/configuracoes">` com filhos
    **reprova**, com o motivo escrito ao lado (é a forma idiomática do React Router, e é a que
    derruba o recorte do guarda de autorização).
- **Gate**: backoffice.
- **Requisitos**: CFG-15, CFG-16, CFG-17.

### T03 — Modo de foco: a asserção invertida, e a âncora que precisou crescer

- **Arquivos**: `widgets/admin-layout/model/focusRoutes.ts` · `focusRoutes.test.ts`
- **Faz**: `/admin/configuracoes` entra em `FOCUS_ROUTES`.
- **Done when**:
  - `isFocusRoute('/admin/configuracoes')` e `isFocusRoute('/admin/configuracoes/vendas')` são `true`;
  - a asserção de `focusRoutes.test.ts:29` está **invertida com o motivo escrito ao lado**, nunca
    apagada (doutrina da feature 41: trava removida = teste invertido);
  - a âncora "toda rota de foco é um destino da navegação" varre `navGroups` **+ `footerNavItems`** —
    que é o que o `NavRail` renderiza — e continua reprovando uma rota de foco que não seja destino
    de nenhum dos dois;
  - `/admin/homologacao` e vizinhas continuam fora (o casamento é por segmento).
- **Gate**: backoffice.
- **Requisitos**: CFG-09.

### T04 — `SettingsSectionNav`: o rail e a lista são o mesmo nó

- **Arquivos**: `widgets/settings-sections/ui/SettingsSectionNav.tsx` (novo) ·
  `widgets/settings-sections/ui/__tests__/SettingsSectionNav.test.tsx` (novo) ·
  `widgets/settings-sections/index.ts` (novo)
- **Faz**: a lista das 4 seções lida do registro, card de 296px no desktop e lista de largura cheia
  no celular. Marcador da seção ativa em classes **`lg:`-only**; chevron `lg:hidden`.
- **Done when**:
  - renderiza **exatamente** os destinos do registro, na ordem dele — âncora **derivada da fonte**,
    nunca uma lista escrita à mão (molde de `NavRail.test.tsx`);
  - cada linha é um `<Link>` para `settingsSectionPath(slug)`;
  - só uma linha marcada, e a marcação é `lg:`-prefixada (o celular na rota-mãe não marca nada);
  - alvo de toque ≥ 44px, por **token exato** (`h-11` é substring de `min-h-11`);
  - Tab alcança as 4 linhas; **Enter e Espaço** ativam (Espaço com `preventDefault`, senão a página
    rola);
  - foco visível (`focus-visible:`);
  - as cores saem dos tokens do admin, não de hex — `adminTokens.test.ts` continua verde.
- **Gate**: backoffice.
- **Requisitos**: CFG-01, CFG-03, CFG-14, Edge (teclado).

### T05 — `AdminSettingsPage`: a página fina

- **Arquivos**: `pages/admin/AdminSettingsPage.tsx`
- **Faz**: lê `useParams().secao`, deriva `secaoValida`/`secaoExibida`, monta cabeçalho + nav +
  painel. **Apaga o `<Tabs>`**, o `save()` de seis ramos, os seis `useState` e o `PageSettingsKey`.
  O painel monta **só** o componente da seção ativa (`SETTINGS_PANELS`, T10).
- **Nota de ordem**: T05 depende de T10 para o mapa. Implemente T05 com o mapa importado e conclua a
  task quando T10 estiver de pé — ou escreva T10 primeiro se preferir; a ordem aqui é de leitura.
- **Done when**:
  - rota-mãe: painel = 1ª seção, marcada no rail, **e nenhum índice de seções no painel**
    (a asserção é a ausência — o rail já é a lista);
  - `/admin/configuracoes/xpto` se comporta como a rota-mãe;
  - **não há `<Navigate>`** na tela (CFG-17 assere a ausência do redirect);
  - abaixo de `lg` na rota-mãe: nav visível, painel `hidden lg:block`;
  - abaixo de `lg` numa seção: cabeçalho de voltar (`lg:hidden`), `PageHeader` `hidden lg:flex`,
    nav `hidden lg:block`, painel visível;
  - a seta de voltar leva a `SETTINGS_ROOT`;
  - o `PageHeader` é **o mesmo nó** antes e depois de trocar de seção (CFG-08).
- **Gate**: backoffice.
- **Requisitos**: CFG-02, CFG-08, CFG-10, CFG-11, CFG-12, CFG-15..CFG-18.

### T06 — `InfoBanner` compartilhado

- **Arquivos**: `shared/ui/InfoBanner.tsx` (novo) · `shared/ui/index.ts` ·
  `shared/ui/__tests__/InfoBanner.test.tsx` (novo)
- **Faz**: o aviso informativo único, com `--estrelinha-admin-amber` a 10% de fundo.
- **Done when**:
  - aceita ícone, corpo e um slot de ação opcional;
  - usa o token do admin, nunca `amber-50`/`amber-900` literais nem hex — `adminTokens.test.ts`
    verde;
  - o `data-testid` passa adiante (os consumidores dependem disso).
- **Gate**: backoffice.
- **Requisitos**: CFG-26.

### T07 — `StoreDataSection` — Geral + SEO

- **Arquivos**: `features/settings/ui/StoreDataSection.tsx` (novo) · `features/settings/index.ts`
- **Faz**: os dois cards de hoje, autocontidos (próprio `useStoreSettings`/`useUpdateSettings`),
  cada um com `FormCard title/description` e o `SaveButton` de hoje.
- **Done when**:
  - **os mesmos campos, rótulos e normalizações de hoje** — WhatsApp só dígitos, `@` removido de
    Instagram/TikTok, `maxLength` da mensagem e dos campos de SEO;
  - salva `general` e `seo` em chamadas separadas, com os mesmos payloads;
  - o estado de carga aparece antes dos cards.
- **Gate**: backoffice.
- **Requisitos**: CFG-04, CFG-13, Edge (carga).

### T08 — `ShippingMaterialSection` — Frete + Material, com `MoneyInput`

- **Arquivos**: `features/settings/ui/ShippingMaterialSection.tsx` (novo)
- **Faz**: os dois cards, com `FRG-12` acompanhando o card de Frete e `InfoBanner` no de Material.
  `free_shipping_threshold` e `default_shipping_cost` viram `MoneyInput`, rótulo **sem `(R$)`**.
- **Done when**:
  - o interruptor de frete grátis, o campo desabilitado que **continua exibindo o número guardado**,
    e a recusa `FRG-12` **antes de qualquer escrita** (a prova é a ausência de `mutateAsync`);
  - `v ?? 0` nos dois campos de dinheiro — o payload é o mesmo número de hoje (CFG-24);
  - o parágrafo sobre o CEP de origem do Melhor Envio continua na tela
    (`originZipNotRead.test.ts` verde);
  - os 9 campos de Material gravam como hoje, com UF e CEP normalizados;
  - o `InfoBanner` substitui o banner ad hoc sem perder ícone nem texto.
- **Gate**: backoffice.
- **Requisitos**: CFG-06, CFG-13, CFG-23, CFG-24, CFG-26, CFG-27.

### T09 — `SalesSection` — Pagamento + Checkout + Carrinho

- **Arquivos**: `features/settings/ui/SalesSection.tsx` (novo) ·
  `features/settings/ui/CheckoutSettingsCard.tsx` (só o banner)
- **Faz**: os três cards. `min_installment_value` vira `MoneyInput`; `CheckoutSettingsCard` entra
  **inteiro, sem alteração de comportamento**; o card de Carrinho mantém o texto sobre `BL-030`.
- **Done when**:
  - Pix % e "máximo de parcelas" **continuam** `<Input type="number">` — sem `R$` (CFG-25);
  - `min_installment_value` grava o mesmo número de hoje;
  - os três controles que a feature 42 removeu do Carrinho **continuam fora** (o caso e o sensor da
    `FIX-03` sobrevivem);
  - `CheckoutSettingsCard` e o de Carrinho usam `InfoBanner`.
- **Gate**: backoffice.
- **Requisitos**: CFG-05, CFG-23, CFG-24, CFG-25, CFG-26.

### T10 — `NotificationsSection` e o mapa slug → painel

- **Arquivos**: `widgets/settings-sections/ui/NotificationsSection.tsx` (novo) ·
  `widgets/settings-sections/model/panels.tsx` (novo) ·
  `widgets/settings-sections/model/__tests__/panels.test.tsx` (novo)
- **Faz**: a seção que monta `NotificationsTab` sem tocá-lo, e o `Record<slug, ComponentType>`.
- **Done when**:
  - o mapa é **bidirecional** contra o registro: toda chave tem painel e todo painel tem chave —
    e o caso reprova nos **dois** sentidos (molde de `menuIconCatalog.test.ts`);
  - âncora de contagem derivada do registro, nunca um número cravado;
  - `NotificationsTab` é montado sem props e sem wrapper que mude comportamento (CFG-07).
- **Gate**: backoffice.
- **Requisitos**: CFG-07, âncora registro ↔ painéis.

### T11 — Fim das "abas": a copy, o link, e o guarda

- **Arquivos**: `features/notification-settings/ui/NotificationsTab.tsx` ·
  `features/notification-settings/model/useNotificationsDraft.ts` ·
  `features/notification-settings/ui/EventCard.tsx` (+ tipo `EventWarning`) ·
  `features/notification-settings/ui/__tests__/EventCard.test.tsx` ·
  `features/notification-settings/model/__tests__/useNotificationsDraft.test.tsx` ·
  `shared/ui/FieldGroup.tsx` (comentário) ·
  `shared/lib/__tests__/semAbaEmConfiguracoes.test.ts` (novo)
- **Faz**: as duas mensagens passam a nomear **"seção Frete e Material"**; o aviso do `EventCard`
  ganha link para `/admin/configuracoes/frete-e-material`; `"Configurações → Geral"` vira
  `"Configurações → Dados da loja"`; o `warnings: string[]` vira `EventWarning[]`.
- **Done when**:
  - as duas frases nomeiam a seção, e nenhuma diz "aba";
  - o aviso de material oferece um `<Link>` com o `href` da seção (CFG-21);
  - a recusa (`refusalFor`) continua `string | null` — o contrato do hook não muda;
  - `EventCard.test.tsx` passa a embrulhar em `MemoryRouter` (o `<Link>` exige Router);
  - o guarda varre `apps/backoffice/src/**` e recusa `aba <rótulo>` para os **seis rótulos
    inequívocos** de Configurações (Material, Frete, Pagamento, Checkout, Carrinho, Notificações) e
    os **quatro** rótulos novos, mais a forma `Configurações → <rótulo antigo>`;
  - **"Geral" e "SEO" sozinhos ficam de fora, com o motivo escrito no arquivo** — o formulário de
    produto tem abas reais com esses nomes, e um guarda que nasce reprovando outra tela é um guarda
    que alguém desliga;
  - **allowlist de UM** (o próprio guarda, que precisa escrever as formas nos sensores), com um caso
    provando que **outro** arquivo de teste seria acusado;
  - âncora dupla (arquivos lidos **e** os rótulos encontrados no registro) e sensor por frase, com
    remoção de comentário provada com CRLF **e** com LF.
- **Gate**: backoffice **e store** (`notificationSingleOwner.test.ts` vive lá e varre `apps/**`).
- **Requisitos**: CFG-20, CFG-21, CFG-22.

### T12 — `TextSectionEditor`: três valores, duas seções, dois links

- **Arquivos**: `features/home-composition/ui/TextSectionEditor.tsx` ·
  `features/home-composition/ui/TextSectionEditor.test.tsx`
- **Faz**: o link único para `/admin/configuracoes` vira dois — frete grátis → Frete e Material;
  parcelas e Pix → Vendas.
- **Done when**:
  - os dois `href` são os caminhos do registro, não literais;
  - o teste de hoje (`:216`) é **reescrito para os dois**, nunca afrouxado;
  - a frase continua dizendo que é "a mesma fonte que o caixa cobra".
- **Gate**: backoffice.
- **Requisitos**: CFG-19.

### T13 — Migrar os 21 casos de `AdminSettingsPage.test.tsx`

- **Arquivos**: `pages/admin/AdminSettingsPage.test.tsx`
- **Faz**: troca os helpers de navegação (`getByRole('tab')` + `fireEvent.mouseDown`) por render em
  `MemoryRouter` na rota da seção. **As asserções de comportamento sobrevivem inteiras.**
- **Done when**:
  - todos os casos de `MAT-01`, `FRG-02`, `FRG-12` e `FIX-03` continuam existindo e provando a mesma
    coisa;
  - `campoValor()` passa a casar o rótulo **sem `(R$)`** e o valor exibido do `MoneyInput`;
  - os **dois** casos que asseriam o remendo de CSS do `TabsList` (`sm:grid-cols-8` e `h-auto`) são
    **invertidos, não apagados**: passam a asserir que não há `tablist` na tela e que a navegação
    nova não tem classe que dependa da CONTAGEM de seções — que é a promessa "uma 5ª seção não exige
    remendo de CSS";
  - os casos novos das ACs de navegação (CFG-02, CFG-03, CFG-08, CFG-10..12, CFG-15..18) e das duas
    *Edge Cases* de estado (descarte e prévia) entram aqui.
- **Gate**: backoffice.
- **Requisitos**: todos os de P1, mais a promessa do *Success Criteria*.

### T14 — Fecho: gate completo, baselines, `STATE.md` e commit

- **Faz**: mede os 5 workspaces um por vez, lint, tipos, build, `git diff` do payment; atualiza as
  baselines do `CLAUDE.md` e o `apps/backoffice/CLAUDE.md`; escreve `AD-038` no `STATE.md`; gera **um
  commit** com a feature inteira.
- **Done when**:
  - os 5 workspaces verdes, exit code capturado **fora de pipe**;
  - `store` sem regressão (é gate, não controle); `core`, `functions` e `catalog-import` idênticos;
  - lint ≤ 26/6 e tipos em 0 · 0 — **e a baseline anotada se mudar para baixo** (baseline que cai
    também precisa ser registrada, senão a feature seguinte compara contra folga que não existe);
  - `git diff --name-only -- packages/core/src/payment` vazio;
  - `AD-038` escrito com o número conferido contra o maior `AD-` real do `STATE.md` — **`AD-037` é
    da feature `52`** e está reservado, mesmo sem entrada escrita;
  - o commit não carrega `.pyc` nem arquivo de outra sessão.
- **Requisitos**: *Success Criteria* da spec.

---

## O que só o navegador prova

jsdom devolve **0** para toda medida de layout, então tudo que as tasks acima provam sobre largura,
coluna e alvo de toque é **proxy de forma** (classe declarada, atributo, presença de nó). Fica para
uma sessão de navegador, em **390×844 e 1440**:

1. O rail de 296px ao lado do painel em 1440, com o trilho de ícones do modo de foco à esquerda —
   e o mesmo em **1024**, onde o `lg:` acabou de ligar e as duas colunas são mais apertadas.
2. A lista das 4 seções em 390, sem rolagem horizontal do body, com o alvo real de 44px sob o dedo.
3. A seção aberta em 390: o cabeçalho de voltar, os campos em coluna única, e o card Material
   inteiro (os 9 campos, incluindo os dois que o artboard abrevia).
4. **Notificações em 390** — 15 cards, cada um com 5 campos e uma prévia: é a seção que mais pesa, e
   a única em que o painel rola muito.
5. Trocar de seção **sem recarregar a página**, e o modo de foco recolhendo a navegação ao entrar.
6. A prévia de e-mail aberta, trocar de seção, voltar — e ela estar fechada.
