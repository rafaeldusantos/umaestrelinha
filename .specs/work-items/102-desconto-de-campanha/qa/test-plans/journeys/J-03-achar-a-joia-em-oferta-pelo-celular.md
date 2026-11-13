# J-03 · Achar a joia em oferta pelo celular e entender o preço

**Valor:** quem chega pela primeira vez encontra as peças em oferta e sabe, sem fazer conta, quanto vai pagar.
**Persona:** PER-02 Marina (principal) · PER-04 Rosa (secundária, no CFR)
**Prioridade:** P0
**Critérios de origem:** CA-03, CA-05, CA-09, CA-11, R-03, R-04, R-06, R-07
**Charters:** CH-03, CH-08 · **TC:** TC-JOURNEY-001, TC-FUNC-004, TC-FUNC-007, TC-FUNC-011, TC-FUNC-018, TC-FUNC-020, TC-UI-001

## Entrada

| Origem  | URL / caminho            | Estado de partida                 |
| ------- | ------------------------ | --------------------------------- |
| direta  | `http://localhost:8082/` | sem login, sacola vazia, 390×844  |

## Passos

| # | A persona… | Deve ver | Em até | Fricção prevista | TC |
| - | ---------- | -------- | ------ | ---------------- | -- |
| 1 | rola a Home até "Joias em oferta" | um cartão por percentual (10, 15, 20 %) e uma fileira de peças com a faixa | 5 s | bloco aparecendo e empurrando o conteúdo | TC-FUNC-018 |
| 2 | toca no cartão "20 % de desconto" | `/ofertas?percentual=20` com o chip "20%" pressionado | 3 s | — | TC-FUNC-018 |
| 3 | volta a "Todas" e passa os olhos pela grade | a trilha "Início › Black Friday", a linha "Peças com 10%, 15% e 20% de desconto até 30 de novembro." e os cartões com a faixa | 5 s | chips que rolam de lado | TC-FUNC-011 |
| 4 | toca numa miniatura de cor de M-D | a foto troca, a página não muda | 2 s | faixa sobre as miniaturas | TC-UI-001 |
| 5 | abre M-A | o selo em linha acima do nome, o preço com desconto, "De R$ X" riscado, as parcelas e o PIX sobre o preço com desconto | 3 s | qual dos dois preços vale | TC-FUNC-004 |

**Tempo total esperado:** ~20 s — dentro dos 60 s da Marina.

## Objetivo

- **Observável:** a página de M-A mostra o preço da campanha, o cheio riscado e o selo "BLACK FRIDAY · −20%".
- **Efeitos colaterais:** —

## Saída

- **Natural:** acrescenta à sacola ou volta para `/ofertas`.

## Desvios e abandono

| Ramo  | No passo | Quando | A persona… | Deve acontecer | TC |
| ----- | -------- | ------ | ---------- | -------------- | -- |
| J-03a | 1 | chega por um link antigo, `/black-friday` | abre o link | cai em `/ofertas` com a campanha em vigência | TC-FUNC-011 |
| J-03b | 3 | não há campanha em vigência (depois do CH-06, ou fora da vigência) | abre `/ofertas` | "Não há ofertas agora", "Ver as coleções"; a Home sem o bloco | TC-FUNC-012 |

## Fronteiras

nenhuma — leitura pública do banco local.

## Modos de falha

- O cartão mostra o preço de tabela e a página o preço com desconto (dois donos do preço)
- A vitrine vazia durante a vigência, ou com peças que não estão na campanha
