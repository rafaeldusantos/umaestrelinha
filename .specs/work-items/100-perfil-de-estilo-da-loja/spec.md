# 100 · Perfil de estilo da loja (Padrão e Black Friday), com a chave no painel

Costura de 2026-11-14. PRD r1.

Registro do que se descobriu e decidiu nesta data — **não** descrição do estado atual do código.
Critérios de aceite: `prd.md`, ao lado. Convenção de cada repositório: o arquivo de instruções dele.

## Escopo

| UC | Título | Origem |
| -- | ------ | ------ |
| UC-01 | Ligar o perfil Black Friday | caso de uso do PRD |
| UC-02 | Voltar ao Padrão | caso de uso do PRD |
| UC-03 | Conferir antes de ligar | caso de uso do PRD |

Regras RN-01..RN-08 e critérios CA-01..CA-07 no `prd.md`.

**Achados de eval que este Work Item resolve**

`nada` — o repositório não tem relatório de avaliação local (`.specs/evals/` não existe).

**Anexos consultados**

| Insumo (caminho ou URL) | Tipo | O que se tirou | Alimenta |
| ----------------------- | ---- | -------------- | -------- |
| Claude Design `4abe021d-…` · `Black Friday - Home.html` + `bf.css` | protótipo | fonte de design (seção Design) | UC-01..03, RN-01, RN-06 |
| Claude Design · `Painel - Campanhas, faixa e perfil.html` + `adm-faixa-perfil.jsx` | protótipo | fonte de design (seção Design) | UC-01..03 |
| https://claude.ai/artifact/2yUJyqwYr6tipVWQEh8xdd | cópia publicada | consultado, sem uso: o MCP do Claude Design respondeu e a cópia não foi necessária | — |
| `packages/ui/src/tokens/estrelinha.ts`, `apps/store/tailwind.config.ts`, `apps/store/src/app/App.css` | código | os tokens de hoje (ver Código) | RN-01, RN-03 |
| `palette`, `contrast`, `accentText`, `fieldBorder`, `arbitraryTextColor`, `importOrder` (suíte da loja) | código | os guardas da paleta (ver Código) | RN-03, CA-04 |
| `apps/store/server/page.ts`, `packages/core/src/page/head.ts` | código | o HTML servido (ver Código) | RN-04, CA-02 |
| `RuntimeSettingsLoader.tsx`, `useStoreSettings.ts` | código | a configuração lida pela loja (ver Código) | RN-04, RN-07 |
| `apps/backoffice/src/shared/lib/settingsSections.ts` | código | 5 seções (não 4) | UC-01 |

## Fora do escopo

Verbatim do PRD:

- Perfis criados pela dona (cores livres no painel).
- Trocar fonte, raio ou imagens por perfil.
- Ligar e desligar por data. A vigência da campanha (WI 102) pode governar o perfil depois.
- A faixa de avisos (WI 101), que usa os tokens e por isso muda de cor com o perfil sem trabalho próprio.
- O selo da campanha (WI 102): as cores dele são cadastradas na campanha (D-02 do 102) e não dependem do perfil.

## Design

Fontes: Claude Design, projeto `4abe021d-d77e-4fe7-affd-524180315fa3` ("Uma Estrelinha - Black Friday"), arquivos
`Black Friday - Home.html` (com `bf.css`) e `Painel - Campanhas, faixa e perfil.html` (com `adm-faixa-perfil.jsx`) —
links de `item.md` › Insumos e da seção de protótipo do `prd.md`, mecânica `claude_design` do `PROJECT.md`.

### Configurações · Dados da loja · card "Perfil de estilo da loja" → UC-01, UC-02, UC-03

- Card com h2 **"Perfil de estilo da loja"** e o texto: "Muda só as cores da loja. Textos, blocos da Home, preços e menu
  continuam iguais, e voltar ao Padrão é a mesma escolha."
