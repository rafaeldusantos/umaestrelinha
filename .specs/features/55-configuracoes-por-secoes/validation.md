# Configurações por Seções — Validation

> **Autor ≠ verificador.** Este relatório foi escrito por uma sessão que **não** implementou a
> feature `55`. Nada aqui foi herdado do modelo mental de quem escreveu o código: a cobertura foi
> re-derivada da `spec.md`, e cada afirmação de "está provado" foi testada por **injeção de falha de
> comportamento nos arquivos REAIS de produção**, com a mutação revertida e conferida por `diff`
> byte a byte depois de cada execução.

---

# ▶ VEREDITO FINAL (rodada 2): **PASS**

**Rodada 1 reprovou** com 7 mutações de comportamento sobrevivendo, 1 requisito não cumprido
(`CFG-14`) e 1 desvio de spec (`CFG-05`). **Rodada 2 passa**: os 11 achados foram atacados, e eu
**re-executei as 8 mutações sobreviventes nos arquivos reais — as 8 morrem agora**, mais 11 mutações
novas contra as próprias correções (19 injeções na rodada 2, **19 mortes, 0 sobreviventes**). Não
confiei nos números da implementação: medi tudo de novo.

Sobra **uma observação de baixa severidade** — um ponto cego *latente* que a correção do `CFG-14`
ampliou, provado por sonda pareada e registrado em §9. Ele não reprova a feature: nenhum ponto de
chamada atual o exerce, e o conserto é de uma linha noutro guarda.

E sobra o que reprova nenhuma suíte: **a feature continua sem prova em navegador**. Quatro dos sete
achados da rodada 1 eram de layout, e nenhum deles teria sobrevivido a alguém abrir a tela em 390px.

> **O relatório da rodada 1 fica abaixo INTEIRO, sem edição.** Um achado apagado depois de corrigido
> não deixa rastro de que existiu, e a próxima pessoa a mexer nestes arquivos não descobre por que as
> asserções têm a forma que têm. A §7 diz, achado por achado, o que passou a prendê-lo.

---

## Rodada 1 (histórico) — veredito da época: FAIL

**Veredito: FAIL** — e a distinção importa, porque ela muda o que precisa ser feito.

- **A implementação está, em quase tudo, CERTA.** Conferi à mão a paridade de campos e de payload
  contra o `HEAD` (`5104239`): nenhum campo, rótulo, `placeholder`, `maxLength` ou normalização foi
  perdido na reescrita de 602 linhas — a única diferença é a remoção dos três sufixos `(R$)`, que é
  o que `CFG-23`/`design.md` mandam. As cinco suítes estão verdes, os tipos em 0 · 0 e o lint na
  baseline.
- **O que reprova é a PROVA.** Sete mutações de comportamento em arquivos de produção **sobreviveram
  com a suíte verde**, cinco delas em cima de uma AC de P1. Duas delas não são só lacuna de teste:
  são requisito não cumprido (`CFG-14`) e desvio de spec (`CFG-05`) que nenhum teste podia ver.

**Diff verificado**: `5104239..working tree` (a feature está **sem commit**). Escopo de código: 26
arquivos rastreados (`apps/**`, `packages/**`), 1175 inserções / 669 remoções, mais 12 arquivos novos
não rastreados.

> ⚠️ **A working tree está COMPARTILHADA, e ela mudou durante esta verificação.** Ao começar, o
> `git status` acusava 27 arquivos; ao terminar, 28 — a sessão do autor acrescentou o `CLAUDE.md` da
> raiz e ampliou o `.specs/STATE.md` de 49 para 80 linhas enquanto eu media (o fecho da T14). **O
> diffstat de CÓDIGO não mudou**: 26 arquivos, 1175/669, idêntico do começo ao fim, e os 18 arquivos
> que mutei voltaram byte a byte (`diff -q` limpo, `INTEGRITY_FAIL=0`). Os números de teste abaixo
> valem para a árvore de código como ela estava; a documentação ainda estava sendo escrita.

---

## Medições (um workspace por vez, exit code fora de pipe, `--testTimeout=20000` SEM `--`)

| Medida | Baseline informada | Medido no começo | Medido no fim | Veredito |
| --- | --- | --- | --- | --- |
| backoffice | 2930 / 164 | **2930 / 164** (exit 0) | **2930 / 164** (exit 0) | = |
| store (é GATE, não controle) | 3516 / 221 | — | **3516 / 221** (exit 0) | = |
| `tsc` backoffice | 0 | — | **0** (exit 0) | = |
| `tsc` store | 0 | — | **0** (exit 0) | = |
| `pnpm lint` | 26 erros / 6 warnings | — | **26 / 6** (backoffice 24/4 · store 2/2) | = |

`core`, `functions` e `catalog-import` não foram remedidos por mim: a feature não os toca, e o
`git diff --name-only` confirma que `packages/core/src/payment/**` não teve uma linha alterada.

---

## 1. Verificação por requisito

Legenda: **✅ provado** (existe teste e a mutação correspondente mata) · **⚠️ fraco** (existe teste,
mas ele é verdadeiro nos dois mundos ou mede menos que a AC) · **❌ sem prova** (a mutação sobrevive,
ou não há asserção).

