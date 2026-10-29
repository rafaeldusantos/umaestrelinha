# BUG-20261029-incerteza-de-gravacao-com-titulo-nao-salvou: quando a tela não sabe se gravou, o aviso ainda tem o título "Não salvou"

- **Status:** verified
- **Impact (user-side):** Trust-Damage
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri montando o menu
- **Journey Step:** J-montar-o-menu-da-loja, qualquer gravação com a rede caindo
- **Scenarios:** PNL-menu-falha-de-rede-ao-gravar
- **Found:** 2026-10-29 · **Report:** reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste.md

## Summary

**Da `86`, da correção Q02.** Se a gravação chega ao banco, a resposta se perde e a releitura também falha, o aviso
mostra o título **"Não salvou"** e, embaixo, "Não deu para confirmar se salvou. Confira a internet; a próxima mudança
parte do que estiver gravado." O título afirma exatamente o que a correção quis deixar de afirmar (o comentário de
`STORE_MENU_SAVE_UNKNOWN` diz isso) — e o banco **tinha** gravado. A chave na tela também ficou num estado que não
bate sempre com o banco até a próxima ação (numa repetição mostrou o valor anterior, noutra o novo). A próxima ação
corrige a tela e não acusa conflito falso.

## Reproduction

- **Charter:** CH-menu-gravacao-com-rede-ruim · **Tour:** Network Tour
- **Environment:** 390 × 844, painel dev, Supabase local; `**/rest/v1/store_settings*`: PATCH com `route.fetch()` + `abort`, e os GET seguintes abortados

1. `/admin/menu`, tocar a chave Celular de "Sobre".

**Expected:** um título que não diga "Não salvou" (ex.: "Não deu para confirmar"), coerente com o texto.
**Actual:** título "Não salvou" (`AdminMenuPage.tsx`, rótulo do desfecho `falha`) sobre o texto de incerteza; banco com a mudança gravada.

## Evidence

- `evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste/r2-04-nao-deu-para-confirmar-390.png`
- `select value from store_settings where key='menu'`: o `mobile` de "Sobre" com o valor enviado.

## Correção (2026-10-29, R02 das "Correções do QA r2")

- `useStoreMenu` devolve o desfecho incerto com `kind: 'incerto'` (antes `'falha'`), e a `AdminMenuPage` dá a ele o título **"Não deu para confirmar"**, sem a variante de erro; o texto segue `STORE_MENU_SAVE_UNKNOWN`.
- Teste que reprovou antes: `AdminMenuPage.test.tsx` "R02" pela página real (escrita e releitura falhando ⇒ título neutro, nunca "Não salvou", sem `destructive`). `useStoreMenu.test.ts` passou a exigir `kind: 'incerto'`.

## Verification

- **Retested:** 2026-10-29, Adri montando o menu, 390 × 844, pelos passos originais (rodada 3) · **Report:** reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3.md
- **Result:** PATCH com `route.fetch()` + `abort` e as quatro releituras abortadas: o aviso diz **"Não deu para confirmar"** / "Não deu para confirmar se salvou. Confira a internet; a próxima mudança parte do que estiver gravado.", sem a variante `destructive`; o banco tinha gravado (`mobile` false). Controle: PATCH 500 continua "Não salvou · Não salvou. O menu voltou ao que estava gravado." A ação seguinte relê antes (GET) e grava a partir do gravado. Resíduo já anotado no r2, não reaberto: até a próxima ação a chave na tela segue mostrando o valor anterior ao envio (o texto do aviso avisa disso). Evidência: `evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3/r3-07-incerto-titulo-neutro-390.png`.

## Correção do resíduo (2026-10-29, S03 das "Correções do QA r3")

- O resíduo anotado no reteste r3 — até a próxima ação a chave seguia mostrando o valor de antes do envio, com o banco já gravado — foi consertado. Depois do desfecho `incerto`, `useStoreMenu` relê a linha sozinho, pela mesma fila das gravações: na hora, e de novo com espera crescente (`STORE_MENU_RELEITURA_MS`: 0, 1, 2, 4, 8 e 15 s, o último repetido), ou quando a janela volta a ficar online ou em foco. Com o valor enviado no banco, a linha relida vira a confirmada e aparece `Salvo`; com a versão que a aba já via, nada muda; com outra coisa, é outra janela, e o conflito acusado é verdadeiro (o mesmo que a próxima ação acusaria). Nunca um conflito contra a própria aba.
- Testes que reprovaram antes: `useStoreMenu.test.ts` "S03" (+3: a releitura responde logo depois da que falhou ⇒ o gravado e `Salvo` sem ação; a rede volta depois ⇒ idem, e a ação seguinte filtra pelo `updated_at` NOVO; o banco não tinha gravado ⇒ o de antes, sem conflito, sem `Salvo`, e a ação seguinte não relê antes); `AdminMenuPage.test.tsx` "S03" pela página real (a rede volta e, sem toque nenhum, a chave mostra o gravado, aparece `Salvo`, sem conflito e sem escrita nova).
- Navegador (390 e 1440, PATCH com `route.fetch()` + `abort`, GETs abortados até a rede "voltar"): aviso "Não deu para confirmar" com a chave mostrando o de antes (tela `true`, banco `false`); liberada a rede, a tela passou a `false` em ~1,3 s sem toque nenhum, com `Salvo`, sem conflito e sem PATCH novo; a ação seguinte gravou sem conflito. Evidência: `evidence/2026-10-29-backoffice-menu-montado-pela-dona-correcoes-r3/s-390-s03-incerto.png`, `s-390-s03-relido.png` (e as de 1440).
- Observado na prova, fora da `86`: o supabase-js refaz sozinho o GET que falha por rede (três tentativas, ~1 s e ~2 s entre elas), então o aviso de incerteza só aparece alguns segundos depois do toque.

## Verification (rodada 4)

- **Retested:** 2026-10-29 · **Report:** reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r4.md
- **Result:** verified — 390 e 1440: PATCH com `route.fetch()`+`abort` e GETs abortados ⇒ "Não deu para confirmar" (neutro), tela no valor de antes, banco gravado. Rede de volta, sem toque: tela = banco em 3,9 s (390, após 20 s sem rede) e 11,9 s (1440, após 75 s sem rede), `Salvo`, sem conflito, zero PATCH novo. Caso "não gravou" (PATCH abortado antes do banco): tela no de antes, sem `Salvo`, sem conflito. Sem laço: menu estável 0 requisições a `store_settings` em 30 s; depois de resolver, 0 em 60 s (caso gravou) e 1 GET (caso não gravou). Enquanto sem rede, as releituras seguem a cada ~15 s (1+3 retentativas do supabase-js), limitadas. Ação seguinte grava sem conflito; recarregar = banco. Evidência: `r4-05-incerteza-{390,1440}-{incerto,relido}.png`.
