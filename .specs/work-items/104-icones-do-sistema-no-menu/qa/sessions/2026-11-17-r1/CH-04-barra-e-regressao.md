# Sessão CH-04 · A barra do computador e o que não podia mudar

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-04-barra-e-regressao.md` · exploratório · P1   |
| Status      | done                                                                   |
| Persona     | PER-03 Cliente no computador · conta: anonima                          |
| Tour · modo | Feature · por cenário (J-03)                                           |
| Rodada      | exploração                                                             |
| Orçamento   | 54 ações de browser de 50 (estourou 4: a parte de 390 da regressão e o fechamento) |
| Ambiente    | http://localhost:8082 · build não exposto · Chromium (agent-browser 0.39.1, headless) · viewports 1440 × 900 · 2560 × 1440 · 390 × 844 |
| Paridade    | Supabase local; `**/*.supabase.co/**` e `**/g/collect*` bloqueados; perfil de estilo Black Friday (barra #1C1A18); massa só lida (A Sobre, B Joias afetivas, C Personalizados, D Coleção Amuletos, Colar e correntes com `pingente`) |

## Missão

Confirmar que na barra do computador o item destacado se lê, mantém a cor no hover e aberto sem perder a pista de qual está aberto, e que tudo o que a dona não coloriu continua exatamente como antes do Work Item.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abriu `/` a 1440 e olhou a barra | JOIAS AFETIVAS · COLEÇÃO AMULETOS · COLAR E CORRENTES · PERSONALIZADOS · SOBRE. Cor computada: SOBRE `rgb(232, 199, 122)`; os outros quatro `rgb(247, 243, 236)` (B sem cor de barra, como o massa declara). Ícones: SOBRE etiqueta, JOIAS AFETIVAS presente (caixa com laço), PERSONALIZADOS lápis (`gravacao`), COLEÇÃO AMULETOS flor (`flor-prensada`), COLAR E CORRENTES pingente. Todo ícone `rgb(194, 160, 99)` (tom de destaque) — o da SOBRE não herda o dourado do rótulo | `screenshots/CH-04-01-barra-1440.png` |
| 02 | Passou o mouse em SOBRE | Rótulo continua `rgb(232, 199, 122)`; não pisca para branco | `screenshots/CH-04-02-hover-a.png` |
| 03 | Passou o mouse em JOIAS AFETIVAS | Painel abre (`aria-expanded=true`) com "ver tudo em Joias afetivas" e 11 linhas; B ganha a régua de 2 px (`border-bottom: 2px solid rgb(194, 160, 99)`), só B a tem; rótulo de B vai a branco `rgb(255,255,255)` como o hover de hoje dos itens sem cor (classe `hover:text-white`). Filhos `rgb(22, 21, 20)` e "ver tudo" `rgb(28, 26, 24)`, sem ícone | `screenshots/CH-04-03-painel-b-aberto.png` |
| 04 | Passou o mouse de B de volta para SOBRE | SOBRE continua `rgb(232, 199, 122)` o tempo todo. O painel de B demora a fechar (fechou dentro de 3 s, pela espera de estado); depois de fechar, nenhum item tem régua e B volta a `rgb(247, 243, 236)` | — |
| 05 | Só teclado: chegou a SOBRE por Tab (a partir de COLAR E CORRENTES) | Foco em SOBRE, `:focus-visible`, contorno padrão do browser (`outline auto`, azul); rótulo continua `rgb(232, 199, 122)` | `screenshots/CH-04-04-foco-tab-a.png` |
| 06 | Shift+Tab de volta até JOIAS AFETIVAS | O foco abre o painel de B (`aria-expanded=true`) | — |
| 07 | Tab para sair do painel de B | O foco vai direto a COLEÇÃO AMULETOS (não entra no painel) e o painel de B **continua aberto** — esperou 3 s pelo fechamento e ele não fechou. Só fechou quando o foco chegou a PERSONALIZADOS (que abre o próprio painel) | — |
| 08 | Tab de PERSONALIZADOS para SOBRE | Foco em SOBRE, dourado; o painel de PERSONALIZADOS **continua aberto** sobre a página (2ª ocorrência do passo 07) | `screenshots/CH-04-05-tab-sai-painel.png` |
| 09 | Clicou em SOBRE | Chegou a `/sobre`, título "Sobre a Uma Estrelinha" | — |
| 10 | Voltar do navegador | `/` de novo; barra igual ao passo 01 (SOBRE dourado, outros `rgb(247, 243, 236)`), nenhum painel aberto | — |
| 11 | Viewport 2560 × 1440 | Ícone e rótulo alinhados nos cinco itens (centro do ícone 157 px, centro do texto 156,3 px; distância ícone–texto 9 px em todos); a faixa não rola (1280/1280) | `screenshots/CH-04-06-barra-2560.png` |
| 12 | Viewport 390 × 844, abriu a folha ("Abrir menu") e o acordeão de Joias afetivas | Folha: Joias afetivas, Colar e correntes, Personalizados, Sobre — COLEÇÃO AMULETOS não aparece (D é só do computador). Personalizados `rgb(22, 21, 20)` (ink); filhos de B `rgb(22, 21, 20)`; "ver tudo em Joias afetivas →" `rgb(28, 26, 24)`, sem ícone | `screenshots/CH-04-07-folha-390.png` |
| 13 | Comparou a barra com a de partida do CH-01 (`screenshots/CH-01-01-loja-1440-partida.png`, mesma faixa recortada) | COLEÇÃO AMULETOS (flor), COLAR E CORRENTES (pingente) e PERSONALIZADOS (lápis) com o mesmo ícone e a mesma cor de antes; só mudaram os ícones de JOIAS AFETIVAS (antes `gota-afetiva`, agora presente) e SOBRE (antes `estrela`, agora etiqueta) e o rótulo de SOBRE (antes creme, agora dourado) — exatamente o que a dona gravou | `screenshots/CH-04-01-barra-1440.png` × `screenshots/CH-01-01-loja-1440-partida.png` |

**Edge cases tentados:** só teclado (Tab pela barra, foco abre o painel) · viewport enorme 2560 × 1440 · voltar do navegador depois de clicar em A · mouse de A para B e de volta

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-JOURNEY-003 | pass | 01–04, 09–11 | `screenshots/CH-04-01-barra-1440.png` · `screenshots/CH-04-03-painel-b-aberto.png` | variações viewport enorme e voltar também passam |
| TC-FUNC-011 | fail | 01–08 | `screenshots/CH-04-05-tab-sai-painel.png` | passos 1–4 passam (parado, hover, foco por Tab, régua de 2 px no aberto; nenhum item com cor de barra tem submenu na massa, então "mantém a cor aberto" não se aplica); a variação J-03a falha ⇒ A-1. Variação "superfície certa": a barra usa `#E8C77A`, não a cor da lista — passa |
| TC-REG-001 | pass | 01, 03, 12, 13 | `screenshots/CH-04-07-folha-390.png` · `screenshots/CH-04-01-barra-1440.png` | B, C, D `rgb(247, 243, 236)` na barra; hover dos sem cor vai a branco como antes; D com a mesma flor de antes; folha com C, filhos e "ver tudo" em ink/primary sem ícone; variação "faixa que rola" não se aplica (a faixa não rola) |

