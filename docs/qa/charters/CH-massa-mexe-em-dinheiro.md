# CH-massa-mexe-em-dinheiro: a prévia diz a verdade e o desfazer desfaz

```yaml
charter:
  id: CH-massa-mexe-em-dinheiro
  mission: "Reprecificar em lote caçando divergência entre o que a prévia mostra e o que o banco recebe — a operação de maior alcance do backoffice mexe em preço de dezenas de produtos de uma vez"
  mode: charter-with-tour
  persona:
    name: Nana
    device: desktop
    network: wifi-fast
    locale: pt-BR
  journey: J-reprecificar-em-massa
  scenarios: [BLK-massa-previa-bate-com-a-conta, BLK-massa-so-o-que-esta-ligado, BLK-massa-desfazer-de-30s, BLK-massa-categorias-e-agendar]
  tour: Money Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "Aplicar Aumentar 10% em 12 produtos e conferir 3 linhas com a conta feita à mão — prévia contra banco, incluindo arredondamento e o modo terminar em ,90"
      - "Conferir no banco os campos NÃO ligados dos produtos afetados: campo que vaza muda dado que ninguém pediu"
      - "Forçar falha parcial (produto com stock_policy none na seleção de estoque) e ler o relato: quantos mudaram, quantos foram ignorados, e o desfazer cobrindo só os alterados"
      - "Categorias no modo Substituir e Status → Agendar: conferir o diff em product_categories e o produto fora da vitrine antes da data"
    must_avoid:
      - "Excluir em massa — é CH-selecao-que-apaga (irreversível, merece box próprio)"
      - "Grade rápida — é CH-lote-do-drop-colado-do-excel"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
