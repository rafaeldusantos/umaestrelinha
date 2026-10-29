# CH-imagem-zoom-no-computador: O zoom do computador mostra o detalhe da peça e só baixa a foto grande quando o mouse chega

```yaml
charter:
  id: CH-imagem-zoom-no-computador
  mission: "O zoom do computador mostra o detalhe da peça e só baixa a foto grande quando o mouse chega"
  mode: charter-with-tour
  persona:
    name: Cliente navegando pelo menu
    device: desktop
    network: wifi-fast
    locale: pt-BR
  journey: J-ver-a-joia-nitida
  scenarios: [LOJA-imagem-zoom-computador, LOJA-imagem-foto-de-fora]
  tour: Feature Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "contar width=1600 antes e depois do ponteiro"
      - "trocar de foto e voltar o ponteiro"
      - "passar o mouse pela miniatura e pelas setas sem entrar no palco"
    must_avoid:
      - "nada contra *.supabase.co (bloquear por rota)"
      - "nenhum hit do GA4 (bloquear **/g/collect*)"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
