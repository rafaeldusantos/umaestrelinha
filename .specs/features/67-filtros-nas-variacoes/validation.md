# 67 — Validação (Verifier independente)

**Veredito: FAIL ❌, por cobertura e não por defeito de produto observado.** Quatro mutantes
comportamentais sobreviveram em 64. Três deles caem em cima de uma AC (VFL-05/06, VFL-20, VFL-30) e
um num Success Criterion que promete um guarda que não existe. Os gates estão todos verdes. Nenhum
defeito de produto foi reproduzido: a implementação faz o que a spec pede nos pontos onde os
sobreviventes estão. O que falta é a régua que impediria cada um desses pontos de regredir em
silêncio.

- **Superfície coberta**: o working tree inteiro sobre o HEAD `f305b52`, não commitado (51 arquivos
  modificados, 2506+/260−, mais os não rastreados de `git status`). `git diff HEAD --stat` foi
  capturado antes da primeira mutação e comparado ao fim: **idêntico**.
- **Autor ≠ verificador.** Esta sessão não escreveu a feature. Nenhum arquivo do produto foi
  editado. A única escrita é este relatório.
- **Data**: 2026-10-18.

---

## 1. Gates (um workspace por vez, exit code capturado fora de pipe)

| Gate | Resultado | Exit |
| --- | --- | --- |
| core `pnpm --filter @estrelinha/core test` | **3011 / 122** | 0 |
| store `… test --testTimeout=20000` | **5070 / 288** | 0 |
| backoffice `… test --testTimeout=20000` | **3477 / 198** | 0 |
| functions | **977 / 22** (não tocado) | 0 |
| catalog-import | **512 / 23** (não tocado) | 0 |
| **Total** | **13047 / 653** — entrada medida na T00 12689/634 ⇒ **+358 / +19** | |
| `tsc` store · backoffice (`tsconfig.app.json`) | **0 · 0** | 0 · 0 |
| `pnpm lint` | backoffice **24/5** + store **2/2** = **26/7**, igual à baseline. Nenhum aviso cai em arquivo da 67. O exit 1 é o da baseline | 1 (baseline) |
| `pnpm build` | os dois apps compilam | 0 |
| `git diff --name-only HEAD -- packages/core/src/payment` | **vazio** | — |
| `facets.test.ts` (os casos da 66) | `+211 / −0`: os casos antigos ficaram intocados, como o design promete | — |

Delta por workspace contra a T00: core +82/+2, store +124/+4, backoffice +152/+13. Nenhum número
caiu.

---

## 2. Verificação ancorada na spec

Legenda: ✅ a asserção mira o resultado que a spec define · ⚠️ coberta, com lacuna de precisão ou de
alcance · ❌ não há evidência que discrimine.

### P1 — Marcar uma opção no produto

| AC | Resultado definido pela spec | Evidência | |
| --- | --- | --- | --- |
| VFL-01 | uma linha por texto, na ordem de `options`, com chips "Grupo › Valor" | `FilterValuesCard.variacoes.test.tsx:115` (ordem dos eixos e das linhas, rótulo literal); `AdminProductFormPage.filtros.test.tsx` (+30: a página real monta a marcação vinda do banco) | ✅ |
| VFL-02 | sem eixo, sem a seção | `FilterValuesCard.variacoes.test.tsx:182` | ✅ |
| VFL-03 | grava (peça, eixo, texto, valor) depois de o produto existir | `persistProduct.opcao.test.ts:60,89,106`; `AdminProductFormPage.filtros.test.tsx` (+39, +79: diff pelos quatro campos e o id novo, com ordem `update products` < `delete pofv`); morre B07, B27 | ✅ |
| VFL-04 | "já vale para a peça toda", desabilitado, com o motivo | `FilterValuesCard.variacoes.test.tsx:197,205` | ✅ |
| VFL-05 | renomear o eixo e salvar ⇒ as marcações usam o nome novo | `optionMarks.test.ts:15` prova só a **função pura** (B01/B02 morrem). **A fiação na página não tem teste**: `AdminProductFormPage.tsx:91` trocado por `form.option_marks ?? []` (**B25**) **sobrevive** às suítes da página | ❌ |
| VFL-06 | remover um texto ou o eixo ⇒ as marcações dele saem | `optionMarks.test.ts:43` (B03 morre). A mesma fiação de B25 **não é provada** pela página | ❌ |
| VFL-07 | "Sem variação ativa", removível | `FilterValuesCard.variacoes.test.tsx:214,225` | ✅ |
| VFL-08 | a falha mantém a seleção e nada aparece salvo | `persistProduct.opcao.test.ts:121,130`; `AdminProductFormPage.filtros.test.tsx` (+93: o toast literal "O produto foi salvo, mas as marcações por variação não" e a ausência de "Produto atualizado!"); morre B05 | ✅ |

### P1 — A loja filtra pela variação

| AC | Resultado | Evidência | |
| --- | --- | --- | --- |
| VFL-09 | peça toda **ou** opção, e os grupos restantes pela **mesma** variação | `match.test.ts:98` (`toEqual({passes:false, variant:null})` para Prata+Chaveiro em variações diferentes), `:103`, `:109`, mais o sensor da soma em `:281`; morrem C01, C02 | ✅ |
| VFL-10 | o preço e o estoque são os da variação | `match.test.ts:146–171`; `filters.test.ts` (loja; fixture com a peça a R$ 50 e a variação a R$ 95, com sensor `passesSystem(...)=true`); morrem C04, S09, S10 | ✅ |
| VFL-11 | o link `?variant=<publicVariantId>`, na menor `position` e preferindo a com estoque | `match.test.ts:180,188,201,209`; `ProductCardMatchedVariant.test.tsx:146,151` (`nuvemshop_id` e o recuo para o UUID); morrem C05, C06, S11, S12 | ✅ |
| VFL-12 | a foto, o preço e o "de" da variação, com recuo para a foto da peça | `ProductCardMatchedVariant.test.tsx:156,162,167,172`; morrem S13, S14 | ✅ |
| VFL-13 | pela peça toda ou sem seleção ⇒ card idêntico, sem `?variant=` | `ProductCardMatchedVariant.test.tsx:126` (DOM idêntico, `null` contra ausente); `match.test.ts:124,128` | ✅ |
| VFL-14 | a página abre na variação de ponta a ponta | `cardAbreNaVariacao.test.tsx:109,117` (`filterMatches` real, `ProductCard` real e `ProductPage` real) | ✅ |
| VFL-15 | o `(N)` conta peças pela regra da mesma variação | `facets.test.ts` (acréscimos); `filters.test.ts` (loja: 3 linhas casando contam 1); morrem C08, C09 | ✅ |
| VFL-16 | tirar o último valor devolve o card de hoje | `ProductCardMatchedVariant.test.tsx:200,212`; `CategoryPageFilters.test.tsx` (troca e remoção pelo clique); morre S15 | ✅ |
| VFL-17 | a mesma regra na categoria **e** na busca | `CategoryPageFilters.test.tsx`, `SearchPageFilters.test.tsx` com as páginas reais e um dublê do card que expõe a prop; morrem S16, S17 | ✅ |

### P1 — A fila de sugestões

