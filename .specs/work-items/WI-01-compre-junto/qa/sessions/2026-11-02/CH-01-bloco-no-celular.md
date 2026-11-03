# Sessão CH-01 · O bloco Compre Junto no celular, da página à sacola

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-01-bloco-no-celular.md` · exploratório · P0    |
| Status      | done                                                                   |
| Persona     | PER-01 Marina · conta: anonima                                         |
| Tour · modo | Feature · por cenário (J-01)                                           |
| Rodada      | exploração                                                             |
| Orçamento   | 49 ações de browser de 50                                              |
| Ambiente    | http://localhost:8082 (dev server, branch feature/WI-01) · build não exposto · Chromium (Playwright MCP, headless) · viewports 390 × 844 e 1440 × 900 |
| Paridade    | dev server em vez de build; banco Supabase local com a massa QA-* (fotos reaproveitadas); `*.supabase.co` e `**/g/collect*` bloqueados por rota |

## Missão

Confirmar que quem abre o pingente pela primeira vez no celular entende o bloco, monta pingente e corrente e leva pela barra fixa exatamente o que marcou, em menos de um minuto por tela.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abrir `/produtos/qa-pingente-estrela` em 390 × 844, sacola vazia | Variação pré-escolhida Prata 925 · Não (R$ 259,90, "R$ 241,71 com Pix"). Entre a variação e "Em estoque", o bloco "Compre junto" com a frase "Peças que eu escolhi para acompanhar esta joia. Marque as que quiser levar." e três adicionais desmarcados (QA Correntes "a partir de R$ 89,90", QA Berloque Coração "a partir de R$ 69,90", QA Medalha Afetiva "a partir de R$ 149,90"). Sem rodapé de total. Barra fixa: R$ 259,90 · R$ 241,71 no Pix · "Adicionar à sacola" | `screenshots/CH-01-01-bloco-inicial.png` |
| 02 | Marcar "QA Correntes" | Abre "Escolha a peça · 2 modelos" com QA Corrente Veneziana e QA Corrente Cartier (nenhuma escolhida; sem a Esgotada, sem o próprio pingente, sem o Berloque). Status "Escolha a peça.". Rodapé: "Total do conjunto R$ 259,90 · R$ 241,71 com Pix" + frase literal de CA-03.14. Barra: R$ 259,90 · "Conjunto · 2 peças" · "Levar o conjunto" | — |
| 03 | Tocar "Levar o conjunto" na barra com a peça faltando | Nada entrou (ícone da sacola sem contagem). Aviso "Falta uma escolha em 1 peça. Ela está marcada acima."; a página rolou (scrollY 838) e o adicional Correntes ficou visível na tela (233–611 px), com "Escolha a peça." | `screenshots/CH-01-02-falta-escolha.png` |
| 04 | Escolher a Veneziana | Aparece "Comprimento": 40 cm, 45 cm, 50 cm (50 cm desabilitado). Status "Escolha o Comprimento da QA." | — |
| 05 | Escolher 45 cm | Linha do adicional R$ 94,90; total R$ 354,80 · R$ 329,96 com Pix; barra R$ 354,80 · "Conjunto · 2 peças" (259,90 + 94,90 = 354,80; × 0,93 = 329,964) | — |
| 06 | Marcar o Berloque | Só duas cores: Prata 925 e Folheado a ouro (Rosé não oferecida, como na massa). Status "Escolha o Cor da QA." | — |
| 07 | Escolher Folheado a ouro | Total R$ 429,70 · R$ 399,62 com Pix; barra R$ 429,70 · "Conjunto · 3 peças" | — |
| 08 | Desmarcar e marcar de novo o Berloque | Desmarcado: total R$ 354,80, barra "Conjunto · 2 peças"; o rótulo guarda "Folheado a ouro". Remarcado: volta R$ 429,70 com a cor anterior | — |
| 09 | Trocar o elo para "Chaveiro" com o Berloque marcado | Preço R$ 239,90; o Berloque avulso sai do bloco e perde a marca; Correntes mantém Veneziana 45 cm; total R$ 334,80 (239,90 + 94,90). A lista Correntes passa a "Escolha a peça · 3 modelos" incluindo "QA Berloque Coração". Gravação "Sim" desabilitada | — |
| 10 | Voltar para Prata 925 | Berloque avulso volta, desmarcado; total R$ 354,80, "Conjunto · 2 peças" | — |
| 11 | Trocar para Folheado a ouro, marcar Berloque Prata 925 | Preço R$ 289,90; total R$ 454,70 · R$ 422,87 com Pix (289,90 + 94,90 + 69,90; × 0,93 = 422,871); barra R$ 454,70 · "Conjunto · 3 peças", sem preço no Pix | `screenshots/CH-01-03-conjunto-3-pecas.png` |
| 12 | Tocar "Levar o conjunto" | Gaveta "Sua sacola 3": QA Pingente Estrela Folheado a ouro · Não R$ 289,90 ×1; QA Corrente Veneziana 45 cm R$ 94,90 ×1 "Acompanha o QA Pingente Estrela"; QA Berloque Coração Prata 925 R$ 69,90 ×1 "Acompanha o QA Pingente Estrela"; Subtotal (3 itens) R$ 454,70 = total do bloco | `screenshots/CH-01-04-gaveta-conjunto.png` |
| 13 | Voltar no navegador com a gaveta aberta | O voltar saiu da loja (about:blank) — a gaveta não captura o voltar. Reabrindo a página: sacola com 3, bloco sem nenhuma marca, botões "Adicionar à sacola", variação de volta a Prata · Não | — |
| 14 | Marcar Berloque Prata 925 e dar duplo toque em "Levar o conjunto" | Gaveta "Sua sacola 4": nova linha QA Pingente Estrela Prata 925 · Não ×2 (R$ 519,80); o Berloque somou na linha já existente, que passou a ×3 (R$ 209,70) "Acompanha o QA Pingente Estrela"; Subtotal (7 itens) R$ 1.114,30. O duplo toque levou o conjunto duas vezes | `screenshots/CH-01-05-duplo-toque-gaveta.png` |
| 15 | Abrir M-04 (`qa-joia-sem-compre-junto`) | Sem bloco Compre junto; "Você também vai curtir" presente; botão "Adicionar à sacola"; barra com "R$ 185,91 no Pix" | `screenshots/CH-01-06-qa-joia-sem-compre-junto.png` |
| 16 | Abrir M-05 (`qa-joia-esgotada`, com Berloque avulso) | Sem bloco Compre junto; botão "Esgotado" desabilitado; "Você também vai curtir" presente | `screenshots/CH-01-06-qa-joia-esgotada.png` |
| 17 | Em 1440 × 900, M-01, marcar Berloque Prata 925 | Total R$ 329,80 · R$ 306,71 com Pix; botão da coluna "Levar o conjunto"; seletor de quantidade presente; sem rolagem lateral (scrollWidth 1440) | `screenshots/CH-01-07-1440.png` |

**Edge cases tentados:** voltar depois do sucesso (passo 13); recarregar/reabrir com adicionais marcados (passo 13 — bloco volta sem marca); duplo toque em "Levar o conjunto" (passo 14); marcar, desmarcar e marcar de novo (passo 08 — a escolha anterior volta).

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-SMOKE-001 | pass | 01, 13 | `screenshots/CH-01-01-bloco-inicial.png` | título, frase e nada marcado; reaberto, volta sem marca |
| TC-SMOKE-002 | pass | 11–12, 14 | `screenshots/CH-01-04-gaveta-conjunto.png` | gaveta abre com o pingente e os adicionais |
| TC-JOURNEY-001 | pass | 01–13 | `screenshots/CH-01-04-gaveta-conjunto.png` | conjunto da barra = conjunto do bloco = gaveta; sacola persiste ao reabrir. Variações: voltar (sai da loja, ver spec-gap) e duplo toque (soma duas vezes, ver spec-gap) |
| TC-FUNC-001 | pass | 15 | `screenshots/CH-01-06-qa-joia-sem-compre-junto.png` | passo 2 (produto com todos os adicionais indisponíveis) e a variação "variação do principal sem adicional" não têm massa — fora da cobertura |
| TC-FUNC-002 | skip | 01, 08 | — | passo 1 ok (sem rodapé, "Adicionar à sacola"); desmarcar só um de dois e "Adicionar à sacola" levando só o pingente não foram executados (orçamento) |
| TC-FUNC-003 | pass | 09–12 | `screenshots/CH-01-04-gaveta-conjunto.png` | sem seletor do principal no bloco; total segue a variação; linha na sacola em Folheado a ouro. "Sem variação escolhida" não é alcançável: a página nasce com Prata · Não escolhida |
| TC-FUNC-004 | pass | 05, 07, 11–12 | `screenshots/CH-01-03-conjunto-3-pecas.png` | somas e PIX 7 % conferidos; incompleto não entra no total (R$ 259,90 com a corrente sem peça) |
| TC-FUNC-005 | fail | 02–04, 06 | `screenshots/CH-01-02-falta-escolha.png` | aviso e rolagem certos; texto do adicional diverge — A-1, A-2. Passo 3 (duas incompletas) não executado |
| TC-FUNC-006 | pass | 02, 05 | — | ordem Veneziana, Cartier; "2 modelos" conta só as oferecidas; escolha única. M-03 (passo 3) não executado |
| TC-FUNC-007 | pass | 04 | — | 50 cm desabilitado; QA Corrente Esgotada ausente |
| TC-FUNC-010 | pass | 01, 02, 17 | `screenshots/CH-01-01-bloco-inicial.png` | título, frase e rodapé literais |
| TC-FUNC-011 | skip | 17 | `screenshots/CH-01-07-1440.png` | quantidade 3 em 1440 e a sacola não executados (orçamento); seletor existe em 1440 |
| TC-FUNC-017 | pass | 01, 02, 07, 08, 11 | `screenshots/CH-01-03-conjunto-3-pecas.png` | sem marca: preço + "no Pix"; com conjunto: total + "Conjunto · N peças" sem PIX; desmarcar recalcula. Incompleto: N conta o marcado (2), total só os completos (R$ 259,90) |
| TC-FUNC-020 | pass | 09–10 | — | Berloque some e perde a marca em Chaveiro; Correntes mantém; volta desmarcado. Passo 3 (levar em Chaveiro) não executado |
| TC-REG-001 | skip | 15 | `screenshots/CH-01-06-qa-joia-sem-compre-junto.png` | passo 1 ok; adicionar, checkout e pedido não executados (orçamento) |
| TC-PERSONA-001 | pass | 01–12 | — | hipótese 1 não confirmada (a página rola até o adicional e o aviso diz o que falta); hipótese 2 não confirmada (barra = bloco); hipótese 3 não testada (M-06 fora da sessão) |

Contagem: pass 12 · fail 1 · blocked 0 · skip 3

## Achados

### A-1 · [Compre junto, lista] O adicional de lista pede "Escolha a peça." em vez de nomear o tipo — para quem esqueceu a corrente

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Marina                                                         |
| Jornada e passo     | J-01, ramo J-01a · passos 02–03 do log                                |
| TC                  | TC-FUNC-005                                                           |
| Gravidade proposta  | low — o aviso e a rolagem levam Marina ao lugar certo; só o texto é genérico |
| Reproduziu          | sim (2 de 2 — ao marcar e depois de tocar a barra)                    |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Anônima, sacola vazia, abrir `http://localhost:8082/produtos/qa-pingente-estrela` em 390 × 844
2. Marcar "QA Correntes" sem escolher a peça
3. Ler o status sob o grupo de peças (e tocar "Levar o conjunto")

