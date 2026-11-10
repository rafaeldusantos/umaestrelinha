> Gerado pela descoberta e ratificado no gate em 2026-11-09.

# O pagamento que falhou: pagar de novo, e o pago por fora registrado

## Problema
Quando o PIX vence ou o cartão é recusado, a cliente nem sempre tem como pagar o mesmo pedido pela
loja: o PIX tem o caminho dentro de 7 dias, mas o cartão recusado fora do checkout só tem o WhatsApp,
e o pedido de cartão que ficou pendente não oferece nada. Quando a cliente paga por fora (PIX direto,
transferência), o painel não tem como registrar: o único gesto disponível muda o status do pedido sem
registrar o pagamento. O pedido continua aparecendo como não pago no pagamento, não conta como venda,
não manda o aviso e não guarda prova.

## Objetivo
1. Todo pedido não pago e não cancelado tem um caminho visível para a cliente pagar, ou para falar com a loja.
2. A dona registra um pagamento feito fora da loja, com observação e comprovante, e o pedido passa a
   se comportar em todo lugar como pago.

## Usuários e papéis
- Cliente com conta e convidada (pelo link do pedido, até 7 dias).
- Admin do painel (`/admin/pedidos/:id`).

## Escopo
### Dentro
- Revisar e completar os caminhos de pagar de novo na loja: PIX vencido ou recusado gera um novo
  PIX no mesmo pedido; cartão recusado ou pendente mostra à cliente um informativo para falar pelo
  WhatsApp.
- No painel, a Adri gera um novo link de pagamento por cartão para o MESMO pedido, para a cliente
  tentar com outro cartão.
- Ao pagar de novo, vale o preço da compra (travado).
- No painel, "Registrar pagamento" para pedido não pago: meio, data, observação e comprovantes
  (tudo opcional).
- O registro aparece no histórico do pedido e no bloco Pagamento, e pode ser desfeito por admin, com motivo.
- O pedido não pago é cancelado automaticamente depois de 7 dias, com e-mail próprio à cliente.
### Fora
- Estorno e reembolso pelo painel.
- Conciliação automática com o extrato.
- Registrar pagamento pelo app do ateliê (o app só mostra o pagamento registrado).

## Casos de uso

### UC-01 · Pagar de novo um PIX que venceu ou foi recusado
A cliente abre o pedido (`/pedido/:id` ou `/conta`) e gera um código novo.
**Critérios de aceite**
- CA-01.1 Pedido PIX com pagamento pendente, não cancelado e sem pagamento confirmado mostra "Pagar com PIX" [código: apps/store/src/entities/order/lib/podePagarComPix.ts:40-45]
- CA-01.2 PIX vencido ou recusado até 7 dias depois do pedido mostra "Gerar novo PIX", com a data-limite [código: packages/core/src/orders/repix.ts:49-53]
- CA-01.3 Passados os 7 dias, o pedido já foi cancelado automaticamente e mostra o que diz o CA-06.5 [r1 janela-do-pix-x-cancelamento]
- CA-01.4 Gerar um código novo invalida o anterior no meio de pagamento [código: supabase/functions/mercado-pago/handlers.ts:1004-1006]
- CA-01.5 Pagar de novo cobra o mesmo valor da primeira cobrança do pedido: promoção encerrada, cupom esgotado ou preço mudado no catálogo não alteram o valor nem recusam a cobrança. Pedido montado pelo painel cobra o valor da proposta, como hoje [r1 preco-travado-pedido-de-catalogo]
- CA-01.6 Um pedido gravado fora da loja (sem cobrança calculada pela loja) nunca é cobrado pelo valor gravado nele [r1 preco-travado-pedido-de-catalogo]; a loja não oferece pagar de novo esse pedido (nem "Gerar novo PIX" nem valor) e mostra que a Adri combina o pagamento, com o WhatsApp [QA-P1 2026-11-10]

