# CH-lote-do-drop-colado-do-excel: colar a planilha do drop e ver o que sobrevive

```yaml
charter:
  id: CH-lote-do-drop-colado-do-excel
  mission: "Colar o drop inteiro do Excel na grade rápida — com preço em pt-BR, linha sem preço, colagem gigante e foto por linha — e conferir que a escrita é UMA, não N"
  mode: charter-with-tour
  persona:
    name: Nana
    device: desktop
    network: wifi-fast
    locale: pt-BR
  journey: J-cadastrar-lote-grade-rapida
  scenarios: [BLK-grade-rapida-colar-e-criar, BLK-grade-rapida-uma-escrita-em-lote, BLK-grade-rapida-erro-na-linha, BLK-grade-rapida-imagem-na-celula]
  tour: Paste Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "Colar 8 linhas com tabs e quebras do Excel, uma sem preço e uma com slug que já existe; conferir rodapé N prontas · M com erro e o erro NOMEANDO a URL em conflito"
      - "Contar as requisições ao criar: um insert de produtos, um de variações, um refetch — N de cada é falha mesmo com a tela verde"
      - "Conferir no banco o que herdou dos padrões do lote: product_categories, products.options e product_variants de cada produto criado"
      - "Pôr foto em duas linhas e tentar um arquivo de 12 MB — a rejeição tem que ser a MESMA da aba Mídia"
    must_avoid:
      - "Formulário de produto — é CH-cadastro-de-produto-com-grade"
      - "Arquivo órfão no Storage ao remover a linha: declarado na spec, não achado"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
