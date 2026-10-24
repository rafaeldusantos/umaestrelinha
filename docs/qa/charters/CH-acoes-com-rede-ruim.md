# CH-acoes-com-rede-ruim: Ações sob rede ruim nunca dizem que gravaram o que não gravou

```yaml
charter:
  id: CH-acoes-com-rede-ruim
  mission: "Como a Adri no balcão do correio em 4G instável, salvar rastreio e registrar material com a rede falhando em cada passo, porque uma falha parcial mal dita deixa o pedido meio gravado sem ninguém saber"
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: flaky
    locale: pt-BR
  journey: J-registrar-material-e-envio
  scenarios: [MAD-acao-falha-de-rede-ao-salvar, MAD-acao-separacao-falha-no-meio, MAD-acao-rastreio-salvo-sem-status, MAD-acao-aviso-falha-gravacao-vale]
  tour: Network Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "a primeira escrita com rede cortada e com 500: Não consegui salvar. Tente de novo., pedido como estava, nunca a recusa"
      - "o segundo passo falhando (status depois do material, status depois do rastreio): a frase de falha parcial e Tentar de novo gravando só o que falta, sem segundo aviso"
      - "send-notification em 500 ou fora do ar: gravação vale, sem erro, confirmação sem e-mail, histórico dizendo que o aviso falhou"
      - "offline total com a folha aberta e ao tocar a ação: Sem conexão da 72; ao voltar a rede, nada reenviado sozinho (build servido, service worker ativo)"
    must_avoid:
      - "Realtime e painel em outra aba: é do CH-acoes-toque-duplo-e-corrida"
```
