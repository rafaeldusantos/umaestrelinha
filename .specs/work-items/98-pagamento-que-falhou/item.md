---
id: 98
titulo: O pagamento que falhou — pagar de novo na loja, e o pago por fora registrado no painel
tipo: feature
entrada: descoberta
fase: done
criado: 2026-11-09
---
## Descrição
Nos pagamentos realizados pelo cliente.. se houver um problema com o pagamento do cliente, seja por falta de pagamento PIX ou falha no pagamento por Cartão, verificar se o cliente tem alternativa de conseguir pgar o pedido novamente quando ocorre algum problema de falha de pagamento. Ai um problema no Backoffice, quando ocorre um problema de pagamento pelo sistema do site, e o cliente paga por outro meio por fora da loja, o administrador deve ser capaz de alterar manualmente o status de pagamento para Pago, incluir observação e anexo como print ou comprovantes de pagamento.

## Insumos

## Gates
| gate | quando | resultado |
| ---- | ------ | --------- |
| descoberta | 2026-11-09 | ratificado · 2 premissas + 8 perguntas → `prd.md` · 3 premissas técnicas (P-02, P-04, P-05) ratificadas pela recomendação · UC-05 (link de cartão pelo painel) e UC-06 (cancelamento em 7 dias) nasceram das respostas |
| prd-review r1 | 2026-11-09 | changes_requested_blocking · 18 aplicados ao `prd.md` (7 pela página, 11 ratificados pela recomendação) · 2 em Decisões · 0 abertos |
| handoff | 2026-11-09 | pass · 2 itens (H-01, H-02) pela página + 14 conflitos resolvidos pela conferência → `spec.md` Decisões · 0 travados · design: seguir sem design (resposta no chat) |
| fila | 2026-11-09 | aprovada · 01–08 · auditoria `a fila serve com correção` (3 corrigidos, 0 ao humano) |
| execução | 2026-11-09 | autorizada: 01–08 ("aprovado, pode executar!") |
| validation 1 | 2026-11-10 | FAIL (1 fix task: 09, test-missing RNF-07 + lacunas CA-03.9/RNF-06) · suítes 22483/0 · build/tipos/lint = baseline |
| fix tasks | 2026-11-10 | 09 (FAIL da validation 1), autorizada pelo pedido de seguir até o QA |
| validation 2 | 2026-11-10 | PASS · 57/58 cobertos (RNF-04 para o QA) · fix 09 `serve` · QA real-user segue em seguida (pedido do humano) |
| QA · Gate 1 — plano | 2026-11-10 | aprovado · 4 personas · 7 jornadas · 7 charters · 48 TC (P0 6 · P1 36 · P2 6) · sem cobertura: RNF-02, RNF-05, RNF-07 (provados na Validation) |
| QA · Gate 3 — triagem r1 | 2026-11-10 | confirmado (pedido de seguir sem parar) · fail · 12 bugs novos (critical 2 · high 4 · medium 5 · low 1) · 30 pass · 11 fail · 7 blocked · 1 pergunta ao produto pela página · 30 sugestões de backlog |
| fix tasks QA r1 | 2026-11-10 | 10–17 (BUG-001..012 em 8 lotes), autorizadas pelo pedido de seguir até o QA e consertar sem parar · BUG-004: desfazer recusado no pago duas vezes (ratificado pela recomendação) |
| validation 3 | 2026-11-10 | PASS · 10–17 done (revisões `serve`) · suítes 22544/0 · tipos/lint = baseline · build ok · 1 migration nova só no local · QA confirmação r2 a seguir |
| fix task 18 | 2026-11-10 | BUG-012 still-open no reteste r2 (o `h1` de `/pagar-com-cartao` a 320/200 %) → tarefa 18 done (revisão `serve`; store 7184/382) · reteste r2 relançado com login autorizado pelo humano |
| QA · pergunta ao produto r1 | 2026-11-10 | QA-P1 → opção 1 (sem oferta de pagar; WhatsApp), escopo deste WI · página: 1ª resposta 'valor gravado' reaberta no chat por risco BL-030 · fix task 19 |
| QA · Gate 3 — confirmação r2 | 2026-11-10 | confirmado · partial · 10 resolved · BUG-005 cannot-reproduce (sem massa) · BUG-010 still-open · BUG-013 novo (medium, regressão da tarefa 14) · fix tasks 19–21 |
| validation 4 | 2026-11-10 | PASS · 19–21 done (revisões `serve`) · suítes 22570/0 · tipos/lint = baseline · build ok · reteste QA r3 a seguir |
| QA · Gate 3 — confirmação r3 | 2026-11-10 | confirmado · partial (só `blocked` de ambiente/massa: TC-JOURNEY-002, TC-INT-005, TC-FUNC-023 e P1) · BUG-010 e BUG-013 resolved · 0 bugs abertos (12 resolved, BUG-005 cannot-reproduce) · N-1..N-3 → Sugestões de backlog |
