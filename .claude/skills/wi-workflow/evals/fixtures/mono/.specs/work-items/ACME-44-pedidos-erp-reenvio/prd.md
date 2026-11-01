# PRD — Reenviar ao ERP os pedidos com falha

## Casos de uso

- **UC-01 — Reenvio automático.** O job reenvia ao ERP, a cada hora, os pedidos com falha de integração, até 3 tentativas.
- **UC-02 — Recusa por CEP.** A API recusa o pedido com CEP fora da área de entrega, com o motivo no corpo da resposta.

## Fora do escopo

- Painel de acompanhamento das falhas.

Fonte: colado na conversa em 2026-10-27
