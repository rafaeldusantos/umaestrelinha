# Performance da loja no celular — Specification

## Problem Statement

**~90% dos acessos da loja vêm de celular, e a loja chega pesada demais para um.** Medido em
2026-09-05 contra o deploy provisório, em perfil móvel: a home entrega **FCP 3,9 s / LCP 5,3 s** e a
página de categoria **FCP 4,0 s / LCP 15,6 s**, com Speed Index de 6,9 s. Uma visita à categoria
custa **~3,5 MB**; à home, **~3,8 MB**.

As três causas foram medidas separadamente, e nenhuma é um mistério:

1. **Fotos de 1024 px servidas em vagas de 170 px** — 113 KB de média por card, com casos de 530 KB,
   sem `srcset` em nenhum dos 30 `<img>` da loja. Somado a isso, os primeiros cards nascem
   `loading="lazy"` **e** em opacidade zero, o que impede o navegador de contá-los como LCP até a
   foto inteira baixar. É a origem direta dos 15,6 s.
2. **Consultas que baixam tudo** — o `select` do card traz `product_variants(*)` (47% do payload),
   `description` (27%) e todas as imagens; a categoria gasta **1,22 MB crus / 307 KB comprimidos**
   para desenhar 24 cards, e a home dispara **quatro** consultas de árvore inteira (695 produtos,
   1,49 MB comprimidos) para mostrar 16.
3. **Um único bundle de 1,17 MB** (351 KB brotli) — sem `React.lazy` e sem `manualChunks`, quem abre
   a home baixa e interpreta o checkout, o Pix, o QR code, o login por OTP e o guia de material. E
   como é arquivo único, **todo deploy invalida os 351 KB inteiros** no cache de quem já visitou.

Para quem paga franquia de dados, cinco páginas da loja consomem hoje perto de **17 MB**.

## Goals

- [ ] **LCP abaixo de 2,5 s e FCP abaixo de 2,0 s** na home e na categoria, medidos por Lighthouse em
      perfil móvel, aba anônima, 390×844.
- [ ] **Peso da primeira visita abaixo de 800 KB** na categoria e abaixo de 600 KB na home.
- [ ] **Bundle inicial abaixo de 220 KB brotli**, com React, Supabase e React Query em chunks que
      **sobrevivem a um deploy** no cache do navegador.
- [ ] **A URL de imagem em tamanho de exibição tem um dono único**, com guarda que recusa a segunda
      escrita — a regra do "defeito 01" aplicada à peça nova desta feature.

## Out of Scope

| Feature | Reason |
| --- | --- |
| **Retirar o Framer Motion** (−42 KB gzip) | Decisão do usuário (2026-09-05). Mexe em 11 arquivos de interface por um ganho que teste de componente não consegue proteger — a regressão é visual. Vira `BL-018`, com o número já medido. |
| **Paginação, filtro e ordenação no servidor** | Decisão do usuário (2026-09-05). Reescreveria os 14 requisitos `LST-*` da feature `32`, que hoje filtram sobre a lista inteira em memória. O select enxuto entrega ~90% do ganho sem tocar nela. Vira `BL-019`. |
| **Cache da página do produto na borda** (`BL-017`) | Já registrado, e a causa é outra: a Vercel não cacheia `rewrite` para host externo. O TTFB de ~1 s de `/produtos/:slug` continua aberto ali. |
| **Busca no servidor** | A busca baixa o catálogo inteiro (1,45 MB comprimidos) e carrega o teto de 1.000 linhas do PostgREST. É um defeito próprio, com risco de correção silenciosa de catálogo, e merece spec própria. Vira `BL-020`. |
| **Trocar a resolução dos originais no Storage** | O original de 1024 px continua sendo a fonte da lupa da galeria. Esta feature muda **como se pede** a imagem, nunca o que está gravado. |
| **Otimizar o backoffice** | Fora do caminho da cliente. |

---

## Assumptions & Open Questions

