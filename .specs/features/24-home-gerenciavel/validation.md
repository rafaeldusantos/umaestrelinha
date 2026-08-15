# 24 · Home gerenciável — Validação

**Spec**: [`spec.md`](./spec.md) · **Design**: [`design.md`](./design.md) (emendas `E1`–`E5`)

| Iteração | Data | HEAD | Verificador | Veredito |
| --- | --- | --- | --- | --- |
| 1 | 2026-08-15 | `185d01b` | sub-agente independente | ❌ **FAIL** — 2 lacunas |
| 2 | 2026-08-15 | `7aa0111` | **outro** sub-agente independente | ✅ **PASS** |

---

# Iteração 2 — re-verificação da correção `7aa0111`

**Data**: 2026-08-15
**Faixa de diff**: `83a3853..7aa0111` (correção: `185d01b..7aa0111`)
**Verifier**: sub-agente novo e independente — não herdou o modelo mental de quem escreveu o código
nem de quem escreveu a correção. Toda evidência abaixo é `file:line` localizado nesta passagem.

**Veredito: ✅ PASS.** As duas lacunas fecharam com asserção própria, as duas correções morrem sob
mutação, a varredura da mesma classe de defeito não achou uma terceira ocorrência, e os quatro
portões seguem nas baselines.

---

## I2.1 · As duas lacunas da iteração 1

### Lacuna 1 — o destino livre de um banner não era validado — ✅ **FECHADA**

**A correção**: `packages/core/src/home/refusals.ts:110-111`, dentro de `destinationRefusal`:

```ts
const caminho = ctaHrefRefusal(vazio(item.href) ? '' : item.href)
if (caminho) return caminho
```

**Onde ela foi feita importa, e está certo.** A correção entrou em `destinationRefusal` e **não** em
`bannerGridRefusal` (`apps/backoffice/src/features/home-composition/model/sectionRefusals.ts:64`),
que segue apenas delegando. Quem **possui** a pergunta "este destino serve?" passa a respondê-la
inteira; consertar no chamador teria deixado a armadilha armada para a quarta superfície. O comentário
de `:96-109` registra o argumento, incluindo o porquê de FK ficar de fora.

**FK continua fora da régua de caminho, de propósito** (`:108-109`): `category_id` e `product_id` são
chave estrangeira e o banco já garante que apontam para linha que existe. Isso não é omissão — é
asserido em `packages/core/src/home/__tests__/refusals.test.ts:167-170`
(`expect(destinationRefusal({ category_id: 'c1' })).toBeNull()`).

**Asserções novas** — `refusals.test.ts:135-171`, cinco casos, todos com a frase inteira:

| `file:line` | Asserção |
| --- | --- |
| `:137-139` | `destinationRefusal({ href: 'https://instagram.com/umaestrelinha' })` → `'O endereço precisa começar com “/”: a loja só aponta para páginas dela.'` |
| `:143-145` | `/assets/banner.png` → `'“/assets” é reservado da infraestrutura e não chega à loja. Escolha outro endereço.'` |
| `:149-151` | `/joias/leite-materno/pingentes` → `'Este endereço não existe na loja: coleção tem no máximo dois níveis.'` |
| `:154-158` | `/leite-materno` → `toBeNull()` — a régua **não** pode ser `ROUTE_SLUGS` no primeiro segmento (`AD-018`) |
| `:162-164` | `expect(destinationRefusal({href})).toBe(ctaHrefRefusal(href))` — **a mesma régua, um dono só**. É esta que impede as duas voltarem a divergir |
| `:167-170` | FK não passa pela régua |

**A entrega até a tela está guardada, por outra via.** O commit não acrescentou teste no
`BannerGridEditor`, e medi o efeito disso: com a linha `:110-111` removida, os 19 testes de
`BannerGridEditor.test.tsx` continuam passando. Não é lacuna — é a régua morando na camada certa. Os
**dois** elos que poderiam quebrar são guardados independentemente:

- `bannerGridRefusal` → `destinationRefusal` → tela: `BannerGridEditor.test.tsx:148-157` prova que a
  frase de `destinationRefusal` chega à tela com o prefixo `1º banner:` e `onSave` não é chamado;
  `:159-168` prova o mesmo para a **última** linha da função (`altRefusal`), o que exercita a
  delegação inteira **depois** da linha nova;
- `destinationRefusal` → `ctaHrefRefusal`: os cinco casos acima.

### Lacuna 2 — a metade desktop de `HOME-26` não tinha asserção — ✅ **FECHADA**

`apps/store/src/widgets/home-banners/ui/__tests__/HomeBannerGrid.test.tsx`, três testes novos, e as
asserções agora são **positivas**:

| `file:line` | Asserção |
| --- | --- |
| `:117-122` | `hero_pair` — `expect(grade.className).toContain('md:flex-row')` |
| `:124-133` | `it.each(['pair','quad'])` — `toContain('md:grid')` **e** `toContain('md:grid-cols-2')` |
| `:135-140` | `single` — `expect(grade.className).not.toContain('md:grid')` (o caso negativo legítimo: uma vaga só não é mosaico) |

As negações de mobile de `:90-104` continuam intactas, e é a convivência das duas que fecha a AC: a
negação garante que o `grid` não vale **antes** do `md`, a positiva garante que ele existe **depois**.

---

## I2.2 · Varredura da mesma classe de defeito

A lacuna 1 é da classe **"regra de `core` aplicada numa superfície e esquecida na irmã"**. Varri as
duas formas em que ela poderia reaparecer.

### (a) Campo livre que não passa pela régua

Levantei todo campo de **caminho livre** da feature — `grep` por `cta_href|link_href|\bhref\b` nos
editores e no `HomeSectionConfig` (`packages/core/src/home/types.ts:68-92`, `:145`). São **três**
superfícies, e as três passam por `ctaHrefRefusal`:

| Superfície | Campo | Caminho até a régua | `file:line` |
| --- | --- | --- | --- |
| hero | `config.cta_href` | `heroRefusal` → `ctaHrefRefusal` | `sectionRefusals.ts:46` |
| grade de banners | `item.href` | `bannerGridRefusal` → `destinationRefusal` → `ctaHrefRefusal` | `sectionRefusals.ts:64` + `refusals.ts:110` |
| 4 seções de texto | `config.link_href` | `textSectionRefusal(type)` → `ctaHrefRefusal` | `sectionRefusals.ts:130` |

**A quarta candidata não é uma:** `collection_feature` tem `cta_label` mas **não** tem `cta_href` —
o destino do CTA é a própria coleção, derivada da FK (`CollectionFeature.tsx:92` usa
`collection.href`, montado por `categoryHref`). `CollectionFeatureEditor.tsx` não tem campo de
endereço (só `title`, `text`, `cta_label`, arte e `alt`). Não há superfície com campo livre fora da
régua.

**As duas outras regras de `core` também foram varridas nas quatro superfícies**:

- `altRefusal` — alcança item (via `destinationRefusal:113`) **e** `config` (via `configRefusal:179`).
  Os quatro editores com arte chamam um dos dois: hero e destaque via `configRefusal`, banner via
  `destinationRefusal`, e o banner também via `configRefusal('banner_grid', …)`.
