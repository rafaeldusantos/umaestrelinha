# QA Run Report — 2026-08-02 — backoffice catálogo (features 11–14)

- **Scope:** primeira passada de QA real no **backoffice de catálogo** — formulário de produto (`11`), mídia e estúdio (`12`), listagem v2 e lote (`13`), refinamentos + tela de categorias (`14`). Nenhuma dessas superfícies havia sido andada por uma persona; a árvore de QA só tinha personas e journeys de loja.
- **Cadence tier:** full
- **Build:** `d8f5550` (branch `feat/backoffice-nav-groups-rebrand-nanita`) · **Environment:** backoffice `http://localhost:8081`, loja `http://localhost:8080`, Supabase local `127.0.0.1:54321` (33 produtos, 30 variações, 8 categorias no banco no início do run)
- **Started:** 2026-08-02T00:30-03:00 · **Encerrado:** 2026-08-02T01:30-03:00 · **Status:** closed

## Personas

| Persona | Base | Device / Network / Locale | Sessions |
|---|---|---|---|
| Nana | Power User | desktop 1440×900 / wifi-fast / pt-BR | CH-cadastro-de-produto-com-grade, CH-listagem-aguenta-maltrato, CH-massa-mexe-em-dinheiro, CH-url-antiga-continua-chegando, CH-lote-do-drop-colado-do-excel, CH-foto-e-alt-na-loja, CH-categorias-conversam-com-produtos |
| Dora | Casual User | laptop 1440×900 / wifi-fast / pt-BR | CH-selecao-que-apaga, CH-formulario-nao-perde-o-trabalho |
| Marina | Mobile User | phone-large 390×844 / 4g / pt-BR | ponta de loja de CH-url-antiga-continua-chegando e CH-foto-e-alt-na-loja |
| Sofia | Accessibility-Reliant | phone-large / screen-reader / pt-BR | ponta de loja de CH-foto-e-alt-na-loja (`MED-alt-chega-na-loja`) |

**Nota de viewport:** o backoffice é ferramenta de desktop por decisão de projeto (`A31` da feature `14`),
então as sessões de admin começam em 1440×900 — a premissa mobile-first vale para a **loja**, e é lá que
Marina e Sofia entram. Registrado em `../personas.md`.

## Flows in Scope

- `J-cadastrar-produto-com-grade` — a lojista põe no ar um produto com tamanho e acabamento, cada combinação com o próprio preço (`../journeys/J-cadastrar-produto-com-grade.md`)
- `J-nao-perder-o-trabalho-no-formulario` — ela não perde 40 minutos de cadastro por um F5, e sabe em qual aba está o erro (`../journeys/J-nao-perder-o-trabalho-no-formulario.md`)
- `J-achar-e-corrigir-na-listagem` — corrigir 12 preços sem abrir 12 formulários (`../journeys/J-achar-e-corrigir-na-listagem.md`)
- `J-reprecificar-em-massa` — reajustar 12 produtos vendo o impacto antes e podendo voltar atrás (`../journeys/J-reprecificar-em-massa.md`)
- `J-agir-na-selecao-sem-perder-catalogo` — a seleção serve para alguma coisa, e a ação sem volta mostra o que vai apagar (`../journeys/J-agir-na-selecao-sem-perder-catalogo.md`)
- `J-cadastrar-lote-grade-rapida` — o drop inteiro entra numa tela, colado do Excel (`../journeys/J-cadastrar-lote-grade-rapida.md`)
- `J-mudar-url-sem-quebrar-link` — trocar o endereço do produto sem matar o link já divulgado (`../journeys/J-mudar-url-sem-quebrar-link.md`)
- `J-foto-e-alt-do-produto` — a cliente vê a foto da combinação que escolheu; quem usa leitor de tela ouve o que a imagem mostra (`../journeys/J-foto-e-alt-do-produto.md`)
- `J-organizar-categorias` — criar, aninhar e limpar categorias sem deixar produto órfão (`../journeys/J-organizar-categorias.md`)

