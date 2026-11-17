# J-04 · Manter o bloco certo quando uma peça escolhida deixa de valer

**Valor:** a cliente nunca vê no bloco uma peça que não está mais em oferta, e a dona sabe qual saiu e por quê.
**Persona:** PER-01 Adri (principal) · PER-02 Marina (secundária — quem vê o bloco)
**Prioridade:** P1
**Critérios de origem:** CA-03.6, CA-04.1, CA-04.2, CA-04.3, CA-04.4, CA-04.5, CA-04.6
**Charters:** CH-05 · **TC:** TC-FUNC-015, TC-FUNC-016, TC-FUNC-017, TC-FUNC-018, TC-FUNC-019, TC-FUNC-020

## Entrada

| Origem                                                   | URL / caminho        | Estado de partida                |
| -------------------------------------------------------- | -------------------- | -------------------------------- |
| navegação interna | `http://localhost:8083/admin/home` | logada como `admin-loja`; B-1 com P-1..P-3 em "Dia das Mães" |

## Passos

| #  | A persona…        | Deve ver                          | Em até | Fricção prevista            | TC          |
| -- | ----------------- | --------------------------------- | ------ | --------------------------- | ----------- |
| 1 | acrescenta ao bloco P-TIRA, P-FORA, P-APAG e P-NB e salva | o editor já diz que P-NB não aparece porque a campanha não baixa o preço dela | 20 s | — | TC-FUNC-018 |
| 2 | tira P-TIRA da campanha, no produto | na loja, P-TIRA some e nenhuma outra peça entra no lugar | 15 s | — | TC-FUNC-015 |
| 3 | reabre o bloco | P-TIRA saiu da lista, o editor diz qual saiu e que vale quando salvar, e abre como alterado | 5 s | — | TC-FUNC-015 |
| 4 | despublica P-FORA e apaga P-APAG | na loja, as duas somem; no painel, "N das M saíram do ar" nomeando; no editor, P-APAG nomeada como apagada | 30 s | — | TC-FUNC-016 |
| 5 | experimenta trocar a campanha do bloco e desiste | as peças que a nova não tem saem, o editor diz quais; Cancelar devolve tudo | 15 s | — | TC-FUNC-020 |

**Tempo total esperado:** ~90 s de interação.

## Objetivo

- **Observável:** a loja mostra só as peças escolhidas que ainda valem, na ordem, sem completar; o painel nomeia
  cada peça que não aparece e o motivo
- **Efeitos colaterais:** —

## Saída

- **Natural:** a lista da Home do painel

## Desvios e abandono

| Ramo  | No passo | Quando                                  | A persona…                       | Deve acontecer                     | TC   |
| ----- | -------- | --------------------------------------- | -------------------------------- | ---------------------------------- | ---- |
| J-04a | 3 | a leitura das peças da campanha falha ao abrir | segue no editor | nenhuma peça sai; o editor diz que não conseguiu conferir a campanha | TC-FUNC-017 |
| J-04b | 4 | todas as escolhidas deixaram de valer | olha a prévia | o bloco mostra só os cartões de percentual | TC-FUNC-019 |

## Fronteiras

Catálogo (publicação, exclusão) e marcação de campanha → bloco da Home, nas duas pontas.

## Modos de falha

- a loja completa a vaga com outra peça da campanha
- a leitura falha e o editor tira todas as peças em silêncio — a dona salva e perde a curadoria
