# CH-leitor-de-tela-checkout: Comprar de ponta a ponta usando leitor de tela

```yaml
charter:
  id: CH-leitor-de-tela-checkout
  mission: "Verificar se o acordeão, o erro de CPF e a timeline do pedido são compreensíveis por quem não vê a tela"
  mode: charter-with-tour
  persona:
    name: Sofia
    device: phone-large
    network: wifi-fast
    locale: pt-BR
  journey: J-compra-pix-celular
  scenarios: [ORD-timeline-sem-depender-de-cor, CHK-um-bloco-aberto, AUTH-overlay-preserva-carrinho]
  tour: Back-Button Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "Navegar os 3 blocos só por teclado/leitor: a mudança de bloco aberto é anunciada?"
      - "Errar o CPF de proposito: o erro é lido junto do campo ou só aparece visualmente?"
      - "Ler a timeline de /pedido/:id: dá para saber o estágio sem enxergar cor?"
      - "Voltar (back) do overlay de login e de dentro do checkout — foco preso em algum lugar?"
    must_avoid:
      - "Usar o mouse para 'ajudar' quando travar — travar É o achado"
```

**Back-Button Tour** combina com leitor de tela: é o tour que expoe foco preso, ordem de
tabulação furada e modal que não escapa.

A timeline monocromatica da 08 existe por este motivo — substituiu cinco badges coloridas de
status. Esta sessão é quem valida se a substituição funcionou de fato.

<!-- Charter durável e imutável: re-execute em ciclos futuros; o debrief de cada execução vai no
     relatório daquela execução (Session Debriefs), nunca aqui. -->
