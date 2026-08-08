# CH-cartao-parcelado-desktop: Cartao parcelado e ticket maior, na mesa

```yaml
charter:
  id: CH-cartao-parcelado-desktop
  mission: "Verificar parcelamento, coluna de resumo fixa e que nenhum dado de cartao chega ao backend da loja"
  mode: charter-with-tour
  persona:
    name: Léo
    device: desktop
    network: wifi-fast
    locale: pt-BR
  journey: J-compra-cartao-parcelado
  scenarios: [PAY-cartao-sem-pan-no-backend, CHK-cta-valor-por-metodo, SHP-fronteira-frete-gratis]
  tour: Money Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "Painel de rede aberto durante o pagamento: nenhuma requisicao a *.supabase.* com PAN ou CVV"
      - "Conferir que parcelas x valor da parcela fecha com o total, e respeita max_installments"
      - "Digitar um CPF no campo da loja DIFERENTE do que o Brick manda — o do pedido tem de vencer"
      - "Carrinho de 6 pins: a coluna de resumo fixa acompanha o scroll sem perder sincronia"
    must_avoid:
      - "Mastercard 5031 4332 1540 6351 — devolve invalid_transaction_amount nesta conta. Usar o Visa"
```

**Ultima do ciclo, de proposito.** Desktop é ~10% do tráfego; a premissa do projeto é mobile
primeiro, e a ordem dos charters reflete isso.

Mas é a sessão que pega o que só aparece em ticket alto: parcelamento divergindo do total, e a
coluna fixa perdendo sincronia em carrinho grande.

<!-- Charter durável e imutável: re-execute em ciclos futuros; o debrief de cada execução vai no
     relatório daquela execução (Session Debriefs), nunca aqui. -->
