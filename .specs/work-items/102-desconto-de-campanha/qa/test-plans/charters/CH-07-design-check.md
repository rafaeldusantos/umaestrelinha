# CH-07 · Design-check das telas da campanha

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | design-check |
| Prioridade   | P1 |
| Persona      | PER-01 Adri |
| Tour         | — |
| Modo         | — |
| Time-box     | 60 min · orçamento: 50 ações |
| Mudança      | o selo v2 (faixa no cartão e em linha) com as cores da campanha (CA-14), as telas Campanhas (lista, nova, editar), o cartão da campanha no produto, `/ofertas` e o bloco "Joias em oferta" (CA-01, CA-09, R-04) |
| Viewport     | os de cada frame: 1440 e 390 (loja), 1440 e 390 (painel) |
| Massa        | só lê — a Black Friday em vigência, M-A..M-D, o bloco da Home. **Não salve** a campanha nem o produto; "Nova campanha" só se abre, não se grava |
| Driver       | — |
| Entrada      | `http://localhost:8083/admin/campanhas` · logada como `admin-loja`; a loja em `http://localhost:8082` |
| Jornadas     | J-01, J-03 |
| TC           | TC-UI-002, TC-UI-005 |

## Missão

Conferir, tela a tela, o que foi entregue contra o protótipo do Claude Design, registrando cada diferença com o
valor do design e o observado — com atenção ao selo, que é a peça nova que a cliente mais vê.

## Deve tentar

1. A faixa no cartão de 173 px (390) e 220 px (1440), com e sem miniaturas: altura 30 px, texto 11 px negrito
   maiúsculo na cor de destaque sobre a faixa, percentual 13 px na cor da faixa sobre o destaque, "−20%" com o sinal
   de menos tipográfico, miniaturas a 40 px do pé (celular) e 42 px (≥ 768)
2. O selo em linha na página do produto (acima do nome) e na sacola (no lugar do chip de desconto): 26 px, cantos
   de 6 px; a ordem selo → nome → preço com desconto → "De R$ X" riscado · parcelas
3. Painel: lista (colunas, pílulas de estado com as cores), nova/editar (duas colunas, prévia que acompanha a
   rolagem, combinações prontas, textos de ajuda literais) e o cartão da campanha no produto
4. `/ofertas` (trilha, título 28/44 px, linha da campanha, chips, grade 2/3/4) e o bloco "Joias em oferta"

## Fora do escopo

- O estado vazio de `/ofertas` e a vitrine "Dia das Mães" (só existem depois do CH-06; o CFR as vê)
- Dados fictícios do protótipo (nomes de peça, preços, contagens): não são régua
- Onde o PRD diverge do protótipo vale o PRD (H-09): cores e texto do selo vêm da campanha; os selos do canto saem
  só na peça de campanha; a vitrine usa os filtros e a ordenação da categoria; o link "Ofertas" no menu é posto
  pela dona — divergência ali é `spec-gap`, não diferença
- Telas que a mudança não toca (o resto do painel e da loja)

## Design

**Fonte de design:** Uma Estrelinha - Black Friday · `claude_design` · projeto `4abe021d-d77e-4fe7-affd-524180315fa3` · de `item.md` › Insumos e `prd.md` (cabeçalho)

| Tela do app (rota) | No design (frame, nó ou arquivo) | Viewports com frame | Estados a conferir |
| ------------------ | -------------------------------- | ------------------- | ------------------ |
| cartão na listagem (`/ofertas`, Home) | `Black Friday - Selo v2.html` › `Cartao`, `SeloFaixa`, `Cores` (https://claude.ai/design/p/4abe021d-d77e-4fe7-affd-524180315fa3?file=Black+Friday+-+Selo+v2.html) | 173 px · 220 px | com e sem miniaturas |
| página do produto (`/produtos/:slug`) | `Black Friday - Selo v2.html` › `SeloLinha` | 390 · 1440 | padrão |
| sacola (gaveta e `/carrinho`) | `Black Friday - Selo v2.html` › sacola | 390 | padrão |
| `/ofertas` | `Black Friday - Vitrine ofertas.html` (https://claude.ai/design/p/4abe021d-d77e-4fe7-affd-524180315fa3?file=Black+Friday+-+Vitrine+ofertas.html) | 390 · 1440 | padrão, chip pressionado |
| Home › "Joias em oferta" | `Black Friday - Home.html` | 390 · 1440 | padrão |
| `/admin/campanhas` | `Painel - Campanhas, faixa e perfil.html` › Campanhas · lista (https://claude.ai/design/p/4abe021d-d77e-4fe7-affd-524180315fa3?file=Painel+-+Campanhas%2C+faixa+e+perfil.html) | 1440 · 390 | padrão |
| `/admin/campanhas/nova` | idem › Campanha · nova (e os cenários de recusa: cores sem contraste, vigência cruzando) | 1440 · 390 | padrão, erro |
| `/admin/campanhas/:id` | idem › Campanha · editar (e "tirar % em uso") | 1440 | padrão, erro |
| `/admin/produtos/:id/editar` › Preço e estoque | idem › Produto · campo da campanha (em vigência e agendada) | 1440 · 390 | em vigência, agendada |
