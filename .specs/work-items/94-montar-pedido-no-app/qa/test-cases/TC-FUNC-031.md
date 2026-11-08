## TC-FUNC-031: Pedido montado aberto sem link guardado oferece Gerar link novo

**Tipo:** functional
**Prioridade:** P2
**Origem:** UC-09 (D-28)
**Autor:** dev
**Persona:** PER-02 Adri interrompida
**Jornada:** J-04, ramo J-04d
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** exige trocar o ambiente (functions locais sem `PROPOSAL_TOKEN_KEY`) — é o estado das propostas abertas antes do deploy

### Objetivo

Sem a cifra guardada, a Adri ainda consegue mandar um link, sabendo que é um link novo.

### Pré-condições

- Conta: `admin-atelie`
- Massa: pedido montado aberto criado com as functions sem a chave
- Estado de partida: o pedido montado

### Condições reais

As da persona.

### Passos

1. Abre o pedido montado
   - **Esperado:** "Gerar link novo" no lugar do link
2. Toca em "Gerar link novo"
   - **Esperado:** o link novo aparece e o anterior deixa de abrir na loja
3. Com a chave configurada de novo, reabre
   - **Esperado:** o link aparece (agora guardado)

### Esperado e fonte

Fonte: spec D-28 ("sem ele, `save`/`renew` gravam só o hash e o cartão segue com 'Gerar link novo' como hoje"), D-31.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| painel | abre o mesmo no painel | "Gerar link novo" também |
