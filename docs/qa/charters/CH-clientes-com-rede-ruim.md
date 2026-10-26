# CH-clientes-com-rede-ruim: abrir, buscar, paginar e reler clientes com a rede falhando de cada jeito, porque uma falh

```yaml
charter:
  id: CH-clientes-com-rede-ruim
  mission: "Como a Adri no celular em 4G instável, abrir, buscar, paginar e reler clientes com a rede falhando de cada jeito, porque uma falha que vira zero ou lista vazia diz algo falso sobre quem comprou."
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: flaky
    locale: pt-BR
  journey: J-achar-uma-cliente
  scenarios: [MAD-clientes-leitura-falha-sem-zero, MAD-clientes-carregar-mais-sem-repetir, MAD-cliente-bloco-de-pedidos-falha, MAD-abrir-sem-conexao]
  tour: Network Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "primeira leitura da lista e da ficha com 500 e com rede cortada: Não consegui carregar., nunca zero nem Ainda não há clientes."
      - "releitura falhando com dado: lista mantida + Não consegui atualizar agora.; Atualizado às é da RPC (mudar o relógio do aparelho)"
      - "página seguinte falhando no meio da rolagem e Tentar de novo: sem linha repetida"
      - "só orders ou só order_items falhando na ficha; offline total no build servido: Sem conexão e nada servido pelo service worker"
    must_avoid:
      - "conta sem acesso (CH-clientes-conta-sem-acesso)"
```