| AC | Resultado | Evidência | |
| --- | --- | --- | --- |
| VFL-18 | o motivo, o valor, o alvo e a contagem literais | `suggest.test.ts:175`; `AdminFilterSuggestionsPage.test.tsx:127`; morre C18 | ✅ |
| VFL-19 | o motivo expandido traz todas as peças selecionadas | `AdminFilterSuggestionsPage.test.tsx:147,183` | ✅ |
| VFL-20 | **uma requisição por tipo de alvo**, e a repetição é no-op | alvo opção: `aprovar.test.ts:67` com 3 sugestões e 2 selecionadas ✅. Alvo peça toda: `aprovar.test.ts:81` usa **uma** sugestão só, então "uma chamada" e "uma chamada por peça" dão o mesmo resultado. **B09** (um `upsert` por peça) **sobrevive** | ⚠️ |
| VFL-21 | a recusa grava e não volta | `aprovar.test.ts:132`; `AdminFilterSuggestionsPage.test.tsx:210`; o schema em `variantFiltersSchema.test.ts:261` | ✅ |
| VFL-22 | já marcada ou já recusada, a sugestão some | `suggest.test.ts:142–164`; morrem C11, C12 | ✅ |
| VFL-23 | a falha deixa a seleção e não marca nada | `aprovar.test.ts:117,143`; `AdminFilterSuggestionsPage.test.tsx:221`; morre B10 | ✅ |
| VFL-24 | a fila, as contagens do valor e as de `/admin/filtros` atualizam sem recarregar | `AdminFilterSuggestionsPage.test.tsx:193` (a releitura do catálogo); morre B24 (a chave do pool). A contagem da linha do valor (D2) é provada por `copy.test.ts`; morre B15 | ✅ |
| VFL-25 | os recortes por grupo, por fonte e pela busca dobrada | `AdminFilterSuggestionsPage.test.tsx:240,260`; `fila.test.ts` | ✅ |
| VFL-26 | os dois vazios, com a copy literal | `AdminFilterSuggestionsPage.test.tsx:271,279` | ✅ |
| VFL-27 | o aviso na linha, e a opção gravada **antes** de apagar a peça toda | `aprovar.test.ts:99` (a ordem `upsert` → `delete`, com o dublê perguntado), `:117`, `:124`; morrem B08, B11, C15 | ✅ |
| VFL-28 | o link "Sugestões (N)" com o total | `AdminFiltersPage.test.tsx:433` | ✅ |

### P1 — As sugestões no produto

| AC | Resultado | Evidência | |
| --- | --- | --- | --- |
| VFL-29 | a sugestão ao lado do chip, com o motivo e as duas ações | `FilterValuesCard.variacoes.test.tsx:237,289` | ✅ |
| VFL-30 | "Aceitar" só mexe no estado; "Recusar" grava na hora | "Recusar": `:258,272` (B12 morre). "Aceitar" por opção: `:237` assere `gravarRecusas` não chamado. "Aceitar" **na peça toda**: `:289` não assere ausência de escrita, e **B13** (o "Aceitar" da peça toda grava uma recusa na rede) **sobrevive** | ⚠️ |
| VFL-31 | a mesma função de `core` nas duas telas | `FilterValuesCard.variacoes.test.tsx:316` | ✅ |

### P2

| AC | Resultado | Evidência | |
| --- | --- | --- | --- |
| VFL-32 | a coluna "Hoje" com as três formas | `BulkAssignPanel.test.tsx:93,204`. Onde a spec diz "ou nada", a tela escreve **"Não marcada"**. É lacuna de precisão: copy aceitável, mas o que a spec definia era a ausência de texto | ⚠️ |
| VFL-33 | "Ver N sugestões deste valor" abre a fila recortada | `AdminFilterValuePage.test.tsx:159` | ✅ |
| VFL-34 | "Remover de N" tira as duas formas, e a confirmação diz isso | `BulkAssignPanel.test.tsx:223`; `AdminFilterValuePage.test.tsx:179`; morre B18 | ✅ |
| VFL-35 | 10 termos de 40, e o banco recusa o mesmo limite | `variantFiltersSchema.test.ts:279–295` (números importados de `core`); `useAdminFilterCatalog.test.ts` (it.each); morrem S03, B19 | ✅ |
| VFL-36 | a fila considera o termo novo sem recarregar | `useAdminFilterCatalog.test.ts:503` (`leituras()).toHaveLength(1)`, B28 morre). O caso de página (`AdminFiltersPage.test.tsx:596`) **remonta** a página (`cleanup()` + `montar()`) e por isso prova o recálculo, não o "sem recarregar". A prova real é a do hook | ✅ (pelo hook) |
| VFL-37 | vazio, repetido (dobrado) ou igual ao nome são recusados | `suggest.test.ts:236–266`; morrem C16, C17 | ✅ |
| VFL-38 | a loja lê a marcação por opção só via `core` | `marcacaoPorOpcaoComDonoUnico.test.ts` (âncora dupla e metade positiva); morre S18 (`p.option_marks` lido na busca) | ✅ |

**Contagem**: 32 ✅ · 4 ⚠️ (VFL-20, VFL-30, VFL-32, VFL-36 provada só pelo hook) · 2 ❌
(VFL-05 e VFL-06 na fiação da página).

### Edge cases

| Caso | Evidência | |
| --- | --- | --- |
| a peça apagada leva as marcações por opção e as recusas (cascata) | o guarda de schema; morrem S02, S05 | ✅ |
| o valor apagado leva as duas, e a confirmação soma as marcações por opção | `copy.test.ts` (`perdaDoValor`); morre B17 | ✅ |
| grupo desligado ou peça inativa ⇒ a marcação não chega à loja (RLS) | `variantFiltersSchema.test.ts` (a policy com as duas condições); morre S01. Probe HTTP como `anon` registrado em `tasks.md` (lotes A e C), não reexecutado aqui | ✅ |
| o mesmo texto em dois eixos são duas opções | `match.test.ts:237`, `suggest.test.ts:120`; morre C07 | ✅ |
| a variação sem a chave do eixo não casa | `match.test.ts:232` | ✅ |
| `?variant=` de variação desativada abre na padrão | comportamento herdado (`ProductPageVariant.test.tsx:152` usa linha `is_active:false`); nenhum caso novo da 67 | ✅ (herdado) |
| sem `nuvemshop_id`, o link usa o UUID | `ProductCardMatchedVariant.test.tsx:151`, `cardAbreNaVariacao.test.tsx:117` | ✅ |

### Success Criteria

| Critério | Estado |
| --- | --- |
| curar ~70 peças com um "Aprovar" | atendido. Uma requisição medida em navegador (`prova-navegador.md`, item 7), e a régua de unidade para o alvo opção |
| "Prata 925" na categoria não abre card em variação que não seja Prata 925 | **atendido só no recorte por opção**: 171/171. Os 183 cards que passam pela marcação na peça toda (curadoria da 66) abrem na padrão, e 128 deles não são "Prata 925" pura. É consequência da decisão "a peça toda vence", e a prova declara isso. **Lacuna de precisão da spec**: o critério, como está escrito, é falso no catálogo medido |
| Prata 925 + Chaveiro | atendido (2 cards, conferidos por uma reimplementação independente) |
| 390×844 sem rolagem horizontal | atendido em navegador, depois do conserto de D1–D4 |
| **"Nenhuma sugestão vira marcação sem um toque (guarda: o painel não grava marcação fora de Aprovar e Salvar)"** | **❌ o guarda não existe.** `grep` não acha teste que liste os escritores de `product_option_filter_values` ou de `product_filter_values`. Os escritores de hoje são `persistProduct`, `useOptionMarks` (aprovar e remover), `useValueMarks` (aprovar e marcação em massa) e `aprovar.ts`. O critério é cumprido pelo código, mas nada impede um quinto escritor de entrar |