**Esperado:** "Escolha a corrente." — **fonte:** TC-FUNC-005 passo 1 (textos do protótipo da loja, spec › Design › Loja)

**Observado:** "Escolha a peça." (o rótulo do grupo também é "Escolha a peça · 2 modelos", onde TC-FUNC-006 espera "Escolha a corrente · N modelos")

**Evidência:**

- `screenshots/CH-01-02-falta-escolha.png` — o aviso e o adicional na tela depois do toque
- console: nada
- rede: nada

### A-2 · [Compre junto, eixo] A frase da escolha que falta sai com gênero errado e maiúscula no meio: "Escolha o Cor da QA."

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Marina                                                         |
| Jornada e passo     | J-01, ramo J-01a · passos 04 e 06 do log                              |
| TC                  | TC-FUNC-005                                                           |
| Gravidade proposta  | low — erro de português ao lado do botão de compra numa loja de registro memorial; não impede concluir (a triagem pode subir para dano à confiança) |
| Reproduziu          | sim (2 de 2 — nos dois eixos vistos: Comprimento e Cor)               |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Anônima, abrir `http://localhost:8082/produtos/qa-pingente-estrela` em 390 × 844
2. Marcar "QA Berloque Coração" sem escolher a cor
3. Ler o status sob o grupo "Cor"

