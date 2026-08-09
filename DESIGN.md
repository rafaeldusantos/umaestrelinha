# DESIGN.md — Identidade Uma Estrelinha

Sistema visual da **loja pública** (`apps/store`). Deriva dos tokens do arquivo Paper
"Uma Estrelinha" — os mesmos de `../landing-pages/src/styles/global.css` — e dos boards
`5MC-0` (chrome desktop), `6AU-0` (chrome mobile), `78R-0` (marca) e `734-0` (avatar e favicon).

> **Escopo.** Este documento descreve **apenas a loja**. O backoffice (`apps/backoffice`) continua na
> paleta roxo/rosa/navy herdada, agora sob os tokens `--estrelinha-admin-*` de
> `@estrelinha/ui/styles.css`, com **valores inalterados** — ver
> [Escopo e convivência](#7-escopo-e-convivência).

---

## 1. A decisão central: o que a loja vende muda como ela pode falar

A loja transforma cinzas de cremação, leite materno, mecha de cabelo, pelo de pet e dente de leite em
joia. Quem abre esta página muitas vezes acabou de perder alguém.

Isso é **restrição de desenho**, não tom de marketing:

- **Nada grita.** A cor de ação é um azul-ardósia profundo, não uma cor quente saturada. O ouro é
  detalhe, nunca superfície inteira.
- **Nada apressa.** Sem contagem regressiva, sem "últimas unidades", sem selo de urgência.
- **Nada comemora.** Sem emoji comemorativo, sem confete, sem exclamação de festa.
- **Hierarquia vem de escala e de peso, não de cor.** Um título serifado grande em `ink` ao lado de
  um corpo em `ink-soft` já resolve; pintar de ouro para "destacar" é o erro típico aqui, e ele
  reprova em contraste (2,66:1).

A base é **quente e clara**: um chão de papel levemente creme, o branco como card e um neutro terroso
para contorno de controle. O peso vem do azul-ardósia, e o ouro entra em fio, moldura e preenchimento
pequeno.

---

## 2. Paleta

**Todos os números abaixo foram medidos** (WCAG 2.1) a partir dos hex de `app/App.css`, e são os
mesmos que `shared/lib/__tests__/contrast.test.ts` afere a cada execução da suíte.

### Sobre o chão `ground #FAF8F4`

| Token | Hex | Sobre `ground` | Papel na tela | Proibido |
|---|---|---:|---|---|
| `ground` | `#FAF8F4` | — | Chão de toda a loja | Nunca texto |
| `ground-deep` | `#F1EBE1` | 1,12 | Faixa de seção, palco de foto | Nunca texto |
| `surface` | `#FFFFFF` | 1,06 | Card, painel, campo | Nunca texto |
| `line` | `#E6DFD4` | 1,25 | Divisor, contorno de card | **Nunca borda de campo** |
| `field` | `#8C8073` | **3,63 ✓** | **Borda de input e de controle** | Nunca texto de corpo |
| `ink` | `#23303A` | **12,73 ✓ AAA** | Texto primário, superfície escura | — |
| `ink-soft` | `#54616B` | **6,00 ✓ AA** | Texto secundário — **é o piso** | — |
| `primary` | `#34495E` | **8,76 ✓ AA** | Ação, link, preço, aba ativa | — |
| `primary-strong` | `#283A4A` | **11,03 ✓ AAA** | Hover/pressed, faixa do header | — |
| `on-primary` | `#F7F3EC` | 1,04 | Texto **sobre** `primary` (8,40 ✓) | Nunca sobre claro |
| `accent` | `#B8945F` | **2,66 ✗** | Preenchimento, fio, moldura, ícone | **Nunca texto sobre claro** |
| `accent-strong` | `#A07E4C` | 3,55 | Detalhe gráfico ≥24px, borda decorativa | Nunca corpo |
| `serenity` | `#DCE6EC` | 1,19 | Faixa e palco pontuais | Nunca texto |
| `whatsapp` | `#25D366` | 1,87 | **Só** o botão do WhatsApp | Nunca texto |

### Dentro de superfície escura e de superfície `primary`

| Par | Razão | Veredito |
|---|---:|---|
| `on-primary` sobre `primary` | **8,40** | ✓ AA — é o rótulo do botão primário |
| `accent` sobre `ink` | **4,78** | ✓ AA — **o único uso de texto do acento em toda a loja** |
| `accent-strong` sobre `ink` | 3,59 | ✗ — não herda a licença do irmão |
| `primary` sobre `ink` | **1,45** | ✗ — um CTA `primary` no rodapé escuro **desaparece** |
| `ground` / `on-primary` sobre `ink` | 12,73 / 12,21 | ✓ AAA |
| `ink` sobre `accent` | **4,78** | ✓ AA — é o rótulo dentro de superfície ouro |
| `primary-strong` sobre `accent` | **4,15** | ✗ — passa de 3, **reprova em 4,5** |

### As três proibições, e por que cada uma existe

**1. `accent` nunca é texto sobre claro.** 2,66:1. Ele é preenchimento, fio, moldura e ícone. O único
lugar onde ele é texto é **sobre `ink`** (4,78:1). `accent-strong` melhora para 3,55 e continua fora:
3:1 só vale para elemento gráfico e texto ≥24px em negrito.

**2. `accent` com OPACIDADE dentro de superfície `accent` também reprova.** Este foi defeito real,
achado no passe visual da feature 20 — e é o mais traiçoeiro dos três, porque a classe parece
inofensiva. Medido, `ink` sobre uma superfície `accent`:

| opacidade | razão |
|---:|---:|
| 100% (`text-estrelinha-ink`) | **4,78 ✓** |
| 80% (`text-estrelinha-ink/80`) | **3,50 ✗** |
| 45% (`text-estrelinha-ink/45`) | **1,95 ✗** |

Dentro de uma banda ouro, **texto é chapado**. `accentText.test.ts` varre o fonte e falha quando
aparece `ink` com opacidade dentro de superfície `accent`, e quando texto ouro aparece fora de uma
lista curta com a superfície escrita ao lado.

**3. Borda de controle é `field`, nunca `line`.** A WCAG 1.4.11 pede **3:1** de contorno de controle
e `line` mede **1,25:1** — é divisor, não borda. `field #8C8073` nasceu nesta identidade justamente
porque o DS herdado das landing pages quase não tem formulário e os dois candidatos existentes
reprovavam (`line` 1,25 e `accent` 2,66). `fieldBorder.test.ts` varre `<input>`, `<textarea>`,
`<select>` **e o `<Input>` do shadcn** — foi varrer só as tags minúsculas que deixou 16 campos com
1,19:1 em produção por uma feature inteira, com o teste verde o tempo todo.

### O chão não entra sozinho

Trocar o fundo da loja sem remedir a faixa de seção **apaga toda seção**: a regra continua no CSS e
não aparece na tela. `ground-deep` sobre `ground` mede **1,12:1** — pouco, e é o mínimo que separa
duas superfícies claras; `contrast.test.ts` congela o caso: a faixa da identidade anterior sobre este
chão daria **1,00:1**, luminância idêntica.

### A paleta mora em DOIS arquivos

`app/App.css` (as variáveis) e `tailwind.config.ts` (as classes). Divergir **não quebra nada**: não
quebra build, não quebra tipo, não quebra teste de componente — a loja renderiza duas paletas ao mesmo
tempo. `palette.test.ts` lê os dois do disco e compara token a token.

Há ainda um **terceiro** lugar onde a cor vive: os tokens HSL do shadcn, no mesmo `App.css`. Eles não
carregam o prefixo da marca, então nenhuma busca por nome os encontra — e foi assim que `<Dialog>`,
`<Select>` e `<Input>` continuaram rosa dentro de uma loja ardósia até alguém abrir uma modal. Ao
mexer na paleta, **converta os três**.

---

## 3. Tipografia

Duas famílias, com papéis que não se sobrepõem.

| Família | Classe | Papel | Pesos |
|---|---|---|---|
| **Libre Baskerville** | `font-display` / `font-heading` | Títulos, hero, números grandes | **400 e 700, mais o itálico de 400** |
| **Outfit** | `font-body` (padrão do `body`) | Corpo, navegação, metadados, formulários, eyebrow | 300–700 (variável) |

**Libre Baskerville não tem 500 nem 600.** Pedir um peso que a família não tem faz o navegador
sintetizar falso-negrito em vez de baixar. Título é **700**.

**O fallback do display é SERIFADO (Georgia), não `system-ui`.** Enquanto a webfont não chega, um
título serifado caindo em sans muda de família **e** de largura, e a página inteira se remonta quando
a fonte carrega. É a mesma razão pela qual os cinco templates de e-mail usam Georgia: caixa de entrada
não carrega webfont, então a pilha de fallback **é** a decisão de design.

**Nenhuma fonte é a marca.** O logotipo é traço vetorial (`shared/ui/brand`), então não existe "fonte
do logotipo" para carregar — uma requisição a menos no 4G de quem abre a loja no celular.

Piso: **nada abaixo de 11px**, e 11–12px só em caixa alta com tracking aberto.

---

## 4. Forma

### Raio — cada valor nomeia UMA função

| Classe | Valor | Função | Uso |
|---|---|---|---|
| `rounded-sm` | **6px** | **ação e miúdo** | Botão, CTA, submit, thumbnail, selo |
| `rounded-md` | 12px | **campo** | Input, textarea, select |
| `rounded-lg` | 20px | **caixa** | Card de produto, card de seção, banner |
| `rounded-pill` | 999px | **rótulo** | Badge, chip de tema, tag, campo de busca |
| `rounded-full` | 50% | **disco** | Ícone, avatar, seta de carrossel |

**Ação é retângulo de 6px; pílula é rótulo.** A separação ação/rótulo/disco sobreviveu à troca de
identidade — só o valor da ação mudou. `buttonShape.test.ts` varre o fonte e falha quando
`rounded-pill` aparece num elemento de ação; a allowlist tem o motivo escrito em cada entrada, e existe
para **forçar quem puser uma pílula numa ação a dizer por que aquilo é rótulo**.

> **A chave custom `button` (14px) não existe mais, e não deve voltar.** Ela nasceu para contornar um
> conflito com o `<Button>` do shadcn, que traz `rounded-md` na base: o `tailwind-merge` **não**
> colapsa token custom contra t-shirt size (medido: `twMerge('rounded-md','rounded-button')` devolve
> as duas classes), mas **colapsa dois t-shirt sizes** (`twMerge('rounded-md','rounded-sm')` → `sm`).
> Como a ação virou `rounded-sm`, a maquinaria inteira caiu.
>
> `shared/ui/Button` **permanece** — ele carrega as variantes, os tamanhos e o `min-h-11` (o alvo de
> toque de 44px), e nada disso vem do shadcn.

### Sombra

Nunca cinza neutro: elevação em ardósia.

| Classe | Valor | Uso |
|---|---|---|
| `shadow-estrelinha-soft` | `0 14px 28px -10px rgba(52,73,94,.16)` | Card elevado |
| `shadow-estrelinha-lift` | `0 26px 50px -12px rgba(52,73,94,.22)` | Palco do hero |
| `shadow-estrelinha-ink` | `0 16px 30px -8px rgba(35,48,58,.16)` | Elemento sobre superfície escura |

**Não existem gradientes na identidade da loja.** Cor chapada é a regra. (O `gradient-cta` do
backoffice é outra paleta e outro escopo.)

---

## 5. A marca

`shared/ui/brand` — SVG **inline**, nunca `<img src>`: o header não pode ter estado de carregamento.

### A escada, medida

A marca é **monoline**: todo desenho é traço, e o traço é uma **fração fixa da largura**. Reduzir não
borra a letra — **apaga a linha**. Abaixo de ~1px o traço não ocupa um pixel inteiro e sai como cinza
de antialias, não como a cor da marca. Daí os três pisos:

| degrau | componente | traço mais fino | piso | rende no piso |
|---|---|---|---:|---|
| 1 | `EstrelinhaLockup` | assinatura 1,5 em 900 = 0,167% | **600px** | 1,00px |
| 2 | `EstrelinhaSignature` | marca 2,4 em 450 = 0,533% | **190px** | 1,01px |
| 3 | `EstrelinhaSymbol` | marca 2,46 em 100 = 2,46% | **48px** | 1,18px |

Cada degrau **cai para o de baixo abaixo do próprio piso** — nunca renderiza uma marca apagada.

**O lockup completo não aparece em nenhuma tela da loja, e isso é resultado, não descuido.** A coluna
de marca do rodapé tem 337px e a viewport de projeto tem 390: nenhuma comporta 600px. A 48px de altura
o lockup mediria 176px de largura, **424px abaixo do próprio piso**, com a assinatura em 0,29px. Ele é
o formato de e-mail, papelaria, embalagem — e do `og-image.png`, o único lugar do produto onde ele
cabe (1200×630, marca a 720px).

O piso de 48px do símbolo **não é escolha nossa**: a nota do board diz *"use de 48px para cima"*, e
2,46% × 48 = 1,18px.

### `paths.ts` é gerado, nunca digitado

`_gen-paths.mjs` lê os SVGs de `.specs/brand/uma-estrelinha/` e gera o arquivo; um teste compara
**caractere a caractere** contra o SVG-fonte. São 10KB de coordenada — transcrever à mão só deforma a
letra sem quebrar nada visível.

**Um `<path>` por PAPEL DE TRAÇO.** Aqui o que divide os paths é a **espessura**, que é geometria; o
export do Paper vem partido por sub-elemento e é consolidado (lockup 8→4, assinatura 7→3, símbolo 4→2,
selo 6→4). `paths.test.ts` falha se **dois `<path>` do mesmo SVG tiverem a mesma espessura** — o
sintoma de um papel partido. `fill-rule="evenodd"` **não** se aplica: nada nesta marca preenche
(`fill="none"`), e o atributo entraria inerte sugerindo uma regra que não está valendo.

### Favicon

O ícone é o **símbolo reduzido**, em duas bases:

| base | escala que cabe | traço a 16px | onde |
|---|---:|---:|---|
| disco (r 50%) | 0,724 | 0,93px | — |
| squircle (r 28%) | 0,856 | 1,10px | — |
| **canto 6%** | 1,000 | **1,28px** | `favicon.svg` / `.ico` / `icon-512` |
| **quadrado sangrado** | 1,000 | **1,28px** | `apple-touch-icon` |

**A variável é quem faz o recorte**: canto próprio na aba, porque o navegador não arredonda favicon;
sangrado no iOS, porque o sistema aplica a própria máscara e arte pré-arredondada deixa sobra de canto.
O canto é quase reto porque o extremo deste desenho é a **ponta da estrela, na diagonal** — exatamente
onde um canto arredondado come área. Um squircle custaria 15% do traço.

**O selo circular NÃO é o favicon**, apesar de a spec o nomear: ele carrega anel e 25 glifos de
assinatura curva, que a 16px medem 0,23px e 0,08px — mancha cinza. O selo é ativo de carimbo, etiqueta
e embalagem.

---

## 6. Chrome e espaçamento

- **Uma barra de rodapé por vez.** Header + barra de compra + `MobileNav` empilhados somavam 197px —
  30% de um iPhone SE. `ownsBottomBar(pathname)` decide quem ocupa o rodapé; as duas barras têm a
  mesma altura (`BOTTOM_BAR_H`), e a reserva de espaço fica **depois do `<Footer/>`**.
- **O header se recolhe no scroll para baixo**, só no mobile, com `sticky` + `translate` — nunca
  `fixed`, nunca desmontar: assim ele segue ocupando os 64px no fluxo e esconder/mostrar **não causa
  reflow**. **A barra de compra nunca se esconde**: o CTA é a finalidade da página.
- **Alvo de toque ≥44px**, com dois auxiliares (`shared/lib/touchTarget`): `TAP_44` (44×44 centrado,
  para disco e botão quadrado) e `TAP_ROW` (44px de altura na largura do próprio rótulo, para texto em
  fluxo). A exceção declarada são links de texto em fluxo com rótulo curto — esticar a largura de um
  link inline separaria a palavra da linha em que ela está escrita; é a exceção de texto inline da
  própria WCAG 2.5.8, e o eixo que importa para o polegar (a altura) está cumprido.
- **`body` nunca rola horizontalmente.** Conteúdo largo (tabela, lane, diagrama) scrolla dentro do
  próprio container.

---

## 7. Escopo e convivência

A loja e o painel usam **duas paletas ao mesmo tempo, no mesmo monorepo**:

| | loja | backoffice |
|---|---|---|
| tokens | `--estrelinha-*` | `--estrelinha-admin-*` |
| onde | `apps/store/src/app/App.css` + `apps/store/tailwind.config.ts` | `packages/ui/src/styles.css` + `packages/ui/tailwind.preset.ts` |
| valores | esta identidade | roxo/rosa/navy herdado, **inalterado** |

O sufixo `admin` existe para deixar claro que aquele namespace **não é a marca da loja** — evita que
código novo os use por engano. Re-skin do painel está fora de escopo: painel interno não carrega marca.

**A separação depende da ordem de dois imports** em `apps/store/src/main.tsx`: `App.css` **depois** de
`@estrelinha/ui/styles.css`. Inverter devolve a loja inteira à paleta do painel **sem quebrar nada** —
`importOrder.test.ts` guarda isso.

---

## 8. Checklist de revisão

Antes de abrir PR de UI da loja:

- [ ] Nenhum texto em `accent` sobre superfície clara — e nenhum `ink` **com opacidade** dentro de
      superfície `accent`.
- [ ] Todo controle de formulário com borda `field`, nunca `line`.
- [ ] Ação em `rounded-sm`; pílula só onde é rótulo.
- [ ] Token novo declarado nos **dois** arquivos (e nos HSL do shadcn, se for cor de componente).
- [ ] Alvo de toque ≥44px, via `TAP_44` ou `TAP_ROW`.
- [ ] Prova em **390×844** antes de qualquer ajuste de 1440.
- [ ] `body` sem rolagem horizontal na rota nova.
- [ ] Nenhuma linguagem festiva, de urgência ou de trocadilho — ver §1.
- [ ] `pnpm --filter @estrelinha/store test` verde: os guardas de identidade estão todos lá.