### UC-02 · Pedido de cartão que não foi concluído
A cliente tem um pedido de cartão recusado, ou pendente sem resposta, e já saiu do checkout.
**Critérios de aceite**
- CA-02.1 Pedido de cartão recusado ou pendente, não cancelado, mostra à cliente um informativo para entrar em contato pelo WhatsApp para resolver o pagamento [gate Q-01]
- CA-02.2 A loja não oferece à cliente, por conta própria, pagar de novo por cartão nem trocar o meio para PIX [gate Q-01]
- CA-02.3 Pedido de cartão com tentativa de pagamento sem resposta também mostra o informativo; pedido de cartão criado e nunca cobrado (abandonado no checkout) não aparece nas pendências da conta [r1 informativo-em-pedido-abandonado]
- CA-02.4 Pedido cancelado não oferece pagamento em tela nenhuma, e o servidor recusa a cobrança [conhecimento]

### UC-05 · A Adri gera um novo link de cartão para o mesmo pedido
Em `/admin/pedidos/:id`, para pedido de cartão não pago e não cancelado, a Adri gera um link para a cliente tentar pagar o MESMO pedido com outro cartão.
**Critérios de aceite**
- CA-05.1 A ação existe para pedido com pagamento por cartão pendente, recusado ou vencido e não cancelado; não vale para pedido feito com PIX [gate Q-01; r1 link-de-cartao-x-cancelamento]
- CA-05.2 O link abre na loja uma tela de pagamento por cartão do mesmo pedido, sem refazer a compra e sem pedir login [r1 credencial-do-link-de-cartao]
- CA-05.3 O valor cobrado é o da compra, travado [gate Q-08]
- CA-05.4 A Adri copia o link para mandar pelo WhatsApp [gate Q-01]
- CA-05.5 Pagamento aprovado por esse link tem o mesmo efeito de um pagamento aprovado no checkout [conhecimento]
- CA-05.6 O link vale até o pedido ser pago ou cancelado, ou até a Adri gerar outro; gerar um link novo invalida o anterior [r1 credencial-do-link-de-cartao]
- CA-05.7 Aberto com o pedido já pago ou cancelado, o link mostra a situação do pedido e não oferece pagamento [r1 credencial-do-link-de-cartao]
- CA-05.8 Gerar o link de cartão não adia o cancelamento automático do pedido [r1 link-de-cartao-x-cancelamento]

### UC-03 · Registrar no painel um pagamento feito fora da loja
Em `/admin/pedidos/:id`, a admin informa que a cliente pagou por fora.
**Critérios de aceite**
- CA-03.1 A ação existe para pedido com pagamento pendente, recusado ou vencido e não cancelado [pedido]
- CA-03.2 Pede meio, data, observação e comprovantes, todos opcionais; até 3 comprovantes (JPG, PNG, WebP, HEIC ou PDF), 10 MB cada [gate Q-03; r1 formatos-de-imagem]
- CA-03.2a O meio é escolhido numa lista fixa: PIX direto, transferência, dinheiro, cartão de crédito (link de outro gateway ou maquininha), outro [gate Q-06]
- CA-03.2b A data e a hora do pagamento são as informadas pela admin, já preenchidas com agora, no horário de Brasília; não podem ser no futuro nem antes da criação do pedido, e a recusa diz o motivo [gate P-03; r1 limites-da-data-do-pagamento]
- CA-03.3 Ao confirmar, o pedido fica pago no pagamento, com a data do pagamento, e um pedido pendente avança para "Pago" [código: supabase/migrations/20261030120000_pagamento-aprovado-marca-pago.sql:46-56]
- CA-03.3a Se o pagamento foi aprovado pela loja (ou registrado por outra admin) enquanto o formulário estava aberto, a tela diz isso, não grava o registro e não guarda os comprovantes [r1 corrida-com-a-aprovacao]
- CA-03.4 O estoque baixa e o uso do cupom conta, como num pagamento pela loja [código: mesma migration:76-118]
- CA-03.5 Registrar duas vezes não repete nenhum efeito [r1 pagamento-em-dobro]
- CA-03.5a Ao registrar, o código PIX ou o link de cartão em aberto deixam de poder ser pagos [r1 pagamento-em-dobro]
- CA-03.5b Se um pagamento da loja for aprovado num pedido já pago (registrado ou não), o pedido não repete estoque, cupom nem e-mail, e o bloco Pagamento mostra "Pago duas vezes — devolver um dos valores" [r1 pagamento-em-dobro]
- CA-03.6 O histórico do pedido mostra "Pagamento registrado manualmente", quem fez e quando [código: useAdminOrders.ts:140-154; core/order-actions]
- CA-03.7 O pedido entra na venda do Dashboard e da Início pela data do pagamento [código: 20261104140000_acessos-com-sacola.sql:269-276]
- CA-03.8 A admin escolhe se a cliente recebe o e-mail de pagamento confirmado (ou as instruções de envio do material, quando o pedido espera material), no mesmo portão dos outros gestos; o aviso interno de pedido pago não sai para o registro feito no painel [r1 aviso-interno-do-proprio-registro]
- CA-03.9 Levar um pedido não pago a "Pago" pelo painel — pelo "Avançar mesmo assim", pelo "Outro status" ou pelo "Avançar status" em lote — abre o "Registrar pagamento"; o lote deixa de fora os pedidos não pagos e diz quantos ficaram [gate Q-05; r1 outros-caminhos-que-marcam-pago]
- CA-03.16 Pedido avançado à mão para depois de "Pago" sem pagamento registrado mostra no bloco Pagamento "Pagamento não registrado" com a ação de registrar, e a cliente não vê oferta de pagar de novo nele [r1 outros-caminhos-que-marcam-pago]
- CA-03.10 A recusa (arquivo grande, de tipo não aceito, mais de 3) aparece antes de qualquer gravação, com o motivo [conhecimento]
- CA-03.11 O registro manual pode ser desfeito por admin, informando o motivo. Desfazer devolve o pagamento ao estado anterior ao registro, tira a data do pagamento, devolve o pedido de "Pago" para "Pendente", devolve ao estoque o que foi baixado e devolve o uso do cupom; o pedido sai da venda do Dashboard e da Início. Observação e comprovantes ficam guardados no histórico. Desfazer fica no histórico, com quem fez, quando e o motivo [gate Q-07; r1 desfazer-registro-efeitos]
- CA-03.12 Pagamento aprovado pelo meio de pagamento da loja não tem "Desfazer" [r1 desfazer-registro-efeitos]
- CA-03.13 Desfazer só é possível enquanto o pedido está em "Pago"; com o pedido em Separando, Enviado ou Entregue a ação não aparece [r1 desfazer-limites]
- CA-03.14 Desfazer não manda e-mail à cliente [r1 desfazer-limites]
- CA-03.15 Um registro desfeito volta a contar o prazo do cancelamento automático a partir do desfazer [r1 desfazer-limites]

