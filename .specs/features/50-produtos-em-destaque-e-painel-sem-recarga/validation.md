# Feature 50 — Produtos em destaque, e o painel que não recarrega · Validação

**Data**: 2026-09-14
**Spec**: `.specs/features/50-produtos-em-destaque-e-painel-sem-recarga/spec.md`
**Rodada**: **3 de 3 — a última permitida** (a `1` reprovou com 5 lacunas; a `2` reprovou por **uma**
linha; o orquestrador a fechou)
**Superfície de diff**: working tree contra `HEAD` = `6c362bd` — **58 entradas** em
`git status --porcelain`, índice vazio, nada commitado.
**Verificador**: agente independente. **Autor ≠ verificador** — não escrevi o código, não escrevi o
conserto e não participei do planejamento.

> **Rodada ESTREITA, e o escopo está declarado.** As 44 ACs já foram derivadas do zero em duas
> rodadas, com `file:line` + expressão, e o registro delas está preservado abaixo. Esta rodada mede
> **o gap remanescente**, o **efeito colateral** do conserto, a **edição de documentação** que o
> acompanhou, o **gate completo** dos cinco workspaces e um **sensor novo de quatro mutações**, três
> delas em arquivos que nenhuma rodada anterior tinha mutado.
>
> **Superfície desta rodada, medida e não suposta.** `find -newer` sobre o laudo da rodada 2 devolve
> **três** arquivos:
>
> ```
> apps/backoffice/src/pages/admin/AdminHomePage.test.tsx   (o conserto)
> apps/backoffice/src/pages/admin/AdminHomePage.tsx        (só mtime — conteúdo intacto, provado abaixo)
> CLAUDE.md                                                (baseline + a armadilha do `--`)
> ```

---

## Veredito

# ✅ PASS

**O mutante que segurava a rodada 2 está MORTO.** Reinjetei M14 eu mesmo, no arquivo real, e a suíte
do painel reprova. **44 de 44 ACs** com valor asserido = valor da spec (eram 42). O gate está limpo
nos cinco workspaces, `tsc` em 0·0, lint na baseline, `pnpm build` verde nos dois apps, e as
**4 mutações desta rodada foram todas mortas** — 3 delas em arquivos virgens de sensor.

Fica **uma imprecisão de documentação, Trivial e não bloqueante**: a linha de baseline do `CLAUDE.md`
**bate com o medido**, mas a prosa do delta logo abaixo dela **não fecha a conta** (Parte 3).

---

## Parte 1 — o gap da rodada 2: FECHADO

### O conserto

`apps/backoffice/src/pages/admin/AdminHomePage.test.tsx:977-1027` — um `describe` novo,
*"AdminHomePage — a gravação em curso APARECE no botão (VIV-04, ANI-01)"*, com **dois** casos.
`grep -c "Salvando" AdminHomePage.test.tsx` saiu de **0** para 4.

| Metade | `arquivo:linha` + expressão |
| --- | --- |
| a tela **diz** que está salvando, **onde se clicou** | `AdminHomePage.test.tsx:1009` — `expect(screen.getByTestId('botao-salvando')).toHaveTextContent('Salvando…')` |
| e as ações ficam **travadas** — é o que impede a segunda gravação do duplo clique | `:1010` — `expect(salvar()).toBeDisabled()`; `:1011` — `expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()` |
| a janela **fecha** quando a gravação responde | `:1017` — `expect(screen.queryByTestId('botao-salvando')).toBeNull()`, depois de `concluir(null)` |
| **o par em repouso** | `:1023` — `expect(screen.queryByTestId('botao-salvando')).toBeNull()`; `:1024` — `expect(salvar()).not.toBeDisabled()`; `:1026` — `expect(screen.getByTestId('rotulo-de-repouso').className).not.toContain('invisible')` |

**As asserções são não-rasas, e o motivo é estrutural**: o caso segura a gravação em voo
(`hook.updateSectionConfig.mockReturnValueOnce(new Promise(r => { concluir = r }))`, `:995-999`) e
cobra o botão **enquanto ela não respondeu** — que é exatamente a janela que a mutação apagava. Não
há `waitFor` engolindo o intervalo, e o `concluir` é do teste.

**E a árvore é a de verdade.** O que o arquivo dubla é o hook de dados e o palco da prévia
(`HomeLivePreview`); `AdminHomePage`, `HomeSectionEditor` e `FormPageHeader` são os componentes
reais. O fio medido — `saving` da página → `saving={saving}` na chamada do editor → `estadoDaGravacao`
do cabeçalho → o `<span data-testid="botao-salvando">` — atravessa três arquivos de produção sem um
dublê no meio. É a diferença que reprovou as features `41`, `44` e `49`: **quem monta a árvore é a
página, não o teste**.

### A mutação, reinjetada por mim

`AdminHomePage.tsx:359`, `saving={saving}` → `saving={false}`, por cópia de arquivo, conferida no
disco antes de rodar (`grep -n "saving={"` devolveu `359: saving={false}`).

```
 Test Files  1 failed | 139 passed (140)
      Tests  1 failed | 2538 passed (2539)

 FAIL  src/pages/admin/AdminHomePage.test.tsx > AdminHomePage — a gravação em curso APARECE no
       botão (VIV-04, ANI-01) > com a gravação no ar, o botão diz `Salvando…` e as ações ficam travadas
 TestingLibraryElementError: Unable to find an element by: [data-testid="botao-salvando"]
```

**1 caso reprova**, na suíte **inteira** do painel (exit 1). Na rodada 2 a mesma mutação deixava
2537/140 verde. Restaurado por `cp` e conferido por `diff -q` — `saving={saving}` de volta na 359.

### O par em repouso IMPEDE o mundo em que ele diz sempre — e isso foi medido, não deduzido

Injetei a mutação **inversa**, `saving={true}` na mesma linha, e rodei o arquivo:

```
      Tests  15 failed | 63 passed (78)
 × AdminHomePage — a gravação em curso APARECE no botão > em repouso o botão NÃO diz `Salvando…`,
   e o rótulo de repouso está à vista
```

O caso do par é o **segundo** da lista de reprovados — ele prende o mundo "diz sempre", que é
precisamente o buraco pelo qual uma asserção de presença passaria. (Os outros 14 caem porque o botão
fica permanentemente `disabled`; é ruído da mutação, não da régua.) **A asserção é verdadeira em um
mundo só**, provado nos dois sentidos. Restaurado e conferido por `diff -q`.

### `VIV-04` nas DUAS telas

> WHEN uma gravação está em curso THEN a tela SHALL dizer que está salvando **onde se clicou** e
> SHALL continuar mostrando os dados que já tinha.

| Tela | "diz que está salvando, onde se clicou" | "continua mostrando os dados que já tinha" |
| --- | --- | --- |
| `/admin/menu` | `AdminMenuPage.test.tsx:1021` — `expect(screen.getByTestId('salvando')).toHaveTextContent('Salvando…')`, com a escrita **em voo** (`updateCategory` presa num `Promise`), mais o par `:1023` — `expect(screen.queryByTestId('salvo')).toBeNull()` ("nunca os dois ao mesmo tempo") | a lista continua consultável durante a gravação (o `switchOf('personalizados')` que disparou continua no DOM), e `useAdminCategories.test.ts` prova que a revalidação **não liga `loading`** |
| `/admin/home` | **agora sim** — `AdminHomePage.test.tsx:1009-1011` (acima) | o editor **continua na tela em voo**: `salvar()` e `Cancelar` são encontrados por `getByRole` **depois** do clique e antes da resposta — se a árvore tivesse virado `<TableSkeleton/>`, os dois `getBy` lançariam. A metade "depois da gravação" é o `describe` de `VIV-01`/`VIV-03`/`VIV-12` (`:900-975`), por **identidade de nó** |

**Coberto nas duas.** Uma precisão que registro sem chamar de gap: em nenhuma das duas telas existe
uma asserção **dedicada** a "os dados continuam lá **durante**" — nas duas ela é consequência de os
`getBy*` do próprio caso resolverem em voo. É prova real (um `getBy` que não acha lança), só não é
prova **nomeada**. Com o mutante morto e a metade "diz onde se clicou" asserida por igualdade de
texto, não há mundo em que a AC seja falsa e a suíte verde.

---

## Parte 2 — efeito colateral do conserto: NENHUM

O conserto tocou **um** arquivo de teste. Medido:

