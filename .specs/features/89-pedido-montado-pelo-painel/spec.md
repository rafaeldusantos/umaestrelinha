# 89 — O pedido montado pelo painel, e o link que a cliente conclui na loja

**Escopo:** Complex · **Apps:** backoffice, store, `packages/core`, `supabase/functions` (`checkout`,
`mercado-pago`, function nova de admin) · **Migration:** sim (tabelas de proposta, `orders.proposal_id`)
**Origem:** pedido do usuário em 2026-10-29: "em pedidos no backoffice, criar pedido manualmente — para
cliente existente ou novo, com endereço, cálculo de frete, seleção de produtos, cupons e descontos como
no checkout da loja. O pedido criado gera um link com um checkout pronto na loja, com opção de enviar à
cliente para ela fechar o pedido conferindo os dados, escolhendo envio e pagamento." Desenho no Claude
Design, projeto **Uma Estrelinha - Backoffice**: `Pedido - Montar.html` (painel) e
`Loja - Pedido montado.html` (o link na loja).

## Problem Statement

Boa parte das vendas da Adri começa no WhatsApp: a cliente conta a história, escolhe a peça pela
conversa, e às vezes combina um valor. Hoje, para essa venda virar pedido, a Adri manda o link da peça e
espera que a cliente refaça sozinha o caminho inteiro — achar a variação certa, digitar a gravação,
aplicar o cupom combinado. Cada passo é um lugar onde a venda se perde ou chega errada, e o painel não
tem como montar nada por ela: **não existe criação de pedido nem de cliente no backoffice**
(medido em 2026-10-29: clientes nascem só pelo GoTrue/`handle_new_customer` ou pelo checkout de
convidada; pedidos só pela function `checkout`).

O que a feature entrega: a Adri monta a sacola no painel (cliente, endereço, peças, cupom, desconto
combinado), o sistema guarda isso como uma **proposta**, e ela manda à cliente um link que abre a loja
com tudo preenchido. A cliente confere, escolhe a entrega e paga — e só aí nasce o pedido, pelo mesmo
caminho de sempre.

### O que o código de hoje impõe (medido em 2026-10-29)

| Fato | Onde | Consequência para a feature |
| --- | --- | --- |
| O pedido só nasce pela function `checkout` (`create-order`), e `pedidoComDonoUnico.test.ts` recusa qualquer outro autor | `supabase/functions/checkout/handlers.ts:279` | a proposta **não** é pedido; o pedido nasce na conclusão, pela mesma function (`AD-035`) |
| `create-order` confia nos valores do corpo; quem recalcula é o `create-payment`, que relê preço de `products`/`product_variants`, promoções vivas e o cupom | `mercado-pago/handlers.ts:550-718`, `core/payment/pricing.ts:433` | preço travado e desconto avulso **precisam** entrar em `resolveOrderPricing`, senão o `create-payment` os desfaz em silêncio |
| `resolveOrderPricing` não conhece desconto avulso | `core/payment/pricing.ts` | mudança no código de dinheiro — a primeira desde a `22` que é proposital |
| `customers.user_id` é anulável, mas `handle_new_customer` insere com `on conflict (user_id)` | migration `35`:204 | uma ficha criada pelo painel (sem `user_id`) seria **duplicada** quando a conta nasce — precisa ser adotada por e-mail |
| O cupom é validado no navegador (`validateCoupon`, `core/hooks/useCoupons.ts:61`) | — | a proposta precisa da mesma regra, chamada pelo painel e reconferida pelo servidor |
| O token de acesso nunca vai em URL hoje (`orderAccess.ts`) | `core/checkout/guestAccess.ts` | o link é a primeira credencial de URL da loja: precisa ficar fora de log, de analytics e de indexação |
| `useProductPool` lê só `id, name, slug, is_active, base_price` | backoffice `entities/product/api/useProductPool.ts:26` | escolher variação precisa de leitura nova |

## Goals

- [ ] A Adri monta, no painel, uma venda para uma cliente cadastrada ou nova — peças com variação e
      gravação, cupom, desconto combinado — e vê o total que a cliente vai pagar, com a prévia do frete
      para o endereço.
