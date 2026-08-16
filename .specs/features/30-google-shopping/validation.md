# Google Shopping — Validação

**Spec**: `.specs/features/30-google-shopping/spec.md`
**Veredito**: **PASS**, com **duas ressalvas declaradas** (nenhuma delas de código)
**Data**: 2026-08-16
**Escopo medido**: árvore de trabalho da feature `30`, a partir de `fa6758b` (fecho da `28`+`29`)

---

## ⚠️ Como esta validação foi feita, e o que isso limita

O contrato da Skill pede um **Verifier em sub-agente fresco** (autor ≠ verificador). **Esta sessão não
autoriza sub-agentes**, então foi aplicado o *standalone fallback* previsto: o passe de validação
rodou aqui mesmo, com o **sensor de discriminação** e a checagem ancorada na spec.

**A limitação é real e não deve ser minimizada**: quem escreveu o código escreveu a verificação, e um
autor tende a repetir o mesmo modelo mental que produziu a lacuna. O sensor de discriminação existe
justamente para não depender de opinião — ele é determinístico, e é o que dá peso a este relatório.
Um Verifier independente continua sendo desejável antes de considerar a feature encerrada.

---

## Sensor de discriminação

Treze defeitos de comportamento injetados em estado descartável (cópia do arquivo, mutação, execução,
restauração). Cada um é uma **regressão plausível**, não ruído sintático.

| # | Defeito injetado | O que quebraria em produção | Resultado |
| --- | --- | --- | --- |
| M1 | `publicVariantId` devolve sempre o UUID | 3.233 ofertas viram catálogo novo no cutover | **morto** (3 falhas) |
| M2 | precedência de `feedExclusion` invertida | painel manda consertar a coisa errada | **morto** (6) |
| M3 | `compare_price` deixa de virar "de/por" | promoção some do Shopping | **morto** (1) |
| M4 | JSON-LD anuncia o "de" e o feed cobra o "por" | **reprovação em massa por preço incompatível** | **morto** (2) |
| M5 | `?variant=` por UUID deixa de casar | metade dos links cai na seleção padrão, sem erro | **morto** (2) |
| M6 | leitura truncada deixa de ser detectada | feed com 1.000 de 3.233 ⇒ Google remove 2.233 | **morto** (3) |
| M7 | JSON-LD deixa de ser injetado no `<head>` | landing page volta a não provar preço | **morto** (13) |
| M8 | interruptor deixa de valer | feed responde antes do cutover, disputando ids | **morto** (4) |
| M9 | painel reimplementa a regra do feed | tela promete número que a function não produz | **morto** (3) |
| M10 | `?variant=` passa a aceitar variação inativa | página abre num preço não vendável | **morto** (1) |
| M11 | a página volta a ignorar o `?variant=` | cliente clica em 24,90 e vê 19,90 | **morto** (2) |
| M12 | campo vazio passa a emitir tag vazia | `<g:brand></g:brand>` reprova a oferta | **morto** (1) |
| M13 | importador sobrescreve marca curada | sincronização apaga curadoria a cada execução | **morto** (2) |

**13 de 13 mortos. Zero sobreviventes.**

Duas mutações (`M6`, `M7`) *pareceram* sobreviver na primeira passada. Não sobreviveram: o filtro de
teste que usei (`googleFeed`, `productPage`) não casava com o nome real dos arquivos
(`handlers.test.ts` nos dois casos), e o vitest rodou **zero** arquivo. Refeitas com o filtro por
caminho, morreram com 3 e 13 falhas. **Registro isto porque é a falha clássica deste tipo de
verificação** — a mesma que a âncora de contagem dos guardas existe para impedir, aparecendo agora na
própria ferramenta de verificar.

---

## Cobertura por requisito (evidência ou zero)

