# 86 — Prova em navegador (T23)

**Data**: 2026-10-28 · **Ambiente**: Chromium (Playwright MCP), dev servers da árvore principal —
loja `http://localhost:8082`, painel `http://localhost:8083` —, os dois com `VITE_SUPABASE_URL` no
banco local (`127.0.0.1:54441`). Rotas bloqueadas no contexto: `*.supabase.co` (abort) e o GA por
**host** (`google-analytics.com`, `googletagmanager.com`, `analytics.google.com`) mais `**/g/collect*`.
Login no painel com o admin do `seed.sql`.

> ⚠️ **Armadilha do arnês, registrada**: a primeira regra de bloqueio do GA foi um regex sobre a URL
> inteira (`/google-analytics|googletagmanager/`), e ele casou o **módulo do próprio painel**
> `src/features/google-analytics/index.ts` servido pelo Vite — o painel ficou em branco
> (`ERR_FAILED`). Bloqueie por **host**, nunca por substring da URL.

O `store_settings.menu` original foi guardado antes (`{"links":[{"id":"sobre",…}]}`, sem `version`) e
**restaurado no fim** — o valor confere byte a byte (`diff` vazio). O `updated_at` da linha fica o da
restauração. O retrato de `categories` (`id, name, slug, parent_id, sort_order, active, icon,
menu_desktop, menu_mobile, menu_banners`, 37 linhas) foi comparado com `cmp` antes e depois de todas
as gravações: **idêntico** (`MNM-18`: a tela do menu não escreveu em `categories`).

## (a) Antes de gravar: a loja mostra o menu de hoje

O legado esperado foi calculado de duas formas sobre as categorias e os links do banco local:
`menuItems` (porta nova, sem documento) e o `menuItems` do **`HEAD` anterior** (`d101ca2f`, extraído
por `git archive`). As duas saídas são **iguais** (`diff` vazio):

- computador: Joias afetivas[11 filhas] · Coleção Amuletos · Colar e correntes · Personalizados[7] · Sobre
- celular: Joias afetivas[11] · Colar e correntes · Personalizados[7] · Sobre

| | 1440 × 900 | 390 × 844 |
| --- | --- | --- |
| barra / folha da loja | as 5 entradas do computador, na ordem | as 4 do celular (sem Coleção Amuletos) |
| rolagem horizontal do body | 1440 = 1440 | 390 = 390 (também com a folha aberta) |
| deslocamento com fonte no `<header>` | **nenhum** (0 de N `layout-shift`) | **nenhum** |
| altura do header | 136 (constante) | 64 (constante) |
| primeira entrada da barra no DOM | ~186 ms | ~162 ms (folha) |

**O header não salta por esperar `store_settings`** (decisão do lote 2: com a linha carregando o
menu é vazio). A faixa de departamentos tem altura fixa, então as entradas aparecem ~0,2 s depois
sem mover nada. O CLS que existe na loja em dev vem de `MAIN`/`FOOTER` (a página `lazy` montando sob o
`Suspense`, ~216–246 ms, 0,26 na Home e 0,91 em `/sobre` no dev server) — **não** do header, e não é
desta feature.

O painel abre com o mesmo menu: 5 itens, "5 no computador · 4 no celular", "Coleção Amuletos" com
Celular desligado, sem gravar nada.

## (b) Montar um menu (1440 × 900), com a prévia acompanhando

| Ação | Como | Resultado na lista | Prévia (iframe da loja) |
| --- | --- | --- | --- |
| Adicionar categoria com filhas | "Adicionar item" → busca `acessorios` (sem acento) → "Joias e acessórios · 10 subcategorias entram no submenu" → Adicionar | entra no **fim**, "10 no submenu"; toast "“Joias e acessórios” entrou no fim do menu com 10 itens no submenu." | a barra ganha "JOIAS E ACESSÓRIOS" e o painel dele **abre** com as 10 (o `open` do nó novo) |
| Adicionar página da loja | aba "Página da loja" → "Perguntas frequentes" (nome sugerido no campo) | "Link · /perguntas-frequentes" no fim | "PERGUNTAS FREQUENTES" no fim |
| Renomear + ícone | ⋯ → "Editar nome, ícone e banners" → desligar "Usar o nome da categoria" → "Acessórios" → ícone Corrente → Salvar (botão 72 × 44) | "Acessórios · … · nome próprio", com ícone | "ACESSÓRIOS" |
| Reordenar por **arraste real** | `dragTo` da alça de "Perguntas frequentes" (24 × 44) até a 1ª linha | vai para o topo | vai para o topo |
| Reordenar por "Mover…" | ⋯ de "Perguntas frequentes" → "Mover para cima" **desabilitado** na ponta → "Mover para baixo" | 2ª posição | 2ª posição |
| Desligar Celular | chave "Celular" de "Perguntas frequentes" (`aria-pressed=false`) | "7 no computador · 5 no celular" | computador: continua; celular: some |
| Tirar filho | submenu de "Acessórios" (contador 10/24) → "Tirar “Berloques” do submenu" (44 × 44) | 9/24 | o painel perde "Berloques" |
| Remover item com confirmação | ⋯ de "Coleção Amuletos" → "Remover do menu" | diálogo "Remover “Coleção Amuletos” do menu? · A categoria continua existindo na loja…", foco inicial em **Cancelar**; Cancelar não remove; confirmar remove | some da barra |

