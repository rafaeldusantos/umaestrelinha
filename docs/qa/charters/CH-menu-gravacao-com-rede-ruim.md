# CH-menu-gravacao-com-rede-ruim: a falha de gravação nunca diz Salvo

```yaml
charter:
  id: CH-menu-gravacao-com-rede-ruim
  mission: "Achar gravação que falha e a tela diz Salvo, perde o que estava no menu, ou leitura que falha e mostra o vazio"
  mode: charter-with-tour
  persona:
    name: Adri montando o menu
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-montar-o-menu-da-loja
  scenarios: [PNL-menu-falha-de-rede-ao-gravar]
  tour: Network Tour
  time_box_minutes: 45
  guidance:
    must_try:
      - "PATCH de store_settings em 500 e abortado, em adicionar, mover, remover, chave e editor"
      - "Resposta perdida depois de o servidor gravar (route.fetch + setOffline antes de responder): o que a tela diz, e o que o banco tem ao recarregar"
      - "Leitura inicial em 500 e offline: faixa de erro com Tentar de novo, nunca o vazio; Tentar de novo com sucesso"
      - "4g lento (atraso de 3 s): Salvando… visível, controles não deixam enfileirar ação duplicada"
    must_avoid:
      - "Qualquer chamada a *.supabase.co e ao GA (bloquear por HOST e **/g/collect*, nunca por substring: o regex casou o módulo src/features/google-analytics do painel e o deixou em branco)"
      - "Deixar o banco sujo: guardar store_settings.menu e o retrato de categories antes, restaurar e conferir com diff/cmp no fim; categorias de teste TESTE-86-QA- apagadas"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
