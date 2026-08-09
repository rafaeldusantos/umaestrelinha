# Checkout One-Page Specification

> **Rev. 2 (2026-07-27)** — revisada após auditoria independente da rev. 1 (7 achados bloqueantes,
> 16 não-bloqueantes). Correções incorporadas: preço do order bump passa a ser server-side (B1),
> policy de UPDATE em `customers` (B2), CPF chega ao servidor antes do `create-payment` e vence o
> Brick (B3), `address_zip`/`address_complement` gravados (B4), coluna do prazo de entrega (B5),
> edição de bloco após o pedido criado invalida o pedido (B6), campos e critério de "completo" por
> bloco + preservação do abandoned-cart (B7).

## Problem Statement

O checkout da loja tem **cinco passos sequenciais** (Identificação → Endereço → Entrega → Revisão →
Pagamento), sendo que o passo "Revisão" apenas reapresenta o que a cliente acabou de digitar
(`features/checkout/ui/ReviewStep.tsx`) — é fricção sem informação nova. Atrás dessa estrutura
existem quatro defeitos concretos:

1. **O frete cobrado não é o frete cotado.** `ShippingStep.tsx:20-22` lista três opções fixas: o PAC
   usa `default_shipping_cost` das settings, SEDEX e Jadlog têm preço **literal** no código
   (`18.90`, `12.90`), e os **três prazos são strings fixas** (`'6-10 dias úteis'`). Enquanto isso a
   mesma loja já cota o Melhor Envio de verdade na página de produto
   (`features/shipping-calc/ui/ShippingCalc.tsx:35` → `melhor-envio?action=quote`). A cliente vê
   cotação real no produto e paga valor e prazo inventados no checkout.
2. **O CPF é coletado e descartado, e o PIX vai sem o pagador identificado.** `CustomerStep.tsx:45-47`
   pede CPF; `CheckoutPage.handleConfirm` não o repassa; `useOrders.ts` não tem o campo. O
   `create-payment` monta o PIX com `payer: { email, first_name }`
   (`supabase/functions/mercado-pago/index.ts:211-215`) — **sem `identification` e sem `last_name`**,
   que a API do Mercado Pago exige para PIX no Brasil.
3. **A tabela `addresses` existe com RLS e nunca é usada.** Criada na migration inicial
   (`20260414121021_*.sql:69-82`) com policies de SELECT e INSERT (`:207-208`), nunca lida nem
   escrita pela loja — o endereço é redigitado a cada compra. Falta a policy de UPDATE.
4. **O CEP do pedido nunca é gravado.** `AddressStep.tsx:42` não devolve o `cep`, e
   `orders.address_zip` fica nulo. O backoffice faz `order.address_zip.replace(/\D/g, '')`
   (`features/order-management/ui/MelhorEnvioTab.tsx:71`) — hoje isso **estoura TypeError** para
   qualquer pedido criado pela loja, bloqueando a cotação de etiqueta.

O discovery no Paper (boards `04` a `07`) fechou o padrão **one-page de 3 blocos**, calibrado pelo
critério que as três plataformas de referência usam — Nuvemshop (checkout transparente, dados
salvos), Shopify (one-page ganha em **AOV baixo + SKU simples + recompra alta**, que é exatamente o
perfil da loja: pins de R$ 9–30) e CartPanda (order bump antes do CTA).

## Goals

- [ ] Checkout em **uma página com 3 blocos**; o passo "Revisão" deixa de existir e o resumo
      persistente assume o papel dele.
- [ ] **Frete cobrado = frete cotado**: transportadora, serviço, preço e data de entrega vindos do
      Melhor Envio, com o serviço escolhido persistido no pedido. Zero preço e zero prazo de frete
      fixos no código da loja.
- [ ] PIX criado com o pagador identificado (`payer.identification` CPF), e o CPF persistido em
      `customers` para não ser pedido de novo.
- [ ] Endereço (incluindo CEP) gravado no pedido e reaproveitado de `addresses`.
- [ ] Order bump configurável antes do CTA, com **o preço do desconto calculado no servidor** — o
      valor exibido é, por construção, o valor cobrado.

## Out of Scope

Explicitamente excluído. Documentado para evitar scope creep.

| Feature | Reason |
| ------- | ------ |
| Área de conta: pedidos, rastreio, favoritos, endereços (CRUD), meus dados — boards `08`–`11` | Outra jornada (pós-compra), outros dados (`order_status_history`, wishlist no banco), libera de forma independente → spec `09-conta-cliente` |
| Guest checkout | Decidido em 2026-07-27: login segue obrigatório. Manter `orders.customer_id` e a RLS da 02 intactos |
| Upsell 1-clique pós-compra na confirmação | Exige cobrar de novo sem novo checkout (cartão salvo ou novo pagamento MP) — spec de conversão futura. O board `06` desenha o bloco; ele não entra agora |
| Order bump com regras (categoria no carrinho, subtotal mínimo, prioridade, múltiplas ofertas) | Decidido em 2026-07-27: um produto fixo em `store_settings.checkout` |
| Wishlist persistida no banco, badge "baixou de preço", "avise-me" quando esgotado | Vai com a `09-conta-cliente` |
| Boleto, wallet MP, cartões salvos, login MP | Herdado do Out of Scope da `02-checkout-mercado-pago` |
| E-mails transacionais (confirmação/comprovante) | ~~Sem infra de e-mail transacional na loja; herdado da `02`. A tela de confirmação **não** promete e-mail que não é enviado~~ → **superado pela `10-emails-transacionais`** (2026-07-30): a infra existe, e a tela de confirmação passou a mencionar o e-mail (STO-01), diferenciando pago de pendente. Linha mantida para preservar o histórico da decisão. |
| Motor de pagamento: webhook, mapa de transições, idempotência, `apply_payment_approval`, Brick de cartão, desconto PIX, Realtime, expiração de 24h | Entregue pela `02`. Esta feature muda **o que é enviado** ao MP e **a UI** — não o motor. Exceção declarada: o cálculo de preço do item do bump (BMP-06) |
| Criar envio / imprimir etiqueta no Melhor Envio pela loja | É operação de backoffice (`features/order-management/MelhorEnvioTab`) |
| Múltiplos endereços por cliente com seletor | Nesta feature existe um endereço (o `is_default`). Seletor vai com a `09` |
| Tabela de feriados nacionais para o cálculo de dias úteis | "Dias úteis" = seg–sex nesta feature (assumption registrada). Calendário de feriados é precisão que não muda a decisão de compra |
| Mudança na paleta ou nos tokens do backoffice | `DESIGN.md` §7: `packages/ui/styles.css` não é tocado |

