## TC-FUNC-014: Gravação acima do limite em qualquer peça impede o conjunto inteiro, com a recusa junto do campo

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-04.3
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-02, ramo J-02a
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** erro previsível; nenhuma peça entra pela metade

### Objetivo

A cliente não fica com metade do conjunto na sacola por causa de um nome comprido demais.

### Pré-condições

- Conta: anonima
- Massa: M-01 com gravação; peça da lista com gravação de limite N
- Estado de partida: sacola vazia

### Condições reais

As da persona.

### Passos

1. Digitar na gravação da corrente N + 2 caracteres e tocar "Levar o conjunto"
   - **Esperado:** nada entra na sacola; junto do campo da corrente: "Cabem até N caracteres nesta peça. Tire 2 para continuar."
2. Corrigir a corrente e passar do limite na gravação do pingente
   - **Esperado:** o botão fica bloqueado; "A gravação passou do limite. Ajuste o texto para continuar."; nada entra
3. Corrigir e levar
   - **Esperado:** todas as peças entram

### Esperado e fonte

Fonte: PRD CA-04.3; textos do protótipo (spec › Design › Loja).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| exatamente no limite | N caracteres | aceita |
