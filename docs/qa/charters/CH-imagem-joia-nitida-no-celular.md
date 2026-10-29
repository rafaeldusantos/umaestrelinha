# CH-imagem-joia-nitida-no-celular: A cliente no celular @3x vê a foto da joia nítida, baixada uma vez, sem a categoria pesar mais

```yaml
charter:
  id: CH-imagem-joia-nitida-no-celular
  mission: "A cliente no celular @3x vê a foto da joia nítida, baixada uma vez, sem a categoria pesar mais"
  mode: charter-with-tour
  persona:
    name: Cliente navegando pelo menu
    device: phone-large
    network: wifi-fast
    locale: pt-BR
  journey: J-ver-a-joia-nitida
  scenarios: [LOJA-imagem-foto-principal-celular, LOJA-imagem-trocar-de-foto-celular, LOJA-imagem-categoria-sem-peso-extra, LOJA-imagem-tela-cheia-intacta]
  tour: Money Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "contar as requisições de imagem por largura na página do produto e na categoria"
      - "arrastar o palco e tocar a miniatura; abrir a tela cheia"
      - "olhar a foto em captura scale device e comparar com a de 720"
    must_avoid:
      - "nada contra *.supabase.co (bloquear por rota)"
      - "nenhum hit do GA4 (bloquear **/g/collect*)"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
