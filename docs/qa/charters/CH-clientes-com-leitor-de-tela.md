# CH-clientes-com-leitor-de-tela: navegar lista e ficha só pela árvore de acessibilidade, porque cada linha precisa dizer qu

```yaml
charter:
  id: CH-clientes-com-leitor-de-tela
  mission: "Como a pessoa da equipe com TalkBack, navegar lista e ficha só pela árvore de acessibilidade, porque cada linha precisa dizer quem é, quanto comprou e se há peça em andamento."
  mode: charter-with-tour
  persona:
    name: Equipe com TalkBack
    device: phone-large
    network: wifi-fast
    locale: pt-BR
  journey: J-ver-uma-cliente
  scenarios: [MAD-clientes-com-leitor-de-tela, MAD-cliente-com-leitor-de-tela, MAD-clientes-tom-memorial, MAD-cliente-tom-memorial]
  tour: Feature Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "nome acessível de cada linha, chip selecionado, campo de busca, contagem e erros anunciados"
      - "foco no título ao abrir a ficha e ao voltar à lista; ordem de leitura dos três números e do contato"
      - "link do WhatsApp anunciando nova aba; Ver mais pedidos anunciando o que traz"
      - "ler todas as frases fixas: tom memorial, sem ranking, exclamação nem material"
    must_avoid:
      - "TalkBack no aparelho (blocked-verify)"
```
