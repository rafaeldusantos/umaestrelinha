# BUG-20261024-ver-mais-pedidos-foco-cai-no-body: Depois de "Ver mais pedidos" o foco vai para o corpo da página e nada anuncia o que chegou

- **Status:** verified (retestado em navegador, 2026-10-24, rodada 2 — reports/2026-10-24-mobile-adm-clientes-reteste-1.md)
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Equipe com TalkBack
- **Journey Step:** J-ver-uma-cliente, passo "ver todos os pedidos dela"
- **Scenarios:** MAD-cliente-com-leitor-de-tela
- **Found:** 2026-10-24 · **Report:** reports/2026-10-24-mobile-adm-clientes-leitor-de-tela.md

## Summary

Na ficha de quem tem mais de 20 pedidos, "Ver mais pedidos" lê a janela seguinte. Quando a última janela
chega o botão sai do DOM (`!fim` falso) e o foco que estava nele cai no `<body>`: o leitor de tela recomeça
do topo da página, longe dos pedidos novos. Também não há anúncio de quantos pedidos chegaram (a única
região viva da página é o "Atualizado às"). Mesma família do foco no body da folha do rastreio (C03 da `75`),
sintoma novo.

## Reproduction

- **Charter:** CH-clientes-com-leitor-de-tela · **Tour:** Feature Tour
- **Environment:** Chromium 390×844, build servido; fixtura da `76` (convidada com 22 pedidos)

1. Abrir a ficha de "P76 Marina Albuquerque…" (22 pedidos, 20 na primeira janela).
2. Tocar "Ver mais pedidos".
3. Ler `document.activeElement` e as regiões vivas.

**Expected:** o foco vai ao primeiro pedido novo (ou ao título "Pedidos · 22"), e "2 pedidos a mais" é anunciado.
**Actual:** 20 → 22 linhas; `activeElement` = `BODY`; regiões vivas: só `Atualizado às 12h48.`.

## Evidence

- Roteiro Playwright da sessão (ver relatório); botão `Ver mais pedidos` de `PedidosDaCliente.tsx`.

## Fix

Sugestão: ao concluir a leitura, focar a primeira linha nova (`tabindex="-1"`) e escrever uma frase numa
região `role="status"`.

## Fix applied (2026-10-24, task B10)

`PedidosDaCliente`: depois de "Ver mais pedidos" o foco vai à primeira linha nova (ou ao "Tentar de novo" do rodapé, se a página falhou) e a região viva diz "Agora são N pedidos na lista.". Sem toque, uma releitura não rouba o foco. Testes em `BlocosDaFicha.test.tsx`.

## Retest (2026-10-24, rodada 2)

Verificado no sucesso e na primeira falha. Resíduo: `BUG-20261024-tentar-de-novo-da-ficha-solta-o-foco-ao-falhar-de-novo`.
