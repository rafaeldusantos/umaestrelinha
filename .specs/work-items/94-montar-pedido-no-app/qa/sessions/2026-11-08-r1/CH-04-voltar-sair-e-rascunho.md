# Sessão CH-04 · Voltar, sair e o rascunho da montagem

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-04-voltar-sair-e-rascunho.md` · exploratório · P1 |
| Status      | done |
| Persona     | PER-02 Adri interrompida · conta: `admin-atelie` (arquivo local de credenciais; as `QA_*` não existem nesta máquina) |
| Tour · modo | Back-Button · com tour |
| Rodada      | exploração |
| Orçamento   | ~66 ações de browser de 70 (cada clique, digitação, voltar, avançar, F5, troca de aba e redimensionamento contado como uma; leituras de estado não contadas) |
| Ambiente    | app `http://localhost:8084` · build não exposto · Chromium (Playwright MCP, headless) · viewport 390 × 844 (e 844 × 390 no giro) |
| Paridade    | Supabase local (54441), requisições a `*.supabase.co` abortadas; Mercado Pago não configurado; massa sintética (cliente Bia QA Oitenta e Nove, cupom QA92CUPOM15); "app fechado" simulado abrindo uma aba nova no mesmo contexto e fechando a antiga; o voltar do Android simulado por `history.back` |

## Missão

