## TC-FUNC-006: Peça marcada numa campanha agendada continua com o preço de sempre e fora da vitrine

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-04
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-06, passo 1
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** "antes do início"; pedido de automação E2E

### Objetivo

A dona pode preparar a próxima campanha antes do dia sem a loja anunciar desconto antes da hora.

### Pré-condições

- Conta: `admin-loja` (a loja numa segunda aba, sem login)
- Massa: campanha "Natal" agendada (01/12–24/12/2026) com as peças de M-G em 15 % (CH-02); a Black Friday em vigência
- Estado de partida: a loja, `http://localhost:8082`

### Condições reais

a loja em 390 × 844

### Passos

1. Abre na loja uma peça de M-G
   - **Esperado:** o preço de sempre, sem faixa, sem "Natal", sem riscado de campanha
2. Abre `/ofertas`
   - **Esperado:** só as peças da Black Friday; nenhuma de M-G; o chip "15%" sem as de M-G
3. Acrescenta a peça de M-G à sacola
   - **Esperado:** o preço de sempre

### Esperado e fonte

Antes do início: preço de sempre, sem selo, fora da vitrine — fonte: PRD CA-04, Vocabulário ("Agendada: … a loja
ainda não mostra nada").

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| cupom | `QA10` na sacola só com a peça de M-G | o cupom vale (ela não é peça de campanha em vigência) |
| feed | (se sobrar orçamento) a peça de M-G no feed local | sem `g:sale_price` |
