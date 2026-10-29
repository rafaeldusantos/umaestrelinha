# CH-imagem-banners-da-home: Os banners de largura cheia da Home chegam nítidos no celular e nada mais da Home pesa diferente

```yaml
charter:
  id: CH-imagem-banners-da-home
  mission: "Os banners de largura cheia da Home chegam nítidos no celular e nada mais da Home pesa diferente"
  mode: charter-with-tour
  persona:
    name: Cliente navegando pelo menu
    device: phone-large
    network: wifi-fast
    locale: pt-BR
  journey: J-ver-a-joia-nitida
  scenarios: [LOJA-imagem-banners-da-home, LOJA-imagem-foto-de-fora]
  tour: Feature Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "interceptar home_sections e home_section_items trocando as artes por imagens do Storage local"
      - "conferir o candidato escolhido (currentSrc) em 390 @3x e em 1440 @2x"
      - "uma arte de host de terceiro sai intacta"
    must_avoid:
      - "nada contra *.supabase.co (bloquear por rota)"
      - "nenhum hit do GA4 (bloquear **/g/collect*)"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
