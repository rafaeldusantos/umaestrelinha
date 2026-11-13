## 03 · [apps/store] A faixa de avisos na loja

**Status:** done

`UC-01, UC-02, UC-04` — 101

**Objetivo.** A cliente vê, acima do cabeçalho de toda página do `StoreLayout`, os avisos da dona se alternando, sem a
página saltar quando eles chegam.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `DESIGN.md` (§2 Paleta, §6–§8) e `packages/ui/CLAUDE.md`. Dos
grandes demais, leia as seções: `apps/store/CLAUDE.md › Design system` · `› Mobile` · `› A home não salta enquanto
carrega` · `› Banner principal` · `› A Home é dado / Modo prévia` · `› Carrinho, chrome e checkout` · `› Menu (consumo)`
(a ponte de prévia) · `› O HTML servido — a função api/page` (o atributo `data-faixa`, escrito pela 02) · `CLAUDE.md ›
Feature-Sliced Design` · `CLAUDE.md › Convenções que valem em todo o repositório` (mobile primeiro) · `CLAUDE.md › Os
guardas — o que trava o quê` · `CLAUDE.md › Baselines`. Divergindo desta tarefa sobre COMO fazer, o arquivo de
instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (A faixa na loja); §4 · spec.md — Código; §7 · spec.md — Decisões (PR-1..PR-4,
PR-8, PR-9, H-01..H-07, H-11, H-21, H-22).

**Depende de.** 01 — `core/announcements` (normalização, `announcementBarExists`, alturas, vagas da arte, canal de
prévia) e `announcements` em `useStoreSettings`; 02 — o atributo `data-faixa` no `<html>` servido. Confira que existem
antes de começar.

### Critérios de aceite

### UC-01 · A faixa na loja
- Acima do cabeçalho, largura total, fundo `accent` e texto `ink` (sólido, regra da marca para superfície ouro).
  Altura fixa, a mesma para todos os avisos: no celular, a de duas linhas de texto; no computador, 48 px. O texto de um
  aviso cabe em até duas linhas no celular (o painel recusa o que passar disso).
- Um aviso por vez. Com mais de um, troca a cada 6 s (o mesmo ritmo do Banner principal) com uma entrada curta
  (deslocamento, nunca de opacidade zero).
- **Pausa** com o ponteiro em cima, com o foco dentro e enquanto o dedo está na faixa.
- **Computador**: setas de anterior/próximo nas pontas (alvo de 44 px). **Celular**: sem setas; a faixa gira
  sozinha e o aviso inteiro é o link.
- `prefers-reduced-motion`: não gira sozinha; no computador as setas continuam; no celular aparece só o primeiro
  aviso.
- O aviso de texto é um link inteiro (o trecho em destaque, o texto e o rótulo sublinhado do link). Sem link, é texto.
- A faixa rola junto com a página (não é fixa) e não muda o comportamento do cabeçalho que se recolhe no celular.

### UC-02 · Aviso de imagem
- A dona envia duas artes (computador 1440 × 48 e celular 780 × 96), o texto alternativo (obrigatório) e o destino. A
  arte aparece inteira, centralizada na faixa, sem corte; em telas mais largas ou mais estreitas sobra fundo ouro dos
  lados.
- `<picture>` com uma arte por dispositivo (o navegador baixa uma só), rendição do tamanho da vaga.

### UC-04 · Sem avisos
- Interruptor desligado ou lista vazia: a faixa não existe e o cabeçalho volta para o topo, como hoje.

- **RN-01 · A loja inteira, menos o checkout.** A faixa aparece em todas as páginas do `StoreLayout`. O checkout e a
  página do pedido montado ficam sem ela: são telas de pagamento, com cabeçalho próprio e um objetivo só. Ver
  Decisão D-01.

