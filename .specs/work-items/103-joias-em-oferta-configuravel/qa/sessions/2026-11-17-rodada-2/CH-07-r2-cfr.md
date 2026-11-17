# Sessão CH-07 · CFR — o editor do bloco e o bloco na Home (rodada 2, confirmação)

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-07-cfr.md` · cfr · P1                          |
| Status      | done                                                                   |
| Persona     | PER-01 Adri · conta: admin-loja — `QA_ADMIN_LOJA_*` (painel) · anonima (loja, sessão separada, sem login) |
| Tour · modo | — · —                                                                  |
| Rodada      | confirmação                                                            |
| Orçamento   | 62 comandos do driver de 25 — contando todo comando (rotas, viewport, waits, leituras `eval`/`snapshot`, logout e close). O estouro vem de uma tentativa de login refeita (a primeira navegou antes de a sessão firmar) e das medidas por `eval` que o briefing pediu. Interações da persona propriamente ditas: ~15 |
| Ambiente    | painel http://localhost:8083 · loja http://localhost:8082 · build não exposto · Chromium (agent-browser 0.39.1, headless) · viewport 390 × 844; fonte da raiz a 100 %, 130 % e 200 % (font-size do `html`, não zoom) |
| Paridade    | servidores locais do worktree feature/103, Supabase local; `*.supabase.co` e `/g/collect` bloqueados (fotos do Storage podem faltar) |

## Missão

Refazer como auditoria a configuração do bloco e a visita da cliente à Home, procurando onde o editor deixa de ser
usável no celular, com fonte grande ou só pelo teclado, onde o bloco desloca ou estoura a página, e onde um texto
novo quebra o tom memorial. **Nesta rodada:** só confirmar TC-CFR-001 (BUG-004) e TC-CFR-002 (BUG-003).

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrar no painel em 390 × 844 e abrir o editor de B-1 ("Joias em oferta", "Dia das Mães · em vigência até 30/11 às 23:59") | Editor em `/admin/home/e50a633d-…`, com "Peças escolhidas" (3 peças) | — |
| 02 | Medir a rolagem lateral do editor com a fonte da raiz a 100 / 130 / 200 % | **Sem rolagem nas três**: scrollWidth 390 = clientWidth 390. "Salvar seção": 100 % x 219–366 (40 px de altura); 130 % x 162–353 (52 px); 200 % x 48–342 (80 px) — inteiro na tela. BUG-004 corrigido | — (valores computados) |
| 03 | A 200 %, medir o que fica fixo no topo | Duas barras grudadas: o cabeçalho do painel (`header` sticky, top 0, **112 px**) e a barra do editor ("Loja › Home › Joias em oferta · Joias em oferta · Cancelar · Salvar seção", sticky em top 112, **345 px** de altura, 294 px de largura). Juntas cobrem y 0–457 de 844 — **54 % da tela**; sobram 387 px para o conteúdo. A barra de 345 px do reteste: **confirmada** | — (valores computados) |
| 04 | Levar o foco a cada controle de "Peças escolhidas" (subir/descer/remover das 3 peças) e ver se fica à vista | Os controles têm nome ("Subir a 1ª peça", "Descer a 1ª peça", "Remover a 1ª peça", …; 88 × 88 px). Quando o foco faz a página **subir** até o controle, ele para em y 378–466, e a barra termina em 457: sobram 9 px do botão à vista; no centro dele está a barra (`elementFromPoint` = outro botão). 5 dos 8 controles focáveis caíram assim | — (valores computados) |
| 05 | Só teclado, para a frente: Tab a partir de "Descer a 2ª peça" (2×) | Foco em "Subir a 3ª peça", y 756–844, **à vista**, com contorno sólido. Para a frente o foco aparece | `screenshots/CH-07-r2-01-tab-frente-foco-visivel-200.png` |
| 06 | Só teclado, para trás: rolar a página para baixo e Shift+Tab | Foco em "Remover a 2ª peça", y 378–466, **debaixo da barra** (112–457) — a persona não vê onde está o foco. Reproduz o passo 04 (2 de 2) | `screenshots/CH-07-r2-02-shift-tab-foco-coberto-200.png` |
| 07 | Pelo toque, alcançar os controles a 200 % | Alcançáveis rolando: a janela livre de 387 px comporta uma linha de controles (88 px) com folga; o toque funciona, mas a lista de peças é vista por uma fresta de 46 % da tela | — |
| 08 | Voltar a fonte, **Cancelar** o editor (nada salvo), sair da conta | De volta em `/admin/home`; "Sair" → `/admin/login` | — |
| 09 | Loja sem login, Home em 390 × 844, fonte da raiz a 100 % | **Sem rolagem lateral**: scrollWidth 390. BUG-003 corrigido | — (valores computados) |
| 10 | Mesma Home a 200 % | scrollWidth **434** (44 px de rolagem). O bloco B-1 **não** estoura: a seção vai de 0 a 390 (scrollWidth 390), título e descrição em x 32–358, sem corte (scrollWidth = clientWidth). Quem passa da borda: um `div` do **cabeçalho da loja** (x 266–426) e as setas de **"Decorativos"** ("Próximo" x 315–395). Os cartões das fileiras que vão além de 390 estão dentro de contêiner rolável, não contam | `screenshots/CH-07-r2-03-home-390-200.png` |
| 11 | `/ofertas` em 390, para comparar | 100 %: scrollWidth 390. 200 %: scrollWidth **552** — "Ver em uma coluna" (x 331–403) e um `span` (x 290–402) passam da borda. Página fora da superfície do bloco | — (valores computados) |

**Edge cases tentados:** nada novo (rodada de confirmação) — só as variações que o TC já traz (130 % no editor).

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-CFR-001 | fail | 02–07 | `screenshots/CH-07-r2-02-shift-tab-foco-coberto-200.png` | A rolagem lateral (BUG-004) está corrigida: 390 nas três fontes, "Salvar seção" inteiro. Mas a 200 % o editor não fica plenamente usável: a barra de ações grudada tem 345 px (+112 do cabeçalho = 54 % da tela) e o foco que sobe cai debaixo dela ⇒ A-1. Rótulos, recusa como alerta e Tab até o Salvar não foram refeitos (Fora da cobertura) |
| TC-CFR-002 | pass | 09–11 | `screenshots/CH-07-r2-03-home-390-200.png` | BUG-003 corrigido: Home a 100 % sem rolagem. A 200 % o corpo rola 44 px, mas por elementos que o WI não tocou (cabeçalho da loja, setas de "Decorativos"); o bloco B-1 fica em 0–390 e título/descrição inteiros. A rolagem a 200 % é `pré-existente` — `/ofertas` também rola (552) |

Contagem: pass 1 · fail 1 · blocked 0 · skip 0

## Achados

### A-1 · [Editor do bloco] a 200 % a barra de ações grudada ocupa metade da tela e esconde o foco dos controles de "Peças escolhidas"

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-01, ordenar as peças escolhidas · passos 03–06 do log               |
| TC                  | TC-CFR-001                                                            |
| Gravidade proposta  | medium — Adri, com a fonte grande no celular, conclui a ordenação, mas trabalha a lista por uma fresta de 387 px e, pelo teclado, perde de vista o controle focado ao voltar com Shift+Tab |
| Reproduziu          | sim (2 de 2 — foco programático nos 8 controles e Shift+Tab real)     |
| Viewport            | 390 × 844, font-size da raiz 200 %                                    |

**Passos para reproduzir** — de um estado limpo:

1. Painel `http://localhost:8083`, conta `admin-loja`, viewport 390 × 844; `/admin/home` → "Abrir Joias em oferta"
2. Aumentar o font-size da raiz (`html`) para 200 %
3. Rolar até "Peças escolhidas"; Tab até "Subir a 3ª peça"; rolar a página para baixo e Shift+Tab

