## TC-FUNC-041: O relatório mostra pedidos, peças e valor do Compre Junto no período de 7, 30 ou 90 dias

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-06.1, CA-06.4
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** J-06, passos 1–2
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** usa a massa paga M-08, gravada pela thread no banco local antes do CH-04 (decisão D-01 do plano); os números exatos da régua também são provados pelo probe 05 (TC-INT-004); a sessão confere tela, período e coerência com a M-08

### Objetivo

A dona lê, em segundos, se o Compre Junto vende.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-08
- Estado de partida: logada

### Condições reais

As da persona; repetir em 390 (cartões).

### Passos

1. Abrir a aba Adesão
   - **Esperado:** 30 dias marcado; "Pedidos com Compre Junto" com "X% dos N pedidos pagos"; "Peças levadas junto" com "n,n por pedido, em média"; "Valor das peças levadas junto"; a nota "Conta pedidos pagos e não cancelados, no dia de Brasília — a mesma régua do Dashboard. …"
2. Trocar para 7 e para 90 dias
   - **Esperado:** os números mudam conforme a massa do período

### Esperado e fonte

Fonte: PRD CA-06.1, CA-06.4; textos do protótipo do painel (Adesão).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| 390 | abre em 390 | cartões no lugar da tabela, sem rolagem lateral |
