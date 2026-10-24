# BUG-20261024-voltar-do-pedido-buscado-perde-a-busca: Voltar de um pedido achado pela busca apaga a busca

- **Status:** fixed (retestado 2026-10-24, rodada 2)
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri no celular
- **Journey Step:** J-ver-um-pedido, voltar do detalhe à lista
- **Scenarios:** MAD-pedido-voltar-mantem-recorte, MAD-pedidos-buscar-por-numero-ou-nome
- **Found:** 2026-10-24 · **Report:** reports/2026-10-24-mobile-adm-pedidos.md

## Summary

O uso de todo dia: a cliente manda o nome no WhatsApp, a Adri busca, abre um dos resultados para
conferir e volta para abrir o próximo. Ao voltar ("Voltar" do detalhe ou o voltar do Android), o campo
de busca está vazio e a lista volta ao recorte inteiro (em "Tudo", 116 pedidos, no topo). Ela precisa
digitar de novo a cada pedido conferido. O recorte e a posição de rolagem voltam (`MAP-20`), o termo
não: ele é estado da página (A13: fora do endereço, de propósito) e morre ao desmontar. O verificador
da rodada 3 já tinha deixado isto para o QA decidir (validation.md, §6).

## Reproduction

- **Charter:** CH-pedidos-voltar-do-android · **Tour:** Back-Button Tour
- **Environment:** build servido em :4376, 390×844, Supabase local

1. Pedidos → "Tudo" → buscar `Prova 2` (11 pedidos).
2. Tocar no primeiro resultado → "Voltar".

**Expected:** a lista volta como estava: a mesma busca, os mesmos 11 resultados, na mesma posição.
**Actual:** busca vazia, "116 pedidos", topo da lista.

## Evidence

- medido no navegador: depois do voltar, `searchbox.value === ''`, 116 linhas, `scrollY` 0
  (relatório, sessão CH-pedidos-voltar-do-android).

## Notes

Respeitar A13 (o termo não vai ao endereço nem ao histórico do navegador): guardar o termo em memória
por entrada de histórico (ex.: `location.state`/`history.state` ou um mapa em memória pela `key` da
entrada), restaurando-o — e a posição da lista buscada — no voltar. Sem histórico do app (F5, link
colado) continua sem termo.

## Retest — 2026-10-24 (rodada 2)

- **Report:** reports/2026-10-24-mobile-adm-pedidos-reteste.md · build servido em :4377, 390×844.
- Tudo → `Prova 2` (11) → rolar a `scrollY` 779 → abrir `P74-26` → "Voltar" ⇒ campo "Prova 2", "11 pedidos", 11
  linhas, `scrollY` 779, sem esqueleto. O mesmo pelo voltar do navegador. Pass.
- Bordas: trocar de chip mantém o termo (Concluídos ⇒ 2); entrada nova pela aba ⇒ sem termo ("Precisa de ação",
  52); voltar duas vezes até a entrada buscada ⇒ termo de volta; F5 ⇒ sem termo; termo apagado e voltar ⇒ vazio;
  `history.state` sem o termo (A13); sair e entrar com outra conta ⇒ nenhum resto da busca.
- Evidence: evidence/2026-10-24-mobile-adm-pedidos/r2-390-voltar-mantem-busca.png
