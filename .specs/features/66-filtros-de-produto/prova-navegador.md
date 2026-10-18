# 66 — Prova em navegador (T18)

2026-10-18 · Chrome (Playwright, `channel: 'chrome'`) · dev servers da loja (:8082) e do painel
(:8083) · **Supabase local de pé**, com dados curados no banco local: 3 grupos (Tipo de joia,
Acabamento, Para quem), 13 valores, 970 marcações por nome/tag. "Chaveiro" e "Família" ficaram com
zero peças de propósito.

## Loja — `/joias-afetivas` (516 produtos)

| Medida | 1440 × 900 | 390 × 844 |
| --- | --- | --- |
| rolagem horizontal do body (sem filtro / filtrada / busca) | **zero** (1440/1440) | **zero** (390/390) |
| ordem dos blocos | Faixa de preço · Tipo de joia · Acabamento · Para quem · Disponibilidade | idem, no sheet |
| valor sem peça na categoria (Chaveiro, Família) | **ausente** | **ausente** |
| altura dos chips de valor | 24 (sidebar) | **44** em todos os 11 |
| chip quebrando linha | nenhum | nenhum |
| sheet `scrollWidth`/`clientWidth` | — | 390/390 |
| Prata 925 → URL | `?acabamento=prata-925` | idem |
| + Pingente → URL | `?tipo-de-joia=pingente&acabamento=prata-925` | idem |
| contagem disjuntiva com os dois marcados | Pingente (35) · Prata 925 (35) · página "35 produtos" | idem |
| F5 | mantém os dois, 35 produtos | idem |
| link colado em contexto novo (aba anônima) | 35 produtos, canônica `/joias-afetivas` | idem |
| `history.length` depois de 2 toques | 2 (o `replace` não empilha) | 2 |
| link com valor/grupo inexistente + `utm_source` | ignorado, 516 produtos, sem erro | idem |
| busca `q=anel` → Prata 925 | `/busca?q=anel&acabamento=prata-925`, os 3 grupos na busca | idem |
| erros de página | nenhum | nenhum |

No celular os chips ativos não aparecem como fileira acima da grade, e sim como selo no botão
("Filtros 2"). Isso **já era assim** antes da `66` (`hidden md:flex` no `HEAD`), e é o mesmo
tratamento dos chips de sistema (FLT-25 diz "como os de sistema").

## Painel

| Medida | 1440 × 900 | 390 × 844 |
| --- | --- | --- |
| `/admin/filtros` sem rolagem horizontal | sim | sim |
| lista ⇄ editor por URL (`/admin/filtros/:groupId`) | editor ao lado | editor em tela própria, com voltar |
| controles abaixo de 44 no editor | 3 interruptores de 24px de altura, com `SWITCH_TAP_44` (pseudo de 44, que `getBoundingClientRect` não mede) | nenhum |
| marcar em massa: 2 não marcadas → "Marcar 2 produtos" | 183 → 185 e 185 → 187 (duas execuções) | — |
| remover de 4 marcadas | 187 → **183** (volta ao original) | — |
| bloco "Filtros da loja" no produto | lê as marcações gravadas (Colar, Pet) | idem, sem rolagem |
| "Filtros nesta categoria" no inspetor | visível | visível, sem rolagem |
| erros de página | nenhum | nenhum |

## Achados que NÃO são da `66`

- **A tabela de `/admin/categorias` encavala as colunas em 390**: nome, produtos e o interruptor
  "Na vitrine" se sobrepõem, e o nome fica embaixo do interruptor (o clique não chega). A `66` só
  acrescentou um slot no inspetor (`git diff --stat`: 6 linhas em `AdminCategoriesPage.tsx`).
- **O rodapé do inspetor de categoria encosta na borda direita em 390** (o "Salvar" toca o limite da
  tela). Mesma origem: layout anterior do inspetor.
- O selo "Últimas" no card da loja (o `CLAUDE.md` já registra a proibição de urgência fabricada).

## O que ficou fora da medição

O arraste para reordenar grupos e valores; leitor de tela; o slider de preço arrastado (o `replace`
foi provado pelos chips); o voltar do Android saindo da categoria; LCP/CLS da categoria com o embed
novo.
