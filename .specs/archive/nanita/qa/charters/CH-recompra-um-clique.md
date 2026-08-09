# CH-recompra-um-clique: A colecionadora que volta: quantos campos ela ainda digita?

```yaml
charter:
  id: CH-recompra-um-clique
  mission: "Medir se quem já comprou fecha a próxima sem redigitar endereço nem CPF"
  mode: charter-with-tour
  persona:
    name: Marina
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-recompra-endereco-salvo
  scenarios: [ADR-blocos-colapsados-na-recompra, ADR-um-unico-endereco-default, PAY-cpf-persistido-e-preenchido]
  tour: Autofill Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "Comprar duas vezes com a mesma conta e contar quantos campos foram digitados na segunda"
      - "Na segunda compra, conferir que o bloco Entrega nasce COLAPSADO com 2+ opções cotadas"
      - "Editar o endereço e conferir no banco que continua UM único is_default"
    must_avoid:
      - "Andar com apenas 1 opção de frete cotada — com uma só o bloco já colapsava antes do fix"
```

30 minutos: escopo estreito, mas é a promessa central da 08 para o publico real da loja.

ADR-02 **já falhou uma vez** exatamente aqui: com 2+ opções cotadas o bloco abria expandido,
porque colapsar exige frete selecionado e nada pré-selecionava. Andar com 2+ opções é o ponto.

<!-- Charter durável e imutável: re-execute em ciclos futuros; o debrief de cada execução vai no
     relatório daquela execução (Session Debriefs), nunca aqui. -->
