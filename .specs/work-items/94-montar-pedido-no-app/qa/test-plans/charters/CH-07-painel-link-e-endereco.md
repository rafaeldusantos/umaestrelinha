# CH-07 · No painel: o link sempre, o renovar só do vencido e o endereço salvo pela function

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P1                                                                            |
| Persona      | PER-04 Adri no computador                                                     |
| Tour         | Feature                                                                       |
| Modo         | por cenário (J-05)                                                            |
| Time-box     | 60 min · orçamento: 50 ações                                                  |
| Mudança      | o cartão "Link para a cliente" com o link vindo do servidor; Renovar só depois de vencer, com a frase nova; "Salvar no cadastro da cliente" gravado pela function na mesma gravação; a falha única "Não consegui gravar o pedido. Nada foi enviado à cliente. Tente de novo."; a origem "Pedido montado" (UC-10; D-14, D-17, D-20, D-25, D-28, D-32) |
| Viewport     | 1440 × 900                                                                    |
| Entrada      | `http://localhost:8083/admin` → Pedidos montados · logada como `admin-atelie` |
| Jornadas     | J-05                                                                          |
| TC           | TC-JOURNEY-005, TC-FUNC-032, TC-FUNC-033, TC-REG-002                          |

## Missão

Confirmar que o painel mostra o mesmo link que o app para o mesmo pedido montado, não oferece renovar o que
ainda vale, e que o endereço marcado para salvar chega à ficha uma vez só, e só quando o pedido montado é
gravado.

## Deve tentar

1. Abrir um pedido montado criado pelo app e outro pelo painel: copiar os dois e comparar com o app
2. Montar com "Salvar no cadastro" marcada para uma cliente que já tem o mesmo endereço (não duplica) e para uma sem endereço padrão (vira padrão)
3. Editar um pedido montado: a caixa "Salvar no cadastro" vem desmarcada (D-32)
4. Provocar falha na gravação (parar a function `order-proposals` local) e ler a mensagem; conferir que nada foi gravado

## Edge cases sugeridos

- Duas abas no mesmo pedido montado; renovar numa e copiar na outra
- Recarregar o pedido montado depois de copiar
- Campo do link: focar seleciona tudo
- Voltar do navegador depois de renovar
- Montar sem cliente escolhida (a caixa não aparece)

## Fora do escopo

- O resto da montagem do painel (feature 89 e `AD-071`, pré-existentes) — só o que a TC-REG-002 confere
- "Duplicar" (no desenho, não implementado como pedido)
- "Colar texto" no painel — WI seguinte
- A ficha da cliente no painel além de conferir o endereço
