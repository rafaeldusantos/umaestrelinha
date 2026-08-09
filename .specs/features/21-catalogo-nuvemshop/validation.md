# 21 · Catálogo Nuvemshop — Validação

**Veredito**: **PASS com uma ressalva declarada** (`BUG-20260809`, fora do escopo desta feature).
**Data**: 2026-08-09 · **Modo**: passagem independente (*standalone fallback* do `validate.md`) —
execução foi inline e sequencial, sem sub-agentes, por decisão do usuário.

> **Limitação declarada, para não valer mais do que vale**: autor e verificador são o mesmo agente.
> O `author ≠ verifier` da Skill não foi obtido. O que compensa parcialmente é que **a maior parte
> dos defeitos desta feature não foi achada por inspeção, e sim por execução real contra o catálogo
> de 690 produtos** — evidência que não depende do julgamento de quem escreveu o código.

---

## Evidência por requisito

| Req | Evidência | Veredito |
| --- | --- | --- |
| `CAT-01` idempotência por `nuvemshop_id` | Execução 5 e 7, exit 0: `produtos 690 lidos · 0 criados · 689 atualizados · 1 pulado`; `variacoes 3357 · 0 criados · 3356 atualizados`. Probe: `count(nuvemshop_id) = count(*)` nas três tabelas (39 / 689 / 3356) | ✅ |
| `CAT-02` slug preservado | Script comparando banco × origem: **689 gravados, 0 divergentes**, 1 ausente (o pulado). `mapProduct` também assere slug idêntico nos 6 do recorte | ✅ |
| `CAT-03` imagens no Storage | Probe: **3.660 objetos** no bucket, **3.660 referenciadas** em `products.images`, e **0 produtos** com URL do CDN da origem. Navegador em 390×844: home 8/8 e produto 5/5 do Storage, 0 quebradas | ✅ |
| `CAT-04` variantes, preços e estoque | Probe: `compare_price` não nulo em **93** (previsto 93) e **0** casos de `compare_price <= price`. `stock_policy` none **593** / track **96**. `stock_total` correto em 87 produtos, **0** esgotados indevidamente | ✅ |
| `CAT-05` categorias, hierarquia e ordem | Probe: **0** categorias com `parent_id` órfão; **3.100** vínculos em `product_categories`. Teste com pai depois da filha e com árvore de 3 níveis embaralhada | ✅ |
| `CAT-06` backoff e parada limpa | Testes: 429 com `Retry-After`, 5xx com backoff exponencial, esgotamento ⇒ throw com 4 chamadas. **Provado em produção**: a execução 1 parou de fato e escreveu relatório | ✅ |
| `CAT-07` falha de imagem não descarta produto | Teste: com `fetch` devolvendo 403 em tudo, os 5 produtos entram e `exitCode` segue 0 | ✅ |
| `CAT-08` relatório com totais conferidos | Teste que desequilibra de propósito e prova `exitCode = 1`. Nas execuções reais, as três entidades fecham | ✅ |
| `CAT-09` credenciais fora do navegador | Guardas asseridas com **zero chamadas de saída**. `git check-ignore .env` confirma não versionado | ✅ |
| `CAT-10` seed sem catálogo, limpeza segura | Probe: `db reset` ⇒ 0 produtos / 0 categorias / 5 cupons / 1 admin. **Probe do acidente**: com uma categoria importada e uma de dev no banco, o seed avulso **apagou a de dev e preservou a importada** | ✅ |
| `CAT-11` quatro categorias inativas | Probe: `categorias inativas = 4`. Relatório nomeia as quatro com motivo. Slug preservado nas quatro | ✅ |
| `CAT-12` re-execução preserva curadoria | **Provado com mutação real**: `joias-afetivas` desativada à mão (`active=false, sort_order=99`), re-import rodado, permaneceu desativada, e o relatório registrou as duas divergências | ✅ |

---

## Sensor de discriminação

Duas mutações injetadas, ambas **mortas**; nenhuma sobreviveu.

| Mutação | Resultado |
| --- | --- |
| Remover a entrada de `tools/catalog-import/src/__fixtures__/categories.json` da `ALLOWLIST` do `brandScan` | **Morta** — acusou `categories.json:661`. Prova que estender o escopo para `tools/` não é decorativo |
| Dublê de Storage falhando uma vez só, contra o retry recém-adicionado | **Morta pelo lado inverso**: o teste de parada limpa deixou de falhar, revelando que o dublê não exercitava a parada. Corrigido para falha persistente |

