# CH-pedidos-com-leitor-de-tela-e-fonte-grande: Pedidos legíveis com leitor de tela e letra grande

```yaml
charter:
  id: CH-pedidos-com-leitor-de-tela-e-fonte-grande
  mission: "Como alguém da equipe que usa leitor de tela e a fonte do sistema no máximo, achar um pedido e ler o detalhe inteiro em telas de 360 a 412, porque a régua da fonte grande já pegou a Início estourando e a lista tem linhas mais densas"
  mode: charter-with-tour
  persona:
    name: Equipe com TalkBack
    device: phone-large
    network: wifi-fast
    locale: pt-BR
  journey: J-achar-um-pedido
  scenarios: [MAD-pedidos-com-leitor-de-tela, MAD-pedidos-fonte-grande-e-telas-estreitas, MAD-pedido-ultimos-pedidos-abre-detalhe]
  tour: Feature Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "360×800, 390×844 e 412×915 com a fonte raiz a 100, 130, 175 e 200 %: scrollWidth do body = viewport na lista e no detalhe, nada sobreposto, selo inteiro, total e número quebrando"
      - "alvos de 44 px: chips, linha, Limpar filtro, Voltar, WhatsApp, Tentar de novo, linha de Últimos pedidos"
      - "árvore de acessibilidade: chips pressed, linha com número e cliente, aba Pedidos, N precisam de você, foco no h1, título Pedidos · Ateliê e Pedido número · Ateliê, aria-busy no esqueleto"
      - "prefers-reduced-motion: esqueleto e troca de recorte parados"
    must_avoid:
      - "TalkBack real e gestos do sistema: aparelho (blocked-verify)"
```
