# Detalhe do Produto — Validação

**Spec**: `spec.md` · **Design**: `design.md` · **Tasks**: `tasks.md`
**Veredito**: ✅ **PASS**
**Data**: 2026-08-15
**Superfície**: as 21 entradas de `git status` do fecho (10 modificados, 11 novos), em `apps/store`,
`packages/core` e `.specs/features/27-detalhe-do-produto`.

> **Nota de método, declarada.** A Skill pede um Verifier em sub-agente (autor ≠ verificador). A
> sessão proíbe despachar agentes sem pedido do usuário, então foi usado o *standalone fallback* de
> `validate.md`: mesma checagem ancorada na spec e mesmo sensor de discriminação, executados no
> mesmo contexto. **A independência de olhos frescos não foi obtida** — é a limitação real deste
> relatório, e o sensor de mutação é o que a compensa em parte, por ser medida e não julgamento.

---

## 1. Sensor de discriminação (mutação)

Seis falhas de comportamento injetadas em estado descartável, testes rodados, mutação revertida e
arquivos conferidos byte a byte contra o backup ao final.

| # | Falha injetada | Onde | Resultado |
| --- | --- | --- | --- |
| M1 | `pixPrice` volta a arredondar o preço final (`round2(a × (1 − p/100))`) | `core/payment/pix.ts` | ✅ morto — 7 falhas |
| M2 | `axisPhotos` deixa de exigir fotos distintas | `variantSelection.ts` | ✅ morto — 4 falhas |
| M3 | `sanitizeHtml` para de pôr `rel="noopener noreferrer"` | `sanitizeHtml.ts` | ✅ morto — 2 falhas |
| M4 | `sanitizeHtml` para de rebaixar `h1`/`h2`/`h3` | `sanitizeHtml.ts` | ✅ morto — 4 falhas |
| M5 | Acordeão volta a ignorar a descrição na decisão de montar | `ProductDetailsAccordion.tsx` | ✅ morto — 6 falhas |
| M6 | `VariantPicker` nunca ramifica para foto | `VariantPicker.tsx` | ✅ morto — 6 falhas |

**6 de 6 mortos. Nenhum sobrevivente.**

---

## 2. Cobertura por AC (evidência ou zero)

