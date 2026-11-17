# J-01 · Destacar um item do menu com ícone do sistema e cor legível, e vê-lo na loja

**Valor:** a dona dá ao item comercial um ícone que diz "oferta" e uma cor própria, e a cliente o vê assim na loja, no computador e no celular.
**Persona:** PER-01 Adri, a dona (principal) · —
**Prioridade:** P0
**Critérios de origem:** C-01, C-03, C-04, C-05, C-06, C-07
**Charters:** CH-01, CH-02 (ramos J-01a, J-01b), CH-05 (CFR) · **TC:** TC-JOURNEY-001, TC-FUNC-001, TC-FUNC-002, TC-FUNC-003, TC-FUNC-004, TC-FUNC-005, TC-FUNC-006, TC-FUNC-007

## Entrada

| Origem                                                   | URL / caminho        | Estado de partida                |
| -------------------------------------------------------- | -------------------- | -------------------------------- |
| navegação interna (sidebar do painel) | `http://localhost:8083/admin/menu` | logada como `admin`; menu v2 com os itens A–D (Ambiente da execução); perfil Padrão |

## Passos

| #  | A persona…        | Deve ver                          | Em até | Fricção prevista            | TC          |
| -- | ----------------- | --------------------------------- | ------ | --------------------------- | ----------- |
| 1  | abre o menu da loja e escolhe o item A | o editor do item, com nome, ícone e o bloco "Cor do texto" abaixo do ícone | 10 s | — | TC-JOURNEY-001 |
| 2  | abre o seletor de ícone | "Sem ícone" fixa, título "Da Uma Estrelinha" e a grade da marca, título "Do sistema" e os dez ícones novos, na mesma área que rola | 10 s | "Do sistema" abaixo da dobra | TC-FUNC-001 |
| 3  | busca "etiqueta" e escolhe o ícone | o grupo da marca some, a Etiqueta aparece em "Do sistema"; o ícone fica marcado no editor | 15 s | — | TC-FUNC-002 |
| 4  | escolhe a cor da barra (`#E8C77A`) e a da lista (`#8A5A2B`) pelo seletor de cor ou pelo código | a medida de contraste de cada campo, verde (≥ 4,5:1) | 30 s | não entende os dois campos | TC-JOURNEY-001 |
| 5  | olha a prévia em Celular e em Computador | o item A com a Etiqueta e o rótulo na cor da superfície | 15 s | prévia não reflete a cor | TC-FUNC-004 |
| 6  | salva | a gravação confirmada, sem recusa | 5 s | — | TC-JOURNEY-001 |
| 7  | recarrega o painel e reabre o item A | a Etiqueta e as duas cores como escolheu | 10 s | — | TC-FUNC-003 |
| 8  | abre a loja a 1440 e a 390 | a barra com a Etiqueta e o rótulo `#E8C77A`; a folha com a Etiqueta e o rótulo `#8A5A2B` | 20 s | — | TC-JOURNEY-001 |

**Tempo total esperado:** 115 s — dentro da paciência da persona (120 s por escolha).

## Objetivo

- **Observável:** a loja desenha o item A com o ícone Etiqueta e o rótulo na cor de cada superfície; o painel recarregado mostra o mesmo.
- **Efeitos colaterais:** `store_settings.menu` gravado com a chave `etiqueta` e as duas cores do item A; nada mais muda nos outros itens.

## Saída

- **Natural:** a dona volta à lista do menu e segue montando a campanha.

## Desvios e abandono

| Ramo  | No passo | Quando                                  | A persona…                       | Deve acontecer                     | TC   |
| ----- | -------- | --------------------------------------- | -------------------------------- | ---------------------------------- | ---- |
| J-01a | 4 | escolhe para a barra uma cor que fica ilegível (ex.: `#8A5A2B`) | lê a recusa, troca a cor, salva | recusa antes de gravar, com a superfície e a medida na frase; Salvar não grava; o que ela digitou continua no campo | TC-FUNC-005 |
| J-01b | 4 | cola um código malformado (`E8C77A`, `#12`) | corrige o código | nada gravado como cor; o campo explica o formato | TC-FUNC-006 |
| J-01c | 6 | desiste do destaque depois de gravado | usa "Usar a cor padrão" nos dois campos e salva | o rótulo volta ao de hoje no painel, na prévia e na loja | TC-FUNC-007 |

## Fronteiras

Painel → documento `store_settings.menu` (jsonb, Supabase local) → loja, ambos lendo pelo pacote compartilhado `packages/core`. É o contrato entre camadas do Work Item: o campo novo de cor e as chaves de ícone novas.

## Modos de falha

- o painel grava a cor, mas a loja (ou a prévia) não a lê — o parser descarta o campo
- a gravação de outro campo (nome, ícone) apaga a cor gravada antes
- a recusa não acontece e uma cor ilegível chega à cliente
