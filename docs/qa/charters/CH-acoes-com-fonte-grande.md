# CH-acoes-com-fonte-grande: As ações não estouram com letra grande em telas estreitas

```yaml
charter:
  id: CH-acoes-com-fonte-grande
  mission: "Como a Adri com a fonte do sistema aumentada, usar rodapé, folha, botão do cartão e confirmação em 360 a 412 px a 130 % e 200 %, porque a régua da fonte grande já pegou a Início e os Últimos pedidos estourando"
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-small
    network: 4g
    locale: pt-BR
  journey: J-registrar-material-e-envio
  scenarios: [MAD-acao-fonte-grande-e-telas-estreitas]
  tour: Feature Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "360×800, 390×844 e 412×915 com a fonte raiz a 100, 130 e 200 %: scrollWidth do body = viewport no detalhe com rodapé, na folha e na lista com botão no cartão"
      - "o último bloco do detalhe rolável acima do rodapé fixo, e o rodapé acima da barra de abas"
      - "nome de cliente de 56 caracteres e número de pedido longo na confirmação e na folha; nada sobreposto nem cortado (getBoundingClientRect)"
      - "alvos de 44 px: rodapé, Informar/Alterar, lembrete, Agora não, Salvar, botão do cartão"
    must_avoid:
      - "leitor de tela: é do CH-acoes-com-leitor-de-tela"
```
