# Listagem v2 e Operações em Lote — Specification

**Criada:** 2026-07-31 (fatiada de `07-product-catalog-admin` por `AD-009`)
**Contexto:** [`../07-product-catalog-admin/context.md`](../07-product-catalog-admin/context.md) —
contexto de **programa**, comum às quatro features. Desenho no Paper (arquivo **Nanapin**, página
**Backoffice - Produtos**): <https://app.paper.design/file/01KPBGSMF2DP3MQVAEB171ZMDZ/6-0>
**Artboards:** *Produtos — listagem v2* · *Produtos — edição em massa* · *Produtos — grade rápida*
**Escopo:** frente **D** (listagem/lote) + a limpeza final do modelo legado. **10 requisitos · 5 tasks.**

> ### Feature 4 de 4
>
> **Depende de** [`07-product-catalog-admin`](../07-product-catalog-admin/spec.md) — e **só** dela.
> Roda **em paralelo** com [`11-product-form-v2`](../11-product-form-v2/spec.md).
>
> **Exceção:** a última task (`T42`, remoção das colunas legadas) tem pré-condição sobre as **três**
> outras features. É a única costura do programa que exige tudo fechado — ver *P4.1*.
>
> **Numeração preservada.** Aqui ficam **T38–T42**.

---

## Problem Statement

A listagem só lê. Mudar o preço de 12 produtos são 12 idas ao formulário; cadastrar 20 são 20.

