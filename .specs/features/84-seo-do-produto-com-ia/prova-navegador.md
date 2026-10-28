# 84 — Prova em navegador (T13)

> Executada em 2026-10-27, **só no ambiente local**. Sem `ANTHROPIC_API_KEY`: o 503 é **real** (a
> function servida localmente); 200, 429, 502 e 422 são **interceptados** no Playwright. O probe contra
> a Claude API real continua **pendente** (ver o fim).

## Ambiente

| Item | Valor |
| --- | --- |
| Commit-base | `96757cc7` (branch `feature/84-seo-do-produto-com-ia`, árvore com a 84 sem commit) |
| Painel | `vite` do `apps/backoffice` em **:8083** (já estava de pé quando a prova começou, cwd `apps/backoffice`; **não** foi encerrado por esta prova) |
| `apps/backoffice/.env` | `VITE_SUPABASE_URL="http://127.0.0.1:54441"` (conferido) |
| Supabase local | já de pé (Docker, faixa 54440–54449); nenhum `start/stop` |
| Function | `supabase functions serve seo-suggest --env-file <scratchpad>/seo.env` (arquivo **sem** a chave), em background; log: `{"fn":"seo-suggest","userId":"a95dfd7f-…","result":"not_configured","ms":0}` |
| Bloqueios no navegador | `context.route(/supabase\.co/)` ⇒ `abort`; `**/g/collect*` ⇒ `abort` |
| Interceptação | `page.route('**/functions/v1/seo-suggest')`, registrando cada corpo enviado; estado do dublê em `page.__mode` |
| Login | `admin@umaestrelinha.dev` (`supabase/seed.sql`) |
| Bundle servido conferido | `GET /src/features/seo-suggestion/model/copy.ts` devolve o arquivo da 84; `GET /src/features/product-form/model/checklist.ts` contém "SEO automático (nome e descrição)" |
| Produto existente | `878b6a21-bd7c-437a-80a0-7fc919926ae8` — "Joia Afetiva Gato encapsulado com Cinzas de Cremação" (sem SEO, `requires_material = true`). **Nunca salvo** na prova: `seo_title`/`seo_description` seguem `NULL` e `updated_at` = 2026-10-22 |
| Produto de teste | `65048537-aa2f-4f68-8fae-6f93211ff10f` — "TESTE-84-Pingente sem SEO", criado em `/admin/produtos/novo`; **apagado** no fim (linha em `products` e o objeto `product-images/products/3833d086-….webp` do Storage local) |
| Rota do formulário | `/admin/produtos/:id/editar` (`/admin/produtos/:id` é 404 — a rota tem `/editar`) |

Capturas: `/private/tmp/claude-503/-Users-rafael-santos-Projetos-uma-estrelinha-store/cc66d325-20ac-4107-8ea3-42611f7041ad/scratchpad/prova/`
(prefixos `390-`, `1440-`, `390-200pct-`).

## Resultados

| # | Item | Viewport | Medida | Resultado |
| --- | --- | --- | --- | --- |
| 1 | Aba SEO vazia, produto existente | 390 | prévia `Joia Afetiva Gato … \| Uma Estrelinha` + selo "automático"; descrição derivada (`descriptionFromHtml`) + "automático"; placeholders = nome e descrição derivada; contador `0/60 · 69 com a marca`; `maxLength` 60/160 | ✅ |
| 2 | Editar o nome sem salvar (`SIA-05`) | 390 | nome → "Pingente Gato com Cinzas": prévia `Pingente Gato com Cinzas \| Uma Estrelinha`, placeholder igual, contador `0/60 · 41 com a marca` | ✅ |
| 3 | Produto novo, nome vazio (`SIA-07`, `SIA-11`) | 390 · 1440 | prévia `Uma Estrelinha` + descrição da loja, os dois "automático"; botão desabilitado com "Preencha o nome do produto primeiro."; `scrollWidth` 390 / 1440 | ✅ ✅ |
| 4 | Checklist com SEO vazio (`SIA-03`) | 390 | "SEO automático (nome e descrição)" sem "Ir →"; com só o título: "SEO parcial — o resto vem do nome e da descrição"; com os dois: "SEO curado" | ✅ |
| 5 | **Salvar e publicar sem SEO** (`SIA-01`) | 390 | sem toast de erro, aba segue em "Geral", URL vai a `/editar`; banco local: `is_active = t`, `seo_title IS NULL`, `seo_description IS NULL` | ✅ |
| 6 | Salvar rascunho sem SEO (`SIA-02`) | 1440 | banco: `is_active = f`, os dois `NULL` | ✅ |
| 7 | Só o título preenchido (`SIA-04`) | 1440 | banco: `seo_title` = o texto, `seo_description IS NULL` | ✅ |
| 8 | **503 real** `not_configured` (`SIA-20`) | 390 | resposta 503 `{"reason":"not_configured"}`; botão passa a desabilitado; frase "Sugestão por IA não está configurada."; continua desabilitado depois de trocar de aba; campos intocados | ✅ |
| 9 | 200 interceptado (`SIA-10`, `SIA-16`) | 390 · 1440 | os dois campos recebem a sugestão; prévia `Pingente de Cinzas de Cremação do Gato \| Uma Estrelinha`; contador `38/60 · 55 com a marca`; banco **não** muda até salvar | ✅ ✅ |
| 10 | Desfazer (`SIA-12`) | 390 · 1440 | devolve exatamente "Título antigo da Adri" / "Descrição antiga escrita à mão." e some; some ao digitar um caractere; some depois de *Salvar rascunho* (1440) | ✅ ✅ |
| 11 | 429 `limited` (`SIA-18`) | 390 · 1440 | "Muitas sugestões seguidas. Tente de novo em alguns minutos."; campos intocados; *Salvar rascunho* e *Salvar e publicar* habilitados | ✅ ✅ |
| 12 | 502 `upstream` (`SIA-22`) | 390 · 1440 | "A sugestão não veio desta vez. Os campos continuam editáveis."; idem | ✅ ✅ |
| 13 | 422 `off_rules` / `refusal` / `truncated` (`SIA-23`) | 390 · 1440 | as três frases de `copy.ts`; campos intocados; salvar liberado | ✅ ✅ |
| 14 | Em voo (`SIA-24`) | 390 · 1440 | "Sugerindo…", botão desabilitado | ✅ ✅ |
| 15 | Editar durante o voo (`SIA-25`) | 390 · 1440 | resposta 200 atrasada 2,5 s descartada; frase "Você editou o SEO enquanto a sugestão chegava; mantive o seu texto."; o texto digitado fica | ✅ ✅ |
| 16 | Trocar de aba durante o voo (`SIA-24`) | 390 · 1440 | resposta descartada, campos intocados, sem frase, botão volta a "Sugerir com IA" | ✅ ✅ |
| 17 | Corpo enviado (`SIA-10`) | 390 · 1440 | 9 + 9 chamadas, todas com exatamente `productId, name, description, categoryIds, relatedIds, requiresMaterial` (`relatedIds: []`, `requiresMaterial: true`, 5 categorias, `description` em HTML) | ✅ ✅ |
| 18 | Alvos de toque | 390 · 1440 | "Sugerir com IA" 153,8 × **44**; "Desfazer" 113,4 × **44** | ✅ ✅ |
| 19 | Foco visível | 390 · 1440 | por Tab: `box-shadow` de anel 2+2 px (`rgb(100,54,236)`) | ✅ ✅ |
| 20 | Rolagem horizontal do body | 390 · 1440 | `scrollWidth == innerWidth` em todos os estados acima (390 / 1440) | ✅ ✅ |
| 21 | Bloco do SEO com fonte a 200 % | 390 | ver defeitos D1 e D2; `scrollWidth` 616 (causa: `SlugField`, anterior à 84 — a aba Geral dá 581 na mesma fonte) | ❌ |

