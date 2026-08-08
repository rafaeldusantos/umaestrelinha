# Context — mockup-generator

Decisões de gray areas capturadas no discovery (via perguntas ao usuário e leitura do código).
Origem: plano de discovery em `~/.claude/plans/gostaria-de-adicioanar-ao-unified-hippo.md`.

## Decisões do usuário (discovery)

| # | Questão | Opções consideradas | Escolha | Rationale |
|---|---------|---------------------|---------|-----------|
| D1 | Rota técnica de geração | (a) Canvas próprio · (b) Híbrido canvas+API · (c) API de PSD externa (Dynamic Mockups/SudoMock) | **Canvas próprio** | $0, tempo real na loja, controle total da marca, sem dependência externa/secret. Botton frontal é o caso ideal para composição achatada. |
| D2 | Origem dos templates | (a) Fotos/PSD próprios · (b) Placeholders gerados · (c) **Templates prontos de banco** | **Templates prontos de banco** | Bibliotecas grátis/pagas de pin-button (unblast, mockuptree, Etsy, Adobe Stock) aceleram o bootstrap da coleção. |
| D3 | Saída do Admin | (a) **Anexar ao `images[]`** · (b) Ambos · (c) Biblioteca separada + download | **Anexar direto ao `images[]` do produto** | Fecha o loop "só com a arte gero a foto do produto"; reusa o fluxo existente do ProductFormDialog. |
| D4 | Realismo v1 | (a) Só frente · (b) **Frente + leve ângulo (elipse/afim)** · (c) Lifestyle em perspectiva/tecido | **Frente + leve ângulo (elipse/afim)** | Canvas 2D cobre círculo e elipse afim sem foreshortening; perspectiva real fica para fase futura. |

## Decisões técnicas derivadas (constraints do projeto)

| # | Decisão | Rationale / fonte |
|---|---------|-------------------|
| T1 | Engine mora em `@nanapin/core` (`packages/core/src/mockup/`), framework-agnóstica (canvas/DOM puro) | Consumida pelos dois apps como source; evita duplicar a lógica de composição já existente no `CustomPinPage`. |
| T2 | RLS da tabela `mockup_templates`: **leitura pública**, **escrita admin-only** via `public.has_role(auth.uid(),'admin')` | Decisão STATE.md [2026-07-18]: novas tabelas usam políticas escopadas, sem `Allow all`. `has_role` já existe (migration base). |
| T3 | Bucket `mockup-templates` (assets fundo+overlay): leitura pública, escrita admin-only | Mesma decisão de RLS escopada. Renders finais continuam em `product-images` (reuso de `uploadProductImage`). |
| T4 | Admin UI reusa shared components (`PageHeader`, `FormCard`, `EmptyState`, `AdminTable`) + tokens shadcn | Decisão STATE.md [2026-07-20] + lição candidata L-001 (manter só accents de marca `nana-*`). |
| T5 | `loadImage` **sempre** seta `img.crossOrigin='anonymous'` antes do `src` | Composição de assets vindos do Storage exige isso para `toBlob()/toDataURL()` não lançar `SecurityError` (canvas tainting). Storage público envia `access-control-allow-origin: *`. |
| T6 | Mockup é **só exibição**; arquivo de impressão/carrinho continua sendo a arte chapada | Imprimir o composto com overlay/brilho seria errado. Regra de correção do domínio. |
| T7 | Loja (prévia) é 100% client-side, sem upload | Prévia é booster de confiança; não precisa persistir. |
