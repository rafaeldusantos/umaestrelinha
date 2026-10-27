# BUG-20261026-codigo-corrigido-nao-reavisa: Quando a Adri corrige o código, ninguém é avisado do código novo

- **Status:** wontfix — mantido por decisão (2026-10-27), registrado (`BL-055`)
- **Impact (user-side):** Trust-Damage
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Adri no celular
- **Journey Step:** J-registrar-envelope-da-cliente, side effects do passo 3
- **Scenarios:** MAD-envelope-alterar-duas-vezes
- **Found:** 2026-10-26 · **Report:** reports/2026-10-26-mobile-adm-envelope-da-cliente.md

## Summary

Cada Salvar dispara `material_tracking_set`, mas o motor só cria a linha do evento uma vez por pedido: três
gravações seguidas (código com erro, o mesmo corrigido, outro) geraram **uma** linha em `order_notifications`.
Se `material_tracking_registered` estiver ligado, a cliente recebe o primeiro código — o errado — e nunca o
corrigido. A tela não diz nada disso (o aviso diz só "Pedido #NNNN atualizado.", certo).

## Reproduction

- **Charter:** CH-envelope-registrar-o-codigo-da-cliente · **Tour:** Paste Tour

1. P82-A: salvar um código; "Alterar" e salvar outro; de novo.
2. `order_notifications` do pedido.

## Evidence

- uma linha (`owner_material_incoming`, a primeira gravação); as três chamadas a `send-notification?action=trigger` na rede.

## Decisão pendente

1. Manter (um aviso por pedido) e, na folha de "Alterar", não prometer e-mail — já é assim (A6).
2. Reavisar quando o código muda (evento próprio, "código corrigido"). Custo: e-mail novo, copy da Adri.

**Recomendação:** 1, registrado; 2 só se a dona pedir.

## Decisão (2026-10-27, feature `82`, Fase 5, T22)

Opção 1 (recomendação do QA): manter um aviso por pedido. Sem mudança de código. Registrado em
`apps/mobile-adm/CLAUDE.md` (seção do envelope) e em `.specs/BACKLOG.md` (`BL-055`), com o risco: com o
e-mail `material_tracking_registered` ligado, a cliente fica com o PRIMEIRO código. Reavisar (evento
"código corrigido") só se a dona pedir.
