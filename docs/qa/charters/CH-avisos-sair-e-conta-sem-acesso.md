# CH-avisos-sair-e-conta-sem-acesso: sair com o aparelho inscrito, e a conta que perdeu o acesso

```yaml
charter:
  id: CH-avisos-sair-e-conta-sem-acesso
  mission: "Como a Adri no celular emprestado, sair com os avisos ligados e confirmar que o aparelho para de receber, e abrir a tela com uma conta sem papel, porque um celular que segue recebendo pedidos depois de devolvido vaza a loja."
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-small
    network: 4g
    locale: pt-BR
  journey: J-receber-aviso-de-pedido
  scenarios: [MAD-avisos-sair-para-os-avisos, MAD-avisos-conta-sem-acesso, MAD-avisos-parar-neste-celular]
  tour: Garbage Collector's Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "Sair com inscrição e a porta em 500: a pergunta, Tentar de novo e Sair mesmo assim"
      - "Sair sem inscrição: nenhuma chamada a mais"
      - "conta sem admin (a cliente da fixtura) em /avisos: recusa da 72, nenhum interruptor em instante nenhum"
    must_avoid:
      - "derrubar o papel da conta admin do seed no banco local sem restaurar"
```