O documento gravado no banco local: `version = 2`, 6 itens, `links` legados preservados, "Perguntas
frequentes" `desktop/mobile = true/false`, "Acessórios" com 9 filhos.

## (c) Layout e alvos

**Defeito achado e consertado — o nome do item espremido em 390.** A linha cabia sem estourar, mas o
nome encolhia a **29 px** ("Joi…", "Pe…"): a alça, o ícone e cinco controles (PC, Celular, submenu,
⋯) disputavam a mesma linha. No submenu era pior: **11 px**. Conserto em `MenuTree.tsx`: a linha
embrulha (`flex-wrap`), o nome tem base própria (`basis-40` na raiz, `basis-28` no filho) e os
controles formam um bloco à direita (`ml-auto shrink-0`) que desce para a segunda linha quando não
cabe. Testes que reprovaram antes do conserto: `MenuTree.test.tsx`, bloco "a linha em 390" (2 casos,
token exato). Remedido:

| | 390 × 844 | 1024 × 768 | 1440 × 900 |
| --- | --- | --- | --- |
| nome da linha principal | **248 px**, nenhum truncado (era 29) | 239, 1 linha (60 px) | 239, 1 linha (60 px) |
| linha principal | 2 linhas (112 px) | 1 linha | 1 linha |
| linha do submenu | 2 linhas (106 px), nenhum nome truncado (era 11 px) | 1 linha (56 px) | 1 linha (56 px) |
| rolagem horizontal do body | 390 | 1024 | 1440 |
| controles da lista abaixo de 44 | **nenhum** | nenhum | nenhum |

- **Folha de baixo**: o seletor e o editor abrem como folha de largura cheia em 390 (`x 0`, `y 84`,
  390 × 760).
- **Abaixo de 44, fora do que a 86 desenhou** (registrado, não consertado): o X do `Dialog` do shadcn
  ("Close", 16 × 16, em inglês — a mesma decisão pendente do QA da `81`), o campo de busca do
  `MenuIconPicker` (306 × 36, da `39`) e a barra do palco da prévia ("Tela cheia" 102 × 36,
  "Recarregar" e "Abrir a loja" 36 × 36, da `47`, compartilhada com `/admin/home`). O `Switch`
  mede 44 × 24 com a área de toque estendida por `SWITCH_TAP_44`. A alça de arraste é 24 × 44 e
  `aria-hidden` — o caminho de toque e de teclado é "Mover…".

**Defeito achado e consertado — "Ver na loja" abria o próprio painel.** Era `<a href="/">`, e no
painel `/` é a raiz do backoffice. Agora é `storeOrigin()` (`http://localhost:8082/`), e sem
`VITE_STORE_URL` o botão não existe. Teste que reprovou antes: `AdminMenuPage.test.tsx`, "Ver na
loja leva à loja". **O mesmo defeito continua em `AdminHomePage.tsx:254`** — fora do escopo, registrado.

**Defeito achado e consertado — a prévia do celular não abria a folha.** O efeito que abre a folha
na prévia mora dentro do `MobileMenu`, e o latch da `38` (`StoreLayout`) só monta o `MobileMenu` depois
da primeira abertura: o efeito nunca rodava, e a prévia "celular" mostrava a home e um hambúrguer
(desde o merge da `38` com a `39`, não desta feature — mas impedia provar a prévia nos dois
dispositivos). Conserto em `StoreLayout.tsx`: dentro da prévia, a folha acompanha o quadro —
aberta no de 390, fechada no de 1024 (`isPreviewWindow` + `useCompactViewport`). Testes que
reprovaram antes: `StoreLayoutOverlays.test.tsx`, bloco NAV-43 (3 casos, 2 vermelhos antes; dois
mutantes do efeito reinjetados e mortos). Remedido: Computador → 0 diálogos; Celular → a folha abre
com "Joias afetivas · Colar e correntes · Personalizados · Sobre · Acessórios" (sem "Perguntas
frequentes", desligada no celular); tocar em "Acessórios" na lista abre o acordeão dele na folha
com os 9 filhos e "ver tudo em Acessórios →"; voltar a Computador fecha a folha.

## (d) A loja depois da gravação é igual à prévia

| | Prévia (painel) | Loja (8082) |
| --- | --- | --- |
| barra do computador (1440) | JOIAS AFETIVAS · PERGUNTAS FREQUENTES · COLAR E CORRENTES · PERSONALIZADOS · SOBRE · ACESSÓRIOS | **igual** |
| painel de "Acessórios" | ver tudo + 9 filhos, sem Berloques | **igual** |
| folha do celular (390) | Joias afetivas · Colar e correntes · Personalizados · Sobre · Acessórios | **igual**; acordeão de Acessórios com os 9 e "ver tudo em Acessórios →" |
| rolagem horizontal | — | 1440 / 390 |

## (e) Restauração

`store_settings.menu` voltou ao valor original (o legado, sem `version`), conferido por `diff`; o
retrato de `categories` conferido por `cmp`. A loja volta a desenhar o legado.

## O que não foi medido

- **Android/iOS reais** (toque, arraste com o dedo — o arraste HTML5 não funciona em toque; o
  caminho é "Mover…"), leitor de tela, `prefers-reduced-motion` em navegador.
- **Conflito entre duas janelas** em navegador (provado por probe na T13 e pela página real na suíte).
- Banners do nó em navegador (o upload depende do Storage local; provado na suíte).
- Build servido (`vite preview`): a prova correu nos dev servers.
