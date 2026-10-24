# CH-pedidos-voltar-do-android: O voltar do Android me devolve onde eu estava

```yaml
charter:
  id: CH-pedidos-voltar-do-android
  mission: "Como a Adri no celular, entrar em pedidos por todos os caminhos (bloco, chip, rolagem longa, Últimos pedidos, link colado) e voltar a cada passo, porque perder o lugar numa fila de sessenta é o atrito que faz largar o app"
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-ver-um-pedido
  scenarios: [MAD-pedido-voltar-mantem-recorte, MAD-pedido-ultimos-pedidos-abre-detalhe, MAD-pedido-inexistente, MAD-pedidos-trocar-de-visao]
  tour: Back-Button Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "bloco → rolar até a 3ª página → abrir uma linha → voltar: mesmo recorte, mesma posição, sem esqueleto"
      - "trocar cinco chips e voltar: sai da lista de uma vez, não passeia pelos chips"
      - "Últimos pedidos → detalhe → voltar: Início; link /pedidos/<id> colado ou F5 → voltar: lista"
      - "/pedidos/<uuid inexistente> e /pedidos/abc: Não encontrei este pedido. + Voltar aos pedidos"
    must_avoid:
      - "a saída do app pelo voltar na raiz: aparelho (blocked-verify)"
```
