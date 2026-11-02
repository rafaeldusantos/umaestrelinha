# CH-06 · A leitura ao vivo com a rede ruim e o celular em segundo plano

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | exploratório |
| Prioridade   | P1 |
| Persona      | PER-01 Adri |
| Tour         | Network |
| Modo         | com tour |
| Time-box     | 60 min · orçamento 50 ações |
| Mudança      | os estados do cartão e da tela — carregando, falha, zero, não medida (LAV-03, D-11, D-20); a atualização a cada 30 s no cartão e 15 s na tela, só visível, e o puxar para atualizar (LAV-05, §10.5); o frescor pela leitura mais antiga (D-14); nada pelo relógio do aparelho (LAV-61); `h1` e título em todos os estados (LAV-62) |
| Viewport     | 390 × 844, rede instável |
| Entrada      | http://localhost:8084/ e `/ao-vivo` como `admin-atelie`; 1 cliente presente na loja (contexto separado, como no CH-01) |
| Jornadas     | J-06, J-01a, J-01b |
| TC           | TC-JOURNEY-003, TC-FUNC-018, TC-FUNC-019, TC-FUNC-020, TC-FUNC-021, TC-FUNC-022, TC-FUNC-023, TC-FUNC-024 |

**Ambiente:** o mesmo do CH-01. Falha de uma leitura só: bloquear por rota só a chamada da leitura ao vivo, ou
só a do movimento. Loja não medida: tirar o `production_host` do banco local (restaurar depois). Segundo plano:
outra aba à frente no contexto do app. Relógio: emular o relógio do contexto do app 2 h adiantado.

## Missão

Achar qualquer estado em que a Adri veja número velho sem saber, um "Tentar de novo" que não relê, ou leituras
saindo com o app escondido.

## Deve tentar

1. Cortar a rede com a tela aberta, esperar a próxima leitura, restaurar e tocar em "Tentar de novo"
2. Falhar só a leitura ao vivo (Acessos de pé) e só a do movimento (blocos A–E de pé)
3. Deixar o app em segundo plano 2 min e contar as leituras; voltar
4. Puxar para atualizar no Início e na Loja ao vivo

## Edge cases sugeridos

- Recarregar a tela durante o carregamento
- Rede lenta (Slow 4G): traços antes do número, sem layout pulando
- Relógio do aparelho adiantado e atrasado
- Loja não medida no cartão e na tela
- Voltar do `/ao-vivo` para o Início com a leitura em curso
- Deep link direto em `/ao-vivo` com o app recém-aberto

## Fora do escopo

- A recusa de acesso (CH-07)
- Outras abas do app (Pedidos, Clientes) — a mudança não as toca
- O conteúdo dos blocos (CH-01, CH-04, CH-05)
