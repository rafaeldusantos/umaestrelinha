# Backoffice UI Standardization Specification

Redesign da tela de cadastro/edição de produto (layout duas colunas estilo Shopify) e
padronização geral de UI do painel admin (`@nanapin/backoffice`): componentes compartilhados
reutilizáveis e unificação dos tokens de cor.

## Problem Statement

O backoffice cresceu página a página sem uma camada de componentes de UI compartilhados. A tela
de produto ([AdminProductFormPage.tsx](apps/backoffice/src/pages/admin/AdminProductFormPage.tsx))
não ocupa a largura disponível (`max-w-4xl`), tem os campos soltos direto sobre o fundo (sem
cards, `TabsList` transparente) e barra de salvar não fixa — parece "vazia e sem fundo". Além
disso, existe duplicação massiva entre páginas (5 tabelas HTML quase idênticas, 3 implementações
de stat card, headers `<h1>` remontados com estilos divergentes, paginação/empty-state copiados)
e uma dualidade de tokens de cor (`nana-*` cru vs shadcn) usada de forma inconsistente. Um
componente `Card` já existe em `@nanapin/ui` mas nunca é usado.

## Goals

- [ ] Tela de produto em **duas colunas** (conteúdo em cards à esquerda + coluna lateral sticky
      com Publicação/Resumo/Ações), ocupando a largura, sem regressão de lógica/dados.
- [ ] Criar componentes compartilhados no admin (`apps/backoffice/src/shared/ui/`): `PageHeader`,
      `FormCard`, `StatCard`, `AdminTable`, `Pagination`, `EmptyState`, skeletons, `FieldGroup`.
- [ ] Migrar **todas** as 9 páginas do admin para esses componentes, sem alterar comportamento de dados.
- [ ] Unificar os tokens de cor das páginas do admin em **tokens shadcn** (`bg-card`, `border-border`,
      `text-foreground`, `text-muted-foreground`), aposentando o uso direto de `nana-*` nas páginas.
- [ ] Corrigir o `AdminLayout`: active-state por prefixo de rota + menu mobile navegável.
- [ ] Zero novos erros de lint/tipo; `pnpm build` do backoffice verde.

## Out of Scope

| Feature | Motivo |
| ------- | ------ |
| Alterar lógica de dados / hooks (`useAdmin*`, React Query) | Refactor é estrutural/estético de JSX + classes; comportamento preservado. |
| Loja pública (`@nanapin/store`) | Escopo é só o backoffice; a loja mantém tokens `--nana-*` (decisão v3). |
| Novos componentes no pacote `@nanapin/ui` | Reusa os existentes (`Card`, `Skeleton`, `Sheet`, `Table`); novos utilitários ficam em `shared/ui` do app. |
| Simplificar rotas `/admin/*` para a raiz | Trabalho futuro documentado no CLAUDE.md; navegação interna dependeria. |
| Corrigir erros pré-existentes de `no-explicit-any` nos hooks admin | Dívida conhecida, não é regressão desta feature. |
| Mudar valores/paleta dos tokens em `styles.css` | Só troca de *classes* usadas; as cores permanecem idênticas. |
| Backend / migrations / edge functions | Feature 100% frontend. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Layout da tela de produto | Duas colunas estilo Shopify (conteúdo + lateral sticky) | Decisão do usuário | y |
| Escopo da padronização | Criar shared components e migrar TODAS as páginas | Decisão do usuário | y |
| Sistema de tokens do admin | Padronizar em tokens shadcn (`bg-card`/`border-border`/`text-foreground`) | Decisão do usuário | y |
| Divergência com a loja (que usa `nana-*`) | Aceitável: apps distintos; shadcn e `nana-*` mapeiam para as mesmas cores no `tailwind.preset.ts` | Sem impacto visual; reduz inconsistência interna do admin | y |
| Gradiente/identidade da marca | Mantém `gradient-cta` e o logo com gradiente (não é token de cor de superfície) | Preserva identidade nos CTAs | y |
| Dark mode | Deve continuar funcionando; tokens shadcn já respondem a `.dark` no `styles.css` | Não introduzir regressão de tema | y |
| Toast do admin | Unificar em `@nanapin/ui/hooks/use-toast`; migrar Cupons que usa `sonner` | Consistência (maioria já usa use-toast) | y |
| Código morto `features/product-form/ui/ProductForm.tsx` | Remover (formulário legado sem importadores; página real é AdminProductFormPage) | Confirmar ausência de importadores antes | y |
| Infra de testes | Vitest já configurado (`pnpm test`); testes focam em lógica pura de componentes (props/estado/active-state), não pixel/visual | Aderir ao contrato de gate do tlc sem testar aparência | y |
| Comportamento de `AdminTable` | Suportar render custom por célula, alinhamento, sort opcional e footer de paginação — cobre Produtos (sort) e Pedidos (badges/ações) | Não perder recursos existentes | y |

