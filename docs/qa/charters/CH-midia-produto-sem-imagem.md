# CH-midia-produto-sem-imagem: a peça nova sem foto: o vazio do Resumo e a pendência que abre o modal

```yaml
charter:
  id: CH-midia-produto-sem-imagem
  mission: "Provar o estado vazio e o caminho da pendência do checklist até a primeira foto, que a T12 não alcançou"
  mode: charter-with-tour
  persona:
    name: Adri cadastrando peças
    device: phone-large
    network: wifi-fast
    locale: pt-BR
  journey: J-ver-e-cuidar-das-fotos-da-peca
  scenarios: [PNL-midia-produto-sem-imagem, PNL-midia-resumo-mostra-a-peca]
  tour: Feature Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "/admin/produtos/novo em 390: 'Nenhuma imagem ainda' e Adicionar imagens no lugar da principal, Vídeo · não"
      - "Clicar a pendência de imagens do Pronto para publicar: abre o modal Mídia (não uma aba)"
      - "Enviar a primeira foto: vira a principal; a pendência some"
      - "Remover a única foto no modal: volta o vazio sem quebrar o Resumo"
    must_avoid:
      - "Salvar produto real do catálogo (usar peça TESTE-85-QA- e apagá-la no fim, com os objetos que ela enviou ao Storage); qualquer chamada a *.supabase.co e **/g/collect*"
```
