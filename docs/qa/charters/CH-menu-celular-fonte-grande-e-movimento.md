# CH-menu-celular-fonte-grande-e-movimento: a tela e o menu da loja aguentam fonte grande e movimento reduzido

```yaml
charter:
  id: CH-menu-celular-fonte-grande-e-movimento
  mission: "Achar nome de item reduzido a reticências, controle abaixo de 44, rolagem lateral do body ou animação que ignora movimento reduzido"
  mode: charter-with-tour
  persona:
    name: Adri montando o menu
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-montar-o-menu-da-loja
  scenarios: [PNL-menu-fonte-grande-e-telas, PNL-menu-movimento-reduzido, LOJA-menu-teclado-e-fonte-grande]
  tour: Feature Tour
  time_box_minutes: 45
  guidance:
    must_try:
      - "/admin/menu a 100/130/200 % em 360, 390, 1024 e 1440: largura do nome da linha principal e do submenu, scrollWidth do body, controles < 44"
      - "Seletor e editor (folha de baixo) a 200 % em 390: o botão Salvar/Adicionar alcançável"
      - "Loja em 390/200 % com a folha aberta e um acordeão aberto"
      - "emulateMedia reducedMotion=reduce no painel e na loja"
    must_avoid:
      - "Reprovar a 86 pelos alvos pequenos já conhecidos e anteriores a ela (X do Dialog, busca do MenuIconPicker, barra do palco da prévia) — anotar como re-found"
      - "Qualquer chamada a *.supabase.co e ao GA (bloquear por HOST e **/g/collect*, nunca por substring: o regex casou o módulo src/features/google-analytics do painel e o deixou em branco)"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
