# 86 — fidelidade de `/admin/menu` ao protótipo aprovado

2026-10-29. Comparação lado a lado do protótipo (Claude Design, projeto "Uma Estrelinha - Backoffice",
`Menu da loja - montagem.html`) com `/admin/menu` real, em 1440×900 e 390×844, no ambiente local
(banco local, `*.supabase.co` e GA bloqueados, nada gravado: `store_settings.menu` com diff vazio
contra a cópia tirada antes). Provas em `docs/qa/evidence/2026-10-29-fidelidade-menu/`
(`antes-*`, `depois-*`, `prototipo-*`).

Mapeamento da paleta do protótipo para os tokens do painel, num lugar só
(`features/store-menu/ui/estilos.ts`): `--hover` → `estrelinha-admin-card-hover`, `--elev` →
`estrelinha-admin-elevated`, `--violet`/`--violet-soft` → `estrelinha-admin-violet` e `…/10`,
`--muted` → `estrelinha-admin-muted`, `--input` → `border-input`, `--cta` → `gradient-cta`, `--red` →
`destructive` (o painel não tem vermelho em `estrelinha-admin-*`; não se inventou hex).

## Os dois defeitos relatados

| # | Antes (medido) | Depois (medido) | Teste |
| --- | --- | --- | --- |
| D1 | "Remover do menu" do editor: `ghost` + texto vermelho; no hover fundo `rgb(255,61,106)` (o `accent` rosa) com texto vermelho | repouso: fundo branco, borda e texto `rgb(239,67,67)`; hover: fundo `rgb(239,67,67)`, texto branco | `MenuItemEditor.test.tsx` › "o rodapé do editor não pinta de rosa no hover" (3 casos, com sensor); vermelho antes |
| D2 | menu ⋯: todo item com fundo `rgb(255,61,106)` no hover/foco (texto branco; o "Remover" vermelho sobre rosa) | itens: fundo `rgb(243,239,248)` (`elevated`), texto `rgb(26,15,46)`; "Remover do menu": mesmo lilás, texto vermelho | `MenuTree.test.tsx` › "o menu ⋯ não pinta de rosa no hover" (4 casos, com sensor); vermelho antes |

`packages/ui` não foi alterado: as classes da tela sobrescrevem o hover/foco pelo `twMerge` do `cn`.

## Divergências

