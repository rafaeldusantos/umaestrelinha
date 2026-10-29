# QA Run Report — 2026-10-29 — backoffice: o menu montado pela dona (86), reteste (rodada 4)

- **Scope:** reteste das correções do QA r3 (S01..S03 de "Correções do QA r3" em `.specs/features/86-menu-montado-pela-dona/tasks.md`): os 3 bugs pelos passos originais em 390 e 1440, a regressão das recusas do "Outro endereço" e uma regressão curta (montar e reordenar em 390 com toque, loja = prévia em 390 e 1440, prévia da Home em Celular, `categories` intacto).
- **Cadence tier:** targeted (reteste)
- **Build:** `d101ca2f` + árvore da 86 com as correções do QA r1, r2 e r3 (sem commit) · **Environment:** só local — loja `vite` :8082 e painel `vite` :8083 (`VITE_SUPABASE_URL=http://127.0.0.1:54441`), Supabase local (API 54441, Postgres 54442). No contexto do Playwright (Chromium 1228), `*.supabase.co` e o GA abortados por host, mais `**/g/collect*`. Admin do `seed.sql`. Nenhum código tocado.
- **Started:** 2026-10-29 · **Status:** closed

## Personas

| Persona | Device / Network / Locale | Blocos |
|---|---|---|
| Adri montando o menu | 390×844 (toque em T5) e 1440×900, wifi local com quedas provocadas, pt-BR | T1, T3, T4, T5 |
| Equipe com teclado/leitor | 390 e 1440, `document.activeElement` | T2 |
| Cliente navegando pelo menu | 390×844 e 1440×900 | T1, T5 |

**Dados e restauração.** Antes da primeira ação, por `psql` na 54442: `store_settings.menu` (o legado `{"links":[{"id":"sobre",…}]}`, `updated_at` 04:20:46.306472), o retrato de `categories` (37 linhas, `id, name, slug, parent_id, sort_order, active, icon, menu_desktop, menu_mobile, menu_banners`, idêntico ao do r3) e a lista de `storage.objects`. Restaurado depois de **cada** bloco (390, 1440, T3 ×2, T5) com o `value` e o `updated_at` exatos (`session_replication_role = replica`): `diff` vazio nos dois, todas as vezes. No fim: `categories` `cmp` idêntico (também no meio, depois de reordenar), `storage.objects` com `diff` vazio (nenhum envio nesta rodada), 0 categorias `TESTE-86`. Evidência em `evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r4/` (gitignored).

## Session Matrix & Results

| # | Bloco | Cenários | Status | Issue |
|---|---|---|---|---|
| T1 | S01 — subcategoria pela forma curta (raiz e submenu, 390 e 1440) | PNL-menu-outro-endereco-invalido; LOJA-menu-depois-de-gravar-390-e-1440 | Pass | BUG-20261029-filha-num-segmento-recusada-no-outro-endereco → verified |
| T2 | S02 — foco na reabertura do seletor (390 e 1440) | PNL-menu-teclado-foco-e-nomes | Pass | BUG-20261029-seletor-reaberto-depois-da-aba-pagina-foca-a-aba → verified |
| T3 | S03 — a incerteza se corrige sozinha, sem laço (390 e 1440) | PNL-menu-falha-de-rede-ao-gravar | Pass | BUG-20261029-incerteza-de-gravacao-com-titulo-nao-salvou → verified |
| T4 | Regressão das recusas do Outro endereço | PNL-menu-outro-endereco-invalido | Pass | |
| T5 | Regressão curta | PNL-menu-montar-do-zero-no-celular; PNL-menu-reordenar-no-celular-sem-arraste; LOJA-menu-depois-de-gravar-390-e-1440; PNL-menu-previa-acompanha | Pass | |

Status legend: `Pending | Pass | Fixed | Skipped | Blocked (needs human verify) | Blocked (human decision)`.

## Session Debriefs

### T1. Forma curta de subcategoria (390 e 1440, resultados iguais)