## Session Matrix & Results

| # | Charter | Journey / Scenario | Persona | Tour | Status | Issue | Fix commit |
|---|---|---|---|---|---|---|---|
| 1 | CH-cadastro-de-produto-com-grade | J-cadastrar-produto-com-grade / PRD-cadastro-com-grade-happy | Nana | Feature | Fixed | BUG-20260802-loja-nao-mostra-nenhum-produto | eca8b64 |
| 2 | CH-cadastro-de-produto-com-grade | J-cadastrar-produto-com-grade / PRD-grade-regerar-com-diff | Nana | Feature | Pass |  |  |
| 3 | CH-cadastro-de-produto-com-grade | J-cadastrar-produto-com-grade / PRD-linha-sem-preco-nao-vende | Nana | Feature | Pass |  |  |
| 4 | CH-cadastro-de-produto-com-grade | J-cadastrar-produto-com-grade / PRD-taxonomia-nao-suja | Nana | Feature | Skipped | | |
| 5 | CH-cadastro-de-produto-com-grade | J-cadastrar-produto-com-grade / PRD-mascaras-e-politica-de-estoque | Nana | Feature | Pass |  |  |
| 6 | CH-cadastro-de-produto-com-grade | J-cadastrar-produto-com-grade / PRD-excluir-variacao-vendida | Nana | Feature | Skipped | | |
| 7 | CH-listagem-aguenta-maltrato | J-achar-e-corrigir-na-listagem / LST-consulta-no-servidor-com-count | Nana | Garbage | Pass |  |  |
| 8 | CH-listagem-aguenta-maltrato | J-achar-e-corrigir-na-listagem / LST-visoes-filtros-e-busca | Nana | Garbage | Skipped | | |
| 9 | CH-listagem-aguenta-maltrato | J-achar-e-corrigir-na-listagem / LST-editar-na-celula-com-teclado | Nana | Garbage | Skipped | | |
| 10 | CH-listagem-aguenta-maltrato | J-achar-e-corrigir-na-listagem / LST-desfazer-da-edicao-inline | Nana | Garbage | Skipped | | |
| 11 | CH-listagem-aguenta-maltrato | J-achar-e-corrigir-na-listagem / LST-celula-bloqueada-explica-por-que | Nana | Garbage | Skipped | | |
| 12 | CH-listagem-aguenta-maltrato | J-achar-e-corrigir-na-listagem / LST-colunas-badges-e-largura | Nana | Garbage | Skipped | | |
| 13 | CH-massa-mexe-em-dinheiro | J-reprecificar-em-massa / BLK-massa-previa-bate-com-a-conta | Nana | Money | Skipped | | |
| 14 | CH-massa-mexe-em-dinheiro | J-reprecificar-em-massa / BLK-massa-so-o-que-esta-ligado | Nana | Money | Skipped | | |
| 15 | CH-massa-mexe-em-dinheiro | J-reprecificar-em-massa / BLK-massa-desfazer-de-30s | Nana | Money | Skipped | | |
| 16 | CH-massa-mexe-em-dinheiro | J-reprecificar-em-massa / BLK-massa-categorias-e-agendar | Nana | Money | Skipped | | |
| 17 | CH-selecao-que-apaga | J-agir-na-selecao-sem-perder-catalogo / BLK-barra-oferece-as-seis-acoes | Dora | Multi-Tab | Skipped | | |
| 18 | CH-selecao-que-apaga | J-agir-na-selecao-sem-perder-catalogo / BLK-duplicar-nasce-rascunho | Dora | Multi-Tab | Skipped | | |
| 19 | CH-selecao-que-apaga | J-agir-na-selecao-sem-perder-catalogo / BLK-exportar-volta-pelo-importador | Dora | Multi-Tab | Skipped | | |
| 20 | CH-selecao-que-apaga | J-agir-na-selecao-sem-perder-catalogo / BLK-excluir-mostra-antes-de-apagar | Dora | Multi-Tab | Skipped | | |
| 21 | CH-selecao-que-apaga | J-agir-na-selecao-sem-perder-catalogo / BLK-excluir-nao-orfana-pedido | Dora | Multi-Tab | Skipped | | |
| 22 | CH-formulario-nao-perde-o-trabalho | J-nao-perder-o-trabalho-no-formulario / PRD-erro-em-aba-fechada-aponta | Dora | Interrupt | Skipped | | |
| 23 | CH-formulario-nao-perde-o-trabalho | J-nao-perder-o-trabalho-no-formulario / PRD-rascunho-sobrevive-ao-f5 | Dora | Interrupt | Skipped | | |
| 24 | CH-formulario-nao-perde-o-trabalho | J-nao-perder-o-trabalho-no-formulario / PRD-saida-e-descarte-pedem-confirmacao | Dora | Interrupt | Skipped | | |
| 25 | CH-formulario-nao-perde-o-trabalho | J-nao-perder-o-trabalho-no-formulario / PRD-checklist-e-resumo-dizem-a-verdade | Dora | Interrupt | Pass | BUG-20260802-gerar-do-seo-nao-gera-nada | 7ba37ef |
| 26 | CH-url-antiga-continua-chegando | J-mudar-url-sem-quebrar-link / PRD-slug-mora-so-em-seo | Nana | Back-Button | Skipped | | |
| 27 | CH-url-antiga-continua-chegando | J-mudar-url-sem-quebrar-link / PRD-slug-disponibilidade-antes-do-save | Nana | Back-Button | Skipped | | |
| 28 | CH-url-antiga-continua-chegando | J-mudar-url-sem-quebrar-link / PRD-slug-vinculo-com-o-nome | Nana | Back-Button | Skipped | | |
| 29 | CH-url-antiga-continua-chegando | J-mudar-url-sem-quebrar-link / PRD-slug-301-preserva-link-antigo | Marina | Back-Button | Skipped | | |
| 30 | CH-lote-do-drop-colado-do-excel | J-cadastrar-lote-grade-rapida / BLK-grade-rapida-colar-e-criar | Nana | Paste | Skipped | | |
| 31 | CH-lote-do-drop-colado-do-excel | J-cadastrar-lote-grade-rapida / BLK-grade-rapida-uma-escrita-em-lote | Nana | Paste | Skipped | | |
| 32 | CH-lote-do-drop-colado-do-excel | J-cadastrar-lote-grade-rapida / BLK-grade-rapida-erro-na-linha | Nana | Paste | Skipped | | |
| 33 | CH-lote-do-drop-colado-do-excel | J-cadastrar-lote-grade-rapida / BLK-grade-rapida-imagem-na-celula | Nana | Paste | Skipped | | |
| 34 | CH-foto-e-alt-na-loja | J-foto-e-alt-do-produto / MED-upload-rejeita-antes-de-comprimir | Nana | Network | Skipped | | |
| 35 | CH-foto-e-alt-na-loja | J-foto-e-alt-do-produto / MED-webp-1600-no-storage | Nana | Network | Skipped | | |
| 36 | CH-foto-e-alt-na-loja | J-foto-e-alt-do-produto / MED-alt-gerado-por-template | Nana | Network | Skipped | | |
| 37 | CH-foto-e-alt-na-loja | J-foto-e-alt-do-produto / MED-estudio-nao-grava-sem-aplicar | Nana | Network | Skipped | | |
| 38 | CH-foto-e-alt-na-loja | J-foto-e-alt-do-produto / MED-imagem-por-variacao-na-loja | Marina | Network | Skipped | | |
| 39 | CH-foto-e-alt-na-loja | J-foto-e-alt-do-produto / MED-alt-chega-na-loja | Sofia | Network | Skipped | | |
| 40 | CH-categorias-conversam-com-produtos | J-organizar-categorias / CAT-contagem-vem-do-servidor | Nana | Feature | Pass |  |  |
| 41 | CH-categorias-conversam-com-produtos | J-organizar-categorias / CAT-hierarquia-e-criacao | Nana | Feature | Blocked (needs human verify) |  |  |
| 42 | CH-categorias-conversam-com-produtos | J-organizar-categorias / CAT-criar-inline-sem-perder-rascunho | Nana | Feature | Skipped | | |
| 43 | CH-categorias-conversam-com-produtos | J-organizar-categorias / CAT-excluir-nomeia-quantos-perdem | Dora | Feature | Skipped | | |
| 44 | CH-cadastro-de-produto-com-grade | (passo 0 de todas) / ADM-primeiro-login-entra | Nana | Feature | Fixed | BUG-20260802-primeiro-login-do-admin-volta-para-a-tela | f620217 |