Confirmar que o voltar do Android, o "x", o F5 e o app fechado no meio nunca jogam fora a sacola sem
perguntar, nunca refazem o que já foi confirmado, que depois de "Criar link" o voltar leva a Montados sem
reabrir a montagem, e que o que volta do aparelho é só peças e descontos — nenhum dado da cliente.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrou e abriu Pedidos; tocou em "Montar pedido" | `/pedidos/montar`, "Passo 1 de 4 · Cliente", sem barra de abas; indicador com Passo 2–4 desligados. `history.length` 2 → 4 (a sentinela), `state.usr = {doApp:true, passoDaMontagem:1}`. Nenhuma chave de rascunho no `localStorage` | — |
| 02 | Voltou no passo 1 sem nada preenchido | Saiu direto para `/pedidos` (idx 0), sem folha | — |
| 03 | Reabriu, escolheu a cliente e voltou | Folha "Sair sem criar o link?" — "Nada foi gravado ainda. A montagem se perde ao sair." com "Continuar montando" / "Sair"; `state` muda para `passoDaMontagem:0` (idx 1) | — |
| 04 | Com essa folha aberta, voltou de novo | **Saiu da montagem para `/pedidos`** (idx 0); a folha não ficou e a cliente escolhida se perdeu (A-1) | — |
| 05 | Reabriu, escolheu a cliente, Continuar (passo 2), abriu a folha da variação de "Anel Afetivo Coração com Cabelo" e voltou | A folha fechou, ainda no passo 2 (`state` com `folhaDaTela:"variacao-da-peca"` ao abrir, sem ele depois) | — |
| 06 | Acrescentou a peça; tocou em "Passo 4: Revisar" no indicador | Botão desligado (não alcançado). O rascunho já é gravado sozinho ao acrescentar a peça (sem "Guardar rascunho") | — |
| 07 | Continuar ao passo 3; cupom "QA92CUPOM15" (o "CUPOM15" foi recusado: "Cupom inválido."); "Desconto combinado" R$ 10 e motivo; voltou | Resumo: Subtotal R$ 189,90, Cupom − R$ 28,49, Combinado − R$ 10,00, Itens R$ 151,41. Voltar ⇒ passo 2 com "Sacola · 1 peça"; URL sempre `/pedidos/montar`. Pelo indicador "Passo 3" voltou ao passo 3 com tudo | `screenshots/CH-04-07-passo3-antes-de-fechar.png` |
| 08 | Abriu `/pedidos` numa aba nova, fechou a antiga, tocou em "Montar pedido" | "Rascunho retomado: as peças e os descontos voltaram." / "A cliente e o motivo do desconto não ficam guardados — escolha e escreva de novo."; nenhuma cliente escolhida | `screenshots/CH-04-08-rascunho-retomado.png` |
| 09 | Escolheu Bia de novo e seguiu até o passo 3 | Sacola com a peça; cupom QA92CUPOM15 (15 %) reconferido, combinado R$ 10,00 de volta, **motivo vazio (0/120)**; Itens R$ 151,41 | — |
| 10 | F5 no passo 3; depois voltou no passo 1 | Recomeçou no passo 1 com "Rascunho retomado…". O voltar abriu "Sair sem criar o link?" com "Continuar montando", "Guardar rascunho" e "Descartar" (empilhados) e o texto sobre o que não fica guardado | `screenshots/CH-04-10-folha-sair-com-pecas.png` |
| 11 | Com essa folha (com peças) aberta, voltou de novo | **Saiu para `/pedidos`** sem escolher (A-1, 2.ª reprodução); o rascunho ficou no aparelho (gravação automática) | — |
| 12 | "x" com peças ⇒ "Guardar rascunho"; reabriu; "x" ⇒ "Descartar"; reabriu | Guardar: volta a Pedidos, reabre com "Rascunho retomado…". Descartar: a chave `estrelinha-montagem-rascunho` sumiu; reabre vazia, sem aviso | — |
| 13 | "x" sem nada; depois só a cliente ⇒ "x" ⇒ "Continuar montando" | Sem nada: Pedidos direto, sem folha. Só cliente: folha com "Sair"; "Continuar montando" fecha a folha e a cliente continua escolhida | — |
| 14 | Montou de novo (peça, cupom, combinado com motivo), passo 4, escreveu a observação interna; leu storage, `history.state`, URL e console | URL `/pedidos/montar`; `state` só `{doApp, passoDaMontagem}`; `localStorage` só a chave do rascunho com `conta`, `pecas` (pecaId, variacaoId, quantidade, gravacao), `cupom` e `combinado` (ligado, tipo, valor); `sessionStorage` vazio; nenhum nome, e-mail, telefone, endereço, CEP, motivo nem observação; console sem dado da cliente | — |
| 15 | "Criar link" | `/pedidos/montados/<id>` "Pedido montado P-0035", "Link criado." — rascunho apagado; token do link não foi a storage; sem barra de abas | — |
| 16 | Abriu "Editar observação" e voltou | A folha fechou, ainda no pedido montado | — |
| 17 | Voltou de novo | **Caiu em `/pedidos/montar`, "Passo 1 de 4 · Cliente", vazia, com Passo 2 habilitado** (título da aba ainda "Pedido montado · Ateliê"); `history.length` 8 → 4, `state.usr = {doApp:true, passoDaMontagem:1}` idx 2 (D-43, já registrado) | `screenshots/CH-04-15-voltar-depois-do-link.png` |
| 18 | Voltou mais uma vez; depois avançou (`history.forward`) | Voltar: `/pedidos` (Precisa de ação, não Montados), idx 0. Avançar: reabre `/pedidos/montar` vazia; o pedido montado não é mais alcançável pelo avançar | — |
| 19 | Da montagem vazia (sem aviso de rascunho), montou peça e guardou rascunho; abriu Montados | Montados `/pedidos?visao=montados` com P-0035; sem busca | — |
| 20 | Trocou entre os chips de antes e Montados; voltou | Cada chip troca `?visao=` (tudo, fila-material, a-separar, em-transito, concluidos, montados) **substituindo** a entrada (`history.length` fica 2); busca e barra de abas presentes, busca some em Montados; o voltar de Montados sai de Pedidos (nesta aba, `about:blank`) em vez de ir ao chip anterior | — |
| 21 | De Montados tocou em "Precisa de ação" | `?visao=precisa-acao`, a busca volta | — |
| 22 | Com rascunho guardado, saiu da conta (Início › Sua conta › Sair) e entrou de novo; abriu "Montar pedido" | Ao sair, `localStorage` ficou vazio (rascunho apagado); depois de entrar, a montagem abriu sem "Rascunho retomado" | — |
| 23 | Abriu `/pedidos/montar` direto pela barra de endereço e voltou no passo 1 | Caiu em `/pedidos` | — |
| 24 | Abriu P-0035 › "Editar"; F5 | Antes: "Editar pedido montado" com Bia; nenhum rascunho gravado. Depois do F5: "Montar pedido" vazio, sem rascunho (D-41) | — |
| 25 | No passo 2 com peça, girou para 844 × 390 e voltou a 390 × 844 | Continuou no passo 2 com "Sacola · 1 peça", sem rolagem lateral (`scrollWidth` 844) | — |
| 26 | Do passo 4, tocou em "Passo 2" no indicador, depois em "Passo 4", depois voltou | 4 ⇒ 2 recua no histórico (mesma chave do passo 2), 2 ⇒ 4 avança, voltar ⇒ passo 3 | — |
| 27 | Fechou com "Descartar", saiu da conta e fechou o browser | `localStorage` vazio | — |

