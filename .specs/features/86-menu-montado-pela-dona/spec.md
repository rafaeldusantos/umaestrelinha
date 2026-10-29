# 86 — O menu montado pela dona: Especificação

## Problem Statement

Hoje, `/admin/menu` mostra **todas** as categorias e subcategorias da árvore, cada uma com uma chave
de liga/desliga por dispositivo, e o menu da loja é **deduzido** dessas chaves: uma categoria ligada
cujo pai também está ligado vira item do painel do pai; qualquer outra vira item da barra
(`menuItems`, feature `39`). A dona não vê o menu que está montando — vê o catálogo inteiro e precisa
adivinhar o que cada chave faz. Três consequências medidas no código:

- **Ligar uma subcategoria pode fazê-la subir para a barra** (quando o pai está desligado), e desligar
  o pai faz todas as filhas ligadas subirem de uma vez.
- **Arrastar para reordenar o menu muda o `sort_order` da árvore**, que também ordena a grade da
  Home, o rodapé e a lista de categorias — reordenar o menu bagunça outras telas.
- **O nome do item é sempre o nome da categoria**, e os links internos não arrastam (a ordem deles
  mora no jsonb, a das categorias na tabela).

A feature troca a dedução por uma **montagem explícita**: a dona monta a lista do menu principal, item
por item, e cada item com o seu submenu, exatamente como aparece na loja.

## Goals

- [ ] A tela de menu mostra **só o que está no menu**, na ordem da loja, com o submenu de cada item
      embaixo dele — nunca a árvore inteira de categorias.
- [ ] Montar um menu de 5 itens com submenu, do zero, em menos de 5 minutos no celular (390px).
- [ ] Reordenar o menu **não muda** a ordem de nenhuma outra tela da loja.
- [ ] O mega menu do computador e a folha do celular continuam desenhando o mesmo que hoje
      (ícone, painel com subcategorias, banners), lendo da nova montagem.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Terceiro nível (item › submenu › sub-submenu) | A loja desenha dois níveis; o catálogo real tem no máximo dois (`AD-018`) |
| Links externos (`https://…`) novos | O pedido é "links internos da loja"; os externos já gravados continuam lidos (ver `MNM-31`) |
| Mudar o desenho do mega menu ou da folha do celular | A feature muda de onde a loja **lê**, não o que ela **desenha** |
| Agendamento ("ligar o item na sexta") | Não pedido |
| Rascunho com botão "Publicar" | O painel inteiro salva na hora com `Salvando…`/`Salvo` (`VIV-04`); ver Assunções |
| Editar a categoria em si (nome, foto, slug) | É `/admin/categorias`; o menu só **referencia** |
| Banners do painel: novo desenho | Mantidos como na `39` (até 2 por dispositivo, arte por dispositivo) — só mudam de dono (o item do menu, não a categoria) |

---

## Assumptions & Open Questions

| Decisão | Escolha | Por quê | Confirmado? |
| --- | --- | --- | --- |
| Computador × celular | **Uma** montagem; cada item (e cada item de submenu) tem as chaves "Computador" e "Celular", as duas ligadas ao nascer | Pedido do usuário: "uma lista, chave por item" | s (2026-10-28) |
| Submenu ao adicionar categoria com filhas | Entram **todas as subcategorias ativas**, na ordem da árvore; a dona tira, reordena e acrescenta depois | Pedido do usuário | s (2026-10-28) |
| Escolha de link interno | Lista de páginas da loja + campo "outro endereço da loja", conferido contra as rotas antes de salvar | Pedido do usuário | s (2026-10-28) |
| Salvar | Cada ação grava na hora, com `Salvando…` → `Salvo` por ~2 s, como hoje | Mesma régua de `/admin/home` e do menu atual (`VIV-04`); um "Publicar" seria um segundo modelo de gravação no painel | s (2026-10-28) |
| Primeiro menu depois do deploy | **Sem migration** (revisto no Design): enquanto `store_settings.menu` não tem a versão nova, a loja e o painel montam o menu **a partir do que a loja mostra hoje** (a união do que `menuItems` devolve para computador e celular, com as chaves de cada item refletindo em qual superfície ele estava); a primeira ação da dona grava a versão nova | A loja não pode mudar de cara no deploy, e montar em SQL reescreveria a regra do menu numa segunda linguagem (ver `design.md`) | s (2026-10-28) |
| Nome do item | Padrão: **usa o nome da categoria** (acompanha se a categoria for renomeada). A dona pode trocar por um nome próprio de até **40** caracteres, e voltar ao padrão | "opção de usar o nome padrão de categoria" | s (2026-10-28) |
| Ícone | Só no **item do menu principal**, do catálogo atual de `MENU_ICON_KEYS`; submenu não tem ícone | "Manter as opções de adicionar ícone no item do menu principal" | s |
| Teto de itens | **Nenhum** no menu principal (a barra rola, `menuSemTeto`); submenu até **24** itens | A `39` revogou o teto de 4 de propósito; 24 = 3 colunas de `MENU_PANEL_COLUMN_SIZE` (8) | s (2026-10-28) |
| Categoria repetida | A mesma categoria **não** pode ser dois itens do menu principal; pode aparecer no submenu de itens diferentes | Duas entradas iguais na barra é erro; "Anéis" em "Joias" e em "Presentes" é curadoria | s (2026-10-28) |
| Item de link no menu principal | Pode ter submenu também | Um "Presentes" que é link para uma página e abre painel com categorias é o caso comum de loja | s (2026-10-28) |

