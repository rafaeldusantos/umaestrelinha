# CH-envelope-registrar-o-codigo-da-cliente: Registrar o código que a cliente colou no WhatsApp

```yaml
charter:
  id: CH-envelope-registrar-o-codigo-da-cliente
  mission: "Como a Adri entre uma peça e outra, colar no app o código que a cliente mandou pelo WhatsApp e registrar, porque um código gravado errado leva a cliente e a Adri a um rastreio que não existe"
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-registrar-envelope-da-cliente
  scenarios: [MAD-envelope-informar-codigo, MAD-envelope-colar-do-whatsapp, MAD-envelope-alterar-duas-vezes, MAD-envelope-copiar-e-ver-nos-correios, MAD-envelope-painel-grava-o-mesmo]
  tour: Paste Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "colar com espaços, NBSP, quebra de linha, espaço de largura zero, marcas de direção, hífen e ponto, e a frase inteira da mensagem"
      - "salvar, alterar com o mesmo código e com outro, em seguida; conferir aviso, foco, histórico e order_notifications"
      - "Copiar código e conferir a área de transferência; Ver nos Correios e voltar"
      - "gravar pelo card do painel e ler no app"
    must_avoid:
      - "layout por viewport × fonte: já medido pela prova da feature (45 combinações)"
```
