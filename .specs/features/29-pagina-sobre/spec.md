# 29 — Página Sobre

**Escopo:** Medium (3 arquivos, sem decisão de arquitetura). Sem `design.md`, sem `tasks.md`.

## Problema

`/sobre` existe desde a feature 20 e é a única página institucional que nunca recebeu desenho: é um
card branco dentro de `container max-w-2xl`, com copy escrita por aproximação ("Feito à mão, com a
sua história nas mãos"). A Adri escreveu o texto dela, e ele foi desenhado no Paper — nos artboards
**"Loja — Sobre a Uma Estrelinha (Mobile · simples)"** e **"(Desktop · simples)"**.

A página é a que responde "quem é a pessoa que vai receber as cinzas do meu pai pelo correio". Hoje
ela responde com texto genérico.

## Fora de escopo

| Item | Por quê |
| --- | --- |
| Rota e slug reservado | `/sobre` **já** está no `App.tsx` e em `ROUTE_SLUGS` desde a feature 23 |
| A foto da Adri como arquivo | Não existe no repositório; a **vaga** entra, o arquivo é da dona |
| As versões completas dos artboards (7 seções) | A dona escolheu a versão enxuta |
| Trilha compartilhada em `shared/ui` | A trilha entra (`SOB-12`), mas mora na página: é a primeira da loja, e componente compartilhado com um consumidor só é abstração antes da hora |

## Requisitos

**SOB-01** — A página SHALL sair em **quatro faixas de largura cheia**, nesta ordem e com estas
cores medidas dos artboards: `1 Hero` (`ground-deep`), `2 A história` (`ground`), `3 O nome`
(`primary`), `4 Fecho e convite` (`ground-deep`).

**SOB-02** — Cada faixa SHALL centrar o conteúdo numa coluna de no máximo **1200px** com **20px** de
respiro lateral no mobile — as duas medidas do artboard (390 − 2×20 = 350 de conteúdo; 1440 − 2×120 =
1200). A faixa `2 A história` SHALL limitar a coluna de texto a **720px** no desktop.

**SOB-03** — O hero SHALL trazer título `Sobre a Uma Estrelinha` (display, 34px no mobile / 56px no
desktop), a frase de abertura `Algumas lembranças são preciosas demais para ficarem apenas na
memória.` (display itálico, `primary`), a vaga da foto e a legenda dela. **A legenda muda de coluna,
não de texto**: no desktop fecha a coluna de texto, abaixo da frase de abertura; no mobile vem depois
da foto. SHALL existir **uma** ocorrência dela no DOM nos dois casos.

**SOB-04** — A vaga da foto SHALL renderizar a fotografia quando houver uma, e um **palco declarado**
(o símbolo da marca sobre `serenity`) quando não houver — nunca uma caixa escrita "FOTO", que é
notação de desenho e não de loja. A vaga SHALL usar **4:3 paisagem nos dois tamanhos** (350×262 no
mobile, 520×390 no desktop) e o raio `lg` (20px). Proporção única porque a fotografia é **um** arquivo:
duas proporções pediriam dois recortes da mesma foto.

**SOB-05** — A faixa `2 A história` SHALL trazer o texto da Adri **na íntegra**, na ordem escrita, com
a fala `“Quando meus gatos virarem estrelinha, eu quero fazer isso também.”` destacada por fio
vertical em `accent`.

**SOB-06** — A faixa `3 O nome` SHALL sair sobre `primary`, com o rótulo `O NOME` em `serenity`, o
parágrafo do nome em `on-primary` e a frase `Apenas passa a brilhar de outro lugar.` em display
itálico. Nenhum texto sobre esta faixa SHALL usar `accent` — 3,07:1 sobre `primary` reprova como
texto (`CLAUDE.md`); `accent` ali só é permitido como **traço** da estrela.

**SOB-07** — A faixa `4 Fecho e convite` SHALL trazer a estrofe de três linhas (as duas primeiras em
`ink-soft`, `Mas o amor permanece.` em `ink` semibold), a assinatura e **duas ações**: `Conhecer as
joias` (primária, `rounded-sm`) e `Falar com a Adri`.

**SOB-08** — A ação `Falar com a Adri` SHALL montar o link a partir de `whatsapp` das settings e
SHALL **não renderizar** quando o número não estiver configurado — mesma regra do `WhatsAppFloat`.
Com a ação ausente, a primária permanece.

**SOB-09** — A página SHALL declarar `<link rel="canonical">` para `/sobre` (`useCanonical`).

**SOB-10** — O guarda `copyInstitucional.test.tsx` SHALL continuar verde sem alteração: a página SHALL
conter o nó de texto exato `Adri Muniz`, a palavra `Porto Alegre`, `cinzas`, `à mão`, e SHALL NOT
conter emoji nem vocabulário da loja anterior. O `✨` do texto original vira a estrela **desenhada**
da biblioteca de ícones.

**SOB-11** — Em 390px de viewport a página SHALL NOT produzir scroll horizontal, e os dois botões da
faixa 4 SHALL ter no mínimo 44px de altura.

**SOB-12** — A página SHALL abrir com uma **trilha** `Início › Sobre`, acima do hero, sobre `ground`
e com fio inferior em `line`. `Início` SHALL ser link para `/` com alvo de toque `TAP_ROW` (texto em
fluxo), e `Sobre` SHALL ser o item corrente (`aria-current="page"`), sem link.

**SOB-13** — A estrela decorativa da página SHALL ser o **ornamento do logotipo** (nó `745-0` do
arquivo do Paper) — faísca de quatro pontas com lados côncavos —, e não uma estrela genérica. O
desenho SHALL viver na biblioteca de ícones (`EstrelinhaStarIcon`), que é a única porta de ícone da
loja: um segundo ícone quase igual criaria dois lugares para consertar o mesmo traço.

## Critérios de aceite

| AC | Verificação |
| --- | --- |
| AC-1 | As quatro faixas montam, na ordem, com as classes de fundo medidas (SOB-01) |
| AC-2 | O título, a frase de abertura e a legenda saem com o texto exato do artboard (SOB-03) |
| AC-3 | Sem foto, a vaga mostra o palco da marca e **nenhum** `<img>`; com foto, mostra o `<img>` com `alt` (SOB-04) |
| AC-4 | Os nove parágrafos e a citação saem na ordem escrita (SOB-05) |
| AC-5 | A faixa `O nome` não tem texto em `accent` (SOB-06) |
| AC-6 | Sem `whatsapp` nas settings, a segunda ação não renderiza e a primária continua (SOB-08) |
| AC-7 | Com `whatsapp`, o link é `https://wa.me/<dígitos>` (SOB-08) |
| AC-8 | A canônica de `/sobre` é declarada e removida no unmount (SOB-09) |
| AC-9 | `copyInstitucional.test.tsx` passa sem edição (SOB-10) |
| AC-10 | Os botões têm altura ≥ 44px declarada em classe (SOB-11) |
| AC-11 | A trilha monta com `Início` linkando `/` e `Sobre` como item corrente sem link (SOB-12) |
| AC-12 | A legenda existe **uma** vez no DOM, e a grade do desktop a coloca na coluna 1, linha 2 (SOB-03) |
| AC-13 | A vaga da foto é 4:3 nos dois tamanhos (SOB-04) |
| AC-14 | O ícone da estrela é o ornamento do logotipo, na grade 24 e com `ICON_STROKE` (SOB-13) |

## Divergências deliberadas do artboard

| Artboard | Implementação | Por quê |
| --- | --- | --- |
| Caixa "FOTO · paisagem 4:3" | Palco da marca (SOB-04) | Notação de desenho não é interface |
| Versalete `UMA ESTRELINHA` da assinatura em ouro | `ink-soft` | `accent-strong` sobre `ground-deep` mede **3,17:1**: passa como traço (3:1) e reprova como texto (4,5:1). É o defeito que `accentText.test.ts` existe para pegar — e pegou |
| `EstrelinhaStarIcon` de 5 pontas (o que existia no código) | Substituído pelo ornamento do logotipo | `SOB-13`. A troca alcança também o `BrandStatement` da home, único outro consumidor: a estrela da loja passa a ser a da marca |
