# CH-envelope-com-rede-ruim: O envelope com a rede caindo

```yaml
charter:
  id: CH-envelope-com-rede-ruim
  mission: "Como a Adri no 4G instável, salvar o código e colocar em produção com a rede falhando, porque uma tela que diz que não salvou o que salvou, ou que perde o aviso à cliente, quebra a confiança no app"
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: flaky
    locale: pt-BR
  journey: J-registrar-envelope-da-cliente
  scenarios: [MAD-envelope-rede-cai-ao-salvar, MAD-envelope-erro-fica-na-acao-certa, MAD-envelope-queda-curta-com-folha-aberta, MAD-envelope-colocar-em-producao]
  tour: Network Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "falha pura da RPC: folha aberta, alerta, nada gravado"
      - "o servidor grava e a resposta se perde com a rede caindo (route.fetch + setOffline): o que a tela diz na volta, e se o aviso saiu"
      - "um piscar de 1 s sem rede com a folha aberta e o código digitado"
      - "falha do rodapé e depois abrir o envelope; falha do envelope e depois fechar a folha"
    must_avoid:
      - "Realtime e outra aba: CH-envelope-voltar-e-outra-aba"
```
