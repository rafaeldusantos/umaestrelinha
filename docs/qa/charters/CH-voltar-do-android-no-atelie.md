# CH-voltar-do-android-no-atelie: O botão voltar em cada tela do ateliê

```yaml
charter:
  id: CH-voltar-do-android-no-atelie
  mission: "Como a Adri no celular, usar o voltar depois de cada ação (abas, login, recuperação, sair) e conferir que ele nunca leva a uma tela errada nem a dado de outra sessão"
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-entrar-no-atelie
  scenarios: [MAD-navegar-pelas-quatro-abas]
  tour: Back-Button Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "voltar entre as quatro abas"
      - "voltar depois de Sair: não pode reabrir uma aba com a sessão encerrada"
      - "voltar no meio da recuperação de senha"
    must_avoid:
      - "a saída do app pelo voltar na raiz: só no aparelho"
```
