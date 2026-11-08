## TC-FUNC-026: Preço que mudou enquanto a Adri montava recusa o link e mostra o resumo relido

**Tipo:** functional
**Prioridade:** P1
**Origem:** UC-08 (PRC-02)
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-01, ramo J-01d
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a mudança de preço é feita pelo painel em outra aba

### Objetivo

A cliente nunca recebe um link com um preço que a Adri não viu.

### Pré-condições

- Conta: `admin-atelie`
- Massa: uma peça de preço conhecido
- Estado de partida: passo 4 com a peça; o painel aberto em outra aba (1440) no produto

### Condições reais

As da persona.

### Passos

1. No painel, muda o preço da variação e salva
   - **Esperado:** —
2. No app, toca em "Criar link"
   - **Esperado:** "Os preços mudaram enquanto você montava. Confira o resumo." no topo; a sacola e o resumo com o preço novo; nenhum pedido montado criado
3. Toca em "Criar link" de novo
   - **Esperado:** criado com o preço novo

### Esperado e fonte

"Preço que mudou no servidor → recusa com o texto da PRC-02 e o resumo relido" — fonte: PRD › Passo 4; spec Design › Passo 4.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| promoção que venceu no meio | encerra a promoção no painel | a mesma recusa com o resumo sem a promoção |
