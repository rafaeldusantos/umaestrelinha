# BUG-20261024-vazio-da-busca-nao-e-anunciado: Busca ou recorte sem resultado não é anunciado ao leitor de tela

- **Status:** verified (retestado em navegador, 2026-10-24, rodada 2 — reports/2026-10-24-mobile-adm-clientes-reteste-1.md)
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Equipe com TalkBack
- **Journey Step:** J-achar-uma-cliente, passo "buscar por nome, e-mail ou telefone" / "trocar de recorte"
- **Scenarios:** MAD-clientes-com-leitor-de-tela; MAD-clientes-estados-vazios
- **Found:** 2026-10-24 · **Report:** reports/2026-10-24-mobile-adm-clientes-leitor-de-tela.md

## Summary

Com resultado, a linha de contagem ("1 cliente · das atividades…") é uma região `aria-live="polite"` e a
pessoa ouve o efeito do que digitou. Sem resultado, essa região some e a frase "Não achei ninguém com “…”."
(ou "Ninguém com pedido em aberto agora.") entra num `<p>` sem `role` nem `aria-live`. Quem digita no
campo de busca com o TalkBack não ouve nada: nem que a lista esvaziou, nem o botão "Limpar". A falha de
leitura, ao contrário, tem `role="alert"`.

## Reproduction

- **Charter:** CH-clientes-com-leitor-de-tela · **Tour:** Feature Tour
- **Environment:** Chromium 390×844, build servido, Supabase local

1. Abrir Clientes, digitar `zzzqq` no campo "Buscar cliente".
2. Listar `[aria-live],[role=status],[role=alert]` depois de 1,5 s.

**Expected:** a frase do vazio é anunciada (região viva ou `role="status"`), como a contagem.
**Actual:** só `P polite :: Atualizado às 12h48.`; o `<p data-testid="vazio">` não está em região viva.

## Evidence

- Markup do vazio: `ListaDeClientes.tsx:112-118` (`<section aria-label="Clientes" data-estado="vazio">` > `<p data-testid="vazio">`).
- Contraste: o vazio da ficha não encontrada (`Não encontrei esta cliente.`) é `role="status"`.

## Fix

Sugestão: `role="status"` no `<p data-testid="vazio">`. Teste: o vazio de cada causa tem região viva.

## Fix applied (2026-10-24, task B09)

`ListaDeClientes`: região `aria-live="polite"` montada em todo estado, que diz "Nenhum resultado." quando a lista está vazia e "Busca e recorte desfeitos." depois do "Limpar". Sem `role="status"` (a tela já tem o do puxar). Testes em `ListaDeClientes.test.tsx`.

## Retest (2026-10-24, rodada 2)

Verificado. Resíduo novo no foco depois de "Limpar": `BUG-20261024-limpar-da-busca-deixa-o-foco-no-body`.