---

## Assumptions & Open Questions

Toda ambiguidade está resolvida ou registrada aqui — nada fica silenciosamente indefinido.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Guest checkout | Login obrigatório (comportamento atual) | Mantém `customer_id`, RLS e `useOrdersByCustomerId` intactos | **y (2026-07-27)** |
| Fonte da oferta do order bump | `store_settings.checkout`: `order_bump_enabled`, `order_bump_product_id`, `order_bump_discount_percent` | Entrega o padrão CartPanda sem migration de tabela nem motor de regras | **y (2026-07-27)** |
| **Faixa "Entre e preenchemos tudo" do board 04** | **Removida do checkout.** Com login obrigatório a cliente já está autenticada ao chegar — a faixa seria UI morta. O atalho (código + Google) vive no overlay de `features/auth`, que já guarda `returnTo=/checkout` | Contradição entre o board e a decisão de login obrigatório; resolvida a favor da decisão | **y (2026-07-27)** |
| **Preço do item do bump** | Calculado **no servidor** pela edge function: ela aplica `order_bump_discount_percent` ao item cujo `product_id === order_bump_product_id` quando `order_bump_enabled=true`, limitado a `quantity = 1`. O `unit_price` enviado pelo cliente continua sendo ignorado (PAY-03) | O recálculo server-side da `02` descarta o `unit_price` do cliente; sem isso o desconto apareceria na UI e não na cobrança. Consequência aceita e documentada: se a cliente colocar esse produto no carrinho por outro caminho, ele é cobrado com o desconto — é exatamente a oferta que o lojista configurou | n (default proposto) |
| **Edição de bloco depois do pedido criado** | Invalida o pedido: o `order_id` em curso é descartado e o próximo CTA cria um pedido novo. **Retentativa de pagamento** (sem editar bloco) continua no mesmo pedido, conforme PAY-16 | `orders` não tem policy de UPDATE para `authenticated` (`20260718234512_orders_rls_hardening.sql`), então um bloco editado não persistiria e a function cobraria o frete/endereço antigos | n (default proposto) |
| Frete grátis com cotação real | `subtotal ≥ free_shipping_threshold` zera **a opção mais barata** retornada (exibe "Grátis" + preço original riscado); as demais mantêm o preço | Hoje o threshold zera o "PAC" hardcoded; com cotação real o equivalente honesto é o serviço mais barato do momento | n (default proposto) |
| Cotação falha, expira ou retorna vazio | Opção única **"Frete padrão"** com `default_shipping_cost` + aviso visível; a compra prossegue | Perder a venda é pior que cobrar o flat já configurado. Nunca bloquear o checkout por indisponibilidade de terceiro | n (default proposto) |
| Conversão de prazo em data | `data = hoje + handling_days + delivery_range` em **dias úteis (seg–sex, sem feriados)**. Nova chave `handling_days` (default `2`) em `store_settings.shipping`. Quando `delivery_range` vem ausente, usa `delivery_time` como min e max | O ME devolve prazo em dias úteis **a partir da postagem**; sem o tempo de produção a data seria desonesta. `ShippingCalc.tsx:100` já trata `delivery_range` como não garantido | n (default proposto) |
| Onde o CPF é coletado | No **bloco Pagamento**, não no Contato | É dado do pagador (exigência do meio de pagamento), não de contato — e é onde o board `04` o coloca | y (board 04) |
| Validação de CPF | Máscara + dígito verificador no cliente antes de habilitar o CTA; o MP permanece a autoridade final | Evita round-trip garantidamente perdido | n (default proposto) |
| `first_name` / `last_name` para o MP | Derivados de `customers.name`: primeiro token = `first_name`, restante = `last_name`; nome de token único repete o token em `last_name` | A loja coleta um campo único de nome; o MP exige os dois para PIX | n (default proposto) |
| CPF da loja × CPF do Brick de cartão | O CPF do campo da loja **vence**: a edge function sobrescreve `payer.identification` do payload do Brick com o do pedido | Um único CPF de verdade por pedido; o Brick permite o campo, mas a fonte canônica é o pedido | n (default proposto) |
| Bloco aberto no acordeão | O primeiro bloco incompleto. Blocos completos colapsam com resumo + "Alterar". Nunca dois abertos. **Nenhum bloco tem botão primário próprio** — a única pílula geleia da tela é o CTA | Padrão comum às três referências + `DESIGN.md` §8 ("uma ação primária em geleia") | y (board 04 + DESIGN.md) |
| Superfície da confirmação | Rota `/pedido/:id` (`OrderConfirmationPage`, já registrada em `app/App.tsx:42`) — não estado inline do `CheckoutPage`. Aprovação navega para lá | Confirmação inline morre no reload (cai em "Carrinho vazio" após `clearCart`) e não é linkável | n (default proposto) |
| Header do checkout | Header próprio, sem navegação de categorias, com selo de segurança e canal de ajuda | Reduz vazamento de atenção; board `04` | y (board 04) |
| Resumo no mobile | Barra colapsável no topo (itens + total) + CTA fixo no rodapé | board `07` | y (board 07) |
| Moeda / locale | BRL, pt-BR | Loja brasileira | y (implícito) |

**Open questions:** none — todas resolvidas ou registradas acima.

---

## User Stories

### P1: Checkout em uma página — 3 blocos + resumo persistente ⭐ MVP

**User Story**: Como cliente, quero preencher e pagar em uma única tela, vendo o pedido inteiro o
tempo todo, para não passar por um passo que só repete o que eu já digitei.

**Why P1**: É a feature. Elimina o passo Revisão (a etapa de maior vazamento do fluxo atual) e é o
container onde todas as outras histórias se encaixam.

