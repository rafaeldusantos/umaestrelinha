# 104 · Ícones do sistema e cor do texto no Menu da loja

Costura de 2026-11-17. Sem PRD — improvement sem PRD.

Registro do que se descobriu e decidiu nesta data — **não** descrição do estado atual do código.
Convenção de cada repositório: o arquivo de instruções dele.

## Diagnóstico

O seletor de ícone do item do menu (`apps/backoffice/src/features/store-menu/ui/MenuIconPicker.tsx:109-176`)
oferece só o vocabulário da marca: 29 chaves em `packages/core/src/menu/icons.ts:26 › MENU_ICON_KEYS`,
desenhadas em `packages/ui/src/icons` e ligadas por `MENU_ICON_COMPONENTS` (`packages/ui/src/icons/index.ts:159`,
que É `ESTRELINHA_ICONS`). Nada serve a um item comercial como "Black Friday" → `/ofertas` (tag, desconto,
presente). E o nó do documento do menu (`packages/core/src/menu/structure.ts:47 › MenuNode`, `:61 › MenuRootNode`)
não tem cor: o rótulo sai sempre `on-primary` na barra (`apps/store/src/widgets/header/ui/navItem.ts:23`) e
`ink`/`primary` na folha do celular (`apps/store/src/widgets/mobile-menu/ui/MobileMenu.tsx:311`, `:334-340`).

Cabe sem PRD: é vocabulário novo num catálogo que já existe e um campo opcional num documento jsonb
(`store_settings.menu`, sem migration), com a régua de contraste que o repositório já tem
(`packages/core/src/color/contrast.ts`, molde `packages/core/src/campaigns/refusals.ts:92`).

**Achados de eval que este Work Item resolve**

nada — o Work Item não vem de eval, e o repositório não tem relatório local de eval.

**Anexos consultados**

| Anexo | Tipo | O que se tirou | Alimenta |
| ----- | ---- | -------------- | -------- |
| Pedido complementar na conversa (2026-11-17) | texto | "Adicionar também apcáo de colocar cor no texto do menu" — a cor do rótulo entra no mesmo WI | C-06, C-07 |

## Comportamentos

| #    | O que precisa passar a ser verdade |
| ---- | ---------------------------------- |
| C-01 | O seletor de ícone do item do menu em `/admin/menu` oferece, além dos ícones da marca, um conjunto de ícones do sistema (a lista de P-02). |
| C-02 | Os ícones do sistema são desenhados no estilo da casa (grade 24, traço 1,5, contorno `currentColor`, realce `ICON_ACCENT`) e passam em `icons.test.ts` e `menuIconCatalog.test.ts` sem afrouxar régua. |
| C-03 | A loja desenha o ícone do sistema escolhido onde o ícone do item principal já aparece — a barra do computador e a folha do celular — e na prévia do painel (que é a loja num iframe). |
| C-04 | O seletor separa os dois grupos com título ("Da Uma Estrelinha" e "Do sistema"), a cela "Sem ícone" continua fixa, e a busca por nome ou chave alcança os dois. |
| C-05 | Uma chave do sistema grava no documento v2 e é lida igual pela loja e pelo painel; os ícones já gravados não mudam. |
| C-06 | A dona escolhe, por item principal do menu (P-04), duas cores livres para o rótulo, num componente de escolha de cor: uma para a barra escura do computador e outra para a folha branca do celular (P-03). A loja desenha o rótulo na cor da superfície; cor não escolhida naquela superfície = como hoje. |
| C-07 | Uma cor que deixe o rótulo abaixo de 4,5:1 sobre o fundo da superfície dela — a barra nos perfis Padrão **e** Black Friday, a folha branca — é recusada antes de gravar, com a razão e a medida na frase; a regra mora em `core`, e um valor fora do formato `#RRGGBB` é lido como "sem cor". |

## Fora do escopo

