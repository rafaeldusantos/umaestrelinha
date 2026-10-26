# BUG-20261024-nome-da-ficha-quebra-no-meio-da-palavra-a-200: a 200 % o avatar toma um terço da largura e o nome parte "Albuque/rque"

- **Status:** verified (retestado em navegador, 2026-10-24, rodada 2 — reports/2026-10-24-mobile-adm-clientes-reteste-1.md)
- **Impact (user-side):** Cosmetic
- **Severity:** Low · **Priority:** P4
- **Persona Affected:** Equipe com TalkBack (fonte a 200 %)
- **Journey Step:** J-ver-uma-cliente, abre a ficha de uma cliente de nome longo
- **Scenarios:** MAD-cliente-fonte-grande-e-telas-estreitas
- **Found:** 2026-10-24 · **Report:** `docs/qa/reports/2026-10-24-mobile-adm-clientes.md`

## Summary

Em 390×844 com fonte a 200 %, o título da ficha (nome de 70 caracteres) fica numa coluna de ~260 px ao lado do
avatar, e a palavra "Albuquerque" é partida no meio ("Albuque" / "rque"), "Vasconcelos" idem. Nada estoura nem
sobrepõe (a matriz mede 0 falhas), mas a leitura do nome fica ruim justamente para quem usa fonte grande.

## Reproduction

- **Charter:** CH-clientes-com-fonte-grande · **Tour:** Feature Tour
1. Fixtura `p76.endereco…` (22 pedidos), /clientes/<id>, 390×844, fonte 200 %.
2. Olhar o título.

**Expected:** o nome usa a largura inteira (avatar acima ou escondido com fonte grande).
**Actual:** nome em coluna estreita com quebra no meio de palavra.

## Evidence

- `docs/qa/evidence/2026-10-24-clientes/390-ficha-topo-200.png`

## Fix

Não aplicado (escolha de desenho). Sugestão: empilhar avatar e nome abaixo de um limiar de largura/escala.

## Fix applied (2026-10-24, task B07)

`CabecalhoDaCliente`: o cabeçalho embrulha (`flex-wrap`) e o bloco do texto tem `min-w-[min(100%,12rem)]`; a 200 % o avatar sobe e o nome usa a largura inteira. Teste de fonte em `BlocosDaFicha.test.tsx` (jsdom não mede layout). **Falta a medição em navegador.**