| Req | O que a AC exige | Onde se prova | O que o teste assere | Veredito |
| --- | --- | --- | --- | --- |
| CFG-01 | rail com exatamente 4 seções, nesta ordem | `settingsSections.test.ts` · `SettingsSectionNav.test.tsx` | a lista de 4 slugs por extenso (é a asserção, não uma derivação) **e** os `href` renderizados derivados do registro | ✅ |
| CFG-02 | rota-mãe = 1ª seção marcada, **nunca um índice no painel** | `AdminSettingsPage.test.tsx:155,163` | painel mostra Geral/SEO, rail marca a 1ª, e nenhuma `description` do registro aparece dentro do painel | ✅ (M3 mata) |
| CFG-03 | escolher seção troca painel **e** marcador | idem `:174` + `SettingsSectionNav.test.tsx` | clicar troca o aviso do painel e move o `aria-current` | ✅ (M8, M27 matam) |
| CFG-04 | Dados da loja = Geral + SEO, **mesmos campos, rótulos e botões** | idem `:185,779` | os dois títulos de card e 2 chaves gravadas | ⚠️ — a metade "mesmos campos" não tem asserção (ver achado 9). **Conferida por mim à mão: intacta** |
| CFG-05 | Vendas = Pagamento + **Checkout** + Carrinho | idem `:185` | `getByText('Pagamento')`, `getByTestId('checkout-card-stub')`, `getByText('Carrinho abandonado')` | ⚠️ — o card de Checkout é **stub**, e o card real não tem título nenhum (ver achado 8) |
| CFG-06 | Frete e Material = Frete + Material | idem `:185,485` | os dois títulos, mais toda a suíte `MAT-01`/`FRG-02`/`FRG-12` | ✅ (M27 mata) |
| CFG-07 | Notificações monta `NotificationsTab`, sem mudar comportamento | idem `:205` | o stub está no DOM e nenhuma gravação dispara | ✅ |
| CFG-08 | o cabeçalho **permanece fixo**, muda só o painel | idem `:214` | `toBe(antes)` — identidade do nó | ❌ **M4 SOBREVIVE** (achado 1) |
| CFG-09 | modo de foco, com o controle de expandir | `focusRoutes.test.ts` (asserção **invertida** + subrota + o par "os outros dois do rodapé ficam fora") | `isFocusRoute` true para a rota e as subrotas; `FOCUS_ROUTES` tem exatamente três | ✅ (M9 mata 3 casos) |
| CFG-10 | <`lg` na rota-mãe: **só** a lista | `AdminSettingsPage.test.tsx:264` | painel tem `hidden`+`lg:block` por token exato; nav não tem `hidden` | ✅ (M1, M2 matam) |
| CFG-11 | tocar abre a rota: seta de voltar + largura cheia | idem `:284,292` | painel visível, nav `hidden lg:block`, botão `Voltar` e o título da seção | ⚠️ — o `PageHeader` "Configurações" não é conferido (ver achado 6). A parte do nav e do painel: ✅ (M21 mata) |
| CFG-12 | a seta / o voltar do navegador retorna à lista | idem `:300` | depois do clique: nav à vista, painel escondido, botão sumiu | ✅ (M1 mata). O voltar do navegador é do router, sem caso próprio |
| CFG-13 | grade de 2-3 colunas **empilha** no celular | idem `:339` | nenhuma grade do painel tem `grid-cols-*` sem prefixo | ❌ **M19 SOBREVIVE** — a régua não enxerga a forma que existe para recusar (achado 2) |
| CFG-14 | alvo ≥44px na **lista**, no **botão de voltar** e nos **controles de uma seção** | `SettingsSectionNav.test.tsx` (linha 60px) · `AdminSettingsPage.test.tsx:316` (`h-11 w-11`) | as duas primeiras cláusulas | ❌ a terceira cláusula não é cumprida **nem testada** (achado 7). M12 mata a do botão |
| CFG-15 | a URL reflete a seção | `AdminSettingsPage.test.tsx:235` · `rotasDeConfiguracoes.test.ts` | cada `href` do rail = `settingsSectionPath(slug)`; as rotas existem no `App.tsx` | ✅ (M10, M17 matam) |
| CFG-16 | URL direta abre a seção | idem `:228` + `rotasDeConfiguracoes` | a seção abre e o rail marca | ✅ (M17 mata) |
| CFG-17 | rota-mãe **sem redirect** | idem `:254` · `rotasDeConfiguracoes` (`not.toMatch(/<Navigate/)`) | a rota-mãe renderiza painel e cabeçalho; não há `<Navigate>` no `App.tsx` | ✅ |
| CFG-18 | slug inexistente = rota-mãe | `settingsSections.test.ts` (5 casos) + `AdminSettingsPage.test.tsx:243` | `null` para inexistente/vazio/`undefined`/prefixo/caixa, e a tela se comporta como a mãe | ✅ (M2 mata 8 casos) |
| CFG-19 | link interno aponta para a **seção** | `TextSectionEditor.test.tsx` (3 casos: os dois `href`, o pareamento por ordem no texto, e "nenhum link é a rota-mãe") | ✅ (M10 mata 2) | ✅ |
| CFG-20 | a copy nomeia a seção | `useNotificationsDraft.test.tsx` (`toContain('seção Frete e Material')` **e** a ausência de "aba") · `EventCard.test.tsx` | os dois lados, não só o nome novo | ✅ (M24 mata pelo guarda) |
| CFG-21 | a mensagem **oferece link** | `EventCard.test.tsx:296` | o `href` do `<Link>` — **com o `warnings` montado no próprio teste** | ❌ **M6 SOBREVIVE**: o produtor real pode deixar de mandar o `action` (achado 3) |
| CFG-22 | varredura: nenhuma "aba" de Configurações | `semAbaEmConfiguracoes.test.ts` (âncora dupla, allowlist de 1, 9 sensores incl. 5 inversos) | a ausência, com os rótulos vindos do registro | ✅ (M24 reinjeta a frase real e o guarda reprova) |
| CFG-23 | os 3 campos usam `MoneyInput` | `AdminSettingsPage.test.tsx:687,708` | Frete: 2 rótulos sem `(R$)` + ≥2 nós `R$`. Parcela: **só que o campo existe** | ⚠️ a asserção da parcela é verdadeira nos dois mundos (achado 10); M29 morre pela vizinha |
| CFG-24 | payload idêntico ao de hoje | idem `:697,726` | `default_shipping_cost` vazio grava `0`; a parcela grava `25.5` | ❌ **M7b e M7c SOBREVIVEM** — 1 de 3 campos provado (achado 5) |
| CFG-25 | % e contagem NÃO viram dinheiro | idem `:713` | `type="number"` nos três | ✅ |
| CFG-26 | `InfoBanner` nos 4 lugares | `InfoBanner.test.tsx` (8 casos) · `AdminSettingsPage.test.tsx:365,375,552` | Material e Carrinho pelo token; a varredura `bg-muted` | ❌ **M11a SOBREVIVE** — o consumidor Checkout não tem cobertura (achado 4). O do `EventCard` morre por acidente (pelo link) |
| CFG-27 | equivalente, não redesenhado | `InfoBanner.test.tsx` + texto/ícone nos consumidores | ícone presente, texto preservado, o corpo continua **um nó** | ✅ |

