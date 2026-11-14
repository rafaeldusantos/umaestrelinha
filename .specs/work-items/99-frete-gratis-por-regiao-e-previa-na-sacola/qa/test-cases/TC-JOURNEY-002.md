## TC-JOURNEY-002: Cida, de Salvador, descobre na sacola que o frete grátis não vale para ela e paga o mesmo frete no checkout

**Tipo:** journey
**Prioridade:** P0
**Origem:** CA-15, CA-17 (jornada J-02)
**Autor:** dev
**Persona:** PER-02 Cida
**Jornada:** J-02, passos 1 a 5
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a jornada que protege a campanha de dar frete grátis para fora da região; determinística

### Objetivo

A jornada de quem está fora da região: nenhuma tela promete o que o checkout desfaz, e o frete cobrado é o mesmo do
começo ao fim.

### Pré-condições

- Conta: cliente-salvador
- Massa: Sul + Sudeste, R$ 450; peças ≥ R$ 450; fixture A
- Estado de partida: logada, sacola vazia

### Condições reais

As da persona (390 × 844, toque).

### Entrada

`/` → produto → gaveta.

### Passos com tempo

| # | A persona…                                   | Deve ver                                                           | Em até |
| - | -------------------------------------------- | ------------------------------------------------------------------ | ------ |
| 1 | monta a sacola ≥ R$ 450 e abre a gaveta       | "Frete grátis para Sul e Sudeste", sem "liberado"                  | 5 s    |
| 2 | calcula com 40020-000                        | "Frete grátis só para Sul e Sudeste"; frete somado ao Total         | 5 s    |
| 3 | segue ao checkout                            | a Entrega com o CEP e a opção da gaveta; o frete cobrado           | 8 s    |
| 4 | confere o Resumo                             | o mesmo Total da gaveta                                            | 3 s    |

### Objetivo e efeitos

O Resumo cobra o frete da cotação para Salvador, com o Total igual ao da gaveta; nenhum pedido criado.

### Caminho de abandono

No passo 4 ela fecha a aba; volta numa aba nova: a sacola continua; o CEP e a escolha foram esquecidos com o rascunho
da aba (consequência aceita, PRD 97 RN-05) — e a faixa volta a "Frete grátis para Sul e Sudeste", sem "liberado".

### Esperado e fonte

PRD 99 UC-07, UC-09, UC-10, CA-15, CA-17.

### Variações

| Variação    | Ação              | Esperado            |
| ----------- | ----------------- | ------------------- |
| 1440 × 900  | repete a jornada  | o mesmo resultado   |
