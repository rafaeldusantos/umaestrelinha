# ACME-22 · Webhook reenviado duplica o lançamento

Costura de 2026-10-28. Sem PRD — bug.

Registro do que se descobriu e decidiu nesta data — **não** descrição do estado atual do código.
Convenção de cada repositório: o arquivo de instruções dele.

## Diagnóstico

`src/webhooks/pagamento.ts:1` — `registrarLancamento` não confere o id do evento; o caso análogo
`src/webhooks/estorno.ts:4` ignora evento repetido e responde 200.

**Achados de eval que este Work Item resolve**

nada — a condição não vale.

**Anexos consultados**

nada — o humano não informou insumo nenhum.

## Comportamentos

| # | O que precisa passar a ser verdade |
| ---- | ---- |
| C-01 | o reenvio do mesmo evento não cria um segundo lançamento |
| C-02 | o reenvio responde 200, como o estorno |
| C-03 | reenvio com valor diferente é ignorado e registrado em log; vale a primeira entrega |

## Fora do escopo

nada

## Design

nada — nenhum `C-nn` toca tela e não há fonte.

## Código — acme-app (raiz do repositório)

- **O que muda** — `src/webhooks/pagamento.ts:1` passa a conferir o id do evento, como `src/webhooks/estorno.ts:4`
- **Testes** — `src/webhooks/pagamento.test.ts` (criar)

## Fronteira entre repositórios

nada — repositório único.

## Cobertura

| # | Reivindicado por |
|---|---|
| C-01 | acme-app |
| C-02 | acme-app |
| C-03 | acme-app |

## Perguntas e respostas

| # | A pergunta | A recomendação (premissa do plano) | A resposta |
|---|---|---|---|
| D-01 | Que status HTTP o reenvio devolve? | 200, como `src/webhooks/estorno.ts:4` | a ratificar |
| D-02 | Reenvio com valor diferente: o que vale? | a primeira entrega; o reenvio divergente é ignorado e logado | a ratificar |

## Riscos

- O gateway pode tratar resposta diferente de 2xx como falha e reenviar de novo.

## Não resolvido

nada
