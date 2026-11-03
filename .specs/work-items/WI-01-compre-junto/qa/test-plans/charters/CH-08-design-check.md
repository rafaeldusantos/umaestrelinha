# CH-08 · design-check — bloco, barra fixa, sacola e telas do painel · Claude Design

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | design-check                                                                  |
| Prioridade   | P1                                                                            |
| Persona      | PER-02 Adri (as telas da loja são públicas e se conferem sem login)           |
| Tour         | —                                                                             |
| Modo         | —                                                                             |
| Time-box     | 60 min · orçamento: 50 ações                                                  |
| Mudança      | As telas novas da loja (bloco nas três formas, barra fixa com o conjunto, gaveta com "acompanha") e do painel (índice e editor de listas, aba "Compre junto" do produto, aba Adesão). Critérios: CA-03.14, CA-04.9, CA-05.1, CA-09.1, CA-01.1, CA-02.1, CA-06.4 |
| Viewport     | os dos frames: 390 e 1440 na loja; 1440 e 390 no índice e na adesão do painel |
| Entrada      | `/produtos/<slug do pingente>` (loja) · `/admin/compre-junto` logada como `admin-painel` |
| Jornadas     | —                                                                             |
| TC           | TC-UI-001, TC-UI-002, TC-UI-003, TC-UI-004, TC-UI-005, TC-UI-006              |

## Missão

Conferir, tela a tela, as telas entregues contra os protótipos do Claude Design do Work Item, registrando cada diferença com o valor do design e o observado.

## Deve tentar

1. Bloco na forma "Na linha" em 390 e 1440: estrutura, textos literais (título, frase, rodapé, mensagens de falta), estados (nada marcado, marcado incompleto, completo).
2. Barra fixa com e sem conjunto; gaveta com "Acompanha o <nomes>".
3. Formas "Em folha" e "Com fórmula".
4. Painel: índice (tabela e cartões), editor de lista, aba "Compre junto" do produto, aba Adesão.

## Edge cases sugeridos

- Estado vazio do índice (sem listas)
- Peça "saiu do ar" no editor
- Relatório sem venda (estado vazio — decidido por escrito em CA-06.4, não desenhado)

## Fora do escopo

- A escolha da forma no painel: não está desenhada em nenhuma fonte (spec › Design); conferir só pelo design system, sem régua de protótipo
- O selo "saiu do ar" em adicional do tipo peça na aba do produto, a frase "acompanha" na confirmação/Minha Conta/painel, os estados de carregando e erro do painel: sem frame — registrar "sem frame", não comparar
- O campo "Desconto ao levar junto" do protótipo do painel (Work Item 92) e a faixa "convertido do antigo" (não construída) — o design traz, o PRD exclui: `spec-gap` já resolvido, não diferença
- Dados fictícios do protótipo (nomes, preços, contagens) não são régua
- Alvos de 44 px, rolagem em 390 e fonte a 200% não estão no design — são do CH-07

## Design

**Fonte de design:** três arquivos do Claude Design · `claude_design` · de `item.md` › Insumos

- Loja — projeto "Uma Estrelinha - Loja": https://claude.ai/design/p/69224d8a-17ae-4b1f-a251-a8105b41edc2?file=Produto+-+Compre+Junto.html
- Painel, aba do produto — projeto "Uma Estrelinha - Backoffice": https://claude.ai/design/p/e3957c10-bd49-4f3d-9256-04d72a7d0f41?file=Produto+-+Compre+Junto.html
- Painel, listas e adesão — projeto "Uma Estrelinha - Backoffice": https://claude.ai/design/p/e3957c10-bd49-4f3d-9256-04d72a7d0f41?file=Compre+Junto+-+Listas+e+ades%C3%A3o.html

O comportamento dos protótipos está nos `.jsx` do projeto (`cj-loja-*.jsx`, `cj-admin-*.jsx`); liste os arquivos antes de ler.

| Tela do app (rota)                                | No design (frame, nó ou arquivo)                                  | Viewports com frame | Estados a conferir                                         |
| ------------------------------------------------- | ----------------------------------------------------------------- | ------------------- | ---------------------------------------------------------- |
| `/produtos/:slug` — bloco "Na linha"              | Loja · `Produto - Compre Junto.html` (forma A)                    | 390 · 1440          | nada marcado · marcado incompleto (falta) · completo com total · principal indisponível |
| `/produtos/:slug` — barra fixa e gaveta da sacola | Loja · `Produto - Compre Junto.html` (barra fixa, gaveta)         | 390                 | sem conjunto · com conjunto · linha "Acompanha o …"        |
| `/produtos/:slug` — "Em folha" e "Com fórmula"    | Loja · `Produto - Compre Junto.html` (formas B e C)               | 390 · 1440          | folha/diálogo aberto · faixa da fórmula                    |
| `/admin/compre-junto` e `/admin/compre-junto/listas/:id` | Backoffice · `Compre Junto - Listas e adesão.html`         | 1440 · 390 (índice) | índice com listas · vazio · editor · peça fora do ar · recusa da 13ª peça |
| `/admin/produtos/:id/editar` — aba "Compre junto" | Backoffice · `Produto - Compre Junto.html`                        | 1440                | sem adicionais · com lista · com peça só · recusa do 4º    |
| `/admin/compre-junto/adesao`                      | Backoffice · `Compre Junto - Listas e adesão.html` (Adesão)       | 1440 · 390          | por joia · por lista · lista sem venda                     |
