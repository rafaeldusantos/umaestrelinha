# CH-clientes-do-pedido-a-ficha-e-voltar: andar Início, Pedidos, pedido, Ver cliente, ficha, pedido dela e voltar de todas as formas

```yaml
charter:
  id: CH-clientes-do-pedido-a-ficha-e-voltar
  mission: "Como a Adri no celular, andar Início, Pedidos, pedido, Ver cliente, ficha, pedido dela e voltar de todas as formas, porque o voltar do Android é por onde ela sai de cada tela."
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-ver-uma-cliente
  scenarios: [MAD-cliente-ver-cliente-do-pedido, MAD-cliente-pedido-dela-e-voltar, MAD-clientes-voltar-mantem-lista, MAD-cliente-inexistente-ou-id-ruim, MAD-pedido-voltar-mantem-recorte]
  tour: Back-Button Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "Ver cliente de uma convidada e de uma conta: a ficha é a do e-mail do pedido; toque duplo = uma navegação"
      - "voltar encadeado: ficha → pedido → lista, cada um no recorte, busca e rolagem certos; F5 e link direto na ficha, depois voltar"
      - "/clientes/abc e /clientes/<uuid inexistente>: frase, saída, e nada na rede para o malformado"
      - "recorte e busca ativos na lista, abrir ficha, voltar: chip, campo e posição iguais"
    must_avoid:
      - "botão de voltar do sistema em aparelho real (blocked-verify)"
```
