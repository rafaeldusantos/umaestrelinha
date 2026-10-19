# 68 — Prova servida (T13)

**Data:** 2026-10-19 · **Ambiente:** Supabase local (`54441`), functions servidas pelo `index.ts`
**real** (`supabase functions serve --env-file`), banco local com o catálogo importado.
**Autor = quem mediu.** A verificação independente é o `validation.md`.

## Montagem, e por que ela tem essa forma

- O edge runtime local respondia `503 BOOT_ERROR` (`Module not found …/sitemap/index.ts`, arquivo que
  existe): bind-mount obsoleto. `supabase stop` (sem `--all`) + `supabase start` resolveu.
- `STORE_PUBLIC_URL` local é `http://localhost:8082`, e de dentro do container `localhost` é o
  próprio container: a `product-page` respondia **502** (shell inalcançável). E a 8082 da máquina era
  de outro processo. O Vite do dev server recusa `Host: host.docker.internal` (**403**, proteção do
  Vite 5.4). Solução: o `index.html` da loja servido estático na 8086 e
  `STORE_PUBLIC_URL=http://host.docker.internal:8086` por `--env-file` — a mesma origem para o sitemap
  e para a canônica, que é a condição da prova.
- Peça de prova: `pingente-afetivo-pata-com-cinzas-de-cremacao-em-prata`, `options` = **Modelo**
  (sem marcação) e depois **Cor** (Prata 925 · Folheado a Ouro · Folheado a Prata), duas variações por
  cor. É o caso das 52 peças em que o primeiro eixo não é o marcado.
- Marcações inseridas à mão no banco local: Prata 925 → *Prata 925* e Folheado a Ouro → *Folheado a
  ouro* (grupo Acabamento); Folheado a Prata → *Pet* (grupo Para quem). **Removidas no fim**
  (`count = 0`), grupos religados.

## Resultados

| O quê | Medido | Requisito |
| --- | --- | --- |
| Sitemap antes das marcações | 758 `<loc>`, **0** com `?variant=` | Success Criterion 2 (no local) |
| Sitemap com as três marcações | **761** `<loc>`; as três de opção logo depois da `<loc>` da peça, na ordem de `options[].values`, representantes `…125/…126/…128` (as de menor `position`, não as `…129/…130/…131`), `lastmod` da peça | SVR-02, 04, 24, 25 |
| Script sobre **todo** `<loc>` com `?variant=` (`prova.sh`) | 3/3 com `rel="canonical"` servida **igual** à `<loc>`, exatamente uma por página, `Content-Type: text/html; charset=utf-8`; **0 falhas** | Success Criterion 1, SVR-18, SVR-28 |
| `?variant=…126` servido | `<title>Pingente … em Prata 925 — Folheado a Ouro</title>` (79 caracteres ⇒ sem marca); `og:url` == canônica; `description` começando por "Folheado a Ouro." | SVR-08, 09, 17, 18 |
| `?variant=…129` (Prata 925, **não** representante) | título da opção; canônica `…125`; JSON-LD `Product` com `url` = `…125`, `offers.url` e `sku` = `…129` (o `<g:link>` da aberta), `inProductGroupWithID` | Assumption confirmada, SVR-22, SVR-33 |
| `?variant=…129&utm_source=x&gclid=y` | idem — os parâmetros não chegam à canônica | Assumption confirmada |
| `?variant=999` e sem query | título e canônica da peça; JSON-LD `ProductGroup` | SVR-07, SVR-30 |
| Grupo *Para quem* desligado | `<loc>` de `…128` some do sitemap; a página de `…128` passa a canonizar para a peça — **pela service role** da `product-page`, que reaplica a restrição | SVR-20, SVR-29 |
| Feed `google-feed` antes × depois, mesmo catálogo | **idêntico byte a byte** (`cmp`), 3.110 itens, 7,1 MB. "Antes" servido de um `git worktree` do HEAD (`9284bb11`); controle: o sitemap desse serve tinha 0 `?variant=`. Interruptor do feed ligado temporariamente no local e restaurado ao JSON original | Success Criterion 3, SVR-22 |
| Navegador, 390×844, build de **produção** (`vite preview`), cookies aceitos | `document.title` = o mesmo do HTML servido; canônica `…125` sem `utm`; uma só; `scrollWidth` 390. O `collect` do GA4 levou `en=page_view`, `dt` = título da opção e `dl` com `?variant=1544816129` | SVR-11, 12, 14, Success Criterion 4 |

## ⚠️ Um hit real saiu para o GA4

A interceptação cobria `*google-analytics.com`, e o `gtag` enviou para **`analytics.google.com`**.
**Uma** requisição chegou à propriedade `G-SQL517XDQZ`, de `localhost`, com `tt=internal`
(`traffic_type`), carregando `view_item`, `page_view` e `view_item_list` da página de prova. Em
desenvolvimento a loja não mede (`import.meta.env.PROD`), por isso a medida precisou do build. A rota
`**/g/collect*` foi acrescentada em seguida; a régua para a próxima vez é interceptar por **caminho**
(`/g/collect`), nunca por domínio.

## O que falta, e só a produção prova

- **Depois do deploy** (quando o usuário publicar): `curl` contra a loja publicada — tipo entregue,
  uma `rel="canonical"` igual à URL da peça, `og:url` igual, e **zero** `<loc>` com `?variant=`
  (Success Criterion 2: o deploy não muda o sitemap de produção, porque a tabela está vazia lá).
- SVR-23 de opção em produção só existe depois de a Adri marcar uma cor no painel.
- Search Console (Success Criterion 5): 4 e 8 semanas depois da curadoria.
