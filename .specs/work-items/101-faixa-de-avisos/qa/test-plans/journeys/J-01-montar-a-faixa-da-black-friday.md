# J-01 · Montar a faixa da Black Friday e vê-la na loja

**Valor:** a Adri põe a campanha em toda a loja sozinha, sem deploy, e confere antes como a cliente vai ver.
**Persona:** PER-01 Adri (principal) · —
**Prioridade:** P0
**Critérios de origem:** UC-03, UC-02, CA-01, CA-04, RN-03, CA-08
**Charters:** CH-01, CH-04 · **TC:** TC-FUNC-001, TC-FUNC-002, TC-FUNC-005, TC-FUNC-006, TC-FUNC-007, TC-FUNC-003, TC-FUNC-004, TC-FUNC-008

## Entrada

| Origem | URL / caminho | Estado de partida |
| --- | --- | --- |
| navegação interna | painel › **Loja › Faixa de avisos** (`/admin/faixa-de-avisos`) | logada como `admin-loja`; faixa nunca configurada |

## Passos

| # | A persona… | Deve ver | Em até | Fricção prevista | TC |
| -- | --- | --- | --- | --- | --- |
| 1 | abre a tela pela navegação | interruptor desligado, prévia "A faixa está desligada…", "0 de 5", ajuda do tom | 3 s | — | TC-FUNC-007 |
| 2 | cria os três avisos de texto | cada aviso aberto com contadores; um aberto por vez | 60 s | texto colado passa do teto (fricção 3) | TC-FUNC-001, TC-FUNC-008 |
| 3 | confere a prévia no celular e no computador | a faixa da loja com o rascunho, "Aviso N de M" | 10 s | — | TC-FUNC-006 |
| 4 | cria o aviso de imagem | as duas artes, o texto alternativo, sem recusa | 40 s | esquece o alternativo | TC-FUNC-002 |
| 5 | ajusta a ordem | subir/descer; a prévia acompanha | 10 s | — | TC-FUNC-005 |
| 6 | liga e salva | a frase do salvo com o aviso de até uma hora | 3 s | acha que é na hora (fricção 2) | TC-FUNC-001, TC-FUNC-007 |
| 7 | abre a loja | a faixa ouro acima do cabeçalho | 4 s | — | TC-FUNC-001 |

**Tempo total esperado:** ~130 s de interação — dentro da paciência por tarefa da persona (120 s por passo).

## Objetivo

- **Observável:** a loja mostra a faixa com os quatro avisos, na ordem que ela escolheu; o painel, recarregado, mostra o mesmo
- **Efeitos colaterais:** a chave `announcements` gravada; as artes no Storage local

## Saída

- **Natural:** volta ao trabalho; a aba da loja aberta com a faixa

## Desvios e abandono

| Ramo | No passo | Quando | A persona… | Deve acontecer | TC |
| --- | --- | --- | --- | --- | --- |
| J-01a | 2 | cola `https://…` no Destino, ou escreve um rótulo sem destino | não entende por que não salva | o motivo no campo, a barra "Corrija o que está marcado para salvar.", Salvar desabilitado | TC-FUNC-003, TC-FUNC-004 |
| J-01b | 6 | sai da tela antes de salvar | tenta ir para outra tela do painel | aviso de alteração não salva; nada gravado pela metade | TC-FUNC-001 (variação) |

## Fronteiras

Storage local (envio das artes) — mesmo backend; nenhuma fronteira externa.

## Modos de falha

- O Salvar diz "Salvo" e a loja nunca mostra a faixa (gravação que não grava).
- A prévia mostra uma ordem e a loja outra.
