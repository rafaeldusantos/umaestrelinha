# Gaveta de material — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.**

**Desvio declarado do protocolo da Skill, por ordem do `CLAUDE.md` da raiz:** não se faz um commit
por task. A implementação inteira é concluída e os commits completos saem de uma vez no fim
(`BL-012`, decisão do usuário em 2026-08-15). O custo é conhecido: perde-se a correspondência 1:1
entre commit e "done when".

---

**Design**: `.specs/features/44-gaveta-de-material/design.md`
**Status**: Approved

**Baseline de entrada — medida em 2026-09-11, exit code capturado fora de pipe:**

| Workspace | Testes / arquivos |
| --- | --- |
| **store** | **2747 / 175** |
| backoffice · core · functions · catalog-import | não tocados por esta feature |

Lint de entrada: 27 erros / 5 warnings. Tipos: 0.

---

## Test Coverage Matrix

> Gerada do código, das guidelines do projeto e da spec. Guidelines encontradas: `CLAUDE.md` (raiz),
> `apps/store/CLAUDE.md`, `apps/store/vitest.config.ts`. **Nenhum limite de cobertura configurado** —
> o projeto governa por *guardas que leem o fonte do disco*, com âncora de contagem e sensor, e é
> essa a régua aplicada aqui.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Conteúdo / modelo (`entities/material/model/*.ts`) | unit | 1:1 com as ACs; toda entrada derivada tem asserção de forma | `apps/store/src/entities/material/model/__tests__/*.test.ts` | `pnpm --filter @estrelinha/store test` |
| Store de UI (`materialDrawerStore`) | unit | Todas as transições: abrir, fechar, escolher, reabrir preservando | `apps/store/src/entities/material/model/__tests__/*.test.ts` | idem |
| Componentes (`entities/material/ui`, `widgets/material-drawer/ui`) | unit (RTL/jsdom) | Toda AC alcançável por DOM: presença, ausência, rótulo, atributo. **jsdom devolve 0 para layout** — largura, rolagem e sobreposição **não** são testáveis aqui e vão para a prova em navegador | `apps/store/src/**/__tests__/*.test.tsx` | idem |
| Guardas de fonte (`*.test.ts` que leem o disco) | unit | Âncora dupla (arquivos lidos **e** régua encontra o que procura) + sensor por injeção, nos dois sentidos | `apps/store/src/**/__tests__/*.test.ts` | idem |
| Fiação de página (`ProductPage`, `ProductInfo`) | unit (RTL) | Renderiza / não renderiza + o fio entre gatilho e gaveta (lição da `41`: as duas pontas provadas e o fio no meio não) | `apps/store/src/pages/__tests__/*.test.tsx` | idem |
| Tipos | none | build gate | — | `npx tsc --noEmit -p apps/store/tsconfig.app.json` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| **Quick** | Depois de task com teste unitário | `pnpm --filter @estrelinha/store test` — **exit code capturado fora de pipe** |
| **Full** | Depois de task que mexe em guarda ou em fiação de página | `pnpm --filter @estrelinha/store test` + `npx tsc --noEmit -p apps/store/tsconfig.app.json` |
| **Build** | Fim de fase | `pnpm --filter @estrelinha/store test` + `npx tsc --noEmit -p apps/store/tsconfig.app.json` + `pnpm lint` + `pnpm build` |

> **Rode um workspace por vez.** Duas suítes concorrentes saturam a máquina e produzem timeout de 5s
> em testes que varrem disco (`CLAUDE.md`). E `pnpm test | tail` **esconde a falha** — o código de
> saída que sai do pipe é o do `tail`.

---

## Execution Plan

### Phase 1: O dono único do conteúdo

```
T1 → T2 → T3 → T4
```

### Phase 2: O estado, o gatilho e o guarda

```
T5 → T6 → T7 → T8
```

### Phase 3: A gaveta

```
T9 → T10 → T11 → T12 → T13 → T14
```

### Phase 4: Fecho

```
T15
```

---

## Task Breakdown

### T1: Mover o conteúdo do guia para `entities/material`