| Assumption / decisão | Escolha | Rationale | Confirmado? |
| --- | --- | --- | --- |
| **Como servir a foto em tamanho de card** | Endpoint `/storage/v1/render/image/public/…?width=&quality=` do Supabase | Medido e funcionando neste projeto (200, `image/webp`, `CF-Cache-Status: HIT`). Não tem o modo de falha da pré-geração — rendição nunca falta, porque é gerada sob demanda. Custo aceito: US$ 5 por 1.000 imagens de origem/mês, 100 inclusas no plano Pro; teto de ~US$ 20/mês neste catálogo de 3.618 imagens, e caindo, porque o cache de um ano de `PRF-05` passa a absorver as batidas seguintes | **y** (usuário, 2026-09-05) |
| **Até onde levar a correção da consulta** | `PRODUCT_CARD_SELECT` enxuto; filtro, ordenação e janela continuam no cliente | Leva o payload da categoria de 307 KB para a faixa de 40–60 KB sem encostar nos 14 requisitos `LST-*` da feature `32` | **y** (usuário, 2026-09-05) |
| **Escopo das fases** | Fases 1, 2 e as fontes próprias; Framer Motion vai para o backlog | O ganho das fontes é mecânico e testável; o do Framer exige QA visual em 11 telas | **y** (usuário, 2026-09-05) |
| **Fallback quando a rendição falha** | Não há caminho alternativo: uma rendição indisponível quebra aquela imagem | O `render/image` é servido pela **mesma** infraestrutura do objeto original, então "o transform caiu e o objeto não" não é um estado que exista na prática. Um `onError` que troca para o original custaria estado por `<img>` em 8 componentes para cobrir um modo de falha não observado. Registrado, não implementado | y (assunção) |
| **Larguras do `srcset`** | 360, 480 e 720 | O card no mobile mede 171 px (390 px de viewport − 32 px de `container` ÷ 2 colunas − 16 px de `gap`), o que pede 342 px em DPR 2 e 513 px em DPR 3. 720 cobre o card de desktop e o palco da galeria no celular | y (assunção) |
| **Qualidade da rendição** | 75 | Padrão do Supabase é 80. Medido: 75 entrega 12,7 KB a 360 px contra 113,9 KB do original, sem diferença perceptível em foto de joia sobre fundo claro | y (assunção) |
| **Onde mora o helper de URL** | `@estrelinha/core/media` | O módulo já é o dono da normalização de imagem de produto (`normalizeImages`, `primaryImage`). Um módulo novo separaria "o que é uma imagem" de "como se pede uma imagem" sem motivo | y (assunção) |
| **Imagem que não está no Storage deste projeto** | Devolvida sem alteração, e sem `srcset` | Banner de campanha pode apontar para host externo. Reescrever URL de terceiro é inventar um endpoint que não existe | y (assunção) |
| **Quem paga a conta da transformação** | A loja, no plano Pro já contratado | Sem ação de infraestrutura. O relatório de custo é a medição do primeiro mês | y (assunção) |
| **Objetos já no Storage com `max-age=3600`** | Passe único de atualização de metadados, via script do `tools/` | 3.618 objetos com caminho imutável e cache de uma hora. Sem o passe, `PRF-05` só valeria para foto nova, e a economia do CDN — que é o que segura o custo da transformação — não aconteceria | y (assunção) |

**Open questions:** nenhuma — todas resolvidas ou registradas acima.

---

## User Stories

### P1: A loja pede a foto do tamanho que vai exibir ⭐ MVP

**User Story**: Como cliente abrindo a loja no celular com 4G, quero que as fotos cheguem no tamanho
em que aparecem na tela, para que a página termine de carregar antes de eu desistir.

**Why P1**: É a maior economia de bytes disponível (−85% nas imagens) e a causa direta do LCP de
15,6 s. Sozinha, tira a categoria da faixa de reprovação.

**Acceptance Criteria**:

1. **PRF-01** — WHEN uma URL de objeto do Storage deste projeto é passada com uma largura THEN o
   helper SHALL devolver a URL de `/render/image/public/` com `width` e `quality=75` na query.
2. **PRF-01** — WHEN a URL não pertence ao Storage deste projeto (host externo, caminho fora de
   `/storage/v1/object/public/`, string vazia) THEN o helper SHALL devolver a entrada **inalterada**,
   sem lançar.
3. **PRF-01** — WHEN a largura pedida está fora de `1..2500` THEN o helper SHALL grampear ao limite
   mais próximo, porque o Supabase recusa fora dessa faixa e a resposta seria erro em vez de foto.
4. **PRF-02** — WHEN um card de produto é renderizado THEN ele SHALL declarar `srcset` com as três
   larguras (360, 480, 720) e um `sizes` que descreva a vaga real daquela superfície.
