## TC-FUNC-007: "Compraram (últimos 30 min)" mostra só o número dos pedidos pagos na última meia hora

**Tipo:** functional
**Prioridade:** P1
**Origem:** LAV-20
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-02, passo 6
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** depende de pedido aprovado semeado no banco local (o pagamento local não sobe)

### Objetivo

A Adri vê quantas compras fecharam há pouco, separado de quem está na loja.

### Pré-condições

- Conta: `admin-atelie`
- Massa: um pedido aprovado e não cancelado com pagamento nos últimos 30 min; um aprovado há 40 min; um cancelado nos últimos 30 min
- Estado de partida: `/ao-vivo`

### Condições reais

as da persona

### Passos

1. Lê a quarta linha de "O que estão fazendo"
   - **Esperado:** "Compraram (últimos 30 min)" com o número 1; nenhuma barra de proporção nessa linha
2. Confere que a linha não entra no total
   - **Esperado:** o número grande e a soma das três primeiras linhas não mudam por causa dela
3. Com ninguém na loja
   - **Esperado:** "Compraram" continua 1 (não depende de presença)

### Esperado e fonte

Só o número, sem barra; pedidos pagos nos últimos 30 min pela régua de venda (aprovado e não cancelado) — fonte: PRD LAV-20 item 4; spec D-16

### Variações

| Variação                  | Ação                                   | Esperado                         |
| ------------------------- | -------------------------------------- | -------------------------------- |
| pedido marcado pago agora  | a Adri marca um pedido como pago no painel | "Compraram" sobe em até 15 s    |
