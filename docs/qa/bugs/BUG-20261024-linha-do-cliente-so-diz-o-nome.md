# BUG-20261024-linha-do-cliente-so-diz-o-nome: Na lista de clientes o leitor de tela lê só o nome, sem compras, total nem "Em aberto"

- **Status:** verified (retestado em navegador, 2026-10-24, rodada 2 — reports/2026-10-24-mobile-adm-clientes-reteste-1.md)
- **Impact (user-side):** Friction
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Equipe com TalkBack
- **Journey Step:** J-achar-uma-cliente, passo "percorrer a lista"
- **Scenarios:** MAD-clientes-com-leitor-de-tela; MAD-clientes-recortes-e-selo
- **Found:** 2026-10-24 · **Report:** reports/2026-10-24-mobile-adm-clientes-leitor-de-tela.md

## Summary

Cada linha da lista é um link com `aria-label` igual ao nome (`nomeDoCliente`). O `aria-label` substitui o
conteúdo do link, então quem navega por TalkBack ouve "P76 Marina Albuquerque…, link" e mais nada: o
"22 compras · última há 1 dia", o total e o selo "Em aberto" existem na tela e **não existem** na árvore
de acessibilidade. A pergunta que a aba existe para responder ("ela tem peça minha em andamento?") só se
responde abrindo cada ficha. O chip "Com pedido em aberto" fica sem contrapartida audível: filtrado ou não,
todas as linhas soam iguais.

A lista de pedidos da `74`/`75` não tem o defeito: a linha do pedido lê tudo, e o botão do cartão ganhou
`nomeDaLinha` (C04 da `75`).

## Reproduction

- **Charter:** CH-clientes-com-leitor-de-tela · **Tour:** Feature Tour
- **Environment:** Chromium 390×844, build servido do worktree da `76`, Supabase local, sessão da admin do seed

1. Entrar, abrir Clientes.
2. Ler a árvore de acessibilidade (`ariaSnapshot`) da `region "Clientes"`.

**Expected:** (cenário) "Cada linha anuncia nome, compras, total e se está em aberto".
**Actual:** `link "P76 Marina Albuquerque de Vasconcelos Teixeira Duarte Figueiredo Santos"` e o texto
`22 compras · última há 1 dia Em aberto R$ 2.453` aparece só como filho textual do link, sem entrar no nome
acessível. Idem `link "probe76-cliente@exemplo.invalid"` (1 compra, Em aberto, R$ 100).

## Evidence

- `evidence/2026-10-24-clientes-leitor-de-tela.txt` (só linhas de fixtura)
- Markup: `<a aria-label="P76 Marina …" data-testid="linha-do-cliente" …>`; origem `apps/mobile-adm/src/entities/customer/ui/LinhaDoCliente.tsx:27`
- `design.md` §3.6 manda o `aria-label` = `nomeDoCliente`; a decisão contradiz o `expected` do cenário.

## Fix

Sugestão (não aplicada nesta rodada): tirar o `aria-label` e deixar o nome vir do conteúdo (o `Inicial` já é
decorativo), ou compor o rótulo a partir das mesmas frases fixas (`subtituloDaLinha`, total, "Em aberto"), num
único dono (molde `nomeDaLinha` da `75`). Exige regra de teste: o nome acessível contém o subtítulo e o selo.

## Fix applied (2026-10-24, task B08)

`LinhaDoCliente`: o `aria-label` é nome, subtítulo, total e "em aberto", em vírgulas (sem o ponto médio). Testes em `LinhaDoCliente.test.tsx`.