Status legend: `Pending | Pass | Fixed | Skipped | Blocked (needs human verify) | Blocked (human decision)`

## Session Debriefs

### CH-cadastro-de-produto-com-grade — Nana (Feature Tour, box 90 min)

- **Ran:** 2026-08-02 00:35 → 01:05 (box respeitado: sim)
- **Findings:**
  - **A loja não mostrava nenhum produto** (`BUG-20260802-loja-nao-mostra-nenhum-produto`,
    Blocks-Completion). Achado exatamente onde a journey manda olhar: a ponta de loja. O cadastro no
    backoffice estava impecável e a vitrine estava muda. Corrigido sob o governor (`eca8b64`).
  - **Não se entra no backoffice na primeira tentativa**
    (`BUG-20260802-primeiro-login-do-admin-volta-para-a-tela`, Blocks-Completion). Encontrado no passo 0,
    antes de a journey começar. Escalado — ver *Decisions for a Human*.
  - O resto da feature `11` **entregou**: 5 abas sem `Variações`, teto de 3 eixos com o botão desabilitado
    no 4º, colagem `3,5 cm, 4,5 cm, 5,5 cm` virando três chips, cabeçalho `2 de 3 eixos · 3 × 2 = 6
    variações`, diff `6 a criar · 0 a remover` antes de aplicar, grade agrupada pelo 1º eixo com soma de
    estoque por grupo, `Preencher coluna`, mensagem inline `sem preço a variação não entra na loja` na
    linha certa, badge de pendência por aba, `Salvar e publicar` bloqueado com `Salvar rascunho` livre, e
    rodapé com a faixa calculada **só** sobre ativas com preço.
  - **Máscaras conferidas no banco, não no campo:** `R$ 1.234,56` colado → `cost_price = 1234.56`; `18`
    no peso → `weight_kg = 0.018`. `options`, 6 `product_variants` e o vínculo de categoria com
    `position` gravados.
  - O `POST /rest/v1/product_variants` voltou **201** — é o mesmo request que abria esta sessão de
    trabalho com `23502` (`null value in column "name"`), morto pela migration `20260801160000`.
