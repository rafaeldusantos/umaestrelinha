# CH-aviso-lote-do-dia: A dona avança os pedidos do dia em lote e sabe quantos e-mails saíram

```yaml
charter:
  id: CH-aviso-lote-do-dia
  mission: "A dona avança os pedidos do dia em lote e sabe quantos e-mails saíram"
  mode: charter-with-tour
  persona:
    name: Adri despachando pedidos
    device: desktop 1440, celular 390 nos cartões
    network: wifi-fast
    locale: pt-BR
  journey: J-avancar-pedidos-em-lote
  scenarios: [PNL-lote-avancar-com-progresso, PNL-lote-cartao-do-celular]
  tour: Money Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "lote misto (já enviados, recusados) e o resumo contra o banco"
      - "mais de 50 selecionados"
      - "o cartão do celular Registrar recebimento"
    must_avoid:
      - "não deixar e-mail real sair (motor servido com o desvio do probe 02, ou function interceptada); não tocar o hospedado"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
