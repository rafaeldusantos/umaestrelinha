# QA Run Report — 2026-10-29 — backoffice: o menu montado pela dona (86), reteste (rodada 3)

- **Scope:** reteste das correções do QA r2 (R01..R05 de "Correções do QA r2" em `.specs/features/86-menu-montado-pela-dona/tasks.md`): os 3 bugs da rodada 2 pelos passos originais, os dois paper cuts (R04, R05), a regressão das recusas do "Outro endereço" e do destino digitado do banner, e uma regressão curta (montar e reordenar em 390, loja = prévia em 390 e 1440, prévia da Home em Celular, `categories` intacto).
- **Cadence tier:** targeted (reteste)
- **Build:** `d101ca2f` + árvore da 86 com as correções do QA r1 e r2 (sem commit) · **Environment:** só local — loja `vite` :8082 e painel `vite` :8083 (os dois com `VITE_SUPABASE_URL=http://127.0.0.1:54441`), Supabase local (API 54441, Postgres 54442). No contexto do Playwright, `*.supabase.co` e o GA abortados **por host**, mais `**/g/collect*`. Admin do `seed.sql`. Nenhum código tocado.
- **Started:** 2026-10-29 · **Status:** closed

## Personas

| Persona | Device / Network / Locale | Blocos |
|---|---|---|
| Adri montando o menu | 390×844 (toque em S6; 360/412 em S5), wifi local, pt-BR, fonte 130/200 % por `html { font-size }` | S1, S2, S3, S5, S6 |
| Cliente navegando pelo menu | 390×844 e 1440×900 | S1, S6 |
| Equipe com TalkBack | 1440×900 (e 390), teclado + `document.activeElement` | S4, S5 |

**Dados e restauração.** Antes da primeira ação, por `psql` na 54442: `store_settings.menu` (legado `{"links":[{"id":"sobre",…}]}`, sem `version`, `updated_at` 03:52:39), o retrato de `categories` (37 linhas, `id, name, slug, parent_id, sort_order, active, icon, menu_desktop, menu_mobile, menu_banners`) e a lista de `storage.objects` de `home-images` (3). Nenhuma categoria de teste criada (`TESTE-86-QA-`: 0 antes e depois). **No fim:** `value` do menu restaurado (`diff` vazio; o `updated_at` passa a ser o da restauração, 04:20:46, porque o gatilho da tabela o regrava — mesmo comportamento do r2), `categories` com `cmp` idêntico (também conferido no meio, depois de reordenar), Storage `home-images` com `diff` vazio (a arte enviada em S4 saiu pelo próprio "Descartar"). Evidência em `evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3/` (gitignored).

**Ordem real.** S1+S2 (390, com o legado ainda no banco — a primeira gravação converteu para v2), S4 (1440), S3 (390), S5 (360–412 e 1440), S6 (390 com toque, depois 1440), loja.

## Session Matrix & Results

| # | Bloco | Cenários | Status | Issue |
|---|---|---|---|---|
| S1 | R01 — caminho de coleção ativa grava (raiz e submenu) | PNL-menu-outro-endereco-invalido | Pass | BUG-20261029-caminho-de-colecao-passa-no-seletor-e-e-recusado-ao-gravar → verified; novo BUG-20261029-filha-num-segmento-recusada-no-outro-endereco (Low) |
| S2 | Regressão das recusas do Outro endereço + banner `/botanicas` | PNL-menu-outro-endereco-invalido; PNL-menu-banners-do-item | Pass | |
| S3 | R02 — incerteza com título neutro | PNL-menu-falha-de-rede-ao-gravar | Pass | BUG-20261029-incerteza-de-gravacao-com-titulo-nao-salvou → verified |
| S4 | R03 — "Continuar editando" devolve o foco | PNL-menu-teclado-foco-e-nomes; PNL-menu-banners-do-item | Pass | BUG-20261029-foco-cai-no-body-ao-continuar-editando-o-banner → verified |
| S5 | R04/R05 — foco na busca; 200 % sem reticências | PNL-menu-teclado-foco-e-nomes; PNL-menu-fonte-grande-e-telas | Blocked (human decision) | R05 pass; R04 só na primeira abertura — novo BUG-20261029-seletor-reaberto-depois-da-aba-pagina-foca-a-aba (Low) |
| S6 | Regressão curta | PNL-menu-montar-do-zero-no-celular; PNL-menu-reordenar-no-celular-sem-arraste; LOJA-menu-depois-de-gravar-390-e-1440; PNL-menu-previa-acompanha | Pass | |