**Acceptance Criteria**:

1. **CHK-01** — WHEN a cliente abre `/checkout` com itens no carrinho THEN o sistema SHALL renderizar
   **uma página** com exatamente três blocos numerados — `1 Contato`, `2 Entrega`, `3 Pagamento` — e o
   passo "Revisão" SHALL não existir em nenhum estado da tela.
2. **CHK-02** — WHEN a cliente não autenticada abre `/checkout` THEN o sistema SHALL abrir o overlay de
   auth com `returnTo='/checkout'` e SHALL não renderizar os blocos até a autenticação concluir.
3. **CHK-03** — WHEN a página avalia o estado dos blocos THEN "completo" SHALL ser definido assim, e
   somente assim:
   - `1 Contato` completo ⟺ `nome` não vazio, `email` com formato válido e `whatsapp` com 10 ou 11
     dígitos. Nome e e-mail vêm pré-preenchidos de `customers`; WhatsApp vem de `customers.phone`
     quando existir.
   - `2 Entrega` completo ⟺ CEP com 8 dígitos resolvido (ou liberado para manual), `rua`, `numero`,
     `bairro`, `cidade`, `estado` não vazios, **e** uma opção de envio selecionada.
   - `3 Pagamento` completo ⟺ método escolhido (`pix` ou `card`) habilitado nas settings **e** CPF
     válido (PGD-02).
4. **CHK-04** — WHEN a página carrega THEN o bloco aberto SHALL ser o **primeiro incompleto** pela
   definição de CHK-03; todo bloco completo SHALL aparecer colapsado exibindo o resumo do seu conteúdo
   e uma ação "Alterar"; o número de blocos abertos simultaneamente SHALL ser no máximo 1; e nenhum
   bloco SHALL conter botão de fundo `nanita-jam` (a única pílula geleia da tela é o CTA).
5. **CHK-05** — WHEN qualquer bloco está em qualquer estado THEN o resumo do pedido SHALL estar visível
   na mesma tela — em viewport ≥ 1024px como coluna fixa à direita, abaixo disso como barra
   colapsável no topo — contendo itens com quantidade, frete selecionado, cupom aplicado, desconto PIX
   quando houver, e o total.
6. **CHK-06** — WHEN os três blocos estão completos THEN o CTA SHALL exibir o valor exato a pagar do
   método escolhido e o método no rótulo (`Pagar R$ 46,55 com PIX` quando PIX está selecionado;
   `Pagar R$ 49,00 no cartão` quando cartão está selecionado — valores necessariamente diferentes
   sempre que `pix_discount_percent > 0`); WHEN qualquer bloco está incompleto THEN o CTA SHALL estar
   desabilitado.
7. **CHK-07** — WHEN a cliente aciona o CTA e não existe pedido em curso THEN o sistema SHALL criar o
   pedido `pending` e guardar o `order_id`; WHEN a cliente aciona o CTA com um pedido em curso e
   **nenhum** bloco foi editado desde a criação THEN o sistema SHALL reutilizar o mesmo `order_id`
   (retentativa, conforme PAY-16), sem criar pedido novo.
8. **CHK-08** — WHEN a cliente edita qualquer campo de qualquer bloco **depois** de o pedido ter sido
   criado THEN o `order_id` em curso SHALL ser descartado e o próximo acionamento do CTA SHALL criar um
   pedido novo — nunca cobrar valores de um pedido cujos dados mudaram.
9. **CHK-09** — WHEN a criação do pedido falha THEN o sistema SHALL exibir erro amigável, SHALL
   preservar o conteúdo dos três blocos e o carrinho, e SHALL permitir acionar o CTA novamente.
10. **CHK-10** — WHEN a tela renderiza em viewport < 1024px THEN o CTA SHALL ficar fixo no rodapé
    exibindo o total, e o header SHALL ser o header próprio de checkout (sem navegação de categorias)
    em todos os viewports.
11. **CHK-11** — WHEN o bloco `1 Contato` é preenchido ou alterado THEN o sistema SHALL chamar
    `setGuestEmail(email, consent)` de `features/abandoned-cart`, preservando a captação de carrinho
    abandonado que hoje só existe no `CustomerStep`; e o consentimento de marketing SHALL continuar
    sendo coletado no bloco Contato.
12. **CHK-12** — WHEN o CTA é renderizado THEN a faixa de confiança SHALL aparecer imediatamente abaixo
    dele e SHALL afirmar apenas políticas que a loja tem: "Mercado Pago", "Embalagem protegida" e
    troca **de produto com defeito em 7 dias** — o texto SHALL bater com `pages/PoliciesPage.tsx`, sem
    prometer devolução por desistência que a política não oferece.

**Independent Test**: Com carrinho de 3 itens, abrir `/checkout` logada e conferir: 3 blocos, nenhum
"Revisão", resumo visível em desktop e mobile, CTA desabilitado até completar, rótulo do CTA com valor
diferente entre PIX e cartão, um único pedido criado ao acionar duas vezes sem editar, e um segundo
pedido criado quando um bloco é editado no meio.

---

### P1: Frete cobrado = frete cotado no Melhor Envio ⭐ MVP

**User Story**: Como cliente, quero ver as transportadoras reais com preço e **data de entrega**, e
pagar exatamente o frete que foi cotado, para não ser surpreendida por um valor inventado.

**Why P1**: Corrige um defeito de cobrança em produção — hoje a loja cota de verdade na página de
produto e cobra valor e prazo fixos no checkout.

**Acceptance Criteria**:

1. **SHP-01** — WHEN a cliente informa um CEP de 8 dígitos no bloco Entrega THEN o sistema SHALL cotar
   via `melhor-envio?action=quote` e SHALL exibir, para cada opção retornada: transportadora
   (`company`), nome do serviço (`name`), preço (`price`) e **data** de entrega.
2. **SHP-02** — WHEN a cotação é montada THEN as dimensões e o peso enviados SHALL vir dos campos reais
   do produto (`weight_kg`, `width_cm`, `height_cm`, `length_cm`), o que exige que os mappers
   `entities/product/api/useProducts.ts` e `useProduct.ts` passem a selecionar esses campos (hoje eles
   são omitidos e `ShippingCalc.tsx:44-47` sempre cai nos fallbacks 11/2/16/0.1); WHEN um campo é nulo
   no produto THEN o fallback SHALL ser aplicado por item e SHALL ser o mesmo já usado no
   `shipping-calc`.
