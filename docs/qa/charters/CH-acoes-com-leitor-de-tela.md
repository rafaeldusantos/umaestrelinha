# CH-acoes-com-leitor-de-tela: Agir num pedido só com o leitor de tela e com menos movimento

```yaml
charter:
  id: CH-acoes-com-leitor-de-tela
  mission: "Como alguém da equipe que usa leitor de tela, registrar material e salvar rastreio pelo detalhe e pelo cartão, porque uma confirmação que não é anunciada ou rouba o foco deixa a pessoa sem saber se gravou"
  mode: charter-with-tour
  persona:
    name: Equipe com TalkBack
    device: phone-large
    network: wifi-fast
    locale: pt-BR
  journey: J-registrar-material-e-envio
  scenarios: [MAD-acao-com-leitor-de-tela]
  tour: Feature Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "árvore de acessibilidade: rodapé e botão do cartão com a ação e o pedido no nome, aria-disabled e Salvando… durante a espera"
      - "confirmação em role=status sem mover o foco e sumindo sozinha; erro em role=alert ficando até a próxima ação"
      - "folha como diálogo com título, foco no campo e preso, devolvido ao rodapé ao fechar"
      - "prefers-reduced-motion: folha e confirmação aparecem paradas"
    must_avoid:
      - "TalkBack real: aparelho (blocked-verify)"
```
