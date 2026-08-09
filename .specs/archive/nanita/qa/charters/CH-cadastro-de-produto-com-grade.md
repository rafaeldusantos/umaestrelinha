# CH-cadastro-de-produto-com-grade: o cadastro entrega o que promete, do formulário até a vitrine

```yaml
charter:
  id: CH-cadastro-de-produto-com-grade
  mission: "Cadastrar um botton com dois eixos e preço por linha e provar que o que a lojista digitou é o que a loja mostra e o servidor cobra — a promessa central da feature 11"
  mode: charter-with-tour
  persona:
    name: Nana
    device: desktop
    network: wifi-fast
    locale: pt-BR
  journey: J-cadastrar-produto-com-grade
  scenarios: [PRD-cadastro-com-grade-happy, PRD-grade-regerar-com-diff, PRD-linha-sem-preco-nao-vende, PRD-taxonomia-nao-suja, PRD-mascaras-e-politica-de-estoque, PRD-excluir-variacao-vendida]
  tour: Feature Tour
  time_box_minutes: 90
  guidance:
    must_try:
      - "Cadastrar do zero: 5 abas, eixos Tamanho × Acabamento, Regerar com diff, preço por linha, publicar — e abrir /produto/<slug> na loja para conferir seletores, faixa e preço da combinação"
      - "Deixar uma linha ativa sem preço e tentar publicar; conferir o rodapé (faixa ignora pausadas) e a mensagem inline"
      - "Colar R$ 1.234,56 no preço e digitar 18 no peso; conferir no BANCO que ficou 1234.56 e 0.018 — não no campo"
      - "Tentar excluir uma variação já referenciada por order_items e conferir que a recusa nomeia os pedidos e oferece Pausar"
    must_avoid:
      - "Aba Mídia e estúdio de mockup — são CH-foto-e-alt-na-loja"
      - "Rascunho, guarda de saída e checklist — são CH-formulario-nao-perde-o-trabalho"
      - "Layout mobile do backoffice: escopo declarado como desktop (A31)"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