- [ ] Ela envia à cliente um link (WhatsApp ou copiado) que abre a loja com a sacola, o contato e o
      endereço preenchidos; a cliente escolhe a entrega e o pagamento e conclui em **um** passo de
      conferência.
- [ ] O pedido que nasce do link é indistinguível de um pedido da loja em tudo o que vem depois (fila,
      e-mails, Mercado Pago, Melhor Envio), e carrega a origem "Montado pelo painel".
- [ ] O valor que a cliente paga é o que a Adri combinou — o mesmo número no painel, no link, no
      `create-payment` e no Mercado Pago.

## Out of Scope

| Item | Por quê |
| --- | --- |
| E-mail da proposta pelo motor de notificações | Decisão do usuário (2026-10-29): envio por WhatsApp e cópia do link. Um evento `proposal_sent` fica para depois |
| A Adri escolher a entrega ou o pagamento pela cliente | O pedido é que a cliente escolha. O painel mostra a cotação só como prévia |
| Pagamento registrado pelo painel (dinheiro, PIX direto, transferência) | É "marcar como pago" de pedido que não passou pelo Mercado Pago — outra feature, com outra conciliação |
| Peça fora do catálogo (item avulso, sem `product_id`) | `order_items`, estoque, Google Shopping e o painel de vendas supõem `product_id`. Peça sob medida vira produto (mesmo que inativo) |
| Reserva de estoque enquanto a proposta está aberta | A loja não reserva estoque para sacola nenhuma. A falta é tratada na conclusão (`CON-09`) |
| Editar um pedido já criado (trocar item, valor) | Feature própria; a proposta é anterior ao pedido |
| Proposta pelo app do ateliê (`mobile-adm`) | O app é leitura e ações no pedido; montar sacola é tela de computador. A lista pode chegar ao app depois |
| Unificar o desconto avulso com "promoções" | Promoção é regra de catálogo; o avulso é de uma venda só |

---

## Assumptions & Open Questions

| # | Assunção / decisão | Escolha | Por quê | Confirmado? |
| --- | --- | --- | --- | --- |
| A-01 | O que o painel cria | Uma **proposta** (`order_proposals`), que vira pedido só quando a cliente conclui, pela function `checkout` | Pedido que ninguém pagou não entra na fila, no estoque, no Dashboard nem nos guardas de dono único | **s** (2026-10-29) |
| A-02 | Desconto | Cupom e promoção pelas regras de `core`, **mais** um desconto avulso (R$ ou %) com motivo obrigatório, interno | Venda fechada no WhatsApp tem preço combinado | **s** (2026-10-29) |
| A-03 | Preço e prazo | Preço **travado** na versão gravada da proposta; link vale **7 dias** (`GUEST_ACCESS_DAYS`); renovar gera link novo | A cliente paga o combinado | **s** (2026-10-29) |
| A-04 | Envio do link | **WhatsApp** (wa.me com o telefone e mensagem pronta) e **Copiar link** | Decisão do usuário | **s** (2026-10-29) |
| A-05 | Promoção viva | A promoção é calculada e **travada** ao gravar a proposta, como o preço. Promoção que acaba depois não muda o total; promoção que começa depois não entra | Uma regra só: o que a Adri viu é o que vale | n — confirmar |
| A-06 | Cupom vencido ou esgotado entre a montagem e a conclusão | Vale o desconto travado. O uso conta no `used_count` na conclusão, como hoje | Mesmo princípio de A-03. Cupom de primeira compra é conferido **ao gravar** | n — confirmar |
| A-07 | O e-mail da proposta | É **fixo** no link (só leitura, "para trocar, fale comigo"). Nome, telefone, CPF e endereço são editáveis | O token prova que a Adri atestou aquele e-mail; trocá-lo no link levaria o pedido de uma pessoa para outra conta | n — confirmar |
| A-08 | Cliente com conta na loja | O link conclui **sem** o desafio de código. O pedido vai para a conta daquele e-mail | O link é a prova de posse dada pela Adri; pedir código a quem ela mesma mandou o link é atrito sem ganho. Quem tem o link pode pagar, não ler a conta | n — confirmar |
| A-09 | Cliente nova | O painel cria a ficha em `customers` **sem conta** (`user_id` nulo). A conta nasce na conclusão, como a da convidada, e **adota** essa ficha por e-mail | Sem adoção, `handle_new_customer` duplicaria a ficha | n — confirmar |
| A-10 | Frete no painel | A Adri vê a cotação do CEP como **prévia** (e o total "a partir de"). A cliente escolhe no link | Pedido do usuário | **s** (2026-10-29) |
| A-11 | Frete grátis | Decidido por `freeShippingState` sobre o subtotal **travado** menos descontos, no momento da conclusão — a mesma regra da loja | Um dono do frete grátis (`37`) | n — confirmar |
| A-12 | Teto do desconto avulso | Os itens, depois de todos os descontos, têm de somar **pelo menos R$ 1,00**; a % vai de 0,01 a 99,99 | Pedido de valor zero não passa pelo Mercado Pago, e presente é outra feature | n — confirmar |
| A-13 | Numeração | A proposta tem número próprio visível (`P-0001`), separado do número do pedido | O número do pedido é da sequência de `orders` (`AD-043`) e só existe na conclusão | n — confirmar |
| A-14 | Onde a proposta aparece | Aba **"Montados"** na lista de Pedidos, com o estado de cada proposta | A Adri procura "a venda da Fulana" em Pedidos | n — confirmar |
| A-15 | Rota do link | `/pedido-montado#<token>` — o token vai no **fragmento**, nunca no caminho | O fragmento não chega ao servidor (Vercel, `api/page`), não entra no `page_view` do GA4 nem no `Referer` | n — confirmar |