- `configRefusal` (limite) — os **10** tipos do catálogo chegam a ela: `sectionEditors.tsx:58-68`
  mapeia `refusal` para os 8 tipos com editor, e as 4 de texto compartilham `textSectionRefusal(type)`
  com o tipo por fora. Nenhum tipo com editor ficou sem `refusal`.

**Observação declarada (não é lacuna, é dívida estrutural)**: o `href` de **item** agora tem dono
único, mas o de **`config`** (`cta_href`, `link_href`) continua sendo chamado por cada `*Refusal`.
`configRefusal` não valida caminho. Se um tipo novo ganhar uma chave de endereço em `config` e a
recusa dele esquecer `ctaHrefRefusal`, o defeito volta — e nada acusa. Não é gap de hoje (nenhum tipo
assim existe), mas é a mesma armadilha, uma camada acima. Registrado como lição `L-028`.

### (b) Par mobile/desktop com asserção só de um lado

Levantei toda AC responsiva da spec (`grep "desktop\|390"` em `spec.md`): **`HOME-15`** (:155),
**`HOME-21`** (:183), **`HOME-26`** (:212-213) e **`HOME-40`** (:272).

**`HOME-26` é a única AC com metade desktop explícita** — "WHEN vista em desktop THEN SHALL formar o
mosaico" (`spec.md:213`). As outras três são mobile-only por redação da spec, então não têm metade
faltando. Ainda assim conferi as três, e nenhuma é unilateral por acidente:

| AC | Teste | Cobre |
| --- | --- | --- |
| `HOME-15` | `AdminHomePage.test.tsx:143-167` | os **dois** lados — abas `lg:hidden` e `coluna-previa` `hidden lg:block` |
| `HOME-21` | `HeroBanner.test.tsx:171-198` | mobile-only por AC; a ordem do DOM é a prova, e vale nos dois |
| `HOME-40` | `CollectionFeature.test.tsx:117-124` | `toContain('flex-col')` **e** `toContain('md:flex-row')` — já era bilateral |

Não há segundo par unilateral. A metade desktop de `HOME-26` era a única.

---

## I2.3 · Portões (medidos nesta iteração, exit code de verdade)

| Portão | Comando | Resultado | Baseline | Res. |
| --- | --- | --- | --- | --- |
| Testes | `pnpm test` (exit capturado **sem** `\| tail`) | **exit 0** · **4498 / 251 arquivos** — core 1066/37 · store 1532/113 · backoffice 1345/82 · functions 279/4 · catalog-import 276/15 | 4488/251 na it. 1 | ✅ **+10, zero removido** (core +6, store +4) |
| Tipos | `npx tsc --noEmit -p apps/{store,backoffice}/tsconfig.app.json` + `tools/catalog-import/tsconfig.json` | `STORE=0` · `BACKOFFICE=0` · `IMPORT=0` | 0 · 0 · 0 | ✅ |
| Lint | `pnpm lint` | backoffice **28 erros / 7 warnings**, store **2 / 1** = **30 / 8** | 30/8 | ✅ zero erro novo |
| Dinheiro intacto | `git diff --name-only 83a3853..HEAD -- packages/core/src/payment` | saída **vazia** (`wc -l` = 0) | exigido | ✅ |
| `HOME-04` só ganha asserção | `git diff --numstat 83a3853..HEAD -- apps/store/src/pages/__tests__/homeComposition.test.tsx` | **`302  0`** — 302 adicionadas, **0 removidas**; e o arquivo não foi tocado pela correção (`git log` sobre ele para em `0c9af43`) | 0 removidas | ✅ |

---

## I2.4 · Sensor de discriminação — iteração 2

Sete mutações, todas em estado descartável, revertidas com `git checkout --` e conferidas com
`git status --porcelain` entre cada uma. As cinco primeiras são as pedidas no gate; as duas últimas
saíram da varredura (a), para provar que as superfícies **irmãs** também estão guardadas.

| # | Alvo | Mutação | Testes rodados | Resultado |
| --- | --- | --- | --- | --- |
| M14 | `refusals.ts:110-111` | remove a chamada de `ctaHrefRefusal` dentro de `destinationRefusal` | `refusals.test.ts` | ✅ **morta** — 4 falharam (`:136`, `:142`, `:148`, `:160`) |
| M15 | `refusals.ts:110` | `destinationRefusal` valida **`category_id`/`product_id`** como se fossem caminho | `refusals.test.ts` | ✅ **morta** — 6 falharam, incluindo o teste dedicado `:167` ("FK não passa pela régua") |
| M16 | `HomeBannerGrid.tsx:132` | remove `md:grid-cols-2` | `HomeBannerGrid.test.tsx` | ✅ **morta** — 2 falharam (`pair`, `quad`) |
| M17 | `HomeBannerGrid.tsx:102` | remove `md:flex-row` do arranjo `hero_pair` | `HomeBannerGrid.test.tsx` | ✅ **morta** — exatamente 1, o teste novo `:117` |
| M18 | `HomeBannerGrid.tsx:132` | inverte o caso `single` (`length > 1` → `>= 1`: uma vaga vira grade) | `HomeBannerGrid.test.tsx` | ✅ **morta** — 1, o caso negativo `:135` |
| M19 | `sectionRefusals.ts:130` | `textSectionRefusal` deixa de validar `link_href` (a **superfície irmã**) | `src/features/home-composition` inteiro | ✅ **morta** — 1/152 (`TextSectionEditor.test.tsx`, `HOME-43`) |
| M20 | `sectionRefusals.ts:46` | `heroRefusal` deixa de validar `cta_href` (a **outra irmã**) | `HeroEditor.test.tsx` | ✅ **morta** — 2/16 (`HOME-20`) |

**Profundidade**: P0-full. **Resultado: 7/7 mortas, 0 sobreviventes.** Somadas às 13 da iteração 1:
**20/20**.

**Medição adicional, registrada por honestidade** (não é sobrevivente): com M14 aplicada,
`BannerGridEditor.test.tsx` passa 19/19. É esperado — a régua mora em `core` e é lá que é asserida; a
entrega até a tela está guardada por `:148-157` e `:159-168`, como detalhado em I2.1.

**Estado da árvore ao fim das mutações**: `git status --porcelain` vazio · `git log --oneline -1` =
`7aa0111`.

---

## I2.5 · Traceabilidade atualizada

| Requisito | It. 1 | It. 2 |
| --- | --- | --- |
| `HOME-23` | ❌ Precisa de correção | ✅ **Verificado** — `refusals.ts:110-111` + `refusals.test.ts:135-171` |
| `HOME-26` | ⚠️ metade desktop sem asserção | ✅ **Verificado** — `HomeBannerGrid.test.tsx:117-140` |
| Edge case "destino de banner reservado ou inexistente é recusado usando `core/routes`" | ❌ sem `file:line` | ✅ **Verificado** — `refusals.test.ts:143-145` (`INFRA_SLUGS`) e `:149-151` (inexistente) |
| Demais 42 ACs | ✅ Verificado | ✅ mantido — a correção não tocou nenhuma superfície delas (4 arquivos, **437 inserções, 0 remoções**) |

**Resumo da checagem ancorada: 44/44 ACs com desfecho idêntico ao da spec · 0 defeitos · 0 gaps de
precisão da spec.**

---

## I2.6 · Lições registradas

