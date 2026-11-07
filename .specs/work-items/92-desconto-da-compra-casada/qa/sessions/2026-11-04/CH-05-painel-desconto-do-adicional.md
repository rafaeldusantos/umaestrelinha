# Sessão CH-05 · A dona grava, recusa e pré-visualiza o desconto de cada adicional

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-05-painel-desconto-do-adicional.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-02 Adri (painel) · conta: `admin-painel` — premissa da thread: o usuário de desenvolvimento do `supabase/seed.sql` (seção 5, só local), porque `QA_ADMIN_PAINEL_*` não estão definidas |
| Tour · modo | Garbage · com tour                                                     |
| Rodada      | exploração                                                             |
| Orçamento   | 46 ações de browser de 50                                              |
| Ambiente    | painel http://localhost:8083 · loja http://localhost:8082 · build não exposto · Chromium headless (Playwright MCP) · viewports 1440 · 1024 · 390 |
| Paridade    | banco local com massa sintética preparada pela thread; `*.supabase.co` e `/g/collect` bloqueados por rota |

## Missão

Maltratar o campo do percentual como a dona faria com pressa — "10%", "10,5", "0", "051", colar de planilha — e
confirmar que nada inválido é gravado em silêncio, que o válido é gravado e que a prévia diz o mesmo preço que a
loja vai mostrar.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrou no painel e abriu "QA Pingente Estrela" → aba "Compre junto" (1440) | 3 adicionais: lista "QA Correntes" com 10 e a prévia "As peças de QA Correntes saem de R$ 62,91 a R$ 116,91 com esta joia."; "QA Berloque Coração" com 15 e "sai de R$ 59,42 a R$ 63,67"; "QA Medalha Afetiva" com o campo vazio e sem prévia. Campo é um `spinbutton` "Desconto em percentual" com o sufixo % e o texto de ajuda "Desconto ao levar junto" | — |
| 02 | Digitou 0 no Berloque e clicou Salvar | Alerta junto do campo e toast: "O desconto ao levar junto é um número inteiro de 1% a 50%."; o cabeçalho segue "Alterações não salvas" | `screenshots/CH-05-02-recusa-0.png` |
| 03 | Digitou, pelo teclado, 51 · "10,5" · "10.5" · "10%" · "abc" · "051" · " 12 " · "10⇥" (colar de planilha) · "-5" · "1e1" | 51, 10,5 (vira 10.5), 10.5, 051, -5: recusa com a mesma frase e a prévia some. "10%": o navegador descarta o %, fica 10 e a prévia aparece. "abc": o campo fica vazio, sem alerta nem prévia. " 12 ": fica 12, prévia R$ 61,51–65,91. "10⇥": fica 10. "1e1": aceito como 10, prévia de 10 % | — |
| 04 | Salvou com "1e1" no campo e recarregou | Gravado sem aviso; ao recarregar o campo mostra 10 | — |
| 05 | Digitou 51, clicou Salvar (recusado) e recarregou | O navegador pediu confirmação de saída (beforeunload) — aceito; o campo voltou com 10. O painel ofereceu "Há um rascunho não salvo deste produto…"; "Restaurar rascunho" trouxe o 51 de volta já com o alerta de recusa | — |
| 06 | "Descartar" o rascunho | Diálogo "Manter editando / Descartar"; confirmado, saiu da página | — |
| 07 | Trocou 10 → 12 → 10 → 12 no Berloque | Indicador "Alterações não salvas" aparece ao digitar 12 e continua ao voltar a 10 (ver spec-gap) | — |
| 08 | Salvou com 12; depois salvou de novo sem mudar nada; recarregou | 1º Salvar: `PATCH /rest/v1/products` + `POST /rest/v1/product_buy_together`. 2º Salvar: só `PATCH /rest/v1/products`, nenhuma gravação do Compre Junto. Ao recarregar: 10 · 12 · vazio, mesma ordem e mesmas peças | `screenshots/CH-05-08-gravado-12.png` |
| 09 | Abriu "QA Pingente Lua" em outra aba → Compre junto | O Berloque segue a 20 % em Q (prévia "sai de R$ 55,92 a R$ 63,92"); adicionais de Q inalterados | — |
| 10 | Duas abas: salvou 25 no Berloque em Q e 14 no Berloque em P | As duas gravaram sem erro ("Alterações não salvas" sumiu nas duas) | — |
| 11 | Loja, página de Q | "QA Berloque Coração, 25% a menos levando junto" — cada joia com o seu percentual | — |
| 12 | Loja, página de P (anônima, 1440) | Correntes: "de R$ 89,90 por R$ 80,91 · 10% a menos levando junto"; Berloque: "de R$ 69,90 por R$ 60,11 · 14% a menos levando junto" (= 69,90 × 0,86); Medalha só "R$ 149,90". "Ver os 2 modelos" das Correntes: Veneziana de R$ 89,90 por R$ 80,91 e Cartier de R$ 119,90 por R$ 107,91 — só esses dois | `screenshots/CH-05-12-loja-P-14.png` |
| 13 | Painel, a lista "QA Correntes" em /admin/compre-junto | 5 peças: Veneziana (a partir de R$ 89,90), Cartier (a partir de R$ 119,90, 2 de 4 variações), Corrente Esgotada (R$ 79,90), o próprio QA Pingente Estrela, e QA Berloque Coração (a partir de R$ 69,90, 3 variações) | — |
| 14 | Limites e vazio no Berloque de P, cada um salvo e recarregado: 1 · 50 · "   " (só espaços) | 1 → prévia "R$ 69,20 a R$ 74,15", gravado 1. 50 → "R$ 34,95 a R$ 37,45", gravado 50. Só espaços → campo vazio, sem prévia, gravado vazio (não 0) | — |
| 15 | Loja, P, depois de gravar vazio no Berloque | Berloque e Medalha sem "de/por" e sem "% a menos"; Correntes segue 10 %. As Correntes de novo só com Veneziana e Cartier (2ª reprodução do passo 12) | — |
| 16 | Painel em 1024 e 390 com 10 no Berloque | O bloco empilha; a prévia "sai de R$ 62,91 a R$ 67,41" continua legível; `scrollWidth` = largura da viewport nas duas (sem rolagem lateral) | `screenshots/CH-05-14-prevview-1024.png` · `screenshots/CH-05-14-prevview-390.png` · `screenshots/CH-05-14-aba-390.png` |
| 17 | Duplo clique no Salvar (1440) com 10 | Uma gravação só (`PATCH products` + um `POST product_buy_together`), toast "Produto atualizado / As alterações já estão na loja."; recarregado: 10, 3 adicionais. Saiu da conta | — |

