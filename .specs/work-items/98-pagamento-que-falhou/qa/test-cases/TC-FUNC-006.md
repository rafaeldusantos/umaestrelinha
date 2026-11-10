## TC-FUNC-006: Formulário aberto quando o pedido é pago em outra aba diz isso e não grava

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.3a
**Autor:** dev
**Persona:** PER-02 Adri no computador
**Jornada:** J-01, ramo J-01b
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** duas páginas no mesmo contexto; a aprovação pela loja (webhook) entra como integração

### Objetivo

Duas pessoas (ou duas abas) não registram o mesmo pagamento, e o comprovante de quem chegou depois não fica solto.

### Pré-condições

- Conta: `admin`
- Massa: M6
- Estado de partida: `/admin/pedidos/:id/pagamento` aberta nas abas A e B, cada uma com um comprovante anexado

### Condições reais

As da persona.

### Passos

1. Na aba A, confirma o registro
   - **Esperado:** pedido pago, registro no bloco
2. Na aba B (sem recarregar), confirma
   - **Esperado:** a tela diz que o pedido já foi pago; nenhum segundo registro; o comprovante da aba B não aparece no bloco
3. Recarrega o pedido
   - **Esperado:** um registro, só com o comprovante da aba A

### Esperado e fonte

A tela diz, não grava o registro e não guarda os comprovantes — fonte: PRD CA-03.3a; costura Decisão 11.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Aprovação pela loja | a thread aprova o pagamento do pedido (probe) com o formulário aberto | mesma recusa, mesma ausência de gravação |