| Medida | Rodada 2 | Rodada 3 | Como medi |
| --- | --- | --- | --- |
| casos em `AdminHomePage.test.tsx` | 76 | **78** | `vitest run src/pages/admin/AdminHomePage.test.tsx` → `78 tests`, exit 0 |
| linhas **removidas** contra `HEAD` no mesmo arquivo | 13 | **13** | `git diff HEAD -- … \| grep -cE "^-[^-]"` |

**As 13 removidas são exatamente as que a rodada 1 já auditou** — eu as li uma a uma: a linha de
`import`, a linha do mock de `useAdminProducts` (que ganhou `slug`/`is_active`), a assinatura do tipo
do dublê do palco, um `/>` de reindentação, e o bloco de 9 linhas do
`it('salvar grava o `config` da seção e volta para a lista')`, **virado e não apagado** (`VIV-05`).
**Zero linhas removidas nesta rodada** ⇒ nenhuma asserção vizinha foi enfraquecida, removida ou
reescrita: uma alteração apareceria como remoção, e não há nenhuma nova.

Os dois casos que existem a mais são **os dois do `describe` novo**. +2 no arquivo, +2 no workspace
(2537 → 2539).

**E o `AdminHomePage.tsx` NÃO foi editado nesta rodada, apesar do mtime novo.** O `find -newer` o
lista porque a rodada 2 o restaurou por cópia depois de escrever o laudo. Provei o conteúdo por
âncora de linha contra as citações da rodada 2: `setSalvo(false)` na **136**, `setSaving(true)` na
**200**, `setSaving(false)` dentro do `finally` (**216-217**), `saving={saving}` na **359** — as
quatro batem, e **nenhuma deslocou**, o que uma inserção teria produzido. As remoções contra `HEAD`
seguem em **6**.

**Integridade da árvore, conferida por diff contra os backups das rodadas anteriores**: dos nove
arquivos de produção que as rodadas 1 e 2 mutaram e guardaram em `scratchpad/bak`, **oito** estão
byte a byte idênticos ao disco. O nono, `useAdminHomeSections.ts`, difere — e li o diff inteiro: são
**as 31 linhas do conserto de `DST-13`** (a constante `CURADORIA_PERDIDA` e o ramo do `insert`
falho), acrescentadas **depois** daquele backup. **Nenhuma mutação ficou para trás.**

---

## Parte 3 — a edição do `CLAUDE.md`

### A baseline de testes: **BATE**

```
| **Testes** | **9377 em 486 arquivos** — store **3371/218** · backoffice **2539/140**
              · core **2356/92** · functions **599/13** · catalog-import 512/23 |
```

Medi os cinco, um por vez, com exit code fora de pipe, e os cinco batem **exatamente** — inclusive a
aritmética: 3371+2539+2356+599+512 = **9377**, e 218+140+92+13+23 = **486**. Ver o gate abaixo.

### A armadilha do `--`: **correta, e é registro que faltava**

O bloco novo (`CLAUDE.md:426-434`) descreve o que a rodada 2 mediu: `pnpm --filter <ws> test --
--testTimeout=20000` repassa o `--` literal ao vitest, o teto continua em 5000 ms, e a reprovação
aparece num arquivo alheio ao que se está medindo. **Confirmei as duas formas que funcionam** — usei
`pnpm --filter <ws> exec vitest run --testTimeout=20000` nas nove execuções desta rodada (cinco do
gate e quatro do sensor), e `grep -c "Test timed out in 5000ms"` devolve **0** em todos os logs, loja
e painel inclusive. A linha de comando da tabela de baselines também foi corrigida para a forma **sem
o `--`**. Coerente.

### ⚠️ O que NÃO fecha: a prosa do delta (Trivial, não bloqueante)

`CLAUDE.md:437-452` diz:

> **A feature `50` … somou +261 em três workspaces** … **backoffice +177/+4** …, **store +49/+3** …
> e **core +35/+1** … O delta acima é calculado sobre a **entrada medida** (core 2321/91 · store
> 3322/215 · backoffice 2345/136 · functions 599/13 · catalog-import 512/23 = 9099/478)

A conta não fecha, e é só na linha do painel:

| Workspace | entrada declarada | + delta declarado | = | medido hoje |
| --- | --- | --- | --- | --- |
| store | 3322/215 | +49/+3 | 3371/218 | **3371/218** ✅ |
| core | 2321/91 | +35/+1 | 2356/92 | **2356/92** ✅ |
| backoffice | 2345/136 | **+177**/+4 | **2522**/140 | **2539/140** ❌ |

**O delta verdadeiro do painel é +194, não +177**, e o total da feature é **+278, não +261**
(9099 + 278 = 9377, que é o número da tabela). Os 17 que faltam são **os 15 da rodada 2 e os 2 desta
rodada** — o número escrito é o da **rodada 1**, que envelheceu duas vezes enquanto o texto ficava
parado.

**Por que registro isto, sendo trivial**: a linha que o gate da feature `51` vai ler é a da **tabela
de baselines**, e ela está certa — o risco prático é zero. Mas este é o `CLAUDE.md` que escreve, na
mesma seção, *"meça com a árvore parada"* e *"some conferindo"*, e que registra **seis** features
seguidas encontrando baseline velha. Deixar uma soma que não fecha a dois parágrafos da tabela certa
é plantar a próxima leitura ambígua. **Conserto: trocar `+261` por `+278` e `+177/+4` por
`+194/+4`** — uma linha, e nenhuma medição nova é necessária.

---

## Gate

Cinco workspaces, **um por vez**, exit code capturado **fora de pipe**, com
`pnpm --filter <ws> exec vitest run --testTimeout=20000` na loja e no painel — a forma que **entrega**
a flag. Log completo conferido: **zero** `Test timed out in 5000ms` nos cinco.

| Workspace | Resultado | Exit code | `CLAUDE.md` | Bate? |
| --- | --- | --- | --- | --- |
| `@estrelinha/store` | **3371 em 218** | `0` | 3371/218 | ✅ |
| `@estrelinha/backoffice` | **2539 em 140** | `0` | 2539/140 | ✅ |
| `@estrelinha/core` | **2356 em 92** | `0` | 2356/92 | ✅ |
| `@estrelinha/functions` | **599 em 13** | `0` | 599/13 | ✅ |
| `@estrelinha/catalog-import` | **512 em 23** | `0` | 512/23 | ✅ |

**Total: 9377 em 486.** Delta rodada 2 → rodada 3: **backoffice +2**, os outros quatro **idênticos**
— coerente com a superfície de um arquivo de teste medida no topo.

| Outro gate | Resultado | Exit code |
| --- | --- | --- |
| `npx tsc --noEmit -p apps/store/tsconfig.app.json` | **0 erros** | `0` |
| `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` | **0 erros** | `0` |
| `pnpm lint` | **27 erros / 6 warnings** (backoffice 25/4 · store 2/2) — a baseline exata | `1` (pré-existente) |
| `pnpm build` | **verde nos dois apps** (store 1m05s, backoffice 1m14s) | `0` |

**`packages/core/src/payment/` sem uma linha alterada** — `git diff --name-only -- packages/core/src/payment` devolve **0** arquivos. ✅
**Zero migration nova** — `git status --porcelain` não lista `supabase/migrations/`. ✅

---

## Sensor de discriminação — rodada 3

**4 mutações de comportamento**, uma por vez, injetadas **no arquivo real** por cópia de arquivo
(`cp arquivo bak/` → editar → **conferir no disco** → rodar → `cp bak/arquivo arquivo` → `diff -q`).
**Nenhum** `git stash`, `git restore`, `git checkout --`, `git reset` ou `git clean` foi usado em
momento nenhum — a feature inteira vive na working tree, e nada dela está commitado.

Das quatro, **três estão em arquivos que nenhuma rodada anterior mutou** (as rodadas 1 e 2 cobriram
`AdminHomePage.tsx`, `useAdminHomeSections.ts`, `FormPageHeader.tsx`, `featured.ts`, `catalog.ts`,
`ProductPicker.tsx`, `ProductCarousel.tsx`, `FeaturedProducts.tsx`, `HomeSectionList.tsx`,
`sectionDraft.ts`, `useAdminCategories.ts` e `useAdminResolvedHome.ts`).

