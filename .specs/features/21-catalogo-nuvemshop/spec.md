# 21 · Catálogo Nuvemshop — Especificação

> **Fatiada por [`AD-016`](../../STATE.md).** Depende da
> [`20-rebrand-uma-estrelinha`](../20-rebrand-uma-estrelinha/spec.md) estar fechada — o importador
> nasce escrevendo `@estrelinha/*` e gravando no Supabase local da faixa 5434x. Contexto,
> credenciais e decisões compartilhadas: [`20/context.md`](../20-rebrand-uma-estrelinha/context.md).

## Problem Statement

A Uma Estrelinha vende hoje na **Nuvemshop**, e é lá que estão os produtos reais, as fotos, os preços
e — o que mais importa — as **URLs que o Google já indexou** e que as landing pages vêm alimentando
com tráfego orgânico.

A loja nova sobe com um seed de desenvolvimento inventado. Sem catálogo real não há como validar
layout de card, grade de variação, faixa de preço nem o próprio fluxo de compra; e se os slugs não
forem preservados **no momento do import**, o SEO construído até aqui é perdido de forma
irreversível.

## Goals

- [ ] Categorias, produtos, variantes, preços e estoque reais no Supabase.
- [ ] **Imagens no Supabase Storage** — a loja nova não depende de uma conta Nuvemshop que pode ser
      cancelada.
- [ ] Slugs preservados, para que toda URL indexada continue resolvendo.
- [ ] Import **idempotente**: rodar de novo atualiza, nunca duplica.
- [ ] Relatório cujos totais conferem com o que a API devolveu.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Clientes e histórico de pedidos | `C-04`. Dado pessoal (LGPD), reconciliação de identidade e superfície de erro grande. Registrado no `BACKLOG.md` como feature futura. |
| Sincronização recorrente com a Nuvemshop | `C-04`. O import é **one-shot**: depois dele o Supabase é a fonte da verdade. |
| Redirects de URL antiga | Feature [`22`](../22-material-afetivo/spec.md) (`SEO-01..03`). Aqui o slug é **preservado**, que é o que evita precisar de redirect na maioria dos casos. |
| Marcar quais peças exigem material afetivo | Feature [`22`](../22-material-afetivo/spec.md). O import traz o catálogo como ele é. |
| Importar avaliações / depoimentos da Nuvemshop | Não existe tabela `product_reviews` no schema. |

---

## Assumptions & Open Questions

| Assumption / decisão | Chosen default | Rationale | Confirmado? |
| --- | --- | --- | --- |
| Onde o importador roda | Script Node no repositório, executado à mão — **`tools/catalog-import`** | Precisa de credencial secreta e de service role; não pode ser edge function pública nem código de cliente | **y** — Design |
| Identificador de idempotência | Coluna nova `nuvemshop_id` em `products`, `categories` **e `product_variants`** | Slug pode mudar na origem; o id da Nuvemshop não. A terceira tabela entrou porque casar variação por `option_values` a transforma em duplicata quando um eixo é renomeado | **y** — Design |
| Bucket das imagens | `product-images` (o que já existe) | Medido: público, sem `file_size_limit` e sem restrição de MIME — nenhuma policy nova | **y** — Design |
| Idioma dos campos localizados | `pt`, com fallback para o primeiro valor presente | Mesma regra que `../landing-pages/src/lib/nuvemshop.ts` já aplica | **y** |
| Produto sem variação na origem | Vira uma variante única, como o schema já exige | Medido: **não ocorre** — a Nuvemshop sempre devolve ao menos uma variação. 126 produtos têm variação única sem eixo, que é o mesmo caso | **y** — Design |
| Reimportação e imagens | Não apaga imagem já no Storage; só acrescenta o que falta | Obtido pelo **caminho determinístico** (`nuvemshop/<product_id>/<image_id>.webp`), não por tabela de controle | **y** — Design |
| Produtos despublicados na Nuvemshop | Importados como **`is_active = false`** (o nome real da coluna) | Sumir com eles perderia o slug indexado e o histórico. Medido: 9 casos | **y** — Design |
| Formato das imagens gravadas | **WebP servido pelo próprio CDN** da Nuvemshop, com fallback para o arquivo original | Medido: mesma URL com extensão trocada devolve `image/webp` com **89% menos bytes** (11 de 12 amostras). O catálogo cai de ~3,5 GB para ~410 MB sem biblioteca de transcodificação | **y** — Design |
| Re-execução e curadoria | Campo de **catálogo** é sobrescrito pela origem; campo de **vitrine** (`active`, `sort_order`, `show_in_menu`, `menu_promo`, `is_featured`, `is_new`, `is_promo`) **nunca** é | Sem isso, a segunda execução desfaz em silêncio o que foi curado no admin. A divergência vira linha de relatório | **y** — Design |

**Decisões do usuário — 2026-08-09:**