E ela lê mal. `useAdminProducts` faz `select('*, categories(name)')` **sem `range`, sem `count`**
([`useAdminProducts.ts:15-18`](../../../apps/backoffice/src/entities/product/api/useAdminProducts.ts#L15-L18)) —
traz o catálogo inteiro, com `variants` JSONB e `images` de cada produto, e filtra, ordena e pagina **em
memória** ([`AdminProductsPage.tsx:52-76`](../../../apps/backoffice/src/pages/admin/AdminProductsPage.tsx#L52-L76)).
Com 160 produtos já é desperdício; a tela desenhada mostra `1–25 de 160` com contagem por visão, o que
não se resolve em memória sem trazer tudo, sempre.

O único caminho em lote hoje é o importador de CSV — e ele **refaz o catálogo a cada linha**:
`handleBatchImport` chama `createProduct` num laço
([`:86-90`](../../../apps/backoffice/src/pages/admin/AdminProductsPage.tsx#L86-L90)) e cada
`createProduct` termina em `fetchProducts()`
([`useAdminProducts.ts:63`](../../../apps/backoffice/src/entities/product/api/useAdminProducts.ts#L63)).
40 produtos = 40 `SELECT`s do catálogo inteiro.

Com a `07` fechada, a listagem finalmente **tem o que mostrar** — faixa de preço por variação, saldo
somado, `sempre disponível`, `grade incompleta`. Falta a camada de dados que aguente mostrar.

---

## Goals

- [x] **A listagem pergunta ao servidor:** paginação, busca, filtro, ordenação e `count` real no banco —
      nunca `select('*')` com filtro em memória.
- [x] **Corrigir na linha:** preço e estoque editáveis na célula, com teclado e desfazer.
- [x] **Reprecificar em lote:** ajustar 12 produtos em **uma** operação, com prévia conferível e desfazer.
- [x] **Cadastrar em lote:** os 20 itens de um drop colando do Excel, com **um** insert e **um** refetch.
- [x] **Fechar o legado:** `products.variants`, `sizes` e `finishes` deixam de existir.

---

## Out of Scope

| Item | Motivo |
| ---- | ------ |
| **Formulário de produto** | Feature [`11`](../11-product-form-v2/spec.md) — roda em paralelo com esta |
| **Mídia e estúdio** | Feature [`12`](../12-product-media-studio/spec.md) |
| **Migrações do modelo, `@nanapin/core`, checkout, RPC, loja** | Feature [`07`](../07-product-catalog-admin/spec.md) — pré-condição desta |
| **Os 3 inputs mascarados** | Entregues pela `07` em `shared/ui/inputs/` (`AD-010`). Aqui são **consumidos** pela edição inline e pela grade rápida |
| **Importador CSV v2** (mapeamento de colunas, dry-run, upsert por SKU) | D4 escolheu a grade rápida. O CSV atual continua funcionando como porta secundária no menu `Novo produto ▾` (`PLS-09`) |
| **Arrastar para ordenar produtos na listagem** | A vitrine ordena por `created_at`; ordem manual é outra feature |
| **Duplicar produto *com* variações a partir da listagem** | O `?from=` atual copia campos rasos; copiar N linhas de variação fica para depois |
| Visões salvas compartilhadas entre usuários | `PLS-02` persiste em `localStorage` por navegador — tabela nova não se justifica para um backoffice de poucos operadores |

---

## Assumptions & Open Questions

Numeração **herdada da spec original**. As assumções de schema e dinheiro vivem na
[`07`](../07-product-catalog-admin/spec.md) e valem aqui como pré-condição.

| # | Assumção / decisão | Default escolhido | Rationale | Confirmado? |
| - | ------------------ | ----------------- | --------- | ----------- |
| A4 | Grade rápida e variações | **Cria as variações a partir dos padrões do lote** no mesmo insert | É o que economiza as 20 idas ao formulário | **sim** (usuário) |
| A13 | Idioma da UI | Português (pt-BR) | Convenção do projeto | **sim** |
| A22 | Persistência das visões salvas | **`localStorage` por navegador.** As visões padrão (`Todos`…`Agendados`) são fixas em código | Tabela nova + RLS para uma preferência de tela é custo sem demanda; o backoffice tem poucos operadores | não |
| A23 | Desfazer da edição em massa | **Segundo `update` com o snapshot capturado antes da escrita**, não `undo` transacional | Postgres não oferece undo de transação já commitada; o snapshot é a única forma honesta — e por isso o desfazer tem prazo (30 s) e some no reload | não |
| A24 | Teto do lote da grade rápida | **200 linhas**, com aviso explícito ao colar mais | Colar 500 linhas trava a aba; limitar com aviso é melhor que travar em silêncio |  não |
| A25 | Momento em que `T42` pode rodar | Só quando **as três outras features** estiverem fechadas — não basta `T41` | É a única task do programa com dependência sobre features que rodam em paralelo. Rodar antes remove colunas que a `11` ainda lê | **sim** (`AD-009`) |

**Open questions:** nenhuma bloqueante.

---

## User Stories

### P2.1 — Listagem v2 — servidor, visões, filtros e edição inline

**User Story**: Como admin, quero achar os produtos que importam e corrigir preço ou estoque **na
linha**, sem abrir 12 formulários.

**Why P2**: Alto valor operacional, mas depende do modelo de variação para exibir faixa de preço e saldo
somado corretamente.

**Acceptance Criteria**:

1. WHEN a listagem carrega THEN a paginação, a busca, os filtros e a ordenação SHALL ser resolvidos **no servidor** — SHALL não usar `select('*')` com filtro em memória.
2. WHEN a listagem é exibida THEN o rodapé SHALL mostrar `X–Y de N` com o total real vindo do `count` do servidor.
3. WHEN o admin escolhe uma visão salva THEN a lista SHALL aplicar o filtro correspondente entre `Todos`, `Ativos`, `Rascunhos`, `Sem estoque`, `Sem imagem`, `Sem SEO` e `Agendados`, exibindo a contagem de cada visão.
4. WHEN o admin aciona **Salvar visão atual** THEN o conjunto de filtros ativos SHALL virar uma visão nomeada, persistida em `localStorage` por usuário do navegador — as visões padrão (`Todos`…`Agendados`) são fixas em código e não exigem tabela nova (A22).
5. WHEN o admin aplica filtros THEN cada filtro ativo SHALL aparecer como chip com o valor e um `×` que o remove; os filtros disponíveis SHALL ser categoria (múltipla), tags, faixa de preço e estoque.
6. WHEN o admin busca THEN a busca SHALL cobrir nome, **SKU de variação** e tag.
7. WHEN o admin clica na célula de preço ou estoque THEN SHALL abrir um input na célula; `Enter` salva, `Tab` avança para a próxima célula editável, `Esc` cancela.
8. WHEN uma edição inline é salva THEN SHALL aparecer um toast com ação **Desfazer** que restaura o valor anterior.
9. WHEN o produto tem variações THEN a coluna Preço SHALL exibir a faixa (`R$ 14,90 – 18,40`) com o rótulo `N preços`, e a edição inline de preço SHALL ficar desabilitada com a explicação de que o preço vive na grade.
10. WHEN o produto tem `stock_policy = 'none'` THEN a coluna Estoque SHALL exibir `sempre disponível` e SHALL não ser editável.
11. WHEN a coluna Produto é exibida THEN SHALL mostrar thumb, nome, contagem de variações, slug e badges de pendência (ex.: `sem imagem`, e `grade incompleta` vindo de `PST-10`).
12. WHEN a coluna Status é exibida THEN SHALL mostrar `Ativo`, `Esgotado`, `Rascunho` ou a data de agendamento.
13. WHEN o admin abre o menu **Colunas** THEN SHALL poder mostrar/ocultar colunas e alternar a densidade da tabela.
14. WHEN o admin abre **Novo produto ▾** THEN SHALL oferecer `Novo produto`, `Grade rápida` e `Importar CSV`.

**Independent Test**: com 60 produtos, aplicar a visão `Sem imagem`, conferir que o total do rodapé bate
com o `count` do servidor e que apenas uma requisição de página é feita; editar um estoque inline e
desfazer.

---

### P2.2 — Edição em massa com prévia e desfazer

**User Story**: Como admin, quero reajustar preço, estoque, categorias e status de 12 produtos numa
tacada — vendo o impacto antes e podendo voltar atrás.

**Why P2**: D10. Alto valor, mas inútil sem a listagem v2 (seleção e filtro) por baixo.

**Acceptance Criteria**:

1. WHEN o admin seleciona linhas THEN a barra de massa SHALL oferecer `Editar em massa`, `Ativar`, `Pausar`, `Duplicar`, `Exportar` e `Excluir`, exibindo quantos itens estão selecionados.
2. WHEN há um filtro ativo THEN o admin SHALL poder selecionar **todos os N do filtro**, não só os da página visível.
3. WHEN o painel de edição em massa abre THEN cada campo SHALL ter um interruptor próprio, e **apenas** os campos ligados SHALL ser alterados.
4. WHEN o campo Preço está ligado THEN SHALL oferecer os modos `Definir valor`, `Aumentar %`, `Diminuir %` e `Arredondar` (com a opção `terminar em ,90`).
5. WHEN o campo Estoque está ligado THEN SHALL oferecer `Definir`, `Somar` e `Subtrair`, SHALL ignorar produtos com `stock_policy = 'none'` e SHALL informar na tela quantos foram ignorados.
6. WHEN os campos Categorias ou Tags estão ligados THEN SHALL oferecer `Adicionar` / `Remover` (e `Substituir`, só para categorias).
7. WHEN o campo Status está ligado THEN SHALL oferecer `Ativar`, `Pausar` e `Agendar`.
8. WHEN o admin ajusta os campos THEN a **Prévia do impacto** SHALL exibir antes → depois das primeiras linhas afetadas, o ticket médio antes e depois, e avisos de exclusão.
9. WHEN a operação é aplicada THEN o sistema SHALL exibir um toast com **Desfazer · 30 s** que reaplica os valores anteriores capturados antes da escrita (A23).
10. WHEN os 30 s expiram ou o admin recarrega a página THEN o desfazer SHALL desaparecer e a operação SHALL ser definitiva.
11. WHEN a operação em massa falha parcialmente THEN o sistema SHALL relatar quantos itens foram alterados e quantos falharam, sem deixar o estado da tela mentir sobre o resultado.

**Independent Test**: selecionar 12 produtos, aplicar `Aumentar 10%` no preço, conferir a prévia contra
o cálculo manual de 3 linhas, aplicar, desfazer e conferir que os 12 voltaram aos valores originais.

---

### P2.3 — Grade rápida — cadastro em massa

**User Story**: Como admin, quero cadastrar os 20 itens de um drop colando do Excel, com os padrões do
lote preenchendo o que se repete.

**Why P2**: D4. Resolve as 20 idas ao formulário, mas depende do modelo de variação para gerar a grade.

**Acceptance Criteria**:

1. WHEN o admin acessa `/admin/produtos/grade-rapida` THEN SHALL ver a faixa **Padrões de todas as linhas** (categorias, eixos de opção, preset de peso, salvar como rascunho) e a planilha.
2. WHEN uma linha não informa um campo coberto pelos padrões THEN o produto criado SHALL herdar o valor do padrão.
3. WHEN a planilha é exibida THEN as colunas SHALL ser `# · imagem · Nome* · Categorias · Preço* · Estoque · Tags · SKU base · check`.
4. WHEN o admin cola várias linhas do Excel com `⌘V` THEN o sistema SHALL distribuí-las em linhas e células, aplicando as mesmas máscaras do formulário ao interpretar preços.
5. WHEN o admin pressiona `Tab` THEN o foco SHALL avançar para a próxima célula; `⌥↓` SHALL duplicar a linha atual.
6. WHEN uma linha tem erro THEN o erro SHALL aparecer imediatamente **abaixo da linha** (ex.: `Preço é obrigatório`, `já existe um produto com a URL /...`), sem esperar o submit.
7. WHEN o rodapé é exibido THEN SHALL mostrar `N prontas · M com erro`.
8. WHEN o admin aciona a ação primária THEN o sistema SHALL criar **apenas** as linhas válidas, como rascunho, e SHALL manter as linhas com erro na tela para correção.
9. WHEN os padrões definem eixos de opção THEN cada produto criado SHALL nascer com a grade de variações resultante do cruzamento, herdando o preço da linha (A4).
10. WHEN N produtos são criados THEN a escrita SHALL usar um único `insert` em lote e **um** refetch — SHALL não chamar `fetchProducts()` por item.

**Independent Test**: colar 8 linhas do Excel com uma sem preço; conferir que o rodapé mostra
`7 prontas · 1 com erro`, que criar gera 7 produtos com a grade dos padrões, e que a rede registra um
insert e um refetch (não 7 de cada).

---

### P4.1 — Limpeza do modelo legado

**User Story**: Como sistema, preciso que `products.variants`, `sizes` e `finishes` deixem de existir,
para que não haja uma segunda verdade esperando ser lida por engano.

**Why P4**: É o fecho do programa. Enquanto as colunas existirem, qualquer código novo pode lê-las.

> **Pré-condição que atravessa features** (A25, `AD-009`): esta story só pode ser executada quando
> [`11`](../11-product-form-v2/spec.md) **e** [`12`](../12-product-media-studio/spec.md) estiverem
> fechadas, além da `07` e das demais tasks daqui. É a única costura do programa com essa forma —
> `T41` como dependência técnica **não é suficiente**. Rodar antes remove colunas que a `11` ainda lê.

**Acceptance Criteria**:

1. WHEN a migração de limpeza roda THEN `products.variants`, `products.sizes` e `products.finishes` SHALL deixar de existir.
2. WHEN a limpeza é executada THEN nenhum caminho de código em `apps/` ou `packages/` SHALL referenciar as três colunas.
3. WHEN os tipos são atualizados THEN os campos marcados `@deprecated` em `@nanapin/supabase/types` SHALL ser removidos.
4. WHEN `supabase db reset` roda após a limpeza THEN SHALL completar sem erro de ponta a ponta, com o `seed.sql` atual.
5. WHEN a limpeza termina THEN `pnpm build` e `pnpm test` SHALL passar e o lint SHALL permanecer na baseline conhecida (28 err / 7 warn), sem novos erros.

**Independent Test**: rodar `grep -rn "\.variants\b\|\.sizes\b\|\.finishes\b" apps packages` e conferir
que nenhum resultado é leitura de produto; depois `supabase db reset && pnpm build && pnpm test`.

---

## Edge Cases

- WHEN a edição em massa é aplicada sobre um filtro cujo resultado mudou desde a seleção THEN o sistema SHALL operar sobre os ids capturados no momento da seleção, não sobre o filtro reavaliado.
- WHEN o admin cola 500 linhas na grade rápida THEN o sistema SHALL limitar o lote a 200 com aviso explícito, em vez de travar a aba (A24).
- WHEN o produto tem variações THEN a edição inline de preço SHALL ficar desabilitada **com explicação** — desabilitar sem dizer por quê lê como bug.
- WHEN uma linha da grade rápida colide com um slug existente THEN o erro SHALL nomear a URL em conflito, não dizer só "já existe".
- WHEN a operação em massa falha parcialmente THEN o desfazer SHALL cobrir **apenas** os itens efetivamente alterados.
- WHEN o admin recarrega a página com um desfazer pendente THEN o buffer SHALL sumir — ele vive em memória, não em storage (A23).

---

## Requirement Traceability

**Frente:** D = listagem/lote (+ A para a limpeza). A coluna **Melhoria** referencia as 22 melhorias do
artboard *Produtos — sugestões de melhoria e mapa de código* (Paper).

| ID | Requisito | Story | Melhoria | Fase | Status |
| -- | --------- | ----- | -------- | ---- | ------ |
| PLS-01 | Listagem pagina, filtra, busca e ordena no servidor, com `count` real | P2.1 | 08 | 1 | Done |
| PLS-08 | Criação em lote com um `insert` e um refetch | P2.3 | 16 | 1 | Done |
| PLS-02 | Visões salvas + filtros em chips + busca por SKU | P2.1 | 08 | 1 | Done |
| PLS-03 | Edição inline de preço/estoque com teclado e desfazer | P2.1 | 08 | 1 | Done |
| PLS-04 | Colunas Produto/Preço/Estoque/Status com faixa, badges e `sempre disponível` | P2.1 | 08, 17 | 1 | Done |
| PLS-09 | Menu `Novo produto ▾` e colunas configuráveis | P2.1 | 08 | 1 | Done |
| PLS-05 | Seleção por linha + "selecionar os N do filtro" + barra de massa | P2.2 | 08 | 1 | Done |
| PLS-06 | Edição em massa com campos ligáveis, prévia de impacto e desfazer de 30 s | P2.2 | 08 | 1 | Done |
| PLS-07 | Grade rápida com padrões de lote, colar do Excel e validação por linha | P2.3 | 09 | 1 | Done |
| VAR-13 | Remoção de `products.variants`, `sizes` e `finishes` | P4.1 | 18 | 2 | Done |

**Coverage:** 10 requisitos · 10 mapeados para tasks em [`tasks.md`](./tasks.md)

**Consumidos, não implementados aqui:** `PFM-10` (inputs mascarados — `07`), `PST-10` (o badge
`grade incompleta` que `PLS-04` exibe — a regra é da `07`).

**Melhorias do Paper cobertas aqui:** 08 · 09 · 16 · 17 (metade listagem) · 18 (fecho da limpeza).

---

## Fases de entrega

| Fase | Conteúdo | Requisitos | Por que nesta ordem |
| ---- | -------- | ---------- | ------------------- |
| **1 — Listagem e lote** | Camada de dados no servidor → listagem v2 → edição em massa → grade rápida | PLS-01…PLS-09 | Tudo depende de `useAdminProducts` paginar e contar no servidor primeiro |
| **2 — Limpeza** | Remoção das colunas legadas | VAR-13 | **Bloqueada até `11` e `12` fecharem** (A25) — é a única costura do programa que atravessa as features paralelas |

---

## Success Criteria

- [x] Com 160 produtos, abrir a listagem faz **uma** requisição de página, e o rodapé mostra o `count`
      real do servidor.
- [x] `select('*')` sem `range` não existe mais no caminho da listagem.
- [x] Reajustar 12 produtos em +10% leva **uma** operação, com prévia conferível e desfazer funcional.
- [x] Cadastrar 20 produtos pela grade rápida leva **um** insert de produtos, **um** de variações e
      **um** refetch — não 20 de cada.
- [x] Produto com variações mostra a faixa e tem a edição inline de preço desabilitada **com explicação**.
- [x] Produto com `stock_policy = 'none'` mostra `sempre disponível` e não é editável na célula.
- [x] Após a limpeza, `grep` não encontra leitura de `products.variants`, `sizes` ou `finishes`.
- [x] `pnpm build`, `pnpm test` e o gate de lint continuam na baseline conhecida (28 err / 7 warn
      pré-existentes) — sem novos erros introduzidos.