**Edge cases tentados:** F5 num passo do meio (passa); deep link `/pedidos/montar` (passa, voltar cai em `/pedidos`); voltar e avançar pelo indicador (passa); voltar com folha do pedido montado aberta (a folha fecha primeiro — passa; o voltar seguinte cai na montagem — D-43); avançar depois de voltar (reabre a montagem vazia — parte do D-43); F5 durante o Editar (passa, D-41); girar no passo 2 (passa); voltar com a folha "Sair sem criar o link?" aberta (falha — A-1, improvisado a partir da variação de TC-FUNC-004); peça desativada antes de reabrir — não tentado (ver Fora da cobertura).

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-JOURNEY-003 | pass | 07–15, 19 | `screenshots/CH-04-07-passo3-antes-de-fechar.png`, `screenshots/CH-04-08-rascunho-retomado.png` | sem gravação nem quantidade 2 (a peça usada não tem gravação); a variação "peça saiu do catálogo" não exercitada |
| TC-FUNC-003 | fail | 02, 03, 05–07, 17–18, 23, 26 | `screenshots/CH-04-15-voltar-depois-do-link.png` | passos 1–5 e as variações F5 e deep link passam; a variação P1 "voltar depois de 'Criar link'" falha (D-43, já registrado): cai na montagem vazia, o segundo voltar vai a `/pedidos` (não a Montados) e o avançar reabre a montagem |
| TC-FUNC-004 | fail | 03–04, 10–13 | `screenshots/CH-04-10-folha-sair-com-pecas.png` | passos 1–5 e "Continuar montando" passam; a variação "voltar com a folha aberta ⇒ a folha fecha, a montagem fica" falha ⇒ A-1 |
| TC-FUNC-005 | pass | 08–09, 22, 24 | `screenshots/CH-04-08-rascunho-retomado.png` | cliente e motivo vazios ao retomar; o cupom reconferido; sair da conta apaga o rascunho; Editar não grava rascunho. Sem gravação/quantidade 2; variações "peça desativada" e "preço mudou" não exercitadas |
| TC-SEC-002 | pass | 01, 07, 14–15, 27 | — | storage, `history.state`, URL e console limpos com cliente cadastrada (nome, e-mail, telefone, endereço), motivo e observação; "Descartar" apaga a chave; token do link fora de storage. A cliente nova com CPF e o texto colado não foram exercitados |
| TC-REG-001 | pass | 01, 15, 19–21 | — | chips e `?visao=` iguais, a busca some em Montados e volta, sem barra de abas em `/pedidos/montar` e `/pedidos/montados/:id`. A variação "voltar de Montados ⇒ o chip anterior" não acontece porque todo chip (inclusive os de antes) substitui a entrada — sem fonte para o esperado ⇒ spec-gap |

Contagem: pass 4 · fail 2 · blocked 0 · skip 0

## Achados