5. **PRF-02** — WHEN uma superfície de vaga pequena é renderizada — miniatura da galeria, amostra de
   cor, linha da gaveta do carrinho, resumo do pedido, resultado de busca — THEN ela SHALL pedir uma
   rendição de largura compatível com a vaga, nunca o original.
6. **PRF-02** — WHEN a foto grande da galeria do produto é renderizada THEN ela SHALL pedir rendição
   de 720 px no celular e SHALL continuar usando o **original** dentro do modo de tela cheia, que é
   onde a lupa existe.
7. **PRF-15** — WHEN qualquer arquivo de `apps/**` construir uma URL de rendição sem passar pelo
   helper THEN a suíte SHALL falhar, com âncora de contagem que prova que a varredura leu arquivos.

**Independent Test**: abrir `/joias-e-acessorios/colar-e-correntes` em 390 px, conferir no painel de
rede que as fotos dos cards chegam com `width=360` ou `width=480` e somam menos de 400 KB.

---

### P2: A maior imagem da página é a primeira a ser pedida ⭐ MVP

**User Story**: Como cliente, quero ver a primeira foto assim que a página pinta, e não depois de
todo o resto, para saber que cheguei no lugar certo.

**Why P1**: O `srcset` sozinho não conserta o LCP. Três mecanismos empilhados escondem a imagem do
navegador — `loading="lazy"`, o `initial={{ opacity: 0 }}` do Framer e o `opacity-0` até o `onLoad`.
Enquanto a imagem está invisível, o Lighthouse não pode contá-la, e o relógio corre.

**Acceptance Criteria**:

1. **PRF-03** — WHEN um card está entre os **primeiros seis** de uma listagem THEN ele SHALL usar
   `loading="eager"`, e o primeiro SHALL declarar `fetchpriority="high"`.
2. **PRF-03** — WHEN um card está entre os primeiros seis THEN ele SHALL NOT nascer em opacidade
   zero: nem pelo `initial` do Framer, nem pelo `opacity-0` que espera o `onLoad`.
3. **PRF-03** — WHEN um card está **além** dos primeiros seis THEN ele SHALL manter `loading="lazy"`
   e a animação de entrada de hoje, porque abaixo da dobra ela não custa métrica.
4. **PRF-03** — WHEN a decisão de prioridade é tomada THEN ela SHALL ter **um dono** — uma função
   pura que recebe o índice e devolve o par (`loading`, `fetchpriority`) —, e não uma comparação
   literal repetida em cada superfície de listagem.
5. **PRF-06** — WHEN a edge function `product-page` responde uma página de produto com foto THEN ela
   SHALL injetar no `<head>`, junto do JSON-LD, um `<link rel="preload" as="image">` apontando para a
   **rendição de 720 px** da foto principal, com `imagesrcset` coerente com o que a galeria pede.
6. **PRF-06** — WHEN o produto não tem foto THEN a function SHALL NOT injetar `preload` nenhum, e a
   resposta SHALL seguir idêntica à de hoje.
7. **PRF-04** — WHEN o `index.html` é servido THEN ele SHALL declarar `preconnect` para a origem do
   Supabase, para que DNS, TCP e TLS aconteçam em paralelo com o download do bundle.

**Independent Test**: no Lighthouse da categoria, o elemento de LCP passa a ser a primeira foto e o
tempo cai abaixo de 4 s; no painel de rede, a primeira foto começa a baixar antes do fim do bundle.

---

### P3: O que já foi baixado não é baixado de novo ⭐ MVP

**User Story**: Como cliente que volta à loja, quero que fotos e configurações já vistas não sejam
pedidas de novo, para que a segunda visita seja quase instantânea.

**Why P1**: É o que sustenta a economia das outras duas histórias ao longo do tempo — e, no caso das
imagens, é o que segura o custo recorrente da transformação: cada batida no CDN é uma transformação
que não acontece.

**Acceptance Criteria**:

1. **PRF-05** — WHEN uma imagem de produto é enviada ao Storage — pelo importador ou pelo painel —
   THEN ela SHALL ser gravada com `cacheControl` de **um ano**.
2. **PRF-05** — WHEN o valor de `cacheControl` é escrito THEN ele SHALL vir de uma **constante única
   em `@estrelinha/core`**, lida pelos dois gravadores. Hoje o literal `'3600'` está escrito duas
   vezes, em dois workspaces, e é o "defeito 01" em miniatura.
