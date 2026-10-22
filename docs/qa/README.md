# QA — Uma Estrelinha (living docs)

Árvore viva de QA do monorepo, no formato das skills `qa-report` (planeja) e `qa-execution` (executa).
Cada ciclo **acrescenta** a esta árvore; nada é recriado por rodada.

## Códigos de área (ids de cenário)

| Código | Superfície |
| --- | --- |
| `MAD` | `apps/mobile-adm` — o painel do ateliê no celular (programa `72`–`79`, `AD-056`) |
| `LOJA` | `apps/store` — a loja pública |
| `PNL` | `apps/backoffice` — o painel desktop |

Área nova entra aqui antes do primeiro cenário dela.

## Entradas e como subir

| App | Dev | Build servido (prova de PWA) |
| --- | --- | --- |
| loja | `pnpm dev:store` → http://localhost:8082 | `pnpm --filter @estrelinha/store build && … preview` |
| painel | `pnpm dev:backoffice` → http://localhost:8083/admin | — |
| ateliê (mobile-adm) | `pnpm dev:mobile-adm` → http://localhost:8084 | `pnpm --filter @estrelinha/mobile-adm build && pnpm --filter @estrelinha/mobile-adm preview` (o service worker só existe no build) |

Supabase local na faixa 54440–54449 (API :54441, Mailpit :54444). Sem Docker, a sessão intercepta
`**/auth/v1/**` e `**/rest/v1/**` no Playwright (rotas avaliadas em ordem **inversa** de registro).

**O mobile-adm é só Android.** A instalação, o `standalone` e os gestos do sistema só se provam num
aparelho: esses cenários ficam `blocked-verify` até a dona (ou quem tiver o aparelho) andar por eles.

## Política de evidência

Padrão das skills: `evidence/` e `state.csv` são **gitignored** (bloco já no `.gitignore` da raiz).
Screenshots só de checkpoint e de falha; o relatório datado é o registro durável.

## Adotado de

- `reports/2026-10-10-checkout-frete-parcelas.md` e `reports/2026-10-17-retirada-no-escritorio.md`:
  ciclos anteriores ao bootstrap completo desta árvore. Os charters citados neles (`CH-ativar-painel`,
  `CH-checkout-rs-mobile`…) nunca viraram arquivo e não foram migrados: ficam como histórico, indexados
  por aqui.
- `bugs/BUG-20260809-…` e `bugs/BUG-20260829-…`: já corrigidos, mantidos com o id original.
- Provas em navegador por feature continuam em `.specs/features/<nn>-*/prova-*.md`; esta árvore é a
  camada de jornada por persona por cima delas.
