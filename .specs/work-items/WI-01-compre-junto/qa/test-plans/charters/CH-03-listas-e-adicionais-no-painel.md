# CH-03 · Listas e adicionais no painel sob maus-tratos

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P0                                                                            |
| Persona      | PER-02 Adri                                                                   |
| Tour         | Garbage                                                                       |
| Modo         | por técnica (valor limite)                                                    |
| Time-box     | 60 min · orçamento: 50 ações                                                  |
| Mudança      | Nasce o menu Catálogo › Compre Junto (índice e editor de listas) e a aba "Compre junto" no formulário do produto, que substitui o card antigo. Critérios: CA-01.1, CA-01.2, CA-01.3, CA-01.6, CA-02.1, CA-02.2, CA-02.3, CA-02.4, CA-02.5, CA-02.6, CA-02.8, RNF-07 |
| Viewport     | 1440 × 900                                                                    |
| Entrada      | `/admin/compre-junto` · logada como `admin-painel`; a loja aberta em outra aba |
| Jornadas     | J-03                                                                          |
| TC           | TC-SMOKE-003, TC-JOURNEY-003, TC-FUNC-029, TC-FUNC-030, TC-FUNC-031, TC-FUNC-035, TC-FUNC-036, TC-FUNC-038, TC-FUNC-039, TC-FUNC-040, TC-SEC-001, TC-PERSONA-002 · com o Dev (não executados na sessão): TC-INT-002, TC-INT-007 |

Esta sessão roda **primeiro**: a lista "Correntes" e os adicionais do pingente que ela monta são a massa das sessões da loja (ver Critérios de entrada do plano).

## Missão

Confirmar que a dona monta a lista e os adicionais sem perder o que fez, mesmo empurrando os limites (40 caracteres, 12 peças, 3 adicionais), e que toda recusa vem escrita, com o motivo.

## Deve tentar

1. Nome da lista com 40, 41 e 0 caracteres, colado com espaços e emoji; salvar a lista sem peças e tentar escolhê-la num adicional.
2. Acrescentar 12 peças e tentar a 13ª; acrescentar 3 adicionais e tentar o 4º; tirar um e ver a recusa sumir.
3. Buscar como adicional o próprio produto e uma peça já escolhida em outro adicional; limitar variações e voltar a "Oferecer todas".
4. Gravar o pingente e abrir outro produto que tinha Compre Junto: nada mudou nele. Sair do painel (logout) e abrir `/admin/compre-junto` direto.

## Edge cases sugeridos

- Duplo clique em "Salvar lista" e no salvar do produto
- Colar um nome de planilha com tabulação
- Reordenar pela alça e pelos botões subir/descer e salvar no meio
- Tirar a peça escolhida ("Trocar") e salvar com adicional incompleto
- Voltar do editor com alterações não salvas
- Abrir a URL de uma lista inexistente (`/admin/compre-junto/listas/<id qualquer>`)
- Buscar sem acento ("corrente veneziana" × "Veneziana")

## Fora do escopo

- O relatório de adesão e a forma do bloco — CH-04
- As outras abas do formulário do produto (Geral, Perguntas, Preços & variações, SEO, Relacionados): a mudança não toca; o que aparecer ali é backlog
- O campo "Desconto ao levar junto" do protótipo (Work Item 92) — não nasce aqui
- A faixa "convertido do antigo" do protótipo (não construída por decisão da T02)
- Aviso de que o principal já tem a corrente como variação (PRD › Fora)
