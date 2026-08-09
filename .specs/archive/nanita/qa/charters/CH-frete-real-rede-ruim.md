# CH-frete-real-rede-ruim: O frete cotado aguenta rede ruim e terceiro fora do ar?

```yaml
charter:
  id: CH-frete-real-rede-ruim
  mission: "Verificar que a cotação do Melhor Envio degrada com dignidade e que o frete cobrado é sempre o cotado"
  mode: charter-with-tour
  persona:
    name: Marina
    device: phone-large
    network: flaky
    locale: pt-BR
  journey: J-frete-real-melhor-envio
  scenarios: [SHP-opcoes-com-data-de-entrega, SHP-cotacao-indisponivel-nao-bloqueia, SHP-trocar-cep-descarta-frete, SHP-fronteira-frete-gratis, SHP-dimensoes-reais-na-cotacao]
  tour: Network Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "Derrubar a edge function melhor-envio e conferir o fallback 'Frete padrão' com aviso visível"
      - "Digitar um CEP, esperar a cotação em voo, e trocar o CEP antes de responder"
      - "Carrinho de exatamente R$ 150,00 contra threshold 150 — a fronteira >= que já sobreviveu a um mutante"
      - "Comparar cotação de produto COM dimensao cadastrada vs SEM (os fallbacks 11/2/16/0,1)"
    must_avoid:
      - "Assumir que a data exibida está certa sem conferir contra delivery_estimate no banco"
```

**Network Tour** porque a cotação é chamada de terceiro: é onde rede ruim revela se o produto
degrada ou trava. Rede `flaky` é a realidade da Marina no transporte.

O cenário `SHP-snapshot-destrava-backoffice` **não** está nesta sessão: ele atravessa para o
backoffice e ganhou charter próprio (CH-snapshot-backoffice).

<!-- Charter durável e imutável: re-execute em ciclos futuros; o debrief de cada execução vai no
     relatório daquela execução (Session Debriefs), nunca aqui. -->
