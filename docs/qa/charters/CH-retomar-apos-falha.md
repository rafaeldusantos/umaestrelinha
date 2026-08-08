# CH-retomar-apos-falha: Voltar depois de dar errado, sem pagar duas vezes

```yaml
charter:
  id: CH-retomar-apos-falha
  mission: "Provar que os três caminhos de recuperação terminam em UM pedido pago e estoque baixado uma vez"
  mode: charter-with-tour
  persona:
    name: Rui
    device: phone-large
    network: flaky
    locale: pt-BR
  journey: J-retomar-pagamento-falho
  scenarios: [PAY-pix-expirado-mesmo-pedido, PAY-webhook-duplicado-baixa-1x, CHK-editar-bloco-invalida-pedido, CHK-recarrega-nao-duplica-pedido]
  tour: Interrupt Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "Fechar a aba com o PIX na tela e voltar por /conta → o pedido pending tem de estar retomavel"
      - "Recusar o cartao (titular OTHE), retentar SEM editar bloco: mesmo order_id"
      - "Recusar, EDITAR o bloco de entrega, e retentar: pedido novo (o antigo cobraria frete velho)"
      - "Reentregar a mesma notificação de webhook 3x e contar o decremento de stock_total"
    must_avoid:
      - "Confiar na tela para contar pedidos — a contagem é SELECT no banco"
```

**Interrupt Tour**: interromper o fluxo em cada ponto e voltar. É o tour que encontra pedido
órfão, cobrança dupla e carrinho perdido — os bugs de maior impacto desta jornada.

A validação da 09 levantou um achado serio ainda aberto: **order de recusa ficando pendurada no
painel do MP**. Conferir o painel do sandbox depois de cada recusa.

<!-- Charter durável e imutável: re-execute em ciclos futuros; o debrief de cada execução vai no
     relatório daquela execução (Session Debriefs), nunca aqui. -->
