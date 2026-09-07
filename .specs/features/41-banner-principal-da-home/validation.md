# Banner principal da Home — Validation

**Spec**: `.specs/features/41-banner-principal-da-home/spec.md` (52 ACs, `BNR-01`..`BNR-52`)
**Verifier**: sub-agente independente — **o autor NÃO é o verificador**, nas duas rodadas.
**Branch**: `feat/41-banner-principal-da-home`

| Rodada | Data | Intervalo | Veredito |
| --- | --- | --- | --- |
| **1** | 2026-09-06 | `f1e973d..3d7e23a` | ❌ **FAIL** — 5 ACs reprovadas, 4 mutantes sobreviventes |
| **2** | 2026-09-06 | `3d7e23a..2370054` | ✅ **PASS com ressalvas** — os 6 achados fechados; 3 residuais de força de teste |

> **Nota de commit**: o coordenador indicou `5f2cbbb`. O HEAD da branch é **`2370054`**, que é o
> mesmo trabalho com um `amend`: `5f2cbbb` levava junto 304 linhas de `.specs/features/43-*`, spec de
> **outra** feature. `2370054` as remove. A verificação da rodada 2 é contra `2370054`.

---

# RODADA 2 — o veredito atual

## Veredito: ✅ PASS com ressalvas

**Os seis achados da rodada 1 estão fechados**, e a correção é do tipo que este repositório cobra:
a asserção que defendia o comportamento errado foi **invertida, não afrouxada**, e ganhou vizinhas; as
duas réguas de guarda foram ampliadas com sensor para cada furo; e o guarda irmão da feature `40`
recebeu a mesma ampliação, porque a rodada 1 mostrou que tinha o mesmo buraco.

**As ressalvas são todas de força de teste, nenhuma de comportamento errado hoje.** A mais séria
repete o formato do achado nº 1: a **junção na página** (`AdminHomePage` → `HomeSectionList` →
`deleteSection`) funciona e **não é provada por teste nenhum**. Hoje está certa; amanhã ela se
desfaz em silêncio, que é exatamente como `deleteSection` passou uma feature inteira sem consumidor.

### Sumário da rodada 2

| Eixo | Resultado |
| --- | --- |
| **Achados da rodada 1** | **6/6 fechados** — verificados por reinjeção do mutante, não pela leitura do diff |
| **Spec-anchored check** | **50/52 ✅** · **2 desvios declarados** (`BNR-27`, `BNR-39`) · **0 GAP** |
| **Gate** | **7341 testes em 388 arquivos, exit 0 nos CINCO workspaces**, sem uma única flake |
| **Sensor** | **19 mutações · 11 mortas · 8 sobreviventes** (todas as 8 são grafia nova ou junção não provada) |
| **Lint / tipos / build** | 27 erros · 5 warnings (baseline) · tipos 0·0 · `pnpm build` exit 0 |
| **`packages/core/src/payment/**`** | **0 arquivos** no intervalo da correção |

---

## 1 · Gate da rodada 2 — exit code fora de pipe, um workspace por vez

| Workspace | Testes / arquivos | Exit | Declarado pelo autor | Confere? |
| --- | --- | --- | --- | --- |
| store | **2652 / 169** | **0** | 2652/169 | ✅ |
| backoffice | **1996 / 119** | **0** | 1996/119 | ✅ |
| core | **1811 / 70** | **0** | 1811/70 | ✅ |
| functions | **370 / 7** | **0** | 370/7 | ✅ |
| catalog-import | **512 / 23** | **0** | 512/23 | ✅ |
| **Total** | **7341 / 388** | | 7341/388 | ✅ |

**As cinco baselines declaradas conferem, e desta vez sem flake nenhuma** — os cinco workspaces
passaram limpos na primeira execução, exit 0. (Na rodada 1, store e backoffice reprovaram por timeout
de 5 s sob carga; foi provado isolado que era flake.)

