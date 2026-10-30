# CH-aviso-rede-lenta-e-falhas: Com rede lenta ou falhando, a página do pedido mostra trabalho em curso e nunca perde o que a dona digitou

```yaml
charter:
  id: CH-aviso-rede-lenta-e-falhas
  mission: "Com rede lenta ou falhando, a página do pedido mostra trabalho em curso e nunca perde o que a dona digitou"
  mode: charter-with-tour
  persona:
    name: Adri despachando pedidos
    device: desktop 1440 e 390
    network: Slow 3G
    locale: pt-BR
  journey: J-mudar-pedido-com-ou-sem-aviso
  scenarios: [PNL-carregar-sem-piscar, PNL-carregar-releitura-falha, PNL-carregar-esqueleto, PNL-aviso-leitura-de-envios-falha]
  tour: Network Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "rolar até o Histórico com a transportadora digitada e marcar como enviado"
      - "releitura falhando; gravação falhando; leitura de order_notifications falhando (decisão aberta)"
      - "duplo clique no mesmo botão"
    must_avoid:
      - "não deixar e-mail real sair (motor servido com o desvio do probe 02, ou function interceptada); não tocar o hospedado"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
