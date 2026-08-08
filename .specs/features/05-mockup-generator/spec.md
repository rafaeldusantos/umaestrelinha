# Mockup Generator Specification

Engine própria (canvas) para aplicar uma **arte** sobre **templates de mockup** (fundo + overlay de
brilho) e gerar imagens de botton realistas — usada em dois pontos que convergem: a **Loja** (prévia
realista no "Crie Seu Botton") e o **Admin** (aplicar arte a uma coleção de mockups e anexar os
renders ao `images[]` do produto). Decisões de discovery em [context.md](context.md).

## Problem Statement

Hoje a arte de um botton é uma imagem chapada. Para ter fotos de catálogo realistas depende-se de
ferramentas externas (Photoshop, geradores de mockup) — trabalho manual fora do sistema. E no "Crie
Seu Botton" ([CustomPinPage.tsx](apps/store/src/pages/CustomPinPage.tsx)) o cliente vê apenas um
círculo chapado, sem prévia de como a arte fica num botton real. Queremos uma engine própria de
composição em canvas e uma **coleção reutilizável de mockups**, de modo que "tendo só as artes" o
admin gere as fotos do site e o cliente veja uma prévia convincente.

## Goals

- [ ] Engine compartilhada `@nanapin/core/mockup` que compõe fundo → arte (recortada na art-zone) →
      overlay (blend), exportando PNG/Blob na resolução do fundo, sem canvas tainting.
- [ ] Coleção de mockups no Admin (`/admin/mockups`): CRUD de templates com editor de art-zone (elipse) e prévia ao vivo.
- [ ] No cadastro de produto, aplicar uma arte a 1..n templates e **anexar os renders ao `images[]`** sem sair do sistema.
- [ ] Na Loja, aba "Prévia real" que aplica a arte atual do cliente aos templates ativos (client-side).
- [ ] Sem novas dependências de runtime; `pnpm build`/`pnpm test` verdes; RLS escopada (leitura pública, escrita admin).

## Out of Scope

| Feature | Motivo |
| ------- | ------ |
| APIs de mockup externas (Dynamic Mockups, SudoMock, Placid…) | Decisão D1: canvas próprio. Fica como gancho futuro para cenas complexas. |
| Perspectiva real / foreshortening / distorção de tecido | v1 é frente + leve ângulo (elipse afim); warp por triângulos/WebGL é fase futura. |
| Overlay multicamadas (highlight + shadow separados) | v1 usa 1 overlay PNG + `blend_mode` configurável. |
| Salvar o mockup como imagem de exibição do item de carrinho | Decisão T6: carrinho/impressão usam a arte chapada. |
| Remoção de fundo da arte / geração de cena por IA | Fora do escopo; a arte entra como enviada. |
| Reprocessar imagens de produto já geradas | Após gerado, o render é uma imagem normal em `images[]`. |
| Batch "aplicar arte a todos os produtos" | v1 é por-produto. |
| Produzir/fatiar os arquivos de template (fundo/overlay) | Pré-requisito de conteúdo (D2), feito em Figma/Photoshop fora do código. |

---

## Assumptions & Open Questions

| Assumption / decisão | Chosen default | Rationale | Confirmed? |
| -------------------- | -------------- | --------- | ---------- |
| Rota técnica | Canvas próprio (`@nanapin/core/mockup`) | Discovery D1 | y |
| Origem dos templates | Prontos de banco, fatiados em fundo+overlay | Discovery D2 | y |
| Saída do Admin | Anexar renders ao `images[]` do produto | Discovery D3 | y |
| Realismo v1 | Frente + leve ângulo via elipse afim | Discovery D4 | y |
| RLS `mockup_templates`/bucket | Leitura pública, escrita admin-only (`has_role`) | STATE.md [2026-07-18]; `has_role` já existe | y |
| CORS/canvas tainting | `loadImage` seta `crossOrigin='anonymous'`; Storage público envia CORS `*` | Necessário p/ `toBlob/toDataURL` de assets do Storage (T5) | y |
| Mockup = só exibição | Impressão/carrinho seguem com a arte chapada (`generateExportDataUrl`) | Correção de domínio (T6) | y |
| Loja sem upload | Prévia é client-side, não persiste | Booster de confiança (T7) | y |
| Ajuste de posição da arte | "cover-fit" por padrão + offset/escala manual (como no CustomPinPage) | Reuso de UX conhecida | y |
| Coords da art-zone | Normalizadas 0..1 relativas ao fundo | Resolução-independente | y |
| Renders duplicados ao regerar | Cada "Gerar" cria arquivos novos (UUID) e anexa; admin curadoria via remover imagem | Sem dedup automática; geração é intencional | y |
| Testes de canvas | Testar geometria pura (normalizado→pixel, matriz da elipse); composição real via happy-dom se viável, senão asserir contrato do canvas mockado | `@nanapin/core` já tem vitest; evita depender de render pixel-perfect | y |
| Branch de execução | Novo `feat/mockup-generator` a partir de `main` | Isola do WIP atual de UI standardization | n |

