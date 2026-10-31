# CH-montado-link-que-mudou-ou-morreu: O link aberto pela cliente nunca cria um pedido errado quando a Adri edita, renova ou cancela

```yaml
charter:
  id: CH-montado-link-que-mudou-ou-morreu
  mission: "O link aberto pela cliente nunca cria um pedido errado quando a Adri edita, renova ou cancela"
  mode: charter-with-tour
  persona:
    name: Cliente de luto pelo link (com a Adri no painel ao lado)
    device: phone-large 390×844 + desktop 1440
    network: wifi-fast
    locale: pt-BR
  journey: J-concluir-pedido-montado
  scenarios: [LOJA-montado-link-morto-ou-mudou, PNL-montado-editar-renovar-cancelar, LOJA-montado-peca-indisponivel]
  tour: Multi-Tab Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "página aberta na loja, a Adri edita no painel, a cliente tenta concluir"
      - "renovar com o link antigo aberto; cancelar; token inventado; fragmento vazio"
      - "variação desativada no banco depois de montar"
      - "duplo clique em concluir"
    must_avoid:
      - "não deixar e-mail real sair (RESEND_API_KEY inválida no env das functions); não tocar o hospedado (*.supabase.co e **/g/collect* bloqueados); não pagar de verdade (Mercado Pago só de teste)"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
