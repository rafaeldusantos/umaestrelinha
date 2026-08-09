# BUG-20260728-edge-runtime-sem-dns: Falha do create-payment deixa a tela num spinner permanente

- **User impact:** Blocks-Completion
- **Persona affected:** Marina
- **Journey / step:** J-compra-pix-celular — passo 6 (acionar o CTA)
- **Scenarios:** PAY-pix-tela-mostra-valor
- **First seen:** 2026-07-28 · `../reports/2026-07-28-checkout-08-09.md`
- **Status:** **fixed** (retestado em persona)

## Symptom (what the user experiences)

Acionar 'Pagar R$ 29,57 com PIX' cria o pedido no banco, a tela mostra **'Gerando código PIX...'** e trava ali para sempre. Nenhum QR, nenhum valor, nenhum contador, nenhuma mensagem de erro. O pedido fica `pending`.

## Reproduction (from the persona's entry point)

1. Completar os três blocos do checkout em 390x844.
2. Acionar o CTA.
3. Observar 'Gerando código PIX...' indefinidamente.
4. Confirmar por `curl`: `POST /functions/v1/mercado-pago?action=create-payment` devolve **HTTP 503** com corpo `{"message":"name resolution failed"}`.

## Evidence

HTTP 503 + `name resolution failed` no probe direto. Log do `supabase_edge_runtime_nanapin-store` mostra `serving the request with supabase/functions/mercado-pago` seguido de `early termination has been triggered`.

## Why it matters

Em ambiente é bloqueio total do caminho do dinheiro — nada além do CTA é verificável em local. **Mas o modo de falha é defeito de produto**: a spec manda (CHK-09 / SHP-05 / PAY-09 herdado) que falha de terceiro apareça como erro amigável com possibilidade de retentar. Em vez disso a tela fica num spinner permanente, sem timeout e sem saída — a cliente não sabe se pagou, se vai pagar, ou se deve tentar de novo. **Este é o achado mais grave do ciclo.**

## Root cause (when known)

Duas coisas somadas: (a) o container do edge runtime não tem resolução de nome para `api.mercadopago.com` (ambiente); (b) a loja não trata timeout nem erro do `create-payment` no estado 'Gerando código PIX...' (produto). O (b) é o que precisa de correção.


---

## ⚠️ Causa reenquadrada — o container estava morto, não sem DNS

**Corrigido em 2026-07-28, na análise pós-ciclo.**

`docker ps -a` mostrou `supabase_edge_runtime_nanapin-store` em **`Exited (255)` há 34 horas**. O
`name resolution failed` do Kong era ele não achando o **worker upstream** — não o worker falhando em
resolver `api.mercadopago.com`. Os logs que eu li como "minhas requisições" eram de 34 horas antes.

`supabase stop && supabase start` ressuscitou o container; `create-payment` passou a responder **401**
(auth manual, esperado sem JWT) em vez de 503.

**O que isso muda:**

- **A metade de ambiente do bug deixa de existir.** Não há problema de DNS.
- **A metade de produto continua inteira, e é o que importa:** diante de um 503 do `create-payment`, a
  loja ficou em **"Gerando código PIX..." indefinidamente** — sem timeout, sem erro, sem retentativa,
  com o pedido já criado como `pending`. Esse é o defeito, e ele é real independentemente do motivo do
  503.
- **Corroboração externa:** o *Quality Checklist* do próprio Mercado Pago (app `Nanita store`,
  `1082025243026194`) lista como boa prática o item **`response_messages`** — *"mostra feedback ao
  pagador para recusas ou mensagens de erro da API?"*. A integração não cumpre.

**Também reenquadra o frete:** a cotação do Melhor Envio falhou porque o worker estava morto, não
(apenas) porque `MELHOR_ENVIO_TOKEN` está ausente. As duas coisas eram verdade; a causa próxima era o
container. O lado bom: **o fallback de SHP-05 funcionou corretamente diante de um 503 real** — foi
verificado sem que eu tivesse planejado verificar.


---

## Fix — 2026-07-30

- **O que mudou:** Timeout de 15s via AbortController no `useCreatePayment`. O erro já era tratado — passou a ser alcançável.
- **Commit:** `7fc4277`
- **Teste de regressão:** `apps/store/src/features/checkout/api/__tests__/useCreatePayment.test.tsx` — vermelho antes, verde depois; discriminação provada por mutação.
- **Retestado:** re-caminhada em 390×844 (iPhone 14 emulado) como Marina, sessão fresca com
  `sessionStorage` limpo. Gate completo: **842 testes, 0 falhas** · `pnpm build` 2/2.