**Edge cases tentados:** colar de planilha ("10⇥") · valor com espaço antes e depois · apagar o valor (só espaços) e salvar · duplo clique no Salvar · mesma premissa em duas abas (P e Q salvando percentuais diferentes) · sair da página com alteração não salva (beforeunload) · viewport 390 e 1024 · notação científica "1e1" (improvisado) · restaurar rascunho com valor inválido (improvisado) · negativo "-5" (improvisado)

## Casos

| TC     | Veredito | Passo | Evidência | Nota |
| ------ | -------- | ----- | --------- | ---- |
| TC-SMOKE-003 | pass | 01, 08, 14 | `screenshots/CH-05-08-gravado-12.png` | prévia = preço × (1 − p), a centavo (12 %: 61,51; 1 %: 69,20; 50 %: 34,95); gravado e mantido ao recarregar. A massa já vinha com percentuais; o passo foi refeito trocando valores |
| TC-JOURNEY-003 | fail | 01, 12, 13, 15 | `screenshots/CH-05-12-loja-P-14.png` | peça avulsa: prévia e loja batem (14 %: R$ 60,11 nas duas). Lista: a faixa da prévia começa em R$ 62,91, preço que nenhuma corrente oferecida na loja tem ⇒ A-1. Troca de variação na loja não exercitada (orçamento) |
| TC-FUNC-001 | pass | 01, 14, 15 | — | o adicional sem percentual tem o campo vazio; só espaços grava vazio, nunca 0; loja sem "de/por". A linha do desconto no total do bloco não foi conferida |
| TC-FUNC-002 | pass | 02, 03, 05, 14 | `screenshots/CH-05-02-recusa-0.png` | 0, 51, 10,5, 10.5, 051 e -5 recusados com a frase, junto do campo e em toast; recarregar mantém o valor gravado. "10%"/"abc" o próprio campo numérico filtra (ver spec-gap). Limites 1 e 50 gravados |
| TC-FUNC-003 | pass | 07, 08, 05 | — | mudar só o percentual grava; salvar sem mudar não escreve `product_buy_together`; sair com alteração pede confirmação. A variação "15 → 12 → 15 sem alteração a salvar" não passa, mas é o comportamento do formulário inteiro ⇒ spec-gap pré-existente |
| TC-FUNC-004 | pass | 09, 10, 11 | — | P a 12 e depois 14; Q seguiu a 20 % e, na variação das duas abas, cada joia ficou com o seu (P 14, Q 25) no painel e na loja |
| TC-FUNC-005 | pass | 01, 14, 16 | `screenshots/CH-05-14-prevview-390.png` | faixa "de R$ X a R$ Y" para peça com variações de preços diferentes e para a lista; inválido ⇒ sem prévia; vazio ⇒ sem prévia; empilha abaixo de 1024. A conferência da faixa da lista contra a loja está em A-1. Não havia peça avulsa de preço único na massa de P (passo 1 do TC não exercitado com preço único) |

