# CH-menu-loja-depois-de-gravar: a cliente chega onde o menu promete

```yaml
charter:
  id: CH-menu-loja-depois-de-gravar
  mission: "Achar item do menu que leva a 404, página vazia, categoria que saiu do ar, ou menu diferente do que a prévia mostrou"
  mode: charter-with-tour
  persona:
    name: Cliente navegando pelo menu
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-navegar-pelo-menu-da-loja
  scenarios: [LOJA-menu-depois-de-gravar-390-e-1440, LOJA-menu-sem-categoria-sumida, LOJA-menu-barra-longa-rola, PNL-menu-desligar-celular]
  tour: Back-Button Tour
  time_box_minutes: 45
  guidance:
    must_try:
      - "Depois de uma montagem conhecida, abrir a loja em 390 e 1440 e comparar com a prévia de cada dispositivo"
      - "Tocar cada item e cada filho, voltar com o botão do navegador: a folha/o painel não reabre errado, a posição volta"
      - "Item com Celular desligado, filho desligado num dispositivo, item desligado nos dois"
      - "Documento de 20 itens: a barra rola com degradê e setas em 1024 e 1440"
    must_avoid:
      - "Qualquer chamada a *.supabase.co e ao GA (bloquear por HOST e **/g/collect*, nunca por substring: o regex casou o módulo src/features/google-analytics do painel e o deixou em branco)"
      - "Deixar o banco sujo: guardar store_settings.menu e o retrato de categories antes, restaurar e conferir com diff/cmp no fim; categorias de teste TESTE-86-QA- apagadas"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
