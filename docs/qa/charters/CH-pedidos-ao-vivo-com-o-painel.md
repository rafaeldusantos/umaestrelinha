# CH-pedidos-ao-vivo-com-o-painel: Pedidos mudam no celular quando a loja muda no computador

```yaml
charter:
  id: CH-pedidos-ao-vivo-com-o-painel
  mission: "Como a Adri com o painel aberto no computador e o app no celular, mudar pedidos no painel e ver o app acompanhar sem tocar em nada, porque o celular é a tela de confirmação de que o trabalho do computador valeu"
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: wifi-fast
    locale: pt-BR
  journey: J-ver-um-pedido
  scenarios: [MAD-pedidos-lista-ao-vivo, MAD-pedido-muda-com-a-tela-aberta, MAD-pedidos-selo-da-aba]
  tour: Multi-Tab Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "registrar o material no painel com o detalhe aberto no app: estado novo sem recarregar; voltar à Fila de material: o pedido saiu"
      - "pedido novo no banco com a lista rolada até a 2ª página: relê sem voltar ao topo; selo da aba e Início relidos juntos"
      - "contar canais Realtime na rede: um por montagem, fechado ao sair da tela"
      - "sair da conta numa aba com a lista aberta: nenhuma resposta em voo desenhada"
    must_avoid:
      - "mudar pedido pelo próprio app: a 74 é só leitura"
```
