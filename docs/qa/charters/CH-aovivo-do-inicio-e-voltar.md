# CH-aovivo-do-inicio-e-voltar: Ir à Loja ao vivo e voltar sem perder o período

```yaml
charter:
  id: CH-aovivo-do-inicio-e-voltar
  mission: "Como a Adri no celular, ir e voltar entre a Início e a Loja ao vivo por todos os caminhos (cartão, botão Voltar, gesto do Android, F5, link colado) e conferir que o período escolhido nunca se perde nem vira a URL"
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-ver-a-loja-ao-vivo
  scenarios: [MAD-aovivo-abrir-pelo-cartao, MAD-aovivo-voltar-mantem-periodo]
  tour: Back-Button Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "Ontem e Semana na Início, abrir pelo cartão e voltar pelos dois caminhos"
      - "F5 em /ao-vivo e depois Voltar"
      - "/ao-vivo colado numa aba nova (abre em Hoje, e o Voltar substitui por /)"
      - "history.state com período inválido"
      - "conferir que a barra de abas não aparece e que o foco cai no h1"
    must_avoid:
      - "o gesto de voltar do Android real: blocked-verify"
```
