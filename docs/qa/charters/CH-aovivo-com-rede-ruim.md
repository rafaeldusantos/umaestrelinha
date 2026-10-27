# CH-aovivo-com-rede-ruim: A Loja ao vivo com rede ruim nunca mostra número falso

```yaml
charter:
  id: CH-aovivo-com-rede-ruim
  mission: "Como a Adri no celular com 3G instável, abrir e deixar aberta a Loja ao vivo com leituras que falham, demoram ou voltam, e conferir que ela nunca inventa zero nem esconde que não atualizou"
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: 3g-flaky
    locale: pt-BR
  journey: J-ver-a-loja-ao-vivo
  scenarios: [MAD-aovivo-leitura-falha-tentar-de-novo, MAD-aovivo-linha-de-frescor, MAD-inicio-cartao-visitas-hoje]
  tour: Network Tour
  time_box_minutes: 45
  guidance:
    must_try:
      - "a primeira leitura com 500 e com a rede caída: Não consegui carregar. + Tentar de novo, sem número e sem aria-busy"
      - "Tentar de novo com sucesso e com nova falha (o foco não cai no body)"
      - "uma releitura falhando com números na tela"
      - "resposta lenta (traços, seletor desabilitado)"
      - "o cartão da Início em falha: o toque relê e não navega"
      - "a rede some e volta (a tela Sem conexão da 72)"
    must_avoid:
      - "500 tratado como recusa: só 42501 é recusa"
```
