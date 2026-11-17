# J-05 · Conferir a loja logada antes da próxima campanha e ver só o que vale hoje

**Valor:** a dona confia no que vê na própria loja: logada ou não, a vitrine mostra só a campanha em vigência.
**Persona:** PER-03 Adri, conferindo a loja (principal) · —
**Prioridade:** P0
**Critérios de origem:** CA-06.1, CA-05.2, RNF-03
**Charters:** CH-03 · **TC:** TC-REG-001, TC-SEC-001, TC-SEC-002

## Entrada

| Origem                                                   | URL / caminho        | Estado de partida                |
| -------------------------------------------------------- | -------------------- | -------------------------------- |
| direta | `http://localhost:8082/` | primeiro sem login; depois logada como `admin-loja` na loja |

## Passos

| #  | A persona…        | Deve ver                          | Em até | Fricção prevista            | TC          |
| -- | ----------------- | --------------------------------- | ------ | --------------------------- | ----------- |
| 1 | sem entrar, olha a Home, uma peça de "Natal", uma peça da "Black Friday" e `/ofertas`, e põe uma peça em oferta na sacola | só "Dia das Mães": selo, preço e sacola como a 102 entregou | 30 s | — | TC-REG-001 |
| 2 | entra na loja com a conta dela | a mesma loja | 30 s | — | — |
| 3 | refaz o passo 1 logada | exatamente o mesmo: nada de "Natal", "Black Friday" ou "QA103 Desligada" | 30 s | ver o Natal em novembro (hipótese 1) | TC-SEC-001 |
| 4 | abre a prévia da Home no painel | só "Dia das Mães" no bloco e nos cartões | 10 s | prévia e loja diferentes (hipótese 3) | TC-SEC-002 |

**Tempo total esperado:** ~100 s — dentro da paciência da persona.

## Objetivo

- **Observável:** logada, a loja e a prévia mostram o mesmo que a visitante: só a campanha em vigência
- **Efeitos colaterais:** —

## Saída

- **Natural:** a dona sai da conta na loja

## Desvios e abandono

| Ramo  | No passo | Quando                                  | A persona…                       | Deve acontecer                     | TC   |
| ----- | -------- | --------------------------------------- | -------------------------------- | ---------------------------------- | ---- |
| J-05a | 3 | vê desconto de campanha que não está valendo | desconfia e recarrega | continua sem o desconto (o achado é ter aparecido) | TC-SEC-001 |

## Fronteiras

Sessão de admin → leitura da campanha em vigência (views novas, D-07). As policies de admin continuam valendo
para o painel.

## Modos de falha

- a sessão de admin soma as policies e a loja mostra campanha agendada, encerrada ou desligada
- o conserto muda o que a visitante vê (selo, preço, sacola, `/ofertas`)
