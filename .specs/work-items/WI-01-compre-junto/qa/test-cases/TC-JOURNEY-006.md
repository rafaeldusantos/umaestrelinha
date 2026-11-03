## TC-JOURNEY-006: A dona confere a adesão do período e o histórico não muda ao editar a lista

**Tipo:** journey
**Prioridade:** P1
**Origem:** CA-06.1
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** J-06, passos 1–4
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** usa a massa paga M-08, gravada pela thread no banco local antes do CH-04 e apagada ao fim da rodada (decisão D-01 do plano); os números exatos também são provados pelo probe `05-adesao.sh` (TC-INT-004)

### Objetivo

A dona lê no relatório quanto o Compre Junto vende e confia que o número de ontem não muda porque ela mexeu na lista hoje.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-08
- Estado de partida: logada

### Condições reais

As da persona.

### Entrada

`/admin/compre-junto/adesao`.

### Passos com tempo

| # | A persona… | Deve ver | Em até |
| - | ---------- | -------- | ------ |
| 1 | abre a aba Adesão | 30 dias marcado; os três números com a parte dos pagos e a média | 4 s |
| 2 | anota os números e os recortes | pedidos, peças, valor por joia e por lista | 10 s |
| 3 | tira uma peça vendida da lista "Correntes" e salva | "Lista salva." | 15 s |
| 4 | volta ao relatório | os mesmos números e a mesma peça que mais sai | 5 s |

### Objetivo e efeitos

Relatório estável diante da edição da lista.

### Caminho de abandono

Período sem pedido: o relatório diz por escrito que não houve pedido com Compre Junto (TC-FUNC-043, conferido antes da gravação da M-08).

### Esperado e fonte

"editar a lista depois não muda o relatório" — fonte: PRD CA-06.1.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| lista apagada | tira a lista das joias, apaga e volta ao relatório | os números do período não mudam |
