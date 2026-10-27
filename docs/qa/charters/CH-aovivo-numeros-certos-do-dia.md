# CH-aovivo-numeros-certos-do-dia: Os números da Loja ao vivo batem com o banco

```yaml
charter:
  id: CH-aovivo-numeros-certos-do-dia
  mission: "Como a Adri no celular, abrir a Loja ao vivo pelo cartão da Início e conferir, período por período, que Visitas, Vendas, Conversão, a variação e o gráfico dizem a verdade sobre a loja, sem tom festivo"
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-ver-a-loja-ao-vivo
  scenarios: [MAD-inicio-cartao-visitas-hoje, MAD-aovivo-abrir-pelo-cartao, MAD-aovivo-numeros-batem-com-o-banco, MAD-aovivo-trocar-periodo-sem-ler, MAD-aovivo-grafico-por-faixas, MAD-aovivo-contador-recente-parado-ou-antigo, MAD-aovivo-tom-memorial]
  tour: Money Tour
  time_box_minutes: 90
  guidance:
    must_try:
      - "a fixtura de .specs/features/83-loja-ao-vivo/prova/fixtura.sql e limpa.sql no fim, conferindo contra le-movimento.sql"
      - "o número do cartão igual ao Visitas da faixa em Hoje, e o Visitas de cada período igual ao da faixa naquele período"
      - "conversão com zero visitas (—), com zero vendas (0,0%) e acima de 100%"
      - "variação +, −, 0% e sem base, e a régua da metade (+12,5 ⇒ +13, −12,5 ⇒ −13)"
      - "Hoje à 0h (sem variação) e numa hora qualquer (vs ontem até as {h}h)"
      - "faixa atual dourada só na barra, futuras sem número, faixa anterior à contagem sem número"
      - "teto do dia, visitas sem hora e contador parado (fixtura própria ou resposta interceptada)"
      - "resposta sem a chave acessos (banco antigo): números sem variação e a frase estática do gráfico"
      - "procurar emoji, exclamação, pessoas, vermelho"
    must_avoid:
      - "db reset, migration up ou escrita no banco compartilhado fora da fixtura e do limpa.sql (ou de begin…rollback)"
      - "tela com e-mail ou telefone de cliente real"
```
