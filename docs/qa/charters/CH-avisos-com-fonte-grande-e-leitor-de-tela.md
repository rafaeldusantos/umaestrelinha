# CH-avisos-com-fonte-grande-e-leitor-de-tela: a tela de avisos lida e tocada por quem precisa de fonte grande ou leitor de tela

```yaml
charter:
  id: CH-avisos-com-fonte-grande-e-leitor-de-tela
  mission: "Como a pessoa da equipe com leitor de tela, ativar e trocar interruptores ouvindo o estado, e como a Adri com fonte a 200 %, ler cada rótulo inteiro, porque um interruptor sem nome ou cortado é um evento que ninguém sabe se está ligado."
  mode: charter-with-tour
  persona:
    name: Pessoa da equipe com leitor de tela
    device: phone-small
    network: wifi
    locale: pt-BR
  journey: J-receber-aviso-de-pedido
  scenarios: [MAD-avisos-com-leitor-de-tela, MAD-avisos-fonte-grande-e-telas-estreitas, MAD-avisos-tom-memorial]
  tour: Feature Tour
  time_box_minutes: 45
  guidance:
    must_try:
      - "árvore de acessibilidade em cada estado: nome do interruptor = nome do evento, estado, aria-busy"
      - "onde o foco vai depois de ativar, de parar e de uma falha"
      - "360 px a 200 %: o rótulo Pagamento recusado da cliente inteiro, sem passar sob o trilho"
    must_avoid:
      - "TalkBack de verdade: fica blocked-verify (Android)"
```
