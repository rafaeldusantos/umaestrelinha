# CH-envelope-voltar-e-outra-aba: Voltar, F5 e outra aba com a folha do envelope aberta

```yaml
charter:
  id: CH-envelope-voltar-e-outra-aba
  mission: "Como a Adri com o app e o painel abertos, voltar, recarregar e mudar o pedido por outro lugar com a folha aberta, porque uma folha que fica valendo para um pedido que mudou grava o que não devia"
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: wifi-fast
    locale: pt-BR
  journey: J-registrar-envelope-da-cliente
  scenarios: [MAD-envelope-voltar-e-f5-com-folha, MAD-envelope-outra-aba-com-folha-aberta, MAD-envelope-cancelado]
  tour: Back-Button Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "voltar, avançar e voltar de novo com a folha aberta e o campo preenchido"
      - "F5 com a folha aberta, e o voltar depois"
      - "outra aba registra o recebimento; o painel grava o código"
    must_avoid:
      - "o gesto do Android real: blocked-verify"
```
