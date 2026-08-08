# BUG-20260802-edge-function-mercado-pago-nao-sobe-local: `mercado-pago` devolve 503 em qualquer pagamento local

- **User impact:** Blocks-Completion
- **Persona affected:** Nana (desenvolvimento) · qualquer cliente, se chegar ao hospedado
- **Journey / step:** J-finalizar-compra — passo *pagar* (PIX e cartão, os dois)
- **Scenarios:** CHK-pagamento-pix · CHK-pagamento-cartao
- **First seen:** 2026-08-02, ao rodar o gate da feature `15-checkout-fluxo-e-resumo`
- **Status:** **open**
- **Regressão de:** `c6944b6` + `de63871` (2026-08-01) — **não** da feature `15`

## Symptom (what the user experiences)

Qualquer tentativa de pagar no ambiente local devolve **HTTP 503**:

```
POST http://127.0.0.1:54321/functions/v1/mercado-pago?action=create-payment
→ 503 {"code":"BOOT_ERROR","message":"Worker failed to boot (please check logs)"}
```

No PIX a tela fica em "Gerando código PIX..." e cai na mensagem de indisponibilidade; no cartão o
CTA falha depois de tokenizar. **Nenhum pagamento fecha localmente.**

## Root cause

`docker logs supabase_edge_runtime_nanapin-store`:

```
worker boot error: failed to bootstrap runtime: failed to create the graph:
Failed resolving types. Relative import path "@nanapin/supabase/types"
not prefixed with / or ./ or ../
  at file:///Projetos/nanapin-store/packages/core/src/pricing/index.ts:25:8
```

`supabase/functions/mercado-pago/handlers.ts:29` importa
`../../../packages/core/src/pricing/index.ts`, e esse arquivo importa `@nanapin/supabase/types` —
**bare specifier**. O Deno do edge runtime não tem como resolver: não há import map, e o alias
`@nanapin/*` só existe no `tsconfig.base.json` e no Vite, que o Deno não lê.

Os outros módulos do core importados pela function (`payment/pricing.ts`, `payment/payer.ts`,
`payment/orders.ts`, …) usam **caminho relativo com extensão `.ts`** justamente por isso.
`pricing/index.ts` é o único que escapou da convenção.

**Não é o trap de bind mount do `AD-002`** — `supabase stop && supabase start` foi executado e o erro
persiste. É resolução de módulo, não montagem de arquivo.

## Reproduction (from the persona's entry point)

1. `supabase start`
2. `curl -X POST "http://127.0.0.1:54321/functions/v1/mercado-pago?action=create-payment" \
   -H "Authorization: Bearer <anon>" -H "Content-Type: application/json" \
   -d '{"order_id":"00000000-0000-0000-0000-000000000000","method":"pix"}'`
3. Esperado: 401/404/422 (o guard de ownership rejeitando um pedido inexistente).
   Observado: **503 `BOOT_ERROR`**.

## Why nothing caught it

Mesma família do `AD-012` — **prova por tipo não é prova por execução**:

- `pnpm test` roda os handlers em **vitest/Node**, onde `@nanapin/supabase/types` resolve pelo alias
  do workspace. Os 232 testes de `@nanapin/functions` passam com a function morta.
- `pnpm build` não empacota edge function nenhuma.
- `tsc` também resolve pelo alias — o tipo está certo; o **runtime** é que não é o mesmo resolvedor.

O único sinal honesto é bater na porta da function, e nada no gate fazia isso.

## Suggested fix (não aplicado — fora do escopo da feature `15`)

Trocar o bare specifier por caminho relativo com extensão, como os vizinhos já fazem. O import é
**só de tipos** (`OptionValues`, `PriceSource`, `ProductOption`, `ProductVariant`, `StockPolicy`),
então `import type` com caminho relativo resolve sem custo de runtime.

Vale conferir junto se o **deploy hospedado** sofre do mesmo problema: se sofrer, PIX e cartão estão
quebrados em produção desde 2026-08-01 e isto é P0. Se não sofrer (bundler do deploy resolvendo o
alias), continua sendo P1 por deixar o ambiente local sem caminho de pagamento.

Depois de corrigir, acrescentar ao gate um **probe HTTP** contra a function — é a lição do `AD-012`
aplicada a edge function: a prova de que uma function sobe é subir.