### Edge Cases

| Edge Case | Onde | Veredito |
| --- | --- | --- |
| trocar de seção **descarta** a edição | `AdminSettingsPage.test.tsx:414` — editar, sair, voltar, e o campo volta ao servidor; **mais** o caso que prende a propriedade (`:431`, "a seção que sai é DESMONTADA — não escondida") | ✅ M5 mata os dois |
| a **prévia de e-mail fecha** ao trocar de seção | idem `:445` — o stub da `NotificationsTab` some do DOM | ✅ M5 mata. Provado pelo **mecanismo** (desmonte), com o motivo escrito; a prévia em si é estado local dela |
| rail por **teclado** (Tab, Enter, Espaço, foco visível) | `SettingsSectionNav.test.tsx` — `<a href>` sem `tabIndex=-1`, `focus-visible:ring`, Espaço ativa **e** `preventDefault`, mais o sensor de que outra tecla não ativa | ✅ M20 mata. Enter é do navegador, sem caso — declarado no arquivo |
| recolher/expandir segue a regra das outras rotas de foco, **sem dono novo** | derivado: `FOCUS_ROUTES` + `navRail.test.ts`/`AdminLayout.test.tsx` (que exercitam `/admin/home`) | ✅ por construção — nenhum dono novo foi criado |
| estado de **carga** antes dos cards | `AdminSettingsPage.test.tsx:460,468` | ⚠️ provado só para `StoreDataSection`; `SalesSection` e `ShippingMaterialSection` têm o mesmo ramo sem caso. M18 mata o testado |

---

## 2. Tabela de mutações

Todas as mutações foram aplicadas nos **arquivos reais de produção**, executadas com
`pnpm --filter @estrelinha/backoffice exec vitest run --testTimeout=20000 <alvo>`, revertidas em
seguida e conferidas com `diff -q` contra um backup byte a byte.

| # | Mutação (arquivo real) | Resultado | Caso que morreu |
| --- | --- | --- | --- |
| M1 | `AdminSettingsPage.tsx:114` — apagar `!secaoValida && 'hidden lg:block'` do painel | **MORREU** | CFG-10, CFG-12, CFG-18 (3) |
| M2 | `settingsSections.ts` — `findSettingsSection` devolve `SETTINGS_SECTIONS[0]` em vez de `null` | **MORREU** | 4 em `settingsSections.test.ts` + 4 na página (8) |
| M3 | `AdminSettingsPage.tsx:68` — painel passa a usar `secaoValida` (rota-mãe sem corpo) | **MORREU** | "a rota-mãe abre a PRIMEIRA seção", CFG-18 (2) |
| **M4** | `AdminSettingsPage.tsx:94` — mover o `<PageHeader title="Configurações">` para **dentro** do `div` do painel | **SOBREVIVEU** | — (achado 1) |
| M5 | `AdminSettingsPage.tsx` — montar as **quatro** seções e esconder três por CSS | **MORREU** | CFG-03, CFG-04..06, as **duas** Edge Cases de estado, e a de carga (6) |
| **M6** | `NotificationsTab.tsx:82` — tirar o `action:{to,label}` do aviso de material | **SOBREVIVEU** | — (achado 3) |
| M7a | `ShippingMaterialSection.tsx:135` — `default_shipping_cost: v ?? 0` → `v` | **MORREU** | CFG-24 (1) |
| **M7b** | `ShippingMaterialSection.tsx:120` — `free_shipping_threshold: v ?? 0` → `v` | **SOBREVIVEU** | — (achado 5) |
| **M7c** | `SalesSection.tsx:92` — `min_installment_value: v ?? 0` → `v` | **SOBREVIVEU** | — (achado 5) |
| M8 | `SettingsSectionNav.tsx:88` — tirar o prefixo `lg:` do marcador ativo | **MORREU** | "a pintura do marcador é `lg:`-only" (1) |
| M9 | `focusRoutes.ts:32` — tirar `/admin/configuracoes` de `FOCUS_ROUTES` | **MORREU** | CFG-09 ×2 + a âncora dos três (3) |
| M10 | `TextSectionEditor.tsx:97` — apontar o link de Vendas para a rota-mãe | **MORREU** | CFG-19 ×2 (2) |
| **M11a** | `CheckoutSettingsCard.tsx:73` — `InfoBanner` de volta a um `div` `bg-muted` ad hoc | **SOBREVIVEU** (14 arquivos verdes) | — (achado 4) |
| M11b | `EventCard.tsx:111` — `InfoBanner` de volta ao `div` `amber-*` cru | **MORREU** — mas pelo **link**, não pela cor | CFG-21 (1) |
| M12 | `PageHeader.tsx:22` — tirar `h-11 w-11` do botão de voltar | **MORREU** | CFG-14 do botão (1) |
| **M14** | `AdminSettingsPage.tsx:95` — tirar `hidden lg:flex` do `PageHeader` principal | **SOBREVIVEU** | — (achado 6) |
| M17 | `App.tsx:110` — apagar a rota `/admin/configuracoes/:secao` | **MORREU** | 4 em `rotasDeConfiguracoes.test.ts` |
| M18 | `StoreDataSection.tsx` — apagar o `if (isLoading) return <SettingsLoading />` | **MORREU** | Edge: carga (1) |
| **M19** | `StoreDataSection.tsx:56` — `sm:grid-cols-2` → `grid-cols-2` | **SOBREVIVEU** | — (achado 2) |
| M20 | `SettingsSectionNav.tsx:75` — apagar o `onKeyDown` do Espaço | **MORREU** | Edge: teclado (1) |
| M21 | `AdminSettingsPage.tsx:104` — tirar `hidden lg:block` do `SettingsSectionNav` | **MORREU** | CFG-11 (1) |
| M24 | `NotificationsTab.tsx` — devolver a frase "…na ⟨aba⟩ Material…" | **MORREU** pelo guarda de varredura | CFG-22 (1). **Nenhum teste de componente a pegou** |
| M27 | `panels.tsx` — trocar os painéis de `vendas` e `frete-e-material` entre si | **MORREU** (12+) | CFG-03, CFG-04..06, `MAT-01` inteiro, `FRG-02`… |
| **M28** | `StoreDataSection.tsx` — apagar o campo "Imagem Open Graph (URL)" | **SOBREVIVEU** | — (achado 9) |
| M29 | `SalesSection.tsx:89` — `MoneyInput` → `<Input type="number">` na parcela mínima | **MORREU** — pela **vizinha** (CFG-24), nunca pela asserção de CFG-23 | (achado 10) |