**Esperado:** o editor continua usável a 200 % no celular, com foco visível nos controles de subir/descer/remover — **fonte:** PRD RNF-04; TC-CFR-001 passos 1 e 2 ("foco visível"); cfr.md › Acessibilidade (foco visível, sem quebra a 200 %)

**Observado:** cabeçalho do painel sticky 0–112 px + barra do editor ("Loja › Home › Joias em oferta · Joias em oferta · Cancelar · Salvar seção") sticky 112–457 px (345 px de altura) ⇒ 54 % de 844 coberto o tempo todo. Ao voltar o foco (Shift+Tab, ou foco que rola a página para cima), o controle para em y 378–466 — 9 px à vista, o resto debaixo da barra. Para a frente (Tab) o foco aparece no rodapé da tela. Pelo toque os controles se alcançam rolando. A rolagem lateral do BUG-004 não volta: scrollWidth 390.

**Evidência:**

- `screenshots/CH-07-r2-02-shift-tab-foco-coberto-200.png` — foco em "Remover a 2ª peça" debaixo da barra
- `screenshots/CH-07-r2-01-tab-frente-foco-visivel-200.png` — contraste: Tab para a frente, foco à vista
- console: não lido
- rede: nada

## CFR

| Jornada | Categoria             | Marca    | Itens que não passaram | Achado |
| ------- | --------------------- | -------- | ---------------------- | ------ |
| J-01    | Compatibilidade       | pass     | — (sem rolagem lateral a 100/130/200 %) | — |
| J-01    | Usabilidade           | friction | barra de ações grudada com 345 px a 200 % | A-1 |
| J-01    | Acessibilidade        | friction | foco coberto pela barra ao voltar com Shift+Tab a 200 % | A-1 |
| J-02    | Compatibilidade       | pass     | — no bloco; a rolagem a 200 % vem de elementos pré-existentes | — |

**Categorias fora:** Performance percebida, Recuperação de erro — rodada de confirmação, só os dois bugs corrigidos. Paridade: no cabeçalho.

## Spec-gaps

nada

## Fora da cobertura

- TC-CFR-001: rótulos (snapshot), recusa com 61 caracteres como alerta, Tab do título até o Salvar e foco visível no seletor de campanha — não refeitos nesta rodada (orçamento estourado nas medidas pedidas; passaram na rodada 1, exceto o que BUG-004 cobria)
- TC-CFR-002: rede lenta e deslocamento do rodapé — o `agent-browser` não atrasa resposta; 320 × 568 e 1440 × 900 — fora do escopo da confirmação
- Rolagem lateral da Home a 200 % pelo cabeçalho da loja e pelas setas de "Decorativos", e de `/ofertas` a 200 % — `pré-existente`, fora da superfície da Mudança (não vira achado deste WI)
- Engines além do Chromium

## Debrief

- **Surpresas:** o foco só some para trás (Shift+Tab); para a frente aparece no rodapé da tela
- **Próximo charter:** nada
- **Padrão novo:** com barra grudada alta, testar o foco nas duas direções (Tab e Shift+Tab) e medir a fresta livre do viewport
