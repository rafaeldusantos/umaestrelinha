# J-02 · Dar um desconto às correntes de um pingente e ver a loja mostrar o mesmo valor

**Valor:** a dona dá uma condição a quem leva a joia com a peça, sabendo na hora por quanto a peça sai.
**Persona:** PER-02 Adri (painel) (principal) · —
**Prioridade:** P0
**Critérios de origem:** CA-01.1, CA-01.2, CA-01.3, CA-01.4, CA-01.5, CA-02.1
**Charters:** CH-05 · **TC:** TC-SMOKE-003, TC-JOURNEY-003, TC-FUNC-001..005, TC-INT-001

## Entrada

| Origem                                                   | URL / caminho        | Estado de partida                |
| -------------------------------------------------------- | -------------------- | -------------------------------- |
| navegação interna | `/admin/produtos` → o pingente P de M-01 → aba "Compre junto" | logada como `admin-painel`; P com os três adicionais, nenhum com percentual |

## Passos

| #  | A persona…        | Deve ver                          | Em até | Fricção prevista            | TC          |
| -- | ----------------- | --------------------------------- | ------ | --------------------------- | ----------- |
| 1  | abre a aba Compre junto do pingente | cada adicional com o bloco "Desconto ao levar junto", campo com sufixo "%" vazio | 5 s | | TC-FUNC-001 |
| 2  | digita 10 no adicional da lista "Correntes" | a prévia ao lado: "de R$ X a R$ Y" (as correntes têm preços diferentes) | 3 s | a prévia não fala da faixa | TC-FUNC-005 |
| 3  | digita 15 na corrente avulsa | a prévia "a corrente sai a R$ X com esta joia" | 3 s | | TC-SMOKE-003 |
| 4  | salva | gravado sem erro; reabrir a aba mostra 10 e 15 | 5 s | o valor some ao salvar | TC-FUNC-003 |
| 5  | abre a loja em outra aba, na página do pingente | a corrente com "de/por" e o preço levando junto igual ao da prévia | 10 s | prévia ≠ loja | TC-JOURNEY-003 |

**Tempo total esperado:** ~30 s — dentro da paciência da persona.

## Objetivo

- **Observável:** a página do pingente na loja mostra a corrente pelo mesmo preço que a prévia do painel disse.
- **Efeitos colaterais:** nenhum outro produto muda (TC-FUNC-004).

## Saída

- **Natural:** volta à lista de produtos e segue para o próximo.

## Desvios e abandono

| Ramo  | No passo | Quando                                  | A persona…                       | Deve acontecer                     | TC   |
| ----- | -------- | --------------------------------------- | -------------------------------- | ---------------------------------- | ---- |
| J-02a | 2 | digita 0, 51, 10,5 ou "10%" | tenta salvar | a recusa com a frase do motivo junto do campo; nada gravado | TC-FUNC-002 |
| J-02b | 4 | sai sem mudar nada | clica em salvar sem alteração | o salvar não escreve | TC-FUNC-003 |
| J-02c | 4 | apaga o percentual | salva o campo vazio | o adicional volta a ser oferecido sem desconto | TC-FUNC-001 |

## Fronteiras

Nenhuma além do banco local (`product_buy_together.discount_percent`).

## Modos de falha

- O percentual não é gravado (o tipo da coluna afirmado e não provado — `AD-012`).
- Salvar um pingente apaga ou muda o Compre Junto de outro.