- Ícone e cor nos itens do **submenu** e no "ver tudo em X" do painel (o ícone já é só do item principal, `MNM-26`).
- Ícones de relógio, raio e estrela de cinco pontas (tom memorial: leitura de contagem regressiva/urgência; e a estrela da casa já é a faísca da marca).
- Usar componentes do `lucide-react` no menu (P-01).
- Cor de fundo do item; cor no submenu.
- O app do ateliê (`apps/mobile-adm`) — não desenha o menu da loja.

## Design

Fontes: nenhuma. Pergunta feita no chat (2026-11-17): "O WI 104 não tem protótipo … Como seguimos quanto
ao design?" — resposta: **"Seguir sem design (Recomendado)"**: estender as telas existentes no padrão
delas; prova em navegador a 390 e a 1440.

### Seletor de ícone (painel, `MenuIconPicker`)
A grade única vira: cela "Sem ícone" (fixa, fora do filtro) → título "Da Uma Estrelinha" + grade → título
"Do sistema" + grade, na mesma área que rola. A busca filtra as duas grades; grupo sem resultado some; nenhum
resultado mostra a mensagem que já existe. O texto do cabeçalho deixa de dizer que são só os desenhados para a loja.

### Editor do item (painel, `MenuItemEditor`)
Só no item principal, abaixo do ícone: "Cor do texto", com dois campos — "Na barra do computador (fundo
escuro)" e "Na lista do celular (fundo branco)". Cada um: componente de escolha de cor (`input type="color"`,
44px) + campo hex (`h-11`, `border-input`) + "Usar a cor padrão" + a medida de contraste vinda de `core`
(verde ≥ 4,5:1, vermelha abaixo, com a frase). Molde: `features/campaign-form/ui/ColorsCard.tsx` (só a forma).
Recusa mostrada em `editor-recusa` e Salvar não grava; a prévia ao lado mostra o efeito.

### Loja (barra do computador e folha do celular)
O rótulo do item principal sai na cor que a dona escolheu para aquela superfície (a da barra no computador, a da folha no celular).
Aberto/hover: a cor da dona se mantém (P-05); a pista do aberto continua pela régua de 2px (computador) e pelo
chevron (celular). Sem cor, as classes de hoje.

## Código — /Users/rafael.santos/Projetos/uma-estrelinha/store

- **Instruções** — `CLAUDE.md` (raiz) › Feature-Sliced Design, Alias de import, O "defeito 01", Convenções,
  Os guardas, Baselines; `apps/backoffice/CLAUDE.md` › `/admin/menu`, A ponte da prévia, Molde dos formulários;
  `apps/store/CLAUDE.md` › Ícones e marca, Menu (consumo), Modo prévia; `packages/core/CLAUDE.md` › Pureza,
  `menu`, Convenções de tipo; `packages/ui/CLAUDE.md` › `@estrelinha/ui/icons`; `DESIGN.md` §1, §2, §8.
- **Recorte** — C-01..C-07.
- **O que já serve**
  - Leitura tolerante do ícone: `packages/core/src/menu/icons.ts:114 › menuIconKey` (fora do catálogo ⇒ sem ícone) e `structure.ts:182` (string livre); a recusa não julga ícone (`refusals.ts:129`). C-05 sai quase de graça.
  - A porta já resolve o ícone para as superfícies (`structure.ts:405`); `MegaMenu.tsx:45 › ItemIcon` e `MobileMenu.tsx:214 › EntryIcon` leem `MENU_ICON_COMPONENTS` (C-03).
  - A prévia passa o documento inteiro e a loja relê pela mesma porta (`core/menu/preview.ts:119-133`, `useMenu.ts:67`): campo novo chega sem mexer na ponte, se o parser o preservar.
  - Busca do seletor por rótulo e chave, sem acento (`MenuIconPicker.tsx:56-65`).
  - `contrastRatio` (`packages/core/src/color/contrast.ts`) e o molde da recusa de cor com a razão na frase (`core/campaigns/refusals.ts:92-103`, `limits.ts:19-39`).
  - Tons por perfil num dono só: `packages/ui/src/tokens/estrelinha.ts:43 › ESTRELINHA_COLORS`, `:113 › ESTRELINHA_PROFILES`.