- **RN-02 · Sem salto quando a faixa chega.** A configuração chega pelo navegador depois da primeira pintura; a faixa
  aparecendo ali empurraria a página inteira para baixo (o CLS que a feature `40` mediu e fechou). Por isso a página já
  sai do servidor dizendo se a faixa existe — em toda página da loja, Home inclusive — e a loja reserva a altura desde a
  primeira pintura. Quem decide se a faixa aparece numa visita é essa resposta do servidor; a configuração que chega
  depois só preenche os avisos.

- **RN-04 · Acessibilidade.** Região com rótulo ("Avisos da loja"), sem `aria-live` no giro automático (não anunciar
  a cada 6 s), setas com rótulo, contraste do texto `ink` sobre `accent` medido nos dois perfis do WI 100.

- **RN-05 · Movimento.** Toda transição tem par `motion-reduce:`; nada nasce em opacidade zero
  (`heroCarouselSemOpacidadeZero` como molde).

- **RN-06 · Um dono do giro.** O giro, a pausa e o índice usam o mesmo hook do Banner principal (ou um extraído dele),
  não uma segunda implementação.

- **RN-07 · Celular primeiro.** Em 390×844: sem rolagem horizontal; o texto embrulha em até duas linhas; fonte do
  sistema a 200 % sem cortar o link.

- **CA-01** Com 3 avisos de texto ligados, a faixa aparece acima do cabeçalho na Home, numa categoria e num produto;
  não aparece no checkout nem em `/pedido-montado`.

- **CA-02** Troca a cada 6 s; para com o ponteiro, com o foco e enquanto há um toque; com movimento reduzido não gira.

- **CA-03** Aviso de imagem baixa uma arte por dispositivo, no tamanho da vaga, com o texto alternativo.

- **CA-04** Destino externo é recusado no painel com o motivo; aviso sem destino é texto, sem link.

- **CA-05** Interruptor desligado: a loja é idêntica à de hoje, medida por captura em 390 e 1440.

- **CA-06** Com a faixa ligada, o CLS da Home e da página de produto não sobe (medido em navegador, rede lenta).

- **CA-07** Em 390×844 e 1440×900: sem rolagem horizontal, alvos de 44 px nas setas, texto de duas linhas sem corte.

### Design — o que a tela faz

- Região rotulada **"Avisos da loja"** antes do `<header>`, largura total, fundo `accent`, texto `ink` sólido; rola com a
  página, só o cabeçalho gruda. Sem `aria-live`.
