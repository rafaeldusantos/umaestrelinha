# J-05 · Encerrar a campanha e ver a loja voltar ao normal

**Valor:** a Adri tira a faixa quando a campanha acaba, e a loja volta a ser a de sempre sem página nenhuma pulando no meio-tempo.
**Persona:** PER-01 Adri (principal) · —
**Prioridade:** P1
**Critérios de origem:** UC-04, CA-05, CA-08, RN-02
**Charters:** CH-05 · **TC:** TC-FUNC-009, TC-FUNC-010, TC-UI-003

## Entrada

| Origem | URL / caminho | Estado de partida |
| --- | --- | --- |
| navegação interna | `/admin/faixa-de-avisos` | logada como `admin-loja`; faixa ligada com os quatro avisos; a loja aberta numa segunda aba |

## Passos

| # | A persona… | Deve ver | Em até | Fricção prevista | TC |
| -- | --- | --- | --- | --- | --- |
| 1 | desliga e salva | a frase do salvo com o aviso de até uma hora; a lista continua | 3 s | acha que apagou os avisos | TC-FUNC-009 |
| 2 | abre a loja | sem faixa; o cabeçalho no topo | 4 s | — | TC-FUNC-009 |
| 3 | compara com a loja de sempre | igual em 390 e em 1440 | 60 s | — | TC-UI-003 |
| 4 | rola um produto | o cabeçalho recolhe como antes | 5 s | — | TC-FUNC-009 |
| 5 | (meio-tempo) uma página aberta da hora anterior | a vaga fica até a próxima página, sem empurrar | — | — | TC-FUNC-010 |
| 6 | religa para a próxima campanha | os mesmos avisos voltam | 3 s | — | TC-FUNC-009 |

**Tempo total esperado:** ~80 s — dentro da paciência da persona.

## Objetivo

- **Observável:** a loja sem faixa e com o cabeçalho no topo; os avisos guardados para a próxima vez
- **Efeitos colaterais:** a chave `announcements` com `enabled` falso (e verdadeiro de novo no passo 6)

## Saída

- **Natural:** fecha a aba da loja

## Desvios e abandono

| Ramo | No passo | Quando | A persona… | Deve acontecer | TC |
| --- | --- | --- | --- | --- | --- |
| J-05a | 5 | uma cliente tem a página aberta de antes da troca (o cache da loja) | navega para outra página | a página aberta não pula; a próxima já obedece à troca | TC-FUNC-010 |

## Fronteiras

O cache de borda da Vercel decide o prazo de 5 min / 1 h — não existe no ambiente local (fora do plano; Q-02).

## Modos de falha

- Desligar deixa uma vaga ouro vazia em cima de toda página.
- Desligar apaga a lista e a dona tem de remontar a campanha.
