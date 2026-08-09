# Identidade Papelaria (Nanita v2) — Validação

**Veredito: PASS**
**Faixa coberta:** `016d902..9488f8c` (23 commits, 87 arquivos, +3047 / −453)
**Data:** 2026-08-04

> **Nota de independência.** O skill pede autor ≠ verificador. Esta sessão não usou sub-agentes (a
> configuração vigente não os autoriza sem pedido explícito), então a validação foi feita pelo
> caminho de contingência que o próprio `validate.md` prevê: passagem independente após o último
> commit, com checagem ancorada no spec **e** sensor de discriminação. O sensor é a parte que não
> depende do julgamento do autor — ele injeta defeito e pergunta ao runner, não a mim.

---

## 1. Sensor de discriminação — 19 mutantes, 19 mortos

Cada mutação é um defeito de **comportamento**, não de sintaxe: o código continua compilando e a
tela continua renderizando. Aplicadas uma por vez, com `git checkout` depois de cada uma. Árvore
limpa ao fim.

| # | Mutação injetada | Suíte que deveria pegar | Resultado |
|---|---|---|---|
| 1 | `--nanita-jam` volta a `#b0176b` (geleia da v1) | `palette.test.ts` | ✓ morto |
| 2 | `--nanita-sugar` volta a `#ffeff6` — **o defeito de 1,00:1** | `palette.test.ts` | ✓ morto |
| 3 | Tailwind e CSS discordam no Carbono | `palette.test.ts` | ✓ morto |
| 4 | `App.css` importado **antes** do pacote | `importOrder.test.ts` | ✓ morto |
| 5 | Um CTA volta para pílula | `buttonShape.test.ts` | ✓ morto |
| 6 | O botão da loja passa a oferecer pílula | `Button.test.tsx` | ✓ morto |
| 7 | `button` deixa de ser a última chave do raio | `buttonShape.test.ts` | ✓ morto |
| 8 | Campo de CEP volta para Dobra | `fieldBorder.test.ts` | ✓ morto |
| 9 | Descritor do lockup vira Carbono sobre Grafite | `brand.test.tsx` | ✓ morto |
| 10 | Wordmark deixa de cair para o monograma abaixo do piso | `brand.test.tsx` | ✓ morto |
| 11 | Path do wordmark perde o `fill-rule="evenodd"` | `paths.test.ts` | ✓ morto |
| 12 | Uma coordenada do monograma é trocada | `paths.test.ts` | ✓ morto |
| 13 | Favicon volta a ser disco (`rx` 18 → 32) | `brandAssets.test.ts` | ✓ morto |
| 14 | `theme-color` fica na geleia velha | `brandAssets.test.ts` | ✓ morto |
| 15 | Berkshire volta ao `<link>` de fontes | `brandAssets.test.ts` | ✓ morto |
| 16 | Ritmo do card de coleção inverte 1º e 2º | `CategoryGrid.test.tsx` | ✓ morto |
| 17 | Preço do card de produto vira Carbono | `ProductCardSurface.test.tsx` | ✓ morto |
| 18 | Selo "Novo" ganha cor de dinheiro | `ProductCardSurface.test.tsx` | ✓ morto |
| 19 | Disco de adicionar vira 14px | `ProductCardSurface.test.tsx` | ✓ morto |

**Nenhum sobrevivente.** O mutante 12 merece registro: trocar **um dígito** numa coordenada de 10KB
de path é o defeito mais silencioso desta feature — não quebra render, não quebra tipo, só deforma
a letra. Ele morre porque `paths.test.ts` compara com a fonte da marca caractere a caractere.

Script em `.specs/brand/nanita-v2/`? Não — ele é de verificação, não de marca:
`scratchpad/sensor.sh` da sessão.

---

## 2. Cobertura ancorada no spec

Evidência ou zero: cada critério cita o arquivo e o que a asserção afirma.

