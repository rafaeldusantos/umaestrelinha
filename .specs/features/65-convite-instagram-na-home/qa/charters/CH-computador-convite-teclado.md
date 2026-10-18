# CH-computador-convite-teclado: Teresa e Carla no computador — cartão central, teclado e leitor

```yaml
charter:
  id: CH-computador-convite-teclado
  mission: "Confirmar que no computador o convite é um cartão central que se usa inteiro pelo teclado e se anuncia direito ao leitor de tela — e que o rodapé aponta para o mesmo perfil"
  mode: charter-with-tour
  persona:
    name: Teresa
    device: desktop
    network: wifi-fast
    locale: pt-BR
  journey: J-conhecer-o-trabalho-no-instagram
  scenarios: [IG-convite-cartao-computador, IG-convite-teclado-e-leitor, IG-rodape-link-instagram]
  tour: Feature Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "Em 1440×900, 1024 e 768: medir largura e centro do cartão; conferir que o puxador não aparece"
      - "Só teclado: o foco entra no diálogo, Tab circula só dentro dele, Enter no botão abre o perfil, Esc fecha e devolve o foco"
      - "Árvore de acessibilidade: role dialog com nome = título e descrição = texto; X com rótulo em português"
      - "Canário: o link do rodapé aponta para https://www.instagram.com/umaestrelinha.adri"
    must_avoid:
      - "Auditoria completa de acessibilidade da Home (fora do escopo)"
```
