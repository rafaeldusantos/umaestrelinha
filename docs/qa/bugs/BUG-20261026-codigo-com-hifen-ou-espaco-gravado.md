# BUG-20261026-codigo-com-hifen-ou-espaco-gravado: O mesmo código do envelope pode ser gravado de três jeitos, e o dos Correios só funciona num

- **Status:** verified (retestado em navegador no build servido, 2026-10-27 — reports/2026-10-26-mobile-adm-envelope-da-cliente.md, *Reteste*) — opção 1 ampliada (sem hífen e ponto; formato dos Correios NÃO exigido, `BL-054` fechada)
- **Impact (user-side):** Trust-Damage
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Adri no celular
- **Journey Step:** J-registrar-envelope-da-cliente, passos 3 e 4
- **Scenarios:** MAD-envelope-colar-do-whatsapp; MAD-envelope-painel-grava-o-mesmo
- **Found:** 2026-10-26 · **Report:** reports/2026-10-26-mobile-adm-envelope-da-cliente.md

## Summary

O cartão chama o código de "Código dos Correios" e abre o rastreio dos Correios, mas o que é gravado depende
de quem gravou: o app tira espaços e põe em maiúsculas, mas aceita hífen e ponto (`AN-123.456.789-BR`) e até
a frase inteira colada ("O código é AN…" ⇒ `OCÓDIGOÉAN123456789BR`); o **painel** grava como foi digitado,
com espaços (`PN 1234 5678 9BR`), e o app mostra assim e abre os Correios com `%20`. Dois escritores do mesmo
campo com duas formas — o "defeito 01" na forma do dado.

## Reproduction

- **Charter:** CH-envelope-registrar-o-codigo-da-cliente · **Tour:** Paste Tour

1. App: colar `AN-123.456.789-BR` ⇒ o campo aceita como está, e salvar grava com hífen e ponto.
2. Painel `/admin/pedidos/<id>`: digitar `pn 1234 5678 9br` ⇒ gravado `PN 1234 5678 9BR`; o app mostra com espaços e o link vai com `%20`.

**Expected:** um formato só no banco, o que os Correios aceitam.
**Actual:** três formas possíveis.

## Evidence

- evidence/2026-10-26-mobile-adm-envelope-da-cliente/s7-app-depois-do-painel.png
- `tracking.test.ts` da `75` crava "o que não é espaço fica: hífen" — por isso é decisão, não conserto.

## Decisão pendente

1. Normalizar no dono da escrita (`writeMaterialTracking`) — o painel e a loja passam a gravar igual ao app (só espaço/caixa/invisível); hífen fica. Custo: o painel muda o que grava (`A8` da `75` disse "só no app").
2. Para o envelope (que é dos Correios), tirar também `-` e `.` e recusar o que não tiver a forma `AA000000000AA`. Custo: recusa código de outra transportadora, se a cliente usar uma.
3. Deixar como está e mostrar o código como gravado.

**Recomendação:** 1 agora (um escritor, uma forma); 2 só se a Adri confirmar que o envelope é sempre Correios.

## Conserto (2026-10-27, feature `82`, Fase 5, T19)

Recomendação do QA, decidida pelo usuário: a normalização mora no dono da escrita, e os três escritores
gravam por ele. Tira espaço, invisível (`\p{Cf}`), hífen e ponto e põe em maiúsculas; **não** exige a
forma `AA000000000AA`. Códigos já gravados ficam como estão (sem migration de dado); a próxima gravação
os normaliza.

- `packages/core/src/orders/tracking.ts`: `normalizeMaterialTrackingCode` (nova, exportada pelo barril de
  `core/orders`). `normalizeTrackingCode` (saída) intacto — o hífen continua lá.
- `packages/core/src/order-actions/materialTracking.ts`: `writeMaterialTracking` normaliza ANTES da RPC;
  vazio depois de normalizar ⇒ `{ tipo: 'recusado', reason: 'empty_code' }` sem rede.
- `packages/core/src/order-actions/appAction.ts`: `runAppAction` julga o curto (`trackingCodeRefusal`)
  sobre o código já normalizado do envelope.
- App: `FolhaDoRastreio.tsx` usa `normalizeMaterialTrackingCode` ao digitar e ao salvar na folha do
  envelope (o valor inicial do banco pode ter hífen); `useAcaoDoPedido.ts` (retentativa) idem.