**Esperado:** "Escolha o <eixo> da <primeira palavra do nome da peça>." com concordância — fonte: TC-FUNC-005 passo 2; o eixo "Cor" é feminino ("a cor"). Pelo mesmo molde, "Berloque" e "Pingente" são masculinos ("do"), então o artigo fixo erra também com nomes reais do catálogo

**Observado:** "Escolha o Cor da QA." e, na Veneziana, "Escolha o Comprimento da QA." (artigo fixo "o … da …", eixo com inicial maiúscula; "QA" é a primeira palavra do nome da massa)

**Evidência:**

- passos 04 e 06 do log (snapshot de acessibilidade, `status`)
- console: nada
- rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| Com o elo "Chaveiro", o Berloque some como avulso e passa a aparecer dentro da lista "QA Correntes" ("3 modelos"); pela regra da massa, ali ele vem com as 3 cores, inclusive a Rosé que o avulso não libera | 09 | polimento |
| Duplo toque em "Levar o conjunto" leva o conjunto duas vezes; o adicional repetido soma na linha de Berloque que já "acompanhava" o pingente Folheado a ouro (×3), enquanto o pingente novo, Prata 925, ficou ×2 numa linha separada — a frase "Acompanha o QA Pingente Estrela" passa a cobrir duas variações do principal | 14 | polimento |
| O voltar do navegador com a gaveta aberta sai da loja em vez de fechar a gaveta | 13 | pré-existente |
| Produto inteiro esgotado (M-05) com adicional: o bloco não aparece e o botão vira "Esgotado" desabilitado; nenhuma fonte diz o que o bloco faz nesse caso | 16 | pré-existente |
| A variação do pingente nasce pré-escolhida (Prata 925 · Não), então "marcar adicional sem variação do principal" não é alcançável | 01 | pré-existente |

