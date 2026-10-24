# CH-acoes-toque-duplo-e-corrida: Toque duplo e painel em outra aba nunca gravam duas vezes nem por cima

```yaml
charter:
  id: CH-acoes-toque-duplo-e-corrida
  mission: "Como a Adri com uma mão só e o painel aberto no computador, tocar duas vezes, agir pelo cartão e pelo detalhe ao mesmo tempo e mudar o pedido no painel com a folha aberta, porque escrita dupla duplica histórico e aviso, e escrita por cima grava rastreio em pedido cancelado"
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-registrar-material-e-envio
  scenarios: [MAD-acao-toque-duplo-trava, MAD-acao-pedido-mudou-enquanto-olhava, MAD-acao-no-cartao-da-lista]
  tour: Multi-Tab Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "dois toques em eventos separados com 3G lento: uma escrita, uma linha de histórico, Salvando… travado"
      - "cartão e detalhe do mesmo pedido montados (duas abas do app): a trava por pedido vale para os dois"
      - "cancelar no painel com a folha Marcar como enviado aberta e salvar: nada gravado, nem o código, e Este pedido mudou enquanto você olhava."
      - "mudar o status no painel e tocar o rodapé antes do Realtime chegar; e o Realtime chegando com a folha aberta"
    must_avoid:
      - "conta sem papel: é do CH-acoes-conta-sem-acesso"
```
