## TC-FUNC-004: A busca de peças só oferece as marcadas na campanha escolhida e mostra a já escolhida como indisponível

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-03.1, CA-03.4
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passos 2 e 6
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** o recorte da busca é o coração do UC-03; determinístico com a massa nomeada

### Objetivo

A dona só consegue escolher peças que estão de fato na campanha do bloco — e entende por que uma peça que ela
procura não aparece.

### Pré-condições

- Conta: `admin-loja`
- Massa: C-VIG com P-1..P-10 marcadas; uma peça ativa **não** marcada em C-VIG (a thread a nomeia: P-FORA-DA-CAMPANHA, por exemplo uma de C-AGE que não seja P-AMBAS)
- Estado de partida: editor de B-1 sem campanha

### Condições reais

as da persona

### Passos

1. Olhar o card Peças escolhidas antes de escolher a campanha
   - **Esperado:** a busca não está disponível, e a tela diz que é preciso escolher a campanha
2. Escolher "Dia das Mães" e procurar pelo nome a peça não marcada
   - **Esperado:** a busca não a oferece
3. Procurar e escolher P-1
   - **Esperado:** P-1 entra na lista
4. Procurar P-1 de novo
   - **Esperado:** P-1 aparece na busca **desabilitada**, dizendo que já está no bloco

### Esperado e fonte

Busca restrita às marcadas na campanha escolhida; sem campanha, indisponível e diz por quê; a já escolhida
aparece desabilitada dizendo que já está no bloco — fonte: PRD CA-03.1, CA-03.4

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| termo sem acento | procurar o nome de P-2 sem acento | P-2 é encontrada (a busca do painel dobra acento) |
| termo que não casa | procurar "xyzw" | a busca diz que não há peça, sem erro |
