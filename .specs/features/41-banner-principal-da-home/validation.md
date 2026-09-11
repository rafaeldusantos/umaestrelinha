# Banner principal da Home — Validation

**Spec**: `.specs/features/41-banner-principal-da-home/spec.md` (52 ACs, `BNR-01`..`BNR-52`)
**Verifier**: sub-agente independente — **o autor NÃO é o verificador**, nas três rodadas.
**Branch**: `feat/41-banner-principal-da-home`

| Rodada | Intervalo | Achados | Veredito |
| --- | --- | --- | --- |
| **1** | `f1e973d..3d7e23a` | 5 ACs reprovadas · 4 mutantes sobreviventes | ❌ **FAIL** |
| **2** | `3d7e23a..2370054` | 6 achados fechados · 8 mutantes novos (força de teste) | ✅ **PASS com ressalvas** |
| **3** | `2370054..b6abe64` | 3 ressalvas fechadas · **0 mutante sobrevivente** | ✅ **PASS — FECHADA** |

> **Veredito final: ✅ PASS.** Os 52 ACs têm evidência (`BNR-27` e `BNR-39` como desvios declarados
> nos dois lugares, spec e código). Os **12 mutantes** que sobreviveram ao longo das três rodadas
> foram reinjetados e **os 12 morrem**. Gate limpo nos cinco workspaces. Fica pendente, declarada e
> fora do alcance de qualquer rodada de verificação automatizada, **a prova em navegador**.

---

# RODADA 3 — o fecho (`2370054..b6abe64`)

## Veredito: ✅ PASS — as três ressalvas fechadas

Nenhuma foi dada por fechada pela leitura do diff. **Os oito mutantes da rodada 2 foram reinjetados
na árvore, medidos, e revertidos — os oito morrem.**

### Sumário

| Eixo | Resultado |
| --- | --- |
| **Ressalvas R1, R2, R3** | **3/3 fechadas**, verificadas por reinjeção |
| **Sensor acumulado (3 rodadas)** | **48 mutações · 48 mortas · 0 sobreviventes** no HEAD |
| **Spec-anchored** | **50/52 ✅** · 2 desvios declarados · **0 GAP** |
| **Gate** | **7359 em 388, exit 0 nos cinco workspaces** |
| **Lint / tipos / build** | 27 erros · 5 warnings (baseline) · tipos 0·0 · build exit 0 |
| **`payment/**`** | **0 arquivos** — no commit da rodada 3 **e** na feature inteira (`f1e973d..b6abe64`) |

---

## 1 · R1 — a junção na página → **FECHADA**

Era a mais séria: as duas pontas da remoção de seção estavam provadas — o hook e a lista — e **o fio
entre elas não**. Apagar `onRemove={handleRemove}` fazia o botão Remover sumir da tela inteira com a
suíte do backoffice verde.

**Reinjeção dos dois mutantes, contra `AdminHomePage.test.tsx`:**

| # | Mutação em `AdminHomePage.tsx` | Rodada 2 | Rodada 3 |
| --- | --- | --- | --- |
| **A4** | apaga `onRemove={handleRemove}` da `<HomeSectionList>` | sobrevivia (exit 0) | **✅ morto** (exit 1) |
| **A5** | `handleRemove` confirma e **não chama** `deleteSection` | sobrevivia à suíte inteira | **✅ morto** (exit 1) |

**Os seis casos provam o fio, não as pontas** — e o arquivo diz isso por escrito
(`AdminHomePage.test.tsx:421-431`: *"eles checam que apertar o botão chega ao banco"*). O que os
torna não-decorativos:

| Caso | `arquivo:linha` + expressão | O que impede |
| --- | --- | --- |
| o botão chega ao hook | `:439` — `await waitFor(() => expect(hook.deleteSection).toHaveBeenCalledWith('newsletter'))` | A4 e A5 |
| **a Chamada principal também** (`BNR-40`) | `:451` — `expect(hook.deleteSection).toHaveBeenCalledWith('hero')` | um recorte por tipo **em qualquer camada do caminho** — a lista mostra o botão, o hook aceita o id, e o meio decidiria sozinho que o hero é diferente |
| desistir não apaga | `:462` — `expect(hook.deleteSection).not.toHaveBeenCalled()` | um `confirm` decorativo |
| a confirmação **nomeia** | `:474-475` — `expect(confirm.mock.calls[0][0]).toContain('Newsletter')` e `toContain('itens escolhidos')` | um "tem certeza?" genérico escondendo o `on delete cascade` |
| a recusa do banco vira toast **literal** (`BNR-44`) | `:489-491` — `expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ description: doBanco, variant: 'destructive' }))`, **igualdade e não `contains`** | reescrever a frase do trigger |
| desligar a última ativa não é antecipado | `:504` — `expect(hook.setSectionActive).toHaveBeenCalledWith('hero', false)` **e depois** o toast com a frase do banco | a tela recusar por conta própria |

O harness é honesto: `HomeSectionList` **não** é mockado (`AdminHomePage.test.tsx:57-73` mocka só as
entidades), então a página renderiza a lista de verdade e o clique atravessa o componente real.

## 2 · R2 — a régua de opacidade → **FECHADA**

