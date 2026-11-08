# Sessão CH-08 · CFR — a montagem e o pedido montado no celular

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-08-cfr-montagem-e-pedido-montado.md` · cfr · P1 |
| Status      | done                                                                   |
| Persona     | PER-03 Adri com a fonte grande · conta: `admin-atelie` (credencial local, nunca o valor) |
| Tour · modo | — · —                                                                  |
| Rodada      | confirmação (r2) — só TC-CFR-001 e TC-PERSONA-002, entorno do BUG-004   |
| Orçamento   | 17 ações de browser de 18                                              |
| Ambiente    | http://localhost:8084 (app do ateliê, `feature/94` @ e8b20c6c) · build não exposto · Chromium headless (Playwright MCP) · viewports 390×844, 390×500 (teclado simulado), 320×568; fonte da raiz a 200 % |
| Paridade    | Supabase local (54441) e edge functions locais; `*.supabase.co` bloqueado por rota; fonte do sistema simulada por `font-size: 200%` no `<html>`; teclado simulado encurtando a viewport; foco programático (`focus()`) no lugar do toque real |

## Missão

Confirmar a correção do BUG-004: com a fonte a 200 %, o cabeçalho e a barra fixos da montagem não cobrem mais a tela, e o campo que a Adri digita (Nome, E-mail, WhatsApp da cliente nova) fica visível com o teclado aberto, sem rolagem lateral.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrou com a conta de administração e abriu "Montar pedido" (390×844), fonte a 200 %, "Cliente nova" | Passo 1 "Cliente". Cabeçalho `sticky` 0–161 (era 0–313 na r1); barra `fixed` 584–844 (260 px, era 321). Sobram 423 px de conteúdo. `scrollWidth` 390 | — |
| 02 | Abriu o teclado (390×500) e focou Nome, E-mail e WhatsApp | O cabeçalho deixa de ficar preso (só a barra é fixa: 240–500). Faixa livre 0–240. O foco programático põe o campo em 202–298 (Nome, WhatsApp) e 370–466 (E-mail): parte dele ou ele todo atrás da barra (`scroll-padding` `auto`). `scrollWidth` 390 | — |
| 03 | Rolou até o E-mail ficar no alto | E-mail em 60–156, visível (nada por cima); "Continuar" visível na barra (340, 96 px de altura) | `screenshots/CH-08-r2-01-teclado-200-email-visivel.png` |
| 04 | Contraprova 320×568 sem teclado, a 200 % | O cabeçalho não fica preso; barra `fixed` 308–568 (260 px), faixa livre 0–308; o Nome, rolado, fica em 60–156 e visível. **`scrollWidth` 362**: a palavra "Opcional" do rótulo "Complemento" passa da borda (250–362). Medido duas vezes, igual. Rádios de 40×40 (dentro de rótulo clicável, como na r1) | `screenshots/CH-08-r2-02-320-200-opcional-transborda.png` |
| 05 | Saiu | O menu da conta não foi procurado (orçamento); `localStorage`/`sessionStorage` do contexto limpos e browser fechado | — |

**Edge cases tentados:** fonte 200 %; teclado simulado (390×500); 320×568.

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-CFR-001 | pass | 01–04 | `screenshots/CH-08-r2-01-teclado-200-email-visivel.png`, `screenshots/CH-08-r2-02-320-200-opcional-transborda.png` | A meta que falhou na r1 passa: com o teclado aberto o campo focado fica visível rolando, e o "Continuar" segue visível; cabeçalho e barra não se sobrepõem mais. Ressalvas, sem bloqueio: o foco programático não desvia da barra (sugestão S-1), e a 320×568 / 200 % o rótulo "ComplementoOpcional" causa 42 px de rolagem lateral (sugestão S-2; a r1 não mediu essa tela com o endereço aberto). Passo 1 só; os outros passos e as folhas não foram remedidos (rodada de confirmação) |
| TC-PERSONA-002 | pass | 01–04 | `screenshots/CH-08-r2-01-teclado-200-email-visivel.png` | A fricção 1 da persona que derrubou a r1 (não ver o que digita) não se reproduz: com o teclado aberto sobra uma faixa de 240 px (390×500) e 308 px (320×568) para o campo. A montagem completa a 200 % não foi refeita nesta rodada; na r1 ela foi concluída a 390×844 |

Contagem: pass 2 · fail 0 · blocked 0 · skip 0

## Achados

nada — nenhuma regressão e nenhum critical/high novo. Duas sugestões de backlog:

- **S-1 (low)** · [Montagem] Com a fonte a 200 % e o teclado aberto, o campo focado fora da tela cai atrás da barra fixa (260 px) — `scroll-padding-bottom` é `auto`. Com o toque real a Adri toca num campo que já está na faixa livre, então o efeito tende a ser pequeno; o foco vindo de "Tab"/"Próximo" do teclado pode esconder o campo seguinte. 390×500, passo 02.
- **S-2 (low/medium)** · [Montagem] A 320×568 com a fonte a 200 %, o rótulo "Complemento" + "Opcional" não quebra (o texto sai colado, "ComplementoOpcional", sem espaço — a nota A-2 da r1) e empurra a página 42 px para o lado (`scrollWidth` 362). Reproduziu 2 de 2. A r1 mediu 320 com a entrega "a cliente preenche no link", sem esse campo na tela. Evidência `screenshots/CH-08-r2-02-320-200-opcional-transborda.png`.

## CFR

| Jornada | Categoria             | Marca    | Itens que não passaram | Achado |
| ------- | --------------------- | -------- | ---------------------- | ------ |
| J-01    | Responsividade (fonte 200 %, teclado) | pass | foco programático atrás da barra (S-1); rolagem lateral a 320 pelo rótulo do Complemento (S-2) | — |

**Categorias fora:** as demais — rodada de confirmação, só o entorno do BUG-004.

## Spec-gaps

nada

## Fora da cobertura

- BUG-010 (a confirmação "Peça acrescentada." deve sumir) — não cruzou no caminho: exigiria seguir até Peças e acrescentar uma joia, além do orçamento.
- A 130 % e a 100 % não foram remedidos (passaram na r1).
- Os passos 2 a 4 da montagem, as folhas e o pedido montado a 200 % — rodada de confirmação.
- Teclado real e fonte do sistema num Android real — fora do alcance do browser headless.
- A saída pela conta do app (menu não localizado na r1; contexto limpo e fechado).

## Debrief

- **Surpresas:** a 390×500 e a 320×568 o cabeçalho do passo deixa de ser preso, e só a barra fica fixa — é isso que libera a faixa.
- **Próximo charter:** nada
- **Padrão novo:** medir `scrollWidth` também com cada opção de entrega aberta — o campo que só aparece num ramo escapou da r1.
