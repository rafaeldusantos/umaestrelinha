# CH-categorias-conversam-com-produtos: a tela nova de categorias grava e conta certo

```yaml
charter:
  id: CH-categorias-conversam-com-produtos
  mission: "Andar a tela de categorias recém-entregue conferindo o que o AD-012 já quebrou uma vez — que ela GRAVA de verdade — e se a contagem por categoria vem do servidor"
  mode: charter-with-tour
  persona:
    name: Nana
    device: desktop
    network: wifi-fast
    locale: pt-BR
  journey: J-organizar-categorias
  scenarios: [CAT-contagem-vem-do-servidor, CAT-hierarquia-e-criacao, CAT-criar-inline-sem-perder-rascunho, CAT-excluir-nomeia-quantos-perdem]
  tour: Feature Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "Criar categoria filha com pai e slug automático e CONFERIR A LINHA em categories — o PGRST204 do AD-012 passava batido por inspeção de tela"
      - "Comparar a contagem exibida com select count(*) no banco, e conferir na rede que é consulta agregada e não select('*') do catálogo"
      - "Criar categoria inline pelo formulário do produto e voltar ao produto: já marcada, rascunho intacto"
      - "Excluir uma categoria com produtos: a confirmação diz QUANTOS produtos ficam sem ela"
    must_avoid:
      - "Hierarquia no dropdown do CategoryMultiSelect (K-Pop › Girl Groups): fora de escopo declarado da 14"
      - "Ordenar categorias por arraste: fora de escopo"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
