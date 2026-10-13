# Revisão — Tasks (rodada 1)

Veredito: REPROVADO

## Achados

### R1 — A T07 deixa a suíte do painel vermelha por duas fases e cruza o corte de lote, e o "Done when" dela se contradiz (importante)
- Onde: `tasks.md` T07, último item do "Done when" (linha 241): "Quick (core) e quick (store) passam. **Esperado**: `HomeBlockTray.test.tsx` (backoffice) e `HomeRenderer.test.tsx` (store) passam a reprovar"; Gate Check Commands, linha 59: "Full | fim de cada fase | os três workspaces"; linha 484: lotes "[Fase 1] · [Fases 2 + 3] · [Fase 4]".
- Problema: são três problemas juntos.
  1. **A previsão está errada do lado da loja.** `HomeRenderer.test.tsx:95` assere `HOME_SECTION_RENDERERS.category_grid` nulo, o que depende do registro de renderers e não do catálogo. Mudar `COMING_SOON` não o derruba. O item diz ao mesmo tempo que o quick da loja passa e que um arquivo da loja reprova. Do lado do core, a T07 também derruba `catalog.test.ts:156` ("os outros dez NÃO são em breve", lista literal de dez tipos), que ela não cita.
  2. **O que reprova de verdade é a suíte do painel:** `HomeBlockTray.test.tsx:68-69,104,121` assere `category_grid` desabilitado e "em breve". Isso continua vermelho da T07 até a T14, ou seja, o fim inteiro da Fase 1 e as Fases 2 e 3. O gate "Full ao fim de cada fase" da Fase 1 não tem como passar, e o primeiro lote de execução (Fase 1 sozinha) termina com um workspace vermelho que só o lote seguinte conserta.
  3. Entre a T07 e a T14 o produto fica incoerente: a bandeja (`HomeBlockTray.tsx:45`) passa a oferecer o bloco sem que exista editor (`SECTION_EDITORS.category_grid` ausente).
- Cenário: o Verifier ou a revisão de adequação do lote 1 vê a suíte do backoffice reprovando e não consegue distinguir a reprovação "declarada" de uma regressão. É o mesmo problema que a `47` teve com reprovações herdadas registradas na baseline. Nesse meio-tempo, o executor da T10 vai procurar no `HomeRenderer.test.tsx` uma reprovação "esperada da T07" que nunca existiu.
- Sugestão: mover a T07 para a Fase 3, logo antes da T14, ou fundi-la com a T14, porque a inversão de `catalog.test.ts` e a de `HomeBlockTray.test.tsx` são a mesma mudança vista por dois lados. Nada na Fase 2 depende do catálogo: o widget e o registro da loja não leem `comingSoon`. Então a T08 pode depender da T06, não da T07. No "Done when" da tarefa que ficar com a mudança, citar também a lista de `catalog.test.ts:156`, que passa de dez para onze tipos.

### R2 — A recusa ligada pelo registro nunca é provada pela árvore real: apagar `refusal:` de `SECTION_EDITORS` deixa a suíte verde (importante)
- Onde: T12 ("um caso prova que a recusa de `core` chega intacta"); T13 (o "Done when" não tem nenhum item de salvar); T14, linhas 395 e 399 ("`SECTION_EDITORS.category_grid = { Body: CategoryListEditor, refusal: categoryListRefusal }`" e "abrir a seção pela `HomeSectionEditor` monta o `CategoryListEditor`").
- Problema: a LCT-19 pede que o painel recuse "**antes de qualquer gravação**" e "**preserve o rascunho**". A LCT-20 pede que o teto valha "**também na gravação**". Quem aplica a recusa é o casco (`HomeSectionEditor.tsx:104`: `editor?.refusal?.(config, items)`), lendo do registro. A T12 testa a função isolada, e a T14 só prova que o `Body` monta. Nenhuma tarefa tem o caso "salvar pelo `HomeSectionEditor` com um item sem imagem → a frase aparece, a gravação não é chamada, o rascunho continua". O precedente do projeto faz exatamente isso: `FeaturedProductsEditor.test.tsx:3` ("Montado pelo `HomeSectionEditor` de verdade, e não solto: a recusa mora no casco") e o caso inverso na linha 383. A ordem das tarefas também impede que a T13 siga o molde, porque o registro só nasce na T14.
- Cenário: um mutante que remova `refusal: categoryListRefusal` do registro, ou que troque por outra recusa, sobrevive à suíte inteira. A dona salva uma categoria sem imagem, o `insert` acontece, e a loja desenha um círculo vazio. É a memória "teste não monta a árvore que prova" e o achado nº 1 da `41`, da `44` e da `49`.
- Sugestão: levar o registro (`sectionEditors.tsx`) para a T13, ou pôr na T14 um "Done when" explícito: pelo `HomeSectionEditor` real, salvar com item sem imagem, sem coleção e com 25 itens mostra a frase literal e **não** chama a gravação (dublê que registra a escrita), e o rascunho mantém os itens. Mais o inverso: um rascunho válido grava. A T14 também tem de dizer em que arquivo de teste isso mora. Hoje o **Where** dela não lista nenhum arquivo que monte o `HomeSectionEditor`, e `HomeSectionEditor.test.tsx` não existe.