---

## 3. Sensor de discriminação: 64 mutantes nos arquivos reais

O método segue o do projeto, **sem `git stash`**. Para cada mutante, o arnês guarda o SHA-256 do
arquivo e aplica a mutação por `replace`. Ele lança se o alvo não aparecer exatamente uma vez, e
lança também se a mutação não mudar nada. Depois roda só os arquivos de teste relevantes
(`pnpm --filter <w> exec vitest run … --testTimeout=20000`), restaura o arquivo e confere o SHA. As
64 restaurações conferiram. `git diff HEAD --stat` saiu igual ao do início. O arnês separa morte
por asserção de morte por compilação, e **nenhuma** morte foi por compilação.

| ID | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| C01 | core `match.ts` | `every` → `some` nos grupos restantes (deixa de exigir a mesma variação) | morto (6) |
| C02 | `match.ts` | a peça toda deixa de satisfazer o grupo | morto (21) |
| C03 | `match.ts` | variação inativa entra como candidata | morto (5) |
| C04 | `match.ts` | sem `variantPass` (o preço e o estoque da variação) | morto (7) |
| C05 | `match.ts` | sem `prefer` (a preferência por estoque) | morto (1) |
| C06 | `match.ts` | ordena pela chegada em vez de `position` | morto (2) |
| C07 | `match.ts` | casa o texto em qualquer eixo | morto (2) |
| C08 | `facets.ts` | a faceta deixa de ser disjuntiva | morto (6) |
| C09 | `facets.ts` | a marcação sem variação ativa acende o bloco | morto (1) |
| C10 | `suggest.ts` | token vira prefixo | morto (1) |
| C11 | `suggest.ts` | a recusa da peça toda não cala o nome nem a tag | morto (1) |
| C12 | `suggest.ts` | a opção já marcada continua sugerida | morto (1) |
| C13 | `suggest.ts` | a variação inativa gera sugestão | morto (1) |
| C14 | `suggest.ts` | a tag sem espaço não casa | morto (5) |
| C15 | `suggest.ts` | `replacesWholeMark` sempre `false` | morto (1) |
| C16 | `rules.ts` | o repetido comparado sem a dobra | morto (1) |
| C17 | `rules.ts` | o termo igual ao nome é aceito | morto (1) |
| C18 | `suggest.ts` | o grupo de motivo ignora o valor | morto (1) |
| S01 | migration | a policy pública sem `p.is_active` | morto (2) |
| S02 | migration | sem cascata peça → marcação por opção | morto (2) |
| S03 | migration | o teto de termos vira 11 | morto (2) |
| S04 | migration | as recusas sem `with check` | morto (2) |
| S05 | migration | a recusa sem cascata do valor | morto (2) |
| S06 | `mapProduct.ts` | `option_marks: []` | morto (2) |
| S07 | `mapProduct.ts` | o select do card sem o embed | morto (5) |
| S08 | `mapProduct.ts` | o select do card sem `nuvemshop_id` | morto (2) |
| S09 | `filters.ts` | o preço da peça no lugar do da variação | morto (7) |
| S10 | `filters.ts` | o estoque da variação ignorado | morto (2) |
| S11 | `filters.ts` | sem `prefer` na loja | morto (3) |
| S12 | `ProductCard.tsx` | `?variant=` com o UUID sempre | morto (2) |
| S13 | `ProductCard.tsx` | a foto da variação ignorada | morto (1) |
| S14 | `ProductCard.tsx` | o preço da variação ignorado | morto (2) |
| S15 | `ProductCard.tsx` | sem a reancoragem (VFL-16) | morto (3) |
| S16 | `CategoryPage.tsx` | não passa `matchedVariant` | morto (3) |
| S17 | `SearchPage.tsx` | não passa `matchedVariant` | morto (3) |
| S18 | `SearchPage.tsx` | lê `p.option_marks` direto (VFL-38) | morto (1) |
| B01 | `optionMarks.ts` | uma reordenação lida como renomeação | morto (2) |
| B02 | `optionMarks.ts` | renomear não leva a marcação | morto (3) |
| B03 | `optionMarks.ts` | remover o texto não apaga | morto (3) |
| B04 | `optionMarks.ts` | o diff reinsere as salvas | morto (4) |
| B05 | `persistProduct.ts` | a falha do `upsert` por opção engolida | morto (2) |
| B06 | `persistProduct.ts` | o `delete` sem o texto da opção | morto (2) |
| B07 | `persistProduct.ts` | a etapa por opção nunca roda | morto (8) |
| B08 | `aprovar.ts` | a troca apaga a peça toda **antes** de gravar a opção | morto (4) |
| **B09** | `aprovar.ts` | alvo peça toda: um `upsert` **por peça** | **SOBREVIVEU** |
| B10 | `aprovar.ts` | a falha da 1ª escrita devolve `gravou:true` | morto (2) |
| B11 | `aprovar.ts` | a troca não apaga a peça toda | morto (3) |
| B12 | `FilterValuesCard.tsx` | a recusa não invalida a chave | morto (1) |
| **B13** | `FilterValuesCard.tsx` | o "Aceitar" da peça toda faz uma escrita na rede | **SOBREVIVEU** |
| B14 | `FilterValuesCard.tsx` | o "Aceitar" da troca não tira a peça toda | morto (1) |
| B15 | `copy.ts` | a contagem do valor ignora a opção (D2) | morto (4) |
| B16 | `copy.ts` | `pecasDoValor` soma em vez de unir | morto (2) |
| B17 | `copy.ts` | a confirmação de remover o valor ignora a opção | morto (2) |
| B18 | `AdminFilterValuePage.tsx` | "Remover de N" só tira a peça toda | morto (1) |
| B19 | `useAdminFilterCatalog.ts` | os termos gravados sem a régua | morto (5) |
| B20 | `App.tsx` | a rota estática some e `:groupId` captura | morto (2) |
| B21 | `ReasonDetail.tsx` | o `section` volta a `overflow-hidden` (D1) | morto (1) |
| B22 | `AdminLayout.tsx` | o `main` volta a `overflow-auto` | morto (2: o guarda do layout **e** o da fila) |
| B23 | `AdminLayout.tsx` | o `main` ganha `md:overflow-auto` | morto (1), **só** pelo guarda da fila. `AdminLayout.test.tsx` não vê prefixo (ver a lacuna 5) |
| B24 | `useFila.ts` | aprovar não invalida o pool (VFL-24) | morto (1) |
| **B25** | `AdminProductFormPage.tsx` | a página deixa de chamar `marcacoesVigentes` (sem renomear nem remover) | **SOBREVIVEU** |
| **B26** | `AdminProductFormPage.tsx` | o snapshot dos eixos não se atualiza no save | **SOBREVIVEU** (de baixo impacto: o save navega para `/admin/produtos`, e o mutante é quase equivalente) |
| B27 | `AdminProductFormPage.tsx` | o save não envia `optionMarks` | morto (3) |
| B28 | `useAdminFilterCatalog.ts` | o termo gravado sem releitura (VFL-36) | morto (1) |

**Total: 64 injetados · 60 mortos por asserção · 0 por compilação · 4 sobreviventes** (B09, B13,
B25, B26).

---

## 4. A mudança fora do escopo planejado: o `<main>` do `AdminLayout` perdeu o `overflow-auto`

**Avaliação: correta e necessária, com um risco residual que não tem guarda.**

