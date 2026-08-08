# BUG-20260802-mover-para-nao-tem-onde-escolher-o-destino: 'Mover para…' manda escolher o pai num lugar que não existe

- **User impact:** Blocks-Completion
- **Persona affected:** Nana
- **Journey / step:** J-organizar-categorias — passo *renomear / mudar pai* (`D -->|renomear / mudar pai|`)
- **Scenarios:** CAT-hierarquia-e-criacao
- **First seen:** 2026-08-02 · relato direto da lojista (fora de ciclo de QA)
- **Status:** **fixed**

## Symptom (what the user experiences)

Na tela de categorias, marcar várias categorias e clicar em **'Mover para…'** na barra de massa não
abre nada: aparece só um aviso — *"Escolha a categoria pai no inspetor, à direita"*. O inspetor edita
**uma** categoria (a que está aberta na linha), e a lojista tinha marcado várias. Ela vai ao inspetor
e não encontra campo nenhum que fale das outras selecionadas. **Não existe lugar onde cumprir a
instrução**: a ação em massa de mover simplesmente não estava implementada — o botão só sabia dizer
onde ela *não* é.

## Reproduction (from the persona's entry point)

1. `http://localhost:8081/admin/categorias`.
2. Marcar a caixa de duas ou mais categorias (ex.: `K-Pop` e `Games`).
3. Na barra de massa que aparece, clicar em **'Mover para…'**.
4. Ler o aviso e ir ao inspetor à direita procurar onde escolher o destino.

**Expected:** um lugar onde escolher a categoria de destino das selecionadas, e o movimento gravado.
**Actual:** um toast mandando ir ao inspetor; o inspetor não tem campo para a seleção; nada é gravado.

## Why it matters

É o caminho normal de arrumar a taxonomia — agrupar categorias soltas sob um guarda-chuva
(`Anime`, `K-Pop`, `Games` sob `Cultura Pop`) é exatamente o que a barra de massa promete. Sem ele,
reorganizar a árvore vira um trabalho de abrir categoria por categoria no inspetor. As três outras
ações da barra (Mostrar, Ocultar, Excluir) funcionam, o que faz a quarta parecer defeito de momento
em vez de recurso ausente.

## Root cause (symptom vs cause)

- **Sintoma:** o botão só emite um aviso.
- **Causa:** `AdminCategoriesPage` passava `onMove` como um `toast` fixo. Nunca houve seletor de
  destino nem escrita — a T57 entregou a barra com o botão e adiou a ação.
- **Causa de segunda ordem, achada ao consertar:** `buildCategoryTree` desenhava **só dois níveis**.
  Uma neta ficava no mapa de filhas e nunca virava linha — **sumia da tela sem erro e sem lugar onde
  consertar**, violando a invariante que o próprio arquivo declara para órfã e ciclo ("some da tela é
  o pior resultado possível"). Não era hipótese: o campo *"Categoria pai"* do inspetor sempre ofereceu
  subcategorias como pai, então já dava para produzir a neta invisível — e implementar o mover sem
  corrigir isso transformaria o defeito latente numa perda de categoria a cada movimento.

---

## Fix — 2026-08-02

- **O que mudou:**
  - `CategoryMoveDialog` — diálogo novo com `<select>` de destino, mostrando a árvore indentada mais
    a opção *"Nenhuma — deixar como categoria raiz"*. Confirmar fica travado até haver escolha.
  - Domínio (`model/categoryTree.ts`): `moveSelection` (quem muda de pai × quem só é carregada),
    `moveDestinations` (exclui a seleção e a descendência — anti-ciclo) e `planMove` (grava
    `parent_id` + `sort_order` **depois** das irmãs que já moram no destino).
  - `buildCategoryTree` passou a descer recursivamente; `filterCategoryRows` e o colapso da tabela
    passaram a valer para a cadeia inteira, não para um nível.
  - `useAdminCategories.moveCategories` — um update por linha (a `sort_order` é uma por linha, e
    `update … in (ids)` só grava um payload), com um único refetch.
- **A filha não vira irmã:** mover um pai grava `parent_id` **só nele**; a descendência é carregada
  pelo movimento e não é reescrita.
- **Teste de regressão:**
  `apps/backoffice/src/features/category-list/ui/CategoryMoveDialog.test.tsx` (7),
  `apps/backoffice/src/pages/admin/AdminCategoriesPage.test.tsx` (4 casos novos) e
  `apps/backoffice/src/features/category-list/model/categoryTree.test.ts` (19 casos novos).
- **Prova de gravação (`AD-012` — grava-se provando, não inspecionando):** round-trip HTTP contra o
  Supabase local autenticado como `admin@nanapin.dev`: duas categorias criadas, `PATCH
  {parent_id, sort_order}` na filha, **releitura do banco** confirmando `parent_id` e `sort_order`,
  e limpeza verificada (0 linhas de probe restantes). Nenhum `PGRST204`.
- **Gates:** backoffice **837 testes, 0 falhas** · `tsc --noEmit` **0 erros** (baseline mantida) ·
  `eslint` **30 err / 8 warn** = baseline vigente, sem erro novo.

## Verification

<!-- pendente: re-caminhada da persona na tela de categorias -->
