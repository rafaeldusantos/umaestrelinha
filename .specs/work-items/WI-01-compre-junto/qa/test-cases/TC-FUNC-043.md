## TC-FUNC-043: Sem pedido com Compre Junto no período, o relatório diz isso por escrito

**Tipo:** functional
**Prioridade:** P2
**Origem:** CA-06.4
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** J-06, ramo J-06a
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** é o estado do banco local sem pedidos pagos com a marca; determinístico

### Objetivo

A dona não confunde "nada vendido" com "relatório quebrado".

### Pré-condições

- Conta: `admin-painel`
- Massa: nenhum pedido pago com Compre Junto no período escolhido
- Estado de partida: aba Adesão

### Condições reais

As da persona.

### Passos

1. Abrir a aba Adesão em 7 dias
   - **Esperado:** um texto escrito dizendo que não houve pedido com Compre Junto no período; nenhuma divisão por zero ("NaN", "Infinity") nos indicadores

### Esperado e fonte

Fonte: PRD CA-06.4 ("sem pedido com Compre Junto no período, o relatório diz isso por escrito").

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| — | — | — |
