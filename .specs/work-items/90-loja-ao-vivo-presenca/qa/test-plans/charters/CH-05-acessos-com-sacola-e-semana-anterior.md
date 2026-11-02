# CH-05 · Acessos: "Com sacola" e a semana anterior

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | exploratório |
| Prioridade   | P0 |
| Persona      | PER-01 Adri |
| Tour         | Feature |
| Modo         | por técnica (valor limite: zero visitas, Com sacola = Visitas, semana anterior não medida) |
| Time-box     | 60 min · orçamento 50 ações |
| Mudança      | Acessos ganha "Com sacola" e passa a quatro números (Visitas, Com sacola, Vendas, Conversão); a variação "vs semana anterior" na Semana, até o mesmo ponto; a nota da soma dos dias; Visitas e Vendas idênticos à faixa do Início (LAV-51, §10.1); a RPC do movimento recriada, que o painel também lê |
| Viewport     | 390 × 844; 1440 uma vez |
| Entrada      | app: http://localhost:8084/ como `admin-atelie` → `/ao-vivo` › Acessos · painel: http://localhost:8083/admin (Dashboard) como `admin-atelie` para TC-REG-002 |
| Jornadas     | J-03 |
| TC           | TC-FUNC-025, TC-FUNC-026, TC-FUNC-027, TC-FUNC-028, TC-FUNC-029, TC-FUNC-030, TC-REG-001, TC-REG-002 |

**Ambiente:** massa no banco local — visitas, marcas de sacola e vendas em hoje, ontem, nesta semana (desde
segunda) e na semana anterior, com o marco de início da medição (`store_visit_counter.history_since`) anterior
à semana passada; e um segundo estado em que o marco está **depois** do início da semana anterior (para
TC-FUNC-029). Sem essa massa, TC-FUNC-028 fica `blocked` (massa). O painel em :8083 (`pnpm dev:backoffice`).

## Missão

Confirmar que os números de Acessos são os mesmos da faixa do Início, que "Com sacola" nunca passa de Visitas no
dia, e que a comparação com a semana anterior só aparece quando é justa.

## Deve tentar

1. Hoje, Ontem e Semana: Visitas e Vendas contra a faixa do Início, um período por vez
2. Uma cliente que põe joia na sacola duas vezes no mesmo dia (conta uma) e em dois dias (conta dois na Semana)
3. A variação na Semana com a semana anterior medida, em alta e em queda; e com ela não medida
4. Zero visitas num período (Conversão "—")

## Edge cases sugeridos

- Trocar de período várias vezes rápido (sem nova leitura)
- Virada do dia (meia-noite de Brasília) com a tela aberta
- Teto de 5.000 visitas no dia ("o número é um mínimo")
- Fonte do sistema a 200 % com quatro números
- 1440 de largura

## Fora do escopo

- O gráfico de visitas por horário/dia e as notas dele (LAV-52, LAV-53, LAV-54) — Fase 1, sem mudança nesta costura
- O seletor de período em si e a memória do período (LAV-50, feature 83)
- O resto do Dashboard do painel além do bloco "Movimento da loja"
