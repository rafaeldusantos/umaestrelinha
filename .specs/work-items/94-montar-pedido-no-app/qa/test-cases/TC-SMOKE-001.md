## TC-SMOKE-001: Pedidos abre com Montar pedido e o chip Montados

**Tipo:** smoke
**Prioridade:** P0
**Origem:** UC-01
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-01, passo 1
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** primeiro caso da rodada; falhou, pare

### Objetivo

A entrada da montagem e da lista de montados está de pé no build.

### Pré-condições

- Conta: `admin-atelie`
- Massa: ao menos um pedido montado aberto
- Estado de partida: app em `http://localhost:8084`, logada

### Condições reais

As da persona.

### Passos

1. Abre `/pedidos`
   - **Esperado:** "Pedidos" com o botão "Montar pedido" ao lado; o último chip é "Montados · N abertos"
2. Toca no chip "Montados"
   - **Esperado:** a lista de cartões de pedido montado
3. Toca em "Montar pedido"
   - **Esperado:** "Passo 1 de 4 · Cliente"

### Esperado e fonte

Fonte: PRD › Pedidos · Montados; spec UC-01, D-23.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| — | — | — |
