# 80 — Prova em navegador

2026-10-22 · Chromium (Playwright) · painel deste worktree em `vite --port 8093` · **banco local de
verdade** (Supabase em 54441, migration aplicada por `psql`) · login `admin@umaestrelinha.dev`.

## O percurso

| # | O quê | Viewport | Resultado |
| --- | --- | --- | --- |
| 1 | Aba Preços & variações do produto `5ed2e69f…` | 390×844 | card **Fornecedor** logo abaixo de *Preço padrão*, selo "Só no painel", ajuda do Custo "Quanto a peça custa no fornecedor." Card em x 24–366 (dentro da tela) |
| 2 | Digitar "Ateliê Prata Fina" | 390 | a lista oferece **"Criar ‘Ateliê Prata Fina’"** |
| 3 | Escolher, link `https://www.exemplo.com/item/pingente-pit-bull-123`, **Salvar e publicar** | 390 | aviso "Produto atualizado — As alterações já estão na loja.", a página **fica**. No banco: `Ateliê Prata Fina | https://www.exemplo.com/item/pingente-pit-bull-123` |
| 4 | Coluna lateral | 390 | card **Fornecedor** com o nome e o link `exemplo.com/item/pingente-pit-bull-123`, `target=_blank`, `rel="noopener noreferrer"`, alvo **44px** |
| 5 | Outro produto (`86e899bf…`), digitar "atelie" | 390 | sugestões: "Ateliê Prata Fina" e "Criar ‘atelie’", as duas com **44px** de altura |
| 6 | Enter, Salvar e publicar | 390 | no banco: **1** fornecedor, **2** produtos vinculados — reaproveitou, não duplicou |
| 7 | Listagem | 390 | cabeçalho com **Fornecedor** entre Categorias e Preço; atalho da peça **44×44**; `scrollWidth` do documento **390** (sem rolagem horizontal) |
| 8 | Filtro "Ateliê Prata Fina" | 390 | 2 linhas, rodapé **"1–2 de 2"**, chip "Fornecedor: Ateliê Prata Fina" |
| 9 | Listagem com o filtro | 1440×900 | coluna, filtro e chip na mesma linha dos outros (`80-lista-1440.png`) |

Capturas em `.playwright-mcp/` da árvore principal (`80-criar-390.png`, `80-lateral-390.png`,
`80-lista-390.png`, `80-lista-1440.png`).

## Achado fora da feature

**A página do produto rola na horizontal em 390** (`scrollWidth` 819): quem estoura é a tabela de
**Variações** (`VariantsTable`, 825px), que é anterior a esta feature. O card do fornecedor está
dentro da tela. Registrado no handoff, não consertado aqui.

## O que não foi medido

- O painel em 390 com o **teclado virtual** aberto sobre a lista de sugestões (Playwright não abre teclado).
- A corrida do nome único (dois saves simultâneos criando o mesmo fornecedor) — provada por teste de
  unidade com o 23505 encenado, não em navegador.
