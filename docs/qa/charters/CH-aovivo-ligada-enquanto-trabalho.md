# CH-aovivo-ligada-enquanto-trabalho: A Loja ao vivo fica aberta e viva enquanto a Adri trabalha

```yaml
charter:
  id: CH-aovivo-ligada-enquanto-trabalho
  mission: "Como a Adri no celular, deixar a Loja ao vivo e a Início abertas entre uma peça e outra e conferir que elas releem no ritmo certo só quando estão na tela, e que a linha de frescor diz a verdade"
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-ver-a-loja-ao-vivo
  scenarios: [MAD-aovivo-linha-de-frescor, MAD-aovivo-releitura-15s-so-visivel, MAD-aovivo-puxar-para-atualizar, MAD-inicio-cartao-visitas-hoje]
  tour: Interrupt Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "contar as chamadas a /rest/v1/rpc/store_movement: 15 s na tela, 30 s na Início"
      - "ocultar a aba (visibilityState + visibilitychange com bubbles: true) por mais de um intervalo e voltar"
      - "ler o frescor em 1 s, 2,9 s, 59 s, 60 s, 119 s"
      - "uma visita nova gravada pela function visit com a tela aberta e o número subindo na próxima leitura"
      - "puxar no topo, puxão curto e puxar com a tela rolada"
      - "mudar o relógio do aparelho e ver que nem o frescor nem a faixa atual mudam"
    must_avoid:
      - "o Chrome em segundo plano de verdade e o gesto nativo de recarregar: só no aparelho (blocked-verify)"
```
