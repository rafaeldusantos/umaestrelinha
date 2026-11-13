# 101 · Faixa de avisos no topo da loja (textos ou imagens que se alternam)

Costura de 2026-11-13. PRD r1.

Registro do que se descobriu e decidiu nesta data — **não** descrição do estado atual do código.
Critérios de aceite: `prd.md`, ao lado. Convenção de cada repositório: o arquivo de instruções dele.

## Escopo

| UC    | Título              | Origem               |
| ----- | ------------------- | -------------------- |
| UC-01 | A faixa na loja     | caso de uso do PRD   |
| UC-02 | Aviso de imagem     | caso de uso do PRD   |
| UC-03 | O painel            | caso de uso do PRD   |
| UC-04 | Sem avisos          | caso de uso do PRD   |

**Achados de eval que este Work Item resolve**

`nada` — o repositório não tem relatório de avaliação local (`.specs/evals/` não existe).

**Anexos consultados**

| Insumo (caminho ou URL) | Tipo | O que se tirou | Alimenta |
| ----------------------- | ---- | -------------- | -------- |
| `prd.md` | PRD | os UCs, RN-01..07, CA-01..08, D-01..03 | todos |
| Claude Design `4abe021d…` · `Black Friday - Home.html` | protótipo | a faixa da loja (`FaixaTopo`, `bf.css`), ver **Design** | UC-01, UC-02, UC-04 |
| Claude Design `4abe021d…` · `Painel - Campanhas, faixa e perfil.html` | protótipo | a tela "Faixa de avisos" (`adm-faixa-perfil.jsx`), ver **Design** | UC-03 |
| `apps/store/src/widgets/header/ui/Header.tsx`, `widgets/store-layout`, `shared/lib/storeChrome` | código | o cromo; ver **Código** | UC-01 |
| `apps/store/src/widgets/hero-carousel` (`useHeroCarousel`) | código | o giro, a pausa, o movimento reduzido | UC-01 |
| `ctaHrefRefusal` (`@estrelinha/core/home`) | código | a régua de destino, que aceita `//` | UC-03 |
| `apps/backoffice/src/shared/lib/uploadImage.ts` | código | o motor de envio de arte | UC-02, UC-03 |
| `apps/store/server/page.ts`, `packages/core/src/page/head.ts` | código | o HTML servido; a Home não passa pela função | UC-01, UC-04 |

## Fora do escopo

- Agendamento de avisos por data. A vigência da campanha (WI 102) pode governar a faixa depois.
- Faixa diferente por página ou por categoria.
- Fechar a faixa ("×") e lembrar que fechou.
- Contador de tempo até o fim da campanha (proibido pela regra da loja).

## Design

Fontes: as duas URLs do Claude Design em `item.md` › Insumos (projeto `4abe021d-d77e-4fe7-affd-524180315fa3`,
arquivos `Black Friday - Home.html` e `Painel - Campanhas, faixa e perfil.html`); o `prd.md` as cita no cabeçalho, não
numa seção UI/UX. Mecânica `claude_design` (`PROJECT.md`).

### A faixa na loja (`FaixaTopo`) — UC-01, UC-02, UC-04

- Região rotulada antes do `<header>`, largura total, fundo `accent`, texto `ink`; rola com a página, só o cabeçalho
  gruda.