**Delta da correção**: store +18 (2634 → 2652), backoffice +16 (1980 → 1996), **sem arquivo de teste
novo** — os 34 casos cresceram dentro dos arquivos que já guardavam o assunto, que é a forma que este
projeto prefere. **Nenhuma queda de contagem**: o bloco `HOME-08` de `HomeSectionList.test.tsx` tinha
3 casos e virou 6, no mesmo arquivo.

- `npx tsc --noEmit -p apps/store/tsconfig.app.json` → **exit 0**
- `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` → **exit 0**
- `pnpm lint` → backoffice 25 erros / 4 warnings · store 2 / 1 = **27 / 5**, baseline intacta
- `pnpm build` → **exit 0**
- `git diff --name-only 3d7e23a..HEAD -- packages/core/src/payment/` → **vazio**

---

## 2 · Os seis achados, reverificados por reinjeção

Nenhum foi dado por fechado pela leitura do diff. Cada um teve o **mutante original reinjetado** na
árvore, medido, e revertido.

### Achado 1 · BLOCKER — `AD-029` parado no banco → **FECHADO**

O painel mudou de ponta a ponta:

| Camada | Antes (`3d7e23a`) | Agora (`2370054`) |
| --- | --- | --- |
| Linha | `HomeSectionRow.tsx:142` — `const indelevel = section.type === 'hero'`, cadeado no lugar do `<Switch>` | `indelevel` **apagado**; `<Switch>` incondicional (`:216-224`); botão **Remover** com `aria-label` por seção (`:239-250`) |
| Lista | não repassava nada | `HomeSectionList.tsx:23-30` declara `onRemove?`, `:95` repassa à linha |
| Página | `deleteSection` **sem consumidor** | `AdminHomePage.tsx:103-124` — `handleRemove` com `window.confirm`, e `:281` `onRemove={handleRemove}` |
| Dados | recusa vinha do banco (já estava certo) | inalterado; `avisar` (`:91-93`) põe `erro.message` **cru** na descrição do toast |

**A recusa da última ativa NÃO é antecipada na tela** — confirmado por leitura e por mutação (A7):
pôr um recorte por tipo em `setSectionActive` **reprova** (`useAdminHomeSections.test.ts`).

**Mutantes de confirmação — 5 injetados, 5 mortos:**

| # | Camada | Mutação | Killed? |
| --- | --- | --- | --- |
| A1 | painel | o hero volta a não ter `<Switch>` | ✅ |
| A2 | painel | o botão Remover some **só** do hero | ✅ |
| A3 | roteamento | `HomeSectionList` deixa de repassar `onRemove` à linha | ✅ |
| A6 | página | `avisar` **reescreve** a mensagem (`'Tente de novo.'`) em vez de exibir a do banco | ✅ |
| A7 | dados | `setSectionActive` volta a antecipar a recusa do hero | ✅ |

**A inversão foi feita certo.** `HomeSectionList.test.tsx:121-131` documenta por escrito que a
asserção antiga foi **invertida** e não afrouxada, e diz onde a invariante passou a ser provada
(`homeSections.test.ts`, sobre o `.sql`). As vizinhas cobrem os dois jeitos de errar a inversão:
`:129` (o `onToggle` é de fato chamado) e `:136` (não sobrou cadeado nem "Sempre no ar" — sem ela,
deixar o cadeado ao lado de um interruptor funcional passaria).

⚠️ **Ressalva R1 (Major, abaixo)**: a **junção na página** não é provada. Ver §4.

### Achado 2 · Mutantes S1/S2 (pausas não discriminadas) → **FECHADO**

| Reinjeção | Suíte | Antes | Agora |
| --- | --- | --- | --- |
| `onPointerDown: () => {}` | `src/widgets/hero-carousel` | sobrevivia (66/66) | **✅ morto** (exit 1) |
| `onFocus: () => {}` | idem | sobrevivia | **✅ morto** (exit 1) |