### R3 — O caso "tipo sem renderer é pulado" vira verdadeiro sobre o nada depois da T10 (importante)
- Onde: `apps/store/src/widgets/home-renderer/ui/__tests__/HomeRenderer.test.tsx:106-110` (`it('tipo sem renderer é pulado e NÃO quebra a página'`, com fixture `{ type: 'category_grid', …, config: {} }`). No `tasks.md`, T10, linha 308: o único caso citado para inverter é o da linha 95.
- Problema: hoje `category_grid` é o único tipo sem renderer, e o caso o usa como exemplo. Depois da T10 ele passa a ter renderer, e com `config: {}` e zero itens o renderer devolve `null` (LCT-11). Aí o caso continua verde **sem medir mais "tipo sem renderer"**: ele é verdadeiro com e sem o tratamento de tipo desconhecido. É a lição registrada no `CLAUDE.md` da `45`: uma fixture que nomeia uma condição tem de provar que a condição existe.
- Cenário: alguém remove a defesa do `HomeRenderer` contra tipo sem componente (linha vinda do banco gravada por versão mais nova), e a suíte continua verde. Quem pagaria é a Home inteira caindo em produção.
- Sugestão: na T10, trocar a fixture desse caso por um tipo desconhecido, com cast, no molde de `sectionMeta('nao_existe')` em `catalog.test.ts`, e pôr ao lado uma asserção de que o tipo usado de fato não tem entrada em `HOME_SECTION_RENDERERS`.

### R4 — A T04 pede uma asserção "no teste do painel" sem nomear o arquivo, e ele não existe (menor)
- Onde: T04, **Where** (linha 166) e "Done when" (linha 175): "asserção `toBe` de identidade no teste do painel".
- Problema: não há teste de `sectionRefusals.ts` no painel. `model/__tests__/` só tem `applyDraft`, `toNewItems` e `usePreviewBridge`. Quem cria `sectionRefusals.test.ts` é a T12, que vem depois ("novo ou existente").
- Cenário: o executor da T04 inventa um lugar, ou pula a asserção de identidade.
- Sugestão: incluir `apps/backoffice/src/features/home-composition/model/__tests__/sectionRefusals.test.ts` (novo) no **Where** da T04, e na T12 trocar "novo ou existente" por "existente (criado na T04)".

### R5 — O resumo da linha do painel diria "automático" para um bloco que nunca é derivado (menor)
- Onde: `apps/backoffice/src/features/home-composition/ui/HomeSectionRow.tsx:73-112`. `resumo()` não tem `case 'category_grid'` e cai no `default: return fonte`, que vale `'automático'` sem curadoria. A T14 só troca o ícone.
- Problema: o design (`resolve.ts`, "`derive` continua devolvendo `[]`... bloco só por curadoria") torna "automático" uma afirmação falsa. Ela apareceria na mesma linha que "Não vai aparecer: nenhuma categoria escolhida." (LCT-24). Detalhe ao lado: o candidato de ícone que o design sugere, `GalleryHorizontal`, já é o de `hero_carousel` (`HomeSectionRow.tsx:56`).
- Cenário: a dona acrescenta o bloco e lê "automático", que se contradiz com o aviso ao lado.
- Sugestão: na T14, um `case 'category_grid'` no resumo (por exemplo "`n` categorias · escolhidas por você"), com um caso de teste, e um ícone diferente do usado pelo `hero_carousel`.

### R6 — Pendências de rastreabilidade no fecho (menor)
- Onde: T17, **Where** e "Done when"; `spec.md`, *Requirement Traceability* ("Coverage: 40 total, 0 mapped... Status Pending").
- Problema: a T17 não atualiza o status e o mapeamento da tabela de rastreabilidade da spec. Fora isso, a tabela de rastreabilidade do `tasks.md` mapeia por faixa (`LCT-01..LCT-13 → T06, T08, T09, T10, T16`), não ID a ID, e isso esconde, por exemplo, que a LCT-15 não tem nenhum item próprio de "Done when" (abaixo).
- Cenário: o Verifier precisa reconstruir à mão qual tarefa cobre cada AC.
- Sugestão: na T17, atualizar a tabela da spec. Opcionalmente, quebrar a rastreabilidade do `tasks.md` por ID.

