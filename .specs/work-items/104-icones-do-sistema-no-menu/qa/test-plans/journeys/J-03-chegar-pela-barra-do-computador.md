# J-03 · Chegar ao departamento destacado pela barra do computador

**Valor:** a cliente acha pela barra do topo o item que a dona destacou, sabe qual departamento está aberto e chega a ele.
**Persona:** PER-03 Cliente no computador (principal) · —
**Prioridade:** P1
**Critérios de origem:** C-03, C-05, C-06
**Charters:** CH-04 · **TC:** TC-JOURNEY-003, TC-FUNC-011, TC-REG-001

## Entrada

| Origem                                                   | URL / caminho        | Estado de partida                |
| -------------------------------------------------------- | -------------------- | -------------------------------- |
| direta | `http://localhost:8082/` | anônima, 1440 × 900; o menu como CH-01 e CH-02 o deixaram |

## Passos

| #  | A persona…        | Deve ver                          | Em até | Fricção prevista            | TC          |
| -- | ----------------- | --------------------------------- | ------ | --------------------------- | ----------- |
| 1  | olha a barra do topo | o item A com a Etiqueta e o rótulo `#E8C77A`; os outros itens como antes | 3 s | rótulo parece anúncio | TC-FUNC-011 |
| 2  | passa o mouse no item B (com submenu) | o painel abre; o rótulo de B na cor de hoje (B não tem cor de barra); a régua de 2 px marca o aberto | 5 s | — | TC-REG-001 |
| 3  | passa o mouse no item A | o rótulo continua `#E8C77A` no hover | 3 s | não sabe o que está ativo | TC-FUNC-011 |
| 4  | clica no item A | chega à página do item | 5 s | — | TC-JOURNEY-003 |

**Tempo total esperado:** 16 s — dentro da paciência da persona (60 s).

## Objetivo

- **Observável:** a página do item A aberta a partir da barra; nenhum item que a dona não tocou mudou de aparência.
- **Efeitos colaterais:** —

## Saída

- **Natural:** a cliente navega na página.

## Desvios e abandono

| Ramo  | No passo | Quando                                  | A persona…                       | Deve acontecer                     | TC   |
| ----- | -------- | --------------------------------------- | -------------------------------- | ---------------------------------- | ---- |
| J-03a | 2 | abre o painel de B e sai sem escolher | tira o mouse, navega por Tab | o painel fecha; o foco é visível no rótulo colorido; a cor não some no foco | TC-FUNC-011 |

## Fronteiras

Lê o documento `store_settings.menu` gravado pelo painel (via `packages/core`).

## Modos de falha

- o hover branco da barra apaga a cor da dona, ou a cor da dona apaga a única pista de aberto
- itens com ícone da marca ou sem cor mudam de aparência
