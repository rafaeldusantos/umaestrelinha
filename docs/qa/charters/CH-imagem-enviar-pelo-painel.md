# CH-imagem-enviar-pelo-painel: A dona envia fotos e artes de vários tipos e o Storage guarda exatamente o esperado

```yaml
charter:
  id: CH-imagem-enviar-pelo-painel
  mission: "A dona envia fotos e artes de vários tipos e o Storage guarda exatamente o esperado"
  mode: charter-with-tour
  persona:
    name: Adri cadastrando peças
    device: desktop
    network: wifi-fast
    locale: pt-BR
  journey: J-enviar-foto-pelo-painel
  scenarios: [PNL-imagem-webp-intacto, PNL-imagem-foto-grande-reduzida, PNL-imagem-png-transparente-na-home, PNL-imagem-arquivo-corrompido, PNL-imagem-dica-da-area-de-envio]
  tour: Garbage Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "enviar pela tela (não pelo motor direto): WebP 1024, JPEG 4000, WebP 2400 e 2401, PNG transparente, arquivo corrompido"
      - "baixar cada objeto gravado e conferir SHA, formato, dimensões e alfa"
      - "a dica da área de envio em 390 e com fonte 200 %"
      - "apagar do Storage local tudo que o ciclo gravou"
    must_avoid:
      - "não salvar o produto (só o envio interessa); não tocar o hospedado"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
