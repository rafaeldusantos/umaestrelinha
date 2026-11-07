## TC-JOURNEY-006: Pagar depois, por Minha conta, um pedido cujo desconto mudou mostra o aviso e o contato da loja

**Tipo:** journey
**Prioridade:** P1
**Origem:** CA-04.3
**Autor:** dev
**Persona:** PER-04 Helena
**Jornada:** J-04, ramo J-04b
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** depende da massa M-08 (contato da loja) e de mudar o percentual por fixture

### Objetivo

Provar que quem volta para pagar um pedido cujo desconto mudou não fica sem saída nem é cobrado a mais.

### Pré-condições

- Conta: `cliente-loja`
- Massa: M-01 a 15 %; M-08 (WhatsApp e e-mail da loja)
- Estado de partida: um pedido pendente criado com a corrente a 15 % (aba fechada antes de pagar); depois, o
  percentual cai para 5 %

### Condições reais

390 × 844.

### Entrada

`/conta` → o pedido pendente → pagar (ou o link `/pedido/:id/pagamento`).

### Passos com tempo

| # | A persona… | Deve ver | Em até |
| - | --- | --- | --- |
| 1 | abre o pedido em Minha conta e tenta pagar | "Pedido #NNNN"; "O valor deste pedido mudou"; "Depois que este pedido foi feito, o desconto de uma das peças mudou, e o pagamento não pode seguir pelo valor de antes. Nada foi cobrado."; "Fale comigo para combinarmos como seguir com o seu pedido." | 15 s |
| 2 | procura como seguir | "Falar pelo WhatsApp" e "Escrever por e-mail" | 5 s |

### Objetivo e efeitos

- Nenhuma cobrança; a cliente tem os dois contatos.

### Caminho de abandono

Recarregar a página do aviso: o mesmo aviso, sem cobrança.

### Esperado e fonte

Fonte: `prd.md` CA-04.3; `spec.md` › Design › Link do pedido / Minha conta · o valor mudou.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| convidada pelo link | abrir o link do pedido sem conta (token) | o mesmo aviso |
| sem contato em `store_settings` | sem M-08 | os botões não aparecem (portão de `PolicyContact`); registrar como observação |