**Open questions:** nenhuma — todas resolvidas ou registradas acima.

---

## User Stories

### P1: Ver o menu como ele é ⭐ MVP

**User Story**: Como dona da loja, quero abrir a tela de menu e ver só os itens que estão no menu, na
ordem em que a cliente vê, com o submenu de cada um embaixo, para entender o menu sem adivinhar.

**Acceptance Criteria**:

1. WHEN a tela abre THEN ela SHALL listar os itens do menu principal na ordem gravada, cada um com:
   nome, tipo (Categoria ou Link) com o destino legível (`Joias › Anéis` ou `/sobre`), ícone, as duas
   chaves de dispositivo e a quantidade de itens do submenu (`MNM-01`).
2. WHEN a dona expande um item THEN a tela SHALL mostrar o submenu dele, na ordem gravada (`MNM-02`).
3. WHEN uma categoria **não** está no menu THEN ela SHALL NOT aparecer na lista — nem desligada
   (`MNM-03`).
4. WHEN o menu está vazio THEN a tela SHALL mostrar um vazio com a ação "Adicionar item ao menu" —
   nunca uma lista de categorias para ligar (`MNM-04`).
5. WHEN a leitura do menu falha THEN a tela SHALL mostrar a faixa de erro com "Tentar de novo", e
   nunca o vazio (`MNM-05`).
6. WHEN a tela está em 390px THEN ela SHALL caber sem rolagem horizontal do corpo, com todo controle
   de pelo menos 44px (`MNM-06`).

**Independent Test**: com um menu gravado de 3 itens, a tela lista exatamente 3 linhas na ordem, e
nenhuma das outras 34 categorias.

---

### P1: Adicionar item ao menu principal ⭐ MVP

**User Story**: Como dona, quero adicionar um item escolhendo uma categoria, uma subcategoria ou uma
página da loja, para montar o menu sem depender da árvore.

**Acceptance Criteria**:

1. WHEN a dona toca em "Adicionar item ao menu" THEN a tela SHALL abrir um seletor com duas abas:
   **Categoria** (busca por nome, mostrando o caminho `Joias › Anéis` e se está inativa) e **Página
   da loja** (`MNM-07`).
2. WHEN ela escolhe uma categoria **ou subcategoria** THEN o item SHALL entrar no **fim** da lista,
   com o nome da categoria, sem ícone, nos dois dispositivos (`MNM-08`).
