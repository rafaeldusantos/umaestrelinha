## TC-FUNC-008: Desfazer com motivo devolve o pedido a Pendente, sem e-mail, e guarda observação e comprovantes no histórico

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.11, CA-03.14
**Autor:** dev
**Persona:** PER-02 Adri no computador
**Jornada:** J-02, passos 3–4
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** o Mailpit confere a ausência de e-mail

### Objetivo

Um registro feito no pedido errado se corrige sem deixar o pedido "pago" de mentira e sem a cliente receber nada.

### Pré-condições

- Conta: `admin`
- Massa: M7 (registrado à mão, em Pago); Mailpit vazio para o pedido
- Estado de partida: `/admin/pedidos/<M7>`

### Condições reais

As da persona.

### Passos

1. Toca em "Desfazer" no bloco Pagamento
   - **Esperado:** pede o motivo; não abre o portão de e-mail
2. Tenta confirmar sem motivo
   - **Esperado:** não confirma e diz que falta o motivo (🟡 assumido no plano)
3. Escreve "registrado no pedido errado" e confirma
   - **Esperado:** pedido em "Pendente"; pagamento no estado de antes do registro; sem data de pagamento; histórico com o desfazer, quem, quando e o motivo; a observação e os comprovantes do registro continuam consultáveis no histórico; "Registrar pagamento" volta a aparecer
4. Confere o Mailpit
   - **Esperado:** nenhum e-mail novo para a cliente

### Esperado e fonte

Desfazer com motivo, efeitos devolvidos, histórico, sem e-mail — fonte: PRD CA-03.11, CA-03.14; costura Decisão 6.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Registrar de novo | registrar outra vez depois de desfazer | grava; o histórico mostra os dois registros e o desfazer |
| Antes do registro era "recusado" | desfazer num pedido M2 recusado e registrado | o pagamento volta a recusado, não a pendente |