**Open questions:** nenhuma — todas resolvidas ou logadas acima.

---

## User Stories

### P1: Engine de composição de mockup ⭐ MVP

**User Story**: Como desenvolvedor, quero uma função pura de composição em `@nanapin/core`, para que
Loja e Admin apliquem arte sobre templates com o mesmo código, sem tainting de canvas.

**Why P1**: Fundação compartilhada; os dois pontos de uso dependem dela. É a peça de maior risco (CORS, geometria).

**Acceptance Criteria**:

1. WHEN `composeMockup({ background, overlay, art, artZone, transform, blendMode })` é chamado THEN o
   sistema SHALL desenhar, nesta ordem, o fundo, a arte recortada na art-zone e o overlay com
   `globalCompositeOperation = blendMode`, e retornar um objeto com `canvas`, `toBlob()` e `toDataURL()`.
2. WHEN a composição usa imagens carregadas via `loadImage` (que seta `crossOrigin='anonymous'` antes do `src`)
   a partir de URLs públicas do Storage THEN `toDataURL()`/`toBlob()` SHALL retornar dados **sem lançar `SecurityError`**.
3. WHEN a art-zone é `{ shape:'circle', cx, cy, r }` ou `{ shape:'ellipse', cx, cy, rx, ry, rotation }` em
   coords normalizadas 0..1 THEN o sistema SHALL mapear para pixels do fundo e recortar (clip) a arte nessa forma.
4. WHEN nenhum `overlay` é fornecido THEN o sistema SHALL compor fundo + arte sem a camada de blend, sem erro.
5. WHEN a arte é menor ou maior que a art-zone THEN o sistema SHALL aplicar "cover-fit" por padrão (arte cobre a
   zona) e SHALL aplicar o `transform` (escala/offset/rotação) informado sobre esse baseline.
6. WHEN o canvas é gerado THEN o sistema SHALL renderizar na **resolução natural do fundo** (export de alta qualidade).

**Independent Test**: Testes unitários em `@nanapin/core`: geometria normalizado→pixel e matriz da elipse
(puro); e um caso de composição (canvas happy-dom ou mock) asserindo ordem de desenho, ausência de overlay
e o caminho de export sem `SecurityError`.

---

### P1: Coleção de mockups no Admin ⭐ MVP

**User Story**: Como administrador, quero cadastrar e gerenciar uma coleção de templates de mockup
(fundo + overlay + art-zone), para reutilizá-los ao gerar imagens de produto.

**Why P1**: Sem a coleção não há o que aplicar; é o "banco de mockups" que o usuário pediu.

**Acceptance Criteria**:

1. WHEN a migration é aplicada THEN o sistema SHALL criar a tabela `public.mockup_templates`
   (`id, name, background_url, overlay_url?, art_zone jsonb, blend_mode, is_active, sort_order, created_at, updated_at`)
   e o bucket público `mockup-templates`, com RLS **leitura pública** e **escrita apenas admin** (`has_role(auth.uid(),'admin')`).
2. WHEN o admin cria um template com fundo (obrigatório), overlay (opcional), nome, `blend_mode`, `is_active` e ordem
   THEN o sistema SHALL subir os assets ao bucket `mockup-templates` e persistir o registro.
3. WHEN o admin ajusta a art-zone arrastando uma elipse sobre o preview do fundo (mover/redimensionar rx,ry/rotacionar)
   THEN o sistema SHALL salvar a geometria em coords normalizadas 0..1.
4. WHEN o editor de template está aberto THEN o sistema SHALL exibir uma **prévia realista ao vivo** compondo uma arte de
   amostra via `composeMockup`.
5. WHEN o admin edita, ativa/desativa, reordena ou exclui um template THEN o sistema SHALL refletir a mudança; ao **excluir**,
   SHALL remover os assets correspondentes do bucket `mockup-templates`.
6. WHEN a página `/admin/mockups` é renderizada THEN o sistema SHALL usar os shared components do admin
   (`PageHeader`, `FormCard`, `EmptyState`) e tokens shadcn, e SHALL constar no menu do `AdminLayout`.

