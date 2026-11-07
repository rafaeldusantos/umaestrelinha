## TC-JOURNEY-002: Tirar a joia da sacola devolve a corrente ao preço cheio e a linha diz que o desconto volta com ela

**Tipo:** journey
**Prioridade:** P0
**Origem:** CA-03.3
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, ramo J-01a
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** caminho de abandono de maior risco: desconto sem a joia

### Objetivo

Garantir que a cliente que desiste da joia não leva a corrente com desconto, e entende por quê o preço mudou.

### Pré-condições

- Conta: `anonima`
- Massa: M-01
- Estado de partida: P e a corrente avulsa (15 %) na sacola, levadas pelo bloco

### Condições reais

As da persona.

### Entrada

A gaveta da sacola aberta depois de TC-SMOKE-002.

### Passos com tempo

| # | A persona… | Deve ver | Em até |
| - | --- | --- | --- |
| 1 | tira P da sacola | a corrente volta a R$ 79,90 na hora, sem "de/por"; some "Acompanha o …"; aparece "O desconto de 15% volta com o … na sacola."; some "Desconto do Compre Junto" do rodapé | 3 s |
| 2 | vai ao checkout | a corrente a preço cheio e sem a linha do desconto | 10 s |
| 3 | volta à página de P e a acrescenta de novo | a corrente volta a "de/por" e a linha do desconto volta | 15 s |

### Objetivo e efeitos

- Sem a joia, nenhum desconto; com ela de volta, o desconto de volta.

### Caminho de abandono

Fechar a aba depois do passo 1 e reabrir: a sacola continua sem desconto e com a frase da volta.

### Esperado e fonte

"O desconto de N% volta com o {joia} na sacola." só para a peça que entrou pelo Compre Junto — fonte: `prd.md`
CA-03.3; `spec.md` › Design › Loja — Sacola.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| tirar pela quantidade | diminuir a joia até zero | o mesmo do passo 1 |
| corrente pelo catálogo | ver TC-FUNC-015 | sem a frase da volta |