3. **SHP-03** — WHEN o CEP tem menos de 8 dígitos THEN o sistema SHALL não disparar cotação; WHEN o CEP
   não é encontrado no ViaCEP THEN o sistema SHALL liberar os campos de endereço para digitação manual
   e SHALL ainda assim cotar pelo CEP informado.
4. **SHP-04** — WHEN a cliente seleciona uma opção de envio THEN `shipping_cost` do pedido SHALL ser
   igual ao `price` daquela opção, e `apps/store/src/features/checkout/` SHALL não conter nenhum preço
   nem prazo de frete literal (`grep -rnE "18\.90|12\.90|dias úteis" apps/store/src/features/checkout`
   SHALL retornar zero ocorrências).
5. **SHP-05** — WHEN a cotação falha, expira ou retorna lista vazia THEN o sistema SHALL apresentar uma
   única opção "Frete padrão" com `store_settings.shipping.default_shipping_cost`, SHALL exibir aviso
   de que os prazos não puderam ser consultados, e SHALL permitir concluir a compra.
6. **SHP-06** — WHEN `subtotal ≥ store_settings.shipping.free_shipping_threshold` THEN a opção **mais
   barata** retornada SHALL exibir "Grátis" com o preço original riscado e SHALL cobrar `0`; as demais
   opções SHALL manter o preço cotado.
7. **SHP-07** — WHEN o pedido é criado THEN o sistema SHALL gravar o snapshot do envio escolhido:
   `shipping_method` (nome do serviço), `shipping_carrier` (transportadora), `shipping_cost`, **o `id`
   do serviço no Melhor Envio** e a janela de entrega estimada; e uma recotação posterior (inclusive a
   do backoffice) SHALL não alterar esses valores no pedido já criado.
8. **SHP-08** — WHEN a migration roda THEN `orders` SHALL passar a ter as colunas que armazenam a janela
   de entrega estimada (`delivery_estimate_min`, `delivery_estimate_max` como `date`) e o serviço
   escolhido (`shipping_service_id`), pois nenhuma coluna atual guarda prazo
   (`grep -rn "delivery" supabase/migrations/*.sql` retorna zero).
9. **SHP-09** — WHEN a data de entrega é exibida THEN ela SHALL ser
   `hoje + store_settings.shipping.handling_days + delivery_range` contados em **dias úteis (seg–sex)**,
   com `handling_days` default `2`; WHEN `delivery_range.min ≠ delivery_range.max` THEN a UI SHALL
   exibir a faixa (`Chega entre 4 e 6 de agosto`), caso contrário a data única; WHEN `delivery_range`
   vem ausente na resposta THEN `delivery_time` SHALL ser usado como min e max.
10. **SHP-10** — WHEN a cliente altera o CEP antes de uma cotação anterior responder THEN o sistema
    SHALL descartar a resposta obsoleta e exibir apenas o resultado do CEP mais recente.

**Independent Test**: Cotar um CEP válido com payload real do ME mockado e conferir opções, preços e
datas; criar o pedido e verificar `shipping_cost` = `price` da opção marcada e as colunas de estimativa
gravadas; forçar erro na function e ver o fallback "Frete padrão".

---

### P1: PIX com pagador identificado (CPF) ⭐ MVP

**User Story**: Como cliente, quero informar meu CPF uma única vez e ter o PIX emitido sem erro, para
não ter o pagamento recusado pelo banco.

**Why P1**: A API do Mercado Pago exige `payer.identification` (CPF) para PIX no Brasil; hoje a edge
function envia só `email` e `first_name`. É um bloqueio real de pagamento, não uma melhoria.

**Acceptance Criteria**:

1. **PGD-01** — WHEN o bloco Pagamento está aberto THEN o sistema SHALL exibir um campo "CPF do
   pagador" obrigatório, com máscara `000.000.000-00`, acompanhado da justificativa de por que é
   pedido.
2. **PGD-02** — WHEN o CPF informado não tem 11 dígitos ou falha na verificação do dígito verificador
   THEN o sistema SHALL exibir mensagem de erro no campo e SHALL manter o CTA desabilitado.
3. **PGD-03** — WHEN o pedido é criado (antes, portanto, de qualquer chamada a `create-payment`) THEN o
   CPF SHALL ser persistido em `customers.cpf` para o `customer_id` do pedido, de modo que o servidor
   tenha o CPF disponível no momento de montar o pagamento.
4. **PGD-04** — WHEN o `create-payment` monta o payload THEN ele SHALL incluir
   `payer.identification = { type: 'CPF', number: <11 dígitos> }` lido do servidor,
   `payer.first_name` e `payer.last_name` derivados de `customers.name`, para **PIX e cartão**; e WHEN
   o payload do CardPayment Brick já traz um `payer.identification` THEN o valor do servidor SHALL
   sobrescrevê-lo (um único CPF canônico por pedido).
5. **PGD-05** — WHEN a migration roda THEN `customers` SHALL passar a ter policy de UPDATE para
   `authenticated` escopada a `user_id = auth.uid()`, pois hoje existem apenas SELECT e INSERT
   (`20260414121021_*.sql:202-203`) e por isso `packages/auth/src/AuthContext.tsx:160-164` já tenta
   atualizar `customers.name` e falha **silenciosamente** (RLS nega retornando 0 linhas, sem erro).
6. **PGD-06** — WHEN a cliente inicia um checkout seguinte THEN o campo CPF SHALL vir pré-preenchido de
   `customers.cpf`; WHEN ela digita um CPF diferente THEN o pagamento SHALL usar o CPF digitado e
   `customers.cpf` SHALL ser atualizado.

**Independent Test**: CPF inválido → CTA desabilitado + mensagem. CPF válido → asserção de que o corpo
enviado ao MP contém `payer.identification.type = 'CPF'` para PIX e para cartão (mesmo quando o Brick
manda outro), `customers.cpf` gravado, e pré-preenchido no segundo checkout.

