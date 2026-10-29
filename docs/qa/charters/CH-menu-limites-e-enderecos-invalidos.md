# CH-menu-limites-e-enderecos-invalidos: o que não pode entrar no menu é recusado com motivo

```yaml
charter:
  id: CH-menu-limites-e-enderecos-invalidos
  mission: "Achar entrada inválida que é gravada, recusa sem motivo, ou item que leva a cliente a uma página que não existe"
  mode: charter-with-tour
  persona:
    name: Adri montando o menu
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-montar-o-menu-da-loja
  scenarios: [PNL-menu-outro-endereco-invalido, PNL-menu-submenu-teto-de-24, PNL-menu-categoria-repetida, PNL-menu-categoria-inativa-ou-apagada, PNL-menu-link-externo-legado]
  tour: Garbage Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "Outro endereço da loja: https://…, //host, javascript:, vazio, espaços, /sobre/, /SOBRE, /produtos/inexistente, colado com espaço no fim"
      - "Submenu até 24 e o 25º; categoria com mais de 24 filhas como item principal"
      - "Categoria repetida na raiz e no mesmo submenu; a mesma em dois submenus diferentes"
      - "Categoria de teste desativada e depois apagada em /admin/categorias; link externo legado por fixtura (editar, mover, remover; não criar outro)"
    must_avoid:
      - "Qualquer chamada a *.supabase.co e ao GA (bloquear por HOST e **/g/collect*, nunca por substring: o regex casou o módulo src/features/google-analytics do painel e o deixou em branco)"
      - "Deixar o banco sujo: guardar store_settings.menu e o retrato de categories antes, restaurar e conferir com diff/cmp no fim; categorias de teste TESTE-86-QA- apagadas"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
