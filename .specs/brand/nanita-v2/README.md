# Nanita v2 — identidade vetorizada

Assets da identidade nova (wordmark geométrico + descritor).

> **ADOTADA na feature `19-identidade-papelaria`** (2026-08-04). A loja roda nesta paleta e nesta
> marca: `apps/store/src/shared/ui/brand` consome os SVGs daqui, e `apps/store/public/` recebeu o
> favicon de monograma. As regras vigentes estão em `DESIGN.md`; este diretório é a **fonte** dos
> vetores e o registro de como eles foram medidos.

Pranchas no Paper (arquivo `Nanapin`, página `Home`): **18 · Logotipo Nanita v2 (vetor) + Paleta**,
**19b · Favicon Nanita v2 — variações de base**, **20b · Onde cada cor entrou na tela**,
**21 · Wordmark para o header**, **22 · Home Desktop** e **23 · Home Mobile**.

## Arquivos

| arquivo | viewBox | uso |
|---|---|---|
| `nanita-logo.svg` | `0 0 690.06 237.8` | Lockup completo, duas cores. O padrão. |
| `nanita-logo-mono.svg` | `0 0 690.06 237.8` | Lockup em `currentColor` — uma cor só. |
| `nanita-wordmark.svg` | `0 0 690.06 172.04` | **Só "Nanita", sem o descritor. É o header da loja.** |
| `nanita-wordmark-mono.svg` | `0 0 690.06 172.04` | Idem em `currentColor` — para consumo inline em React. |
| `nanita-monogram-n.svg` | `0 0 126.87 160.18` | O N sozinho, em `currentColor`. Base do favicon. |
| `favicon.svg` | `0 0 64 64` | **Squircle** Carimbo (canto 28%) + N Grafite. Base B da prancha 19b. |
| `favicon.ico` | 16 · 32 · 48 | PNGs embutidos (formato Vista+), do mesmo squircle. |
| `apple-touch-icon.png` | 180×180 | **Quadrado sangrado** — base C. O iOS aplica a própria máscara. |
| `icon-512.png` | 512×512 | Squircle, para social e PWA. |
| `_origem-raster.png` | 1000×1000 | O PNG de onde tudo saiu. Referência, não asset. |

## Como foi vetorizado

O arquivo de origem é raster. O traçado foi feito por **marching squares sub-pixel** sobre o canal
alpha (iso 0.5, com interpolação linear nas arestas da grade) e **ajuste de Bézier cúbica** por
Schneider, com detecção de canto por ângulo de virada. Depois, um passe de regularização: trechos
retos quase-axiais foram travados no eixo e as coordenadas próximas agrupadas num valor só — o que
alinhou as bordas de haste entre letras diferentes e apagou o serrilhado do raster.

Fidelidade medida contra o PNG, por rasterização dos paths e comparação pixel a pixel:

| | wordmark (rosa) | descritor (mauve) |
|---|---|---|
| IoU | 96,6% | 91,0% |
| área vetor ÷ raster | 0,998 | 1,000 |
| contornos fechados | 13 | 21 |
| segmentos | 127 (63 retas) | 200 (71 retas) |

A divergência restante é uma faixa de 1px de antialias distribuída pelo contorno, não deslocamento
de forma — a área bate em 0,2%. A regularização **melhorou** a fidelidade (pixels divergentes
caíram de 804 para 726 no wordmark) enquanto cortava a contagem de nós pela metade.

### Os contadores são buracos, e isso depende da estrutura do arquivo

**Todos os contornos de uma cor são subpaths de UM `<path>` só**, com `fill-rule="evenodd"` nesse
path. Não é preferência de estilo — é a única forma de o miolo do `a`, do `P`, do `R`, do `O`, do `A`
e do `D` ser vazado. `fill-rule` decide o preenchimento **dentro de um path**; entre paths separados
ele não tem efeito nenhum. Um `<path>` por contorno pinta o contador **por cima** do corpo, na mesma
cor, e a letra sai sólida.

Foi exatamente o erro da primeira versão: a geometria estava correta (os 34 contornos existiam, com
as coordenadas certas) e ainda assim as letras saíram maciças. A verificação de IoU não pegou porque
rasterizava todos os contornos juntos num único even-odd — media a geometria, não a estrutura do
arquivo. `holes.mjs` cobre o buraco dessa verificação: testa a paridade de cruzamentos no centro de
cada contador e no meio de duas hastes, e falha se um contador estiver fechado.

