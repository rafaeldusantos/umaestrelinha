# CH-acoes-registrar-o-dia-no-celular: Registrar um dia de ateliê inteiro pelo celular e ver o painel concordar

```yaml
charter:
  id: CH-acoes-registrar-o-dia-no-celular
  mission: "Como a Adri no celular, levar pedidos de verdade do envelope à entrega só pelo app (Recebi o material, Iniciar separação, Marcar como enviado, Informar/Alterar, Marcar como retirado, lembrete) e conferir cada um no painel, porque uma ação que grava diferente do painel ou promete um e-mail que não saiu diz algo falso à cliente"
  mode: scenario-based
  persona:
    name: Adri no celular
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-registrar-material-e-envio
  scenarios: [MAD-acao-recebi-o-material, MAD-acao-iniciar-separacao, MAD-acao-marcar-como-enviado, MAD-acao-rastreio-informar-ou-alterar, MAD-acao-marcar-como-retirado, MAD-acao-lembrete-whatsapp, MAD-acao-sem-acao-cancelado-ou-entregue, MAD-acao-painel-ve-o-que-o-app-gravou]
  tour: Money Tour
  time_box_minutes: 90
  guidance:
    must_try:
      - "fixturas P75 (.specs/features/75-mobile-adm-acoes-do-pedido/prova/fixturas.sql): cada pedido levado até o fim, e depois de cada ação o banco (status, material, rastreio, order_status_history, order_notifications) e /admin/pedidos/<id> recarregado"
      - "a frase de cada confirmação contra A11: com a send-notification servida e a chave do Resend inválida, nenhuma frase cita e-mail; com sent verdadeiro (dublê ou chave de teste), só os eventos nomeados citam"
      - "os quatro pares da folha (shipped/delivered × sem/com código) e Alterar para o mesmo código: nenhum segundo order_shipped"
      - "o lembrete: text= decodificado igual ao do painel no mesmo instante, idade pela hora do servidor no pedido de 84 dias, e ler a mensagem como a cliente: sem nomear o material, sem urgência"
    must_avoid:
      - "enviar e-mail real ou abrir o WhatsApp real: blocked-verify"
      - "mexer em pedidos que não sejam de fixtura; limpar com prova/limpa.sql e conferir as contagens de antes"
```