- Painel: nenhuma linha de produção — já delegava a `writeMaterialTracking`.
- Loja: `apps/store/src/entities/order/api/useSetMaterialTracking.ts` passou a DELEGAR a
  `writeMaterialTracking` com o client da loja e a notificadora `?action=notify` injetados
  (`avisarQueRegistrou` agora devolve `boolean`, ainda com `try/catch` contido). Mesma forma de retorno
  `{ ok, status, reason }` e o mesmo `onSuccess`. Diferença declarada: numa RECUSA o `status` devolvido
  passa a ser `nao_aplicavel` (o dono não repassa o status da RPC numa recusa) — nenhum consumidor o lê
  (`OrderMaterialBlock` lê só `ok`/`reason`), e os testes da loja só mudaram por casos novos.
- Testes novos (reprovaram antes do conserto — 14 em core na primeira execução, 4 na loja, 3 no app):
  core `orders/__tests__/tracking.test.ts` › "normalizeMaterialTrackingCode (T19)" (5 variações —
  `AN-123.456.789-BR`, `an 1234 5678 9br`, zero-width e marcas de direção, tab/quebra, a forma do painel
  —, outra transportadora, vazio/nulo/só separadores, e `normalizeTrackingCode` intacto);
  `order-actions/__tests__/materialTracking.test.ts` (+3 variações + vazio sem rede);
  `order-actions/__tests__/appAction.test.ts` (+2: hífen/ponto/invisível saem, `AN-12.34` recusado sem
  rede); painel `useAdminOrders.delega.test.ts` › "T19 — …" (3, com o dono de VERDADE: `p_code`
  normalizado); loja `useSetMaterialTracking.test.tsx` › "T19 — …" (4); app `FolhaDoEnvelope.test.tsx` ›
  "o hífen e o ponto saem…" (3: digitar, curto depois de normalizar, código salvo com hífen).
- **Asserção antiga alterada**: `materialTracking.test.ts`. Antes: "não normaliza nem valida o código
  (quem recusa é o app; o painel grava como recebe)" — `' an1 '` chegava cru, `p_code: ' an1 '`. Depois:
  "normaliza o código ANTES da RPC, sem validar o comprimento" — `p_code: 'AN1'`. O comportamento mudou
  por decisão (era o defeito).
- Sensores (reinjetados no arquivo real, SHA-256 restaurado): M19a dono sem normalizar ⇒ core 5, painel
  3, loja 5 reprovam; M19b normalizador mantém hífen/ponto ⇒ core 4 + 2; M19c folha digita com o de
  saída ⇒ app 2; M19d folha salva o valor cru ⇒ app 1; M19e `runAppAction` julga o curto cru ⇒ core 1;
  M19f a loja volta à RPC direta só aparando ⇒ loja 4. Todos por asserção.

## Reteste (2026-10-27) — passou

- **Ambiente:** build servido (`vite preview` :4582, bundle `index-D3v4wZjc.js` conferido), Supabase local real, `functions serve` com a chave do Resend inválida, conta `adri.qa`, 390×844 toque; fixturas P82-A..G (`fixturas.sql` + as duas da sessão de QA), restauradas a cada percurso e apagadas no fim (contagens idênticas às de antes).
- App (colar de verdade, Ctrl/Cmd+V da área de transferência): `AN-123.456.789-BR` (A), `an 1234 5678 9br` (F), `AN123456789BR` + espaço de largura zero (G) e `AN 123.456.789-br` entre marcas de direção (B, Alterar) ⇒ o campo mostra `AN123456789BR`; o banco grava `AN123456789BR` (13 caracteres, 13 bytes); o link dos Correios vai `?objetos=AN123456789BR`.
- Painel (build da working tree em :4583, 1440): digitado `pn 1234 5678 9br` ⇒ banco `PN123456789BR`; colado `AN-123.456.789-BR` ⇒ `AN123456789BR`; colado com espaço de largura zero ⇒ `AN123456789BR`, `set_by = admin`. O app relido mostra `PN123456789BR`, "Registrado por você agora", link sem `%20`.
- Observação: o campo do painel continua mostrando o que foi digitado (`PN 1234 5678 9BR`) até a releitura — o gravado é o normalizado.
- Evidência: `evidence/2026-10-27-mobile-adm-envelope-da-cliente-reteste/19-painel.png`.
