# Faixa de avisos no topo da loja

**Protótipo:** `Black Friday - Home.html`, projeto "Uma Estrelinha - Black Friday" no Claude Design
(https://claude.ai/design/p/4abe021d-d77e-4fe7-affd-524180315fa3?file=Black+Friday+-+Home.html) — a faixa dourada
acima do cabeçalho.
**Protótipo do painel:** a tela "Faixa de avisos" em
https://claude.ai/design/p/4abe021d-d77e-4fe7-affd-524180315fa3?file=Painel+-+Campanhas%2C+faixa+e+perfil.html
(escolher a tela no painel do protótipo).
**Estado:** planejamento e protótipo. Nada implementado.

## O problema

A loja não tem lugar para avisar uma campanha em todas as páginas. O Banner principal (`hero_carousel`) vive só na
Home, e quem chega por anúncio ou pelo Google cai direto numa página de produto ou de categoria, sem ver que existe
Black Friday, desconto ou frete grátis.

## O que a dona ganha

1. **Uma faixa fina acima do cabeçalho**, em todas as páginas da loja, com avisos que se alternam: "**Black Friday**
   · novembro inteiro com joias em oferta · Ver ofertas".
2. **Texto ou imagem**: cada aviso é um texto (com um trecho em destaque e um link) ou uma arte enviada por ela.
3. **Liga e desliga no painel**, sem deploy. Pode levar até uma hora para a faixa aparecer ou sumir em todas as
   páginas (até 5 minutos em produto e categoria), e o painel avisa isso ao lado do interruptor.

## Casos de uso

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

### UC-03 · O painel
- Uma tela "Faixa de avisos": interruptor geral, a lista de avisos (arrastar para ordenar, até 5), e por aviso: tipo
  (texto ou imagem); texto: trecho em destaque, texto, rótulo do link, destino; imagem: as duas artes, texto
  alternativo, destino.
- O destino é um caminho da loja (`/ofertas`, `/aneis`), recusado pela mesma régua do Banner principal
  (`ctaHrefRefusal`): nada de endereço externo.
- Prévia: a faixa como a cliente vê, nos dois tamanhos.
- O texto de ajuda lembra o tom da loja (sem contagem regressiva, sem "últimas unidades", sem exclamação).

### UC-04 · Sem avisos
- Interruptor desligado ou lista vazia: a faixa não existe e o cabeçalho volta para o topo, como hoje.

## Regras

- **RN-01 · A loja inteira, menos o checkout.** A faixa aparece em todas as páginas do `StoreLayout`. O checkout e a
  página do pedido montado ficam sem ela: são telas de pagamento, com cabeçalho próprio e um objetivo só. Ver
  Decisão D-01.
- **RN-02 · Sem salto quando a faixa chega.** A configuração chega pelo navegador depois da primeira pintura; a faixa
  aparecendo ali empurraria a página inteira para baixo (o CLS que a feature `40` mediu e fechou). Por isso a página já
  sai do servidor dizendo se a faixa existe — em toda página da loja, Home inclusive — e a loja reserva a altura desde a
  primeira pintura. Quem decide se a faixa aparece numa visita é essa resposta do servidor; a configuração que chega
  depois só preenche os avisos.
- **RN-03 · O tom da loja.** Nenhum tipo de aviso com contagem regressiva, estoque ou prova social, e o catálogo de
  tipos asserta a ausência (como `homeSections.test.ts`). O painel não impede o texto livre; o guia de tom fica na
  ajuda da tela.
- **RN-04 · Acessibilidade.** Região com rótulo ("Avisos da loja"), sem `aria-live` no giro automático (não anunciar
  a cada 6 s), setas com rótulo, contraste do texto `ink` sobre `accent` medido nos dois perfis do WI 100.
- **RN-05 · Movimento.** Toda transição tem par `motion-reduce:`; nada nasce em opacidade zero
  (`heroCarouselSemOpacidadeZero` como molde).
- **RN-06 · Um dono do giro.** O giro, a pausa e o índice usam o mesmo hook do Banner principal (ou um extraído dele),
  não uma segunda implementação.
- **RN-07 · Celular primeiro.** Em 390×844: sem rolagem horizontal; o texto embrulha em até duas linhas; fonte do
  sistema a 200 % sem cortar o link.

## Fora

- Agendamento de avisos por data. A vigência da campanha (WI 102) pode governar a faixa depois.
- Faixa diferente por página ou por categoria.
- Fechar a faixa ("×") e lembrar que fechou.
- Contador de tempo até o fim da campanha (proibido pela regra da loja).

## Critérios de aceite

- **CA-01** Com 3 avisos de texto ligados, a faixa aparece acima do cabeçalho na Home, numa categoria e num produto;
  não aparece no checkout nem em `/pedido-montado`.
- **CA-02** Troca a cada 6 s; para com o ponteiro, com o foco e enquanto há um toque; com movimento reduzido não gira.
- **CA-03** Aviso de imagem baixa uma arte por dispositivo, no tamanho da vaga, com o texto alternativo.
- **CA-04** Destino externo é recusado no painel com o motivo; aviso sem destino é texto, sem link.
- **CA-05** Interruptor desligado: a loja é idêntica à de hoje, medida por captura em 390 e 1440.
- **CA-06** Com a faixa ligada, o CLS da Home e da página de produto não sobe (medido em navegador, rede lenta).
- **CA-07** Em 390×844 e 1440×900: sem rolagem horizontal, alvos de 44 px nas setas, texto de duas linhas sem corte.
- **CA-08** Depois de ligar, a faixa aparece em produto e categoria em até 5 minutos e em todas as páginas em até 1
  hora; nenhuma página a mostra empurrando o conteúdo nesse meio-tempo.

## Plano técnico (para a spec)

| Peça | Onde | Nota |
| --- | --- | --- |
| A configuração | `store_settings`, chave nova (ex.: `announcements`) | `{ enabled, items[] }`; tipo em `settings.ts`; migration aditiva e idempotente; tetos (5 avisos, tamanho dos textos) declarados em `core` e no `check`, guardados por um teste de schema |
| A regra | `packages/core/src/announcements/` (novo) | normaliza, recusa e ordena; o painel e a loja chamam a mesma |
| A faixa | `apps/store/src/widgets/announcement-bar` (novo), montada no `StoreLayout` | o giro do `hero-carousel` |
| Reserva de altura | `server/page.ts` + `core/page/head.ts` | atributo no `<html>`; `page.test.ts` |
| Painel | tela nova "Faixa de avisos" no grupo Loja (D-02) | envio de arte por `uploadImage` |
| Guardas | `touchTarget`, `accentText`, `contrast`, `alvoDeToqueNaoRoubaPosicao`, `reservedSlugs`/`sitemapRoutes` (se houver rota nova no painel) | |

## Decisões

- **D-01 · A faixa aparece na loja inteira, menos o checkout** (usuário, 2026-11-13, pela recomendação). Quem vem de
  anúncio cai em produto ou categoria e nunca veria um aviso só da Home.
- **D-02 · A dona edita numa tela própria, "Faixa de avisos", no grupo Loja do painel** (usuário, 2026-11-13, pela
  recomendação). Dentro de `/admin/home` ela pareceria ser só da Home. Rota nova no painel: `navItems`,
  `focusRoutes`, `rotasSobGuarda`.
- **D-03 · A cor da faixa é fixa: `accent` (ouro) com texto `ink`** (usuário, 2026-11-13, pela recomendação). Segue
  os tokens, então muda com o perfil de estilo (WI 100) sem campo de cor; cor por aviso abriria combinações sem
  contraste.

## Perguntas em aberto

Nenhuma.

---
Fonte: escrito na sessão de 2026-11-13 a partir do pedido do usuário, do protótipo `Black Friday - Home.html` e da
leitura do cromo da loja, do `hero-carousel`, de `server/page.ts` e do `CLAUDE.md` da loja (CLS da feature `40`).

## Histórico de revisões

r1 · 2026-11-13 · home-nao-passa-pela-funcao-api-page, atraso-entre-ligar-e-aparecer, altura-unica-da-faixa, arte-entre-768-e-1440, giro-diferente-do-hook-do-banner
