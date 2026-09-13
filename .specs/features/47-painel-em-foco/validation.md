# Validação — Feature 47 · Painel em foco

> **O verificador é INDEPENDENTE do autor.** Esta sessão não escreveu uma linha do código desta
> feature: ela leu o diff, localizou a asserção de cada AC no disco, injetou mutações de
> comportamento em estado descartável e mediu os gates com exit code capturado **fora de pipe**.
> Nenhum arquivo de produção ou de teste foi alterado — todas as mutações foram desfeitas a partir de
> cópias, e `git status --short` no fim é idêntico ao do início (ver *Integridade da árvore*).
>
> **Três rodadas**, o limite do protocolo. A rodada 1 reprovou com 2 mutantes sobreviventes e 8
> achados menores; a 2 reprovou com 1; a 3 é o veredito final. Cada rodada confere **só o que mudou**
> desde a anterior, e as anteriores ficam preservadas na íntegra porque a evidência delas é o que
> justifica cada conserto.

---

## Rodada 3 — 2026-09-13 · **VEREDITO FINAL**

**Veredito: ✅ PASS.** O mutante que bloqueava a rodada 2 está morto, e confirmei isso por injeção
própria. As três correções de documentação foram conferidas **contra o disco**, não contra a
descrição, e as três batem. Os gates fecham sem regressão, com as duas reprovações herdadas sendo
exatamente as duas.

Registro **um achado novo de gravidade média** que a rodada 3 encontrou (`transform: scale(1)`
cravado sobrevive nos dois palcos) — e explico abaixo por que ele **não bloqueia**: a regra que ele
fere é `PRV-14`, da feature `25`, e a asserção fraca que o deixa passar
(`toContain('scale(')`) é de lá também. Não é defeito desta feature nem regressão dela.

| Dimensão | Rodada 1 | Rodada 2 | **Rodada 3** |
| --- | --- | --- | --- |
| Cobertura ancorada na spec | 37 / 37 · 5 ⚠️ | 37 / 37 · 3 ⚠️ | **37 / 37 · 2 ⚠️** (pendências de navegador) |
| Sensor | 18 · 16 killed · **2 survived** | 6 · 5 killed · **1 survived** | **2 · 1 killed · 1 survived** *(o vivo é pré-existente)* |
| Gate backoffice | 2197/129 · 1 ✗ | 2201/129 · 1 ✗ | **2204 em 129 · 2203 passando · 1 ✗ herdada** · `exit=1` |
| Gate core | 2199/84 · exit 0 | 2199/84 · exit 0 | **2199 em 84** · `exit=0` |
| Tipos | bo 0 · store 5 (**doc dizia 1**) | bo 0 · store 5 | **bo 0** (`exit=0`, `grep -c` = 0) · **store 5** |
| Código de produção | — | idêntico à r1 | **idêntico à r2**, conferido por `diff` nos 5 arquivos |

### 1 · O gêmeo está morto — confirmado por injeção própria

Reinjetei **a mesma mutação** que sobreviveu na rodada 2, em
`apps/backoffice/src/features/store-menu/ui/MenuLivePreview.tsx:81`:

```ts
const { width, scale: escala } = frame
const height = PREVIEW_DEVICES[device].height   // descarta frame.height
```

Rodei `MenuLivePreview.test.tsx` + `AdminMenuPage.test.tsx` + `folgaDoPalco.test.ts`:

```
Tests  1 failed | 81 passed (82)
FAIL  MenuLivePreview.test.tsx > MenuLivePreview — a tela cheia
      > FOCO-16/17: com palco MEDIDO, o quadro cresce em altura e a escala fica em 1
  → expect(element).toHaveAttribute("height", "948")
```

✅ **KILLED.** Na rodada 2 essa mesma mutação deixava **79 verdes**. Restaurei e conferi por `diff`
que o arquivo voltou ao estado da rodada 2.

Os três casos novos são os certos, e cobrem os três eixos que faltavam: `1440 × 988` desktop (normal
768 → cheia **948**, `scale(1)`, métrica `1024 × 948 · 100%`), `900 × 700` apertado (a métrica **não**
diz 100% antes, diz depois) e `1440 × 1400` **mobile** (não estica: `390 × 844`). O `afterEach` que
devolve o `ResizeObserver` original também está lá — sem ele o dublê vazaria para os outros arquivos
da mesma thread.

### 2 e 3 · As correções de documentação — conferidas contra o disco

| Correção | Como conferi | Resultado |
| --- | --- | --- |
| `HomeSectionList` é `26 → 30 (+4)` | `git show 056da12:…/HomeSectionList.test.tsx` ⇒ **26** `it(`; runner da rodada 3 ⇒ **30 tests** | ✅ |
| `MenuLivePreview` é `17 → 27 (+10)` | base **17** no disco; runner ⇒ `MenuLivePreview.test.tsx (27 tests)` | ✅ |
| Tipos do store = **5**, sem resíduo de "1" | varri `tasks.md`, `CLAUDE.md`, `apps/backoffice/CLAUDE.md` e `STATE.md`. `tasks.md:874` agora diz `0 (bo) · 5 (store)`; `:794` diz `5 → 5`; `CLAUDE.md:408` diz `5 (store)`. **Nenhuma ocorrência residual** — o único "1 erro" restante é de outra feature, no handoff antigo do `STATE.md:2196` (TS2352, sem relação) | ✅ |

**E a régua da soma virou bloco escrito, com as parcelas à vista** — que era o pedido. Refiz a conta
do zero:

```
novos:   8 + 13 + 13 + 8 + 5 + 14                =  61
deltas:  14 + 11 + 10 + 6 + 4 + 7 + 18           =  70
total:                                            131  =  2204 − 2073  ✓
```

Fecha. É a primeira vez nas três rodadas que a tabela de origem de teste fecha contra o delta do
workspace — e a régua agora está escrita ao lado dela, que é o que impede o erro de voltar.

### 4 · O comando de medição — o número NÃO depende dele

Rodei o gate com o **comando padrão do repositório** (`pnpm --filter @estrelinha/backoffice test`,
sem `--testTimeout`), de propósito, para não herdar a premissa:

```
Test Files  1 failed | 128 passed (129)
     Tests  1 failed | 2203 passed (2204)
exit=1
```

**2204 em 129, com a única reprova sendo a herdada** — o mesmo número que o autor mediu com o flag.
A contagem de testes não muda com o timeout (ele decide pass/fail, não coleta), então o número está
confirmado pelas duas vias e a flake simplesmente não apareceu nesta execução.

> **Nit de proveniência, conferido e registrado**: `tasks.md:788` cita o `--testTimeout=20000` como
> "o achado que a `46` documentou no `CLAUDE.md`". **Nesta árvore esse texto não existe** —
> `grep -n testTimeout` não acha nada em `CLAUDE.md`, em `apps/backoffice/CLAUDE.md` nem em
> `apps/backoffice/vitest.config.ts`; a única ocorrência é a própria frase que o cita. É coerente com
> o que o autor declarou (a `46` está na `master`, ainda não mergeada aqui), mas é uma **referência
> pendurada num artefato de branch**: quem ler esta `tasks.md` antes do merge não tem como conferi-la.
> Some sozinho no merge; se não sumir, é dívida.

### 5 · Achado NOVO da rodada 3 — e por que não bloqueia

Injetei uma mutação que a rodada 2 não tinha coberto: **cravar `transform: scale(1)`** no `<iframe>`
dos **dois** palcos (`HomeLivePreview.tsx:202` e `MenuLivePreview.tsx:188`), descartando `escala`.

```
Tests  50 passed (50)      ← MenuLivePreview.test.tsx + HomeLivePreview.test.tsx
```

❌ **SURVIVED.** Com ela, no modo normal e num palco estreito, a prévia renderizaria a 100% dentro de
uma caixa reservada para o tamanho **reduzido** (`overflow-hidden`): a barra diria `84%` e a tela
mostraria a loja **cortada** em vez de reduzida.

**Por que isso não reprova esta feature**, e a distinção importa:

- A regra ferida é **`PRV-14`**, da feature `25` ("cabe no palco, e nunca amplia") — **não** é uma
  `FOCO-*`. As ACs desta feature sobre escala são `FOCO-16` (tela cheia = exatamente 1) e `FOCO-17`, e
  as duas estão medidas nos dois palcos, com `toBe('scale(1)')` e a altura do `<iframe>`.
- A asserção fraca que deixa o mutante passar é **anterior a esta feature**:
  `expect(quadro()!.style.transform).toContain('scale(')`, escrita na `25`/`39`, que `scale(1)`
  satisfaz.