- **O diagnóstico confere.** Com o `main` em `overflow-auto` e o body como quem rola, nenhum
  `sticky` de dentro do `main` grudava. A barra da fila (D1) só funciona sem o overflow. Isso é
  provado pelo DOM do layout **real** (`AdminFilterSuggestionsPage.test.tsx:334`, que sobe até o
  `<html>`; morrem B21, B22 e B23).
- **As consequências foram tratadas, e cada uma tem teste:**
  - `FormPageHeader` em `top-14 md:top-0` (`FormPageHeader.test.tsx`: `top-0` puro recusado);
  - `ProductFormHeader` gruda só a partir de `md`;
  - a coluna lateral do produto perdeu o `lg:sticky`, porque teria 1.300px numa janela de 900;
  - três `flex-wrap`/`max-w-full` (`ProductFormHeader`, `RecordPageHeader`, `DescriptionFaqNotice`)
    para os estouros que o `main` antes escondia (testes novos em `ProductFormHeader.test.tsx`,
    `RecordPageHeader.test.tsx` e `DescriptionFaqNotice.test.tsx`).
- **As tabelas continuam contidas.** `AdminTable` tem um `overflow-x-auto` próprio (`:52`), e o
  `Table` do shadcn embrulha em `overflow-auto` (`packages/ui/src/table.tsx:7`). A varredura em
  navegador de 38 rotas em 390 e 1440 (`prova-navegador.md`, *Reprova*) achou `scrollWidth` igual à
  janela em todas. **Não foi reexecutada aqui.**
- **Risco residual (lacuna 5).** O `main` deixou de ser rede de segurança: qualquer conteúdo largo
  futuro que não tenha contêiner próprio rola o **body**, e nada no repositório acusa isso (jsdom
  devolve 0). Além disso, a régua nova de `AdminLayout.test.tsx`
  (`/^overflow(?:-[xy])?-(…)$/`) **não reconhece prefixo de breakpoint**. `md:overflow-auto` passa
  por ela (B23), e só o guarda da fila o pega. O guarda da fila tem o prefixo provado em sensor
  próprio. Para os cabeçalhos `sticky` dos formulários, o único guarda é o do layout.
- Os guardas antigos do layout (raiz sem `overflow-hidden`, `aside` fixo, barra do celular
  `sticky`) seguem verdes e intocados. A suíte do backoffice passou inteira.

---

## 5. Lacunas ranqueadas

1. **VFL-05 / VFL-06: a fiação na página não é provada (B25).**
   `apps/backoffice/src/pages/admin/AdminProductFormPage.tsx:91`. Trocar
   `marcacoesVigentes(savedSnapshot.options, form.options, …)` pela lista crua deixa as suítes da
   página verdes. A consequência real: renomear "Tpos de elo" e salvar deixa as marcações gravadas
   com o nome antigo (órfãs, "Sem variação ativa"), e remover um texto não apaga a marcação dele. É
   exatamente o que as duas ACs proíbem. As duas pontas, a função pura e o `persistProduct`, estão
   provadas; o fio entre elas não. *Conserto*: um caso em `AdminProductFormPage.filtros.test.tsx`
   que renomeia um eixo pela UI, salva e assere o `upsert`/`delete` com o nome novo, e outro que
   remove um texto e assere o `delete`.
2. **Success Criterion 5: o guarda prometido não existe.** Nenhum teste lista quem pode gravar em
   `product_option_filter_values` ou em `product_filter_values`. *Conserto*: um guarda de fonte com
   a lista dos escritores legítimos (`persistProduct.ts`, `useOptionMarks.ts`, `useValueMarks.ts`),
   âncora dupla e a metade positiva.
3. **VFL-30: "Aceitar" na peça toda sem a régua de "não grava" (B13).**
   `FilterValuesCard.variacoes.test.tsx:289` não assere ausência de escrita, só o caso por opção
   (`:237`) assere. *Conserto*: `expect(h.gravarRecusas).not.toHaveBeenCalled()` mais um espião de
   `from()` no caso da peça toda.
4. **VFL-20: "uma requisição" no alvo peça toda é verdadeira nos dois mundos (B09).**
   `aprovar.test.ts:81` usa uma sugestão só. *Conserto*: duas ou três sugestões selecionadas e
   `calls).toHaveLength(1)` com as linhas todas no payload.
5. **O guarda do `<main>` não vê prefixo de breakpoint (B23 morre só pela fila).**
   `AdminLayout.test.tsx` (régua `^overflow…$`). Também não há guarda de rolagem horizontal do body
   agora que o `main` não contém mais nada (só a prova em navegador).
6. **B26** (o snapshot de eixos não se atualiza no save): sobrevive, mas é quase equivalente, porque
   o save navega para fora da tela. Fica registrado, de prioridade baixa.
7. **Precisão de spec** (sem conserto de código):
   - VFL-32 pede "ou nada" e a tela escreve "Não marcada";
   - o Success Criterion de Prata 925 é falso no catálogo por causa da curadoria da 66, e devia ser
     reescrito para "por opção";
   - VFL-36 tem a prova de página por remontagem;
   - com o card mostrando o preço da variação, a ordenação "menor preço" continua usando o preço
     **da peça** (`filters.ts`, `sortMatches`). Um card de R$ 95 pode aparecer antes de um de R$ 60.
     A spec não fala de ordenação, e isso é declarado no código, mas é uma divergência visível para a
     cliente.

---

## 6. Lições candidatas (para `.specs/LESSONS.md`, não aplicadas)

- **Projeção calculada na página é fio, e fio exige um caso pela página.** Quando a página compõe
  uma função pura antes de entregar ao save (`marcacoesVigentes`), testar a função e o save
  separados deixa a composição sem dono. Trocar a chamada pela entrada crua passa. *(B25,
  VFL-05/06)*
- **"Uma requisição para N" só se prova com N ≥ 2.** Com um item só, "uma chamada" e "uma chamada
  por item" são o mesmo número. *(B09, VFL-20)*
- **"Não grava" se assere em todo ramo que a AC nomeia, não só no primeiro.** O caso por opção
  assere a ausência de escrita, e o caso da peça toda, ao lado, não assere. *(B13, VFL-30)*
- **Success Criterion que cita um guarda precisa do guarda.** "Guarda: o painel não grava fora
  de X" escrito na spec sem um teste correspondente é promessa sem régua. *(SC 5)*
- **Remover uma rede de segurança de layout transfere o ônus para cada tela.** Tirar o `overflow` do
  `main` consertou o `sticky` e passou a deixar todo conteúdo largo futuro rolar o body sem guarda.
  A régua que mede o `main` precisa aceitar prefixo de breakpoint, como a da fila já aceita.
  *(B23, AdminLayout)*

---

## Rodada 2 — conserto das lacunas

**Data**: 2026-10-18. **Autor do conserto ≠ verificador da rodada 1.** Só testes e guardas mudaram;
o único toque em código de produção é um comentário `// SPEC_DEVIATION` (lacuna 8), sem efeito de
runtime. Nenhuma asserção existente foi afrouxada. Sem commit, sem `git stash`.

### O que mudou, por lacuna

