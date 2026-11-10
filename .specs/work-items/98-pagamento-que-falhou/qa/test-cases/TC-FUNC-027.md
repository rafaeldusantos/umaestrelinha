## TC-FUNC-027: Os textos novos para a cliente não têm urgência, exclamação nem emoji

**Tipo:** functional
**Prioridade:** P1
**Origem:** RNF-06
**Autor:** dev
**Persona:** PER-03 Cliente que voltou ao pedido
**Jornada:** J-05 e J-06
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** julgamento de tom; a régua automática já existe na suíte (Validation, fix 09)

### Objetivo

Num momento de luto, a loja fala de pagamento sem pressionar.

### Pré-condições

- Conta: `cliente` (e sem sessão para `/pagar-com-cartao`)
- Massa: M2, M3, M4, M13 e os links M14
- Estado de partida: `/conta`

### Condições reais

As da persona.

### Passos

1. Lê o convite do cartão, a oferta do PIX novo, o "cancelado por falta de pagamento" e as cinco situações de `/pagar-com-cartao`
   - **Esperado:** nenhuma contagem regressiva, "último aviso", "corra", exclamação ou emoji; a data-limite aparece como informação, não como ameaça; a voz é a da Adri ("fale comigo") e a mensagem técnica é impessoal
2. Lê o e-mail "cancelado por falta de pagamento" (prévia em Notificações, ou o Mailpit no TC-INT-009)
   - **Esperado:** o mesmo tom

### Esperado e fonte

Tom memorial: nenhuma urgência na cópia para a cliente — fonte: PRD RNF-06; `CLAUDE.md` (topo e "Fale comigo").

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| — | — | — |
