# CH-acoes-voltar-do-android-na-folha: O voltar fecha a folha do rastreio e nunca tira a Adri do pedido

```yaml
charter:
  id: CH-acoes-voltar-do-android-na-folha
  mission: "Como a Adri no balcão do correio, abrir e fechar a folha do rastreio por todos os caminhos e recarregar com ela aberta, porque um voltar que sai do pedido ou um voltar morto depois do F5 perde o código que ela ia digitar"
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-registrar-material-e-envio
  scenarios: [MAD-acao-folha-e-voltar-do-android, MAD-acao-codigo-de-rastreio-recusado]
  tour: Back-Button Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "entrar pela lista num recorte rolado, abrir a folha, voltar: folha fechada, mesmo endereço; voltar de novo: lista no mesmo recorte e posição"
      - "Agora não, toque no fundo e Salvar com sucesso: cada um consome a entrada de histórico (o voltar seguinte vai à lista)"
      - "F5 com a folha aberta: pedido sem a folha, e o primeiro voltar leva à lista"
      - "colar o código com espaços e minúsculas e um código curto: normaliza, recusa sem rede, o foco fica preso na folha"
    must_avoid:
      - "gesto de voltar do sistema e teclado virtual reais: aparelho (blocked-verify)"
```
