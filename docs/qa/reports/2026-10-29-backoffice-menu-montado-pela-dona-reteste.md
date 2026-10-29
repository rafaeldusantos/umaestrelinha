# QA Run Report — 2026-10-29 — backoffice: o menu montado pela dona (86), reteste (rodada 2)

- **Scope:** reteste das correções do QA r1 (`Q01`..`Q09`, `Q06b`, seção "Correções do QA r1" de `.specs/features/86-menu-montado-pela-dona/tasks.md`), os 8 cenários que reprovaram em `reports/2026-10-28-backoffice-menu-montado-pela-dona.md`, regressão curta do que passou e caça a bugs novos trazidos pelas correções.
- **Cadence tier:** targeted (reteste)
- **Build:** `d101ca2f` + árvore da 86 com as correções do QA r1 (sem commit) · **Environment:** só local — loja `vite` :8082 e painel `vite` :8083 (os dois com `VITE_SUPABASE_URL=http://127.0.0.1:54441`), Supabase local (API 54441, Postgres 54442). No contexto do Playwright, `*.supabase.co` e o GA abortados **por host**, mais `**/g/collect*`. Admin do `seed.sql`.
- **Started:** 2026-10-29 · **Status:** closed

## Personas

| Persona | Device / Network / Locale | Blocos |
|---|---|---|
| Adri montando o menu | 390×844 (e 360/412/1024/1440), wifi local, pt-BR, fonte 130/200 % por `html { font-size }` | R0, R2–R6, R10, R11 |
| Cliente navegando pelo menu | 390×844 e 1440×900 | R1, R11 |
| Equipe com TalkBack | 1440×900, teclado + `document.activeElement` | R7 |

**Dados e restauração.** Antes da primeira ação: `store_settings.menu` (legado `{"links":[{"id":"sobre",…}]}`, sem `version`, `updated_at` 02:52:38), o retrato de `categories` (37 linhas, `id, name, slug, parent_id, sort_order, active, icon, menu_desktop, menu_mobile, menu_banners`) e a lista de `storage.objects` de `home-images` (3), guardados por `psql` na 54442. Nenhuma categoria `TESTE-86-QA-` foi criada nesta rodada (as do r1 já tinham sido apagadas; contagem 0 antes e depois). **No fim:** `value` do menu restaurado (`diff` vazio), `categories` com `cmp` idêntico (também conferido no meio, depois do arraste), os 3 objetos `home-images/menu/*.webp` que a sessão deixou apagados pela API do Storage local (lista igual à de antes; os enviados e descartados já tinham saído pelo próprio painel). O `updated_at` da linha `menu` é o da restauração (03:52:39). Evidência em `evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste/` (gitignored).

**Ordem real.** R0 (menu antigo preservado) primeiro, com o legado no banco; depois R1 (High), R8/R9, R2, R4, R7 (que esvaziou o menu removendo tudo), R11 montando do zero em 390, R3, R5, R6, R10 e a loja.

## Session Matrix & Results

| # | Bloco | Cenários | Status | Issue |
|---|---|---|---|---|
| R0 | Menu antigo preservado antes da primeira ação | PNL-menu-primeiro-acesso-sem-v2; LOJA-menu-igual-antes-de-gravar | Pass | |
| R1 | Q01 — prévia da Home no Celular / prévia do menu | PNL-menu-previa-acompanha (canário) | Pass | BUG-20261028-previa-da-home-no-celular-abre-o-menu → verified |
| R2 | Q02 — resposta perdida | PNL-menu-falha-de-rede-ao-gravar | Pass | BUG-20261028-resposta-perdida-tela-diz-que-nao-salvou → verified; novo BUG-20261029-incerteza-de-gravacao-com-titulo-nao-salvou (Low) |
| R3 | Q03 — outro endereço | PNL-menu-outro-endereco-invalido | Blocked (human decision) | BUG-20261028-outro-endereco-aceita-pagina-que-nao-existe → verified; novo BUG-20261029-caminho-de-colecao-passa-no-seletor-e-e-recusado-ao-gravar (Medium) |
| R4 | Q04 — toque duplo no Mover | PNL-menu-reordenar-no-celular-sem-arraste | Pass | BUG-20261028-toque-duplo-em-mover-anda-duas-posicoes → verified |
| R5 | Q05 — banner em edição | PNL-menu-banners-do-item | Pass | BUG-20261028-banner-em-edicao-some-ao-trocar-de-aba-ou-esc → verified; novo BUG-20261029-foco-cai-no-body-ao-continuar-editando-o-banner (Low) |
| R6 | Q06 / Q06b — fonte grande | PNL-menu-fonte-grande-e-telas | Pass | BUG-20261028-controles-do-menu-saem-da-tela-com-fonte-grande → verified |
| R7 | Q07 — foco ao fechar | PNL-menu-teclado-foco-e-nomes | Blocked (human decision) | BUG-20261028-foco-cai-no-body-ao-fechar-dialogos-do-menu → verified; o cenário segue fail pelo novo BUG-20261029-foco-cai-no-body-ao-continuar-editando-o-banner |
| R8 | Q08 — erro de leitura | (dentro de PNL-menu-falha-de-rede-ao-gravar) | Pass | BUG-20261028-erro-de-leitura-do-menu-mostra-typeerror → verified |
| R9 | Q09 — "Ver na loja" da Home | canário | Pass | BUG-20261028-ver-na-loja-da-home-abre-o-painel → verified |
| R10 | Movimento reduzido e loja a 200 % | PNL-menu-movimento-reduzido; LOJA-menu-teclado-e-fonte-grande | Blocked (human decision) | anteriores e fora do conserto: BUG-20261028-dialogos-animam-com-movimento-reduzido, BUG-20261027-rodape-da-loja-rola-de-lado-com-fonte-200 |
| R11 | Regressão: montar no celular, loja = prévia, reordenar sem mexer no catálogo, canário da folha | PNL-menu-montar-do-zero-no-celular; PNL-menu-adicionar-categoria-com-filhas; PNL-menu-remover-com-confirmacao; PNL-menu-reordenar-nao-mexe-no-catalogo; LOJA-menu-depois-de-gravar-390-e-1440 | Pass | |