- **Bugs filed/updated:** BUG-20260802-loja-nao-mostra-nenhum-produto; BUG-20260802-primeiro-login-do-admin-volta-para-a-tela; BUG-20260802-gerar-do-seo-nao-gera-nada
- **Scenarios settled:** PRD-cadastro-com-grade-happy → pass (após o fix) · PRD-grade-regerar-com-diff → pass · PRD-linha-sem-preco-nao-vende → pass · PRD-mascaras-e-politica-de-estoque → pass · PRD-checklist-e-resumo-dizem-a-verdade → pass · ADM-primeiro-login-entra → fail
- **Paper cuts:** ver a seção própria
- **Surprises:** o cadastro está mais completo do que a régua exigia — o diff de regerar avisa que as
  linhas nascem pausadas, coisa que nenhuma AC pede — e mesmo assim o produto cadastrado não chegava à
  cliente. A qualidade do backoffice escondia a loja quebrada, porque ninguém andava a journey inteira.
- **Suggested next charter:** `CH-formulario-nao-perde-o-trabalho` (rascunho e guarda de saída ficaram sem
  prova) e `CH-selecao-que-apaga` (a única ação do produto sem desfazer).

### CH-listagem-aguenta-maltrato — Nana (Garbage Tour, parcial)

- **Ran:** 2026-08-02 01:06 → 01:12 (box interrompido: sim — só a prova de rede foi feita)
- **Findings:** a listagem consulta o servidor de verdade. `GET products?select=<colunas
  explícitas>&order=created_at.desc&offset=0&limit=25` → **206**, rodapé `1–25 de 34` com `count` real, e
  as sete visões contadas por `HEAD` separados. Nenhum `select('*')` do catálogo. `PLS-01` cumprido.
