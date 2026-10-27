# CH-envelope-com-leitor-de-tela: O envelope lido por quem usa leitor de tela

```yaml
charter:
  id: CH-envelope-com-leitor-de-tela
  mission: "Como a pessoa da equipe com TalkBack, ler o bloco Material e registrar o código só pela árvore de acessibilidade e teclado, porque número sem contexto e foco perdido tornam o bloco ilegível"
  mode: charter-with-tour
  persona:
    name: Equipe com TalkBack
    device: phone-large
    network: wifi-fast
    locale: pt-BR
  journey: J-registrar-envelope-da-cliente
  scenarios: [MAD-envelope-com-leitor-de-tela, MAD-envelope-varios-materiais-e-espera, MAD-envelope-sem-nome-e-sem-materiais]
  tour: Feature Tour
  time_box_minutes: 45
  guidance:
    must_try:
      - "ler o bloco pela árvore: chips, espera, título, cartão, botões, links"
      - "foco ao abrir, ao fechar, depois de salvar, de copiar e de colocar em produção"
      - "o tom das frases: sem festa, sem urgência, gramática com e sem nome"
    must_avoid:
      - "TalkBack de verdade: blocked-verify"
```
