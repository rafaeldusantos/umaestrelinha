# 99 · Decisões de produto da QA

## Rodada 1 — 2026-11-14

Respondida no chat do orquestrador junto com o Gate 3 (o humano delegou as decisões desta sessão às recomendações;
resposta: "ok"), em vez da página — por pedido dele.

| # | Pergunta | Resposta | Destino | Origem |
| - | -------- | -------- | ------- | ------ |
| 1 | O "mesmo Total" do CA-04 (PRD 97) e do CA-16 vale com o mesmo meio de pagamento, ou a gaveta deve mostrar o Total com o PIX que o checkout pré-marca? (gaveta R$ 629,70 × checkout com PIX −7 % R$ 585,62; com cartão, iguais) | Vale com o mesmo meio de pagamento. A gaveta não escolhe meio de pagamento e segue mostrando o Total sem desconto de meio; o checkout pode chegar com o PIX marcado. Nada muda no produto | `ajusta o plano` — TC-FUNC-003 e TC-JOURNEY-001 passam a dizer "com o mesmo meio de pagamento" (com cartão, os Totais batem — CH-01 continuação). Mostrar o Total "no PIX" na gaveta, se um dia for pedido, é `WI novo` | CH-01 A-1 (2 de 2) · `qa-result.md` › Perguntas ao produto |