- Miolo centralizado, máx. 1280 px, recuo 8 px, 4 px entre itens: [seta "Aviso anterior"] [conteúdo] [seta "Próximo
  aviso"].
- Aviso de texto: um link inteiro — trecho em destaque (peso 700) + " · " + texto + rótulo sublinhado (peso 600,
  sublinhado afastado 3 px, nunca quebra no meio); centralizado, quebra balanceada; fonte 13 px no celular, 14 px a
  partir de 768 px; altura de linha 18 px; peso 500; 8 px de recuo vertical.
- Setas: área visível 32 × 40, alvo de 44 × 44, chevron 16 px em `ink`; visíveis a partir de 768 px.
- Entrada de cada aviso: deslocamento vertical de 6 px em 300 ms, só com `prefers-reduced-motion: no-preference`; nada
  mexe na opacidade.
- Desligada: nada é renderizado.
- Textos de exemplo: "**Black Friday** · novembro inteiro com joias em oferta · Ver ofertas"; "**10%, 15% e 20% de
  desconto** · em peças selecionadas · Ver as peças"; "**Frete grátis** · acima de R$ 450,00 para Sul e Sudeste · Como
  funciona".
- O design não mostra: aviso sem destino, lista de um aviso, limite de duas linhas, reserva de altura, ausência no
  checkout, a arte do celular na vaga, foco visível.

### A tela "Faixa de avisos" do painel — UC-03

- Casco: grupo **Loja** (Home, Menu da loja, **Faixa de avisos**); trilha "Loja › Faixa de avisos"; título "Faixa de
  avisos"; subtítulo "A faixa fina acima do cabeçalho, em todas as páginas da loja (menos o checkout). Um aviso por
  vez, trocando a cada 5 segundos." (o número vale 6, Decisão H-15).
- Card do interruptor: "Faixa ligada", descrição "Desligada, a faixa some e o cabeçalho volta para o topo." (switch).
- Card "Como a cliente vê" (região "Prévia da faixa"): "Aviso N de M", botões "Aviso anterior"/"Próximo aviso" (só com a
  faixa ligada e mais de um aviso); duas molduras, computador e "celular · 390 px". Desligada ou vazia: "A faixa está
  desligada: a loja abre sem ela.".
- Card "Avisos": contador "N de 5"; ajuda "Sem contagem regressiva, sem “últimas unidades” e sem exclamação: o tom da
  loja vale aqui também."; lista sanfonada (um aberto por vez); por aviso: número, botão-resumo (mín. 44 px; linha 1
  "destaque · texto" ou o alternativo/"Aviso de imagem", linha 2 "Texto|Imagem · <destino ou 'sem link'>"), "Subir o
  aviso N" (desabilitado no 1º), "Descer o aviso N" (desabilitado no último), "Tirar o aviso N" (sem confirmação);
  "+ Adicionar aviso" (cria texto vazio, já aberto) some com 5.
