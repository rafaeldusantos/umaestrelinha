## TC-INT-001: E-mail à cliente ao registrar segue a escolha do portão, e a dona não recebe o aviso interno

**Tipo:** integration
**Prioridade:** P1
**Origem:** CA-03.8
**Autor:** dev
**Persona:** PER-01 Adri no celular
**Jornada:** J-01, passos 6–7
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `integration` — status `missing`
**Spec:** —
**Nota:** o efeito se confere no Mailpit (:54444), fora da tela

### Objetivo

A dona decide se a cliente fica sabendo; a caixa da dona não recebe aviso de um pagamento que ela mesma registrou.

### Pré-condições

- Conta: `admin`
- Massa: três pedidos M6 — dois sem material, um que espera material; "Pagamento confirmado", "Instruções do material" e o aviso interno de pedido pago ligados (M17)
- Estado de partida: `/admin/pedidos/:id/pagamento`

### Condições reais

As da persona.

### Passos

1. Registra o primeiro com o e-mail marcado no portão
   - **Esperado:** Mailpit: um "pagamento confirmado" para a cliente; nenhum aviso interno para a dona
2. Registra o segundo com o e-mail desmarcado
   - **Esperado:** Mailpit: nada para a cliente nem para a dona; o histórico registra que o aviso foi pulado
3. Registra o que espera material, com o e-mail marcado
   - **Esperado:** Mailpit: as instruções de envio do material, não o "pagamento confirmado"

### Esperado e fonte

A admin escolhe; o aviso interno não sai — fonte: PRD CA-03.8.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| E-mail desligado em Notificações | registrar com "Pagamento confirmado" desligado | o portão não promete e-mail que não vai sair |
