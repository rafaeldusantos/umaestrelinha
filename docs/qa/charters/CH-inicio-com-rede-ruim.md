# CH-inicio-com-rede-ruim: A Início com rede caindo, lenta e com uma leitura quebrada

```yaml
charter:
  id: CH-inicio-com-rede-ruim
  mission: "Como a Adri no celular com 4G instável, usar a Início com a rede caindo, lenta e com uma das leituras falhando, conferindo que nunca aparece um zero no lugar de uma falha nem número velho sem a hora"
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: flaky
    locale: pt-BR
  journey: J-acompanhar-a-loja
  scenarios: [MAD-inicio-rede-cai-e-volta, MAD-inicio-leitura-falha-sem-numero]
  tour: Network Tour
  time_box_minutes: 45
  guidance:
    must_try:
      - "a rede cai com a Início aberta e volta (o D1 da prova)"
      - "uma das duas leituras falha na abertura: só o bloco dela diz que não carregou"
      - "a releitura falha com números na tela: Não consegui atualizar agora. e a hora"
      - "3G lento: o esqueleto, e a troca de período durante a carga"
    must_avoid:
      - "BL-048 (fechada na 72): não reabrir sem sintoma novo"
```
