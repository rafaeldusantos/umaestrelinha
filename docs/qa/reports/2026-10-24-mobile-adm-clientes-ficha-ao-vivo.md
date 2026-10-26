# QA Run Report — 2026-10-24 — mobile-adm-clientes (rodada 1, charter CH-clientes-ficha-ao-vivo-e-troca-de-conta)

- **Scope:** feature `76`, a ficha e a lista de Clientes relendo o que mudou por fora (sem Realtime, `MAC-13`), a perda do papel com a ficha aberta (`MAC-37`) e a troca de conta (`MAC-38`).
- **Cadence tier:** targeted · **Tour:** Multi-Tab
- **Build:** working tree sem commit (`feat/76-mobile-adm-clientes`); `pnpm --filter @estrelinha/mobile-adm build` + `vite preview --port 4377`. Bundle servido conferido: `index-CVS60M6O.js` contém "Não encontrei esta cliente".
- **Environment:** http://localhost:4377, Supabase local :54441 (nada interceptado do banco), Chromium headless 390×844 móvel; `*.supabase.co` e `**/g/collect*` abortados; service worker bloqueado. Contas: admin do seed e duas contas minhas (`qa76-admin-b`, `qa76-sempapel`, `@exemplo.invalid`), apagadas ao fim.
- **Started:** 2026-10-24 12:50 · **Status:** closed

## Session Matrix & Results

| # | Charter | Scenario | Persona | Tour | Status | Issue |
|---|---|---|---|---|---|---|
| 1 | CH-clientes-ficha-ao-vivo-e-troca-de-conta | MAD-cliente-muda-com-a-ficha-aberta | Adri no celular | Multi-Tab | Pass | |
| 2 | idem | MAD-cliente-perde-o-acesso-com-ficha-aberta | idem | idem | Pass | |
| 3 | idem | MAD-clientes-troca-de-conta-limpa-tela | idem | idem | Pass | |

## Session Debriefs

### CH-clientes-ficha-ao-vivo-e-troca-de-conta — Adri no celular

- **Ficha, pedido novo e pago em outra aba** (convidada fixtura, 22 compras): 3 s sem ação, nada muda (esperado, `MAC-13`). Ao voltar ao primeiro plano (`visibilitychange` borbulhando até `window`, como o navegador faz): Compras 22 → 23 e a lista 22 → 23 com `#P76-QA1`. Pedido despago por fora e foco: Compras volta a 22, a lista mantém 23 (o pedido segue na lista, não nos números pagos). Gesto de puxar (toque via CDP): relê e traz o mesmo resultado.
- **Cliente apagada com a ficha aberta:** ao voltar, "Não encontrei esta cliente."; devolvida a linha e novo foco, a ficha reaparece.
- **Lista de Clientes:** com a busca "P76 Telefone" ativa, pedido pago em produção por fora e foco: a linha passa de "Sem compra paga ainda · R$ 0" para "1 compra · última agora · Em aberto · R$ 300", e o campo de busca mantém o termo. Pedido pendente: volta a "Sem compra paga ainda".
- **Papel retirado com a ficha aberta:** a ficha estava desenhada; retirado o papel e disparado o foco, em 250 ms a tela já é o Login com "Esta conta não tem acesso ao painel." e nenhum dado da cliente aparece depois; recarregar mantém a recusa. (A outra sessão registrou o quadro curto "Não consegui carregar" no meio; minha amostragem de 250 ms não o viu.)
- **Troca de conta:** vigia de 30 ms armada no clique de Sair, procurando nome, e-mail e pedidos da ficha. Admin → Sair → conta sem papel: só 1 amostra com a ficha, a do instante do clique (menu ainda mostrando o e-mail da admin); depois do Sair, zero. Entrar com a conta sem papel dá a recusa, e colar `/clientes/<id>` cai no Login. Admin → outra admin: o dado visto é o da loja, legítimo para as duas.
- **Fonte 130% e 200% no estado "Não encontrei esta cliente.":** sem rolagem horizontal (390 = 390).
- **Bugs filed/updated:** nenhum.
- **Scenarios settled:** MAD-cliente-muda-com-a-ficha-aberta → pass; MAD-cliente-perde-o-acesso-com-ficha-aberta → pass; MAD-clientes-troca-de-conta-limpa-tela → pass.

## Notas de método (não são defeitos do produto)

- O banco local é **compartilhado com outras sessões**: a conta `probe76-cliente` foi apagada por outra sessão no meio da rodada (o login passou a dar 400 e o papel sumiu). Criei contas próprias com ids `…-b076-…` e as removi.
- Um `visibilitychange` despachado sem `bubbles` não chega ao `window`, onde o React Query escuta: a primeira tentativa "provou" falsamente que o foco não relê. O gesto de puxar funcionou nas duas.

## Final Status

0 defeitos novos (0 Blocks-Completion, 0 Data-Loss, 0 Trust-Damage). Não provado: Android real (a volta de verdade do app ao primeiro plano, o gesto de puxar com o dedo, TalkBack). Suíte automatizada não reexecutada nesta rodada (rodada de QA sem alteração de código).

Evidências: `docs/qa/evidence/2026-10-24-mobile-adm-clientes-ficha-ao-vivo/`.
