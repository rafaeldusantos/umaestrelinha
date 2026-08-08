# CH-snapshot-backoffice: O pedido criado na loja é operável no backoffice?

```yaml
charter:
  id: CH-snapshot-backoffice
  mission: "Comprar na loja e tentar cotar a etiqueta desse pedido no backoffice — o contrato entre as duas superfícies aguenta?"
  mode: collaborative
  persona:
    name: Léo
    device: desktop
    network: wifi-fast
    locale: pt-BR
  journey: J-frete-real-melhor-envio
  scenarios: [SHP-snapshot-destrava-backoffice]
  tour: Feature Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "Comprar na loja (mobile), depois abrir o pedido em /admin/pedidos e clicar em cotar na aba Melhor Envio"
      - "Conferir no banco que orders.address_zip tem 8 dígitos SEM máscara e address_complement foi gravado"
      - "Conferir que shipping_service_id, shipping_carrier e delivery_estimate_min/max estão preenchidos"
      - "Recotar no backoffice e confirmar que o pedido já criado NÃO tem seus valores alterados"
    must_avoid:
      - "Criar o pedido direto por SQL — o defeito vive no mapper da loja, não no schema"
      - "Imprimir etiqueta ou criar envio de verdade no Melhor Envio (fora de escopo: é operação real)"
```

## Por que esta sessão existe separada

É a única do ciclo que **atravessa duas superfícies**, e por isso a única que pega este defeito.

Antes da `08`, `AddressStep` não devolvia o CEP e `orders.address_zip` ficava nulo. O backoffice faz
`order.address_zip.replace(/\D/g, '')` em `MelhorEnvioTab.tsx:71` — ou seja, **TypeError em qualquer
pedido criado pela loja**. Nenhum teste de componente pega isso: a loja passava (o pedido era criado),
o backoffice passava (com pedido de fixture que tinha CEP), e a jornada entre os dois estava quebrada.

É o caso de livro do que a `journeys-and-flows` chama de *"a breakage lives between the pages"*.

**Modo `collaborative`** porque a sessão precisa das duas cadeiras: quem compra na loja e quem opera o
pedido no admin. Se rodar sozinho, comprar primeiro e trocar de superfície depois — mas registrar o
`order_id` para não perder qual pedido conferir.

**Desktop na persona, mobile na compra.** O backoffice é ferramenta de mesa; a compra que alimenta ele
nasce no celular, como 90% das compras reais. A sessão começa em 390px na loja e termina em 1440 no
admin.
