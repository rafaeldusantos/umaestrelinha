# J-03 · Comprar com cupom, promoção e duas joias e ver a conta fechar até Minha conta e o e-mail

**Valor:** a cliente usa o cupom e recebe o desconto do Compre Junto junto, sem descontos somados por engano, e o
pedido conta a mesma história em toda tela.
**Persona:** PER-04 Helena (principal) · PER-05 Sônia (secundária, no CH-08)
**Prioridade:** P0
**Critérios de origem:** CA-02.4, CA-03.2, CA-03.5, CA-03.6, CA-03.7, CA-03.9, CA-03.10, CA-05.1, CA-05.2
**Charters:** CH-03 · **TC:** TC-JOURNEY-004, TC-FUNC-010, TC-FUNC-014, TC-FUNC-016, TC-FUNC-017, TC-FUNC-020,
TC-FUNC-021, TC-FUNC-026, TC-FUNC-027, TC-INT-004

Decisão do Gate 1 (Q-01, 2026-11-04): as linhas do resumo do checkout, de Minha conta e do e-mail seguem a ordem do
painel — descontos e PIX antes do Frete. As linhas dos itens seguem a Design de cada tela (D-38).

## Entrada

| Origem                                                   | URL / caminho        | Estado de partida                |
| -------------------------------------------------------- | -------------------- | -------------------------------- |
| direta, logada | `/produtos/<slug de P>` | logada como `cliente-loja`; sacola vazia; cupom de 15 % e promoção de M-04 ativos |

## Passos

| #  | A persona…        | Deve ver                          | Em até | Fricção prevista            | TC          |
| -- | ----------------- | --------------------------------- | ------ | --------------------------- | ----------- |
| 1  | leva P com a corrente avulsa pelo bloco | a sacola com a corrente em "de/por" e "Desconto do Compre Junto" | 10 s | | TC-FUNC-019 |
| 2  | acrescenta a joia Q (M-02), que dá 20 % à mesma corrente | a corrente passa a 20 % (vale o maior) | 10 s | percentual não muda | TC-FUNC-020 |
| 3  | aplica o cupom de 15 % | o cupom incide sobre o subtotal já com o desconto casado; a linha do Compre Junto continua | 10 s | o cupom tira o desconto casado | TC-FUNC-017 |
| 4  | vai ao checkout e escolhe PIX | na ordem Subtotal (cheio) · Desconto do Compre Junto · Cupom · Desconto PIX · Frete · Total, e a conta fecha | 60 s | soma não fecha; Frete antes dos descontos | TC-JOURNEY-004, TC-FUNC-018 |
| 5  | confirma | o pedido gravado com o mesmo Total | 15 s | | TC-FUNC-024 |
| 6  | abre o pedido em Minha conta | a mesma composição, na mesma ordem, e a conta fechando | 15 s | | TC-FUNC-026 |
| 7  | abre o e-mail do pedido (Mailpit) | "Compre Junto · N% a menos", o valor com o cheio riscado acima do cobrado, uma linha por desconto, na mesma ordem | 30 s | | TC-INT-004 |

**Tempo total esperado:** ~150 s.

## Objetivo

- **Observável:** em Minha conta, Subtotal − descontos + frete = Total, e o Total é o do checkout.
- **Efeitos colaterais:** o e-mail do pedido com o mesmo resumo.

## Saída

- **Natural:** fica em Minha conta.

## Desvios e abandono

| Ramo  | No passo | Quando                                  | A persona…                       | Deve acontecer                     | TC   |
| ----- | -------- | --------------------------------------- | -------------------------------- | ---------------------------------- | ---- |
| J-03a | 2 | a corrente está em promoção maior que o desconto casado (M-04) | leva a corrente em promoção | vale o menor preço da linha, sem somar; a diferença para o bloco aparece só na sacola | TC-FUNC-010, TC-FUNC-016 |
| J-03b | 3 | o cupom concorre com a promoção | aplica o cupom | só se diz que algo ficou de fora quando ele de fato descontaria | TC-FUNC-017 |
| J-03c | 2 | leva A e B (par recíproco, M-03) | põe as duas pelo bloco de uma delas | recebe desconto a peça levada pelo bloco; sem marca, só a de menor preço cheio | TC-FUNC-021 |

## Fronteiras

`checkout`, `mercado-pago` e `send-notification` (o e-mail). Jornada que cruza fronteira.

## Modos de falha

- O cupom substitui o desconto casado em vez de acumular.
- O resumo de Minha conta não fecha.
