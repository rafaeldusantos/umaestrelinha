## TC-FUNC-003: Data do pagamento no futuro ou anterior ao pedido é recusada com o motivo

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.2b
**Autor:** dev
**Persona:** PER-01 Adri no celular
**Jornada:** J-01, ramo J-01d
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** valor limite; o pedido M6b (criado há poucos minutos) dá o limite inferior

### Objetivo

A venda entra no dia certo do Dashboard; uma data digitada errada não vira venda no futuro nem antes de a compra existir.

### Pré-condições

- Conta: `admin`
- Massa: M6b (pedido criado há poucos minutos)
- Estado de partida: `/admin/pedidos/<M6b>/pagamento`

### Condições reais

As da persona.

### Passos

1. Põe a data de amanhã e confirma
   - **Esperado:** recusa antes de gravar, dizendo que a data não pode ser no futuro; nada gravado (pedido segue Pendente)
2. Põe uma data e hora anteriores à criação do pedido e confirma
   - **Esperado:** recusa dizendo que a data não pode ser anterior ao pedido; nada gravado
3. Põe a hora exata de criação do pedido e, depois, agora
   - **Esperado:** grava

### Esperado e fonte

Nem futura nem anterior à criação, e a recusa diz o motivo — fonte: PRD CA-03.2b.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Virada do dia | pedido criado às 23h50 de Brasília; data informada 00h10 do dia seguinte | aceita (não é futuro nem anterior) |
| O que estava preenchido | depois da recusa | meio, observação e comprovantes continuam lá |
