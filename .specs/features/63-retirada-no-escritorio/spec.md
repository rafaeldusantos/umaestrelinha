# 63 — Retirada no escritório

## Problem Statement

A loja só oferece envio pelos Correios (PAC e SEDEX, `142c17f`). Cliente de Porto Alegre e do resto do
Rio Grande do Sul paga frete para receber uma peça que poderia buscar no escritório da Uma Estrelinha
— e a loja antiga (Nuvemshop) oferecia essa retirada sem custo. A opção precisa voltar, restrita ao RS,
na calculadora da página do produto e no checkout, e o pós-compra (painel, e-mails, conta da cliente)
precisa parar de tratar um pedido de retirada como se ele fosse ser postado.

## Goals

- [ ] Cliente com CEP do RS vê "Retirar em" com o endereço do escritório, sem custo, na página do produto e no checkout, e consegue fechar o pedido com ela.
- [ ] Cliente fora do RS nunca vê a opção, e o servidor recusa um pedido de retirada forjado para CEP de fora.
- [ ] Nenhum pedido de retirada gera etiqueta do Melhor Envio, aviso de postagem ou pendência de "enviado sem rastreio".

## Out of Scope

| Feature | Reason |
| --- | --- |
| Horários de atendimento ("Segunda a sexta, 10h–18h") | Decisão do usuário (2026-10-11): não exibir |
| Aviso de e-mail novo "Pedido pronto para retirada" | Decisão do usuário: ajustar o existente, sem evento novo (evitaria migration no `check` de eventos) |
| Dispensar o endereço da cliente quando ela escolhe retirada | Decisão do usuário: endereço completo continua obrigatório |
| Mais de um ponto de retirada, ou ponto diferente do endereço do Material | Um escritório só; o endereço é o do cartão Material |
| Validar/recalcular no servidor o preço do PAC/SEDEX | Dívida pré-existente (o servidor confia em `shipping_cost`); esta feature só fecha o caso da retirada |
| Reescrever a cópia de `order_delivered` ("Sua joia chegou") para retirada | O evento nasce desligado (`email(false, …)`) e a frase é aceitável; fica registrado |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Como saber se o CEP é do RS | Faixa `90000-000`…`99999-999` (primeiro dígito `9`), síncrona | Faixa oficial dos Correios para o RS; funciona na página do produto sem consulta externa e é a mesma regra no servidor | n (técnica) |
| Prazo exibido na retirada | "Pronta para retirada a partir de {data}", com `handling_days` dias úteis a partir de hoje | Usuário vetou horários; a imagem mostra uma janela, e `handling_days` já é o prazo de preparo da loja — nenhuma configuração nova | n |
| Preço exibido | Texto "Grátis", custo `0` | Sem custo por definição; mesma palavra que o checkout já usa para frete zerado | n |
| Como o estado aparece na linha de endereço | Como está cadastrado no Material (`Porto Alegre/RS`) | A imagem escreve "Rio Grande do Sul" por extenso; uma tabela de UFs só para isso é escopo novo | n |
| Retirada exige endereço do Material preenchido | Só aparece se `material.street`, `neighborhood` e `city` estiverem preenchidos | `DEFAULT_MATERIAL` é vazio de propósito; mostrar "Escritório - , , " seria pior que não mostrar | n |
| Interruptor | `shipping.pickup_enabled`, nasce **ligado** | Decisão do usuário | y |
| Fluxo de status do pedido de retirada | `separating → delivered` (pula `shipped`); `delivered` aparece como "Retirado" | Não há postagem nem rastreio; passar por `shipped` geraria pendência "enviado sem rastreio" | n |
| Identidade do pedido de retirada | `orders.shipping_service_id = 'retirada'` (coluna `text` já existente) | Sem migration de coluna; o id do Melhor Envio é numérico, então não colide | n (técnica) |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Ver a retirada no cálculo de frete do produto ⭐ MVP

**User Story**: Como cliente do RS, quero ver na página do produto que posso buscar a peça no escritório sem pagar frete.

**Acceptance Criteria**:

1. **RET-01** WHEN a cliente calcula o frete com um CEP de `90000-000` a `99999-999`, a retirada está ligada e o endereço do Material está preenchido THEN a calculadora SHALL mostrar, abaixo das opções dos Correios, um grupo "Retirar em" com uma linha `Escritório - Uma Estrelinha - {rua}, {bairro}, {cidade}/{UF}`, o texto `Pronta para retirada a partir de {data}` e o preço `Grátis`.
2. **RET-02** WHEN o CEP está fora da faixa do RS THEN a calculadora SHALL NOT mostrar o grupo "Retirar em".
3. **RET-03** A linha de endereço SHALL NOT conter `material.number` nem `material.complement`.
4. **RET-04** WHEN a cotação dos Correios falha ou volta vazia para um CEP do RS THEN a calculadora SHALL mostrar a retirada mesmo assim, junto da mensagem de falha dos Correios.
5. **RET-05** WHEN a retirada está desligada no painel OU o endereço do Material não tem rua, bairro e cidade THEN nenhuma superfície SHALL mostrar a retirada.

### P1: Escolher a retirada no checkout ⭐ MVP

**User Story**: Como cliente do RS, quero escolher retirar no escritório no checkout e pagar só os produtos.

**Acceptance Criteria**:

