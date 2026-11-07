# J-06 · Ver no app do ateliê o desconto do pedido antes de separar

**Valor:** a Adri, no celular, sabe que o pedido teve desconto do Compre Junto e quanto, e reconhece cada peça.
**Persona:** PER-03 Adri (ateliê) (principal) · —
**Prioridade:** P1
**Critérios de origem:** CA-05.3, RNF-05
**Charters:** CH-07 · **TC:** TC-JOURNEY-008, TC-FUNC-031

Decisão do Gate 1 (Q-01, 2026-11-04): o app segue a ordem das linhas do resumo do painel — descontos e PIX antes do
Frete; a diferença de ordem é bug. As linhas dos itens seguem o padrão de `BlocoItens` (D-38).

## Entrada

| Origem                                                   | URL / caminho        | Estado de partida                |
| -------------------------------------------------------- | -------------------- | -------------------------------- |
| app instalado / navegação | `http://localhost:8084/pedidos` → o pedido de J-01 | logada como `admin-painel` no app |

## Passos

| #  | A persona…        | Deve ver                          | Em até | Fricção prevista            | TC          |
| -- | ----------------- | --------------------------------- | ------ | --------------------------- | ----------- |
| 1  | abre a aba Pedidos e toca no pedido | o detalhe do pedido | 5 s | | — |
| 2  | lê os itens | a corrente em duas linhas se a linha era mista, a com desconto com o preço cheio riscado ("de/por") | 5 s | acha que há peça a mais | TC-FUNC-031 |
| 3  | lê o bloco de valores | na ordem Subtotal · "Desconto do Compre Junto" · … · Desconto PIX · Frete · Total, com o mesmo Total e a mesma ordem do painel | 5 s | linha estoura com fonte grande; Frete antes dos descontos | TC-JOURNEY-008 |

## Objetivo

- **Observável:** o detalhe do pedido no app com a linha "Desconto do Compre Junto − R$ X" e o Total igual ao do
  painel e da loja, na ordem do painel.
- **Efeitos colaterais:** —

## Saída

- **Natural:** volta à lista de pedidos do app.

## Desvios e abandono

| Ramo  | No passo | Quando                                  | A persona…                       | Deve acontecer                     | TC   |
| ----- | -------- | --------------------------------------- | -------------------------------- | ---------------------------------- | ---- |
| J-06a | 1 | a rede cai ao abrir o pedido | volta a abrir | a tela de sem conexão do app; ao voltar, o detalhe com os mesmos valores | TC-JOURNEY-008 |

## Fronteiras

View `order_list` recriada com as colunas novas no fim.

## Modos de falha

- O app mostra outro total, ou não mostra o desconto.
