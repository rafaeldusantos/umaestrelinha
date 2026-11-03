## TC-FUNC-042: O relatório abre por joia principal e por lista, com a peça que mais sai e a linha "direto no produto"

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-06.2, CA-06.4
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** J-06, passo 3
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** usa a massa M-08, gravada pela thread no banco local antes do CH-04 (decisão D-01 do plano)

### Objetivo

A dona descobre quais joias e quais listas levam o conjunto, e qual corrente sai mais.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-08 com vendas por lista e por adicional "Uma peça só", e uma lista sem venda
- Estado de partida: aba Adesão

### Condições reais

As da persona.

### Passos

1. Olhar "Por joia principal"
   - **Esperado:** por joia: pedidos, peças, valor com barra, "Peça que mais sai" com a variação (ex.: "<peça> · 45 cm")
2. Trocar para "Por lista"
   - **Esperado:** por lista: peças, valor, peça que mais sai (sem coluna Pedidos); a linha "Peça escolhida direto no produto"; a lista sem venda com 0 peças, R$ 0,00 e "—"

### Esperado e fonte

Fonte: PRD CA-06.2, CA-06.4; protótipo do painel (Adesão).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| lista apagada depois da venda | apaga a lista e volta | registrar a linha que representa a lista apagada |