| # | Lacuna | Conserto | Onde |
| --- | --- | --- | --- |
| 1 | VFL-05/06 (B25) — a fiação `marcacoesVigentes` na página | Dois casos pela **página real**, editando os eixos pelo `OptionsEditor` real (aba Preços): renomear `Cor` → `Metal` e salvar ⇒ **um** `upsert` com `option_name: 'Metal'`, nenhuma linha gravada com `"Cor"`, e o `delete` da marcação antiga pelos quatro campos; remover o texto `Prata 925` e salvar ⇒ o `delete` daquela marcação, e nada mais | `AdminProductFormPage.filtros.test.tsx:294` e `:325` |
| 2 | SC5 — o guarda prometido não existia | Guarda novo `marcacaoSoPorAcao.test.ts` (29 casos), com **duas réguas**. (a) **Quem escreve na tabela**: `insert`/`upsert`/`update`/`delete` em `product_filter_values`, `product_option_filter_values` e `filter_suggestion_dismissals` só no allowlist literal (`persistProduct.ts`, `useValueMarks.ts`, `useOptionMarks.ts`, `useSuggestionDismissals.ts`), com a metade positiva por igualdade. (b) **Quem chama a porta**: cada função exportada por esses arquivos tem allowlist literal de chamadores — `persistProductRelations` → `AdminProductFormPage.tsx` (Salvar); `gravarMarcacoesNaPeca`/`gravarMarcacoesPorOpcao`/`apagarMarcacoesNaPeca` → `aprovar.ts`; `aprovarSugestoes` → `SuggestionQueue.tsx` (Aprovar); `useValueMarks`/`useOptionMarks` → `AdminFilterValuePage.tsx` (marcação em massa da 66); `apagarMarcacoesPorOpcaoDoValor` → `useOptionMarks.ts` (o `unmark` dele); `gravarRecusas` → `aprovar.ts` e `FilterValuesCard.tsx` (os dois "Recusar"). Sem (b), um `gravarMarcacoesNaPeca(...)` num `useEffect` passaria por (a). Âncora dupla (≥ 400 arquivos, um nomeado de cada app; ≥ 1 `from()` por tabela) e âncora das portas (cada uma declarada uma vez). Sensores: forma compacta e quebrada em linhas, as quatro operações, CRLF, LF, glob de dois asteriscos (`BL-027`, montado por concatenação), inverso (leitura), escrita em outra tabela no meio, nome de tabela exato (`product_filter_values` × `product_option_filter_values`), chamada × declaração × import × método homônimo × prefixo de outro nome. **Prova de que teste não é varrido**: `__tests__/`, `*.test.*` e `src/test/` ficam fora, e o próprio arquivo — que carrega as formas proibidas — está em `todos` e **seria** acusado. **Nenhum escritor fora de "Aprovar"/"Salvar"/marcação em massa/recusa foi encontrado** | `apps/store/src/shared/lib/__tests__/marcacaoSoPorAcao.test.ts` (allowlists em `:45` e `:62`) |
| 3 | VFL-30 (B13) — "Aceitar" na peça toda sem a régua de "não grava" | O client do supabase passou a ser dublado no arquivo, com um espião em `from()`; o caso da peça toda ganhou `gravarRecusas`, `from()` e `onOptionMarksChange` não chamados, e o caso por opção ganhou o `from()` não chamado ao lado do que já tinha | `FilterValuesCard.variacoes.test.tsx:21`, `:27`, `:263`, `:312` |
| 4 | VFL-20 (B09) — "uma requisição" com N = 1 | Alvo peça toda com **três** sugestões e **duas** selecionadas ⇒ `calls` com tamanho 1 e as duas linhas no mesmo `upsert` | `aprovar.test.ts:94` |
| 5 | B23 — a régua do `<main>` sem prefixo de breakpoint | A régua virou o predicado `rolaOMain`, `/^(?:[\w-]+:)*overflow(?:-[xy])?-(?:auto\|hidden\|scroll\|clip)$/`, chamado pela asserção e pelos sensores; sensor D2 (`md:`, `lg:`, `hover:md:` reprovam) e D3 inverso (`overflow-visible`, `md:overflow-visible` e vizinhas passam) | `AdminLayout.test.tsx:360`, `:377`, `:385` |
| 6 | B26 — o snapshot dos eixos não se atualiza no save | **Não consertado: quase-equivalente, registrado.** O código de produção já faz o certo (`markSaved({ …, options: form.options })`); o mutante só é observável se a página continuar montada depois do save, e ela não continua: `markSaved` roda só no caminho de sucesso, imediatamente antes de `navigate('/admin/produtos')`, que desmonta a página. Um teste que o matasse teria de dublar `useNavigate` para não navegar — medir um mundo que o app não tem. **O risco é latente, e está nomeado**: se um dia surgir "Salvar e continuar", o snapshot velho faz a segunda renomeação ser comparada contra o eixo de antes da primeira (`Cor` → `Metal` → `Liga`: `remapOnAxisRename` leria `Cor → Liga`, não acharia marcação em `Cor`, e `pruneRemovedOptions` **apagaria** as de `Metal`). Quem escrever esse fluxo precisa do caso de página com duas gravações seguidas | — |
| 7 | VFL-36 — a prova de página remontava | Caso em **sessão contínua** em `/admin/filtros/acab`: o termo entra pelo campo de verdade, o dublê do catálogo re-renderiza quem o lê depois da escrita (a forma da releitura do hook real, já provada por B28), e o "Sugestões (N)" — o total da fila, `useFila` — vai de 0 a 1 **no mesmo nó do DOM** (`toBe(link)`). A tela da fila em si (`/admin/filtros/sugestoes`) não tem campo de termo; o número da fila é o mesmo `useFila` | `AdminFiltersPage.test.tsx:32` (o dublê) e `:623` |
| 8 | VFL-32 — "ou nada" × "Não marcada" | **Decisão: a copy da 66 fica.** "Não marcada" é o texto que a coluna já tinha na feature 66 (`git show HEAD:…/BulkAssignPanel.tsx`, linha 190), e trocar por ausência de texto deixaria a linha da peça sem marcação com um vazio que se lê como "ainda carregando". A tela não mudou; o ponto onde a string é escolhida ganhou o `// SPEC_DEVIATION (VFL-32)` | `BulkAssignPanel.tsx:232` |

### Mutantes reinjetados nos arquivos reais

Arnês: SHA-256 do arquivo antes, mutação por `replace` que **lança** se o alvo não aparecer
exatamente uma vez ou se a mutação não mudar nada, roda só o(s) arquivo(s) de teste
(`pnpm --filter <ws> exec vitest run … --testTimeout=20000`), restaura e confere o SHA. Todas as
restaurações conferiram. A morte foi classificada por mensagem: nenhuma foi por compilação.

| ID | Arquivo · mutação | Resultado |
| --- | --- | --- |
| **B25** | `AdminProductFormPage.tsx:91` · `marcacoesVigentes(…)` → `form.option_marks ?? []` | **morto por asserção** — VFL-05 e VFL-06 (2), nas duas suítes da página |
| **B13** | `FilterValuesCard.tsx` · o "Aceitar" da peça toda passa a chamar `gravarRecusas(...)` | **morto por asserção** — o caso da peça toda (1) |
| **B09** | `aprovar.ts` · alvo peça toda vira um `gravarMarcacoesNaPeca` **por peça**, num laço | **morto por asserção** — o caso de várias sugestões (1) |
| **B23** | `AdminLayout.tsx` · o `<main>` ganha `md:overflow-auto` | **morto por asserção em `AdminLayout.test.tsx`** (1) — antes só o guarda da fila o pegava |
| M36 | `useFila.ts` · `groups` sai das dependências do `useMemo` (a fila não recalcula com o catálogo novo) | **morto por asserção** só pelo caso contínuo (1). O caso antigo, que remonta, **sobreviveu** a ele — é a medida exata do que faltava em VFL-36 |
| G1 | `SuggestionStrip.tsx` · ganha um escritor em `product_option_filter_values`, quebrado em linhas | **morto por asserção** no guarda SC5 (2: intruso e igualdade) |
| G2 | `useSuggestionDismissals.ts` · o `upsert` das recusas vira `select` | **morto por asserção** — a metade positiva (1) |
| G3 | `FilterValuesCard.tsx` · o "Aceitar" chama `gravarMarcacoesNaPeca(...)` (a porta, não a tabela) | **morto por asserção** — régua das portas (1); a régua de tabela não o veria |
| G4 | `SuggestionStrip.tsx` · `delete` em `filter_suggestion_dismissals` com aspas duplas, depois de um comentário em CRLF | **morto por asserção** (2) |

