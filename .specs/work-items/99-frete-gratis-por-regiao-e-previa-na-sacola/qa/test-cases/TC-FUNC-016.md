## TC-FUNC-016: Com CEP fora da região, a sacola não sugere peças para "completar o frete grátis"

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-26 (PRD 99 RN-20; `spec.md` D-17)
**Autor:** dev
**Persona:** PER-02 Cida
**Jornada:** J-02, passo 3
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a ausência se prova com o par: a lista aparece sem CEP e some com o CEP da BA

### Objetivo

Sugerir peças para "completar o frete grátis" a quem não vai ganhar frete grátis é uma promessa falsa — abala a
confiança de Cida na loja.

### Pré-condições

- Conta: cliente-salvador
- Massa: Sul + Sudeste, R$ 450; uma peça abaixo da faixa; fixture A
- Estado de partida: gaveta aberta, sem CEP

### Condições reais

As da persona.

### Passos

1. Olha a gaveta sem CEP
   - **Esperado:** a lista "Complete o frete grátis" aparece, como hoje
2. Calcula com 40020-000
   - **Esperado:** a lista não aparece; na rede, nenhuma busca de catálogo para ela depois do cálculo
3. Toca "Trocar CEP" e calcula com 01310-100
   - **Esperado:** a lista volta

### Esperado e fonte

Com CEP fora da região a lista "Complete o frete grátis" não aparece e o catálogo não é buscado; sem CEP, como hoje —
fonte: PRD 99 CA-26, RN-20.

### Variações

| Variação        | Ação                                  | Esperado                         |
| --------------- | ------------------------------------- | -------------------------------- |
| Acima da faixa  | com a sacola ≥ R$ 450 e 40020-000      | nenhuma lista (nada a completar) |
