# QA Run Report — 2026-10-28 — backoffice: o menu montado pela dona (86)

- **Scope:** feature `86` na árvore principal (sem commit, sobre `d101ca2f`): `/admin/menu` montado item por item, o documento `version: 2` em `store_settings.menu`, e a loja (barra, mega menu, folha do celular) lendo dele. Ciclo planejado no `README.md` (9 charters + canário).
- **Cadence tier:** targeted
- **Build:** `d101ca2f` + árvore da 86 · **Environment:** só local — loja `vite` em http://localhost:8082, painel `vite` em http://localhost:8083 (os dois com `VITE_SUPABASE_URL=http://127.0.0.1:54441`, conferido no `.env`), Supabase local; no contexto do Playwright, `*.supabase.co` e o GA abortados **por host** (mais `**/g/collect*`). Admin do `seed.sql`.
- **Started:** 2026-10-28 · **Status:** closed

## Personas

| Persona | Base | Device / Network / Locale | Sessions |
|---|---|---|---|
| Adri montando o menu | Power User (pouco técnica) | 390×844 (e 360/412/1024/1440), wifi local (a "4g" foi simulada só no charter 3), pt-BR, fonte 100/130/200 % por `html { font-size }` | 1–4, 6–8, canário |
| Cliente navegando pelo menu | Contexto memorial, celular | 390×844 e 1440×900, pt-BR | 5, 8 |
| Equipe com TalkBack | Accessibility | 1440×900 só teclado + árvore de acessibilidade | 9 |

## Flows in Scope

- `J-montar-o-menu-da-loja` — `../journeys/J-montar-o-menu-da-loja.md` (22 cenários `PNL-menu-*`)
- `J-navegar-pelo-menu-da-loja` — `../journeys/J-navegar-pelo-menu-da-loja.md` (5 cenários `LOJA-menu-*`)
- Canário: `/admin/home` (a prévia abre e acompanha) e a folha do celular da loja fora da prévia.

**Dados e restauração.** Antes da primeira ação: `store_settings.menu` (o legado `{"links":[{"id":"sobre",…}]}`, sem `version`) e o retrato de `categories` (`id, name, slug, parent_id, sort_order, active, icon, menu_desktop, menu_mobile, menu_banners`, 37 linhas) guardados por `psql` na 54442, mais a lista de `storage.objects` de `home-images` (3). Fixturas: um banner legado em `categories.menu_banners` de "Personalizados" (charter 2), o documento v2 vazio (charter 1), o de 20 itens (charter 5), um link externo legado (charter 6), e 29 categorias `TESTE-86-QA-` (um pai com 26 filhas, uma inativa, uma apagada). **No fim:** menu restaurado (`diff` vazio), `categories` byte a byte igual (`cmp` idêntico), as 29 categorias de teste apagadas, os 5 objetos `home-images/menu/*.webp` que a sessão enviou apagados pela API do Storage local (lista igual à de antes). O `updated_at` da linha `menu` é o da restauração. Duas seções da Home foram desligadas e religadas no canário (estado final igual; `updated_at` delas mudou). A categoria "apagada" foi apagada por SQL: `/admin/categorias` não oferece apagar (desvio declarado). Evidência em `evidence/2026-10-28-backoffice-menu-montado-pela-dona/` (gitignored; o relatório é o registro durável).

**Ordem real.** O charter 2 (primeiro acesso, menu legado) rodou **antes** do 1, porque precisava do banco no estado legado e o 1 parte do v2 vazio; o resto seguiu a tabela do `README.md`.

## Session Matrix & Results