### R7 — LCT-15 sem item verificável (menor)
- Onde: a T14 lista LCT-15 em **Requirement**, mas nenhum item do "Done when" cobre "nasce desligado e sem itens; o editor abre com 'Título da seção' e a lista vazia com 'Adicionar categoria'". A T13 cobre só a lista vazia.
- Problema: a primeira metade depende do comportamento genérico `HOME-10`, e ninguém o confere para este tipo.
- Sugestão: um item na T14: acrescentar o bloco pela bandeja ⇒ a seção nasce com `active: false` e `items: []`, e o editor abre no estado vazio.

## Conferido sem achado
- **Gate Check Commands existem:** `@estrelinha/core`, `@estrelinha/store`, `@estrelinha/backoffice`, `@estrelinha/functions` e `@estrelinha/catalog-import` têm `test` = `vitest run`. `lint` existe em store, backoffice e catalog-import. A forma `--testTimeout=20000` sem `--` segue o `CLAUDE.md`. O `tsc` usa `tsconfig.app.json`.
- **Migration:** o prefixo `20261012120000` não existe em `supabase/migrations/`, e o último é `20261011120000_63-retirada.sql`. É único e posterior, como pede a LCT-26.
- **Arquivos citados existem:** `packages/supabase/src/types/home.ts`, `apps/store/src/entities/home/api/__tests__/useHomeSections.test.tsx`, `apps/backoffice/src/entities/home/api/useAdminHomeSections.test.ts`, `model/__tests__/{toNewItems,applyDraft}.test.ts`, `model/useAdminResolvedHome.test.ts`, `ui/{HomeBlockTray.test.tsx,HomeSectionRow.tsx,sectionEditors.tsx,HomeSectionEditor.tsx}`, `core/home/__tests__/{carousel,catalog,resolve}.test.ts`.
- **Contagem da T11:** `DraftItem` tem hoje 9 campos (7 colunas mais `key` e `product_slug`). Com `title` são 10, como a âncora "exatamente dez campos" diz. `toNewItems.test.ts` já mede por igualdade de chaves (`COLUNAS_GRAVADAS`).
- **`ordinalF`:** existe só no painel (`sectionRefusals.ts:42`) e `CollectionRowsEditor.tsx:29` o importa dali, então o reexport da T04 mantém esse consumidor.
- **`ResolvedItem.categoryId`:** existe (`core/home/resolve.ts:14`), e é a base do `null` de `categoryListItem` para destino que não é coleção.
- **`previaUnica.test.ts`:** varre `snap-x|snap-mandatory|scroll-snap` em todo o painel. A T13 recusa os três no editor, e a lista de tipos em `previaUnica.test.ts:130-142` não muda.
- **Dependências:** sem ciclo e sem dependência apontando para fase posterior. A tabela *Diagram-Definition Cross-Check* bate com os campos **Depends on**.
- **Convenções do projeto:** itens numerados `NN-kebab-case`; o campo **Commit** foi declarado como mensagem planejada, sem commit por tarefa (`BL-012`); proibição de `git stash`; medição um workspace por vez; `payment/**` intacto no gate de build; baseline de entrada medida com a árvore parada.
- **Matriz de cobertura:** cobre core, schema, mapeamento, widget, registros, editor, banco real (T15) e navegador (T16). As tarefas de teste estão co-localizadas, e a prova de navegador cobre A-14, 390 e 1440, a prévia sem recarregar e o LCP (R4 do design).
- **Mapeamento das ACs:** todas as 40 ACs aparecem em pelo menos uma tarefa (conferido ID a ID contra os "Done when" das T01 a T16; a LCT-15 só tem item parcial, ver R7). Não há tarefa sem requisito.

## Resposta do autor

Todos os achados foram aplicados em `tasks.md`; nenhum recusado.

- **R1**: o catálogo saiu da Fase 1 e virou a **T13**, logo antes do registro do painel (T14), e inverte `catalog.test.ts` (inclusive a lista da linha 156) e `HomeBlockTray.test.tsx` **na mesma tarefa**. A previsão errada sobre `HomeRenderer.test.tsx` foi removida. Renumeração: widget T07, setas T08, registro da loja T09, rascunho T10, recusa T11, editor T12. Toda fase termina verde; a bandeja só oferece o bloco depois que o editor existe.
- **R2**: a T14 prova a recusa pelo `HomeSectionEditor` real (sem imagem, sem coleção, 25 itens), com nenhuma escrita no dublê e o rascunho preservado, e um sensor que remove `refusal:` do registro.
- **R3**: a T09 troca a fixture do caso "tipo sem renderer" por um tipo desconhecido.
- **R4**: `sectionRefusals.test.ts` é criado na T04 (caminho fixado) e ganha casos na T11.
- **R5**: a T14 acrescenta `case 'category_grid'` no resumo ("N categorias") e usa `CircleDot`.
- **R6**: rastreabilidade ID a ID no `tasks.md`; a T17 a copia para a `spec.md` com o status final.
- **R7**: a T14 tem item próprio para a LCT-15.
