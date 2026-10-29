# CH-menu-teclado-e-leitor: montar e navegar o menu sem mouse e sem ver a tela

```yaml
charter:
  id: CH-menu-teclado-e-leitor
  mission: "Achar ação que só se faz com mouse/arraste, foco que cai no body ou some depois de um diálogo, ou controle sem nome em português"
  mode: charter-with-tour
  persona:
    name: Equipe com TalkBack
    device: desktop
    network: wifi-fast
    locale: pt-BR
  journey: J-montar-o-menu-da-loja
  scenarios: [PNL-menu-teclado-foco-e-nomes, LOJA-menu-teclado-e-fonte-grande]
  tour: Feature Tour
  time_box_minutes: 45
  guidance:
    must_try:
      - "Montar 2 itens, mover, desligar Celular, remover — só Tab/Enter/Espaço/setas/Esc"
      - "Nome acessível de cada chave (item + dispositivo + estado), do ⋯, do Mover e das abas do seletor"
      - "Foco ao abrir e fechar o seletor, o editor e a confirmação; depois de remover e de mover"
      - "Na loja (1440): abrir o mega menu, percorrer filhos e banners, Esc volta o foco ao item"
    must_avoid:
      - "Qualquer chamada a *.supabase.co e ao GA (bloquear por HOST e **/g/collect*, nunca por substring: o regex casou o módulo src/features/google-analytics do painel e o deixou em branco)"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
