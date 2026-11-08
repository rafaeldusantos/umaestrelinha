# J-01 · Montar pelo celular o pedido de uma cliente nova a partir da conversa e mandar o link

**Valor:** a venda que nasceu no WhatsApp vira um link de pagamento sem a Adri sair do celular nem
redigitar o que a cliente já escreveu.
**Persona:** PER-01 Adri no WhatsApp (principal) · PER-03 Adri com a fonte grande (secundária)
**Prioridade:** P0
**Critérios de origem:** UC-01, UC-02, UC-04, UC-05, UC-06, UC-07, UC-08, UC-09
**Charters:** CH-01, CH-02, CH-03, CH-08 · **TC:** TC-JOURNEY-001, TC-FUNC-002, TC-FUNC-008, TC-FUNC-009,
TC-FUNC-010, TC-FUNC-011, TC-FUNC-014, TC-FUNC-015, TC-FUNC-016, TC-FUNC-017, TC-FUNC-021, TC-FUNC-024,
TC-FUNC-025, TC-FUNC-026, TC-FUNC-027, TC-INT-001

## Entrada

| Origem              | URL / caminho           | Estado de partida                                   |
| ------------------- | ----------------------- | --------------------------------------------------- |
| navegação interna   | `http://localhost:8084/pedidos` → "Montar pedido" | logada como `admin-atelie`; nenhum rascunho no aparelho; a conversa da cliente copiada (texto de massa, ver CH-02) |

## Passos

| #  | A persona…                                              | Deve ver                                                          | Em até | Fricção prevista                         | TC              |
| -- | ------------------------------------------------------- | ----------------------------------------------------------------- | ------ | ---------------------------------------- | --------------- |
| 1  | toca em "Montar pedido"                                 | a montagem em tela cheia, "Passo 1 de 4 · Cliente", sem barra de abas | 2 s | —                                        | TC-FUNC-002     |
| 2  | escolhe "Cliente nova" e toca em "Colar texto da conversa" | a folha "Colar o texto da conversa", contador n/2000            | 2 s    | —                                        | TC-FUNC-011     |
| 3  | cola a conversa e toca em "Ler o texto"                 | "Lendo o texto…" desligado; depois a folha fecha e os campos vêm marcados "Lido do texto — confira." | 10 s | leitura no campo errado (fricção 2) | TC-FUNC-011 |
| 4  | confere o aviso "Preenchi N de M campos…" e completa o que faltou | barra sem motivo; "Continuar" ligado                       | 30 s   | teclado cobrindo a barra (fricção 1)     | TC-FUNC-008, TC-FUNC-010 |
| 5  | busca a joia, escolhe a variação pela foto e acrescenta | a sacola com a foto da variação e "Itens · 1 peça · frete à parte" | 30 s  | variação errada (fricção 3)              | TC-FUNC-016, TC-FUNC-017 |
| 6  | aplica o cupom combinado                                | o resumo com o cupom e "No PIX: …"                                | 10 s   | —                                        | TC-FUNC-021     |
| 7  | revisa peças, cliente ("Ficha nova · criada com o link") e entrega com a prévia | as peças com foto primeiro                    | 20 s   | —                                        | TC-FUNC-024     |
| 8  | toca em "Criar link"                                    | "Criando o link…", depois o pedido montado com o toast "Link criado." | 5 s | —                                        | TC-FUNC-025     |
| 9  | toca em "Enviar pelo WhatsApp"                          | o WhatsApp com a mensagem pronta; no histórico "Link enviado · WhatsApp" | 3 s | —                                     | TC-FUNC-027     |

**Tempo total esperado:** ~2 min — dentro da paciência por passo (60 s).

## Objetivo

- **Observável:** o pedido montado aberto, com o link para a cliente e "Link enviado · WhatsApp" no histórico
- **Efeitos colaterais:** a ficha da cliente criada com CPF e o endereço salvo (com "Salvar no cadastro"
  ligado), visível no painel (TC-INT-001); o cartão novo em Montados

## Saída

- **Natural:** Montados, com o cartão novo no topo — ou o WhatsApp. O voltar do Android depois de "Criar link" leva a Montados,
  com a montagem fora do histórico (Q-01, D-43).

## Desvios e abandono

| Ramo  | No passo | Quando                                      | A persona…                                  | Deve acontecer                                                                 | TC          |
| ----- | -------- | ------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------ | ----------- |
| J-01a | 3        | a leitura está fora do ar (sem chave, 5xx)  | lê a frase e toca em "Preencher à mão"      | "A leitura está fora do ar agora. Feche e preencha à mão — nada do que você já fez se perde."; nada se perde | TC-FUNC-015 |
| J-01b | 3        | colou a mensagem errada (sem dados)         | cola de novo ou preenche à mão              | a folha fica aberta com "Não encontrei nome, contato nem endereço neste texto…" | TC-FUNC-014 |
| J-01c | 4        | o e-mail lido já tem ficha                  | toca em "Usar a ficha dela"                 | vira cliente cadastrada; o endereço lido fica como "Outro endereço"; nenhuma segunda ficha | TC-FUNC-009 |
| J-01d | 8        | o preço de uma peça mudou enquanto montava  | lê a recusa e confere o resumo              | "Os preços mudaram enquanto você montava. Confira o resumo." e o resumo relido; nada gravado | TC-FUNC-026 |

## Fronteiras

A Claude API (Haiku) pela function `customer-parse` — no local depende de `ANTHROPIC_API_KEY`; o serviço de
CEP da loja; a cotação do Melhor Envio (`melhor-envio?action=quote`) na prévia; o WhatsApp (`wa.me`).

## Modos de falha

- A leitura grava algo antes de "Criar link", ou troca dado de ficha existente
- "Criar link" cria duas propostas no duplo toque, ou diz "Link criado." sem link
