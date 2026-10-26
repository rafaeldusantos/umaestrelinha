# CH-avisos-ligar-e-receber-o-pedido: ligar o aviso no celular e chegar ao pedido pago por ele

```yaml
charter:
  id: CH-avisos-ligar-e-receber-o-pedido
  mission: "Como a Adri no celular, ligar o aviso neste aparelho, receber o aviso de um pedido pago disparado duas vezes e tocar nele, porque é a razão de a feature existir e um aviso duplicado ou que abre o lugar errado ensina a ignorar todos."
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-receber-aviso-de-pedido
  scenarios: [MAD-avisos-ativar-neste-celular, MAD-avisos-aviso-de-pedido-chega-uma-vez, MAD-avisos-tocar-abre-o-pedido, MAD-avisos-historico-canal-celular]
  tour: Money Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "no build servido com push dublado: ativar, F5, conferir os quatro interruptores na ordem e o corpo do subscribe"
      - "no Chrome real (se a pessoa estiver presente): permitir, disparar payment_approved duas vezes pelo script de fixtura e contar os avisos"
      - "abrir /pedidos/<id> e /admin/pedidos/<id> e conferir a linha Celular ao lado da de e-mail"
    must_avoid:
      - "e-mail real: fixtura com os e-mails pré-marcados sent; o .env local tem chave do Resend"
      - "afirmar a chegada real sem Chrome com FCM ou Android: fica blocked-verify"
```