### UC-04 · Conferir um pagamento registrado
**Critérios de aceite**
- CA-04.1 O bloco Pagamento mostra o meio pelo nome (não o valor técnico), a data, quem registrou, a observação e os comprovantes [conhecimento]
- CA-04.2 O comprovante só abre para admin; o link expira e não é público [conhecimento]
- CA-04.3 A cliente vê o pedido como pago, com o selo e a jornada de sempre, o meio informado pela admin (ex.: "Transferência") e o mesmo total; nunca vê a observação nem o comprovante [r1 meio-que-a-cliente-ve]

### UC-06 · Cancelamento automático do pedido não pago
**Critérios de aceite**
- CA-06.1 Pedido ainda em "Pendente", sem pagamento confirmado, é cancelado automaticamente 7 dias depois de criado [gate Q-04; r1 recorte-do-cancelamento-automatico]
- CA-06.1a Não é cancelado: pedido que a loja já avançou (Pago, Separando, Enviado, Entregue), pedido com material da cliente enviado ou recebido, e pedido criado antes da publicação desta mudança [r1 recorte-do-cancelamento-automatico]
- CA-06.2 Pedido com pagamento registrado manualmente ou aprovado nunca é cancelado por esse prazo [conhecimento]
- CA-06.3 Ao cancelar, o código PIX ou a cobrança de cartão em aberto deixam de poder ser pagos [r1 cancelamento-com-cobranca-aberta]
- CA-06.4 Se ainda assim um pagamento for aprovado depois do cancelamento, o pedido continua cancelado, nada é baixado do estoque, a cliente não recebe "pagamento confirmado" e o painel mostra o pedido como "Pago depois de cancelado — devolver o valor" [r1 cancelamento-com-cobranca-aberta]
- CA-06.5 O pedido cancelado por falta de pagamento diz isso à cliente em /pedido/:id e /conta e mostra o WhatsApp [r1 janela-do-pix-x-cancelamento]
- CA-06.6 O cancelamento automático manda à cliente um e-mail próprio ("cancelado por falta de pagamento"), para todos os pedidos cancelados automaticamente. Quando cancelado pelo admin, não enviar email — isto é, o e-mail "cancelado por falta de pagamento" só sai no cancelamento automático; o cancelamento pela admin continua com a caixa de escolha, como hoje. O e-mail novo nasce desligado, como os outros, e a Adri o revisa e liga em Notificações [r1 aviso-do-cancelamento-automatico; handoff H-01, H-02]

