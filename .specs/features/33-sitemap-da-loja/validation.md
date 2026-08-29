# Validation — `33-sitemap-da-loja`

**Veredito: PASS**, com uma ressalva de método declarada abaixo e duas pendências que só o push
resolve.

> ## ⚠️ Ressalva de método: **autor == verificador**
>
> A Skill pede um Verifier independente (author ≠ verifier, evidência-ou-zero). A execução foi
> inline por escolha do usuário, e este relatório foi escrito por quem implementou. **Ele não
> substitui uma leitura de olhos frescos**, e a feature entra na mesma fila de pendência da `22`, da
> `28` e da `32`.
>
> O que foi feito para reduzir — não eliminar — o viés: toda evidência abaixo é **medida**, com o
> comando ao lado; os dois guardas novos tiveram a **sensibilidade provada por injeção de falha**
> (não só "passa"); e o `urls.test.ts` carrega um **sensor** que assere a reprovação de um gerador
> ingênuo na mesma régua.

---

## 1. Gate — medido em 2026-08-29, por workspace, com exit code capturado

| Medida | Baseline (`CLAUDE.md`) | Medido | Δ |
| --- | --- | --- | --- |
| core | 1363 / 52 | **1418 / 55** | +55 / +3 |
| functions | 337 / 6 | **350 / 7** | +13 / +1 |
| store | 1903 / 130 | **1922 / 132** | +19 / +2 |
| backoffice | 1556 / 97 | **1556 / 97** | 0 |
| catalog-import | 335 / 16 | **335 / 16** | 0 |
| **total** | 5494 / 301 | **5581 / 307** | **+87 / +6** |

- **Tipos**: `0 · 0 · 0` (`npx tsc --noEmit -p apps/<app>/tsconfig.app.json`, exit 0 nos três).
- **Lint**: **30 erros / 8 warnings** — backoffice 28/7, store 2/1. **Idêntico à baseline**; nenhum
  problema novo.
- **Build**: `pnpm build` exit 0.
- **`packages/core/src/payment/**` intocado**: `git diff --name-only` não devolve nada sob `payment/`.
- **Nenhuma queda em lugar nenhum.** Nenhum teste foi removido, reescrito para menos ou afrouxado.
  A única asserção existente alterada foi a âncora de `headers` do `vercelRedirects.test.ts`, que
  subiu de 3 para 4 e **ganhou seis vizinhas** — o oposto de afrouxar.

**Flake observado e classificado**: na primeira execução do backoffice, `CategoryInspector.test.tsx`
e `SlugField.test.tsx` reprovaram por **timeout de 5s** com o container do Deno rodando em paralelo.
Isoladas: **49/49 verdes**. Com o container parado, a suíte inteira: **1556/97**. É a flake de RTL
sob carga que o `CLAUDE.md` já registra, não defeito.

---

## 2. Evidência por requisito

### P1 — a lista das URLs canônicas

| AC | Evidência | Como foi medido |
| --- | --- | --- |
| `SMP-01` | `Content-Type: application/xml; charset=utf-8`, corpo abrindo em `<?xml`, `<urlset>` no namespace `…/sitemap/0.9` | `curl -sD -` na function local; `render.test.ts` parseia com **jsdom** (`text/xml`), que **lança** em documento malformado — medido antes de ser adotado como régua |
| `SMP-02` | 680 `<loc>` em `/produtos/<slug>`; zero em `/produto/<slug>` | contagem no documento servido + `urls.test.ts` |
| `SMP-03` | **28** em dois segmentos, **7** categorias raiz em um; exemplo: `/personalizados/iniciais` | documento servido; a árvore local tem 7 raízes e 28 filhas, todas com pai ativo — conferido por `count=exact` |
| `SMP-04` | 4 institucionais, nenhuma outra rota fixa | `urls.test.ts` + `sitemapRoutes.test.ts` |
| `SMP-05` | 719/719 absolutas, **0** terminando em `/`, host único | varredura sobre o documento servido |
| `SMP-06` | **0** ocorrências das quatro formas legadas | varredura + `urls.test.ts`, que lê `LEGACY_REDIRECTS` em vez de repetir literais |
| `SMP-07` | **0** `<loc>` com `?` | varredura |
| `SMP-08` | **715** `<lastmod>` em 719 URLs — exatamente as 4 institucionais omitem | contagem no documento |
| `SMP-09` | **0** `<changefreq>` e **0** `<priority>` | contagem no documento + `render.test.ts` |
| `SMP-10` | escape na ordem certa, provado com slug **sintético** (`&` + acento) porque os 680 slugs reais são `[a-z0-9-]` puro — medido | `render.test.ts` |
| `SMP-11` | **719** `<url>`: 680 + 35 + 4 | local **e** hospedado, os dois devolveram 719 |
| `SMP-12` | ordem determinística; entrada embaralhada produz documento idêntico | `urls.test.ts` |
| `SMP-13` | teto de 50.000 é dado (`SITEMAP_MAX_URLS`) e lança acima dele | `render.test.ts` |

### P1 — sempre atual (o critério que decidiu a arquitetura)

