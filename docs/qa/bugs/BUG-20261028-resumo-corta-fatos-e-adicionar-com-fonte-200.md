# BUG-20261028-resumo-corta-fatos-e-adicionar-com-fonte-200: Com a fonte do celular a 200 %, o Resumo corta "Não controla" e o "Adicionar" vaza do ladrilho

- **Status:** fixed — retestado em navegador (2026-10-28, working tree, sem commit; `verified` depois do commit) · reteste em `reports/2026-10-28-backoffice-resumo-com-imagens-reteste.md`
- **Impact (user-side):** Friction
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Adri cadastrando peças (fonte do sistema grande)
- **Journey Step:** J-ver-e-cuidar-das-fotos-da-peca, abrir a peça e ler o Resumo
- **Scenarios:** PNL-midia-fonte-grande-e-telas
- **Found:** 2026-10-28 · **Report:** reports/2026-10-28-backoffice-resumo-com-imagens.md

## Summary

Com a fonte do sistema a 200 %, a Adri lê no Resumo "Estoque · Não contro" — a palavra é cortada pela borda do
card — e o rótulo "Adicionar" do ladrilho de 72 px passa por cima da borda tracejada. A 130 % o card fica inteiro.

## Reproduction

- **Charter:** CH-midia-celular-e-fonte-grande · **Tour:** Feature Tour
- **Environment:** 360/390/412 × 844, `html { font-size: 200% }`, Chromium, pt-BR

1. Abrir `/admin/produtos/eb0d919d-…/editar` (6 fotos, estoque "Não controla").
2. Rolar até o Resumo.

**Expected:** fatos e rótulos dentro do card, embrulhando se preciso (`PNL-midia-fonte-grande-e-telas`).
**Actual:** o `<dd>` "Não controla" termina em x = 377, além da borda do card (nas três larguras); o conteúdo do
ladrilho "Adicionar" mede 87 px dentro de 72 px. "Peso de envio" quebra em três linhas e o ícone encolhe. A rolagem
lateral do documento a 200 % (`scrollWidth` 642) vem da aba Geral (SlugField, sugestões de filtro) — anterior, não
do Resumo.

## Evidence

- `evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-21-resumo-card-390-fonte200.png`, `evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-20-resumo-390-fonte200.png`
- Medida por `getBoundingClientRect` em 360/390/412 × 100/130/200 % (relatório, sessão 5): só a 200 %.

## Fix

- **Root cause:** as linhas de fato do Resumo eram `flex items-center justify-between` sem `min-w-0` nem quebra, e o ladrilho "Adicionar" não cortava o próprio conteúdo.
- **Fix commit:** commit pendente (sem commit, regra do projeto) — aplicado na working tree: `apps/backoffice/src/pages/admin/AdminProductFormPage.tsx` — cada linha do `<dl>` é `flex-wrap`, `<dt>` com `min-w-0`, `<dd>` com `ml-auto min-w-0 break-words text-right`, ícones `shrink-0`; `features/product-form/ui/ProductMediaSummary.tsx` — o ladrilho continua 72×72, ganha `overflow-hidden`, e o rótulo visível é `block max-w-full truncate` (o nome acessível segue "Adicionar imagens").
- **Regression test:** `AdminProductFormPage.midia.test.tsx` › "os fatos do Resumo embrulham com a fonte grande" e `ProductMediaSummary.test.tsx` › "o rótulo visível do \"Adicionar\" fica dentro dos 72px" (token exato; jsdom não mede) — vermelhos antes, verdes depois. Reteste a 200 % em navegador pendente.

## Reteste (2026-10-28) — passou

Painel do worktree (:8093, bundle conferido: `break-words` na página, `overflow-hidden` e `max-w-full truncate` no
ladrilho), `eb0d919d-…` (6 fotos, "Não controla"), `html { font-size: 200% }`, `getBoundingClientRect`/`Range`:

| largura | card (x) | "Não controla" (texto) | fatos do `<dl>`, borda direita máx. | ladrilho "Adicionar" | rótulo visível |
|---|---|---|---|---|---|
| 360/200 % | 48–312 | 153–263 | 272 | 185–257 (72×72) | termina em 255, `Adi…` |
| 390/200 % | 48–342 | 124–293 | 293 | 185–257 (72×72) | termina em 255, `Adi…` |
| 412/200 % | 48–364 | 146–315 | 315 | 185–257 (72×72) | termina em 255, `Adi…` |

"Não controla" desce para a linha de baixo, alinhado à direita e dentro do card; "Peso de envio" embrulha com "300 g"
abaixo. O ladrilho corta o próprio conteúdo (`overflow: hidden`; rótulo `nowrap` + `ellipsis`); o nome acessível segue
"Adicionar imagens". A 100 % nada muda (texto do rótulo 61 px inteiro). `scrollWidth` 642 a 200 % continua, da aba
Geral, como já registrado — não do Resumo.

Paper cut (não reabre): a 200 % o rótulo visível vira "Adi…" — legível pelo "+" e pelo nome acessível, mas a palavra
some.

Evidência: `.playwright-mcp/85-reteste-01-resumo-390-fonte200.png`, `.playwright-mcp/85-reteste-02-adicionar-390-fonte200.png`
(na raiz do repositório principal).