Status legend: `Pending | Pass | Fixed | Skipped | Blocked (needs human verify) | Blocked (human decision)`. Nenhum conserto aplicado (pedido: só reteste).

## Session Debriefs

### S1. R01 — coleção ativa no "Outro endereço" (390)

- Menu principal: `/BOTANICAS/` ("Botânicas") e `/Joias-Afetivas/Joia-Afetiva-Linha-Pet/` ("Linha Pet") fecham o seletor com **um PATCH** cada (`store_settings?key=eq.menu&updated_at=eq.…`), sem o aviso de 19 endereços. Banco: `/botanicas` e `/joias-afetivas/joia-afetiva-linha-pet`, normalizados.
- Submenu de "Joias afetivas": `/Personalizados/Nomes/` grava `/personalizados/nomes` (1 PATCH). Recarregar: os três itens continuam ("7 no computador · 6 no celular").
- Loja: barra de 1440 `… SOBRE | BOTÂNICAS | LINHA PET`, folha de 390 com os dois, acordeão de Joias afetivas com `/personalizados/nomes`; tocar abre "Nomes". `/botanicas` → h1 "Coleção Botânicas", `/joias-afetivas/joia-afetiva-linha-pet` → "Linha Pet". **Verified.**
- **Bug novo (Low):** `/COLAR-E-CORRENTES` no submenu é recusado com "Não há página da loja em …", mas a loja abre `/colar-e-correntes` (filha de "Joias e acessórios" num segmento, `AD-018`): h1 "Colar e correntes", sem 404. A forma de dois segmentos, a que a loja usa nos links, passa.

### S2. Regressão das recusas (390 e 1440)

Todas com o seletor aberto, motivo à vista e **zero** escritas:

| Endereço | Motivo |
|---|---|
| `https://google.com`, `//evil.com` | "O menu leva só a páginas da loja. Digite o caminho da página, começando com “/” — por exemplo, “/sobre”." |
| `javascript:alert(1)` (raiz e submenu) | "Não há página da loja em “javascript:alert(1)”. Escolha a página na lista acima, ou confira o endereço abrindo a página na loja." |
| vazio, `   ` | "Digite o endereço da página da loja." |
| `/nao existe`, `/nao-existe` (raiz e submenu), `/black-friday` (inativa), `/personalizados/profissoes` (filha inativa) | "Não há página da loja em …" |
| `/produtos/inexistente-xyz`, `/produtos/colar-com-letra-coracao` (inativa) | "Não há peça à venda em …. Confira o endereço abrindo a peça na loja." |
| `/botanicas` de novo | "Já está no menu." |
| `/personalizados/nomes` de novo no submenu | "Já está neste submenu." |

- Banner (1440): destino "Endereço" `/botanicas`, com título e arte enviada → a linha do banner diz "destino não resolve — o banner não vai aparecer na loja" e "Salvar banners" recusa ("Banner 1: “/botanicas” não é um endereço da loja… Endereços aceitos: /, /produtos, … Para levar a uma coleção ou a uma peça, escolha o destino pelo nome…"), sem escrita. Regra da 39 intacta. "Descartar" apagou a arte do Storage.
- `/nao-existe` na loja: "Essa página não existe." — o painel acerta ao recusar.

### S3. R02 — incerteza (390)