**What**: `model/guide.ts` e `model/videos.ts` saem de `widgets/material-guide/` para
`entities/material/model/`; os `ui/` do widget passam a importar de `@/entities/material`; o barrel
do widget continua reexportando o conteúdo.
**Where**: `apps/store/src/entities/material/model/{guide,videos}.ts`, `entities/material/index.ts`,
`widgets/material-guide/{index.ts,ui/*.tsx}`
**Depends on**: None
**Reuses**: o arquivo inteiro, sem alteração de texto
**Requirement**: GAV-17, GAV-18

**Done when**:
- [ ] Nenhum arquivo em `widgets/material-guide/model/` — o diretório deixa de existir
- [ ] `HowToSendMaterialPage.tsx` e `HowToSendMaterialPage.test.tsx` **não mudam uma linha**
- [ ] Nenhum texto de conteúdo alterado (`git diff` só mostra caminho de import)
- [ ] Gate Full passa; contagem do store **≥ 2747** (nenhuma queda)

**Tests**: none (o teste é a suíte existente não mexer)
**Gate**: full

---

### T2: `rotuloCurto` no dono único

**What**: `AtalhoDeMaterial` ganha `rotuloCurto: string`; `FichaDeMaterial`, `CartaoDeMaterial` e
`PreparoEmCasa` ganham `rotuloCurto?: string`; o mapa de `ATALHOS_DE_MATERIAL` faz
`rotuloCurto: x.rotuloCurto ?? x.titulo`. Preenchidos só os três longos.
**Where**: `entities/material/model/guide.ts`
**Depends on**: T1
**Requirement**: GAV-20

**Done when**:
- [ ] `ATALHOS_DE_MATERIAL` tem 10 entradas, todas com `rotuloCurto` não vazio e ≤ 20 caracteres
- [ ] `rotulo` continua sendo o título completo, e `MaterialShortcuts` continua usando **`rotulo`**
- [ ] Teste novo com **âncora de contagem** (10) e asserção por entrada
- [ ] Gate Quick passa

**Tests**: unit
**Gate**: quick

---

### T3: Guarda `donoUnicoDoGuia.test.ts`

**What**: Guarda que recusa uma segunda definição do conteúdo do guia e import lateral entre os dois
widgets.
**Where**: `apps/store/src/entities/material/model/__tests__/donoUnicoDoGuia.test.ts`
**Depends on**: T1
**Requirement**: GAV-17, GAV-19

**Done when**:
- [ ] Recusa `FICHAS_DE_MATERIAL =`, `CARTOES_DE_MATERIAL =`, `PREPARO_EM_CASA =`, `PASSOS_DO_ENVIO =`
      e `VIDEOS_DE_PREPARO =` fora de `entities/material/model`
- [ ] Recusa `widgets/material-drawer` importar de `widgets/material-guide` e o inverso
- [ ] Assere `MATERIAIS_SEM_ANCORA` vazio
- [ ] **Âncora dupla** (contagem de arquivos varridos **e** régua provada como predicado) + **sensor**
      nos dois sentidos, com remoção de comentário que enxerga CRLF, LF e o glob de dois asteriscos
- [ ] Gate Quick passa

**Tests**: unit
**Gate**: quick

---

### T4: Extrair `MaterialAviso`

**What**: O aviso de ficha nos dois tons sai de dentro de `MaterialFicha.tsx` para
`entities/material/ui/MaterialAviso.tsx`; `MaterialFicha` passa a consumi-lo.
**Where**: `entities/material/ui/MaterialAviso.tsx`, `widgets/material-guide/ui/MaterialFicha.tsx`
**Depends on**: T1
**Reuses**: os hex exatos (`#F7EDE8` / `#9E4A3E` / `serenity`)
**Requirement**: GAV-11 (pré-requisito — evita o tom `alerta` nascer com dois donos)

**Done when**:
- [ ] `MaterialFicha.tsx` não declara mais cor de aviso
- [ ] A página do guia renderiza idêntica (suíte dela passa sem alteração)
- [ ] Gate Full passa

**Tests**: unit
**Gate**: full

---

### T5: `materialDrawerStore`

