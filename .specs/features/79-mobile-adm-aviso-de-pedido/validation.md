# 79 — Validação (Verificador independente, rodada 1 de 3 do ciclo `81-79`)

**Data**: 2026-10-26 · **Spec**: `.specs/features/81-79-mobile-adm-aviso-de-pedido/spec.md` (cópia
idêntica, byte a byte, de `.specs/features/79-mobile-adm-aviso-de-pedido/spec.md` — `diff -rq` sem
diferença ao começar) · **Verificador**: agente independente (autor ≠ verificador) · **Branch**:
`feat/79-mobile-adm-aviso-de-pedido`, tudo sem commit.

> A rodada anterior do Verificador (2026-10-25, 76 mutantes, FAIL por 4 sobreviventes + 1 cópia
> divergente) continua registrada em `.specs/features/79-mobile-adm-aviso-de-pedido/validation.md`.
> Esta rodada parte do estado DEPOIS dos consertos V01–V05 e dos dois consertos do QA (o foco no
> `<body>` e o aparelho descartado), que nenhum verificador tinha visto.

## Veredito: **FAIL — só por rastreabilidade da spec (D1)**; código, testes e sensor passam

28 mutantes novos de comportamento, nos arquivos reais: **28 mortos, 0 sobreviventes**. Os cinco
mutantes que a r1 deixou vivos (F14, P16, C07, F11 e a regra antiga de `destinoDepoisDoLogin`) foram
reinjetados com a forma da r1 e **morreram por asserção**. Gates verdes; baselines sem regressão.

O único item que reprova é **D1**: a AC `MAN-32`, como está escrita na `spec.md`, é falsa para o 410
do aviso de teste desde o conserto do QA, sem emenda na spec e sem marcador `SPEC_DEVIATION` no
código. O conserto é de documento (emendar `MAN-32` ou marcar o desvio), não de produto.

## Faixa do diff

