# Identidade Papelaria (Nanita v2) — Design

Referências de desenho: Paper, arquivo `Nanapin`, página `Home` —
**18 · Logotipo Nanita v2 (vetor) + Paleta**, **19b · Favicon — variações de base**,
**20b · Onde cada cor entrou na tela**, **21 · Wordmark para o header**,
**22 · Home Desktop — Nanita Personalizados**, **23 · Home Mobile — Nanita Personalizados**.

---

## 1. A decisão estrutural: trocar valor, não nome

`apps/store` consome o namespace `nanita-*` em ~190 arquivos. A v2 muda **o papel de cada cor**, não
a quantidade de papéis: continua havendo um rosa de preenchimento, um rosa legível, um tom profundo,
um secundário e uma superfície. Então os tokens **mantêm o nome e trocam o valor**, e ganham dois
vizinhos novos:

| Token | v1 (confeitaria) | v2 (papelaria) | Nome de desenho | Papel |
|---|---|---|---|---|
| `--nanita-paper` *(novo)* | — | `#F9F1EE` | Papel | Chão da página. Nunca texto. |
| — | `#FFFFFF` | `#FFFFFF` | Folha nova | Card, pílula, barra de navegação. |
| `--nanita-sugar` | `#FFEFF6` | `#F7D6E0` | Mata-borrão | Faixa de seção, palco de foto. Nunca texto. |
| `--nanita-border` | `#FFD7E7` | `#EBDDD7` | Dobra | Divisor e contorno de card. **Nunca borda de campo.** |
| `--nanita-rule` *(novo)* | — | `#8F7268` | Papelão | Borda de input e de controle (3,95:1). |
| `--nanita-glaze` | `#FF86B5` | `#F1678D` | Carimbo | Preenchimento, wordmark, CTA sobre Grafite. **Nunca texto sobre Papel.** |
| `--nanita-raspberry` | `#FF51B9` | `#E93A6D` | Selo | Dot, ícone, detalhe gráfico ≥24px (3,56:1). |
| `--nanita-jam` | `#B0176B` | `#A62348` | Carmim | Preço, link, botão primário, aba ativa (6,38:1 AA). |
| `--nanita-plum` | `#7A5C6B` | `#7E5769` | Carbono | Texto secundário. **É o piso** (5,46:1 AA). |
| `--nanita-ink` | `#2B1622` | `#2E2028` | Grafite | Texto primário, superfície escura (13,92:1 AAA). |
| `--nanita-butter` | `#FFC95C` | `#FFC95C` | Fita | Badge. **Só sobre Grafite** (10,17:1). Inalterado. |

**Por que os dois tokens novos existem.** `--nanita-border` (Dobra, 1,19:1 sobre Papel) não pode ser
borda de campo: a WCAG 1.4.11 pede 3:1 de contorno de controle, e **nenhum tom claro chega lá** sobre
Papel — testei `#C4A79D`, dá 2,01. Duas funções, dois valores. `--nanita-paper` existe porque o chão
deixou de ser `#FFFFFF` e o branco virou superfície: sem token, o chão seria hex solto em `body`.

**Por que não pode entrar em pedaços** (`PAP-03`): `#FFEFF6` sobre `#F9F1EE` dá **1,00:1** — mesma
luminância. Trocar o chão sem trocar `sugar` apaga toda faixa de seção da loja; a regra continua no
CSS e não aparece na tela. O AC `sugar × paper ≥ 1,15` é a guarda de teste contra exatamente isso.

**Sombra.** Os três nomes ficam; os valores recalibram do rosa velho (`#FF51B9`) para o Selo
(`#E93A6D`). Sombra é elevação, não identidade — renomear quebraria 10 usos sem devolver nada.

### Onde a paleta é declarada

Dois arquivos, e é obrigatório que concordem:

| Arquivo | O quê | Quem lê |
|---|---|---|
| `apps/store/src/app/App.css` | `--nanita-*`, remapeamento `--nana-*`, tokens shadcn em HSL | CSS bruto, componentes shadcn |
| `apps/store/tailwind.config.ts` | `colors.nanita.*`, `colors.nana.*`, raios, sombras | classes `bg-nanita-jam` etc. |

O teste `palette.test.ts` lê **os dois** e falha se divergirem — é o único jeito de o valor não ficar
certo num lado e velho no outro. `App.css` continua importado **depois** de `@nanapin/ui/styles.css`
(`PAP-09`); o teste também assere essa ordem em `main.tsx`.

---

## 2. Forma: botão deixa de ser pílula

Os artboards usam `--radius-button: 14px` em **todo** botão — hero, kit, lembrete, newsletter — e
mantêm `999px` em badge, chip, tag e campo de busca. A distinção não é decorativa: hoje pílula é a
forma de *quatro* coisas diferentes, e a cliente não tem como saber qual delas clica.

