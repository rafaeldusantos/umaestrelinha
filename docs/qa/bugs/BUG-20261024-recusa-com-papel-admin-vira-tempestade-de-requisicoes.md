# BUG-20261024-recusa-com-papel-admin-vira-tempestade-de-requisicoes: Um 42501 com o papel ainda admin faz o app reler sem parar

- **Status:** verified (retestado em navegador, 2026-10-24, rodada 2 — reports/2026-10-24-mobile-adm-clientes-reteste-1.md)
- **Impact (user-side):** Cosmetic (visível só como a tela piscando/travada em "ATELIÊ · PAINEL"); custo real é rede e bateria
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri no celular (só se a RPC `atelie_clock` recusar com `42501` enquanto `user_roles` ainda diz admin)
- **Journey Step:** J-achar-uma-cliente (lista e ficha); idêntico em `/pedidos` (herdado)
- **Scenarios:** MAD-clientes-conta-sem-papel-nao-ve
- **Found:** 2026-10-24 · **Report:** reports/2026-10-24-mobile-adm-clientes.md

## Summary

Com a conta ainda admin em `user_roles`, mas `atelie_clock` respondendo `403 {"code":"42501"}` (forçado por
interceptação) e a consulta da tela em 500, a tela não assume a recusa da `72` nem mostra a falha: o app entra em
laço. Em 8 s foram medidas ~1.100 a ~1.340 repetições do trio `consulta + atelie_clock + user_roles` (~140
req/s), e o corpo termina mostrando só "ATELIÊ · PAINEL" (a splash do `RequireAdmin`) ou alternando com a tela.
Acontece em `/clientes` (1095), `/clientes/<id>` (1344) e em `/pedidos` (1241), este último da `74`: a causa
está no `useRecusaDePapel` compartilhado. `reconferidoPara` (módulo) é zerado quando a remontagem passa por um
estado sem erro, e o `42501` seguinte chama `retryAdminCheck` de novo, que desmonta a página de novo.

Alcance real é baixo: exige 42501 com papel admin válido (a função e o `user_roles` discordando), que é o estado
que o comentário do próprio hook diz ter consertado na `73` (T18). Com o papel de fato retirado (D1, D2, D3) a
recusa assume uma vez, sem laço.

## Reproduction

- **Charter:** CH-clientes-conta-sem-acesso · **Tour:** Garbage Tour
- **Environment:** build servido em :4391, 390×844, Supabase local; `**/rest/v1/customer_list*` → 500 e `**/rpc/atelie_clock*` → 403 `42501`, conta com papel admin

1. Entrar com a conta (admin), ir a Clientes pela aba.
2. Contar respostas de rede por 8 s.

**Expected:** uma reconferência do papel e depois a recusa da `72` (ou a falha de leitura), poucas requisições.
**Actual:** milhares de requisições; tela presa na splash.

## Evidence

- evidence/2026-10-24-mobile-adm-clientes/ (capturas C1..C3, D1..D4); contagens no relatório.

## Notes

Conserto provável: guardar o episódio por conta enquanto `retryAdminCheck` resolve, sem zerar na remontagem
enquanto a consulta está carregando (zerar só em sucesso). Teste com o `<App />` real e papel admin + 42501.

## Fix applied (2026-10-24, task B05)

`useRecusaDePapel(erros, leituraBoa)`: o episódio da recusa só acaba com uma leitura que voltou com dado e sem erro (as cinco páginas passam o segundo argumento), e não mais pela ausência de erro — o React Query apaga o erro de uma consulta sem dado enquanto ela relê. Testes: `recusaComPapelAdmin.test.tsx` (`<App />` real sobre o supabase-js real, 3 rotas: 149 requisições de papel antes, ≤ 4 depois) e `useRecusaDePapel.test.tsx`.