Autorizado nesta iteração e executado. `python3` não existe nesta máquina; `python` (3.13.14) roda.

| ID | Sinal | Escopo | Lição |
| --- | --- | --- | --- |
| `L-028` | `ac_gap` | `core/validation` | Regra de validação de um campo mora na função que **possui** a pergunta, nunca replicada em cada chamador: replicada por superfície, a próxima nasce sem ela e nada acusa |
| `L-029` | `ac_gap` | `testing/responsive` | AC com duas metades, mobile **e** desktop, precisa de asserção **positiva** nas duas: negação desenhada para tolerar o prefixo `md:` não prova que o `md:` existe |

Ambas nascem `candidate` (o limiar de promoção são 2 features distintas). A iteração 2 em si não
gerou sinal novo — 7/7 mortas, 0 gaps —, então nada mais foi gravado, que é o comportamento correto.

---

## I2.7 · Resumo da iteração 2

**Geral**: ✅ **Pronta.**

**Lacunas da it. 1**: as **duas** fechadas, com asserção própria e discriminação provada por mutação.
**Varredura da mesma classe**: 3 superfícies de caminho livre (todas cobertas), 4 ACs responsivas
(só `HOME-26` tinha metade desktop, agora coberta), 3 regras de `core` rastreadas até os 10 tipos do
catálogo — **nenhuma terceira ocorrência**. Uma dívida estrutural declarada (`href` de `config`
ainda depende do chamador), virada em lição.
**Portões**: 4498 testes / exit 0 · tipos 0/0/0 · lint 30/8 · `core/src/payment` intacto ·
`homeComposition.test.tsx` 302/0.
**Sensor**: 7 mutações, 7 mortas, 0 sobreviventes (20/20 no acumulado da feature).

---
---

# Iteração 1 — relatório original (`185d01b`, ❌ FAIL)

**Data**: 2026-08-15
**Faixa de diff**: `83a3853..185d01b` — 35 commits, 6 fases, 98 arquivos
**Verifier**: sub-agente independente (autor ≠ verificador), cobertura re-derivada do zero por
`evidence-or-zero`

**Veredito: ❌ FAIL** — por **um** defeito de comportamento (edge case declarado da spec não
implementado) e **uma** metade de AC sem asserção. Tudo o mais fecha: 44 ACs rastreadas, 13/13
mutações mortas, os quatro portões verdes nas baselines declaradas.

> As duas lacunas da seção 6 foram corrigidas no commit `7aa0111` e re-verificadas acima. O texto
> abaixo é preservado como está — é o registro de como o defeito foi achado.

---

## 1 · Portões (todos medidos, exit code de verdade)

| Portão | Comando | Resultado | Baseline |
| --- | --- | --- | --- |
| Testes | `pnpm test` | **4488 passados / 251 arquivos · exit 0** — core 1060/37 · store 1528/113 · backoffice 1345/82 · functions 279/4 · catalog-import 276/15 | 4488/251 ✅ |
| Tipos | `npx tsc --noEmit -p apps/{store,backoffice}/tsconfig.app.json` + `tools/catalog-import/tsconfig.json` | **0 · 0 · 0**, exit 0 nos três | 0 ✅ |
| Lint | `pnpm lint` | **30 erros / 8 warnings** — backoffice 28/7, store 2/1 | 30/8 ✅ (zero erro novo) |
| Dinheiro intacto | `git diff --name-only 83a3853..HEAD -- packages/core/src/payment` | **saída vazia** | exigido ✅ |

---

## 2 · Verificações específicas pedidas no gate

### 2.1 · `packages/core/src/payment/**` sem uma linha alterada — ✅

`git diff --name-only 83a3853..HEAD -- packages/core/src/payment` devolve **nada**. A feature não
tocou o código de dinheiro, como a spec exige em Success Criteria.

### 2.2 · O guarda de `HOME-04` só ganhou asserção — ✅

`apps/store/src/pages/__tests__/homeComposition.test.tsx`, por commit:

```
0c9af43  35 adicionadas / 0 removidas
79523f6  21 adicionadas / 0 removidas
e0c5a17 246 adicionadas / 0 removidas
------------------------------------
total   302 adicionadas / 0 REMOVIDAS
```

