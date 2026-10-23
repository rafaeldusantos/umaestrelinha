# BUG-20261022-situacao-fala-com-a-cliente-no-atelie: Na Início, o selo do pedido fala com a cliente, não com a Adri

- **Status:** verified
- **Impact (user-side):** Friction
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Adri no celular
- **Journey Step:** J-acompanhar-a-loja, step 5 (Últimos pedidos)
- **Scenarios:** MAD-inicio-abrir-e-entender-o-dia
- **Found:** 2026-10-22 · **Report:** reports/2026-10-22-mobile-adm-inicio.md

## Summary

Em "Últimos pedidos", o pedido #0182 aparece com o selo **"Aguardando seu material"**. Esse é o texto
que a LOJA mostra para a cliente ("seu" = da cliente). No app da Adri, "seu material" lê como se a
espera fosse dela. E o #0182 está com o envelope **já postado pela cliente** (`material_enviado`):
"aguardando" diz menos do que a Adri precisa saber (que o material está a caminho). O protótipo usa
rótulos por estado do pedido, na voz de quem administra.

## Reproduction

- **Charter:** CH-inicio-numeros-certos-do-dia · **Tour:** Money Tour
- **Environment:** Android emulado 412×915, pt-BR, banco local

1. Entrar e abrir a Início.
2. Ler "Últimos pedidos".

**Expected:** a situação na voz do ateliê ("Aguardando material", "Material a caminho"…), ou ao menos
sem o possessivo da cliente.
**Actual:** "Aguardando seu material" no #0182 (material já enviado) e no #0181 (material ainda não
enviado) — dois estados diferentes com o mesmo selo.

## Evidence

- evidence/2026-10-22-mobile-adm-inicio/CH-numeros-01-inicio-412-utc.png
- `store_overview().recentes`: #0182 `material_status = material_enviado`, #0181 `aguardando_material`

## Notes

Não é defeito de implementação: a spec decidiu (confirmado) usar `orderSituation`, "o mesmo da loja",
pelo dono único do rótulo (`situacaoComDonoUnico`). Trocar o texto no app criaria um segundo dono; a
saída é decisão de produto — ver *Decisions for a Human* no relatório.

## Fix

- **Decision:** opção 2 do relatório (a recomendada), decidida pelo orquestrador: um dono, duas vozes.
- **Root cause:** `orderSituation` só tinha a voz da cliente, e o app a lia sem público. A chave
  `awaiting_material` junta, de propósito para a cliente, o envelope não enviado e o já postado.
- **Fix:** working tree, sem commit (pedido do usuário).
  - `packages/core/src/orders/situation.ts`: `orderSituation(o, publico = 'cliente')` e
    `SITUATION_LABELS_BY_AUDIENCE` (`cliente` é o `SITUATION_LABELS` de sempre, por referência). No
    ateliê, a mesma chave e o mesmo tom, com as palavras que já tinham dono: "Aguardando material",
    "Material a caminho", "Material recebido" e "Em produção" de `MATERIAL_STATUS_LABELS`
    (`core/material`); "Enviado" e "Estornado" do vocabulário do painel.
  - `packages/core/src/orders/labels.ts` (novo, sem import): `ORDER_STATUS_LABELS` e
    `ORDER_PAYMENT_STATUS_LABELS`, que subiram do painel. `STATUS_LABELS` (`useAdminOrders.ts`) e
    `PAYMENT_STATUS_LABELS` (`orderQuery.ts`) passaram a ser referências a eles
    (`rotulosDoPainel.test.ts`, `toBe`).
  - `apps/mobile-adm/src/entities/order/ui/SituacaoDoPedido.tsx` pede `'atelie'`.
  - O guarda `situacaoComDonoUnico.test.ts` (suíte da loja) passou a varrer também `apps/mobile-adm/src`,
    com âncora (o selo do app lido, o dono declarando os dois públicos e o app pedindo `'atelie'`) e um
    sensor (uma tabela "só para trocar a palavra" no app seria acusada).
  - **A loja não mudou**: nenhum arquivo de `apps/store/src` de produção tocado, nenhuma asserção da
    loja alterada fora do guarda ampliado.
- **Regression test:** `packages/core/src/orders/__tests__/situationAudience.test.ts` (20 casos: um por
  estado com os dois públicos lado a lado, o par não enviado × a caminho, sem pronome, padrão =
  cliente) e o caso "o par do material na voz do ateliê" em
  `apps/mobile-adm/src/widgets/recent-orders/__tests__/RecentOrders.test.tsx`. Mutantes reinjetados
  nos arquivos reais com SHA-256 conferido na restauração: o app sem `'atelie'`, o ramo "a caminho"
  apagado, o padrão trocado para `'atelie'` e o ateliê sem a palavra do material — 4 mortos por asserção.

## Verification

- **Retested:** 2026-10-23, Adri no celular, build novo servido (`index-9_euSy7b.js`, service worker
  bloqueado no contexto), Supabase local com fixturas restauradas ao fim · **Report:**
  reports/2026-10-23-mobile-adm-inicio-reteste-2.md
- **Result:** pass. #0182 (`material_enviado`) "Material a caminho", #0181 (`aguardando_material`)
  "Aguardando material", fixtura `material_recebido` "Material recebido", Pix pendente "Aguardando
  pagamento", `shipped` "Enviado" e `refunded` "Estornado" — conferidos contra o banco e depois de
  recarregar. Evidência: `evidence/2026-10-23-mobile-adm-inicio-reteste-2/ultimos-412-100.png`,
  `ultimos-360-enviado-estornado.png`.
