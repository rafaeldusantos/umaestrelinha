# CH-conta-sem-acesso-no-atelie: O limite do acesso visto por quem não é admin

```yaml
charter:
  id: CH-conta-sem-acesso-no-atelie
  mission: "Como cliente com conta da loja, entrar no ateliê e confirmar que nenhum dado da loja aparece nem é pedido ao banco"
  mode: charter-with-tour
  persona:
    name: Cliente com conta da loja
    device: phone-small
    network: wifi-fast
    locale: pt-BR
  journey: J-entrar-no-atelie
  scenarios: [MAD-conta-sem-acesso-recusada]
  tour: Garbage Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "entrar com conta sem papel e ler a rede: nenhuma tabela da loja além do papel e do cadastro"
      - "digitar /pedidos e /descontos direto na barra depois da recusa"
      - "tocar Sair e voltar ao formulário"
    must_avoid:
      - "criar papel admin: fora do app"
```
