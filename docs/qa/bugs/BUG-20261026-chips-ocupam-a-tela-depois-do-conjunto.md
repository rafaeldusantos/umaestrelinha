# BUG-20261026-chips-ocupam-a-tela-depois-do-conjunto: Depois de escolher um conjunto, a parede de sugestões continua ocupando mais de uma tela no celular

- **Status:** aberto — decisão de produto
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri cadastrando peças
- **Journey Step:** J-cadastrar-peca-com-variacoes, escolher valores sugeridos
- **Scenarios:** PNL-variacoes-sugestao-de-nome-e-valores
- **Found:** 2026-10-26 · **Report:** docs/qa/reports/2026-10-26-opcoes-e-variacoes-reteste.md

## Summary

Consequência das duas decisões de 2026-10-26 (OPV-19: "os chips ficam enquanto sobrar valor não
usado"; "o conjunto que a opção já tem inteiro sai e dá lugar ao seguinte"), medida contra o catálogo
real: com "Tamanho", o bloco de sugestões tem **986 px** de altura em 390 (3 conjuntos + 50 chips).
Depois de tocar em "16, 17, 18" ele continua com **936 px**: 47 chips e três conjuntos novos de outras
escalas ("6mm, 8mm", "45cm, 50cm", "P (0,8x0,9cm), M (1x1,1cm)"). O campo de valores e a grade ficam
mais de uma tela abaixo, e um toque distraído acrescenta "6mm, 8mm" a uma peça de aro 16–18. Em 1440,
com "Cor", são 592 px.

Nada está errado em relação à spec — é a regra escrita fazendo o que diz.

## Reproduction

- **Charter:** CH-variacoes-cadastrar-pecas-repetidas · **Tour:** Data
- **Environment:** painel em `pnpm dev:backoffice` (:8083), Supabase local com o catálogo importado, Chromium (Playwright), 390 × 844, pt-BR

1. `/admin/produtos/novo` → Preços & variações → "Adicionar opção" → digitar "tam" → escolher "Tamanho".
2. Tocar no conjunto "16, 17, 18 em 3 produtos".

**Expected:** a decidir.
**Actual:** três linhas criadas (certo) e o bloco de 936 px com 47 chips e três conjuntos de outras escalas.

## Evidence

- `docs/qa/evidence/2026-10-26-opcoes-e-variacoes-reteste/R1-conjuntos-390.png`
- `docs/qa/evidence/2026-10-26-opcoes-e-variacoes-reteste/R1-conjuntos-1440.png`

## Decisão para a dona / produto

Opções:
1. Depois que a opção tem valores, recolher o bloco num "Ver sugestões (47)" — os chips continuam a um toque.
2. Depois que a opção tem valores, oferecer só conjuntos e chips que **compartilham** algum valor com ela (os da mesma escala).
3. Manter.

Recomendação: 1 — não muda a regra de quais sugestões existem (OPV-19/20), só quanto espaço elas
ocupam quando a Adri já escolheu; 2 é melhor para o dado mas muda a regra e falha com a primeira peça
de uma escala nova.