- **Scenarios settled:** LST-consulta-no-servidor-com-count → pass. Os outros cinco desta journey ficaram
  `Skipped` — **não foram andados**.
- **Suggested next charter:** rodar o box inteiro; a edição inline com teclado e o desfazer são o coração
  da `13` e seguem sem veredito.

### CH-categorias-conversam-com-produtos — Nana (Feature Tour, parcial)

- **Ran:** 2026-08-02 01:13 → 01:22 (box interrompido: sim)
- **Findings:**
  - **A contagem por categoria vem do servidor** — a tela lê a view `category_product_counts`
    (`GET /rest/v1/category_product_counts?select=category_id,product_count`), não o catálogo. `Anime = 7`
    na tela e `7` no banco, já incluindo o produto criado nesta sessão. `RFN-09` AC 2 cumprido.
  - O `select` de categorias já traz `parent_id`, `banner_url` e `color_accent` e volta 200 — as três
    colunas que o `AD-012` registrou como ausentes existem agora.
  - **A criação de categoria ficou sem veredito.** O diálogo abre e o nome digitado gera o slug automático
    (`QA Shoujo` → `qa-shoujo`), mas o clique em *Criar Categoria* não completou pelo driver (ref obsoleto
    depois do re-render; o diálogo fechava sem escrita). **Não há prova de defeito** — e também não há
    prova de que grava. Marcado `Blocked (needs human verify)` com instruções.
- **Scenarios settled:** CAT-contagem-vem-do-servidor → pass · CAT-hierarquia-e-criacao → blocked-verify
- **Suggested next charter:** repetir a criação à mão e seguir para excluir categoria com produtos.

## What Was Fixed

### BUG-20260802-loja-nao-mostra-nenhum-produto: a vitrine estava vazia
- **Symptom:** home sem um único card de produto (e sem mensagem de vazio) e "Produto não encontrado" em
  toda página de produto, inclusive para produto ativo no banco.
- **Root cause:** `PRODUCT_SELECT` embutia `categories(...)` **e** `product_categories(...)` no mesmo
  select. Com os dois caminhos `products → categories` existindo desde a feature `07`, o PostgREST
  responde `300 PGRST201` e os hooks tratam o erro como "sem resultado".
- **Fix:** `eca8b64` — nomear a FK: `categories!products_category_id_fkey(slug, name)`. Uma linha, um
  arquivo, os três hooks da loja.
- **Regression test:** `apps/store/src/entities/product/lib/__tests__/mapProduct.test.ts` — 2 de 3 testes
  **falham** sem a correção e 3 de 3 passam com ela (provado com `git stash` do arquivo de origem).
- **Retested:** sessão limpa da Marina em 390×844 — 16 cards na home, e a página do produto criado nesta
  sessão abre com os dois seletores e o preço da grade. Journey adjacente (o cadastro no backoffice)
  re-andada: segue gravando.

### BUG-20260802-primeiro-login-do-admin-volta-para-a-tela: a senha certa não entrava
- **Symptom:** senha correta devolvia a lojista para o formulário vazio, sem mensagem; a segunda
  tentativa entrava.