## Fora da cobertura

- Fonte a 130 % / 200 %, viewport 320 × 568, girar para 844 × 390 e movimento reduzido — orçamento
- M-06 (nomes longos, três adicionais) e a hipótese de fricção 3 — orçamento
- M-03 (a mesma lista em outra joia, TC-FUNC-006 passo 3) — orçamento
- QA Medalha Afetiva (exige material) não foi marcada — orçamento
- Quantidade 3 em 1440 e a sacola (TC-FUNC-011), "Adicionar à sacola" levando só o pingente (TC-FUNC-002 passo 3), duas peças incompletas ao mesmo tempo (TC-FUNC-005 passo 3), levar em "Chaveiro" (TC-FUNC-020 passo 3) — orçamento
- Canário até o checkout e o pedido (TC-REG-001 passos 2–3) — orçamento; o checkout é do CH-02
- TC-FUNC-001 passo 2 (produto com todos os adicionais indisponíveis) — sem massa
- Rede lenta (variação de TC-PERSONA-001) — fora do alcance do browser da sessão
- TC-INT-005, TC-INT-006 — com o Dev, por definição do charter

## Debrief

- **Surpresas:** o voltar com a gaveta aberta sai da loja; o duplo toque soma o conjunto inteiro duas vezes e funde o adicional na linha de outra variação do principal
- **Próximo charter:** CH-05 (gaveta) deve olhar a fusão do adicional entre variações do principal e a frase "acompanha"; uma sessão curta de fonte a 200 % e 320 × 568 com M-06
- **Padrão novo:** conferir os textos de molde ("Escolha o <eixo> da <peça>") contra eixos femininos e nomes masculinos do catálogo