**Open questions:** nenhuma — todas resolvidas ou registradas acima com o padrão escolhido.

---

## User Stories

### P1: Montar a venda no painel ⭐ MVP

**User Story**: Como a Adri, quero montar uma venda no painel — cliente, endereço, peças, cupom e
desconto combinado — vendo o total, para não depender de a cliente refazer a escolha sozinha.

**Acceptance Criteria** (`MON`):

1. WHEN a Adri abre `/admin/pedidos` THEN a página SHALL ter a ação **"Montar pedido"**, que leva a
   `/admin/pedidos/montar`. (`MON-01`)
2. WHEN ela busca uma cliente THEN o campo SHALL procurar por nome, e-mail ou telefone em
   `customer_directory` (inclusive convidadas sem conta) e, ao escolher, preencher nome, e-mail,
   telefone, CPF e oferecer os endereços salvos dela, com o padrão já escolhido. (`MON-02`)
3. WHEN ela escolhe "Cliente nova" THEN o painel SHALL pedir nome, e-mail e telefone (CPF opcional) e,
   se o e-mail já existir no diretório (comparação por `lower(trim)`), SHALL oferecer a ficha existente
   **no lugar** de criar outra — nunca duas fichas para o mesmo e-mail. (`MON-03`)
4. WHEN ela preenche o CEP THEN o endereço SHALL ser completado pelo serviço de CEP da loja (mesma
   máscara `maskCep`), e ela SHALL poder marcar "Salvar no cadastro da cliente". (`MON-04`)
5. WHEN ela acrescenta uma peça THEN a busca SHALL ser a do dono único (`ProductSearchField`, `AD-036`)
   e, para peça com opções, SHALL pedir a variação (só as ativas, com estoque mostrado), a quantidade e
   a gravação quando a peça aceita gravação, com o mesmo teto de caracteres da loja. (`MON-05`)
6. WHEN uma peça exige material (`requires_material`) THEN a linha SHALL dizer "Pede material da
   cliente", como no resto do painel. (`MON-06`)
7. WHEN ela aplica um cupom THEN o painel SHALL validá-lo pela **mesma** regra da loja
   (`validateCoupon`, com o e-mail da cliente para `first_order_only`) e mostrar a recusa com o mesmo
   texto da loja. (`MON-07`)
