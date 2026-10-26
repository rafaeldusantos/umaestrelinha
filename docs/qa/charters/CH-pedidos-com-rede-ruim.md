# CH-pedidos-com-rede-ruim: A lista e o pedido sob rede ruim nunca mentem

```yaml
charter:
  id: CH-pedidos-com-rede-ruim
  mission: "Como a Adri no celular em 4G instável, abrir, rolar, buscar e reler pedidos com a rede falhando de cada jeito, porque uma falha que vira Nada por aqui. ou número velho diz algo falso sobre a loja"
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: flaky
    locale: pt-BR
  journey: J-achar-um-pedido
  scenarios: [MAD-pedidos-leitura-falha, MAD-pedidos-rolar-sem-repetir, MAD-pedido-bloco-secundario-falha, MAD-pedidos-selo-da-aba]
  tour: Network Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "primeira leitura da lista e do detalhe com 500 e com rede cortada: Não consegui carregar., nunca Nada por aqui. nem recusa"
      - "releitura (puxar no topo) falhando com dado: Atualizado às hora + Não consegui atualizar agora., sem esqueleto"
      - "próxima página falhando no meio da rolagem, depois Tentar de novo: sem linha repetida; inserir pedido no banco entre duas páginas"
      - "só order_items ou order_status_history falhando no detalhe; offline total: Sem conexão da 72 e nada servido pelo service worker (build servido)"
    must_avoid:
      - "Realtime ao vivo: é do CH-pedidos-ao-vivo-com-o-painel"
```
