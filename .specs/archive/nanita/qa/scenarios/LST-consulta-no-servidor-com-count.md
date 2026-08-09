---
id: LST-consulta-no-servidor-com-count
area: LST
title: A listagem pagina e conta no servidor, com uma requisição por página
persona: Nana
journey: J-achar-e-corrigir-na-listagem
expected: Abrir a listagem faz uma requisição de página com range, o rodapé mostra "X–Y de N" com o count real do servidor, e nenhum select('*') do catálogo inteiro aparece na rede
entry_points: http://localhost:8081/admin/produtos
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: docs/qa/reports/2026-08-02-backoffice-catalogo-11-14.md
overlaps:
---

`PLS-01` + `PLS-02` AC 2. O defeito original: `select('*, categories(name)')` **sem `range` e sem
`count`**, trazendo o catálogo inteiro com `variants` JSONB e `images` de cada produto, filtrando e
paginando em memória.

**A prova é de rede, não de tela** — a tabela parece igual nos dois mundos. Observar as requisições ao
PostgREST (`Range`, `count=exact`) e não a aparência da lista.