Status legend: `Pending | Pass | Fixed | Skipped | Blocked (needs human verify) | Blocked (human decision)`. Nenhum conserto aplicado nesta rodada (pedido: só reteste, sem tocar em `apps/` nem `packages/`).

## Session Debriefs

### R0. Menu antigo preservado — Adri (1440), com o legado no banco

- `/admin/menu` abre com 5 itens ("5 no computador · 4 no celular"), Coleção Amuletos com Celular desligado; recarregar e sair: `value` com `diff` vazio e `updated_at` igual (02:52:38) — nada gravado sem ação.
- Loja 1440: `JOIAS AFETIVAS | COLEÇÃO AMULETOS | COLAR E CORRENTES | PERSONALIZADOS | SOBRE`, `scrollWidth` 1440; folha 390: `Joias afetivas | Colar e correntes | Personalizados | Sobre` + atalhos da conta. Igual ao r1.
- A primeira ação (chave Celular de "Sobre", em R2) converteu para `version: 2` com os 5 itens.

### R1. Q01 — prévia da Home e prévia do menu (1440 e 390)

- `/admin/home` em 1440 e em 390: o iframe (`?preview=1`, `innerWidth` 390) abre **sem** folha (0 diálogos); Computador (1024) 0; de volta a Celular 0; o hambúrguer dentro do quadro abre a folha (1).
- `/admin/menu` em Celular: 1 diálogo com a folha do menu. **Verified.**

### R2/R8. Q02 e Q08 — gravação e leitura com rede ruim (390)

- Resposta perdida com releitura boa: "Salvando…" → "Salvo", chave no valor gravado; a ação seguinte grava sem "O menu mudou em outra janela".
- Resposta perdida e releitura sem rede: aviso "Não deu para confirmar se salvou. Confira a internet; a próxima mudança parte do que estiver gravado." — **com o título "Não salvou"** (o banco tinha gravado). A ação seguinte relê, parte do gravado, diz "Salvo"; recarregar confere com o banco. Novo bug Low.
- PATCH 500: "Não salvou. O menu voltou ao que estava gravado." e a chave volta. Mover com PATCH 500 volta à posição e o Mover seguinte não fica travado.
- Leitura em 500 (corpo com "permission denied") e sem rede: "Não foi possível carregar o menu · Confira a internet e tente de novo. · Tentar de novo"; nenhum texto cru. "Tentar de novo" devolve o menu.

### R3. Q03 — outro endereço (390)

- Recusados com motivo: `https://google.com`, `//evil.com`, `javascript:alert(1)`, vazio, só espaços, `/categoria-que-nao-existe`, `/produtos/inexistente`, `/produtos/<peça inativa>`, `/produtos`, `/perguntas-frequentes/xyz`, `/black-friday` (inativa). Sem a lista de 19 endereços na recusa do seletor.
- `/SOBRE/` gravado normalizado como `/sobre`; depois `/sobre`, `/sobre/`, `/Sobre `, `/Perguntas-Frequentes/` → "Já está no menu."; na lista, Sobre e Perguntas frequentes desabilitados com "Já está no menu".
- Aceitos e gravados: `/produtos/<peça à venda>`, `/conta`, `/perguntas-frequentes`.
- **Bug novo:** `/botanicas` e `/joias-afetivas/joia-afetiva-linha-pet` (coleções ativas) passam no seletor, que fecha — e a gravação recusa com o aviso antigo ("não é um endereço da loja … Endereços aceitos: /, /produtos, … 19"), sem PATCH. A escolha se perde; dois donos da regra (`enderecoDaLoja` × recusa de link em `core/menu`).