6. **RET-06** WHEN o CEP do bloco Entrega é do RS (com as condições de RET-05) THEN o checkout SHALL mostrar dois grupos: "Envio a domicílio" (PAC/SEDEX, ou o "Frete padrão" do SHP-05) e "Retirar em" (a linha de RET-01), e a retirada SHALL ser selecionável como qualquer outra opção.
7. **RET-07** WHEN a cliente escolhe a retirada THEN o frete do resumo SHALL ser `0` e o pedido SHALL ser gravado com `shipping_service_id = 'retirada'`, `shipping_method = 'Retirada no escritório'`, `shipping_cost = 0` e sem `delivery_estimate_*` de transportadora.
8. **RET-08** A retirada SHALL NOT ser pré-selecionada automaticamente e SHALL NOT entrar no cálculo de "opção mais barata": o frete grátis por valor (`freeShippingState`) continua zerando o PAC/SEDEX mais barato, como hoje.
9. **RET-09** WHEN a cliente escolhe a retirada THEN o endereço completo dela SHALL continuar obrigatório para concluir o bloco Entrega (regra atual de `blocks.ts`, sem mudança).
10. **RET-10** WHEN o CEP muda para fora do RS com a retirada escolhida THEN a escolha SHALL ser desfeita (comportamento atual de troca de CEP) e a retirada SHALL sumir.
11. **RET-11** WHEN o resumo do bloco Entrega está recolhido com a retirada escolhida THEN ele SHALL mostrar "Retirada no escritório" e o endereço de RET-01, e não o prazo de transportadora.

### P1: O servidor não aceita retirada forjada ⭐ MVP

12. **RET-12** WHEN a function `checkout` recebe `shipping_service_id = 'retirada'` com `address_zip` fora da faixa do RS, OU com `shipping_cost ≠ 0`, OU com a retirada desligada / sem endereço do Material em `store_settings` THEN ela SHALL recusar com 422 `pickup_unavailable` e SHALL NOT gravar pedido.
13. **RET-13** A regra "CEP é do RS" e "a retirada está disponível" SHALL ter um único dono em `@estrelinha/core/shipping`, chamado pela loja e pela function (alcançável pelo Deno, `.ts` explícito).

### P2: Pós-compra trata a retirada como retirada

14. **RET-14** WHEN um pedido de retirada é aberto no painel THEN o cartão Entrega SHALL mostrar "Retirada no escritório", e o bloco do Melhor Envio SHALL NOT oferecer cotação nem criação de etiqueta (mostra que o pedido é de retirada).
15. **RET-15** WHEN a action `create` do `melhor-envio` recebe um pedido de retirada THEN ela SHALL recusar sem chamar a API do Melhor Envio.
16. **RET-16** WHEN um pedido de retirada está em `separating` THEN o próximo passo do painel SHALL ser `delivered`, com rótulo de "retirado", e não `shipped`.
17. **RET-17** O evento `order_shipped` SHALL ter pré-condição recusando pedido de retirada (`pickup_order`), mesmo com status `shipped`.
18. **RET-18** WHEN um e-mail de pedido de retirada é montado THEN o bloco "Entrega" SHALL ser substituído por "Retirada" com o endereço de RET-01 (sem número e complemento).
19. **RET-19** WHEN a cliente vê o pedido de retirada (confirmação, `/pedido/:id`, `/conta`) THEN a entrega SHALL aparecer como "Retirada no escritório" com o endereço de RET-01, e a jornada SHALL omitir a etapa "A caminho" e chamar a última de "Retirado no escritório".

### P2: Ligar e desligar no painel

20. **RET-20** A seção Frete e Material SHALL ter um interruptor "Retirada no escritório" (`shipping.pickup_enabled`), que nasce ligado por migration aditiva e idempotente (`value || … WHERE NOT value ? 'pickup_enabled'`), com o default do TypeScript igual ao da migration.
21. **RET-21** WHEN o interruptor está ligado e o endereço do Material está incompleto THEN o painel SHALL avisar que a retirada não aparece na loja até o endereço ser preenchido.

---

## Edge Cases

- WHEN o CEP tem menos de 8 dígitos THEN nenhuma superfície mostra a retirada.
- WHEN o pedido de retirada é retomado da `sessionStorage` (`estrelinha-checkout`) e a retirada foi desligada nesse meio-tempo THEN a opção some, a escolha é desfeita e o servidor recusa se a cliente insistir (RET-12).
- WHEN um cupom de frete grátis está aplicado THEN a retirada continua `Grátis` (nada muda) e o PAC/SEDEX ficam grátis como hoje.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| RET-01..05 | P1: Produto | Design | Pending |
| RET-06..11 | P1: Checkout | Design | Pending |
| RET-12..13 | P1: Servidor | Design | Pending |
| RET-14..19 | P2: Pós-compra | Design | Pending |
| RET-20..21 | P2: Painel | Design | Pending |

**Coverage:** 21 total, 0 mapped to tasks.

---

## Success Criteria

- [ ] Em 390×844, com CEP `91240-010`, a retirada aparece na página do produto e no checkout, e um pedido fecha com frete R$ 0,00.
- [ ] Com CEP `01310-100` (SP), a retirada não aparece, e um corpo forjado com `shipping_service_id = 'retirada'` recebe 422.
- [ ] Um pedido de retirada no painel não oferece etiqueta, e vai de "separando" a "retirado" sem passar por "enviado".