**What**: Store Zustand com `open`, `anchor`, `openDrawer`, `closeDrawer`, `setAnchor`.
**Where**: `entities/material/model/materialDrawerStore.ts`
**Depends on**: T1
**Reuses**: molde do `cartUiStore`
**Requirement**: GAV-15

**Done when**:
- [ ] **Sem `persist`** — nada em `localStorage`
- [ ] Testes: nasce fechado e sem escolha; abrir; escolher; fechar **preserva** `anchor`; reabrir
      devolve a escolha
- [ ] Gate Quick passa

**Tests**: unit
**Gate**: quick

---

### T6: `MaterialSendTrigger`

**What**: A linha "Como enviar seu material de DNA".
**Where**: `entities/material/ui/MaterialSendTrigger.tsx`
**Depends on**: T5
**Reuses**: `TAP_44`, `requiresMaterial`
**Requirement**: GAV-01, GAV-02, GAV-03, GAV-05

**Done when**:
- [ ] Devolve `null` quando `requires_material` é `false` **e** quando é `null`
- [ ] Rótulo e apoio exatos da spec, asseridos **inteiros** (lição `L-009`)
- [ ] Adota `TAP_44`
- [ ] Acionar chama `openDrawer`
- [ ] Nenhum nome de material no DOM renderizado — asserção explícita
- [ ] Gate Quick passa

**Tests**: unit
**Gate**: quick

---

### T7: Fiação em `ProductInfo`

**What**: `ProductInfo` renderiza `<MaterialSendTrigger product={product} />` **depois** do bloco de
estoque.
**Where**: `entities/product/ui/ProductInfo.tsx`, `pages/__tests__/ProductPage.test.tsx`
**Depends on**: T6
**Requirement**: GAV-01

**Done when**:
- [ ] Posição asserida **em relação ao estoque**, não só presença (lição da `41`: o fio no meio)
- [ ] Teste de que apagar a instanciação reprova
- [ ] Gate Full passa

**Tests**: unit
**Gate**: full

---

### T8: Estreitar `semMaterialNaPaginaDoProduto.test.ts`

**What**: `requiresMaterial` sai da régua; as outras sete formas ficam; sensores nos dois sentidos;
caso novo provando que a gaveta nomeia material e **não** está no escopo.
**Where**: `entities/product/ui/__tests__/semMaterialNaPaginaDoProduto.test.ts`
**Depends on**: T7
**Requirement**: GAV-06, GAV-07, GAV-08

**Done when**:
- [ ] `falaDeMaterial('const exige = requiresMaterial(product)')` é **`false`**, com caso próprio
- [ ] As **sete** formas restantes têm sensor individual, uma por asserção
- [ ] Caso novo: a gaveta contém pelo menos uma das formas proibidas **e** o escopo não a alcança
- [ ] A prosa que explica a remoção continua não sendo acusada
- [ ] Gate Full passa

**Tests**: unit
**Gate**: full

---

### T9: Casca da gaveta

**What**: `MaterialDrawer` — `Sheet side="right"`, larguras, véu que fecha, cabeçalho, nota de
contexto, foco de volta.
**Where**: `widgets/material-drawer/ui/MaterialDrawer.tsx`, `widgets/material-drawer/index.ts`
**Depends on**: T5
**Reuses**: `Sheet` do `@estrelinha/ui/sheet`, padrão do `CartDrawer`
**Requirement**: GAV-04, GAV-21, GAV-22

**Done when**:
- [ ] `side="right"` asserido
- [ ] Classe de largura asserida por **token exato** (`w-[calc(100%-48px)]`, `sm:max-w-[480px]`)
- [ ] Nota de contexto com a frase inteira da spec
- [ ] Fechar devolve o foco ao gatilho
- [ ] Gate Quick passa

**Tests**: unit
**Gate**: quick

---

### T10: Chips + allowlist do `buttonShape`

**What**: `MaterialDrawerChips` renderizando `ATALHOS_DE_MATERIAL` por `rotuloCurto`; entrada nova na
allowlist `ROTULO` de `buttonShape.test.ts`, com justificativa escrita.
**Where**: `widgets/material-drawer/ui/MaterialDrawerChips.tsx`,
`shared/ui/__tests__/buttonShape.test.ts`
**Depends on**: T9, T2
**Reuses**: `TAP_ROW`, a linguagem de chip de `MaterialShortcuts`
**Requirement**: GAV-09, GAV-10

