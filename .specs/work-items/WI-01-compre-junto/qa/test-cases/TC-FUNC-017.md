## TC-FUNC-017: A barra fixa do celular mostra o total e "Conjunto · N peças" com o conjunto, e o preço com PIX sem ele

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-04.9
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passo 5
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** a barra fixa é o botão de compra do celular (~90% dos acessos)

### Objetivo

O que a barra fixa diz é o que ela leva.

### Pré-condições

- Conta: anonima
- Massa: M-01
- Estado de partida: sacola vazia, 390 × 844

### Condições reais

As da persona.

### Passos

1. Sem nada marcado, olhar a barra
   - **Esperado:** o preço do pingente e "X no PIX"; botão "Adicionar à sacola"
2. Marcar dois adicionais completos
   - **Esperado:** o total do conjunto (igual ao do bloco) e "Conjunto · 3 peças", sem o preço no PIX; botão "Levar o conjunto"
3. Desmarcar um
   - **Esperado:** "Conjunto · 2 peças" e o total recalculado

### Esperado e fonte

Fonte: PRD CA-04.9.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| marcado incompleto | marca A1 sem escolher a peça | registrar N e total vistos (plano assume, 🟡: N conta os marcados, o total soma só os completos) |