---

### P1: Telas de PIX e de pedido confirmado ⭐ MVP

**User Story**: Como cliente, quero ver quanto vou pagar, quanto tempo tenho e a confirmação
acontecendo sozinha, para não ficar em dúvida se a compra deu certo.

**Why P1**: São as duas telas finais do fluxo; se falham, a compra falha depois de já ter sido paga.

> **Nota de escopo.** Contador `mm:ss`, QR do `qr_code`, botão copiar, regenerar código no mesmo
> pedido e a ausência de botão "já paguei" **já existem e foram verificados** na `02`
> (`features/checkout/ui/PixPayment.tsx:122-171`; `02/validation.md`). Os ACs abaixo cobrem só o que é
> novo ou muda de superfície.

**Acceptance Criteria**:

1. **CNF-01** — WHEN o PIX é gerado THEN a tela SHALL exibir **o valor exato a pagar** em destaque
   (hoje ausente em `PixPayment.tsx`), com a indicação de que já inclui o desconto PIX quando
   `pix_discount_percent > 0`.
2. **CNF-02** — WHEN o código expira sem pagamento THEN a tela SHALL, além de oferecer novo código para
   o mesmo pedido (já existente), informar que o pedido segue guardado em "Minha conta → Pedidos" com
   link para `/conta`.
3. **CNF-03** — WHEN o pagamento é aprovado THEN o sistema SHALL navegar para `/pedido/:id`
   (`OrderConfirmationPage`), e não renderizar a confirmação como estado interno do `CheckoutPage`,
   de modo que recarregar a página após a aprovação continue mostrando a confirmação.
4. **CNF-04** — WHEN `/pedido/:id` renderiza um pedido aprovado THEN SHALL exibir: a mascote Nana com
   `expression="wink"`, o número do pedido, o valor pago, o e-mail da cliente, e a timeline de 4
   estágios (`Pago · Em preparo · Postado · Entregue`) com o estágio atual destacado e a janela de
   entrega lida das colunas de estimativa do pedido (SHP-08).
5. **CNF-05** — WHEN a tela de confirmação renderiza THEN SHALL oferecer **"Acompanhar pedido"** como
   única ação primária (pílula `nanita-jam`, destino `/conta`) e **"Ver mais pins"** como secundária
   (contorno `nanita-ink`, destino `/`); e o carrinho e o cupom SHALL ser limpos **somente** no momento
   da aprovação — nunca antes.
6. **CNF-06** — WHEN qualquer tela desta feature renderiza THEN os estados SHALL ser distinguidos por
   forma e pelos tokens `nanita-*` (timeline: preenchido = concluído, anel = atual, contorno = futuro),
   e
   `grep -rnE "bg-(yellow|blue|purple|green|red)-|text-(green|red|yellow|blue|purple)-[0-9]" apps/store/src/features/checkout apps/store/src/pages/CheckoutPage.tsx apps/store/src/pages/OrderConfirmationPage.tsx`
   SHALL retornar zero — o que exige limpar as ocorrências atuais em `PixPayment.tsx:99,141,164` e
   `ShippingStep.tsx:51,60`.

**Independent Test**: Gerar PIX em sandbox e conferir o valor na tela; simular aprovação, conferir a
navegação para `/pedido/:id`, recarregar e ver a confirmação intacta, com `clearCart` chamado
exatamente uma vez.

---

### P2: Endereço salvo, reaproveitado e gravado no pedido

**User Story**: Como cliente recorrente, quero que meu endereço já venha preenchido, para não
redigitar tudo a cada compra.

**Why P2**: A compra funciona sem o reaproveitamento — mas ADR-05 é correção de defeito e sobe junto.

**Acceptance Criteria**:

1. **ADR-01** — WHEN o CEP é resolvido pelo ViaCEP THEN rua, bairro, cidade e UF SHALL ser preenchidos
   e exibidos em campos travados (não editáveis), e número e complemento SHALL permanecer editáveis.
2. **ADR-02** — WHEN a cliente tem endereço `is_default = true` em `addresses` THEN o bloco Entrega
   SHALL abrir já preenchido e colapsado, exibindo o endereço e a ação "Editar".
3. **ADR-03** — WHEN o pedido é criado THEN o endereço utilizado SHALL ser gravado ou atualizado em
   `addresses` para aquele `customer_id`, marcado `is_default = true`; e a migration SHALL adicionar a
   policy de UPDATE em `addresses` escopada a
   `customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())`, pois hoje existem apenas
   SELECT e INSERT.
4. **ADR-04** — WHEN a cliente edita o endereço THEN o registro em `addresses` SHALL refletir a edição
   sem criar um segundo endereço `is_default` para o mesmo cliente.
5. **ADR-05** — WHEN o pedido é criado THEN `orders.address_zip` e `orders.address_complement` SHALL ser
   gravados (hoje ficam nulos porque `AddressStep.tsx:42` não devolve o CEP e `useOrders.ts` não tem os
   campos), de modo que `MelhorEnvioTab.tsx:71` (`order.address_zip.replace(...)`) deixe de estourar
   TypeError para pedidos criados pela loja.

**Independent Test**: Concluir uma compra e conferir: linha em `addresses` com `is_default`,
`orders.address_zip` preenchido, e a aba Melhor Envio do backoffice cotando sem erro. Reabrir o
checkout e ver o bloco Entrega colapsado; editar e conferir um único default.

---

### P2: Order bump configurável, com preço calculado no servidor

**User Story**: Como lojista, quero oferecer um produto complementar com desconto imediatamente antes
do botão de pagar, para subir o ticket sem criar mais um passo no checkout.

**Why P2**: É otimização de receita — o checkout converte sem ela. Mas é o item de maior retorno por
esforço do discovery (~+14% de ticket no padrão de referência).

**Acceptance Criteria**:

1. **BMP-01** — WHEN a migration roda THEN `store_settings` SHALL ter a chave `checkout` com
   `order_bump_enabled` (bool, default `false`), `order_bump_product_id` (uuid nullable, default
   `null`) e `order_bump_discount_percent` (int, default `50`); e o tipo `SettingsKey`/`SettingsMap` em
   `packages/supabase/src/types/settings.ts` mais o `DEFAULTS` de
   `packages/core/src/hooks/useStoreSettings.ts` SHALL incluir a chave — sem isso `fetchAllSettings`
   descarta a linha (`useStoreSettings.ts:36-41`). O mesmo vale para `handling_days` em
   `ShippingSettings` (SHP-09).
2. **BMP-02** — WHEN `order_bump_enabled = true` AND o produto referenciado existe AND tem
   `stock_total > 0` (coluna renomeada de `stock` em `20260726000000_products_extended_fields.sql`) AND
   não está no carrinho THEN o bump SHALL ser exibido entre o bloco Pagamento e o CTA; WHEN qualquer
   uma dessas condições falha THEN o bump SHALL não ser renderizado.
3. **BMP-03** — WHEN a cliente marca o bump THEN o item SHALL entrar no pedido com `quantity = 1` e
   `unit_price = round(base_price × (1 − order_bump_discount_percent / 100), 2)`, e o total do resumo e
   o valor no rótulo do CTA SHALL ser atualizados na mesma interação.
4. **BMP-04** — WHEN o `create-payment` recalcula o valor cobrado THEN ele SHALL aplicar o mesmo
   desconto **no servidor** ao item cujo `product_id` é igual a
   `store_settings.checkout.order_bump_product_id` (quando `order_bump_enabled = true`, limitado a
   `quantity = 1`), de forma que o valor cobrado seja **idêntico** ao exibido em BMP-03. Sem isso o
   recálculo de `mercado-pago/index.ts:110-125` (`priceById.get(...) ?? unit_price`) sobrescreveria o
   preço com `products.base_price` e cobraria o valor cheio.
5. **BMP-05** — WHEN a cliente marca e desmarca o bump repetidamente THEN o pedido SHALL conter no
   máximo um item do produto do bump e o desconto SHALL não acumular (o `unit_price` final é idêntico
   ao de uma única marcação).
6. **BMP-06** — WHEN o admin abre Configurações no backoffice THEN SHALL poder ativar/desativar o bump,
   escolher o produto e definir o percentual de desconto.

**Independent Test**: Ativar o bump, marcar no checkout, e comparar por asserção o total exibido com o
`total` que a edge function persiste em `orders` — SHALL ser igual. Marcar/desmarcar 3× e conferir um
único item com desconto aplicado uma vez. Zerar `stock_total` e conferir que o bump desaparece.

---

## Edge Cases

- WHEN o carrinho está vazio THEN `/checkout` SHALL redirecionar para o carrinho com aviso, em vez de
  renderizar blocos sobre um pedido inexistente.
- WHEN o cupom aplicado tem `freeShipping = true` AND a cotação real retorna opções THEN todas as
  opções SHALL exibir "Grátis" e cobrar `0`, e o desconto PIX SHALL continuar incidindo sobre
  `(subtotal − desconto de cupom)` (`packages/core/src/payment/pricing.ts:35-40`) — as duas regras
  compõem sem se anular.
- WHEN o produto do order bump já está no carrinho THEN o bump SHALL não ser exibido; e como BMP-04
  aplica o desconto por `product_id`, esse item SHALL ser cobrado com o desconto configurado —
  comportamento deliberado e documentado nas Assumptions.
- WHEN o `stock_total` do produto do bump zera entre a marcação e o acionamento do CTA THEN a criação
  do pedido SHALL prosseguir sem o item do bump e SHALL informar a remoção.
- WHEN a cliente muda o CEP **depois** de já ter selecionado uma opção de envio THEN a seleção SHALL
  ser descartada, `shipping_cost` SHALL voltar a zero, o pedido em curso SHALL ser invalidado (CHK-08)
  e o CTA SHALL ficar desabilitado até nova seleção.
- WHEN a cliente recarrega a página no meio do checkout THEN o carrinho e o cupom SHALL persistir
  (Zustand persist já existente), os blocos SHALL recompor de `customers` + `addresses`, e o
  `order_id` em curso SHALL ser recuperado de `sessionStorage` — sem isso o reload criaria um segundo
  pedido `pending` (CHK-07).
- WHEN `handling_days = 0` THEN a data exibida SHALL ser `hoje + delivery_range` em dias úteis, sem
  quebrar o cálculo.
- WHEN a cotação retorna uma única opção THEN ela SHALL vir pré-selecionada (não exigir clique para
  habilitar o CTA).
- WHEN o total com desconto PIX resulta em valor abaixo de R$ 0,01 THEN a criação do pagamento SHALL
  ser bloqueada com erro claro (herdado da `02`).
- WHEN `customers.cpf` está preenchido mas a cliente digita outro CPF THEN o pagamento SHALL usar o
  digitado e `customers.cpf` SHALL ser atualizado (PGD-06).

---

## Implicit-Requirement Dimensions Sweep (Large)

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | SHP-03 (CEP < 8 dígitos não cota), PGD-02 (CPF com DV), CHK-03 (definição de "completo" por bloco), CHK-06 (CTA desabilitado), edge case de `handling_days = 0` |
| Failure / partial-failure states | SHP-05 (cotação falha → fallback flat, compra segue), CHK-09 (falha ao criar pedido preserva blocos e carrinho), PGD-05 (RLS que hoje falha em silêncio passa a ter policy), edge case de estoque do bump zerando na janela |
| Idempotency / retry / duplicate handling | CHK-07 (retentativa reusa o `order_id`), CHK-08 (edição invalida o pedido em vez de cobrar dado velho), BMP-05 (marcar/desmarcar não duplica nem acumula), ADR-04 (um único default) |
| Auth boundaries & rate limits | CHK-02 (login obrigatório), PGD-05 (`customers` UPDATE escopado a `user_id = auth.uid()`), ADR-03 (`addresses` UPDATE escopado ao próprio `customer_id`), BMP-04 (preço do bump decidido no servidor, não aceito do cliente). **Rate limit: N/A because** a cotação dispara por CEP completo (não por tecla) e o abuso é governado pelo Melhor Envio e pelo antifraude do MP; volume da loja é baixo |
| Concurrency / ordering | SHP-10 (resposta de CEP obsoleto descartada), edge case de troca de CEP após selecionar frete, CHK-08 (ordenação entre editar e cobrar). **Transições de pagamento: N/A because** o mapa de transições e a idempotência de webhook são entregues pela `02` e não mudam aqui |
| Data lifecycle / expiry | SHP-07/SHP-08 (snapshot do frete e da janela de entrega persistidos; recotação não altera pedido criado), CNF-02 (expiração → novo código, herdada da `02`) |
| Observability | SHP-05 (falha de terceiro visível em vez de silenciosa), PGD-05 (elimina uma escrita que hoje falha calada). **Telemetria: N/A because** não há infra de telemetria no front do projeto; `payer.identification` entra nos logs estruturados que a `02` já emite (PAY-12) |
| External-dependency failure | SHP-05 (Melhor Envio indisponível), SHP-03 (ViaCEP não resolve → digitação manual), herdado PAY-09 (MP indisponível → pedido segue `pending`) |
| State-transition integrity | CHK-03/CHK-04 (definição de completo + no máximo um bloco aberto), CHK-08 (pedido criado × dado editado), CNF-05 (carrinho limpo só na aprovação), BMP-02 (condições de exibição do bump) |

