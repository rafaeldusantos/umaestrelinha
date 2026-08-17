# tools/catalog-import — o importador da Nuvemshop

`@estrelinha/catalog-import`. Node + `tsx`, **executado à mão**, nunca em CI. Traz o catálogo real da
loja da Nuvemshop para o Supabase local. Leia [`../../CLAUDE.md`](../../CLAUDE.md) antes deste arquivo.

## Como rodar

```bash
pnpm --filter @estrelinha/catalog-import run import                      # import completo
pnpm --filter @estrelinha/catalog-import run import -- --dry-run         # lê e mapeia, não grava
pnpm --filter @estrelinha/catalog-import run import -- --limit=5         # ensaio com 5 produtos
pnpm --filter @estrelinha/catalog-import run import -- --stop-after=categorias
pnpm --filter @estrelinha/catalog-import run import -- --stop-after=perguntas   # para antes das imagens
pnpm --filter @estrelinha/catalog-import run import -- --report=reports/import.json
```

**O `run` não é opcional aqui, e omiti-lo não dá erro de script — dá erro de flag.** `import` é
**comando embutido do pnpm** (o que traz lockfile de outro gerenciador), então
`pnpm --filter … import --dry-run` é lido como o embutido e falha com
`Unknown options: 'dry-run', 'recursive'` — mensagem que não menciona o importador e manda procurar no
lugar errado. `run import` desambigua. **Nenhum outro script do repositório precisa disso**; este
precisa por causa do nome.

Credenciais no `.env` da **raiz** (`NUVEMSHOP_*`, `SUPABASE_SERVICE_ROLE_KEY`) — ver `.env.example`.

**É idempotente**: rodar de novo atualiza e cria zero duplicata. **Exit ≠ 0 significa que os totais não
fecharam ou que o import parou — não é aviso, é falha.**

**Typecheck tem tsconfig próprio** (não é solution-style):
`npx tsc --noEmit -p tools/catalog-import/tsconfig.json`. Baseline: **0**.

## O que ele semeia, e por que a semente não apaga curadoria

O importador é a origem de quatro conjuntos de dados que **a dona depois cura à mão**. A regra que
torna as duas coisas compatíveis é sempre a mesma: **a semente entra no INSERT, e no UPDATE só onde a
coluna ainda é `null`**.

| Semeia | Quanto | Onde a dona cura |
| --- | --- | --- |
| Catálogo | 680 produtos · 3.245 variações · 37 categorias | — |
| Material afetivo (`inferMaterial`, do nome) | 689 produtos | `/admin/produtos`, aba Geral |
| Perguntas frequentes (das descrições) | 67 entradas · 3.475 vínculos · 687 produtos | `/admin/perguntas` |
| Marca da origem | — | `/admin/produtos` |

**`null` é o terceiro estado de `requires_material`, e significa "nunca decidido".** É o marcador que
deixa o importador semear sem apagar a curadoria na execução seguinte. Todo consumidor passa por
`requiresMaterial()`, onde `null` é `false`.

**O importador NÃO remove o bloco de FAQ da descrição.** A descrição não é alterada no banco (decisão
do usuário: nada é destruído, e a origem na Nuvemshop segue intacta). A loja filtra no render; o painel
avisa e oferece remover por clique da dona.

## Curadoria de categoria — duas listas, dois desfechos

| Lista | O que faz | Como se desfaz |
| --- | --- | --- |
| `CURATED_INACTIVE` (Black Friday, Profissões) | preserva a linha, **desativada** | um clique em `/admin/categorias` |
| `CURATED_EXCLUDED` (a "Brinquedos" com handle da marca anterior, e "Rastreio") | **não emite** a linha e **apaga** a que já existir | tirar da lista e reimportar |

O relatório tem **uma seção para cada** — juntá-las diria "curada" para dois desfechos que exigem
ações diferentes de quem lê. O catálogo passou de **39 para 37 categorias** (feature `23`).

- **As duas listas são chaveadas por `nuvemshop_id`, nunca por slug**, por dois motivos independentes:
  slug muda na origem (curadoria presa a um slug renomeado deixa de aplicar, em silêncio), e um
  daqueles slugs **é a marca anterior** — chavear por slug plantaria aquela string em código novo e
  derrubaria a `brandScan`. **Vale para o comentário também**: descrever o caso sem escrever a string
  faz parte da regra.
- **Filha de categoria excluída viraria raiz em silêncio** (é como `parentOf` trata pai ausente). As
  duas excluídas são folhas, e o teste assere isso **na fixture** em vez de assumir. O corte acontece
  antes de qualquer derivação, então a `sort_order` das raízes continua contígua.

## Extração de perguntas frequentes

A fronteira do bloco tem **um dono e três consumidores em dois runtimes**: `faqBlockRange` /
`extractFaqPairs` / `stripFaqBlock`, em `@estrelinha/core/faq/block.ts`. O importador (Node) extrai, a
loja (browser) filtra, o painel avisa e remove. **Node não tem `DOMParser`**: por árvore não serviria
às três pontas — é por isso que esse módulo é a única exceção do projeto à proibição de regex sobre
HTML. Detalhe em [`../../packages/core/CLAUDE.md`](../../packages/core/CLAUDE.md).

**São DOIS arranjos de HTML, não um.** 617 produtos usam um `<p>` por par; **70 põem todos os pares num
`<p>` só**, separados por `<br />`. A leitura ingênua perde **312 pares** em silêncio.

## Os dois guardas

| Guarda | O que derruba |
| --- | --- |
| `apiShape.test.ts` | a Nuvemshop mudar a forma de um campo que o mapeamento lê; a fixture perder um dos casos de borda; a origem passar a ter campo de ordenação de categoria |
| `db.test.ts` (`selectAll`) | uma leitura de "o que já existe" voltar a usar `select` simples e ser **truncada em 1.000 linhas pelo PostgREST** |

O segundo é o mais fácil de reintroduzir: um `select` sem paginação parece correto, passa em teste com
fixture pequena, e em produção lê 1.000 de 3.245 linhas — o import então "cria" duplicata do que já
existia. **Toda leitura de estado atual passa por `selectAll`.**

## Baseline

**335 testes em 16 arquivos.** A baseline esteve velha uma vez e a diferença ficou explicada: dizia 276
(registrada em `d1d877f`) e o commit `ce143f2` acrescentou **exatamente 23** — 23 `it(` adicionados, 0
removidos — sem atualizar o número. Se a contagem não bater, procure o commit antes de suspeitar de
teste fantasma.