- **O que muda**
  - `packages/core/src/menu/icons.ts` — chaves e rótulos novos; o grupo de cada chave (lista do sistema `as const` separada, e `MENU_ICON_KEYS` = marca + sistema).
  - `packages/ui/src/icons/index.ts` — export, import e entrada em `ESTRELINHA_ICONS` por ícone; comentários de cabeçalho (`index.ts:4-7`, `icons.ts:17`) passam a declarar a exceção do menu (P-01).
  - `MenuIconPicker.tsx` — dois grupos com título; texto do cabeçalho.
  - `structure.ts` — `labelColors` em `MenuRootNode` (`:61`) e a cor resolvida da superfície em `MenuItem` (`:94`); `parseRoot` (`:176`) lê com validação (fora do catálogo ⇒ `null` — hoje chave desconhecida é **descartada** e a próxima gravação a apagaria); `legacyMenuDocument` (`:286-301`) sem cor; a porta entrega a cor da superfície (`:398-409`, usa o `surface` que já recebe).
  - `refusals.ts:129 › menuDocumentRefusal` — chama `menuLabelColorRefusal` em cada item principal (a mesma régua que o editor mostra).
  - `apps/backoffice/src/features/store-menu/model/documentOps.ts:164,181-189,87-94` — `labelColors` no patch da raiz; item novo nasce sem cor.
  - `MenuItemEditor.tsx:61,108-168,205-229,349-355` — estado e controle da cor, patch.
  - `apps/store/src/widgets/header/ui/MegaMenu.tsx:333-335` + `navItem.ts:23` — rótulo com a cor (tom escuro-fundo) por `style`.
  - `apps/store/src/widgets/mobile-menu/ui/MobileMenu.tsx:311,334-340` — rótulo com a cor (tom claro-fundo) por `style`.
- **O que nasce**
  - `packages/ui/src/icons/<Nome>Icon.tsx`, um por ícone de P-02, no molde de `SacolaIcon.tsx`/`ParcelasIcon.tsx`.
  - `packages/core/src/menu/labelColor.ts` — a forma `MenuLabelColors = { bar: string | null; sheet: string | null }`, `menuLabelColorsOf` (leitura tolerante: só `#RRGGBB`), `menuLabelColorFor(cores, superfície)` e `menuLabelColorRefusal(cores)` (`string | null`, molde `campaignColorsRefusal`: formato antes de contraste, a medida na frase, `bar` contra o `primary` dos dois perfis e `sheet` contra o branco); imports com `.ts`; reexportado em `core/menu/index.ts`.
  - Os hex dos fundos (barra `primary` e folha branca, nos dois perfis) como **cópia deliberada** em `labelColor.ts`, com guarda que lê `ESTRELINHA_PROFILES` e compara (consequência 3 do "defeito 01"; `core/menu` não pode importar `@estrelinha/ui`, `purity.test.ts:73-75`).
