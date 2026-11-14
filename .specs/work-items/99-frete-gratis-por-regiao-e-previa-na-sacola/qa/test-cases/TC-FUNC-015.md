## TC-FUNC-015: Com o cupom de frete grátis, toda opção sai grátis em qualquer região, e a faixa da região some

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-25, CA-06 (PRD 99 RN-18; PRD 97 RN-03; `spec.md` D-17)
**Autor:** dev
**Persona:** PER-02 Cida
**Jornada:** J-02, ramo J-02b
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** precisa do cupom de frete grátis ativo no banco local (o `QAFRETE` do seed)

### Objetivo

Cida tem um cupom de frete grátis: ele vale para Salvador, e a sacola não pode continuar dizendo "só para Sul e
Sudeste" ao lado do cupom aplicado.

### Pré-condições

- Conta: cliente-salvador
- Massa: cupom `QAFRETE` ativo (sem pedido mínimo); fixture A
- Estado de partida: gaveta com peças ≥ R$ 250 e 40020-000 calculado

### Condições reais

As da persona.

### Passos

1. Aplica o cupom na gaveta
   - **Esperado:** todas as opções saem "Grátis"; a linha do resumo diz "Grátis"; a faixa da região (a linha neutra)
     não aparece mais
2. Segue ao checkout
   - **Esperado:** o cupom aplicado, o frete grátis e o mesmo Total
3. Remove o cupom
   - **Esperado:** a linha "Frete grátis só para Sul e Sudeste" volta e o frete é cobrado

### Esperado e fonte

Com cupom de frete grátis e CEP fora da região, todas as opções "Grátis" e a faixa da região não aparece — fonte: PRD
99 CA-25, RN-18; PRD 97 CA-06; `spec.md` D-17.

### Variações

| Variação              | Ação                                          | Esperado                                 |
| --------------------- | --------------------------------------------- | ---------------------------------------- |
| Dentro da região      | cupom com 01310-100                           | todas grátis; nenhuma faixa              |
| Abaixo do mínimo      | não se aplica: o `QAFRETE` não tem mínimo     | — (fora da cobertura nesta rodada)       |
| Duplo toque em "Aplicar" | dois toques                                | aplicado uma vez                         |
