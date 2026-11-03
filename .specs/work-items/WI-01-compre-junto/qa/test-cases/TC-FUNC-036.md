## TC-FUNC-036: A própria joia e uma peça já escolhida aparecem desabilitadas, com o motivo, na busca do adicional

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-02.5
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** J-03, passo 6
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** regra P1 do painel

### Objetivo

A dona não oferece a joia junto de si mesma nem a mesma peça duas vezes.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-01 com A2 = peça P
- Estado de partida: aba "Compre junto" de M-01, novo adicional "Uma peça só"

### Condições reais

As da persona.

### Passos

1. Buscar pelo nome de M-01
   - **Esperado:** resultado desabilitado com "É esta joia"
2. Buscar pela peça P
   - **Esperado:** resultado desabilitado com "Já está em outro adicional"
3. Escolher como adicional "Uma peça de uma lista" uma lista que contém M-01
   - **Esperado:** aviso "Esta joia está na lista e é pulada aqui: ela nunca é oferecida junto de si mesma."

### Esperado e fonte

Fonte: PRD CA-02.5; textos do protótipo do painel.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| "Trocar" | troca a peça escolhida | a escolha e as variações zeram |