| Endereço digitado | Resultado | Banco (`target.href`) |
|---|---|---|
| `/COLAR-E-CORRENTES/` (raiz) | fecha, 1 PATCH, "Item adicionado · “Colares” entrou no fim do menu." | `/joias-e-acessorios/colar-e-correntes` |
| `/colar-e-correntes` e `/Joias-E-Acessorios/Colar-E-Correntes` em seguida | "Já está no menu.", 0 PATCH | — |
| `/aneis?ordem=novos#topo` | fecha, 1 PATCH | `/joias-e-acessorios/aneis?ordem=novos#topo` |
| `/Nomes/` (submenu de Joias afetivas) | fecha, 1 PATCH | `/personalizados/nomes` |
| `/nomes` de novo no submenu | "Já está neste submenu.", 0 PATCH | — |
| `/black-friday`, `/profissoes` (raiz e submenu), `/personalizados/profissoes` | "A coleção de “…” está fora do ar (desativada), e a loja não mostra a página dela. Ative a coleção em Categorias, ou escolha outra página.", 0 PATCH | — |
| `/personalizados/colar-e-correntes` (pai errado), `/joias-e-acessorios/colar-e-correntes/extra`, `/inventada-xyz` | "Não há página da loja em …", 0 PATCH | — |

- Loja (pelo próprio menu, 390 folha e 1440 barra): "Colares" → `/joias-e-acessorios/colar-e-correntes`, h1 "Colar e correntes"; "Aneis" → `/joias-e-acessorios/aneis?ordem=novos#topo`, h1 "Anéis"; no acordeão de Joias afetivas, "Nomes sub" → `/personalizados/nomes`, h1 "Nomes". `scrollWidth` = janela. `/colar-e-correntes` direto abre a coleção; `/black-friday` na loja dá "Essa página não existe." — o "fora do ar" do painel é verdadeiro. **Verified.**
- Observação (não bug): o item acrescentado ao **submenu** não mostrou o aviso "Item adicionado" no instante medido (1,8 s), ao contrário da raiz. Gravou (1 PATCH, aparece na árvore). Não investigado além disso; anotado como paper cut a observar.

### T2. Foco na reabertura do seletor (390 e 1440)

- Três saídas — Esc depois de passar à aba "Página da loja", recusa no "Outro endereço" + Esc, e Esc na própria aba Categoria —, depois "Adicionar item" de novo: `{"primeiraVez":"busca-categoria","reaberto":"busca-categoria","aba":"aba-categoria","recusaVisivel":false}` nos três, nas duas larguras. Digitar "botan" sem clicar filtra para "Coleção Botânicas". Submenu reaberto depois da aba Página: foco na busca. **Verified.**

### T3. Incerteza que se corrige sozinha, sem laço (390 e 1440)

Rota no Playwright: PATCH com `route.fetch()` + `abort` (o banco grava, a resposta se perde) e GETs abortados até a rede "voltar".

| Medida | 390 | 1440 |
|---|---|---|
| Menu estável (sem incerteza): requisições a `store_settings` em 30 s | 0 | 0 |
| Aviso "Não deu para confirmar" (neutro) depois do toque | 7,2 s | 7,3 s |
| Tela × banco com o aviso | `true` × `false` | `true` × `false` |
| Tempo sem rede | 20 s (10 GETs) | 75 s (23 GETs: rajadas de 1+3 nas esperas 0·1·2·4·8 s, depois a cada ~15 s) |
| Rede de volta → tela = banco, sem toque | 3,9 s, `Salvo`, sem conflito, 0 PATCH novo | 11,9 s, `Salvo`, sem conflito, 0 PATCH novo |
| Depois de resolver: requisições a `store_settings` em 60 s | **0** | **0** |
| Caso "não gravou" (PATCH abortado antes do banco) | tela no de antes, sem `Salvo`, sem conflito; 1 GET ao voltar a rede e mais nada em 60 s | idem |
| Ação seguinte com rede | 1 PATCH, sem conflito | idem |
| Recarregar | tela = banco | idem |

- As releituras param ao resolver; enquanto a rede está fora, seguem a cada ~15 s (cada uma com as 3 retentativas do supabase-js) — limitado, não é laço. **Verified.**
- O aviso só aparece ~7 s depois do toque (retentativas do supabase-js, anterior à 86, já anotado nas correções).

### T4. Regressão das recusas (390 e 1440, zero PATCH em todas)

`https://google.com`, `//evil.com` → "O menu leva só a páginas da loja…"; `javascript:alert(1)` (raiz e submenu), `/nao-existe` (raiz e submenu) → "Não há página da loja em …"; vazio → "Digite o endereço da página da loja."; `/produtos/inexistente-xyz` e `/produtos/colar-com-letra-coracao` (inativa) → "Não há peça à venda em …"; `/sobre` → "Já está no menu."; repetidos acima. Nenhuma regressão.

### T5. Regressão curta

