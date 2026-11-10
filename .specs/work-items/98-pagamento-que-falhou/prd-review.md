# PRD Tech Review — WI 98

## Rodada r1

**Envelope** `prd-review/v1` · round 1 · prd_version 1 · reviewed_at 2026-11-09T22:10:00-03:00 ·
verdict `changes_requested_blocking` (blocking 5 · gaps 7 · questions 6 · tech_decisions 2).
Os corpos completos dos findings, com `caminho:linha`, estão resumidos abaixo; a evidência principal
está no `discovery.md` e foi conferida no disco pelo revisor.

| id | key | category | owner | severity | estado | via |
| -- | --- | -------- | ----- | -------- | ------ | --- |
| F1 | recorte-do-cancelamento-automatico | blocking | tech_prd_edit | critical | aplicado | ratificado pela recomendação |
| F2 | cancelamento-com-cobranca-aberta | blocking | tech_prd_edit | critical | aplicado | ratificado pela recomendação |
| F3 | janela-do-pix-x-cancelamento | gap | negocio | high | aplicado | página |
| F4 | aviso-do-cancelamento-automatico | question | negocio | medium | aplicado | página |
| F5 | desfazer-registro-efeitos | gap | tech_prd_edit | high | aplicado | ratificado pela recomendação |
| F6 | desfazer-limites | question | negocio | medium | aplicado | página |
| F7 | pagamento-em-dobro | blocking | tech_prd_edit | critical | aplicado | ratificado pela recomendação |
| F8 | preco-travado-pedido-de-catalogo | blocking | tech_prd_edit | critical | aplicado | ratificado pela recomendação |
| F9 | credencial-do-link-de-cartao | blocking | tech_prd_edit | critical | aplicado | ratificado pela recomendação |
| F10 | link-de-cartao-x-cancelamento | question | negocio | medium | aplicado | página |
| F11 | outros-caminhos-que-marcam-pago | gap | tech_prd_edit | high | aplicado | ratificado pela recomendação |
| F12 | limites-da-data-do-pagamento | gap | negocio | medium | aplicado | ratificado pela recomendação |
| F13 | meio-que-a-cliente-ve | gap | negocio | medium | aplicado | página |
| F14 | informativo-em-pedido-abandonado | gap | tech_prd_edit | medium | aplicado | ratificado pela recomendação |
| F15 | ja-existe-cartao-recusado-e-proposta | overlap | none | info | sem item | — |
| F16 | aviso-interno-do-proprio-registro | question | negocio | low | aplicado | página |
| F17 | o-que-o-app-mostra | question | negocio | low | aplicado | página |
| F18 | formatos-de-imagem | improvement | tech_prd_edit | low | aplicado | ratificado pela recomendação |
| F19 | corrida-com-a-aprovacao | gap | tech_prd_edit | medium | aplicado | ratificado pela recomendação |
| F20 | um-corpo-para-o-efeito-de-pago | improvement | tech | medium | aplicado → Decisões | ratificado pela recomendação |
| F21 | pg-cron-no-hospedado | question | tech | medium | aplicado → Decisões | ratificado pela recomendação |

Itens técnicos ratificados pela recomendação do parecer, sem página, pela regra do usuário (memória
`gates-so-negocio`): a página levou só os 7 de negócio.

### Respostas da página (2026-11-10T00:47Z)
| key | escolha | texto |
| --- | ------- | ----- |
| janela-do-pix-x-cancelamento | Cancelar no 7º dia, como decidido; o pedido cancelado por falta de pagamento diz isso e mostra o WhatsApp | — |
| aviso-do-cancelamento-automatico | Manda o e-mail próprio para todos os pedidos cancelados automaticamente | "Quando cancelado pelo admin, não enviar email" |
| link-de-cartao-x-cancelamento | Não adia; só para pedido de cartão | — |
| desfazer-limites | Só com o pedido em Pago; não avisa a cliente; o prazo do cancelamento recomeça a contar do desfazer | — |
| meio-que-a-cliente-ve | O meio informado pela admin (ex.: 'Transferência'), sem observação nem comprovante | — |
| aviso-interno-do-proprio-registro | Não: o aviso interno não sai para o registro feito no painel; a admin escolhe se a cliente recebe o e-mail (ou as instruções do material) | — |
| o-que-o-app-mostra | Mostra também a observação; comprovantes só no painel | — |

### O que foi aplicado, e onde
- `prd.md`: CA-01.3, CA-01.5, CA-01.6, CA-02.3, CA-03.2, CA-03.2b, CA-03.3a, CA-03.5, CA-03.5a, CA-03.5b,
  CA-03.8, CA-03.9, CA-03.11..CA-03.16, CA-04.3, CA-05.1, CA-05.2, CA-05.6..CA-05.8, CA-06.1, CA-06.1a,
  CA-06.3..CA-06.6, RNF-09 e a linha do Escopo do cancelamento — cada critério marca a `key` em `[r1 …]`.
- **Decisões** (vão à costura):
  - F1: o recorte do job é `orders.status = 'pending'`, sem material `material_enviado`/`material_recebido`, criado depois da publicação.
  - F2/F7: cancelar e registrar fecham a cobrança aberta no Mercado Pago; aprovação que chega em pedido cancelado ou já pago é marcada e não repete efeitos; `create-payment` recusa pedido cancelado.
  - F8: o valor travado é o da primeira cobrança calculada pelo servidor (nunca `orders.total`, BL-030); pedido montado segue `lockedProposalCharge`.
  - F9: o link de cartão leva credencial própria (token no fragmento, hash no banco, no molde da 89), independente da conta e do acesso de 7 dias; reaproveita o Brick; é segunda superfície de pagamento (AD-042, `pagamentoComDonoUnico`).
  - F5: desfazer é exceção explícita de `approved` não regride, só para origem manual.
  - F14: o informativo de cartão pendente depende de ter havido tentativa de cobrança.
  - F18: HEIC aceito e guardado como chegou; abre como download no painel.
  - F20: a porta manual chama o mesmo corpo de `apply_payment_approval` (data e autor como parâmetro), sem copiar a baixa de estoque; linha de histórico própria mesmo sem mudança de status; RPC na lista de `marcacaoSoPorAcao`; escrita por `core/order-actions`; colunas novas na `order_list`; primeiro bucket privado + URL assinada.
  - F21: conferir `pg_cron` no hospedado antes do deploy (leitura); um job em SQL não alcança o motor de e-mail nem a API do MP — o cancelamento pode exigir edge function agendada.
- **Ponto a conferir no handoff principal**: o texto "Quando cancelado pelo admin, não enviar email" muda o
  portão da feature 88, em que a admin escolhe se avisa a cliente no cancelamento.

### Leitura
O PRD chegou com cinco bloqueios técnicos (cancelamento amplo demais, pedido cancelado cobrável,
pagamento em dobro silencioso, preço travado inexistente para pedido de catálogo, link de cartão sem
credencial). Todos ratificados com a recomendação; os sete de negócio foram respondidos. Nada fica aberto.
