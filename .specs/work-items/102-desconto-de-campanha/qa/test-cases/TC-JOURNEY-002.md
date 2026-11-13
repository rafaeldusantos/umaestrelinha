## TC-JOURNEY-002: A cliente compra uma peça em oferta junto com uma comum, com cupom, até o pedido criado

**Tipo:** journey
**Prioridade:** P0
**Origem:** CA-03, CA-13, CA-16
**Autor:** dev
**Persona:** PER-03 Helena
**Jornada:** J-04, passos 1–6
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** jornada de receita P0; smoke; pedido de automação E2E (até o pedido criado — o pagamento não roda no local)

### Objetivo

A compra com oferta e cupom vai da vitrine ao pedido criado, e o total que a cliente aceitou é o do pedido.

### Pré-condições

- Conta: `anonima`
- Massa: Black Friday em vigência; M-A em 20 %; M-E comum; cupom `QA10`
- Estado de partida: `/ofertas`, sacola vazia

### Condições reais

montar em 390 × 844; fechar em 1440 × 900

### Entrada

navegação interna — `http://localhost:8082/ofertas`

### Passos com tempo

| # | A persona… | Deve ver | Em até |
| - | ---------- | -------- | ------ |
| 1 | acrescenta M-A | a linha com preço com desconto, riscado e selo | 3 s |
| 2 | acrescenta M-E pela busca | a linha comum | 10 s |
| 3 | aplica `QA10` | o cupom só sobre M-E | 5 s |
| 4 | fecha o checkout como convidada, com PIX | o mesmo total da sacola, menos 5 % do PIX | 60 s |
| 5 | finaliza | o pedido criado | 10 s |
| 6 | abre `/pedido/:id` | o mesmo total do checkout | 5 s |

### Objetivo e efeitos

O pedido em `/pedido/:id` com o total do checkout. Efeito: o e-mail do pedido no Mailpit
(`http://127.0.0.1:54444`).

### Caminho de abandono

Tira M-E com o cupom aplicado → o cupom sai com "Este cupom não vale para peças da Black Friday." (J-04a). Fecha a
aba no checkout e volta → a sacola mantida, com o preço com desconto relido.

### Esperado e fonte

fonte: PRD UC-05, CA-03, CA-13, CA-16.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| página de pagamento | a página do PIX não gera o código (chave inválida no local) | registrar, sem achado; o pedido existe |