- O código entregue está **correto**; o que falta é discriminação numa régua herdada.

**O conserto é uma linha**, e o caso onde ela cabe já existe: em *"num palco APERTADO a tela cheia
mantém 100%"*, acrescentar antes de entrar no modo
`expect(quadro()?.style.transform).not.toBe('scale(1)')`. Recomendo como **fix task de acompanhamento**
(ou item de backlog), não como bloqueio desta feature — fechá-lo aqui seria a verificação expandindo
escopo para uma AC que não é desta spec.

### Gates da rodada 3

```
pnpm --filter @estrelinha/backoffice test      (comando padrão, sem flag)
  Test Files  1 failed | 128 passed (129)
       Tests  1 failed | 2203 passed (2204)
  exit=1     ← única reprova: src/features/faq-library/ui/FaqEditorDialog.test.tsx

pnpm --filter @estrelinha/core test
  Test Files  84 passed (84)
       Tests  2199 passed (2199)
  exit=0

npx tsc --noEmit -p apps/backoffice/tsconfig.app.json  →  exit=0 · grep -c 'error TS' = 0
```

**As reprovações herdadas continuam sendo exatamente aquelas duas** — `FaqEditorDialog.test.tsx:126`
no backoffice e `sitemap/__tests__/handlers.test.ts` nas functions (medida na rodada 1;
`supabase/**` não foi tocado desde então). **Nenhuma terceira apareceu em nenhuma das três rodadas.**

> **Contexto declarado pelo autor, e NÃO antecipado por esta verificação**: a `master` avançou e a
> `46` já consertou as três falhas herdadas (o contador `0/600`, a âncora do sitemap e o
> `FaqSubjectNav`). O merge **não** foi feito. Este veredito é contra **esta árvore**, com as duas
> reprovações e com os 5 erros de tipo do store. Depois do merge, tudo isso precisa ser **remedido**,
> e os números aqui deixam de valer como baseline.

### Integridade da árvore

Os 5 arquivos mutados nesta rodada (`MenuLivePreview.tsx`, `HomeLivePreview.tsx`, mais os 3 conferidos
por segurança) voltaram **bit a bit** ao estado da rodada 2, verificado por `diff` contra as cópias
que esta sessão guardou. Nenhum arquivo de produção ou de teste foi alterado permanentemente por esta
verificação; o único arquivo que ela escreve é este relatório.

### Lacunas remanescentes — nenhuma bloqueante

| # | Gravidade | Lacuna | Endereço |
| --- | --- | --- | --- |
| 1 | Média · **não é desta feature** | `transform: scale(1)` cravado sobrevive nos dois palcos. Fere `PRV-14` (feature `25`), e a asserção fraca (`toContain('scale(')`) é de lá. Conserto: uma linha `not.toBe('scale(1)')` no caso do palco apertado, nos dois arquivos | `HomeLivePreview.test.tsx` (caso *palco APERTADO*) · `MenuLivePreview.test.tsx` (idem) |
| 2 | Baixa | Referência pendurada: `tasks.md:788` cita um texto do `CLAUDE.md` que **não existe nesta árvore**. Some no merge da `46`; se não sumir, é dívida | `.specs/features/47-painel-em-foco/tasks.md:788` |
| 3 | Pendência declarada | `FOCO-13` (o palco parado) e `FOCO-24` (alcançável por `Tab`) seguem provados por **proxy de forma** — jsdom não mede layout nem aplica CSS. **Correto deixar assim**: fechá-los em jsdom produziria asserção que parece medir e não mede | `AdminMenuPage.test.tsx` · `HomeSectionList.test.tsx` |
| 4 | Pendência declarada | Nenhuma prova em navegador (390 · 768 · 1024 · 1440), incluindo o `11rem` **suposto** de `/admin/menu`, o CLS/LCP do palco em tela cheia e os 44px do trilho na faixa 768–1023 | — |
| 5 | Pendência declarada | Dívida de *Out of Scope* intocada: o estado de falha do `<iframe>` (não carregou, recusou enquadrar) — e a tela cheia **amplia a superfície** dele | — |

### O que as três rodadas ensinaram, em uma linha cada

- **Um dono só não basta: o uso do dono também precisa ser medido.** `previewFrame` sempre esteve
  certo em `core`; o que sobrevivia era o palco **chamar** e **descartar** o resultado — e
  `folgaDoPalco.test.ts` prova a chamada, nunca o uso.
- **Régua que o sensor não chama não é sensor.** Quebrar `gradeDe` derrubou a asserção **e** o
  sensor: é essa a assinatura de um sensor de verdade.
- **`not.toThrow()` não prova remoção de ouvinte em React 18** — `setState` depois do unmount é
  no-op silencioso. Quem prova é a **identidade do handler**.
- **Enumerar pelo que se mede é circular**: filtrar as caixas por `h-11` e depois cobrar `h-11` nelas
  responde "quantas caixas de 44 existem", nunca "toda caixa clicável tem 44".
- **Tabela de origem de teste tem de fechar contra o delta do workspace.** Medir as saídas uma a uma
  não acha coluna de **entrada** errada; só a soma acha.

---

## Rodada 2 — 2026-09-13 (histórico)

**Veredito da rodada 2: ❌ FAIL, por UM item.** Nove dos dez achados da rodada 1 estão fechados, e cada um foi
reconferido por mutação ou por leitura — nenhum aceito pela descrição. **Sobrou um mutante vivo**, e
ele é a metade não consertada do achado nº 2: a mesma mutação que agora morre em `HomeLivePreview`
**sobrevive intacta** no palco gêmeo, `MenuLivePreview.tsx:81`, que é superfície viva de `FOCO-15`,
`FOCO-16` e `FOCO-17`. É a mesma classe de defeito que reprovou a rodada 1, no segundo de dois sítios
idênticos, e o conserto são ~15 linhas.

| Dimensão | Rodada 1 | Rodada 2 |
| --- | --- | --- |
| Cobertura ancorada na spec | 37 / 37 · 5 ⚠️ | **37 / 37** · **3 ⚠️** (dois fechados) |
| Sensor de discriminação | 18 mutantes · 16 killed · **2 survived** | **6 mutantes re-rodados · 5 killed · 1 survived** |
| Gate backoffice | 2197 em 129 · 1 ✗ herdada | **2201 em 129** · **1 ✗ herdada** · `exit=1` |
| Gate core | 2199 em 84 · `exit=0` | **2199 em 84** · `exit=0` |
| Tipos | bo 0 · store 5 (**doc dizia 1**) | bo **0** (`exit=0`) · store **5** (`exit=2`) — **doc corrigida** |
| Código de produção | — | **bit a bit idêntico à rodada 1**, nos 10 arquivos, conferido por `diff` |

### O que eu confirmei, e como

**Primeiro: a premissa.** A afirmação "nenhum código de produção mudou" **não foi aceita pela
palavra** — comparei por `diff` os 10 arquivos de produção da feature contra as cópias que eu mesmo
guardei na rodada 1 (`navRail.ts`, `NavRail.tsx`, `useFullscreenStage.ts`, `HomeSectionRow.tsx`,
`MenuEntryEditor.tsx`, `AdminMenuPage.tsx`, `AdminLayout.tsx`, `HomeLivePreview.tsx`,
`AdminHomePage.tsx`, `MenuLivePreview.tsx`). **Os dez saíram `IDENTICO`.** Só testes e documentação
mudaram.

| # | Achado da rodada 1 | Mutante re-injetado | Resultado |
| --- | --- | --- | --- |
| 1 | Ouvinte de `Escape` pode vazar | apagar `return () => window.removeEventListener('keydown', aoTeclar)` | ✅ **KILLED — 2 casos** (`desmontar com o modo LIGADO…` e `sair do modo pela tela…`) |
| 2a | Quadro não medido em `HomeLivePreview` | `const height = PREVIEW_DEVICES[device].height` | ✅ **KILLED — 1 caso**, com a mensagem certa: `expect(element).toHaveAttribute("height", "948")` |
| **2b** | **O gêmeo, em `MenuLivePreview`** | **a MESMA mutação, em `MenuLivePreview.tsx:81`** | ❌ **SURVIVED — 79 verdes** (`MenuLivePreview.test.tsx` + `AdminMenuPage.test.tsx` + `folgaDoPalco.test.ts`) |
| 3 | `FOCO-09` circular | acrescentar um **terceiro** clicável com `h-9 w-9` no `NavRail` — exatamente o mutante que a régua antiga deixava passar (`caixas` continuava 2) | ✅ **KILLED** — `expected 16 to be 15`, pela âncora `destinos.length + 1` |
| 4 | Sensor tautológico da grade | quebrar o extrator (`className="gridZZZ…`) | ✅ **KILLED — 3 casos**, e **o próprio SENSOR reprova junto** — que é a prova de que ele passa pelo extrator, e não por literais escritos ao lado |
| 6 | Aba Ícone provada pelo `<h2>` | apagar `<MenuIconPicker/>` da aba `icone` | ✅ **KILLED — 2 casos** (era 1 na rodada 1) |

