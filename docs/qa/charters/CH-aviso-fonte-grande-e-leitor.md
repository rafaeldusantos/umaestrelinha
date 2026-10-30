# CH-aviso-fonte-grande-e-leitor: Os diálogos de aviso, o avião e a barra de lote funcionam com fonte grande, teclado e leitor de tela

```yaml
charter:
  id: CH-aviso-fonte-grande-e-leitor
  mission: "Os diálogos de aviso, o avião e a barra de lote funcionam com fonte grande, teclado e leitor de tela"
  mode: charter-with-tour
  persona:
    name: Adri despachando pedidos
    device: 390 e 1440 com fonte 130 % e 200 %
    network: wifi-fast
    locale: pt-BR
  journey: J-mudar-pedido-com-ou-sem-aviso
  scenarios: [PNL-aviso-fonte-grande-e-telas, PNL-aviso-teclado-e-leitor]
  tour: Feature Tour
  time_box_minutes: 45
  guidance:
    must_try:
      - "rolagem horizontal do body, texto embrulhando, alvos < 44px"
      - "foco ao abrir/fechar o diálogo e após o avião; região viva"
    must_avoid:
      - "não deixar e-mail real sair (motor servido com o desvio do probe 02, ou function interceptada); não tocar o hospedado"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