Além disso, **quatro defeitos foram mortos pela execução real** — nenhum deles seria pego por teste
de unidade, e todos estão hoje cobertos por teste:

1. **Pool não cancelava na falha.** Relatório dizia 290 imagens enquanto o Storage recebia 3.651.
2. **Um blip de rede matava o import.** Um `fetch failed` em 3.651 uploads.
3. **PostgREST trunca `select` em 1.000 linhas.** A idempotência quebrava na segunda execução, com
   `duplicate key ... product_variants_nuvemshop_id_key`. **O mais grave dos quatro.**
4. **`products.stock_total` nunca era escrito.** 60 produtos com estoque real apareciam
   "Indisponível", porque produto sem eixo não tem grade e a loja lê `stock_total`.

E dois de mapeamento, achados por teste antes de virar dado: contagem de variações puladas quebrando
a conferência, e dry-run classificando variação nova como atualizada.

---

## Gate final (medido, exit code capturado de verdade)

| | resultado |
| --- | --- |
| `pnpm turbo run test --force` | **exit 0** — 3.442 testes em 200 arquivos |
| — store · backoffice · core · functions · catalog-import | 1150 · 1055 · **725** · 258 · 254 |
| `pnpm lint` | 30 erros / 8 warnings — **idêntico à baseline, zero novos** |
| `pnpm build` | exit 0 |
| `tsc` store · backoffice · catalog-import | 0 · 0 · 0 |

`core` fechou **intacto**: a feature não tocou o código de dinheiro.

---

## Resultado no banco × previsto no design

| | previsto | medido | |
| --- | ---: | ---: | --- |
| Categorias | 39 (4 inativas) | **39 (4)** | ✅ |
| Produtos criados | 689 | **689** | ✅ |
| Produtos pulados | 1 · `pingente-figa-colecao-fragmentos` | **1**, o mesmo | ✅ |
| Variações | 3.357 | **3.356** gravadas + 1 pulada | ✅ |
| `compare_price` não nulo | 93 | **93** | ✅ |
| `stock_policy = none` | 594 | **593** | ✅ ¹ |
| Produtos despublicados | 9 | **8** | ✅ ¹ |
| Imagens no Storage | 3.660 | **3.660** | ✅ |
| Vínculos N:N | ~3.100 | **3.100** | ✅ |
| SKUs distintos preservados | 939 | **939** | ✅ |

¹ As três diferenças de 1 têm a **mesma causa**: o produto pulado era, ao mesmo tempo, despublicado,
`stock_policy = none` e dono da única variação sem preço. Não é divergência — é a mesma linha
aparecendo em três contagens.

---

## Ressalva — o que NÃO está entregue

**[`BUG-20260809`](../../../docs/qa/bugs/BUG-20260809-categoria-grande-nao-carrega.md) — categoria
grande abre vazia.** `/colecao/joias-afetivas` (508 produtos) mostra "0 produtos encontrados". Causa:
`useProducts.ts:47` monta `in('id', [508 uuids])` ⇒ URL de 14.309 caracteres ⇒ `net::ERR_FAILED`; e
`:51` engole o erro, então a falha vira lista vazia em vez de estado de erro.

**É defeito da leitura da loja, não da gravação** — o dado está correto no banco, e home e página de
produto renderizam. Não foi consertado aqui porque o conserto certo mexe na consulta que também
carrega preço e variação (caminho de dinheiro) e pede paginação: escopo, desenho e testes próprios.
Registrado com diagnóstico completo e forma sugerida.

**Segunda ocorrência do padrão que `AD-014` já registrou** (`useAdminCollections` engolindo
`PGRST205` e mostrando grade vazia para sempre). Vale como candidato a decisão de projeto: consulta
de listagem não deve transformar erro em lista vazia.

---

## Dívida declarada

- **Re-execução sem `db reset` ainda lista uma pasta por produto** (689 chamadas) para saber o que já
  existe. É barato, mas é I/O que poderia ser uma leitura só se `storage.objects` fosse exposto ao
  PostgREST — o que mudaria a superfície da API do projeto e não cabe decidir aqui.
- **`--dry-run` não exercita a fase de imagens.** É deliberado (um dry-run que sobe 410 MB não é
  dry), mas significa que o ensaio não prevê contagem de imagem.