B26: não reinjetado (ver lacuna 6).

### Gates (um por vez, exit code fora de pipe, `--testTimeout=20000` sem `--` nos apps)

| Gate | Rodada 1 | Rodada 2 | Exit |
| --- | --- | --- | --- |
| backoffice | 3477 / 198 | **3483 / 198** (+6: VFL-05, VFL-06, B09, sensores D2 e D3, VFL-36) | 0 |
| store | 5070 / 288 | **5099 / 289** (+29/+1: `marcacaoSoPorAcao.test.ts`) | 0 |
| core | 3011 / 122 | **3011 / 122** (não tocado) | 0 |
| `tsc` backoffice · store (`tsconfig.app.json`) | 0 · 0 | **0 · 0** | 0 · 0 |
| `pnpm lint` | 26/7 | **26/7** — backoffice 24/5 + store 2/2 (store medido sozinho, porque o turbo aborta a tarefa dele quando a do painel sai 1). Nenhum aviso em arquivo tocado nesta rodada | 1 (baseline) |

Functions e catalog-import não foram tocados nem remedidos. `packages/core/src/payment/**` intocado.

### Desvios declarados

- **VFL-36 não foi provada na rota `/admin/filtros/sugestoes`**, porque lá não há campo de termo. A
  prova é em `/admin/filtros/:groupId`, onde o termo é editado, sobre o total da fila (`useFila`, o
  mesmo número das duas telas por construção). O dublê do catálogo re-renderiza ao ser "publicado":
  a releitura de verdade é a do hook, provada pelo B28 da rodada 1.
- **O guarda SC5 tem um segundo nível (as portas) que a lacuna não pedia**, porque sem ele a régua de
  tabela aprova o caminho mais provável de regressão (G3).
- **B26 registrado como quase-equivalente**, sem teste — ver lacuna 6.

---

## Rodada 2 — verificação independente

**Veredito: PASS ✅, com um gap de guarda de prioridade alta registrado (não bloqueante).** Os quatro
sobreviventes da rodada 1 (B09, B13, B23, B25) foram reinjetados nos arquivos reais e morrem **por
asserção**, cada um pelo caso que a rodada 2 escreveu. As ACs VFL-05, 06, 20, 30 e 36 passam a ✅. O
SC5 tem guarda, e ela pega as formas de escrita que existem no código e a regressão mais provável
(G3). **Mas o mesmo conserto criou um buraco**: o guarda novo tem dez formas de evasão medidas,
listadas abaixo. A pior delas desmente o próprio cabeçalho do arquivo. Nenhum defeito de produto foi
encontrado.

- **Autor ≠ verificador.** Esta sessão não escreveu a feature nem o conserto. Nenhum arquivo de
  produto foi editado. A única escrita é esta seção.
- `git diff HEAD --stat` foi capturado antes da primeira mutação e conferido no fim: md5
  `e5c7e763…` nos dois. Todas as restaurações conferiram o SHA-256. Sem `git stash`.
- **Data**: 2026-10-18.

### Consertos conferidos contra a spec

| Item | Avaliação |
| --- | --- |
| VFL-05/06 (B25) | ✅ Os dois casos editam os eixos pelo `OptionsEditor` real e leem o diário do client real, por igualdade exata: o `upsert` com `Metal` e o `delete` pelos quatro campos. A variante R02 (renomear sem o snapshot salvo) também morre |
| SC5 | ⚠️ O guarda existe. A allowlist é literal e a metade positiva é por **igualdade** (`toEqual`), nos escritores e nas portas. Os sensores chamam o colhedor real (`escritoresDe` e `chamadoresDe` sobre um `Arquivo[]` sintético), e a âncora de arquivos nomeia um arquivo de cada app. A amostra **não** filtra o defeito para fora no que mede. Os buracos estão no **alcance**, ver o sensor |
| VFL-30 (B13) | ✅ O espião em `from()` enxerga escrita direta e escrita pela porta (R03 e R05 morrem). Ver R04 para o limite |
| VFL-20 (B09) | ✅ N=3, com duas selecionadas e igualdade das linhas. R06 (laço) e R07 (só a primeira) morrem |
| B23 / `rolaOMain` | ✅ Pega prefixo de breakpoint. Não vê `!overflow-auto`, `[overflow:auto]` nem `style` (R11–R13). Baixo risco |
| VFL-36 | ✅ A sessão é contínua e o nó do link é o mesmo (`toBe(link)`). O dublê republica ao gravar, e a releitura real está provada no hook (B28). A cadeia fecha em dois arquivos |
| VFL-32 | ✅ A decisão se sustenta: "Não marcada" é a copy da 66 (`git show HEAD` confirma, linha 190), e o `// SPEC_DEVIATION (VFL-32)` está em `BulkAssignPanel.tsx:232` |
| B26 | ✅ Aceito como quase-equivalente. `markSaved` só roda no caminho de sucesso, imediatamente antes de `navigate('/admin/produtos')` (`AdminProductFormPage.tsx:300-309`), e é o único chamador. Nenhum outro caminho mantém a página montada depois de gravar. Reinjetado (R14), sobrevive, como esperado. O risco latente ("Salvar e continuar") está nomeado |

### Sensor: 26 mutantes novos nos arquivos reais

Arnês multi-arquivo próprio (`scratchpad/r2/mut.py`). Ele lança se o alvo não aparecer exatamente
uma vez, restaura os bytes originais e confere o SHA-256. Nenhuma morte foi por compilação.

