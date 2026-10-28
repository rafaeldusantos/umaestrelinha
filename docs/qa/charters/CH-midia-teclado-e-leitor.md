# CH-midia-teclado-e-leitor: zoom e modal Mídia só pelo teclado e pela árvore de acessibilidade

```yaml
charter:
  id: CH-midia-teclado-e-leitor
  mission: "Achar foco perdido, nome acessível errado ou estado não anunciado no Resumo, no zoom e no modal"
  mode: charter-with-tour
  persona:
    name: Equipe com TalkBack
    device: desktop
    network: wifi-fast
    locale: pt-BR
  journey: J-ver-e-cuidar-das-fotos-da-peca
  scenarios: [PNL-midia-teclado-e-leitor, PNL-midia-zoom-percorrer]
  tour: Feature Tour
  time_box_minutes: 45
  guidance:
    must_try:
      - "Tab até a 3ª miniatura, Enter, ←/→, Esc: foco volta a 'Ampliar imagem 3 de N'"
      - "Editar mídia, Enter, Tab por todo o modal (foco preso), Esc e depois Concluir: foco volta a 'Editar mídia' (consertado depois da T12)"
      - "Snapshot de acessibilidade: nomes das imagens, do +N, do véu Solte para enviar, das linhas de progresso e do toast de falha"
      - "Pendência de imagens do checklist por teclado abre o modal e o foco entra nele"
    must_avoid:
      - "Salvar produto real do catálogo (usar peça TESTE-85-QA- e apagá-la no fim, com os objetos que ela enviou ao Storage); qualquer chamada a *.supabase.co e **/g/collect*"
```
