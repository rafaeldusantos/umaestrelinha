## TC-FUNC-005: Confirmar o registro duas vezes não registra nem baixa nada duas vezes

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.5
**Autor:** dev
**Persona:** PER-01 Adri no celular
**Jornada:** J-01, ramo J-01c
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** duplo clique e reenvio são automatizáveis; a queda de rede fica com o explorer

### Objetivo

Um toque nervoso ou uma rede ruim não fazem a peça sair duas vezes do estoque nem o cupom contar duas vezes.

### Pré-condições

- Conta: `admin`
- Massa: M6 com estoque da peça e usos do cupom anotados
- Estado de partida: `/admin/pedidos/:id/pagamento` preenchida

### Condições reais

As da persona; rede instável no passo 3.

### Passos

1. Toca duas vezes seguidas em confirmar (e no confirmar do portão)
   - **Esperado:** o botão trava durante a gravação; um único registro no bloco e uma única linha no histórico
2. Confere estoque da peça e usos do cupom
   - **Esperado:** baixados uma vez
3. Num segundo pedido, corta a rede no meio do confirmar, restaura e confirma de novo
   - **Esperado:** um registro só; a tela diz se gravou ou não, sem duplicar

### Esperado e fonte

Registrar duas vezes não repete nenhum efeito — fonte: PRD CA-03.5.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Voltar e reenviar | depois de gravar, voltar do navegador para a tela de registrar e confirmar | diz que o pedido já está pago; nada novo gravado |
| Recarregar no envio | recarregar com o envio em curso | um registro, ou nenhum, nunca dois |