## Defeitos achados

**D1 — Com a fonte a 200 % em 390, a prévia do Google fica ilegível ao lado do selo "automático".**
Passos: produto existente sem SEO, `html { font-size: 200% }`, aba SEO, rolar até "Preview no Google".
Esperado: título e descrição da prévia legíveis (embrulhando), selo ao lado ou abaixo.
Obtido: o título vira **"J…"** e a descrição **"Joi A…"** — a linha trunca e o selo (78 × 23 px)
toma a largura. O selo tem fonte fixa de 10 px (não cresce com a raiz). Captura
`390-200pct-previa-automatica.png`. Na fonte normal a prévia trunca em uma linha, mas legível.

**D2 — Com a fonte a 200 % em 390, o botão "Sugerir com IA" estoura o cartão.**
Passos: os mesmos, olhar o bloco da sugestão.
Esperado: o botão cabe no cartão (rótulo embrulha ou o botão ocupa a linha).
Obtido: o contêiner do bloco mede 196 px (x 84 → 280) e o botão **306 px** (x 84 → 389,6): passa
~110 px do contêiner e ~60 px da borda do cartão (x 329). Não chega a criar rolagem do body (para em
389,6), mas sai do cartão. O "Desfazer" (227 px) também passa do contêiner. Captura
`390-200pct-sugerido.png`.

### Observações (não são da 84 ou não são defeito)

- **O1 (anterior à 84)**: a 200 % em 390 o body rola na horizontal — 616 px na aba SEO, por
  `SlugField` (o prefixo `umaestrelinha.com.br/produtos/` não encolhe), e 581 px na aba Geral.
- **O2 (anterior à 84)**: produto novo com preço 0 e checklist "6 de 6": *Salvar e publicar* fica
  desabilitado com o `title` "Resolva os itens do checklist para publicar", mas nenhum item do
  checklist está pendente — quem trava é `hasBlockingErrors(issues)` (preço). Com preço preenchido
  liberou. O SEO vazio **não** foi o motivo.
- **O3**: o progresso "N de 6" conta o item de SEO (sempre `ok`), então um produto vazio abre em
  "3 de 6". Coerente com `pendingCount` (o item não pende), mas o denominador inclui o informativo.
- **O4**: com o SEO vazio, o contador diz `0/60 · 69 com a marca` — o título servido derivado do nome
  passa de 60. É o que a loja serve (`brandedTitle`), não defeito do contador; mostra que nomes longos
  geram título cortado no Google.
- **O5**: a descrição derivada junta parágrafos sem pontuação ("…para sempre Uma joia…"), vinda de
  `descriptionFromHtml`, que a 84 não mudou.

## Pendente

- **Probe contra a Claude API real** (5 produtos, régua de A7, p95 ≤ 15 s, `usage` no log): sem
  `ANTHROPIC_API_KEY`. Comando pronto: pôr a chave de dev num arquivo do scratchpad junto das envs de
  `seo.env`, `supabase functions serve seo-suggest --env-file <arquivo>`, e chamar com o JWT do admin
  local para 5 ids do catálogo local, lendo `result`, `attempts`, `usage` e `ms` no log.
- Android real e leitor de tela não foram exercitados.

## Limpeza

Produto de teste apagado do banco local e o objeto do Storage local removido; o produto
`878b6a21-…` não foi salvo; `functions serve` encerrado; navegador fechado; arquivos temporários
(script e PNG) removidos de `.playwright-mcp/`. O dev server em :8083 já estava rodando antes e foi
deixado de pé.
