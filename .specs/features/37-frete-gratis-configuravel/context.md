# Contexto — decisões do usuário

Três áreas cinzentas foram levadas ao usuário antes de escrever a spec, porque a feature toca o
**caminho do dinheiro** (o frete cobrado no checkout) e **estado persistido** (`store_settings`).
Respondidas em 2026-09-05.

---

## Q1 — Como o interruptor nasce para a loja que já está no ar?

**Resposta: DESLIGADO (`false`).** Exige ato explícito da dona para ligar.

**Consequência aceita, e ela é visível em produção**: no primeiro deploy desta feature a loja
**para** de anunciar e de conceder frete grátis. A home deixa de dizer "grátis acima de R$ 150", o
selo some da página do produto, a faixa some da gaveta e do checkout, e o frete passa a ser cobrado
integralmente — até a Adri abrir `/admin/configuracoes` → aba Frete e ligar.

**Por que não "ligado"**: a alternativa preservava o comportamento de hoje e teria risco zero no dia
do deploy. Foi recusada. O precedente do repositório está do lado da escolha feita:
`google_shopping.enabled` também nasce desligado, e pelo mesmo tipo de razão — um estado que custa
dinheiro ou alcance não deve começar valendo por omissão de quem escreveu a migration.

**O que isto obriga**: o handoff da feature e o `CLAUDE.md` precisam registrar que **ligar o frete
grátis é um passo de operação pós-deploy**, não um detalhe de configuração. Sem esse registro, a
loja fica meses sem frete grátis porque ninguém soube que havia um interruptor.

---

## Q2 — Cupom `free_shipping` continua valendo com o interruptor desligado?

**Resposta: SIM.** O interruptor governa apenas a faixa **automática por valor de compra**.

**Racional**: cupom é ato explícito da dona, criado um a um em `/admin/cupons`, com código, validade
e limite de uso próprios. Desligar a faixa automática não deveria invalidar campanha que ela montou
— são dois mecanismos com donos diferentes.

**Consequência técnica, e é a que mais importa**: `packages/core/src/payment/pricing.ts` e
`supabase/functions/mercado-pago/**` **não são tocados**. O único caminho de frete grátis que o
servidor conhece é o do cupom (`resolveOrderPricing` zera `shipping` quando
`coupon.type === 'free_shipping'`), e ele continua igual. A regra do `CLAUDE.md` de que "o código de
dinheiro não muda por acaso" fica conferível por `git diff --name-only` no gate.

**O que fica convivendo**: com o interruptor desligado e um cupom de frete grátis aplicado, o frete
é zero e **nenhuma copy de faixa aparece**. Não é contradição — a loja não promete faixa nenhuma, e
o desconto que a cliente recebe é nomeado pelo cupom, que já tem linha própria no resumo.

---

## Q3 — O que acontece com a faixa "Complete o frete grátis" da gaveta (`CrossSell`)?

**Resposta: SOME JUNTO** com o resto do frete grátis.

**Racional**: todo o enquadramento da faixa é "complete o frete" — o título é literalmente
`Complete o frete grátis`. Sem a faixa de progresso acima dela, o título promete o que a loja não
faz.

**Alternativa recusada**: manter as sugestões sob copy neutra ("Você também pode gostar"), que
preservaria o cross-sell como recurso de venda independente. Foi recusada porque criaria copy nova, e
copy nova num negócio memorial precisa de revisão de tom que ninguém pediu.

**Consequência**: com o interruptor desligado, a gaveta não busca mais o catálogo para sugerir
(`useAllProducts` já é condicionado a `!progress.reached`) — uma requisição a menos, de graça.

---

## O que NÃO foi perguntado, e por quê

| Ponto | Decidido sem perguntar | Motivo |
| --- | --- | --- |
| Onde mora a regra | `packages/core/src/shipping/freeShipping.ts` | O `CLAUDE.md` já decide: "se dois consumidores leem a mesma regra, ela vai para `packages/core`". São sete. |
| Forma do interruptor (booleano novo vs. `threshold > 0`) | booleano novo | Precedente unânime dentro do próprio `store_settings`, e `threshold > 0` faria a dona perder o número ao desligar. Registrado na tabela de assunções da spec com o racional completo. |
| `FreeShippingBar` | apagado | Zero consumidores. Não é decisão de produto. |
| Item do `AuthOverlay` | derivado das settings, some quando desligado | Corrige um literal cravado que já contraria a `PDP-24`. Não é decisão de produto. |
| `enabled: true` com faixa zero | recusado na gravação | O estado "frete grátis incondicional" nunca foi pedido, e deixá-lo passar criaria divergência silenciosa entre o que o painel diz e o que a loja faz. Está na spec como `FRG-12` — se o usuário discordar, é uma AC para remover, não um redesenho. |