- PATCH com `route.fetch()` + `abort`, quatro releituras abortadas: aviso **"Não deu para confirmar"** + "Não deu para confirmar se salvou. Confira a internet; a próxima mudança parte do que estiver gravado.", sem `destructive`. O banco tinha gravado. **Verified.**
- Controle: PATCH 500 → "Não salvou · Não salvou. O menu voltou ao que estava gravado." (intacto).
- A ação seguinte com rede: relê (GET) antes do PATCH e grava a partir do gravado; nenhum conflito falso.
- Resíduo (do r2, não reaberto): até a próxima ação, a chave na tela mostra o valor anterior ao envio; o texto do aviso cobre isso.

### S4. R03 — "Continuar editando" (1440, teclado)

- Foco no Título do banner → Esc → pergunta com foco em "Continuar editando" → clique → foco no **Título**, texto preservado. Esc + Esc e Esc + Enter → Título. "Voltar" → "Continuar editando" → **"Voltar"**; Tab segue para "Computador". "Descartar" → ⋯ de "Joias afetivas". Nunca `<body>`. **Verified.**

### S5. R04/R05 — seletor (360/390/412 × 130/200 %, e 1440)

- R05: nas duas abas, **0** elementos com `text-overflow: ellipsis`, 0 elementos fora da janela, `scrollWidth` do body = janela (360/390/412), diálogo 358/388/410 sem rolagem lateral. Os únicos nós com conteúdo maior que a caixa são a descrição `sr-only` (de propósito) e o "Close" (anterior, fora). **Pass.**
- R04: primeira abertura (raiz e submenu, 390 e 1440) → foco em `busca-categoria`; digitar "botan" sem clicar filtra para "Coleção Botânicas". **Mas** reabrir depois de ter saído pela aba "Página da loja" → a aba Categoria e a busca voltam, e o foco cai na aba "Categoria" — em todas as larguras e fontes medidas. Novo bug Low.

### S6. Regressão curta

- 390 com toque: "Adicionar item" → digitar "fragm" → "Coleção Fragmentos" → Adicionar: "Item adicionado · “Coleção Fragmentos” entrou no fim do menu." Dois "Mover para cima": 8º → 6º, **1 PATCH cada**, foco de volta ao ⋯; banco na ordem nova; body 390.
- Prévia Celular (390) = folha da loja em 390 (`Joias afetivas | Colar e correntes | Personalizados | Sobre | Coleção Fragmentos | Botânicas | Linha Pet` + Conta/Favoritos/Pedidos); prévia Computador (1440) = barra da loja em 1440 (`JOIAS AFETIVAS | COLEÇÃO AMULETOS | COLAR E CORRENTES | PERSONALIZADOS | SOBRE | COLEÇÃO FRAGMENTOS | BOTÂNICAS | LINHA PET`, `scrollWidth` 1440).
- `/admin/home` em Celular: iframe `?preview=1`, `innerWidth` 390, **0** diálogos (a folha do menu não abre).
- `categories`: `cmp` idêntico ao retrato de antes.

## Paper Cuts

| Persona | Onde | Sentiu | Afiado | Destino |
|---|---|---|---|---|
| Adri | Recusa de `javascript:alert(1)` | "Não há página da loja em “javascript:…”" em vez da frase de "só páginas da loja" que `https://` recebe — certo, mas menos claro | dull | watching |
| Adri | Banner com endereço digitado | a recusa ainda lista os 19 endereços (regra da 39, fora da 86) | dull | watching |
| Adri | Incerteza de gravação | a chave segue mostrando o valor anterior até a próxima ação (do r2) | dull | watching |

## Runtime Errors Observed

- Só os abortos de rede provocados (PATCH/GET de S3) e as imagens do Storage hospedado guardadas em `home_sections`, bloqueadas por `*.supabase.co`. Nenhum `pageerror`.

## Human Verifications Needed

