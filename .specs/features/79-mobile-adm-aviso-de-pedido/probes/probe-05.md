# Probe 05 — o teto do aviso de teste é da conta (conserto do probe da T26)

**Data**: 2026-10-25 · **Script**: `probes/05-teto-do-teste.ts` · **Alvo**: Postgres **local** (54442).
O probe só fala com `claim_push_test` e `push_subscriptions` (o que a porta faz), então a mesma régua
roda contra as duas regras.

## Antes — a regra antiga (teto em `push_subscriptions.last_test_at`), exit 1

```
contagens antes: {"orders":78,"order_notifications":11,"push_subscriptions":0,"auth_users":9,"customers":11,"push_test_claims":"ausente"}
FALHOU — aparelho A testado e apagado (gone); teste em B da MESMA conta dentro de 30 s ⇒ false (429 na porta): A=true · (linha de A apagada) · B=true
ok   — com as duas linhas vivas: o 1º true, o 2º (outro aparelho, mesma conta) false: B1=true · B2=false
ok   — endpoint de OUTRA conta ⇒ false sem consumir o teto; o da própria conta logo depois ⇒ true: alheio=false · próprio=true
ok   — conta sem inscrição nenhuma ⇒ false: false
contagens depois: {"orders":78,"order_notifications":11,"push_subscriptions":0,"auth_users":9,"customers":11,"push_test_claims":"ausente"}
ok   — fixturas P79- apagadas: contagens iguais às de antes: {"orders":78,"order_notifications":11,"push_subscriptions":0,"auth_users":9,"customers":11,"push_test_claims":"ausente"} → {"orders":78,"order_notifications":11,"push_subscriptions":0,"auth_users":9,"customers":11,"push_test_claims":"ausente"}
1 PASSO(S) FALHARAM
```

## Depois — o teto em `push_test_claims`, exit 0 (segunda de duas execuções)

```
contagens antes: {"orders":78,"order_notifications":11,"push_subscriptions":0,"auth_users":9,"customers":11,"push_test_claims":0}
ok   — aparelho A testado e apagado (gone); teste em B da MESMA conta dentro de 30 s ⇒ false (429 na porta): A=true · (linha de A apagada) · B=false
ok   — com as duas linhas vivas: o 1º true, o 2º (outro aparelho, mesma conta) false: B1=true · B2=false
ok   — endpoint de OUTRA conta ⇒ false sem consumir o teto; o da própria conta logo depois ⇒ true: alheio=false · próprio=true
ok   — conta sem inscrição nenhuma ⇒ false: false
contagens depois: {"orders":78,"order_notifications":11,"push_subscriptions":0,"auth_users":9,"customers":11,"push_test_claims":0}
ok   — fixturas P79- apagadas: contagens iguais às de antes: {"orders":78,"order_notifications":11,"push_subscriptions":0,"auth_users":9,"customers":11,"push_test_claims":0} → {"orders":78,"order_notifications":11,"push_subscriptions":0,"auth_users":9,"customers":11,"push_test_claims":0}
TODOS OS PASSOS OK
```