Se for reexportar ou editar em outra ferramenta: **confira que cada cor é um path só.** Separar os
subpaths em elementos `<path>` distintos reintroduz o defeito sem mudar um único número.

## Regras que vieram do desenho

- **A escada de redução tem três degraus, e cada um tem um piso medido** (prancha 21):

  | | piso | onde |
  |---|---|---|
  | `nanita-logo.svg` (lockup) | **≥ 140px** de largura | Papelaria, embalagem, e-mail, rodapé de página. |
  | `nanita-wordmark.svg` | **≥ 110px** de largura (altura ≥ 27px) | **Header da loja**, rodapé de app, marca d'água. |
  | `nanita-monogram-n.svg` | **≤ 48px** | Favicon, avatar, selo, app icon. |

  O argumento do header em uma linha: **na mesma altura de 40px o lockup mede 116px de largura** —
  24px abaixo do próprio piso, com o descritor em 7,6px. O wordmark, na mesma altura, mede 160px e
  fica 50px acima do piso dele. Header não tem 140px de folga; por isso a marca do header é o
  wordmark, não o lockup.

  **No wordmark quem quebra primeiro é a fileira de marcas, não a letra.** A haste tem 33 unidades
  em 690 de largura, mas as barras têm 29 e os losangos 44. Rasterizei o SVG em cada largura para
  medir em vez de estimar:

  | largura | altura | haste | barra | veredito |
  |---|---|---|---|---|
  | 72px | 18,0px | 3,44px | 3,03px | as cinco marcas viram uma linha borrada |
  | 90px | 22,4px | 4,30px | 3,78px | aperta — losangos saem como manchas |
  | **110px** | 27,4px | 5,26px | 4,62px | limpo. É o piso. |
  | **128px** | 32,0px | 6,12px | 5,38px | tamanho do header mobile |
  | **160px** | 40,0px | 7,65px | 6,72px | tamanho do header desktop |

  Proporção fixa **4,01 : 1** — escolha a altura, a largura sai dela. `render-wordmark.ps1` no
  scratchpad é o script que gerou a escada; ele existe caso alguém queira reconferir com outra
  fonte de verdade.

- **O rodapé é o lugar do lockup na loja.** Em 150px ele está acima do piso, e ali o descritor
  ainda diz o que a loja vende — que é a única função dele. Header e rodapé usando marcas
  diferentes não é inconsistência: é a escada funcionando.
- **Sobre Grafite o descritor vira Dobra (`#EBDDD7`)**, não Carbono. Carbono sobre Grafite dá
  2,55:1 — o descritor simplesmente desaparece.
- **O N do favicon é o N do lockup**, mesmo path. Nada foi redesenhado para caber em 16px.

## Paleta papelaria

Contraste sobre `Papel #F9F1EE` (o chão novo). Medido em WCAG 2.1.

| token | nome | hex | sobre Papel | papel na tela |
|---|---|---|---|---|
| `--nanita-paper` *(novo)* | Papel | `#F9F1EE` | — | Chão da loja. Nunca texto. |
| — | Folha nova | `#FFFFFF` | 1,11 | Card, pílula, barra de navegação. |
| `--nanita-sugar` | Mata-borrão | `#F7D6E0` | 1,20 | Faixa de seção. Nunca texto. |
| `--nanita-border` | Dobra | `#EBDDD7` | 1,19 | Divisor e contorno. Nunca borda de campo. |
| `--nanita-rule` *(novo)* | Papelão | `#8F7268` | 3,95 ✓ | Borda de input e de controle. |
| `--nanita-glaze` | **Carimbo** | `#F1678D` | 2,67 ✗ | Preenchimento e wordmark. **Nunca texto.** |
| `--nanita-raspberry` | Selo | `#E93A6D` | 3,56 ✓ lg | Dot de status, ícone, detalhe ≥24px. |
| `--nanita-jam` | Carmim | `#A62348` | 6,38 ✓ AA | Texto de marca, preço, link, botão. |
| `--nanita-plum` | **Carbono** | `#7E5769` | 5,46 ✓ AA | Texto secundário. **É o piso.** |
| `--nanita-ink` | Grafite | `#2E2028` | 13,92 ✓ AAA | Texto primário, superfície escura. |
| `--nanita-butter` | Fita | `#FFC95C` | 1,37 ✗ | Badge. **Só sobre Grafite** (10,17:1). |