```
rounded-button  14px   AÇÃO       botão, CTA, submit
rounded-full    50%    DISCO      + do card, seta do carrossel, avatar, ícone do header
rounded-pill    999px  RÓTULO     badge, chip de tema, tag, campo de busca
rounded-md      16px   CAMPO      input, textarea, select
rounded-lg      24px   CAIXA      card de produto, card de seção, banner
rounded-sm      8px    MIÚDO      thumbnail, selo retangular
```

**O disco sobrevive** e continua sendo a forma-assinatura — o produto é redondo. É a única exceção
declarada na AC de `PAP-04`.

### `shared/ui/Button.tsx` — o componente novo

O problema a resolver: a loja tem **78 ocorrências de `rounded-pill`** em 45 arquivos e **30 usos do
`<Button>` do shadcn**. O shadcn vive em `packages/ui`, compartilhado com o backoffice — não pode ser
editado (`CLAUDE.md`). E acrescentar `rounded-button` ao `className` de um `<Button>` depende de o
`tailwind-merge` reconhecer o token custom para derrubar o `rounded-md` da base; ele classifica
`rounded-*` por sufixos conhecidos (t-shirt sizes, `none`, `full`, arbitrários) e **não há garantia**
de que colapse `rounded-button`.

Então a loja ganha o **próprio** botão, com o raio na base da `cva` — sem conflito para o twMerge
resolver:

```
variant   fundo                  texto        borda                onde
primary   bg-nanita-jam          branco       —                    ação principal. Uma por tela.
secondary transparente           nanita-ink   border-2 nanita-ink  alternativa ao primário
onInk     bg-nanita-glaze        nanita-ink   —                    dentro de superfície Grafite
inkSolid  bg-nanita-ink          branco       —                    sobre superfície Carimbo (newsletter)
ghost     transparente           nanita-ink   —                    ação terciária
```

Tamanhos `sm` (14px/py-3) · `md` (16px/py-3.5) · `lg` (17px/py-[17px]), rótulo em **Fredoka 600**.
`asChild` via `Slot` do Radix, para `<Link>` que age como botão. Hover é `opacity`/`scale` — nunca
mudança de matiz (regra herdada da v1 e mantida).

**Migração**: o teste de varredura (`buttonShape.test.ts`) lê os fontes de `apps/store/src` e falha
quando `rounded-pill` aparece na `className` de um `<button>` / `<Link>` de ação. Ele é o que torna
`PAP-04` verificável em vez de "revisado a olho", e é o que mantém a regra viva depois da feature.

---

## 3. A marca: de fonte para vetor

### Os componentes

Novos, em `apps/store/src/shared/ui/brand/` — **da loja**, porque `packages/ui` serve o backoffice e
`NanaLogo`/`NanaMascot` só estão lá por herança:

| Componente | viewBox | Piso | Onde |
|---|---|---|---|
| `NanitaWordmark` | `0 0 690.06 172.04` | ≥110px de largura | Header, folha do menu mobile, header do checkout, overlay de auth |
| `NanitaLockup` | `0 0 690.06 237.8` | ≥140px | Rodapé |
| `NanitaMonogram` | `0 0 126.87 160.18` | ≤48px | Favicon, selo, avatar |

API: `<NanitaWordmark width={128} tone="brand" />`, onde `tone` ∈ `brand` (Carimbo) · `ink` (Grafite)
· `paper` (Dobra/Papel, para fundo escuro) · `mono` (`currentColor`). Proporção **4,01:1** travada:
passa-se a largura, a altura sai dela.

**SVG inline, nunca `<img src>`** (`PAP-04`, dimensão "falha parcial"): o wordmark do header não pode
ter estado de carregamento nem 404 possível, e `currentColor` só funciona inline.

**Estrutura do path é requisito, não estilo** (`PAP-05` AC4): todos os contornos de uma cor são
subpaths de **um** `<path>` com `fill-rule="evenodd"`. É a única forma de o miolo do `a`, `P`, `R`,
`O`, `A` e `D` ser vazado — `fill-rule` decide preenchimento *dentro* de um path; entre paths
separados não tem efeito. A primeira vetorização errou exatamente aqui: geometria certa, letras
maciças, e a verificação de IoU não pegou porque rasterizava tudo num even-odd só.

### A escada de redução (prancha 21)

Medida por rasterização, não estimada. No wordmark quem quebra primeiro é a **fileira de marcas**
(barras 29 unidades, losangos 44) e não a haste da letra (33):