3. WHEN a categoria escolhida tem subcategorias ativas THEN o submenu do item novo SHALL nascer com
   todas elas, na ordem da árvore (`MNM-09`). Com mais de 24 subcategorias ativas, entram as **24
   primeiras** e o aviso diz quantas ficaram de fora ("As outras N subcategorias não entraram: o
   submenu tem o máximo de 24 itens.") — revisto em 2026-10-28 depois da verificação r1.
4. WHEN a categoria escolhida já é um item do menu principal THEN o seletor SHALL mostrá-la como "Já
   está no menu" e não deixar escolher (`MNM-10`).
5. WHEN ela escolhe uma página da lista THEN o item SHALL entrar com o nome sugerido da página
   (editável) e o endereço dela (`MNM-11`).
6. WHEN ela digita "outro endereço da loja" THEN a gravação SHALL recusar, com motivo legível, o
   endereço que não é rota da loja, o externo (`https://…`) e o vazio (`MNM-12`).
7. WHEN o item é gravado THEN a prévia SHALL mostrá-lo sem recarregar o iframe (`MNM-13`).

**Independent Test**: adicionar "Joias" (com 4 subcategorias) cria um item com 4 itens de submenu; a
prévia do computador mostra "Joias" na barra e o painel com as 4.

---

### P1: Editar, reordenar e remover ⭐ MVP

**User Story**: Como dona, quero renomear, trocar o ícone, mudar a ordem e tirar itens, para ajustar o
menu sem refazê-lo.

**Acceptance Criteria**:

1. WHEN ela edita um item de categoria THEN a tela SHALL oferecer "Usar o nome da categoria" (ligado
   por padrão) e, desligado, um campo de nome próprio de até 40 caracteres, com contador (`MNM-14`).
2. WHEN "Usar o nome da categoria" está ligado e a categoria é renomeada em `/admin/categorias` THEN
   o menu da loja SHALL mostrar o nome novo (`MNM-15`).
3. WHEN ela grava um nome próprio vazio ou só com espaços THEN a gravação SHALL recusar com motivo
   (`MNM-16`).
4. WHEN ela escolhe ou tira o ícone de um item do menu principal THEN a loja SHALL desenhar o ícone
   novo (`MNM-17`).
5. WHEN ela arrasta um item (ou usa "Mover para cima/baixo") THEN a nova ordem SHALL valer no menu da
   loja e **nenhuma** `sort_order` de `categories` SHALL mudar (`MNM-18`).
6. WHEN ela reordena com o teclado THEN cada item SHALL ter as ações "Mover para cima" e "Mover para
   baixo", desabilitadas nas pontas (`MNM-19`).
7. WHEN ela remove um item do menu principal THEN a tela SHALL pedir confirmação nomeando o item e
   quantos itens de submenu saem junto, e só então remover (`MNM-20`).
8. WHEN um item é removido THEN a categoria SHALL continuar existindo, intocada, e voltar a ser
   escolhível no seletor (`MNM-21`).

**Independent Test**: trocar a ordem de "Joias" e "Chaveiros" muda a barra da loja e deixa a grade de
categorias da Home igual.

---

### P1: Montar o submenu (mega menu e folha do celular) ⭐ MVP

**User Story**: Como dona, quero escolher o que aparece dentro do submenu de cada item, para montar o
mega menu e o menu do celular.

**Acceptance Criteria**:

1. WHEN o submenu está aberto THEN ele SHALL ter "Adicionar ao submenu", com o mesmo seletor (Categoria
   e Página da loja) do menu principal (`MNM-22`).
2. WHEN ela reordena ou remove um item do submenu THEN o painel da loja SHALL refletir, e a remoção
   **não** pede confirmação (é um item só, e desfaz adicionando de novo) (`MNM-23`).
3. WHEN o submenu chega a 24 itens THEN "Adicionar ao submenu" SHALL ficar desabilitado com o motivo
   "O submenu tem o máximo de 24 itens" (`MNM-24`). A recusa vale só para a operação que **aumenta**
   um submenu acima de 24; tirar, mover, renomear ou desligar nunca é recusado por causa do teto,
   mesmo num submenu que já passou dele (menu convertido do legado) — revisto em 2026-10-28.
4. WHEN a mesma categoria já está **neste** submenu THEN o seletor SHALL mostrá-la como "Já está neste
   submenu" (`MNM-25`).
5. WHEN um item de submenu é de categoria THEN ele SHALL ter "Usar o nome da categoria" como o item
   principal (`MNM-26`).
6. WHEN o item principal tem submenu ou banner no dispositivo THEN a loja SHALL desenhar a seta e o
   painel nesse dispositivo; sem nenhum dos dois, o item é link direto (`MNM-27`, preserva `NAV-25`).

**Independent Test**: tirar 2 das 4 subcategorias de "Joias" faz o mega menu mostrar 2.

---

### P1: Mostrar no computador, no celular ou nos dois ⭐ MVP

**Acceptance Criteria**:

1. WHEN ela desliga "Celular" num item principal THEN a folha do celular SHALL NOT mostrá-lo, e a
   barra do computador SHALL continuar mostrando (`MNM-28`).
2. WHEN ela desliga um item de submenu num dispositivo THEN só o painel daquele dispositivo SHALL
   perdê-lo (`MNM-29`).
3. WHEN um item principal está desligado nos dois THEN a tela SHALL mostrá-lo esmaecido com o selo
   "Fora do menu", e a loja SHALL NOT mostrá-lo (`MNM-30`).
4. WHEN a prévia está em Computador ou Celular THEN o alternador SHALL trocar só a prévia — a lista
   continua uma só (`MNM-32`).

---

### P2: Banners do painel por item

**Acceptance Criteria**:

1. WHEN o item principal é de categoria ou de link THEN ele SHALL manter o editor de banners da `39`
   (até 2 por dispositivo, arte por dispositivo, destino categoria/produto/página) (`MNM-33`).
2. WHEN o menu ainda não foi gravado na forma nova THEN os banners que hoje estão em
   `categories.menu_banners` SHALL aparecer no item do menu daquela categoria, e ser gravados nele na
   primeira ação da dona, sem perda (`MNM-34`).

---

### P2: O que deixou de existir

**Acceptance Criteria**:

1. WHEN uma categoria referenciada é **desativada** THEN a loja SHALL NOT mostrar o item (nem no
   submenu), e a tela SHALL mostrá-lo com o selo "Categoria inativa — não aparece na loja" (`MNM-35`).
2. WHEN uma categoria referenciada é **apagada** THEN o item SHALL sumir da loja, e a tela SHALL
   mostrá-lo como "Categoria apagada" com a única ação "Remover do menu" (`MNM-36`).
3. WHEN o menu tem item externo gravado antes desta feature THEN a loja SHALL continuar mostrando e a
   tela SHALL permitir editar o nome, reordenar e remover, mas não criar outro (`MNM-31`).

---

## Edge Cases

- WHEN duas abas do painel editam o menu ao mesmo tempo THEN a segunda gravação SHALL recusar ("O menu
  mudou em outra janela — recarregue") em vez de sobrescrever a primeira (`MNM-37`).
- WHEN uma gravação falha THEN a tela SHALL voltar ao estado anterior e dizer que não salvou; nunca
  mostrar `Salvo` (`MNM-38`).
- WHEN o menu tem 20 itens THEN a barra da loja SHALL rolar com a afordância da `BL-028`, e a tela não
  recusa nada (`MNM-39`).
- WHEN a conversão do menu antigo roda de novo (outra aba, outra visita) THEN ela SHALL produzir o mesmo
  documento, sem duplicar itens (`MNM-40`).

## Implicit-requirement dimensions

| Dimensão | Requisito |
| --- | --- |
| Validação e limites | `MNM-12`, `MNM-14`, `MNM-16`, `MNM-24`, `MNM-10`/`25` |
| Falha / parcial | `MNM-05`, `MNM-38` |
| Idempotência | `MNM-40` |
| Auth | escrita só com `has_role(admin)`; o documento do menu é legível publicamente inteiro (como todo `store_settings`), incluindo nós desligados e links legados, e não contém dado sensível; gravar exige `has_role(admin)` (`MNM-41`, frase revista em 2026-10-28) |
| Concorrência | `MNM-37` |
| Ciclo de vida | `MNM-35`, `MNM-36`, `MNM-21` |
| Observabilidade | N/A — gravação de curadoria, o selo `Salvo` é o retorno |
| Dependência externa | N/A — nada fora do Supabase |
| Transição de estado | N/A — item só tem "no menu" × "fora"; o resto é atributo |

## Requirement Traceability

| ID | Story | Status |
| --- | --- | --- |
| MNM-01..06 | P1 Ver o menu | Pending |
| MNM-07..13 | P1 Adicionar | Pending |
| MNM-14..21 | P1 Editar/reordenar/remover | Pending |
| MNM-22..27 | P1 Submenu | Pending |
| MNM-28..30, 32 | P1 Dispositivos | Pending |
| MNM-33..34 | P2 Banners | Pending |
| MNM-31, 35..36 | P2 O que deixou de existir | Pending |
| MNM-37..41 | Edge / dimensões | Pending |

**Coverage:** 41 requisitos, 0 mapeados a tasks (Design ainda não feito).

## Success Criteria

- [ ] A tela de menu nunca lista uma categoria que não está no menu.
- [ ] Reordenar o menu deixa `categories.sort_order` byte a byte igual (probe contra o banco local).
- [ ] No deploy, a barra do computador e a folha do celular de produção ficam idênticas às de antes
      (mesmos itens, mesma ordem, mesmos painéis, mesmos banners).

## Notas para o Design (não são requisito)

- É o "defeito 01" do outro lado: hoje "está no menu?" e "em que posição?" são deduzidos de colunas
  da categoria que têm **outros leitores** (`sort_order`). A montagem passa a ter dono próprio, e as
  colunas `menu_desktop`/`menu_mobile`/`menu_banners` viram legado não lido (molde de `menu_promo`).
- `menuItems(input, surface)` continua sendo a porta única das quatro superfícies; muda a entrada.
- Guardas a revisar: `menuSurfaceSingleOwner`, `menuSemItemFixo`, `menuSemTeto`, `menuSchema`,
  `previaUnica`, `marcacaoSoPorAcao` (se houver RPC nova).
- Protótipo: Claude Design, projeto "Uma Estrelinha - Backoffice", arquivo `Menu da loja - montagem.html` (https://claude.ai/design/p/e3957c10-bd49-4f3d-9256-04d72a7d0f41?file=Menu+da+loja+-+montagem.html). Os dados são de exemplo; a prévia desenhada à mão é só do protótipo — na tela real ela continua sendo a loja num iframe (`previaUnica`).
