# CH-aovivo-conta-sem-acesso: Conta sem papel não vê a Loja ao vivo

```yaml
charter:
  id: CH-aovivo-conta-sem-acesso
  mission: "Como alguém com uma conta sem papel de admin (ou a Adri perdendo o papel com a tela aberta), tentar ver a Loja ao vivo e conferir que nenhum número aparece em momento nenhum"
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-ver-a-loja-ao-vivo
  scenarios: [MAD-aovivo-conta-sem-papel-recusada]
  tour: Garbage Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "/ao-vivo colado com conta sem papel"
      - "a resposta 403 42501 numa releitura com números na tela (interceptada): a recusa sem nenhum número do cache"
      - "o intervalo parando depois da recusa"
      - "o par: 500 é falha, não recusa"
    must_avoid:
      - "tirar o papel do admin do seed no banco compartilhado"
```
