# J-03 · Ler os avisos no computador e abrir o que interessa

**Valor:** vindo do Google numa categoria, o Rodrigo percorre os avisos no ritmo dele e abre a oferta.
**Persona:** PER-04 Rodrigo (principal) · —
**Prioridade:** P1
**Critérios de origem:** UC-01, UC-02, CA-02, CA-03, CA-07, RN-06
**Charters:** CH-03 · **TC:** TC-FUNC-015, TC-FUNC-016, TC-UI-002, TC-REG-001

## Entrada

| Origem | URL / caminho | Estado de partida |
| --- | --- | --- |
| busca orgânica (deep link) | `/<caminho de C1>` | sem sessão |

## Passos

| # | A persona… | Deve ver | Em até | Fricção prevista | TC |
| -- | --- | --- | --- | --- | --- |
| 1 | olha o topo da categoria | faixa de 48 px, setas nas pontas, sem rolagem lateral | 3 s | não percebe as setas (fricção 1) | TC-UI-002 |
| 2 | usa as setas | os avisos trocam a cada clique | 5 s | — | TC-FUNC-016 |
| 3 | chega ao aviso de imagem | a arte do computador inteira, com o alternativo | 5 s | arte cortada (fricção 3) | TC-FUNC-015 |
| 4 | põe o ponteiro no aviso e clica | o aviso não troca sob o ponteiro; abre o destino | 3 s | troca na hora do clique (fricção 2) | TC-FUNC-016 |
| 5 | vai à Home | o Banner principal gira como antes, a faixa acima do cabeçalho | 5 s | — | TC-REG-001 |

**Tempo total esperado:** ~25 s — dentro da paciência (45 s).

## Objetivo

- **Observável:** o Rodrigo na página de destino do aviso que escolheu
- **Efeitos colaterais:** —

## Saída

- **Natural:** navega pelas peças

## Desvios e abandono

| Ramo | No passo | Quando | A persona… | Deve acontecer | TC |
| --- | --- | --- | --- | --- | --- |
| J-03a | 3 | estreita a janela para metade da tela | continua lendo | a arte troca para a do celular, inteira | TC-FUNC-015 |

## Fronteiras

nenhuma

## Modos de falha

- O aviso troca sob o ponteiro e o clique abre outra oferta.
