# CH-pedidos-achar-o-pedido-da-cliente: Achar e responder a cliente que mandou o número no WhatsApp

```yaml
charter:
  id: CH-pedidos-achar-o-pedido-da-cliente
  mission: "Como a Adri no celular, colar no campo de busca o que a cliente mandou (número com #, nome, e-mail, rastreio) e abrir o pedido para responder, porque é o uso de todo dia e um termo colado com sujeira não pode dar Nada por aqui."
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-ver-um-pedido
  scenarios: [MAD-pedidos-buscar-por-numero-ou-nome, MAD-pedidos-recorte-vazio, MAD-pedido-abrir-e-entender, MAD-pedido-whatsapp-da-cliente, MAD-pedido-retirada-no-escritorio]
  tour: Paste Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "#0244, 0244 e 244 colados com espaço e quebra de linha no fim; e-mail em maiúsculas; código de rastreio de saída e do envelope"
      - "vírgula e parênteses no termo, e digitar rápido trocando de termo (a resposta velha não pode ganhar)"
      - "abrir o achado e conferir cada bloco contra /admin/pedidos/<id>: gravação, descontos, total sem recalcular, histórico com nota interna e e-mail que falhou"
      - "o link WhatsApp: destino wa.me com 55 e o número certo, nova aba, sem texto pronto; pedido sem telefone válido não mostra link"
    must_avoid:
      - "Ver cliente: só na feature 76"
      - "abrir a conversa no app do WhatsApp de verdade (aparelho, blocked-verify)"
```
