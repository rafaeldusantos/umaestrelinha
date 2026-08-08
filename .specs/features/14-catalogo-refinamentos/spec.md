# Refinamentos do Catálogo — Specification

**Criada:** 2026-08-01
**Contexto:** [`../07-product-catalog-admin/context.md`](../07-product-catalog-admin/context.md) — contexto
de programa. Desenho no Paper (arquivo **Nanapin**, página **Backoffice - Produtos**).
**Artboards:** *Produto — aba Geral* (`Main`) · *Produtos — listagem v2* · *Produtos — edição em massa* ·
*Produtos — grade rápida*
**Escopo:** fechar as lacunas nomeadas na [`13/validation.md`](../13-product-bulk-ops/validation.md),
alinhar a aba Geral ao artboard, e a tela de Categorias. **9 requisitos · 10 tasks.**

> Esta feature nasce de um relatório de verificação, não de um desenho novo. Sete dos nove requisitos
> são ACs que a `13` declarou **não entregues** — estão aqui pelo mesmo texto, sem reinterpretação.

---

## Problem Statement

A `13` fechou com três lacunas declaradas e um pedido de alinhamento que o desenho já respondia:

1. **A barra de massa tem duas ações de seis.** `Editar em massa` e `Limpar seleção` existem;
   `Ativar`, `Pausar`, `Duplicar`, `Exportar` e `Excluir` não. O admin seleciona 12 produtos e
   descobre que a única coisa que dá para fazer com eles é abrir um painel.
2. **O painel de massa não tem Categorias nem `Agendar`.** `buildBulkPatch` **implementa e testa** os
   dois modos — o que falta é só a UI, o que torna a lacuna especialmente barata de fechar.
3. **A grade rápida não tem a coluna `imagem`.** Cadastrar 20 produtos em lote e depois abrir 20
   formulários para pôr foto anula metade do ganho.
4. **A aba Geral diverge do artboard** em detalhes que mudam o que o admin entende: o checklist não
   mostra progresso nem a contagem, o Resumo mostra o preço padrão em vez da **faixa** (o produto com
   grade não vende pelo `base_price` — é o defeito que o programa inteiro existe para matar), e a
   prévia não abre a loja.
5. **`Descartar` apaga o rascunho sem perguntar.** É a única ação destrutiva do formulário sem
   confirmação.
6. **A tela ocupa 1152 px numa janela de 1920.** `w-full max-w-6xl mx-auto` foi herdado de quando a
   listagem tinha 5 colunas; hoje ela tem 8 e a tabela aperta enquanto sobra tela dos dois lados.
7. **Categorias ficou para trás.** A listagem de produtos ganhou consulta no servidor, contagem real,
   seleção e massa; categorias seguem num cartão em árvore que lê o catálogo inteiro.

---

## Goals

- [ ] **A seleção serve para alguma coisa:** as seis ações da barra existem, e a destrutiva mostra o
      que vai apagar **antes** de apagar.
- [ ] **O painel de massa expõe o que a função pura já sabe fazer:** categorias e agendamento.
- [ ] **Cadastrar em lote inclui a foto.**
- [ ] **A aba Geral bate com o desenho** na coluna central e no inspetor.
- [ ] **Nenhuma ação destrutiva sem confirmação nomeada.**
- [ ] **A tela usa a largura que tem.**
- [ ] **Categorias conversa com Produtos** — mesma linguagem de listagem, seleção e massa.

---

## Out of Scope

| Item | Motivo |
| ---- | ------ |
| **Controle segmentado `Rascunho \| Ativo \| Agendado`** no card Publicação | **Decisão do usuário (2026-08-01)**: quem manda no status continua sendo as ações do cabeçalho (`Salvar rascunho` / `Salvar e publicar`), como a `11`/T25 decidiu. O artboard segue mostrando o segmentado — divergência **deliberada**, registrada em `AD-012` |
| **"Sugerir com IA" / "Gerar com IA"** | `AD-011`, inalterado |
| **`Copiar tags de outro produto`** (artboard, rodapé de Tags) | Precisa de um seletor de produto + leitura das tags dele; é feature própria, não detalhe de alinhamento |
| **Hierarquia de categorias na busca do `CategoryMultiSelect`** (`K-Pop › Girl Groups` no dropdown) | O componente já cria e marca; exibir o caminho do pai depende da nova tela de Categorias definir a árvore. Entra com ela ou depois |
| **View no Postgres para `Sem estoque` com grade** | Dívida declarada na `13`; continua declarada |
| Ordenar categorias por arraste | A vitrine ordena por `sort_order`; reordenação manual é outra feature |

---

## Assumptions & Open Questions