A correção acertou a causa, não o sintoma: `useHeroCarousel.test.ts:110-121` escreve a régua por
extenso — *"o tempo avançado aqui NUNCA pode ser múltiplo do número de slides"* — e acrescentou o
**caso de contraste** (`:117-125`, `SEM_PAUSA = 2`) que ancora o bloco inteiro. Sem ele, se o
carrossel deixasse de girar por outro motivo, os quatro testes de pausa passariam por acidente. O par
simétrico novo (`:195-205`, tirar o ponteiro não retoma enquanto o dedo continua) fecha o outro lado.

### Achado 3 · Mutante S4 (`fade-in`) → **FECHADO**, com residual

| Reinjeção | Antes | Agora |
| --- | --- | --- |
| `opacity-[0]` no `<img>` | sobrevivia | **✅ morto** |
| `animate-in fade-in duration-700` no `<img>` | sobrevivia | **✅ morto** |
| `<div className="opacity-0">` em `sectionRenderers.tsx` | sobrevivia | **✅ morto** |

A régua ganhou `opacity-\[0…\]` e `fade-in(-0)?`, o escopo passou a incluir o invólucro (com **âncora
3** própria, `:94-98`), e cada furo ganhou sensor **com o par negativo** (`fade-in-50`, `zoom-in-95`,
`opacity-[0.4]`, `opacity-[35%]`) — que é o que impede a régua de ser afrouxada depois por acusar
entrada legítima. **`heroSemOpacidadeZero.test.ts` (feature 40) recebeu a mesma ampliação**, como
pedido.

⚠️ **Ressalva R2 (Major, abaixo)**: quatro grafias novas ainda furam. Ver §3.

### Achado 4 · Mutante S3 (`||` quebrado em linhas) → **FECHADO**, com residual

Reinjeção do recuo à mão com o `||` quebrado pelo Prettier: antes **exit 0**, agora **✅ exit 1**.

A varredura passou a montar **linhas lógicas** (`surfaceArtSingleOwner.test.ts:92-131`) com teto de
junção de 6, deduplicação de sobreposição e o número da **primeira** linha preservado — e o par
negativo (`:365-377`: três propriedades vizinhas de objeto que **não** podem ser juntadas) é o que
impede a junção de virar falso positivo em todo mapper do projeto.

⚠️ **Ressalva R3 (Minor, abaixo)**: duas grafias sem operador ainda furam. Ver §3.

### Achado 5 · `BNR-39` → **FECHADO**

O desvio agora está declarado **no código** (`HeroCarousel.tsx:32-39`, `SPEC_DEVIATION` com `Reason`)
**e** a propriedade que ele afirma é **asserida**: `HeroCarousel.test.tsx:383-417` — nenhum slide com
`aria-hidden`, `hidden`, `tabindex`, e nenhuma classe de ocultação, com régua de **token exato**
(`new RegExp(\`(?:^|\\s)${nome}(?![-\\w])\`)`) porque o slide legitimamente carrega `overflow-hidden`.
É a lição de `cardSkeletonBox` aplicada corretamente. O comentário do teste é explícito sobre o
porquê: *"«por construção» que ninguém mede é só uma frase"*.

### Achado 6 · ACs sem evidência → **FECHADO** (ver a tabela §5)

Todas as seis ganharam asserção própria, e três delas com o par negativo. Destaque para `BNR-04`
(`HomeSectionList.test.tsx:319-334`), que não se contentou com "a linha é arrastável" e assere o
desfecho real: `expect(carrossel.position).toBeLessThan(hero.position)` — o carrossel **acima** da
Chamada principal, que é o pedido literal da feature.

---

## 3 · Sensor da rodada 2 — 19 mutações, 11 mortas, 8 sobreviventes

Todas aplicadas na árvore, medidas e revertidas por `git checkout --`. A árvore terminou sem
mutação (`git diff --stat -- apps/ packages/ supabase/` vazio).

### Mortas (11)

Os 6 mutantes da rodada 1 reinjetados (S1, S2, S3, S4a, S4b, S4c) + os 5 de confirmação da cadeia
(A1, A2, A3, A6, A7). Detalhe em §2.

### Sobreviventes (8) — todos de grafia nova ou junção não provada

#### R2 · a régua de opacidade ainda guarda a GRAFIA — quatro furos novos · **Major**

