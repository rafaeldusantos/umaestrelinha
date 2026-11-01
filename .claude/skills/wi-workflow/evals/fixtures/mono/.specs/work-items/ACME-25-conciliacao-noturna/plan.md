# ACME-25 · Job de conciliação duplica lançamento

Costura de 2026-10-29. Sem PRD — bug.

## Diagnóstico

`src/webhooks/pagamento.ts:1` — o job reaplica o evento sem conferir o id.

**Achados de eval que este Work Item resolve**

nada — a condição não vale.

**Anexos consultados**

nada — o humano não informou insumo nenhum.

## Comportamentos

| # | O que precisa passar a ser verdade |
| ---- | ---- |
| C-01 | o job não cria lançamento para evento já conciliado |

## Fora do escopo

nada

## Design

nada — nenhum `C-nn` toca tela e não há fonte.

## Código — acme-app (raiz do repositório)

- **O que muda** — `src/webhooks/pagamento.ts:1`
- **Testes** — `src/webhooks/pagamento.test.ts` (criar)

## Fronteira entre repositórios

nada — repositório único.

## Cobertura

| # | Reivindicado por |
|---|---|
| C-01 | acme-app |

## Perguntas e respostas

| # | A pergunta | A recomendação (premissa do plano) | A resposta |
|---|---|---|---|
| D-01 | O job registra em log o evento ignorado? | sim, em nível `info` | ratificada no gate |

## Riscos

nada

## Não resolvido

nada
