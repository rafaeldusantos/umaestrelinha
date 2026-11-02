# J-03 · Comparar o movimento de hoje e da semana com o período anterior

**Valor:** a Adri sabe quantas pessoas visitaram, quantas puseram joia na sacola, quantas compraram e se a
semana está acima ou abaixo da anterior — com os mesmos números da faixa do Início.
**Persona:** PER-01 Adri (principal) · —
**Prioridade:** P1
**Critérios de origem:** LAV-51, §10.1
**Charters:** CH-05 · **TC:** TC-FUNC-025, TC-FUNC-026, TC-FUNC-027, TC-FUNC-028, TC-FUNC-029, TC-FUNC-030, TC-REG-001, TC-REG-002

## Entrada

| Origem            | URL / caminho                 | Estado de partida                                                         |
| ----------------- | ----------------------------- | ------------------------------------------------------------------------- |
| navegação interna | http://localhost:8084/ → `/ao-vivo` › Acessos | logada como `admin-atelie`; visitas, sacolas e vendas semeadas em hoje, ontem, nesta semana e na anterior |

## Passos

| # | A persona…                                  | Deve ver                                                                                   | Em até | Fricção prevista                         | TC          |
| - | ------------------------------------------- | ------------------------------------------------------------------------------------------ | ------ | ---------------------------------------- | ----------- |
| 1 | lê "Visitas" e "Vendas" de Hoje na faixa do Início | os números                                                                           | 3 s    | —                                        | TC-FUNC-025 |
| 2 | abre Acessos em Hoje                         | Visitas, Com sacola, Vendas e Conversão; Visitas e Vendas iguais aos da faixa              | 3 s    | dois números para a mesma coisa          | TC-FUNC-025, TC-FUNC-030 |
| 3 | troca para Ontem e Semana                    | os quatro números mudam sem nova leitura; iguais à faixa no mesmo período                    | 2 s    | —                                        | TC-FUNC-025 |
| 4 | lê "Com sacola" no dia                       | nunca maior que Visitas                                                                    | 2 s    | —                                        | TC-FUNC-026 |
| 5 | lê a Semana                                  | a nota em letra pequena de que "Com sacola" na semana é a soma dos dias; "vs semana anterior" nos quatro números, verde na alta, cinza na baixa | 3 s | vermelho na queda | TC-FUNC-027, TC-FUNC-028 |

**Tempo total esperado:** ~15 s.

## Objetivo

- **Observável:** os quatro números e as variações de cada período batem com a faixa do Início e com o que foi
  semeado
- **Efeitos colaterais:** o Dashboard do painel mostra os mesmos números de visitas e vendas

## Saída

- **Natural:** a Adri volta ao Início com o mesmo período escolhido

## Desvios e abandono

| Ramo  | No passo | Quando                                             | A persona…  | Deve acontecer                                          | TC          |
| ----- | -------- | -------------------------------------------------- | ----------- | ------------------------------------------------------- | ----------- |
| J-03a | 5        | a semana anterior não foi medida inteira           | lê a Semana | nenhuma variação "vs semana anterior" aparece            | TC-FUNC-029 |
| J-03b | 2        | zero visitas no período                            | lê Conversão | "—" no lugar do percentual                             | TC-FUNC-030 |

## Fronteiras

O painel (Dashboard › Movimento da loja) lê a mesma RPC recriada — TC-REG-002.

## Modos de falha

- Visitas da Loja ao vivo diferente da faixa do Início
- "Com sacola" maior que Visitas
