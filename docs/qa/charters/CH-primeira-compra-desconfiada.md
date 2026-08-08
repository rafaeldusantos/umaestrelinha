# CH-primeira-compra-desconfiada: Primeira compra de quem desconfia da loja

```yaml
charter:
  id: CH-primeira-compra-desconfiada
  mission: "Descobrir onde a primeira visita perde a confiança: login inesperado, CPF sem explicação, copy que promete o que a loja não faz"
  mode: scenario-based
  persona:
    name: Bia
    device: phone-small
    network: 4g
    locale: pt-BR
  journey: J-compra-pix-celular
  scenarios: [AUTH-overlay-preserva-carrinho, CHK-um-bloco-aberto, CHK-cta-desabilitado-incompleto, PAY-cpf-obrigatorio-e-valido]
  tour: Feature Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "Chegar em /checkout deslogada e FECHAR o overlay sem entrar — o carrinho sobrevive?"
      - "Ler o bloco de CPF como quem nunca comprou: a justificativa responde 'por que vocês querem isso'?"
      # SUPERADO pela feature 10-emails-transacionais: a loja passou a enviar de verdade.
      # Mantido por o charter se declarar durável — o que mudou está na linha seguinte.
      - "SUPERADO (feature 10) — era: conferir que a tela não promete e-mail de confirmacao"
      - "O e-mail chegou? E o botão dele, aberto DESLOGADA numa janela anônima, cai em /conta com o overlay de login — ou dá 'Pedido não encontrado'?"
      - "Pedido ainda não pago: a tela promete comprovante enviado (mentira) ou aviso futuro (verdade)?"
      - "phone-SMALL (375px): texto embrulhando em pílula, alvo de toque, scroll horizontal do body"
    must_avoid:
      - "Usar dados salvos — Bia é conta nova, tudo em branco"
```

Modo **scenario-based**: uma história realista em linguagem comum, não uma varredura de features.

`phone-small` de proposito. A Marina roda em phone-large; é no 375px que pílula, badge e lane de
item quebram primeiro.

<!-- Charter durável e imutável: re-execute em ciclos futuros; o debrief de cada execução vai no
     relatório daquela execução (Session Debriefs), nunca aqui. -->
