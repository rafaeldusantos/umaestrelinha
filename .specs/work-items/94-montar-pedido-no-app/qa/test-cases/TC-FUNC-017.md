## TC-FUNC-017: A folha da variação troca a foto, desliga a esgotada e não deixa passar do estoque somando a sacola

**Tipo:** functional
**Prioridade:** P0
**Origem:** UC-06 (D-22)
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-01, passo 5
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** —

### Objetivo

A Adri escolhe a variação certa pela foto e nunca promete uma peça que não tem.

### Pré-condições

- Conta: `admin-atelie`
- Massa: peça com três variações — uma com foto própria e estoque 3, uma sem foto própria, uma esgotada
- Estado de partida: passo 2, sacola vazia

### Condições reais

As da persona.

### Passos

1. Abre a peça
   - **Esperado:** a folha na primeira variação com estoque; a foto grande dela; "A foto troca com a variação escolhida."; chips com miniatura, nome e "N em estoque"; a esgotada desligada com "Esgotada"
2. Toca na variação sem foto própria
   - **Esperado:** a foto grande vira a capa da peça
3. Na de estoque 3, quantidade 2, "Acrescentar · R$ X"
   - **Esperado:** o toast "Peça acrescentada." com "<nome> · <variação>"; R$ X = preço da variação × 2
4. Abre a mesma variação de novo e pede 2
   - **Esperado:** "Só há 3 em estoque." e o botão desligado

### Esperado e fonte

Fonte: PRD › Passo 2 (foto grande que troca, esgotada desligada, "Só há 3 em estoque."); spec Design › folha da variação; D-22 (o teto soma a sacola).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| quantidade 0 | apaga a quantidade | mínimo 1 |
| duplo toque em "Acrescentar" | toca duas vezes | uma linha só |
