# BUG-20261028-resposta-perdida-tela-diz-que-nao-salvou: quando a resposta da gravação se perde, a tela diz que não salvou, mas salvou — e a próxima ação acusa "outra janela"

- **Status:** verified
- **Impact (user-side):** Trust-Damage
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Adri montando o menu (390, 4g)
- **Journey Step:** J-montar-o-menu-da-loja, qualquer ação que grava
- **Scenarios:** PNL-menu-falha-de-rede-ao-gravar
- **Found:** 2026-10-28 · **Report:** reports/2026-10-28-backoffice-menu-montado-pela-dona.md

## Summary

**Da `86`.** Com a rede caindo **depois** de o servidor gravar (o celular perde a resposta), a tela mostra "Não
salvou. O menu voltou ao que estava gravado." e devolve a chave ao estado antigo — mas o banco **gravou**. A frase é
falsa: o que está gravado é o novo. Na ação seguinte, na **mesma aba**, a tela diz "O menu mudou em outra janela —
recarregue.", que também é falso (não há outra janela). Não há sobrescrita (a guarda de concorrência segura), e
recarregar mostra a verdade; mas a dona recebe duas mensagens erradas seguidas e pode refazer o que já valia.

## Reproduction

- **Charter:** CH-menu-gravacao-com-rede-ruim · **Tour:** Network Tour
- **Environment:** 390 × 844, painel dev, Supabase local; interceptação `**/rest/v1/store_settings*` com `route.fetch()` e `context.setOffline(true)` antes de responder

1. `/admin/menu` com o menu v2; tocar a chave "Celular" de "Colar e correntes" (ligada).
2. O PATCH chega ao banco e a resposta se perde.
3. Tocar outra chave.

**Expected:** a tela não afirma o que não sabe — p.ex. "Não deu para confirmar se salvou. Recarregue." — e a ação seguinte não acusa outra janela.
**Actual:** passo 2: "Não salvou. O menu voltou ao que estava gravado.", chave volta a ligada; banco: `mobile = false`. Passo 3: faixa "O menu mudou em outra janela — recarregue." Recarregar mostra a chave desligada.

## Evidence

- `evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-05-conflito-falso-apos-resposta-perdida-390.png`
- Leitura independente: `store_settings.menu` com `Colar e correntes` `mobile:false` logo depois da mensagem "Não salvou".

## Correção

- **Rodada:** correções do QA r1 da `86` (2026-10-29), sem commit.
- **O quê / onde:** `apps/backoffice/src/features/store-menu/model/useStoreMenu.ts`: erro na escrita ⇒ relê a linha; `value` igual ao enviado (igualdade estrutural sem ordem de chave, como o jsonb devolve) ⇒ trata como salvo, adota o `updated_at` relido e mostra `Salvo`; diferente ⇒ volta e "Não salvou"; releitura também falhou ⇒ `STORE_MENU_SAVE_UNKNOWN` ("Não deu para confirmar se salvou…") e a próxima ação relê antes de gravar — se o banco tem o valor incerto, parte dele, e nunca acusa conflito contra a própria aba.
- **Teste que prova:** `useStoreMenu.test.ts`, bloco "Q02 — resposta perdida" (5 casos; o dublê ganhou `aoEscrever` e `conferirVersao`, que faz o `update` só devolver linha com o `updated_at` do banco). Vermelhos antes: o de Salvo e o da releitura que falha.


## Verification

- **Retested:** 2026-10-29, mesma persona/jornada (rodada 2) · **Report:** reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste.md
- **Result:** 390, chave Celular de "Sobre", PATCH entregue ao banco e resposta abortada (`route.fetch()` + `abort`): a tela mostra "Salvando…" → "Salvo" e a chave fica no valor gravado; a ação seguinte na mesma aba grava sem "O menu mudou em outra janela". Com a releitura também sem rede: faixa "Não deu para confirmar se salvou…"; a próxima ação (outra chave) relê, parte do gravado e diz "Salvo", sem conflito falso; recarregar confere com o banco. PATCH 500 continua "Não salvou. O menu voltou ao que estava gravado." **Achado novo** (não reabre este): a faixa da incerteza tem o título "Não salvou" — `BUG-20261029-incerteza-de-gravacao-com-titulo-nao-salvou`. Evidência `evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste/r2-04-nao-deu-para-confirmar-390.png`.
