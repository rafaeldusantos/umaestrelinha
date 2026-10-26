# CH-recuperar-acesso-pelo-celular: A recuperação por código com a confiança baixa

```yaml
charter:
  id: CH-recuperar-acesso-pelo-celular
  mission: "Como a Adri recuperando o acesso, pedir o código, errar, esperar o reenvio e gravar a senha nova, conferindo que a instrução nunca fala em link"
  mode: scenario-based
  persona:
    name: Adri recuperando o acesso
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-recuperar-acesso
  scenarios: [MAD-recuperar-acesso-por-codigo, MAD-codigo-errado-ou-vencido]
  tour: Interrupt Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "e-mail com espaços e maiúsculas: o envio vai para o normalizado"
      - "código com 5 dígitos e com letras"
      - "tentar reenviar antes de 60 s"
      - "fechar no passo do código e voltar: recomeça do e-mail?"
    must_avoid:
      - "código real por e-mail: fica blocked-verify sem o Mailpit"
```