| largura | altura | haste | barra | veredito |
|---|---|---|---|---|
| 72px | 18,0 | 3,44 | 3,03 | as cinco marcas viram uma linha borrada |
| 90px | 22,4 | 4,30 | 3,78 | aperta — losangos saem como manchas |
| **110px** | 27,4 | 5,26 | 4,62 | limpo. **É o piso.** |
| **128px** | 32,0 | 6,12 | 5,38 | header mobile |
| **160px** | 40,0 | 7,65 | 6,72 | header desktop |

Abaixo de 110px o componente **cai para o monograma** (edge case do spec) — nunca renderiza o lockup
borrado. Na mesma altura de 40px o lockup mede 116px, 24px abaixo do próprio piso, com o descritor em
7,6px: é por isso que a marca do header é o wordmark e a do rodapé é o lockup. Não é inconsistência,
é a escada funcionando.

**Sobre Grafite o descritor vira Dobra**, não Carbono — Carbono sobre Grafite dá 2,55:1 e o descritor
simplesmente desaparece.

### O que sai junto

Berkshire Swash perde as duas funções que tinha e é **retirada**:

| Onde estava | Vira |
|---|---|
| `.nanita-wordmark` (header, rodapé, overlay de auth) | `NanitaWordmark` / `NanitaLockup` |
| Inicial marca-d'água do card de coleção | **Fredoka 700**, 76px, ~50% de opacidade (artboards 22/23) |
| `<link>` do Google Fonts | pedido reduzido a Fredoka + DM Sans |
| `fontFamily.logo` no Tailwind | removido |

`NanaLogo` fica sem consumidor na loja e é **removido do uso** (o componente segue exportado de
`@nanapin/ui` — apagá-lo é churn em pacote compartilhado, e `NanaMascot`, do qual ele depende,
continua válido em 404, estados vazios e Sobre).

---

## 4. Favicon: uma arte, três recortes

Decisão da prancha 19b, medida pela **largura da haste do N a 16px** (piso 2px — abaixo disso a haste
é cinza de antialias, não Grafite):

| Base | Haste a 16px | Área pintada | Destino |
|---|---|---|---|
| B · squircle (canto 28%) | 2,5px | 93% | `favicon.svg`, `favicon.ico`, `icon-512.png` |
| C · quadrado sangrado | 2,6px | 100% | `apple-touch-icon.png` (180×180) |
| A · disco | 2,1px | 78% | — (superado; era o candidato da prancha 19) |

O achado é de uma linha: **a base só ganha haste ficando mais reta.** Disco, botton, adesivo e
losango gastam área desenhando a própria borda, e quem paga é o N.

Squircle na aba porque ninguém recorta o favicon — ele precisa do próprio canto para não encostar na
aba vizinha. Quadrado **sangrado** no atalho do iPhone porque o iOS aplica a própria máscara: arte
pré-arredondada deixa sobra de canto entre o desenho e o corte. Duas bases para o mesmo N não é
inconsistência — a variável aqui é quem faz o recorte.

**Geração.** SVG escrito à mão (`rect` com `rx` + o path do monograma transformado). PNG e ICO
rasterizados por PowerShell + WPF (`System.Windows.Media`), a mesma toolchain de
`_escada-wordmark.ps1`. `theme-color` passa de `#B0176B` (geleia velha) para `#A62348` (Carmim).

---

## 5. A home, seção a seção

Estrutura **não muda** — as treze seções do artboard 23 batem 1:1 com os widgets de hoje. É
revestimento, não reestruturação:

| Seção do artboard | Arquivo | O que muda |
|---|---|---|
| Mobile Header / Header | `widgets/header/ui/Header.tsx` | wordmark SVG; fundo branco sobre chão Papel; linha Dobra |
| Hero Section | `widgets/hero-banner/ui/HeroBanner.tsx` | fundo Mata-borrão; título em duas cores (Grafite / Carmim); CTA Carmim + secundário contorno; arte = **cartela de pins** (a mascote sai do hero) |
| Marquee Trust Bar | `home-sections/ui/MarqueeBar.tsx` | faixa Grafite, marcas em Carimbo, texto Papel |
| Drop Alert | `home-sections/ui/DropCountdown.tsx` | card Grafite, contador com o vivo em Fita, CTA Carimbo |
| Categories Section | `widgets/category-grid/ui/CategoryGrid.tsx` | ritmo **1º Carimbo → 2º Grafite → demais Mata-borrão**; inicial em Fredoka 700 |
| Trending / Fan Picks | `widgets/product-carousel` + `entities/product/ui/ProductCard.tsx` | palco Mata-borrão; selo Grafite; disco `+` Grafite; preço Carmim |
| Monte Seu Kit | `features/custom-pin/ui/MonteSeuKit.tsx` | tier destacado em Grafite com números Carimbo; fita "MAIS POPULAR" em Fita |
| Trending Tags | `home-sections/ui/TrendingTags.tsx` | chips Carimbo/branco, pílula mantida |
| Social Proof | `home-sections/ui/SocialProof.tsx` | cards brancos sobre Mata-borrão |
| Newsletter CTA | `features/newsletter/ui/NewsletterBanner.tsx` | superfície **Carimbo**, texto Grafite, campo branco, botão Grafite |
| Mobile Footer / Footer | `widgets/footer/ui/Footer.tsx` | Grafite; lockup Carimbo/Dobra; títulos de coluna Carimbo |
| Mobile Bottom Nav | `widgets/mobile-nav/ui/MobileNav.tsx` | branco sobre Papel, ativa em Carmim |

