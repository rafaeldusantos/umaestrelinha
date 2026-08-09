# CH-listagem-aguenta-maltrato: a listagem consulta o servidor e a célula não perde dado

```yaml
charter:
  id: CH-listagem-aguenta-maltrato
  mission: "Maltratar a listagem v2 — filtros, busca e edição inline — para descobrir se a consulta é do servidor de verdade e se a célula grava o que mostra"
  mode: charter-with-tour
  persona:
    name: Nana
    device: desktop
    network: wifi-fast
    locale: pt-BR
  journey: J-achar-e-corrigir-na-listagem
  scenarios: [LST-consulta-no-servidor-com-count, LST-visoes-filtros-e-busca, LST-editar-na-celula-com-teclado, LST-desfazer-da-edicao-inline, LST-celula-bloqueada-explica-por-que, LST-colunas-badges-e-largura]
  tour: Garbage Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "Contar as requisições ao PostgREST ao abrir e ao paginar: uma por página, com range e count — a tela é igual nos dois mundos, só a rede denuncia"
      - "Editar estoque na célula com o teclado (Enter/Tab/Esc), dar duplo clique rápido no salvar, colar texto longo e emoji, e sair da célula clicando fora"
      - "Usar o Desfazer do toast e confirmar por F5 que o banco voltou — não só a tela"
      - "Buscar por SKU de variação e por tag; combinar dois filtros e remover um pelo × do chip"
    must_avoid:
      - "Edição em massa e barra de seleção — são CH-massa-mexe-em-dinheiro e CH-selecao-que-apaga"
      - "Visão Sem estoque para produto com grade: dívida declarada (view no Postgres), não achado novo"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
