## TC-FUNC-005: O rascunho volta só com as peças e os descontos depois de o app fechar

**Tipo:** functional
**Prioridade:** P1
**Origem:** UC-02 (D-15, D-19, D-42)
**Autor:** dev
**Persona:** PER-02 Adri interrompida
**Jornada:** J-03, passos 2–4; ramos J-03c, J-03d
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** —

### Objetivo

O que a Adri montou volta; o que é da cliente não fica no celular.

### Pré-condições

- Conta: `admin-atelie`
- Massa: cliente; duas peças (uma com gravação); cupom válido
- Estado de partida: `/pedidos/montar`

### Condições reais

As da persona.

### Passos

1. Escolhe a cliente, acrescenta as duas peças (uma com gravação e quantidade 2), aplica o cupom, liga o combinado com valor e motivo
   - **Esperado:** o resumo com tudo
2. Fecha a aba e abre `/pedidos/montar` numa aba nova
   - **Esperado:** "Rascunho retomado: …"; as peças com variação, quantidade e gravação; o cupom (conferido de novo pela prévia); o valor do combinado
3. Olha o passo 1 e o campo do motivo
   - **Esperado:** nenhuma cliente escolhida; motivo vazio
4. Sai da conta, entra de novo e abre "Montar pedido"
   - **Esperado:** sem rascunho

### Esperado e fonte

"a montagem guarda no celular um rascunho só das peças e dos descontos, sem dado da cliente" — fonte: PRD › Pedido montado; spec D-15, D-19 (o motivo não), D-42 (preso à conta; a linha refeita do catálogo).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| peça desativada antes de reabrir | desativa no painel | a peça não volta e o aviso a conta |
| preço mudou antes de reabrir | muda no painel | a linha volta com o preço de hoje |
| Editar um pedido montado | abre Editar e fecha a aba | não grava nem lê rascunho |