| ID | Mutação | Resultado |
| --- | --- | --- |
| V01 | controle: `supabase.from('product_filter_values').upsert` direto em `SuggestionStrip.tsx` | morto (2) |
| **V02** | o mesmo, com o nome da tabela numa **variável** (`from(__T)`, o helper genérico) | **SOBREVIVEU** |
| **V03** | `const q = supabase.from('…option…')` e, mais de 300 caracteres depois, `q.delete()` | **SOBREVIVEU** |
| **V04** | escritor em `packages/core/src/hooks/useStoreSettings.ts` (fora de `ESCOPO`) | **SOBREVIVEU** |
| **V05** | `import { gravarMarcacoesNaPeca as __g }` e depois `__g([])` | **SOBREVIVEU** |
| **V06** | `gravarMarcacoesNaPeca?.([])` | **SOBREVIVEU** |
| **V07** | `.then(gravarMarcacoesNaPeca)` (a porta passada por referência) | **SOBREVIVEU** |
| **V08** | uma porta **nova** exportada por `useValueMarks.ts` (arquivo autorizado) e chamada de `SuggestionStrip.tsx` | **SOBREVIVEU** |
| **V09** | `supabase.rpc('marcar_filtros', …)` (teórico: hoje não existe RPC que escreva) | **SOBREVIVEU** |
| **V10** | `.from(\n 'product_filter_values',\n)` com vírgula final, a forma do Prettier | **SOBREVIVEU** |
| **V11** | `gravarMarcacoesNaPeca<unknown>([])` | **SOBREVIVEU** |
| V12 | metade positiva: o "Recusar" do produto deixa de chamar `gravarRecusas` | morto (régua das portas + suíte do bloco) |
| R01 | **B25** reinjetado | morto (2) |
| R02 | `marcacoesVigentes(form.options, form.options, …)` | morto (1) |
| R03 | **B13** reinjetado (`gravarRecusas` no "Aceitar" da peça toda) | morto (1) |
| **R04** | B13 **adiado**: `Promise.resolve().then(() => gravarRecusas(…))` | **SOBREVIVEU** |
| R05 | o "Aceitar" chama `gravarMarcacoesNaPeca` (passa pela rede) | morto (1) |
| R06 | **B09** reinjetado (um `upsert` por peça) | morto (1) |
| R07 | alvo peça toda grava só a primeira selecionada | morto (1) |
| R08 | alvo opção: uma requisição por peça | morto (2) |
| **R09** | `recusarSugestoes`: uma requisição por peça | **SOBREVIVEU** |
| R10 | **B23** reinjetado (`md:overflow-auto` no `main`) | morto (2: layout e fila) |
| R11 | `!overflow-auto` no `main` | **SOBREVIVEU** |
| R12 | `[overflow:auto]` no `main` | **SOBREVIVEU** |
| R13 | `style={{ overflow: 'auto' }}` no `main` | **SOBREVIVEU** |
| R14 | **B26** reinjetado | **SOBREVIVEU** (aceito, quase-equivalente) |

**Total: 26 · 12 mortos por asserção · 0 por compilação · 14 sobreviventes.** Todos os
sobreviventes estão no guarda novo ou em réguas vizinhas. Nenhum cai em AC de produto, exceto R09,
que é uma promessa de comentário.

### Gates (um por vez, exit code fora de pipe, `--testTimeout=20000` sem `--` nos apps)

| Gate | Resultado | Exit |
| --- | --- | --- |
| core | 3011 / 122 | 0 |
| store | 5099 / 289 | 0 |
| backoffice | 3483 / 198 | 0 |
| functions | 977 / 22 | 0 |
| catalog-import | 512 / 23 | 0 |
| **Total** | **13082 / 654** | |
| `tsc` store · backoffice | 0 · 0 | 0 · 0 |
| lint | backoffice 24/5 + store 2/2 = **26/7** (baseline) | 1 · 1 (baseline) |
| `pnpm build` | os dois apps | 0 |
| `git diff --name-only HEAD -- packages/core/src/payment` | vazio | — |

### Gaps restantes, ranqueados

1. **O guarda SC5 não deriva as portas das exportações (V08).**
   `apps/store/src/shared/lib/__tests__/marcacaoSoPorAcao.test.ts:62` (`PORTAS` literal). O
   cabeçalho (`:22-25`) e a rodada 2 do implementador dizem "cada função exportada por esses arquivos
   tem allowlist", e isso é falso. Uma função nova exportada por `useValueMarks.ts` ou
   `useOptionMarks.ts` que grave, chamada de um `useEffect` em qualquer tela, passa pelas duas
   réguas. É o "aplicar sugestões ao abrir a peça" que o próprio cabeçalho cita como o pedido
   razoável. *Conserto*: colher do disco os `export const|function` dos arquivos de `ESCRITORES` e
   exigir que o conjunto seja **igual** às chaves de `PORTAS` mais uma lista literal de leitoras
   (`lerMarcacoesDoValor`, `lerRecusas`…).
2. **A régua de escrita só vê `from('<literal>')` (V02, V10).** `:128-131`. Um helper genérico com o
   nome da tabela em variável, ou a vírgula final que o Prettier produz numa chamada quebrada,
   escapam. *Conserto*: aceitar `,?\s*` antes do `)`. Para a variável, recusar `from(` com argumento
   não literal nos arquivos de produção do painel, ou ao menos ter um sensor declarando o limite.
3. **`ESCOPO` não inclui `packages/` (V04, `L-035`).** `:39`. `packages/core/src/hooks` já usa o
   client do supabase.
4. **A régua de chamada é sintática (V05, V06, V07, V11).** `:141-142`. Alias de import, `?.(`,
   genérico e passagem por referência escapam. Barato de fechar: seguir o alias do `import`, aceitar
   `?.` e `<…>` antes do `(`, e acusar o identificador como argumento.
5. **"Não grava" é asserido de forma síncrona (R04).**
   `FilterValuesCard.variacoes.test.tsx:263,312`. Uma escrita adiada por microtarefa ou
   `setTimeout` no "Aceitar" passa. Para a peça toda pela tabela, o SC5 cobre. Para `gravarRecusas`,
   não cobre, porque `FilterValuesCard.tsx` é um chamador autorizado. *Conserto*:
   `await act(async () => {})` antes das ausências.
6. **`recusarSugestoes` promete "numa requisição só (VFL-21)" e nada mede isso (R09).**
   `aprovar.ts:63`. A spec não exige uma requisição na recusa, então a lacuna é do comentário: ou o
   caso com N ≥ 2, ou a citação a VFL-21 sai.
7. **`rolaOMain` e a régua da fila não veem `!`, propriedade arbitrária nem `style` (R11–R13).**
   `AdminLayout.test.tsx:360`. Baixo risco.
8. Herdados da rodada 1, sem mudança: o SC de Prata 925 é falso no catálogo pela curadoria da 66, a
   ordenação por "menor preço" usa o preço da peça, e não há guarda de rolagem horizontal do body
   depois da remoção do `overflow` do `main`.

### Lições candidatas

- **Allowlist de portas escrita à mão não cobre a porta que ainda não existe.** Para "só estes
  arquivos escrevem", a lista de funções que eles exportam precisa ser **colhida do disco** e
  comparada por igualdade. Sem isso, a régua 2 só guarda as portas de hoje, e a regressão provável é
  justamente uma porta nova. *(V08)*
- **Régua de uso por regex mede a grafia, não a chamada.** Alias de import, `?.(`, genérico,
  referência e vírgula final do Prettier são cinco grafias da mesma escrita. Ou a régua passa a ler a
  AST (molde de `wiringResolve.test.ts`), ou cada grafia ganha um sensor que declara o limite.
  *(V05–V07, V10, V11)*
- **Ausência asserida logo depois de um evento síncrono não vê efeito adiado.** Drene as microtarefas
  antes de asserir "não gravou". *(R04)*

---

## Rodada 3 — endurecimento do guarda SC5

**Data**: 2026-10-18. Fecha os gaps 1–7 da verificação independente da rodada 2. Só testes e guardas
mudaram; o único toque em produção é o **comentário** de `recusarSugestoes` em `aprovar.ts`. Nenhuma
asserção foi afrouxada. Sem commit, sem `git stash`.

### O que mudou