| Req | Evidência (`arquivo:asserção`) | Resultado esperado pela spec | Coberto |
| --- | --- | --- | --- |
| GSH-01 | `identity.test.ts` — `expect(publicVariantId({…1259936246})).toBe('1259936246')` | decimal, sem prefixo | ✅ |
| GSH-02 | `identity.test.ts` — `expect(publicProductId({…281745761})).toBe('281745761')` | `item_group_id` = produto | ✅ |
| GSH-03 | `offer.test.ts` — link completo com `?variant=`; `expect(link).toContain(productPath(slug))` | canônica + variação, sem barra, sem `pf=mc` | ✅ |
| GSH-04 | `eligibility.test.ts` — 3 motivos + 4 casos de precedência | ativa, produto ativo, com preço | ✅ |
| GSH-05 | `google-feed/handlers.test.ts` — `expect(res.status).toBe(503)` × 6 caminhos; nenhum devolve `<rss` | 5xx sem corpo de feed | ✅ |
| GSH-06 | `pricing.test.ts` — `base_price` e `price_override` divergentes ignorados | preço da linha | ✅ |
| GSH-07 | `pricing.test.ts` — os 4 ramos de `stock_policy` | mapa documentado | ✅ |
| GSH-08 | `offer.test.ts` — recuo de imagem, `stripFaqBlock`, recuo para o nome | imagem da variação → do produto | ✅ |
| GSH-09 | `xml.test.ts` — parseado por `DOMParser`, namespace asserido, `gtin` ausente | RSS 2.0 bem-formado | ✅ |
| GSH-10 | `ProductPageVariant.test.tsx` — `expect(preco()).toBe('preco:24.90')` | abre na variação anunciada | ✅ |
| GSH-11 | `ProductPageVariant.test.tsx` — desconhecido/malformado/vazio/inativo | seleção padrão, sem erro | ✅ |
| GSH-12 | `product-page/handlers.test.ts` — bloco antes de `</head>`, shell intacto | JSON-LD na resposta HTTP | ✅ |
| GSH-13 | `shoppingParity.test.ts` — 5 casos × preço e disponibilidade, com sensor embutido | mesmo número nas duas pontas | ✅ |
| GSH-14 | `ProductPageVariant.test.tsx` — `expect(new URL(href).search).toBe('')` | canônica sem query | ✅ |
| GSH-15 | `AdminGoogleShoppingPage.test.tsx` + `handlers.test.ts` (404) | desligado por default, 404 | ✅ |
| GSH-16 | `AdminGoogleShoppingPage.test.tsx` — `getByText(/tira seus produtos do Google/i)` | confirmação com o efeito escrito | ✅ |
| GSH-17 | `AdminGoogleShoppingPage.test.tsx` — `it.each` sobre `CUTOVER_STEPS` + ordem | cinco passos, na ordem | ✅ |
| GSH-18 | `useFeedInventory.ts` grava por `useUpdateSettings` → policy `has_role` existente | escrita só admin | ⚠️ **ver ressalva 1** |
| GSH-19 | `GoogleShoppingCard.test.tsx` — `it.each` dos 5 campos | campos na aba SEO | ✅ |
| GSH-20 | `GoogleShoppingCard.test.tsx` + `googleShoppingSchema.test.ts` (SQL ↔ TS) | vocabulário fechado, vazio omite | ✅ |
| GSH-21 | `catalog-import/write/products.test.ts` — 6 casos de semente/curadoria | só onde é nulo | ✅ |
| GSH-22 | `useFeedInventory.test.ts` + `AdminGoogleShoppingPage.test.tsx` | contagem por motivo, acionável | ✅ |
| GSH-23 | `offer.test.ts` (precedência + desempate) + `google-feed/handlers.test.ts` | produto > categoria > loja | ✅ |

**22 de 23 com evidência direta. 1 com ressalva.**

---

## Ressalvas

### 1. `GSH-18` não tem teste próprio, e a razão é honesta

A escrita do interruptor passa por `useUpdateSettings`, que faz `upsert` em `store_settings` — tabela
cuja policy de escrita **já é** `has_role(admin)` desde `20260417015945`. Não há caminho novo a
fechar, e um teste aqui estaria dublando o client do Supabase, provando o mock e não a policy.

**O que provaria de verdade**: probe HTTP com uma sessão de cliente não-admin tentando gravar a chave
`google_shopping` e recebendo recusa. Não foi executado. A afirmação é por **herança de policy
existente**, não por medição — e está registrada assim de propósito.

### 2. A prova em viewport móvel da `T17` não foi executada

O `tasks.md` pedia medir `scrollWidth === clientWidth` em 390×844 na página com `?variant=`. **Não
rodei.** O que a T17 acrescenta ao DOM é **nada** — o parâmetro só semeia estado, e nenhum nó novo é
renderizado —, mas isso é raciocínio, não medida, e o `CLAUDE.md` é explícito sobre jsdom devolver 0
para toda medida de layout. Fica como pendência de QA, não de código.

---

## Lacunas de precisão da spec, achadas e resolvidas

