# 70 — O sitemap servido de dentro da Vercel, e o `robots.txt` gerado da origem

**Tamanho**: médio (spec breve, design inline, tasks implícitas). **Decisões do usuário (2026-10-20)**:
cache de borda de **1 hora** no sitemap; `robots.txt` **gerado no build** a partir de `STORE_PUBLIC_URL`.

## Problem Statement

Depois da `69`, `/sitemap.xml` é o último `rewrite` da loja para `*.supabase.co` que um rastreador
lê, e ele não é cacheado pela Vercel: medido em 2026-10-20, **TTFB de 4,7 a 9,3 s**, sempre `MISS`. E a
linha `Sitemap:` do `robots.txt` é um dono escrito à mão da origem da loja (`AD-022`), ao lado da env
`STORE_PUBLIC_URL` da Vercel e do secret da Supabase — três valores para mudar juntos no dia do DNS.

## Goals

- [ ] `/sitemap.xml` servido pela função `api/page` (deploy da loja, `pdx1`) com `s-maxage=3600`, e
      a segunda batida com `X-Vercel-Cache: HIT`.
- [ ] O documento servido idêntico ao de hoje para o mesmo banco (mesmas `<loc>`, `<lastmod>`, fotos).
- [ ] A linha `Sitemap:` do `robots.txt` sai de `STORE_PUBLIC_URL` no build — um dono a menos.

## Out of Scope

| Item | Razão |
| --- | --- |
| O feed do Google Shopping (`/feeds/google-shopping.xml`) | Só o Merchant Center lê; o feed está desligado; segue na Supabase |
| Mudar a regra de quais URLs entram (`core/sitemap`) | Só o transporte muda |
| Sitemap index / divisão em vários arquivos | 2.331 URLs, longe do limite de 50.000 |

## Assumptions

| Decisão | Escolha | Confirmado? |
| --- | --- | --- |
| Cache | `public, s-maxage=3600` no 200; degradado (leitura falha/truncada) **503 `no-store`**, nunca 200 parcial — a régua de hoje (`handlers.test.ts`) | sim (1 h) |
| Chave | publicável, a visibilidade do sitemap continua sendo a RLS (`AD-022`) | não — conforma `AD-022` |
| `robots.txt` sem `STORE_PUBLIC_URL` | **o build falha** quando roda na Vercel (`VERCEL=1`); fora dela usa `http://localhost:8082` | não — assumido: `robots.txt` errado tira a loja da busca |
| `robots.txt` continua arquivo ESTÁTICO de `dist/` | sim — `robots.txt` em 5xx faz o Google parar de rastrear o site inteiro (`AD-022`) | não — conforma |
| A edge function `sitemap` | código sai do repositório; a hospedada é apagada depois do deploy conferido | não — molde da `69` |

## Acceptance Criteria

1. **SMV-01** WHEN `/sitemap.xml` é pedido THEN a resposta SHALL vir da função `api/page`, 200,
   `Content-Type: application/xml; charset=utf-8`, `Cache-Control: public, s-maxage=3600`.
2. **SMV-02** WHEN a mesma base é lida THEN o XML SHALL ser byte a byte o que `renderSitemapXml`
   produz hoje (as `<loc>`, `<lastmod>`, `?variant=` e `<image:image>` da `68`/`69`).
3. **SMV-03** WHEN qualquer leitura falha ou volta truncada THEN SHALL responder **503**, `no-store`,
   corpo sem `<urlset>` — nunca um sitemap 200 parcial (régua de hoje).
4. **SMV-04** WHEN o `vercel.json` é lido THEN SHALL NOT haver `rewrite` de `/sitemap.xml` para
   `*.supabase.co` nem override de `Content-Type` em `/sitemap.xml`; o único rewrite externo é o feed.
5. **SMV-05** WHEN o build roda THEN `dist/robots.txt` SHALL ter exatamente uma linha
   `Sitemap: <STORE_PUBLIC_URL>/sitemap.xml` absoluta (sem barra dupla), e as demais linhas de
   `public/robots.txt` iguais.
6. **SMV-06** WHEN o build roda na Vercel sem `STORE_PUBLIC_URL` THEN SHALL falhar com mensagem clara.
7. **SMV-07** WHEN a leitura usa o client THEN SHALL ser com a chave publicável e `readAllPages`
   (teto de 1.000 do PostgREST), nunca a chave de serviço.

## Success Criteria

- [ ] Em produção: `/sitemap.xml` 200, `application/xml`, `HIT` na segunda batida, mesma contagem de
      `<loc>` e `<image:loc>` de antes (2.331 / 3.742 em 2026-10-20).
- [ ] `robots.txt` servido com a linha da origem da env; Sitemap check verde.
