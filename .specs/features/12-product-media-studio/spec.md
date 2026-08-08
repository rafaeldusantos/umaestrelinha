# Mídia do Produto e Estúdio de Mockup — Specification

**Criada:** 2026-07-31 (fatiada de `07-product-catalog-admin` por `AD-009`)
**Contexto:** [`../07-product-catalog-admin/context.md`](../07-product-catalog-admin/context.md) —
contexto de **programa**, comum às quatro features. Desenho no Paper (arquivo **Nanapin**, página
**Backoffice - Produtos**): <https://app.paper.design/file/01KPBGSMF2DP3MQVAEB171ZMDZ/6-0>
**Artboards:** *Produto — aba Mídia* · *Estúdio de mockup — ampliado*
**Escopo:** frente **C** (mídia/estúdio). **7 requisitos · 5 tasks.**

> ### Feature 3 de 4
>
> **Depende de** [`07-product-catalog-admin`](../07-product-catalog-admin/spec.md) (a coluna `images`
> em `jsonb` e o helper `normalizeImages`) **e** de [`11-product-form-v2`](../11-product-form-v2/spec.md)
> (o esqueleto de 5 abas — a aba Mídia encaixa no slot que T25 cria, e T37 liga a galeria à grade de
> variações da T28). É a **última** das três derivadas a começar.
>
> **Numeração preservada.** Aqui ficam **T33–T37**.

---

## Problem Statement

A aba Mídia mente e esquece.

