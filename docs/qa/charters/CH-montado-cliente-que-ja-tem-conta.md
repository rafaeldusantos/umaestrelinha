# CH-montado-cliente-que-ja-tem-conta: A cliente com conta conclui sem código e acha o pedido na conta dela

```yaml
charter:
  id: CH-montado-cliente-que-ja-tem-conta
  mission: "A cliente com conta conclui sem código e acha o pedido na conta dela"
  mode: charter-with-tour
  persona:
    name: Cliente com conta pelo link
    device: phone-large 390×844
    network: 4g
    locale: pt-BR
  journey: J-concluir-pedido-montado
  scenarios: [LOJA-montado-cliente-com-conta, PNL-montado-cliente-cadastrada-e-repetida]
  tour: Back-Button Tour
  time_box_minutes: 45
  guidance:
    must_try:
      - "montar para uma cliente cadastrada (busca), abrir o link deslogada"
      - "abrir logada com outra conta"
      - "tentar trocar o e-mail; voltar no meio e reabrir"
      - "Cliente nova com o e-mail dela: deve oferecer a ficha"
    must_avoid:
      - "não deixar e-mail real sair (RESEND_API_KEY inválida no env das functions); não tocar o hospedado (*.supabase.co e **/g/collect* bloqueados); não pagar de verdade (Mercado Pago só de teste)"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
