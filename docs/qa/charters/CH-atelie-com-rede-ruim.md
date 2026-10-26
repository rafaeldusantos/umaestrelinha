# CH-atelie-com-rede-ruim: O ateliê sem internet e com internet que não funciona

```yaml
charter:
  id: CH-atelie-com-rede-ruim
  mission: "Como a Adri no celular, abrir e usar o ateliê sem rede e com a rede caindo e voltando, conferindo que nunca aparece número velho nem uma recusa falsa"
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: flaky
    locale: pt-BR
  journey: J-sem-conexao
  scenarios: [MAD-abrir-sem-conexao, MAD-rede-cai-com-app-aberto, MAD-rede-inutil-recusa-falsa]
  tour: Network Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "abrir offline direto em /pedidos (o navigateFallback do service worker)"
      - "a rede cai com a Início aberta e volta"
      - "Tentar de novo sem rede"
      - "rede inútil (bloquear o Supabase com o navegador dizendo online): registrar o BL-048 tal como acontece"
    must_avoid:
      - "consertar o BL-048: é dívida registrada"
```