1. **O catálogo de desenvolvimento é removido.** As seções 1–3 do `supabase/seed.sql` (16 produtos,
   7 categorias, 24 variações inventadas) saem; cupons e usuário admin ficam. Os slugs entram na
   seção 0 (limpeza explícita), com `AND nuvemshop_id IS NULL` para que uma execução avulsa do seed
   **depois** do import não apague a categoria real. Resolve a única colisão de slug medida
   (`joias-afetivas`). Consequência aceita: `supabase db reset` deixa a loja sem catálogo até o
   import rodar.
2. **Quatro categorias entram `active = false`**, com slug preservado: **Black Friday**, **Rastreio**,
   **Brinquedos** e **Profissões**. As duas últimas estão vazias; "Black Friday" numa loja sem Black
   Friday é a urgência fabricada que o `CLAUDE.md` proíbe. As quatro aparecem nominalmente no
   relatório.
   - **A lista é chaveada por `nuvemshop_id`, não por slug** — e o motivo foi descoberto ao medir:
     o *handle* de "Brinquedos" na loja real é **a marca anterior**. Chavear por slug plantaria
     aquela string em código novo, contra a varredura que a feature `20` deixou de pé. O id também
     é mais estável, pelo mesmo motivo de `CAT-01`: slug muda na origem.
   - Descoberta relacionada, resolvida em `T18`: a varredura de marca lia `apps`, `packages` e
     `supabase`, e esta feature criou um **quarto diretório de fonte** (`tools/`). O escopo foi
     estendido, com a fixture da API na `ALLOWLIST` — ali a marca é o **dado que o servidor
     devolve**, não resíduo do repositório.

**Open questions:** nenhuma sem registro.

---

## Sweep de dimensões implícitas

| Dimensão | Resolução |
| --- | --- |
| Validação de entrada e limites | `CAT-08` — produto sem nome ou sem preço é pulado e reportado, nunca gravado incompleto |
| Falha e falha parcial | `CAT-07` — imagem que falha não descarta o produto; `CAT-06` — esgotadas as tentativas, o import **para com relatório**, sem produto meio-gravado |
| Idempotência / retry / duplicata | `CAT-01` — chave `nuvemshop_id`; segunda execução atualiza e cria zero duplicata |
| Fronteiras de auth e rate limit | `CAT-09` — credenciais lidas de env **fora do navegador**, service role; 500 req/h da Nuvemshop respeitados com backoff |
| Concorrência / ordenação | `CAT-05` — categorias pai importadas antes das filhas, senão `parent_id` aponta para nada |
| Ciclo de vida do dado | `CAT-03` — re-import não apaga imagem existente no Storage |
| Observabilidade | `CAT-08` — relatório com criados / atualizados / pulados / imagens falhadas, e conferência de total |
| Falha de dependência externa | `CAT-06` — Nuvemshop 429/5xx ⇒ backoff; Storage indisponível ⇒ parada limpa, nunca produto apontando para URL inexistente |
| Integridade de transição de estado | `N/A` — o import não move nenhuma máquina de estado |

---

## User Stories

### P1: O catálogo real está na loja ⭐ MVP

**User Story**: Como Adri, quero abrir a loja nova e ver os meus produtos de verdade — com as fotos,
os preços e os endereços que o Google já indexou — para avaliar a loja pelo que ela é, e não por um
seed inventado.

**Acceptance Criteria**:

1. WHEN o importador roda pela segunda vez com o mesmo catálogo THEN SHALL atualizar os registros
   existentes e criar **zero duplicata**, chaveando pelo identificador da Nuvemshop persistido no
   registro.
2. WHEN um produto é importado THEN o `slug` SHALL ser o mesmo que a Nuvemshop publica, para que a
   URL indexada continue resolvendo.
3. WHEN um produto tem imagens THEN cada imagem SHALL ser baixada e regravada no **Supabase
   Storage**, e o registro SHALL referenciar a URL do Storage — nunca o CDN da Nuvemshop.
4. WHEN um produto tem variações THEN preços e estoque SHALL ser gravados em `product_variants`, com
   `base_price` derivado pela regra que já existe no schema; produto sem variação na origem SHALL
   virar uma variante única.
5. WHEN as categorias são importadas THEN a hierarquia (`parent_id`) e a ordenação SHALL ser
   preservadas, as **pais SHALL ser gravadas antes das filhas**, e o vínculo produto↔categoria SHALL
   usar `product_categories`.
6. WHEN a API responde 429 ou 5xx THEN o importador SHALL aplicar backoff e, esgotadas as
   tentativas, SHALL **parar com relatório**, sem deixar produto gravado pela metade.
7. WHEN uma imagem individual falha THEN o produto SHALL ser importado **sem aquela imagem** e a
   falha SHALL constar do relatório — um produto nunca é descartado por causa de uma foto.
8. WHEN o import termina THEN SHALL emitir relatório com criados, atualizados, pulados e imagens
   falhadas, e o total gravado SHALL bater com o total lido da API menos os pulados.
9. WHEN o importador executa THEN as credenciais SHALL vir de variável de ambiente **fora do
   navegador**, e nenhuma SHALL aparecer em bundle de cliente.
