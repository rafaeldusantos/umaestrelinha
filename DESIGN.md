# DESIGN.md — Identidade Nanita (v2 · papelaria)

Sistema visual da **loja pública** (`apps/store`). Deriva das pranchas
`18 · Logotipo Nanita v2 (vetor) + Paleta`, `19b · Favicon — variações de base`,
`20b · Onde cada cor entrou na tela`, `21 · Wordmark para o header`,
`22 · Home Desktop` e `23 · Home Mobile`, no Paper.

> **Escopo.** Este documento descreve apenas a loja. O backoffice
> (`apps/backoffice`) continua na paleta antiga `--nana-*` definida em
> `@nanapin/ui/styles.css` — ver [Escopo e convivência](#7-escopo-e-convivência).

---

## 1. A decisão central: papel, não branco

A v1 já tinha resolvido o problema de ter cor demais: seis matizes concorrentes
viraram uma família de rosa. A v2 resolve o problema seguinte — **o chão**.

Com fundo branco, a loja tinha um único tom de superfície (`#FFEFF6`) que quase
não se distinguia do fundo, e nenhum neutro que servisse de borda. O resultado
era uma página que só existia em duas camadas: branco e rosa.

A papelaria troca isso por **papel de chão, branco de card e um neutro quente**:

```
Papel        →   Folha nova   →   Mata-borrão   +   Papelão   +   Grafite
(o chão)         (o card)         (a faixa)         (a borda)     (o peso)
```

Regra que resume tudo: **o branco virou o card, não o chão. A fita só aparece
sobre grafite.**

### O achado que obriga a mexer em tudo junto

`--nanita-sugar` na v1 era `#FFEFF6`, que sobre Papel `#F9F1EE` dá **1,00:1** —
mesma luminância. Trocar o chão sem trocar a faixa de seção apaga toda superfície
da loja: a regra continua no CSS e simplesmente não aparece na tela.

**O chão novo não é uma troca isolada.** Ou entra junto com Mata-borrão e Dobra,
ou não entra. `shared/lib/__tests__/palette.test.ts` guarda isso com uma AC
própria (`sugar × paper ≥ 1,15`) e um segundo teste que prova que o valor da v1
falharia.

---

## 2. Paleta

Contraste medido sobre **Papel `#F9F1EE`**, WCAG 2.1. Os nomes de token vieram da
v1 e viraram apelidos: o que manda é o **papel** de cada cor.

| Token | Nome | Hex | Sobre Papel | Papel na tela | Proibido |
|---|---|---|---|---|---|
| `nanita-paper` | **Papel** | `#F9F1EE` | — | Chão de toda a loja | Nunca texto |
| — | **Folha nova** | `#FFFFFF` | 1,11 | Card, pílula, barra de navegação, campo | Nunca texto |
| `nanita-sugar` | **Mata-borrão** | `#F7D6E0` | 1,20 | Faixa de seção, palco de foto | Nunca texto |
| `nanita-border` | **Dobra** | `#EBDDD7` | 1,19 | Divisor, contorno de card, texto sobre Grafite | **Nunca borda de campo** |
| `nanita-rule` | **Papelão** | `#8F7268` | 3,95 ✓ | Borda de input e de controle | Nunca texto de corpo |
| `nanita-glaze` | **Carimbo** | `#F1678D` | 2,67 ✗ | Preenchimento, wordmark, CTA sobre Grafite | **Nunca texto sobre Papel** |
| `nanita-raspberry` | **Selo** | `#E93A6D` | 3,56 ✓ lg | Dot de status, ícone, detalhe gráfico ≥24px | Nunca corpo pequeno |
| `nanita-jam` | **Carmim** | `#A62348` | 6,38 ✓ AA | Preço, link, botão primário, aba ativa | — |
| `nanita-plum` | **Carbono** | `#7E5769` | 5,46 ✓ AA | Texto secundário. **É o piso de contraste** | Não usar tom mais claro para texto |
| `nanita-ink` | **Grafite** | `#2E2028` | 13,92 ✓ AAA | Texto primário, superfície escura, estrutura | — |
| `nanita-butter` | **Fita** | `#FFC95C` | 1,37 ✗ | Badge, destaque temporal | **Só sobre Grafite** (10,17:1) |

### Por que `border` e `rule` são dois tokens

Borda de controle precisa de 3:1 (WCAG 1.4.11) e **nenhum tom claro chega lá**
sobre Papel: Dobra dá 1,19 e `#C4A79D` dá 2,01. Duas funções, dois valores.

Na prática: `--border` (Dobra) é divisor e contorno de card; `--input` (Papelão)
é contorno de campo. `shared/lib/__tests__/fieldBorder.test.ts` varre o fonte e
falha se um `<input>` voltar a usar Dobra.

### Onde cada cor entrou (prancha 20b)

Esta é a régua que decide as dúvidas caso a caso:

- **Carimbo** — wordmark, botton na foto, CTA dentro da faixa Grafite. Nunca texto sobre Papel.
- **Selo** — contador da sacola e os dots. O que o Carimbo perderia por contraste.
- **Carmim** — preço, "Ver tudo", aba ativa, botão do hero. **Todo o dinheiro da tela.**
- **Carbono** — texto de apoio, placeholder, rótulo da nav, descritor do lockup sobre Papel.
- **Grafite** — títulos, disco da sacola, faixa do kit, selos de badge.
- **Fita** — "3 por R$ 25", "−20%", "ÚLTIMAS 4", eyebrow do kit. Sempre sobre Grafite.

### Como escolher

1. **Precisa ser lido?** → Carmim, Grafite ou Carbono. Ponto.
2. **É preenchimento?** → Carimbo ou Selo.
3. **É borda de campo?** → Papelão. Nunca Dobra.
4. **É destaque temporal (drop, contagem, oferta)?** → Fita, e só sobre Grafite.
5. **Na dúvida** → Papel de chão, branco no card, Grafite no texto, Carmim na ação.

### Véus sobre Grafite

Sobre `nanita-ink` a paleta clara não se usa como texto: usam-se **Dobra** (para
o que precisa ser lido) e véus de branco (para hierarquia).

| Uso | Valor |
|---|---|
| Texto de leitura sobre Grafite | `text-nanita-border` (Dobra, 11,72:1) |
| Texto de apoio | `text-white/70` |
| Legenda / metadados | `text-white/50` |
| Superfície elevada | `bg-white/10` |
| Divisória | `border-white/[0.12]` |

Os acentos coloridos permitidos sobre Grafite são **Carimbo** (5,22:1 — títulos
de coluna do rodapé, CTA, wordmark) e **Fita** (10,17:1 — badge). **Carmim sobre
Grafite lê a 2,18:1 e é proibido** — é por isso que a variante escura do botão é
Carimbo.

---

## 3. Tipografia

Duas famílias, com papéis que não se sobrepõem.

| Família | Classe | Papel | Regra |
|---|---|---|---|
| **Fredoka** | `font-display` / `font-heading` | Títulos, preços, rótulos de botão, números grandes, a inicial marca-d'água | Peso 500–700. Tracking negativo em tamanho grande |
| **DM Sans** | `font-body` (padrão do `body`) | Corpo, navegação, metadados, formulários, eyebrow | Peso 400–700 |

### Berkshire Swash saiu

Na v1 ela tinha duas funções: o wordmark "Nanita" e a inicial marca-d'água do
card de coleção. A v2 tirou as duas — **o wordmark virou SVG**
(`shared/ui/brand`) e a inicial saiu em **Fredoka 700** nos artboards 22/23.
Fonte carregada e não usada é payload morto, então ela também saiu do `<link>`
do Google Fonts. Onde havia um "N" em `font-logo`, hoje há o `NanitaMonogram`.

### Escala

| Papel | Desktop | Celular | Peso | Tracking | Família |
|---|---|---|---|---|---|
| Hero | 82px | 42px | 600 | `-0.035em` | Fredoka |
| Título de seção | 44px | 22px | 600 | `-0.03em` | Fredoka |
| Título de bloco | 26–30px | 24px | 600 | `-0.02em` | Fredoka |
| Título de card | 18–21px | 18px | 500–600 | `-0.02em` | Fredoka |
| Preço | 20px | 20px | 600 | — | Fredoka |
| Rótulo de botão | 15–17px | 15px | 600 | — | Fredoka |
| Corpo grande (subtítulo do hero) | 19px / 1.65 | 15px / 1.47 | 400 | — | DM Sans |
| Corpo | 15–17px | 13–15px | 400 | — | DM Sans |
| Eyebrow (`.nanita-eyebrow`) | 12px | 11px | 600–700 | `0.1em`, caixa alta | DM Sans |
| Metadado | 12–13px | 11px | 400–500 | — | DM Sans |

**Hierarquia vem de escala, não de cor.** Um título de 44px em Grafite ao lado de
um subtítulo de 17px em Carbono já resolve.

Piso: **nada abaixo de 11px**, e 11–12px só em caixa alta com tracking aberto.

---

## 4. Forma

### Raio — cada valor nomeia UMA função

Sobrescrito no `tailwind.config.ts` da loja para valer também nos componentes shadcn.

| Classe | Valor | Função | Uso |
|---|---|---|---|
| `rounded-sm` | 8px | **miúdo** | Thumbnail, selo retangular |
| `rounded-button` | **14px** | **ação** | Botão, CTA, submit |
| `rounded-md` | 16px | **campo** | Input, textarea, select |
| `rounded-lg` / `rounded-xl` | 24px | **caixa** | Card de produto, card de seção, banner |
| `rounded-pill` | 999px | **rótulo** | Badge, chip de tema, tag, campo de busca |
| `rounded-full` | 50% | **disco** | `+` do card, seta do carrossel, avatar, ícone |

**Botão é 14px. Pílula é rótulo.** Isto é o inverso da v1, que dizia "todo botão
é pílula" — e o motivo da troca é que pílula era a forma de *quatro* coisas
diferentes ao mesmo tempo, e a cliente não tinha como saber qual delas clica.

**O disco sobrevive** e continua sendo a forma-assinatura — o produto é redondo.
É a única exceção declarada à regra de ação.

`shared/ui/__tests__/buttonShape.test.ts` varre o fonte e falha quando
`rounded-pill` aparece num elemento de ação. A allowlist tem cinco arquivos, cada
um com o motivo escrito — ela existe para **forçar quem puser uma pílula numa
ação a dizer por que aquilo é rótulo**, não para amansar o teste.

> ⚠️ **`button` é a última chave da escala de raio, e isso é funcional.** O
> Tailwind emite os utilitários na ordem das chaves; o `<Button>` do shadcn traz
> `rounded-md` na base, e o `tailwind-merge` **não** colapsa token custom contra
> t-shirt size (medido: `twMerge('rounded-md','rounded-button')` devolve as duas).
> Com as duas classes no elemento, vence a última no CSS.

### Sombra

Nunca cinza neutro. Só elevação rosada (Selo) ou de Grafite.

| Classe | Uso |
|---|---|
| `shadow-nanita-soft` | Card elevado, pin secundário |
| `shadow-nanita-lift` | Ilustração do hero |
| `shadow-nanita-ink` | Elemento sobre Grafite |

**Não existem gradientes na identidade.** Cor chapada é a regra.

---

## 5. Componentes

### Botão — `shared/ui/Button`

A loja tem o **próprio** botão, e o motivo é mecânico: o `<Button>` do shadcn traz
`rounded-md` na base da `cva` e mora em `packages/ui`, compartilhado com o
backoffice. Aqui o raio está na base da nossa `cva`, então não há conflito para o
`tailwind-merge` resolver.

| Variante | Fundo | Texto | Borda | Quando |
|---|---|---|---|---|
| `primary` | `bg-nanita-jam` | branco | — | A ação principal. **Uma por tela** |
| `secondary` | transparente | Grafite | `border-2 border-nanita-ink` | Alternativa ao primário |
| `onInk` | `bg-nanita-glaze` | Grafite | — | Dentro de superfície Grafite |
| `inkSolid` | `bg-nanita-ink` | branco | — | Sobre superfície Carimbo (newsletter) |
| `ghost` | transparente | Grafite | — | Ação terciária |

Tamanhos `sm` · `md` · `lg`, rótulo em **Fredoka 600**, `min-h-11` (44px de alvo
de toque) em todos. Hover é `opacity`/`scale`, nunca mudança de matiz.

Todas as variantes carregam `border-2 border-transparent`: assim `secondary` só
troca a cor da borda e contorno e sólido ficam exatamente da mesma altura.

### Card de produto

```
┌──────────────────────┐
│ [selo]          [♡]  │  palco quadrado em MATA-BORRÃO, rounded-lg
│                      │  foto = única cor do card
│                 (+)  │  disco de GRAFITE, canto inferior direito
└──────────────────────┘
CATEGORIA                 eyebrow, Carbono
Nome do botton            Fredoka 18/500, Grafite
R$ 8,90   R$ 10,00        Fredoka 20/600 CARMIM + DM Sans 14 Carbono riscado
```

**Só o desconto ganha cor de dinheiro.** "Novo", "Últimas" e "Destaque" são
Grafite — senão a vitrine vira um mostruário de etiquetas coloridas disputando
atenção. Congelado em `ProductCardSurface.test.tsx`.

### Card de coleção

Ritmo fixo, **por posição**: **1º Carimbo → 2º Grafite → demais Mata-borrão**.
A inicial da categoria aparece em **Fredoka 700** como marca d'água translúcida
no canto superior direito, e a cor dela muda com o fundo (véu de branco sobre
Carimbo, Carbono chapado sobre Grafite, véu de Carimbo sobre Mata-borrão).

É regra de posição, não de categoria — `CategoryGrid.test.tsx` tem uma asserção
só para isso, porque um mapa `{ anime: rosa }` passaria em todas as outras.

### Cabeçalho de seção — `shared/ui/SectionHeading`

Uma só forma para a home e as listagens: título Fredoka Grafite (44/22),
subtítulo em Carbono, um link em Carmim à direita. Aceita `badge` (pílula Fita
sobre Grafite) e `action` (slot para as setas do carrossel).

### Superfícies não-Papel

Cinco blocos saem do chão, e é intencional que sejam poucos:

1. **Faixa de benefícios** (marquee) — Grafite. Separa o hero do resto.
2. **Card de contagem do drop** — Grafite, com Fita no dígito vivo.
3. **Tier destacado do kit** — Grafite, com número, preço e CTA em Carimbo.
4. **Newsletter** — Carimbo. O único bloco inteiramente rosa.
5. **Rodapé** — Grafite. Fecha a página.

### A marca — `shared/ui/brand`

A escada de redução da prancha 21, medida por rasterização:

| Componente | Piso | Onde |
|---|---|---|
| `NanitaLockup` | ≥ **140px** de largura | **Rodapé** da loja, papelaria, e-mail |
| `NanitaWordmark` | ≥ **110px** | **Header**, folha do menu, checkout, overlay de auth |
| `NanitaMonogram` | ≤ **48px** | Favicon, avatar, selo, marca d'água |

Cada um cai para o degrau de baixo quando pedem menos que o piso. Header e rodapé
usarem marcas diferentes **é a escada funcionando**: na altura de 40px o lockup
mede 116px de largura, 24px abaixo do próprio piso.

**SVG inline, nunca `<img src>`** — o wordmark do header não pode ter estado de
carregamento nem 404 possível, e `currentColor` só funciona inline.

**Sobre Grafite o descritor é Dobra**, não Carbono (2,55:1 ali, some).

**Cada cor é UM `<path>` com `fill-rule="evenodd"`.** É requisito, não estilo:
separar os subpaths pinta o miolo do `a`, do `P`, do `R`, do `O`, do `A` e do `D`
por cima do corpo, na mesma cor, e as letras saem maciças com a geometria intacta.

### Favicon

| Base | Haste a 16px | Destino |
|---|---|---|
| **B · squircle** (canto 28%) | 2,5px | `favicon.svg`, `favicon.ico`, `icon-512.png` |
| **C · quadrado sangrado** | 2,6px | `apple-touch-icon.png` (180×180) |

Duas bases para o mesmo N, e a variável é **quem faz o recorte**: o navegador não
recorta o favicon (ele precisa do próprio canto para não encostar na aba
vizinha), e o iOS aplica a própria máscara (arte pré-arredondada deixa sobra de
canto).

### Mascote — `NanaMascot`

A mascote é a **persona da criadora**, não a marca. Segue no 404, nos estados
vazios e na página Sobre. O que saiu na v2 foi o rosto dela do hero (que passou a
mostrar o produto) e da aba do navegador (que passou a mostrar o N).

---

## 6. Espaçamento

Escala do board: **4 · 8 · 16 · 24 · 40 · 64 · 96**.

| Contexto | Valor |
|---|---|
| Padding de seção | `py-10 md:py-14` |
| Gap entre título e conteúdo | 24px (16px no celular) |
| Gap dentro de um grupo | 4–8px |
| Gap entre grupos | 16–24px |
| Gap hero (texto ↔ arte) | 80px |
| Padding de card | 14px celular · 20–24px desktop |
| Padding de card destacado | 36–40px |

Aperte para agrupar, abra para respirar.

---

## 7. Escopo e convivência

| Onde | O quê | Quem consome |
|---|---|---|
| `packages/ui/src/styles.css` | `--nana-*` originais (roxo/rosa/navy) | **backoffice** |
| `apps/store/src/app/App.css` | `--nanita-*` + remapeamento dos `--nana-*` | **loja** |
| `apps/store/tailwind.config.ts` | namespace `nanita-*`, fontes, raios, sombras | **loja** |

**A paleta é declarada em dois arquivos, e eles precisam concordar.** Um valor
certo num lado e velho no outro não quebra build, nem tipo, nem teste de
componente: a loja renderiza duas paletas ao mesmo tempo e quem descobre é a
cliente. `palette.test.ts` lê os dois do disco e compara.

`App.css` é importado **depois** de `@nanapin/ui/styles.css` em
[main.tsx](apps/store/src/main.tsx). Inverter devolve a loja inteira à paleta do
backoffice — `importOrder.test.ts` guarda isso.

### Camada de compatibilidade

Os tokens `--nana-*` continuam definidos na loja, apontando para a papelaria:

```
--nana-violet → Carmim      --nana-bg      → Papel
--nana-pink   → Carmim      --nana-bg-alt  → Mata-borrão
--nana-sakura → Selo        --nana-card    → branco
--nana-yellow → Fita        --nana-text    → Grafite
--nana-dark   → Grafite     --nana-muted   → Carbono
```

As classes utilitárias antigas (`.gradient-cta`, `.glow-*`, `.neon-text-*`)
resolvem para cor chapada. **Código novo não deve usar nenhuma delas.**

### Cores que não são marca

`pages/CustomPinPage.tsx` mantém uma paleta ampla (roxo, ciano, arco-íris). Isso
é **conteúdo do cliente**, não identidade. Não normalizar.

O verde do WhatsApp em `WhatsAppFloat` também fica — é cor de marca de terceiro.

---

## 8. Checklist de revisão

Antes de considerar uma tela pronta:

- [ ] Existe **uma** ação primária em Carmim? Não duas.
- [ ] Algum texto está em **Carimbo, Mata-borrão ou Dobra** sobre Papel ou branco? Se sim, é bug de contraste.
- [ ] **Fita** aparece fora de superfície Grafite? Não pode.
- [ ] **Carmim** aparece sobre Grafite? Não pode — lê a 2,18:1. Use Carimbo.
- [ ] Borda de campo está em **Papelão**? Dobra num input dá 1,19 e não aparece.
- [ ] Algum botão ficou em **pílula**? Ação é 14px; pílula é rótulo.
- [ ] Algum disco virou 14px? O disco é a assinatura — `+`, setas e ícones ficam redondos.
- [ ] A hierarquia se sustenta em preto e branco? Se não, ela depende de cor demais.
- [ ] Berkshire Swash ou `font-logo` aparecem em algum lugar? Saíram na v2.
- [ ] Algum texto abaixo de 11px, ou 11–12px sem caixa alta?
- [ ] Títulos em Fredoka 600, corpo em DM Sans?
- [ ] Sombra cinza neutra em algum lugar?
- [ ] Sobrou algum `bg-nana-*` / `gradient-cta` em código novo?
- [ ] A tela foi vista em **390×844** antes de 1440?
