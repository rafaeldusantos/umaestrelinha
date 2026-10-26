# CH-inicio-com-leitor-de-tela: Ler a Início só pelo leitor de tela

```yaml
charter:
  id: CH-inicio-com-leitor-de-tela
  mission: "Como a pessoa da equipe com TalkBack, ler a Início só pela árvore de acessibilidade, conferindo que cada número é anunciado com o que ele mede e o período, e que nada se move com menos movimento"
  mode: charter-with-tour
  persona:
    name: Equipe com TalkBack
    device: phone-large
    network: wifi-fast
    locale: pt-BR
  journey: J-acompanhar-a-loja
  scenarios: [MAD-inicio-com-leitor-de-tela]
  tour: Feature Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "a ordem de leitura de cima para baixo e os nomes das regiões"
      - "o período marcado anunciado (aria-pressed) e o número depois de trocar"
      - "o esqueleto aria-busy e a hora Atualizado às em aria-live"
      - "texto a 200% e prefers-reduced-motion"
    must_avoid:
      - "TalkBack real: no aparelho"
```
