# CH-montado-fonte-grande-teclado-e-privacidade: Painel e link funcionam a 200 % e só com teclado, e o token não sai do lugar

```yaml
charter:
  id: CH-montado-fonte-grande-teclado-e-privacidade
  mission: "Painel e link funcionam a 200 % e só com teclado, e o token não sai do lugar"
  mode: charter-with-tour
  persona:
    name: Cliente de luto pelo link e Adri montando uma venda
    device: phone-large 390 a 100/130/200 % e desktop 1440 só teclado
    network: wifi-fast
    locale: pt-BR
  journey: J-concluir-pedido-montado
  scenarios: [LOJA-montado-fonte-grande-e-teclado, PNL-montado-fonte-grande-e-teclado, LOJA-montado-token-fora-de-tudo]
  tour: Feature Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "scrollWidth a 390 em 100/130/200 % na montagem, na proposta, na aba, no link e no pagamento"
      - "do campo de cliente ao Criar link só com Tab/Enter/Espaço; foco devolvido ao fechar diálogos"
      - "token: barra, sessionStorage, todas as requisições, meta robots, sitemap"
    must_avoid:
      - "não deixar e-mail real sair (RESEND_API_KEY inválida no env das functions); não tocar o hospedado (*.supabase.co e **/g/collect* bloqueados); não pagar de verdade (Mercado Pago só de teste)"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
