# CH-clientes-ficha-ao-vivo-e-troca-de-conta: mudar o que a ficha mostra por fora e ver se o app relê sem mentir, porque a 76 decidiu nã

```yaml
charter:
  id: CH-clientes-ficha-ao-vivo-e-troca-de-conta
  mission: "Como a Adri com duas abas abertas, mudar o que a ficha mostra por fora e ver se o app relê sem mentir, porque a 76 decidiu não ter Realtime e precisa reler ao voltar."
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-ver-uma-cliente
  scenarios: [MAD-cliente-muda-com-a-ficha-aberta, MAD-cliente-perde-o-acesso-com-ficha-aberta, MAD-clientes-troca-de-conta-limpa-tela]
  tour: Multi-Tab Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "pedido novo e pago da cliente em outra aba: ao voltar ao app ou puxar, números, selo e lista de pedidos acompanham"
      - "retirar o papel admin da conta em /admin/usuarios com a ficha aberta: a recusa assume ao reler"
      - "cliente apagada com a ficha aberta: Não encontrei esta cliente."
    must_avoid:
      - "esperar atualização sem ação: não existe"
```
