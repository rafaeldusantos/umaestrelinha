## TC-JOURNEY-001: A cliente acha a joia em oferta pela Home no celular e chega à página com o preço da campanha

**Tipo:** journey
**Prioridade:** P0
**Origem:** CA-03, CA-09, R-04
**Autor:** dev
**Persona:** PER-02 Marina
**Jornada:** J-03, passos 1–5
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** jornada P0 pública e determinística; smoke; pedido de automação E2E

### Objetivo

A primeira visita pelo celular termina na página de uma peça em oferta com o preço da campanha, sem a cliente se
perder.

### Pré-condições

- Conta: `anonima`
- Massa: Black Friday em vigência; M-A..M-D marcadas; bloco "Joias em oferta" ligado
- Estado de partida: `http://localhost:8082/`, 390 × 844, sacola vazia

### Condições reais

as da persona

### Entrada

direta — `http://localhost:8082/`

### Passos com tempo

| # | A persona… | Deve ver | Em até |
| - | ---------- | -------- | ------ |
| 1 | rola até "Joias em oferta" | os cartões 10/15/20 % | 5 s |
| 2 | toca em "20%" | `/ofertas?percentual=20`, M-A e M-D | 3 s |
| 3 | toca em M-A | a página com o selo, o preço com desconto e o cheio riscado | 3 s |

### Objetivo e efeitos

A página de M-A mostra o mesmo preço com desconto que o cartão mostrou. Sem efeitos colaterais.

### Caminho de abandono

Vem por um link antigo `/black-friday` → chega a `/ofertas` com a campanha (J-03a). Sem campanha em vigência, a
mesma entrada mostra "Não há ofertas agora" (J-03b, TC-FUNC-012).

### Esperado e fonte

fonte: PRD UC-05, UC-06, UC-07, CA-03, CA-09.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| rede lenta | repete com a rede lenta | o bloco aparece sem empurrar o que a cliente já está lendo para fora da tela |