8. WHEN ela acrescenta um desconto avulso THEN o painel SHALL pedir tipo (R$ ou %), valor e **motivo**
   (obrigatório, até 120 caracteres, interno — a cliente nunca o vê) e recusar valor que deixe os
   itens, depois de todos os descontos, abaixo de R$ 1,00 (A-12), com a frase "O desconto não pode
   zerar o pedido." (`MON-08`)
9. WHEN qualquer item, cupom ou desconto muda THEN o resumo SHALL mostrar subtotal, promoção, cupom,
   desconto combinado e total **calculados por `resolveOrderPricing`** — nunca por conta escrita na
   tela —, com o desconto PIX como linha informativa ("no PIX: R$ …"). (`MON-09`)
10. WHEN há CEP e ao menos uma peça THEN o painel SHALL mostrar a cotação do frete (as opções do
    Melhor Envio e a retirada, quando disponível para o CEP) como **prévia**, com a frase "A cliente
    escolhe a entrega no link". Falha da cotação SHALL dizer isso e não bloquear a gravação. (`MON-10`)
11. WHEN ela clica em **"Criar link"** THEN o painel SHALL gravar a proposta pela function de admin
    (nunca por escrita PostgREST do navegador), gerar o link e abrir a página da proposta. (`MON-11`)
12. WHEN falta cliente, e-mail válido ou peça THEN "Criar link" SHALL ficar desabilitado com o motivo
    escrito ao lado (não só o botão apagado). Endereço é opcional — a cliente pode preencher no link.
    (`MON-12`)

**Independent Test**: montar uma proposta para cliente nova com duas peças (uma com variação e
gravação), cupom de 10% e R$ 20 de desconto combinado; o total no resumo bate com
`resolveOrderPricing` para a mesma entrada.

---

### P1: Guardar a proposta com preço travado ⭐ MVP

**User Story**: Como a Adri, quero que o valor que mostrei à cliente seja o que ela vai pagar.

**Acceptance Criteria** (`PRC`):

1. WHEN a proposta é gravada THEN o servidor SHALL recalcular tudo a partir do banco (preço da
   variação, promoção vigente, cupom, desconto avulso) por `resolveOrderPricing` e **gravar** o
   resultado por item (`unit_price`, desconto de promoção) e no total; o número que o navegador mandou
   é só conferido. (`PRC-01`)
2. WHEN o total calculado pelo servidor difere do que a tela mostrava THEN a gravação SHALL ser
   recusada com "Os preços mudaram enquanto você montava. Confira o resumo." e o resumo relido — nunca
   gravar um valor que a Adri não viu. (`PRC-02`)
3. WHEN o pedido nasce do link THEN `create-order` SHALL montar itens e valores **da proposta**
   (ignorando itens e preços do corpo) e `create-payment` SHALL usar os preços travados e o desconto
   avulso da proposta em vez de reler `products`, promoções e cupom. (`PRC-03`)
4. WHEN `resolveOrderPricing` recebe desconto avulso THEN ele SHALL ser aplicado **depois** de promoção
   e cupom, sobre o subtotal dos itens, sem nunca torná-lo negativo, e **antes** do desconto PIX — a
   mesma ordem no painel, no link e no `create-payment`. (`PRC-04`)
5. WHEN o cupom é `free_shipping` THEN o frete SHALL ser zerado na conclusão para a entrega escolhida,
   como na loja. (`PRC-05`)
6. WHEN a cliente paga THEN o valor cobrado no Mercado Pago SHALL ser igual ao total exibido no link
   para a entrega e o meio escolhidos — provado pelo mesmo cálculo nos dois lados (guarda de paridade
   no molde de `shoppingParity`). (`PRC-06`)

---

### P1: Enviar o link ⭐ MVP

**User Story**: Como a Adri, quero mandar o link para a cliente pelo WhatsApp ou copiar, e saber em que
pé está cada proposta.

**Acceptance Criteria** (`LNK`):

