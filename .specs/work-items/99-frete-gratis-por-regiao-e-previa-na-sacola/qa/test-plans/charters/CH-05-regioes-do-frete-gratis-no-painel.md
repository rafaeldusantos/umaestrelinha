# CH-05 · As regiões do frete grátis no painel, valendo na loja

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | exploratório |
| Prioridade   | P0 |
| Persona      | PER-03 Adri |
| Tour         | Multi-Tab |
| Modo         | por cenário (J-03) |
| Time-box     | 60 min · orçamento: 50 ações |
| Mudança      | Configurações › Frete e Material ganha "Regiões com frete grátis" (cinco caixas e o texto de ajuda com os estados), a recusa de "ligado sem região" (CA-20) e o padrão das cinco, que mantém o comportamento de antes (CA-19); o interruptor desligado não concede nada (CA-06) |
| Viewport     | 1440 × 900 (painel e loja); a seção do painel uma vez em 390 × 844 |
| Massa        | **altera** `store_settings.shipping` (interruptor, faixa, regiões) — massa de toda a rodada. **Ao terminar, deixa: interruptor ligado, faixa R$ 450,00, só Sul e Sudeste marcados.** Lê o catálogo para montar uma sacola de teste na aba da loja |
| Driver       | — |
| Entrada      | `/admin/configuracoes/frete-e-material` no painel (`http://localhost:8083`) · logada como `admin-loja`; loja `http://localhost:8082` numa segunda aba da mesma sessão, anônima; cotação interceptada com a **fixture A** na aba da loja |
| Jornadas     | J-03 |
| TC           | TC-FUNC-018, TC-FUNC-019 |

## Missão

Como Adri, com o painel numa aba e a loja na outra, configurar a campanha "R$ 450, só Sul e Sudeste", tentar as
configurações que não fazem sentido, e confirmar que cada salvar vale na loja sem deploy — sem deixar a loja numa
configuração que ninguém pediu.

## Deve tentar

1. Com as cinco regiões (estado inicial), ligar o interruptor com R$ 450 e conferir na loja: sacola ≥ R$ 450 diz
   "Frete grátis liberado" sem CEP e com 40020-000 (igual a antes do Work Item).
2. Desmarcar todas com o interruptor ligado e salvar: recusa com o motivo, nada gravado (recarregar o painel prova).
3. Desligar o interruptor com nenhuma região e salvar: grava; na loja, nenhuma faixa e nenhuma opção "Grátis".
4. Ligar de novo com Sul e Sudeste e R$ 450; na loja (recarregada), 40020-000 mostra "Frete grátis só para Sul e
   Sudeste" e 01310-100 "Frete grátis liberado".

## Edge cases sugeridos

- Salvar em duas abas do painel com regiões diferentes; recarregar as duas.
- Voltar do navegador com alterações não salvas.
- Marcar e desmarcar a mesma caixa várias vezes antes de salvar.
- Duplo clique em "Salvar".
- Faixa em zero com o interruptor ligado (a recusa antiga continua).
- A seção em 390 × 844: as cinco caixas e o texto de ajuda sem rolagem horizontal.

## Fora do escopo

- Os outros cards de Frete e Material (Melhor Envio, Material, endereço do escritório) — não mudaram; o endereço do
  escritório é pré-requisito da massa, não se edita aqui.
- Frete grátis por estado ou valor por região (fora do PRD).
- A loja além da faixa da gaveta e do "Grátis" nas opções (o resto é dos CH-01 e CH-02).
- Qualquer configuração em produção.
