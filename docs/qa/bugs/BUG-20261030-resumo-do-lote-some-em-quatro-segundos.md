# BUG-20261030-resumo-do-lote-some-em-quatro-segundos: O resumo do lote some em cerca de 4 segundos e não diz por que alguns pedidos ficaram como estavam

- **Status:** verified (2026-10-30, reteste em navegador; working tree, sem commit)
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri despachando pedidos
- **Journey Step:** J-avancar-pedidos-em-lote, passo 'Resumo'
- **Scenarios:** PNL-lote-avancar-com-progresso
- **Found:** 2026-10-30 · **Report:** reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos.md
- **AC:** CRG-11

## Summary

Depois de avançar 50 pedidos, o único resumo visível é um aviso flutuante: "48 avançaram · 2 ficaram como estavam · sem e-mail às clientes — anotado no histórico de 34 pedidos". Ele aparece ~2,7 s após o clique e some ~4 s depois; o motivo dos 2 ("já no fim do caminho", que o diálogo mostrava) não está no resumo. Quem desviou o olho para outra janela perde o desfecho do lote.

## Reproduction

- **Charter:** CH-aviso-lote-do-dia · **Tour:** Money Tour
- **Environment:** Chromium 1440×900

1. Selecionar 67 pedidos do filtro (o lote age sobre 50).
2. Avançar status → desmarcar → Avançar 48 pedidos.
3. Medir o tempo do aviso na tela.

**Expected:** (CRG-11) Resumo com mudados, recusados com o motivo, falhas e e-mails — que fique até ser dispensado.
**Actual:** Toast de ~4 s, sem o motivo dos recusados; a região viva repete o texto.

## Evidence

- evidence/2026-10-30-aviso-opcional/10-lote-resumo-1440.png

## Fix (2026-10-30)

O resumo do lote deixou de ser aviso flutuante: fica na lista, numa região `role="status"`
("Resumo do lote"), até "Dispensar o resumo do lote" — e recebe o foco ao aparecer. `bulkSummary`
passou a dizer o motivo dos que ficam: "N ficaram como estavam (já no fim do caminho)".

- Arquivos: `pages/admin/AdminOrdersPage.tsx`, `features/order-list/model/bulkMaterial.ts`.
- Testes: `AdminOrdersPage.aviso.test.tsx` (novo caso + os do resumo, que liam o toast, passaram a ler
  a região), `AdminOrdersPage.test.tsx` (idem) e `loteComAviso.test.ts` (o motivo). Mutantes Q5a..Q5c
  mortos por asserção.

## Verification

- **Retested:** 2026-10-30, Adri despachando pedidos, Chromium 1440×900 · **Report:** reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos-reteste.md
- **Result:** 6 selecionados (4 Em Separação, 2 Entregue), "Avançar status", caixa desmarcada, "Avançar 4 pedidos": o resumo fica na lista numa região `role=status` "Resumo do lote": "4 avançaram · 2 ficaram como estavam (já no fim do caminho) · sem e-mail às clientes — anotado no histórico de 4 pedidos", recebe o foco ao aparecer e continua igual 20 s depois; nenhum aviso flutuante com o desfecho. "Dispensar o resumo do lote" o tira. Banco: 4 `shipped`, 2 `delivered`, 4 linhas `skipped`. **Achado novo**: depois de "Dispensar" o foco cai no `<body>` → `BUG-20261030-foco-cai-no-body-ao-reler-e-ao-dispensar`. Evidência `evidence/2026-10-30-aviso-opcional-reteste/r5-resumo-do-lote-1440.png`.