**Zero linhas removidas em cada um dos três commits** — não só no acumulado da faixa, que para um
arquivo novo seria trivialmente verdadeiro. A regra da emenda `E2` (*"a T1 não perde asserção — só
ganha"*) é verdade medida, não declarada.

E o guarda **discrimina**: a mutação M13 (trocar `eternizado em joia.` por outro texto em
`DEFAULT_HOME_COMPOSITION`) derruba 2 testes dele. Ele assere literais e sequência de hoje:

- sequência dos 8 marcos por `compareDocumentPosition` — `homeComposition.test.tsx:133-147`;
- os cinco literais do hero + `href` do CTA — `:155-166`;
- as duas cores do título (`classList.contains`, não `toContain`, porque `text-estrelinha-ink` é
  prefixo de `text-estrelinha-ink-soft`) — `:180-184`;
- os sete da faixa institucional — `:192-206`;
- chips, o "ver todos" da emenda `E2`, o chão `surface`/`py-12` e a newsletter — `:213-246`;
- os três limites, com fixture **maior que as vagas** (4 artes/3 vagas, 6 raízes/4 fileiras,
  13 temas/12 chips) — `:281-302`.

### 2.3 · As âncoras de contagem têm piso que vale alguma coisa — ✅

| Guarda | Âncora | Piso vale? |
| --- | --- | --- |
| `homeSections.test.ts:139-201` | `SQL.length > 1000`; **10** tipos do `check`; **6** do índice único; **7** linhas da semente; as **3** FK por nome (`['category_id','product_id','section_id']`); **4** policies. E um caso **sintético** que prova que cada parser REPROVA quando deve (`:167-201`) | ✅ — contagens exatas, não `>= n`. E a âncora de escrita: `expect(escrita).toHaveLength(2)` em `:316` impede o `for` de passar por vácuo |
| `catalog.test.ts:179-205` | `arrayContaining` de **8** arquivos nomeados + `FONTES.length >= 9`, que é o tamanho real do módulo (9 `.ts`) | ✅ — o piso frouxo `>= 3` que a emenda apontou foi corrigido; uma varredura que devolvesse metade dos arquivos agora **reprova** |
| `defaults.test.ts:147-155` | cada um dos **5** fontes com `length > 500` **depois** de remover comentários, + `Object.keys(FONTES)` = 5 | ✅ — e a asserção inverteu de sinal (`not.toContain`), o que torna a âncora indispensável: sem ela, string vazia faria **todas** as ausências passarem |
| `homeComposition.test.tsx:258-263` | `FONTE.length > 200` + `contém 'const HomePage'` | ✅ |
| `HomePreview.test.tsx:169-176` | `FONTE.length > 2000`, `CODIGO` contém `const HomePreview` **e** `CODIGO.length > FONTE.length/2` (pega o `replace` que come o arquivo) | ✅ |

### 2.4 · `HOME-06` — nem contagem regressiva, nem prova social — ✅

Duas travas independentes, e as duas **asserem a ausência**, não só a presença:

- `catalog.test.ts:45-61` — `HOME_SECTION_TYPES.some(t => /countdown|regressiv|drop|timer|deadline/i.test(t))` → `false`; idem `/social|proof|review|avaliac|depoiment|testimonial|rating/i`.
- `homeSections.test.ts:230-243` — o mesmo regex aplicado aos **dez tipos lidos do `check` da
  migration do disco** *e* aos do core, com mensagem nominal por tipo.
- `HomeBlockTray.test.tsx:119-124` — a bandeja oferece exatamente 10 blocos e nenhum casa o regex.

Mutação M10 (inserir `'drop_countdown'` no catálogo) derruba **5** testes em `catalog.test.ts` e
**3** em `homeSections.test.ts`.

### 2.5 · Reordenar a Home não altera `categories.sort_order` — ✅

Duas provas independentes:

- **Estrutural**: `useAdminHomeSections.ts` só toca `home_sections` (linhas 96, 127, 141, 160, 168,
  199) e `home_section_items` (218, 224). Nenhum `.from('categories')` no hook de escrita da Home.
- **Comportamental**: `CollectionRowsEditor.test.tsx:277-291` — arrasta duas fileiras, salva, e
  assere `expect(CATALOGO).toEqual(antes)` **e** `expect(CATALOGO.map(c => c.sort_order)).toEqual([1,2,3,4])`
  depois de a ordem da Home ter mudado (`['black','leite','cinzas']`). Mais `:293-304`, que assere
  que nenhum item gravado carrega `sort_order`.

### 2.6 · `HOME-45`..`HOME-47` deferidos de verdade, não meio-implementados — ✅

| Superfície | Estado |
| --- | --- |
| Catálogo | `product_carousel` e `category_grid` **presentes** (o `check` da migration os aceita e `HOME-06` proíbe divergir) — `catalog.test.ts:24-36` |
| `comingSoon` | são **exatamente** os dois — `catalog.test.ts:138-139`; os outros oito **não** são — `:143-153` |
| Renderer da loja | `sectionRenderers.tsx:62-63` → `product_carousel: null`, `category_grid: null`; asserido em `HomeRenderer.test.tsx:83-84` |
| Editor do painel | `sectionEditors.tsx` não tem entrada para nenhum dos dois |
| Bandeja | desabilitados, com `title: 'Este bloco ainda não existe na loja.'` — `HomeBlockTray.test.tsx:59-73` |
| Tela | `HomeRenderer.test.tsx:91-100` — tipo sem renderer é pulado e **não derruba a página** |

Nada meio-implementado: os dois existem só onde `HOME-06` os obriga a existir.

---

## 3 · Checagem ancorada na spec (`HOME-01`..`HOME-44`)

Legenda: ✅ o valor asserido casa com o desfecho que a spec define · ⚠️ metade sem asserção ·
❌ desfecho da spec não produzido pelo código.

### P1 — A Home passa a ser dado, sem mudar de aparência

| AC | Desfecho da spec | `file:line` + asserção | Res. |
| --- | --- | --- | --- |
| HOME-01 | banco contém a lista com tipo, posição, ativo e config | `apps/store/src/shared/lib/__tests__/homeSections.test.ts:142-143` — `expect(SQL).toContain('create table if not exists public.home_sections')` / `…home_section_items`; o parser da semente (`:82`) exige a lista de colunas `(type, position, active, config)`, e `:154` assere `expect(SEMENTE).toHaveLength(7)` | ✅ |
| HOME-02 | desenha **somente** ativas, na ordem gravada | `HomeRenderer.test.tsx:69-78` — `expect(news.compareDocumentPosition(hero) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()` com `position` invertida em relação ao array; `resolve.test.ts:251-258` — `expect(out.map(r => r.section.id)).toEqual(['h','v','n'])`; `homeComposition.test.tsx:265-278` — nenhum widget de seção importado pela página, e `expect(FONTE).toContain('useHomeSections')` | ✅ |
| HOME-03 | inativa não produz nada — nem moldura, nem espaçamento, nem título | `HomeRenderer.test.tsx:113-120` — `expect(raiz.childElementCount).toBe(0)`; `:122-132` — desligar a do meio não desloca as vizinhas; `resolve.test.ts:58-63` — `hiddenReason` = `'Desligada: não aparece na loja.'` | ✅ |
| HOME-04 | sequência e literais **exatamente** os de hoje | `homeComposition.test.tsx:147` — `expect(naOrdemDoDocumento(marcos)).toEqual(marcos.map(([n]) => n))` sobre os 8 marcos; `:155-166`, `:192-206`, `:213-246` (literais); `:281-302` (limites 3/4/12); `homeSections.test.ts:259-272` — semente × `DEFAULT_HOME_COMPOSITION` **chave a chave** (`expect(doSql.config).toEqual(doCore.config)`) | ✅ |
| HOME-05 | anônimo lê só ativas; sem `admin` a escrita é recusada | `homeSections.test.ts:298-302` — `expect(leitura?.corpo…).toContain('using (active = true)')`; `:304-312` — item segue a mãe (`s.active = true`); `:314-328` — as **2** policies de escrita têm `has_role` no `using` **e** no `with check`; `:330-337` — nenhuma alcança `anon` e todas são `to authenticated`; `:339-342` — `expect(LIMPO).not.toMatch(/grant[\s\S]{0,120}?\banon\b/i)` | ✅ |
| HOME-06 | TS × migration idênticos, com âncora; sem contagem regressiva nem prova social | `homeSections.test.ts:209-211` — `expect([...TIPOS_DO_CHECK].sort()).toEqual([...HOME_SECTION_TYPES].sort())`; `:224-228` — índice único × `UNIQUE_SECTION_TYPES`; `:230-243` e `catalog.test.ts:45-61` — as duas ausências | ✅ |
| HOME-07 | leitura falha ⇒ composição semeada, nunca branco | `useHomeSections.test.tsx:149-156` — erro devolve `tiposDoPiso` e `toHaveLength(7)`; `:158-164` — lista vazia idem; `:166-176` — o piso está na **primeira pintura**, antes de qualquer resposta; `:178-185` — é **cópia** (`DEFAULT_HOME_COMPOSITION[0].position` segue 1 depois de mutar o retorno) | ✅ |

### P1 — `/admin/home`

| AC | Desfecho da spec | `file:line` + asserção | Res. |
| --- | --- | --- | --- |
| HOME-08 | lista todas com tipo, resumo e estado; hero sem desligar nem remover | `HomeSectionList.test.tsx:64-76` — os 7 rótulos na ordem; `:120-122` — `expect(within(linha('hero')).queryByRole('switch')).toBeNull()`; `:125-131` — "Sempre no ar" + cadeado rotulado; `homeSections.test.ts:378-394` — a função `guard_hero_home_section` cobre `tg_op='DELETE'` **e** `new.active = false`, com **duas** `raise exception`, e o trigger é `before update or delete` | ✅ |
| HOME-09 | linha diz que não aparece **e por quê**; ativar é permitido | `HomeSectionList.test.tsx:140-148` — o texto exato dos dois motivos; `:150-159` — `expect(chave).not.toBeDisabled()` e `onToggle('trending_tags', true)`; `:161-168` — desligada **não** ganha aviso; `resolve.test.ts:163-183` — motivo específico por tipo | ✅ |
| HOME-10 | seção nova nasce inativa | `useAdminHomeSections.test.ts:167-179` — `expect(criacao.insert).toEqual({ type:'collection_feature', position:4, active:false, config:{} })` (igualdade, não `toMatchObject`); migration `active boolean not null default false`; `HomeBlockTray.test.tsx:126-129` | ✅ |
| HOME-11 | posições **absolutas**, **só** as alteradas, idempotente | `order.test.ts:64-70` — `expect(reorderSections(lista,'d','b')).toEqual([{d,2},{b,3},{c,4}])` (o `a` fica de fora); `:86-95` — aplicar duas vezes dá o mesmo estado; `:97-99` — mesma chamada, mesmo conjunto; `useAdminHomeSections.test.ts:239-249` — dois `upsert` idênticos; `HomeSectionList.test.tsx:216-228` — o payload completo do arraste | ✅ |
| HOME-12 | desempate estável, igual em dois carregamentos | `order.test.ts:38-41` — `expect(orderSections([z:5,a:5]).map(id)).toEqual(['a','z'])`; `:43-52` — lista embaralhada e sua reversa dão `['a','d','m','t']` nas duas; `useAdminHomeSections.test.ts:152-163` — `['mm','aa','zz']` com empate em `position: 2` | ✅ |
| HOME-13 | prévia com ordem real, textos/imagens reais e selo nas ausentes | `HomePreview.test.tsx:62-78` — os 7 `data-testid` na ordem, com a faixa entre fileiras e chips; `:80-94` — textos reais do hero, faixa e newsletter; `:113-121` — bloco `previa-fora-newsletter` com selo **e** motivo; `:123-128` — fonte vazia idem | ✅ |
| HOME-14 | diz o que não foi salvo e preserva o preenchido | `AdminHomePage.test.tsx:302-312` — `expect(screen.getByTestId('editor-recusa')).toHaveTextContent('permission denied')` **e** o editor continua montado (`queryByText('Seções da Home')` é `null`); `:194-205` — toast `variant:'destructive'` sem remontar a tela; `:118-127` — falha de **leitura** é superfície com "Tentar de novo", nunca lista vazia; `useAdminHomeSections.test.ts:341-349` — a mensagem do banco volta tipada | ✅ |
| HOME-15 | 390px operável, alvo de 44px | `AdminHomePage.test.tsx:143-167` — abas `lg:hidden`, `coluna-previa` com `hidden lg:block`, alternância exclusiva, `min-h-11` e `aria-pressed`; `HomeSectionList.test.tsx:238-247` — **dois** `.h-11.w-11` por linha (interruptor e abrir são alvos distintos) + `.min-h-11` no corpo | ✅ |

### P1 — Hero editável

| AC | Desfecho da spec | `file:line` + asserção | Res. |
| --- | --- | --- | --- |
| HOME-16 | seis campos editáveis; título em duas cores | `HeroEditor.test.tsx:79-97` — `expect(configSalvo()).toMatchObject({eyebrow, title_line1, title_line2, paragraph, cta_label})`; `:105-124` — `cta_href` por seletor e por campo livre; `HeroBanner.test.tsx:108-123` — `linha1.classList.contains('text-estrelinha-ink') === true`, `linha2.classList.contains('text-estrelinha-primary') === true` **e** `linha2.classList.contains('text-estrelinha-ink') === false` | ✅ |
| HOME-17 | sem foto ⇒ arte da marca | `HeroBanner.test.tsx:142-147` — `getByRole('img',{name:'Uma Estrelinha'})` presente e a foto ausente; `HeroEditor.test.tsx:199-204` — a tela diz "Sem foto, entra a arte da marca" e não oferece "Remover foto" | ✅ |
| HOME-18 | foto substitui a arte; `alt` obrigatório para salvar | `HeroBanner.test.tsx:149-155` — foto presente **e** `queryByRole('img',{name:'Uma Estrelinha'})` nulo; `HeroEditor.test.tsx:159-168` — recusa com o texto exato e `expect(onSave).not.toHaveBeenCalled()`; `:170-177` — `alt` só com espaço conta como vazio; `:191-195` — sem foto, não cobra | ✅ |
| HOME-19 | remover a foto volta à arte, sem buraco | `HeroEditor.test.tsx:233-244` — `expect(configSalvo()).toMatchObject({image_url:null, image_alt:null})`; `HeroBanner.test.tsx:157-168` — a vaga `.aspect-[350/260]` existe nos **dois** estados | ✅ |
| HOME-20 | destino que a loja não serve é recusado, dizendo o problema | `HeroEditor.test.tsx:128-137` — `/assets/banner.png` recusado nominalmente, `onSave` não chamado; `:139-148` — URL externa; `refusals.test.ts:154-161` — varre **todos** os `INFRA_SLUGS` com `expect(INFRA_SLUGS.length).toBeGreaterThan(0)` como âncora; `:134-139` — a coleção na raiz **passa** (a régua não pode ser `ROUTE_SLUGS`) | ✅ |
| HOME-21 | em 390px respeita a proporção e não empurra o CTA | `HeroBanner.test.tsx:172-185` — `expect(cta.compareDocumentPosition(foto) & DOCUMENT_POSITION_FOLLOWING).toBeTruthy()` (o CTA vem antes no DOM, então empilhar deixa a foto abaixo); `:187-198` — vaga com `overflow-hidden` e `img` com `object-cover` | ✅ |

### P1 — Grade de banners com banner livre

| AC | Desfecho da spec | `file:line` + asserção | Res. |
| --- | --- | --- | --- |
| HOME-22 | 1 a 4 banners; imagem, `alt` e destino exigidos para salvar | `layout.test.ts:21-43` — 1/2/3/4 vagas e `expect(maior).toBe(4)`; `HomeBannerGrid.test.tsx:39-48` — cada arranjo desenha o número certo com 4 disponíveis; `BannerGridEditor.test.tsx:137-146` (arte), `:148-157` (destino), `:159-168` (`alt` com espaço), com `expect(onSave).not.toHaveBeenCalled()` nos três; `:170-176` — a recusa nomeia **qual** banner | ✅ |
| HOME-23 | coleção, produto ou caminho da própria loja; **exatamente um** gravado | Metade gravada: `BannerGridEditor.test.tsx:197-211` — `toMatchObject({category_id:'cinzas', product_id:null, href:null, label_snapshot:'Eternize as cinzas'})`; `:213-226` (produto); `:228-243` (caminho); `refusals.test.ts:81-85` — dois destinos ⇒ recusa. **Metade "da própria loja" NÃO enforced** — ver Lacuna 1 | ❌ |
| HOME-24 | destino apagado ⇒ some da loja **e** o painel diz que se perdeu | `homeSections.test.ts:354-359` — `category_id`/`product_id` são `set null`, **nunca** cascade; `BannerGridEditor.test.tsx:247-254` — `'“Prata 925” foi apagado.'` + "a arte fica guardada aqui"; `:256-260` — a arte segue na tela; `:262-265` — "nunca teve destino" ≠ "perdeu"; `HomeRenderer.test.tsx:238-244` — produto sem slug ⇒ **zero `<section>`**; `useHomeSections.test.tsx:210-226` — `product: null` com `product_id` intacto | ✅ |
| HOME-25 | sem banner próprio ⇒ derivação atual, sem repetir arte de fileira | `HomeRenderer.test.tsx:181-202` — a grade sai com `['/campanha']` só, medida **dentro da `<section>`** da grade; `useAdminResolvedHome.test.ts:76-79` — mesmo resultado no painel; `BannerGridEditor.test.tsx:184-193` — grade sem banner próprio **salva** com `items: []` | ✅ |
| HOME-26 | 390px empilha em coluna, largura cheia, na ordem; desktop forma o mosaico | Mobile: `HomeBannerGrid.test.tsx:90-104` — em cada um dos 4 arranjos o contêiner tem `flex-col`, **não** `grid` nem `flex-row` sem prefixo, e todo link tem `w-full`; `:106-114` — a ordem é a da fileira. Desktop: **nenhuma asserção** — ver Lacuna 2 | ⚠️ |
| HOME-27 | avisa e mostra px recomendado; nunca recorta em silêncio | `refusals.test.ts:224-228` — `'Esta arte é 1:1 e a vaga é 2,42:1 — o tamanho recomendado é 1176 × 486 px.'`; `:220-222` — tolerância de exportação; `:235-241` — a prova de "não bloqueia": a recusa não conhece proporção nenhuma; `uploadHomeImage.test.ts:142-155` — mede o **original**, com `sizeQueue` de duas leituras (é o discriminador da ordem); `BannerGridEditor.test.tsx:269-294` — px por vaga e "avisa E sobe assim mesmo" | ✅ |
| HOME-28 | upload falho não deixa seção pela metade | `uploadHomeImage.test.ts:167-192` — tipo, tamanho e erro do Storage devolvem `url: null` (e nos dois primeiros o `createObjectURL`/`upload` **nem são chamados**); `HeroEditor.test.tsx:216-231`, `BannerGridEditor.test.tsx:296-310`, `CollectionFeatureEditor.test.tsx:196-210` — nada entra no rascunho | ✅ |
| HOME-29 | imagem quebrada mantém a proporção; nada abaixo desloca | `HomeBannerGrid.test.tsx:118-124` — `aspect-[588/510]` e `bg-estrelinha-ground-deep` no **`<a>`**, não na `<img>`; `:126-131` — banner sem arte não é desenhado e a vaga **não** é preenchida por outro; `:141-145` — grade vazia some inteira | ✅ |
| HOME-30 | apagar a seção apaga os banners dela | `homeSections.test.ts:350-352` — `expect(FKS.get('section_id')).toBe('cascade')`; `:361-366` — o CHECK é `<= 1` e **não** `= 1`; `:368-370` — `label_snapshot` existe | ✅ |

### P2 — Override de curadoria

| AC | Desfecho da spec | `file:line` + asserção | Res. |
| --- | --- | --- | --- |
| HOME-31 | sem curadoria ⇒ derivação; item novo entra sozinho | `resolve.test.ts:81-89` — `items` = derivados, `every(curated) === false`; `CollectionRowsEditor.test.tsx:95-101` — abre em Automático, sem lista; `:103-112` — a tela diz "Coleção nova entra sozinha"; `defaults.test.ts:103-109` — **nenhuma** seção semeada nasce com curadoria | ✅ |
| HOME-32 | lista dela, na ordem dela, ignorando a derivação | `resolve.test.ts:91-99` — `['i1','i2']` por `position`, `every(curated) === true`, com `derive` devolvendo outra coisa; `CollectionRowsEditor.test.tsx:150-159` — arrastar grava `['cinzas','leite','black']`; `HomeCollections.test.tsx:46-49` — desenha na ordem recebida | ✅ |
| HOME-33 | voltar ao automático **descarta** a curadoria | `CollectionRowsEditor.test.tsx:185-196` — `expect(gravado().items).toEqual([])` **e** `expect(gravado().config).toEqual(fileirasBase.config)` (nenhuma flag); `:207-215` — o rádio faz o mesmo; `useAdminHomeSections.test.ts:307-316` — lista vazia é **só** o `delete`, filtrado por `section_id` | ✅ |
| HOME-34 | pula o item sem completar a vaga; painel diz quantos saíram | `resolve.test.ts:101-113` — `['viva']` com `derive` devolvendo candidato; `:117-129` — `droppedCount === 2` e `renders === true`; `CollectionRowsEditor.test.tsx:219-223` — "1 das 3 saiu do ar"; `:234-241` — "A vaga que sobra fica vazia" + "a Home mostra 2"; `HomeCollections.test.tsx:52-58` | ✅ |
| HOME-35 | `categories.sort_order` intacta; menu não muda | `CollectionRowsEditor.test.tsx:277-291` — `expect(CATALOGO).toEqual(antes)` e `sort_order` = `[1,2,3,4]` depois de a ordem da Home mudar; `:293-304` — nenhum item gravado carrega `sort_order`; `:269-275` — a tela afirma isso | ✅ |
| HOME-36 | todos fora do ar ⇒ não renderiza, e a linha diz | `resolve.test.ts:131-140` — `renders === false` + `'Não vai aparecer: os 2 itens escolhidos saíram do ar.'`; `:142-147` — singular; `:149-157` — o motivo **não** se confunde com o de fonte vazia; `CollectionRowsEditor.test.tsx:252-258` | ✅ |

### P2 — Destaque em coleção

| AC | Desfecho da spec | `file:line` + asserção | Res. |
| --- | --- | --- | --- |
| HOME-37 | coleção, imagem, `alt`, texto e CTA; coleção obrigatória | `CollectionFeatureEditor.test.tsx:95-104` — recusa nominal + `onSave` não chamado; `:106-116` — grava FK **e** `label_snapshot`; `:129-138` — é **um** item, não lista; `:142-156` — os três textos no `config`; `:172-183`/`:185-194` — a arte e o `alt` | ✅ |
| HOME-38 | vazios caem no nome e na descrição da coleção | `CollectionFeature.test.tsx:36-41` — heading = nome da coleção, texto = descrição; `:43-49` — os do painel vencem; `:51-55` — título só com espaço cai no nome; `:57-61` — sem descrição não desenha `<p>` vazio | ✅ |
| HOME-39 | coleção inativa/apagada ⇒ não renderiza; painel avisa | `CollectionFeature.test.tsx:181-187` — despublicada: `container.firstElementChild.childElementCount === 0`; `:189-195` — apagada; `:197-202` — sem item; `CollectionFeatureEditor.test.tsx:222-231`/`:233-239` — o painel **nomeia** e diz a consequência; `:241-249` — avisa mas **não** recusa | ✅ |
| HOME-40 | 390px empilha; CTA mantém 44px | `CollectionFeature.test.tsx:118-124` — `flex-col` + `md:flex-row`; `:102-106` — `expect(cta).toHaveClass('min-h-11')` | ✅ |

### P2 — Textos e limites

| AC | Desfecho da spec | `file:line` + asserção | Res. |
| --- | --- | --- | --- |
| HOME-41 | título, subtítulo e o "ver todos" editáveis | `TextSectionEditor.test.tsx:106-121` — `toMatchObject({title, subtitle, link_label, link_href})`; `TrendingTags.test.tsx:118-133` — o widget desenha o que a prop traz; `NewsletterBanner.test.tsx` (bloco `HOME-41`) idem | ✅ |
| HOME-42 | novo limite respeitado; fora da faixa recusado na tela | `resolve.test.ts:260-267` (derivação) e `:269-277` (curadoria) — `.slice` para `['a','b']`; `TrendingTags.test.tsx` — `limit: 2` ⇒ 2 links; `TextSectionEditor.test.tsx:143-153` (99) e `:155-163` (0) — recusa `'“Chips de tema” aceita de 1 a 24 itens.'` com `onSave` não chamado; `:165-173` — vazio vira `null`, nunca `0`; `CollectionRowsEditor.test.tsx:319-331` — 9 recusado na faixa 1–8; `refusals.test.ts:174-200` | ✅ |
| HOME-43 | sobretítulo, título, parágrafo, assinatura e link de escape | `TextSectionEditor.test.tsx:60-80` — os cinco no `config`; `:82-91` — rótulo e destino; `:93-102` — destino inválido recusado; `BrandStatement.test.tsx:26-45` — o widget desenha o que a prop traz | ✅ |
| HOME-44 | os números continuam saindo de `store_settings` | `TextSectionEditor.test.tsx:200-209` — **zero** `textbox` e **zero** `spinbutton` no editor da faixa; `:211-217` — a tela aponta `/admin/configuracoes`; `HomePreview.test.tsx:105-109` — `expect(vantagens.textContent).not.toMatch(/\d+\s*×|R\$|%/)`; `defaults.test.ts:141-143` — `Object.keys(trust_bar.config)` tem comprimento **0** | ✅ |

**Resumo**: 42 ✅ · 1 ❌ (`HOME-23`) · 1 ⚠️ (`HOME-26`) — **0 gaps de precisão da spec**. A spec desta
feature define desfecho preciso em toda AC que o pede, e as asserções encontradas casam com o texto
dela (frases inteiras, números exatos, `toEqual` onde o defeito seria um campo **a mais**).

---

## 4 · Edge cases da spec

| Edge case | Evidência | Res. |
| --- | --- | --- |
| Home com zero seções ativas é impossível | `homeSections.test.ts:378-394` — trigger `before update or delete`, duas `raise exception`; `HomeSectionList.test.tsx:120-131` — sem interruptor | ✅ |
| 31ª seção recusada dizendo o teto | `refusals.test.ts:53-57` — a frase exata; `HomeBlockTray.test.tsx:100-108` — bloco desabilitado com o `title` exato; `:110-115` — com 29 ainda dá | ✅ |
| Tipo único já presente não é oferecido de novo | `HomeBlockTray.test.tsx:25-33` — desabilitado com o motivo; `:35-39` — clicar não acrescenta; `homeSections.test.ts:224-228` — o índice único parcial garante contra escrita direta | ✅ |
| Catálogo vazio ⇒ seções de fonte não renderizam; painel diz | `resolve.test.ts:163-183`; `:185-202` — as 4 de `config` continuam renderizando (com `toHaveLength(4)` como âncora anti-vácuo); `useAdminResolvedHome.test.ts:63-67` | ✅ |
| `alt` só com espaço é recusado como vazio | `refusals.test.ts:111-115`; `HeroEditor.test.tsx:170-177`; `BannerGridEditor.test.tsx:159-168` | ✅ |
| Duas admins na mesma seção: última vence **naquela seção** | `useAdminHomeSections.test.ts:331-339` — `update` é `{ config }` e o filtro é `eq('id', …)`; `:191-201` — ligar/desligar manda `{active}` **e nada mais**, com `toEqual` (não `toMatchObject`), que é o que pega o campo a mais | ✅ |
| Duas admins reordenando ⇒ ordem determinística | `order.test.ts:43-52`, `:86-95` | ✅ |
| **Destino de banner reservado ou inexistente é recusado, usando `core/routes`** | **nenhum `file:line`** — e o probe mostra que o código **aceita** | ❌ |

---

## 5 · Sensor de discriminação

13 mutações de comportamento, todas aplicadas em estado descartável e revertidas com
`git checkout --` (árvore limpa e `HEAD = 185d01b` conferidos entre cada uma).

| # | Arquivo | Mutação | Testes rodados | Resultado |
| --- | --- | --- | --- | --- |
| 1 | `packages/core/src/home/resolve.ts:140` | `if (curados.length > 0)` → `=== 0` (precedência curadoria ⇄ derivação invertida) | `resolve.test.ts` | ✅ **morta** — 8 falharam |
| 2 | `packages/core/src/home/order.ts:17` | remove o desempate por `id` do comparador | `order.test.ts` | ✅ **morta** |
| 3 | `packages/core/src/home/order.ts:63-66` | `reorderSections` devolve **todas** as linhas (`.filter(() => true)`) | `order.test.ts` | ✅ **morta** |
| 4 | migration | `category_id … on delete set null` → `cascade` | `homeSections.test.ts` | ✅ **morta** — 1/54 |
| 5 | `HomeRenderer.tsx:45` | seção inativa renderiza `<div className="py-10"/>` em vez de `null` | `HomeRenderer.test.tsx` | ✅ **morta** — 1/15 |
| 6 | `useHomeSections.ts:86` | erro/vazio devolve `[]` em vez do piso semeado | `useHomeSections.test.tsx` | ✅ **morta** — 3/11 |
| 7 | `refusals.ts:33` | `alt` deixa de ser obrigatório | `refusals.test.ts`; `HeroEditor` + `BannerGridEditor` | ✅ **morta** — 2/37 no core **e** 4/35 nas telas |
| 8 | `CollectionRowsEditor.tsx:131-134` | "voltar ao automático" grava `config.curation_mode='auto'` em vez de apagar os itens | `CollectionRowsEditor.test.tsx` | ✅ **morta** — 2/22 |
| 9 | `layout.ts:34-38` | `hero_pair` passa a ter 4 vagas | `layout.test.ts`; `homeComposition` + `HomeBannerGrid` | ✅ **morta** — 3/16 no core **e** 5/31 na loja |
| 10 | `catalog.ts` | acrescenta `'drop_countdown'` ao catálogo | `catalog.test.ts`; `homeSections.test.ts` | ✅ **morta** — 5/18 **e** 3/55 |
| 11 | migration | policy pública `using (active = true)` → `using (true)` | `homeSections.test.ts` | ✅ **morta** — 1/54 |
| 12 | migration | texto da semente do hero envelhece (`Joias afetivas artesanais` → outro) | `homeSections.test.ts` | ✅ **morta** — 1/54 |
| 13 | `defaults.ts` | literal do hero muda (`eternizado em joia.` → outro) | `homeComposition.test.tsx` | ✅ **morta** — 2/14 |

**Profundidade**: P0-full (≥ 5 mutações, cobrindo domínio puro, migration, leitura, renderização e
editor). **Resultado: 13/13 mortas, 0 sobreviventes.**

**Probe adicional** (arquivo temporário, criado e removido — árvore final limpa): chamando
`bannerGridRefusal` direto com um item completo cujo `href` é `https://instagram.com/x` e depois
`/assets/banner.png`, a recusa devolveu **`null` nos dois casos**, enquanto `heroRefusal` devolveu a
mensagem correta para os mesmos endereços. É a Lacuna 1, medida.

**Estado da árvore ao fim**: `git status --porcelain` vazio · `git log --oneline -1` = `185d01b`.

---

## 6 · Lacunas ranqueadas

### Lacuna 1 — o destino livre de um **banner** não é validado (Major)

- **AC**: `HOME-23` ("um caminho da **própria loja**") + o edge case declarado da spec
  ("WHEN o destino de um banner é um caminho reservado ou inexistente THEN a tela SHALL recusar,
  usando `@estrelinha/core/routes` como fonte").
- **Onde**: `apps/backoffice/src/features/home-composition/model/sectionRefusals.ts:55-68` —
  `bannerGridRefusal` chama `destinationRefusal(item)` (que só decide **quantos** destinos há e cobra
  o `alt`) e **nunca** `ctaHrefRefusal(item.href)`. O campo livre é escrito em
  `BannerGridEditor.tsx:131-134` (`aria-label="Endereço do banner"`) sem validação alguma.
- **Contraste que prova a intenção**: `heroRefusal` (`:45-46`) e `textSectionRefusal` (`:127-130`)
  **fazem** a chamada. A grade é a única das três superfícies com destino livre que ficou de fora.
- **Medido**: `bannerGridRefusal({}, [{href:'https://instagram.com/x', image_url:'a.webp', alt:'Campanha'}])`
  → `null`; com `/assets/banner.png` → `null`. `heroRefusal` recusa os dois.
- **Consequência real**: a dona grava um banner apontando para fora da loja (o `<Link to>` do
  react-router trataria `https://…` como caminho relativo e produziria 404) ou para `/assets/…`, que
  a plataforma serve como arquivo e o React Router nunca alcança. Nenhum erro em lugar nenhum — é a
  mesma classe de falha que `HOME-20` existe para fechar, na porta ao lado.
- **Sem cobertura**: `BannerGridEditor.test.tsx:228-243` só exercita `/como-enviar`, que é válido.
- **Correção**: uma linha em `bannerGridRefusal` —
  `const rota = ctaHrefRefusal(item.href ?? ''); if (rota) return \`${ordinal(i+1)} banner: ${rota}\``
  — mais um teste de recusa com `/assets/…` e outro com URL externa.

### Lacuna 2 — a metade **desktop** de `HOME-26` não tem asserção (Minor)

- **AC**: `HOME-26` — "WHEN vista em desktop THEN SHALL formar o mosaico".
- **Onde**: `apps/store/src/widgets/home-banners/ui/__tests__/HomeBannerGrid.test.tsx:90-104`. A
  asserção é toda de negação para o mobile: `not.toMatch(/(^|\s)grid(\s|$)/)` e
  `not.toMatch(/(^|\s)flex-row(\s|$)/)` — desenhadas de propósito para **permitir** `md:grid` e
  `md:flex-row`, mas sem nenhuma asserção positiva de que eles estão lá.
- **Consequência**: remover `md:flex-row` de `HomeBannerGrid.tsx:102` ou
  `md:grid md:grid-cols-2` de `:132` deixaria a grade em coluna única **também no desktop** e a suíte
  seguiria verde. A metade que quebra é a de menor tráfego (~10%), o que a torna menos provável de
  ser vista — e por isso mais barata de guardar por teste.
- **Correção**: acrescentar ao mesmo `it.each` `expect(grade.className).toMatch(/md:(grid|flex-row)/)`
  e, para `hero_pair`, `toContain('md:flex-row')`.

---

## 7 · Qualidade de código

| Princípio | Status | Nota |
| --- | --- | --- |
| Nada além do pedido | ✅ | Os P3 entram só no catálogo, porque `HOME-06` obriga; sem renderer, sem editor |
| Sem abstração para uso único | ✅ | O que subiu para `core/home` subiu porque **duas** superfícies leem (`layoutSlots`, `sectionCapRefusal`, `sectionMeta().comingSoon` — emenda `E3`), e cada arquivo diz qual é o segundo leitor |
| Só os arquivos necessários | ✅ | `packages/ui/src/styles.css` é o único fora do escopo aparente, e é decisão registrada do usuário no `design.md` (o token `--input`, com `--border` intacto) |
| Segue os padrões do projeto | ✅ | Recusas em `string \| null` (`strictNullChecks: false`); guarda que lê migration do disco no molde de `materialTransitions.test.ts`; `navItems.test.ts` atualizado e a ordem das rotas do `App.tsx` acompanha |
| Asserções não rasas | ✅ | Frases inteiras em vez de `toContain('não')`; `toEqual` onde o defeito seria um campo a mais (`useAdminHomeSections.test.ts:199`); `classList.contains` em vez de substring por causa do prefixo `ink`/`ink-soft` |
| Todo teste mapeia a um requisito | ✅ | Toda suíte nova cita AC no cabeçalho; as três de identidade herdadas (`IDN-04`, `COP-07`) continuam válidas e ganharam o bloco `HOME-*` |
| Desfecho asserido = desfecho da spec | ✅ (42/44) | As duas exceções estão em Lacunas |
| `SPEC_DEVIATION` resolvidos | ✅ | Os três da Fase 3 viraram emendas `E4` (a consulta não ordena) e `E5` (slug embutido) e estão **fechados no código**: `useHomeSections.ts:74-81` sem `.order`, e `:81` com `product:products(slug)` |

---

## 8 · Traceabilidade

| Requisito | Status |
| --- | --- |
| `HOME-01`, `HOME-02`, `HOME-04`..`HOME-22`, `HOME-24`, `HOME-25`, `HOME-27`..`HOME-44` | ✅ Verificado |
| `HOME-03` | ✅ Verificado |
| `HOME-23` | ❌ Precisa de correção — metade "caminho da própria loja" |
| `HOME-26` | ⚠️ Verificado no mobile; desktop sem asserção |
| `HOME-45`..`HOME-47` | ⏭️ Deferido de propósito, e conferido que **não** está meio-implementado |

---

## 9 · Resumo

**Geral**: ⚠️ Uma correção de uma linha separa esta feature de PASS.

**Checagem ancorada**: 42/44 ACs com desfecho idêntico ao da spec · 1 defeito · 1 metade sem
asserção · **0 gaps de precisão da spec**
**Portões**: 4488 testes passados / 0 falhados · tipos 0/0/0 · lint 30/8 (baseline) ·
`core/src/payment` intacto
**Sensor**: 13 mutações, 13 mortas, 0 sobreviventes

**O que funciona**: a composição virou dado de verdade — a `HomePage` tem 7 linhas e não conhece
seção nenhuma, provado por leitura do disco. `HOME-04` está preso pelo DOM renderizado, literal a
literal, num guarda que só ganhou asserção nos três commits que o tocaram. A regra de leitura tem um
dono (`resolveHomeSections`) lido pelas duas pontas, e o painel deriva pelas **mesmas** funções que a
loja (T35). As três decisões estruturais do design chegaram inteiras ao banco: `set null` no destino
e `cascade` só na seção, CHECK `<= 1`, e `interlude_after` na própria faixa. As emendas `E1`–`E5`
estão todas fechadas no código, não só no documento.

**Próximo passo**: as duas correções da seção 6, nesta ordem. Depois delas a re-verificação é local —
`refusals`/`sectionRefusals` e `HomeBannerGrid.test.tsx`.
