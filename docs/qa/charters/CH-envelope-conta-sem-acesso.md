# CH-envelope-conta-sem-acesso: Conta sem papel não toca no envelope

```yaml
charter:
  id: CH-envelope-conta-sem-acesso
  mission: "Como a cliente da loja que achou o ateliê, e como a admin que perde o papel com a folha aberta, tentar ver e gravar o envelope, porque o código e o nome da cliente são dado da loja"
  mode: charter-with-tour
  persona:
    name: Cliente com conta da loja
    device: phone-small
    network: wifi-fast
    locale: pt-BR
  journey: J-registrar-envelope-da-cliente
  scenarios: [MAD-envelope-conta-sem-papel]
  tour: Garbage Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "entrar com a conta da loja e abrir /pedidos/<id> direto"
      - "tirar o papel da admin com a folha aberta e salvar; ler a tela a cada 60 ms"
    must_avoid:
      - "—"
```