- [ ] Continuam as do r1/r2: Android/iOS real (toque duplo no ⋯ com o dedo, folha do seletor com o teclado virtual), escala de texto do sistema, TalkBack real, e `/SOBRE`/`/sobre/` servidos pela função `api/page`.

## Decisions for a Human

### Filha num segmento no "Outro endereço" (BUG-20261029-filha-num-segmento-recusada-no-outro-endereco) — Low, da 86
- Options: 1. `conferirEnderecoDaLoja` aceita a forma de um segmento de uma filha ativa e grava a canônica (`/joias-e-acessorios/colar-e-correntes`), como já normaliza `/SOBRE/`; 2. manter a recusa e trocar a frase para "Use o endereço completo da coleção: /joias-e-acessorios/colar-e-correntes"; 3. aceitar como está.
- Recommendation: 1 (é a mesma decisão de `AD-018`, e a canônica evita o segundo endereço para a mesma coleção).

### Foco na reabertura do seletor (BUG-20261029-seletor-reaberto-depois-da-aba-pagina-foca-a-aba) — Low, da 86
- Recommendation: focar a busca também quando a aba volta a Categoria na reabertura (o `onOpenAutoFocus` roda antes de a busca existir).

### Anteriores, ainda abertos (sem mudança, fora do escopo): BUG-20261028-voltar-depois-da-folha-perde-a-rolagem, BUG-20261028-dialogos-animam-com-movimento-reduzido, BUG-20261026-fechar-do-modal-em-ingles, BUG-20261027-rodape-da-loja-rola-de-lado-com-fonte-200.

## Learnings

- Os avisos do painel são o `toast` do Radix (`li[data-state="open"]`), não o sonner: um seletor `[data-sonner-toast]` lê zero e parece "nenhum aviso".
- Medir R04 só na primeira abertura aprovaria a correção: a reabertura depois de trocar de aba é o caso que falha.
- Comparar o endereço recusado com a loja aberta no mesmo endereço é o que separa "recusa certa" de "recusa falsa" (`/nao-existe` × `/colar-e-correntes`).

## Final Status

- **Exit gate (suíte automatizada):** um workspace por vez, exit fora de pipe, `--testTimeout=20000` sem o `--` — backoffice `Test Files 243 passed (243) · Tests 4441 passed (4441)`, exit 0; core `Tests 4909 passed (4909)`, exit 0; store `Test Files 333 passed (333) · Tests 6218 passed (6218)`, exit 0. Batem com o gate do `tasks.md`.
- **Bugs retestados:** 3 — `caminho-de-colecao-passa-no-seletor-e-e-recusado-ao-gravar` (Medium), `incerteza-de-gravacao-com-titulo-nao-salvou` (Low), `foco-cai-no-body-ao-continuar-editando-o-banner` (Low): os três **verified**, nenhum reopened. Paper cuts: R05 verified; R04 parcial (virou bug).
- **Bugs novos:** 2, da 86, Friction/Low — `filha-num-segmento-recusada-no-outro-endereco`, `seletor-reaberto-depois-da-aba-pagina-foca-a-aba`. Blocks-Completion 0 · Data-Loss 0 · Trust-Damage 0 · Medium/High 0.
- **Regressão:** todas as recusas do Outro endereço seguem recusando sem escrita; banner `/botanicas` recusado; montar/reordenar em 390, loja = prévia (390 e 1440), prévia da Home em Celular sem folha, `categories` intacto.
- **Banco:** `store_settings.menu` restaurado (`diff` vazio no `value`; `updated_at` regravado pelo gatilho), `categories` `cmp` idêntico, Storage `home-images` igual, 0 categorias `TESTE-86-QA-`.
- **Verdict:** not ready, por pouco — o Medium e os dois Low do r2 estão provados em navegador e nada regrediu; ficam dois Low da 86 (uma recusa falsa de um endereço alternativo e o foco na reabertura do seletor). Consertar os dois (ou aceitá-los por decisão) e um reteste curto de S1 e S5 fecha o ciclo.
