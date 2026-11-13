## TC-FUNC-015: Na sacola só com peças da campanha o cupom é recusado com o motivo, e o cupom de frete grátis continua valendo

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-16
**Autor:** dev
**Persona:** PER-03 Helena
**Jornada:** J-04a
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** pedido de automação E2E

### Objetivo

Quem tenta usar o cupom numa sacola só de ofertas entende por que ele não vale, e o frete grátis que ela tem
continua valendo.

### Pré-condições

- Conta: `anonima`
- Massa: Black Friday em vigência; M-A em 20 %; cupons `QA10` e `QAFRETE`
- Estado de partida: sacola só com M-A

### Condições reais

as da persona

### Passos

1. Aplica `QA10`
   - **Esperado:** recusado com "Este cupom não vale para peças da Black Friday."; nenhum desconto aplicado
2. Aplica `QAFRETE`
   - **Esperado:** aceito; o frete zerado; o preço de M-A continua o da campanha
3. Vai ao checkout
   - **Esperado:** frete zerado e o mesmo total

### Esperado e fonte

Sacola só com peças de campanha ⇒ cupom recusado com o motivo (com o nome da campanha); o cupom de frete grátis
continua zerando o frete — fonte: PRD CA-16, RN-16, D-06; `spec.md` I-04.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| cupom com valor mínimo | (se houver) cupom com mínimo, sacola com campanha + comum abaixo do mínimo | recusado: o mínimo conta só as peças comuns |
| digitado em minúsculas | `qa10` | o mesmo motivo, não "cupom inválido" |
