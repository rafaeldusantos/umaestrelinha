# 69 — Context

**Gathered:** 2026-10-19
**Spec:** `.specs/features/69-seo-servido-na-vercel/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Os quatro itens "recomendados" da análise de migração de DNS: `<image:image>` no sitemap, 404 de
verdade, cache de borda da página de produto (`BL-017`) e `<head>` servido de categoria e páginas
fixas. Os 301 da `BL-018` e a reimportação dos 25 produtos ficam fora.

## Implementation Decisions

### Endereço que não existe
- Produto inexistente **ou inativo** ⇒ **404** com a tela "Essa página não existe".
- Categoria inativa ⇒ **301 para a categoria-mãe** (a ativa mais próxima); raiz sem ancestral ativo ⇒ `/`.

### Frescor do cache
- Até **5 minutos** entre editar preço/estoque no painel e a página do produto mostrar.

### Escopo do `<head>` servido
- Categoria **e** páginas fixas indexáveis (Sobre, Perguntas frequentes, as duas políticas, Cuidados,
  o guia de envio de material).

### Agent's Discretion
- Arquitetura da função na Vercel, forma do rewrite, via de leitura da categoria inativa, forma da
  URL de imagem no sitemap.

### Declined / Undiscussed Gray Areas → Assumptions
- Conteúdo velho durante falha da origem, subcategoria por um segmento, origem das URLs absolutas e
  URL de imagem: registrados em *Assumptions* da spec.

## Specific References

- Medições de 19/10/2026: TTFB 1,5–2,2 s com `X-Vercel-Cache: MISS`; categoria servida com o
  `<title>` da home; `/produtos/inexistente-xyz` ⇒ 200.
- Documento de análise da migração: https://claude.ai/code/artifact/d189468d-2109-4fd9-aeed-9bd42cb0eb74

## Deferred Ideas

- Os 301 das URLs da Nuvemshop sem destino (`BL-018`).
- Apagar a edge function `product-page` do hospedado depois do deploy.