- Miolo centralizado, máx. 1280 px, recuo 8 px, 4 px entre itens: [seta "Aviso anterior"] [conteúdo] [seta "Próximo
  aviso"]. Setas visíveis a partir de 768 px: área visível 32 × 40, alvo de 44 × 44, chevron 16 px em `ink`.
- Aviso de texto: um link inteiro — trecho em destaque (peso 700) + " · " + texto + rótulo sublinhado (peso 600,
  sublinhado afastado 3 px, nunca quebra no meio); centralizado, quebra balanceada; fonte 13 px no celular, 14 px a
  partir de 768 px; altura de linha 18 px; peso 500. Sem destino, é texto sem link (o rótulo não aparece).
- Aviso de imagem: `<picture>` com a arte do celular (780 × 96) e a do computador (1440 × 48), inteira e centralizada
  na faixa, sem corte, sobre o fundo ouro; texto alternativo; link quando há destino.
- Entrada de cada aviso: deslocamento vertical de 6 px em 300 ms, só sem movimento reduzido; nada mexe na opacidade.
- Desligada ou sem aviso válido: nada é desenhado.
- Exemplos: "**Black Friday** · novembro inteiro com joias em oferta · Ver ofertas"; "**Frete grátis** · acima de
  R$ 450,00 para Sul e Sudeste · Como funciona".

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| O hook do giro em `apps/store/src/shared/lib/` (o `useHeroCarousel` movido, com o intervalo por parâmetro, padrão 6000) | VOCÊ CRIA (movendo `widgets/hero-carousel/model/useHeroCarousel.ts`) | — | o Banner principal e a faixa |
| `widgets/hero-carousel` passa a importar o hook de `shared/lib` (o barril `index.ts:2` deixa de reexportá-lo ou aponta para o endereço novo); a suíte `model/__tests__/useHeroCarousel.test.ts` muda de casa **sem asserção tocada**; se o nome mudar, `apps/backoffice/src/features/home-composition/__tests__/previaUnica.test.ts:184` aprende o nome novo — **não renomeie** | VOCÊ ALTERA | — | — |
| `apps/store/src/widgets/announcement-bar/` (widget, leitura do atributo, recebedor da prévia `useAnnouncementPreview`) | VOCÊ CRIA | — | — |
| Montagem no `StoreLayout` antes do `<Header />` (`widgets/store-layout/ui/StoreLayout.tsx:88`) | VOCÊ ALTERA | — | — |
| A zona de topo do recolhimento do cabeçalho soma a altura da faixa (`shared/lib/useScrollDirection.ts:28`, `TOP_ZONE = 64`, e `widgets/header/ui/Header.tsx:124-138`) | VOCÊ ALTERA | — | — |
| `data-faixa` no `<html>` (`"1"`, `"0"`, ausente) | JÁ EXISTE (da 02). Consuma; não altere | — | — |
| `core/announcements` e `useStoreSettings().announcements` | JÁ EXISTE (da 01). Consuma; não altere | — | — |
| `isPreviewWindow`, `previewSrc` (`packages/core/src/home/preview.ts:83-90, 244-245`) | JÁ EXISTE. Consuma; não altere | — | — |
| `renditionUrl`/`renditionSrcSet` (`packages/core/src/media/rendition.ts:156, 177`) | JÁ EXISTE. Consuma; não altere | — | — |

### Decisões já tomadas

- H-03, a regra de existência: na carga do documento o atributo decide (`"1"` mostra, `"0"` não); ausente (dev, prévia,
  leitura que falhou) ⇒ decide a configuração. Com `"1"` e a configuração sem aviso válido, a faixa fica na vaga,
  ouro e sem texto, até a próxima troca de rota. A partir da primeira troca de rota no navegador, decide a
  configuração. Em prévia, decide o rascunho (e o publicado enquanto o rascunho não chega).
- H-02: a altura é reservada no elemento da faixa dentro do `StoreLayout`, já na primeira renderização, antes de a
  configuração chegar; nunca por CSS que dependa só do `<html>` (o checkout recebe o atributo e não pode ganhar faixa).
- H-04: as alturas vêm de `core/announcements` por variável CSS, em `rem` (celular duas linhas, computador `3rem`).
- PR-4 e H-07: 6 s; pausa enquanto ponteiro, foco ou dedo estão na faixa; o hook roda sem `trackRef` (índice puro) e a
  troca anima por CSS; sem arrasto em caso nenhum; movimento reduzido: não gira; no computador as setas continuam; no
  celular só o primeiro aviso. Um aviso só: sem temporizador e sem setas.
- PR-9: anel de foco em `ink` dentro da faixa; destaque e rótulo em `ink` sólido; setas sem `TAP_44` em `absolute`
  (a seta do cabeçalho, `Header.tsx:53-54`, com `h-11 w-11` sendo o próprio alvo, é o molde).
- H-01: a faixa monta só no `StoreLayout`; fica fora de `/checkout`, `/pedido/:id/pagamento`, `/pedido-montado`,
  `/pagar-com-cartao` e do 404 (`apps/store/src/app/App.tsx:222, 238, 245, 246, 248`).
- H-06: o cabeçalho só se recolhe depois que a faixa sai da tela.
- H-21: em prévia a faixa não gira sozinha e obedece à mensagem "mostre o aviso N"; o rascunho substitui o publicado.
  O recebedor aceita só o carimbo da faixa e só mensagem vinda do pai.
- H-11: o rótulo da região é "Avisos da loja".

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| Widget com arte por dispositivo, setas e pausa | `apps/store/src/widgets/hero-carousel/ui/HeroCarousel.tsx` — `Arte` (:83-118) e a região com `pauseHandlers` (:136-140) |
| Seta de 44 px sobre faixa colorida | `apps/store/src/widgets/header/ui/Header.tsx:53-54` — `SETA` |
| Hook de cromo em `shared/lib` | `apps/store/src/shared/lib/useOverflowAffordance.ts`, `useScrollDirection.ts` |
| Recebedor de prévia por carimbo | `apps/store/src/entities/menu/model/useMenuPreview.ts` (:59-104) |
| Variável CSS a partir de constante de `core` | `HERO_CAROUSEL_SLOTS` no `HeroCarousel.tsx:157` (`aspect-[var(--vaga-…)]`) |
| Guarda de opacidade zero | `apps/store/src/widgets/hero-carousel/ui/__tests__/heroCarouselSemOpacidadeZero.test.ts` |
| Guarda de tom | `apps/store/src/entities/product/ui/__tests__/tomDoCompreJunto.test.ts` |
| Montagem pela árvore real do `App` | `apps/store/src/app/__tests__/contadorMontado.test.tsx` |

### Testes

- Com `data-faixa="1"`, a faixa ocupa a vaga já na primeira renderização, antes de a configuração chegar; com `"0"`,
  nada é desenhado mesmo com a configuração ligada; sem atributo, decide pela configuração (componente).
- Depois da primeira troca de rota, a configuração decide; com `"1"` e configuração vazia, a vaga fica sem texto até a
  troca de rota (componente).
- Gira a cada 6 s; para enquanto há ponteiro, foco ou dedo; retoma ao sair; com movimento reduzido não gira; um aviso
  só não liga temporizador (componente, com relógio falso).
- Setas: anterior e próximo dão a volta na lista e têm rótulo; ausentes com um aviso só (componente).
- Aviso de texto é um link inteiro com destaque, texto e rótulo; sem destino é texto sem link e sem rótulo (componente).
- A região tem o rótulo "Avisos da loja" e nenhum `aria-live` (componente).
- Aviso de imagem: um `<picture>` com uma fonte por dispositivo, rendição da vaga e o texto alternativo (componente).
- Em prévia, o rascunho manda, o banco não é lido para os avisos, a faixa não gira e "mostre o aviso N" troca o aviso;
  mensagem de outro carimbo ou de outra origem é ignorada (componente).
- A faixa aparece na Home, numa categoria e num produto, e não em `/checkout` nem em `/pedido-montado`, pela árvore real
  do `App` (componente).
- O cabeçalho não se recolhe enquanto a faixa está na tela (unidade do hook de direção).
- O Banner principal segue igual depois do movimento do hook: a suíte do hook passa no endereço novo e
  `HeroCarousel.test.tsx` não é tocado (componente).
- Nada nasce em opacidade zero na faixa, nas cinco grafias do guarda do hero (guarda novo de disco).
- Os textos do widget não têm urgência, escassez, prova social, exclamação nem emoji (guarda novo de tom).
- Os guardas `accentText`, `contrast`, `touchTarget`, `alvoDeToqueNaoRoubaPosicao`, `fieldBorder` seguem verdes com os
  arquivos novos (guardas existentes).

### Obrigações

- FSD: o widget importa só de `entities`/`shared`/pacotes; nada de import lateral entre widgets (`AD-033`).
- Toda classe de `transition-*`/`animate-*` com o par `motion-reduce:` na mesma linha; nenhum `opacity-0`,
  `opacity-[0]`, `fade-in` nem `animate-fade-in`/`scale-in`/`slide-up` na faixa.
- Nada de `ink/NN` dentro da superfície `accent` (`accentText.test.ts`, que varre `apps/store/src`).
- Alvo de 44 px; nunca `TAP_44`/`TAP_ROW` junto de `absolute` (`alvoDeToqueNaoRoubaPosicao.test.ts`).
- `minmax(0, …)` desde o celular em qualquer grade; sem rolagem horizontal do `body`.
- O gate inclui a suíte do painel (`previaUnica.test.ts` lê o nome do hook).
- Acrescente ao `apps/store/CLAUDE.md` a seção da faixa (o atributo, a regra de existência, o hook em `shared/lib`).

### Não faça

- A função `api/page` e o atributo no servidor (tarefa 02); a regra em `core` (tarefa 01).
- A tela do painel, a ponte e o palco da prévia (tarefa 04).
- Faixa fixa no topo, botão de fechar, faixa por página, contador de tempo (fora do PRD).
- O link "Black Friday" dos departamentos (fora, H-16).
- Mudar o comportamento do Banner principal.

### Pronto quando

- [ ] A faixa aparece acima do cabeçalho na Home, numa categoria e num produto, e não no checkout nem em `/pedido-montado`.
- [ ] Com o atributo "existe", a altura está reservada na primeira renderização.
- [ ] Gira a 6 s, pausa com ponteiro, foco e dedo, e não gira com movimento reduzido.
- [ ] Aviso de imagem com `<picture>` e texto alternativo; aviso sem destino é texto.
- [ ] O Banner principal segue verde com o hook no endereço novo.
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório

---

### Confira cada citação desta tarefa quando for usá-la

Todo `caminho:linha` daqui — `Siga a forma de`, `Contrato`, `Obrigações`, `Design` — foi
escrito antes de qualquer tarefa rodar, e as tarefas anteriores mexeram na mesma árvore. Abra
cada um no momento em que ele é usado — o exemplar antes de escrever o artefato, o contrato
quando a fatia o consome —, e nenhuma linha se escreve apoiada em citação não conferida: a
linha deslocou, relocalize pelo alvo que a citação nomeia e siga, registrando no retorno; o
arquivo não está mais lá, é `citação morta` — a regra abaixo manda concluir e propagar sempre
que dê para concluir, e o histórico do Git ainda serve de exemplar.

### Se algo aqui não bater com o repositório

A rota `JÁ EXISTE` não está lá, o exemplar sumiu, a tabela tem outra forma. Dá para concluir
mesmo assim: siga, feche e propague. Não dá: pare e relate até onde chegou. Não conserte
contrato por conta, não improvise, não crie o que era de outra tarefa.

**Propagar** é corrigir, nos arquivos seguintes de `tasks/`, cada afirmação que a sua descoberta
tornou falsa — só a afirmação, e nada mais do arquivo. Feito isso, a divergência está resolvida:
ela vai no seu retorno como registro, não como pendência para alguém decidir.

**Propagar é só para frente.** Afirmação de tarefa de número MENOR, já fechada, que a sua
mudança tornou falsa **não se reescreve**: reescrever o `Pronto quando` de tarefa encerrada
apaga o registro do que de fato foi verificado quando ela fechou. Registre a caducidade na
linha `Caducou` do seu retorno — a tarefa, a afirmação e o que a tornou falsa — e siga.

### Se a verificação não fechar

Leia o erro, corrija, rode de novo. Continuando sem passar, não declare pronto: relate o que
falha, com a saída. Nunca desative teste, marque skip, afrouxe asserção, ignore lint ou
silencie erro de tipo.

### O que devolver no fim

```
Tarefa: <nn>
Caso: fechou limpo | fechou com divergência | parou
Instruções lidas: <os caminhos, raiz e módulos>
Testes escritos: <um por comportamento do bloco `Testes`, com o arquivo; o que ficou sem
  cobertura, e por quê>
Verificações: <o que rodou, e o resultado>
Árvore de trabalho: <o que você alterou; nada é commitado por você>
Citações conferidas: <quantas você abriu ao usá-las; a que deslocou, e a que estava morta>
Propagado: <a tarefa, e o que você corrigiu no arquivo dela>   (só se houve divergência)
Caducou: <tarefa já fechada · a afirmação dela que ficou falsa · o que a tornou falsa>
                                                               (só se houve; não se reescreve)
Bloqueio: <motivo · até onde você chegou>                      (só se parou)
```
