# CH-bump-exibido-cobrado: Caçar o centavo: o desconto do bump aparece e é cobrado?

```yaml
charter:
  id: CH-bump-exibido-cobrado
  mission: "Provar ao centavo que o total exibido com o order bump é o total cobrado, nas quatro combinações de cupom"
  mode: strategy-based
  persona:
    name: Marina
    device: phone-large
    network: wifi-fast
    locale: pt-BR
  journey: J-bump-exibido-cobrado
  scenarios: [BMP-exibido-igual-cobrado, BMP-condicoes-de-exibicao, BMP-marcar-desmarcar-nao-acumula]
  tour: Money Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "Carrinho de 3 x R$ 29,90 com cupom percent de 15% — o par exato que produziu a divergência na 08"
      - "Cupom fixed que excede o subtotal: o desconto para no subtotal, nunca vira credito"
      - "Cupom free_shipping: frete zera e o desconto PIX ainda incide sobre (subtotal - 0)"
      - "Marcar e desmarcar o bump 3x seguidas e conferir que o desconto não acumula"
    must_avoid:
      - "Aceitar diferenca de um centavo como arredondamento — aqui é FALHA"
      - "Conferir por inspecao visual: a comparação é com o banco"
```

Modo **strategy-based** (não charter-with-tour) porque a tecnica é a mensagem: probing de
valores que expõem resíduo de ponto flutuante.

Este defeito reapareceu **duas vezes** — na 08 pelo arredondamento da base do cupom, na 09 na
cláusula 'idêntico ao exibido' de BMP-04, que o Verifier deixou aberta. É a razão de esta
sessão ser a segunda do ciclo.

Pre-condição: ligar o bump em `/admin/configurações` → aba Checkout, com um produto que tenha
`stock_total > 0` e **não** esteja no carrinho.

<!-- Charter durável e imutável: re-execute em ciclos futuros; o debrief de cada execução vai no
     relatório daquela execução (Session Debriefs), nunca aqui. -->