| # | Assumção / decisão | Default | Rationale | Confirmado? |
| - | ------------------ | ------- | --------- | ----------- |
| A26 | Formato do `Exportar` | **CSV com as mesmas colunas do `Importar CSV`** | Fecha o ciclo exportar → editar no Excel → reimportar. Simétrico com o que já existe | **sim** (usuário, 2026-08-01) |
| A27 | Confirmação do `Excluir em massa` | **Duas etapas**: a primeira **lista os produtos** que serão excluídos (nome + preço + status), a segunda exige a palavra `EXCLUIR` digitada | O usuário pediu "etapas de confirmação e mostrando os itens que serão excluídos para conhecimento prévio". Excluir 12 produtos é irreversível e não tem desfazer — o `useUndoBuffer` restaura valores, não linhas apagadas | **sim** (usuário) |
| A28 | Status no card Publicação | **Sem controle segmentado** — as ações do cabeçalho seguem donas | Decisão do usuário; ver *Out of Scope* e `AD-012` | **sim** (usuário) |
| A29 | Tela de Categorias | **Desenhada no Paper primeiro**, revisada pelo usuário, e só então implementada | Decisão do usuário | **sim** (usuário) |
| A30 | Imagem na grade rápida | **Uma imagem por linha**, pelo mesmo `uploadProductImages` da aba Mídia | Um segundo caminho de upload teria validação e progresso próprios e divergiria — foi o argumento que manteve a coluna fora da `13`, e cai quando se reusa a lib | não |
| A31 | Largura da tela | `w-full` com padding lateral, **sem** `max-w` | O backoffice é ferramenta de desktop; a listagem tem 8 colunas e o formulário tem 3 faixas | não |

**Open questions:** o desenho de Categorias (T51) sai para revisão antes da implementação (T52).

---

## User Stories

### P1.1 — A seleção serve para alguma coisa

**Acceptance Criteria**:

1. WHEN há linhas selecionadas THEN a barra de massa SHALL oferecer `Editar em massa`, `Ativar`, `Pausar`, `Duplicar`, `Exportar` e `Excluir`, exibindo quantos itens estão selecionados.
2. WHEN o admin aciona `Ativar` ou `Pausar` THEN os selecionados SHALL mudar de status numa operação, com o mesmo toast de `X alterados · Y falharam` e o mesmo desfazer de 30 s da edição em massa.
3. WHEN o admin aciona `Duplicar` THEN cada selecionado SHALL gerar uma cópia **como rascunho**, com ` (cópia)` no nome e slug próprio, num único insert.
4. WHEN o admin aciona `Exportar` THEN SHALL baixar um CSV com as **mesmas colunas** que o `Importar CSV` aceita (A26), contendo apenas os selecionados.
5. WHEN o admin aciona `Excluir` THEN SHALL abrir uma confirmação que **lista os produtos** que serão excluídos — nome, preço e status — antes de qualquer escrita (A27).
6. WHEN a lista de exclusão é exibida THEN SHALL informar quantos são, e SHALL exigir a palavra `EXCLUIR` digitada para habilitar a ação destrutiva.
7. WHEN o admin cancela em qualquer etapa THEN nada SHALL ser excluído e a seleção SHALL permanecer.
8. WHEN a exclusão falha parcialmente THEN SHALL relatar `X excluídos · Y falharam`, sem a tela mentir sobre o resultado.

### P1.2 — O painel de massa completo

**Acceptance Criteria**:

1. WHEN o campo Categorias está ligado THEN SHALL oferecer `Adicionar`, `Remover` e `Substituir`, com seleção das categorias existentes.
2. WHEN o modo é `Substituir` THEN a prévia SHALL avisar que as categorias atuais serão removidas.
3. WHEN o campo Status está ligado THEN SHALL oferecer `Ativar`, `Pausar` e `Agendar`; `Agendar` SHALL exigir data e SHALL tirar o produto da loja até ela.
4. WHEN categorias são alteradas em massa THEN a escrita SHALL usar o mesmo diff de `product_categories` do formulário — SHALL não reescrever vínculos que não mudaram.

### P1.3 — Grade rápida com imagem

**Acceptance Criteria**:

1. WHEN a planilha é exibida THEN a coluna `imagem` SHALL existir, antes de `Nome`.
2. WHEN o admin escolhe um arquivo na célula de imagem THEN SHALL usar a **mesma** validação e conversão da aba Mídia (PNG/JPG/WebP, 8 MB, WebP 1600 px).
3. WHEN a linha tem imagem THEN a miniatura SHALL aparecer na célula, com ação de remover.
4. WHEN o lote é criado THEN a imagem da linha SHALL entrar em `images` como `{url, alt, source:'upload'}` do produto correspondente.
5. WHEN o upload de uma linha falha THEN a linha SHALL seguir criável sem imagem, com o motivo nomeado.

### P1.4 — Aba Geral igual ao desenho

**Acceptance Criteria** (coluna central):

1. WHEN o campo Nome é exibido THEN SHALL mostrar o contador `N / 70` alinhado à direita do rótulo.
2. WHEN o card Categorias é exibido THEN SHALL mostrar `N selecionadas` alinhado à direita do título.
3. WHEN há sugestões de tag THEN SHALL vir sob o rótulo `SUGERIDAS — MAIS USADAS`.

**Acceptance Criteria** (coluna da direita):