### R4. Q04 — toque duplo no Mover

- 390: três duplos cliques em "Mover para cima", uma posição cada. 1440 pelo mouse: uma posição, **um** PATCH; o segundo clique cai sobre a chave da linha vizinha depois que o menu fecha e não a alterna. **Verified.**

### R5. Q05 — banners (1440)

- Banner com título e arte, Computador → Celular → Computador: continua ("1 de 2", título preservado). Esc pergunta "Descartar as alterações do banner?"; "Continuar editando" mantém; "Descartar" fecha e apaga do Storage a arte enviada. "Voltar" com alteração também pergunta.
- Banner no Computador (arte trocada uma vez) + banner no Celular → "Salvar banners": banco com 1 + 1, Storage só com as 3 artes referenciadas (a trocada saiu). Loja: banner no mega menu (1440) e no acordeão de Joias na folha (390).
- **Bug novo:** "Continuar editando" deixa o foco no `<body>`.

### R6. Q06/Q06b — fonte grande

- 360/390/412 × 130/200 %, submenu aberto: `scrollWidth` = janela, nenhum controle fora da tela, nenhum alvo < 44 (o interruptor do editor tem a área estendida por `::before`, 53 × 47). Seletor, editor e banners sem rolagem lateral. Área da lista do seletor: 625 px a 130 %, 361/465 px a 200 %.
- Paper cut: a 200 % o seletor corta caminhos e alguns nomes ("Joias afetivas › Linha Dente de L…", "Coleção Código Mors…"); o nome de cima continua legível na maioria.
- 1024/200 %: 1202 pela barra do palco da prévia (da `47`, fora, já anotada).

### R7. Q07 — foco (1440, teclado)

- Esc no seletor → "Adicionar item"; Esc no editor → ⋯ do item; Esc e Cancelar na confirmação → ⋯; remoção confirmada → ⋯ do seguinte, do anterior quando era o último, e "Adicionar item ao menu" quando o menu ficou vazio; "Tirar" → "Tirar" do seguinte. **Verified.**
- O seletor ainda abre com o foco na aba "Categoria" (paper cut do r1). O cenário segue fail pelo foco no `<body>` do "Continuar editando" (R5).

### R9. Q09 — "Ver na loja" da Home

- `href="http://localhost:8082/"`, `target=_blank`; abre a loja. **Verified.**

### R10. Movimento reduzido e loja a 200 % (anteriores, não consertados)

- Com `reducedMotion: reduce` o `Dialog` do painel anima (`enter 0.15s` / `0.2s`); loja 390/200 % com `scrollWidth` 434. Os dois bugs são anteriores à 86 e ficaram fora do conserto (seção "Ficaram abertos" do `tasks.md`); os cenários seguem fail por eles.

### R11. Regressão

- Montar do zero em 390 (depois de esvaziar em R7): Joias afetivas (11 no submenu), Coleção Amuletos, Colar e correntes, Pets — cada um "entrou no fim do menu" + "Salvo"; duplo clique em "Adicionar" cria **um** item. Seletor como folha de altura cheia (390 × 836).
- Arraste real (`dragTo`) do 8º para o topo: lista, prévia Computador e loja 1440 idênticas (`TESTE /PERGUNTAS-FREQUENTES | JOIAS AFETIVAS | …`, `scrollWidth` 1440); prévia Celular = folha da loja em 390 (`scrollWidth` 390). `categories` com `cmp` idêntico depois do arraste.
- Canário: loja 390 fora da prévia abre sem folha; hambúrguer abre, Esc fecha; a 1024 continua fechada.

## Paper Cuts

| Persona | Onde | Sentiu | Afiado | Destino |
|---|---|---|---|---|
| Adri | Seletor a 200 % | caminhos e alguns nomes em reticências | dull | watching |
| Equipe | Seletor | abre com foco na aba, não na busca (do r1) | sharp | Decisions (r1) |
| Adri | Adicionar com rede ruim | a escolha se perde quando a gravação falha (do r1) | dull | watching |

## Runtime Errors Observed

