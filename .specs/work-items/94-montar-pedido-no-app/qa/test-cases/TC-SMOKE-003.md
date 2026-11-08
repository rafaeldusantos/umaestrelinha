## TC-SMOKE-003: Um pedido montado aberto mostra o link para copiar

**Tipo:** smoke
**Prioridade:** P0
**Origem:** UC-09
**Autor:** dev
**Persona:** PER-02 Adri interrompida
**Jornada:** J-04, passos 1–3
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** com `PROPOSAL_TOKEN_KEY` local; sem ela, o esperado é "Gerar link novo" (TC-FUNC-031)

### Objetivo

O pedido montado reaberto entrega o link no build.

### Pré-condições

- Conta: `admin-atelie`
- Massa: pedido montado aberto criado com a chave da cifra configurada
- Estado de partida: `/pedidos?visao=montados`

### Condições reais

As da persona.

### Passos

1. Toca no cartão aberto
   - **Esperado:** "Link para <primeiro nome>" com o link em caixa
2. Toca em "Copiar link"
   - **Esperado:** "Link copiado."

### Esperado e fonte

Fonte: PRD › Pedido montado; spec D-14.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| — | — | — |