| # | Arquivo:linha | Mutação | Suíte | Resultado |
| --- | --- | --- | --- | --- |
| **M14'** | `AdminHomePage.tsx:359` | **o gap da rodada 2, reinjetado**: `saving={saving}` → `saving={false}` | backoffice cheia | ✅ **morta** — 1/2539 (`com a gravação no ar, o botão diz Salvando…`) |
| **M14ᵢ** | idem | o **inverso**: `saving={true}` — o mundo em que ele diz sempre | `AdminHomePage.test.tsx` | ✅ **morta** — 15/78, e o **par em repouso** está entre elas |
| **M15** | `useProductsByIds.ts:50` (loja) | `enabled: ids.length > 0` → `enabled: true` — a consulta sai com a curadoria vazia, `.in('id', [])`, uma ida ao banco garantida a não devolver nada | store cheia | ✅ **morta** — 1/3371 (`useProductsByIds — a lista vazia > sem ids a consulta NÃO sai`) |
| **M16** | `FeaturedProductsEditor.tsx:125` (painel) | **`DST-18`**: trocar de apresentação passa a **zerar a curadoria** (`onItemsChange([])` ao lado do `onConfigChange`) — a dona perderia doze escolhas ao tocar num botão de layout | backoffice cheia | ✅ **morta** — 1/2539 (`DST-18 — trocar de apresentação NÃO mexe na curadoria`) |
| **M17** | `resolve.ts:179` (`core`) | **`DST-20`**: o ramo `todosForaDoAr` sumindo — "escolhi três e os três saíram do ar" passaria a dizer "nenhum produto escolhido" | core cheia | ✅ **morta** — **5**/2356, entre elas `produtos em destaque (DST-20) > TRÊS escolhidos e os três fora do ar` |

**Profundidade**: P0-full (4 mutações + o inverso, contra o mínimo de 4 pedido).
**Resultado**: **5/5 mortas, zero sobreviventes.**

Somando as três rodadas: **39 mutações, 39 mortas** (as duas sobreviventes das rodadas 1 e 2 foram
consertadas e reinjetadas mortas nesta e na anterior).

**Duas observações de método:**

- **M17 matou cinco casos, e três deles são de features anteriores** (`HOME-34`/`HOME-36` e
  `BNR-28`/`BNR-29`, além do `DST-20` desta). Uma linha, três ACs — é o sinal de uma invariante
  compartilhada bem guardada, e a contrapartida do M4 da rodada 2.
- **M15 é o caso em que a promessa vive num comentário e o teste a cobra mesmo assim.** O arquivo
  diz, em prosa, *"Sem peça escolhida a consulta **não sai**"*; o caso que a prende se chama
  literalmente `sem ids a consulta NÃO sai`. É o formato que este repositório pratica e que a
  feature `48` cobrou: **prosa sem asserção é afirmação**, e aqui as duas existem.

---

## Reamostragem dirigida

Além do gap, reconferi por leitura direta as ACs que o conserto poderia ter tocado de raspão:

| AC | Situação |
| --- | --- |
| `ANI-01` | ✅ intacta — `FormPageHeader.tsx:169-190` (célula de grade, rótulo de repouso `invisible`) e `:154-161` (vaga fixa do giro) inalterados; `FormPageHeader.test.tsx` não aparece em `find -newer` |
| `VIV-05`/`VIV-06` | ✅ intactas — as 13 remoções do arquivo são as já auditadas, e o `it` virado continua virado |
| `DST-13`/`DST-14`/`DST-15` | ✅ intactas — `useAdminHomeSections.ts` só difere do backup da rodada 1 pelas 31 linhas do conserto de `DST-13`, e `useAdminHomeSections.test.ts` não foi tocado nesta rodada |
| `VIV-12` | ⚠️ **proxy declarado, inalterado** — jsdom devolve 0 para layout; o teste mede a causa (identidade do nó que declara `lg:overflow-y-auto`, `:917-931`) e diz isso no comentário. Só navegador fecha. **Não é gap**: é limite de ferramenta, e está escrito no arquivo |

**Resultado: 44/44 ✅** — com `VIV-12` contando como verificada **pela causa**, que é o máximo que
jsdom alcança, e com a pendência de navegador registrada abaixo.

---

## Qualidade de código

| Princípio | Status | Nota |
| --- | --- | --- |
| Mínimo necessário | ✅ | O conserto é **um `describe` de dois casos**. Zero linhas de produção |
| Mudanças cirúrgicas | ✅ | `find -newer` confirma **um** arquivo de teste + o `CLAUDE.md` |
| Segue os padrões do repositório | ✅ | Gravação presa em `Promise` controlada pelo teste; par em repouso ao lado; o comentário do `describe` (`:979-992`) nomeia a mutação, a assinatura (`41`/`44`/`49`) e a consequência na loja da Adri |
| Valor asserido = valor da spec | ✅ | 44/44 |
| Baselines atualizadas ao fechar | ⚠️ | A **tabela** está certa; a **prosa do delta** ficou na rodada 1 (Parte 3). Trivial |

**Uma observação de copy, fora de AC e não bloqueante.** `FeaturedProductsEditor.tsx:210` e `:240`
numeram as peças com o `ordinal` **masculino** (`3º`), e o `aria-label` sai como *"Remover a 3º
peça"* — com o artigo feminino ao lado. O módulo vizinho já tem `ordinalF`
(`sectionRefusals.ts:42`, escrito para "3ª fileira", "3ª coleção"), e o teste
(`FeaturedProductsEditor.test.tsx:179-180`) fixa a forma masculina. Não é defeito de comportamento e
não contradiz AC nenhuma; é uma linha de leitor de tela no painel. Registro porque a régua de copy
deste projeto é alta — e porque, do outro lado, `core/featured.ts:77,81` diz *"3º item"*, que está
**correto** (item é masculino). Quem decide é quem escreve a copy do painel.

**Nota de arquitetura, também fora de escopo**: `ordinal` existe em **dois** lugares —
`packages/core/src/home/carousel.ts` (exportado pela feature `50`, com o comentário dizendo "um dono
só… escrever um terceiro seria o defeito 01") e `apps/backoffice/.../sectionRefusals.ts:30` (desde a
feature `24`). Hoje as duas produzem a mesma string e não há divergência possível de observar; a
feature `50` **evitou o terceiro**, que era o que estava ao alcance dela. Se um dia a numeração mudar
de forma, são dois lugares. Não é regressão desta feature e não é gap — é um endereço para a
`BACKLOG`.

---

## Pendências fora do alcance desta verificação

- **Prova em navegador — a única pendência real da feature, e ela pesa mais que a média.** Nada aqui
  foi medido em 390×844 nem em 1440. O que a `50` entrega é **largura** (Slider × Grade; o botão que
  não muda de medida), **deslocamento** (a linha que acende, a seção que entra) e **rolagem
  preservada** (`VIV-12`), e **jsdom devolve 0 para toda medida de layout**. O que mais pesa: o botão
  de salvar nos três estados com o `Cancelar` ao lado (é `ANI-01` inteira), o título de 120
  caracteres em 390px, a grade de 2 colunas com nome longo, o `scrollTop` da coluna de edição
  sobrevivendo de verdade a uma gravação, e o percurso com `prefers-reduced-motion: reduce` ligado ×
  desligado. Entra na fila das features `32`, `33`, `34`, `35`, `37`, `39`, `41`, `45`, `47`, `48`
  e `49`.
- **A `A-02`** (grade de 2 colunas no celular) continua marcada **parcial** na spec, por ser
  interpretação de uma resposta por analogia. Só a dona fecha.
- **A prosa do delta no `CLAUDE.md`** (Parte 3) — uma linha, sem medição nova.

---

## Traceability

| Requisito | Rodada 1 | Rodada 2 | Rodada 3 |
| --- | --- | --- | --- |
| `DST-01`..`DST-12`, `DST-16`..`DST-24` | ✅ | ✅ | ✅ (`DST-18` e `DST-20` reprovados por mutação nova) |
| `DST-13`, `DST-15` | ❌ | ✅ | ✅ |
| `DST-14` | ⚠️ Parcial | ✅ | ✅ |
| `VIV-01`..`VIV-03`, `VIV-05`..`VIV-11` | ✅ | ✅ | ✅ |
| `VIV-04` | ⚠️ Parcial | ⚠️ **Mutante sobrevivente** | ✅ **Verificado — mutante morto, nas duas telas** |
| `VIV-12` | ⚠️ Proxy declarado | ⚠️ Proxy declarado | ⚠️ Proxy declarado (limite de jsdom, escrito no arquivo) |
| `ANI-02`..`ANI-05`, `ANI-07`, `ANI-08` | ✅ | ✅ | ✅ |
| `ANI-01` | ❌ | ✅ | ✅ |
| `ANI-06` | ⚠️ Parcial | ✅ | ✅ |

---

## Estado da árvore ao fim da verificação

```
git rev-parse HEAD                ->  6c362bd1aa846f46e0c7c285f6f8d47f29072f1b
git status --porcelain | wc -l    ->  58   (entrada: 58)
git diff --cached --name-only     ->  (vazio)
```