**Done when**:
- [ ] **10** chips, um por entrada, com âncora de contagem
- [ ] Acionar chama `setAnchor` e **não** chama `closeDrawer`
- [ ] O chip escolhido é distinguível por atributo (`aria-pressed`), não só por classe
- [ ] Allowlist com a justificativa da quarta tela da mesma espécie de chip
- [ ] Gate Full passa

**Tests**: unit
**Gate**: full

---

### T11: Corpo da gaveta — os três formatos

**What**: `MaterialDrawerBody` resolve âncora → ficha rica · cartão simples · preparo em casa.
**Where**: `widgets/material-drawer/ui/MaterialDrawerBody.tsx`
**Depends on**: T10, T4
**Requirement**: GAV-11, GAV-12, GAV-13

**Done when**:
- [ ] Ficha rica: quantidade (valor **e** nota), `listaTitulo` + itens, **todos** os passos,
      **todos** os avisos com tom distinto
- [ ] Cartão simples: itens, e **ausência** asserida de quantidade e recipientes
- [ ] Preparo em casa: aviso + **todos** os passos numerados
- [ ] Âncora desconhecida devolve `null` sem erro
- [ ] Um caso **por entrada** de `ATALHOS_DE_MATERIAL` (lição `L-010`: AC que enumera lista precisa
      de um item por elemento)
- [ ] Gate Quick passa

**Tests**: unit
**Gate**: quick

---

### T12: Vídeo dentro da gaveta

**What**: `MaterialDrawerVideo` — capa → player inline; saída externa sempre presente.
**Where**: `widgets/material-drawer/ui/MaterialDrawerVideo.tsx`
**Depends on**: T11
**Reuses**: `videoDoMaterial`, `videoCapa`, `videoEmbed`, `videoUrl`
**Requirement**: GAV-14, GAV-23

**Done when**:
- [ ] **Nenhum `<iframe>` antes do toque** — asserido
- [ ] Depois do toque, `src` é `youtube-nocookie`
- [ ] Material sem vídeo não renderiza bloco algum — asserido pela ausência
- [ ] `videoUrl` presente como link externo nos dois estados
- [ ] Gate Quick passa

**Tests**: unit
**Gate**: quick

---

### T13: Passos e rodapé

**What**: `MaterialDrawerSteps` (os quatro de `PASSOS_DO_ENVIO`) e o rodapé "Ver o guia completo"
apontando para a âncora escolhida.
**Where**: `widgets/material-drawer/ui/MaterialDrawerSteps.tsx`, `MaterialDrawer.tsx`
**Depends on**: T12
**Reuses**: `PASSOS_DO_ENVIO`, `guiaMaterialHref` / `MATERIAL_GUIDE_PATH`
**Requirement**: GAV-09, GAV-16

**Done when**:
- [ ] Os 4 passos, com âncora de contagem
- [ ] Ordem do corpo asserida: nota → pergunta → chips → passos
- [ ] Sem escolha, o rodapé aponta para a página sem âncora; com escolha, para `#<anchor>`
- [ ] Gate Quick passa

**Tests**: unit
**Gate**: quick

---

### T14: Montagem em `ProductPage` e o fio inteiro

**What**: `<MaterialDrawer />` montado em `ProductPage`; teste de ponta a ponta do fio.
**Where**: `pages/ProductPage.tsx`, `pages/__tests__/ProductPage.test.tsx`
**Depends on**: T13, T7
**Requirement**: GAV-04, GAV-15

**Done when**:
- [ ] Acionar o gatilho abre a gaveta **na página** — um teste que apagar `<MaterialDrawer />`
      reprova
- [ ] Escolher, fechar e reabrir preserva a escolha **pela tela**, não só pelo store
- [ ] Gate Build passa
- [ ] Contagem do store registrada

**Tests**: unit
**Gate**: build

---

### T15: Baselines e memória do projeto

