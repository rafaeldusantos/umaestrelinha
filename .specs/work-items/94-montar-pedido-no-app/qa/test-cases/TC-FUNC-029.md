## TC-FUNC-029: Editar um pedido montado aberto reabre a montagem com o que foi gravado e mantém o mesmo link

**Tipo:** functional
**Prioridade:** P1
**Origem:** UC-09 (D-41)
**Autor:** dev
**Persona:** PER-02 Adri interrompida
**Jornada:** J-04, ramo J-04c
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** "mesmo link; a versão sobe" vem da feature 89 (spec `89` › editar)

### Objetivo

A cliente pediu para trocar uma peça; a Adri corrige sem mandar outro link.

### Pré-condições

- Conta: `admin-atelie`
- Massa: pedido montado aberto com duas peças (link anotado)
- Estado de partida: o pedido montado

### Condições reais

As da persona.

### Passos

1. Toca em "Editar"
   - **Esperado:** a montagem com a cliente, a entrega, as peças, os descontos e a observação gravados
2. Troca uma peça e cria o link (salva)
   - **Esperado:** volta ao pedido montado com a peça nova; o link é o mesmo
3. Abre o link na loja
   - **Esperado:** a peça nova e o total novo

### Esperado e fonte

Fonte: PRD › Pedido montado (Editar); spec D-41; spec da 89 (editar mantém o link, a versão sobe).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| F5 durante o Editar | recarrega | recomeça como montagem vazia (D-41); o pedido montado não muda |
| fechar o Editar com o "x" | toca no "x" | a folha de sair, sem "Guardar rascunho" (Editar não usa rascunho) |
