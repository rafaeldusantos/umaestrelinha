# CH-imagem-rede-lenta: Em 4G lento, o custo da foto de 1080 é medido e a página continua usável

```yaml
charter:
  id: CH-imagem-rede-lenta
  mission: "Em 4G lento, o custo da foto de 1080 é medido e a página continua usável"
  mode: charter-with-tour
  persona:
    name: Cliente navegando pelo menu
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-ver-a-joia-nitida
  scenarios: [LOJA-imagem-rede-lenta]
  tour: Network Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "LCP com Slow 4G e CPU 4x na página do produto"
      - "comparar com a rendição de 720 forçada por rota (A/B)"
    must_avoid:
      - "nada contra *.supabase.co (bloquear por rota)"
      - "nenhum hit do GA4 (bloquear **/g/collect*)"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