Contagem: pass 6 · fail 1 · blocked 0 · skip 0

## Achados

### A-1 · [Painel · prévia da lista] a faixa da lista "QA Correntes" inclui um preço que a loja não oferece com esta joia — para a dona

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Adri (painel)                                                  |
| Jornada e passo     | J-02, passo 5 (comparar com a loja) · passos 01, 12, 13, 15 do log    |
| TC                  | TC-JOURNEY-003                                                        |
| Gravidade proposta  | high — a dona confia na prévia ("por quanto a peça sai") e a loja não mostra nenhuma corrente pelo preço mais baixo que a prévia anuncia; abre a dúvida sobre o painel inteiro |
| Reproduziu          | sim (2 de 2) — a prévia em dois carregamentos, a loja em dois carregamentos |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. `admin-painel`, `/admin/produtos/<id de "QA Pingente Estrela">/editar`, aba "Compre junto"
2. No adicional 1 (lista "QA Correntes", 10 %) ler a prévia: "As peças de QA Correntes saem de R$ 62,91 a R$ 116,91 com esta joia."
3. Em outra aba, anônima, `http://localhost:8082/produtos/qa-pingente-estrela` → no bloco Compre junto, "Ver os 2 modelos" de QA Correntes

**Esperado:** a faixa da prévia é a das peças que a loja oferece com esta joia — aqui Veneziana (R$ 89,90 → R$ 80,91) e Cartier (R$ 119,90 → R$ 107,91) — e a loja mostra o mesmo preço levando junto que a prévia — **fonte:** `prd.md` CA-01.5 e CA-02.1; TC-JOURNEY-003 ("o preço levando junto da loja = o da prévia").

**Observado:** a prévia começa em R$ 62,91 = R$ 69,90 × 0,90, que é o preço de "QA Berloque Coração" — peça que está na lista (passo 13) mas que a loja não mostra dentro de QA Correntes nesta joia (só Veneziana e Cartier). O teto R$ 116,91 (= R$ 129,90 × 0,90) também não aparece nos dois modelos mostrados (a Cartier mostra R$ 119,90 → R$ 107,91); a sessão não abriu as variações da Cartier para saber se alguma liberada custa R$ 129,90. A Corrente Esgotada (R$ 79,90) não parece entrar no piso. Hipótese, não verificada: a loja tira da lista a peça que já é um adicional avulso da joia (o Berloque é o adicional 2) e a prévia não tira.

**Evidência:**

- `screenshots/CH-05-12-loja-P-14.png` — o bloco na loja com só a Veneziana/Cartier em "QA Correntes" (fechado; a lista aberta foi lida no snapshot)
- console: nada
- rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta |
| ----------------------- | ------------ | --------------- |
| "1e1" é aceito e gravado como 10, sem aviso (o campo é numérico do navegador e a notação científica passa como inteiro) | 03, 04 | polimento |
| "abc" e "10%": o campo numérico do navegador descarta o que não é número — "abc" deixa o campo vazio (que significa "sem desconto") sem frase de recusa; "10%" vira 10. Nenhum grava um valor diferente do que fica visível no campo | 03 | polimento |
| Desfazer a edição (12 → 10) não limpa "Alterações não salvas"; o mesmo acontece com o Nome do produto, então é do formulário inteiro | 07 | pré-existente |

## Fora da cobertura

- Trocar a variação da corrente/berloque na loja e conferir que o "de/por" acompanha e cai na faixa — orçamento
- Abrir as variações liberadas da Cartier para saber de onde vem o teto R$ 116,91 — orçamento
- A linha do desconto no total do bloco da loja (TC-FUNC-001 passo 3) com o adicional marcado — orçamento
- Peça avulsa de preço único (TC-FUNC-005 passo 1): a massa de P só tem peças com variações de preços diferentes
- Colar de verdade pela área de transferência: o "colar de planilha" foi simulado digitando "10" + Tab
- A massa ficou alterada pela sessão: Berloque em P = 10 (era 15), Berloque em Q = 25 (era 20). A thread reaplica

## Debrief

- **Surpresas:** o rascunho automático guarda valores inválidos e os restaura com a recusa — correto, mas é um segundo caminho de entrada que o charter não previa. A loja esconde o Berloque dentro da lista Correntes nesta joia, e a prévia não.
- **Próximo charter:** a prévia da lista contra a loja em joias onde uma peça da lista também é adicional avulso, e com variações não liberadas (de onde vem cada ponta da faixa).
- **Padrão novo:** notação científica ("1e1") em campo numérico — candidato ao tour Garbage.
