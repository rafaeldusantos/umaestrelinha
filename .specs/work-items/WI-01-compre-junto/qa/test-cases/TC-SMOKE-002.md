## TC-SMOKE-002: Marcar um adicional e levar o conjunto põe o pingente e a peça na sacola

**Tipo:** smoke
**Prioridade:** P0
**Origem:** CA-04.1, CA-04.2
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passos 3–6
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** conferência rápida do gesto único; determinística com M-01

### Objetivo

Provar que o verbo do Work Item funciona no build: um gesto leva o principal e o adicional à sacola.

### Pré-condições

- Conta: anonima
- Massa: M-01, adicional A2 com uma única variação vendável (ou já escolhida)
- Estado de partida: página de M-01 aberta, sacola vazia

### Condições reais

As da persona.

### Passos

1. Marcar o adicional A2 e completar a escolha, se houver
   - **Esperado:** o botão da barra fixa passa a "Levar o conjunto"
2. Tocar "Levar o conjunto"
   - **Esperado:** a gaveta da sacola abre com duas linhas: o pingente e o adicional

### Esperado e fonte

Duas linhas na sacola, gaveta aberta — fonte: PRD CA-04.1, CA-04.2, UC-04.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| sem marcar nada | toca "Adicionar à sacola" | só o pingente entra |
