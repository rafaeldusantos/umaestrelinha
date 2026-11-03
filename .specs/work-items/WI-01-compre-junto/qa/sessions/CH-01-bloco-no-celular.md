# Sessão CH-01 · O bloco Compre Junto no celular, da página à sacola

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-01-bloco-no-celular.md` · exploratório · P0    |
| Status      | done                                                                   |
| Persona     | PER-01 Marina · conta: anonima                                         |
| Tour · modo | Feature · por cenário (J-01) — rodada de confirmação, sem tour         |
| Rodada      | confirmação (rodada 2) — TC-FUNC-005 e TC-UI-001, e o entorno de BUG-003, BUG-005 e BUG-002 |
| Orçamento   | 24 ações de browser de 25 (três delas foram erros de ref/caminho de screenshot, contadas mesmo assim) |
| Ambiente    | http://localhost:8082 (dev server, worktree feature/WI-01) · build não exposto · Chromium (Playwright MCP, headless) · viewports 390 × 844 e 1440 × 900 |
| Paridade    | dev server em vez de build; banco Supabase local com a massa QA-*; `*.supabase.co` e `**/g/collect*` bloqueados por rota; sacola local limpa no início e no fim |

## Missão

Confirmar que quem abre o pingente pela primeira vez no celular entende o bloco, monta pingente e corrente e leva pela barra fixa exatamente o que marcou, em menos de um minuto por tela.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abrir `/produtos/qa-pingente-estrela` em 390 × 844, anônima, sacola vazia | Bloco "Compre junto" entre a variação e "Em estoque", frase literal, três linhas desmarcadas, preço da peça sem "a partir de" (R$ 89,90 · R$ 69,90 · R$ 149,90), links "Ver os 2 modelos" / "Ver opções"; `status` do total vazio; barra R$ 259,90 · R$ 241,71 no Pix · "Adicionar à sacola" | `screenshots/R2-CH-01-01-bloco-nada-marcado.png` |
| 02 | Marcar "QA Correntes" sem escolher a peça | Abre "Escolha a peça · 2 modelos" (Veneziana, Cartier); o link "Ver os 2 modelos" some com a linha marcada; **nenhuma** frase de falta ainda (BUG-005: só depois de tentar); rodapé "Total do conjunto R$ 259,90 · R$ 241,71 no Pix" + nota; `status` "Total do conjunto: R$ 259,90, R$ 241,71 no Pix"; barra "Conjunto · 2 peças" · "Levar o conjunto" | — |
| 03 | Tocar "Levar o conjunto" na barra fixa | Nada entrou (gaveta não abriu); `alert` "Falta uma escolha em 1 peça. Ela está marcada acima."; a linha diz "Escolha a peça." (`status`); a página rolou (scrollY 796) e a frase ficou em 362–380 px, visível | `screenshots/R2-CH-01-02-falta-escolha.png` |
| 04 | Escolher a Veneziana e tocar de novo | Aparece "Comprimento" (40, 45, 50 cm); a linha diz "Escolha o comprimento da qa." (eixo em minúscula — BUG-003 corrigido); nada entrou; o `alert` continua "Falta uma escolha em 1 peça." | — |
| 05 | Marcar também o Berloque sem cor e tocar | A linha do Berloque diz "Escolha o cor da qa."; `alert` "Falta uma escolha em 2 peças. Elas estão marcadas acima."; barra "Conjunto · 3 peças"; nada entrou; a página ficou na primeira incompleta (frase da corrente em 312 px, scrollY 846) | — |
| 06 | Escolher 45 cm e Prata 925 no Berloque | As frases de falta e o `alert` somem; `status` anuncia "Total do conjunto: R$ 424,70, R$ 394,97 no Pix" (259,90 + 94,90 + 69,90 = 424,70; × 0,93 = 394,971 — BUG-002 corrigido); linha da corrente "QA Corrente Veneziana · 45 cm R$ 94,90", do Berloque "Prata 925 R$ 69,90"; barra "R$ 424,70 · Conjunto · 3 peças"; sem rolagem lateral (scrollWidth 390) | `screenshots/R2-CH-01-03-conjunto-completo.png` |
| 07 | Tocar "Levar o conjunto" | Gaveta "Sua sacola 3": QA Pingente Estrela Prata 925 · Não R$ 259,90 ×1; QA Corrente Veneziana 45 cm R$ 94,90 "Acompanha o QA Pingente Estrela"; QA Berloque Coração Prata 925 "Acompanha o QA Pingente Estrela"; "Subtotal (3 itens) R$ 424,70" = total do bloco | `screenshots/R2-CH-01-04-gaveta-conjunto.png` |
| 08 | Recarregar em 1440 × 900 | Bloco volta sem nenhuma marca; contêiner branco, borda 1px rgb(230,223,212), raio 20px, padding 22/22/20; título 20px/400; sem rolagem lateral (scrollWidth 1440) | `screenshots/R2-CH-01-05-bloco-1440.png` |

**Edge cases tentados:** recarregar depois de levar o conjunto (passo 08 — bloco volta sem marca). Nenhum outro, por ser confirmação.

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-005 | pass | 02–06 | `screenshots/R2-CH-01-02-falta-escolha.png` | passos 1–3 conferem. "Escolha a peça." em vez de "Escolha a corrente." aceito pela triagem da rodada 1 (o protótipo diz "Escolha a peça"; o texto do TC deve ser ajustado no plano). Frase do eixo em minúscula, conforme o protótipo (BUG-003). Nada entra pela metade; aviso de 1 e de 2 peças; rolagem à primeira incompleta |
| TC-UI-001 | pass | 01–02, 06, 08 | `screenshots/R2-CH-01-01-bloco-nada-marcado.png`, `R2-CH-01-03-conjunto-completo.png`, `R2-CH-01-05-bloco-1440.png` | confirmação do que o reteste de BUG-005 mediu: preço sem "a partir de", link some com a linha marcada, frase de falta só depois de tentar, "no Pix", superfície branca com borda e raio 20 e padding 22/22/20 em 1440, título 20/400. Conferência fina contra o protótipo (D1–D13 em 390) não refeita: já medida no reteste |

Contagem: pass 2 · fail 0 · blocked 0 · skip 0

## Achados

nada

Observação (não é achado): depois da primeira tentativa, marcar outro adicional incompleto (passo 05) mostra a frase de falta dele na hora e o `alert` já passa a "2 peças" antes do segundo toque — a marca de "já tentou" fica ligada até a página recarregar. Coerente com o protótipo (`tentou` é estado da página); registrado só para a triagem saber que foi visto.

## Spec-gaps

nada

## Fora da cobertura

- Os demais TC do charter (pass na rodada 1, sem correção no entorno) — confirmação restrita aos TC que falharam e ao entorno das correções
- Conferência D1–D13 do TC-UI-001 em 390 com `getComputedStyle` — já feita no reteste de BUG-005; aqui só os pontos visíveis e o contêiner em 1440
- Leitor de tela real para o anúncio do total — o browser da sessão só alcança o `role=status`; o anúncio de fato depende do leitor
- Formas "Em folha" e "Com fórmula" — CH-06, fora do charter

## Debrief

- **Surpresas:** nada
- **Próximo charter:** nada
- **Padrão novo:** nada
