## TC-SMOKE-002: Um pedido mínimo para cliente cadastrada chega ao link

**Tipo:** smoke
**Prioridade:** P0
**Origem:** UC-03, UC-06, UC-08
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-02
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** o verbo do produto em 2 minutos

### Objetivo

A gravação da montagem pelo app funciona no build.

### Pré-condições

- Conta: `admin-atelie`
- Massa: cliente cadastrada; uma peça com estoque
- Estado de partida: `/pedidos/montar`, passo 1

### Condições reais

As da persona.

### Passos

1. Escolhe a cliente cadastrada (entrega em "A cliente preenche no link") e segue
   - **Esperado:** "Passo 2 de 4 · Peças"
2. Acrescenta uma peça e segue até "Revisar"
   - **Esperado:** "Criar link" ligado
3. Toca em "Criar link"
   - **Esperado:** o pedido montado com o toast "Link criado."

### Esperado e fonte

Fonte: PRD › Passo 4 · Revisar; spec UC-08.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| — | — | — |