- **Root cause:** **duas** causas na mesma corrida, e a segunda só apareceu ao corrigir a primeira.
  (a) `AdminLoginPage` navegava no sucesso do `signInWithPassword`, antes de o contexto saber que ela é
  admin, e `loadUserData` nunca punha `loading` de volta em `true` — então `RequireAdmin` decidia sobre
  estado obsoleto e a expulsava. (b) `loadUserData` era chamada **de dentro** do callback do
  `onAuthStateChange` e ela chama `supabase.from(...)`: é a armadilha documentada do `supabase-js` — a
  leitura de `user_roles` sai antes de a sessão estar acoplada ao client, o PostgREST responde **401**, e
  `checkAdmin` engole o erro e devolve `false`. Com só (a) corrigida, uma em cada duas sessões frias
  passou a dizer **"Esta conta não tem acesso ao painel."**: uma frase confiante e errada.
- **Fix:** `f620217` — `loading` volta a `true` durante a resolução (com `resolvedFor`, para que refresh
  de token do mesmo usuário não pisque a loja); a resolução sai do callback via `setTimeout(0)`; e quem
  navega passa a ser um efeito que espera o papel resolver, com frase própria para conta sem permissão.
- **Regression test:** `apps/store/src/features/auth/__tests__/authContext.test.tsx` (2 falham antes) e
  `apps/backoffice/src/pages/admin/AdminLoginPage.test.tsx` (3 falham antes).
- **Retested:** **5 de 5 sessões frias entraram na primeira tentativa**, `user_roles` em 200, senha
  errada ainda avisa. Adjacentes (o `AuthProvider` serve os dois apps): loja com 16 cards na home,
  `/conta` e `/checkout` deslogadas abrem o overlay sem travar em "Carregando...".

### BUG-20260802-gerar-do-seo-nao-gera-nada: o botão prometia geração
- **Symptom:** a ação `Gerar` do item de SEO no checklist só trocava de aba e deixava os campos vazios.
- **Root cause:** contradição entre `RFN-07` AC 5 (pede o rótulo `Gerar`) e `AD-011` (tira geração de
  texto de SEO de escopo). A implementação ficou no meio: mostrava o rótulo e fazia o `Ir →`.
- **Fix:** `7ba37ef` — opção 1 da escalação: o rótulo passa a ser `Ir →`, como nos demais itens. A letra
  de `RFN-07` AC 5 fica **conscientemente divergente**; `AD-011` é a decisão mais forte.
- **Regression test:** `apps/backoffice/src/features/product-form/ui/PublishChecklist.test.tsx` — o teste
  que existia **fixava o rótulo errado** e por isso passava enquanto a tela mentia; foi reescrito.
- **Retested:** produto sem SEO no backoffice em execução mostra `Ir →` e nenhum `Gerar`. O `Gerar` do
  alt-text (aba Mídia, `PMD-01`) segue existindo — outro componente, não tocado.

## Paper Cuts

| Persona | Where (journey/step) | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Dora | J-nao-perder-o-trabalho, checklist | "cliquei em *Gerar* e caí numa aba de SEO vazia — gerou o quê?" | sharp | virou `BUG-20260802-gerar-do-seo-nao-gera-nada`, escalado (tensão entre `RFN-07` AC 5 e `AD-011`) |
| Nana | J-cadastrar-produto-com-grade, eixos | "com o 2º eixo ainda vazio o cabeçalho diz `3 = 3 variações`, e esse `=` sozinho não quer dizer nada" | dull | observando — some assim que o 2º eixo ganha valores |
| Nana | J-cadastrar-produto-com-grade, publicar | "publiquei e fui ver na loja: a combinação aparece como *indisponível*" | dull | correto — estoque 0 com política `Controlar estoque`. Não é defeito; anotado porque assusta na primeira vez |

## Runtime Errors Observed

- Nenhum erro de console durante as sessões — só os dois avisos de *future flag* do React Router v7,
  presentes em toda navegação e alheios a estas features.
