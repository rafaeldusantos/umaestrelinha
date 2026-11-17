# J-03 · Deixar pronto o bloco da próxima campanha e vê-lo entrar sozinho no início

**Valor:** a dona prepara antes o bloco da campanha que vai começar, e ele entra na Home no início e sai no fim sem ela voltar ao painel.
**Persona:** PER-01 Adri (principal) · PER-02 Marina (secundária — quem vê, ou não vê, o bloco)
**Prioridade:** P0
**Critérios de origem:** CA-01.5, CA-02.1, CA-02.2, CA-02.3, CA-02.4, CA-02.5, CA-02.6, CA-05.2, RNF-03
**Charters:** CH-04, CH-06 · **TC:** TC-FUNC-009, TC-FUNC-010, TC-FUNC-011, TC-FUNC-012, TC-FUNC-013, TC-FUNC-014, TC-JOURNEY-003, TC-FUNC-021

## Entrada

| Origem                                                   | URL / caminho        | Estado de partida                |
| -------------------------------------------------------- | -------------------- | -------------------------------- |
| navegação interna | `http://localhost:8083/admin/home` | logada como `admin-loja`; B-1 com "Dia das Mães"; "Natal" agendada |

## Passos

| #  | A persona…        | Deve ver                          | Em até | Fricção prevista            | TC          |
| -- | ----------------- | --------------------------------- | ------ | --------------------------- | ----------- |
| 1 | acrescenta outro "Joias em oferta" pela bandeja | o bloco novo, desligado e sem campanha; a linha pede a escolha | 5 s | — | TC-FUNC-009 |
| 2 | liga o bloco novo | a linha continua dizendo que ele não aparece na loja enquanto não tiver campanha | 3 s | achar que ligar basta | TC-FUNC-009 |
| 3 | abre a lista de campanhas | "Dia das Mães" indisponível, dizendo a posição e o título de B-1 | 3 s | — | TC-FUNC-010 |
| 4 | escolhe "Natal" | o editor avisa que a prévia só mostra o bloco a partir do início | 3 s | prévia sem o bloco e achar que não salvou (hipótese 3) | TC-FUNC-011 |
| 5 | escreve o título, escolhe peças e salva | "Salvo"; a linha diz "Natal · Agendada", que não vai aparecer e por quê | 20 s | — | TC-FUNC-012 |
| 6 | confere a loja | só o bloco de "Dia das Mães"; nada da "Natal" | 5 s | — | TC-FUNC-012 |
| 7 | (CH-06) com uma campanha que começa daqui a minutos, espera o início e recarrega a loja | o bloco preparado entra sozinho; no fim, sai sozinho | 10 min de espera | — | TC-JOURNEY-003 |

**Tempo total esperado:** ~40 s de interação, mais a espera da virada.

## Objetivo

- **Observável:** antes do início, a loja não mostra o bloco preparado; depois do início (recarregando), mostra
  com o título e os percentuais da campanha dele; depois do fim, não mostra mais — sem a dona mexer no painel
- **Efeitos colaterais:** a linha do bloco no painel acompanha o estado (agendada → em vigência → encerrada)

## Saída

- **Natural:** a lista da Home do painel, com os dois blocos e o estado de cada um

## Desvios e abandono

| Ramo  | No passo | Quando                                  | A persona…                       | Deve acontecer                     | TC   |
| ----- | -------- | --------------------------------------- | -------------------------------- | ---------------------------------- | ---- |
| J-03a | 5 | outra aba gravou a mesma campanha noutro bloco antes | salva | recusa com a frase do outro bloco; o rascunho fica | TC-FUNC-013 |
| J-03b | depois de 5 | a campanha do bloco é apagada no cadastro | volta à Home do painel | o bloco está sem campanha, some da loja e pede a escolha, como o bloco novo | TC-FUNC-014 |
| J-03c | depois de 7 | a campanha é desligada, ou encerra | confere a loja e o painel | o bloco some; a linha e o editor dizem o estado | TC-FUNC-021 |

## Fronteiras

Relógio do banco (a vigência) → loja. A linha do painel decide pelo relógio do painel.

## Modos de falha

- o bloco preparado aparece antes do início, ou não entra no início
- a loja mostra no bloco preparado a campanha que está valendo (a "outra")
- a colisão apaga o que a dona escreveu