10. WHEN o catálogo real é importado THEN o catálogo de **desenvolvimento** SHALL ter saído do
    `seed.sql`, e a limpeza por slug SHALL casar **apenas** linhas sem `nuvemshop_id` — de modo que
    executar o seed avulso depois do import não apague nenhum registro importado.
11. WHEN as categorias são importadas THEN `black-friday`, `rastreio`, `brinquedos` e `profissoes`
    SHALL entrar com `active = false` e slug preservado, e SHALL aparecer **nominalmente** no
    relatório final.
12. WHEN o importador roda pela segunda vez THEN os campos de **vitrine** (`active`/`is_active`,
    `sort_order`, `show_in_menu`, `menu_promo`, `is_featured`, `is_new`, `is_promo`) SHALL ser
    preservados como estão no banco, e a divergência em relação à origem SHALL constar do relatório.

**Independent Test**: rodar o import contra o catálogo real, abrir `/` e uma página de produto,
conferir a foto servida pelo Storage e o slug igual ao da Nuvemshop.

---

## Edge Cases

- WHEN um produto não tem preço ou não tem nome THEN SHALL ser pulado e reportado.
- WHEN dois produtos da origem geram o mesmo slug THEN o segundo SHALL ser reportado e pulado, nunca
  sobrescrever o primeiro.
- WHEN um slug colide com um registro já existente de **outro** `nuvemshop_id` THEN SHALL ser
  reportado e pulado.
- WHEN o mesmo produto é reimportado depois de perder uma imagem na origem THEN a imagem já no
  Storage SHALL permanecer.
- WHEN um produto está despublicado na origem THEN SHALL entrar com `active = false`, preservando o
  slug.
- WHEN o Storage está indisponível THEN o import SHALL parar com relatório.

**Descobertos ao medir a API real (2026-08-09) — não estavam previstos na Specify:**

- WHEN um SKU da origem **já existe** em outra variação THEN SHALL ser gravado `null` e reportado,
  nunca abortando o insert — `product_variants.sku` é `UNIQUE` global e a origem tem **1.466**
  duplicatas (`BA-002` aparece 316 vezes, em 68 produtos). Mesma regra da migration
  `20260801120100_02-backfill-variants`: perder o SKU é recuperável na tela, perder a variação não é.
- WHEN `compare_at_price` é **igual ou menor** que o preço efetivo THEN `compare_price` SHALL ser
  `null` — sem esta guarda, **3.346 das 3.357** variações nasceriam com "de" riscado igual ao "por".
- WHEN uma variação não tem preço mas o produto tem outras que têm THEN a variação SHALL ser gravada
  com `price = null` e `is_active = false`, preservando o `nuvemshop_id` sem torná-la vendável.
- WHEN todas as variações de um produto estão sem preço THEN o produto SHALL ser pulado — 
  `products.base_price` é `NOT NULL` sem default (1 caso: `pingente-figa-colecao-fragmentos`).
- WHEN a rendição `.webp` do CDN não responde `200 image/webp` THEN SHALL cair para o arquivo
  original — medido em 1 de 12 amostras.

---

## Requirement Traceability

| ID | História | Fase | Status |
| --- | --- | --- | --- |
| CAT-01 | P1 · Import idempotente por `nuvemshop_id` (AC 1) | Execute | Done |
| CAT-02 | P1 · Slug preservado (AC 2) | Execute | Done |
| CAT-03 | P1 · Imagens no Supabase Storage (AC 3) | Execute | Done |
| CAT-04 | P1 · Variantes, preços e estoque (AC 4) | Execute | Done |
| CAT-05 | P1 · Categorias, hierarquia e ordem de gravação (AC 5) | Execute | Done |
| CAT-06 | P1 · Backoff, rate limit e parada limpa (AC 6) | Execute | Done |
| CAT-07 | P1 · Falha de imagem não descarta produto (AC 7) | Execute | Done |
| CAT-08 | P1 · Relatório com totais conferidos (AC 8) | Execute | Done |
| CAT-09 | P1 · Credenciais fora do navegador (AC 9) | Execute | Done |
| CAT-10 | P1 · Seed de dev removido, limpeza segura por `nuvemshop_id IS NULL` (AC 10) | Execute | Done |
| CAT-11 | P1 · Quatro categorias inativas por curadoria, nomeadas no relatório (AC 11) | Execute | Done |
| CAT-12 | P1 · Re-execução preserva curadoria de vitrine (AC 12) | Execute | Done |

**Cobertura:** 12 requisitos · a `20` está fechada; design aprovado em 2026-08-09.

---

## Success Criteria

- [ ] O catálogo real está no banco, com imagens servidas pelo Supabase Storage.
- [ ] Rodar o import duas vezes seguidas produz o mesmo estado — zero duplicata.
- [ ] Os totais do relatório conferem com o que a API devolveu.
- [ ] Toda URL de produto indexada resolve na loja nova.