| # | Charter | Journey / Scenario | Persona | Tour | Status | Issue |
|---|---|---|---|---|---|---|
| 1 | CH-menu-montar-do-zero-no-celular | J-montar-o-menu-da-loja | Adri montando o menu | Money | Pass | BUG-20261028-foco-cai-no-body-ao-fechar-dialogos-do-menu (ver #9) |
| 2 | CH-menu-primeiro-acesso-loja-igual | PNL-menu-primeiro-acesso-sem-v2; LOJA-menu-igual-antes-de-gravar; PNL-menu-reordenar-nao-mexe-no-catalogo | Adri montando o menu | Feature | Pass | |
| 3 | CH-menu-gravacao-com-rede-ruim | PNL-menu-falha-de-rede-ao-gravar | Adri montando o menu | Network | Blocked (human decision) | BUG-20261028-resposta-perdida-tela-diz-que-nao-salvou; BUG-20261028-erro-de-leitura-do-menu-mostra-typeerror |
| 4 | CH-menu-duas-janelas-e-toque-duplo | PNL-menu-conflito-entre-janelas | Adri montando o menu | Multi-Tab | Blocked (human decision) | BUG-20261028-toque-duplo-em-mover-anda-duas-posicoes |
| 5 | CH-menu-loja-depois-de-gravar | LOJA-menu-depois-de-gravar-390-e-1440; LOJA-menu-sem-categoria-sumida; LOJA-menu-barra-longa-rola; PNL-menu-desligar-celular | Cliente navegando pelo menu | Back-Button | Pass | BUG-20261028-voltar-depois-da-folha-perde-a-rolagem (anterior) |
| 6 | CH-menu-limites-e-enderecos-invalidos | PNL-menu-outro-endereco-invalido; PNL-menu-submenu-teto-de-24; PNL-menu-categoria-repetida; PNL-menu-categoria-inativa-ou-apagada; PNL-menu-link-externo-legado | Adri montando o menu | Garbage | Blocked (human decision) | BUG-20261028-outro-endereco-aceita-pagina-que-nao-existe |
| 7 | CH-menu-editar-nome-icone-banners | PNL-menu-renomear-e-voltar-ao-padrao; PNL-menu-icone-do-item; PNL-menu-banners-do-item | Adri montando o menu | Interrupt | Blocked (human decision) | BUG-20261028-banner-em-edicao-some-ao-trocar-de-aba-ou-esc |
| 8 | CH-menu-celular-fonte-grande-e-movimento | PNL-menu-fonte-grande-e-telas; PNL-menu-movimento-reduzido; LOJA-menu-teclado-e-fonte-grande | Adri / Cliente | Feature | Blocked (human decision) | BUG-20261028-controles-do-menu-saem-da-tela-com-fonte-grande; BUG-20261028-dialogos-animam-com-movimento-reduzido (anterior); BUG-20261027-rodape-da-loja-rola-de-lado-com-fonte-200 (re-found) |
| 9 | CH-menu-teclado-e-leitor | PNL-menu-teclado-foco-e-nomes; LOJA-menu-teclado-e-fonte-grande | Equipe com TalkBack | Feature | Blocked (human decision) | BUG-20261028-foco-cai-no-body-ao-fechar-dialogos-do-menu; BUG-20261026-fechar-do-modal-em-ingles (re-found) |
| canário | /admin/home + folha da loja | PNL-menu-previa-acompanha (adjacente) | — | — | Blocked (human decision) | BUG-20261028-previa-da-home-no-celular-abre-o-menu; BUG-20261028-ver-na-loja-da-home-abre-o-painel (anterior) |

Status legend: `Pending | Pass | Fixed | Skipped | Blocked (needs human verify) | Blocked (human decision)`. Nenhum conserto aplicado (pedido do ciclo: só QA, sem tocar em `apps/` nem `packages/`); o que falhou está em *Decisions for a Human*.

## Session Debriefs

### 2. CH-menu-primeiro-acesso-loja-igual — Adri montando o menu (1440), rodado primeiro

- **Ran:** banco no legado (sem `version`), 1440 e 390.
- **Findings:**
  - Painel abre com 5 itens, "5 no computador · 4 no celular", "Coleção Amuletos" com Celular desligado — igual à lista (a) da `prova-navegador.md`.
  - Loja 1440: `JOIAS AFETIVAS | COLEÇÃO AMULETOS | COLAR E CORRENTES | PERSONALIZADOS | SOBRE`, `scrollWidth` 1440. Folha 390: `Joias afetivas | Colar e correntes | Personalizados | Sobre`, 390.
  - Abrir `/admin/menu` em duas abas, recarregar e sair: `value` com `diff` vazio e `updated_at` igual (02:03:19) — nada gravado sem a dona agir (MNM-40).
  - Fixtura de banner legado em "Personalizados" (computador e celular): o mega menu da loja mostra o banner (`86-qa-01-legado-banner-1440.png`); o editor do item mostra "Banners do painel · 1 no computador · 1 no celular".
  - Primeira ação (chave Celular de "Sobre"): "Salvando…" → "Salvo"; o banco passa a `version: 2`, com os 5 itens, os `links` legados preservados e os dois banners de "Personalizados" no nó (MNM-34).
  - Arraste **real** (`dragTo`) de "Sobre" para o topo: lista e loja mudam; retrato de `categories` com `cmp` idêntico (MNM-18).
- **Scenarios settled:** PNL-menu-primeiro-acesso-sem-v2 → pass; LOJA-menu-igual-antes-de-gravar → pass; PNL-menu-reordenar-nao-mexe-no-catalogo → pass.

### 1. CH-menu-montar-do-zero-no-celular — Adri montando o menu (390)

- **Ran:** documento v2 vazio, 390×844.
- **Findings:**
  - Vazio: "O menu está vazio · Acrescente as categorias e as páginas… · Adicionar item ao menu", sem lista de categorias, `scrollWidth` 390 (`86-qa-02-vazio-390.png`).
  - Seletor como folha de largura cheia (0, 84, 390 × 760); abas "Categoria" / "Página da loja" (44 px); cada categoria mostra o caminho; "Joias afetivas · 11 subcategorias entram no submenu"; "Black Friday · Inativa".
  - Montagem: Joias afetivas (11 filhas), Coleção Amuletos, Colar e correntes, Pets (subcategoria) e a página Perguntas frequentes (nome sugerido, 20/40). Toast "“Perguntas frequentes” entrou no fim do menu." e "Salvando…" → "Salvo" a cada uma. Duplo toque em "Adicionar" cria **um** item.
  - Reordenar só pelo ⋯: "Mover para cima" desabilitado no topo; 3 × "Mover para cima" levam Perguntas frequentes à 2ª posição; o foco volta ao ⋯.
  - Submenu 11/24, "Tirar “Decorativos”" e "Tirar “Correntes e Pingentes”" (44 × 44) → 9/24; foco cai no BODY depois de cada um.
  - Remover "Coleção Amuletos": "Remover “Coleção Amuletos” do menu? · A categoria continua existindo na loja…", foco inicial em Cancelar; duplo toque em confirmar remove **só** ele; depois disso, "Coleção Amuletos" volta a ser escolhível no seletor (conferido à parte, MNM-21).
  - Prévia: alternar "Itens do menu | Prévia" e mexer numa chave não recarrega o iframe (marca em `window` preservada). Em Celular a folha aparece sem "Pets" (Celular desligado) e com o acordeão de Joias (`86-qa-04-previa-celular-390.png`).
  - Recarregar: mesma lista; banco `version: 2`, 4 itens na ordem, 9 filhos em Joias.
  - ~28 toques no total; nada travou o caminho de 5 itens em menos de 5 minutos.
- **Bugs filed/updated:** BUG-20261028-foco-cai-no-body-ao-fechar-dialogos-do-menu (detalhado em #9).
- **Scenarios settled:** PNL-menu-montar-do-zero-no-celular → pass; PNL-menu-adicionar-categoria-com-filhas → pass; PNL-menu-adicionar-pagina-da-loja → pass; PNL-menu-remover-com-confirmacao → pass; PNL-menu-previa-acompanha → pass.
- **Paper cuts:** em 390 a Prévia abre em **Computador a 25 %** (ilegível; ela precisa achar "Celular"); o quadradinho "sem" no lugar do ícone se lê como palavra solta; não há "Mover para o topo" (3 posições = 6 toques).

### 3. CH-menu-gravacao-com-rede-ruim — Adri montando o menu (390)

- **Ran:** `**/rest/v1/store_settings*` interceptado. A escrita é `PATCH …?key=eq.menu&updated_at=eq.<ts>` (concorrência otimista).
- **Findings:**
  - PATCH em 500 na chave, no Mover e no Adicionar; abortado no Remover e no editor: sempre "Não salvou. O menu voltou ao que estava gravado.", estado revertido, nunca "Salvo" (MNM-38). No editor (nome próprio) a folha fica aberta com o que foi digitado; "Salvar" de novo com rede → "Salvo".
  - **Resposta perdida** (`route.fetch()` + `setOffline(true)`): o banco gravou `mobile:false` e a tela disse "Não salvou. O menu voltou ao que estava gravado." com a chave ligada; a próxima ação na mesma aba levou "O menu mudou em outra janela — recarregue." (`86-qa-05-…`). Recarregar mostra a verdade.
  - Leitura em 500: faixa "Não foi possível carregar o menu" + "Tentar de novo", nunca o vazio. Sem rede: esqueleto ~7 s, depois a faixa com o detalhe **"TypeError: Failed to fetch"** (`86-qa-06-…`, `86-qa-07-…`). "Tentar de novo" com rede devolve o menu.
  - PATCH atrasado 3 s: "Salvando…" visível; os controles não desabilitam, mas três toques em duas chaves viraram três PATCH em fila, banco consistente, nenhum conflito falso.
- **Bugs filed/updated:** BUG-20261028-resposta-perdida-tela-diz-que-nao-salvou; BUG-20261028-erro-de-leitura-do-menu-mostra-typeerror.
- **Scenarios settled:** PNL-menu-falha-de-rede-ao-gravar → fail.
- **Paper cuts:** se "Adicionar" falha, o seletor já fechou e a escolha se perde (ela refaz a busca).

### 4. CH-menu-duas-janelas-e-toque-duplo — Adri montando o menu (1440)

- **Ran:** duas abas no mesmo contexto.
- **Findings:**
  - A adiciona "Nomes"; B (sem recarregar) move "Pets queridos": B recebe "O menu mudou em outra janela — recarregue." (`86-qa-08-…`); o banco tem só a mudança de A (MNM-37). Nova ação em B mostra a mesma faixa e não grava. "Recarregar" na faixa traz "Nomes"; refazer o mover → "Salvo".
  - Cinco toques rápidos (80 ms) em chaves na mesma aba: nenhum conflito, o banco tem os cinco.
  - **Duplo toque em ⋯ → "Mover para baixo/cima" anda duas posições** (1440 e 390, três vezes).
- **Bugs filed/updated:** BUG-20261028-toque-duplo-em-mover-anda-duas-posicoes.
- **Scenarios settled:** PNL-menu-conflito-entre-janelas → pass; PNL-menu-reordenar-no-celular-sem-arraste → fail.

### 5. CH-menu-loja-depois-de-gravar — Cliente navegando pelo menu (390 e 1440)

- **Ran:** documento [Perguntas frequentes, Pets queridos (Celular off), Nomes (PC off), Joias afetivas (9; Linha Pet PC off, Linha Masculina Celular off), Colar e correntes (off nos dois)].
- **Findings:**
  - Painel: "Colar e correntes · Fora do menu", esmaecido (`86-qa-09-…`); "3 no computador · 3 no celular".
  - Prévia Computador = loja 1440: `PERGUNTAS FREQUENTES | PETS QUERIDOS | JOIAS AFETIVAS`, painel de Joias sem Linha Pet. Os 11 links do cabeçalho visitados: todos com o `h1` certo, nenhum 404.
  - Folha 390: `Nomes | Perguntas frequentes | Joias afetivas`; acordeão de Joias sem Linha Masculina e com Linha Pet (MNM-28/29/30).
  - Voltar depois de tocar um filho: a folha não reabre, o painel do computador também não; no computador a rolagem volta (1200). **No celular, voltar depois de navegar pela folha leva a y = 0** (controle: link de peça restaura 1547).
  - 20 itens (fixtura): em 1024 e 1440 a barra ganha "Ver mais departamentos" e, depois do clique, as duas setas; body sem rolagem lateral (`86-qa-10-…`). O painel aceita os 20 ("20 no computador · 20 no celular").
- **Bugs filed/updated:** BUG-20261028-voltar-depois-da-folha-perde-a-rolagem (anterior à 86).
- **Scenarios settled:** LOJA-menu-depois-de-gravar-390-e-1440 → pass; LOJA-menu-barra-longa-rola → pass; PNL-menu-desligar-celular → pass; LOJA-menu-sem-categoria-sumida → pass (medido no #6).

### 6. CH-menu-limites-e-enderecos-invalidos — Adri montando o menu (390)

- **Findings:**
  - Outro endereço — recusados com motivo: `https://google.com` e `//evil.com` ("O menu leva só a páginas da loja. Digite o caminho da página, começando com “/” — por exemplo, “/sobre”.", `86-qa-11-…`), `javascript:alert(1)` (cita "/javascript:alert(1)" e lista 19 endereços), vazio e só espaços ("Digite o endereço da página da loja."), `/categoria-que-nao-existe`.
  - **Aceitos e gravados:** `/produtos/inexistente` (a loja leva a "Essa página não existe."), `/sobre/`, `/SOBRE` e `/perguntas-frequentes` pela segunda vez (sem "Já está no menu"); `/sobre ` virou `/sobre`; `/conta` aceito.
  - Teto: "TESTE-86-QA- Pai grande" (26 filhas) → "24 das 26 subcategorias entram no submenu", item com 24, "24/24", "Adicionar ao submenu" desabilitado com "O submenu tem o máximo de 24 itens."; tirar uma → 23/24; recolocar → 24/24.
  - Repetida: na raiz "Já está no menu" (desabilitada); no mesmo submenu "Já está neste submenu"; Linha Pet aceita em dois submenus (MNM-10/25).
  - Inativa (desligada em `/admin/categorias`): "Categoria inativa — não aparece na loja"; apagada: "Categoria apagada", sem chaves, ⋯ só com "Remover do menu" (`86-qa-12-…`). A loja não mostra nenhuma das duas (MNM-35/36).
  - Externo legado (fixtura): editar o nome, mover e remover → "Salvo"; loja com `target=_blank rel=noopener noreferrer` (MNM-31). Remover item com submenu: "Os 24 itens do submenu saem junto." (MNM-20).
- **Bugs filed/updated:** BUG-20261028-outro-endereco-aceita-pagina-que-nao-existe.
- **Scenarios settled:** PNL-menu-outro-endereco-invalido → fail; PNL-menu-submenu-teto-de-24, PNL-menu-categoria-repetida, PNL-menu-categoria-inativa-ou-apagada, PNL-menu-link-externo-legado, LOJA-menu-sem-categoria-sumida → pass.
- **Paper cuts:** com a recusa visível no rodapé do seletor, o campo digitado fica fora da vista; a confirmação de remover o link do Instagram diz "A página continua existindo **na loja**"; em `/admin/categorias` o interruptor ainda diz "aparece no menu e na busca da loja" (depois da 86 o menu é montado à parte).

### 7. CH-menu-editar-nome-icone-banners — Adri montando o menu (1440)

- **Findings:**
  - Nome próprio: 41 → "41/40" e "O nome do item pode ter até 40 caracteres, e este tem 41."; vazio e só espaços → "Digite o nome do item, ou use o nome da categoria." (`role=alert`, sem `aria-describedby`; `86-qa-13-…`); 40 grava ("· nome próprio").
  - Padrão ligado + renomear a categoria em `/admin/categorias` → a loja mostra o nome novo; nome próprio + renomear de novo → a loja mantém o próprio (MNM-15).
  - Ícone: busca "gravacao" acha Gravação; com ícone a entrada da loja tem 2 `svg` (ícone + seta), "Sem ícone" volta a 1, "Estrela" volta a 2 (MNM-17).
  - Banners: o banner novo nasce apontando para "Joias e acessórios › Pingentes afetivos". Com título e arte enviada **sem salvar**: trocar Computador → Celular → Computador apaga o banner ("0 de 2"), e Esc fecha o editor inteiro — os dois sem aviso, com a arte órfã no Storage (`86-qa-14a/b-…`). Com "Salvar banners" → "Salvo", "1 no computador · 0 no celular", e o mega menu da loja mostra o banner com a arte do Storage local (`86-qa-15-…`).
- **Bugs filed/updated:** BUG-20261028-banner-em-edicao-some-ao-trocar-de-aba-ou-esc.
- **Scenarios settled:** PNL-menu-renomear-e-voltar-ao-padrao → pass; PNL-menu-icone-do-item → pass; PNL-menu-banners-do-item → fail.

### 8. CH-menu-celular-fonte-grande-e-movimento — Adri / Cliente

- **Findings:**
  - 100 % em 360/390/1024/1440: `scrollWidth` = viewport, nenhum nome truncado (menor 47 px), controles da lista ≥ 44. Abaixo de 44 só a barra do palco da prévia (Tela cheia 102 × 36, Recarregar e Abrir a loja 36 × 36; da `47`, já anotada).
  - 130 % (360/390/412, submenu aberto): `scrollWidth` 456, "Tirar “…” do submenu" fora da tela. 200 % em 390: 701; ⋯ das linhas em x 485; nomes em reticências; título "Menu …" (`86-qa-16/17-…`). 1024/200 %: 1202 (barra do palco).
  - Seletor 390/200 %: "Adicionar" visível (88 px), lista espremida a ~40 px (`86-qa-18-…`). Editor 390/200 %: rola de lado por dentro (434/388), "Salvar" só rolando (`86-qa-19-…`).
  - Movimento reduzido: as linhas e o submenu da 86 só têm transição de cor; o `Dialog` do painel (`enter 0.15s` + `all 0.2s`) e a folha da loja (`enter 0.5s`) animam igual.
  - Loja 390/200 %: body 434 pelo "Abrir menu" do cabeçalho; folha aberta 494 por "Pedidos"; subitens da folha não crescem (`86-qa-20-…`).
- **Bugs filed/updated:** BUG-20261028-controles-do-menu-saem-da-tela-com-fonte-grande; BUG-20261028-dialogos-animam-com-movimento-reduzido (anterior); BUG-20261027-rodape-da-loja-rola-de-lado-com-fonte-200 (Re-found).
- **Scenarios settled:** PNL-menu-fonte-grande-e-telas → fail; PNL-menu-movimento-reduzido → fail (só pelos primitivos anteriores); LOJA-menu-teclado-e-fonte-grande → fail (a fonte; o teclado passa, #9).

### 9. CH-menu-teclado-e-leitor — Equipe com TalkBack (1440)

- **Findings:**
  - Nomes: chaves "Mostrar “Nomes” no celular" com `aria-pressed`; ⋯ "Ações de “…”"; submenu "Mover “…” para cima/baixo", "Editar “…”", "Tirar “…” do submenu", "Abrir/Fechar o submenu de “…”"; abas do seletor `role=tab`. "Salvo" em `role=status`; erros do editor em `role=alert`.
  - Pelo teclado: ⋯ abre com Enter, setas e End navegam, "Mover" devolve o foco ao ⋯; Espaço alterna a chave.
  - **Foco no BODY** ao fechar com Esc o seletor, o editor e a confirmação; também depois de confirmar a remoção e de "Tirar" (#1).
  - O seletor abre com o foco na aba "Categoria" (não na busca); cada categoria é uma parada de Tab (66) antes de "Adicionar".
  - X dos diálogos: "Close", 16 × 16.
  - Loja 1440: Tab no item abre o mega menu (`aria-expanded=true`), Tab percorre "ver tudo", os 24 filhos e o seguinte; Esc fecha e devolve o foco ao item.
- **Bugs filed/updated:** BUG-20261028-foco-cai-no-body-ao-fechar-dialogos-do-menu; BUG-20261026-fechar-do-modal-em-ingles (Re-found).
- **Scenarios settled:** PNL-menu-teclado-foco-e-nomes → fail.

### Canário — `/admin/home` e a folha da loja

- `/admin/home` abre a prévia em **Celular** com a **folha do menu aberta** sobre a Home (`86-qa-21-…`); em Computador, sem folha. Fechar pelo X dentro do quadro resolve até a próxima carga. A prévia acompanha a edição sem recarregar (marca em `window` preservada ao desligar e religar uma seção). "Ver na loja" é `href="/"` (abre o painel).
- Loja fora da prévia (390): nenhuma folha ao abrir; abre no hambúrguer, fecha com Esc; a 1024 continua fechada.
- **Bugs filed/updated:** BUG-20261028-previa-da-home-no-celular-abre-o-menu; BUG-20261028-ver-na-loja-da-home-abre-o-painel (anterior).

## Experiential lens pass

Re-andados em lente o #1 (montar no celular) e o #5 (loja depois de gravar), os de maior superfície.

| Lente | #1 montar (390) | #5 loja (390/1440) |
|---|---|---|
| Clareza | pass — a tela mostra só o menu, com o caminho de cada item | pass |
| Confiança | friction — "Salvo" honesto nas falhas, mas a resposta perdida mente (#3) | pass |
| Esforço | friction — prévia em Computador 25 % no celular; 2 toques por posição | pass |
| Recuperação | friction — o banner em edição some sem aviso (#7) | friction — voltar perde a rolagem (anterior) |
| Acessibilidade | fail — foco no BODY; fonte 130 % já empurra controles para fora | friction — fonte 200 % (anterior) |
| Tom | pass — nenhuma frase festiva; mensagens na primeira pessoa da tela, sem urgência | pass |

## Paper Cuts

| Persona | Where (journey/step) | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Adri | Prévia em 390 | abre em Computador a 25 %, ilegível | sharp | Decisions |
| Adri | linha sem ícone | "sem" parece palavra solta | dull | watching |
| Adri | reordenar | sem "Mover para o topo"; 2 toques por posição | dull | watching |
| Adri | Adicionar com rede ruim | a escolha se perde quando a gravação falha | dull | watching |
| Adri | Outro endereço | recusa no rodapé, campo fora da vista; lista de 19 endereços | dull | watching |
| Adri | remover link externo | "A página continua existindo na loja" para o Instagram | dull | texto |
| Adri | banner novo | nasce apontando para Pingentes afetivos | dull | watching |
| Adri | `/admin/categorias` | "aparece no menu" no interruptor da vitrine | dull | texto |
| Equipe | seletor | foco inicial na aba, não na busca; 66 paradas de Tab | sharp | dentro de BUG-…-foco-cai-no-body |

## Runtime Errors Observed

- Só os `ERR_FAILED` das imagens do Storage **hospedado** que o banco local guarda em `home_sections` (bloqueadas de propósito por `*.supabase.co`) e os erros de rede dos PATCH/GET abortados de propósito. Nenhum erro de aplicação.

## Human Verifications Needed

- [ ] Android/iOS real: reordenar pelo ⋯ com o dedo (e o toque duplo), arraste com o dedo (o HTML5 não funciona em toque; o caminho é "Mover…"), a folha de baixo do seletor com o teclado virtual aberto.
- [ ] Escala de texto **do sistema** (Android 130/200 %): confirmar o que `html { font-size }` mediu na lista e no submenu.
- [ ] TalkBack real: anúncio das chaves (nome + estado), do "Salvo" e da faixa de conflito; o foco depois de fechar o seletor/editor.
- [ ] `/SOBRE` e `/sobre/` servidos pela função `api/page` (build da Vercel): 200, 308 ou 404? No dev o SPA abre os dois.

## Decisions for a Human

### A prévia da Home no Celular abre com o menu por cima (BUG-20261028-previa-da-home-no-celular-abre-o-menu) — High, da 86
- Options: 1. abrir a folha só na prévia do **menu** (um parâmetro na URL da prévia que só `/admin/menu` passa); 2. não abrir sozinha em lugar nenhum e mostrar a folha na prévia do menu só quando um item for tocado.
- Recommendation: 1 — mantém o que a 86 provou no menu e devolve a Home.

### Resposta perdida (BUG-20261028-resposta-perdida-tela-diz-que-nao-salvou)
- Options: 1. erro de rede (sem status) diz "Não deu para confirmar se salvou — recarregue" e relê o documento; 2. depois de um erro de rede, reler antes da próxima ação para não acusar "outra janela".
- Recommendation: 1 + 2 (as duas são pequenas e só no caminho de erro de rede).

### Toque duplo no Mover (BUG-20261028-toque-duplo-em-mover-anda-duas-posicoes)
- Options: 1. ignorar o segundo "Mover" enquanto a gravação do primeiro está no ar; 2. fechar o menu ⋯ antes de aplicar.
- Recommendation: 1.

### Outro endereço aceita página que não existe (BUG-20261028-outro-endereco-aceita-pagina-que-nao-existe)
- Options: 1. recusar `/produtos/<slug>` e `/categoria/...` digitados ("escolha pelo nome") e normalizar barra final e maiúsculas; 2. conferir o slug no banco antes de gravar.
- Recommendation: 1 (a mensagem já manda escolher pelo nome; fica coerente).

### Banner some sem aviso (BUG-20261028-banner-em-edicao-some-ao-trocar-de-aba-ou-esc)
- Options: 1. guardar o rascunho dos dois dispositivos enquanto o editor está aberto; 2. perguntar "Descartar o banner?" ao trocar de dispositivo ou fechar com alterações.
- Recommendation: 1 para a troca de aba, 2 para o Esc.

### Fonte grande (BUG-20261028-controles-do-menu-saem-da-tela-com-fonte-grande)
- Options: 1. linha do submenu em duas linhas (nome em cima, controles embaixo) como a principal em 390; 2. controles do submenu dentro de um ⋯ como na principal.
- Recommendation: 2 (menos controles por linha resolve 130 % e 200 %).

### Foco no BODY (BUG-20261028-foco-cai-no-body-ao-fechar-dialogos-do-menu)
- Options: 1. devolver o foco ao gatilho guardado ("Adicionar item" / ⋯), e ao vizinho quando o item saiu; 2. foco no título da lista.
- Recommendation: 1; junto, abrir o seletor com o foco na busca.

### Anteriores (tarefa própria, fora da 86): BUG-20261028-voltar-depois-da-folha-perde-a-rolagem, BUG-20261028-ver-na-loja-da-home-abre-o-painel (uma linha, o mesmo conserto do menu), BUG-20261028-dialogos-animam-com-movimento-reduzido, BUG-20261028-erro-de-leitura-do-menu-mostra-typeerror (o padrão de mostrar o erro cru), e os re-found BUG-20261026-fechar-do-modal-em-ingles e BUG-20261027-rodape-da-loja-rola-de-lado-com-fonte-200.

## Learnings

- `page.route` com uma promessa-portão nunca liberada prende a requisição para sempre dentro de um `run_code` que falhou: liberar com `page.unrouteAll({ behavior: 'ignoreErrors' })` (os bloqueios do contexto ficam).
- O ícone do item na barra da loja divide o botão com a seta do painel: provar o ícone pela **contagem** de `svg` (2 com ícone, 1 sem), nunca pela presença.
- O `filter({ hasText: 'Próprio' })` casou "· nome próprio" de outra linha: filtrar pelo nome inteiro.
- `/admin/categorias` não apaga categoria; o caso "apagada" precisa de SQL (declarar).

## Final Status

- **Exit gate (full automated suite):** os dois workspaces que a 86 toca, um por vez, exit fora de pipe — `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` → `Test Files 242 passed (242) · Tests 4355 passed (4355)`, exit 0; `pnpm --filter @estrelinha/store test --testTimeout=20000` → `Test Files 333 passed (333) · Tests 6216 passed (6216)`, exit 0. Core, functions e mobile-adm não rodados (não tocados pela sessão). Suíte verde com 8 cenários reprovados em navegador: os defeitos acima são de layout, foco, rede e prévia, que o jsdom não mede.
- **Issues by user impact:** Blocks-Completion 0 · Data-Loss 0 · Trust-Damage 3 (da 86: prévia da Home com o menu por cima [High], resposta perdida, endereço que leva a 404) · Friction 6 (4 da 86: toque duplo no Mover, banner some, fonte grande, foco no BODY; 2 anteriores: rolagem ao voltar, "Ver na loja" da Home) · Cosmetic 2 (erro "TypeError", movimento reduzido — anteriores no padrão) · Re-found 2 (anteriores).
- **Coverage:** 2 jornadas + canário; 9/9 charters e o canário andados; 27 cenários com veredito (19 pass, 8 fail, 0 blocked-verify — os toques do Android/TalkBack real estão em *Human Verifications*).
- **Verdict:** not ready — o caminho principal da 86 passa de ponta a ponta (montar, gravar, loja igual à prévia, legado preservado, conflito entre janelas, `categories` intocada), mas a mudança da prévia **quebrou a prévia da Home no Celular** (High); consertar esse antes do merge e decidir os quatro Friction/Trust-Damage da própria 86.
