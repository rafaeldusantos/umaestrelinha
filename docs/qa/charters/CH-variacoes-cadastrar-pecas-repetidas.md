# CH-variacoes-cadastrar-pecas-repetidas: cadastrar peças parecidas sem refazer a grade à mão

```yaml
charter:
  id: CH-variacoes-cadastrar-pecas-repetidas
  mission: "Achar onde a grade automática, as sugestões do catálogo e a imagem na linha deixam a dona sem saída, com dado errado ou com trabalho repetido"
  mode: charter-with-tour
  persona:
    name: Adri cadastrando peças
    device: phone-large
    network: wifi-fast
    locale: pt-BR
  journey: J-cadastrar-peca-com-variacoes
  scenarios: [PNL-variacoes-linha-nasce-ativa-com-padroes, PNL-variacoes-sugestao-de-nome-e-valores, PNL-variacoes-remover-valor-vendido-pausa, PNL-variacoes-renomear-e-segunda-opcao, PNL-variacoes-nome-repetido-ou-vazio, PNL-variacoes-imagem-na-linha-e-envio, PNL-variacoes-modal-com-muitas-fotos, PNL-variacoes-salvar-e-reabrir-sem-mudar, PNL-variacoes-fonte-grande-e-390, PNL-variacoes-grade-rapida-canario]
  tour: Data
  time_box_minutes: 90
  guidance:
    must_try:
      - "Escolher Tamanho e Cor pelos nomes sugeridos e conferir o que 'Usar os N valores' acrescenta de verdade no catálogo local"
      - "Tirar um valor do meio e devolver; salvar; olhar product_variants.position no banco"
      - "Abrir o modal de imagem do produto com mais fotos do catálogo (28) em 390"
      - "Remover o valor de uma variação que tem pedido"
    must_avoid:
      - "Salvar produto real do catálogo (usar produto de teste e apagá-lo no fim)"
```