- **Exemplares** — ícone: `packages/ui/src/icons/SacolaIcon.tsx`; catálogo: `core/menu/icons.ts`; leitura tolerante: `structure.ts:182` e `core/appearance/normalize.ts:7`; recusa de cor: `core/campaigns/refusals.ts:92`; controle de amostras: `features/campaign-form/ui/ColorsCard.tsx` (só a forma, sem import); patch da raiz: `documentOps.ts:187-189`; teste por token: `MegaMenu.test.tsx:250-301 › temToken`.
- **Obrigações transversais** — regras de ícone de `icons.test.ts:85-215` (`ICON_VIEW_BOX`, `ICON_STROKE`, `fill="none"`, `currentColor`, realce só `ICON_ACCENT`, sem `width/height`); `core/menu` puro, imports com `.ts`; veredito `string | null`; ouro (`accent`) nunca como texto (`accentText.test.ts`); cor na loja por `style`, nunca `text-[#…]` (`arbitraryTextColor.test.ts`); controles ≥ 44px; payload em igualdade exata no teste; nenhum `…Preview` novo nem `<iframe>` (`previaUnica.test.ts`); tom memorial nos rótulos; mobile primeiro (prova em 390×844); prova de gravação por probe HTTP no Supabase local (`AD-012`); baselines do `CLAUDE.md`.
- **Testes** — decisão: **ambos** (ajustar e criar).
  - `core/menu/__tests__/icons.test.ts:8-12` — ajustar a âncora cravada `toHaveLength(29)`; criar: grupos cobrem o catálogo sem sobreposição, chave do sistema lida como ela mesma.
  - `structure.test.ts:117-147` (igualdade exata do nó) e `legacy.test.ts` — ajustar para `labelColor`; criar leitura de cor válida e inválida.
  - `structureMenuItems.test.ts`, `refusals.test.ts`, `preview.test.ts` — estender (tom por superfície, recusa, rascunho com cor).
  - `labelColor.test.ts` (novo) — formato, leitura tolerante, recusa abaixo de 4,5:1 em cada fundo e cada perfil (a do Black Friday sozinha também recusa), aceita no piso; e o guarda dos fundos contra `ESTRELINHA_PROFILES` (suíte da loja, pois `core` não lê `ui`), com sensor.
  - Painel: `MenuIconPicker.test.tsx` (contador, os dois grupos; nenhum rótulo novo com "mecha"/"unha", `:90-92`, `:112-113`), `MenuItemEditor.test.tsx:132,148,213,221,233` (patch com `labelColors`; recusa antes da rede), `documentOps.test.ts`, `useStoreMenu.test.ts`.
  - Loja: `MegaMenu.test.tsx`, `MobileMenu.test.tsx` (rótulo na cor e sem cor como hoje; ícone do sistema nas duas), `useMenuPreview.test.tsx`/`HeaderMenuDocumento.test.tsx`.
  - Guardas rodados sem afrouxar: `icons`, `menuIconCatalog`, `contrast`, `accentText`, `arbitraryTextColor`, `previaUnica`, `menuDocumentoComDonoUnico`, `menuSemTeto`, `menuSemItemFixo`, `purity`.

## Fronteira entre repositórios

nada — um repositório só (monorepo).

## Cobertura

| # | Reivindicado por |
|---|---|
| C-01 | store (monorepo) — `core/menu/icons.ts`, `ui/icons`, `MenuIconPicker` |
| C-02 | store — `ui/icons/*Icon.tsx`, `icons.test.ts`, `menuIconCatalog.test.ts` |
| C-03 | store — `MegaMenu`, `MobileMenu` (já leem `MENU_ICON_COMPONENTS`) |
| C-04 | store — `MenuIconPicker` |
| C-05 | store — `menuIconKey`, `parseRoot`, probe de gravação |
| C-06 | store — `structure.ts`, `labelColor.ts`, `documentOps`, `MenuItemEditor`, `MegaMenu`, `MobileMenu` |
| C-07 | store — `labelColor.ts` + guarda dos fundos |

## Perguntas e respostas

