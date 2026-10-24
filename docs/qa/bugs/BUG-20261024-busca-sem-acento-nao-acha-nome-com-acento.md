# BUG-20261024-busca-sem-acento-nao-acha-nome-com-acento: Digitar o nome sem acento ("valeria") não acha "Valéria"

- **Status:** open (aguarda decisão humana, task aberta no `tasks.md`)
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri no celular
- **Journey Step:** J-achar-uma-cliente, passo 2 (colar o que tenho da cliente na busca)
- **Scenarios:** MAD-clientes-buscar-nome-email-telefone
- **Found:** 2026-10-24 · **Report:** reports/2026-10-24-mobile-adm-clientes-achar-quem-me-escreveu.md

## Summary

Mensagens de WhatsApp e e-mails costumam chegar sem acento, e a Adri digita no teclado do celular sem trocar de camada. A busca é sensível a acento: `valeria` responde "Não achei ninguém com “valeria”", `valéria` acha "P76 Valéria Rosa". O painel desktop faz o mesmo (paridade, não regressão da `76`), mas no celular o custo de digitar o acento é maior.

## Reproduction

- **Charter:** CH-clientes-achar-quem-me-escreveu · **Tour:** Paste Tour
- **Environment:** Chromium 390x844 móvel, build servido do worktree da `76` (`vite preview`), Supabase local :54441, sessão da admin do `seed.sql`; `*.supabase.co` abortado.

1. Abrir `/clientes`.
2. Digitar `valeria` no campo "Buscar cliente".
3. Digitar `valéria`.

**Expected:** o mesmo achado com e sem acento (como a busca de produto do painel, que dobra o acento, `AD-036`).
**Actual:** `valeria` 0 linhas; `valéria` e `VALÉRIA` 1 linha.

## Evidence

- `docs/qa/evidence/2026-10-24-mobile-adm-clientes/sessao-colar.txt`.

## Fix

Decisão humana: a dobra de acento exige `unaccent` na view ou coluna dobrada no banco (migration), pois `ilike` não a faz. Opções: (a) manter a paridade com o painel e aceitar; (b) migration com `unaccent`; (c) busca client-side sobre a janela já lida (não serve com mais de 25 linhas).

## Fix applied

Não aplicado: a dobra de acento exige `unaccent` (ou coluna dobrada) no banco — migration, e muda a busca do painel junto. Decisão humana pendente (B03).