Idêntico ao estado de entrada. As 5 mutações foram restauradas por cópia de arquivo, cada uma
conferida por `diff -q` **e** por leitura da linha mutada na hora. Nenhum comando destrutivo de git
foi executado em momento nenhum desta rodada.

---
---

# Registro das rodadas 2 e 1 — preservado

> A história da verificação é parte do valor dela — as features `41`, `48` e `49` deste repositório
> guardam a delas. O que segue são os laudos das rodadas 2 e 1, mantidos como registro: são eles que
> explicam **por que** os casos estão escritos do jeito que estão.

**Data**: 2026-09-14
**Spec**: `.specs/features/50-produtos-em-destaque-e-painel-sem-recarga/spec.md`
**Rodada**: **2 de no máximo 3** (a `1` reprovou com 5 lacunas; um implementador as fechou)
**Superfície de diff**: working tree contra `HEAD` = `6c362bd` — **58 entradas** em
`git status --porcelain`, índice vazio, nada commitado.
**Verificador**: agente independente. **Autor ≠ verificador** — não escrevi o código, não escrevi os
consertos e não participei do planejamento. A cobertura abaixo foi derivada da `spec.md`, e as
mutações do sensor foram injetadas e restauradas por mim.

> **Superfície desta rodada, medida e não suposta.** `find -newer validation.md` (o laudo da rodada 1,
> de 13:22:15) devolve **exatamente sete arquivos**:
>
> ```
> apps/backoffice/src/entities/home/api/useAdminHomeSections.ts        (+ .test.ts)
> apps/backoffice/src/pages/admin/AdminHomePage.tsx                    (+ .test.tsx)
> apps/backoffice/src/shared/ui/FormPageHeader.tsx                     (+ .test.tsx)
> .specs/features/50-.../spec.md
> ```
>
> **Nenhum arquivo da loja, de `core`, de `functions` ou de `catalog-import` foi tocado**, e é por
> isso que as quatro linhas de baseline daqueles workspaces vieram **idênticas** às da rodada 1 — o
> que é confirmação, não coincidência.

---

## Veredito

# ❌ FAIL — por **uma** linha

**Os cinco gaps da rodada 1 estão FECHADOS**, todos confirmados por mutação injetada por mim no
arquivo real. **42 de 44 ACs** com `file:line` + expressão asserida batendo com o valor que a spec
manda (eram 40). O gate está limpo nos cinco workspaces, `tsc` em 0·0, lint na baseline, e
**13 de 14 mutações novas foram mortas**.

O que segura o PASS é **um mutante sobrevivente**, e ele é o padrão que já reprovou as features `41`,
`44` e `49` deste repositório: **as duas pontas provadas, e o fio entre elas não**. Trocar
`saving={saving}` por `saving={false}` em `AdminHomePage.tsx:359` deixa a suíte do painel **2537/140
verde**. É **uma asserção faltando**, de gravidade **Minor**, e é o único item da rodada 3.

---

## Parte 1 — os cinco gaps da rodada 1, um por um

### 1. `DST-13` — ✅ **FECHADO** (era Blocker)

> WHEN a curadoria é reescrita e o `insert` falha depois do `delete` THEN o sistema SHALL informar
> que a lista ficou vazia e SHALL manter o rascunho na tela para ela salvar de novo.

**Implementado**, e o dono é `curateSection` — não a página. A frase nasce onde se **sabe** que o
`delete` passou (`useAdminHomeSections.ts:48` declara `CURADORIA_PERDIDA`; `:315-321` a prefixa ao
erro do banco), porque quem chama recebe um `HomeWriteError` e não tem como distinguir esta falha da
do `update`. Um dono só, com a razão escrita no arquivo.

| Metade da AC | `arquivo:linha` + expressão |
| --- | --- |
| a recusa **diz** que a lista ficou vazia, **e** o motivo do banco continua inteiro | `useAdminHomeSections.test.ts:447-450` — `expect(capturado[0]!.message).toBe('A lista ficou vazia — as peças foram removidas e as novas não entraram. Salve de novo. Motivo do banco: new row violates row-level security policy')` — **igualdade literal**, com o `delete` respondendo `{ error: null }` e o `insert` falhando, um passo de cada vez |
| o **par**: falha no `delete` **não** ganha a frase | `useAdminHomeSections.test.ts:466` — `expect(capturado[0]!.message).not.toContain('ficou vazia')` |
| gravou ⇒ mensagem nenhuma | `useAdminHomeSections.test.ts:475` — `expect(capturado[0]).toBeNull()` |
| a notícia **chega à dona** | `AdminHomePage.test.tsx:441` — `expect(aviso).toHaveTextContent('A lista ficou vazia')` **e** `:443` — `toHaveTextContent('new row violates row-level security policy')` |
| o rascunho **fica na tela** | `AdminHomePage.test.tsx:445-451` — `expect(getByLabelText('Título do bloco')).toHaveValue('Feitas à mão neste mês')` + `expect(getByTestId('palco-previa')).toHaveAttribute('data-slugs','pingente-gota,colar-de-cinzas')` (as **duas** peças, inclusive a recém-acrescentada) |

**Verdadeira nos dois mundos?** Não. Provado por **três** mutações minhas (M2, M3, M10), todas
mortas — ver sensor.

---

### 2. `ANI-01` — ✅ **FECHADO** (era Major)

> WHEN uma gravação começa e termina THEN o botão de salvar SHALL passar por `Salvando…` → `Salvo`
> com transição, **sem mudar de largura a ponto de mover o que está ao lado**.

**Implementado**, e as duas metades têm dono. O botão passa a empilhar os rótulos numa **célula de
grade** (`FormPageHeader.tsx:169-190`): o rótulo de repouso continua no DOM em todos os estados —
é ele que dá a medida — e o estado corrente se desenha por cima, na mesma célula. O `Loader2`
deixou de entrar e sair: ganhou **vaga fixa** (`:154-161`).

E a **spec foi corrigida** em vez de o código ganhar uma segunda cópia da palavra: `VIV-05` passou a
dizer *"o selo saindo, o botão passando a dizer `Salvo`"*, com o motivo na própria spec. Conferi
contra o texto **atual**. A divisão vigente — **pendência no selo, gravação no botão** — está
implementada exatamente assim, e a correção não removeu AC nenhuma (`git diff` da `spec.md`: 10
linhas acrescentadas, 1 reescrita, zero removidas).

| Metade da AC | `arquivo:linha` + expressão |
| --- | --- |
| os três estados | `FormPageHeader.test.tsx:271` — `expect(getByTestId('botao-salvando')).toHaveTextContent('Salvando…')`; `:275` — `expect(getByTestId('botao-salvo')).toHaveTextContent('Salvo')`; `:266-267` o repouso não tem nenhum dos dois |
| **a vaga do giro é a mesma caixa** nos dois estados | `FormPageHeader.test.tsx:293` — `expect(vagaGirando.className).toBe(classesParada)`, **igualdade literal da lista de classes**, mais `:284`/`:294` provando que o `svg` é o que muda |
| o rótulo de repouso **fica**, e é `invisible`, não `hidden` | `FormPageHeader.test.tsx:314` — `toContain('invisible')` **e** `:315` — `not.toContain('hidden')`, por **token exato** (`className.split(/\s+/)`), nos três estados |
| o vizinho **não se move** | `FormPageHeader.test.tsx:332,336,340` — `expect(posicaoDoCancelar()).toBe(0)` nos três estados, medindo o **índice dentro do mesmo contêiner** |
| a transição existe, com o par `motion-reduce:` | `FormPageHeader.test.tsx:226-227` (`Salvo`) e `:345-347` (`Salvando…`) |

**⚠️ A segunda metade é PROXY DE FORMA, e isso está DECLARADO no arquivo** — o `describe` de
`ANI-01` (`FormPageHeader.test.tsx:247-259`) escreve, em prosa: *"As asserções de largura são PROXY
DE FORMA, e isso é limite do jsdom, não escolha… A prova de verdade é navegador, em 390×844 e 1440, e
ela está na fila de pendências desta feature."* É a forma honesta: a régua mede a **causa** (nenhum
nó entra ou sai da fila; o rótulo que dá a medida continua ocupando a célula), diz que mede a causa,
e é de **token exato** — não `toContain`, que casaria `min-h-[40px]` dentro de `h-[40px]`.

**Verdadeira nos dois mundos?** Não. Quatro mutações minhas (M6, M7, M8, M9), todas mortas.

---

### 3. `DST-15` — ✅ **FECHADO** (era Major)