- O `GET /rest/v1/user_roles` voltou **401** numa das tentativas de login e **200** em outra, com o mesmo
  resultado para a usuária. Registrado dentro de
  `BUG-20260802-primeiro-login-do-admin-volta-para-a-tela` como segundo modo de falha, não como bug
  separado — o sintoma da persona é o mesmo.

## Human Verifications Needed

- [ ] **Criar categoria pela tela** (linha #41). Em `/admin/categorias` → *Nova categoria*, digitar o nome
      `QA Shoujo` (o slug se preenche sozinho), escolher um pai e clicar *Criar Categoria*. Confirmar
      **no banco** (`select * from categories where slug='qa-shoujo'`) que a linha existe com o `parent_id`
      certo — inspeção de tela não vale aqui: é o caminho exato onde o `AD-012` passou batido.

## Decisions for a Human

> **Ambas resolvidas em 2026-08-02**, na segunda rodada do run: o usuário mandou aplicar as
> recomendações. As decisões ficam registradas abaixo como foram tomadas, com o que a implementação
> revelou depois — a opção 2 sozinha **não** bastou para o login (ver *What Was Fixed*).

### Primeiro login do admin não entra (BUG-20260802-primeiro-login-do-admin-volta-para-a-tela)
- **What's broken:** senha certa devolve a lojista para o login vazio, sem mensagem; a segunda tentativa
  entra. Evidência: `../evidence/2026-08-02-backoffice-catalogo-11-14/login-primeira-tentativa-nao-entra.png`.
- **Why not auto-fixed:** falha o bound **Low-risk** do governor. A causa está em
  `AuthProvider.loadUserData`, que serve **os dois apps** — mexer no `loading` do contexto muda o
  carregamento da loja inteira (overlay de auth, `RequireAdmin`, área da cliente). E há escolha de produto
  embutida: quem deve esperar a resolução do papel.
- **Options:**
  1. **`setLoading(true)` no início de `loadUserData`** — conserta a raiz para os dois apps; risco de
     piscar esqueleto na loja a cada mudança de sessão.
  2. **A tela de login espera o papel** (observar `isAdmin` antes de navegar, com estado de "entrando") —
     blast radius mínimo, restrito ao backoffice; não conserta outros consumidores do contexto com a mesma
     corrida.
  3. **`RequireAdmin` não redireciona enquanto houver usuário e o papel não tiver resolvido** — corrige o
     guard em vez do login; muda o comportamento de quem tem sessão e não é admin.
- **Recommendation:** **opção 2 agora** (destrava a lojista com risco contido) **e** a 1 em seguida, como
  correção de raiz, com uma passada de QA na loja. A 3 sozinha esconderia a corrida em vez de resolvê-la.
- **Aplicado (`f620217`):** as opções **2 e 1 juntas** — e o retest mostrou que faltava uma terceira peça
  que a análise inicial não tinha visto: tirar a leitura de `user_roles` de dentro do callback do
  `onAuthStateChange`. Sem ela, a opção 2 apenas trocava o vaivém silencioso por uma acusação errada
  ("esta conta não tem acesso"). O medo que motivou a escalação — piscar a loja — foi contido pelo
  `resolvedFor`: refresh de token do mesmo usuário não re-resolve.

### "Gerar" do SEO não gera (BUG-20260802-gerar-do-seo-nao-gera-nada)
- **What's broken:** a ação do checklist rotulada `Gerar` só troca de aba e deixa título e descrição vazios.
- **Why not auto-fixed:** falha o bound **No product trade-off**. `RFN-07` AC 5 pede o rótulo `Gerar`;
  `AD-011` tira a geração de texto de escopo. As duas decisões se contradizem — não é escolha de QA.
- **Options:**
  1. **Renomear para `Ir →`** — honesto e imediato; contraria a letra de `RFN-07` AC 5.
  2. **Gerar por template determinístico** (nome + categoria → título e descrição), como já se faz no
     alt-text — cumpre o rótulo sem arrastar IA; é trabalho de spec nova.
  3. Deixar como está — a tela segue prometendo o que não faz.
- **Recommendation:** **opção 1 agora**, e a 2 como feature própria se a lojista pedir. O alt-text já
  provou que template puro resolve sem provedor.
- **Aplicado (`7ba37ef`):** opção 1. `RFN-07` AC 5 fica conscientemente divergente — registrado no código e
  no arquivo do bug.

## Learnings

- **A journey atravessar para a loja foi o que achou o bug caro.** Um ciclo que parasse no toast de
  "salvo" teria dado tudo verde com a vitrine vazia. Regra que fica: cadastro só está andado quando a
  cliente vê o produto.
- **Tela boa esconde integração quebrada.** As features `11`–`14` estão bem executadas onde foram
  andadas; o defeito grave morava na costura entre elas e a loja, criada pela feature `07`.
- **Teste que mocka o client não vê query quebrada.** É o `AD-012` numa forma nova: não é o tipo que
  mente, é o `select`. Pede um smoke de integração rodando as queries reais da loja contra o Supabase
  local — dívida anotada, não resolvida aqui.
- **O driver de navegador precisa de ref fresco a cada re-render.** Duas vezes quase virou achado falso —
  o campo de preço "que não limpava" e a categoria "que não gravava". Verificação boa também duvida do
  próprio instrumento.
- **O planejamento tinha lacuna:** nenhuma das nove journeys cobria o login, que é o passo 0 de todas.
  Corrigido com `ADM-primeiro-login-entra`.

## Final Status

> Segunda rodada, 2026-08-02 — o usuário mandou aplicar as recomendações das duas escalações. Os três
> bugs do run estão `verified`. O que segue aberto é **cobertura**, não defeito conhecido.

- **Exit gate (full automated suite):** `pnpm exec turbo run test --concurrency=1` → `Tasks: 4 successful,
  4 total`. **O gate pegou um erro meu:** na primeira tentativa ele ficou vermelho porque eu adicionei o
  `setTimeout(0)` ao `AuthContext` **depois** de escrever os testes do contexto, e eles assertavam antes
  de o callback diferido disparar. Corrigido (helper `tick()`) e o gate refeito verde — é exatamente para
  isso que o gate roda depois das correções, e não antes.
- **Typecheck:** `tsc --noEmit` nos dois apps → **0 erros** (baseline 0/0 mantida).
- **Lint:** store 5 err / 8 warn · backoffice 30 err / 8 warn = **35 / 16** — a baseline documentada,
  sem erro novo.
- **Issues by user impact:** Blocks-Completion **2** (ambos `verified`) · Data-Loss 0 · Trust-Damage 0 ·
  Friction **1** (`verified`) · Cosmetic 0
- **Correções deste run:** `eca8b64` (vitrine vazia) · `f620217` (primeiro login) · `7ba37ef` (rótulo do
  SEO). Cada uma com teste de regressão que falha antes e passa depois, e com retest em persona.
- **Coverage:** **3 de 9 journeys** andadas, duas parcialmente. 11 de 44 linhas com veredito (6 `Pass`,
  4 `Fixed`, 1 `Blocked (needs human verify)`); **36 `Skipped`**, cortadas por tempo na ordem de risco.
  Sem prova nenhuma até agora: edição inline e desfazer da listagem, todo o lote (massa, seleção, grade
  rápida), rascunho e guarda de saída do formulário, URL com 301, e mídia inteira.
- **Verdict:** **ready with blocked items** — nenhum defeito conhecido segue aberto, e os três caminhos
  que quebravam (vitrine, login, rótulo que mentia) estão corrigidos e reandados. O que impede um
  "ready" limpo é o que **não foi olhado**: dois terços das journeys planejadas e a criação de categoria,
  que espera uma verificação humana de dois minutos. As features `11`–`14` entregam o que a spec promete
  onde houve sessão; o próximo ciclo é sessão, não implementação.
