# BUG-20261031-foco-cai-no-body-ao-renovar-ou-cancelar-proposta: renovar ou cancelar a proposta solta o foco no corpo da página

- **Status:** verified
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri montando uma venda
- **Journey Step:** J-acompanhar-pedidos-montados, steps "Renovar" e "Cancelar"
- **Scenarios:** PNL-montado-editar-renovar-cancelar; PNL-montado-fonte-grande-e-teclado
- **Found:** 2026-10-31 · **Report:** reports/2026-10-31-pedido-montado.md

## Summary

Depois de confirmar "Renovar o prazo" ou "Cancelar proposta" pelo teclado, o foco vai para o `<body>`
e nada é anunciado (nenhuma região viva diz "link novo gerado" ou "proposta cancelada"). Quem usa
teclado ou leitor de tela recomeça do topo sem saber o que aconteceu. Mesma família de
`BUG-20261030-foco-cai-no-body-nas-acoes-do-pedido`.

## Reproduction

- **Charter:** CH-montado-fonte-grande-teclado-e-privacidade · **Tour:** Feature Tour
- **Environment:** 1440, só teclado, painel :8083

1. Em `/admin/pedidos/montados/:id` aberta, focar "Renovar o prazo" e Enter; confirmar.
2. Ler `document.activeElement` e as regiões vivas.

**Expected:** foco num lugar com sentido (o link novo, o título) e o resultado anunciado.
**Actual:** `BODY`, nenhuma região viva com texto. O mesmo no "Cancelar proposta".

## Evidence

- Eventos `renewed` (P-0009) e `cancelled` (P-0004) gravados; foco medido em `BODY` nos dois.
- Os dois diálogos são `window.confirm` nativos.

## Fix

- **Fix:** T34: foco pelo dono `shared/lib/foco.ts` e região `aria-live="polite"` própria na página da proposta.
- **Regression test:** `AdminProposalPage.test.tsx` (+3).

## Verification

- **Retested:** 2026-10-31, em navegador (Chromium, loja :8082 e painel :8083 locais, functions servidas) · **Report:** reports/2026-10-31-pedido-montado-reteste.md
- **Result:** 1440, só teclado. "Renovar o prazo" (P-0010) com Enter e confirmação ⇒ foco no parágrafo do link novo (`tabIndex -1`, à vista, com contorno), região viva "Link novo gerado. O link antigo parou de funcionar.", e o link mudou. "Cancelar proposta" (P-0012) com Enter e confirmação ⇒ foco no `h1` "Pedido montado P-0012", região viva "Proposta cancelada.", selo Cancelada; o link de P-0012 aberto na loja, ao pagar, passou a "Este link não está mais disponível". Não testado: o ramo de falha (foco de volta ao botão) e um leitor de tela de verdade.
