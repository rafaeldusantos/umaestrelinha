## TC-FUNC-016: Link de cartão substituído por um novo deixa de abrir o pagamento

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-05.6
**Autor:** dev
**Persona:** PER-04 Cliente que recebeu o link pelo WhatsApp
**Jornada:** J-04, ramo J-04a
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a massa M14 traz o par (antigo substituído, novo vivo) do mesmo pedido

### Objetivo

A cliente que recebeu dois links não paga pelo errado, e o link que a Adri desistiu de usar não cobra.

### Pré-condições

- Conta: `anonima`
- Massa: M14 — link antigo e link novo do mesmo pedido
- Estado de partida: sem sessão

### Condições reais

As da persona.

### Passos

1. Abre o link antigo
   - **Esperado:** não oferece pagamento; diz, sem jargão, que o link não vale mais e como seguir (falar com a loja)
2. Abre o link novo
   - **Esperado:** a tela de pagamento do pedido

### Esperado e fonte

Gerar um link novo invalida o anterior — fonte: PRD CA-05.6.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Antigo aberto antes | o link antigo estava aberto numa aba quando o novo foi gerado; ela tenta pagar nessa aba | não cobra; diz que o link não vale |