`git diff HEAD --stat`: **195 arquivos, +13062 / −112** (tudo staged/não rastreado sobre `5e31a99b`).
Código da `79` como na r1, mais o que entrou depois dela:
`apps/mobile-adm/src/features/push-notifications/model/usePushNoAparelho.ts` (`descartar`, `descartado`),
`apps/mobile-adm/src/pages/AvisosPage.tsx` (`devolverFoco`, `focarTitulo`, a frase `APARELHO_DESCARTADO`),
`apps/mobile-adm/src/features/push-notifications/model/frases.ts`,
`apps/mobile-adm/src/shared/lib/destinoDepoisDoLogin.ts` (`/\`), e os testes
`caminhoInternoPareado.test.ts`, `dispatchPush.test.ts`, `atelie-avisos/handlers.test.ts`,
`history.test.ts`, `push.test.ts`, `avisosPage.test.tsx`, `usePushNoAparelho.test.tsx`.

## Gate (árvore parada, um workspace por vez, exit fora de pipe, `--testTimeout=20000` sem `--`)

| Medida | Resultado | Baseline (`CLAUDE.md` / T01) |
| --- | --- | --- |
| core | **4452 / 176**, exit 0 | 4452/176 |
| functions | **1105 / 26**, exit 0 | 1105/26 |
| mobile-adm | **2014 / 125**, exit 0 | 2005/125 no `CLAUDE.md` — +9 do conserto do aparelho descartado (QA, 2026-10-26); a tabela do `CLAUDE.md` não foi remedida depois dele |
| store | **5985 / 323**, exit 0 | 5985/323 |
| backoffice | **3710 / 214**, exit 0 | 3710/214 |
| catalog-import | **512 / 23**, exit 0 | 512/23 |
| `tsc` mobile-adm app · store app · backoffice app · mobile-adm node · store server · catalog-import | **0 · 0 · 0 · 0 · 0 · 0** | 0 |
| `tsc` packages/core | **11** (herdados) | 11 |
| eslint mobile-adm · backoffice · store | **0/0 · 23/5 · 2/2** | 0/0 · 23/5 · 2/2 |
| `pnpm --filter … build` mobile-adm · backoffice | exit 0 · exit 0 | — |

Nenhuma queda de contagem; nenhum `skip`.

## Spec-anchored — evidência por requisito

A tabela da r1 (`79-…/validation.md`, "Evidência por requisito") foi conferida contra a árvore de
hoje e continua valendo; abaixo, as linhas que mudaram ou que esta rodada re-ancorou em `file:line`.

| Req | Valor da spec | Evidência (`file:line` — asserção) | Resultado |
| --- | --- | --- | --- |
| MAN-08 | títulos e corpos da tabela, `#0244`, `R$ 189,00` | `packages/core/src/notifications/__tests__/push.test.ts:65` — `body: \`R$${NBSP}189,00 · aguardando o PIX\``; `:73`, `:82` — títulos exatos | ✅ |
| MAN-09 | `push:2/3` ⇒ "Entregue a 2 de 3 aparelhos" | `packages/core/src/orders/__tests__/history.test.ts:110-112` — `expect(e.detail).toBe('Entregue a 2 de 3 aparelhos')`; app: a coluna `provider_message_id` pedida (M17 morto em `usePedido.test.tsx` e `PedidoPage.test.tsx`) | ✅ |
| MAN-12 | frase de bloqueio, sem interruptor | `apps/mobile-adm/src/pages/__tests__/avisosPage.test.tsx:27` (frase por extenso) + casos "bloqueado ⇒ MAN-12" (M32, M34 mortos) | ✅ |
| MAN-13 | "Este navegador não recebe avisos." | `avisosPage.test.tsx:87` — `getByText('Este navegador não recebe avisos.')` (M13 morto) | ✅ |
| MAN-16 | "Não consegui ativar os avisos. Tente de novo." | `avisosPage.test.tsx:205` — `toHaveTextContent(…)` | ✅ |
| MAN-19 | e-mail antes do push (orçamento) | `supabase/functions/send-notification/__tests__/dispatchPush.test.ts:230` — no instante do envio o Resend já recebeu o e-mail (M23 = F14 da r1, morto) | ✅ (era lacuna 1 da r1) |
| MAN-21 | só `/` + não `//` (e, desde V04, não `/\`); painel inalterado | `apps/mobile-adm/src/shared/lib/__tests__/destinoDepoisDoLogin.test.ts` ("/\\ ⇒ /"), `caminhoInternoPareado.test.ts`, `pages/__tests__/LoginPage.test.tsx` ("entrar leva ao MESMO pedido, com a query") (M08, M09, M10 mortos) | ✅ (era lacuna 4) |
| MAN-26 | log só com o host | `supabase/functions/atelie-avisos/__tests__/handlers.test.ts` "o log traz só o host (MAN-26)" (M22 = P16, morto) | ✅ (era lacuna 2) |
| MAN-18 | conta sem papel não recebe | `send-notification/__tests__/push.test.ts` "`has_role` que responde null ⇒ aquele dono não recebe" (M25 = F11, morto) | ✅ (era lacuna 5) |
| MAN-38 | push não `sent` ⇒ "O aviso no celular não chegou.", sem "Reenviar" | `history.test.ts:121` + caso "push `pending` ⇒ o mesmo título…" (M24 = C07, morto) | ✅ (era lacuna 3) |
| MAN-32 | "O aviso de teste não saiu. Tente de novo." | `avisosPage.test.tsx:306` — `getByText(…)` para a falha de rede/5xx | ✅ — **mas** ver Desvio D1 |
| MAN-33 | "Aguarde alguns segundos…", nunca a de MAN-32 | `avisosPage.test.tsx:315-317` (M15, M31 mortos) | ✅ |
| MAN-30 | ordem porta → navegador → `signOut`; sem inscrição ⇒ o Sair de hoje | `widgets/account-menu/__tests__/AccountMenu.avisos.test.tsx:18,97,107` (M20 morto) | ✅ |
| MAN-40 | os quatro nomes na ordem da jornada, alvo ≥ 44 px | `avisosPage.test.tsx:166` (ordem), `:224-230` (`min-h-12` por token) (M29 morto) | ✅ |
| MAN-41 | o controle tocado desabilitado e `aria-busy` | `avisosPage.test.tsx:182-192`, `:257-271`, `:286-294` (M26, M27, M28, M33 mortos) | ✅ |
| MAN-03 / MAN-22 / MAN-31 | o worker mostra com título, corpo, tag e caminho; dado sem título não mostra | `apps/mobile-adm/src/app/__tests__/swAvisos.test.ts` "mostra o aviso com o título, o corpo, a tag, o ícone e o caminho exatos", "dado sem título ⇒ não mostra" (M11, M12 mortos) | ✅ |
| QA foco | o foco nunca cai no `<body>` depois de uma ação | `avisosPage.test.tsx:454-533` (M05, M06 mortos) | ✅ (comportamento sem AC na spec — ver D2) |
| MAN-39 | layout 360/390/412/1440 × 100/130/200 % | só navegador (`prova-navegador.md`, T28). **A frase nova `APARELHO_DESCARTADO` não tem medida de layout** — o reteste em navegador do conserto do QA está pendente (`tasks.md`) | ⚠️ não provado por suíte (por natureza) |
| MAN-42 | ordem de publicação | só documentação | n/a |

Os demais (`MAN-01`, `02`, `04`..`07`, `10`, `11`, `14`, `15`, `17`, `20`, `23`..`25`, `27`..`29`,
`34`..`37`) seguem com a evidência da r1, conferida por existência dos casos citados; nenhum dos
arquivos de produto que a r1 mutou para eles mudou desde então, exceto os listados na faixa do diff.

## Discriminação — 28 mutantes

Arnês: `scratchpad/v/arnes.mjs` (fora da árvore). Exige alvo único (lança com 0 ou >1 ocorrências),
roda `pnpm --filter <ws> exec vitest run <arquivos>`, restaura o conteúdo original e confere o
SHA-256 (todos `sha_ok=true`). Na primeira passada, 15 mutantes não acharam teste nenhum ("No test
files found" — a lista de arquivos foi passada como um argumento só); o arnês passou a recusar esse
caso e os 15 foram rodados de novo — os números abaixo são da segunda passada.

| Id | Alvo | Mutação | Resultado | Teste que matou |
| --- | --- | --- | --- | --- |
| M01 | `usePushNoAparelho.ts` `testar` | `gone` deixa de descartar (vira "não saiu") | morto (asserção) | `usePushNoAparelho.test.tsx` "410 `gone` no aviso de teste ⇒ desligado…" |
| M02 | idem `descartar` | não desinscreve o navegador | morto | idem, "o navegador desinscrito" |
| M03 | idem `alternar` | 404 do interruptor vira falha comum | morto | `avisosPage.test.tsx` "o 404 de um interruptor ⇒ o mesmo…" |
| M04 | idem `ativar` | não apaga `descartado` | morto | hook "ativar de novo apaga `descartado` no toque" |
| M05 | `AvisosPage.tsx` | sem `devolverFoco` | morto | `avisosPage.test.tsx` "o foco depois de cada ação não cai no body" |
| M06 | idem | "Tentar de novo" sem foco no título | morto | idem, "Tentar de novo da leitura…" |
| M08 | `destinoDepoisDoLogin.ts` | aceita `/\` (regra antiga, V04) | morto | `destinoDepoisDoLogin.test.ts`, `caminhoInternoPareado.test.ts` |
| M09 | `public/sw-avisos.js` | aceita `/\` | morto | `caminhoInternoPareado.test.ts`, `swAvisos.test.ts` |
| M10 | `packages/auth/src/RequireAdmin.tsx` | `from` sem a query | morto | `LoginPage.test.tsx` "…leva ao MESMO pedido, com a query" |
| M11 | `sw-avisos.js` | `tag` descartada | morto | `swAvisos.test.ts` |
| M12 | idem | mostra dado sem título | morto | idem |
| M13 | `navegador.ts` | suporte sem exigir `Notification` | morto (exceção em tempo de execução do produto — `Notification` indefinido — reprovando "sem Notification ⇒ sem-suporte"; não é erro de compilação do teste) | hook e página |
| M15 | `portaDeAvisos.ts` | 429 perde o slug | morto | `portaDeAvisos.test.ts` "429 cooldown" |
| M16 | idem | 401/403 com papel de pé ⇒ recusa | morto | idem, "403 com o papel DE PÉ ⇒ falha, NUNCA recusa" |
| M17 | `entities/order/model/linha.ts` | sem `provider_message_id` | morto | `usePedido.test.tsx`, `PedidoPage.test.tsx` |
| M20 | `pararAvisosDesteAparelho.ts` | sem inscrição ⇒ `falhou` | morto | `AccountMenu.test.tsx`/`.avisos`, `rotasSobGuarda` |
| M22 | `atelie-avisos/handlers.ts` | log com o endpoint (P16 da r1) | morto | "o log traz só o host (MAN-26)" |
| M23 | `send-notification/dispatch.ts` | push executado antes do e-mail, relatório na ordem antiga (F14 da r1) | morto | `dispatchPush.test.ts:230` |
| M24 | `core/orders/history.ts` | só `failed` vira "não chegou" (C07 da r1) | morto | `history.test.ts` "push `pending`…" |
| M25 | `send-notification/push.ts` | `!== false` (F11 da r1) | morto | `push.test.ts` "`has_role` que responde null…" |
| M26 | `AvisosPage.tsx` | interruptor nunca desabilita | morto | "desligar grava SÓ esta inscrição; o tocado fica `aria-busy` e desabilitado" |
| M27 | idem | botões sem `aria-busy` | morto | "o botão fica desabilitado e `aria-busy` enquanto ativa (MAN-41)" |
| M28 | idem | botão de teste não ocupa no ar | morto | "o botão `aria-busy` no ar" |
| M29 | idem | interruptores na ordem inversa | morto | "na ordem da jornada (MAN-40)" |
| M31 | `usePushNoAparelho.ts` | `cooldown` vira `falhou` | morto | hook e página (MAN-33) |
| M32 | idem `estadoInicial` | permissão negada antes não vira `bloqueado` | morto | "permissão negada ⇒ bloqueado, sem ler a inscrição nem a porta" |
| M33 | `AvisosPage.tsx` | interruptor sem `aria-busy` | morto | MAN-41 |
| M34 | `usePushNoAparelho.ts` `ativar` | negada agora ⇒ `desligado` | morto | "permissão NEGADA ⇒ bloqueado" |

**Total: 28 · 28 mortos · 0 sobreviventes** (27 por asserção; M13 por exceção do próprio produto,
que é a falha real que o caso existe para pegar). **Sensor: PASS.**

## Desvios e lacunas de precisão (D1 reprova; D2–D5 só sinalizados)

- **D1 — `MAN-32` foi alterado e a spec não foi emendada.** Por decisão do usuário
  (`BUG-20261025-teste-com-aparelho-descartado-deixa-a-tela-ligada`, 2026-10-26), o teste que volta
  `gone`/`not_found` não diz mais a frase de `MAN-32`; a tela volta ao estado de `MAN-10` com
  "Este celular deixou de receber avisos. Ative de novo." O desvio está só em `tasks.md` (seção
  "Conserto do QA") e num comentário de `usePushNoAparelho.ts` — **sem marcador `SPEC_DEVIATION`**
  (ao contrário de `NAO_CONFERIU`/`NAO_GRAVOU_ESCOLHA` em `frases.ts`), e a `spec.md` ainda diz a
  frase de `MAN-32` para toda falha. Hoje a AC literal é falsa para o 410 com a suíte verde.
  **Conserto**: emendar `MAN-32` (e citar a frase nova como AC própria) ou pôr o marcador no código.
- **D2 — o foco depois de cada ação** (QA) não tem AC na spec; está provado por teste (M05, M06).
  Sugestão: uma linha em `MAN-41`.
- **D3 — a Requirement Traceability da spec segue "Design / Pending"** em todos os 42 IDs.
- **D4 — o reteste em navegador do conserto do aparelho descartado** está pendente (a frase nova
  dentro de `MAN-39`); e o Chrome/Android real (`MAN-01`/`03`/`05`/`08`/`22`) segue com o usuário.
- **D5 — a tabela do `CLAUDE.md` diz mobile-adm 2005/125**; o medido é 2014/125 (+9 do conserto do
  QA). Atualizar ao fechar.
- Já declarados pelo autor e conferidos: `SPEC_DEVIATION` em `frases.ts:23,30`,
  `portaDeAvisos.ts:16`, `dispatch.ts:467`, `App.tsx:62`.

## Code quality

Os arquivos tocados depois da r1 são cirúrgicos e seguem os moldes do app (`descartar` reaproveita
`desfazerNoNavegador`; o foco segue o molde de `FolhaDoRastreio`; a cópia deliberada do caminho
interno tem guarda pareado). Nada fora do escopo. Guias seguidos: `CLAUDE.md` raiz e
`apps/mobile-adm/CLAUDE.md`.

## O que NÃO foi provado (não é falha do verificador)

Chrome e Android reais; `MAN-39` (só navegador; a frase nova sem medida); a semântica SQL (só pelos
probes da feature; este verificador não tocou no banco); `_shared/webPush.ts` (fora do vitest por
desenho); `MAN-42` (ordem de publicação).

## Estado da árvore ao sair

Impressão digital (`git diff HEAD` + SHA de cada não rastreado) igual à do início depois de todos os
mutantes (`2e0d6942…` antes e depois). Este verificador escreveu só este arquivo e editou
`.specs/LESSONS.md` à mão (L-046 recorrente, abaixo). Nenhum commit, `stash`, `checkout` ou
`restore`; os `dist/` dos dois builds são gitignored.

## Lições

- **L-046** (spec_deviation) recorreu na `79` (D1) e foi promovida a *confirmed* — **à mão** no
  `.specs/LESSONS.md`: o `lessons.py` não foi rodado porque o `.specs/lessons.json` tem 29 lições e o
  MD 60 (qualquer escrita do script re-renderizaria o MD a partir do JSON e apagaria 31 lições).
