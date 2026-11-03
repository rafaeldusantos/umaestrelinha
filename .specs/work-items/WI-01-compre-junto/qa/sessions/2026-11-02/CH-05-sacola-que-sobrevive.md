# Sessão CH-05 · A sacola que sobrevive: antes da mudança, entre abas fechadas e sem o principal

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-05-sacola-que-sobrevive.md` · exploratório · P1 |
| Status      | done                                                                   |
| Persona     | PER-04 Sônia · conta: anonima                                          |
| Tour · modo | Interrupt · por cenário (J-05)                                         |
| Rodada      | exploração                                                             |
| Orçamento   | 50 ações de browser de 50                                              |
| Ambiente    | http://localhost:8082 (dev server do branch feature/WI-01) · build não exposto · Chromium headless (Playwright MCP) · viewports 1440 × 900 e 390 × 844 |
| Paridade    | banco Supabase local; `*.supabase.co` e `/g/collect` bloqueados por rota (as imagens da Home que apontam para o Storage hospedado não carregam — esperado); sacola da versão 3 fabricada no navegador (ver Preparação); falha da leitura dos adicionais simulada por interceptação (500 só em `rest/v1/product_buy_together`) |

## Missão

Confirmar que quem é interrompida e volta encontra a sacola como deixou, sem linha duplicada nem frase "acompanha" que não corresponde ao que está ali.

## Preparação (M-07 — estado, não gesto da persona)

Em 390 × 844, na página da QA Corrente Veneziana, com 40 cm já marcado, "Adicionar à sacola" (botão do próprio produto, sem Compre Junto). Depois, por `browser_evaluate`, `localStorage['estrelinha-cart']` foi lido (estava em `version: 4`, um item, sem a chave `accompanies` — a peça avulsa já não a grava), reescrito com `version: 3` e sem `accompanies` em cada item, e a loja recarregada em `/`. Observação: no celular o "Adicionar à sacola" da barra fixa ficou fora da viewport até a página ser rolada (o clique só funcionou depois de `End`); não é desta mudança.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Volta à loja (`/`, 1440) com a sacola de antes e abre a sacola | Ao recarregar, o armazenamento passou a `version: 4` com o item preservado. Gaveta: "QA Corrente Veneziana", 40 cm, quantidade 1, sem frase "acompanha". Botão "Sacola, 1 item" | `screenshots/CH-05-01-sacola-de-antes.png` |
| 02 | Abre o QA Pingente Estrela (Prata 925 · Não), no Compre Junto escolhe QA Correntes → Veneziana → 40 cm, marca e toca "Levar o conjunto" | Gaveta abre com duas linhas: Veneziana 40 cm, quantidade **2**, R$ 179,80, "Acompanha o QA Pingente Estrela"; e o pingente, R$ 259,90. Subtotal (3 itens) R$ 439,70. Sem linha duplicada | `screenshots/CH-05-02-mescla-mesma-variacao.png` |
| 03 | Fecha a aba e abre outra direto no QA Pingente Lua | Cabeçalho: "Sacola, 2 itens" — a sacola sobreviveu | — |
| 04 | No Pingente Lua leva o conjunto com a mesma Veneziana 40 cm | Uma linha só da Veneziana 40 cm, quantidade **3**, R$ 269,70, "Acompanha o QA Pingente Estrela e o QA Pingente Lua"; os dois pingentes. Subtotal (5 itens) R$ 749,50 | `screenshots/CH-05-03-acompanha-dois.png` |
| 05 | Remove o QA Pingente Estrela da sacola | A corrente fica (quantidade 3) e a frase passa a "Acompanha o QA Pingente Lua". Subtotal (4 itens) R$ 489,60 | — |
| 06 | Fecha a aba, reabre (no Pingente Estrela) e abre a sacola | Igual ao passo 05: corrente 40 cm ×3 "Acompanha o QA Pingente Lua" + Pingente Lua | — |
| 07 | Remove o QA Pingente Lua | Só a corrente 40 cm ×3, **sem** frase "acompanha". Subtotal (3 itens) R$ 269,70. Conferido em 390 × 844 | `screenshots/CH-05-04-sem-principal-390.png` |
| 08 | (390) Abre o Pingente Estrela com a leitura dos adicionais respondendo 500 | A página carrega inteira: título, variações, preço, "Adicionar à sacola"; nenhum bloco Compre Junto e nenhum esqueleto preso. Console: a leitura foi tentada 4 vezes (≈7 s) e desistiu em silêncio | `screenshots/CH-05-05-adicionais-falham-390.png` |
| 09 | Compra o pingente pelo "Adicionar à sacola" | Entra o QA Pingente Estrela. **E a corrente 40 cm, que no passo 07 tinha ficado sem frase, volta a dizer "Acompanha o QA Pingente Estrela"** — sem nenhum Compre Junto nesse gesto (ver spec-gap) | — (snapshot do passo; a mesma linha aparece no `CH-05-06`) |
| 10 | Rede de volta: recarrega o Pingente Estrela | O bloco Compre Junto aparece ("Ver os 2 modelos") | — |
| 11 | Leva o conjunto com a Veneziana em **45 cm** (variação diferente) | Linha nova "QA Corrente Veneziana" 45 cm ×1, R$ 94,90, "Acompanha o QA Pingente Estrela", separada da 40 cm ×3; o pingente passa a ×2. Subtotal (6 itens) R$ 884,40 | `screenshots/CH-05-06-variacao-diferente-390.png` |

**Edge cases tentados:**

- Fechar a aba logo depois de "Levar o conjunto" e reabrir (passo 03) — sacola intacta
- Fechar a aba depois de remover um principal e reabrir (passo 06) — sacola intacta
- Leitura dos adicionais caindo no carregamento, e a rede voltando (passos 08 e 10)
- Variação diferente da mesma corrente (passo 11)
- Readicionar o principal avulso depois de removê-lo (passo 09, improvisado) — revelou o spec-gap

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-JOURNEY-005 | pass | 01–03 | `screenshots/CH-05-01-sacola-de-antes.png`, `screenshots/CH-05-02-mescla-mesma-variacao.png` | Variação "variação diferente" coberta só em parte (passo 11): a linha de antes já tinha recebido a frase pela mescla do passo 02, então a condição "a de antes sem frase" não foi isolada |
| TC-FUNC-013 | pass | 02, 04, 11 | `screenshots/CH-05-03-acompanha-dois.png`, `screenshots/CH-05-06-variacao-diferente-390.png` | Variação "gravação diferente" não exercitada (orçamento) |
| TC-FUNC-015 | pass | 05–07 | `screenshots/CH-05-04-sem-principal-390.png` | Executado na variação "peça que acompanha duas joias" e depois sem nenhuma; passo 3 (reabrir) feito no estado intermediário (passo 06), não depois da remoção final |
| TC-FUNC-022 | pass | 08–10 | `screenshots/CH-05-05-adicionais-falham-390.png` | Inclui a variação "rede volta" |
| TC-FUNC-019 (trecho de Minha Conta) | skip | — | — | Orçamento de 50 ações esgotado antes do checkout; nenhum pedido criado, então Minha Conta por código não foi tentada |

Contagem: pass 4 · fail 0 · blocked 0 · skip 1

## Achados

nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| Depois de remover os dois principais, a corrente fica sem frase (certo). Ao readicionar o QA Pingente Estrela **avulso**, pelo "Adicionar à sacola" sem Compre Junto, a corrente volta a dizer "Acompanha o QA Pingente Estrela": a sacola guarda de quais principais a peça veio mesmo depois de eles saírem, e a frase reacende quando um deles volta por qualquer caminho. O PRD diz que a frase é derivada do que está na sacola e que sem a joia a peça perde o "acompanha" (CA-05.3), mas não diz se a relação deve ser esquecida quando a joia sai ou só escondida enquanto ela falta. Provavelmente o Pingente Lua, se readicionado, reacenderia também | passo 09 | polimento |

## Fora da cobertura

- TC-FUNC-019 / "Deve tentar" 4 — pedido com o conjunto, Minha Conta por código no Mailpit e o pedido aberto: orçamento esgotado. Nenhum pedido criado
- A mesma sacola em duas abas abertas ao mesmo tempo (remover na A, levar o conjunto na B) — orçamento
- Voltar do checkout para a sacola — orçamento
- Recarregar durante o carregamento do bloco; ficar offline e tentar "Levar o conjunto" — orçamento (a falha só da leitura foi coberta)
- Aumentar a quantidade da corrente na sacola e remover o principal — orçamento
- TC-FUNC-013 variação "gravação diferente" — orçamento
- `/carrinho` (página) — só a gaveta foi conferida
- A sacola de antes foi fabricada a partir de uma de hoje (troca de `version` e remoção de `accompanies`); um navegador real com estado da versão 3 gravado por um bundle antigo pode ter outros campos

## Debrief

- **Surpresas:** a relação "acompanha" sobrevive à saída do principal e reacende quando ele volta avulso (spec-gap). A leitura dos adicionais em erro é tentada 4 vezes antes de desistir (~7 s) — sem esqueleto visível nesse intervalo, então não incomoda a persona. Na gaveta, o cabeçalho conta linhas ("2 itens") e o subtotal conta unidades ("Subtotal (3 itens)") — anterior à mudança, não registrado
- **Próximo charter:** o pedido com o conjunto até Minha Conta por código (TC-FUNC-019 com PER-04) e as duas abas simultâneas, que ficaram de fora
- **Padrão novo:** "remover o principal e readicionar por outro caminho" — vale como variação em TC-FUNC-015