Contagem: pass 2 · fail 1 · blocked 0 · skip 0

## Achados

### A-1 · [Barra do computador] o painel do mega menu fica aberto quando o foco sai por Tab para um item sem submenu — para quem navega por teclado

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-03 Cliente no computador                                          |
| Jornada e passo     | J-03a (sair do painel por Tab) · passos 07 e 08 do log                |
| TC                  | TC-FUNC-011 (variação J-03a)                                          |
| Gravidade proposta  | medium — a cliente conclui, mas o painel de um departamento fica cobrindo a página enquanto o foco está em outro item, e ela não sabe qual está "aberto" |
| Reproduziu          | sim (2 de 2 — com Joias afetivas e com Personalizados)                |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. Anônima, `http://localhost:8082/` a 1440 × 900
2. Pelo teclado, levar o foco a PERSONALIZADOS (ou JOIAS AFETIVAS): o painel do mega menu abre
3. Apertar Tab: o foco vai ao próximo item da barra (SOBRE, ou COLEÇÃO AMULETOS), que não tem submenu

**Esperado:** o painel fecha; foco visível no rótulo colorido de A — **fonte:** TC-FUNC-011, variação J-03a

**Observado:** o foco chega a SOBRE (visível, dourado), mas o painel de PERSONALIZADOS continua aberto (`aria-expanded=true`, "ver tudo em Personalizados" visível). Com JOIAS AFETIVAS → COLEÇÃO AMULETOS, o painel ficou aberto por mais de 3 s, até o foco abrir o painel de outro item. Provavelmente pré-existente (o comportamento do painel não depende da cor nem do ícone) — a triagem decide.

**Evidência:**

- `screenshots/CH-04-05-tab-sai-painel.png` — foco em SOBRE com o painel de Personalizados aberto
- console: nada lido
- rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| Na barra, Tab a partir de um item com painel salta para o próximo item da barra; os links do painel (filhos e "ver tudo") não entram na ordem de Tab logo depois do item aberto | 07 | pré-existente |

## Fora da cobertura

- Movimento reduzido — orçamento esgotado
- Faixa que rola com muitos itens — a massa tem 5 itens e a faixa não rola a 1440 nem a 2560; não há como provocar sem alterar dado
- Enter para abrir o painel pelo teclado — o foco já abre o painel; Enter num link navegaria, não foi tentado
- Cor de A e B na folha do celular — fora do escopo (CH-03). Nota: a leitura de cor no passo 12 foi do elemento (botão/link), não do texto interno; os `rgb(22, 21, 20)` de Joias afetivas e Sobre ali não provam a cor da lista e não foram usados
- Comparação de D com a partida feita a olho em recorte das duas screenshots (sem ferramenta de diff de pixel no ambiente)

## Debrief

- **Surpresas:** o foco do teclado abre o painel; o fechamento do painel no hover tem atraso (não é achado: fechou dentro de 3 s); no teclado ele não fecha ao sair para item sem submenu (A-1)
- **Próximo charter:** nada — o CFR (CH-05) cobre teclado e movimento reduzido
- **Padrão novo:** sair por Tab de cada painel do mega menu para um item sem submenu