- Corpo do aviso: "Tipo do aviso" (Texto/Imagem, radiogroup, padrão Texto); grade de 2 colunas, 1 abaixo de 1024.
  - Texto: "Trecho em destaque" (40, contador), "Texto" (60, contador), "Rótulo do link" (20, exemplo "Ver ofertas"),
    "Destino" (exemplo "/ofertas"; dica "Sem destino, o aviso é só texto."; recusa "Use um caminho da loja, começando
    com / (ex.: /ofertas). Endereço de fora não é aceito.").
  - Imagem: "Enviar arte · 1440 × 48", "Enviar arte · 780 × 96", "Texto alternativo" obrigatório (vazio: "Descreva a
    arte: é o que o leitor de tela e o Google leem."; dica "O que está escrito na arte."), "Destino".
- Barra de salvar: com recusa, "Corrija o que está marcado para salvar." e Salvar desabilitado.
- O design não mostra: carregando, salvando, erro, salvo, alteração não salva; prévia/troca/remoção/falha de envio da
  arte; recusa de mais de 5; recusa de duas linhas; o aviso do atraso; arrastar.

Divergências entre fontes e com o PRD, e o que valeu:

| Divergência | O que valeu | Quem decidiu |
| --- | --- | --- |
| Giro de 5 s (protótipo) × 6 s (PRD) | 6 s | humano no gate do PRD Tech Review (`giro-diferente-do-hook-do-banner`) |
| Pausa só ponteiro e foco (protótipo) × também o dedo (PRD) | ponteiro, foco e dedo | idem |
| Altura mínima que cresce (protótipo) × altura fixa por dispositivo (PRD) | altura fixa | idem (`altura-unica-da-faixa`) |
| A arte do protótipo é placeholder sem link nem alternativo × UC-02 | UC-02 | PRD |
| Prévia desenhada pelo painel (protótipo) × a loja num iframe | iframe | humano no gate do PRD Tech Review (`previa-e-a-loja-num-iframe`) |
| "Salvo, a faixa muda na próxima página que a cliente abrir." × CA-08 | frase do atraso, Decisão H-14 | humano no gate principal |
| Rótulo da região "Avisos da Black Friday" × "Avisos da loja" | "Avisos da loja" | humano no gate principal (H-11) |
| Subir/descer (protótipo) × arrastar (PRD) | os dois | humano no gate principal (H-08) |
| Desligar a faixa tira o link "Black Friday" dos departamentos (protótipo) | fora: é de outra peça (WI 102) | humano no gate principal (H-16) |
| O interruptor nasce ligado (protótipo) | nasce desligado | humano no gate do PRD Tech Review (`store-settings-sem-migration-nem-check`) |

## Código — /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-101

- **Instruções** — `packages/core/CLAUDE.md` (índice, "Quando um código pertence", "Pureza", "Os módulos", "home",
  "media/surfaceArt", "Convenções de tipo"); `packages/ui/CLAUDE.md`; `DESIGN.md` (§2, §6–§8). Grandes demais, por
  seção: `CLAUDE.md` › Feature-Sliced Design · O "defeito 01" · Convenções que valem em todo o repositório · Os guardas
  · Baselines · CI e deploy; `apps/store/CLAUDE.md` › O HTML servido — a função `api/page` · A home não salta
  enquanto carrega · Banner principal · A Home é dado / Modo prévia · Carrinho, chrome e checkout · Menu (consumo) ·
  Quem pode enquadrar a loja; `apps/backoffice/CLAUDE.md` › A sidebar · A coluna é FIXA · O modo de foco · Molde dos
  formulários · Gravar NÃO desmonta · O movimento do painel · A ponte da prévia · `/admin/menu`.
- **Recorte** — UC-01, UC-02, UC-03, UC-04.
- **O que já serve**
  - O catch-all já leva todo caminho, `/` inclusive, à função: `apps/store/vercel.json:24`; `apps/store/server/page.ts
    › originalUrl` (:70-79). `vercelRedirects.test.ts:383-389` (âncora de 2 rewrites) continua valendo.
  - `/` é classificado `app` e servido como shell com 3600 s: `packages/core/src/page/classify.ts:67`; `serve.ts:181-182`;
    `serve.ts:116-121` (`PAGE_CACHE`).
  - Erro de leitura devolve o shell com `no-store`: `serve.ts › falha` (:160-164); `server/page.ts:221-225`.
  - O shell é o `dist/index.html` embutido como `__SHELL__`: `apps/store/scripts/build-server.mjs:20,23-29,39`;
    `scripts/shell.mjs › lerShell` (:8-19). O `<html lang="pt-BR">` é único: `apps/store/index.html:2`.
  - `readSettings` lê `store_settings` com a chave publicável: `server/page.ts:166-181`; leitura pública
    `supabase/migrations/20260417015945_create_store_settings.sql:28-32`; escrita só admin (`:44-49`).
  - O cromo, em ordem: `apps/store/src/widgets/store-layout/ui/StoreLayout.tsx:86-131` (`<Header />` em :88).
  - Fora do `StoreLayout`: `apps/store/src/app/App.tsx:222` `/checkout`, `:238` `/pedido/:id/pagamento`, `:245`
    `/pedido-montado`, `:246` `/pagar-com-cartao`, `:248` `*`; dentro: `:157-214`.
  - O cabeçalho é `sticky top-0 z-50` e se recolhe por `translate`: `widgets/header/ui/Header.tsx:124-138`;
    `shared/lib/useScrollDirection.ts:28` (`TOP_ZONE = 64`).
  - O giro, a pausa e o índice: `widgets/hero-carousel/model/useHeroCarousel.ts › useHeroCarousel` (:78-176); sem
    `trackRef`, `goTo` só troca o índice (:96-100) e a rolagem sai cedo (:118-119). `HERO_CAROUSEL_INTERVAL_MS = 6000`
    e `nextSlideIndex`: `packages/core/src/home/carousel.ts:63`.
  - `<picture>` por dispositivo, rendição da vaga, `eager` no primeiro: `widgets/hero-carousel/ui/HeroCarousel.tsx ›
    Arte` (:83-118). `packages/core/src/media/rendition.ts › renditionUrl` (:156), `renditionSrcSet` (:177),
    `RENDITION_RESIZE` (:89); `media/surfaceArt.ts`.
  - A prévia: `packages/core/src/home/preview.ts › isPreviewWindow` (:83-90), `PREVIEW_DEVICES` (:135-138),
    `previewFrame` (:200-225), `previewSrc` (:244-245, `/?preview=1`). Canal com carimbo próprio: `core/menu/preview.ts`
    (`MENU_PREVIEW_SOURCE` :34, `parseMenuPreviewMessage` :102-138); loja `entities/menu/model/useMenuPreview.ts`
    (:68-104); painel `features/store-menu/model/useMenuPreviewBridge.ts` (:46-118), `ui/MenuLivePreview.tsx` (:44-235).
  - Configurações: `packages/core/src/hooks/useStoreSettings.ts › fetchAllSettings` (:57-75), `DEFAULTS` (:32-55),
    `useUpdateSettings` (:164-177, `upsert` por chave); consumidor `features/buy-together-lists/ui/BuyTogetherFormCard.tsx:22,31`.
  - Peças do painel: `shared/ui/FormCard.tsx`, `SettingsSaveButton.tsx` (`disabled?` :40), `CharCounter.tsx:36`,
    `InfoBanner.tsx:46`, `FieldGroup.tsx › ToggleField` (:71) + `SWITCH_TAP_44` (:52), `PageHeader.tsx`,
    `shared/lib/storeOrigin.ts`, `shared/lib/useFullscreenStage.ts`; motor de arte `shared/lib/uploadImage.ts ›
    validateImageFile` (:66), `uploadImageBlob` (:183), `deleteStorageImage` (:229).
  - Rota protegida por posição: `apps/backoffice/src/app/App.tsx:53-60`, `:160`.
- **O que muda**
  - A Home sai do filesystem: `build-server.mjs:20` mantém `dist/index.html`, e a Vercel serve o arquivo antes dos
    rewrites (`vercelRedirects.test.ts:323,366`). Comentários que passam a mentir: `classify.ts:3,54`, `serve.ts:6`,
    `apps/store/CLAUDE.md:296`.
  - `servePage` lê configuração só no produto: `serve.ts › lerConfiguracoes` (:293-302), chamada em `servirProduto`
    (:309); `servirFixa` (:195-209), `app` (:181-182), `naoEncontrada` (:144-158) não leem. `PageSettings` (`serve.ts:73-78`)
    e `.in('key', ['google_shopping', 'seo'])` (`server/page.ts:170`).
  - `applyHead` (`head.ts:146-185`) e `injectIntoHead` (:88-92) só tocam no `<head>`; os ramos `app` e "peça sem
    variação" devolvem `deps.shell` cru (`serve.ts:182, 335`).
  - `ctaHrefRefusal` aceita `//x` e `/\x`: `packages/core/src/home/refusals.ts:134-157`; outro chamador
    `apps/backoffice/src/features/home-composition/model/sectionRefusals.ts`. `internalMenuHrefRefusal`
    (`core/menu/refusals.ts:87-97`) recusa `//` mas não `/\`.
  - `useHeroCarousel` mora no widget com intervalo fixo (`useHeroCarousel.ts:147`), importado em `HeroCarousel.tsx:13,123`
    e reexportado em `widgets/hero-carousel/index.ts:2`; suíte `widgets/hero-carousel/model/__tests__/useHeroCarousel.test.ts`
    (:58-307). `previaUnica.test.ts:184` procura o nome `useHeroCarousel`.
  - `StoreLayout.tsx:87-88` não tem faixa.
  - Configurações não conhecem a chave: `packages/supabase/src/types/settings.ts:381-407`; `useStoreSettings.ts:30-55`
    (chave fora de `DEFAULTS` é descartada, :30-31).
  - Sidebar e rotas: `apps/backoffice/src/widgets/admin-layout/model/navItems.ts:100-112`; `app/App.tsx:119-138`; foco
    `focusRoutes.ts:27-37` e `focusRoutes.test.ts:110-113`.
  - `previaUnica.test.ts:27-42` (escopo), `:384-399` (exatamente dois `<iframe>`), `:410-413`;
    `animacaoRespeitaMovimento.test.ts:39` (`ARQUIVOS`).
  - Testes que afirmam "não lê nada": `packages/core/src/page/__tests__/serve.test.ts:984-992, 994-1001, 1009-1014,
    217, 233, 927, 951`; `apps/store/server/__tests__/page.test.ts:244-268, 319`;
    `apps/store/src/app/__tests__/paginasFixasServidas.test.ts:66`; `core/page/__tests__/classify.test.ts:140-141`;
    `productHead.test.ts:237`.
- **O que nasce**
  - `packages/core/src/announcements/` (+ subpath em `packages/core/package.json`): tipos `text`/`image`, catálogo que
    declara a ausência de contagem regressiva/estoque/prova social, tetos, normalização, recusas, "a faixa existe?",
    as alturas e as vagas da arte, o canal de prévia.
  - Em `core/page/head.ts`, a marca do `<html>`.
  - `apps/store/src/widgets/announcement-bar/` (widget, leitura do atributo, recebedor da prévia), o hook do giro em
    `apps/store/src/shared/lib/`, guardas de opacidade zero e de tom.
  - A tela do painel em `apps/backoffice/src/pages/admin/` + `apps/backoffice/src/features/announcement-bar/` (form,
    envio de arte, palco e ponte da prévia).
- **Exemplares**
  - Chave sem migration: `packages/supabase/src/types/settings.ts:417-421` (`buy_together`), `useStoreSettings.ts:53-54`,
    `storeSettingsDefaults.test.ts:581-595`.
  - Tipo declarado em `core` e reexportado: `settings.ts:20,22`.
  - Normalização: `packages/core/src/buy-together/settings.ts › normalizeBuyTogetherForm`.
  - Recusa `string | null` com ordinal: `core/home/featured.ts › featuredProductsRefusal`, `carousel.ts ›
    heroCarouselSlidesRefusal`.
  - Leitura da função: `server/page.ts › readSettings`. Mexer no HTML: `head.ts › injectIntoHead`, `applyHead`.
  - Widget com arte, setas e pausa: `HeroCarousel.tsx` (:83-118, :136-140). Seta de 44 px: `Header.tsx:53-54`.
  - Hook de cromo: `shared/lib/useOverflowAffordance.ts`, `useScrollDirection.ts`.
  - Canal de prévia: `core/menu/preview.ts`, `entities/menu/model/useMenuPreview.ts`,
    `features/store-menu/model/useMenuPreviewBridge.ts`; palco `features/store-menu/ui/MenuLivePreview.tsx`.
  - Página com edição + prévia: `pages/admin/AdminMenuPage.tsx:356, 436, 463`.
  - Gravar a chave: `BuyTogetherFormCard.tsx:22,31` + `pages/admin/AdminBuyTogetherForm.test.tsx`.
  - Envio de arte: `features/store-menu/lib/uploadBannerImage.ts`, `features/home-composition/lib/uploadHomeImage.ts`;
    miniatura na proporção: `HeroCarouselEditor.tsx:49-50, 242, 257`.
  - Guardas: `widgets/hero-carousel/ui/__tests__/heroCarouselSemOpacidadeZero.test.ts`,
    `entities/product/ui/__tests__/tomDoCompreJunto.test.ts`; montagem no App: `app/__tests__/contadorMontado.test.tsx`.
- **Obrigações transversais**
  - Nenhuma migration neste WI.
  - "Defeito 01": a regra lida pela função, pela loja e pelo painel mora em `packages/core`.
  - `core/announcements` e `core/page`: `.ts` explícito em todo especificador, `import type` incluso; tipo declarado em
    `core` e reexportado pelo pacote de tipos.
  - `strictNullChecks: false`: veredito `string | null` ou literal de string.
  - FSD: camada só importa de baixo; o hook vai a `shared/lib` (`AD-033`).
  - `accent` com `ink` sólido; nada de `ink/NN` em superfície `accent` (`accentText.test.ts`).
  - Alvo de 44 px; `TAP_44`/`TAP_ROW` nunca com `absolute` (`alvoDeToqueNaoRoubaPosicao.test.ts`).
  - Movimento: par `motion-reduce:` na mesma linha; nada nasce em opacidade zero; no painel nada de `framer-motion` nem
    `matchMedia`.
  - Celular primeiro; `minmax(0, …)` desde o celular; sem rolagem horizontal do `body`.
  - Tom memorial; guarda de string não escreve a forma proibida por extenso.
  - Editor grava em igualdade exata; provar que grava (probe contra o banco local, `AD-012`).
  - Origem exata no `postMessage`; a loja aceita só o pai.
  - Gate do painel inclui a suíte da loja.
  - Ao fechar: baselines e `CLAUDE.md` de cada módulo tocado.
- **Testes** — como o lookup devolveu:
  - Unidade `core`: a faixa existe só com interruptor ligado e ao menos um aviso válido; normalização (quinto aviso
    adiante ignorado, tipo desconhecido e lixo não quebram); recusas em ordem com ordinal (inclusive teto conjunto);
    catálogo sem contagem regressiva/estoque/prova social; `ctaHrefRefusal` e `internalMenuHrefRefusal` recusam `//host`
    e `/\host` e aceitam `/ofertas`; o canal de prévia aceita só o carimbo dele; `servePage` escreve o atributo
    "existe"/"não existe" em Home, produto, categoria, página fixa, rota de app e 404; leitura de configuração que falha
    ⇒ atributo ausente; caminho com extensão continua 404 sem ler o catálogo; atributo uma vez só e `lang` intacto;
    pureza e alcance de `core/announcements`.
  - Componente da loja: atributo "existe" ⇒ a faixa ocupa a vaga na primeira renderização; "não existe" ⇒ nada, mesmo
    com a configuração ligada; sem atributo ⇒ decide pela configuração; gira a 6 s, pausa com ponteiro/foco/dedo,
    movimento reduzido não gira, um aviso só sem temporizador; aviso de texto é link inteiro, sem destino é texto; região
    com rótulo e sem `aria-live`; aviso de imagem com `<picture>`; em prévia o rascunho manda; monta no `StoreLayout` e
    aparece em Home/categoria/produto, não em `/checkout` nem em `/pedido-montado`, pela árvore real do `App`; o Banner
    principal segue igual depois do movimento do hook.
  - Componente do painel: a página real grava `{ enabled, items }` em igualdade exata; recusa destino externo com o
    motivo antes da rede; "+ Adicionar aviso" some com 5; reordena; um aviso aberto por vez; ajuda de tom e aviso do
    atraso; a ponte manda o rascunho com origem exata.
  - Guardas: opacidade zero da faixa, tom, `previaUnica` ampliado, `animacaoRespeitaMovimento`, `storeSettingsDefaults`,
    `navItems`, `focusRoutes`, `NavRail`, `rotasSobGuarda`, `vercelRedirects`, `shell.test.ts`.
  - Integração local: `pnpm build` + `api/page.mjs` com `node --env-file=.env`, `?__path=/`, produto e categoria com a
    chave ligada, desligada e ausente; o painel grava pelo `upsert` e a loja lê de volta (probe HTTP).
  - Sem execução local: a Vercel servindo `/` pela função e o `HIT` do cache (só em preview); CLS, alturas, duas linhas
    a 390 e fonte a 200 % só em navegador.
- **Depende / Expõe** — nada fora do monorepo.

## Fronteira entre repositórios

`nada` — topologia de repositório único (`PROJECT.md`).

## Cobertura dos UCs

| UC    | Reivindicado por |
| ----- | ---------------- |
| UC-01 | `.` (monorepo)   |
| UC-02 | `.` (monorepo)   |
| UC-03 | `.` (monorepo)   |
| UC-04 | `.` (monorepo)   |

## Decisões

O gate principal e o do PRD Tech Review foram respondidos inline, a pedido do usuário em 2026-11-13 ("quero que você
analise e use suas melhores recomendações. Se tiver dúvidas use um outro agente para discutir a solução. Faça isso para
todos as paradas com perguntas"): cada resposta abaixo é a recomendação, aplicada.

| # | A pergunta | A resposta | Quem decidiu |
|---|---|---|---|
| PR-1 | A reserva de altura não chega à Home (ela não passa pela função `api/page`) | A Home passa a ser servida pela função `api/page`, com o mesmo cache; toda resposta HTML da loja lê a chave da faixa e grava o atributo no `<html>`; o atributo manda na existência da faixa naquela visita, e a configuração que chega depois só preenche os avisos. RN-02 trocada no `prd.md` | humano no gate do PRD Tech Review (`home-nao-passa-pela-funcao-api-page` · `tech_prd_edit` · r1) |
| PR-2 | Altura que varia por aviso | Uma altura por dispositivo, igual para todos os avisos: celular = duas linhas de texto; computador = 48 px; o painel recusa texto que não caiba em duas linhas em 390. UC-01 trocada | humano no gate do PRD Tech Review (`altura-unica-da-faixa` · `tech_prd_edit` · r1) |
| PR-3 | A arte entre 768 e 1440 | Arte inteira contida e centralizada sobre o ouro, nunca cortada nem esticada; vagas próprias em `core`. UC-02 trocada | humano no gate do PRD Tech Review (`arte-entre-768-e-1440` · `tech_prd_edit` · r1) |
| PR-4 | 5 s e pausa permanente × o hook | 6 s, pausa enquanto ponteiro, foco ou dedo; com movimento reduzido no celular só o primeiro aviso. UC-01, RN-04 e CA-02 trocadas | humano no gate do PRD Tech Review (`giro-diferente-do-hook-do-banner` · `tech_prd_edit` · r1) |
| PR-5 | A prévia do painel | A loja num iframe (390 e 1024, `previewFrame`) com canal de rascunho próprio da faixa no molde de `useMenuPreview`; `previaUnica` ampliado para a pasta nova | humano no gate do PRD Tech Review (`previa-e-a-loja-num-iframe` · `tech` · r1) |
| PR-6 | `ctaHrefRefusal` aceita `//` | Consertar no dono (recusa `//` e `/\`), dentro deste WI | humano no gate do PRD Tech Review (`cta-href-refusal-aceita-barra-dupla` · `tech` · r1) |
| PR-7 | A chave em `store_settings` | Sem migration: default desligado no TypeScript; tetos e recusa em `core/announcements`; normalização na leitura da loja e do servidor (aviso a mais ignorado) | humano no gate do PRD Tech Review (`store-settings-sem-migration-nem-check` · `tech` · r1) |
| PR-8 | Reaproveitar o hook | Mover para `apps/store/src/shared/lib` (intervalo por parâmetro), com guarda de opacidade zero para a faixa | humano no gate do PRD Tech Review (`extrair-hook-para-camada-abaixo` · `tech` · r1) |
| PR-9 | Foco e setas sobre o ouro | Anel de foco em `ink` dentro da faixa; destaque e rótulo do link em `ink` sólido (peso e sublinhado, nunca opacidade); setas sem `TAP_44` em `absolute` | humano no gate do PRD Tech Review (`foco-e-setas-sobre-o-ouro` · `tech` · r1) |
| PR-10 | A lista de guardas do plano | A lista do bloco **Testes** acima; `reservedSlugs`/`sitemapRoutes` não disparam | humano no gate do PRD Tech Review (`lista-de-guardas-do-plano` · `tech` · r1) |
| H-01 | D-01 nomeia checkout e `/pedido-montado`; fora do `StoreLayout` estão também `/pedido/:id/pagamento`, `/pagar-com-cartao` e o 404 | A faixa monta no `StoreLayout` e fica fora das cinco: todas são telas de pagamento ou de erro | humano no gate principal (inline a pedido, pela recomendação) |
| H-02 | O atributo sai também em rotas onde a faixa não monta (`/checkout`) | A reserva de altura mora no elemento da faixa dentro do `StoreLayout`, nunca numa regra de CSS só do `<html>` | idem |
| H-03 | Atributo "existe" e a configuração chega desligada/vazia (ou o contrário), no meio-tempo do cache | Na carga do documento, o atributo decide (`"1"` mostra a faixa, `"0"` não); ausente (dev, prévia, leitura que falhou) ⇒ decide a configuração. Com o atributo "existe" e a configuração sem aviso válido, a faixa fica na vaga, ouro e sem texto, até a próxima troca de rota. **A partir da primeira troca de rota no navegador, decide a configuração** (a troca de página já move o conteúdo, então aparecer ou sumir ali não é salto) | idem |
| H-04 | Altura fixa × fonte do sistema a 200 % | As alturas em `rem` (celular: duas linhas de 18 px + 16 px de recuo; computador: `3rem` = 48 px a 100 %); crescem com a fonte, iguais para todos os avisos. Constantes com dono único em `core/announcements`, levadas à loja por variável CSS | idem |
| H-05 | O teto conjunto das duas linhas em 390 | Tetos por campo 40 / 60 / 20 (o design) e **teto conjunto de 90 caracteres** somando destaque, texto e rótulo, declarado em `core/announcements`; o número é premissa a medir em navegador na Validation/QA (o exemplo mais longo do protótipo tem ~70) | idem |
| H-06 | Fonte grande deixa a faixa mais alta que `TOP_ZONE = 64` e o cabeçalho cobriria a faixa ao se recolher | O recolhimento do cabeçalho só começa depois da faixa sair da tela (a zona de topo soma a altura da faixa) | idem |
| H-07 | A entrada de 6 px × o trilho por rolagem do hook | A faixa usa o hook sem `trackRef` (índice puro) e anima a troca por CSS; não há arrasto em caso nenhum | idem |
| H-08 | "Arrastar para ordenar" (PRD) × subir/descer (design) | Os dois, como `/admin/menu` | idem |
| H-09 | Salvar desabilitado × "recusa com motivo" | Os dois: o motivo aparece no campo, a barra diz "Corrija o que está marcado para salvar." e o Salvar fica desabilitado (precedente `SettingsSaveButton`) | idem |
| H-10 | O "Plano técnico" do PRD diz migration e `check` | Vale PR-7: sem migration | idem |
| H-11 | Rótulo da região | "Avisos da loja" (RN-04) | idem |
| H-12 | Duas réguas de "endereço interno" | O conserto de PR-6 vale para as duas: `ctaHrefRefusal` e `internalMenuHrefRefusal` recusam `//` e `/\` | idem |
| H-13 | Documentação que passa a mentir | As tarefas que mudam o comportamento atualizam `classify.ts:3,54`, `serve.ts:6`, `apps/store/CLAUDE.md` (O HTML servido) e o `CLAUDE.md` do módulo que tocam | idem |
| H-14 | A frase da barra de salvar | Depois de salvar: "Salvo. Pode levar até uma hora para a faixa aparecer ou sumir em todas as páginas da loja."; ao lado do interruptor, o mesmo aviso como ajuda fixa | idem |
| H-15 | O subtítulo do painel diz 5 segundos | "trocando a cada 6 segundos" | idem |
| H-16 | O link "Black Friday" dos departamentos some com a faixa no protótipo | Fora deste WI | idem |
| H-17 | Como tirar o `index.html` da Home da saída publicada sem quebrar `vite preview` | O build da função tira `dist/index.html` da saída só quando roda na Vercel (variável `VERCEL`, precedente `build-robots.mjs`); localmente o arquivo fica | idem |
| H-18 | Leitura de `store_settings` falha, o resto do ramo deu certo | Atributo ausente e a resposta sai `no-store` (não se cacheia página sem o veredito) | idem |
| H-19 | Validade de um aviso | Texto: ao menos o trecho em destaque ou o texto; rótulo só com destino (rótulo sem destino é recusado: "Sem destino, o rótulo do link não aparece."); destino sem rótulo vale (o aviso inteiro é o link). Imagem: as duas artes e o texto alternativo obrigatórios; destino opcional. Mais de 5: o "+ Adicionar aviso" some, e a normalização ignora o excedente | idem |
| H-20 | Rota e posição no painel | `/admin/faixa-de-avisos`, no grupo Loja logo depois de "Menu da loja", e é rota de foco (`FOCUS_ROUTES`) | idem |
| H-21 | A prévia do painel pausa e obedece ao "Aviso N de M" | Sim: o canal tem duas mensagens, o rascunho (com atraso curto) e "mostre o aviso N" (sem atraso), e em prévia a faixa não gira sozinha | idem |
| H-22 | A prévia carrega a Home, que em modo prévia não lê o conteúdo | Aceito: `previewSrc` como está; a faixa e o cabeçalho aparecem sobre o corpo vazio | idem |
| H-23 | Estados do painel que o design não mostra | Carregando: esqueleto do molde do painel; erro de leitura: `InfoBanner` com "Tentar de novo"; alteração não salva: o molde de `SettingsSaveButton`; falha de envio de arte: a mensagem de `uploadImage` no campo | idem |
| H-24 | Medida do aumento de tempo da Home servida pela função | Registrado como risco; medido na Validation/QA (local) e no preview da Vercel no deploy | idem |
| I-01 | (T01) A tarefa pedia declarar um ordinal masculino em `core/announcements` | Reusado o `ordinal` masculino que já existe em `packages/core/src/home/carousel.ts:96`; uma terceira cópia seria o "defeito 01" | a corrida (wi-impl-task T01, premissa 1) |
| I-02 | (T01) A frase da recusa de `//` e `/\` | "Este endereço leva para fora da loja. Use um caminho da loja, começando com uma só “/” — por exemplo, “/ofertas”." em `ctaHrefRefusal`; toda recusa de aviso sai como "Nº aviso: <motivo>" | a corrida (T01, premissas 2 e 3) |
| I-03 | (T01) O canal de prévia | Além de `draft` e `show`, há `ready` (loja → painel); `parseAnnouncementPreviewMessage(data, itemCount)` recusa índice fora da lista | a corrida (T01, premissas 4 e 5) |
| I-04 | (T02) O nome do atributo | `ANNOUNCEMENT_BAR_ATTRIBUTE = 'data-faixa'` em `packages/core/src/page/head.ts`, função `markAnnouncementBar`; configuração lida uma vez no começo de `servePage`; o 301 não é marcado | a corrida (T02, premissas 1, 2 e 4) |
| I-05 | (T04) Os tetos no painel | Campos sem `maxLength`; o contador e a recusa aparecem ao passar do teto | a corrida (T04, premissa 3) |
| I-06 | (T04) Onde a arte é gravada | `home-images/announcements`; a tela apaga só a arte enviada e ainda não gravada | a corrida (T04, premissa 6) |
| I-07 | (T04) A prévia | Um iframe só, abrindo no Celular, com o seletor Celular/Computador dentro do palco; `folgaDoPalco.test.ts` passou a três palcos | a corrida (T04, premissa 8) |
| I-08 | (T03) O cabeçalho não se recolher enquanto a faixa está na tela | `useScrollDirection` soma à zona do topo a altura medida do elemento `#avisos-da-loja` (`ANNOUNCEMENT_BAR_ID`, `shared/lib/storeChrome.ts`); o `Header.tsx` não mudou | a corrida (T03, premissa 1) |
| I-09 | (T03) "A primeira troca de rota" de H-03 | Chave do histórico diferente da chave da carga do documento, mais uma trava no componente | a corrida (T03, premissa 3) |
| I-10 | (T03) A entrada do aviso | `@keyframes estrelinha-faixa-entra` em `apps/store/src/app/App.css`, com `motion-reduce:animate-none`; as réguas `nasceInvisivel` e `tomProibido` foram extraídas para `apps/store/src/test/` | a corrida (T03, premissas 8 e 9) |

## Não resolvido

- **Não medido localmente**: que a Vercel passa a mandar `/` à função depois de o `index.html` sair da saída
  publicada, e o `HIT` do cache de borda. Só um preview da Vercel responde (método `AD-021`); fica para o deploy.
- **O teto conjunto de 90 caracteres** é premissa (H-05); a medida a 390 e a 200 % é da Validation/QA.
- Nada travado: nenhum UC vai a `Fica fora`.
