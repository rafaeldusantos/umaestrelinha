# WI 101 · Faixa de avisos no topo da loja — resumo da sessão

**Data:** 2026-11-13 · **Branch:** `feature/101` (local, sem push), worktree `store-worktrees/store__feature-101`, base
`master` (`eceb80c2`) · **Estado:** `fase: done`, Validation 1 PASS · QA real-user ainda por rodar.

## Commits na branch (`git log --oneline master..HEAD`)

| Commit | Tarefa |
| --- | --- |
| `41de8e4a` | T01 · A regra da faixa de avisos e a régua de destino interno |
| `18d3d3c8` | T02 · O HTML servido diz se a faixa existe |
| `347b7c86` | T04 · A tela "Faixa de avisos" do painel |
| `d65f3151` | T03 · A faixa de avisos na loja |
| `fe757bc5` | correção da T03 · o hook do giro em `shared/lib`, que tinha ficado fora do commit da tarefa |

76 arquivos, +4626/−172. Os artefatos do WI ficam fora desses commits; o orquestrador os commita na limpeza.

## O planejamento

- **PRD Tech Review r1:** o veredito foi `changes_requested_blocking`, com 12 achados.
  - O bloqueio: a premissa da RN-02 era falsa. A Home não passava pela função `api/page`, e só a página de produto lia `store_settings`.
  - O usuário pediu decisões pela recomendação em todas as paradas. Saldo: 5 trechos do PRD reescritos (RN-02, a altura, a arte, o giro de 6 s e o atraso, com o CA-08 novo) e 10 decisões na costura.
- **Lookups:**
  - 2 de design, nos dois protótipos do Claude Design.
  - 1 de código, no monorepo.
  - Cobertura completa: os 4 UCs no monorepo, sem fronteira.
- **Handoff principal:** 24 decisões (H-01..H-24), todas pela recomendação, nenhuma travada.
- **Fila:** 4 tarefas em 3 ondas (`01 | 02,04 | 03`). A auditoria disse `a fila serve com correção`, e as duas correções foram aplicadas:
  - o ordinal masculino;
  - uma citação deslocada.

## O que cada tarefa fez

| Tarefa | Repositório / áreas | O que passou a existir |
| --- | --- | --- |
| **T01** | `packages/core`, `packages/supabase`, guarda da loja | `core/announcements`: tipos texto e imagem, catálogo que recusa contagem regressiva, estoque e prova social, tetos 5 · 40/60/20 · 90 no conjunto, normalização, recusas com ordinal, `announcementBarExists`, alturas em `rem`, vagas da arte e o canal de prévia (`draft`/`show`/`ready`). A chave `announcements` desligada por padrão em `settings.ts` e em `DEFAULTS`. `ctaHrefRefusal` e `internalMenuHrefRefusal` recusam `//` e `/\` |
| **T02** | `packages/core/src/page`, `apps/store/server`, `apps/store/scripts` | Toda resposta HTML da loja, Home inclusive, grava `data-faixa="1"` ou `"0"` no `<html>`. Leitura que falha deixa o atributo de fora, com `no-store`. Na Vercel, o `index.html` sai da saída publicada e a Home passa a ser servida pela função; localmente fica, para o `vite preview`. Documentação e comentários atualizados |
| **T04** | `apps/backoffice` | `/admin/faixa-de-avisos`, no grupo Loja e no modo de foco. A tela tem: interruptor com o aviso do atraso; até 5 avisos com subir, descer, arrastar e tirar; tipos Texto e Imagem com contadores e recusas no campo; envio das duas artes; gravação por `upsert`. A prévia é a loja num iframe, com ponte de rascunho e "Aviso N de M". Guardas `previaUnica`, `folgaDoPalco`, `navItems` e `focusRoutes` atualizados. Probe `probes/04-faixa-no-banco.sh` (5 ok) |
| **T03** | `apps/store` | O hook `useHeroCarousel` desceu para `shared/lib`, com `intervalMs`; o Banner principal ficou igual. O widget `announcement-bar` entra no `StoreLayout` antes do cabeçalho e fica fora de checkout, PIX, montado, link de cartão e 404. A regra de existência: o atributo decide até a primeira troca de rota e a configuração decide depois. Entram também o `<picture>`, as setas a partir de 768, o recebedor da prévia, a entrada por `translateY` sem opacidade zero e o cabeçalho que só se recolhe depois que a faixa sai da tela. Guardas novos `faixaSemOpacidadeZero` e `tomDaFaixa` |

## Decisões e premissas da corrida (spec › Decisões, I-01..I-10)

- **I-01:** reusei o `ordinal` masculino de `core/home/carousel.ts`, em vez da terceira cópia que a tarefa pedia; quem manda é o `packages/core/CLAUDE.md`.
- **I-02:** a frase da recusa de destino externo é a do dono, `ctaHrefRefusal`, e as recusas de aviso saem como "Nº aviso: …".
- **I-03:** o canal de prévia ganhou `ready`, e o parser recebe o tamanho da lista.
- **I-04:** o atributo é `ANNOUNCEMENT_BAR_ATTRIBUTE = 'data-faixa'`. A configuração é lida uma vez por requisição, e o 301 não é marcado.
- **I-05:** o painel não tem `maxLength`; o contador e a recusa aparecem ao passar do teto.
- **I-06:** a arte vai para `home-images/announcements` (bucket existente, sem migration).
- **I-07:** a prévia tem um iframe só, abrindo no Celular, com o seletor dentro do palco.
- **I-08:** o recolhimento do cabeçalho mede o elemento `#avisos-da-loja`, e o `Header.tsx` não mudou.
- **I-09:** "a primeira troca de rota" é decidida pela chave do histórico, com uma trava no componente.
- **I-10:** a animação `estrelinha-faixa-entra` mora em `App.css`. As réguas `nasceInvisivel` e `tomProibido` foram extraídas para `apps/store/src/test/`.

