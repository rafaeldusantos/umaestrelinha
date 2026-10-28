# CH-midia-arrastar-arquivo: arrastar arquivo para o Resumo e para o modal Mídia

```yaml
charter:
  id: CH-midia-arrastar-arquivo
  mission: "Achar onde o arrastar não mostra o véu, deixa o véu preso, envia o que não é arquivo ou difere do botão"
  mode: charter-with-tour
  persona:
    name: Adri cadastrando peças
    device: desktop
    network: wifi-fast
    locale: pt-BR
  journey: J-ver-e-cuidar-das-fotos-da-peca
  scenarios: [PNL-midia-arrastar-arquivo]
  tour: Feature Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "dragenter/dragover/drop no Resumo: 'Solte para enviar', depois a linha de progresso"
      - "Arrastar por cima e sair sem soltar (dragleave): o véu some?"
      - "Soltar texto ou link selecionado: nada é enviado"
      - "Colar uma imagem com o modal aberto e soltar arquivo no modal: mesmo caminho"
    must_avoid:
      - "Salvar produto real do catálogo (usar peça TESTE-85-QA- e apagá-la no fim, com os objetos que ela enviou ao Storage); qualquer chamada a *.supabase.co e **/g/collect*"
      - "Dar por provado o arrasto nativo do Finder/Explorer: em Playwright é sintético; deixar como Human Verification"
```
