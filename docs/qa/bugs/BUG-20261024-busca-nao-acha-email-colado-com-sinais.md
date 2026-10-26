# BUG-20261024-busca-nao-acha-email-colado-com-sinais: Colar o e-mail como vem num cabeçalho (`Nome <email>`, `mailto:`, ponto final) não acha a cliente

- **Status:** verified (retestado em navegador, 2026-10-24, rodada 2 — reports/2026-10-24-mobile-adm-clientes-reteste-1.md)
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri no celular
- **Journey Step:** J-achar-uma-cliente, passo 2 (colar o que tenho da cliente na busca)
- **Scenarios:** MAD-clientes-buscar-nome-email-telefone
- **Found:** 2026-10-24 · **Report:** reports/2026-10-24-mobile-adm-clientes-achar-quem-me-escreveu.md

## Summary

Quem escreve à loja aparece na caixa de entrada como `Nome <email>`, e o texto de uma mensagem costuma terminar o e-mail com ponto. A Adri cola isso e o app responde "Não achei ninguém"; só o e-mail limpo acha. Não é erro nem quebra: é a lista dizendo que a pessoa não existe quando existe.

## Reproduction

- **Charter:** CH-clientes-achar-quem-me-escreveu · **Tour:** Paste Tour
- **Environment:** Chromium 390x844 móvel, build servido do worktree da `76` (`vite preview`), Supabase local :54441, sessão da admin do `seed.sql`; `*.supabase.co` abortado.

1. Abrir `/clientes`.
2. Colar `<p76.telefone@exemplo.invalid>`, depois `Fulana <p76.telefone@exemplo.invalid>`, depois `mailto:p76.telefone@exemplo.invalid`, depois `p76.telefone@exemplo.invalid.` (ponto de fim de frase).
3. Repetir com `p76.telefone@exemplo.invalid` puro.

**Expected:** o e-mail dentro dos sinais acha a cliente (ou, no mínimo, `<`, `>`, `mailto:` e o ponto final são removidos do termo).
**Actual:** As quatro formas devolvem 0 linhas; o e-mail puro devolve 1 ("P76 Telefone Teste"). O mesmo vale para rótulos coláveis como `Cel: 51 99812-4471` e `Tel (51) 99812-4471` (0 linhas), embora `(51) 99812-4471` ache.

## Evidence

- `docs/qa/evidence/2026-10-24-mobile-adm-clientes/sessao-colar.txt`.

## Fix

Sugestão (decisão de produto, pois muda o dono `core/customers`): extrair o e-mail de `<…>` e tirar `mailto:`/pontuação final antes da busca, e ignorar um rótulo textual (`Cel:`, `Tel`) quando o resto tem cara de telefone.

## Fix applied (2026-10-24, task B02)

Mesma `limparTermoColado`: havendo um e-mail no meio do termo, o termo é ele (sem `<>`, aspas, parênteses, `mailto:` e pontuação final); um rótulo de telefone de lista fechada (`Cel:`, `Tel`, `WhatsApp`…) cai quando o resto tem cara de telefone. "Telma Souza" e "Marina 2" continuam nomes. Testes em `search.test.ts`.