**Independent Test**: Em `/admin/mockups`, criar um template (fundo+overlay), desenhar a art-zone, salvar; recarregar e
ver persistência + prévia; desativar/excluir e confirmar efeito e limpeza dos assets.

---

### P1: Aplicar arte a mockups e anexar ao produto ⭐ MVP

**User Story**: Como administrador, quero, no cadastro de produto, aplicar uma arte a mockups escolhidos e
anexar os resultados às imagens do produto, para gerar as fotos do site sem ferramentas externas.

**Why P1**: É o valor central ("só com a arte, removo a necessidade de outras ferramentas"); fecha o loop.

**Acceptance Criteria**:

1. WHEN o admin abre o "Estúdio de Mockup" a partir da seção de imagens do
   [ProductFormDialog](apps/backoffice/src/features/product-form/ui/ProductFormDialog.tsx) THEN o sistema SHALL permitir
   escolher a arte de origem como **novo upload** OU uma **imagem já presente** no produto.
2. WHEN o admin seleciona 1..n templates **ativos** e ajusta a posição da arte por template (escala/offset) THEN o
   sistema SHALL exibir a prévia de cada composição.
3. WHEN o admin confirma "Gerar" THEN o sistema SHALL compor cada template na resolução do fundo, subir cada render ao
   bucket `product-images` (via util de upload de `Blob`) e **anexar as URLs resultantes ao `images[]`** do produto.
4. WHEN os renders são anexados THEN o sistema SHALL preservar as imagens existentes e sua ordem (a principal/primeira não
   muda) e adicionar os novos ao final; se o produto não tinha imagens, o primeiro render vira a principal.
5. WHEN parte dos uploads falha THEN o sistema SHALL anexar os que tiveram sucesso e reportar as falhas (toast), sem travar a UI.
6. WHEN o produto é salvo após gerar THEN o payload SHALL persistir `images[]` incluindo os renders, sem alterar outros campos.

**Independent Test**: No form de produto, "Gerar mockup" a partir de uma arte → escolher 2 templates → Gerar → ver as URLs
em `images[]`, os arquivos no bucket `product-images`, salvar e conferir no site; simular 1 falha de upload e ver sucesso parcial.

---

### P1: Prévia realista na Loja ("Crie Seu Botton") ⭐ MVP

**User Story**: Como cliente, quero ver minha arte aplicada num botton realista antes de comprar, para confiar no resultado.

**Why P1**: Booster de conversão pedido explicitamente; nasce junto com o Admin reusando 100% da engine + coleção (leitura pública).

**Acceptance Criteria**:

1. WHEN o cliente montou sua arte e abre a aba "Prévia real" THEN o sistema SHALL compor a **arte chapada atual**
   (fonte: `generateExportDataUrl`) nos templates **ativos** e exibi-los num carrossel, **client-side** (sem upload).
2. WHEN não há templates ativos THEN o sistema SHALL ocultar a prévia (ou exibir aviso), sem erro.
3. WHEN o cliente exporta ("Baixar PNG") ou adiciona ao carrinho THEN o arquivo entregue SHALL continuar sendo a **arte
   chapada**, não o composto com overlay (mockup é só exibição).

**Independent Test**: Em `/crie-seu-botton`, enviar arte → aba "Prévia real" mostra a arte nos templates ativos;
confirmar que Baixar PNG/carrinho seguem entregando a arte chapada; com coleção vazia, a aba não quebra.

---

## Edge Cases

- WHEN um template não tem overlay THEN a composição SHALL ser fundo + arte (sem blend), sem erro (ENG-04).
- WHEN a imagem de arte/fundo/overlay não carrega (corrompida/URL inválida) THEN `composeMockup` SHALL rejeitar e a UI SHALL
  exibir erro sem crash.
- WHEN se tenta `toDataURL()` de um composto com asset do Storage carregado **sem** `crossOrigin` THEN ocorreria
  `SecurityError`; o `loadImage` SHALL prevenir isso (teste negativo explícito de ENG-02).
- WHEN a coleção de templates está vazia THEN o Admin SHALL exibir `EmptyState` e a Loja SHALL ocultar a prévia.
- WHEN um template usado para gerar uma imagem de produto é **excluído** depois THEN a imagem já anexada ao produto SHALL
  permanecer (cópia independente em `product-images`).