---

## Requirement Traceability

| Requirement ID | Story | O quê | Task(s) | Status |
| -------------- | ----- | ----- | ------- | ------ |
| CHK-01 | P1 One-page | Uma página, 3 blocos numerados, passo "Revisão" inexistente | T23, T24 | Implementing |
| CHK-02 | P1 One-page | Login obrigatório: overlay com `returnTo=/checkout` antes dos blocos | T23 | Implementing |
| CHK-03 | P1 One-page | Campos por bloco + definição exata de "completo" | T5, T18, T19, T20 | Implementing |
| CHK-04 | P1 One-page | Abre o 1º incompleto, completo colapsa, máx. 1 aberto, zero geleia nos blocos | T5, T18, T19, T20, T23 | Implementing |
| CHK-05 | P1 One-page | Resumo persistente (coluna fixa ≥1024px / barra colapsável abaixo) | T22 | Implementing |
| CHK-06 | P1 One-page | CTA com valor do método + método no rótulo; desabilitado se incompleto | T23 | Implementing |
| CHK-07 | P1 One-page | Pedido criado 1×; retentativa sem edição reusa o `order_id` | T11, T23 | Implementing |
| CHK-08 | P1 One-page | Edição após criação invalida o pedido (próximo CTA cria outro) | T5, T11, T23 | Implementing |
| CHK-09 | P1 One-page | Falha ao criar pedido preserva blocos e carrinho | T23 | Implementing |
| CHK-10 | P1 One-page | Mobile: CTA fixo no rodapé; header próprio de checkout | T23 | Implementing |
| CHK-11 | P1 One-page | `setGuestEmail` preservado (abandoned-cart) + consentimento no Contato | T18 | Implementing |
| CHK-12 | P1 One-page | Faixa de confiança abaixo do CTA, coerente com `PoliciesPage` | T23 | Implementing |
| SHP-01 | P1 Frete | Cotação real do ME: transportadora, serviço, preço, data | T13, T19 | Implementing |
| SHP-02 | P1 Frete | Dimensões/peso reais do produto (mappers passam a selecionar os campos) | T12 | Implementing |
| SHP-03 | P1 Frete | CEP < 8 dígitos não cota; ViaCEP falha → manual, cotação segue | T13, T14, T19 | Implementing |
| SHP-04 | P1 Frete | `shipping_cost` = `price` do serviço; zero preço/prazo literal no checkout | T19, T24 | Implementing |
| SHP-05 | P1 Frete | Cotação indisponível → "Frete padrão" + aviso; compra prossegue | T19 | Implementing |
| SHP-06 | P1 Frete | Threshold zera a opção mais barata (preço riscado); demais mantêm preço | T2, T19 | Implementing — fronteira (`subtotal === threshold`) com sensor a partir da Fix iteration 1 |
| SHP-07 | P1 Frete | Snapshot: serviço, transportadora, custo, `service_id`, janela de entrega | T15, T23 | Implementing |
| SHP-08 | P1 Frete | Migration: `delivery_estimate_min/max`, `shipping_service_id` em `orders` | T7 | Implementing |
| SHP-09 | P1 Frete | Data = hoje + `handling_days` + range em dias úteis; fallback de `delivery_time` | T2, T6, T9, T19 | Implementing |
| SHP-10 | P1 Frete | Resposta de cotação obsoleta descartada (última requisição ganha) | T13 | Implementing |
| PGD-01 | P1 Pagador | Campo CPF obrigatório no bloco Pagamento, com justificativa | T20 | Implementing |
| PGD-02 | P1 Pagador | Validação de 11 dígitos + DV; inválido mantém CTA desabilitado | T1, T5, T20 | Implementing |
| PGD-03 | P1 Pagador | CPF persistido **antes** do `create-payment` | T16, T23 | Implementing |
| PGD-04 | P1 Pagador | `payer.identification` + `first_name`/`last_name` do servidor; vence o Brick | T4, T10 | Implementing |
| PGD-05 | P1 Pagador | Migration: policy de UPDATE em `customers` escopada a `user_id` | T8 | Implementing |
| PGD-06 | P1 Pagador | CPF pré-preenchido; CPF novo atualiza `customers.cpf` | T16, T20 | Implementing |
| CNF-01 | P1 Telas finais | Valor a pagar em destaque na tela do PIX (hoje ausente) | T25 | Implementing |
| CNF-02 | P1 Telas finais | Expirado → ponteiro para "Minha conta → Pedidos" com link | T25 | Implementing |
| CNF-03 | P1 Telas finais | Aprovação navega para `/pedido/:id`; confirmação sobrevive ao reload | T27, T28 | Implementing |
| CNF-04 | P1 Telas finais | Mascote `wink`, nº, valor, e-mail, timeline de 4 estágios, janela de entrega | T26, T27 | Implementing |
| CNF-05 | P1 Telas finais | Uma primária ("Acompanhar pedido") + uma secundária; carrinho limpo só aqui | T27, T28 | Implementing |
| CNF-06 | P1 Telas finais | Timeline por forma; zero cor fora da paleta (limpa as ocorrências atuais) | T24, T26 | Implementing |
| ADR-01 | P2 Endereço | CEP resolvido preenche campos travados; número/complemento editáveis | T14, T19 | Implementing |
| ADR-02 | P2 Endereço | Endereço `is_default` abre o bloco preenchido e colapsado | T19 | Implementing — colapso no caso geral (2+ opções) só a partir da Fix iteration 1: o endereço salvo pré-seleciona a opção mais barata |
| ADR-03 | P2 Endereço | Grava/atualiza `addresses`; migration da policy de UPDATE | T8, T17, T23 | Implementing |
| ADR-04 | P2 Endereço | Edição não cria segundo default para o mesmo cliente | T17 | Implementing |
| ADR-05 | P2 Endereço | `orders.address_zip` + `address_complement` gravados (destrava o backoffice) | T15, T23 | Implementing |
| BMP-01 | P2 Order bump | `store_settings.checkout` + tipos e `DEFAULTS` do front atualizados | T6, T9 | Implementing |
| BMP-02 | P2 Order bump | Condições de exibição (enabled, existe, `stock_total > 0`, fora do carrinho) | T21 | Implementing |
| BMP-03 | P2 Order bump | Item com `unit_price` descontado; total e CTA atualizam na interação | T3, T21, T22, T23 | Implementing |
| BMP-04 | P2 Order bump | **Desconto aplicado no servidor** — exibido == cobrado | T3, T10 | Implementing — igualdade quebrava por 1 centavo com cupom `percent`; corrigida na Fix iteration 1 (`resolveCouponDiscount` como dono único da regra) e asseverada por valor |
| BMP-05 | P2 Order bump | Marcar/desmarcar não duplica item nem acumula desconto | T3, T21 | Implementing |
| BMP-06 | P2 Order bump | Configuração do bump na tela de Configurações do backoffice | T29 | Implementing |

