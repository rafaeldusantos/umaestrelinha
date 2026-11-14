# J-02 · Saber antes de pagar que o frete grátis não vale para Salvador, e pagar o frete certo

**Valor:** Cida entende na própria sacola que a campanha é só para Sul e Sudeste, vê o frete da cotação somado, e o
checkout confirma o mesmo valor — nenhuma promessa desfeita no último passo.
**Persona:** PER-02 Cida (principal) · PER-01 Luana (secundária)
**Prioridade:** P0
**Critérios de origem:** CA-15, CA-17, CA-18, CA-25, CA-26
**Charters:** CH-02 · **TC:** TC-JOURNEY-002, TC-FUNC-012, TC-FUNC-013, TC-FUNC-014, TC-FUNC-015, TC-FUNC-016

## Entrada

| Origem            | URL / caminho      | Estado de partida                                            |
| ----------------- | ------------------ | ------------------------------------------------------------ |
| navegação interna | `/` → produto      | logada como `cliente-salvador`, sacola vazia, rascunho vazio |

## Passos

| #  | A persona…                                                   | Deve ver                                                                                   | Em até | Fricção prevista                      | TC          |
| -- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------ | ------------------------------------- | ----------- |
| 1  | monta a sacola acima de R$ 450 e abre a gaveta, sem CEP       | destaque em ouro "Frete grátis para Sul e Sudeste" com o ⓘ ("… Informe o CEP abaixo para confirmar."); nenhum "liberado" | 5 s | lê como "já ganhei"                   | TC-FUNC-012 |
| 2  | calcula com 40020-000                                         | a faixa vira uma linha neutra "Frete grátis só para Sul e Sudeste", sem barra e sem valor/faixa; a mais barata com o preço cheio; o Total soma o frete | 5 s | tom de recusa ("infelizmente", "!") | TC-FUNC-013 |
| 3  | procura sugestões para "completar o frete grátis"             | a lista "Complete o frete grátis" não aparece                                             | 2 s | sugestão que não serve a ela          | TC-FUNC-016 |
| 4  | toca no ⓘ                                                     | "Para Salvador/BA, o frete é o da cotação." + a regra inteira                              | 3 s | —                                     | TC-FUNC-013 |
| 5  | segue ao checkout e confere o Resumo                          | a mesma opção marcada, o frete cobrado e o mesmo Total da gaveta                          | 8 s | Total diferente                       | TC-JOURNEY-002 |

**Tempo total esperado:** 23 s — dentro da paciência dela (120 s).

## Objetivo

- **Observável:** o Resumo do checkout cobra o frete da cotação para 40020-000, com o mesmo Total da gaveta, e nenhuma
  tela antes disso disse "liberado".
- **Efeitos colaterais:** — (a jornada para antes de pagar).

## Saída

- **Natural:** no checkout, decidindo pagar.

## Desvios e abandono

| Ramo  | No passo | Quando                                              | A persona…                                  | Deve acontecer                                                                  | TC          |
| ----- | -------- | --------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------- | ----------- |
| J-02a | 5        | ela tinha calculado com o CEP do trabalho (SP) e corrige para o de casa (BA) no checkout | troca o CEP no bloco Entrega | a opção deixa de ser grátis; a escolha é desfeita; escolhida de novo, o Total sobe — sem recarregar | TC-FUNC-014 |
| J-02b | 2        | ela tem o cupom de frete grátis                     | aplica o cupom na gaveta                    | todas as opções saem "Grátis"; a faixa da região some                           | TC-FUNC-015 |
| J-02c | 5        | o frete cobrado a surpreende                         | fecha a aba e desiste                       | ao voltar numa aba nova, a sacola continua (o CEP pode ter sido esquecido — fechar a aba esquece o rascunho, consequência aceita no PRD 97, RN-05) | TC-JOURNEY-002 |

## Fronteiras

Cotação do Melhor Envio (interceptada) e a busca de endereço pelo CEP (ViaCEP).

## Modos de falha

- Qualquer superfície dizendo "liberado" ou zerando o frete para um CEP fora da região — frete grátis para o Brasil
  inteiro com a configuração Sul + Sudeste.
