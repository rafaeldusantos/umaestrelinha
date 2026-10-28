# CH-midia-celular-e-fonte-grande: o Resumo, o zoom e o modal no celular com a fonte do sistema grande, e a re-medida dos 44px do modal

```yaml
charter:
  id: CH-midia-celular-e-fonte-grande
  mission: "Re-medir MOD-07 depois do conserto e achar texto cortado, alvo pequeno ou rolagem lateral com fonte 130/200 %"
  mode: charter-with-tour
  persona:
    name: Adri cadastrando peças
    device: phone-large
    network: wifi-fast
    locale: pt-BR
  journey: J-ver-e-cuidar-das-fotos-da-peca
  scenarios: [PNL-midia-modal-alvos-44-em-390, PNL-midia-fonte-grande-e-telas]
  tour: Feature Tour
  time_box_minutes: 45
  guidance:
    must_try:
      - "390×844 a 100 %: getBoundingClientRect de Remover imagem n, Gerar, campo de alt, X, Concluir, vídeo no [role=dialog] — todos ≥ 44 de altura, remover visível sem hover (antes: 18×18, 73×24, 328×32)"
      - "360/390/412 a 130 e 200 % (html font-size): miniaturas, Editar mídia, Adicionar imagens, Abrir ↗, linhas de progresso, fatos do Resumo; scrollWidth do documento"
      - "Zoom a 200 %: contador, alt longo e setas de 44px"
      - "1024 e 1440 a 100 %: sem rolagem horizontal"
    must_avoid:
      - "Salvar produto real do catálogo (usar peça TESTE-85-QA- e apagá-la no fim, com os objetos que ela enviou ao Storage); qualquer chamada a *.supabase.co e **/g/collect*"
      - "Atribuir à 85 a rolagem lateral que vier do SlugField da aba Geral (anterior à 84)"
```
