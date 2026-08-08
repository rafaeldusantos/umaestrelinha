# CH-money-pix-mobile: O caminho do dinheiro, no celular, do carrinho ao pedido pago

```yaml
charter:
  id: CH-money-pix-mobile
  mission: "Seguir o dinheiro do carrinho até orders.total no banco em 390x844, provando que o valor exibido é o valor cobrado"
  mode: charter-with-tour
  persona:
    name: Marina
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-compra-pix-celular
  scenarios: [CHK-pix-celular-happy, CHK-cta-valor-por-metodo, PAY-cpf-obrigatorio-e-valido, PAY-pix-tela-mostra-valor, ORD-confirmacao-sobrevive-reload]
  tour: Money Tour
  time_box_minutes: 90
  guidance:
    must_try:
      - "Anotar o valor do rótulo do CTA ANTES de acionar e comparar com SELECT total FROM orders"
      - "Trocar entre PIX e cartao e conferir que o rótulo muda de valor (desconto PIX de 5%)"
      - "Recarregar /pedido/:id depois da aprovação — a confirmacao tem de sobreviver"
      - "Conferir que não existe botão 'ja' paguei' na tela do PIX"
    must_avoid:
      - "Desktop — esta sessão é 390x844 do inicio ao fim"
      - "Upsell pós-compra do board 06 (fora de escopo declarado da spec)"
```

**Sessão de maior risco do ciclo, por isso a primeira.** 90 minutos porque atravessa seis
sistemas: loja, edge function, Orders API do MP, Melhor Envio, Realtime e RLS.

Pre-condição: `supabase stop && supabase start` (mounts do edge runtime) e um usuário com
e-mail `@testuser.com` (restrição do sandbox).

Fazer uma pausa aos 45 minutos. Fadiga em sessão de dinheiro produz falso positivo.

<!-- Charter durável e imutável: re-execute em ciclos futuros; o debrief de cada execução vai no
     relatório daquela execução (Session Debriefs), nunca aqui. -->