**What**: Atualizar `CLAUDE.md` (raiz: baselines e a tabela de guardas), `apps/store/CLAUDE.md`
(seção de material e do guia) e `.specs/STATE.md` (`AD-033` + handoff).
**Where**: `CLAUDE.md`, `apps/store/CLAUDE.md`, `.specs/STATE.md`
**Depends on**: T14
**Requirement**: —

**Done when**:
- [ ] Baseline de testes remedida e escrita **na hora**, com exit code fora de pipe
- [ ] `AD-033` registrada (conteúdo compartilhado entre widgets do mesmo app vai para `entities`)
- [ ] Guardas novos na tabela do `CLAUDE.md`
- [ ] A dívida de `BL-015` (peça com `requires_material = false` que pede material) registrada

**Tests**: none
**Gate**: build

---

## Validation Tables

### Check 1 · Granularidade

| Task | Deliverable único? | Veredito |
| --- | --- | --- |
| T1 | um movimento de módulo + os imports que ele quebra | ✅ |
| T2 | um campo no modelo | ✅ |
| T3 | um arquivo de guarda | ✅ |
| T4 | um componente extraído | ✅ |
| T5 | um store | ✅ |
| T6 | um componente | ✅ |
| T7 | uma fiação | ✅ |
| T8 | um guarda estreitado | ✅ |
| T9 | um componente (casca) | ✅ |
| T10 | um componente + uma entrada de allowlist | ✅ |
| T11 | um componente | ✅ |
| T12 | um componente | ✅ |
| T13 | um componente + o rodapé da casca | ✅ |
| T14 | uma montagem | ✅ |
| T15 | documentação | ✅ |

### Check 2 · Diagrama × `Depends on`

| Task | Diagrama | `Depends on` | Confere |
| --- | --- | --- | --- |
| T1 | início da P1 | None | ✅ |
| T2 | T1 → T2 | T1 | ✅ |
| T3 | T2 → T3 | T1 | ✅ (P1 é sequencial; T3 só precisa de T1) |
| T4 | T3 → T4 | T1 | ✅ (idem) |
| T5 | início da P2 | T1 | ✅ |
| T6 | T5 → T6 | T5 | ✅ |
| T7 | T6 → T7 | T6 | ✅ |
| T8 | T7 → T8 | T7 | ✅ |
| T9 | início da P3 | T5 | ✅ |
| T10 | T9 → T10 | T9, T2 | ✅ (T2 está na P1, concluída) |
| T11 | T10 → T11 | T10, T4 | ✅ (T4 está na P1, concluída) |
| T12 | T11 → T12 | T11 | ✅ |
| T13 | T12 → T13 | T12 | ✅ |
| T14 | T13 → T14 | T13, T7 | ✅ (T7 está na P2, concluída) |
| T15 | P4 | T14 | ✅ |

### Check 3 · Co-locação de teste × matriz

| Task | Camada | Tipo exigido pela matriz | `Tests` da task | Confere |
| --- | --- | --- | --- | --- |
| T1 | modelo (movimento) | unit (existente) | none — a suíte existente é a prova | ✅ |
| T2 | modelo | unit | unit | ✅ |
| T3 | guarda de fonte | unit | unit | ✅ |
| T4 | componente | unit | unit | ✅ |
| T5 | store de UI | unit | unit | ✅ |
| T6 | componente | unit | unit | ✅ |
| T7 | fiação de página | unit | unit | ✅ |
| T8 | guarda de fonte | unit | unit | ✅ |
| T9–T13 | componentes | unit | unit | ✅ |
| T14 | fiação de página | unit | unit | ✅ |
| T15 | documentação | none | none | ✅ |

---

## O que estes testes NÃO provam

**jsdom devolve 0 para toda medida de layout.** Nenhuma task acima prova largura da gaveta, posição
da dobra, rolagem interna, o véu de 48px sendo alcançável pelo dedo, ou o painel de 480px não
cobrindo a página no computador. Isso é **prova em navegador**, em 390×844 e 1440, e entra na fila da
`32`, `33`, `34`, `35`, `37`, `39` e `41`.
