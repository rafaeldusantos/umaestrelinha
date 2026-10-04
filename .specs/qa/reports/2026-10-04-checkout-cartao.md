# QA — 2026-10-04 — Checkout: bloqueio do "Pagar" e pagamento com cartão

**Escopo:** branch/PR run sobre `6e57219` (o "Pagar" só habilita com os dados do pagamento) e o
caminho do cartão, que a dona relatou quebrado em produção.
**Ambiente:** loja local `vite --mode develop` (:8082) → Supabase **hospedado**
`hgkrsfpupypxtygjgthf` (banco de PRODUÇÃO). Mercado Pago: só **cartões de teste oficiais** — se o
token hospedado for sandbox, aprovam de mentira; se for de produção, são recusados e nada é cobrado.
**Persona:** cliente no celular (390×844, toque), comprando uma joia pela primeira vez, sem conta.
**Avisos de e-mail — PARTE DO TESTE** (pedido da dona). Ligados em produção, medidos em
`store_settings.notifications.value->events->*->email->enabled`: `order_received`, `order_paid`,
`owner_order_received`, `owner_order_paid`, `material_received`, `order_shipped`,
`owner_material_incoming`. Nenhuma configuração foi alterada. A cliente de teste usa
`rafael+qa@aproximma.com.br`; os avisos da loja vão para o endereço configurado (`@aproximma.com.br`).
> A primeira leitura desta sessão disse "nenhum ligado" — a consulta olhava `evento.enabled` em vez
> de `evento.email.enabled`. Corrigida antes de qualquer ação.
**Limpeza:** todo pedido, item, cliente e conta criados por esta sessão são listados abaixo e
removidos no fim.

## Matriz

| # | Persona × jornada | Tour | Status |
| --- | --- | --- | --- |
| S1 | cliente 390 × cartão: digitar o número | Fedex (o dado atravessa a tela) | **Pass** (depois do conserto; Fail antes) |
| S2 | cliente 390 × cartão: todos os dados → "Pagar" habilita | Fedex | **Pass** (depois do conserto; Fail antes) |
| S3 | cliente 390 × cartão: clicar "Pagar" → pedido pago e confirmação | Fedex | **Pass** (depois de dois consertos; Fail antes) |
| S4 | cliente 390 × PIX: "Pagar" travado sem CPF, liberado com CPF válido (sem clicar) | Supermodel | **Pass** |
| S5 | edge: trocar cartão → PIX → cartão; "Alterar" outro bloco com cartão digitado | Back alley | **Pass** |
| S6 | cliente 390 × **produto afetivo** (`piramide-afetiva-pet`) × cartão → confirmação com material | Fedex | **Pass** (depois do conserto; Fail antes) — e-mail da cliente **não sai** (configuração, ver Decisões) |

## Achados

| Bug | Impacto | Status |
| --- | --- | --- |
| [`BUG-20261004-brick-recriado-a-cada-render`](../bugs/BUG-20261004-brick-recriado-a-cada-render.md) — o formulário de cartão era recriado vazio a cada renderização (os 3 sintomas relatados pela dona) | Blocks-Completion | **fixed** |
| [`BUG-20261004-cartao-aprovado-cai-na-home`](../bugs/BUG-20261004-cartao-aprovado-cai-na-home.md) — cartão aprovado levava à Home com a sacola vazia, sem confirmação | Trust-Damage | **fixed** |
| [`BUG-20261004-brick-com-cor-da-loja-anterior`](../bugs/BUG-20261004-brick-com-cor-da-loja-anterior.md) — foco do formulário de cartão no magenta da loja anterior | Trust-Damage | **fixed** |

**Não-defeitos medidos** (registrados para ninguém refazer a investigação): a barra de compra do
celular fora da tela ao abrir a página do produto é **intencional** (entra depois da foto,
`9d873d6`); a galeria "vazia" era a captura tirada antes de as fotos chegarem (200 nas rendições);
`90440-002` não é um CEP que existe; `order_received` não sai no cartão por projeto (só para pedido
`pending`, o PIX).

### Decisões para um humano

1. **A cliente de joia afetiva não recebe e-mail nenhum ao pagar.** Na aprovação, o e-mail de quem
   precisa enviar material é `material_instructions` (no lugar de `order_paid`, `NTF-10`) — e ele
   está **desligado em produção**. Medido: pedidos `0172` e `0173` com só `owner_order_paid`.
   *Recomendação:* cadastrar o endereço do ateliê em Configurações → Material e ligar o evento em
   Notificações. É configuração, não código.
2. **A confirmação afirma "Enviamos o comprovante para …" mesmo quando nenhum e-mail sai** (o caso
   acima). E o título do pedido pago é **"É nosso!"**, de tom questionável numa loja memorial. Os
   dois textos estão na `master` e em produção; **não corrigidos aqui** porque
   `OrderConfirmationPage.tsx` está sendo reescrita pela feature 59, sem commit, na mesma árvore.
   *Recomendação:* a 59 condicionar a frase ao evento ligado e rever o título.