1. WHEN a proposta é criada THEN a página dela SHALL mostrar o link completo, **"Copiar link"** e
   **"Enviar pelo WhatsApp"**, este só quando a cliente tem telefone válido (`normalizeBrPhone`); sem
   telefone, a ação SHALL dizer "Sem telefone — copie o link". (`LNK-01`)
2. WHEN ela toca "Enviar pelo WhatsApp" THEN SHALL abrir o `wa.me` pelo dono único
   (`whatsappChatUrl`, `core`) com a mensagem: "Oi, {primeiro nome}! Montei seu pedido aqui na loja.
   É só conferir seus dados, escolher a entrega e o pagamento: {link}. O link vale até {dd/mm}." —
   sem urgência, sem emoji. (`LNK-02`)
3. WHEN o link é copiado ou aberto no WhatsApp THEN a proposta SHALL registrar "Link enviado" no
   histórico dela, com data e canal. (`LNK-03`)
4. WHEN a Adri abre a aba **"Montados"** da lista de Pedidos THEN cada proposta SHALL mostrar número,
   cliente, total, criada em, e o estado: **Aberta**, **Aberta — vista pela cliente**, **Concluída**
   (com link para o pedido), **Expirada** ou **Cancelada**. (`LNK-04`)
5. WHEN a proposta está aberta THEN a Adri SHALL poder **editar** (mesmo link; a versão sobe),
   **renovar o prazo** (link novo, o antigo morre na hora, com aviso escrito disso) e **cancelar**
   (o link passa a dizer que o pedido não está mais disponível). (`LNK-05`)
6. WHEN a proposta está concluída, expirada ou cancelada THEN editar SHALL estar indisponível; expirada
   SHALL oferecer "Renovar" (recalcula e trava os preços de novo, `PRC-01`). (`LNK-06`)

---

### P1: A cliente conclui na loja ⭐ MVP

**User Story**: Como cliente, quero abrir o link, conferir o que a Adri montou, escolher a entrega e
pagar, sem refazer a escolha das peças.

**Acceptance Criteria** (`CON`):

1. WHEN a cliente abre `/pedido-montado#<token>` THEN a loja SHALL pedir a proposta à function
   `checkout` (`action=get-proposal`, com o token) e mostrar: as peças (foto, variação, gravação,
   quantidade, preço travado), o resumo com os descontos e um checkout com **Contato** e **Entrega**
   preenchidos e **Pagamento** a escolher — os mesmos blocos de `/checkout`, sem tela nova de
   pagamento. (`CON-01`)
2. WHEN a página carrega THEN o título SHALL ser "Seu pedido", com a frase "Montado pela Adri para
   você. Confira seus dados, escolha a entrega e o pagamento." e o prazo: "Este link vale até
   {dd/mm/aaaa}." (`CON-02`)
3. WHEN a cliente está no link THEN as peças, as quantidades e os descontos SHALL ser só leitura, com
   "Quer mudar alguma peça? Fale comigo pelo WhatsApp." Ela não SHALL ver o motivo do desconto
   avulso; a linha SHALL dizer "Desconto combinado". (`CON-03`)
4. WHEN ela edita nome, telefone, CPF ou endereço THEN os blocos SHALL se comportar como em
   `/checkout` (mesmas máscaras, validação e cotação ao trocar o CEP). O e-mail SHALL ser só leitura
   (A-07). (`CON-04`)
5. WHEN ela escolhe a entrega e o pagamento e conclui THEN o pedido SHALL nascer por `create-order`
   com `proposal_token`, com `orders.proposal_id` preenchido, e seguir exatamente o caminho da loja:
   PIX em `/pedido/:id/pagamento`, cartão no Brick, confirmação, e-mails. (`CON-05`)
6. WHEN o pedido nasce THEN a proposta SHALL virar **Concluída** com o `order_id`, na mesma transação
   que cria o pedido; um segundo `create-order` com o mesmo token SHALL devolver **o mesmo pedido**
   (idempotência por proposta, além do `client_request_id`). (`CON-06`)
7. WHEN a cliente abre o link de novo depois de concluir THEN a loja SHALL levá-la ao pedido
   (`/pedido/:id`, com o acesso de convidada emitido na conclusão), e não mostrar o checkout de novo.
   (`CON-07`)
