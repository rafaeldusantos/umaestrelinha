## TC-FUNC-025: O e-mail "cancelado por falta de pagamento" aparece em Notificações, desligado

**Tipo:** functional
**Prioridade:** P2
**Origem:** CA-06.6
**Autor:** dev
**Persona:** PER-01 Adri no celular
**Jornada:** J-06 (preparação)
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** leitura do estado inicial; não ligar o evento fora do TC-INT-009

### Objetivo

A dona revisa o texto do aviso novo antes de qualquer cliente recebê-lo.

### Pré-condições

- Conta: `admin`
- Massa: Notificações como semeadas (sem ligar o evento novo)
- Estado de partida: `/admin/configuracoes/notificacoes`

### Condições reais

As da persona.

### Passos

1. Procura o evento
   - **Esperado:** "Pedido cancelado por falta de pagamento" listado, desligado
2. Abre o card e a prévia
   - **Esperado:** assunto "Pedido {{numero_pedido}} cancelado por falta de pagamento" (com o número na prévia) e o texto, editáveis

### Esperado e fonte

Nasce desligado, a Adri revisa e liga — fonte: PRD CA-06.6; costura Decisão 24; nome e assunto de `core/notifications/catalog.ts` e `defaults.ts`.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| — | — | — |