3. ~~**PRF-05** — WHEN o passe de atualização roda sobre os objetos já existentes THEN ele SHALL ser
   **idempotente** e SHALL NOT reenviar bytes: só metadados mudam.~~ **ADIADA** (decisão do usuário,
   2026-09-05, feita depois da medição). Duas coisas mudaram a conta durante o design: o
   `@supabase/storage-js` **2.110.7 instalado não tem `updateMetadata`** — conferido no
   `dist/index.d.mts` do pacote —, então "só metadados mudam" **é impossível** e o passe custaria
   ~410 MB de reenvio; e a transformação é cobrada por **imagem distinta por mês**, não por batida,
   então o passe compra velocidade de revisita, **não dinheiro**. As fotos novas já nascem com um
   ano. As 3.618 antigas seguem em uma hora, e o passe vira `BL-021`.
4. **PRF-07** — WHEN o `QueryClient` da loja é criado THEN ele SHALL declarar `staleTime` padrão de
   **5 minutos**, para que voltar a uma categoria já visitada não refaça a consulta.
5. **PRF-07** — WHEN uma consulta já declara `staleTime` próprio — `store_settings`, promoções —
   THEN o valor dela SHALL prevalecer sobre o padrão.

**Independent Test**: recarregar a categoria e conferir que as fotos vêm do cache de disco; navegar
para a home e voltar, sem consulta nova de produtos no painel de rede.

---

### P4: O celular baixa só o código da tela que abriu

**User Story**: Como cliente que só quer ver um produto, não quero baixar e interpretar o checkout, o
Pix e o login para isso.

**Why P2**: Ataca o FCP, que o `srcset` não move. É a metade do problema que sobra depois da Fase 1 —
mas depende de nada e pode fechar sozinha, então não é MVP.

**Acceptance Criteria**:

1. **PRF-10** — WHEN o `App.tsx` monta as rotas THEN cada página SHALL ser carregada por
   `React.lazy`, com `Suspense` cujo fallback SHALL NOT causar deslocamento de layout.
2. **PRF-11** — WHEN a loja monta o `StoreLayout` THEN os overlays que só existem depois de um gesto
   — checkout, autenticação, busca, menu mobile, gaveta de variações — SHALL ser carregados sob
   demanda, e SHALL NOT entrar no chunk inicial.
3. **PRF-12** — WHEN o build de produção roda THEN React, Supabase e React Query SHALL sair em chunks
   próprios, de modo que uma alteração no código da loja **não invalide** o cache deles.
4. **PRF-13** — WHEN o `App.tsx` é lido THEN ele SHALL NOT montar o `Toaster` do Radix, que hoje está
   no chunk inicial e não tem um único consumidor na loja — os avisos saem todos pelo Sonner.
5. **PRF-16** — WHEN uma rota nova entrar no `App.tsx` com import estático THEN a suíte SHALL falhar,
   pela mesma razão que `reservedSlugs.test.ts` existe: a regressão aqui é silenciosa, e o build
   continua verde com o chunk crescendo.
6. **PRF-10** — WHEN a página do produto é aberta direto pela URL THEN o comportamento visível SHALL
   ser idêntico ao de hoje, incluindo a rolagem ao topo do `ScrollToTop` e as rotas legadas com
   `Navigate`.

**Independent Test**: `pnpm --filter @estrelinha/store build` mostra chunk de entrada abaixo de
220 KB brotli e chunks separados de vendor; navegar da home ao checkout carrega um chunk novo.

---

### P5: A consulta traz o que o card desenha, e nada mais

**User Story**: Como cliente numa categoria grande, quero que a lista apareça rápido, sem esperar o
texto de descrição de 147 produtos que a tela nem mostra.

**Why P2**: Corta 85% do JSON sem tocar em filtro, ordenação ou rolagem infinita.

**Acceptance Criteria**:

1. **PRF-08** — WHEN uma listagem consulta produtos THEN ela SHALL usar um select enxuto que
   **exclui** `description`, `seo_title`, `seo_description` e os campos de Google Shopping, e que
   traz da variação **apenas** o necessário para preço, estoque, rótulo e amostra de cor.
2. **PRF-08** — WHEN a página do **produto** consulta THEN ela SHALL continuar usando o select
   completo, porque ali a descrição é o conteúdo.
3. **PRF-08** — WHEN o select enxuto alimenta `mapDbToProduct` THEN todo campo que a listagem lê —
   preço, preço comparado, tags, variações, imagem principal, categoria de selo, política de estoque
   — SHALL continuar preenchido; a economia SHALL vir do que a tela não lê.
