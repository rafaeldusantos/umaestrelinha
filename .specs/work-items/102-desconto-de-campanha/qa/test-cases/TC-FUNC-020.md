## TC-FUNC-020: Os filtros e a ordenação da vitrine usam o preço com desconto

**Tipo:** functional
**Prioridade:** P2
**Origem:** R-06 — PRD RN-10
**Autor:** dev
**Persona:** PER-02 Marina
**Jornada:** J-03, passo 3
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** pedido de automação E2E

### Objetivo

A cliente que filtra por "até R$ X" ou ordena por preço encontra a peça em oferta pelo preço que vai pagar.

### Pré-condições

- Conta: `anonima`
- Massa: Black Friday em vigência; M-A..M-D marcadas
- Estado de partida: `/ofertas` e a coleção de M-A

### Condições reais

as da persona

### Passos

1. Ordena `/ofertas` por menor preço
   - **Esperado:** a ordem segue o preço com desconto que cada cartão mostra
2. Na coleção de M-A, liga "Com desconto"
   - **Esperado:** M-A aparece
3. Na coleção de M-A, põe a faixa de preço com o teto entre o preço com desconto e o cheio de M-A
   - **Esperado:** M-A aparece (entra pelo preço com desconto)

### Esperado e fonte

Durante a vigência, a peça de campanha aparece em "Com desconto", entra na faixa e é ordenada pelo preço com
desconto — fonte: PRD RN-10; `spec.md` T8.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| maior preço | ordena por maior preço | ordem pelo preço com desconto |
| limites da régua | olha o mínimo e o máximo da faixa de preço | calculados pelo preço com desconto |
