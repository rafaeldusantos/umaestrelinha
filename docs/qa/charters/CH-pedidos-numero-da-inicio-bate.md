# CH-pedidos-numero-da-inicio-bate: O número que a Início mostra é o que a lista abre

```yaml
charter:
  id: CH-pedidos-numero-da-inicio-bate
  mission: "Como a Adri no celular, tocar cada número de Precisa de você e cada chip e conferir lista e contagem contra o painel e o banco no mesmo instante, porque um recorte errado faz cobrar material de quem já mandou ou esquecer quem espera"
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-achar-um-pedido
  scenarios: [MAD-pedidos-bloco-da-inicio-filtra-a-lista, MAD-inicio-precisa-de-voce-leva-a-pedidos, MAD-pedidos-trocar-de-visao, MAD-pedidos-endereco-sem-ou-invalido, MAD-pedidos-selo-da-aba, MAD-pedidos-recorte-vazio]
  tour: Money Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "os quatro blocos: número da Início = linha de contagem da lista = mesmo bloco em /admin/pedidos, inclusive R2 (Pix pendente fora de pending) e R1 (pago com material nulo só em Precisa de ação)"
      - "o selo da aba = Precisa de ação da Início = a visão Precisa de ação, e o selo sumindo durante a carga em vez de mostrar zero"
      - "as seis visões, conjunto de ids contra o painel (ordem pode diferir: fila do mais antigo, o resto do mais novo)"
      - "Limpar filtro, ?bloco= e ?visao= juntos, e ?visao=xyz colado"
    must_avoid:
      - "qualquer escrita (Recebi o material, rastreio): é da feature 75"
      - "filterChips.ts do painel: decidido fora de escopo (G-MAP51)"
```