| AC | Evidência (`file:line` + asserção) | Desfecho da spec | Coberto |
| --- | --- | --- | --- |
| PDP-01 | `ProductDescriptionPlacement.test.tsx:69` — `expect(screen.queryByText(FRASE)).toBeNull()`; `:110` — `expect(screen.getAllByText(FRASE)).toHaveLength(1)` | ausente na coluna, uma só ocorrência na página | ✅ |
| PDP-02 | `ProductDetailsAccordion.test.tsx:43` — `expect(screen.getByText('Guarda leite materno.')).toBeVisible()`; `:52` — `expect(html.indexOf(...)).toBeLessThan(html.indexOf('Tamanho: 0,8 cm'))` | seção aberta, descrição **acima** dos bullets | ✅ |
| PDP-03 | `sanitizeHtml.test.ts:150` — `expect(sanitizeHtml('<p>Cora&ccedil;&otilde;es</p>')).toBe('<p>Corações</p>')` | entidade vira caractere | ✅ |
| PDP-04 | `sanitizeHtml.test.ts:38` — `expect(sanitizeHtml('<div>Guardamos o leite materno.</div>')).toBe('Guardamos o leite materno.')` | desembrulha preservando o texto | ✅ |
| PDP-05 | `sanitizeHtml.test.ts:57` — `expect(sanitizeHtml('<p>Anel</p><script>alert(1)</script>')).toBe('<p>Anel</p>')` | some com o conteúdo | ✅ |
| PDP-06 | `sanitizeHtml.test.ts:88` — `expect(sanitizeHtml('<p class="x" id="y" data-z="1">Anel</p>')).toBe('<p>Anel</p>')` | atributo zero | ✅ |
| PDP-07 | `sanitizeHtml.test.ts:126` — `expect(sanitizeHtml('<a href="javascript:alert(1)">clique</a>')).toBe('<a>clique</a>')`; `:131` — variante com tabulação | `href` removido, texto mantido | ✅ |
| PDP-08 | `sanitizeHtml.test.ts:112` — `.toBe('<a href="https://umaestrelinha.com.br" rel="noopener noreferrer">site</a>')` | `rel` acrescentado | ✅ |
| PDP-09 | `sanitizeHtml.test.ts:145` — `expect(sanitizeHtml('<h2>Anel Afetivo</h2>')).toBe('<h4>Anel Afetivo</h4>')` | `h4` | ✅ |
| PDP-10 | `ProductDetailsAccordion.test.tsx:73` — `expect(screen.queryByRole('button', { name: 'Detalhes do Produto' })).toBeNull()`; `:88` — mesma asserção para descrição só-`<script>` | seção não montada; "Cuidados" abre | ✅ |
| PDP-11 | `ProductInfoPix.test.tsx:104` — `expect(screen.getByText('R$ 7,50')).toBeInTheDocument()`; `:120` — ordem preço → Pix → parcela por índice no texto | linha entre preço e parcelas, com ícone | ✅ |
| PDP-12 | `ProductInfoPix.test.tsx:139/147/155` — `expect(screen.queryByText('com Pix')).toBeNull()` para `pix_enabled:false`, `0` e `-5` | ausente | ✅ |
| PDP-13 | `ProductInfoPix.test.tsx:180` — `expect(screen.getByText('R$ 190,00')).toBeInTheDocument()` após `fireEvent.click` na variação | segue `purchase.price` | ✅ |
| PDP-14 | `pix.test.ts:18` — `expect(pixPrice(7.9, 5)).toBe(7.5)`; `:47-58` — limites devolvem `null` | fórmula + limites | ✅ |
| PDP-15 | `displayedEqualsCharged.test.ts` — `expect(pixPrice(unitPrice, 5)).toBe(cobrado(unitPrice, 5))` em 6 preços × 2 percentuais; `ProductCardSurface.test.tsx` — `expect(screen.getByText('R$ 7,50 com Pix'))` | igual ao total cobrado | ✅ |
| PDP-16 | `variantSelection.test.ts` — `expect(axisPhotos(p, eixoDe(p), {})).toHaveLength(2)` e `.toBeNull()` nos 6 casos de recusa | regra "≥2 e distintas" | ✅ |
| PDP-17 | `VariantPhotoAxis.test.tsx:92` — `expect(container.querySelectorAll('img')).toHaveLength(0)` + `expect(...textContent).toBe('Sim')` | pílula com o nome | ✅ |
| PDP-18 | `VariantPhotoAxis.test.tsx:117` — `expect(container.textContent).toContain('Cor:')`; `:125` — `not.toContain('Cor:')` sem escolha | `<eixo>: <valor>` | ✅ |
| PDP-19 | `VariantPhotoAxis.test.tsx:139` — `getByRole('radio', { name: 'Prata' })`; `:148` — `toHaveAttribute('aria-checked', 'true')` | `radio` + `aria-label` + `aria-checked` | ✅ |
| PDP-20 | `VariantPhotoAxis.test.tsx:186` — `expect(vaga.querySelector('img')).toBeNull()` + `expect(new Set(srcs).size).toBe(srcs.length)` | vaga vazia, nunca foto alheia | ✅ |
| PDP-21 | `VariantPhotoAxis.test.tsx:206` — `expect(vaga).toBeDisabled()` **e** `expect(vaga).toBeInTheDocument()` | desabilitada e visível | ✅ |
| PDP-22 | `VariantPhotoAxis.test.tsx:219` — `expect(onChange).toHaveBeenCalledWith({ Cor: 'Ouro' })`; `:238` — preserva os outros eixos | mesmo `onChange` | ✅ |
| PDP-23 | `VariantPhotoAxis.test.tsx:249` — `toContain('border-2 border-estrelinha-ink')`; `:262` — `toContain('h-14 w-14')`; **e medida real em navegador**: menor alvo **56px** | ≥44px, caixa estável | ✅ |
| PDP-24 | `copyInstitucional.test.tsx` — `expect(screen.getByText(/7% de desconto no PIX!/))` com setting em 7; ausência com Pix desligado e com 0 | lê a setting | ✅ |

**24 de 24 cobertos.** Nenhuma lacuna de precisão de spec.

---

## 3. Prova em navegador real (390×844 e 1024×768)

Loja rodando (`pnpm dev:store`, Vite na 8085) contra o Supabase local com o catálogo real importado.
Dois produtos escolhidos por serem os piores casos medidos: um com **7 valores de eixo** e outro com
**rótulo de 37 caracteres** e a **descrição mais longa do catálogo (3.019 chars)**.

| Medida | mobile 390 | desktop 1024 |
| --- | --- | --- |
| Linha do Pix + ícone | ✅ | ✅ |
| Seção "Detalhes do Produto" | ✅ | ✅ |
| Tag crua na tela | ✅ nenhuma | ✅ nenhuma |
| Entidade crua na tela | ✅ nenhuma | ✅ nenhuma |
| Títulos da descrição rebaixados | ✅ 8 `h4` | ✅ 8 `h4` |
| Vagas de variação com foto | ✅ 7 e 3 | ✅ 7 e 3 |
| Menor alvo de toque | ✅ **56px** | ✅ 56px |
| Scroll horizontal do `body` | ❌ **634 > 390** — ver §4 | ✅ 390 |

Capturas: `perto-info.png` (preço → "R$ 170,91 com Pix" → parcela → "Modelo: Árvore da Vida" + 7
vagas) e `perto-acordeao.png` (descrição formatada: `h4`, parágrafo, "Especificações", lista).

---

## 4. Achados fora de escopo (surgidos na validação, **não** corrigidos)

