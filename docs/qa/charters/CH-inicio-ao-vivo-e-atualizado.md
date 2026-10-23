# CH-inicio-ao-vivo-e-atualizado: A Início se atualiza sozinha e quando a Adri pede

```yaml
charter:
  id: CH-inicio-ao-vivo-e-atualizado
  mission: "Como a Adri no celular, deixar a Início aberta entre uma peça e outra e conferir que ela nunca fica parada com número velho: pedido novo, puxar, voltar ao app e a meia-noite"
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-acompanhar-a-loja
  scenarios: [MAD-inicio-puxar-para-atualizar, MAD-inicio-pedido-novo-ao-vivo, MAD-inicio-virada-do-dia]
  tour: Interrupt Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "um pedido pago criado no banco com a tela aberta, sem tocar em nada"
      - "puxar no topo e puxar com a tela rolada (não pode disparar)"
      - "mandar o app para o fundo e voltar"
      - "a meia-noite de Brasília com a tela aberta, sem tocar"
    must_avoid:
      - "o gesto nativo de recarregar do Chrome instalado: só no aparelho"
```
