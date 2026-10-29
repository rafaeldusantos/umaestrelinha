# CH-menu-primeiro-acesso-loja-igual: o deploy não muda o menu de ninguém

```yaml
charter:
  id: CH-menu-primeiro-acesso-loja-igual
  mission: "Achar qualquer diferença entre o menu de antes da 86 e o que a loja e o painel mostram enquanto não há v2, e qualquer gravação que aconteça sem a dona agir"
  mode: charter-with-tour
  persona:
    name: Adri montando o menu
    device: desktop
    network: wifi-fast
    locale: pt-BR
  journey: J-montar-o-menu-da-loja
  scenarios: [PNL-menu-primeiro-acesso-sem-v2, LOJA-menu-igual-antes-de-gravar, PNL-menu-reordenar-nao-mexe-no-catalogo]
  tour: Feature Tour
  time_box_minutes: 45
  guidance:
    must_try:
      - "Com store_settings.menu legado, comparar a barra (1440) e a folha (390) com a lista de prova-navegador (a), item a item, incluindo painéis e banners"
      - "Abrir /admin/menu em duas abas, recarregar, sair: o value no banco continua sem version"
      - "A primeira ação (uma chave) grava o v2 com banners e links legados preservados; a loja continua igual exceto pela mudança feita"
      - "Retrato de categories antes/depois de arrastar no notebook: cmp idêntico; Home e rodapé com a mesma ordem"
    must_avoid:
      - "Qualquer chamada a *.supabase.co e ao GA (bloquear por HOST e **/g/collect*, nunca por substring: o regex casou o módulo src/features/google-analytics do painel e o deixou em branco)"
      - "Deixar o banco sujo: guardar store_settings.menu e o retrato de categories antes, restaurar e conferir com diff/cmp no fim; categorias de teste TESTE-86-QA- apagadas"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