Medidos contra a **suíte inteira** de `src/widgets/hero-carousel`, não só o guarda:

| # | Mutação no `<img>` do slide | O que produz | Guarda |
| --- | --- | --- | --- |
| **N1** | `className="… animate-fade-in"` | `packages/ui/tailwind.preset.ts:114-117` — keyframe `"0%": { opacity: "0", transform: "translateY(12px)" }` | **exit 0** |
| **N2** | `className="… animate-scale-in"` | `:122-125` — `"0%": { transform: "scale(0.95)", opacity: "0" }` | **exit 0** |
| **N4** | `className="… animate-slide-up"` | `:137-140` — `from: { opacity: "0", transform: "translateY(20px)" }` | **exit 0** |
| **N3** | `className="… invisible"` | `visibility: hidden` — o Chrome também **não conta como pintado** | **exit 0** |

**N1/N2/N4 são utilidades do PRÓPRIO preset deste projeto**, e o motivo do furo é de uma letra: a
régua exige `fade-in` precedido de `[\s"'`:[{]` ou início de string, e em `animate-fade-in` o
caractere anterior é um hífen. A régua vê `fade-in` do `tailwindcss-animate` e **não** vê o
`animate-fade-in` que o próprio repositório declara — com o mesmo `opacity: 0` no primeiro quadro.

**Atenuante honesto**: nenhuma das três é usada hoje em `apps/store`, `apps/backoffice` ou
`packages/ui` (grep: 0 ocorrências). Por isso é Major e não Blocker — mas é exatamente o perfil de
`animate-in fade-in` antes da rodada 1: disponível, uma classe, e invisível para o guarda.

**N3 (`invisible`)** é de outra natureza: não há regra nenhuma para `visibility`. O teste de `BNR-39`
**checa** `invisible`, mas só no `<Link>` do slide — não no `<img>` dentro dele.

**Correção sugerida**: trocar a âncora de `fade-in` por `(?:^|[\s"'\`:[{-])`, e acrescentar
`invisible` (e `animate-scale-in`/`animate-slide-up`, ou uma régua derivada dos keyframes do preset).

#### R3 · a régua de dono único é cega a recuo SEM operador — dois furos novos · **Minor**

| # | Mutação em `HeroCarouselEditor.tsx` | Guarda |
| --- | --- | --- |
| **P2** | `let image = item.image_mobile_url` / `if (!image) image = item.image_url` (recuo imperativo, em statements) | **exit 0** |
| **P1** | `const image = [item.image_mobile_url, item.image_url].find(Boolean) ?? null` | **exit 0** |

`RECUO_A_MAO` exige `||`, `??` ou ternário **entre** os dois nomes. Um recuo escrito sem operador
escapa por construção — a junção em linhas lógicas resolveu a quebra de linha, não a ausência de
operador. **P2 é a mais plausível das duas** (estilo imperativo é comum e o Prettier não o desfaz).

Menos grave que R2 por dois motivos: as duas grafias são bem menos idiomáticas que um `||`, e neste
arquivo o defeito ainda morre pelo teste de **comportamento** do editor. O furo é real para o
**quinto consumidor**, que é para quem o guarda existe.

#### R1 · a JUNÇÃO na página não é provada — dois mutantes · **Major**

| # | Mutação em `AdminHomePage.tsx` | Efeito real | Suíte |
| --- | --- | --- | --- |
| **A4** | apaga `onRemove={handleRemove}` da `<HomeSectionList>` | **o botão Remover some da tela inteira** | `AdminHomePage.test.tsx` **exit 0** |
| **A5** | `handleRemove` confirma e **não chama** `deleteSection` | **remover não remove nada** | `AdminHomePage.test.tsx` **exit 0**, e a **suíte inteira do backoffice** também (a única reprovação foi `SlugField.test.tsx`, flake de 5 s sem relação) |

**Por que nenhum teste pega**: `AdminHomePage.test.tsx:44` tem `deleteSection: vi.fn()` no mock do
hook e **nenhum caso o assere**. `HomeSectionList` não é mockado ali — a página renderiza a lista de
verdade —, então o teste é possível; ele só não existe. As duas pontas estão provadas
(`HomeSectionList.test.tsx` prova a linha e o roteamento até a prop; `useAdminHomeSections.test.ts`
prova a gravação), e **o meio não**.

**É o formato do achado nº 1 se repetindo um nível acima.** `deleteSection` passou a feature `24`
inteira exportado e sem consumidor porque nada media a junção; hoje ela tem consumidor e continua sem
medida. Um teste de página que clique em `Remover`, confirme o `window.confirm` e assere
`deleteSection` chamado com o id fecha os dois.

---

## 4 · O que continua fraco depois da rodada 2

| Item | Estado | Severidade |
| --- | --- | --- |
| **R1** — junção `AdminHomePage` → `deleteSection` sem teste (A4, A5) | comportamento **certo**, prova **ausente** | **Major** |
| **R2** — `animate-fade-in` / `animate-scale-in` / `animate-slide-up` / `invisible` furam a régua de opacidade | grafias do próprio preset, hoje não usadas | **Major** |
| **R3** — recuo sem operador fura a régua de dono único (P1, P2) | grafias pouco idiomáticas | **Minor** |
| **BNR-18 / BNR-26 / BNR-37** — ausência de rolagem horizontal, CLS e o gesto de arrasto | proxy de forma; jsdom devolve 0 | declarado, **não é achado** |
| **BNR-27** — destino externo | `SPEC_DEVIATION` no widget **e** na tabela de suposições | declarado, **não é achado** |
| **Prova em navegador** | não feita | declarado, **não é achado** |

**Nada aqui bloqueia o merge.** Nenhum dos três residuais é comportamento errado hoje; os três são
"o teste passa e o defeito pode voltar sem ninguém ver" — que é a dívida que este repositório trata
com mais seriedade que a média, e por isso vale registrá-los.

---

## 5 · Checagem ancorada na spec — estado final (rodada 2)

Só as linhas que **mudaram** desde a rodada 1. As 41 já verdes seguem verdes (medidas de novo pelo
gate, exit 0 nos cinco workspaces).

| AC | Desfecho definido pela spec | `arquivo:linha` + expressão | R1 | R2 |
| --- | --- | --- | --- | --- |
| **BNR-02** | seção nova nasce `active = false` | `useAdminHomeSections.test.ts:380` — `expect(insercao.insert).toMatchObject({ type: 'hero_carousel', active: false })` — mede o **payload**, não a frase na tela | ⚠️ | ✅ |
| **BNR-03** | tipo repetível | + `HomeBlockTray.test.tsx:154-160` — com um `hero_carousel` já na Home: `expect(bloco('hero_carousel')).not.toBeDisabled()`, `queryByTestId('motivo-hero_carousel')).toBeNull()`, `expect(onAdd).toHaveBeenCalledWith('hero_carousel')` | ✅ | ✅ |
| **BNR-04** | qualquer posição, **inclusive acima da Chamada principal** | `HomeSectionList.test.tsx:314` — `expect(linha('carrossel').getAttribute('draggable')).toBe('true')`; `:331-333` — `expect(carrossel.position).toBeLessThan(hero.position)` | ❌ | ✅ |
| **BNR-05** | teto de 30 recusa por motivo | `HomeBlockTray.test.tsx:166-168` — Home cheia: `expect(bloco('hero_carousel')).toBeDisabled()` + `expect(screen.getByTestId('motivo-hero_carousel')).toHaveTextContent('Home cheia')` | ⚠️ | ✅ |
| **BNR-08** | três modos, **no máximo um** gravado | `HeroCarouselEditor.test.tsx:434-440` (os três nas opções); `:451-453` — `category_id` `'cinzas'`, `product_id` **`toBeNull()`**, `href` **`toBeNull()`**; `:467-468` e `:494-496` para os outros dois modos | ⚠️ | ✅ |
| **BNR-09** | `label_snapshot` congelado **junto** com a escolha | `HeroCarouselEditor.test.tsx:483` — partindo de `label_snapshot: null`, escolher a coleção grava `expect(gravado().items[0].label_snapshot).toBe('Eternize as cinzas')` | ⚠️ | ✅ |
| **BNR-32** | pausa em hover **e** em foco | `useHeroCarousel.test.ts:117-125` (contraste: `SEM_PAUSA = 2`), `:132`, `:151`, `:165`, `:195` — todos com `INTERVAL * 2` sobre 3 slides. **Discrimina** (S1/S2 morrem) | ❌ | ✅ |
| **BNR-39** | slide oculto sai do teclado e do leitor | `HeroCarousel.test.tsx:388-390` (`aria-hidden` null, `hidden` false), `:400` (`tabindex` null), `:412-413` (token exato: sem `hidden`/`invisible`). `SPEC_DEVIATION` em `HeroCarousel.tsx:32-39` | ❌ | ✅ desvio declarado + asserido |
| **BNR-40** | desligar o hero **é aceito** | `HomeSectionList.test.tsx:124` — `expect(within(linha('hero')).getByRole('switch')).toBeInTheDocument()`; `:129` — `expect(props.onToggle).toHaveBeenCalledWith('hero', false)`; `:136-137` — cadeado e "Sempre no ar" ausentes; `useAdminHomeSections.test.ts:229-236` — `expect(devolvido).toBeNull()` + `expect(escritas('home_sections')[0].update).toEqual({ active: false })` | ❌ | ✅ |
| **BNR-41** | remover o hero **é aceito** | `HomeSectionList.test.tsx:143` — `expect(props.onRemove).toHaveBeenCalledWith('hero')`; `:148-150` — toda seção oferece remoção; `:155` — sem `onRemove` o controle não é desenhado. `AdminHomePage.tsx:122` consome `deleteSection` | ❌ | ✅ (junção sem teste — R1) |
| **BNR-44** | painel mostra o motivo do banco, **sem reescrever** | `useAdminHomeSections.test.ts:220` — `expect(devolvido).toEqual({ message: doBanco })`, **igualdade e não `contains`**, com a frase literal do trigger; `AdminHomePage.tsx:92` — `description: erro.message`. Mutante A6 (reescrever) **morre** | ⚠️ | ✅ |
| **BNR-52** | desligar preserva os slides | `useAdminHomeSections.test.ts:392-397` — `expect(escritas('home_section_items')).toEqual([])` + `expect(Object.keys(update.update)).toEqual(['active'])` | ⚠️ | ✅ |

**Status final**: **50/52 ✅** · `BNR-27` e `BNR-39` como **desvios declarados nos dois lugares**
(spec e código) · **0 GAP**.

---

## 6 · Qualidade de código (rodada 2)

| Princípio | Status | Nota |
| --- | --- | --- |
| Código mínimo | ✅ | `onRemove` é opcional e a linha não desenha o controle sem ele — e há teste para isso (`:155`) |
| Mudanças cirúrgicas | ✅ | 3 arquivos de produção; o resto é teste e documentação |
| Sem avanço de escopo | ✅ | `window.confirm` em vez de modal próprio, com o porquê escrito (`AdminHomePage.tsx:112-114`) |
| Asserção invertida, não afrouxada | ✅ | Documentado por escrito em `HomeSectionList.test.tsx:121-131`, dizendo **onde** a invariante passou a ser provada |
| Guardas ampliados com par negativo | ✅ | `fade-in-50`, `zoom-in-95`, `opacity-[0.4]`, `opacity-[35%]`, e as linhas de objeto que não se juntam |
| Correção alcançou o guarda irmão | ✅ | `heroSemOpacidadeZero.test.ts` (feature 40) recebeu a mesma régua |
| Sem queda de contagem | ✅ | +34 casos, **zero arquivo novo**; o bloco `HOME-08` foi de 3 para 6 no mesmo lugar |
| `payment/` intocado | ✅ | `git diff --name-only` vazio |
| **Junção provada** | ❌ | R1: a página que liga as duas pontas não tem teste |

---

## 7 · Fix plans da rodada 2 (nenhum é bloqueador)

### Fix A — provar a junção na página · **Major**
- **Root cause**: `AdminHomePage.test.tsx:44` mocka `deleteSection` e nenhum caso o assere; A4 e A5
  sobrevivem à suíte inteira do backoffice.
- **Done when**: um caso clica `Remover` numa linha, confirma o `window.confirm` (stub) e assere
  `deleteSection` chamado com o id; e um segundo assere que a mensagem do banco chega ao `toast`.
  A4 e A5 passam a reprovar.

### Fix B — a régua de opacidade cobre `animate-*` do preset e `invisible` · **Major**
- **Root cause**: a âncora de `fade-in` não aceita hífen antes, e não há regra para `visibility`.
- **Onde**: `heroCarouselSemOpacidadeZero.test.ts:64-73` **e** `heroSemOpacidadeZero.test.ts:56-75`.
- **Done when**: N1, N2, N3 e N4 reprovam, e `fade-in-50`/`zoom-in-95` continuam passando.

### Fix C — a régua de dono único cobre recuo sem operador · **Minor**
- **Root cause**: `RECUO_A_MAO` exige `||`/`??`/ternário entre os dois nomes.
- **Done when**: P1 e P2 reprovam, sem acusar mapper nem formulário.

---

## 8 · O que NÃO foi verificado (declarado, não é achado)

- **Nada em navegador.** CLS, LCP, arrasto, largura real e ausência de rolagem horizontal do `body`
  seguem sem medida — jsdom devolve 0 para layout. Os Success Criteria da spec pedem 390×844,
  Slow 4G e CPU 4×, e continuam por fazer. É a pendência mais cara que sobra nesta feature.
- **Nada contra o Supabase hospedado.** A migration foi probeada no banco local pelo autor; o
  `Supabase Deploy` a aplica no push em `master`.
- **`BNR-27`** — inalcançável, declarado nos dois lugares.

> **Ruído de árvore observado durante a rodada 2, sem relação com esta feature**: `.specs/STATE.md`
> ganhou uma `AD-032` (notificações) **não rastreada**, e existem `.specs/features/42-*` e `43-*`
> não rastreados. São de outra sessão. Nenhum deles foi tocado por esta verificação, e a árvore
> terminou sem nenhuma mutação minha.

---

# RODADA 1 — histórico (`f1e973d..3d7e23a`)

Preservado porque o relatório vale pelas duas: o que se achou, e o que a correção fez com isso.

## Veredito da rodada 1: ❌ FAIL

**Spec-anchored**: 41/52 ✅ · 4 GAPs (5 ACs) · 7 evidências indiretas.
**Gate**: 7307 em 388, as cinco baselines do autor conferindo; reprovações do lote provadas como
flake de 5 s.
**Sensor**: 21 mutações, **17 mortas, 4 sobreviventes**.

### Os cinco achados de comportamento e prova

1. **BLOCKER — `AD-029` parou no banco** (`BNR-40`, `BNR-41`). `HomeSectionRow.tsx:142` mantinha
   `const indelevel = section.type === 'hero'`, com cadeado no lugar do interruptor, e
   `HomeSectionList.test.tsx:123` **asseria a trava** — a suíte estava verde a favor do comportamento
   que a spec mandava remover. `deleteSection` existia no hook e **nenhuma tela o consumia**.
   Consequência: a Adri arrastaria o Banner principal para o topo e o hero continuaria acima dele —
   exatamente o problema do *Problem Statement*. `tasks.md` não mapeava `BNR-40`/`BNR-41` a task
   nenhuma; `design.md` cobria `AD-029` só do lado da migration.
2. **S1/S2 — as duas pausas do carrossel não discriminavam** (`BNR-32`). `onPointerDown: () => {}` e
   `onFocus: () => {}` passavam com 66/66. Causa: `INTERVAL * 3` sobre 3 slides devolve o índice a 0,
   o mesmo valor de um carrossel pausado.
3. **S4 — a régua de opacidade guardava a grafia** (`BNR-25`). `animate-in fade-in`, `opacity-[0]` e
   um `opacity-0` no invólucro passavam. O `fade-in` não era hipotético: `tailwindcss-animate` está
   no preset e a grafia já é usada em `WhatsAppFloat.tsx` (3 lugares). O guarda irmão da feature `40`
   tinha o mesmo furo.
4. **S3 — a régua de dono único era por linha** (`BNR-22`). O recuo à mão com `||` quebrado — a
   formatação que o **Prettier produz sozinho** — passava inteiro.
5. **`BNR-39` sem implementação e sem asserção.** `design.md:261` declarava "realizado por
   construção", sem `SPEC_DEVIATION` no código e sem nada medindo a propriedade afirmada.
6. **Seis ACs sem evidência própria**: `BNR-02`, `BNR-04`, `BNR-05`, `BNR-08`, `BNR-09`, `BNR-44`,
   `BNR-52`.

### O que a rodada 1 já dava como bom (e a 2 confirmou)

Catálogo de 11 tipos casando com o `check` nos dois sentidos, com âncora de contagem; recusas
comparadas **literalmente** contra as frases da spec e na ordem que a spec declara; a arte por
dispositivo com **um** dono em `core/media`, provada por igualdade de veredito entre `heroSlideArt` e
`surfaceArt`; rendição pelo dono único com arte externa saindo inalterada; `eager`+`fetchpriority` só
no primeiro slide; vaga com altura antes da imagem; giro de 6 s e `prefers-reduced-motion`; bolinhas
rotuladas pelo **nome** do banner; `TAP_44` em todo controle; migration idempotente, sem escrita de
dado e derrubando o guarda antigo nos dois sentidos; editor com aviso de proporção que **grava assim
mesmo**, falha de envio preservando o rascunho, teto com motivo em texto e destino apagado nomeado; e
a prévia continuando a ser a loja num iframe.

### Traceabilidade — a evolução

| Requisito | Rodada 1 | Rodada 2 |
| --- | --- | --- |
| BNR-01, 03, 06, 07, 10..24, 26, 28..31, 33..38, 42, 43, 45..51 | ✅ Verified | ✅ Verified |
| BNR-18, 25, 26, 37 | ✅ com proxy declarado | ✅ com proxy declarado |
| BNR-02, 05, 08, 09, 44, 52 | ⚠️ Evidência indireta | ✅ **Verified** |
| BNR-04, 32, 39 | ❌ Needs Fix | ✅ **Verified** |
| BNR-40, BNR-41 | ❌ **AC reprovada** | ✅ **Verified** |
| BNR-27 | ⚠️ desvio declarado | ⚠️ desvio declarado |

---

## Summary

**Overall (rodada 2)**: ✅ **Ready, com três follow-ups.**

**O que mudou entre as rodadas**: a Chamada principal deixou de ser indelével **na única porta que a
Adri tem** — interruptor em toda linha, botão Remover roteado até `deleteSection`, e a recusa da
última seção ativa vindo do banco com a mensagem dele, sem reescrita. As duas réguas de guarda
pararam de guardar a grafia e passaram a guardar a regra, cada furo com sensor e par negativo, e o
guarda irmão da feature `40` foi corrigido junto. As seis ACs sem evidência ganharam asserção que
mede o desfecho, não a existência. **Os quatro mutantes que sobreviveram à rodada 1 morrem agora**,
verificado por reinjeção.

**O que sobra**: nenhum comportamento errado. Três dívidas de força de teste — a junção na página que
funciona sem prova (R1, e é o formato do achado nº 1 um nível acima), quatro grafias novas que ainda
furam a régua de opacidade (R2, incluindo três utilidades do **próprio preset** do projeto), e o
recuo sem operador que fura a régua de dono único (R3).

**E a pendência que nenhuma rodada de verificação fecha**: **a prova em navegador**. Tudo o que esta
feature promete em CLS, LCP e arrasto é exatamente o que jsdom não mede, e as asserções
correspondentes são proxy de forma — corretamente declaradas como tal, mas ainda não substituídas por
medida real em 390×844.
