# J-01 · Pôr no ar, com as próprias palavras, o bloco da campanha que está valendo

**Valor:** a cliente lê na Home o que a dona quis dizer da campanha e vê as joias que ela escolheu, na ordem dela.
**Persona:** PER-01 Adri (principal) · PER-02 Marina (secundária — quem lê o bloco na loja)
**Prioridade:** P0
**Critérios de origem:** CA-01.1, CA-01.2, CA-01.3, CA-01.4, CA-01.6, CA-02.1, CA-02.2, CA-02.3, CA-02.4, CA-03.1, CA-03.2, CA-03.3, CA-03.4, CA-03.5, CA-04.6, CA-05.1, RNF-01
**Charters:** CH-01, CH-07 (cfr) · **TC:** TC-JOURNEY-001, TC-FUNC-001, TC-FUNC-002, TC-FUNC-003, TC-FUNC-004, TC-FUNC-005, TC-FUNC-006, TC-FUNC-007

## Entrada

| Origem                                                   | URL / caminho        | Estado de partida                |
| -------------------------------------------------------- | -------------------- | -------------------------------- |
| navegação interna | `http://localhost:8083/admin/home` | logada como `admin-loja`; B-1 ligado e sem campanha (efeito da migration); C-VIG em vigência |

## Passos

| #  | A persona…        | Deve ver                          | Em até | Fricção prevista            | TC          |
| -- | ----------------- | --------------------------------- | ------ | --------------------------- | ----------- |
| 1 | abre a Home do painel e acha o bloco "Joias em oferta" | a linha diz que o bloco está sem campanha, não aparece na loja, e pede a escolha; na loja (outra aba) não há bloco | 5 s | o bloco "sumiu" da loja sem ela ter mexido (hipótese 1) | TC-FUNC-001 |
| 2 | abre o bloco | Conteúdo (título, descrição), Campanha (seletor), Peças escolhidas — a busca indisponível, dizendo que falta a campanha | 3 s | — | TC-FUNC-004 |
| 3 | abre a lista de campanhas | "Dia das Mães" (em vigência) e "Natal" (agendada), na ordem do início, com estado e vigência; "Black Friday" não | 3 s | — | TC-FUNC-002 |
| 4 | escolhe "Dia das Mães" | a prévia mostra o bloco com o selo acima, o nome da campanha como título, a frase dos percentuais, os cartões e as primeiras peças da campanha | 5 s | — | TC-FUNC-003 |
| 5 | escreve o título e a descrição | a prévia troca o texto enquanto ela digita, antes de salvar | 3 s | — | TC-FUNC-005 |
| 6 | procura e escolhe três peças | a busca só acha as marcadas na campanha; a escolhida aparece como "já está no bloco" | 20 s | procurar peça não marcada e "não existir" (hipótese 2) | TC-FUNC-004 |
| 7 | arruma a ordem | a lista mostra posição, nome e remover; a prévia segue a nova ordem | 10 s | — | TC-FUNC-005 |
| 8 | salva | "Salvo" no cabeçalho, a prévia não recarrega, a linha diz "Dia das Mães · Em vigência" | 5 s | — | TC-FUNC-006 |
| 9 | confere a loja | o bloco com o título, a descrição e as três peças na ordem dela | 5 s | — | TC-JOURNEY-001 |

**Tempo total esperado:** ~60 s de interação — dentro da paciência da persona (30 s por gravação).

## Objetivo

- **Observável:** na Home da loja (`:8082`, sem login), o bloco "Joias em oferta" com o selo de "Dia das Mães", o
  título e a descrição que a dona escreveu, os cartões de percentual e as três peças na ordem dela
- **Efeitos colaterais:** a linha do bloco no painel diz a campanha e o estado

## Saída

- **Natural:** a dona volta à lista da Home do painel, com a prévia ainda aberta

## Desvios e abandono

| Ramo  | No passo | Quando                                  | A persona…                       | Deve acontecer                     | TC   |
| ----- | -------- | --------------------------------------- | -------------------------------- | ---------------------------------- | ---- |
| J-01a | 5–8 | escreve um título longo demais ou junta 13 peças | tenta salvar | a gravação é recusada com o motivo e o limite; o que ela escreveu fica na tela | TC-FUNC-007 |
| J-01b | 8 | desiste antes de salvar | clica em Cancelar | nada é gravado; a loja segue como estava | TC-FUNC-005 (variação) |

## Fronteiras

Painel → banco (`home_sections.campaign_id`, itens) → loja (leitura da campanha em vigência). Cruza a regra de
`packages/core` usada pelas duas pontas.

## Modos de falha

- o bloco salva com campanha mas a loja não o mostra (a loja não reconhece a campanha escolhida como a vigente)
- a prévia remonta a cada gravação e a dona perde o contexto
- a busca oferece peça fora da campanha e a loja depois a esconde, sem aviso