### A-1 · [Montagem] O voltar com a folha "Sair sem criar o link?" aberta sai da montagem em vez de fechar a folha — Adri interrompida

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Adri interrompida                                              |
| Jornada e passo     | J-03, ramo J-03a/b (sair) · passos 04 e 11 do log                     |
| TC                  | TC-FUNC-004 (variação "voltar com a folha aberta")                    |
| Gravidade proposta  | medium — a Adri, que usa o voltar como navegação, abre sem querer a folha de sair e o segundo voltar (o gesto natural para "não, fica") a tira da montagem sem ela escolher; perde a cliente escolhida (as peças só sobrevivem porque o rascunho é gravado sozinho) |
| Reproduziu          | sim (2 de 2: só com a cliente, passo 04; com peças e descontos, passo 11) |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Logada como `admin-atelie`, em `/pedidos`, tocar em "Montar pedido"
2. Escolher uma cliente cadastrada (opcionalmente seguir e acrescentar uma peça, e voltar ao passo 1)
3. Voltar (`history.back`): abre "Sair sem criar o link?"
4. Voltar de novo com a folha aberta

**Esperado:** a folha fecha e a montagem fica no passo 1, como acontece com a folha da variação e com as folhas do pedido montado — **fonte:** TC-FUNC-004 › Variações ("voltar com a folha aberta: a folha fecha, a montagem fica"); spec D-12 ("o voltar do Android volta um passo (ou fecha a folha aberta)").

**Observado:** a tela vai a `/pedidos` (Precisa de ação), sem folha; a cliente escolhida se perde. `history.state` passa de `{doApp, passoDaMontagem:0}` (idx 1) a `{idx:0}`. Com peças, o rascunho fica no aparelho sem a Adri ter escolhido "Guardar" ou "Descartar".

**Evidência:**

- `screenshots/CH-04-10-folha-sair-com-pecas.png` — a folha aberta no instante anterior ao segundo voltar
- console: nada
- rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| O rascunho é gravado no aparelho a cada mudança (já ao acrescentar a primeira peça), não só ao tocar "Guardar rascunho"; por isso fechar o app ou sair pelo voltar preserva a sacola, e "Descartar" é o único caminho que a apaga. Nenhuma fonte diz se "Guardar rascunho" é escolha ou só confirmação | 06, 11 | mudança |
| Todos os chips de Pedidos (os de antes e Montados) substituem a entrada do histórico; o voltar de qualquer visão sai de Pedidos em vez de ir ao chip anterior (TC-REG-001 espera o chip anterior, sem fonte) | 20 | pré-existente |
| Depois de voltar do pedido montado à montagem (D-43), o título da aba fica "Pedido montado · Ateliê" na tela "Montar pedido" | 17 | polimento |
| O cupom "CUPOM15" do texto de outros charters foi recusado ("Cupom inválido.", prévia 422) para Bia; usado "QA92CUPOM15" | 07 | pré-existente |

## Fora da cobertura

- Variações "peça desativada antes de reabrir" e "preço mudou antes de reabrir" (TC-JOURNEY-003, TC-FUNC-005) — exigem alterar no painel uma peça que esta sessão não criou (regra de não alterar dado alheio) e orçamento
- Peça com gravação e quantidade 2 no rascunho — a peça usada não tem campo de gravação; não procurei outra por orçamento
- TC-SEC-002 com cliente nova (CPF digitado) e com o texto colado na folha "Colar texto" — orçamento; o CPF só existe em "Cliente nova"
- A sobrevivência do rascunho no PWA instalado com o processo encerrado pelo Android — não alcançável no browser
- O gesto físico de voltar do Android — simulado por `history.back`
- "Aba nova" do deep link foi uma navegação direta na mesma aba (carga fresca da página), não uma aba nova sem histórico

## Debrief

- **Surpresas:** o rascunho é autossalvo, o que torna o A-1 menos destrutivo para as peças do que parecia; o avançar depois do D-43 também reabre a montagem e o pedido montado deixa de ser alcançável pelo avançar
- **Próximo charter:** reteste do D-43 cobrindo também o `history.forward` e o título da aba; a folha "Sair…" no voltar com peças
- **Padrão novo:** "voltar duas vezes" em toda folha de confirmação (a própria folha de sair é uma folha e precisa do mesmo tratamento)

## Efeitos na massa

- Criado o pedido montado P-0035 (Bia QA Oitenta e Nove, 1 × Anel Afetivo Coração com Cabelo, cupom QA92CUPOM15, combinado R$ 10, observação interna sintética), aberto, válido até 15/11
- Nenhum rascunho deixado no aparelho; conta deslogada ao fim