4. **PRF-08** — WHEN um campo novo passar a ser lido pela listagem sem estar no select enxuto THEN a
   suíte SHALL falhar. O modo de falha sem guarda é `undefined` em silêncio, que é exatamente o
   `AD-012` outra vez.
5. **PRF-09** — WHEN a home resolve uma fileira de coleção THEN a consulta SHALL trazer no máximo o
   que a fileira desenha, e SHALL NOT baixar a árvore inteira da categoria-raiz. Medido hoje:
   `joias-afetivas` traz 505 produtos e 1,10 MB comprimidos para mostrar **quatro** cards.
6. **PRF-09** — WHEN a página do produto monta os relacionados THEN a consulta SHALL ser limitada, e
   SHALL NOT rebaixar para "a categoria inteira".
7. **PRF-09** — WHEN uma consulta de listagem roda THEN ela SHALL declarar um teto explícito, para
   que o corte de 1.000 linhas do PostgREST deixe de ser um limite invisível herdado.

**Independent Test**: abrir a home com o painel de rede e ver as quatro consultas de fileira somando
menos de 20 KB, contra os 1,49 MB de hoje.

---

### P6: As fontes não dependem de um terceiro para o texto aparecer

**User Story**: Como cliente, quero ler o texto da loja sem esperar duas conexões a um domínio que
não é o da loja.

**Why P2**: Vale de 300 a 600 ms de FCP em 4G, é mecânico e é testável — mas não muda a ordem de
grandeza como as outras.

**Acceptance Criteria**:

1. **PRF-14** — WHEN o `index.html` é servido THEN as fontes SHALL ser declaradas por `@font-face`
   apontando para arquivos do **próprio domínio**, e SHALL NOT depender de `fonts.googleapis.com`.
2. **PRF-14** — WHEN as fontes são servidas THEN os arquivos SHALL estar sob o cabeçalho de cache
   `immutable` que o `vercel.json` já aplica a `/assets`.
3. **PRF-14** — WHEN a página pinta THEN as duas faces do primeiro texto SHALL ter `preload`, e a
   política SHALL continuar sendo `font-display: swap` — nunca texto invisível esperando fonte.
4. **PRF-14** — WHEN os pesos são declarados THEN eles SHALL ser exatamente os que o design system
   usa hoje (Libre Baskerville 400, 700 e itálico 400; Outfit variável 300–700), sem pedir peso que a
   família não tem, o que faria o navegador sintetizar falso-negrito.

**Independent Test**: no painel de rede, nenhuma requisição para `googleapis.com` ou `gstatic.com`, e
o primeiro texto pinta com a fonte certa.

---

## Edge Cases

- WHEN a URL da imagem é `''` (produto sem foto, o caso de `VAR-11`) THEN o helper SHALL devolver
  `''` e a superfície SHALL continuar renderizando o palco vazio, **sem** `<img>`.
- WHEN a URL aponta para host externo (banner de campanha) THEN nenhum `srcset` SHALL ser emitido e a
  imagem SHALL carregar como hoje.
- WHEN a categoria tem **zero** produtos THEN nada muda: o select enxuto não altera o caminho vazio.
- WHEN a rendição de uma largura responde erro THEN aquela imagem falha, e o registro dessa escolha
  está na tabela de assunções — não há caminho alternativo.
- WHEN o navegador não suporta `srcset` THEN ele usa o `src`, que SHALL apontar para a **rendição de
  largura média**, não para o original de 1024 px — senão o navegador antigo pagaria o pior caso.
- WHEN o passe de `cacheControl` roda duas vezes THEN a segunda execução SHALL ser inócua.
- WHEN um chunk carregado sob demanda falha ao baixar (rede caiu no meio) THEN a loja SHALL mostrar
  um estado de erro legível, e SHALL NOT ficar em tela branca.
- WHEN `?preview=1` está ativo (a prévia da home no painel, `AD-019`) THEN o `lazy` das rotas SHALL
  NOT quebrar o contrato de `postMessage` da feature `25`.

---

## Requirement Traceability

