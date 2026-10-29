# CH-menu-montar-do-zero-no-celular: a dona monta o menu inteiro pelo celular e a loja fica como ela quer

```yaml
charter:
  id: CH-menu-montar-do-zero-no-celular
  mission: "Achar o que impede a Adri de montar 5 itens com submenu em menos de 5 minutos em 390, ou a faz achar que salvou o que não salvou"
  mode: charter-with-tour
  persona:
    name: Adri montando o menu
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-montar-o-menu-da-loja
  scenarios: [PNL-menu-montar-do-zero-no-celular, PNL-menu-adicionar-categoria-com-filhas, PNL-menu-adicionar-pagina-da-loja, PNL-menu-reordenar-no-celular-sem-arraste, PNL-menu-remover-com-confirmacao, PNL-menu-previa-acompanha]
  tour: Money Tour
  time_box_minutes: 90
  guidance:
    must_try:
      - "Partir do v2 vazio (fixtura), cronometrar: 4 categorias (uma com filhas) + 1 página, reordenar só por ⋯ Mover, tirar 2 filhos, remover 1 item com confirmação"
      - "Alternar Itens do menu | Prévia a cada passo e conferir a prévia sem recarregar o iframe"
      - "Recarregar /admin/menu e conferir o documento no banco (version 2, ordem, filhos)"
      - "Toque duplo em Adicionar e em Remover"
    must_avoid:
      - "Qualquer chamada a *.supabase.co e ao GA (bloquear por HOST e **/g/collect*, nunca por substring: o regex casou o módulo src/features/google-analytics do painel e o deixou em branco)"
      - "Deixar o banco sujo: guardar store_settings.menu e o retrato de categories antes, restaurar e conferir com diff/cmp no fim; categorias de teste TESTE-86-QA- apagadas"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
