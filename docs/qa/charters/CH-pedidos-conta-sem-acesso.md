# CH-pedidos-conta-sem-acesso: Uma conta sem papel nunca vê pedido nenhum no ateliê

```yaml
charter:
  id: CH-pedidos-conta-sem-acesso
  mission: "Como uma cliente da loja que tem pedidos próprios e achou o endereço do ateliê, tentar ver pedidos por todos os caminhos, porque a RLS devolve a ela os pedidos dela e só a confirmação de papel impede que pareçam ser os da loja"
  mode: charter-with-tour
  persona:
    name: Cliente com conta da loja
    device: phone-small
    network: wifi-fast
    locale: pt-BR
  journey: J-achar-um-pedido
  scenarios: [MAD-pedidos-conta-sem-papel-nao-ve-pedidos]
  tour: Garbage Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "/pedidos, /pedidos?bloco=<cada>, /pedidos/<id de um pedido dela> e /pedidos/<id de outro>: recusa, nunca linha nem bloco"
      - "conferir na rede que atelie_clock respondeu 42501 e que nenhuma linha chegou a pintar nem por um quadro"
      - "uma admin que perde o papel com a lista aberta e volta ao primeiro plano: a lista some, nem o de antes fica"
      - "rede caindo para a cliente: falha de leitura, nunca a recusa trocada por dado"
    must_avoid:
      - "criar ou mexer em contas de outras pessoas: use a conta de QA e uma cliente de fixtura"
```
