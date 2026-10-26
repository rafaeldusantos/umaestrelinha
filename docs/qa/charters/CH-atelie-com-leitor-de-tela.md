# CH-atelie-com-leitor-de-tela: Entrar e navegar só pelo que o leitor de tela anuncia

```yaml
charter:
  id: CH-atelie-com-leitor-de-tela
  mission: "Como a pessoa da equipe com TalkBack, entrar e navegar pelas abas só pela árvore de acessibilidade, conferindo rótulos, anúncios e ordem de foco"
  mode: charter-with-tour
  persona:
    name: Equipe com TalkBack
    device: phone-large
    network: wifi-fast
    locale: pt-BR
  journey: J-entrar-no-atelie
  scenarios: [MAD-entrar-e-chegar-ao-inicio, MAD-navegar-pelas-quatro-abas]
  tour: Feature Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "a splash anuncia algo (role status) e não prende o foco"
      - "campos com rótulo, botão de mostrar senha com nome"
      - "as abas com nome e aria-current"
      - "a tela sem conexão anuncia Ainda sem conexão."
    must_avoid:
      - "TalkBack real: no aparelho; aqui é a árvore de acessibilidade"
```