### 4.1 `ProductGallery` estoura a viewport no mobile — **pré-existente, e é sério**

Toda página de produto tem **scroll horizontal no celular**: `scrollWidth` 634 numa viewport de 390.
Numa loja com ~90% de acessos móveis, e é justamente o item que o `CLAUDE.md` lista entre "o que
quebra primeiro no mobile".

**Isolado em runtime, sem tocar em arquivo:**

| Remoção | `scrollWidth` |
| --- | ---: |
| nada (estado atual) | 634 |
| sem a descrição | 634 |
| sem as vagas de variação | 634 |
| **sem a galeria** | **390** ✅ |

`/`, `/busca` e `/politicas` medem 390 — só a página de produto estoura. `ProductGallery.tsx` **não
está no diff desta feature**. A causa está na cadeia de layout: a trilha do grid mede 358px, mas o
item da galeria mede 614 — o `minmax(0,…)` que impede o estouro só existe a partir de `md`, então no
mobile a largura mínima de conteúdo da faixa de miniaturas (`overflow-x-auto`) infla a trilha.

**Consequência para esta feature**: as 7 vagas de foto **não quebram linha hoje** porque herdam o
container inflado. Com a largura correta elas quebram como devem — medido removendo a galeria em
runtime: **2 linhas, borda direita em 328px**, dentro dos 390. O `flex-wrap` está certo; o que o
impede é o defeito de fora.

### 4.2 `storeOrigin.test.ts` (backoffice) depende do `.env` da máquina — **pré-existente**

`pnpm --filter @estrelinha/backoffice test` falha em 1 de 1388 testes:
`expect(storeOrigin(undefined)).toBeNull()` recebe `'http://localhost:8082'`.

Causa: `storeOrigin(base = STORE_URL)` usa **parâmetro default**, então `storeOrigin(undefined)` cai
em `import.meta.env.VITE_STORE_URL`. O teste só passa em máquina **sem** essa env — e configurá-la é
exatamente o que o `CLAUDE.md` manda fazer para acender a prévia da feature 25.

**Provado**: removendo `VITE_STORE_URL` do `.env`, o arquivo passa 4/4; recolocando, falha. O `.env`
foi restaurado. Nenhum arquivo do backoffice está no diff desta feature.

### 4.3 `PoliciesPage` ainda crava "R$ 150" de frete grátis

Mesma classe do `5%` que a `PDP-24` fechou: existe `free_shipping_threshold` nas settings. **Não
tocado** — está fora da spec.

---

## 5. Gates

| Régua | Resultado |
| --- | --- |
| `npx tsc --noEmit -p apps/store/tsconfig.app.json` | ✅ **0 erros** (baseline 0) |
| `pnpm lint` | ✅ **30 erros / 8 warnings** — idêntico à baseline; **zero erro novo** |
| Testes store | ✅ 1709 / 122 arquivos |
| Testes core | ✅ 1113 / 39 arquivos |
| Testes functions · catalog-import | ✅ 279 / 4 · 299 / 15 |
| Testes backoffice | ⚠️ 1387 / 1388 — a falha é a §4.2, ambiental e pré-existente |
| `git diff` do código de dinheiro | ✅ `pricing.ts`, `installments.ts` e `orders.ts` **intocados** |

**Total: 4.788 testes em 266 arquivos** (baseline 4595/259 ⇒ **+193 testes, +7 arquivos**).

Nenhuma queda: nenhum teste foi apagado, afrouxado ou pulado. Uma asserção foi **corrigida durante a
escrita** (`noscript`, em `sanitizeHtml.test.ts`): a versão inicial exigia que o texto do elemento
sumisse, o que só é verdade com script **ligado** — no jsdom o próprio parser dissolve o `<noscript>`
e promove o conteúdo. A asserção substituta é **mais** específica: nenhum elemento `noscript`
sobrevive **e** nem `<script>` nem `<img onerror>` dentro dele passam, o que vale nos dois ambientes.

> **Divergência da baseline registrada**: `catalog-import` mede **299** testes, e o `CLAUDE.md` dizia
> **276**, com o mesmo número de arquivos (15). Esta feature não toca aquele workspace. O número está
> corrigido no `CLAUDE.md` com a medição de hoje, e a origem da diferença não foi investigada.

---

## 6. Emendas à spec feitas durante o trabalho

| AC | Estava | Ficou | Por quê |
| --- | --- | --- | --- |
| PDP-14/15 | `round2(a × (1 − p/100))`; "valor idêntico ao de hoje" | `round2(a − round2(a × p/100))`; "igual ao total cobrado" | A fórmula da spec era a **do card**, e ela diverge do caixa em 31% dos preços a 5%. Congelar era congelar o defeito. |
| PDP-23 | "alvo de 44×44 via `TAP_44`" | "≥44 pela própria caixa de 56px" | `TAP_44` existe para desenho **menor** que o alvo; a varredura de `touchTarget.test.ts` só o cobra de `h-8`/`h-9`/`h-10`/`38px`. |
