# CH-formulario-nao-perde-o-trabalho: interromper o cadastro no meio, várias vezes

```yaml
charter:
  id: CH-formulario-nao-perde-o-trabalho
  mission: "Interromper o cadastro em todos os pontos possíveis — F5, sair da tela, Descartar, salvar com pendência em aba fechada — para descobrir onde o formulário perde trabalho ou esconde o erro"
  mode: charter-with-tour
  persona:
    name: Dora
    device: laptop
    network: wifi-fast
    locale: pt-BR
  journey: J-nao-perder-o-trabalho-no-formulario
  scenarios: [PRD-erro-em-aba-fechada-aponta, PRD-rascunho-sobrevive-ao-f5, PRD-saida-e-descarte-pedem-confirmacao, PRD-checklist-e-resumo-dizem-a-verdade]
  tour: Interrupt Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "Preencher só o nome e clicar Salvar e publicar sem NUNCA abrir a aba Preços; conferir badge com contagem por aba e foco no primeiro campo inválido"
      - "Alterar um campo, dar F5, aceitar restaurar; depois abrir OUTRO produto e conferir que o rascunho não vazou entre produtos"
      - "Clicar Descartar e conferir que a confirmação nomeia o que se perde; cancelar e verificar que nada foi apagado"
      - "Preço 0 com custo preenchido (sem card de margem, nada de -Infinity) e Resumo mostrando FAIXA de preço num produto com grade"
    must_avoid:
      - "Eixos, grade e publicação até a loja — são CH-cadastro-de-produto-com-grade"
      - "sessionStorage cheio: comportamento declarado (falha em silêncio), não bug"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