| # | A pergunta | A recomendação (premissa do plano) | A resposta |
|---|---|---|---|
| P-01 | Os ícones do sistema vêm do `lucide-react` ou são desenhados no conjunto da casa? | Desenhados na casa (traço 1,5 + realce dourado), como ícones da marca em `ESTRELINHA_ICONS`; o lucide tem traço 2 e não passa nos guardas. Desenho próprio, sem copiar paths do lucide. Exceção declarada à regra "o que o lucide resolve vem de lá", só para o vocabulário do menu. | ratificada pela recomendação (técnica) |
| P-02 | Quais ícones do sistema entram? | Dez: Etiqueta, Porcentagem, Presente, Coração, Cupom, Frete (caminhão), Calendário, Informação, Dúvida, Início (casa). Fora: relógio, raio, estrela de cinco pontas. | ratificada no gate ("Os dez recomendados") |
| P-03 | Como a dona escolhe a cor do rótulo? | Paleta fechada (Padrão, Dourado, Vermelho, Verde); cada cor tem um tom para a barra escura e outro para a folha branca, medidos ≥ 4,5:1 nos dois perfis. Uma cor só não serve às duas superfícies. | "Cor livre (código hex), uma para cada fundo, recusada quando ficar ilegível" — ressalva: "Com componente de escolha de cor". O plano foi corrigido (C-06, C-07, Design, Código). |
| P-04 | A cor vale para quais itens? | Só o item principal (como o ícone), na barra do computador e na folha do celular; submenu e "ver tudo em X" ficam no padrão. | ratificada no gate ("Só os itens principais") |
| P-05 | No hover e com o item aberto, o rótulo colorido muda? | Mantém a cor da dona; a pista de aberto fica pela régua de 2px (computador) e pelo chevron (celular). | ratificada no gate ("Mantém a cor escolhida") |
| P-06 | Onde moram os fundos contra os quais a cor é medida? | Cópia deliberada dos hex em `core/menu/labelColor.ts`, com guarda na suíte da loja comparando com `ESTRELINHA_PROFILES`. | ratificada pela recomendação (técnica) |

## Riscos

- Âncora `toHaveLength(29)` em `core/menu/__tests__/icons.test.ts` e o contador do seletor quebram (esperado; ajustar).
- `parseRoot` reconstrói o nó campo a campo: esquecer o campo novo ali faz a cor sumir na loja, no painel e na prévia, e a próxima gravação a apaga.
- Cor por `style` vence o `hover:text-white`/`text-white` da barra: perder a única pista de aberto (há outra: régua de 2px).
- Perfil Black Friday troca o fundo da barra (#1C1A18): a cor da barra tem de passar nos dois.
- Cor livre aplicada por `style` não é varrida por guarda nenhum na loja: a recusa de `core`, chamada pelo editor e por `menuDocumentRefusal`, é a única contenção do contraste.
- `accentText.test.ts` varre `.ts` da loja: classe `text-estrelinha-accent*` num rótulo derruba.

## Não resolvido

nada.

## Decisões

Tomadas na implementação (WI 104, 2026-11-17), com raio além de um arquivo:

- **Grupos no core, títulos na tela.** `core/menu/icons.ts` passou a ter `MENU_BRAND_ICON_KEYS` (29), `MENU_SYSTEM_ICON_KEYS` (10) e `MENU_ICON_GROUPS` (`MenuIconGroup`, `id: 'marca' | 'sistema'`); `MENU_ICON_KEYS` é marca + sistema e continua a lista inteira. Os títulos "Da Uma Estrelinha"/"Do sistema" moram no `MenuIconPicker` (T01).
- **A recusa da cor segue o `anterior`.** `menuDocumentRefusal` não trava as outras ações por uma cor ilegível que o item já tinha gravada; escolher cor nova abaixo do piso recusa — o mesmo desenho do teto do submenu (T02).
- **Sem cor, sem chave.** Item sem cor válida nas duas superfícies não leva `labelColors` (leitura e `updateNode`); documento sem cor lê igual ao de antes (T02).
- **A medida e a frase vêm do core.** `labelColor.ts` exporta também `menuLabelColorSurfaceRefusal`, `menuLabelColorApproval` e `MENU_LABEL_HEX`; o painel só mostra. O editor recusa antes da rede o código fora de `#RRGGBB` (T02).
- **Onde a cor pinta na loja.** Barra: `style` no próprio link da entrada (vence hover e aberto, P-05; a régua de 2px segue como pista). Folha: só no `<span>` do rótulo; o chevron fica no tom de hoje como pista do aberto (T02).
