# Sessão CH-02 · Cor ilegível ou malformada nunca chega a gravar

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-02-cor-ilegivel-nunca-grava.md` · exploratório · P1 |
| Status      | done                                                                   |
| Persona     | PER-01 Adri, a dona · conta: `admin` — `QA_ADMIN_*`                    |
| Tour · modo | Garbage · por técnica (valor limite e transição de estado)            |
| Rodada      | exploração                                                             |
| Orçamento   | ~55 ações de browser de 50 (a exploração parou perto de 48; a restauração do item C, a conferência na loja e o logout passaram do teto) |
| Ambiente    | painel http://localhost:8083 · loja http://localhost:8082 · build não exposto · Chromium (agent-browser, headless) · viewports 1440 × 900 · 390 × 844 |
| Paridade    | backend Supabase local; perfil de estilo da loja em Black Friday durante toda a sessão (não foi trocado) |

## Missão

Achar qualquer jeito de uma cor ilegível, um código malformado ou um item de submenu chegar a gravar cor no menu — e confirmar que a dona, ao ser recusada, entende por quê e não perde o que digitou.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrou como admin, abriu /admin/menu › Ações de "Personalizados" › Editar nome, ícone e banners | Editor com "Cor do texto": barra e lista vazias, "Usar a cor padrão" desabilitado nas duas | — |
| 02 | Barra `#8A5A2B`, depois duplo clique em Salvar | Frase sob o campo: "A cor do texto na barra do computador mede 1,6:1 sobre a barra no perfil Padrão: o nome fica difícil de ler. Escolha uma cor mais clara (o mínimo é 4,5:1)." Depois do Salvar, a mesma frase num `alert`; código continua no campo; nenhuma requisição de gravação (só GETs) | `screenshots/CH-02-02-recusa-barra.png` |
| 03 | Lista `#E8C77A` com a barra ainda ilegível, Salvar | Frase da lista: "A cor do texto na lista do celular mede 1,6:1 sobre o fundo branco: … Escolha uma cor mais escura (o mínimo é 4,5:1)."; o `alert` mostra só a recusa da barra; nada gravado | — |
| 04 | Barra `E8C77A` (sem #) e lista `#12`, Salvar | Nada acontece: nenhuma frase, nenhum alert, nenhum toast, editor aberto, nenhuma requisição de gravação, sem erro no console. Seletor da barra volta a `#ffffff` | `screenshots/CH-02-04-formato-sem-cerquilha.png` |
| 05 | Barra `#GGGGGG`, lista `#E8C77AFF`, Salvar | Lista corta para `#E8C77A` (campo limita 7 caracteres) e mostra a recusa de contraste; barra `#GGGGGG` sem nenhuma frase | — |
| 06 | Apagou o código da lista (preenchimento vazio e depois teclado), barra `#GGGGGG`, Salvar | Campo da lista fica vazio, mas o seletor continua `#e8c77a` e a frase "lista mede 1,6:1" continua; Salvar não faz nada e não diz nada | `screenshots/CH-02-06-formato-silencioso.png` |
| 07 | Editou a barra de novo | O campo da lista, que estava vazio, voltou a mostrar `#E8C77A` sozinho | — |
| 08 | Recarregou a página com o editor sujo e reabriu C | Item C sem cor nas duas superfícies — nada gravou | — |
| 09 | Barra `#e8c77a` (minúsculas), lista colada ` #8A5A2B ` | Barra normalizada para `#E8C77A`, aceita; lista ficou ` #8A5A2` (cortada no 7º caractere) — código incompleto, sem frase | — |
| 10 | Corrigiu a lista para `#8A5A2B` | As duas aceitas — nenhuma medida aparece (nem verde) | `screenshots/CH-02-09-cores-validas.png` |
| 11 | Salvar | "Salvo"; `PATCH /rest/v1/store_settings?key=eq.menu → 200`. Loja a 1440 (perfil Black Friday): barra `rgb(28,26,24)` = #1C1A18; rótulos de A e C em #E8C77A (≈10,6:1), B em #F7F3EC | `screenshots/CH-02-11-loja-1440-bf-com-cor.png` |
| 12 | Loja a 390, "Abrir menu" | Folha branca; A, B e C em #8A5A2B | `screenshots/CH-02-12-loja-390-com-cor.png` |
| 13 | Abriu o submenu de C no painel | 7 filhos, cada um com "Editar" e "Tirar do submenu" | — |
| 14 | Editar "Iniciais" (filho de C) | Editor sem "Cor do texto" (e sem ícone); só o nome. Cancelou sem gravar | `screenshots/CH-02-14-submenu-sem-cor.png` |
| 15 | Reabriu C | Barra `#E8C77A`, lista `#8A5A2B` gravadas | — |
| 16 | "Usar a cor padrão" na barra e na lista, Salvar | Campos vazios, seletores `#ffffff`/`#000000`, botões desabilitados; "Salvo", `PATCH … → 200` | — |
| 17 | Loja a 1440 e a 390 | 1440: C em #F7F3EC (A segue #E8C77A, B #F7F3EC). 390: C em rgb(22,21,20) — a tinta padrão da folha no perfil Black Friday; A e B em #8A5A2B | `screenshots/CH-02-17-loja-390-sem-cor.png` |
| 18 | Saiu da conta | Tela de login | — |

**Edge cases tentados:** duplo clique no Salvar com a recusa visível (nenhuma gravação); recarregar com o editor sujo (nada gravou); as duas superfícies ilegíveis juntas; código colado com espaços (cortado); `#E8C77AFF` (cortado para `#E8C77A`); minúsculas (aceitas e normalizadas); campo vazio (não volta a "sem cor", A-2); "Usar a cor padrão" nos dois campos e salvar.

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-FUNC-005 | fail | 02, 03, 08, 10, 11 | `screenshots/CH-02-02-recusa-barra.png` · `screenshots/CH-02-09-cores-validas.png` | A-3. Passos 1–3 e variações "lista", "as duas" e "duplo clique" passaram: recusa com superfície e medida, nada gravado, código mantido. Passo 4: a cor válida grava, mas nenhuma medida verde aparece. Rodado com a loja em Black Friday (a frase diz "perfil Padrão"). Variação "no piso" (4,5:1 exato) não rodou |
| TC-FUNC-006 | fail | 04–09 | `screenshots/CH-02-04-formato-sem-cerquilha.png` · `screenshots/CH-02-06-formato-silencioso.png` | A-1 (nenhuma frase para formato) · A-2 (campo vazio não vira sem cor). Nada malformado gravou (passo 3 ok). Minúsculas: aceitas |
| TC-FUNC-007 | pass | 15–17 | `screenshots/CH-02-17-loja-390-sem-cor.png` | Na loja, C voltou ao padrão nas duas superfícies (Black Friday: barra #F7F3EC, folha rgb(22,21,20)). C não foi reaberto depois do último Salvar; o estado gravado foi conferido na loja |
| TC-FUNC-008 | pass | 13–14 | `screenshots/CH-02-14-submenu-sem-cor.png` | Filho "Iniciais", do submenu de C (a massa trocou B por C); o item principal C tem o bloco |
| TC-FUNC-009 | pass | 02, 11, 12 | `screenshots/CH-02-11-loja-1440-bf-com-cor.png` | A rodada começou em Black Friday: os passos 1 e 3 (trocar o perfil e voltar) não rodaram. Passo 2: barra #1C1A18, A em #E8C77A ≈10,6:1. Variações: folha a 390 com A em #8A5A2B; barra `#8A5A2B` recusada com o Black Friday ativo |

Contagem: pass 3 · fail 2 · blocked 0 · skip 0

## Achados

### A-1 · [Editor do item › Cor do texto] Com um código fora de #RRGGBB, Salvar não faz nada e não diz por quê — a dona fica sem saber o que errou

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri, a dona                                                   |
| Jornada e passo     | J-01b, salvar a cor · passos 04–06 do log                             |
| TC                  | TC-FUNC-006                                                           |
| Gravidade proposta  | medium — nada errado grava, mas a dona clica em Salvar, nada acontece e nada explica; ela não tem como saber que o código está errado (por exemplo, colou sem `#`) |
| Reproduziu          | sim (3 de 3: `E8C77A`/`#12`; `#GGGGGG` com a lista recusada; `#GGGGGG` sozinho) |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. Como `admin`, em http://localhost:8083/admin/menu, abra Ações de "Personalizados" › Editar nome, ícone e banners
2. Em "Na barra do computador (fundo escuro)", digite `E8C77A` (ou `#GGGGGG`, `#12`)
3. Clique em Salvar

**Esperado:** o editor diz que o código não está no formato, com a frase da recusa; nada grava; o código continua no campo — **fonte:** TC-FUNC-006 passo 1; `plan.md` C-07 (o formato é conferido antes do contraste)

**Observado:** o editor continua aberto, o código continua no campo, não aparece frase, alerta nem toast. Só o seletor de cor ao lado volta para `#ffffff`. Nada grava.

**Evidência:**

- `screenshots/CH-02-04-formato-sem-cerquilha.png` — `E8C77A`/`#12` nos campos, sem nenhuma frase
- `screenshots/CH-02-06-formato-silencioso.png` — `#GGGGGG` na barra, sem frase
- console: `nada`
- rede: nenhuma requisição de gravação (só GETs)

### A-2 · [Editor do item › Cor do texto] Apagar o código do campo não tira a cor: o código anterior volta sozinho

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri, a dona                                                   |
| Jornada e passo     | J-01b/J-01c, tirar a cor · passos 06–07 do log                        |
| TC                  | TC-FUNC-006 (variação "campo vazio")                                  |
| Gravidade proposta  | low — o campo vazio engana: a dona acha que tirou a cor, mas o código anterior continua valendo (a frase de recusa fica, e o código volta). "Usar a cor padrão" funciona |
| Reproduziu          | sim (2 de 2: preenchimento vazio e apagar pelo teclado)              |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. Como `admin`, abra o editor de "Personalizados" em /admin/menu
2. Em "Na lista do celular (fundo branco)", digite `#E8C77A` (aparece a recusa de 1,6:1)
3. Apague todo o código do campo
4. Mexa no campo da barra (digite qualquer caractere)

**Esperado:** campo vazio é "sem cor" naquela superfície, sem recusa — **fonte:** TC-FUNC-006, variação "campo vazio"; `plan.md` C-06 (sem cor = como hoje)

**Observado:** no passo 3, o campo fica vazio, mas o seletor continua `#e8c77a` e a frase "A cor do texto na lista do celular mede 1,6:1 …" continua. No passo 4, o campo da lista volta a mostrar `#E8C77A`.

**Evidência:**

- `screenshots/CH-02-06-formato-silencioso.png` — lista vazia com o seletor `#e8c77a` e a frase de recusa ainda na tela
- console: `nada`
- rede: `nada`

### A-3 · [Editor do item › Cor do texto] Com uma cor aceita, a medida não aparece — a dona não vê o "verde" que confirma que passou

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri, a dona                                                   |
| Jornada e passo     | J-01a, ajustar até passar · passos 10 e 15 do log                     |
| TC                  | TC-FUNC-005 (passo 4)                                                 |
| Gravidade proposta  | low — a dona consegue gravar, mas sem a medida não sabe quanto a cor passou do mínimo, nem que a mudança de vermelho para verde aconteceu |
| Reproduziu          | sim (2 de 2: antes de salvar e ao reabrir o item gravado)            |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. Como `admin`, abra o editor de "Personalizados" em /admin/menu
2. Barra `#E8C77A`, lista `#8A5A2B`

**Esperado:** a medida aparece em verde, acima de 4,5:1 — **fonte:** TC-FUNC-005 passo 4; `plan.md` C-07, Design › Editor do item

**Observado:** sob os campos não aparece nenhuma medida nem frase. Só aparece texto quando a cor é recusada.

**Evidência:**

- `screenshots/CH-02-09-cores-validas.png` — as duas cores válidas, sem medida
- console: `nada`
- rede: `nada`

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| O campo hex tem limite de 7 caracteres: ` #8A5A2B ` colado com espaço vira ` #8A5A2` (sem o último dígito, sem aviso), e `#E8C77AFF` vira `#E8C77A` (outra cor, aceita em silêncio) | 05, 09 | polimento |
| A recusa da barra fala "sobre a barra no perfil Padrão" mesmo com a loja em Black Friday | 02 | polimento |
| Com as duas superfícies recusadas, o `alert` mostra só a recusa da barra (as duas frases aparecem sob os campos) | 03 | polimento |

## Fora da cobertura

- Variação "no piso" (ajustar até 4,5:1 exato, de vermelho para verde) — orçamento; e a medida verde não aparece (A-3)
- Trocar o perfil para Padrão e voltar (TC-FUNC-009 passos 1 e 3; e a recusa medida com o Padrão ativo) — a rodada começou em Black Friday; orçamento. O perfil não foi tocado
- Códigos com aspas ou travessão colados de editor de texto; digitar a lista antes da barra; voltar do navegador logo depois da recusa; "Usar a cor padrão" e escolher de novo sem salvar — orçamento
- Os mesmos códigos malformados no campo da lista: só `#12` e `#E8C77AFF` rodaram

## Debrief

- **Surpresas:** o código malformado não é recusado com frase: o Salvar só não faz nada (A-1); o campo tem limite de 7 caracteres e corta o que se cola
- **Próximo charter:** a confirmação de A-1 e A-2 deve rodar o vazio e o malformado nas duas superfícies, com uma cor válida na outra, para ver se o Salvar grava a superfície válida e o que acontece com a outra
- **Padrão novo:** colar com espaço em volta num campo com limite de caracteres — o corte silencioso transforma um código certo em errado
