# Análise pós-ciclo — 2026-07-28

Reanálise dos achados do ciclo `2026-07-28-checkout-08-09` com o MCP do Mercado Pago conectado e o
stack local ressuscitado. **Três dos cinco achados originais mudaram de veredito.** Este documento
existe porque o registro de bugs precisa refletir a realidade, não a minha primeira leitura.

## O que mudou, e por quê

| Achado original | Veredito revisado |
| --------------- | ----------------- |
| `edge-runtime-sem-dns` — container sem DNS | ⚠️ **Causa reenquadrada.** Não era DNS: o container estava `Exited (255)` há 34h. O **defeito de produto continua real** e virou o título do bug |
| `frete-fallback-sem-aviso` — fallback sem aviso | ❌ **Retirado.** O aviso existe e renderiza. Eu medi o bloco **colapsado** |
| CPF sem justificativa (na validação de UI) | ❌ **Retirado.** A justificativa renderiza; meu snapshot usou `-i` (só interativos) e ela é um `<p>` |
| `bloco-vazio-parece-preenchido` | ✅ **Confirmado** |
| `auth-local-so-entrega-ao-dono-do-resend` | ✅ **Confirmado** |
| `header-mobile-diverge-do-board` | ✅ **Confirmado** |
| — | 🆕 **Novo:** `alterar-alvo-de-toque-28px` |

## A raiz dos meus dois erros

Os dois achados retirados têm a mesma causa, e não é falta de cuidado com o produto — é **instrumento
errado no momento errado**:

1. **`frete-fallback-sem-aviso`:** rodei o regex sobre `innerText` **depois** de preencher o número, e
   o acordeão já havia avançado. O aviso vive no bloco expandido. Medi o estado colapsado e concluí
   ausência.
2. **CPF sem justificativa:** li o snapshot com `-i` (interativos), e a justificativa é um `<p>`. Ela
   nunca poderia aparecer ali.

Nos dois casos eu inferi ausência a partir de **evidência faltante**, não de evidência contrária. É o
inverso da regra que o próprio protocolo do QA estabelece — *"a suposição padrão para qualquer anomalia
é defeito de produto até prova em contrário"* — mas a regra pressupõe que a medição seja válida. Uma
medição inválida não prova nem defeito nem ausência dele.

**Duas regras que entram no `README` do QA:**

- **Estado antes de conclusão.** Antes de afirmar que um elemento não existe, provar que o estado que o
  renderiza está ativo. Num acordeão, isso significa conferir qual bloco está aberto.
- **`snapshot -i` não é evidência de ausência.** Ele lista só elementos interativos. Texto de apoio,
  aviso e mensagem de erro precisam de `innerText` ou snapshot completo.

## O que o Mercado Pago disse sobre a integração

Rodei o *Quality Checklist* do MP contra a app **Nanita store** (`1082025243026194`). O resultado mais
relevante é uma corroboração independente:

> **`response_messages`** (boa prática) — *"Mostra feedback ao pagador para recusas ou mensagens de erro
> da API?"* → *"Mostre mensagens claras para os usuários."*

É exatamente o `Gerando código PIX...` sem timeout, sem erro e sem saída. O achado mais grave do ciclo
sobrevive à revisão **e** é apontado pelo próprio provedor de pagamento.

Outros itens do checklist que valem virar backlog, sem serem defeito hoje:

| Item | Situação na integração |
| ---- | ---------------------- |
| `email`, `payer_last_name`, `external_reference`, `statement_descriptor`, `issuer_id` | ✅ Enviados (a `08`/`09` cuidaram disso) |
| `secure_form` (PCI) | ✅ Brick tokeniza no browser; nenhum PAN no backend |
| `webhooks_ipn` | ✅ URL no painel — a Orders API recusa `notification_url` no corpo |
| `item_description` | ⚠️ Conferir se o payload de itens leva descrição |
| `device_id` | ⚠️ Transparente no Brick (cartão). **No PIX não há Brick** — conferir se é enviado |
| `back_end_sdk` | ❌ Não usamos o SDK de backend. Decisão arquitetural (edge function Deno, `fetch` cru) — não vale mudar |
| `response_messages` | ❌ **É o bug em aberto** |

## O bloqueio de ambiente caiu

`supabase stop && supabase start` ressuscitou o edge runtime. `create-payment` responde **401** (auth
manual, esperado sem JWT) em vez de 503. **As 10 linhas `blocked-verify` do ciclo voltam a ser
alcançáveis** — o que faltava não era DNS, era o container de pé.

Continua faltando `MELHOR_ENVIO_TOKEN` para exercitar cotação real (3 cenários de SHP).

## Lista de correção — o que de fato precisa de código

Ordenada por impacto. As três primeiras passam o *governor* do fix-loop como auto-fix; as duas últimas
seguem sendo decisão sua.

| # | Correção | Impacto | Onde | Governor |
| - | -------- | ------- | ---- | -------- |
| 1 | **Timeout + erro retentável no `create-payment`** — matar o spinner infinito | Blocks-Completion | `PaymentBlock`/`PixPayment` + `useCreatePayment` | ✅ auto-fix (você autorizou a opção 1 que eu recomendei) |
| 2 | **Resumo colapsado de bloco vazio** — não renderizar `, — /` nem `PIX · CPF` sem valor, e não oferecer "Alterar" em bloco nunca preenchido | Friction | `DeliveryBlock:~120`, `PaymentBlock:134` | ✅ auto-fix |
| 3 | **Alvo de toque de "Alterar"** — 28px → ≥44px sem mudar a aparência | Friction | os dois blocos colapsados | ✅ auto-fix |
| 4 | **Valor da parcela no card de cartão** — `Até 6x sem juros` → `Até 6x de R$ X,XX sem juros`, respeitando `min_installment_value` | Cosmetic | `PaymentBlock:202` | ✅ auto-fix |
| 5 | **SMTP local** — `[auth.email.smtp] enabled = false` no `config.toml` versionado, Resend só no hospedado | Blocks-Completion (dev) | `supabase/config.toml` | ⚠️ muda ambiente de todos |
| 6 | **Header mobile do board 07** | Cosmetic | header do `/checkout` | ⚠️ decisão de design |

**Não corrigir:** o aviso do frete (existe) e a justificativa do CPF (existe). Escrever código para
"consertar" o que já funciona seria o pior desfecho possível desta análise.

## O que eu não fiz

Não apliquei nenhuma das correções. Esta rodada foi de **análise**: reverificar os achados, derrubar os
falsos, encontrar o que faltava e confirmar contra o provedor. Aplicar os itens 1–4 é a próxima rodada,
e cada um precisa de teste de regressão vermelho-antes/verde-depois, mais re-caminhada em persona —
o que o governor exige e o que eu não teria margem para fazer com honestidade agora.
