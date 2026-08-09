# Arquivo — a Nanita

Este diretório guarda a documentação da loja que **deu origem** a este repositório: a Nanita,
e-commerce de bottons temáticos de cultura pop. A feature
[`20-rebrand-uma-estrelinha`](../../features/20-rebrand-uma-estrelinha/spec.md) converteu o
código para a **Uma Estrelinha** — joias afetivas artesanais em resina, feitas com material do
cliente — sob a decisão [`AD-016`](../../STATE.md).

O código não tem mais nada da marca anterior: a varredura
`apps/store/src/shared/lib/__tests__/brandScan.test.ts` percorre `apps/`, `packages/`, `supabase/` e
os arquivos de configuração da raiz e falha com caminho e linha em qualquer ocorrência. **A
documentação é o contrário: ela só vale se for preservada.**

## Por que isto não foi apagado

Apagar teria custado três coisas que ainda são úteis, e que nenhuma delas é sobre bottons:

1. **O porquê das decisões que continuam valendo.** `AD-001`..`AD-017` seguem **vivas** no
   [`.specs/STATE.md`](../../STATE.md) — pagamento (API de Orders do Mercado Pago), e-mail
   transacional (duas portas e um motor, idempotência por RPC), categorias como única entidade de
   conjunto, e a regra de que desconto por item nunca soma. Nada disso depende do que a loja vende.
   As specs aqui arquivadas são a **fundamentação** dessas decisões: quem quiser contestar uma
   delas precisa do argumento original, não do resumo.
2. **Os defeitos já pagos.** `qa/bugs/` registra bugs reais com causa raiz — o remetente de auth
   não verificado que derrubou todo o login por código (`BUG-20260728`), o `pg_temp` que quebrava o
   `db reset`, o `PGRST204` de coluna declarada em tipo mas ausente no banco. São armadilhas do
   **stack**, não do produto, e o repositório continua exposto às mesmas.
3. **A régua de qualidade.** As 19 features fecharam com Verifier independente, sensor de
   discriminação e baselines medidas. É o padrão que a feature 20 seguiu e que a 21 e a 22 seguirão.

## O que está aqui

| Caminho | O que é |
| --- | --- |
| `features/01-19` | As 19 features da Nanita — spec, design, tasks, context e validation de cada uma |
| `qa/` | A árvore de QA viva (personas, jornadas, charters, cenários, registro de bugs, evidências) |
| `project/` | `PROJECT.md` (visão e stack da Nanita), `PRD-REVISAO.md` (auditoria de 2026-07-18) e o `STATE.md` de programa |
| `brand/nanita-v2/` | A identidade "papelaria" da feature 19: SVGs da marca, gerador de `paths.ts`, favicon |
| `DEPLOY.md` | O guia de produção da Nanita — projeto Supabase `mfdgqlirsjswxpbhgxig` e os dois projetos Vercel |

## O que **não** vale mais aqui dentro

- **Nenhum caminho de arquivo.** O escopo npm virou `@estrelinha/*`, os tokens viraram
  `--estrelinha-*`, e o Mockup Studio (features `05` e `06`) foi removido inteiro — código, rota,
  tabela `mockup_templates` e bucket.
- **`DEPLOY.md` aponta para a infraestrutura da loja anterior.** A Uma Estrelinha **não tem projeto
  Supabase hospedado nem projeto Vercel** — o desenvolvimento roda contra a instância local
  (`54341`) e o go-live depende de credenciais que ainda não chegaram (`C-08`). O arquivo continua
  aqui porque o *procedimento* (o que sobe por Actions, por que o `config.toml` não sobe) segue
  correto; os **identificadores**, não.
- **A proibição de renomear `nanapin`.** Ela existia para proteger o `localStorage` de clientes
  vivos da Nanita — carrinho e wishlist órfãos. A Uma Estrelinha não tem um navegador sequer com
  estado desta loja, e a regra foi revogada por `AD-016`.

## Para quem procura o estado atual

- Instruções do projeto: [`CLAUDE.md`](../../../CLAUDE.md) na raiz.
- Identidade e paleta: [`DESIGN.md`](../../../DESIGN.md) na raiz.
- Decisões vigentes e handoff: [`.specs/STATE.md`](../../STATE.md).
- Features ativas: `20-rebrand-uma-estrelinha` (esta conversão), `21-catalogo-nuvemshop` (importação
  do catálogo real) e `22-material-afetivo` (o envio do material pela cliente).