## Requisitos não-funcionais
- RNF-01 "Este pedido foi pago?" tem um dono só: a gravação manual produz o mesmo estado (`approved` + `paid_at`) que o webhook [código: CLAUDE.md "defeito 01"; precondition.ts:88-96]
- RNF-02 Toda escrita do pedido passa pelo dono da escrita (AD-059) [código: pedidoGravadoSoPeloDono.test.ts]
- RNF-03 Comprovante é dado pessoal e financeiro: armazenamento privado, leitura e escrita só para admin [conhecimento]
- RNF-04 O envio funciona em 390px (foto da galeria ou câmera do celular), com alvo de 44px e sem rolagem lateral [código: CLAUDE.md "Mobile é o caso principal"]
- RNF-05 A migration é aplicada só no banco local, sem push sem pergunta [código: CLAUDE.md "CI e deploy"]
- RNF-06 Tom memorial: nenhuma urgência na cópia para a cliente [código: CLAUDE.md topo]

- RNF-07 O registro manual não dispara o evento de compra do Google Analytics [premissa ratificada pela recomendação, P-04]
- RNF-08 O registro guarda a origem manual, o meio, quem registrou, a data, a observação e os comprovantes de forma estruturada, não só como nota solta [premissa ratificada pela recomendação, P-05]
- RNF-09 O app do ateliê mostra que o pagamento foi registrado à mão, o meio, a data e a observação; comprovantes só no painel. O app não registra [gate P-06; r1 o-que-o-app-mostra]

## Expectativas de UI/UX
Nenhuma informada.

## Cenários preliminares
| Cenário | Tipo | Risco |
| ------- | ---- | ----- |
| PIX venceu; a cliente gera um novo em até 7 dias e paga | happy_path | P1 |
| Cartão recusado no checkout; tenta outro cartão na mesma aba | alternativo | P1 |
| Cartão recusado; a Adri gera um link novo de cartão e a cliente paga o mesmo pedido | alternativo | P0 |
| Pedido não pago completa 7 dias e é cancelado | borda | P1 |
| Admin desfaz um registro manual com motivo | alternativo | P1 |
| Pedido de cartão pendente sem resposta; a cliente abre o pedido | borda | P1 |
| Pedido cancelado; chamada direta ao create-payment | seguranca | P0 |
| Admin registra pagamento manual com comprovante em 390px | happy_path | P0 |
| Registro manual e, depois, o webhook aprovado da order antiga | borda | P0 |
| Dois cliques ou duas admins registrando o mesmo pagamento | borda | P1 |
| Comprovante acessado por URL sem sessão de admin | seguranca | P0 |
| Pedido montado (89) com pagamento vencido, pago de novo pelo preço travado | alternativo | P2 |
| Promoção encerrada ao pagar de novo: cobra o preço da compra | borda | P1 |
| Arquivo acima do limite ou de tipo inválido | erro | P2 |

## Histórico de revisões
- r1 · 2026-11-09 · recorte-do-cancelamento-automatico, cancelamento-com-cobranca-aberta, janela-do-pix-x-cancelamento, aviso-do-cancelamento-automatico, desfazer-registro-efeitos, desfazer-limites, pagamento-em-dobro, preco-travado-pedido-de-catalogo, credencial-do-link-de-cartao, link-de-cartao-x-cancelamento, outros-caminhos-que-marcam-pago, limites-da-data-do-pagamento, meio-que-a-cliente-ve, informativo-em-pedido-abandonado, aviso-interno-do-proprio-registro, o-que-o-app-mostra, formatos-de-imagem, corrida-com-a-aprovacao
- handoff · 2026-11-09 · aviso-do-cancelamento-automatico (CA-06.6, esclarecido por H-01 e H-02)
- QA r1 · 2026-11-10 · QA-P1 (CA-01.6 complementado: pedido sem cobrança calculada pela loja leva ao WhatsApp, sem oferta de pagar) — `qa/decisoes-produto.md`
