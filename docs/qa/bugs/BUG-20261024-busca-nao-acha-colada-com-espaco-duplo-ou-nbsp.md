# BUG-20261024-busca-nao-acha-colada-com-espaco-duplo-ou-nbsp: Colar o nome com dois espaços ou com espaço não separável diz "Não achei ninguém"

- **Status:** verified (retestado em navegador, 2026-10-24, rodada 2 — reports/2026-10-24-mobile-adm-clientes-reteste-1.md)
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri no celular
- **Journey Step:** J-achar-uma-cliente, passo 2 (colar o que tenho da cliente na busca)
- **Scenarios:** MAD-clientes-buscar-nome-email-telefone
- **Found:** 2026-10-24 · **Report:** reports/2026-10-24-mobile-adm-clientes-achar-quem-me-escreveu.md

## Summary

A Adri copia o nome da cliente de uma mensagem e cola na busca. Se o nome vem com dois espaços ou com espaço não separável entre as palavras, a lista responde "Não achei ninguém com “Marina Albuquerque”", embora a cliente exista e o mesmo texto com um espaço comum a ache. Só os espaços das pontas são aparados; os do meio entram crus no `ilike`. É exatamente a "sujeira" que o charter pede que a busca tolere, e a frase de vazio faz a Adri achar que a cliente não existe.

## Reproduction

- **Charter:** CH-clientes-achar-quem-me-escreveu · **Tour:** Paste Tour
- **Environment:** Chromium 390x844 móvel, build servido do worktree da `76` (`vite preview`), Supabase local :54441, sessão da admin do `seed.sql`; `*.supabase.co` abortado.

1. Entrar no app do ateliê e abrir `/clientes`.
2. Colar `Marina Albuquerque` (espaço não separável, o que o WhatsApp Web e muitos e-mails põem entre as palavras) ou `Marina  Albuquerque` (dois espaços) no campo "Buscar cliente".
3. Esperar 300 ms.
4. Repetir com `Marina Albuquerque` (um espaço comum).

**Expected:** o mesmo achado que o termo com um espaço comum (a cliente "P76 Marina Albuquerque…"), ou ao menos os espaços internos tratados como um só.
**Actual:** `Marina  Albuquerque` e `Marina Albuquerque` devolvem 0 linhas e "Não achei ninguém com “Marina Albuquerque”"; `Marina Albuquerque` devolve 1. A mesma busca no painel desktop usa o mesmo montador (`buildCustomerSearchCondition`), então o comportamento é herdado, mas só o celular é onde se cola de conversa.

## Evidence

- `docs/qa/evidence/2026-10-24-mobile-adm-clientes/sessao-colar.txt` (saída do roteiro, 29 termos).
- Leitura independente: o pedido enviado ao banco (`customer_list?or=(name.ilike."%Marina  Albuquerque%",…`) tem os dois espaços.

## Fix

Sugestão: em `buildCustomerSearchCondition` (`packages/core/src/customers/search.ts`, dono único, o painel o reexporta) normalizar `\s+` (inclui U+00A0) para um espaço antes de montar o `ilike`; sensor com NBSP e com dois espaços.

## Fix applied (2026-10-24, task B01)

`limparTermoColado` (`packages/core/src/customers/search.ts`, o dono): `\s+` (inclui U+00A0) vira um espaço e os caracteres de largura zero somem, só na porta do app (`buildAppCustomerSearch`); o painel, sem opções, segue caractere a caractere. Testes em `search.test.ts`.