Carimbo e Carbono saem do próprio arquivo do logo. O resto foi derivado do mesmo matiz: o rosa novo
está em **343°**, e o antigo (Geleia `#B0176B`) em **327°** — daí a troca do tom profundo.

**Sobre Grafite:** Carimbo lê a 5,22:1 e Fita a 10,17:1. Papel e Dobra ficam acima de 11:1.

### O achado que obriga a mexer

`--nanita-sugar` hoje é `#FFEFF6`, que sobre `#F9F1EE` dá **1,00:1** — mesma luminância. Trocar o
chão para papel sem trocar o `sugar` apaga toda superfície de seção da loja: a faixa continua no CSS
e não aparece. **O chão novo não é uma troca isolada** — ou entra junto com Mata-borrão e Dobra, ou
não entra.

`#F7D6E0` é o teto do rosa de superfície: mais fundo que isso (testei `#F4CFDB`) derruba Carbono
para 4,28:1, abaixo de AA.

Borda de campo precisa de 3:1 (WCAG 1.4.11) e **nenhum tom claro chega lá** sobre Papel: `#EBDDD7`
dá 1,19, `#C4A79D` dá 2,01. Por isso `--nanita-rule` (`#8F7268`, 3,95:1) existe como token separado
de `--nanita-border`. Duas funções, dois valores.

## Como a adoção foi feita (feature 19)

1. **Tokens primeiro**, e os dois arquivos juntos — `App.css` e `tailwind.config.ts`. O chão não
   entra sozinho: o `sugar` da v1 sobre Papel dá 1,00:1.
2. **Forma de ação** — `rounded-button` de 14px, `shared/ui/Button` e a varredura que impede pílula
   em botão.
3. **A marca em vetor** — `shared/ui/brand`, com `paths.ts` GERADO a partir dos SVGs deste
   diretório (`scratchpad/gen-paths.mjs`) e um teste que compara caractere a caractere.
4. **Favicon** — squircle na aba, quadrado sangrado no iPhone.
5. **A home**, seção a seção, contra os artboards 22 e 23.
6. **`DESIGN.md` e `CLAUDE.md`** reescritos.

### O que a adoção resolveu das pendências anteriores

- **Tipografia**: os artboards 22/23 decidiram — **Fredoka fica**. A divergência de terminais
  (arredondados na fonte, retos no wordmark) foi levantada aqui e o desenho escolheu conviver com
  ela; trocar por Outfit seria uma feature de marca à parte.
- **Berkshire Swash saiu** de vez, inclusive do `<link>` do Google Fonts: com o wordmark em SVG e a
  inicial do card de coleção em Fredoka 700, a fonte ficou sem função nenhuma.
- **`NanaLogo` ficou sem consumidor** na loja, mas **não foi apagado** — é churn em pacote
  compartilhado, e o `NanaMascot` de que ele depende continua válido.
- **A mascote continua sendo a persona da criadora**: segue no 404, nos estados vazios e na página
  Sobre. Saiu do hero (que passou a mostrar o produto) e da aba (que passou a mostrar o N) — foi
  troca, não soma.
- **Nenhuma chave de `localStorage` foi tocada.**

## Os geradores

Os arquivos com prefixo `_` são as ferramentas que produziram os assets, guardadas aqui para que a
próxima pessoa possa **reconferir em vez de confiar**. Rodam da raiz do repo.

| Script | O que faz |
|---|---|
| `_gen-paths.mjs` | Extrai os `d` daqui e escreve `apps/store/src/shared/ui/brand/paths.ts`. |
| `_gen-favicon.mjs` | Escreve os SVGs de ícone, com a escala derivada da haste alvo. |
| `_raster-icons.ps1` | Rasteriza os PNGs por WPF (`F0` na frente do path é o `fill-rule="evenodd"`). |
| `_build-ico.mjs` | Monta o `.ico` e **mede a haste do N** no raster, contra o piso de 2px. |
| `_escada-wordmark.ps1` | A escada de redução da prancha 21. |
| `_verificacao-contadores.mjs` | Prova que os contadores das letras são buracos. |

**A escala do ícone não é de olho.** A haste esquerda do N ocupa 31,59 de 126,87 unidades do viewBox
— 24,9% da largura —, então a largura alvo sai da haste alvo por divisão. O `_build-ico.mjs` fecha o
ciclo medindo o resultado: 2,5px a 32px, e ≥2px em todos os tamanhos.