**Placar: 19 mataram, 7 sobreviveram (M4, M6, M7b, M7c, M11a, M14, M19, M28 — oito execuções, sete
achados distintos).**

---

## 3. Achados, do mais grave para o menos

### 1 — `CFG-08`: o que está provado é a IDENTIDADE do nó, não a POSIÇÃO dele

`AdminSettingsPage.test.tsx:214` guarda a AC com `expect(screen.getByRole('heading', {name:
'Configurações'})).toBe(antes)`. React reconcilia por **posição e tipo**, então o nó do cabeçalho
sobrevive à troca de rota **onde quer que ele esteja na árvore** — inclusive dentro do painel. A
asserção é verdadeira nos dois mundos.

Movi o `<PageHeader>` para dentro do `div[data-testid="settings-panel"]`
(`AdminSettingsPage.tsx:94`) e os **112 casos do arquivo passaram**.

O que a Adri veria: o título "Configurações" deixaria de atravessar o topo da página e passaria a
morar dentro da coluna de `max-w-3xl` **ao lado do rail** — e, na rota-mãe em menos de `lg`, ele
**desapareceria por completo**, porque o painel carrega `hidden lg:block` ali. A lista de 4 seções
no celular abriria sem título nenhum.

Régua que faltaria: uma asserção de **ancestralidade** — `expect(painel().contains(cabecalho)).toBe
(false)`, ou que o cabeçalho é irmão anterior do contêiner de duas colunas.

### 2 — `CFG-13`: a régua do empilhamento no celular exclui da amostra exatamente o defeito

`AdminSettingsPage.test.tsx:334`:

```js
const gradesDe = (raiz) => Array.from(raiz.querySelectorAll('div')).filter(d =>
  d.className.split(/\s+/).some(c => /^(sm|md|lg):grid-cols-/.test(c)))
```

Ela **só coleta divs que já têm a forma responsiva**. Um `div` com `grid-cols-2` puro — que é a
única coisa que a AC proíbe — nunca entra na amostra, e o
`expect(classes.filter(/^grid-cols-/)).toEqual([])` das linhas seguintes roda sobre um conjunto de
onde o defeito foi filtrado fora. A âncora (`grades.length > 0`) segue verde porque as outras grades
continuam responsivas.

Troquei `sm:grid-cols-2` por `grid-cols-2` em `StoreDataSection.tsx:56` (o par WhatsApp/E-mail) e os
**112 casos passaram**.

O sensor do próprio arquivo (`:355`, "a régua distingue `grid-cols-2` de `sm:grid-cols-2`") **não
chama `gradesDe`** — ele exercita só o `filter` interno sobre um array escrito à mão. Ele prova a
metade da régua que funciona.

O que a Adri veria: dois campos lado a lado numa viewport de 390px, cada um com ~170px — e é a AC de
uma história marcada MVP.

Régua que faltaria: coletar `div[class*="grid"]` (ou todo `div` cuja classe tenha o token `grid`) e
recusar `grid-cols-*` sem prefixo, com o sensor chamando `gradesDe` de verdade.

### 3 — `CFG-21`: o link está provado no componente e não no único produtor dele

`EventCard.test.tsx:296` monta o `warnings` **dentro do próprio teste** (`avisoDoMaterial`, `:262`) e
confere o `href`. Isso prova que o `EventCard` sabe desenhar um link quando recebe um `action` — não
prova que alguém manda o `action`.

Apaguei o `action: { to, label }` de `NotificationsTab.warningsFor` (`NotificationsTab.tsx:82`), que
é o **único** lugar do repositório que constrói esse aviso, e os **9 arquivos de
`features/notification-settings` ficaram verdes**.

O que a Adri veria: exatamente o estado anterior à feature — o aviso nomeia "seção Frete e Material"
e não leva a lugar nenhum. A metade que `CFG-21` acrescenta sobre `CFG-20` simplesmente não existe,
e nada acusa.

É a lição que este repositório já registrou três vezes (`41`, `44`, `49`): *as duas pontas provadas e
o fio entre elas não*. `NotificationsTab.test.tsx` já renderiza a aba de verdade com o endereço
vazio (`ABN-09`, "material_instructions mostra o aviso de endereço vazio") — falta uma linha ali
cobrando `getByTestId('event-warning-link-material_instructions')`.

### 4 — `CFG-26`: o consumidor Checkout não tem UMA asserção, e a varredura que existiria é cega a ele

Devolvi o `InfoBanner` de `CheckoutSettingsCard.tsx:73` ao `div className="… bg-muted …"` ad hoc de
antes da feature, e **14 arquivos de teste ficaram verdes** — incluindo
`AdminSettingsPage.test.tsx`.

Duas causas somadas:

1. `CheckoutSettingsCard.test.tsx` (291 linhas) não menciona o banner — nem por `testid`, nem por
   classe, nem por texto.
