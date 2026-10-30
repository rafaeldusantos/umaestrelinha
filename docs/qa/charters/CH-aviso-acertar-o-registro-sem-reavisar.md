# CH-aviso-acertar-o-registro-sem-reavisar: A dona acerta status e material do pedido e a cliente só recebe e-mail quando ela escolhe

```yaml
charter:
  id: CH-aviso-acertar-o-registro-sem-reavisar
  mission: "A dona acerta status e material do pedido e a cliente só recebe e-mail quando ela escolhe"
  mode: charter-with-tour
  persona:
    name: Adri despachando pedidos
    device: desktop 1440, depois 390
    network: wifi-fast
    locale: pt-BR
  journey: J-mudar-pedido-com-ou-sem-aviso
  scenarios: [PNL-aviso-marcar-enviado-com-aviso, PNL-aviso-desmarcar-e-gravar, PNL-aviso-aviao-envia-depois, PNL-aviso-fechar-sem-gravar, PNL-aviso-sem-email-previsto, PNL-aviso-ja-enviado-nao-pergunta, PNL-aviso-material-e-envelope, PNL-aviso-cancelar-com-caixa, PNL-aviso-retirada]
  tour: Money Tour
  time_box_minutes: 90
  guidance:
    must_try:
      - "os 7 gestos da página com e-mail previsto, sem previsto e já enviado"
      - "conferir no banco (order_notifications) e na resposta do motor que a frase da tela é verdade"
      - "o avião enviando e com o evento desligado"
    must_avoid:
      - "não deixar e-mail real sair (motor servido com o desvio do probe 02, ou function interceptada); não tocar o hospedado"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