## Desvios do PRD e da costura

- **Nenhum desvio de comportamento.** As mudanças ao PRD foram aprovadas no gate (r1) e estão no Histórico de revisões dele.
- **Contrato da T03:** pedia alterar o `Header.tsx`. A soma da altura ficou dentro de `useScrollDirection` (I-08), e o comportamento é o mesmo.
- **H-23:** o banner de erro de leitura do painel está escrito, mas nunca aparece, porque `fetchAllSettings` cai nos padrões em vez de devolver erro. Registrado em `apps/backoffice/CLAUDE.md`.
- **Correção da revisão da T03:** as setas da prévia ficavam inertes depois de um "mostre o aviso N". Já está corrigido e testado.

## Gates (Validation 1, `qa-report.md`)

| Gate | Resultado |
| --- | --- |
| Testes | core 5832/244 · store 7258/386 · backoffice 5294/298 · mobile-adm 2729/175 · functions 1669/46. Todos com exit 0; o mobile-adm foi remedido sozinho depois de uma reprovação de contenção conhecida (`useFolhaNoHistorico`) |
| Tipos | store 0 · backoffice 7 (todos em `ProposalStateBadge.test.tsx`, herdados) · mobile-adm 0 · server 0 · core 11 (herdados). Nenhum erro novo |
| Lint | store 2/2 · backoffice 23/5 · mobile-adm 0/0, iguais à baseline |
| Build | verde nos três apps. A primeira rodada falhou por ambiente: o worktree não tem `.env`, e o `%VITE_SUPABASE_URL%` não é substituído. Refeito com as variáveis só na linha de comando |
| Integração local | T02: `page.mjs` contra a API 54441 nos três estados. T04: `probes/04-faixa-no-banco.sh`, 5 ok |

## Pendências conhecidas

- **QA real-user em navegador:**
  - 390×844 e 1440×900: sem rolagem lateral, duas linhas, setas de 44 px, fonte a 200 % e o teto de 90 caracteres (RN-07, CA-07, H-05);
  - o CLS da Home e da página de produto com a faixa ligada (CA-06);
  - a captura com a faixa desligada (CA-05);
  - as setas da prévia depois de "mostre o aviso N".
- **Só num preview da Vercel:** que `/` chega à função depois de o `index.html` sair da saída publicada, e o `HIT` do cache. O aumento de tempo da Home servida pela função é risco registrado (H-24).
- **WI 100 (perfil de estilo):** ainda não existe. O contraste `ink`/`accent` "nos dois perfis" (RN-04) mede só o perfil atual; quem construir o WI 100 acrescenta o par da faixa ao guarda do segundo perfil.
- **Baselines do `CLAUDE.md`:** a linha *Testes* e as notas do WI precisam ser atualizadas no fecho.
- **Deploy:** sem migration. A Home passa a depender da função `api/page` na Vercel; conferir num preview antes de publicar.
- **Fora (PRD):** agendamento por data (WI 102), faixa por página, botão de fechar e contador.