4. WHEN o checklist é exibido THEN SHALL mostrar o badge `N de M` e uma **barra de progresso** proporcional.
5. WHEN um item do checklist está pendente THEN SHALL mostrar a ação correspondente à direita (`Ir →`; `Gerar` para o item de SEO).
6. WHEN o Resumo é exibido THEN SHALL mostrar **`Faixa de preço`** — `R$ X – Y` quando há grade vendável, e o preço único quando não há — com o badge de margem ao lado.
7. WHEN o Resumo é exibido THEN SHALL mostrar `Variações` (`N · M pausada`), `Estoque somado` (`N un.`), `Imagens` (`N · M de mockup`) e `Peso de envio`.
8. WHEN a Prévia é exibida THEN SHALL se chamar **`Prévia na loja`** e oferecer `Abrir ↗`, que abre a página do produto na loja em nova aba.
9. WHEN os rótulos de Publicação são exibidos THEN SHALL ser `Destaque na home`, `Selo "Novo"` e `Drop programado`.

### P1.5 — Confirmação e largura

**Acceptance Criteria**:

1. WHEN o admin aciona `Descartar` no formulário THEN SHALL abrir uma confirmação nomeando o que se perde, e SHALL não apagar nada antes do aceite.
2. WHEN a listagem ou o detalhe de produto são exibidos THEN SHALL ocupar a largura da janela, sem `max-w-6xl`.

### P1.6 — Tela de Categorias

**Acceptance Criteria**:

1. WHEN o artboard de Categorias é entregue THEN SHALL usar os tokens Nanita do arquivo e a mesma linguagem da *listagem v2* (visões/contagem, busca, seleção, barra de massa, inspetor).
2. WHEN a tela é implementada THEN SHALL resolver contagem de produtos por categoria **no servidor**, não somando no cliente.
3. WHEN uma categoria com produtos é excluída THEN SHALL nomear quantos produtos ficam sem ela e exigir confirmação.

---

## Edge Cases

- WHEN o admin seleciona 160 produtos e aciona `Excluir` THEN a lista de confirmação SHALL mostrar os primeiros N com um "e mais X" — listar 160 nomes numa modal não é conhecimento prévio, é ruído.
- WHEN `Duplicar` gera um slug que já existe THEN o slug da cópia SHALL receber sufixo até ficar livre — o `UNIQUE` do banco não pode ser a primeira linha de defesa.
- WHEN o produto exportado tem grade THEN o CSV SHALL levar o `base_price`, não a faixa — é o que o importador sabe reler (A26).
- WHEN o admin digita `excluir` em minúsculas na confirmação THEN SHALL ser aceito — exigir caixa exata é hostilidade, não segurança.
- WHEN a linha da grade rápida tem imagem e é removida da planilha THEN o arquivo já enviado SHALL ficar órfão no Storage — declarado, não resolvido (limpeza de órfãos é tarefa de manutenção, não de cadastro).

---

## Requirement Traceability

| ID | Requisito | Story | Origem | Fase | Status |
| -- | --------- | ----- | ------ | ---- | ------ |
| RFN-01 | Barra de massa com as seis ações | P1.1 | `13`/PLS-05 AC 1 (lacuna) | 1 | Done |
| RFN-02 | Excluir em massa com lista prévia e confirmação em duas etapas | P1.1 | usuário | 1 | Done |
| RFN-03 | Exportar CSV compatível com o importador | P1.1 | `13`/PLS-05 AC 1 (lacuna) | 1 | Done |
| RFN-04 | Painel de massa com Categorias e Agendar | P1.2 | `13`/PLS-06 AC 6-7 (lacuna) | 1 | Done |
| RFN-05 | Coluna de imagem na grade rápida | P1.3 | `13`/PLS-07 AC 3 (lacuna) | 2 | Done |
| RFN-06 | Aba Geral — coluna central alinhada ao artboard | P1.4 | artboard `Main` | 2 | Done |
| RFN-07 | Aba Geral — inspetor alinhado ao artboard | P1.4 | artboard `Main` | 2 | Done |
| RFN-08 | Descartar com confirmação · largura total | P1.5 | usuário | 2 | Done |
| RFN-09 | Tela de Categorias — desenho e implementação | P1.6 | usuário | 3 | Done |

**Coverage:** 9 requisitos · 9 mapeados para tasks em [`tasks.md`](./tasks.md)

---

## Success Criteria

- [ ] Selecionar 12 produtos e excluir mostra os 12 nomes **antes** de apagar, e exige `EXCLUIR`.
- [ ] `Exportar` produz um CSV que o `Importar CSV` relê sem edição manual.
- [ ] O painel de massa muda categorias sem reescrever vínculo que não mudou.
- [ ] Uma linha da grade rápida com foto cria o produto **com** a foto.
- [ ] O Resumo mostra a **faixa** de preço para produto com grade — nunca o `base_price` sozinho.
- [ ] `Descartar` não apaga nada sem confirmação.
- [ ] A listagem ocupa a janela inteira em 1920 px.
- [ ] `pnpm build`, `pnpm test` e o lint continuam na baseline (36 err / 16 warn), sem erros novos.
