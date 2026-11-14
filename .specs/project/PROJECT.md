# Uma Estrelinha

## Visão

Loja virtual de joias afetivas artesanais em resina (D2C), com loja pública, Backoffice e o app do
ateliê no celular, sobre um único backend Supabase. Registro memorial: nada festivo, nada de urgência.

## System Instructions (fonte da intenção)

| Dimensão     | Onde está |
| ------------ | --------- |
| ARCHITECTURE | `CLAUDE.md` §Layout do monorepo, §Feature-Sliced Design, §O "defeito 01"; `packages/core/CLAUDE.md` |
| TESTING      | `CLAUDE.md` §Comandos (as três armadilhas de medição), §Os guardas, §Baselines |
| CODE STYLE   | `CLAUDE.md` §Convenções; `DESIGN.md`; `apps/<app>/CLAUDE.md` |
| INTEGRATIONS | `supabase/CLAUDE.md` (migrations, RLS, edge functions, secrets) |
| CONCERNS     | `CLAUDE.md` §O "defeito 01", §Estado conhecido / dívidas; `.specs/LESSONS.md` |

## Topologia

- **Forma:** monorepo (pnpm workspaces + Turborepo)
- **Onde estão os repositórios:** o próprio repositório; os workspaces estão em `pnpm-workspace.yaml` (`apps/*`, `packages/*`, `tools/*`, `supabase`)
- **Conferência de fronteira entre repositórios:** não

## Fontes de design

| Fonte | Localizador | Mecânica |
| ----- | ----------- | -------- |
| Claude Design | por Work Item: os links do pedido, de `item.md` › Insumos e da seção UI/UX do `prd.md` | `claude_design` (MCP `claude-design`, `read_file` por projeto e arquivo) |

## Comandos de verificação

| Repositório | Tipos | Um arquivo de teste | Verificação mínima | Origem |
| ----------- | ----- | ------------------- | ------------------ | ------ |
| `.` (monorepo) | `instruções` (`CLAUDE.md` §Comandos: `npx tsc --noEmit -p apps/<app>/tsconfig.app.json`, `packages/core/tsconfig.json`) | `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000` | `instruções` (`CLAUDE.md` §Baselines: suíte do workspace tocado, exit fora de pipe, mais a suíte da loja quando o painel ou o app mudam) | `instruções §Comandos/§Baselines` · o comando de um arquivo derivado de `CLAUDE.md` §Comandos/§Baselines (o `--testTimeout=20000` sem o `--`), autorizado com a execução em 2026-11-01 |

## Ambiente local

| Repositório | O que é | Conferir que está de pé | Aplicar migration nele |
| ----------- | ------- | ----------------------- | ---------------------- |
| `.` | Supabase local, portas 54440–54449 (API 54441, Postgres 54442); as edge functions são servidas à parte, com `supabase functions serve --env-file <arquivo com chaves externas inválidas>` (nunca o `.env` da raiz) | `supabase status`; functions: `POST /functions/v1/<nome>` com corpo vazio responde 400 | `supabase migration up --local` (nunca `--linked`; nunca `supabase stop --all`) |

**No browser (QA e prova em navegador)** — o que vale para toda sessão, e é o que a seção *Ambiente da execução*
do plano de QA leva aos exploradores (eles rodam sem o `CLAUDE.md`):

- **Apps:** loja `http://localhost:8082`, painel `http://localhost:8083`, ateliê `http://localhost:8084`.
- **Bloquear antes do primeiro `open`:** `**/*.supabase.co/**` (o banco local guarda `image_url` do Storage
  hospedado, e abrir a Home faria requisição a ele) e `**/g/collect*` (o GA4 envia por `analytics.google.com`:
  bloqueie pelo caminho, nunca só pelo domínio).
- **E-mail de dev:** Mailpit em `http://localhost:54444` — todo código de acesso e confirmação cai ali.
- **Viewport alvo:** `390 × 844` primeiro (≈90% dos acessos são de celular); `1440 × 900` depois. Telas novas
  também a 130% e 200% de fonte.
- **Nunca:** pagar de verdade nem digitar número de cartão; chamar serviço externo real (Mercado Pago, Resend,
  Melhor Envio, Claude API) — as functions locais sobem com chaves inválidas; `supabase stop --all`.
- **Credenciais:** por variável `QA_<CONTA>_USUARIO` / `QA_<CONTA>_SENHA`, nunca o valor em log ou briefing.

## Escopo

**Inclui:** loja pública (`apps/store`), Backoffice (`apps/backoffice`), app do ateliê (`apps/mobile-adm`), regras em `packages/core`, banco e edge functions em `supabase/`.
**Fora:** o importador da Nuvemshop só quando o Work Item o nomear.

## Restrições

- Migration só no banco local; produção só a pedido explícito do usuário.
- Commit só quando o usuário pedir.
- Testes, probes e provas só contra o Supabase local.
