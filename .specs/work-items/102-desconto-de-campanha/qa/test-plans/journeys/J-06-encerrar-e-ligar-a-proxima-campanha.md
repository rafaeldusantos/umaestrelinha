# J-06 · Encerrar a Black Friday e ligar a campanha seguinte

**Valor:** a campanha acaba sem a dona desfazer nada à mão, nenhum pedido feito muda, ninguém é cobrado pelo
valor velho, e a próxima campanha entra só pelo cadastro.
**Persona:** PER-01 Adri (principal) · PER-03 Helena (secundária — a aba da loja com o checkout aberto)
**Prioridade:** P1
**Critérios de origem:** CA-04, CA-07, CA-09, CA-12, CA-13, R-02, R-04, R-08
**Charters:** CH-06 · **TC:** TC-FUNC-006, TC-FUNC-009, TC-FUNC-012, TC-FUNC-013, TC-FUNC-017, TC-INT-002

## Entrada

| Origem            | URL / caminho          | Estado de partida                                                       |
| ----------------- | ---------------------- | ----------------------------------------------------------------------- |
| navegação interna | `/admin/campanhas`     | logada como `admin-loja`; BF em vigência; Natal agendada; pedidos do CH-04 gravados |

## Passos

| # | A persona… | Deve ver | Em até | Fricção prevista | TC |
| - | ---------- | -------- | ------ | ---------------- | -- |
| 1 | confere uma peça de M-G (marcada no Natal, agendada) na loja | preço de sempre, sem selo, fora de `/ofertas` | 10 s | — | TC-FUNC-006 |
| 2 | tira M-D da BF ("Nenhum") | na loja, M-D volta ao preço de sempre; o preço cadastrado não mudou | 20 s | — | TC-FUNC-009 |
| 3 | desliga a BF e confere a loja; religa | desligada: a loja sem desconto; religada: o desconto volta | 30 s | — | TC-FUNC-009 |
| 4 | numa aba da loja, põe M-A na sacola e abre o checkout; na aba do painel, "Encerrar agora" | a confirmação; a lista com "Encerrada" | 30 s | — | TC-FUNC-017 |
| 5 | volta à aba do checkout e tenta finalizar | o total novo e o pedido de nova confirmação, ou o aviso "Um desconto deste pedido mudou. Nada foi cobrado." | 10 s | total velho na tela | TC-FUNC-017 |
| 6 | abre `/ofertas` e a Home | "Não há ofertas agora"; sem o bloco "Joias em oferta" | 5 s | — | TC-FUNC-012 |
| 7 | abre o pedido do CH-04 no painel | o mesmo preço cobrado, "Desconto de campanha" e o total de antes | 10 s | — | TC-INT-002 |
| 8 | cria "Dia das Mães" (texto "DIA DAS MÃES", #6E2433/#F6DCD8, 10 e 15 %), em vigência; marca M-A e M-D | na loja, a faixa "DIA DAS MÃES" nas cores novas, a vitrine e o bloco da Home com o nome novo | 90 s | início que cruza a BF encerrada | TC-FUNC-013 |

**Tempo total esperado:** ~6 min.

## Objetivo

- **Observável:** a BF "Encerrada" com as marcações guardadas, o pedido antigo intacto, e a loja mostrando só o
  "Dia das Mães".
- **Efeitos colaterais:** nenhum preço cadastrado mudou.

## Saída

- **Natural:** a lista de campanhas.

## Desvios e abandono

| Ramo  | No passo | Quando | A persona… | Deve acontecer | TC |
| ----- | -------- | ------ | ---------- | -------------- | -- |
| J-06a | 4 | tenta apagar a BF depois de encerrar | lê o motivo | apagar desligado: a campanha foi usada em pedido | TC-INT-002 |
| J-06b | 5 | recarrega o checkout em vez de finalizar | — | o preço de sempre, sem selo; a sacola mantida | TC-FUNC-017 |

## Fronteiras

Edge function `checkout` (`create-order` recusando a campanha que acabou).

## Modos de falha

- Encerrar muda o pedido já gravado, ou apaga a campanha usada
- O checkout aberto cobra o valor com desconto depois do fim sem avisar, ou cobra mais sem avisar
