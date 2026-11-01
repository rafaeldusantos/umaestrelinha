# Spec — ACME-14 Exportar relatório de pedidos

## Escopo

UC-01 listar pedidos · UC-02 ver o detalhe · UC-03 exportar CSV

**Anexos consultados**

nada — o humano não informou insumo nenhum.

**Achados de eval que este Work Item resolve**

nada — o Work Item não vem de achado de avaliação e o escopo não toca dimensão avaliada.

## Design

nada — sem fonte de design; perguntado como prosseguir, o humano respondeu "seguir sem design" (handoff de 2026-10-21).

## Código — acme-app (raiz do repositório)

- **O que já serve** — `src/pedidos/listagem.ts:1` — o tipo `PedidoResumo`
- **O que muda** — `src/pedidos/listagem.ts:3` ordena por id; passa a ordenar por `criadoEm` e paginar de 50
- **O que nasce** — `src/pages/Pedidos.tsx`, `src/pages/PedidoDetalhe.tsx`, `src/pedidos/exportar.ts` ganha `exportarCsv`
- **Testes** — `src/pedidos/listagem.test.ts` (criar), `src/pedidos/exportar.test.ts` (criar)

## Fronteira entre repositórios

nada — repositório único.

## Cobertura dos UCs

| UC | Reivindicado por |
|---|---|
| UC-01 | acme-app |
| UC-02 | acme-app |
| UC-03 | acme-app |

## Decisões

- Design: seguir sem design (handoff, 2026-10-21).

## Não resolvido

nada
