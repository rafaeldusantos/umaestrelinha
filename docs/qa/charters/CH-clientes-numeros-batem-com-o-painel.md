# CH-clientes-numeros-batem-com-o-painel: conferir que contagens, recortes, selos e totais do app são os do painel e do SQL, porque 

```yaml
charter:
  id: CH-clientes-numeros-batem-com-o-painel
  mission: "Como a Adri no celular, conferir que contagens, recortes, selos e totais do app são os do painel e do SQL, porque a regra de em aberto e de recorrente foi escrita uma vez em core e uma vez em SQL."
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-achar-uma-cliente
  scenarios: [MAD-clientes-bate-com-o-painel, MAD-clientes-recortes-e-selo, MAD-clientes-carregar-mais-sem-repetir, MAD-cliente-numeros-so-pagos, MAD-cliente-pedidos-batem-com-o-total, MAD-cliente-email-com-underscore-nao-mistura]
  tour: Money Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "as três contagens de chip contra /admin/clientes (Voltaram) e select count(*) from customer_list com os mesmos predicados; selo Em aberto nas mesmas linhas do chip"
      - "cliente só com Pix expirado, com compra paga e outra em aberto, e com pedido pending+approved: quem aparece em aberto"
      - "somar as janelas até o fim (48 pessoas): 48 ids distintos; ficha de convidada e de conta: pedidos listados = orders_total"
      - "o par P76VROSA_RJ / P76VROSAXRJ: nenhum pedido trocado"
    must_avoid:
      - "Realtime: a 76 não o tem"
      - "gravar qualquer coisa no banco fora das fixturas"
```
