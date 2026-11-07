## TC-FUNC-022: Variação da joia que esconde as correntes, ou variação da peça que a dona não liberou, não recebe desconto

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.11
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, ramo J-01c
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** —

### Objetivo

O desconto acompanha a oferta: onde a dona não oferece a peça, ela não sai com desconto.

### Pré-condições

- Conta: `anonima`
- Massa: M-01 (P com a variação que esconde as correntes; uma variação da corrente não liberada)
- Estado de partida: sacola vazia

### Condições reais

As da persona.

### Passos

1. Na página de P, escolher a variação que esconde as correntes
   - **Esperado:** as correntes saem do bloco e o desconto delas sai do total
2. Pôr P nessa variação e a corrente avulsa pelo catálogo
   - **Esperado:** a corrente a preço cheio, sem "de/por"
3. Pôr P numa variação comum e a corrente na variação que a dona não liberou, pelo catálogo
   - **Esperado:** essa corrente a preço cheio

### Esperado e fonte

Fonte: `prd.md` CA-03.11 (P-03).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| P em duas linhas (uma variação comum, uma que esconde) | duas unidades de P, uma de cada, e duas correntes | só uma corrente com desconto |
