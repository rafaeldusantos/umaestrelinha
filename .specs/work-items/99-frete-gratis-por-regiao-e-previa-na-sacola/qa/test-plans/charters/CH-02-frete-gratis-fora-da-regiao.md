# CH-02 · O frete grátis para quem está fora da região da campanha

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | exploratório |
| Prioridade   | P0 |
| Persona      | PER-02 Cida |
| Tour         | Money |
| Modo         | com tour |
| Time-box     | 60 min · orçamento: 50 ações |
| Mudança      | a regra do frete grátis passa a olhar a região do CEP: sem CEP não diz "liberado" (CA-15), fora da região mostra a linha neutra e soma o frete na gaveta e no checkout (CA-17), trocar o CEP no checkout recalcula (CA-18), o cupom de frete grátis vale em qualquer região e esconde a faixa (CA-25), a lista "Complete o frete grátis" some fora da região (CA-26) |
| Viewport     | 390 × 844; a conferência gaveta × checkout repete em 1440 × 900 |
| Massa        | só lê: `store_settings.shipping` (ligado, R$ 450, Sul + Sudeste), o cupom de frete grátis do seed (`QAFRETE`, sem pedido mínimo), o catálogo; cria e descarta a própria sacola e rascunho |
| Driver       | — |
| Entrada      | `/` · logada como `cliente-salvador` (código no Mailpit), sacola vazia; cotação interceptada com a **fixture A** |
| Jornadas     | J-02 |
| TC           | TC-FUNC-012, TC-FUNC-013, TC-FUNC-014, TC-FUNC-015, TC-FUNC-016, TC-JOURNEY-002 |

## Missão

Como Cida, de Salvador, achar qualquer jeito de a loja prometer ou conceder frete grátis a um CEP fora do Sul e do
Sudeste — ou de cobrar na tela um frete diferente do que o Total diz —, na gaveta e no checkout.

## Deve tentar

1. J-02 inteira: sacola acima de R$ 450 sem CEP → calcular 40020-000 → procurar a lista de sugestões → ⓘ → checkout
   e Resumo.
2. Calcular com 01310-100 na gaveta, seguir ao checkout e trocar ali o CEP para 40020-000 (e de volta): a opção, o
   "Grátis" e o Total acompanham sem recarregar.
3. Aplicar o cupom de frete grátis na gaveta com o CEP da BA, abaixo e acima da faixa; depois removê-lo.
4. Com o CEP da BA, baixar a sacola para menos de R$ 450 e subir de novo: a linha neutra não vira "Faltam R$ X".

## Edge cases sugeridos

- CEP de borda da região: 39999-999 (MG, ainda Sudeste) e 40000-000 (BA, já Nordeste).
- CEP que não é de nenhuma região (00000-000): tem de se comportar como "sem CEP", sem "liberado".
- Trocar o CEP da gaveta de SP para BA com o frete escolhido.
- Duplo toque em "Aplicar" no cupom.
- Abrir o checkout em duas abas, trocar o CEP numa e recarregar a outra.
- Voltar do checkout para a gaveta depois de trocar o CEP lá.

## Fora do escopo

- O pedido comum aceitar um frete forjado pelo navegador (Pergunta 2 do PRD 99 — dívida registrada, fora deste item).
- Faixa por estado ou valor diferente por região (fora do PRD).
- Pagar: a sessão para no Resumo do checkout.
- A prévia dentro da região e a ida ao checkout com o CEP — CH-01. A falha da cotação — CH-04.
- Preços da fixture (não são do Melhor Envio). "PAC · Correios" × "Correios PAC" é dívida conhecida.
- O texto da faixa de avisos do topo (WI 101, texto livre da dona).
