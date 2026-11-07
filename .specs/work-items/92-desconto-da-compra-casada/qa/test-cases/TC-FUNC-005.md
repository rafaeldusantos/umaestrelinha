## TC-FUNC-005: A prévia fala da faixa "de R$ X a R$ Y" quando as variações ou as peças da lista têm preços diferentes

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-01.5
**Autor:** dev
**Persona:** PER-02 Adri (painel)
**Jornada:** J-02, passos 2–3
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** o protótipo do painel não desenha a prévia; o texto vem do PRD

### Objetivo

A dona sabe por quanto a peça sai com a joia, inclusive quando a peça ou a lista tem preços diferentes.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-05 (peça com variações de preços diferentes; lista com peças de preços diferentes)
- Estado de partida: aba "Compre junto" de P

### Condições reais

As da persona.

### Passos

1. Digitar 10 numa peça avulsa de preço único
   - **Esperado:** "a corrente sai a R$ X com esta joia" (ou o nome da peça), X = preço × 0,90 a centavo
2. Digitar 10 numa peça com variações liberadas de preços diferentes
   - **Esperado:** "de R$ X a R$ Y", com X e Y = menor e maior preço das variações liberadas × 0,90
3. Digitar 10 na lista com peças de preços diferentes
   - **Esperado:** "de R$ X a R$ Y" sobre as peças da lista
4. Apagar o percentual
   - **Esperado:** a prévia some

### Esperado e fonte

Fonte: `prd.md` CA-01.5 (Q-11 (c)).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| valor inválido | digitar 51 | sem prévia de preço; a recusa (TC-FUNC-002) |
| abaixo de 1024 | estreitar a janela | o bloco empilha e a prévia continua legível |