3. **1 aviso para a loja em 4 pedidos se perdeu** (`0171`: `owner_order_paid` →
   `budget_exhausted: restavam 398ms`). É o desenho declarado do `dispatch.ts` — 2,5 s para todos os
   avisos da aprovação, a cliente primeiro, e o que não cabe fica "reenviável" no histórico —, mas
   ninguém reenvia sozinho. *Recomendação:* repetir os `budget_exhausted` pelo webhook do Mercado
   Pago, que chega depois e sem cliente esperando.
4. **"Últimas unidades — apenas 2 restantes"** na página do produto. O `CLAUDE.md` lista "últimas
   unidades" como urgência proibida, mesmo vinda do estoque real. *Recomendação:* trocar por
   "2 disponíveis".
5. **A espera depois de "Pagar" no cartão é de 12–15 s com o botão só acinzentado** — medido em três
   compras. O PIX ganhou tela de progresso na `58`; o cartão ficou de fora de propósito (`PGM-08`, o
   Brick precisa seguir montado). *Recomendação:* um estado de progresso **dentro** do bloco, sem
   desmontar o Brick.
6. **A sequência do número do pedido avançou para 0173** com os pedidos de teste apagados. O próximo
   pedido real será `#0174`. *Recomendação:* deixar — buraco na numeração não quebra nada; voltar a
   sequência é escrita em produção sem ganho.

## Session Debriefs

- **antes-do-conserto** (S1–S3): número digitado → **6 reconstruções** do container do Brick e 1 troca
  do controller; o campo de validade some debaixo do dedo; "Pagar" aparece **habilitado** com o
  número já apagado. Reproduz os três sintomas da dona.
- **depois-do-conserto / s3-confirmacao** (S1–S3): 0 reconstruções do início ao fim; o Mercado Pago
  tokeniza (201) e aprova — **o modo é sandbox** (cartão de teste com titular `APRO` só aprova lá).
  Mas o destino final foi `/`, com a gaveta da sacola vazia: segundo bug.
- **s6-afetivo** (antes do 2º conserto): sequência medida
  `/pedido/:id` → 29 ms → `/carrinho` → `/`.
- **s6-afetivo-pos** (depois): fica em `/pedido/41ffc8da-…`; "Pedido #0173 · Pago" e "Aguardando
  seu material / Envie o seu material".
- **s4-s5**: PIX trava com CPF vazio e inválido, libera com CPF e CNPJ válidos; trocar de método e
  "Alterar" travam de novo, e o Brick volta vazio. Nenhum pedido criado.
- **cor**: foco do número do cartão em `#34495e` depois do conserto.

## Dados criados em produção

_(cada id criado é anotado aqui, para a limpeza)_

- pedido `f421828e-2303-4f62-95dd-bff51073db7c` — sessão `depois-do-conserto` (Visa de teste, cliente `rafael+qa@aproximma.com.br`, número `0170`, aprovado) + a conta de convidada `customer_id d7d60aa0-b6f4-4a2e-a202-30cfc2703d73`
- pedido `fd27b121-e5e9-4185-b874-39b8e5ca86c5` — sessão `s3-confirmacao` (Visa de teste, cliente `rafael+qa2@aproximma.com.br`) + a conta de convidada dela

- pedido `d1b05a46-2399-4fdc-998f-5ded0d08d0bc` — sessão `s6-afetivo` (`piramide-afetiva-pet`, cliente `rafael+qa3@aproximma.com.br`) + a conta de convidada dela
- pedido `41ffc8da-83a2-4878-813c-c009caf14380` — sessão `s6-afetivo-pos` (`piramide-afetiva-pet`, cliente `rafael+qa4@aproximma.com.br`, `#0173`) + a conta de convidada dela
- **estoque** de `pingente-menino-zirconias-no-bone-pequeno-em-prata-925`: era **2** antes da sessão, ficou **0** com os dois pedidos aprovados — volta a 2 na limpeza

### Limpeza — feita

Uma transação com trava por contagem (`scratchpad/limpeza-qa.sql`): 4 pedidos (com 4 itens e 6
notificações em cascata), 4 clientes (com 4 endereços), 4 contas de autenticação, 1 carrinho
abandonado; estoque do pingente de volta a 2. Conferido depois por leitura independente: **47
pedidos, o último de 2026-10-02** — o estado de antes da sessão. Ficam os pagamentos de teste no
sandbox do Mercado Pago (inofensivos) e a sequência do número em 0173 (Decisão 6).

## Final Status

**Pronto para publicar, com ressalvas.** 3 bugs achados, 3 corrigidos com teste de regressão
(vermelho antes, verde depois) e re-walk no navegador. 6 matrizes em Pass.

Suíte da loja ao fechar: **4197 de 4199** — as 2 reprovações restantes são de arquivos da feature
59 (`situacaoComDonoUnico.test.ts` acusando `entities/order/lib/orderMeta.ts`, os dois sem commit),
não desta sessão; a terceira, do `brandScan`, era desta sessão e foi corrigida. Tipos 0; lint na
baseline (2/2).

Totais por impacto: Blocks-Completion 1 (fixed) · Trust-Damage 2 (fixed) · 6 decisões para humano.