- Grupo de opções (radiogroup, rótulo acessível "Perfil de estilo"), duas opções lado a lado no computador e
  empilhadas abaixo de 1024 px; o cartão inteiro é clicável. Cada opção: uma miniatura da loja (faixa do cabeçalho na
  cor 1, faixa do menu na cor 2, três placeholders sobre #FAF8F4 e uma barra de ação na cor 2), a linha com o rádio, o
  nome em negrito e o selo **"Em uso"** (estilo do selo verde de "pago" do painel) no perfil salvo, a descrição e quatro
  quadradinhos de amostra (primary-strong, primary, accent, ground-deep, nessa ordem).
  - "Padrão" — "Ardósia e ouro, a cara de sempre da loja." — #283A4A, #34495E, #B8945F, #F1EBE1
  - "Black Friday" — "Preto e ouro, para a campanha." — #0D0C0B, #1C1A18, #C2A063, #F0EADF
- Aviso com ícone de relógio: "Depois de salvar, quem abrir a loja já vê o perfil novo nas páginas de produto e de
  categoria em até 5 minutos, e nas outras páginas em até 1 hora." (Decisão H7 acrescenta uma frase.)
- Ações: **"Ver a loja com este perfil"** (secundário, ícone de link externo; sempre habilitado) e **"Salvar"**
  (primário; desabilitado quando o escolhido é igual ao salvo).
- Voltar ao Padrão é marcar "Padrão" e salvar.
- O design não desenha: salvando, salvo, erro, carregando, valor desconhecido (decisões H8, H9).

### Sobreposição: modal "A loja com o perfil {nome}" → UC-03

- Título "A loja com o perfil Black Friday" (ou "… Padrão"), sempre o escolhido e não salvo; subtítulo "Prévia, sem
  salvar. A loja publicada não muda."; corpo: a Home da loja num iframe; largura até 960 px; rodapé "Fechar".
- Abre por "Ver a loja com este perfil"; fecha por "Fechar" ou pelo fundo; clicar dentro não fecha; fechar não muda o
  escolhido nem o salvo. O design não tem alternância computador/celular, Esc nem foco (decisão H10).

### Home e loja no perfil Black Friday (computador e celular 390) → RN-01, RN-06, RN-08

- Os tokens trocados (BF / Padrão): ink #161514/#23303A · ink-soft #57524B/#54616B · primary #1C1A18/#34495E ·
  primary-strong #0D0C0B/#283A4A · accent #C2A063/#B8945F · accent-strong #9A7A45/#A07E4C · line #E4DDD0/#E6DFD4 ·
  ground-deep #F0EADF/#F1EBE1 · field #857A6C/#8C8073 · sombra suave com rgba(22,21,20,.18).
- Iguais nos dois: ground #FAF8F4, surface #FFFFFF, on-primary #F7F3EC, serenity #DCE6EC, whatsapp #25D366, os pares de
  situação, stock-in, os véus on-ink.
- Regras de papel no BF: selo de oferta do cartão (`.selo-of`) fundo accent, texto ink; chip de desconto da sacola
  (`.chip.desc`) fundo accent, texto ink; preenchimento da barra do frete grátis (`.fg-bar i`) accent-strong #9A7A45.
  (Placeholder escuro dos banners é artifício do protótipo — não é regra.)
- Elementos que mudam (pelo token que leem): cabeçalho (primary-strong), faixa de departamentos, ícones, links "Ver
  todos", preço, aba ativa, link e foco (primary), texto corrido, faixa de declaração, coração (ink), subtítulos,
  rodapé, parcelas (ink-soft), círculo da busca e botões ouro (accent), bordas (line), faixas claras (ground-deep),
  bordas de campo (field). Celular e computador têm as mesmas cores; muda só o layout.

Divergências entre fontes (design × PRD), e o que valeu:
1. Selo da Home desenhado é o da campanha (WI 102), de cores fixas; o selo "-X%" comum segue o PRD (ouro no BF). — conferência.
2. A barra do frete grátis no design é accent-strong, não accent: vale o design (é ouro, e accent sobre branco ≈ 2,5:1 reprovaria objeto gráfico). — handoff H2.
3. Sombras: o design só redefine a sombra suave; vale o PRD — todas as sombras da loja leem a cor do perfil. — handoff H5.
4. Banners escuros: artifício de protótipo, fora. — conferência.
5. Ouro como texto sobre primary/primary-strong vem do conteúdo dos WIs 101/102 (link "Black Friday", cartão "20%"): fora deste item; `accentText` continua guardando o uso. — conferência.
6. Texto do aviso: o do design, com a frase de quem está com a loja aberta (UC-01). — handoff H7.
7. Faixa, "Joias em oferta" e link "Black Friday" no menu: fora (WIs 101 e 102). — conferência.

## Código — /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100

- **Instruções** — `CLAUDE.md` (raiz) › Comandos · Alias de import · O "defeito 01" · Convenções · Os guardas · Baselines;
  `apps/store/CLAUDE.md` › Design system · Mobile · Ícones e marca · O HTML servido — `api/page` · A faixa de avisos ·
  Modo prévia · Carrinho, chrome e checkout · Quem pode enquadrar a loja; `apps/backoffice/CLAUDE.md` › Molde dos
  formulários · `/admin/home` · O movimento do painel · A ponte da prévia · Configurações · `/admin/faixa-de-avisos`;
  `packages/core/CLAUDE.md` › Pureza · Os módulos · `home` · `announcements` · Convenções de tipo; `packages/ui/CLAUDE.md`.
- **Recorte** — UC-01, UC-02, UC-03 (monorepo único).

**O que já serve**
- O atributo no `<html>` com "não sei" = sem atributo + `no-store`: `packages/core/src/page/serve.ts:210-221 › servePage`,
  `:255-262 › marcarFaixa`, `:401-414 › lerConfiguracoes`; a marcação que substitui sem duplicar:
  `packages/core/src/page/head.ts:99-116 › ANNOUNCEMENT_BAR_ATTRIBUTE / markAnnouncementBar`.
- O cache por ramo: `serve.ts:156-161 › PAGE_CACHE` (fixa/app/Home 3600, produto/categoria 300, erro `no-store`).
- A regra de carga atributo × configuração: `apps/store/src/widgets/announcement-bar/model/useAnnouncementBar.ts:29-49 › lerAtributo / CHAVE_DA_CARGA`, `:75-80 › navegou`.
- A prévia genérica: `packages/core/src/home/preview.ts:83 › isPreviewWindow`, `:244 › previewSrc`, `:200 › previewFrame`, `:135 › PREVIEW_DEVICES`, `:37 › PREVIEW_DEBOUNCE_MS`; o canal irmão `packages/core/src/announcements/preview.ts`; a ponte do painel `apps/backoffice/src/features/announcement-bar/model/useAnnouncementsPreviewBridge.ts`; o recebedor da loja `apps/store/src/widgets/announcement-bar/model/useAnnouncementPreview.ts`; o palco `apps/backoffice/src/features/announcement-bar/ui/AnnouncementLivePreview.tsx`; `apps/backoffice/src/shared/lib/storeOrigin.ts`; `useFullscreenStage`.
- A leitura pública: `apps/store/server/page.ts:203-219 › readSettings`.
- Chave sem migration com default em TS: `packages/core/src/buy-together/settings.ts:13,33 › DEFAULT_BUY_TOGETHER_FORM / normalizeBuyTogetherForm`; guarda `storeSettingsDefaults.test.ts:583-619`; recuo `packages/core/src/home/featured.ts:32 › featuredDisplay`.
- Leitores diretos que acompanham o perfil se a variável seguir hex: `CardPaymentBrick.tsx:29-31 › corDaMarca`, `GuideHeroArt.tsx:25-69`, `packages/ui/src/icons/types.ts:63 › ICON_ACCENT`, `App.css:224-227, :245-248, :267-293`.
- Card autocontido: `apps/backoffice/src/features/settings/ui/StoreDataSection.tsx:42-53`, `features/settings/model/useSettingsSave.ts › salvar`; escolha entre opções: `features/buy-together-lists/ui/BuyTogetherFormCard.tsx:19-97`.
- 5 seções: `apps/backoffice/src/shared/lib/settingsSections.ts:75-108`, `widgets/settings-sections/model/panels.tsx:39-45`.
- O ateliê lê o objeto hex: `apps/mobile-adm/tailwind.config.ts:28-33`; nenhum `--estrelinha-*` fora da loja; o painel não carrega `App.css`.
- `theme-color` fixo: `apps/store/index.html:80`.

**O que muda**
- `packages/ui/src/tokens/estrelinha.ts:38-81 › ESTRELINHA_COLORS` (continua o Padrão, mesma referência), `:115-119 › ESTRELINHA_SHADOW` (o ateliê segue nele).
- `apps/store/tailwind.config.ts:39-43` — cores por `rgb(var(--estrelinha-<t>-rgb) / <alpha-value>)`, sombra por variável.
- `apps/store/src/app/App.css:105-212` — blocos por perfil (hex, `-rgb`, HSL do shadcn), `.glow-*` `:282-287`.
- `InstagramInviteSheet.tsx:35`, `CookieNotice.tsx:59` — sombras literais.
- `ProductCard.tsx:39-47 › CardBadge` (tom `jam`), `:317`; `ProductPage.tsx:249-253` (selo da galeria); `CartDrawer.tsx:200-213` (barra do frete); o chip de desconto da sacola (localizar: candidatos `CartDrawer.tsx:267`, `CouponInput.tsx:80-93`).
- `packages/ui/src/brand/BrandSvg.tsx:17-25 › STROKE.brand`.
- `apps/store/server/page.ts:207, :214-218`; `packages/core/src/page/serve.ts:102-112 › PageSettings`, `:220`, `:255-262`, `:404-412`.
- `useAnnouncementBar.ts:45-49, :75-80` — a regra da carga sobe para `apps/store/src/shared/lib/`.
- `packages/core/src/hooks/useStoreSettings.ts:33-59 › DEFAULTS`; `packages/supabase/src/types/settings.ts:394-423 › SettingsKey / SettingsMap`.
- `StoreDataSection.tsx:57-181` — monta o card novo.
- Guardas: `apps/store/src/test/paletteFromSource.ts:60-78`, `palette.test.ts:34-76, :182-220`, `contrast.test.ts:35, :107-124`, `fieldBorder.test.ts:137-164`, `brandAssets.test.ts:523-532`, `ProductCardSurface.test.tsx:185-199`, `brand.test.tsx:59-66`, `server/__tests__/page.test.ts:284-314`, `core/page/__tests__/{serve,head}.test.ts`, `previaUnica.test.ts:375-432`, `folgaDoPalco.test.ts:47-74`, `AdminSettingsPage.test.tsx:35-64, :399-445, :447-…, :1144-1169`.

**O que nasce**
- `packages/core/src/appearance/` (ids, default, normalizador, atributo, canal da prévia, rótulos e frases do card, `purity.test.ts`).
- O objeto dos perfis em `packages/ui/src/tokens/`.
- `markStyleProfile` em `core/page/head.ts`.
- O utilitário "já houve troca de rota desde a carga" em `apps/store/src/shared/lib/`.
- O aplicador do perfil na loja (dentro do `BrowserRouter`) e o recebedor do canal.
- O card, o palco (`…LivePreview.tsx`) e a ponte em `apps/backoffice/src/features/style-profile/`.
- O guarda de dono único do atributo e dos valores.

**Exemplares** — chave sem migration: `packages/core/src/buy-together/settings.ts:13-36`, `packages/supabase/src/types/settings.ts:24-35`, `storeSettingsDefaults.test.ts:577-619`; atributo no `<html>`: `core/page/head.ts:94-116`, `core/page/serve.ts:251-262, :400-414`, `server/page.ts:203-219`; regra de carga: `useAnnouncementBar.ts`; canal: `core/announcements/preview.ts`; ponte: `useAnnouncementsPreviewBridge.ts`; palco: `AnnouncementLivePreview.tsx`; recebedor: `useAnnouncementPreview.ts`; card: `StoreDataSection.tsx`, `BuyTogetherFormCard.tsx`; pureza: `core/announcements/__tests__/purity.test.ts`; guarda de paleta: `palette.test.ts`, `paletteFromSource.ts`.

**Obrigações transversais** — "defeito 01" (um dono por valor, cópia deliberada só com guarda); módulo de `core` com `.ts` explícito em todo especificador (inclusive `import type`), sem React/Supabase/alias; `strictNullChecks: false` (veredito `T | null` ou união de string); `App.css` depois de `@estrelinha/ui/styles.css` em `main.tsx`; mobile primeiro (390×844 antes de 1440); no painel, nada de `grid-cols-*` sem breakpoint dentro da seção (inclusive `grid-cols-1`, `AdminSettingsPage.test.tsx:414-415`); `SettingsSaveButton`; não chamar seção de "aba"; origem exata no `postMessage` (nunca `'*'`); ouro nunca texto sobre claro e texto sobre ouro é `ink` sólido; cor arbitrária de texto evitada (token com nome); descrever forma proibida em comentário, não escrevê-la; `pnpm build` não checa tipo (`tsc -p …/tsconfig.app.json`); baselines remedidas e `CLAUDE.md` dos módulos atualizados ao fechar.

**Testes**
- Unidade (core): valor ausente/nulo/de outro tipo/desconhecido ⇒ Padrão; os dois válidos passam; a mensagem da prévia recusa carimbo alheio e perfil desconhecido, aceita `ready`; a marcação do `<html>` substitui, preserva `lang` e `data-faixa`, `null` não escreve, sem `<html>` intacto; `servePage` marca toda resposta HTML (produto, categoria, fixa, app, Home, 404) e a configuração que falha tira os atributos e põe `no-store`, 301 intacto; pureza do módulo.
- Servidor: a leitura pede as quatro chaves numa consulta; linha ausente ⇒ Padrão; erro lança.
- Componente (loja): na carga vale o atributo e a configuração não troca sem troca de rota; depois da 1ª troca vale a configuração; sem atributo decide a configuração; em prévia dentro de iframe o rascunho aplica o perfil e fora do iframe nada muda; a faixa decide igual depois da extração; o selo "-X%" (cartão e página), o chip e a barra usam o papel de desconto e os outros selos não; a marca lê a variável com fallback.
- Componente (painel): duas opções, "Em uso" no salvo, desconhecido aparece como Padrão; Salvar grava só `{ profile }` na chave do perfil, desabilitado sem mudança; o aviso diz 5 min / 1 hora; "Ver a loja com este perfil" abre o palco com um iframe de `previewSrc`, manda o rascunho com a origem exata e não grava; fechar não chama a mutação; sem `VITE_STORE_URL` aparece o passo de configuração.
- Guardas: paleta lida do disco por perfil igual à escrita à mão; pisos em cada perfil; tetos de "nunca texto" no Padrão; sensor (um valor BF reprovado reprova); o ateliê com o objeto hex por identidade; HSL do Padrão igual ao de hoje; `previaUnica`/`folgaDoPalco` com o quarto palco; `storeSettingsDefaults` sem migration; dono único do atributo e dos valores.
- Integração local (Validation): a leitura pública com `appearance` contra o banco local (sem e com a linha, restaurando depois); o primeiro HTML com o atributo pelo `api/page.mjs` servido; navegador 390×844 e 1440×900 nos dois perfis.

**Depende / Expõe** — monorepo único: painel grava `store_settings` `key='appearance'` `value={ profile }` por `useUpdateSettings` (`useStoreSettings.ts:168-181`); `api/page` lê pela chave publicável e escreve o atributo; a loja lê o atributo e a configuração; o painel manda o rascunho por `postMessage` com o carimbo do canal; `frame-ancestors` do `vercel.json` já autoriza o painel.

## Fronteira entre repositórios

`nada` — topologia de repositório único.

## Cobertura dos UCs

| UC | Reivindicado por |
|---|---|
| UC-01 | `.` (core, ui, store, server, backoffice) |
| UC-02 | `.` (mesma chave e gravação) |
| UC-03 | `.` (core canal, store recebedor, backoffice palco) |

## Decisões

| # | A pergunta | A resposta | Quem decidiu |
|---|---|---|---|
| R1 | Os tetos de "nunca texto" reprovam o BF | No Padrão os tetos de `contrast.test.ts:107-124` continuam valendo como hoje; no Black Friday a regra de uso é guardada pelo uso (`accentText`); RN-03 trocado no `prd.md` | gate do PRD Tech Review (`tetos-de-nunca-texto-reprovam-o-bf` · tech_prd_edit · r1), decidido na sessão pela recomendação |
| R2 | Aplicação no navegador sobre HTML em cache | Regra de carga da faixa: na carga vale o atributo do servidor; a configuração decide depois da primeira troca de rota, ou quando o atributo está ausente (dev, prévia, leitura que falhou); RN-04 trocado | PRD Tech Review (`html-em-cache-e-aplicacao-no-navegador` · tech_prd_edit · r1) |
| R3 | Loja aberta | `staleTime` de 5 min mantido; UC-01 trocado | PRD Tech Review (`loja-aberta-ve-em-minutos` · tech_prd_edit · r1) |
| R4 | Formato da variável | `--estrelinha-<token>` continua hex; nasce `--estrelinha-<token>-rgb` (canais) só para o Tailwind da loja: `rgb(var(--estrelinha-<token>-rgb) / <alpha-value>)` | PRD Tech Review (`formato-da-variavel-quebra-consumidores-diretos` · tech · r1) |
| R5 | Camada HSL do shadcn | Redefinida por perfil (primary, primary-foreground, ring, input, border, foreground, card/popover-foreground, muted-foreground, accent-foreground), com guarda que a compara aos tokens da marca em cada perfil | PRD Tech Review (`camada-hsl-do-shadcn` · tech · r1) |
| R6 | Sombras | A sombra da loja lê `--estrelinha-shadow-rgb` (Padrão `52 73 94`, igual a hoje; BF `22 21 20`, o ink do perfil), opacidades do dono; o ateliê segue com `ESTRELINHA_SHADOW` por identidade; `.glow-*` e `InstagramInviteSheet:35` passam a ler a mesma variável; `CookieNotice:59` usa o ink (`rgba(35,48,58,0.08)`) e passa a ler `--estrelinha-ink-rgb` com a mesma opacidade (correção da auditoria da fila) | PRD Tech Review (`sombras-literais` · tech · r1) + handoff H5 |
| R7 | Leitor da paleta com dois blocos | O leitor recebe o perfil e recorta o bloco dele (`:root` / `html[data-perfil="black-friday"]`), com âncora por perfil e sensor de que o bloco BF não vaza para o Padrão; contrast/fieldBorder iteram os dois perfis; accentText e arbitraryTextColor não medem "por perfil" | PRD Tech Review (`leitor-da-paleta-com-dois-blocos` · tech · r1) |
| R8 | Onde moram as variáveis | **Revisto no handoff (H1)**: os perfis moram num dono em `packages/ui/src/tokens/` (o Padrão é `ESTRELINHA_COLORS`); as variáveis ficam escritas no `App.css` como cópia deliberada, um bloco por perfil, e `palette.test.ts` compara cada bloco (hex, `-rgb` e HSL) com o dono. Gerar por plugin `addBase` foi descartado: o `@layer base` de `packages/ui/src/styles.css` redeclara o HSL do shadcn e a ordem de saída não é garantida | PRD Tech Review (`dono-unico-e-css-gerado` · tech · r1) revisto no handoff H1 pela conferência (incerteza 1 do code lookup) |
| R9 | O atributo no `<html>` | Reusar o caminho da faixa: `appearance` no `.in` de `readSettings`, `PageSettings` ganha o perfil, `lerConfiguracoes` o copia, `markStyleProfile` irmão de `markAnnouncementBar` no mesmo pós-processamento; leitura que falha ⇒ sem atributo e `no-store` | PRD Tech Review (`mecanismo-do-html-ja-existe` · tech · r1) |
| R10 | Migration | Sem migration; `appearance` ausente = Padrão; tipo e normalizador em `core` (`.ts` explícito), `DEFAULT_APPEARANCE` em `DEFAULTS` | PRD Tech Review (`sem-migration` · tech · r1) |
| R11 | Prévia | Palco novo dentro do card (modal), com `previewFrame`/`useFullscreenStage`, na lista de `previaUnica.test.ts` e `folgaDoPalco.test.ts`; canal `style-profile` irmão de `core/announcements/preview.ts`; a loja aplica o rascunho só em `isPreviewWindow` | PRD Tech Review (`previa-quarto-palco` · tech · r1) |
| R12 | Número de seções | Configurações tem 5 seções; nenhuma nasce | PRD Tech Review (`configuracoes-tem-cinco-secoes` · tech · r1) |
| H1 | Onde se lê a paleta (T4 × T5) | ver R8 | handoff, decidido na sessão pela recomendação (o usuário mandou decidir em 2026-11-14) |
| H2 | O papel do desconto | Nasce o papel de desconto com três tokens: `sale` (fundo do selo e do chip), `on-sale` (texto sobre ele) e `sale-bar` (preenchimento da barra do frete). Padrão: `sale` = #34495E, `on-sale` = #FFFFFF, `sale-bar` = #34495E (iguais aos de hoje). Black Friday: `sale` = #C2A063, `on-sale` = #161514, `sale-bar` = #9A7A45. Os pares entram em `contrast.test.ts` (on-sale/sale ≥ 4,5; sale-bar sobre branco ≥ 3) | handoff, pela recomendação |
| H3 | O selo "-X%" da página do produto (`ProductPage.tsx:249-253`) | Entra: usa o mesmo papel de desconto que o do cartão | handoff, pela recomendação |
| H4 | O "chip de desconto da sacola" | É o elemento da sacola que mostra o desconto aplicado com fundo `primary` (localizar entre `CartDrawer.tsx:267`, `CouponInput.tsx:80-93`); se nenhum tiver fundo `primary`, nada muda e o retorno diz isso | handoff, pela recomendação |
| H5 | Sombras: design × PRD | Vale o PRD (R6) | handoff, pela recomendação |
| H6 | Nome e valores do atributo | `data-perfil` na tag `<html>`, valores `padrao` e `black-friday` (os ids do perfil); o seletor do BF é `html[data-perfil="black-friday"]` (vence `:root` por especificidade). O servidor sempre escreve o atributo com o perfil normalizado; ausente só quando a leitura falhou | handoff, pela recomendação |
| H7 | O texto do aviso | O do design, mais: "Quem já está com a loja aberta vê ao trocar de página." | handoff, pela recomendação |
| H8 | A mensagem ao salvar | O card não usa a frase compartilhada "já estão valendo na loja": mostra "Perfil salvo. Quem abrir a loja vê o perfil novo em até 1 hora." A frase de `useSettingsSave.ts:30` não muda para as outras telas | handoff, pela recomendação (conflito 4) |
| H9 | Estados não desenhados | Carregando: o card desenha as opções desabilitadas até a configuração chegar; salvando/erro: o molde do `SettingsSaveButton` e do `useSettingsSave`; valor desconhecido gravado ⇒ o card mostra "Padrão" com "Em uso" | handoff, pela recomendação |
| H10 | O modal da prévia | `Dialog` do `@estrelinha/ui` (Esc, foco e retorno do Radix), palco com alternância Computador/Celular por `PREVIEW_DEVICES` como os outros palcos; o arquivo do palco termina em `LivePreview.tsx` | handoff, pela recomendação |
| H11 | A posição do card | Último card da seção "Dados da loja" | handoff, pela recomendação |
| H12 | Prova com a linha gravada | Permitida no banco local (as restrições do `PROJECT.md` permitem teste local), restaurando o estado ao fim | handoff, pela recomendação |
| H13 | A documentação "quatro seções" | Corrigida para cinco ao fechar (`apps/backoffice/CLAUDE.md`) | handoff, pela recomendação |

| C1 | O contrato do módulo do perfil (fixado aqui para as tarefas que o consomem) | `packages/core/src/appearance/` exporta, com `.ts` explícito em todo especificador: `STYLE_PROFILES = ['padrao', 'black-friday'] as const`; `type StyleProfile`; `interface AppearanceSettings { profile: StyleProfile }`; `DEFAULT_APPEARANCE = { profile: 'padrao' }`; `STYLE_PROFILE_ATTRIBUTE = 'data-perfil'`; `normalizeAppearance(raw: unknown): AppearanceSettings` e `styleProfileOf(raw: unknown): StyleProfile` (desconhecido ⇒ `padrao`); o canal da prévia no molde de `core/announcements/preview.ts` (`STYLE_PROFILE_PREVIEW_SOURCE`, a mensagem `ready`, a mensagem `draft` com `profile`, e um parse que devolve a mensagem ou `null`); os rótulos, descrições e frases do card (H7, H8) num arquivo de cópia. A chave em `store_settings` é `appearance`, com `value = { profile }`. O barrel de `@estrelinha/core/appearance` reexporta tudo | conferência (contrato para as ondas) |
| C2 | O contrato dos perfis em `packages/ui` | `packages/ui/src/tokens/estrelinha.ts` (ou arquivo irmão em `tokens/`) exporta `ESTRELINHA_PROFILES: Record<StyleProfile, …>` com `ESTRELINHA_PROFILES.padrao === ESTRELINHA_COLORS` (mesma referência); o tipo `StyleProfile` vem de `core` por `import type` relativo com `.ts`; `ESTRELINHA_COLORS` ganha os três tokens de desconto (H2) com os valores do Padrão; a cor de sombra por perfil (`52 73 94` / `22 21 20`) mora no mesmo dono | conferência (contrato para as ondas) |

## Não resolvido

`nada` — tudo o que os lookups deixaram aberto foi decidido no handoff (H1..H13). A prova de CLS/primeira pintura em
rede lenta nas sete telas fica para a Validation e o QA.