- WHEN a art-zone recebe valores fora de 0..1 THEN o sistema SHALL clampar/validar antes de salvar.
- WHEN o produto não possui imagens e um render é anexado THEN esse render SHALL tornar-se a imagem principal.
- WHEN o fundo tem resolução muito alta THEN o export SHALL respeitar a resolução do fundo (sem upscale artificial) — custo/memória aceitável para uso admin pontual.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| ENG-01 | P1: Engine | Design | ✅ Verified |
| ENG-02 | P1: Engine | Design | ✅ Verified |
| ENG-03 | P1: Engine | Design | ✅ Verified |
| ENG-04 | P1: Engine | Design | ✅ Verified |
| ENG-05 | P1: Engine | Design | ✅ Verified |
| ENG-06 | P1: Engine | Design | ✅ Verified |
| COL-01 | P1: Coleção | Design | ✅ Verified |
| COL-02 | P1: Coleção | Design | ✅ Verified |
| COL-03 | P1: Coleção | Design | ✅ Verified |
| COL-04 | P1: Coleção | Design | ✅ Verified |
| COL-05 | P1: Coleção | Design | ✅ Verified |
| COL-06 | P1: Coleção | Design | ✅ Verified |
| APP-01 | P1: Aplicar | Design | ✅ Verified |
| APP-02 | P1: Aplicar | Design | ✅ Verified |
| APP-03 | P1: Aplicar | Design | ✅ Verified |
| APP-04 | P1: Aplicar | Design | ✅ Verified |
| APP-05 | P1: Aplicar | Design | ✅ Verified |
| APP-06 | P1: Aplicar | Design | ✅ Verified |
| STR-01 | P1: Loja | Design | ✅ Verified |
| STR-02 | P1: Loja | Design | ✅ Verified |
| STR-03 | P1: Loja | Design | ✅ Verified |

**ID format:** `[CATEGORY]-[NUMBER]` (ENG=engine, COL=coleção admin, APP=aplicar→produto, STR=loja).
**Status values:** Pending → In Design → In Tasks → Implementing → Verified.
**Coverage:** 21 total, 21/21 ✅ Verified [2026-07-21] — engine (ENG-01..06) e helpers (APP-04/05) por unit test + discrimination sensor; COL-*/APP-01..03/06/STR-* por inspeção de código + build gate (matriz aprovada). Ver `validation.md`.

---

## Implicit-Requirement Dimensions (sweep — Large/Complex)

| Dimensão | Resolução |
| -------- | --------- |
| Input validation & bounds | Tipos `image/*`, tamanho (≤5MB, como no ProductFormDialog); art-zone clampada a 0..1; fundo obrigatório, overlay opcional (ENG-04, COL-02, edge cases). |
| Failure / partial-failure | Falha de load rejeita composição c/ erro na UI; upload parcial anexa os sucessos e reporta falhas (APP-05, edge cases). |
| Idempotency / retry / duplicate | N/A because cada "Gerar" é intencional e cria arquivos UUID; sem dedup automática (assumption logada); admin remove duplicatas via UI. |
| Auth boundaries & rate limits | Escrita de templates e bucket **admin-only** via `has_role`; leitura pública (COL-01). Rate limit N/A because composição é client-side, sem endpoint server. |
| Concurrency / ordering | Append preserva imagens/ordem existentes; principal inalterada (APP-04). Sem estado server concorrente. |
| Data lifecycle / expiry | Excluir template remove seus assets do bucket; renders já anexados ao produto persistem (cópias independentes) (COL-05, edge cases). Sem TTL. |
| Observability | Erros de composição/upload logados (`console.error`, como `uploadProductImage`) e sinalizados por toast (APP-05). |
| External-dependency failure | N/A because sem API externa (canvas próprio, D1); falha do Storage cai no caminho de "upload falhou" (APP-05). |
| State-transition integrity | `is_active` controla visibilidade na Loja (só ativos compõem prévia) e elegibilidade no estúdio (só ativos aplicáveis) (COL-06→STR-01, APP-02). |

---

## Success Criteria

- [ ] `@nanapin/core/mockup` compõe e exporta sem `SecurityError`, com testes de geometria/contrato verdes.
- [ ] Admin cria/edita/exclui templates em `/admin/mockups` com editor de art-zone e prévia ao vivo, RLS escopada.
- [ ] No form de produto, aplicar arte a N templates gera renders e os anexa a `images[]` (principal preservada), com sucesso parcial tratado.
- [ ] Loja mostra "Prévia real" com templates ativos, mantendo a arte chapada para download/carrinho.
- [ ] `pnpm build` e `pnpm test` verdes; nenhuma dependência de runtime nova; sem regressão no CustomPinPage nem no ProductFormDialog.
