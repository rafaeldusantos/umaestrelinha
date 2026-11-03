## TC-FUNC-038: A dona ordena os adicionais da joia e a loja segue essa ordem

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-02.4
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** J-03, passo 7
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** cruza painel e loja

### Objetivo

A peça que a dona considera mais importante aparece primeiro para a cliente.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-01 com A1, A2, A3
- Estado de partida: aba "Compre junto" de M-01; M-01 na loja em outra aba

### Condições reais

As da persona.

### Passos

1. Descer A1 para o fim com "Descer" e salvar
   - **Esperado:** a numeração atualiza; "Compre Junto salvo."
2. Recarregar M-01 na loja
   - **Esperado:** A2, A3, A1 nessa ordem

### Esperado e fonte

Fonte: PRD CA-02.4.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| adicional incompleto | salva com um adicional sem lista ou peça | "1 adicional está sem lista ou peça." e o Salvar desabilitado |
