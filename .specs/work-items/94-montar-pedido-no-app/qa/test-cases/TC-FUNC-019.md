## TC-FUNC-019: A sacola mostra a foto da variação escolhida e deixa editar e remover cada peça

**Tipo:** functional
**Prioridade:** P1
**Origem:** UC-06 (D-05)
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-02, passo 3
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** —

### Objetivo

A Adri confere visualmente a sacola e corrige sem recomeçar.

### Pré-condições

- Conta: `admin-atelie`
- Massa: peça com variação com foto própria e outra sem
- Estado de partida: passo 2 com duas linhas na sacola

### Condições reais

As da persona.

### Passos

1. Olha o cartão "Sacola · 2 peças"
   - **Esperado:** cada linha com a foto da variação (ou a capa, com a legenda "capa"), nome, variação, "Gravação: <texto>" quando houver, "q × R$", o total da linha, "Editar" e a lixeira
2. Toca em "Editar"
   - **Esperado:** a mesma folha, com a variação e a quantidade da linha, e o botão "Salvar · R$ X"
3. Troca a variação e salva
   - **Esperado:** o toast "Peça atualizada."; a foto da linha muda
4. Toca na lixeira
   - **Esperado:** o toast "Peça removida."; o total da barra recalculado

### Esperado e fonte

"Na sacola, cada linha mostra a foto da variação escolhida — a mesma que a cliente verá no link." — fonte: PRD › Passo 2; spec Design › Passo 2; D-05.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| a mesma foto no link | cria o link e abre na loja | a foto da linha é a mesma (TC-INT-002) |
