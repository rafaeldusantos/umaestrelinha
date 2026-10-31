# CH-montado-recusas-e-bordas-da-montagem: As recusas da montagem dizem o motivo e nunca deixam passar um valor que a Adri não viu

```yaml
charter:
  id: CH-montado-recusas-e-bordas-da-montagem
  mission: "As recusas da montagem dizem o motivo e nunca deixam passar um valor que a Adri não viu"
  mode: charter-with-tour
  persona:
    name: Adri montando uma venda
    device: desktop 1440
    network: wifi-fast
    locale: pt-BR
  journey: J-montar-pedido-para-a-cliente
  scenarios: [PNL-montado-recusas-e-motivo-ao-lado, PNL-montado-frete-previa-e-falha, PNL-montado-duplo-clique-criar-link]
  tour: Garbage Tour
  time_box_minutes: 45
  guidance:
    must_try:
      - "desconto em R$ e em % que zera; cupom + combinado abaixo de R$ 1,00; motivo vazio e de 121 caracteres"
      - "e-mail inválido, quantidade 0 e 100, gravação acima do teto"
      - "cotação com 500 interceptado"
      - "duplo clique em Criar link"
    must_avoid:
      - "não deixar e-mail real sair (RESEND_API_KEY inválida no env das functions); não tocar o hospedado (*.supabase.co e **/g/collect* bloqueados); não pagar de verdade (Mercado Pago só de teste)"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
