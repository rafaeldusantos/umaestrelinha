# BUG-20261025-teste-com-aparelho-descartado-deixa-a-tela-ligada: O aparelho descartado pelo serviço de push segue "ligado" na tela

- **Status:** fixed (sem commit) — decisão do usuário em 2026-10-26: a opção 1. **Reteste em navegador pendente.**
- **Impact (user-side):** Trust-Damage
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Adri no celular
- **Journey Step:** J-receber-aviso-de-pedido — passo 3 (aviso de teste) e passo 2 (interruptor)
- **Scenarios:** MAD-avisos-aviso-de-teste, MAD-avisos-interruptor-por-evento
- **Requirements:** `MAN-32`, `MAN-36`, edge case `MAN-35`/`MAN-04`
- **Found:** 2026-10-25 · **Report:** reports/2026-10-25-mobile-adm-avisos-no-celular.md

## Summary

Quando o serviço de push responde 410/404 ao aviso de teste, a porta apaga a inscrição (`gone`, correto por
`MAN-04`) e a tela diz "O aviso de teste não saiu. Tente de novo." — mas continua mostrando os quatro
interruptores ligados e o botão de teste. "Tentar de novo" nunca vai funcionar: o teste seguinte responde
`404 not_found` (a mesma frase), e tocar qualquer interruptor responde 404 e diz "Não consegui gravar esta
escolha. Tente de novo.". A tela diz "ligado" para um aparelho que o servidor não tem mais; só fechar e reabrir
a tela (F5) mostra "Avisar neste celular" (`MAN-36`). A Adri pode concluir que está tudo ligado e só o teste
"falhou", e perder pedidos.

## Reproduction

- **Charter:** CH-avisos-estados-e-falhas · **Tour:** Network Tour
- **Environment:** build servido, Supabase local, `atelie-avisos` servida com as chaves VAPID de dev, FCM real.
  Com push dublado o endpoint é sintético (`https://fcm.googleapis.com/fcm/send/QA79-…`), e o FCM responde
  410 — o mesmo desfecho de um aparelho cuja permissão o Android revogou ou cuja inscrição expirou.

1. `/avisos` → "Avisar neste celular" ⇒ quatro interruptores ligados, uma linha em `push_subscriptions`.
2. "Enviar um aviso de teste" ⇒ "O aviso de teste não saiu. Tente de novo."; `push_subscriptions` vazio.
3. "Enviar um aviso de teste" de novo ⇒ a mesma frase (porta 404).
4. Tocar "Pedido novo" ⇒ "Não consegui gravar esta escolha. Tente de novo." (porta 404).
5. F5 ⇒ "Avisar neste celular".

**Expected:** a tela não afirma "ligado" para uma inscrição que o servidor apagou.
**Actual:** passos 2–4 seguem com os interruptores ligados e frases de "tente de novo" que nunca vão passar.

## Notes

O desfecho `gone`/`not_found` é distinguível no app (o slug chega pela porta), mas a spec não diz o que a tela
mostra nesse caso: `MAN-32` manda a frase de falha para "o teste falha no servidor", e `MAN-36` só cobre a
ABERTURA da tela. Por isso não foi consertado no QA (governor: trade-off de produto).

## Fix (2026-10-26)

Decisão do usuário: a opção 1 do relatório. Em `gone`/`not_found` do aviso de teste, e em `not_found` de um
interruptor, `usePushNoAparelho` desfaz a inscrição do navegador, volta a `desligado` e acende `descartado`; a
tela mostra "Este celular deixou de receber avisos. Ative de novo." (`APARELHO_DESCARTADO`, frase nova) acima
de "Avisar neste celular". Ativar de novo apaga a frase. Outro 4xx de interruptor segue sendo a falha comum.

- Regressão: 6 casos em `usePushNoAparelho.test.tsx` e 3 em `avisosPage.test.tsx` (10 reprovaram antes do
  conserto). O caso antigo "410 ⇒ `falhou`" saiu do `it.each` de `MAN-32`: ele afirmava o comportamento que a
  decisão removeu.
- Sensor: 7 mutantes no `usePushNoAparelho.ts` e no `AvisosPage.tsx` reais, SHA-256 conferido na
  restauração, 7 mortos por asserção.
- Falta: o reteste no build servido (passos 1–5 acima), que vira `Pass` deste bug.