> WHEN duas pessoas salvam a mesma seção THEN a última gravação SHALL vencer, e a tela de quem
> perdeu SHALL passar a mostrar o que o banco devolveu na releitura.

**A asserção é de CONTEÚDO, nunca de contagem de chamadas** — foi exatamente o que a rodada 1 pediu,
e o arquivo diz por quê no cabeçalho do `describe` (`useAdminHomeSections.test.ts:526-534`):
*"'releu' é verdade nos dois mundos — o que separa é a lista com que a tela termina ser a do banco e
não a do rascunho local."*

| Metade da AC | `arquivo:linha` + expressão |
| --- | --- |
| a perdedora passa a ver **o conteúdo do banco** | `useAdminHomeSections.test.ts:568` — `expect(banners.items.map(i => i.product_id)).toEqual(['p-da-outra'])`; `:569` — `toEqual(['Peça da outra pessoa'])` |
| e **o que ela mandou não sobrevive** | `:571` — `expect(banners.items.some(i => i.product_id === 'p-minha')).toBe(false)` |
| o **par**: a última gravação **vence** (substitui, não funde) | `:591` — `expect(insercoes[1].map(i => i.product_id)).toEqual(['p-da-segunda'])` + `:592` — dois `delete`, um por rodada |

O cenário é montado como a AC descreve: a releitura devolve uma curadoria **diferente** da gravada
(`:536-556`, fixture `doBanco()`).

**Verdadeira nos dois mundos?** Não. M5 (apagar a releitura de `curateSection`) e M4 (apagar o
`delete`) matam os dois casos.

---

### 4. O mutante sobrevivente da rodada 1 — ✅ **MORTO**

Era `setSalvo(false)` no `handleDraftChange` de `AdminHomePage.tsx`. **Reinjetei a mutação eu mesmo**,
no arquivo real, apagando a linha 136:

```
  const handleDraftChange = (draft: SectionSaveDraft) => {
    setRascunho(draft)
  }                            <- setSalvo(false) removido
```

Resultado: **`AdminHomePage.test.tsx` reprova 1 de 76** —
`desfazer a digitação dentro dos 2 s NÃO faz o Salvo voltar (VIV-06)`.

A asserção que mata é `AdminHomePage.test.tsx:1071` — `expect(screen.queryByText('Salvo')).toBeNull()`,
**precedida** por `:1070` — `expect(screen.queryByText('Alterações não salvas')).toBeNull()`. É essa
segunda que faz a primeira valer: sem ela a asserção seria verdadeira nos dois mundos, porque
`isDirty` mascara o `Salvo`. O teste **digita e desfaz**, avança o relógio **1000 ms** (dentro dos
2 s, com `vi.useFakeTimers()`), e por isso não mede o timer em vez da linha. O comentário do caso
(`:1040-1047`) descreve a máscara e a janela por escrito.

---

### 5. `DST-14` — ✅ **FECHADO** (era Minor/parcial)

> WHEN ela salva duas vezes o mesmo rascunho THEN o estado gravado SHALL ser o mesmo e a lista SHALL
> continuar com o mesmo número de itens.

A metade que faltava — **o número** — agora é asserida, e o arquivo declara por que precisava ser
(`useAdminHomeSections.test.ts:480-489`): *"a idempotência é verdadeira por construção
(delete-then-insert), e é exatamente por isso que ela precisa de asserção: construção não é
asserção."*

| Metade da AC | `arquivo:linha` + expressão |
| --- | --- |
| **o número de itens** é o mesmo das duas vezes | `useAdminHomeSections.test.ts:519` — `expect(insercoes.map(i => i.length)).toEqual([2, 2])` — nunca `[2, 4]` |
| **o estado gravado** é o mesmo | `:520` — `expect(insercoes[0]).toEqual(insercoes[1])`; `:521` — `map(i => i.position)).toEqual([1, 2])` |
| a ordem que torna isso verdade | `:513-518` — `expect(itens.map(c => (c.delete ? 'delete' : 'insert'))).toEqual(['delete','insert','delete','insert'])` |
| a outra metade (curadoria intocada **não** é reescrita) | `AdminHomePage.test.tsx:607` — `expect(hook.curateSection).not.toHaveBeenCalled()` |

**Verdadeira nos dois mundos?** Não. M4 (`insert` sem o `delete` antes) derruba `:519` — é
literalmente a mutação que dobraria a lista.

---

## Parte 2 — o gap que fica (rodada 3)

### `VIV-04` / `ANI-01` em `/admin/home` — **mutante sobrevivente** (Minor)

> `VIV-04` — WHEN uma gravação está em curso THEN a tela SHALL dizer que está salvando **onde se
> clicou** e SHALL continuar mostrando os dados que já tinha.

**Mutação M14**: `AdminHomePage.tsx:359`, `saving={saving}` → `saving={false}`.
**Resultado: a suíte inteira do painel fica verde — 2537 em 140, exit 0.**

O que a mutação produz na loja da Adri: durante uma gravação de `/admin/home` o botão **nunca diria
`Salvando…`**, e `Cancelar`/`Salvar` **continuariam clicáveis** — um duplo clique dispararia um
segundo `updateSectionConfig`. Nada acusa.

As duas pontas estão provadas e o fio não:

- **A ponta do componente**: `FormPageHeader.test.tsx:153-154` — `expect(getByRole('button', { name: 'Cancelar' })).toBeDisabled()` e o mesmo para o primário; `:271` — `Salvando…` com `saving: true`.
- **A ponta do estado**: `AdminHomePage.tsx:200`/`:215` — `setSaving(true)` … `finally { setSaving(false) }`.
- **O fio**: `saving={saving}`, na linha 359, **sem uma asserção sequer** em `AdminHomePage.test.tsx`
  (`grep -c "Salvando" AdminHomePage.test.tsx` = **0**).

**Atenuantes, e são reais**: (a) a linha é **pré-existente** — `git show HEAD:…AdminHomePage.tsx`
tem `saving={saving}` na linha 300, e o `git diff` desta feature não a toca; (b) o código de produção
está **correto**; (c) `/admin/menu`, o irmão, **tem** a asserção equivalente
(`AdminMenuPage.test.tsx:1021` — `expect(getByTestId('salvando')).toHaveTextContent('Salvando…')`).

**Agravante**: o que aquela linha *faz* é novo. Antes desta feature `saving` só acrescentava um
giro; agora ele é o **único** jeito de `/admin/home` cumprir `VIV-04`, e é metade de `ANI-01`. A
rodada 1 já tinha marcado `VIV-04` como lacuna de precisão nesta tela; agora há **prova empírica**
de que a lacuna é real.

**Fix task (Minor, uma asserção)**: em `AdminHomePage.test.tsx`, com a gravação **em voo** (uma
`updateSectionConfig` que só resolve quando o teste mandar), asserir
`expect(screen.getByTestId('botao-salvando')).toHaveTextContent('Salvando…')` **e**
`expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()` — e o **par** em repouso,
senão a asserção seria verdadeira num mundo em que o botão diz isso sempre. É o mesmo molde de
`AdminMenuPage.test.tsx:1021-1023`, que já prova que os dois estados nunca aparecem juntos.

---

### Lacunas de precisão que continuam declaradas (não são gaps novos)

| AC | Situação na rodada 2 |
| --- | --- |
| `VIV-12` | **Inalterada, e honesta.** "A rolagem fica onde estava" não é mensurável em jsdom. O teste mede a causa — identidade do nó que declara `lg:overflow-y-auto` (`AdminHomePage.test.tsx:917-931`, `expect(getByTestId('coluna-secoes')).toBe(coluna)`) — e **diz isso no próprio comentário**. Só navegador fecha. |
| `ANI-06` | **Melhorou: o buraco da rodada 1 foi fechado.** O controle que de fato se movia era o giro do botão, e agora ele tem vaga fixa (`FormPageHeader.test.tsx:293`) mais a posição do vizinho asserida nos três estados (`:332,336,340`). O que resta é o limite de sempre: jsdom não mede pixel. |

---

## Parte 3 — checagem ancorada na spec (44 ACs)

A tabela completa das 44 está preservada no registro da rodada 1, no fim deste arquivo. Aqui vai o
**delta** e a **reamostragem dirigida** do que os consertos tocaram.

### Delta rodada 1 → rodada 2

