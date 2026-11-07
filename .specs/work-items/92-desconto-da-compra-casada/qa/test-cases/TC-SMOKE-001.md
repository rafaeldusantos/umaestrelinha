## TC-SMOKE-001: A página do pingente mostra a corrente com "de/por" e "10% a menos levando junto"

**Tipo:** smoke
**Prioridade:** P0
**Origem:** CA-02.1
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passo 1
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** primeira conferência de que o build entrega o desconto na página de maior tráfego

### Objetivo

Em dois minutos, saber se a página do pingente mostra o desconto do Compre Junto antes de qualquer outra sessão.

### Pré-condições

- Conta: `anonima`
- Massa: M-01 (lista "Correntes" a 10 %)
- Estado de partida: sacola vazia

### Condições reais

As da persona (390 × 844, toque).

### Passos

1. Abrir `/produtos/<slug de P>` e escolher uma variação de P que não esconda as correntes
   - **Esperado:** o bloco "Compre junto" aparece
2. Olhar o adicional da lista "Correntes" com uma corrente escolhida
   - **Esperado:** o preço da variação riscado, o preço levando junto e, embaixo, "10% a menos levando junto"

### Esperado e fonte

"de/por" e "N% a menos levando junto" na peça com desconto — fonte: `prd.md` CA-02.1; `spec.md` › Design › Loja — Bloco.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| sem percentual | olhar o adicional sem desconto de M-01 | só o preço, sem "de/por" |
