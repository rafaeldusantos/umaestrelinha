# CH-entrar-no-atelie-pelo-celular: A primeira entrada da Adri, ponta a ponta, num celular

```yaml
charter:
  id: CH-entrar-no-atelie-pelo-celular
  mission: "Como a Adri no celular, abrir o ateliê, entrar e passar pelas quatro abas até sair, conferindo que nada mente sobre o acesso e que cada toque cabe no dedo"
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-entrar-no-atelie
  scenarios: [MAD-entrar-e-chegar-ao-inicio, MAD-reabrir-com-sessao-salva, MAD-senha-errada-mantem-email, MAD-sair-volta-ao-login]
  tour: Feature Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "abrir em 390x844 e em 360x800: splash sem tela branca, sem o formulário piscando antes dela"
      - "errar a senha uma vez e entrar na segunda, sem redigitar o e-mail"
      - "recarregar a Início (reabrir) e não ver o Login"
      - "sair, recarregar e ver o Login"
    must_avoid:
      - "qualquer conteúdo de aba: as abas são em construção na 72"
      - "iOS/Safari"
```
