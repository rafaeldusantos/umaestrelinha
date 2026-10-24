# CH-acoes-conta-sem-acesso: Uma conta sem papel nunca muda um pedido pelo ateliê

```yaml
charter:
  id: CH-acoes-conta-sem-acesso
  mission: "Como uma cliente da loja com pedidos próprios, e como uma admin que perde o papel com o pedido aberto, tentar cada ação, porque a RLS faz o update afetar zero linhas sem erro e só a conferência do efeito impede um sucesso falso"
  mode: charter-with-tour
  persona:
    name: Cliente com conta da loja
    device: phone-small
    network: wifi-fast
    locale: pt-BR
  journey: J-registrar-material-e-envio
  scenarios: [MAD-acao-conta-sem-papel-nao-grava]
  tour: Garbage Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "admin que perde o papel em /admin/usuarios com o detalhe aberto e toca Recebi o material (not_admin) e Marcar como enviado (zero linhas + 42501): recusa da 72, orders igual antes e depois"
      - "a cliente abrindo /pedidos/<id de um pedido dela>: nunca o rodapé, nunca uma escrita na rede"
      - "a sessão caindo (logout em outra aba) com uma ação no ar: nenhuma confirmação desenhada"
    must_avoid:
      - "criar contas de pessoas reais: use a conta de QA e uma cliente de fixtura; devolver o papel no fim"
```
