## TC-FUNC-030: A observação interna se edita no pedido montado em todo estado menos o concluído

**Tipo:** functional
**Prioridade:** P2
**Origem:** UC-08, UC-09 (D-30, D-36)
**Autor:** dev
**Persona:** PER-02 Adri interrompida
**Jornada:** J-04, passo 2
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** —

### Objetivo

A Adri anota o que combinou só para ela, e a cliente nunca vê.

### Pré-condições

- Conta: `admin-atelie`
- Massa: pedidos montados Aberta (com observação escrita no Revisar), Expirada, Cancelada e Concluída
- Estado de partida: Montados

### Condições reais

As da persona.

### Passos

1. Abre a Aberta
   - **Esperado:** a observação escrita no Revisar
2. Edita e salva
   - **Esperado:** a observação nova
3. Repete na Expirada e na Cancelada
   - **Esperado:** editável
4. Abre a Concluída
   - **Esperado:** a observação sem edição (D-36)
5. Abre o link da Aberta na loja
   - **Esperado:** a observação não aparece

### Esperado e fonte

Fonte: PRD › Pedido montado (observação interna "pode ser editada aqui em qualquer estado […] A cliente nunca a vê"); spec D-30; D-36 (exceto concluída).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| a mesma no painel | abre no painel | a observação editada no app |