| AC | Resultado esperado (spec) | Evidência | Coberto |
|---|---|---|---|
| **PAP-01** os 10 tokens valem os hexes da prancha 18 | Papel `#F9F1EE` … Fita `#FFC95C` | `palette.test.ts` — dois blocos `it.each(Object.entries(PAPELARIA))`, um lendo `App.css` do disco e outro lendo `tailwind.config.ts` | ✅ |
| **PAP-01** os dois arquivos concordam | mesmo conjunto de nomes **e** mesmos valores | `palette.test.ts` — "os dois arquivos declaram exatamente o mesmo conjunto" + "concordam em cada valor" | ✅ |
| **PAP-02** o chão é Papel | `body` não usa `#FFFFFF` | `App.css` → `body { background-color: var(--nana-bg) }` com `--nana-bg: var(--nanita-paper)`; e `--background: 16 48% 96%` no bloco shadcn | ⚠️ **Coberto por leitura, não por asserção** — ver §4 |
| **PAP-03** pisos de contraste sobre Papel | `jam` ≥4,5 · `plum` ≥4,5 · `ink` ≥7 · `rule` ≥3 · `raspberry` ≥3 | `palette.test.ts` §"os pisos de contraste sobre Papel" — 5 asserções | ✅ |
| **PAP-03** preenchimento fica abaixo de 3 | `glaze`, `sugar`, `border`, `butter` < 3 | `palette.test.ts` — `it.each` de 4 | ✅ |
| **PAP-03** guarda do chão | `sugar × paper` ≥ 1,15 | `palette.test.ts:130` — `expect(contrastRatio(PAPELARIA.sugar, PAPELARIA.paper)).toBeGreaterThanOrEqual(1.15)`, com um segundo teste provando que `#FFEFF6` dá < 1,01 | ✅ |
| **PAP-04** `rounded-button` = 14px | existe e `rounded-pill` continua 999px | `tailwind.config.ts`; provado indiretamente por `Button.test.tsx` (21 testes) | ✅ |
| **PAP-04** botão nunca usa pílula | zero ocorrência fora da allowlist | `buttonShape.test.ts` — varredura do fonte com atribuição de tag **por coluna** + allowlist de 5 arquivos com motivo + teste anti-obsolescência | ✅ |
| **PAP-04** as cinco variantes | cores declaradas no design | `Button.test.tsx` — `it.each(VARIANTS)` × 2 + 4 testes de cor por variante | ✅ |
| **PAP-04** Carimbo sobre Grafite, nunca Carmim | `onInk` é `bg-nanita-glaze` | `Button.test.tsx` — "sobre Grafite o botão é Carimbo… nunca Carmim"; e `palette.test.ts` prova o porquê (Carmim × Grafite < 3) | ✅ |
| **PAP-05** wordmark inline com nome acessível | `role="img"`, `aria-label="Nanita"`, viewBox | `brand.test.tsx` — 15 testes | ✅ |
| **PAP-05** proporção 4,01:1 | altura sai da largura | `brand.test.tsx` — `toBeCloseTo(39.89, 1)` em `width=160` | ✅ |
| **PAP-05** escada de redução | <110px → monograma; <140px → wordmark | `brand.test.tsx` — 4 testes, inclusive a queda encadeada (60px → monograma) | ✅ |
| **PAP-05** descritor Dobra sobre Grafite | `#EBDDD7`, não `#7E5769` | `brand.test.tsx` — asserção positiva **e** negativa | ✅ |
| **PAP-05** um `<path>` por cor, evenodd | estrutura, não geometria | `paths.test.ts:59` + `brand.test.tsx` §"nenhuma cor sai partida", que roda sobre o **renderizado** | ✅ |
| **PAP-06** Berkshire retirada | ausente do CSS, do código e do `<link>` | `brandAssets.test.ts` §"as fontes"; e `grep -ri berkshire apps/store/src` só encontra comentários explicativos | ✅ |
| **PAP-07** favicon squircle 28% | `viewBox 0 0 64 64`, `rx=18` | `brandAssets.test.ts` — inclusive `rx/64 ≈ 0.28` | ✅ |
| **PAP-07** o N é o mesmo path do lockup | `favicon.svg` contém `MONOGRAM_D` | `brandAssets.test.ts` — `expect(svg).toContain(MONOGRAM_D)` | ✅ |
| **PAP-07** apple-touch-icon 180 quadrado | 180×180, sem canto | `brandAssets.test.ts` lê o IHDR do PNG; a ausência de canto vem do gerador (`_gen-favicon.mjs`, `rx: null`) | ⚠️ **Parcial** — o tamanho é asserido, a ausência de canto não |
| **PAP-07** `.ico` com 3 tamanhos | 16 · 32 · 48 | `brandAssets.test.ts` lê o `ICONDIR` | ✅ |
| **PAP-07** `theme-color` Carmim | `#A62348` e **não** `#B0176B` | `brandAssets.test.ts` | ✅ |
| **PAP-08** ritmo do card de coleção | 1º Carimbo → 2º Grafite → demais Mata-borrão | `CategoryGrid.test.tsx` — 4 testes, incluindo o que lê a **ordem** para provar que é posição e não categoria | ✅ |
| **PAP-08** card de produto | palco Mata-borrão, `+` Grafite, preço Carmim, selos Grafite | `ProductCardSurface.test.tsx` — 10 testes | ✅ |
| **PAP-08** as treze seções, na ordem | nenhuma nasce, nenhuma morre | `HomePage.tsx` não teve seção adicionada nem removida no diff da feature | ⚠️ **Coberto por leitura de diff** |
| **PAP-08** hero, kit, newsletter, rodapé | valores dos artboards 22/23 | Screenshots em 390×844 e 1440×900 comparados aos boards, por task | ⚠️ **Prova visual, não asserção** — é a natureza do critério |
| **PAP-08** sem rolagem horizontal em 390px | `scrollWidth − clientWidth = 0` | Medido no navegador: **0** | ✅ |
| **PAP-09** ordem de import | `App.css` depois do pacote | `importOrder.test.ts` | ✅ |
| **PAP-09** backoffice intacto | zero linha | `git diff --stat 016d902..HEAD -- apps/backoffice packages/` → vazio | ✅ |
| **PAP-09** `localStorage` intacto | nenhuma chave renomeada | `git diff 016d902..HEAD \| grep 'nanapin-(cart\|wishlist\|…)'` → vazio | ✅ |
| **PAP-10** documentação | `DESIGN.md`, `CLAUDE.md`, README | Reescritos; §8 do `DESIGN.md` foi de 9 para 14 itens | ✅ (camada "none" na matriz) |