| AC | Evidência |
| --- | --- |
| `SMP-14` | **Medido de ponta a ponta**: 719 → inserir um produto ativo no banco → requisitar de novo → **720**, com `<loc>` `…/produtos/prova-frescor-33` presente → remover → **719**. **Sem deploy e sem regeneração no meio.** |
| `SMP-15` | `lastmod` vem da linha lida na requisição (`urls.test.ts`); as 715 datas do documento servido são as `updated_at` do banco |

### P1 — nunca parcial

| AC | Evidência |
| --- | --- |
| `SMP-16` | 503 com contagem divergente, nas **duas** tabelas; `readAll.test.ts` cobre a truncagem real (primeira página cheia, segunda vazia) |
| `SMP-17` | 503 com zero produtos; e o caso irmão — **zero categorias NÃO derruba** — está coberto, porque uma loja sem categoria ainda tem produtos |
| `SMP-18` | 503 com origem ausente, relativa e `ftp:`; **e sem tocar no banco** (`countProducts` não chamado — `L-004`) |
| `SMP-19` | paginação em faixas inclusivas de 1.000, conferida contra `count=exact` |
| `SMP-20` | **todo corpo de erro é asserido como sem `<urlset>` e sem `<url>`**, e `text/plain` |

### P1 — descoberta

| AC | Evidência |
| --- | --- |
| `SMP-21` | uma linha `Sitemap:`, absoluta https, terminando em `/sitemap.xml` — `robotsSource.test.ts`, com âncora dupla (bytes **e** 5 diretivas `User-agent`) |
| `SMP-22` | as 5 diretivas anteriores intactas; nenhuma `Disallow` introduzida |
| `SMP-23` | asserido pela rotina diária (host anunciado == host servido). Simulado localmente contra o `robots.txt` real: host extraído corretamente |

### P2 — guarda de rota

| AC | Evidência |
| --- | --- |
| `SMP-24` | **sensibilidade provada nos dois sentidos, por injeção em scratch**: (a) uma rota `/imprensa` acrescentada ao `App.tsx` faz reprovar com *"rota nova sem classificação"*; (b) uma entrada fantasma em `SITEMAP_STATIC_PATHS` faz reprovar por órfã. Os dois arquivos foram restaurados e conferidos |
| `SMP-25` | âncora dupla: `App.tsx` com conteúdo **e** 19 rotas contadas. A âncora **pegou um defeito real do próprio teste** — a leitura crua devolvia 20 por o comentário do arquivo citar `path="*"` |
| `SMP-26` | `vercelRedirects.test.ts`: rewrite presente, antes do catch-all, mesmo host das irmãs; catch-all último; âncoras de 4 rewrites e 4 headers |

### P2 — entrega provada

| AC | Evidência |
| --- | --- |
| `SMP-27`..`SMP-31` | **cada passo do script foi executado à mão** contra alvos reais: o passo 1 **reprovou corretamente** o `text/plain` do gateway; parse, contagem (719), `robots.txt` (1 linha, host extraído) e amostra (`200`) passaram |

---

## 3. O que esta validação mediu e **surpreendeu**

1. **`application/xml` NÃO atravessa o gateway `*.supabase.co`.** A function responde
   `application/xml; charset=utf-8` e chega **`text/plain`**, com `nosniff`, `Cache-Control` intacto.
   Assinatura idêntica à do `BUG-20260829` — a reescrita **não é específica de `text/html`**, que
   era a pergunta aberta da `AD-021`. O header do `vercel.json` deixou de ser rede extra e é carga.
2. **O Deno resolve o grafo de TIPOS.** `import type { MenuPromo } from '@estrelinha/supabase/types'`
   em `core/menu/menu.ts` derrubava o worker com `Failed resolving types` antes da primeira linha.
   Resolvido invertendo a posse do tipo (declarado em `core/menu`, reexportado pelo pacote de tipos)
   — **não** duplicando, que era a saída que o design tinha pré-autorizado.
3. **O guarda de `core` pegou o próprio autor.** `menu.test.ts` proíbe o caminho legado de categoria
   em qualquer arquivo de `core`, **inclusive em comentário**, e reprovou um comentário do
   `urls.test.ts`. O comentário foi reescrito; o guarda não foi tocado.

---

## 4. Pendências — o que esta validação **não** prova

1. **A entrega em produção.** O `rewrite` do `vercel.json` só vale depois do push. Até lá,
   `/sitemap.xml` na loja continua devolvendo o shell da SPA. **A prova que falta é**:
   ```bash
   curl -sD - -o /tmp/s.xml https://<origem>/sitemap.xml | grep -i content-type   # tem de conter xml
   grep -c '<loc>' /tmp/s.xml                                                     # 719
   curl -s https://<origem>/robots.txt | grep -ci '^Sitemap:'                     # 1
   ```
   A function **já está implantada** (deploy aditivo, feito para a medição do item 3.1); o que falta
   é a borda.
2. **A rotina diária nunca rodou no GitHub.** Cada passo foi executado à mão, contra alvos reais,
   mas o workflow como unidade não. Primeira execução: `workflow_dispatch` depois do push.
3. **Verificador independente.** Ver a ressalva no topo.
4. **O `<lastmod>` de hoje é quase todo a data do import** (2026-08-16) — honesto, e passa a ter
   significado conforme a Adri edita. Não é defeito; é o estado do dado.
