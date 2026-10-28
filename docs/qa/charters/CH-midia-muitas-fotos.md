# CH-midia-muitas-fotos: a peça com 28 fotos no Resumo, no zoom e no modal

```yaml
charter:
  id: CH-midia-muitas-fotos
  mission: "Achar onde o número de fotos quebra o +N, o zoom, a ordem ou a rolagem"
  mode: charter-with-tour
  persona:
    name: Adri cadastrando peças
    device: phone-large
    network: wifi-fast
    locale: pt-BR
  journey: J-ver-e-cuidar-das-fotos-da-peca
  scenarios: [PNL-midia-muitas-fotos]
  tour: Feature Tour
  time_box_minutes: 45
  guidance:
    must_try:
      - "fdc81401 (28 fotos) em 390 e 1440: +20, 'Ver mais 20 imagens', zoom abre em 9 / 28 e dá a volta"
      - "Peça de 9 fotos: '+1' e 'Ver mais 1 imagem' (singular, consertado depois da T12)"
      - "Modal Mídia com 28: arrastar a última para a primeira, rolar por dentro, a principal do Resumo muda ao vivo"
      - "Imagem que não carrega (URL quebrada interceptada): fundo neutro com o número, grade intacta"
    must_avoid:
      - "Salvar produto real do catálogo (usar peça TESTE-85-QA- e apagá-la no fim, com os objetos que ela enviou ao Storage); qualquer chamada a *.supabase.co e **/g/collect*"
      - "Salvar a peça de 28 fotos: ela é real; só olhar e fechar sem salvar"
```