| # | Item | Protótipo | Implementação (antes) | Decisão |
| --- | --- | --- | --- | --- |
| 1 | "Remover do menu" (editor) | `.btn.danger` | `ghost`, hover rosa | **corrigido** (D1) |
| 2 | Itens do menu ⋯ | hover `--elev`, texto mantido | hover `accent` rosa | **corrigido** (D2) |
| 3 | Separador antes de "Remover do menu" no ⋯ | `<hr>` | ausente | **corrigido** |
| 4 | Caixa do menu ⋯ | 220px, raio 12, sombra | `min-w-[8rem]`, raio 6 | **corrigido** |
| 5 | "+ Adicionar item" do cabeçalho do card | CTA em gradiente | contorno | **corrigido** |
| 6 | "+ Adicionar item ao menu" no fim da lista | botão largo no rodapé do card | ausente | **corrigido** (`adicionar-item-rodape`) |
| 7 | Título do card | 16px, respiro 18/20 | 14px, 12/16 | **corrigido** |
| 8 | Cada item | cartão próprio (borda, raio 14, vão de 6) | linhas com `divide-y` | **corrigido** |
| 9 | Tipo do item ("Categoria"/"Link") | selo `.kind` | texto corrido | **corrigido** (o " · " segue para leitor de tela) |
| 10 | Ladrilho do ícone | 40px, violeta claro, desenho violeta; "sem" tracejado | 36px, `bg-muted` cinza | **corrigido** |
| 11 | Chaves PC \| Celular | grupo emendado; ligada violeta claro + violeta, desligada branca + `--muted` | dois botões soltos; ligada borda `primary`; desligada riscada | **corrigido** (sem o risco: o estado é fundo + cor + `aria-pressed`) |
| 12 | Altura das chaves | 36px visíveis com faixa de toque de 44 | 44px visíveis | **mantido** — alvo ≥ 44 por token (`MNM-06`, `touchTarget`) |
| 13 | Seta do submenu | `›` que gira 90° | `ChevronDown` que gira 180° | **corrigido** (`ChevronRight` + `rotate-90`) |
| 14 | Botões de ícone (seta, ⋯, ↑ ↓ ✎ ✕) | hover `--elev`, raio 10 | hover `bg-muted` | **corrigido** |
| 15 | Selo "Categoria apagada" | vermelho (`.tag.err`) | âmbar | **corrigido** |
| 16 | Selo "Fora do menu" | neutro (`.tag.mute`) | âmbar | **corrigido** |
| 17 | Selo de inativa | âmbar | âmbar | igual |
| 18 | Fundo do submenu | `#FDFBFF`, raio inferior 14 | `bg-muted/30` | **corrigido** (`estrelinha-admin-bg`) |
| 19 | Contador N/24 | texto simples à direita | pílula | **corrigido** |
| 20 | Linha do submenu | cartão com borda, raio 10; "Link · " antes do destino | sem borda; sem "Link" | **corrigido** |
| 21 | Submenu vazio | caixa tracejada centrada | parágrafo | **corrigido** |
| 22 | "+ Adicionar ao submenu" | fantasma violeta | `ghost` com hover rosa | **corrigido** |
| 23 | Item apagado | botão "Remover do menu" na linha | só no ⋯ | **mantido** — o foco de Q07 volta ao ⋯ do item ao cancelar, e `MNM-36` está provado pelo ⋯ |
| 24 | Estado vazio | cartão sólido, CTA em gradiente | borda tracejada, botão padrão | **corrigido** (por teste; em navegador não foi forçado — ver Limites) |
| 25 | Selo "Salvo" | verde com ponto | cinza | **corrigido** |
| 26 | "Ver na loja ↗" | fantasma violeta | contorno, hover rosa | **corrigido** |
| 27 | "Ver na loja" e o selo no celular | escondidos no cabeçalho; selo na barra do topo | visíveis no cabeçalho | **mantido** — a barra do celular é do `AdminLayout` (compartilhada) e esconder o link tiraria o único caminho à loja no celular |
| 28 | Ícone em ladrilho ao lado do título | ausente | `PageHeader` do painel | **mantido** — molde de todas as telas do painel |
| 29 | Barra lateral | desenho do protótipo | `AdminLayout` com o modo de foco | **mantido** — feature 47 (`FOCO-*`) |
| 30 | Colunas | lista `1fr` + prévia 460 | lista 560 + prévia `1fr` | **mantido** — `FOCO-13`, molde literal de `/admin/home` (`AdminMenuPage.test.tsx` compara as duas) |
| 31 | Abas Itens/Prévia abaixo de `lg` | pílula | barra sublinhada | **mantido** — `FOCO-37` (dispositivo é pílula, vista é sublinhada) |
| 32 | Prévia | desenho à mão num cartão "Prévia" + nota | a loja num iframe (`MenuLivePreview`) + "Conferir em" | **mantido** — `previaUnica`; o próprio protótipo diz que na tela real a prévia é a loja |
| 33 | Seletor: abas | pílula segmentada | barra sublinhada | **corrigido** |
| 34 | Seletor: "Adicionar" / "Cancelar" | CTA / contorno | primário / contorno com hover rosa | **corrigido** |
| 35 | Seletor: linha escolhida / hover | borda violeta + anel; hover de borda violeta | `border-primary` + `bg-primary/5`; hover `bg-muted` | **corrigido** |
| 36 | Seletor: selo "Inativa" | âmbar | neutro | **corrigido** |
| 37 | Seletor: "Já está no menu" | selo à direita | linha de texto abaixo do caminho | **mantido** — embrulha a 200 % de fonte (Q06) |
| 38 | Seletor: subcategoria recuada | `padding-left:28px` | caminho completo, sem recuo | **mantido** — o caminho "Pai › Filha" já diz a profundidade e não come largura a 390 |
| 39 | Seletor: subtítulo | por modo ("Entra no fim da lista, no computador e no celular…") | "Escolha uma categoria ou uma página da loja. O item entra no fim da lista." | **mantido** — mesmo sentido; a frase é âncora de Q06b (vira `sr-only` no celular) |
| 40 | Editor: título | "Editar item do menu" + "Categoria · Joias" | "Editar “Joias”" + "Item do menu principal…" | **mantido** — o nome no título diz qual item está aberto |
| 41 | Editor: "Usar o nome da categoria" | interruptor sem caixa, à esquerda | caixa com o interruptor à direita | **mantido** — o `Switch` do painel com faixa de 44 (`SWITCH_TAP_44`) |
| 42 | Editor: nome com "Usar o nome" ligado | campo desabilitado com o nome | campo some | **mantido** — mostrar um campo que não se edita é ruído; a frase "Hoje: “…”" diz o nome |
| 43 | Editor: grade de ícones | grade simples | cartão com busca e contador (`MenuIconPicker`) | **mantido** — `NAV-48` (busca por nome) |
| 44 | Editor: "Editar banners", "Cancelar" | contorno com hover rosado claro | hover rosa | **corrigido** |
| 45 | Editor: "Salvar" | CTA | primário | **corrigido** |
| 46 | Editor: contagem de banners | "N banners configurados · até 2 por dispositivo" | "N no computador · M no celular" | **mantido** — `FOCO-32` (contagem por dispositivo, `bannersGravados`) |
| 47 | Confirmação: "Cancelar" | contorno | hover rosa | **corrigido** |
| 48 | Confirmação: botão de remover | "Remover", vermelho cheio | "Remover do menu", vermelho cheio | **mantido** — vocabulário de `MNM-20`/`MNM-36` em toda a tela |
| 49 | Vermelho | `#B42318` | `destructive` (`#EF4444`) | **mantido** — token do painel; sem vermelho em `estrelinha-admin-*` |
| 50 | Avisos (toasts) | pílula escura no pé | `toast` do painel | **mantido** — sistema de aviso único do painel |

**50 itens**: 30 corrigidos (incluindo os dois defeitos), 19 mantidos com motivo, 1 igual.

## Limites desta passada

- O estado vazio não foi forçado em navegador (a interceptação da leitura não pegou); está provado
  por teste de token (`MenuTree.test.tsx`).
- Os toasts não foram disparados, para não gravar no banco.
- O vermelho `destructive` sob texto branco mede 3,8:1 (abaixo de 4,5 para texto pequeno); é o
  mesmo par já usado pelos botões de exclusão do painel, e trocar pede um token vermelho próprio.

## Ajuste de contraste (orquestrador, 2026-10-29)

O vermelho `destructive` do painel com texto branco mede ~3,8:1 (abaixo de 4,5:1 para texto pequeno).
O hover de "Remover do menu" (`BOTAO_PERIGO`) e os botões vermelhos cheios (confirmar a remoção e
descartar o banner) passaram a `red-700` (`#B91C1C`, ~6,5:1 com branco), próximo do `#B42318` do
protótipo. Testes em `MenuItemEditor.test.tsx` e `MenuRemoveConfirm.test.tsx` cobram `bg-red-700`/
`hover:bg-red-700` e recusam o `destructive`.
