# CH-menu-duas-janelas-e-toque-duplo: duas janelas não apagam o trabalho uma da outra

```yaml
charter:
  id: CH-menu-duas-janelas-e-toque-duplo
  mission: "Achar sobrescrita silenciosa entre duas abas, conflito falso numa aba só, ou ação aplicada duas vezes"
  mode: charter-with-tour
  persona:
    name: Adri montando o menu
    device: desktop
    network: wifi-fast
    locale: pt-BR
  journey: J-montar-o-menu-da-loja
  scenarios: [PNL-menu-conflito-entre-janelas]
  tour: Multi-Tab Tour
  time_box_minutes: 45
  guidance:
    must_try:
      - "Aba A adiciona um item, aba B (sem recarregar) move outro: B recebe O menu mudou em outra janela — recarregue e o banco tem só o de A"
      - "Na mesma aba, cinco ações seguidas rápidas (chaves, mover): nenhuma vira conflito, o banco tem as cinco"
      - "Toque duplo em Mover para baixo e em Adicionar"
      - "Depois do conflito, recarregar e refazer: grava"
    must_avoid:
      - "Qualquer chamada a *.supabase.co e ao GA (bloquear por HOST e **/g/collect*, nunca por substring: o regex casou o módulo src/features/google-analytics do painel e o deixou em branco)"
      - "Deixar o banco sujo: guardar store_settings.menu e o retrato de categories antes, restaurar e conferir com diff/cmp no fim; categorias de teste TESTE-86-QA- apagadas"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
