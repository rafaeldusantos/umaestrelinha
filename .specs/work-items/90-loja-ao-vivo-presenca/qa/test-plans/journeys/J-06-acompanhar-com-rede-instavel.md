# J-06 · Acompanhar a loja com a rede do celular instável, e sem acesso

**Valor:** quando a leitura falha, a Adri sabe disso e recupera os números sem sair da tela; quem perdeu o
acesso não vê número nenhum.
**Persona:** PER-01 Adri (principal) · PER-05 Marina (secundária — o ramo da recusa)
**Prioridade:** P1
**Critérios de origem:** LAV-03, LAV-05, LAV-60, LAV-61, LAV-62, §10.5
**Charters:** CH-06, CH-07 · **TC:** TC-JOURNEY-003, TC-FUNC-018, TC-FUNC-019, TC-FUNC-020, TC-FUNC-021, TC-FUNC-022, TC-FUNC-023, TC-FUNC-024, TC-SEC-006, TC-SEC-007

## Entrada

| Origem            | URL / caminho                 | Estado de partida                                    |
| ----------------- | ----------------------------- | ---------------------------------------------------- |
| navegação interna | http://localhost:8084/ao-vivo | logada como `admin-atelie`; 1 cliente presente na loja |

## Passos

| # | A persona…                                | Deve ver                                                                         | Em até | Fricção prevista                         | TC             |
| - | ----------------------------------------- | -------------------------------------------------------------------------------- | ------ | ---------------------------------------- | -------------- |
| 1 | olha a Loja ao vivo com a rede boa          | "Atualizado agora" e depois "Atualizado há {s} s", renovando a cada ~15 s          | 20 s   | —                                        | TC-FUNC-021    |
| 2 | perde a rede                               | o frescor envelhece; na próxima leitura, "Não consegui carregar." e "Tentar de novo" no bloco que falhou | 30 s | número velho sem aviso | TC-JOURNEY-003, TC-FUNC-020 |
| 3 | recupera a rede e toca em "Tentar de novo" | os números voltam, "Atualizado agora"                                             | 5 s    | —                                        | TC-JOURNEY-003 |
| 4 | puxa para atualizar                        | relê as duas leituras                                                             | 5 s    | —                                        | TC-FUNC-021    |
| 5 | deixa o app em segundo plano e volta       | enquanto em segundo plano, nenhuma leitura; ao voltar, relê                         | 60 s   | —                                        | TC-FUNC-022    |

**Tempo total esperado:** ~2 min.

## Objetivo

- **Observável:** depois da queda de rede, os números voltam sem sair da tela, e o frescor diz a idade certa
- **Efeitos colaterais:** —

## Saída

- **Natural:** a Adri volta ao Início

## Desvios e abandono

| Ramo  | No passo | Quando                                      | A persona…              | Deve acontecer                                                     | TC         |
| ----- | -------- | ------------------------------------------- | ----------------------- | ------------------------------------------------------------------ | ---------- |
| J-06a | 1        | Marina, sem acesso, abre `/ao-vivo`          | espera os números       | a recusa do app, sem número em instante algum                      | TC-SEC-006 |
| J-06b | 1        | o acesso de Marina é retirado com a tela aberta | espera a próxima leitura | cai na recusa do app; nenhum número antigo fica visível          | TC-SEC-007 |
| J-06c | 1        | o relógio do celular está errado             | lê o frescor            | o frescor e os números não mudam por causa do relógio              | TC-FUNC-023 |

## Fronteiras

App → banco local (as duas leituras).

## Modos de falha

- "Tentar de novo" que não relê
- Recusa confundida com falha de rede, ou o contrário