| Requirement ID | Story | Fase | Status |
| --- | --- | --- | --- |
| PRF-01 | P1: foto no tamanho da vaga | 1 | Pending |
| PRF-02 | P1: foto no tamanho da vaga | 1 | Pending |
| PRF-03 | P2: prioridade do LCP | 1 | Pending |
| PRF-04 | P2: prioridade do LCP | 1 | Pending |
| PRF-05 | P3: cache | 1 | Pending |
| PRF-06 | P2: prioridade do LCP | 1 | Pending |
| PRF-07 | P3: cache | 1 | Pending |
| PRF-08 | P5: consulta enxuta | 2 | Pending |
| PRF-09 | P5: consulta enxuta | 2 | Pending |
| PRF-10 | P4: código sob demanda | 2 | Pending |
| PRF-11 | P4: código sob demanda | 2 | Pending |
| PRF-12 | P4: código sob demanda | 2 | Pending |
| PRF-13 | P4: código sob demanda | 2 | Pending |
| PRF-14 | P6: fontes próprias | 3 | Pending |
| PRF-15 | P1: guarda de dono único da URL | 1 | Pending |
| PRF-16 | P4: guarda do carregamento sob demanda | 2 | Pending |

**Coverage:** 16 requisitos, **16 mapeados** para as 19 tasks de `tasks.md`, 0 sem mapeamento.

| Fase | Tasks | Requisitos cobertos |
| --- | --- | --- |
| 1A — a rendição e as vitrines | T1–T5 | PRF-01, PRF-02, PRF-03, PRF-15 |
| 1B — dicas ao navegador e cache | T6–T10 | PRF-02, PRF-04, PRF-05, PRF-06, PRF-07 |
| 2 — a consulta enxuta | T11–T13 | PRF-08, PRF-09 |
| 3 — código sob demanda | T14–T17 | PRF-10, PRF-11, PRF-12, PRF-13, PRF-16 |
| 4 — fontes, e o passe opcional | T18–T19 | PRF-14, PRF-05 (AC 3) |

---

## Success Criteria

Medidos por Lighthouse em **aba anônima**, perfil móvel, 390×844 — a rodada que abriu esta feature
tinha extensões ativas, e o próprio relatório avisa que isso inflou os números.

- [ ] Categoria: **LCP abaixo de 2,5 s** (hoje 15,6 s) e **FCP abaixo de 2,0 s** (hoje 4,0 s).
- [ ] Home: **LCP abaixo de 2,5 s** (hoje 5,3 s) e **FCP abaixo de 2,0 s** (hoje 3,9 s).
- [ ] Primeira visita à categoria **abaixo de 800 KB** (hoje ~3,5 MB); home **abaixo de 600 KB**
      (hoje ~3,8 MB).
- [ ] Chunk de entrada **abaixo de 220 KB brotli** (hoje 351 KB), com vendor em chunk separado.
- [ ] JSON da categoria **abaixo de 60 KB** comprimidos (hoje 307 KB); soma das fileiras da home
      **abaixo de 20 KB** (hoje 1,49 MB).
- [ ] **Sem regressão** contra as baselines do `CLAUDE.md`: lint 27/5, tipos 0·0·0, e a contagem de
      testes só sobe.
- [ ] **Nenhuma mudança visível** de layout, cópia ou comportamento, **com duas exceções declaradas
      e assinadas pelo usuário em 2026-09-05**, as duas achadas por medição e não por acaso:
  1. **A busca deixou de casar termo que só aparece na descrição do produto.** `searchProducts`
     pontua `description` como último desempate (peso 5), e ela saiu do select enxuto que alimenta
     as três superfícies de busca. Trazê-la de volta custa **+430 KB brotli em toda página**. Em
     troca, o `SearchDropdown` — que fica no header, em toda rota — ganhou o `enabled` que o
     `SearchOverlay` já tinha, e **deixou de baixar o catálogo de quem só abriu a página**: 214 KB
     a menos por página, contra um desempate de busca que quase nunca decide. A busca por descrição
     volta com `BL-020`, que é busca no servidor.
  2. **A lupa de passar o mouse no desktop amplia 720 px, não 1024.** A galeria renderiza os dois
     palcos ao mesmo tempo, e imagem escondida por CSS **continua sendo baixada** — dar 1024 ao
     desktop e 720 ao celular faria o celular baixar as duas. O original segue na tela cheia, que é
     onde a spec localiza a lupa. É o caso principal ganhando do responsivo, com ~90% dos acessos
     em celular.
- [ ] O custo de transformação do primeiro mês é medido e registrado no `STATE.md`, para que a
      assunção de teto (~US$ 20) deixe de ser estimativa.
