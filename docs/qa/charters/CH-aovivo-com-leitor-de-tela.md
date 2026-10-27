# CH-aovivo-com-leitor-de-tela: Ler a Loja ao vivo só pelo leitor de tela

```yaml
charter:
  id: CH-aovivo-com-leitor-de-tela
  mission: "Como a pessoa da equipe com TalkBack, ler a Loja ao vivo e o cartão da Início só pela árvore de acessibilidade, conferindo que cada número é anunciado com o que mede e o período, e que nada se move com menos movimento"
  mode: charter-with-tour
  persona:
    name: Equipe com TalkBack
    device: phone-large
    network: wifi-fast
    locale: pt-BR
  journey: J-ver-a-loja-ao-vivo
  scenarios: [MAD-aovivo-com-leitor-de-tela, MAD-inicio-cartao-visitas-hoje]
  tour: Feature Tour
  time_box_minutes: 45
  guidance:
    must_try:
      - "o foco no h1 ao entrar e o título do documento"
      - "os três groups com nome e a variação dentro"
      - "aria-pressed do período e o anúncio depois de trocar"
      - "o nome do cartão nos três estados"
      - "aria-busy no carregando"
      - "prefers-reduced-motion: getAnimations vazio"
    must_avoid:
      - "TalkBack real: no aparelho"
```
