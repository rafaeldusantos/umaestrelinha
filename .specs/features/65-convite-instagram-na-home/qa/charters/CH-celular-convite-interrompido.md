# CH-celular-convite-interrompido: Luciana é interrompida — e o convite não insiste

```yaml
charter:
  id: CH-celular-convite-interrompido
  mission: "Verificar que o convite aparece uma vez só, mesmo quando a vida interrompe: sair antes, recarregar com ele aberto, voltar, entrar por outra página, sem localStorage"
  mode: charter-with-tour
  persona:
    name: Luciana
    device: phone-small
    network: 4g
    locale: pt-BR
  journey: J-conhecer-o-trabalho-no-instagram
  scenarios: [IG-convite-nao-volta, IG-convite-fora-da-home, IG-convite-sem-armazenamento]
  tour: Interrupt Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "Sair da Home antes dos 3 s (navegar para um produto) e voltar: o convite deve aparecer, porque ainda não foi visto"
      - "Com o convite aberto, recarregar e depois apertar voltar e avançar: ele não deve voltar"
      - "Entrar direto por /produtos/<slug> e pela prévia (iframe + ?preview=1): sem convite"
      - "Com o localStorage lançando: a Home abre, o convite abre uma vez e não reabre na sessão"
    must_avoid:
      - "Mexer no consentimento de cookies além do necessário para liberar o convite"
```