| AC | Rodada 1 | Rodada 2 | Por quê |
| --- | --- | --- | --- |
| `DST-13` | ❌ | **✅** | implementado em `curateSection` + as duas metades asseridas nas duas camadas |
| `DST-14` | ⚠️ parcial | **✅** | o **número** de itens agora é asserido (`[2, 2]`) |
| `DST-15` | ❌ | **✅** | cenário das duas admins, asserção de **conteúdo** |
| `ANI-01` | ❌ | **✅** | botão com os três estados e largura reservada; spec corrigida em vez de duplicar a palavra |
| `ANI-06` | ⚠️ | **✅** | o controle que se movia (o giro) passou a ter vaga fixa e vizinho asserido |
| `VIV-04` | ⚠️ | **⚠️** | metade `/admin/home` segue sem asserção — **mutante sobrevivente M14** |
| `VIV-12` | ⚠️ | **⚠️** | proxy declarado, limite de jsdom |
| as outras 37 | ✅ | **✅** | reamostradas abaixo |

**Resultado: 42/44 ✅, 2 ⚠️** (uma delas com mutante sobrevivente).

### Reamostragem do que os consertos tocaram

Conserto move asserção de vizinho. Reconferi, **por expressão e não por número de linha**, que
nenhuma citação da rodada 1 desapareceu dos três arquivos de teste editados:

| Citação da rodada 1 | Sobreviveu? |
| --- | --- |
| `VIV-01` — `expect(medido.loading).toBe(false)` com a releitura no ar + `expect(loadings).not.toContain(true)` | ✅ `useAdminHomeSections.test.ts:734,737,749` |
| `VIV-07` — `expect(sections.map(s=>s.id)).toEqual(['sec-hero','sec-banners','sec-news'])` na falha | ✅ `:765` |
| `VIV-08` — `toEqual(['sec-nova'])` com a 1ª respondendo por último | ✅ `:804` |
| `VIV-10`/`DST-19` — `expect(erro).toEqual({ message: recusa })` + `expect(vistos).not.toContain(true)` | ✅ `:922`, `:967` |
| `VIV-03` — `expect(getByTestId('palco-iframe')).toBe(antes)` | ✅ `AdminHomePage.test.tsx`, **3 ocorrências** (salvar, interruptor, remover) |
| `VIV-09` — `expect(getByTestId('palco-previa')).toBe(antes…)` | ✅ 2 ocorrências |
| `VIV-11` — esqueleto na 1ª carga | ✅ `getAllByTestId('skeleton-row')`, com o par `queryByTestId(…)).toBeNull()` |
| `DST-24` — `data-slugs` pelo percurso inteiro | ✅ 3 ocorrências |
| `DST-01` — `expect(hook.createSection).toHaveBeenCalledWith('product_carousel')` | ✅ |
| `DST-12` — `editor-recusa` | ✅ 4 ocorrências |
| `ANI-02` no menu — `expect(selo.parentElement).toBe(vagaDoSalvando)` | ✅ `AdminMenuPage.test.tsx:1090` |

**`ANI-02` foi reescrita, e ficou mais forte, não mais fraca.** A asserção
`expect(selos()).toEqual(['Kit de bottons','Salvo'])` da rodada 1 defendia o mundo em que o `Salvo`
morava no cabeçalho — o mundo que `ANI-01` contradiz. Ela foi **virada**
(`FormPageHeader.test.tsx:179-192`, com a virada explicada em comentário) e a AC passou a ser provada
pela **estrutura**, que é o que ela sempre significou: `:196-209` —
`expect(acoes.contains(selo)).toBe(false)` e `expect(selo.closest('.flex-1')).not.toBeNull()`, ou
seja, o grupo de ações é **irmão** da coluna onde o selo entra e sai, e por construção não pode ser
empurrado por ele.

### As telas de Descontos — verdes, e intocadas

`AdminCouponFormPage.test.tsx` e `AdminPromotionFormPage.test.tsx` **não aparecem em
`git status --porcelain`**: nenhuma linha delas foi editada por esta feature, em rodada nenhuma.
Elas consomem `FormPageHeader`, que mudou — e continuam verdes dentro dos 2537/140, encontrando o
botão por `getByRole('button', { name: /Salvar cupom/ })` (`AdminCouponFormPage.test.tsx:64`) e
`/Salvar promoção/` (`AdminPromotionFormPage.test.tsx:159`), que seguem casando porque o rótulo de
repouso **continua no DOM nos três estados**. O prop `justSaved` é **opcional com padrão `false`**,
e há caso asserindo exatamente isso: `FormPageHeader.test.tsx:239-244` —
`expect(document.querySelector('header')!.textContent).not.toContain('Salvo')`.

**Nenhuma asserção das duas telas foi afrouxada, porque nenhuma foi tocada.**

---

## Sensor de discriminação — rodada 2

**14 mutações de comportamento**, uma por vez, injetadas **no arquivo real** por cópia de arquivo
(`cp arquivo bak/` → editar → rodar → `cp bak/arquivo arquivo` → `diff -q`). **Nenhum** `git stash`,
`git restore`, `git checkout --`, `git reset` ou `git clean` foi usado em momento nenhum — a feature
inteira vive na working tree. **Cada injeção foi conferida no disco antes de a suíte rodar**, que é
a parte do método que a rodada 1 registrou depois de um `perl -0pi` não casar e quase produzir um
falso "sobreviveu".

| # | Arquivo:linha | Mutação | Resultado |
| --- | --- | --- | --- |
| **M1** | `AdminHomePage.tsx:136` | **o sobrevivente da rodada 1**: `setSalvo(false)` apagado do `handleDraftChange` | ✅ **morta** — 1/76 (`desfazer a digitação dentro dos 2 s`) |
| M2 | `useAdminHomeSections.ts:319` | o `insert` falho devolve o erro **cru** (sem a frase da consequência) | ✅ morta — 1/44 (`DST-13`, igualdade literal) |
| M3 | `useAdminHomeSections.ts:290` | a frase passa a valer **também** para a falha do `delete` (diz "ficou vazia" onde nada foi removido) | ✅ morta — **2**/44 (o par de `DST-13` **e** o caso pré-existente do `delete`) |
| M4 | `useAdminHomeSections.ts:286-289` | `curateSection` deixa de **apagar** antes de inserir (a lista somaria) | ✅ morta — **6**/44 (`DST-14`, `DST-15`, `DST-13` e três vizinhos) |
| M5 | `useAdminHomeSections.ts:324` | a **releitura** some do fim de `curateSection` | ✅ morta — 2/44 (`DST-15` por **conteúdo**, e `VIV-01`) |
| M6 | `FormPageHeader.tsx:154-161` | a vaga do giro volta a **entrar e sair** do botão (o defeito de largura original) | ✅ morta — 1/24 (`ANI-01`, igualdade literal de `className`) |
| M7 | `FormPageHeader.tsx:177` | `invisible` → `hidden` (o rótulo de repouso deixa de dar a medida) | ✅ morta — 1/24 (`ANI-01`, token exato nos dois sentidos) |
| M8 | `FormPageHeader.tsx:97` | a pendência deixa de vencer: `Salvo` aparece com alteração na tela | ✅ morta — 1/100 (`VIV-06`, e **só** o caso do cabeçalho — na página `setSalvo(false)` mascara) |
| M9 | `FormPageHeader.tsx:187` | `Salvando…` e `Salvo` **trocados** | ✅ morta — **7**/100, nas duas camadas |
| M10 | `AdminHomePage.tsx:207` | `handleSave` **engole** a falha da curadoria (`return null`) | ✅ morta — 1/76 (`DST-13` na página — o **fio** entre o hook e a tela) |
| M11 | `AdminHomePage.tsx:205` | a curadoria passa a ser reescrita **sempre**, mesmo intocada | ✅ morta — 1/76 (a outra metade de `DST-14`) |
| M12 | `core/home/featured.ts:51-57` | a **ordem** das cobranças invertida (lista vazia antes do título) | ✅ morta — 1/26 (`título vazio vence lista vazia`) |
| M13 | `ProductPicker.tsx:34` | o filtro deixa de **dobrar acento** | ✅ morta — 1/26 (`DST-03`, `"coracao"` acha `"Anel Coração"`) |
| **M14** | `AdminHomePage.tsx:359` | **o fio**: `saving={saving}` → `saving={false}` | ❌ **SOBREVIVEU** — suíte **inteira** do painel verde (2537/140, exit 0) |

**Profundidade**: P0-full (14 mutações, contra o mínimo de 8 pedido).
**Resultado**: **13/14 mortas**, 1 sobrevivente (Minor — Parte 2).

Somando as duas rodadas: **34 mutações**, **32 mortas**. As duas sobreviventes foram do mesmo tipo —
**asserção verdadeira nos dois mundos** —, uma por máscara de vizinho (`isDirty` escondendo o
`Salvo`) e outra por fio não asserido.

