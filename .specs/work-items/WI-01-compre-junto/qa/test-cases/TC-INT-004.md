## TC-INT-004: O relatório conta só pedidos pagos e não cancelados, soma a quantidade da linha e não muda com a lista editada

**Tipo:** integration
**Prioridade:** P1
**Origem:** CA-06.3, CA-06.5, CA-06.1
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** J-06
**Charter:** CH-04 (não executado na sessão: fica com o Dev)
**Situação:** ativo
**Automação:** target `integration` · status `missing`
**Spec:** —
**Nota:** os números exatos dependem de pedidos pagos, cancelados e pendentes que o navegador local não produz; provado pelo probe `05-adesao.sh` (transação desfeita, `p_agora` em 2030) e por `compreJuntoAdesaoSchema`

### Objetivo

O número que a dona lê bate com a régua de venda do Dashboard.

### Pré-condições

- Conta: `admin-painel`
- Massa: pedido pago com corrente quantidade 2 pela lista; pedido pago e cancelado; pedido pendente; marca cujo principal não está no pedido
- Estado de partida: banco local

### Condições reais

As da persona.

### Passos

1. Ler o relatório do período
   - **Esperado:** o cancelado e o pendente fora; a corrente conta 2 peças; a marca sem principal no pedido não conta
2. Tirar a peça da lista e apagar a lista; ler de novo
   - **Esperado:** os mesmos números

### Esperado e fonte

Fonte: PRD CA-06.1, CA-06.3, CA-06.5.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| período fora de 7/30/90 | pede outro período | recusado |