2. A varredura de `AdminSettingsPage.test.tsx:375` ("nenhum aviso de Configurações ficou com a caixa
   cinza ad hoc") percorre `painel().querySelectorAll('div')` — mas aquele arquivo **dubla**
   `@/features/settings/ui/CheckoutSettingsCard` por um `<div data-testid="checkout-card-stub" />`.
   O card real nunca está na árvore que a varredura lê.

A `spec.md` nomeia os quatro lugares (Material, Checkout, Carrinho abandonado, `EventCard`); dois
estão provados, um está provado por acidente (M11b morreu pelo link, não pela cor) e o quarto está
sem prova.

### 5 — `CFG-24`: "o payload é o mesmo número de hoje" está provado para 1 dos 3 campos

O `design.md` promete, por escrito: *"`v ?? 0` em cada um dos três, e **um caso por campo** provando
que o payload é idêntico ao de hoje"*. Existe **um** caso, e ele esvazia só `default_shipping_cost`.

- `free_shipping_threshold: v ?? 0` → `v` — **sobrevive**. O caso de `FRG-12` digita `'0'` (não
  vazio) e o de `FRG-02` nunca esvazia.
- `min_installment_value: v ?? 0` → `v` — **sobrevive**. O caso digita `'25,50'`.

O que gravaria: `null` onde hoje vai `0`, dentro do `jsonb` de `store_settings`. A combinação
perigosa (frete grátis **ligado** com faixa nula) continua barrada por `freeShippingRefusal`, que
recusa não-finito — então não é vazamento de dinheiro; é mudança silenciosa de **forma do dado** num
campo que a loja lê em runtime. É o tipo de coisa que só aparece meses depois.

### 6 — `CFG-11`: o cabeçalho de desktop pode reaparecer no celular sem nada acusar

O `design.md` traz uma tabela de visibilidade com quatro linhas (`PageHeader`, cabeçalho de voltar,
`SettingsSectionNav`, painel). Os testes cobrem **três**. Apaguei
`className={cn(secaoValida && 'hidden lg:flex')}` do `PageHeader` principal
(`AdminSettingsPage.tsx:95`) e os 112 casos passaram.

O que a Adri veria em 390px dentro de uma seção: **dois cabeçalhos empilhados** — "← Frete e
Material / A joia que sai, o material que chega", e logo abaixo "⚙ Configurações / O que muda o
funcionamento da loja…". Meia tela de cabeçalho antes do primeiro campo.

### 7 — `CFG-14`: a terceira cláusula da AC não é cumprida, e não foi testada

A AC diz, literalmente: *"qualquer alvo de toque **da lista, do botão de voltar ou dos controles de
uma seção**"*. O `design.md` mapeia `CFG-14` só para `SettingsSectionNav.test.tsx` (altura da linha)
— a terceira cláusula foi estreitada no desenho **sem estar na tabela de Out of Scope**.

Medido no fonte:

| Controle | Medida | Onde |
| --- | --- | --- |
| `Switch` de `ToggleField` sem `switchClassName` | `h-6 w-11` = **24×44** | "Oferecer frete grátis" (`ShippingMaterialSection`), "PIX habilitado" e "Cartão de crédito habilitado" (`SalesSection`), "Order bump habilitado" (`CheckoutSettingsCard`) |
| `SettingsSaveButton` (`<Button>` tamanho `default`) | `h-10` = **40px** | os 5 botões "Salvar alterações" |

O agravante é que **o conserto já existe neste repositório**: a feature `53` mediu este mesmo defeito
em navegador real, a 390px, e acrescentou o prop aditivo `switchClassName` a `ToggleField`
justamente para ele (o comentário está em `FieldGroup.tsx:24-31`, e esta feature **editou esse
comentário**). A `55` reescreveu os cards e não o usou.

### 8 — `CFG-05`: o card "Checkout" perdeu o nome, e o stub impede o teste de ver

`CheckoutSettingsCard` renderiza `<FormCard>` **sem `title`**, e `FormCard` só desenha o
`CardHeader` quando há `title`/`description`/`action`. No layout antigo o nome vinha do
`<TabsTrigger value="checkout">Checkout</TabsTrigger>` (`HEAD:AdminSettingsPage.tsx:141`); agora não
há `TabsTrigger`, e `SalesSection` monta o card sem envelope.

Resultado: a palavra **"Checkout" não aparece em lugar nenhum** da tela de Configurações. Dentro de
"Vendas" a Adri vê "Pagamento", depois um cartão sem título com o order bump, depois "Carrinho
abandonado". A AC nomeia os três cards.

O teste não pode ver: ele confere `getByTestId('checkout-card-stub')`, e o stub é um `<div>` vazio.

### 9 — Success Criterion #1 ("sem nenhum campo removido ou alterado") não tem teste

Apaguei o `FieldGroup` "Imagem Open Graph (URL)" de `StoreDataSection.tsx` e os 112 casos passaram.
Dez dos campos migrados não têm asserção de presença: os **3** de SEO, e em Geral o e-mail, o TikTok
e a mensagem padrão do WhatsApp, e em Material o complemento, o bairro, a cidade e a observação.
(O caso `salva a chave 'material' com os nove campos` **não** cobre isso: o estado é semeado a partir
de `data.material`, então as nove chaves saem no payload mesmo com os `<input>` apagados.)

**Isto é dívida de proteção, não defeito entregue.** Conferi a paridade à mão, comparando o conjunto
de `label=`, `placeholder=` e `maxLength=` de `git show HEAD:…/AdminSettingsPage.tsx` com o dos três
arquivos novos: a **única** diferença são os três sufixos `(R$)` que `CFG-23` manda tirar. Nada foi
perdido — mas nada impede que se perca amanhã, numa tela cujo propósito declarado é "só reorganiza o
que existe".

### 10 — `CFG-23` na parcela mínima é uma asserção verdadeira nos dois mundos

`expect(screen.getByLabelText('Valor mínimo da parcela')).toBeInTheDocument()` prova que existe um
campo rotulado, não que ele é mascarado. Trocando o `MoneyInput` por `<Input type="number">`, esse
caso **passa**; quem matou a mutação foi a vizinha de `CFG-24` (o `'25,50'` deixa de virar `25.5`
num input numérico), por acidente de forma — não por desenho.

### 11 — Menor: o estado de carga só é provado numa das três seções

`SalesSection` e `ShippingMaterialSection` têm o mesmo `if (isLoading) return <SettingsLoading />` e
nenhum caso. A Edge Case fala em "as configurações" no geral.

---

## 4. O que NÃO consegui verificar, e por quê

- **Tudo o que é layout.** jsdom devolve 0 para toda medida — largura do rail de 296px, o painel ao
  lado dele em 1024 e 1440, ausência de rolagem horizontal do corpo em 390, os 44px reais sob o dedo,
  e as 15 fichas de Notificações num celular. Cada asserção de forma neste relatório é **proxy de
  classe declarada**. A lista do que falta está no `design.md` da feature (*O que só o navegador
  prova*, 6 itens), e ela continua inteira: **não há prova em navegador desta feature**. Os achados
  1, 2, 6 e 7 são todos de layout — e os quatro são invisíveis para a suíte por construção.
- **O voltar do navegador** (`CFG-12`, segunda metade). O teste cobre a seta; o botão do navegador é
  comportamento do `react-router` e não tem caso próprio.
- **`CFG-09`, metade "com o controle de expandir disponível"**. `AdminLayout.test.tsx` exercita o
  modo de foco só em `/admin/home`. Como `isFocusRoute` é dono único e está testado, a propriedade é
  derivada — mas não há um caso em `/admin/configuracoes`.
- **A contagem de `core`, `functions` e `catalog-import`.** Não os remedi: a feature não os toca e
  `packages/core/src/payment/**` está intocado.

---

## 5. O que está BEM feito, e merece registro

Para não dar a impressão de que a feature é fraca — ela não é:

- **`semAbaEmConfiguracoes.test.ts` é um guarda de primeira linha.** Reinjetei a frase real
  ("preencha o logradouro na ⟨aba⟩ Material") no `NotificationsTab.tsx` e ele reprovou; **nenhum
  teste de componente pegou**. Ele tem âncora dupla (arquivos lidos **e** rótulos derivados do
  registro), allowlist de UM com o par que prova que ela não é porta larga, e cinco sensores
  **inversos** — incluindo o que prova que as abas reais do formulário de produto não são acusadas, e
  o que prova que a própria copy nova passa (a régua foi calibrada duas vezes por isso, e está
  escrito no arquivo).
- **`rotasDeConfiguracoes.test.ts` guarda a FORMA, não só a presença.** O parser caminha a tag com
  profundidade de `{}` e ciência de string em vez de regex — e o comentário registra que a primeira
  escrita, por regex, declarava toda rota auto-fechada porque `element={<X />}` contém um `/>`. O
  sensor da forma aninhada reinjeta a mutação de verdade e exige que o alvo exista antes de mutar.
- **A doutrina das asserções invertidas foi seguida à risca**, três vezes: `focusRoutes.test.ts:29`
  (que dizia o oposto), e os dois casos do remendo de CSS do `TabsList` — que viraram "não há
  `tablist` na tela" e "nenhuma classe da navegação depende da CONTAGEM de seções".
- **A allowlist de `freeShippingSingleOwner.test.ts` mudou de endereço e o guarda pegou os DOIS
  lados**; `originZipNotRead.test.ts` ganhou a asserção positiva ao lado da negativa, que é
  exatamente o que impede o `not.toContain` de ficar verde sobre um arquivo que já não tem
  formulário.
- **A paridade de campo, rótulo, `maxLength` e payload sobreviveu a uma reescrita de 602 linhas** —
  conferido por mim, campo a campo, contra o `HEAD`.

---

## 6. O caminho mais curto para PASS

Nenhum dos sete achados pede redesenho. Por ordem de custo:

1. `CFG-21` — uma asserção em `NotificationsTab.test.tsx`, no caso `ABN-09` que já renderiza a aba
   com o endereço vazio: cobrar `event-warning-link-material_instructions`.
2. `CFG-24` — dois casos, um por campo restante, esvaziando e conferindo `0`.
3. `CFG-26` — uma asserção em `CheckoutSettingsCard.test.tsx` sobre `aviso-order-bump`
   (o card está fora do alcance da varredura da página, e vai continuar fora).
4. `CFG-08` e `CFG-11` — duas asserções na página: o cabeçalho **não** está dentro do painel, e ele
   leva `hidden lg:flex` quando há seção.
5. `CFG-13` — alargar `gradesDe` para coletar todo `div` com o token `grid`, e fazer o sensor chamar
   `gradesDe` em vez do `filter` interno.
6. `CFG-05` — dar `title="Checkout"` ao `FormCard` do `CheckoutSettingsCard` (ou envolvê-lo na
   `SalesSection`), e um caso que o nomeie sem depender do stub.
7. `CFG-14` — passar `switchClassName` (o prop que a `53` criou para isto) nos quatro `ToggleField`
   das seções, decidir sobre os `SaveButton` de 40px, e um caso de token exato.
8. Opcional, mas barato: um caso de presença por campo migrado, fechando o Success Criterion #1.

E, independentemente de tudo acima: **a prova em navegador em 390×844 e 1440 continua devendo** — os
achados 1, 2, 6 e 7 são todos de layout, e nenhum deles teria sobrevivido a alguém abrindo a tela.

---
---

# Rodada 2 — re-verificação

Mesma sessão verificadora, mesmas regras: mutação no arquivo **real**, execução, reversão, e
`diff -q` byte a byte contra um backup tirado **antes** de qualquer edição minha. **Não reutilizei
nenhum número da implementação** — remedi as cinco medidas do zero e re-executei as 8 mutações que
tinham sobrevivido, em vez de aceitar o placar de 12/12 que veio no pedido.

**Diff verificado**: `5104239..working tree`, ainda sem commit. Código: 27 arquivos rastreados,
1460 inserções / 680 remoções (era 26/1175/669 na rodada 1), mais 12 arquivos novos não rastreados.

## 7. As medições da rodada 2

| Medida | Rodada 1 | Rodada 2 (medida por mim) | Δ |
| --- | --- | --- | --- |
| backoffice | 2930 / 164 | **2947 / 164** (exit 0, duas execuções completas) | **+17** |
| store (GATE) | 3516 / 221 | **3516 / 221** (exit 0) | = |
| `tsc` backoffice · store | 0 · 0 | **0 · 0** | = |
| `pnpm lint` | 26 / 6 | **26 / 6** (backoffice 24/4 · store 2/2) | = |

Os +17 do painel batem com o trabalho descrito: 1 caso de posição (`CFG-08`), 1 de `hidden lg:flex`
(`CFG-11`), 1 sensor de grade reescrito, 2 de `CFG-24`, 3 de `CFG-14`, 3 no
`CheckoutSettingsCard.test.tsx`, 2 em `NotificationsTab.test.tsx`, 4 de inventário/carga
(`it.each`), menos as consolidações. `core`, `functions` e `catalog-import` continuam fora do escopo
e sem uma linha tocada.

## 8. Tabela de mutações da rodada 2

**19 injeções · 19 mortes · 0 sobreviventes.** Cada passo `assert`a que o alvo existe antes de
substituir — uma mutação que não acha o alvo **lança**, em vez de virar no-op silencioso e "provar"
que o guarda funciona.

### 8.1 As 8 que sobreviveram na rodada 1, re-executadas

| # | Mutação (arquivo real) | R1 | R2 | Caso que morreu agora |
| --- | --- | --- | --- | --- |
| R1 | `AdminSettingsPage.tsx` — `<PageHeader title="Configurações">` para dentro do painel | sobreviveu | **MORRE** | `CFG-08: e ele está FORA do painel — identidade não é posição` |
| R2 | `NotificationsTab.tsx` — tirar o `action:{to,label}` do aviso de material | sobreviveu | **MORRE** | `ABN-09 > material_instructions mostra o aviso de endereço vazio` |
| R3 | `ShippingMaterialSection.tsx` — `free_shipping_threshold: v ?? 0` → `v` | sobreviveu | **MORRE** | `CFG-24: o MESMO vale para a faixa do frete grátis` |
| R4 | `SalesSection.tsx` — `min_installment_value: v ?? 0` → `v` | sobreviveu | **MORRE** | `CFG-24: e a parcela mínima esvaziada também grava zero` |
| R5 | `CheckoutSettingsCard.tsx` — `InfoBanner` de volta a um `div bg-muted` | sobreviveu (14 arquivos verdes) | **MORRE** | `CFG-26: o aviso usa o InfoBanner compartilhado` |
| R6 | `AdminSettingsPage.tsx` — tirar `hidden lg:flex` do `PageHeader` principal | sobreviveu | **MORRE** | `CFG-11: o cabeçalho da página SOME no celular` |
| R7 | `StoreDataSection.tsx` — `sm:grid-cols-2` → `grid-cols-2` | sobreviveu | **MORRE** | `CFG-13 > nenhuma grade de campo tem colunas ABAIXO de sm` |
| R8 | `StoreDataSection.tsx` — apagar o campo "Imagem Open Graph (URL)" | sobreviveu | **MORRE** | `a seção dados-da-loja mostra todos os campos que ela tinha` |

### 8.2 As 11 novas — contra as próprias correções

| # | Mutação | Resultado | Caso que morreu |
| --- | --- | --- | --- |
| R9 | `CheckoutSettingsCard.tsx` — tirar `title="Checkout"` do `FormCard` | **MORRE** | `tem título e descrição` |
| R10 | `settingsParts.tsx` — `h-11` do `SettingsSaveButton` de volta ao padrão `h-10` | **MORRE** | `o botão de salvar de cada card mede 44px` |
| R11 | `ShippingMaterialSection.tsx` — tirar `switchClassName={SWITCH_TAP_44}` | **MORRE** | `o interruptor tem a área clicável estendida` |
| R12 | `CheckoutSettingsCard.tsx` — idem no toggle do order bump | **MORRE** | `CFG-14: o interruptor tem a área clicável estendida` |
| R13 | `FieldGroup.tsx` — tirar `relative` do **próprio** `SWITCH_TAP_44` (a premissa do pseudo-elemento) | **MORRE** | `o interruptor tem a área clicável estendida` — ver a ressalva abaixo |
| R14 | `SalesSection.tsx` — `sm:grid-cols-2` → `grid-cols-2` (**arquivo diferente** do que usei na R1) | **MORRE** | `CFG-13` |
| R15 | `ShippingMaterialSection.tsx` — `sm:grid-cols-[1fr_100px_160px]` → sem prefixo (**valor arbitrário**) | **MORRE** | `CFG-13` |
| R16 | `ShippingMaterialSection.tsx` — apagar o campo "Complemento" (**seção diferente** da R8) | **MORRE** | `a seção frete-e-material mostra todos os campos que ela tinha` |
| R18 | `SalesSection.tsx` — tirar o `if (isLoading) return <SettingsLoading />` (**seção diferente** da rodada 1) | **MORRE** | `a seção vendas mostra o carregando, não os cards` |
| R19 | `NotificationsTab.tsx` — **inverso**: dar um `action` aos avisos de `owner_*` | **MORRE** | `owner_* mostram os DOIS avisos` |
| P1/P2 | sonda pareada do `SWITCH_TAP_44` contra o guarda da loja | ver §9 | — |

> **Ressalva honesta sobre a R13.** Tirar `relative` de `SWITCH_TAP_44` mata **um** caso, e ele está
> em `AdminSettingsPage.test.tsx`. Os outros 10 arquivos rodados junto — `EventCard.test.tsx`
> incluso — **passaram**: aquele arquivo confere `before:absolute` e não o `relative`. A propriedade
> fica presa (é o que importa), mas quem a prende é o teste de **outra** área. Efeito colateral bom
> da extração: uma asserção passou a proteger os cinco consumidores. Efeito ruim: se um dia a seção
> Notificações sair de Configurações, essa asserção some junto sem ninguém notar.

## 9. Verificação das perguntas (a)–(d) do pedido

### (a) Re-executar as minhas mutações em vez de confiar nos números
Feito: §8.1, as 8 morrem. Baselines remedidas do zero em §7 — e conferem com o que foi reportado
(2947/164 · 3516/221 · 0 · 0 · 26/6).

### (b) O que as correções podem ter introduzido

**`SWITCH_TAP_44` mudando de casa — a extração está limpa, e abriu UM ponto cego latente.**

O que conferi, e está certo:

- **A string é byte a byte a mesma** do `TOGGLE_TOUCH_TARGET` privado que morava em `EventCard.tsx`
  (comparei o `HEAD` com o disco por regex + igualdade de string): o alvo de toque daquele card **não
  mudou um pixel**.
- **`NavRail.test.tsx` não é afetado.** A régua que recusa `TAP_44` no painel lê **um arquivo só**
  (`readFileSync(.../NavRail.tsx)`), então `SWITCH_TAP_44` em `shared/ui` está fora do alcance dela.
  *(Armadilha latente registrada: se algum dia o trilho precisar do alvo estendido, aquele
  `not.toContain('TAP_44')` vai acusar o arquivo certo — `SWITCH_TAP_44` contém a substring.)*
- **`touchTarget.test.ts` varre só `apps/store/src`** — fora de escopo.
- **A suíte da loja inteira continua verde** (3516/221): nenhum falso positivo.

O ponto cego, provado por **sonda pareada** (a mesma linha, trocando só o nome do identificador):

| Sonda injetada em `ShippingMaterialSection.tsx` | `alvoDeToqueNaoRoubaPosicao.test.ts` |
| --- | --- |
| `switchClassName={cn('absolute left-2 top-2', SWITCH_TAP_44)}` | **PASSA** (cego) |
| `switchClassName={cn('absolute left-2 top-2', TAP_44)}` | **REPROVA** |

A segunda é o controle, e ela prova que o guarda **varre sim** `apps/backoffice/src` (o `ESCOPO` dele
é `['apps/store/src', 'apps/backoffice/src', 'packages/ui/src']`). O que ele não sabe é o **nome
novo**: `AUXILIARES` só conhece `TAP_44`/`TAP_ROW`, e `literaisNaOrdem` casa por
`` \b(TAP_44|TAP_ROW)\b `` — como `_` é caractere de palavra, não há fronteira dentro de
`SWITCH_TAP_44` e a régua passa ao largo.

Por que isso importa e por que **não** reprova a feature: `SWITCH_TAP_44` começa com `relative`
**exatamente como os dois auxiliares da loja**, e `cn` é `twMerge` — a colisão com `absolute` é a
mesma, real, e foi ela que custou "toda a home do celular com as setas 200px fora do lugar". Antes da
rodada 2 a constante era **privada de um arquivo**; agora ela é exportada pelo barrel de `shared/ui`,
ao alcance dos ~200 arquivos do painel. A superfície cresceu junto com a correção. **Nenhum ponto de
chamada atual escreve o par ambíguo** (os 5 passam a constante nua para o `switchClassName`), então é
risco latente, não defeito entregue — e o conserto é acrescentar o terceiro auxiliar ao guarda, o que
pede ler a string do disco em vez de importá-la (importar `apps/backoffice` na suíte da loja seria o
segundo dono que aquele guarda existe para impedir).

**`h-11` no botão de salvar: contido.** `SettingsSaveButton` tem **6 pontos de chamada, todos nas
três seções novas** — nenhuma outra tela do painel muda um pixel.

**`FormCard title="Checkout"`: sem colateral.** Nenhum teste do repositório assere a ausência da
palavra; `semAbaEmConfiguracoes` recusa `aba Checkout`, não `Checkout`; as suítes da loja e do painel
seguem verdes. E é a correção certa — o card volta a se nomear, como a `spec.md` pede.

### (c) O colhedor do `CFG-13` ficou mesmo não-circular?

Sim, e não aceitei a palavra: a régua passou a colher `c === 'grid' || /grid-cols-/` e a decidir
depois com `^grid-cols-`. Provei por **três** injeções diferentes, de propósito longe da que eu usara
na rodada 1:

- R7 — o mesmo arquivo de antes (`StoreDataSection`) → **morre**;
- R14 — **outro arquivo** (`SalesSection`), para descartar que a correção fosse calibrada para o meu
  caso → **morre**;
- R15 — **valor arbitrário** (`grid-cols-[1fr_100px_160px]`), a forma que um `^grid-cols-` mal
  escrito deixaria passar → **morre**.

O sensor também deixou de ser circular: ele monta DOM de verdade e chama **as duas** funções na ordem
em que a asserção as chama, em vez de exercitar o `filter` interno sobre um array escrito à mão.

Ponto cego residual, declarado e fora do escopo desta AC: duas colunas feitas com **flex**
(`flex` + `w-1/2`) não são grade e não entram na amostra. Nenhum card as usa hoje.

### (d) `validation.md` atualizado
Este documento, com a rodada 1 preservada inteira.

## 10. O que continua devendo

1. **A prova em navegador, em 390×844 e 1440.** É a pendência mais cara que sobra, e a rodada 1
   mostrou por quê: **4 dos 7 achados eram de layout** (`CFG-08`, `CFG-11`, `CFG-13`, `CFG-14`), e
   nenhum deles teria durado cinco minutos com a tela aberta. Tudo o que esta feature entrega sobre
   largura, coluna, alvo de toque e ausência de rolagem horizontal continua sendo **proxy de classe
   declarada** — jsdom devolve 0 para toda medida. Os 6 itens estão no `design.md`, em *O que só o
   navegador prova*, e nenhum foi feito.
2. **`SWITCH_TAP_44` fora do `alvoDeToqueNaoRoubaPosicao`** (§9-b). Latente; uma linha de conserto.
3. **O voltar do navegador** (`CFG-12`, segunda metade) e o **controle de expandir em
   `/admin/configuracoes`** (`CFG-09`, segunda metade) seguem derivados, sem caso próprio. Os donos
   (`react-router`, `isFocusRoute`) são únicos e testados.
4. **A árvore continua COMPARTILHADA.** Durante a rodada 2 o diffstat de código foi de 1446 para 1460
   inserções — **+14, todas em `apps/backoffice/CLAUDE.md`**, documentação. Nenhum arquivo de fonte ou
   de teste mudou debaixo das minhas medições, e os 16 arquivos que mutei voltaram byte a byte
   (`INTEGRITY_FAIL=0`). Quem for fechar as baselines do `CLAUDE.md` da raiz **meça de novo**: o
   2947/164 vale para a árvore de 2026-09-19 19:00, não para um número copiado daqui.