**Mente** na copy: a dropzone diz `PNG, JPG, WebP — máx. 5MB`
([`AdminProductFormPage.tsx:286`](../../../apps/backoffice/src/pages/admin/AdminProductFormPage.tsx#L286)),
mas `handleFiles` não valida tamanho algum — só filtra por `type.startsWith('image/')`
([`:102`](../../../apps/backoffice/src/pages/admin/AdminProductFormPage.tsx#L102)). Um arquivo de 40 MB
entra, vai para o canvas e só falha (ou trava a aba) lá dentro. E toda imagem é reduzida a WebP de
**1200 px** ([`uploadProductImage.ts:5`](../../../apps/backoffice/src/features/product-form/lib/uploadProductImage.ts#L5)) —
pequeno demais para o zoom de uma vitrine que vende detalhe de estampa.

**Esquece** o que a imagem é: `images` era `text[]`, uma lista de URLs sem `alt` e sem origem. Sem
`alt`, a loja renderiza `alt={product.name}` genérico em todas — acessibilidade e SEO pagam a conta. Sem
origem, não dá para saber qual foto veio do estúdio de mockup e qual foi fotografada.

E o estúdio, que é onde as fotos nascem, roda num dialog de `max-w-3xl` — **768 px**
([`MockupStudioDialog.tsx:220`](../../../apps/backoffice/src/features/mockup-studio/ui/MockupStudioDialog.tsx#L220)).
Aprovar um render de 1600 px num palco de 96 px de thumb é decidir no escuro.

A `07` já converteu `images` para `jsonb` e os leitores acompanharam. Falta a tela que **escreve** esse
modelo.

---

## Goals

- [x] **A copy diz o que o código faz:** validação de tipo e tamanho **antes** de comprimir, com o teto
      real, e WebP de 1600 px.
- [x] **Toda imagem sabe o que é:** `alt` preenchível (com geração determinística por template) e
      `source` que distingue upload de mockup.
- [x] **Aprovar render em palco grande:** o estúdio sai de 768 px para ~1360 px, com camadas,
      antes/depois, filmstrip e controle de saída.
- [x] **Nada é gravado sem confirmação:** fechar o estúdio sem aplicar não deixa rastro no Storage nem
      no produto.
- [x] **A variação mostra a própria foto**, e o admin vê o card da vitrine antes de publicar.

---

## Out of Scope

| Item | Motivo |
| ---- | ------ |
| **Geração de texto por IA** ("Sugerir com IA" na descrição, "Gerar com IA" no SEO) | `AD-011`. Desenhados sem AC e sem provedor no projeto. **Atenção:** o `Gerar` de **alt-text** está **dentro** do escopo — é template determinístico, não IA |
| **Editor de template de mockup em tela cheia** | É a feature [`06-mockup-editor-ia`](../06-mockup-editor-ia/context.md). Aqui só o **estúdio** (aplicar arte em templates) cresce |
| **Engine de composição** (`@nanapin/core/mockup`, `renderPlan`) | Não muda. Só o layout em volta dela cresce |
| **Migração de `images` para `jsonb` e os 12 leitores** | Feature [`07`](../07-product-catalog-admin/spec.md) — pré-condição desta |
| **Esqueleto de 5 abas e integridade do formulário** | Feature [`11`](../11-product-form-v2/spec.md) — pré-condição desta |
| **Listagem, massa e grade rápida** | Feature [`13`](../13-product-bulk-ops/spec.md) |
| Recorte/edição destrutiva de imagem no navegador | Não pedido; o estúdio já cobre o caso de composição |

---

## Assumptions & Open Questions

Numeração **herdada da spec original**. As assumções de schema e dinheiro vivem na
[`07`](../07-product-catalog-admin/spec.md) e valem aqui como pré-condição.

| # | Assumção / decisão | Default escolhido | Rationale | Confirmado? |
| - | ------------------ | ----------------- | --------- | ----------- |
| A12 | Escopo de teste do estúdio ampliado | Testes cobrem o **plano de render** e a lógica de "ao aplicar"; a qualidade visual do composto é **UAT manual** | Canvas real não roda em node — mesma lição da feature `05-mockup-generator` | **sim** |
| A13 | Idioma da UI | Português (pt-BR) | Convenção do projeto | **sim** |
| A20 | Como o alt-text é gerado (`AD-011`) | **Template determinístico e puro**: nome do produto + rótulo da variação ou do mockup (`"Botton Sailor Moon — Lua Prateada · Na mão"`). Sem chamada externa | Os artboards dizem "Gerar" e "Alt gerado automaticamente", **nunca** "com IA". Um template resolve acessibilidade e SEO, é testável e não arrasta provedor, chave nem fallback | **sim** (usuário, 2026-07-31) |
| A21 | Teto de upload de 8 MB | Valor do artboard, aplicado **antes** da compressão | Validar depois de passar pelo canvas é validar tarde demais — é o que trava a aba hoje | não |

**Open questions:** nenhuma bloqueante.

---

## User Stories

### P2.4 — Mídia — alt-text, origem e upload que diz a verdade

**User Story**: Como admin, quero saber qual imagem é mockup, escrever o alt-text de cada uma e receber
um erro claro quando o arquivo é grande demais.

**Why P2**: Defeitos 13 e 14. Depende de `products.images` já ser `jsonb` (`07`).

**Acceptance Criteria**:

1. WHEN a galeria é exibida THEN cada imagem SHALL ser um tile de 196 px com badge `Principal` na primeira, ações de recorte e remoção no hover, e o campo de **alt-text**.
2. WHEN o alt-text está vazio THEN o tile SHALL exibir o estado `faltando` com a ação `Gerar`; quando preenchido por essa ação, SHALL exibir `gerado automaticamente`. A geração SHALL ser uma **função pura por template** (nome do produto + rótulo da variação ou do mockup) — SHALL **não** chamar serviço externo nem modelo de IA (A20, `AD-011`).
3. WHEN uma imagem foi produzida pelo estúdio de mockup THEN SHALL exibir o selo `Mockup` e `images[].source` SHALL valer `mockup`.
4. WHEN o admin envia um arquivo THEN o sistema SHALL validar tipo (`PNG`, `JPG`, `WebP`) e tamanho (**máx. 8 MB**) **antes** de comprimir, rejeitando com mensagem que nomeia o arquivo e o motivo.
5. WHEN o arquivo é aceito THEN SHALL ser convertido para WebP com dimensão máxima de **1600 px** (hoje 1200).
6. WHEN a dropzone é exibida THEN a copy SHALL dizer exatamente o que o código faz: `PNG, JPG ou WebP até 8 MB · convertidas para WebP 1600 px`.
7. WHEN vários arquivos são enviados THEN cada um SHALL exibir nome, tamanho e progresso individual.
8. WHEN o admin cola uma imagem da área de transferência (`⌘V`) sobre a aba Mídia THEN SHALL ser enviada como se tivesse sido arrastada.
9. WHEN o admin reordena as imagens THEN a primeira SHALL ser a principal e a ordem SHALL persistir no `jsonb`.
10. WHEN a loja renderiza uma imagem de produto THEN SHALL usar o `alt` do `jsonb` quando preenchido e o nome do produto como fallback — o `alt={product.name}` genérico de hoje deixa de ser o único caminho.

**Independent Test**: tentar subir um arquivo de 12 MB e conferir a rejeição nominal; subir um de 3 MB e
conferir no Storage que o WebP tem no máximo 1600 px no maior lado.

---

### P3.1 — Estúdio de mockup ampliado

**User Story**: Como admin, quero aprovar o render num palco grande, não num thumb de 96 px.

**Why P3**: D8. Melhora real de trabalho, mas não bloqueia cadastrar nem vender.

**Acceptance Criteria**:

1. WHEN o estúdio abre THEN o painel SHALL ter aproximadamente **1360 × 886 px** (hoje `max-w-3xl` ≈ 768 px), em três colunas: origem/mockups (264 px), palco (452 px) e ajustes/saída (300 px).
2. WHEN a coluna esquerda é exibida THEN SHALL listar os mockups com thumb de 38 px, seleção múltipla e o **estado do relevo** de cada template (incluindo o aviso `relevo não medido — sai chapado`).
3. WHEN o palco é exibido THEN SHALL oferecer zoom, comparação antes/depois, as camadas `Fundo · Arte · Relevo · Overlay` e o filmstrip dos renders com estado (`pronto`, `compondo`, `com aviso`).
4. WHEN o admin ajusta escala, X, Y ou rotação da arte THEN SHALL poder acionar **Aplicar a todos** para replicar o ajuste nos mockups selecionados.
5. WHEN o admin escolhe a saída THEN SHALL poder selecionar resolução (1200/1600/2000 px) e formato (WebP/PNG).
6. WHEN o admin configura **Ao aplicar** THEN SHALL poder escolher entre anexar e substituir as imagens, definir a 1ª como principal e gerar alt-text — a geração usando o **mesmo template puro** de `PMD-01 AC 2` (A20).
7. WHEN o rodapé é exibido THEN SHALL informar `N renders em X px · leva ~Ys · nada é salvo antes de você aplicar` e a ação primária `Aplicar N imagens ao produto`.
8. WHEN o admin fecha o estúdio sem aplicar THEN nenhuma imagem SHALL ter sido gravada no Storage nem no produto.

**Independent Test**: abrir o estúdio com 4 templates selecionados, ajustar a escala, aplicar a todos,
fechar sem confirmar e conferir que `images` não mudou.

---

### P3.2 — Imagem por variação e prévia da vitrine

**User Story**: Como admin, quero que a variação `Fosco` mostre a foto do fosco, e quero ver como o
card do produto vai aparecer na loja antes de publicar.

**Why P3**: Refinamento; o produto vende sem isso.

**Acceptance Criteria**:

1. WHEN o card **Imagem por variação** é exibido THEN cada linha da grade SHALL poder apontar para uma imagem já existente na galeria.
2. WHEN uma variação não tem imagem própria THEN a loja SHALL usar a imagem principal do produto.
3. WHEN o cliente escolhe uma variação com imagem própria na página do produto THEN a imagem em destaque SHALL trocar para a da variação.
4. WHEN o inspetor é exibido THEN a **Prévia da vitrine** SHALL renderizar o card do produto como ele aparece na loja, exibindo `a partir de R$ X` quando há variações.
5. WHEN os dados do formulário mudam THEN a prévia SHALL refletir a mudança sem salvar.

**Independent Test**: definir imagem própria para uma variação, abrir a página do produto na loja e
conferir a troca da imagem em destaque ao selecionar aquela combinação.

---

## Edge Cases

- WHEN o arquivo é rejeitado por tamanho THEN SHALL **não** ter entrado no canvas — a validação vem antes da compressão, senão o travamento continua acontecendo, só com mensagem.
- WHEN o admin envia 6 arquivos e 2 falham THEN os 4 válidos SHALL subir e os 2 SHALL ser nomeados individualmente — falha parcial não cancela o lote.
- WHEN uma variação aponta para uma imagem que o admin remove da galeria THEN a variação SHALL voltar a usar a principal, sem referência quebrada.
- WHEN o estúdio compõe com um template sem relevo medido THEN SHALL renderizar chapado **e** avisar — não SHALL recusar o template.
- WHEN o alt-text gerado por template ficaria vazio (produto sem nome, ainda em rascunho) THEN a ação `Gerar` SHALL ficar desabilitada em vez de produzir string vazia.

---

## Requirement Traceability

**Frente:** C = mídia/estúdio. A coluna **Melhoria** referencia as 22 melhorias do artboard *Produtos —
sugestões de melhoria e mapa de código* (Paper).

| ID | Requisito | Story | Melhoria | Fase | Status |
| -- | --------- | ----- | -------- | ---- | ------ |
| PMD-02 | Upload valida tipo e 8 MB antes de comprimir; WebP 1600 px; copy verdadeira | P2.4 | 13 | 1 | Done |
| PMD-01 | Alt-text por imagem, com estados e ação `Gerar` (template puro) | P2.4 | 14 | 1 | Done |
| PMD-03 | Selo `Mockup` a partir de `images[].source` | P2.4 | 14 | 1 | Done |
| PMD-04 | Progresso por arquivo e colar da área de transferência | P2.4 | 13 | 1 | Done |
| PMD-05 | Estúdio de mockup ampliado (1360 px, 3 colunas, filmstrip, saída, ao aplicar) | P3.1 | 07 | 1 | Done |
| PMD-06 | Imagem por variação | P3.2 | 04 | 1 | Done |
| PFM-17 | Prévia da vitrine no inspetor | P3.2 | 17 | 1 | Done |

**Coverage:** 7 requisitos · 7 mapeados para tasks em [`tasks.md`](./tasks.md)

**Melhorias do Paper cobertas aqui:** 07 · 13 · 14 (metade de escrita) · 04 (imagem por variação) ·
17 (prévia da vitrine).

---

## Fases de entrega

Uma fase só — as 5 tasks formam uma cadeia linear e cabem num único batch de sub-agente.

| Fase | Conteúdo | Requisitos | Por que nesta ordem |
| ---- | -------- | ---------- | ------------------- |
| **1 — Mídia e estúdio** | Upload honesto → galeria → estúdio (layout) → estúdio (aplicar) → imagem por variação e prévia | PMD-01…PMD-06, PFM-17 | A galeria depende do upload corrigido; o estúdio grava na galeria; a imagem por variação liga galeria e grade |

---

## Success Criteria

- [x] Um arquivo de 12 MB é rejeitado **nominalmente** e **sem** ter entrado no canvas.
- [x] Todo WebP gravado no Storage tem no máximo 1600 px no maior lado.
- [x] A copy da dropzone bate exatamente com o comportamento do código.
- [x] Uma imagem vinda do estúdio mostra o selo `Mockup`; uma enviada à mão, não.
- [x] `Gerar` produz alt-text determinístico a partir do nome + rótulo, sem nenhuma chamada de rede.
- [x] O estúdio abre em ~1360 px e `max-w-3xl` não existe mais no `MockupStudioDialog`.
- [x] Fechar o estúdio sem aplicar não deixa nada no Storage nem em `images`.
- [x] Os 9 testes existentes de `renderPlan` seguem verdes — a engine não foi tocada.
- [x] `pnpm build`, `pnpm test` e o gate de lint continuam na baseline conhecida (28 err / 7 warn
      pré-existentes) — sem novos erros introduzidos.