| Onde | O que faltava | Como foi resolvido |
| --- | --- | --- |
| `GSH-04` | precedência entre motivos de exclusão simultâneos | `produto_inativo` > `variacao_inativa` > `sem_preco`, pelo critério "o que a dona faria a seguir". Registrado na tabela de assunções da spec |
| `GSH-12` | qual variação o JSON-LD declara **sem** `?variant=` | `representativeVariant`, espelhando `initialSelection`. Divergência de borda documentada no código |
| `GSH-23` | qual categoria vence quando o produto está em várias | menor `sort_order`, desempate por nome — a mesma régua de `bySortOrder` e `displayCategory` |

---

## Defeitos encontrados **durante** a execução, e corrigidos

1. **`core/faq` e `core/routes` não eram importáveis por Deno** — imports relativos sem extensão
   `.ts`. Achado ao subir a edge function de verdade; passa em build, `tsc` e teste de componente.
   Corrigidos os 8 imports, e `purity.test.ts` passou a guardar a classe.
2. **`?variant=<uuid>` não resolvia** quando a linha tinha `nuvemshop_id`, contra a `AC 2` da
   `GSH-10`.
3. **Teste passando por acidente**: o caso "casa por UUID" do `product-page` usava o UUID da primeira
   variação, cujo **recuo** dá o mesmo preço do acerto. Trocado para a segunda linha, onde os dois
   caminhos divergem.
4. **`normalizeVariants` descartava `nuvemshop_id`** — a loja nunca recebia a identidade pública.
5. **Vazamento de estado entre casos** no teste da tela: o `beforeEach` espalhava o objeto anterior em
   vez de repô-lo, e um caso passou a depender da ordem de execução do arquivo.
6. **Guarda de pureza com falso positivo**: casava `includes('payment/')` contra o **texto** do
   arquivo, acertando comentários. Reescrito para inspecionar especificadores de import.

---

## Asserções reescritas porque a spec mudou o comportamento

Nenhuma foi afrouxada; **todas ganharam vizinhas**.

| Arquivo | Antes | Agora |
| --- | --- | --- |
| `vercelRedirects.test.ts` | `toEqual([catch-all])` | `toContainEqual` + **5 novas**, entre elas a ordem por índice |
| `navItems.test.ts` | grupo `Loja` com 2 itens | 3 itens + 2 casos novos (posição e rota) |
| `CategoryInspector.test.tsx` | payload exato de 6 campos | 7 campos, **igualdade exata mantida**, + 2 casos |
| `core/product/index.test.ts` | `normalizeVariants` com 12 campos | 13 campos, igualdade exata mantida, + 3 casos |
| `googleShoppingSchema.test.ts` | 6 colunas | 6 + 1, discriminando a tabela |

---

## Gate final

| Medida | Baseline (T0) | Agora | Δ |
| --- | --- | --- | --- |
| store | 1793 / 127 | **1858 / 129** | +65 / +2 |
| backoffice | 1496 / 94 | **1556 / 97** | +60 / +3 |
| core | 1218 / 44 | **1359 / 52** | +141 / +8 |
| functions | 279 / 4 | **337 / 6** | +58 / +2 |
| catalog-import | 324 / 16 | **335 / 16** | +11 / 0 |
| **total** | **5110 / 285** | **5445 / 300** | **+335 / +15** |

- **Lint: 30 erros / 8 warnings** — idêntico à baseline. Zero erro novo, nona feature seguida.
- **Tipos: 0** em store, backoffice e catalog-import.
- `pnpm build`: verde.
- **`git diff --name-only packages/core/src/payment/` → vazio.** O código de dinheiro fecha a feature
  `30` sem uma linha alterada, como nas features 22–25 e 27.
- **Nenhum teste removido, nenhum `skip`, nenhuma asserção afrouxada.**

---

## Prova de ponta a ponta

Não é mock: a edge function subiu contra o Supabase local, com o catálogo real.

```
GET /functions/v1/google-feed → HTTP 200 · 6.989.883 bytes
3.233 <item> · 3.233 ids únicos · 0 duplicados · 0 sem imagem · 0 sem preço · sem gtin
XML BEM-FORMADO (parser real, não includes de string)

<g:id>1259936246</g:id>
<g:item_group_id>281745761</g:item_group_id>
<link>…/produtos/pulseira-7-nos-ajustavel-protecao-kabbalah?variant=1259936246</link>
<g:price>19.90 BRL</g:price>
```

**3.233 contra as 3.237 do Merchant Center.** A diferença de 4 é o que resta reconciliar item a item,
e só se fecha com acesso ao export da conta — está declarada como Success Criteria em aberto, não
como concluída.

Probes HTTP contra o banco (`AD-012`): as seis colunas de `products` e a de `categories` gravam por
`PATCH` com `return=representation`, e `gender: 'masculino'` é recusado com `23514` pelo check
nomeado.