- 390 com toque: "Adicionar item" → "fragm" → "Coleção Fragmentos" → Adicionar: "Item adicionado · “Coleção Fragmentos” entrou no fim do menu.". Dois "Mover para cima": **1 PATCH cada**, foco de volta ao ⋯, banco na ordem nova, body 390.
- Prévia Celular (390): `Joias afetivas | Colar e correntes | Coleção Fragmentos | Personalizados | Sobre` + Conta/Favoritos/Pedidos = folha da loja em 390. Prévia Computador (1440): `JOIAS AFETIVAS | COLEÇÃO AMULETOS | COLAR E CORRENTES | COLEÇÃO FRAGMENTOS | PERSONALIZADOS | SOBRE` = barra da loja em 1440 (`scrollWidth` 1440; Coleção Amuletos está desligada no celular dos dois lados).
- `/admin/home` em Celular: iframe `?preview=1`, `innerWidth` 390, **0** diálogos.
- `categories`: `cmp` idêntico no meio e no fim.

## Paper Cuts

| Persona | Onde | Sentiu | Afiado | Destino |
|---|---|---|---|---|
| Adri | Adicionar ao submenu pelo Outro endereço | sem o aviso "Item adicionado" que a raiz mostra (medido a 1,8 s; o item aparece na árvore) | dull | watching |
| Adri | Incerteza de gravação | o aviso leva ~7 s para aparecer (retentativas do supabase-js, anterior à 86) e, com a rede de volta, a correção pode levar até ~15 s | dull | watching |
| Adri | Recusa de `javascript:` | "Não há página da loja" em vez da frase de "só páginas da loja" (do r3) | dull | watching |

## Runtime Errors Observed

- Só os abortos provocados em T3 e as imagens do Storage hospedado de `home_sections`, bloqueadas por `*.supabase.co`. Nenhum `pageerror`.

## Human Verifications Needed

- [ ] Continuam as do r1–r3: Android/iOS real (toque duplo no ⋯, folha do seletor com o teclado virtual), escala de texto do sistema, TalkBack real, `/SOBRE`/`/sobre/` servidos pela função `api/page`.

## Decisions for a Human

- Nenhuma nova da 86. Seguem abertos, anteriores à 86 e fora do escopo: BUG-20261028-voltar-depois-da-folha-perde-a-rolagem, BUG-20261028-dialogos-animam-com-movimento-reduzido, BUG-20261026-fechar-do-modal-em-ingles, BUG-20261027-rodape-da-loja-rola-de-lado-com-fonte-200 (cabeçalho da loja a 200 %).

## Learnings

- Para provar "sem laço", contar as requisições em três janelas: menu estável (a base), sem rede (a cadência das releituras) e depois de resolver — só a terceira sozinha não distingue "parou" de "nunca começou".
- Separar "gravou e a resposta se perdeu" de "não chegou ao banco" (abortar o PATCH antes do `fetch`): são dois desfechos que a mesma tela de incerteza resolve de jeitos opostos.

## Final Status

- **Exit gate (suíte automatizada):** um workspace por vez, exit fora de pipe, `--testTimeout=20000` sem o `--` — backoffice `Test Files 243 passed (243) · Tests 4462 passed (4462)`, exit 0; core `Test Files 190 passed (190) · Tests 4909 passed (4909)`, exit 0; store `Test Files 333 passed (333) · Tests 6218 passed (6218)`, exit 0. Batem com o gate das correções do QA r3.
- **Bugs retestados:** 3 — `filha-num-segmento-recusada-no-outro-endereco`, `seletor-reaberto-depois-da-aba-pagina-foca-a-aba`, `incerteza-de-gravacao-com-titulo-nao-salvou` (inclusive o resíduo): os três **verified**, nenhum reopened.
- **Bugs novos:** 0. Blocks-Completion 0 · Data-Loss 0 · Trust-Damage 0 · Friction 0 (três paper cuts dull em observação).
- **Regressão:** recusas do Outro endereço intactas; montar/reordenar em 390, loja = prévia (390 e 1440), prévia da Home em Celular sem folha, `categories` intacto.
- **Banco:** `store_settings.menu` restaurado (`value` e `updated_at`, `diff` vazio), `categories` `cmp` idêntico, `storage.objects` igual, 0 categorias de teste.
- **Verdict:** **ready** (para a 86, no ambiente local) — desconsiderando os bugs anteriores à 86 registrados fora do escopo e as verificações humanas em aparelho real.
