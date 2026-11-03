# Sessão CH-04 · Painel e loja em duas abas: o que a dona muda chega à loja e ao relatório

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-04-painel-e-loja-em-duas-abas.md` · exploratório · P1 |
| Status      | done                                                                   |
| Persona     | PER-02 Adri · conta: `admin-painel` (`QA_ADMIN_PAINEL_*`); loja em outra aba, sem login |
| Tour · modo | Multi-Tab · com tour                                                   |
| Rodada      | exploração                                                             |
| Orçamento   | ~51 ações de browser de 70 (parte A ~32 · parte B ~19)                 |
| Ambiente    | painel http://localhost:8083 · loja http://localhost:8082 · build não exposto (dev server) · Chromium headless (Playwright MCP) · viewports 1440 × 900 e 390 × 844 |
| Paridade    | dev server em vez de build; banco Supabase local; `*.supabase.co` e `/g/collect` bloqueados por rota; pedidos do relatório são a massa sintética M-08 (#0328–#0333), gravada pela thread no banco |

## Missão

Achar qualquer estado velho ou perda de atualização entre o que a dona muda no painel e o que a loja e o relatório mostram, vivendo com o painel e a loja abertos lado a lado.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrou no painel e abriu Catálogo › Compre Junto (1440) | Escolha da forma com "Na linha" marcada; índice "QA Correntes · 5 de 12 · 2 joias", "QA Probe Sem Venda · 1 de 12 · Nenhuma joia" | — |
| 02 | Abriu a aba Adesão, antes de qualquer M-08 (abre em 30 dias) | Três indicadores em 0: "0 · 0% dos 5 pedidos pagos", "0 · sem média no período", "R$ 0,00"; texto "Nenhum pedido teve peças compradas junto nos últimos 30 dias." Sem NaN/Infinity. O pedido PENDENTE com Compre Junto do CH-02 não conta | `screenshots/CH-04-01-adesao-vazia-1440.png` |
| 03 | Trocou para 7 e 90 dias | 7 dias: "0% do 1 pedido pago" + "Nenhum pedido teve peças compradas junto nos últimos 7 dias."; 90 dias: "0% dos 17 pedidos pagos" + texto equivalente. URL não muda com o período | — |
| 04 | Adesão em 390 × 844 (7 dias) | Sem rolagem lateral (scrollWidth 390) | `screenshots/CH-04-02-adesao-vazia-7d-390.png` |
| 05 | Índice em 390 | Tabela escondida, cartões "QA Correntes · 5 peças · 2 joias", "QA Probe Sem Venda · 1 peça · Nenhuma joia"; sem rolagem lateral | `screenshots/CH-04-03-indice-390.png` |
| 06 | Loja (aba B), M-01, marcou o Berloque com "Na linha" | As cores abrem ali mesmo, abaixo da linha ("Esconder opções") | — |
| 07 | Painel: escolheu "Em folha", salvou, recarregou | "Em folha" marcada após recarga | — |
| 08 | Loja: recarregou M-01 e marcou o Berloque; depois M-03 e marcou "QA Correntes" | Diálogo com as escolhas e o botão "Incluir no conjunto" nas duas joias | `screenshots/CH-04-04-em-folha-m01-1440.png` |
| 09 | Painel: "Com fórmula", salvou; loja recarregada em M-01 e M-03 | Faixa "Esta joia + QA Correntes + QA Berloque Coração + QA Medalha Afetiva" (M-01) e "Esta joia + QA Correntes" (M-03) acima da lista; escolhas na linha | `screenshots/CH-04-05-com-formula-m03-1440.png` |
| 10 | Painel: voltou a "Na linha", salvou, recarregou; loja recarregada em M-03 | "Na linha" marcada; loja sem a faixa, escolhas na linha. **Forma restaurada** | — |
| 11 | Abriu o editor de "QA Correntes" | Lateral "Em uso · 2 joias oferecem esta lista: QA Pingente Estrela, QA Pingente Lua" | `screenshots/CH-04-06-editor-correntes.png` |
| 12 | Abriu o mesmo editor numa 2ª aba do painel (aba C); na aba A subiu a Cartier e tirou a Veneziana, salvou ("Lista salva.") | Loja recarregada: M-01 "Escolha a peça · 1 modelo: Cartier"; M-03 "3 modelos: Cartier, Pingente Estrela, Berloque" | `screenshots/CH-04-07-lista-editada-m03.png` |
| 13 | Na aba C (ainda com a lista antiga, sem recarregar), subiu o Berloque e salvou | "Lista salva." sem aviso; recarregando a aba A, a lista é a da aba C: Veneziana volta, a ordem da aba A some (V, C, E, B, P) — a edição da aba A foi perdida em silêncio | `screenshots/CH-04-08-duas-abas-salvar.png` |
| 14 | Restaurou a ordem na aba A (subiu o Pingente Estrela) e salvou; fechou a aba C | Lista de volta a V, C, E, P, B (conferido após recarga) | — |
| 15 | Loja M-01 aberta: marcou Correntes › Veneziana › 40 cm (total R$ 349,80). Sem recarregar a loja, no painel desativou a Veneziana ("Produto desativado — saiu da loja") | — | — |
| 16 | Na loja velha, "Levar o conjunto" | Sacola abre com "QA Pingente Estrela R$ 259,90" + "QA Corrente Veneziana 40 cm R$ 89,90 · Acompanha o QA Pingente Estrela", subtotal R$ 349,80. Depois de recarregar a loja, a Veneziana continua na sacola (estado local) | `screenshots/CH-04-09-loja-velha-leva-peca-fora-do-ar.png` |
| 17 | Loja M-01 recarregada | Lista "1 modelo: Cartier" (Veneziana pulada); Berloque (A2) e Medalha (A3) continuam | — |
| 18 | Índice do painel | "QA Correntes · 1 peça saiu do ar" e "QA Probe Sem Venda · 1 peça saiu do ar" (ela também tem a Veneziana) | `screenshots/CH-04-10-indice-peca-fora-do-ar.png` |
| 19 | Editor de QA Correntes | Linha da Veneziana com selo "saiu do ar" e "Esta peça saiu do ar. A loja a pula em todas as joias até ela voltar; tire-a da lista se não for voltar." | `screenshots/CH-04-11-editor-peca-fora-do-ar.png` |
| 20 | Busca "QA Corrente" no editor | Veneziana aparece "Já está na lista" (desabilitada por já estar, não por estar fora do ar — a variação do TC-FUNC-033 não foi exercitada) | — |
| 21 | Desativou o Berloque (produto do A2) no painel; loja M-01 recarregada | Adicionais: só "QA Correntes" e "QA Medalha Afetiva" — A2 some, A1 continua (Cartier) | `screenshots/CH-04-12-loja-m01-sem-a2.png` |
| 22 | Aba "Compre junto" do M-01 no painel | Adicional 2 "QA Berloque Coração · saiu do ar · Trocar" com "Esta peça saiu do ar. A loja pula este adicional até ela voltar; troque a peça se não for voltar."; A1 e A3 sem marca | `screenshots/CH-04-13-aba-compre-junto-a2-fora-do-ar.png` |
| 23 | Editor de QA Correntes › "Excluir lista" | Lista não excluída; "Esta lista está em uso em 2 joias (QA Pingente Estrela, QA Pingente Lua). Tire-a delas antes de excluir." Sem diálogo | `screenshots/CH-04-14-excluir-lista-em-uso.png` |
| 24 | Tentou reativar a Veneziana e o Berloque | "Ativar" desabilitado: "Para ativar, resolva o que falta em Pronto para publicar." (5 de 6 — falta "Ao menos uma categoria"; as peças de QA não têm categoria). Restauração: escolheu uma categoria no formulário sem salvar, "Ativar" ("Produto ativado — já aparece na loja"), tirou a categoria de volta e saiu sem salvar | — |
| 25 | Índice e loja M-01 depois da reativação | Índice sem "saiu do ar"; loja M-01 com A1 (Veneziana e Cartier), A2 e A3. Sacola da loja limpa | — |
| 26 | **Parte B** (M-08 gravada). Abriu a aba Adesão (1440) | Carregou em ~2,6 s com 30 dias marcado: "3 · 33% dos 9 pedidos pagos", "5 · 1,7 por pedido, em média", "R$ 449,50 · pelo preço pago em cada peça", e a nota "Conta pedidos pagos e não cancelados, no dia de Brasília — a mesma régua do Dashboard. …". Por joia: QA Pingente Estrela 3 · 5 · R$ 449,50 · QA Corrente Veneziana · 45 cm; QA Pingente Lua 1 · 1 · R$ 89,90 · QA Corrente Veneziana · 40 cm. Valor com barra (`barra-de-valor`) | `screenshots/CH-04-15-adesao-m08-30d-1440.png` |
| 27 | "Por lista" (30 dias) | Colunas Lista · Peças · Valor · Peça que mais sai (sem Pedidos). QA Correntes 4 · R$ 379,60 · Veneziana · 45 cm; "Peça escolhida direto no produto" 1 · R$ 69,90 · QA Berloque Coração · Prata 925; QA Probe Sem Venda 0 · R$ 0,00 · — | `screenshots/CH-04-16-adesao-por-lista-30d.png` |
| 28 | 7 e 90 dias | 7: "2 · 50% dos 4", "4 · 2,0 por pedido", R$ 349,60; Estrela 2 · 4 · R$ 349,60; Lua 1 · 1 · R$ 89,90; por lista QA Correntes 3 · R$ 279,70, direto 1 · R$ 69,90. 90: "3 · 14% dos 21", "5 · 1,7", R$ 449,50, recortes iguais aos de 30. O recorte escolhido (Por lista) continua marcado ao trocar de período | `screenshots/CH-04-17-por-lista-apos-trocar-periodo.png` |
| 29 | Adesão em 390 | Sem tabela visível; cartões "QA Correntes · 4 peças · R$ 379,60 · Peça que mais sai: …" e por joia "QA Pingente Estrela · 3 pedidos · 5 peças · R$ 449,50 · …"; scrollWidth 390 | `screenshots/CH-04-18-adesao-m08-390.png` |
| 30 | Tirou a Veneziana (peça vendida) da "QA Correntes" e salvou | "Lista salva." | — |
| 31 | Voltou ao relatório (30 dias) | Mesmos números: 3 · 33% dos 9 · 5 · 1,7 · R$ 449,50; por joia e por lista idênticos, "Peça que mais sai" ainda Veneziana · 45 cm | `screenshots/CH-04-19-adesao-apos-editar-lista.png` |
| 32 | Restaurou a lista: acrescentou a Veneziana de volta e subiu-a para a posição 1; salvou e recarregou | V, C, E, P, B — "Variações: todas as ativas (3)" | — |
| 33 | Criou a lista "QA CH04 Teste" (1 peça: Cartier) e ligou-a como adicional do M-04 (QA Joia Sem Compre Junto); abriu M-04 na loja (aba B) | Loja M-04 com "Levar junto: QA CH04 Teste" | — |
| 34 | "Excluir lista" em QA CH04 Teste | Recusa: "Esta lista está em uso em 1 joia (QA Joia Sem Compre Junto). Tire-a dela antes de excluir." (singular correto) | — |
| 35 | Tirou o adicional do M-04 e salvou; recarregou | "0 de 3 adicionais · Sem Compre Junto." — M-04 restaurado | — |
| 36 | Editor da QA CH04 Teste ("Nenhuma joia oferece esta lista.") › "Excluir lista" | Excluída na hora, sem confirmação: "Lista “QA CH04 Teste” excluída."; volta ao índice, que lista só QA Correntes e QA Probe Sem Venda | `screenshots/CH-04-20-lista-ch04-excluida.png` |
| 37 | Na aba B (M-04 aberta antes, sem recarregar) marcou "QA CH04 Teste" | O bloco segue oferecendo a lista apagada (Cartier, total R$ 199,90). Recarregando, o bloco some | — |
| 38 | Voltou ao relatório (30 dias, Por lista) | Números iguais aos do passo 26–27 | — |
| 39 | Saiu da conta (menu da conta › Sair) e fechou o browser | Tela de login | — |

**Edge cases tentados:** a mesma lista aberta no editor em duas abas, salvando nas duas (passo 13); loja aberta antes da mudança, sem recarregar, levando uma peça que acabou de sair do ar (passos 15–16); relatório sem pedido no período, em 7/30/90 (passos 02–03); índice e Adesão em 390 (passos 04–05); voltar do editor para o índice e conferir "em uso em N joias" (passos 01, 18, 25). Excluir a lista numa aba enquanto o produto que a usava está aberto na outra (passos 36–37, com lista nova sem venda). Loja sem recarregar depois da troca de forma: tentado no passo 10, mas a leitura capturou a região errada da página — sem observação válida.

## Casos

| TC     | Veredito | Passo | Evidência | Nota |
| ------ | -------- | ----- | --------- | ---- |
| TC-FUNC-043 | pass | 02–04 | `screenshots/CH-04-01-adesao-vazia-1440.png`, `screenshots/CH-04-02-adesao-vazia-7d-390.png` | texto escrito nos três períodos; 0% com denominador; nenhum NaN/Infinity; pendente do CH-02 fora |
| TC-FUNC-027 | pass | 01, 06 | — | "Na linha" marcada sem forma gravada; loja abre na linha |
| TC-JOURNEY-004 | pass | 07–10 | `screenshots/CH-04-04-em-folha-m01-1440.png`, `screenshots/CH-04-05-com-formula-m03-1440.png` | forma deixada em "Na linha" ao fim |
| TC-FUNC-032 | pass | 11–12 | `screenshots/CH-04-06-editor-correntes.png`, `screenshots/CH-04-07-lista-editada-m03.png` | "2 joias" no índice e os dois nomes na lateral; a peça tirada some nas duas joias |
| TC-FUNC-033 | pass | 18–19 | `screenshots/CH-04-10-indice-peca-fora-do-ar.png`, `screenshots/CH-04-11-editor-peca-fora-do-ar.png` | texto igual ao do protótipo; a variação "busca de peça fora do ar" não foi exercitada (passo 20) |
| TC-FUNC-037 | pass | 21–22, 25 | `screenshots/CH-04-13-aba-compre-junto-a2-fora-do-ar.png` | variação "reativar P": sem marca e A2 de volta à loja (passo 25) |
| TC-FUNC-021 | pass | 17, 21, 25 | `screenshots/CH-04-12-loja-m01-sem-a2.png` | variação "variações liberadas todas extintas" não feita; variação "loja aberta sem recarregar" registrada como spec-gap |
| TC-FUNC-034 | pass | 23, 33–36 | `screenshots/CH-04-14-excluir-lista-em-uso.png`, `screenshots/CH-04-20-lista-ch04-excluida.png` | passo 2 feito com a lista nova "QA CH04 Teste" ligada ao M-04 (a QA Correntes fica para o CH-08, por pedido da thread); a recusa separa os nomes por vírgula onde o TC escreve "<M-01> e <M-03>" — mesma frase já vista no CH-03 |
| TC-FUNC-041 | pass | 26, 28, 29 | `screenshots/CH-04-15-adesao-m08-30d-1440.png`, `screenshots/CH-04-18-adesao-m08-390.png` | todos os números batem com os esperados da thread nos três períodos; média com uma casa ("1,7", "2,0") |
| TC-FUNC-042 | pass | 26–29 | `screenshots/CH-04-16-adesao-por-lista-30d.png` | por joia e por lista iguais aos esperados; variação "lista apagada depois da venda" não feita (a única lista com venda fica para o CH-08) |
| TC-JOURNEY-006 | pass | 26, 30–31, 38 | `screenshots/CH-04-19-adesao-apos-editar-lista.png` | Adesão em ~2,6 s (≤ 4 s); "Lista salva." em ~0,1 s; relatório idêntico depois de tirar a peça vendida. Variação "lista apagada": feita só com lista sem venda (passo 38, números iguais) |

Contagem: pass 11 · fail 0 · blocked 0 · skip 0

## Achados

nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta |
| ----------------------- | ------------ | --------------- |
| A mesma lista aberta em duas abas do painel: salvar na aba com a versão velha sobrescreve, sem aviso, o que a outra aba salvou antes ("Lista salva." nas duas; a peça tirada volta e a ordem nova some). Nenhuma fonte define o comportamento de edição concorrente | 12–13 | polimento |
| Loja aberta antes da mudança no painel continua oferecendo o que saiu: "Levar o conjunto" põe a peça desativada na sacola, e ela continua lá depois de recarregar (passos 15–16); a página aberta antes de a lista ser apagada segue oferecendo a lista (passo 37). Recarregar corrige o bloco, não a sacola. O TC-FUNC-021 manda só registrar; não foi seguido até o checkout para ver se o pedido a recusa | 15–16, 37 | mudança |
| "Desativar" uma peça é um clique, mas "Ativar" fica bloqueado quando a peça não cumpre o "Pronto para publicar" (aqui, sem categoria) — a dona não é avisada, ao desativar, de que não vai conseguir reativar sem completar o cadastro. Comportamento do formulário de produto, não do Compre Junto | 24 | pré-existente |

## Fora da cobertura

- Variação "lista apagada depois da venda" (TC-FUNC-042, TC-JOURNEY-006): a única lista com venda é a QA Correntes, que fica para o CH-08 por pedido da thread; a exclusão foi feita com lista sem venda.
- Loja sem recarregar depois da troca de forma (variação do TC-JOURNEY-004) — leitura capturou a região errada; não repetido.
- Variação "busca de peça fora do ar" do TC-FUNC-033 — exigiria buscar a peça desativada a partir de uma lista que não a contém.
- Variação "variações liberadas todas extintas" do TC-FUNC-021 — não feita.
- Se o checkout recusa a peça desativada que ficou na sacola — fora da costura deste charter (CH-02/CH-05).
- Borda do dia de Brasília: nenhum pedido da M-08 caiu perto da virada; não exercitado.

## Estado da massa ao fim da sessão

- Forma do bloco: **"Na linha"**.
- Lista "QA Correntes": ordem original (Veneziana, Cartier, Esgotada, Pingente Estrela, Berloque), em uso em M-01 e M-03; não apagada (fica para o CH-08). Foi editada duas vezes na sessão e restaurada nas duas.
- QA Corrente Veneziana e QA Berloque Coração: ativas (a thread conferiu no banco que estão sem categoria).
- M-04: "0 de 3 adicionais" (recebeu a lista QA CH04 Teste e foi restaurado).
- Lista "QA CH04 Teste": criada e excluída.
- M-08 (#0328–#0333): intacta.
- Sacola da loja limpa; logout feito; browser fechado.

## Debrief

- **Surpresas:** perda silenciosa de edição com a lista aberta em duas abas; o diálogo "Em folha" repete o status "Escolha o Cor da QA." duas vezes no texto (o molde da frase já é o A-2 do CH-01); formulários de produto disparam "beforeunload" ao sair mesmo sem edição (spec-gap de rascunho já registrado no CH-03).
- **Próximo charter:** seguir a peça desativada que ficou na sacola até o checkout; a variação "lista apagada depois da venda" no CH-08.
- **Padrão novo:** reativar o que se desativou para testar pode estar bloqueado por regra de publicação — conferir antes de desativar massa.