**5 killed · 1 survived.**

### O mutante que sobrou

`apps/backoffice/src/features/store-menu/ui/MenuLivePreview.tsx:81` — trocar

```ts
const { width, height, scale: escala } = frame
```

por `const { width, scale: escala } = frame; const height = PREVIEW_DEVICES[device].height` deixa
**79 testes verdes**. `folgaDoPalco.test.ts` não pega: ele cobra que o palco **chame** `previewFrame(`
e não chame `previewScale` — a mutação faz as duas coisas certas e **descarta o resultado**.

Por que é AC e não zelo: `FOCO-15` nomeia `/admin/menu` por extenso ("o palco da prévia está visível
em `/admin/home` **e em** `/admin/menu`"), e o palco do menu renderiza o computador sempre que
`surface === 'desktop'` — então `FOCO-16` ("1024px de largura e escala 100%") e `FOCO-17` ("a altura
do quadro SHALL ser o espaço vertical disponível, nunca menor que 768") governam este palco também.
Hoje a única prova desses dois números na superfície do menu não existe.

**O conserto é pequeno e já está escrito uma vez**: portar o dublê `comPalcoDe` de
`HomeLivePreview.test.tsx` e acrescentar um caso que meça o `<iframe>` com palco não nulo. O autor
declarou a lacuna espontaneamente ao pedir esta rodada — o que está certo, e é o motivo de ela ser
o **único** item remanescente em vez de um achado novo.

### Os dois que ficaram como pendência de navegador, e por quê isso é aceitável

Os achados 5 (`FOCO-13` provado só por classe declarada) e 6-antigo (`FOCO-24` "alcançável por `Tab`"
como proxy) **não foram consertados, e não deveriam ser**: jsdom devolve 0 para toda medida de
layout e não aplica CSS. Fechá-los em jsdom produziria uma asserção que *parece* medir e não mede —
que é exatamente o defeito que esta verificação existe para achar. Estão declarados como pendência.

### Contabilidade — uma linha ainda está errada, e a aritmética é quem mostra

A tabela *Onde os testes nasceram* foi refeita, e **as 14 colunas de saída batem, uma a uma**, com o
que o runner imprimiu (conferi arquivo por arquivo na saída de `pnpm --filter @estrelinha/backoffice
test`): `useFullscreenStage` 8 · `HomeLivePreview` 23 · `NavRail` 13 · `MenuEntryEditor` 14 ·
`AdminLayout` 30 · `AdminHomePage` 47 · `HomeSectionList` 30 · `AdminMenuPage` 50 · `previaUnica` 28 ·
`MenuLivePreview` 24 · `navRail` 13 · `folgaDoPalco` 5 · `focusRoutes` 8 · `core/preview` 37.

**Uma coluna de ENTRADA continua errada.** `home-composition/ui/HomeSectionList.test.tsx` está
registrado como `24 → 30 (+6)`; o arquivo em `056da12` tem **26** casos, então o delta real é
**26 → 30 (+4)**. Quem denuncia é a soma, e ela fecha ao centavo com a correção:

```
novos:  8 + 13 + 13 + 8 + 5 + 14                     =  61
deltas: 14 + 11 + 7 + 6 + 6 + 7 + 18 (como está)     =  69   ⇒ 130
deltas: 14 + 11 + 7 + 6 + 4 + 7 + 18 (corrigido)     =  67   ⇒ 128
delta real do workspace: 2201 − 2073                 = 128   ✓
```

Nada foi apagado — 26 + 4 casos novos = 30, e a linha do hero foi **reescrita** (lixeira → `⋯`), não
removida. É só o literal da entrada. **A lição é a régua que faltou**: a tabela não carrega a
verificação de soma, e sem ela um número de entrada errado passa mesmo com todas as saídas medidas.

**Uma inconsistência interna sobreviveu à correção**: `tasks.md:791` e `:841` dizem que o store tem
**5** erros de tipo herdados, e a tabela de divergências em `tasks.md:857` continua dizendo
`0 (bo) · 1 (store)`. O mesmo documento afirma as duas coisas, a 60 linhas de distância.

### Gates da rodada 2

```
pnpm --filter @estrelinha/backoffice test
  Test Files  1 failed | 128 passed (129)
       Tests  1 failed | 2200 passed (2201)
  exit=1        ← a única reprova é src/features/faq-library/ui/FaqEditorDialog.test.tsx

pnpm --filter @estrelinha/core test
  Test Files  84 passed (84)
       Tests  2199 passed (2199)
  exit=0

npx tsc --noEmit -p apps/backoffice/tsconfig.app.json   →  exit=0, 0 erros   (contado com grep -c)
npx tsc --noEmit -p apps/store/tsconfig.app.json        →  exit=2, 5 erros   (todos herdados)
```

**As duas reprovações herdadas continuam sendo exatamente as duas**: `FaqEditorDialog.test.tsx:126`
(`0 / 600` × `0 / 4000`) no backoffice e `sitemap/__tests__/handlers.test.ts` nas functions (remedida
na rodada 1, e `apps/store`/`supabase` não foram tocados desde então). **Nenhuma terceira apareceu.**

A flake de timeout de 5s **não** apareceu nesta execução — o que é coerente com o que o autor
relatou (ela mudou de arquivo entre execuções dele) e com a lição já escrita: *teste que varre disco,
sob carga, estoura o timeout de 5s; repita o workspace sozinho antes de investigar.*

**Store (3069/198), functions (436/8) e catalog-import (512/23) não foram remedidos nesta rodada** —
não foram tocados por ela, e a rodada 1 já os mediu. Isto é declarado, não suposto.

### Lacunas remanescentes — ranqueadas

| # | Gravidade | Lacuna | `file:line` |
| --- | --- | --- | --- |
| 1 | **Alta** | **Mutante sobrevivente**: o palco do menu pode ignorar `frame.height`/`frame.width` e renderizar o `<iframe>` com a medida nominal enquanto a barra imprime outra, com 79 testes verdes. `FOCO-15` nomeia `/admin/menu`, e `FOCO-16`/`FOCO-17` governam o quadro do computador ali também. `folgaDoPalco.test.ts` prova que `previewFrame(` é **chamada**, nunca que o resultado é **usado**. Conserto: portar `comPalcoDe` e um caso de `<iframe>` medido | alvo `apps/backoffice/src/features/store-menu/ui/MenuLivePreview.tsx:81` · teste que falta `apps/backoffice/src/features/store-menu/ui/MenuLivePreview.test.tsx` |
| 2 | Baixa | Contabilidade: `HomeSectionList.test.tsx` registrado como `24 → 30`; o real é **26 → 30**. A soma da tabela dá 130 e o delta do workspace é 128 — a diferença é exatamente esta linha | `.specs/features/47-painel-em-foco/tasks.md` §*Onde os testes nasceram* |
| 3 | Baixa | O mesmo documento afirma `5` e `1` erros de tipo do store em dois lugares | `.specs/features/47-painel-em-foco/tasks.md:791` × `:857` |
| 4 | Pendência declarada | `FOCO-13` (o palco parado) e `FOCO-24` (alcançável por `Tab`) continuam provados por **proxy de forma** — jsdom não mede layout nem aplica CSS. Correto deixar assim; a prova é navegador | `AdminMenuPage.test.tsx:735-739` · `HomeSectionList.test.tsx:208-211` |
| 5 | Pendência declarada | Nenhuma prova em navegador foi feita (390 · 768 · 1024 · 1440), incluindo o `11rem` suposto de `/admin/menu` | — |

---

## Rodada 1 — 2026-09-12 (histórico, preservado)

**Veredito da rodada 1: ❌ FAIL** — 37/37 ACs com evidência `file:line`, **mas 2 dos 18 mutantes
SOBREVIVERAM**, e os dois estavam em cima de uma AC (`FOCO-17` e o `FOCO-19`/edge case do desmonte).
Nenhum defeito encontrado no código entregue; o que faltava era **discriminação** em dois pontos,
mais quatro erros de contabilidade na baseline.

| Dimensão | Resultado |
| --- | --- |
| Cobertura ancorada na spec | **37 / 37** ACs com `file:line` + expressão · **5 ⚠️ spec-precision gaps** |
| Sensor de discriminação | **18 mutantes · 16 killed · 2 survived** |
| Gate backoffice | **2197 em 129** · **1 reprova** (herdada da `46`) · `exit=1` |
| Gate core | **2199 em 84** · `exit=0` |
| Gate functions (remedido) | **436 em 8** · **1 reprova** (herdada da `46`) · `exit=1` |
| Tipos | backoffice **0** (`exit=0`) · store **5** (todos herdados — **a doc dizia 1**) |
| `packages/core/src/payment/**` | **sem uma linha alterada** (`git diff --stat`) |

**Intervalo de diff coberto**: tudo o que `git status --short` acusa sobre `056da12`
(`docs(47): spec, design e tasks do painel em foco`) — 22 arquivos modificados e 12 não rastreados.
O código da feature está **não commitado**; a verificação leu `git diff` mais os arquivos `??`.

> As seções abaixo (cobertura por AC, tabela dos 18 mutantes, varredura de modos de falha, gates,
> integridade da árvore e as 10 lacunas) são da **rodada 1**. As citações `file:line` de
> `useFullscreenStage.test.ts`, `HomeLivePreview.test.tsx`, `NavRail.test.tsx`,
> `AdminHomePage.test.tsx` e `MenuEntryEditor.test.tsx` mudaram de linha com os consertos; o que
> vale como endereço corrente é a rodada 2, acima.

---

## 1. Cobertura ancorada na spec — evidência ou zero

Todos os caminhos são relativos à raiz do worktree `C:/Projetos/uma-estrelinha/store-47-painel-em-foco`.

### H1 · P1 — O trilho de ícones

| AC | Resultado que a spec define | `file:line` + asserção | Veredito |
| --- | --- | --- | --- |
| `FOCO-01` | `/admin/home`, `/admin/menu` e subrotas sem preferência salva ⇒ trilho de 56px | `apps/backoffice/src/widgets/admin-layout/ui/AdminLayout.test.tsx:163,173,178` — `expect(trilho()).toBeInTheDocument()` (layout REAL, via `renderEm`) · largura: `AdminLayout.test.tsx:326` — `expect(aside).toContain('w-14')` (`w-14` = 56px) · predicado: `apps/backoffice/src/widgets/admin-layout/model/focusRoutes.test.ts:12,13,17` — `expect(isFocusRoute('/admin/home/8f3c-1a')).toBe(true)` | ✅ |
| `FOCO-02` | Exatamente os destinos de `navGroups` + `footerNavItems`, mesma ordem, sem rótulo visível, com nome acessível igual ao rótulo | `apps/backoffice/src/widgets/admin-layout/ui/NavRail.test.tsx:35-36` — `expect(links).toHaveLength(destinos.length)` e `expect(links.map(l => l.getAttribute('href'))).toEqual(destinos.map(i => i.to))` · nome: `:43` — `expect(screen.getByRole('link', { name: item.label })).toHaveAttribute('href', item.to)` · sem rótulo visível: `:54` — `expect(texto).not.toContain(item.label)` · **âncora derivada da fonte**: `:17,28` — `destinos = [...navGroups.flatMap(g => g.items), ...footerNavItems]`, `expect(destinos.length).toBeGreaterThan(5)` | ✅ |
| `FOCO-03` | Destino da rota atual marcado, e continua respondendo a `isNavActive` | `NavRail.test.tsx:64-66` — `expect(marcados).toHaveLength(1)`, `toHaveAttribute('href', '/admin/home')`, `toHaveAttribute('aria-current', 'page')` · subrota `:73-74` · não-prefixo `:81-82` · no layout real: `AdminLayout.test.tsx:261-265` | ✅ |
| `FOCO-04` | **Um** controle rotulado expande para 240; o mesmo recolhe | `NavRail.test.tsx:91-93` — `fireEvent.click(getByRole('button', { name: 'Expandir a navegação' }))` ⇒ `expect(onExpand).toHaveBeenCalledTimes(1)` · ciclo completo no layout real: `AdminLayout.test.tsx:190-201` | ✅ |
| `FOCO-05` | Expandir ⇒ grava `'expandido'` em `estrelinha.admin.nav-rail`; recolher ⇒ **remove** a chave | `apps/backoffice/src/widgets/admin-layout/model/navRail.test.ts:97` — `expect(storage.getItem(STORAGE_KEY)).toBe('expandido')` · `:108-109` — `expect(remover).toHaveBeenCalledWith(STORAGE_KEY)` e `expect(storage.getItem(STORAGE_KEY)).toBeNull()` · fio real: `AdminLayout.test.tsx:206,214` | ✅ |
| `FOCO-06` | Ausente/ilegível/≠`'expandido'`/storage que lança ⇒ padrão da rota, sem exceção | `navRail.test.ts:53,61-64` — `expect(readExpanded(fakeStorage({ [STORAGE_KEY]: 'EXPANDIDO' }))).toBe(false)` (mais `'true'`, `'{}'`, `''`) · lança ao ler `:68-69` · lança ao gravar `:125-126` — `expect(() => act(() => result.current.alternar())).not.toThrow()` | ✅ |
| `FOCO-07` | Fora das duas rotas ⇒ sidebar de 240 e **nenhum** controle de recolher | `AdminLayout.test.tsx:184-187` — `expect(trilho()).not.toBeInTheDocument()`, `expect(botaoRecolher()).not.toBeInTheDocument()`, `expect(botaoExpandir()).not.toBeInTheDocument()` · no modelo: `navRail.test.ts:81-82` — `useNavRail(false, storageComExpandido).recolhido === false` | ✅ |
| `FOCO-08` | Abaixo de `md` nada muda: gaveta em qualquer rota | `AdminLayout.test.tsx:251-254` — gaveta com `Produtos` e `queryByRole('button', { name: 'Recolher a navegação' })` ausente · declaração: `:328-329` — `expect(aside).toContain('hidden')` + `toContain('md:block')` | ✅ |
| `FOCO-09` | Todo alvo clicável do trilho ≥ 44×44 (`A-03`) | `NavRail.test.tsx:113-117` — `expect(caixas).toHaveLength(2)` e, por caixa, `toMatch(tokenExato('h-11'))` + `toMatch(tokenExato('w-11'))`, com `tokenExato = (?:^|\s)token(?![-\w])` · `TAP_44` não importado: `:134-137` | ⚠️ (ver gap 3) |
| `FOCO-10` | `<aside>` com `sticky`/`top-0`/`h-screen`/`self-start` nos **dois** estados, e o guarda estendido para `className` dinâmico, com âncora e sensor | `AdminLayout.test.tsx:312-317` — `expect(aside).toContain('sticky'|'top-0'|'h-screen'|'self-start')` · dois estados: `:326-327` — `toContain('w-14')` e `toContain('w-60')` · âncora: `:304-306` — `expect(classesDe('aside')).not.toBe('')` · **Sensor A** `:364-368`, **Sensor B** `:386-394`, **Sensor C** `:396-405` — `expect(classesDe('aside', '<aside className={classes}>')).toBe('')` | ✅ |
| `FOCO-11` | Preferência de grupos colapsados continua valendo no expandido, e o trilho não a lê nem escreve | `navRail.test.ts:132-134` — chaves literais e distintas · `:151` — `expect(chavesTocadas).not.toContain(CHAVE_DOS_GRUPOS)` · `:153` — o valor guardado segue intacto · na tela real: `AdminLayout.test.tsx:239-244` — `Catálogo` com `aria-expanded='false'` depois de expandir o trilho, e `localStorage` intocado | ✅ |

### H2 · P1 — As larguras e a altura

| AC | Resultado que a spec define | `file:line` + asserção | Veredito |
| --- | --- | --- | --- |
| `FOCO-12` | `/admin/home` em `lg+` ⇒ coluna de **440px**, palco com o restante | `apps/backoffice/src/pages/admin/AdminHomePage.test.tsx:150` — `expect(grade.className).toContain('lg:grid-cols-[440px_minmax(0,1fr)]')` (pelo DOM) · do disco, com âncora: `:590-593` — `expect(grade).not.toBe('')` + `expect(grade).toContain('lg:grid-cols-[440px_minmax(0,1fr)]')` | ✅ |
| `FOCO-13` | `/admin/menu` em `lg+` ⇒ altura de tela, coluna esquerda rolando dentro de si, palco parado | `apps/backoffice/src/pages/admin/AdminMenuPage.test.tsx:722` — `expect(alturaDe(fonteMenu)).toBe(alturaDe(fonteHome))` (as **duas** páginas lidas do disco) · `:735-739` — `toContain('lg:overflow-y-auto')`, `toContain('min-h-0')`, `toContain('min-w-0')` · âncora `:717-720` · sensor `:743-745` | ⚠️ (ver gap 5) |
| `FOCO-14` | Trilho expandido ⇒ coluna fica 440 e o palco encolhe; nenhuma das páginas lê o trilho | `AdminHomePage.test.tsx:604-606` — `expect(fonte).not.toContain('admin-layout')`, `not.toContain('useNavRail')`, `not.toContain('isFocusRoute')` | ✅ |

### H3 · P1 — A prévia em tela cheia

| AC | Resultado que a spec define | `file:line` + asserção | Veredito |
| --- | --- | --- | --- |
| `FOCO-15` | Controle rotulado "Tela cheia" na barra dos **dois** palcos | `apps/backoffice/src/features/home-composition/ui/HomeLivePreview.test.tsx:169` e `apps/backoffice/src/features/store-menu/ui/MenuLivePreview.test.tsx:305` — `expect(screen.getByRole('button', { name: 'Tela cheia' })).toBeInTheDocument()` · sem loja não é oferecido: `HomeLivePreview.test.tsx:150` e `MenuLivePreview.test.tsx:288` — `expect(screen.queryByRole('button', { name: 'Tela cheia' })).toBeNull()` | ✅ |
| `FOCO-16` | Tela cheia + computador ⇒ quadro de **1024px** e escala **exatamente 1** | `packages/core/src/home/__tests__/preview.test.ts:174-175` — `expect(frame.width).toBe(1024)` e `expect(frame.scale).toBe(1)` | ⚠️ **gap 2** — provado em `core`, **não** no que renderiza |
| `FOCO-17` | Altura = espaço vertical disponível, nunca < 768; a métrica imprime a altura **usada** | `preview.test.ts:179` — `expect(previewFrame('desktop', { width: 1440, height: 988 }, true).height).toBe(948)` · piso `:183-187` — palco de 600 devolve `{ width: 1024, height: 768, scale: 1 }` · `NaN` `:190-194` · métrica `:267-268` — `expect(previewMetrics(previewFrame('desktop', { width: 1440, height: 988 }, true))).toBe('1024 × 948 · 100%')` | ⚠️ **gap 2** |
| `FOCO-18` | Celular em qualquer modo ⇒ 390 × 844, sem esticar | `preview.test.ts:235` — `expect(previewFrame('mobile', box, true)).toEqual(previewFrame('mobile', box, false))` · `:239-243` — palco de 1920×1600 devolve `{ 390, 844, 1 }` | ✅ |
| `FOCO-19` | `Esc` **e** o controle de sair voltam ao normal | botão: `HomeLivePreview.test.tsx:189` / `MenuLivePreview.test.tsx:325` — `expect(palco()).not.toHaveAttribute('data-fullscreen')` · `Esc` pelo componente real: `HomeLivePreview.test.tsx:199` / `MenuLivePreview.test.tsx:334` · no hook: `apps/backoffice/src/shared/lib/useFullscreenStage.test.ts:56`, e "só ele" `:75` | ⚠️ **gap 1** (o desmonte) |
| `FOCO-20` | Clique num bloco em tela cheia ⇒ **sai do modo E** abre o editor | `HomeLivePreview.test.tsx:249-250` — `expect(onSelect).toHaveBeenCalledWith('a')` **e** `expect(palco()).not.toHaveAttribute('data-fullscreen')`, na mesma asserção-par | ✅ |
| `FOCO-21` | Ligar/desligar a tela cheia **não** remonta o `<iframe>` | `HomeLivePreview.test.tsx:214-217` / `MenuLivePreview.test.tsx:347-350` — `expect(durante).toBe(antes)`, `expect(depois).toBe(antes)` (identidade de **nó**), `expect(depois?.getAttribute('src')).toBe(endereco)` | ✅ |
| `FOCO-22` | É um **modo** do palco, não um segundo componente; `previaUnica` sem afrouxar | `apps/backoffice/src/features/home-composition/__tests__/previaUnica.test.ts:298-299` — `expect(previasEm(UI)).toEqual(['HomeLivePreview.tsx'])` e `expect(previasEm(MENU_UI)).toEqual(['MenuLivePreview.tsx'])` · `:316-319` — `expect(comIframe).toEqual([os dois palcos])` e um `<iframe` por palco · sem ramificação por tipo `:331-333` · sem moldura local `:341` — `expect(fonte).not.toMatch(/'[^']*\bfixed inset-0\b/)` · **sensor com `mkdtemp` real** `:345-368`. Nenhuma asserção anterior foi removida (o arquivo só ganhou linhas — `git diff` mostra 91 inserções e 1 alteração de import) | ✅ |

### H4 · P2 — A lista de seções sem lixeira

| AC | Resultado que a spec define | `file:line` + asserção | Veredito |
| --- | --- | --- | --- |
| `FOCO-23` | Nenhuma lixeira permanente na linha | `apps/backoffice/src/features/home-composition/ui/HomeSectionList.test.tsx:195-198` — `expect(screen.queryByLabelText(/^Remover /)).toBeNull()` e, por linha, `queryByTestId('remover-<id>')` nulo | ✅ |
| `FOCO-24` | Hover **ou** foco revelam o `⋯`, e ele é tabulável independentemente do hover | classes: `HomeSectionList.test.tsx:222-225` — `toContain('opacity-0')`, `toContain('group-hover:opacity-100')`, `toContain('group-focus-within:opacity-100')`, `not.toContain('hidden')` · foco sem hover `:208-211` | ⚠️ (ver gap 6) |
| `FOCO-25` | O `⋯` oferece **Remover**, com o mesmo texto de confirmação e o mesmo `deleteSection` | `HomeSectionList.test.tsx:234-235` — `expect(props.onRemove).toHaveBeenCalledTimes(1)` e `toHaveBeenCalledWith('newsletter')` · confirmação intacta: `AdminHomePage.test.tsx:496-497` — `expect(confirm.mock.calls[0][0]).toContain('Newsletter')` e `toContain('itens escolhidos')` · caminho: `:467` — `expect(hook.deleteSection).toHaveBeenCalledWith('newsletter')` | ✅ |
| `FOCO-26` | "Remover esta seção da Home" no rodapé do editor, mesmo caminho | `AdminHomePage.test.tsx:507-509` — clique em `remover-secao-do-editor` na **PÁGINA real** (`renderPage('/admin/home/newsletter')`) ⇒ `expect(hook.deleteSection).toHaveBeenCalledWith('newsletter')` · confirmação idêntica `:518-520` | ✅ |
| `FOCO-27` | Recusa do banco ⇒ a mensagem exibida é **a do banco** | `AdminHomePage.test.tsx:523-535` — `hook.deleteSection.mockResolvedValueOnce({ message: doBanco })` ⇒ `expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ description: doBanco, variant: 'destructive' }))` | ✅ |

### H5 · P2 — O editor da entrada num lugar só

| AC | Resultado que a spec define | `file:line` + asserção | Veredito |
| --- | --- | --- | --- |
| `FOCO-28` | Os três editores num **único** card com abas Painel · Banners · Ícone, na coluna esquerda | `apps/backoffice/src/features/store-menu/ui/MenuEntryEditor.test.tsx:66-70` — `expect(getAllByRole('tab').map(…)).toEqual(['Painel','Banners','Ícone'])` · na página real: `apps/backoffice/src/pages/admin/AdminMenuPage.test.tsx:523-528` (mesma igualdade, dentro de `editor-da-entrada`) | ✅ |
| `FOCO-29` | Coluna da direita só com o palco | `AdminMenuPage.test.tsx:535-538` — `within(direita).getByTestId('palco-previa-menu')` presente, `queryByTestId('editor-da-entrada')` e `queryByRole('tab')` **nulos** · o card na esquerda `:544` · fio do `onIcon` dentro do card: `MenuEntryEditor.test.tsx:108` — `expect(props.onIcon).toHaveBeenCalledWith(null)` | ✅ |
| `FOCO-30` | Trocar entrada **ou** dispositivo ⇒ aba volta para Painel | `MenuEntryEditor.test.tsx:129` (entrada) e `:149` (dispositivo) — `expect(aba('Painel')).toHaveAttribute('aria-selected', 'true')`, em casos separados · inicial `:75` | ✅ |
| `FOCO-31` | Sem entrada ⇒ `sem-entrada-selecionada` no lugar do card | `AdminMenuPage.test.tsx:603-604` — `getByTestId('sem-entrada-selecionada')` presente **e** `queryByTestId('editor-da-entrada')` nulo | ✅ |
| `FOCO-32` | A aba Banners conta da **mesma** leitura do editor, sem contagem paralela | `MenuEntryEditor.test.tsx:183` — `expect(getByTestId('contagem-de-banners')).toHaveTextContent(String(bannersGravados(comBanners.menu_banners, 'desktop').length))` · por superfície `:165,170` · sem contagem paralela `:192-196` — `expect(fonte).toContain('bannersGravados(')`, `not.toMatch(/menu_banners\s*(?:\?\.|\[)/)`, `not.toContain('menuBannerSlots')` | ✅ |

### H6 · P2 — O aviso de gravação onde se clica

| AC | Resultado que a spec define | `file:line` + asserção | Veredito |
| --- | --- | --- | --- |
| `FOCO-33` | "Salvando…" no cabeçalho, ao lado do alternador de dispositivo — não no rodapé | `AdminMenuPage.test.tsx:558-563` — `expect(aviso).toHaveTextContent('Salvando…')`, `expect(aviso.closest('[data-testid="superficie-desktop"]')).toBeNull()`, `expect(aviso.parentElement?.querySelector('[data-testid="superficie-desktop"]')).not.toBeNull()` · nada no fim do documento `:594-596` — `expect(paragrafos).toEqual([])` | ✅ |
| `FOCO-34` | Terminada a gravação, o aviso some sem deixar espaço reservado | `AdminMenuPage.test.tsx:580` — `await waitFor(() => expect(screen.queryByTestId('salvando')).toBeNull())` (**ausência do nó**, não classe de invisibilidade) | ✅ |

### H7 · P2 — As abas Entradas / Prévia no celular

| AC | Resultado que a spec define | `file:line` + asserção | Veredito |
| --- | --- | --- | --- |
| `FOCO-35` | Abaixo de `lg` existe o alternador, e só a coluna escolhida aparece | `AdminMenuPage.test.tsx:620-621` — `expect(abas.map(a => a.textContent)).toEqual(['Entradas','Prévia'])` · troca de coluna `:648-653` — `expect(getByTestId('coluna-previa-menu').className).not.toContain('hidden')` e `expect(getByTestId('coluna-entradas').className).toContain('hidden lg:flex')`, e a volta | ✅ |
| `FOCO-36` | A partir de `lg` o alternador **não** existe | `AdminMenuPage.test.tsx:628` — `expect(screen.getByTestId('abas-vista').className).toContain('lg:hidden')` | ✅ |
| `FOCO-37` | Dispositivo = pílula com fundo; vista = barra sublinhada sem fundo de pílula | `AdminMenuPage.test.tsx:681-684` — `expect(ehPilulaSegmentada(dispositivo.className)).toBe(true)`, `expect(ehBarraSublinhada(vista.className)).toBe(true)`, `expect(ehPilulaSegmentada(vista.className)).toBe(false)` · **régua como predicado** (`:670-674`), chamada também pelo sensor `:687-698` · alvo ≥44 `:647` — `toMatch(/(?:^|\s)min-h-11(?![-\w])/)` | ✅ |

**Cobertura: 37 de 37.** Nenhuma AC ficou sem `file:line`.

### Edge cases da spec

| Edge case | Evidência | Veredito |
| --- | --- | --- |
| Trilho expandido, sai para `/admin/produtos` e volta | `AdminLayout.test.tsx:220-229` — preferência atravessa as duas navegações | ✅ |
| Estreitar de `lg` para abaixo de `md` | `AdminLayout.test.tsx:328-329` (`hidden md:block` declarado). jsdom não mede viewport | ⚠️ proxy de forma |
| Tela cheia ativa + navegar para outra rota ⇒ o modo termina | **sem `file:line`** — nenhum caso desmonta o palco em tela cheia e verifica que o ouvinte saiu | ❌ **ver gap 1** |
| Seção aberta no editor é removida pelo `⋯` | sem caso novo; comportamento pré-existente (`emEdicao` cai na lista) | ⚠️ não coberto, e não regrediu |
| Sem `VITE_STORE_URL` ⇒ `previa-sem-loja` e **sem** tela cheia | `HomeLivePreview.test.tsx:150` · `MenuLivePreview.test.tsx:288` | ✅ |
| Entrada selecionada sai da barra por troca de dispositivo | `AdminMenuPage.tsx:127-129` (`useEffect` sobre `surface`), coberto pelos casos `NAV-37` pré-existentes | ✅ |

---

## 2. Sensor de discriminação — 18 mutantes

Cada mutação foi injetada **uma por vez**, com cópia do arquivo guardada em
`…/scratchpad/bak/` antes e restaurada depois; a suíte relevante foi rodada isolada
(`pnpm --filter @estrelinha/<ws> exec vitest run <arquivo>`).

| # | Arquivo alvo | Mutação | Suíte rodada | Resultado |
| --- | --- | --- | --- | --- |
| M1 | `packages/core/src/home/preview.ts:214` | `scale: 1` → `scale: 0.9` na tela cheia | core `preview.test.ts` | ✅ **killed** (5 ✗) |
| M2 | `packages/core/src/home/preview.ts:213` | piso de altura invertido (`>` → `<`, equivalente a `Math.min`) | core `preview.test.ts` | ✅ **killed** (5 ✗) |
| M3 | `admin-layout/model/navRail.ts:51` | `storage.removeItem(KEY)` → `storage.setItem(KEY, 'recolhido')` | `navRail.test.ts` + `AdminLayout.test.tsx` | ✅ **killed** (2 ✗, um em cada arquivo) |
| M4 | `admin-layout/model/navRail.ts:59` | `focus && !expandido` → `!expandido` | idem | ✅ **killed** (11 ✗) |
| M5 | `admin-layout/ui/NavRail.tsx:37` | remover `aria-label={item.label}` dos destinos | `NavRail.test.tsx` + `AdminLayout.test.tsx` | ✅ **killed** (1 ✗) |
| M6 | `admin-layout/ui/NavRail.tsx:40` | remover `w-11` da caixa clicável | `NavRail.test.tsx` | ✅ **killed** (1 ✗) |
| **M7** | `shared/lib/useFullscreenStage.ts:37` | **remover `return () => window.removeEventListener('keydown', aoTeclar)`** | `useFullscreenStage.test.ts` + os dois palcos | ❌ **SURVIVED** (52 ✓) |
| M8 | `shared/lib/useFullscreenStage.ts:34` | `evento.key === 'Escape'` → `true` | idem | ✅ **killed** (1 ✗) |
| M9 | `home-composition/ui/HomeSectionRow.tsx` | `opacity-0 … group-focus-within:opacity-100` → `hidden group-hover:flex` | `HomeSectionList.test.tsx` + `AdminHomePage.test.tsx` | ✅ **killed** (1 ✗) |
| M10 | `store-menu/ui/MenuEntryEditor.tsx:50` | remover `key={`${surface}:${host.id}`}` do `<Tabs>` | `MenuEntryEditor.test.tsx` + `AdminMenuPage.test.tsx` | ✅ **killed** (2 ✗ — os dois casos de `FOCO-30`) |
| M11 | `pages/admin/AdminMenuPage.tsx` | remover `lg:hidden` do alternador de vista | `AdminMenuPage.test.tsx` | ✅ **killed** (1 ✗) |
| M12 | `admin-layout/ui/AdminLayout.tsx` | **apagar `<NavRail/>` da árvore** (`recolhido ?` → `false ?`) | `AdminLayout.test.tsx` | ✅ **killed** (7 ✗) |
| M13 | `pages/admin/AdminHomePage.tsx:283` | **apagar `onRemove={handleRemove}` do `<HomeSectionEditor/>`** | `AdminHomePage.test.tsx` | ✅ **killed** (3 ✗) |
| M14 | `home-composition/ui/HomeLivePreview.tsx:54` | remover o `sair()` de `selecionar` (`FOCO-20` vira só "abre o editor") | `HomeLivePreview.test.tsx` | ✅ **killed** (1 ✗) |
| M15 | `pages/admin/AdminMenuPage.tsx` | **apagar `<MenuEntryEditor/>` da página** | `AdminMenuPage.test.tsx` | ✅ **killed** (11 ✗) |
| M16 | `pages/admin/AdminMenuPage.tsx` | remover `min-h-0` da `coluna-entradas` | `AdminMenuPage.test.tsx` | ✅ **killed** (1 ✗) |
| **M17** | `home-composition/ui/HomeLivePreview.tsx:79` | **ignorar `frame.height`**: `const height = PREVIEW_DEVICES[device].height` | `HomeLivePreview.test.tsx` + `folgaDoPalco.test.ts` | ❌ **SURVIVED** (26 ✓) |
| M18 | `store-menu/ui/MenuLivePreview.tsx` | reintroduzir `const FOLGA = 40` no fim do arquivo | `folgaDoPalco.test.ts` | ✅ **killed** (1 ✗) |

**16 killed · 2 survived.**

### Mutante sobrevivente 1 — o ouvinte de `Escape` pode vazar

`apps/backoffice/src/shared/lib/useFullscreenStage.ts:37`. Apagar a função de limpeza do `useEffect`
deixa **52 testes verdes**. O caso que existe para provar isso é
`apps/backoffice/src/shared/lib/useFullscreenStage.test.ts:78-86`, e a asserção dele é:

```ts
expect(() => teclar('Escape')).not.toThrow()
```

Em React 18 chamar `setState` num componente desmontado **não lança e não avisa** — a asserção é
verdadeira com e sem a limpeza. O próprio `tasks.md` (T10) escreve a régua certa e o teste só
implementa metade dela: *"provado por `Escape` depois do unmount não lançar **nem chamar nada**"*.
A metade "nem chamar nada" não tem asserção nenhuma.

**Consequência real**: cada montagem de palco em tela cheia que fosse desmontada (navegar de
`/admin/home` para outra rota com o modo ligado — o edge case *"a tela cheia termina junto com a
tela"*) deixaria um `keydown` órfão em `window`. Não quebra nada visível, e é exatamente por isso
que passaria.

**Conserto sugerido** (não aplicado): espiar `window.removeEventListener` e asserir que ele foi
chamado com `'keydown'` e **o mesmo handler** que `addEventListener` recebeu; ou contar ouvintes
antes/depois do `unmount`.

### Mutante sobrevivente 2 — o quadro que a tela renderiza não é medido

`apps/backoffice/src/features/home-composition/ui/HomeLivePreview.tsx:79`. Trocar

```ts
const { width, height, scale: escala } = frame
```

por `const { width, scale: escala } = frame; const height = PREVIEW_DEVICES[device].height` deixa
**26 testes verdes** — inclusive `folgaDoPalco.test.ts`, que só cobra que `previewFrame(` seja
chamada e `previewScale` não.

Com essa mutação, em 1440 a barra imprimiria `1024 × 948 · 100%` e o `<iframe>` seria renderizado com
**768** de altura. `FOCO-16` e `FOCO-17` estão provados com valores exatos em
`packages/core/src/home/__tests__/preview.test.ts`, mas **nunca na superfície que desenha**.

A causa é estrutural e está declarada no próprio arquivo de teste: jsdom não implementa
`ResizeObserver`, então `caixa` fica `{0,0}` em todo caso de componente — e aí a altura de tela cheia
coincide com o piso de 768, tornando os dois modos indistinguíveis. O par
`HomeLivePreview.test.tsx:225-230` ("a métrica vem de `previewFrame`") assere **o mesmo texto**
antes e depois de entrar em tela cheia, e por isso não discrimina.

**Conserto sugerido** (não aplicado): injetar um `ResizeObserver` de mentira no `setup` do teste que
entregue uma caixa não nula, e asserir `expect(quadro()).toHaveAttribute('height', String(previewFrame('desktop', caixa, true).height))`;
ou, em falta disso, uma régua que leia o fonte e cobre que `width`/`height` do `<iframe>` venham de
`frame` e de mais nada.

---

## 3. Modos de falha que este repositório já pagou — varredura dirigida

| Modo de falha | Resultado |
| --- | --- |
| **Teste que monta a própria árvore** (lição da `44`) | **Nenhum.** `AdminLayout.test.tsx:15-23` (`renderEm`) monta o `AdminLayout` real dentro do router; `AdminHomePage.test.tsx:117-125` e `AdminMenuPage.test.tsx` montam as páginas reais. Provado empiricamente: M12, M13 e M15 — as três fiações — foram **killed** |
| **Guarda que lê disco sem âncora de contagem** | **Nenhum.** `folgaDoPalco.test.ts:50` (`> 100` arquivos) **e** `:52-56` (os dois palcos por nome) · `NavRail.test.tsx:101` · `AdminHomePage.test.tsx:591-592` · `AdminMenuPage.test.tsx:718-719` · `AdminLayout.test.tsx:304-306` |
| **Âncora que pode medir string vazia** | **Consertado nesta feature, e é a melhor entrega dela.** `classesDe` era cega a `className={cn(…)}`; o Sensor C (`AdminLayout.test.tsx:396-405`) prova que uma sintaxe ilegível devolve `''` e derruba a âncora. O mesmo cuidado se repete em `AdminMenuPage.test.tsx:734` (`expect(coluna).not.toBe('')`) |
| **Régua que procura menção em vez de declaração** | **Tratada.** `semComentarios` com `[^\n\r]` (linha e bloco na mesma passada, `BL-027`) em `folgaDoPalco.test.ts:32-33`, `NavRail.test.tsx:128-129`, `MenuEntryEditor.test.tsx:190`, `HomeLivePreview.test.tsx:264`. Sensores de CRLF/LF em `NavRail.test.tsx:144-149` e `folgaDoPalco.test.ts:82-88` |
| **`toContain` por substring onde o token exato importa** | **Tratado onde importa** (`NavRail.test.tsx:106` — `tokenExato` com `(?![-\w])`, e o comentário nomeia `min-h-11`; `AdminMenuPage.test.tsx:647`). **Uma exceção**: `AdminLayout.test.tsx:326-329` usa `toContain('w-14')`/`toContain('w-60')`/`toContain('hidden')` cru. Baixo risco no arquivo atual, mas é a régua do projeto sendo aplicada em dois padrões diferentes no mesmo repositório |
| **Asserção que passaria sob uma implementação plausível errada** | **4 encontradas** — ver gaps 4, 6, 7 e 8 abaixo. Nenhuma abre buraco de AC (todas têm vizinha que discrimina), mas todas são verdes sobre nada |

---

## 4. Gates

Um workspace por vez, exit code capturado **fora de pipe**.

```
pnpm --filter @estrelinha/backoffice test
  Test Files  1 failed | 128 passed (129)
       Tests  1 failed | 2196 passed (2197)
  exit=1
```

A única reprova é `src/features/faq-library/ui/FaqEditorDialog.test.tsx:126` — `Expected "0 / 600",
Received "0 / 4000"`. **É exatamente a herdada da `46`** (`FAQ_ANSWER_MAX` subiu em
`packages/core/src/faq/faq.ts` e o literal do teste ficou para trás). Não tocada.

> **Uma primeira execução acusou 3 reprovas**, e as duas extras eram a flake documentada:
> `CategoryInspector.test.tsx:250` e `SlugField.test.tsx:342`, os dois com
> `Error: Test timed out in 5000ms` — testes que **varrem disco**, rodando enquanto havia outra carga
> na máquina. A segunda execução da suíte inteira, sozinha, devolveu **1 reprova e 2196 passando**.
> É a mesma lição que o `CLAUDE.md` já registra desde a `34`/`35`: *timeout de 5s em teste que varre
> disco, sob carga, não é defeito — repita o workspace sozinho.*

```
pnpm --filter @estrelinha/core test
  Test Files  84 passed (84)
       Tests  2199 passed (2199)
  exit=0

pnpm --filter @estrelinha/functions test          (remedido, não tocado pela feature)
  Test Files  1 failed | 7 passed (8)
       Tests  1 failed | 435 passed (436)
  exit=1
```

A reprova de functions é `functions/sitemap/__tests__/handlers.test.ts` — **exatamente a herdada**
(`toHaveLength(10)` recebendo 11, por causa de `/perguntas-frequentes` da `46`).

**Nenhuma terceira reprova apareceu.** As duas herdadas continuam sendo as duas.

```
npx tsc --noEmit -p apps/backoffice/tsconfig.app.json    →  exit=0, 0 erros
npx tsc --noEmit -p apps/store/tsconfig.app.json         →  exit=2, 5 erros
```

Os 5 do store são **todos herdados** — `apps/store/**` não tem uma linha alterada nesta feature
(`git status --short`). Mas só **um** deles está documentado (ver gap 9).

`packages/core/src/payment/**`: **sem uma linha alterada** — o diff de `packages/core` toca
exclusivamente `src/home/preview.ts` e `src/home/__tests__/preview.test.ts`.

---

## 5. Integridade da árvore

`git status --short` no fim da verificação é **idêntico** ao do início nos 34 arquivos de código e
spec, com os mesmos números de `git diff --stat` (previaUnica 91, HomeLivePreview.test 123,
HomeLivePreview.tsx 59, HomeSectionEditor 29, HomeSectionList.test 77, HomeSectionRow 52, index.ts 1,
MenuBannerEditor 13, MenuLivePreview.test 78, MenuLivePreview.tsx 47, AdminHomePage.test 130,
AdminHomePage.tsx 13, AdminMenuPage.test 256, AdminMenuPage.tsx 118, AdminLayout.test 191,
AdminLayout.tsx 53, preview.test 132, preview.ts 80). Todas as 18 mutações foram desfeitas.

> **Três arquivos de documentação apareceram na árvore DURANTE esta verificação** e não estavam no
> `git status` de abertura: `CLAUDE.md`, `apps/backoffice/CLAUDE.md` e `.specs/STATE.md` (a T19). São
> o fecho documental da própria feature, escrito por outra sessão na **mesma working tree** —
> a segunda ocorrência do padrão que a `45` registrou. Esta verificação **não os tocou**, e as
> medidas acima são de código, não de documento.

---

## 6. Lacunas — ranqueadas

| # | Gravidade | Lacuna | `file:line` |
| --- | --- | --- | --- |
| 1 | **Alta** | **Mutante sobrevivente**: apagar a limpeza do `useEffect` não reprova. O único caso que cobre o desmonte assere `not.toThrow()`, que é verdade nos dois mundos em React 18 — e a metade "nem chamar nada" que a T10 escreveu nunca virou asserção. É também o único caminho do edge case *"a tela cheia termina junto com a tela"* | `apps/backoffice/src/shared/lib/useFullscreenStage.test.ts:85` · alvo `apps/backoffice/src/shared/lib/useFullscreenStage.ts:37` |
| 2 | **Alta** | **Mutante sobrevivente**: o componente pode ignorar `frame.height` e renderizar o `<iframe>` a 768 enquanto a barra imprime 948, com a suíte verde. `FOCO-16`/`FOCO-17` estão provados **só** em `core`. Em jsdom `caixa` é `{0,0}`, então o par de asserções da métrica (`:225-230`) mede o **mesmo texto** nos dois modos e não discrimina | `apps/backoffice/src/features/home-composition/ui/HomeLivePreview.test.tsx:225-230` · alvo `apps/backoffice/src/features/home-composition/ui/HomeLivePreview.tsx:79` (e o gêmeo em `MenuLivePreview.tsx:78`) |
| 3 | Média | `FOCO-09` mede a caixa clicável filtrando **pelo que ela mede** (`filter(classe => classe.includes('h-11'))`): um terceiro controle declarado com `h-9` não entra na lista — a âncora `toHaveLength(2)` o pega hoje, mas a régua responde "quantas caixas de 44 existem", não "toda caixa clicável tem 44" | `apps/backoffice/src/widgets/admin-layout/ui/NavRail.test.tsx:111,113` |
| 4 | Média | Sensor **tautológico**: `expect(antiga).not.toContain('lg:grid-cols-[440px_minmax(0,1fr)]')` compara dois literais escritos no próprio caso e **não chama** o extrator `grade` que a asserção usa. Régua que o sensor não chama não é sensor (é a lição que `FOCO-37`, no arquivo vizinho, aplica corretamente com predicado) | `apps/backoffice/src/pages/admin/AdminHomePage.test.tsx:598` |
| 5 | Média | `FOCO-13` ("o palco SHALL permanecer visível sem rolar com ela") é provado **só por classe declarada** — jsdom devolve 0 para layout. Somado ao `11rem` que a própria T9 marca como **suposição** de altura de cabeçalho, a AC depende de prova em navegador que ainda não existe (1024 e 1440) | `apps/backoffice/src/pages/admin/AdminMenuPage.test.tsx:735-739` |
| 6 | Baixa | `FOCO-24` "alcançável por `Tab`" é **proxy, não medida**: jsdom não aplica CSS, então `tabIndex >= 0` e `toHaveFocus()` continuariam verdes com `hidden`/`display:none`. Quem realmente discrimina é o caso de classe das linhas 219-225 (foi ele que matou M9) — o caso de foco passa a impressão de medir o que não mede | `apps/backoffice/src/features/home-composition/ui/HomeSectionList.test.tsx:208-211` |
| 7 | Baixa | Asserção **tautológica**: `expect(/Preview/.test('MenuEntryEditor.tsx')).toBe(false)` testa um literal digitado no próprio caso, não o nome do arquivo em disco. A régua de verdade está em `previaUnica.test.ts`, então não há buraco — mas este caso conta como cobertura sem cobrir nada | `apps/backoffice/src/features/store-menu/ui/MenuEntryEditor.test.tsx:204` |
| 8 | Baixa | Asserção **superficial**: `expect(getByTestId('editor-da-entrada')).toHaveTextContent('Leite materno')` para provar que a aba Ícone monta o seletor — o `<h2>` do card já renderiza esse mesmo nome, então ela passa com o `MenuIconPicker` apagado. Discriminado só pelo vizinho `:108` | `apps/backoffice/src/features/store-menu/ui/MenuEntryEditor.test.tsx:95` |
| 9 | Baixa | **Baseline de tipos do store subdeclarada**: `tasks.md` e o `CLAUDE.md` dizem *"store 1 → 1 (o erro herdado da `46`)"*; o disco tem **5** — `FaqSubjectNav.tsx:33` **mais quatro** `TS2339` em `orderNotificationsSchema.test.ts:134,135,145,146`. Nenhum é desta feature (`apps/store` intocado), mas é a baseline velha do `CLAUDE.md` acontecendo de novo: a próxima feature compara contra folga que não existe | `apps/store/src/shared/lib/__tests__/orderNotificationsSchema.test.ts:134-146` |
| 10 | Baixa | **Contabilidade da tabela "Onde os testes nasceram"**: os **totais por workspace batem** (2197/129 e 2199/84 medidos), mas quatro linhas por arquivo estão erradas — `preview.test.ts` diz `20 → 33` e é **24 → 37**; `AdminLayout.test.tsx` diz `20 → 34` e é **16 → 30**; `useFullscreenStage.test.ts` diz 7 e são **8**; `folgaDoPalco.test.ts` diz 6 e são **5**. Os deltas (+13, +14) estão certos — os extremos, não | `.specs/features/47-painel-em-foco/tasks.md` §*Onde os testes nasceram* |

---

## 7. O que esta feature entregou bem, e vale registrar

- **A régua do `<aside>` deixou de ter ponto cego, e o conserto veio com os três sensores certos.**
  `classesDe` casava só `className="literal"`; o primeiro refator para `cn()` teria feito a âncora
  medir **string vazia** e todas as asserções passarem sobre nada. O Sensor C prova que uma sintaxe
  ilegível ainda derruba a âncora — é o padrão que o repositório vinha pedindo desde a `fieldBorder`.
- **As três fiações foram provadas na árvore real, e as três mutações morreram.** Apagar
  `<NavRail/>`, `onRemove={handleRemove}` e `<MenuEntryEditor/>` reprovam com 7, 3 e 11 casos. É a
  lição da `44` aplicada antes de custar.
- **O dono único da folga tem guarda com âncora dupla e foi verificado por injeção real**: um
  `const FOLGA = 40` reintroduzido em `MenuLivePreview.tsx` reprova (M18).
- **`FOCO-37` escreve a régua como predicado e a chama pela asserção e pelo sensor** — o formato que
  a `41` e a `38` pagaram para aprender.

---

## 8. Pendências de navegador (não são lacuna de teste — são o que jsdom não mede)

Declaradas para o `STATE.md`, e nenhuma foi feita:

1. **1440 com o trilho recolhido**: conferir coluna 440 / palco 872, e a métrica lendo `1024 × 768 · 81%`.
2. **Tela cheia**: `1024 × <altura> · 100%` com a prévia **sem piscar** ao sair por `Esc`.
3. **O `11rem` de `/admin/menu`** (T9): é suposição de altura de cabeçalho, e os dois `PageHeader`
   têm subtítulos de comprimentos diferentes. Medir em 1024 **e** 1440 — um subtítulo que embrulhe
   em duas linhas estoura a viewport.
4. **768–1023**: o trilho é a única navegação nessa faixa, e `A-03` a declarou território de dedo.
   Conferir os 44px reais.
5. **390**: os dois alternadores de `/admin/menu` empilhados, com formas diferentes, sem rolagem
   horizontal do body.
6. **Dívida declarada em *Out of Scope*, não tocada**: o estado de falha do `<iframe>` (não carregou,
   recusou enquadrar) continua sem tratamento, e a tela cheia **amplia a superfície** dele.