Regra de leitura da paleta na tela (prancha 20b), que é o que decide as dúvidas caso a caso:

- **Carimbo** — wordmark, botton na foto, CTA dentro da faixa Grafite. **Nunca texto sobre Papel.**
- **Selo** — contador da sacola e os dots de 7px. O que o Carimbo perderia por contraste.
- **Carmim** — preço, "Ver tudo", aba ativa, botão do hero. **Todo o dinheiro da tela.**
- **Carbono** — texto de apoio, placeholder, rótulo da nav, wordmark mono do rodapé.
- **Grafite** — títulos, disco da sacola, faixa do kit, selos de badge.
- **Fita** — "3 por R$ 25", "−20%", "ÚLTIMAS 4", eyebrow do kit. Sempre sobre Grafite.

**Mobile primeiro** (`CLAUDE.md`): o alvo é 390px, e o gate de cada task de home é screenshot em
390×844 antes de 1440.

---

## 6. Estratégia de teste

Os testes derivam das ACs e asseveram **resultado declarado no spec**, nunca a implementação:

| Suíte | Prova | AC |
|---|---|---|
| `shared/lib/__tests__/palette.test.ts` | Os 10 valores batem, e `App.css` **concorda com** `tailwind.config.ts` | PAP-01 |
| idem | Contraste WCAG 2.1 calculado dos hexes: pisos de `jam`/`plum`/`ink`/`rule`/`raspberry`; `sugar × paper` ≥ 1,15 | PAP-03 |
| `shared/lib/__tests__/importOrder.test.ts` | `main.tsx` importa `App.css` **depois** de `@nanapin/ui/styles.css` | PAP-09 |
| `shared/ui/__tests__/buttonShape.test.ts` | Varredura de fonte: `rounded-pill` não aparece em `className` de botão/ação | PAP-04 |
| `shared/ui/__tests__/Button.test.tsx` | As cinco variantes rendem as classes de cor e forma declaradas | PAP-04 |
| `shared/ui/brand/__tests__/*.test.tsx` | `role="img"`, `aria-label`, viewBox, proporção 4,01:1, queda para monograma abaixo de 110px, descritor Dobra sobre Grafite | PAP-05 |
| `shared/ui/brand/__tests__/paths.test.ts` | Um `<path>` por cor, com `fill-rule="evenodd"` (a regra dos contadores) | PAP-05 |
| `app/__tests__/brandAssets.test.ts` | Os quatro arquivos de ícone existem; `index.html` declara os quatro `<link>`/`meta`; `<link>` de fonte **não** pede Berkshire Swash | PAP-06, PAP-07 |
| Testes de widget existentes | Continuam passando — nomes de classe não mudam, só valores | PAP-02 |

**A guarda de convivência** (`PAP-09`) é um teste de repo: `git diff` do branch não pode tocar
`apps/backoffice/**`, `packages/ui/src/styles.css`, `packages/ui/tailwind.preset.ts`, nem as strings
`nanapin-cart` / `nanapin-wishlist` / `nanapin-coupon` / `nanapin-checkout`. Isso roda no gate final,
não por task.

---

## 7. Risco conhecido

| Risco | Mitigação |
|---|---|
| `tailwind-merge` não colapsa `rounded-button` contra o `rounded-md` da base do shadcn | Botão da loja tem o raio **na base da própria `cva`** — não há conflito para resolver. Onde o `<Button>` do shadcn tiver que ficar, usar `rounded-[14px]` (arbitrário, que o twMerge reconhece com certeza) e cobrir por teste. |
| A troca de valor reveste 190 arquivos de uma vez e alguma tela fora da home fica com contraste ruim | Os pisos foram medidos **sobre Papel** na prancha 18, e os papéis de cada token são os mesmos da v1. O risco real é texto em `glaze`/`sugar`, que já era proibido na v1 — o checklist §8 do `DESIGN.md` e a varredura cobrem. |
| Migrar 45 arquivos de botão introduz regressão silenciosa | O gate por task é a suíte + screenshot; e o teste de varredura falha se sobrar pílula em ação. |
| `pnpm build` não faz typecheck (`CLAUDE.md`) | Gate de fase usa `npx tsc --noEmit -p apps/store/tsconfig.app.json`, baseline **0**. |
