## TC-FUNC-013: Com CEP da Bahia e a faixa alcançada, a sacola informa que o frete grátis é só para Sul e Sudeste e soma o frete, como o checkout

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-17 (PRD 99 UC-09, RN-17)
**Autor:** dev
**Persona:** PER-02 Cida
**Jornada:** J-02, passos 2, 4 e 5
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** dinheiro, P0, determinístico

### Objetivo

Cida precisa ver, com o CEP de Salvador, que paga o frete — dito como informação, não como recusa — e pagar o mesmo
valor no checkout.

### Pré-condições

- Conta: cliente-salvador
- Massa: Sul + Sudeste, R$ 450; peças ≥ R$ 450; fixture A
- Estado de partida: gaveta acima da faixa, sem CEP

### Condições reais

As da persona.

### Passos

1. Calcula com 40020-000
   - **Esperado:** a faixa vira uma linha neutra "Frete grátis só para Sul e Sudeste" + ⓘ, sem barra, sem "faltam" e sem
     valor/faixa; a mais barata marcada com o preço cheio (sem "Grátis", sem risco); o Total soma o frete; sem
     exclamação, sem "infelizmente"
2. Toca no ⓘ
   - **Esperado:** "Para Salvador/BA, o frete é o da cotação." seguido da regra inteira
3. Segue ao checkout e confere Entrega e Resumo
   - **Esperado:** a mesma opção cobrada e o mesmo Total da gaveta

### Esperado e fonte

"Frete grátis só para Sul e Sudeste", sem barra, frete da cotação somado ao Total, na gaveta e no checkout — fonte: PRD
99 CA-17, UC-09, RN-17; `spec.md` › Design › "CEP fora da campanha".

### Variações

| Variação                     | Ação                                          | Esperado                                       |
| ---------------------------- | --------------------------------------------- | ---------------------------------------------- |
| Abaixo da faixa              | reduz a sacola para menos de R$ 450            | a mesma linha neutra, sem "Faltam R$ X"        |
| Borda da região              | 39999-999 (Sudeste) e 40000-000 (Nordeste)     | o primeiro libera, o segundo fica fora         |
| 1440 × 900                   | repete a comparação gaveta × checkout           | o mesmo Total                                  |