- Só os erros de rede dos PATCH/GET abortados de propósito e os `ERR_FAILED` das imagens do Storage hospedado guardadas em `home_sections` (bloqueadas por `*.supabase.co`). Nenhum erro de aplicação.

## Human Verifications Needed

- [ ] Continuam as do r1: Android/iOS real (toque duplo no ⋯ com o dedo, folha do seletor com o teclado virtual), escala de texto do sistema, TalkBack real, e `/SOBRE`/`/sobre/` servidos pela função `api/page`.

## Decisions for a Human

### Caminho de coleção ativa em "Outro endereço" (BUG-20261029-caminho-de-colecao-passa-no-seletor-e-e-recusado-ao-gravar) — Medium, da 86
- Options: 1. o seletor recusa ali mesmo caminho de categoria ("escolha a coleção na aba Categoria"), deixando a regra de `core` como única dona; 2. o seletor converte o caminho de uma coleção ativa no item de **categoria** correspondente; 3. `core` passa a aceitar link para caminho de categoria (pior: um link que não acompanha renomear/mover a coleção).
- Recommendation: 2 se for barato (a dona colou o endereço da coleção, o item vira a coleção); senão 1. Nos dois casos, uma regra só para "este endereço é da loja?", e o aviso de gravação sem a lista de 19.

### Título "Não salvou" na incerteza (BUG-20261029-incerteza-de-gravacao-com-titulo-nao-salvou) — Low
- Recommendation: título próprio para o desfecho incerto ("Não deu para confirmar").

### Foco do "Continuar editando" (BUG-20261029-foco-cai-no-body-ao-continuar-editando-o-banner) — Low
- Recommendation: devolver o foco ao controle do editor que estava ativo (ou ao primeiro campo do banner), no padrão do Q07.

### Anteriores, ainda abertos (sem mudança): BUG-20261028-voltar-depois-da-folha-perde-a-rolagem, BUG-20261028-dialogos-animam-com-movimento-reduzido, BUG-20261026-fechar-do-modal-em-ingles, BUG-20261027-rodape-da-loja-rola-de-lado-com-fonte-200.

## Learnings

- Para provar o toque duplo, `locator.dblclick()` num item do Radix depois de re-renderizar a lista deu leitura enganosa (nenhum movimento); `page.mouse.dblclick` nas coordenadas do item, com contagem de PATCH, é a medida confiável.
- Para "a tela diz Salvo?", ler os textos do aviso (sonner) por regex no `body` com polling de 150 ms: o "Salvo" some em ~3 s e uma leitura única perde.
- Um endereço que "fecha o seletor" não é prova de que entrou: conferir o banco e as requisições `rest/v1`.

## Final Status

- **Exit gate (suíte automatizada):** um workspace por vez, exit fora de pipe — `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` → `Test Files 243 passed (243) · Tests 4421 passed (4421)`, exit 0; `pnpm --filter @estrelinha/store test --testTimeout=20000` → `Test Files 333 passed (333) · Tests 6218 passed (6218)`, exit 0. Core não rodado nesta rodada (o `tasks.md` mediu 4893/190 nas correções; a sessão não tocou código).
- **Bugs retestados:** 9 arquivos, 10 correções (Q01..Q09, Q06b) — todos **verified**, nenhum reopened.
- **Bugs novos:** 3, todos da 86 e trazidos pelas correções — Friction/Medium 1 (`caminho-de-colecao-passa-no-seletor-e-e-recusado-ao-gravar`), Trust-Damage/Low 1 (`incerteza-de-gravacao-com-titulo-nao-salvou`), Friction/Low 1 (`foco-cai-no-body-ao-continuar-editando-o-banner`). Blocks-Completion 0 · Data-Loss 0.
- **Cenários:** dos 8 que reprovaram no r1, 5 passam agora (falha-de-rede, reordenar-no-celular, banners, fonte-grande, e o canário da prévia); 1 reprova por bug novo (outro-endereco-invalido); 1 reprova pelo bug novo de foco (teclado-foco-e-nomes); 2 seguem fail por bugs anteriores fora do conserto (movimento-reduzido, LOJA teclado-e-fonte-grande). Regressão (R0, R11): passa.
- **Banco:** `store_settings.menu` restaurado (`diff` vazio), `categories` `cmp` idêntico, Storage `home-images` igual ao de antes, 0 categorias `TESTE-86-QA-`.
- **Verdict:** not ready — o High (prévia da Home) e os outros oito consertos estão provados em navegador, mas a correção do Q03 abriu um caminho em que a dona cola o endereço de uma coleção que existe e o item some sem entrar, com duas regras discordando (Medium, da 86). Consertar esse e os dois Low (título da incerteza, foco do "Continuar editando") e rodar um reteste curto de R3, R2 e R5.
