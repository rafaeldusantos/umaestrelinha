# CH-midia-regressoes-da-pagina: o que a página do produto fazia antes continua certo depois da troca da aba pelo modal

```yaml
charter:
  id: CH-midia-regressoes-da-pagina
  mission: "Achar onde tirar a aba Mídia e o card Prévia quebrou a variação com foto, a guarda de saída ou um caminho que ainda leva à aba"
  mode: charter-with-tour
  persona:
    name: Adri cadastrando peças
    device: desktop
    network: wifi-fast
    locale: pt-BR
  journey: J-ver-e-cuidar-das-fotos-da-peca
  scenarios: [PNL-midia-regressoes-da-pagina, PNL-variacoes-imagem-na-linha-e-envio]
  tour: Back-Button Tour
  time_box_minutes: 45
  guidance:
    must_try:
      - "Peça de teste com variação apontando a foto 2: remover a foto 2 no modal, olhar a linha em Preços & variações, salvar, conferir product_variants.image_url"
      - "Enviar foto pelo modal da variação e ver se ela aparece no fim do Resumo"
      - "Abrir sem editar, esperar 2 s, sair, voltar, F5: anotar Alterações não salvas e o rascunho, e comparar com a master (BUG-20261028-produto-abre-com-alteracoes-nao-salvas) e com uma peça TESTE recém-salva"
      - "Procurar link ou ?tab=midia que ainda leve à aba: endereço antigo, checklist, atalhos"
    must_avoid:
      - "Salvar produto real do catálogo (usar peça TESTE-85-QA- e apagá-la no fim, com os objetos que ela enviou ao Storage); qualquer chamada a *.supabase.co e **/g/collect*"
```
