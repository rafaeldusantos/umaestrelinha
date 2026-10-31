# CH-montado-da-conversa-ao-pix: A venda combinada no WhatsApp chega ao PIX da cliente com o mesmo valor, do painel ao celular

```yaml
charter:
  id: CH-montado-da-conversa-ao-pix
  mission: "A venda combinada no WhatsApp chega ao PIX da cliente com o mesmo valor, do painel ao celular"
  mode: charter-with-tour
  persona:
    name: Adri montando uma venda → Cliente de luto pelo link
    device: desktop 1440 (painel) e phone-large 390×844 (loja)
    network: wifi-fast
    locale: pt-BR
  journey: J-montar-pedido-para-a-cliente
  scenarios: [PNL-montado-venda-com-cupom-e-combinado, PNL-montado-copiar-e-whatsapp, LOJA-montado-concluir-sem-conta-pix, PNL-montado-pedido-nascido-mostra-origem, PNL-montado-aba-montados-estados]
  tour: Money Tour
  time_box_minutes: 90
  guidance:
    must_try:
      - "cliente nova, duas peças (variação + gravação), cupom 10 %, R$ 20 combinados; total contra o banco"
      - "abrir o link copiado em contexto anônimo 390, com uma peça qualquer já na sacola da loja"
      - "trocar o número da casa, escolher entrega e PIX; conferir orders.total = link = painel"
      - "reabrir o link depois de concluir"
    must_avoid:
      - "não deixar e-mail real sair (RESEND_API_KEY inválida no env das functions); não tocar o hospedado (*.supabase.co e **/g/collect* bloqueados); não pagar de verdade (Mercado Pago só de teste)"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