**Open questions:** nenhuma — todas resolvidas ou logadas acima.

---

## User Stories

### P1: Tela de produto em duas colunas com cards ⭐ MVP

**User Story**: Como administrador, quero cadastrar/editar produtos numa tela larga com seções em
cards e uma coluna lateral de publicação/resumo, para editar com clareza e sem sensação de "tela vazia".

**Why P1**: É a dor central relatada e a mudança de maior impacto visual.

**Acceptance Criteria**:

1. WHEN a tela de produto é renderizada em viewport ≥ `lg` THEN o sistema SHALL exibir um grid de
   duas colunas (conteúdo principal + coluna lateral) em vez do container `max-w-4xl` centralizado.
2. WHEN a tela de produto é renderizada THEN cada seção de formulário (Geral, Mídia, Preços,
   Variações, SEO, Relacionados) SHALL estar contida num `FormCard` com fundo `bg-card` e borda.
3. WHEN a tela de produto é renderizada em viewport ≥ `lg` THEN a coluna lateral (Publicação +
   Resumo + ações) SHALL permanecer sticky no scroll (`lg:sticky lg:top-*`).
4. WHEN o usuário edita preço e custo THEN o card "Resumo" SHALL exibir a margem calculada com a
   mesma fórmula atual (`(price - cost)/price*100`), incluindo o caso custo=0 (sem margem).
5. WHEN o usuário submete o formulário THEN o sistema SHALL montar o mesmo payload atual e chamar
   `createProduct`/`updateProduct` com o mesmo comportamento (nenhum campo do payload alterado).
6. WHEN o usuário faz upload, remove ou reordena imagens THEN o comportamento SHALL ser idêntico
   ao atual (mesmos handlers de drag/drop e upload).

**Independent Test**: Abrir `/admin/produtos/novo` e `/admin/produtos/:id/editar`, confirmar grid
de 2 colunas, cards com fundo, lateral sticky, margem no resumo, salvar/duplicar/upload intactos.

---

### P1: Componentes compartilhados de UI do admin ⭐ MVP

**User Story**: Como desenvolvedor, quero componentes de UI reutilizáveis no admin, para eliminar
duplicação e garantir consistência visual.

**Why P1**: Base da padronização; sem eles a migração repete a duplicação.

**Acceptance Criteria**:

1. WHEN `PageHeader` recebe `title` e opcionalmente `subtitle`/`actions`/`icon` THEN SHALL renderizar
   o título como `font-heading text-2xl font-bold text-foreground`, o subtítulo e o slot de ações à direita.
2. WHEN `AdminTable` recebe `columns` (com `align`, `render` opcional e `sortable` opcional) e `data`
   THEN SHALL renderizar cabeçalho `bg-muted/50`, linhas com zebra, e chamar `onSort` ao clicar em coluna sortable.
3. WHEN `AdminTable` recebe `data` vazio THEN SHALL renderizar o `EmptyState` (mensagem/ícone) em vez da tabela.
4. WHEN `StatCard` recebe `label`, `value`, `icon` e `accent` THEN SHALL renderizar o card padronizado
   (substituindo `StatsCard`, `MetricCard` e os cards inline de cupons).
5. WHEN `Pagination` recebe `page`, `totalPages` e `onPageChange` THEN SHALL renderizar navegação com
   elipse (mesma lógica hoje em Produtos) e desabilitar prev/next nos limites.
6. WHEN `FormCard` recebe `title`/`description`/`children` THEN SHALL envolver o conteúdo no `Card` do
   design system com header opcional.
7. WHEN a lista de produtos é carregada com sort ativo THEN `AdminTable` SHALL preservar o
   comportamento de ordenação por nome/preço/estoque existente.

**Independent Test**: Renderizar cada componente com props representativas e asserir a saída
(classes/estrutura, callback de sort, alternância de empty-state) via Vitest + Testing Library.

---

### P2: Migração de todas as páginas do admin

**User Story**: Como administrador, quero todas as telas com o mesmo visual e componentes, para
uma experiência coesa.

**Why P2**: Consolida o valor dos componentes; depende de P1 mas não bloqueia o MVP da tela de produto.

**Acceptance Criteria**:

1. WHEN qualquer página do admin (Dashboard, Produtos, Pedidos, Clientes, Categorias, Coleções,
   Cupons, Abandonados, Settings) é renderizada THEN SHALL usar `PageHeader` no lugar do `<h1>` remontado.
2. WHEN páginas com tabela (Produtos, Pedidos, Clientes, Abandonados, Dashboard-recentes) são
   renderizadas THEN SHALL usar `AdminTable` preservando colunas, badges, ações e paginação atuais.