| Gap | Conserto | Onde |
| --- | --- | --- |
| 1–4 (V02–V11) | `marcacaoSoPorAcao.test.ts` **reescrito sobre a AST do TypeScript** (molde de `wiringResolve`). Quatro réguas: **(1) tabela** — toda `X.from(arg)` de produção é seguida pela cadeia (atravessando `await`, parênteses, `as`, `!`, e o alias `const q = X.from(…)` a qualquer distância) até o primeiro `select` ou a primeira escrita; builder que **escapa** sem nenhum dos dois (devolvido, argumento, propriedade) conta como escrita. Tabela literal **ou** `const X = '<literal>'` do mesmo arquivo ⇒ só o allowlist; tabela não resolvível ⇒ acusada em qualquer arquivo (`TABELA_DINAMICA` vazio — **nenhum arquivo atual tem a forma**; os três `from(TABLE)` de `useCoupons.ts` resolvem para `'coupons'`). **(2) portas** — os exports de valor de `useValueMarks`, `useOptionMarks`, `useSuggestionDismissals`, `persistProduct` e `aprovar.ts` são **colhidos do disco** e comparados por igualdade com `portas ∪ naoEscrevem`; a classificação é **medida** (corpo da porta escreve ou usa outra porta; corpo da `naoEscreve`, nenhuma das duas). `recusarSugestoes` entrou como porta — não estava na lista. **(3) uso** — toda referência de valor (chamada, `?.(`, genérico, referência, `{ porta }`, `ns.porta`, `m['porta']`), resolvendo alias de `import { p as y }` e de `export { p as y }`, só nos usuários do allowlist. **(4) RPC** — conjunto chamado = `RPCS` por igualdade, todo nome literal, cada um com `create function` numa migration, e nenhuma migration escreve nas três tabelas. Escopo: `apps/{store,backoffice}/src`, `packages/{core,supabase,auth,ui}/src` e `supabase/functions`, com âncora nomeando um arquivo de cada ponta (incl. `packages/core/src/hooks/useStoreSettings.ts`). Âncora de AST (≥ 150 `from()`, ≥ 5 RPCs). 29 → **83** casos | `apps/store/src/shared/lib/__tests__/marcacaoSoPorAcao.test.ts` |
| 5 (R04) | Os dois casos de "Aceitar" drenam microtarefas e um tique de timer (`await act(async () => { await new Promise(r => setTimeout(r, 0)) })`) antes de asserir "não grava" | `FilterValuesCard.variacoes.test.tsx` |
| 6 (R09) | **Medido**: caso com três sugestões e duas selecionadas ⇒ uma requisição com as duas linhas. O comentário deixou de atribuir o "uma só" a VFL-21 (que pede a recusa, não o número) e aponta o teste | `aprovar.test.ts`, `aprovar.ts:63` (comentário) |
| 7 (R11–R13) | `rolaOMain` aceita `!` (frente, depois das variantes, fim) e `[overflow…:…]` (exceto `visible`); `estiloDe`/`estiloRola` leem o `style` do `<main>`. Sensores D4 (`!`), D5 (arbitrário), D6 (`style`, com inversos `minWidth` e `visible`, e o `style` de um filho não vazando) | `AdminLayout.test.tsx` |

### Mutantes reinjetados nos arquivos reais

Arnês `scratchpad/r3/mut.py` (o da rodada 2): lança se o alvo não aparece exatamente uma vez ou se a
mutação é no-op, restaura os bytes e confere o SHA-256. Todas as restaurações conferiram. Nenhuma
morte por compilação.

| ID | Resultado |
| --- | --- |
| V01 (controle), **V02** (tabela em `const`), **V03** (alias a > 300 caracteres), **V04** (`packages/core`), **V10** (vírgula do Prettier) | **mortos por asserção** — escritores = allowlist (1 cada) |
| **V05** (alias de import), **V06** (`?.(`), **V07** (referência), **V11** (genérico) | **mortos por asserção** — usuários da porta (1 cada) |
| **V08** (porta nova em `useValueMarks.ts`) | **morto por asserção** — exports colhidos (1) |
| **V09** (RPC nova) | **morto por asserção** — conjunto de RPCs (1) |
| V12 (metade positiva: "Recusar" deixa de chamar `gravarRecusas`) | **morto por asserção** — guarda (1) e suíte do bloco (2) |
| V13 (`recusarSugestoes` por referência fora da fila) · V14 (export novo em `aprovar.ts`) · V15 (função de migration que insere em `product_filter_values`) · V16 (tabela em `let`) · V17 (alias pelo barril) · V18 (`import * as`) · V19 (builder devolvido) | **mortos por asserção** (1, 2, 1, 1, 1, 1, 1) |
| **I01 — inverso**: `select` por alias em `product_filter_values` e `update` em `products`, em `SuggestionStrip.tsx` | **sobrevive** (guarda verde), como deve |
| **R04** (recusa adiada por microtarefa no "Aceitar" da peça toda) · R04b (o mesmo por `setTimeout` no "Aceitar" por opção) | **mortos por asserção** (1 cada) |
| **R09** (recusa uma requisição por peça) | **morto por asserção** — o caso novo (1) |
| **R11** (`!overflow-auto`) · **R12** (`[overflow:auto]`) · **R13** (`style={{ overflow: 'auto' }}`) | **mortos por asserção** (1 cada) |

**Total: 26 mutantes · 25 mortos por asserção · 0 por compilação · 1 sobrevivente (o inverso, esperado).**

### Gates (um por vez, exit code fora de pipe, `--testTimeout=20000` sem `--`)

| Gate | Rodada 2 | Rodada 3 | Exit |
| --- | --- | --- | --- |
| store | 5099 / 289 | **5153 / 289** (+54: o guarda, 29 → 83) | 0 |
| backoffice | 3483 / 198 | **3487 / 198** (+4: R09, D4, D5, D6) | 0 |
| `tsc` store · backoffice | 0 · 0 | **0 · 0** | 0 · 0 |
| lint | 26/7 | **26/7** — backoffice 24/5 + store 2/2, nenhum em arquivo tocado | 1 · 1 (baseline) |

### O que o guarda ainda NÃO mede (declarado no cabeçalho dele)

- Porta alcançada por **acesso computado** (`mod['gravar' + 'Recusas']`) — o nome não existe na fonte.
- Escrita por `fetch` cru ao PostgREST, sem o client.
- **Onde** o uso acontece dentro de um usuário autorizado (atrás do clique ou num efeito): isso é dos
  testes de componente.
- Builder em `let` estreitado por reatribuição (`q = q.select()`) é tratado como **fuga** — erro para
  o lado que acusa, com sensor; nenhum arquivo atual tem a forma.
- A RPC é provada por **nome**: a varredura das migrations recusa escrita SQL nas três tabelas, mas
  não segue `execute format(…)` dinâmico dentro de uma função.

## Pós-verificação — decisões do usuário

- **2026-10-18 — o link do card acompanha a cor tocada, e o preço ordena como o card mostra.**
  `ProductCard.tsx`: depois do toque o `?variant=` é o da variação que dá o preço (com e sem filtro);
  cor sem linha vendável ⇒ link da peça; voltar à cor casada devolve a casada. `filters.ts`:
  `sortMatches` ordena por `matchPrice` (`variant.price ?? product.price`). Testes: +7 em
  `ProductCardMatchedVariant.test.tsx`, +4 em `filters.test.ts` (fixtures que invertem a ordem,
  `L-013`); o `describe` antigo de `sortMatches` só foi renomeado ("sem variação casada"). 6 mutantes
  nos arquivos reais (SHA-256 conferido): 6 mortos por asserção, 0 por compilação. Gates: store
  **5164 / 289** (exit 0, +11), `tsc` store **0**, lint store **2/2** (exit 1, baseline).
