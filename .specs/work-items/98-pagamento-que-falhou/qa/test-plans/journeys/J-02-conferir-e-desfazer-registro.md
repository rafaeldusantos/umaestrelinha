# J-02 · Conferir um pagamento registrado e desfazer o que foi registrado por engano

**Valor:** a Adri vê, num lugar só, quem registrou, como e com qual prova — e corrige um registro feito no pedido errado sem deixar estoque, cupom ou venda tortos.
**Persona:** PER-02 Adri no computador (principal) · PER-01 Adri no celular (secundária)
**Prioridade:** P1
**Critérios de origem:** CA-04.1, CA-04.2, CA-03.4, CA-03.5b, CA-03.6, CA-03.7, CA-03.11, CA-03.12, CA-03.13, CA-03.14, CA-06.4, RNF-03, RNF-08
**Charters:** CH-03 · **TC:** TC-FUNC-007, TC-FUNC-008, TC-FUNC-009, TC-FUNC-013, TC-SEC-001, TC-INT-002, TC-INT-003

## Entrada

| Origem                                                   | URL / caminho        | Estado de partida                |
| -------------------------------------------------------- | -------------------- | -------------------------------- |
| navegação interna                                        | `http://localhost:8083/admin/pedidos/:id` (massa M7) | logada como `admin`, 1440; pedido registrado à mão, em Pago, com observação e três comprovantes |

## Passos

| #  | A persona…        | Deve ver                          | Em até | Fricção prevista            | TC          |
| -- | ----------------- | --------------------------------- | ------ | --------------------------- | ----------- |
| 1  | abre o pedido e lê o bloco Pagamento | meio pelo nome ("Transferência", nunca `transferencia`), data e hora em Brasília, quem registrou, a observação, os comprovantes | 10 s | — | TC-FUNC-007 |
| 2  | abre um comprovante (imagem e PDF); baixa o HEIC | o arquivo abre numa aba; HEIC baixa | 10 s | link quebrado | TC-SEC-001 |
| 3  | percebe que era outro pedido e toca em "Desfazer" | pedido de motivo | 5 s | ação escondida | TC-FUNC-009 |
| 4  | escreve o motivo e confirma | pedido volta a "Pendente", pagamento como antes, sem data de pagamento; histórico com o desfazer, quem, quando e o motivo; observação e comprovantes continuam no histórico; nenhum portão de e-mail | 10 s | — | TC-FUNC-008 |
| 5  | olha o Dashboard e o estoque da peça | a venda saiu; o estoque e o uso do cupom voltaram | 20 s | — | TC-INT-002, TC-INT-003 |

**Tempo total esperado:** ~55 s — dentro da paciência da persona.

## Objetivo

- **Observável:** o pedido de volta a Pendente e não pago, com o histórico explicando o registro e o desfazer.
- **Efeitos colaterais:** nenhum e-mail à cliente (Mailpit vazio para o pedido); venda, estoque e cupom devolvidos.

## Saída

- **Natural:** a página do pedido, que volta a oferecer "Registrar pagamento".

## Desvios e abandono

| Ramo  | No passo | Quando                                  | A persona…                       | Deve acontecer                     | TC   |
| ----- | -------- | --------------------------------------- | -------------------------------- | ---------------------------------- | ---- |
| J-02a | 3 | o pedido já está em Separando (M8), ou foi pago pela loja (M9) | procura "Desfazer" | a ação não aparece | TC-FUNC-009 |
| J-02b | 2 | copia o link do comprovante e abre numa janela anônima, ou espera o link vencer | cola o link | não abre fora da sessão de admin; o link vencido não abre | TC-SEC-001 |
| J-02c | 1 | o pedido recebeu pagamento em dobro, ou pagamento depois de cancelado (M11) | lê o bloco | "Pago duas vezes — devolver um dos valores" / "Pago depois de cancelado — devolver o valor" | TC-FUNC-013 |

## Fronteiras

Storage privado (URL assinada que expira).

## Modos de falha

- Desfazer devolve estoque que nunca foi baixado, ou não devolve o cupom
- O comprovante some com o desfazer
- O comprovante abre para qualquer um com o link
