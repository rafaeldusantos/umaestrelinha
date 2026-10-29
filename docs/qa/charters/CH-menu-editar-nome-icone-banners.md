# CH-menu-editar-nome-icone-banners: os nomes, ícones e banners que a dona escolhe chegam à loja

```yaml
charter:
  id: CH-menu-editar-nome-icone-banners
  mission: "Achar nome que não acompanha a categoria quando devia (ou acompanha quando não devia), ícone ou banner que não chega à loja, ou editor que perde o que foi digitado"
  mode: charter-with-tour
  persona:
    name: Adri montando o menu
    device: desktop
    network: wifi-fast
    locale: pt-BR
  journey: J-montar-o-menu-da-loja
  scenarios: [PNL-menu-renomear-e-voltar-ao-padrao, PNL-menu-icone-do-item, PNL-menu-banners-do-item, PNL-menu-previa-acompanha]
  tour: Interrupt Tour
  time_box_minutes: 45
  guidance:
    must_try:
      - "Nome próprio de 40 e 41 caracteres, vazio, só espaços; religar Usar o nome da categoria"
      - "Renomear a categoria de teste em /admin/categorias com o padrão ligado e com nome próprio: conferir a loja"
      - "Ícone escolhido, trocado e tirado; buscar ícone sem acento"
      - "Banner com arte por dispositivo no Storage LOCAL; fechar o editor no meio do envio; trocar de aba e voltar"
    must_avoid:
      - "Qualquer chamada a *.supabase.co e ao GA (bloquear por HOST e **/g/collect*, nunca por substring: o regex casou o módulo src/features/google-analytics do painel e o deixou em branco)"
      - "Deixar o banco sujo: guardar store_settings.menu e o retrato de categories antes, restaurar e conferir com diff/cmp no fim; categorias de teste TESTE-86-QA- apagadas"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