O furo era **de um caractere**: a régua exigia `fade-in` precedido de `[\s"'`:[{]`, e em
`animate-fade-in` o anterior é hífen. Ela via o `fade-in` do `tailwindcss-animate` e era cega ao que
o **próprio preset** do repositório declara.

**Reinjeção dos quatro mutantes, contra a suíte inteira de `src/widgets/hero-carousel`:**

| # | Classe no `<img>` do slide | Origem | Rodada 2 | Rodada 3 |
| --- | --- | --- | --- | --- |
| **N1** | `animate-fade-in` | preset `:114-117` — `"0%": { opacity: "0" }` | sobrevivia | **✅ morto** |
| **N2** | `animate-scale-in` | preset `:122-125` | sobrevivia | **✅ morto** |
| **N4** | `animate-slide-up` | preset `:137-140` | sobrevivia | **✅ morto** |
| **N3** | `invisible` | `visibility: hidden` | sobrevivia | **✅ morto** |

A régua nova (`heroCarouselSemOpacidadeZero.test.ts:87-92`) cobre as três famílias do preset além do
plugin, e ganhou uma quarta condição para `visibility`. **Provei que a ampliação não foi grosseira** —
rodei a régua contra dez grafias:

| Grafia | Régua | Correto? |
| --- | --- | --- |
| `animate-[fade-in_0.3s]` (valor arbitrário) | **pega** | ✅ |
| `group-hover:animate-fade-in`, `md:animate-scale-in` | **pega** | ✅ |
| `invisible` | **pega** | ✅ |
| `animate-fade-out` (começa em opacidade 1) | passa | ✅ |
| `animate-slide-in-right`, `animate-bounce-cart` (só `transform`) | passa | ✅ |
| `fade-in-50`, `visible` | passa | ✅ |

**A âncora nova é a peça que mais vale aqui** (`:224-230`): ela lê
`packages/ui/tailwind.preset.ts` e prova que `fade-in`, `scale-in` e `slide-up` **existem mesmo**.
Sem ela, um `rename` no preset deixaria a régua proibindo classe inexistente — que é como um guarda
envelhece sozinho e ninguém descobre.

**O guarda irmão da feature `40` recebeu a mesma ampliação** (`heroSemOpacidadeZero.test.ts:68-79`),
com os mesmos sensores e os mesmos pares negativos.

## 3 · R3 — recuo sem operador → **FECHADA**

**Reinjeção dos dois mutantes, contra `surfaceArtSingleOwner.test.ts`:**

| # | Escrita em `HeroCarouselEditor.tsx` | Rodada 2 | Rodada 3 |
| --- | --- | --- | --- |
| **P1** | `[item.image_mobile_url, item.image_url].find(Boolean) ?? null` | sobrevivia | **✅ morto** |
| **P2** | `let image = …mobile_url` / `if (!image) image = …image_url` | sobrevivia | **✅ morto** |

`ARRAY_DAS_DUAS` e `REATRIBUICAO` entraram em `RECUO_A_MAO` (`:209-210`). Duas escolhas de precisão
que valem o registro:

- **A retrorreferência** (`if\s*\(\s*!\s*(\w+)\s*\)\s*\1\s*=`) é o que torna `REATRIBUICAO`
  específica: sem ela, todo `if (!algo)` perto de um nome de arte viraria falso positivo. O par
  negativo está em `:451-461` (`if (!categoria) return item.image_url` **não** é acusado).
- **O ponto antes de cada nome** em `ARRAY_DAS_DUAS` separa "escolher entre as duas artes" de "listar
  os nomes dos dois campos". **Achado real ao fechar**, e registrado no arquivo (`:196-206`): a
  primeira versão acusava `MenuBannerEditor.tsx:103`, que percorre
  `['badge', 'title', 'subtitle', 'image_desktop', 'image_mobile']` só para limpar campo vazio antes
  de gravar. É lista de nomes, não decisão — e um guarda que a acusasse mandaria consertar código
  correto, que é como guarda vira ruído e depois vira allowlist. Há sensor guardando isso
  (`:470-482`).

---

## 4 · Gate da rodada 3 — e a aritmética da árvore compartilhada

⚠️ **Outra sessão editou este mesmo working tree durante a medição**, na feature de notificações.
A contaminação **cresceu enquanto eu media**: no início eram 5 arquivos, ao fim eram 10 mais 3 não
rastreados. Por isso a contagem foi **reconciliada arquivo a arquivo** contra a rodada 2, e não
lida do total.

| Workspace | Medido na árvore | Alheio | **Feature 41** | Declarado | Confere? |
| --- | --- | --- | --- | --- | --- |
| store | 2668 / **170** | `authSenderDomain.test.ts` (+4 / +1 arq.) | **2664 / 169** | 2664/169 | ✅ |
| backoffice | 2004 / 119 | `AdminSettingsPage.test.tsx` 15 → 17 (+2) | **2002 / 119** | 2002/119 | ✅ |
| core | 1811 / 70 | — | **1811 / 70** | 1811/70 | ✅ |
| functions | 370 / 7 | — (as edições em `send-email` não mudaram contagem) | **370 / 7** | 370/7 | ✅ |
| catalog-import | 512 / 23 | — | **512 / 23** | 512/23 | ✅ |
| **Total** | | | **7359 / 388** | 7359/388 | ✅ |

**Exit 0 nos cinco, sem uma única flake.** A reconciliação por arquivo fecha exatamente:

| Arquivo | Rodada 2 → 3 | Dono |
| --- | --- | --- |
| `surfaceArtSingleOwner.test.ts` | 16 → 21 (**+5**) | 41 (R3) |
| `heroCarouselSemOpacidadeZero.test.ts` | 16 → 21 (**+5**) | 41 (R2) |
| `heroSemOpacidadeZero.test.ts` | 12 → 14 (**+2**) | 41 (R2, guarda irmão da `40`) |
| `AdminHomePage.test.tsx` | 34 → 40 (**+6**) | 41 (R1) |
| `authSenderDomain.test.ts` | — → 4 | **outra sessão** |
| `AdminSettingsPage.test.tsx` | 15 → 17 | **outra sessão** |

Store +12, backoffice +6 — **+18 da feature 41, e nenhum arquivo de teste novo.** Nenhuma queda.

- `npx tsc --noEmit -p apps/store/tsconfig.app.json` → **exit 0**
- `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` → **exit 0**
- `pnpm lint` → store 2/1 · backoffice 25/4 = **27 / 5**, baseline intacta
- `pnpm build` → **exit 0**
- `git diff --name-only f1e973d..b6abe64 -- packages/core/src/payment/` → **vazio** (a feature inteira,
  não só o commit da rodada)

---

## 5 · Sensor acumulado — 48 mutações nas três rodadas

| Rodada | Injetadas | Mortas | Sobreviventes ao fim da rodada |
| --- | --- | --- | --- |
| 1 | 21 | 17 | **4** (S1, S2, S3, S4) |
| 2 | 19 | 11 | **8** (N1–N4, P1, P2, A4, A5) — os 4 da rodada 1 morreram aqui |
| 3 | 8 (reinjeções) | **8** | **0** |
| **Total** | **48** | **48** | **0 no HEAD** |

**Todos os 12 mutantes distintos que já sobreviveram a alguma rodada morrem em `b6abe64`.**

### Observações residuais — nenhuma é achado

Registro por honestidade, não por gravidade. Nenhuma das duas é comportamento errado nem exige ação:

1. **A âncora do preset prova o nome, não o `opacity: "0"`.** `heroCarouselSemOpacidadeZero.test.ts:228`
   é `expect(preset).toContain('"fade-in"')`. O comentário ao lado promete duas coisas — que a classe
   não seja renomeada **e** que não perca o `opacity: 0` —, e a asserção cobre só a primeira. Se
   alguém tirasse o `opacity: "0"` do keyframe, a régua passaria a proibir uma classe inofensiva. É
   falso-positivo, não falso-negativo: falha para o lado seguro.
2. **A classe `hidden` (`display: none`) no `<img>` não é acusada** por `nasceInvisivel` (medido:
   exit 0). O teste de `BNR-39` a checa, mas no `<Link>` do slide, não no `<img>`. Diferente de
   `invisible` e de `fade-in`, `hidden` não é mecanismo de **entrada** — ninguém a usa para animar —,
   então o cenário de defeito realista não existe. Deixo registrado para quem um dia ampliar a régua
   de novo saber que este canto não está coberto.

### Higiene de commit — observada nas três rodadas

Vale o registro porque aconteceu **duas vezes** e a árvore é compartilhada:

- `5f2cbbb` (rodada 2) levava junto 304 linhas de `.specs/features/43-*`, de outra feature. Foi
  corrigido por `amend` em `2370054`.
- `b6abe64` (rodada 3) leva em `.specs/STATE.md` a decisão **`AD-032`** e o handoff da feature `42`
  (**53 linhas acrescentadas**), que são da outra sessão. **Não afeta código nem teste** e não muda o
  veredito, mas o commit da `41` carrega estado de projeto que não é dela.

---

## 6 · Checagem ancorada na spec — estado final

Nenhuma linha mudou entre a rodada 2 e a 3: as ressalvas eram de força de teste, não de cobertura.
Estado final, com a evolução das três rodadas:

| Requisito | R1 | R2 | R3 |
| --- | --- | --- | --- |
| BNR-01, 03, 06, 07, 10..24, 26, 28..31, 33..38, 42, 43, 45..51 | ✅ | ✅ | ✅ |
| BNR-18, 25, 26, 37 (proxy de forma declarado) | ✅ | ✅ | ✅ |
| BNR-02, 05, 08, 09, 44, 52 | ⚠️ indireta | ✅ | ✅ |
| BNR-04, 32, 39 | ❌ GAP | ✅ | ✅ |
| **BNR-40, BNR-41** | ❌ **AC reprovada** | ✅ (junção sem prova) | ✅ **junção provada** |
| BNR-27 | ⚠️ desvio declarado | ⚠️ | ⚠️ desvio declarado |

**50/52 ✅ · 2 desvios declarados nos dois lugares (spec e código) · 0 GAP.**

Os dois desvios, confirmados como corretamente declarados e **não** contados como achado:

- **`BNR-27`** (destino externo em nova aba) — inalcançável: `ctaHrefRefusal` recusa endereço que não
  comece com `/`. `SPEC_DEVIATION` em `HeroCarousel.tsx:41-46` **e** na tabela de suposições da spec.
- **`BNR-39`** (slide oculto sai do teclado) — a AC foi escrita para trilho **transladado**; com
  trilho de rolagem o estado não existe. `SPEC_DEVIATION` em `HeroCarousel.tsx:32-39`, **e** a
  propriedade que ele afirma é asserida em `HeroCarousel.test.tsx:383-417`, com régua de token exato.

---

## 7 · Qualidade de código (rodada 3)

| Princípio | Status | Nota |
| --- | --- | --- |
| Código mínimo | ✅ | **Zero linha de produção** na rodada 3 — só teste e régua de guarda |
| Correção alcança a causa, não o sintoma | ✅ | R2 fechou pelo caractere que faltava, e ganhou âncora que lê o preset; R3 pela forma sem operador, com retrorreferência para não virar ruído |
| Guardas com par negativo | ✅ | `animate-bounce-cart`, `animate-slide-in-right`, `fade-in-50`, `zoom-in-95`, `visible`, `if (!outra)`, array de uma arte só, lista de nomes de campo |
| Falso positivo achado e tratado | ✅ | `MenuBannerEditor.tsx:103` — registrado no arquivo com sensor, em vez de virar allowlist |
| Correção alcança o guarda irmão | ✅ | `heroSemOpacidadeZero.test.ts` ampliado junto, terceira vez que a lição aparece |
| Sem queda de contagem | ✅ | +18, nenhum arquivo novo |
| `payment/` intocado | ✅ | na feature inteira |
| Higiene de commit | ⚠️ | `b6abe64` carrega `AD-032` e o handoff da `42`, de outra sessão |

---

## 8 · O que continua pendente — declarado, não é achado

- **A prova em navegador.** É a única pendência real que sobra, e **nenhuma rodada de verificação
  automatizada a fecha**: jsdom devolve 0 para toda medida de layout, então `BNR-18` (ausência de
  rolagem horizontal do `body`), `BNR-26` (CLS) e `BNR-37` (o gesto de arrasto sem sequestrar a
  rolagem vertical) são **proxy de forma** — corretamente declarados como tal em `HeroCarousel.test.tsx:7-14`,
  e ainda não substituídos por medida real. Os Success Criteria da spec pedem **390×844, Slow 4G e
  CPU 4×**, com CLS ≤ 0,1 e LCP não pior que a medição da feature `40`.
- **Nada contra o Supabase hospedado.** A migration foi probeada no banco local pelo autor; o
  `Supabase Deploy` a aplica no push em `master`. **O menu do banner nasce desligado**: nenhuma seção
  `hero_carousel` existe até a Adri acrescentar uma — é passo de operação, no mesmo formato do
  interruptor do frete grátis (`AD-027`).

---

# RODADA 2 — histórico (`3d7e23a..2370054`)

**Veredito: ✅ PASS com ressalvas.** Os seis achados da rodada 1 fechados; 8 mutantes novos, todos de
força de teste, nenhum de comportamento errado.

- **Achado 1 (BLOCKER) fechado**: `HomeSectionRow.tsx` perdeu o `indelevel` e o cadeado; toda seção
  ganhou interruptor e botão Remover; `AdminHomePage` passou a consumir `deleteSection`. A asserção
  que defendia a trava foi **invertida, não afrouxada** (`HomeSectionList.test.tsx:121-131` diz isso
  por escrito e aponta onde a invariante passou a ser provada). 5 mutantes de confirmação, 5 mortos.
- **Achados 2–6 fechados**: as pausas passaram a `INTERVAL * 2` com caso de **contraste** ancorando o
  bloco; as duas réguas de guarda ampliadas com sensor por furo; `BNR-39` com `SPEC_DEVIATION` **e**
  asserção; as seis ACs sem evidência ganharam asserção de desfecho.
- **Ressalvas levantadas**: **R1** — a junção na página funcionava sem prova (A4, A5 sobreviviam à
  suíte inteira do backoffice); **R2** — `animate-fade-in`, `animate-scale-in`, `animate-slide-up` e
  `invisible` furavam a régua de opacidade; **R3** — recuo sem operador furava a régua de dono único.

---

# RODADA 1 — histórico (`f1e973d..3d7e23a`)

**Veredito: ❌ FAIL.** 41/52 ACs, 4 GAPs (5 ACs), 21 mutações com 4 sobreviventes.

1. **BLOCKER — `AD-029` parou no banco** (`BNR-40`, `BNR-41`). `HomeSectionRow.tsx:142` mantinha
   `const indelevel = section.type === 'hero'`, com cadeado no lugar do interruptor, e
   `HomeSectionList.test.tsx:123` **asseria a trava** — a suíte estava verde a favor do comportamento
   que a spec mandava remover. `deleteSection` existia no hook e **nenhuma tela o consumia**. A Adri
   arrastaria o Banner principal para o topo e o hero continuaria acima dele — o problema literal do
   *Problem Statement*. `tasks.md` não mapeava `BNR-40`/`BNR-41` a task nenhuma.
2. **S1/S2 — as duas pausas não discriminavam** (`BNR-32`): `INTERVAL * 3` sobre 3 slides devolve o
   índice a 0, o mesmo valor de um carrossel pausado.
3. **S4 — a régua de opacidade guardava a grafia** (`BNR-25`): `animate-in fade-in`, `opacity-[0]` e
   um `opacity-0` no invólucro passavam. O guarda irmão da `40` tinha o mesmo furo.
4. **S3 — a régua de dono único era por linha** (`BNR-22`): o `||` quebrado — a formatação que o
   **Prettier produz sozinho** — passava inteiro.
5. **`BNR-39` sem implementação e sem asserção.**
6. **Sete ACs sem evidência própria.**

### O que a rodada 1 já dava como bom, e as três confirmaram

Catálogo de 11 tipos casando com o `check` nos dois sentidos, com âncora de contagem; recusas
comparadas **literalmente** contra as frases da spec e na ordem que a spec declara; a arte por
dispositivo com **um** dono em `core/media`, provada por igualdade de veredito entre `heroSlideArt` e
`surfaceArt`; rendição pelo dono único com arte externa saindo inalterada; `eager`+`fetchpriority` só
no primeiro slide; vaga com altura antes da imagem; giro de 6 s e `prefers-reduced-motion`; bolinhas
rotuladas pelo **nome** do banner; `TAP_44` em todo controle; migration idempotente, sem escrita de
dado e derrubando o guarda antigo nos dois sentidos; editor com aviso de proporção que **grava assim
mesmo**, falha de envio preservando o rascunho, teto com motivo em texto e destino apagado nomeado; e
a prévia continuando a ser a loja num iframe.

---

## Summary

**Overall**: ✅ **Ready.**

**O arco das três rodadas.** A rodada 1 encontrou uma feature cuja metade de loja estava pronta e bem
guardada, e cuja metade de painel parava no banco: a `AD-029` foi aplicada na migration e não na
única porta que a Adri tem. A rodada 2 fechou isso e mostrou que três coisas continuavam verdes por
acidente — duas asserções de pausa cujo valor esperado a própria aritmética produzia, e dois guardas
que guardavam a grafia em vez da regra. A rodada 3 fechou o que sobrava: **a junção que ninguém
provava** (o formato do achado nº 1 um nível acima), o hífen que faltava na régua de opacidade, e o
recuo sem operador.

**O que fica de lição, e já está no `CLAUDE.md`**: guarda ancorado em sintaxe guarda a sintaxe —
terceira ocorrência neste projeto, e desta vez a régua era cega justamente ao que o **próprio preset**
declara. E asserção cujo valor esperado a aritmética do teste produz sozinha não discrimina nada.

**O que sobra**: a prova em navegador. Tudo o que esta feature promete em CLS, LCP e arrasto é
exatamente o que jsdom não mede, e as três asserções correspondentes são proxy de forma — declaradas
como tal, e ainda não substituídas por medida real em 390×844, Slow 4G, CPU 4×.
