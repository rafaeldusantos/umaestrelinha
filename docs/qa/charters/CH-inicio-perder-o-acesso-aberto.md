# CH-inicio-perder-o-acesso-aberto: Perder o papel admin com a Início aberta

```yaml
charter:
  id: CH-inicio-perder-o-acesso-aberto
  mission: "Como a Adri no celular, ter o acesso de admin revogado por outra pessoa enquanto a Início está aberta, conferindo que nenhum número da loja continua na tela"
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-acompanhar-a-loja
  scenarios: [MAD-inicio-perder-acesso-com-app-aberto]
  tour: Multi-Tab Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "revogar e voltar ao app (visibilitychange)"
      - "revogar e esperar um pedido novo chegar pelo Realtime"
      - "revogar e puxar para atualizar"
      - "devolver o papel e entrar de novo"
    must_avoid:
      - "a conta admin@umaestrelinha.dev"
```