**Coverage:** 44 total (12 CHK + 10 SHP + 6 PGD + 6 CNF + 5 ADR + 6 BMP -- todos citados nas stories),
**44 mapped to tasks, 0 unmapped** ✅ (T1–T29 executados nos batches 1–5; T30 é o fecho de docs).

> **`Status: Implementing`, não `Verified`.** Cada task passou pelo seu gate de teste e pela revisão
> de adequação do autor. A verificação independente (Verifier, autor ≠ verificador) roda depois do
> fecho e é o que move estes 44 para `Verified` — com a ressalva honesta de que as camadas
> classificadas como **manual** na Test Coverage Matrix (runtime da edge function, sandbox MP, RLS em
> banco vivo) não têm prova automatizada e continuam pendentes: PGD-04 depende de exercitar o
> Mercado Pago; PGD-05 e ADR-03 dependem de testar a RLS autenticada em banco vivo.

> **Verifier rodou e reprovou (`validation.md`, 2026-07-28), com 3 gaps: BMP-04, SHP-06 e ADR-02.**
> A **Fix iteration 1** fechou os três e o gate voltou verde (674 testes: 240 core + 372 store + 62
> backoffice; `pnpm build` exit 0). Os 44 seguem em `Implementing` até o re-dispatch do Verifier.
> Lição registrada nos carry-forwards #39–#41 de `tasks.md`: a parte **aritmética** de BMP-04
> ("exibido == cobrado") nunca foi camada manual — é uma propriedade entre duas funções puras, e
> classificá-la como "runtime do MP" foi o que deixou a divergência de 1 centavo passar pelo gate.

---

## Success Criteria

- [ ] Uma compra completa (carrinho → PIX aprovado em sandbox) sem nenhuma tela de "Revisão", em
      desktop e em mobile, terminando em `/pedido/:id` que sobrevive a um reload.
- [ ] `grep -rnE "18\.90|12\.90|dias úteis" apps/store/src/features/checkout` retorna zero, e o
      `shipping_cost` do pedido bate com o `price` retornado pelo `melhor-envio?action=quote`.
- [x] **Exibido == cobrado com o bump marcado:** o total no rótulo do CTA é igual ao `total` que a edge
      function persiste em `orders` (asserção direta, não inspeção visual).
      → `packages/core/src/payment/__tests__/displayedEqualsCharged.test.ts`: monta os dois caminhos de
      cálculo (loja e edge function, cada um com o arredondamento de base que ele de fato usa) e
      compara os totais **por valor**, com e sem bump, `percent`/`fixed`/`free_shipping`, PIX e cartão.
- [ ] Corpo enviado ao MP contém `payer.identification.type = 'CPF'` para PIX **e** para cartão,
      inclusive quando o Brick manda um CPF diferente.
- [ ] `customers.cpf` gravado após a compra e pré-preenchido na compra seguinte (prova de que a policy
      de UPDATE de PGD-05 existe).
- [ ] `orders.address_zip` preenchido, e a aba Melhor Envio do backoffice cota um pedido criado pela
      loja sem estourar TypeError.
- [x] Segunda compra da mesma cliente: bloco Entrega abre colapsado e preenchido, sem redigitar CEP.
      → `apps/store/src/pages/__tests__/CheckoutPage.test.tsx` → *"endereço salvo colapsa a Entrega
      (ADR-02)"*: com 2 opções cotadas, o bloco nasce colapsado, a mais barata vem pré-selecionada e o
      acordeão avança para Pagamento. (A compra ponta a ponta em sandbox segue manual.)
- [ ] Melhor Envio derrubado (function forçada a erro): a compra é concluída com "Frete padrão" e a
      cliente vê o aviso.
- [ ] `grep -rnE "bg-(yellow|blue|purple|green|red)-|text-(green|red|yellow|blue|purple)-[0-9]" apps/store/src/features/checkout apps/store/src/pages/CheckoutPage.tsx apps/store/src/pages/OrderConfirmationPage.tsx`
      retorna zero (checklist do `DESIGN.md` §8).
- [ ] `pnpm test` verde e `pnpm build` sem erro novo nos dois apps.