8. WHEN o token é inválido, expirado ou a proposta foi cancelada THEN a página SHALL dizer, sem
   revelar dado nenhum da proposta: "Este link não está mais disponível. Fale comigo pelo WhatsApp que
   eu mando um novo." com o botão do WhatsApp da loja. (`CON-08`)
9. WHEN uma peça ficou inativa ou sem estoque desde a montagem THEN a página SHALL marcar a peça
   "Indisponível no momento", bloquear a conclusão e oferecer o WhatsApp — nunca concluir sem ela nem
   trocar a variação sozinha. O servidor SHALL recusar com o mesmo motivo. (`CON-09`)
10. WHEN a Adri editou a proposta enquanto a cliente estava com a página aberta THEN a conclusão SHALL
    ser recusada pela versão (`proposal_version`) e a página SHALL reler e dizer "A Adri atualizou seu
    pedido. Confira de novo antes de concluir." — nunca criar o pedido com a versão velha. (`CON-10`)
11. WHEN a cliente abre o link pela primeira vez THEN a proposta SHALL registrar "Vista pela cliente"
    (uma vez, com data). (`CON-11`)
12. WHEN o e-mail da proposta tem conta na loja THEN a conclusão SHALL criar o pedido na conta dela
    **sem** pedir código (A-08); WHEN não tem THEN SHALL criar a conta como a da convidada (`AD-035`),
    adotando a ficha criada pelo painel (A-09). (`CON-12`)

**Independent Test**: com a proposta do teste de `MON`, abrir o link em aba anônima a 390×844,
trocar o número da casa, escolher PAC e PIX, concluir: o pedido aparece em `/admin/pedidos` com origem
"Montado pelo painel", total igual ao do link, e a proposta aparece Concluída.

---

### P1: O link é uma credencial ⭐ MVP

**Acceptance Criteria** (`SEG`):

1. WHEN o link é gerado THEN o token SHALL ter 32 bytes aleatórios (`newAccessToken`) e o banco SHALL
   guardar só o hash (`hashAccessToken`), como o acesso da convidada. (`SEG-01`)
2. WHEN a loja lê o token THEN ele SHALL vir só do fragmento da URL, ser guardado em `sessionStorage`
   e apagado da barra de endereço (`history.replaceState`) — e nenhuma chamada de analytics, `api/page`
   ou `Referer` SHALL carregá-lo. (`SEG-02`)
3. WHEN a rota é servida THEN SHALL ser `noindex`, fora do sitemap (`NON_INDEXABLE_PATHS`). (`SEG-03`)
4. WHEN `get-proposal` responde THEN SHALL devolver só o que a página desenha (sem o hash, sem o motivo
   do desconto avulso, sem notas internas) e SHALL ter teto por IP no limitador compartilhado
   (`_shared/rateLimit.ts`). (`SEG-04`)
5. WHEN qualquer ação de proposta é chamada pelo painel THEN a function SHALL exigir admin
   (`requireAdmin`, `_shared/auth.ts`); as tabelas novas SHALL ter RLS ligada, sem policy para
   `anon`/`authenticated` e sem `grant` a eles — a loja só as alcança pela function. (`SEG-05`)

---

### P2: Histórico da proposta e origem do pedido

**Acceptance Criteria** (`HIS`):

1. WHEN a proposta muda (criada, editada, link enviado, vista, renovada, cancelada, concluída) THEN a
   página dela SHALL mostrar o histórico com data e autor. (`HIS-01`)
2. WHEN um pedido tem `proposal_id` THEN a página do pedido no painel SHALL mostrar "Montado pelo
   painel · P-0001" com link para a proposta, e o desconto combinado SHALL aparecer no resumo com o
   motivo (só no painel). (`HIS-02`)

---

### P3: Duplicar uma proposta

1. WHEN a Adri escolhe "Duplicar" numa proposta de qualquer estado THEN o painel SHALL abrir a
   montagem com as mesmas peças e o mesmo desconto, para a mesma ou outra cliente, com preços
   relidos. (`DUP-01`)

