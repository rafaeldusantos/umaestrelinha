# Backlog do QA — WI 103

## Bugs (medium/low, não bloqueantes)

Nenhum. Os sete bugs do WI (BUG-001..007) estão `resolved` desde a rodada 3 (2026-11-17).

## Sugestões de backlog — viram Work Item novo, não fix task deste

Rodada 3 (confirmação, 2026-11-17) — achados pré-existentes, medium, fora da superfície da mudança:
- N-1 · Foco do teclado nunca fica debaixo do cabeçalho fixo do painel — editores da Home a 200 % em 390 px: o campo "Acrescentar uma peça" (e itens de "Produtos em destaque") param sob o cabeçalho de 112 px ao voltar com Shift+Tab; falta `scroll-padding-top` (toca o RNF-04 pelo componente do painel, não pelo editor)
- N-2 · Editor "Produtos em destaque" sem rolagem lateral a 200 % — textos de ajuda `shrink-0` ("6 de 12 · arraste…", "no celular, 2 por linha…"); documento a 539 px
- N-3 · "Novo cupom" sem rolagem lateral a 200 % — seletor de tipo de desconto (`w-fit`); documento a 448 px
- N-4 · "Nova promoção" com "Salvar promoção" inteiro e sem rolagem lateral a 200 % — rótulo na barra do topo e seletor de alcance; documento a 605 px (401 px a 130 %)
- N-2..N-4 podem virar um WI só: "Formulários do painel sem rolagem lateral com a fonte a 200 % no celular" (decisão do humano)

Rodada 2 (confirmação, 2026-11-17):
- Loja sem rolagem lateral com a fonte a 200 % no celular — cabeçalho da loja, fileira "Decorativos", halo do WhatsApp e `/ofertas` (pré-existente)
- Aviso de falha do editor sem texto técnico do erro — editor do bloco, falha da conferência das peças ("TypeError: Failed to fetch") (polimento)
- Contador do título e da descrição do bloco marca o estouro ao digitar — editor do bloco, Conteúdo (polimento; reiterado da rodada 1)

Rodada 1: as 19 sugestões em `qa-result-2026-11-17-rodada-1.md` › Sugestões de backlog continuam valendo.

## Cobertura pendente (premissas P-02 e P-03, mantidas em 2026-11-17)
- TC-FUNC-007 não rodou em nenhuma das três rodadas: CA-03.3 (teto de 12 peças) e CA-01.6 (título acima de 60, caso completo) ficam sem caso executado de ponta a ponta. Rodar num próximo QA ou na `pd-workflow-qa`.