3. WHEN páginas com métricas (Dashboard, Abandonados, Cupons) são renderizadas THEN SHALL usar `StatCard`.
4. WHEN Settings é renderizada THEN cada aba SHALL usar `FormCard` e os campos usarem `FieldGroup` compartilhado.
5. WHEN Cupons dispara um toast THEN SHALL usar `@nanapin/ui/hooks/use-toast` (não `sonner`).
6. WHEN qualquer página migrada é renderizada THEN NÃO SHALL usar classes `nana-*` cru para superfície/
   texto/borda (usar tokens shadcn), exceto o gradiente da marca.

**Independent Test**: Navegar por cada rota do admin e confirmar header, tabelas, métricas e cores
padronizados, sem regressão funcional (filtros, sort, paginação, dialogs).

---

### P2: AdminLayout — navegação correta

**User Story**: Como administrador, quero o menu destacando a seção atual mesmo em subpáginas e um
menu acessível no mobile, para navegar sem me perder.

**Why P2**: Corrige defeitos reais de navegação; independente da tela de produto.

**Acceptance Criteria**:

1. WHEN a rota atual é `/admin/produtos/novo` ou `/admin/produtos/:id/editar` THEN o item "Produtos"
   SHALL aparecer como ativo (match por prefixo, com match exato para `/admin`).
2. WHEN a viewport é `< md` THEN o layout SHALL oferecer um menu navegável (drawer/`Sheet`) com os
   mesmos itens, acionável por um botão no header.
3. WHEN um item de menu é acionado no mobile THEN o drawer SHALL fechar e navegar para a rota.

**Independent Test**: Testar a função de active-state com rotas aninhadas (unit) e verificar o
drawer mobile manualmente em viewport reduzida.

---

## Edge Cases

- WHEN uma tabela recebe lista vazia THEN `AdminTable` SHALL exibir `EmptyState` (não cabeçalho vazio).
- WHEN `AdminTable` não recebe coluna sortable THEN cliques no cabeçalho SHALL ser inertes (sem erro).
- WHEN `PageHeader` não recebe `actions`/`subtitle`/`icon` THEN SHALL renderizar só o título sem espaços quebrados.
- WHEN custo do produto é 0 THEN o card "Resumo" SHALL ocultar a margem (sem divisão por zero / NaN).
- WHEN a tela de produto está em viewport `< lg` THEN as colunas SHALL empilhar (lateral abaixo do conteúdo) sem sticky.
- WHEN dark mode está ativo THEN os tokens shadcn SHALL aplicar as cores escuras sem texto ilegível.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| PROD-01 | P1: Tela de produto | Design | Pending |
| PROD-02 | P1: Tela de produto | Design | Pending |
| PROD-03 | P1: Tela de produto | Design | Pending |
| PROD-04 | P1: Tela de produto | Design | Pending |
| PROD-05 | P1: Tela de produto | Design | Pending |
| PROD-06 | P1: Tela de produto | Design | Pending |
| COMP-01 | P1: Componentes | Design | Pending |
| COMP-02 | P1: Componentes | Design | Pending |
| COMP-03 | P1: Componentes | Design | Pending |
| COMP-04 | P1: Componentes | Design | Pending |
| COMP-05 | P1: Componentes | Design | Pending |
| COMP-06 | P1: Componentes | Design | Pending |
| COMP-07 | P1: Componentes | Design | Pending |
| MIG-01 | P2: Migração | Design | Pending |
| MIG-02 | P2: Migração | Design | Pending |
| MIG-03 | P2: Migração | Design | Pending |
| MIG-04 | P2: Migração | Design | Pending |
| MIG-05 | P2: Migração | Design | Pending |
| MIG-06 | P2: Migração | Design | Pending |
| LAYOUT-01 | P2: AdminLayout | Design | Pending |
| LAYOUT-02 | P2: AdminLayout | Design | Pending |
| LAYOUT-03 | P2: AdminLayout | Design | Pending |

**Coverage:** 22 total, 0 mapeados para tasks (fase Design pendente).

---

## Success Criteria

- [ ] Tela de produto em 2 colunas, cards com fundo, lateral sticky — sem regressão de salvar/upload/variações.
- [ ] Componentes compartilhados criados e cobertos por testes de lógica (sort, empty-state, props).
- [ ] Todas as 9 páginas migradas para `PageHeader`/`AdminTable`/`StatCard`/`FormCard` conforme aplicável.
- [ ] Nenhuma classe `nana-*` de superfície/texto/borda restante nas páginas do admin (só gradiente da marca).
- [ ] `AdminLayout` com active-state por prefixo e menu mobile funcional.
- [ ] `pnpm lint` sem novos erros; `pnpm build` do backoffice verde; dark mode sem regressão.
</content>
</invoke>
