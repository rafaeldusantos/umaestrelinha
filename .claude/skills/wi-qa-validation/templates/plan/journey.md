# J-NN · <verbo + valor — ex.: Concluir a primeira compra pelo celular>

**Valor:** <uma frase: o que a persona ganha quando a jornada dá certo>
**Persona:** PER-NN <nome> (principal) · PER-NN <nome> (secundária, ou "—")
**Prioridade:** P0 · P1 · P2 · P3
**Critérios de origem:** <IDs da fonte que a jornada exercita — P1-AC01, C-03>
**Charters:** CH-NN · **TC:** TC-JOURNEY-NNN, TC-FUNC-NNN, …

## Entrada

| Origem                                                   | URL / caminho        | Estado de partida                |
| -------------------------------------------------------- | -------------------- | -------------------------------- |
| direta · e-mail · navegação interna · deep link · notificação | <url ou rota>   | <logada como …, carrinho vazio…> |

## Passos

| #  | A persona…        | Deve ver                          | Em até | Fricção prevista            | TC          |
| -- | ----------------- | --------------------------------- | ------ | --------------------------- | ----------- |
| 1  | <verbo de usuário> | <observável>                     | <N> s  | <hipótese, ou "—">          | TC-…        |
| 2  | <verbo>           | <observável>                      | <N> s  |                             |             |
| N  | <alcança o objetivo> | <observável do objetivo>       | <N> s  |                             |             |

**Tempo total esperado:** <N> s — dentro da paciência da persona (<N> s).

## Objetivo

- **Observável:** <o estado exato, do lado da persona, que prova o valor>
- **Efeitos colaterais:** <e-mail enviado, registro visível em outra tela, notificação — ou "—">

## Saída

- **Natural:** <onde a persona termina depois do objetivo>

## Desvios e abandono

Ao menos um caminho de abandono ou erro.

| Ramo  | No passo | Quando                                  | A persona…                       | Deve acontecer                     | TC   |
| ----- | -------- | --------------------------------------- | -------------------------------- | ---------------------------------- | ---- |
| J-NNa | <N>      | <vê custo inesperado · sessão expira · erro> | <fecha a aba · tenta de novo · volta amanhã> | <estado preservado, mensagem acionável> | TC-… |

## Fronteiras

<Outro time, serviço ou provedor externo que a jornada cruza — ou "nenhuma". Jornada que cruza fronteira
ganha prioridade na regressão.>

## Modos de falha

- <o que quebra a jornada inteira, não só uma feature>
