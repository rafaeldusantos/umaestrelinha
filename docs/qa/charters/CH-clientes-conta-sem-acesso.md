# CH-clientes-conta-sem-acesso: tentar ver a lista e a ficha e provar que não vê ninguém, nem a si mesma, porque a RLS dev

```yaml
charter:
  id: CH-clientes-conta-sem-acesso
  mission: "Como uma cliente com conta da loja que abriu o endereço do ateliê, tentar ver a lista e a ficha e provar que não vê ninguém, nem a si mesma, porque a RLS devolve a linha dela sem erro."
  mode: charter-with-tour
  persona:
    name: Cliente com conta da loja
    device: phone-small
    network: wifi-fast
    locale: pt-BR
  journey: J-achar-uma-cliente
  scenarios: [MAD-clientes-conta-sem-papel-nao-ve, MAD-cliente-perde-o-acesso-com-ficha-aberta]
  tour: Garbage Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "entrar com conta sem papel, com pedido próprio, e colar /clientes e /clientes/<id da própria linha de customer_list>"
      - "olhar o DOM a cada 50 ms durante a leitura: nenhum nome ou e-mail em instante nenhum"
      - "customer_list em 500 com a RPC em 403: a recusa ainda vence; RPC sem rede: falha de leitura, nunca recusa"
    must_avoid:
      - "criar conta nova: é do CH-conta-sem-acesso-no-atelie"
```
