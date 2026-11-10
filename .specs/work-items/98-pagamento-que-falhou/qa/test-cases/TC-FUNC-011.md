## TC-FUNC-011: "Avançar status" em lote deixa de fora os pedidos não pagos e diz quantos ficaram

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.9
**Autor:** dev
**Persona:** PER-02 Adri no computador
**Jornada:** J-03, passo 1, ramo J-03b
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** contagem determinística com a seleção fixa

### Objetivo

O lote continua economizando tempo nos pagos, e a dona sabe exatamente o que não avançou e por quê.

### Pré-condições

- Conta: `admin`
- Massa: dois pedidos pagos em Pago (M9 e outro) e dois não pagos (M6)
- Estado de partida: `/admin/pedidos`

### Condições reais

As da persona.

### Passos

1. Seleciona os quatro e usa "Avançar status"
   - **Esperado:** os dois pagos avançam; o resumo diz que 2 ficaram de fora por não estarem pagos
2. Abre os dois não pagos
   - **Esperado:** continuam Pendente, sem registro
3. Seleciona só os dois não pagos e aplica de novo
   - **Esperado:** nenhum avança; o resumo diz que os 2 ficaram de fora

### Esperado e fonte

O lote deixa de fora os não pagos e diz quantos — fonte: PRD CA-03.9.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Duplo clique | dois cliques no aplicar | os pagos avançam uma vez só |