**Três observações de método que valem registro:**

- **M8 morreu no componente e sobreviveu na página**, e isso é informação, não ruído: em
  `/admin/home` o `handleDraftChange` já zera o `salvo` ao digitar, então a página é verdadeira nos
  dois mundos. Quem prova a precedência é `FormPageHeader.test.tsx:216-222`. **Duas defesas para a
  mesma promessa mascaram uma à outra** — é a lição da feature `48` ("remover uma cópia move o ônus
  da prova, não o elimina") acontecendo na direção contrária.
- **M4 matou seis casos, e é o sinal de uma régua saudável**: a mutação é de uma linha e a
  consequência atravessa três ACs, porque as três dependem da mesma invariante (substituir, não
  somar).
- **M14 só apareceu porque rodei a suíte INTEIRA do workspace.** Um mutante de fio não é pego pelo
  arquivo de teste do módulo mutado — é justamente o arquivo que não existe. Rodar só
  `FormPageHeader.test.tsx` teria dado "verde", e eu teria chamado de morta uma mutação que ninguém
  mede.

---

## Gate

Cinco workspaces, **um por vez**, exit code capturado **fora de pipe**, `--testTimeout=20000` na loja
e no painel. Log completo conferido: **zero** `Test timed out in 5000ms` em todos os cinco.

| Workspace | Resultado | Exit code | Reportado pelo autor | Bate? |
| --- | --- | --- | --- | --- |
| `@estrelinha/store` | **3371 em 218** | `0` | 3371/218 | ✅ |
| `@estrelinha/backoffice` | **2537 em 140** | `0` | 2537/140 | ✅ |
| `@estrelinha/core` | **2356 em 92** | `0` | 2356/92 | ✅ |
| `@estrelinha/functions` | **599 em 13** | `0` | 599/13 | ✅ |
| `@estrelinha/catalog-import` | **512 em 23** | `0` | 512/23 | ✅ |

**Total: 9375 em 486.** Delta sobre a baseline do `CLAUDE.md` (9096 em 475): **+279 em +11**
— store +52/+4, backoffice **+192/+4**, core +35/+3, functions 0, catalog-import 0.
Delta rodada 1 → rodada 2: **backoffice +15**, os outros quatro **idênticos** — coerente com a
superfície de sete arquivos medida no topo.

| Outro gate | Resultado | Exit code | Reportado | Bate? |
| --- | --- | --- | --- | --- |
| `npx tsc --noEmit -p apps/store/tsconfig.app.json` | **0 erros** | `0` | 0 | ✅ |
| `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` | **0 erros** | `0` | 0 | ✅ |
| `pnpm lint` | **27 erros / 6 warnings** (backoffice 25/4 · store 2/2) | `1` (pré-existente) | 27/6 | ✅ |

**`packages/core/src/payment/**` sem uma linha alterada** — `git diff --name-only HEAD -- packages/core/src/payment/` devolve vazio. ✅
**Zero migration nova** — `git status --porcelain` não lista `supabase/migrations/**`. ✅
**`homeSections.test.ts` intocado** — não aparece em `git status --porcelain`. ✅

> ⚠️ **Armadilha de medição encontrada nesta rodada, e ela vale como regra.**
> `pnpm --filter <ws> test -- --testTimeout=20000` **não entrega a flag ao vitest**: o pnpm repassa o
> `--` literal, o vitest vê `-- --testTimeout=20000` como padrão de filtro e **o teto continua em
> 5000 ms**. A primeira execução do painel reprovou com **1 de 2537** — `AdminLayout.test.tsx`,
> arquivo que esta feature não toca, com `Test timed out in 5000ms` num arquivo de 22 s. Reexecutado
> por `pnpm --filter <ws> exec vitest run --testTimeout=20000`, a flag chega
> (`$ vitest run --testTimeout=20000` no cabeçalho do log) e a suíte fecha **2537/140, exit 0**, sem
> um timeout.
> **A forma de invocar é parte da medição.** Confira o `$ …` da primeira linha do log antes de ler o
> resultado — do contrário o `--testTimeout=20000` que o `CLAUDE.md` prescreve é uma frase que
> ninguém executou.

---

## Integridade dos testes

Nenhuma contagem caiu sem reaparecer do outro lado, e **nenhuma asserção foi enfraquecida**. Medido
contra `HEAD` (`git diff HEAD | grep -E "^-[^-]"`), as remoções da feature inteira são **39 linhas
em 6 arquivos de teste**, e todas são as viradas que a rodada 1 já auditou (`catalog.test.ts`,
`HomeBlockTray.test.tsx`, `HomeRenderer.test.tsx`, o `salvar volta para a lista` de
`AdminHomePage.test.tsx`).

Dos três arquivos de teste editados **nesta rodada**:

| Arquivo | Linhas removidas contra `HEAD` | O que eram |
| --- | --- | --- |
| `FormPageHeader.test.tsx` | **1** | a assinatura do helper `setup` (ganhou `justSaved`) — **zero asserções removidas** |
| `useAdminHomeSections.test.ts` | 3 | reindentação; +587 linhas de casos novos |
| `AdminHomePage.test.tsx` | 13 | o `salvar volta para a lista`, **virado e não apagado** (auditado na rodada 1) |

---

## Qualidade de código

| Princípio | Status | Nota |
| --- | --- | --- |
| Mínimo necessário | ✅ | Os consertos são três arquivos e uma correção de texto na spec. Nada de escopo novo |
| Sem abstração para uso único | ✅ | `CURADORIA_PERDIDA` é uma constante de módulo, não um sistema de mensagens; `estadoDaGravacao` é uma expressão, não um hook |
| Mudanças cirúrgicas | ✅ | `find -newer` confirma **sete** arquivos. Loja, `core`, `functions` e `catalog-import` intactos |
| Segue os padrões do repositório | ✅ | O dono da notícia é quem **sabe** do estado (`curateSection`, não a página); recusa como `string \| null`; token exato em vez de `toContain`; proxy de jsdom **declarado** no arquivo |
| Valor asserido = valor da spec | ⚠️ | 42/44. Ver Parte 2 |
| Todo teste mapeia para AC/edge case | ✅ | Os 15 casos novos do painel citam `DST-13`, `DST-14`, `DST-15`, `VIV-06`, `ANI-01` ou `ANI-05` no nome ou no `describe` |
| Spec corrigida em vez de duplicada | ✅ | A ambiguidade `VIV-05` × `ANI-01` foi resolvida **na spec**, com o motivo escrito e sem remover AC. É a saída certa: implementar as duas ao pé da letra poria `Salvo` em dois lugares |

**Uma observação menor, não bloqueante**: a nota de correção da `spec.md` afirma que *"nenhuma
asserção de `VIV-05`/`VIV-06` precisou mudar"*. É quase verdade — o que mudou foi uma asserção de
`ANI-02` (`selos()`), e ela está virada com o motivo escrito no arquivo de teste. A frase da spec é
imprecisa por um fio; o registro no teste é correto.

**Tasks de conserto não foram escritas em `tasks.md`.** Os cinco gaps foram fechados no código sem
virarem tasks numeradas. Bookkeeping, não gate — mas a rastreabilidade da rodada 1 → código vive
apenas nos comentários dos testes.

---

## Pendências fora do alcance desta verificação

- **Prova em navegador — e nesta feature ela pesa mais que a média.** Nada aqui foi medido em
  390×844 nem em 1440. O que a feature entrega é **largura** (Slider × Grade; o botão que não muda de
  medida), **deslocamento** (a linha que acende, a seção que entra) e **rolagem preservada**
  (`VIV-12`), e **jsdom devolve 0 para toda medida de layout** — o próprio arquivo de `ANI-01` diz
  isso por escrito. O que mais pesa: o botão de salvar nos três estados com o `Cancelar` ao lado
  (é a AC inteira), o título de 120 caracteres em 390px, a grade de 2 colunas com nome longo, o
  `scrollTop` da coluna de edição sobrevivendo de verdade a uma gravação, e o percurso
  `prefers-reduced-motion: reduce` ligado × desligado. Entra na fila das features `32`, `33`, `34`,
  `35`, `37`, `39`, `41`, `45`, `47`, `48` e `49`.
- **A `A-02`** (grade de 2 colunas no celular) continua marcada **parcial** na spec, por ser
  interpretação de uma resposta por analogia. Só a dona fecha.

---

## Traceability

| Requisito | Rodada 1 | Rodada 2 |
| --- | --- | --- |
| `DST-01`..`DST-12`, `DST-16`..`DST-24` | ✅ Verificado | ✅ Verificado |
| `DST-13`, `DST-15` | ❌ Precisa de correção | ✅ **Verificado** |
| `DST-14` | ⚠️ Parcial | ✅ **Verificado** |
| `VIV-01`..`VIV-03`, `VIV-05`..`VIV-11` | ✅ Verificado | ✅ Verificado |
| `VIV-04` | ⚠️ Parcial | ⚠️ **Parcial — mutante sobrevivente (M14)** |
| `VIV-12` | ⚠️ Proxy declarado | ⚠️ Proxy declarado |
| `ANI-02`..`ANI-05`, `ANI-07`, `ANI-08` | ✅ Verificado | ✅ Verificado |
| `ANI-01` | ❌ Precisa de correção | ✅ **Verificado** |
| `ANI-06` | ⚠️ Parcial | ✅ **Verificado** |

---

## Estado da árvore ao fim da verificação

```
git rev-parse HEAD                ->  6c362bd1aa846f46e0c7c285f6f8d47f29072f1b
git status --porcelain | wc -l    ->  58   (entrada: 58)
git diff --cached --name-only     ->  (vazio)
```

Idêntico ao estado de entrada. As 14 mutações foram restauradas por cópia de arquivo, cada uma
conferida por `diff -q` na hora, e a restauração final foi **reconferida rodando as suítes cheias**:
`@estrelinha/backoffice` **2537/140, exit 0** e `@estrelinha/core` **2356/92, exit 0**, depois da
última restauração.

---
---

# Registro da rodada 1 (2026-09-14, 13:22) — preservado

> A história da verificação é parte do valor dela — as features `41`, `48` e `49` deste repositório
> guardam a delas. O que segue é o laudo da primeira rodada, mantido como registro: é ele que
> explica **por que** os casos da rodada 2 estão escritos do jeito que estão.

**Veredito da rodada 1**: ❌ **FAIL** — 40 de 44 ACs, **19 de 20 mutações mortas**.

### Os cinco gaps que ela achou

1. **`DST-13` — não implementado e não coberto (Blocker).** `curateSection`
   (`useAdminHomeSections.ts:271-292` à época) apagava a curadoria inteira e, quando o `insert`
   falhava, devolvia o `insertError` cru; `handleSave` (`AdminHomePage.tsx:206-208`) o repassava tal
   e qual. **Em nenhum lugar o sistema dizia que a lista ficou vazia** — e ela ficou: o `delete`
   passou. `grep -rn "DST-13\|ficou vazia"` devolvia **zero**. O custo real: a seção some da Home e a
   mensagem que a dona recebe não diz isso; ela salvaria de novo achando que "não salvou".
2. **`ANI-01` — não implementado como escrito, zero asserções (Major).** O botão
   (`FormPageHeader.tsx:134-146` à época) nunca escrevia `Salvando…` nem `Salvo`: mostrava um rótulo
   fixo e, quando `saving`, **acrescentava** um `Loader2` de 16px com `mr-2` à esquerda dele. As duas
   palavras da AC viviam noutros lugares (um `Badge` ao lado do título, e um par de
   `span role="status"` em `/admin/menu`). E a segunda metade da AC era **violada pelo que existia**:
   o ícone entrava e saía a cada gravação, empurrando o `Cancelar` ao lado — literalmente "mudar de
   largura a ponto de mover o que está ao lado" —, e nada media.
3. **`DST-15` — sem citação (Major).** `grep -rn "DST-15"` devolvia zero. Havia asserção vizinha
   provando que a releitura **mais nova** vence, mas nenhuma montava o cenário da AC: duas gravações
   de sessões distintas, com a perdedora passando a exibir o conteúdo alheio. A asserção existente
   era sobre **ordem de releitura**, não sobre **conteúdo**.
4. **`DST-14` — parcial (Minor).** A metade "a segunda gravação não reescreve" estava provada
   (`expect(hook.curateSection).not.toHaveBeenCalled()`). A metade "o estado gravado é o mesmo e a
   lista continua com o mesmo número de itens" **não era asserida em lugar nenhum**: a idempotência
   de `curateSection` a tornava verdadeira **por construção**, e construção não é asserção.
5. **Mutante sobrevivente — `setSalvo(false)` (Minor).** Apagar a linha 136 de `AdminHomePage.tsx`
   deixava `AdminHomePage.test.tsx` **73/73 verde**. Não violava `VIV-06` na letra — `isDirty` vence
   o `Salvo` —, mas **mascarava**: digitar e desfazer dentro da janela de 2 s faz `Salvo` reaparecer
   sem ninguém ter salvado. Assinatura recorrente do repositório: **asserção verdadeira nos dois
   mundos, porque o vizinho mascara**.

### As três lacunas de precisão que ela declarou

| AC | Lacuna da rodada 1 |
| --- | --- |
| `VIV-12` | "a rolagem permanece" não é mensurável em jsdom; o teste mede a **causa** (identidade do nó que declara `lg:overflow-y-auto`) e diz isso no comentário. Proxy honesto, e só navegador fecha |
| `ANI-06` | provado para as duas animações que a feature introduz em controles; **o caso em que um controle de fato se move — o giro do botão — não era medido** (consequência do gap 2) |
| `VIV-04` | provado em `/admin/menu` (`AdminMenuPage.test.tsx:1021`); **nenhuma asserção ligava a AC a `/admin/home`** |

### O que a rodada 1 aprovou, e segue aprovado

As 40 ACs restantes foram citadas com `file:line` + expressão, entre elas: o catálogo com só
`category_grid` em `comingSoon` (`catalog.test.ts:154` — `toEqual(['category_grid'])`), as frases
literais das cinco recusas (`featured.test.ts:93,110,126,156`), o `slider` × `grid` por token exato
(`ProductCarouselLayout.test.tsx:148-199`), a ordem da curadoria com fixture **invertida de
propósito** (`FeaturedProducts.test.tsx:91-99`), o esqueleto no número de itens escolhidos
(`:139`), a recusa vinda **do banco** (`useAdminHomeSections.test.ts` — `toEqual({ message: recusa })`),
o iframe que **é o mesmo nó** (`AdminHomePage.test.tsx`, identidade e não presença), o `Salvo` que
some aos 2 s com o par aos 1900 ms, e o guarda de movimento
(`animacaoRespeitaMovimento.test.ts:150` — `expect(culpados).toEqual([])`, âncora tripla e 6
sensores).

Também auditou as **quatro asserções viradas** (`catalog.test.ts`, `HomeRenderer.test.tsx`,
`AdminHomePage.test.tsx`, `HomeBlockTray.test.tsx`), confirmando que todas declaram a virada por
escrito e que nenhuma foi enfraquecida.

### O sensor da rodada 1 — 20 mutações, 19 mortas

Cobriu o teto de 12 (`>` → `>=`), o recuo de `featuredDisplay`, o `comingSoon` do catálogo, a **ordem
da curadoria** na loja, o `overflow-x-auto` da grade, o `revalidar` que voltava a ligar o esqueleto
(**6 mortes na Home, 7 no menu**), o token de sequência, a volta do interruptor otimista, o
`product_slug` vazando para o `insert`, o `is_active` do painel, os **dois fios** (a página deixando
de entregar `products`; `justSaved={salvo}` sumindo da chamada do editor), o acender por releitura, a
animação atrasando a gravação, o par `motion-reduce:` sumindo do selo, o seletor deixando de
desabilitar a peça repetida, e as vagas reservadas voltando a ser fixas. **Só o nº 18 sobreviveu.**

Duas observações de método da rodada 1, que a rodada 2 seguiu:

- **Os dois mutantes de "fio" foram mortos por UM caso cada** — o formato que reprovou as features
  `41`, `44` e `49`. Na rodada 2 esse mesmo formato voltou a aparecer, e desta vez **sobreviveu**
  (M14).
- **Confirmar a injeção antes de ler o resultado é parte do sensor, não zelo.** Um `perl -0pi` não
  casou por causa de comentários intercalados, e o resultado teria sido um falso "sobreviveu".

### Números da rodada 1

| Workspace | Rodada 1 | Rodada 2 |
| --- | --- | --- |
| store | 3371/218 | 3371/218 |
| backoffice | 2522/140 | **2537/140** |
| core | 2356/92 | 2356/92 |
| functions | 599/13 | 599/13 |
| catalog-import | 512/23 | 512/23 |
| **Total** | **9360 em 486** | **9375 em 486** |

Lint 27/6 e `tsc` 0·0 nas duas rodadas. `packages/core/src/payment/**` intocado nas duas.