---

## 3. Gates

| Gate | Resultado |
|---|---|
| `pnpm test` (monorepo) | loja **979** (841 → +138, +10 arquivos) · backoffice **1102** — todos verdes |
| `npx tsc --noEmit` loja | **0 erros** (baseline: 0) |
| `npx tsc --noEmit` backoffice | **0 erros** |
| `pnpm build` loja | ✓ |
| `pnpm lint` | loja **2 err / 2 warn** · backoffice **28 / 7** = **30 / 9**, a baseline exata do `CLAUDE.md` |
| Prova visual 390×844 | Feita por task de home, contra o artboard 23 |
| Prova visual 1440×900 | Feita para hero, kit e catálogo, contra o artboard 22 |

Nenhum teste foi enfraquecido, pulado ou removido. As duas asserções de
`OrderConfirmationPage.test.tsx` que mudaram ficaram **mais fortes**: passaram a asserir
`rounded-button` **e** a ausência de `rounded-pill`, onde antes só asseriam a presença de um.

---

## 4. Lacunas — o que NÃO está provado por asserção

Registradas em vez de arredondadas.

| Lacuna | Risco | Por que não foi fechada |
|---|---|---|
| **`body` em Papel** não tem asserção própria | Baixo — o valor do token é asserido, e o `body` só o referencia | Provar exigiria montar o documento e ler `getComputedStyle`, que em jsdom não resolve `var()` de folha externa. O mutante 1 cobre o valor. |
| **Ausência de canto no `apple-touch-icon`** | Baixo — é um PNG gerado por script com `rx: null` | Exigiria decodificar o PNG e inspecionar os pixels de canto. O gerador é determinístico e está versionado. |
| **As treze seções da home, na ordem** | Baixo | Um teste de ordem de seções em `HomePage` seria um snapshot da composição, que quebra a cada ajuste legítimo. O diff da feature não tocou a lista. |
| **Fidelidade visual aos artboards** | Médio | É julgamento, não asserção. Mitigado por screenshot por task e pelas asserções de cor/forma nos pontos que o spec nomeia. |
| **Alvos de toque ≥44px** (AC P5.8) | Médio | **A AC como escrita é inatingível junto dos artboards que ela também manda seguir**: os boards desenham os discos do card em 36–38px. Resolvido parcialmente — os alvos do header foram a 44px por pseudo-elemento, sem mudar o tamanho visual; card e chips ficaram no tamanho do board. Divergência registrada em `tasks.md`. |

**Gap de precisão de spec:** a AC P5.8 ("todo alvo de toque SHALL ter ≥ 44px") entra em conflito
direto com a AC P5.1–P5.7 ("conforme os artboards"). Numa próxima feature de UI, essa regra precisa
nascer com o recorte já escrito — "navegação primária e ações de tela cheia", por exemplo —, senão
ela obriga a escolher entre duas ACs do mesmo spec.

---

## 5. Veredito

**PASS.** As dez requisições têm cobertura ancorada no spec; o sensor matou 19 de 19 mutantes,
incluindo o mais silencioso (um dígito trocado numa coordenada de path); os gates de teste, tipo,
build e lint fecham na baseline; e os invariantes de convivência — backoffice e `localStorage` —
foram provados por diff no recorte da feature.

As cinco lacunas do §4 são de **prova**, não de comportamento, e três delas são inerentes ao tipo do
critério (fidelidade visual não vira asserção). A única que merece ação futura é o gap de precisão da
AC de alvo de toque.