---

## Edge Cases

- WHEN a proposta vence no meio da conclusão (a página aberta às 23:59 do 7º dia) THEN o servidor
  SHALL recusar pela data **do servidor** e a página SHALL mostrar `CON-08`.
- WHEN a cliente abre o link em dois aparelhos e conclui nos dois THEN só UM pedido SHALL existir
  (`CON-06`); o segundo aparelho é levado ao pedido.
- WHEN a proposta tem só retirada possível (CEP fora do RS e sem cotação) THEN a página SHALL se
  comportar como `/checkout` com a cotação falhada ("Frete padrão", `SHP-05`).
- WHEN a Adri apaga o produto ou a variação depois de montar THEN a proposta SHALL continuar legível
  (nome e foto guardados na linha, como em `order_items`) e cair em `CON-09`.
- WHEN a sacola da loja da cliente (`estrelinha-cart`) tem outras peças THEN o link SHALL **não**
  tocá-la: a proposta é uma sacola própria, e concluir não esvazia a sacola dela.
- WHEN o mesmo e-mail tem duas propostas abertas THEN as duas SHALL valer independentemente.
- WHEN cupom e desconto avulso juntos levariam os itens abaixo de R$ 1,00 THEN a gravação SHALL
  recusar pela regra de `MON-08`, calculada no servidor, mesmo que cada um sozinho caiba.
- WHEN a Adri edita a proposta sem mudar nada THEN a versão SHALL não subir.

## Implicit-requirement sweep

| Dimensão | Cobertura |
| --- | --- |
| Validação e limites | `MON-03`, `MON-05`, `MON-08` (motivo 120, itens ≥ R$ 1,00), quantidade 1..99, até 30 linhas por proposta |
| Falha / falha parcial | `MON-10` (cotação), `PRC-02` (preço mudou), `CON-09` (estoque); gravar a proposta e os itens numa transação (RPC `security definer` chamada pela function) |
| Idempotência / retry | `CON-06` (uma proposta, um pedido), `client_request_id` mantido; "Criar link" com chave de idempotência própria contra o duplo clique |
| Autorização e limites | `SEG-04`, `SEG-05` |
| Concorrência / ordem | `CON-10` (versão), duas abas da Adri editando ⇒ a segunda gravação recusa pela versão |
| Ciclo de vida / expiração | 7 dias (`A-03`); expirada não é apagada; poda fora de escopo |
| Observabilidade | histórico da proposta (`HIS-01`); log da function sem o token (molde `ADR-G2` da `49`) |
| Falha de dependência externa | Melhor Envio (`MON-10`), Mercado Pago inalterado |
| Integridade de transição | Aberta → Concluída/Expirada/Cancelada; Expirada → Aberta só por Renovar; Concluída e Cancelada são fim de linha |

## Requirement Traceability

| IDs | Story | Status |
| --- | --- | --- |
| MON-01..12 | P1 Montar | Pending |
| PRC-01..06 | P1 Preço travado | Pending |
| LNK-01..06 | P1 Enviar o link | Pending |
| CON-01..12 | P1 Concluir na loja | Pending |
| SEG-01..05 | P1 Credencial | Pending |
| HIS-01..02 | P2 Histórico | Pending |
| DUP-01 | P3 Duplicar | Pending |

**Coverage:** 44 requisitos, 0 mapeados para tasks (o Design ainda não foi feito).

## Success Criteria

- [ ] A Adri monta uma venda de 2 peças com cupom e desconto combinado e envia o link em menos de 3
      minutos, em 1440.
- [ ] A cliente conclui pelo link a 390×844 sem digitar nada além do que mudou, em menos de 2
      minutos até a tela do PIX.
- [ ] Zero divergência de centavo entre o total do painel, o do link e o cobrado pelo Mercado Pago
      (guarda de paridade).
- [ ] Nenhum pedido em `orders` nasce de proposta sem passar pela function `checkout`
      (`pedidoComDonoUnico` segue com zero allowlist).
