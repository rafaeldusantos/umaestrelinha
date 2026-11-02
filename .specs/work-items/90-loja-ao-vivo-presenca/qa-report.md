# 90 · Loja ao vivo, Fases 2 e 3 — Validation Report

**Date**: 2026-11-02
**Run by**: Validation (Dev)
**Status**: PASS
**Source**: `.specs/work-items/90-loja-ao-vivo-presenca/prd.md` + `spec.md`

---

## Test Results

Um workspace por vez, `pnpm --filter @estrelinha/<w> test --testTimeout=20000`, exit fora de pipe:

| Workspace | Exit | Arquivos | Testes |
| --- | --- | --- | --- |
| core | 0 | 207 | 5229 |
| functions | 0 | 39 | 1431 |
| store | 0 | 353 | 6641 (+1 caso reexecutado depois do conserto de lint: `hostCanonicoPareado` 30/30) |
| backoffice | 0 | 272 | 4951 |
| mobile-adm | 0 | 143 | 2339 |
| catalog-import | 0 | 23 | 512 |

**Summary**: 21103 passed, 0 failed, 0 skipped out of 21103 total.

Integração local (Supabase 54441/54442):

| Probe | Resultado |
| --- | --- |
| `probes/01-presenca.sql` | exit 0, 38 `ok —` |
| `probes/02-function-ping.sh` (function `visit` servida) | exit 0, 10 `ok —` + 1 pulado (o Kong local responde o `OPTIONS` sem chegar à function; o `Max-Age` é provado por `visit/__tests__/ping.test.ts`) |
| `probes/03-leitura-store-live.sql` | exit 0, 27 `ok —` |
| `probes/04-acessos-com-sacola.sql` | exit 0, 38 `ok —` |
| 71 `function-visit.sh` | 6 `ok`, estado restaurado |
| 71 `dia`/`papeis`/`relogio`/`teto`/`visitas`/`concorrencia`, 83 `02-gravacao-real.sh` | exit 0 |
| 71 `vendas.sql`, 83 `01-acessos.sql` | exit 0 **dentro de uma transação que desloca o pedido real `0220`** (pago em 31/10, alheio a esta fila) |
| 71 `ponta-a-ponta.sh` | não rodou: preso à data de 22/10 e recusa semear com o `0220` |

## Build & Lint

**Build**: PASS — `pnpm --filter` store, backoffice e mobile-adm, exit 0.
**Tipos** (contra a baseline da corrida, por arquivo e código): store app 0 · store server 0 · mobile-adm 0 · backoffice 7 (os mesmos 7 da baseline, de outra frente) · core 11 (os mesmos 11 herdados). Nenhum erro novo.
**Lint**: PASS — store 2/2 · backoffice 23/5 · mobile-adm 0/0, iguais à baseline. Um erro novo (`no-regex-spaces` em `apps/store/src/shared/lib/__tests__/hostCanonicoPareado.test.ts:123`, da tarefa 01) foi corrigido na Validation, sem mudar o que o teste mede.

## Acceptance Criteria Coverage

| ID | Criterion | Test | Result | Status |
| --- | --- | --- | --- | --- |
| LAV-01 | cartão-botão, nome acessível com plural | `inicioAgoraNaLoja.test.tsx`; `live/__tests__/presence.test.ts` | PASS | COVERED |
| LAV-02 | eyebrow, número, linha do funil que some no zero, 15 barras com a atual dourada | `inicioAgoraNaLoja.test.tsx` | PASS | COVERED |
| LAV-03 | carregando, falha que relê, zero com gráfico, não medida | `inicioAgoraNaLoja.test.tsx`; `aoVivoPresenca.test.tsx` › estados | PASS | COVERED |
| LAV-04 | Fase 1 "Visitas hoje" | — (substituído pela Fase 2, como o próprio LAV-04 manda) | — | SUPERSEDED |
| LAV-05 | 30 s só visível, puxar relê | `inicioAgoraNaLoja.test.tsx` | PASS | COVERED |
| LAV-10 | número em ouro sobre ink, "pessoas nos últimos 5 minutos" | `aoVivoPresenca.test.tsx` › A | PASS | COVERED |
| LAV-11 | 30 barras, a de agora = o número | `aoVivoPresenca.test.tsx` › A; probe 03 | PASS | COVERED |
| LAV-12 | janela de 5 min, constante única | `funilComDonoUnico.test.ts`; `live/__tests__/screen.test.ts`; probe 03 | PASS | COVERED |
| LAV-20 | quatro linhas, três com barra, "Compraram" sem barra | `aoVivoPresenca.test.tsx` › B | PASS | COVERED |
| LAV-21 | funil exclusivo que soma o total | `live/__tests__/presence.test.ts`; `funilComDonoUnico.test.ts`; probe 03 | PASS | COVERED |
| LAV-22 | nota do checkout sem prazo | `aoVivoPresenca.test.tsx` › B; `presence.test.ts` | PASS | COVERED |
| LAV-30 | até 5 joias com foto, ordem e empate | `aoVivoPresenca.test.tsx` › C; probe 03 | PASS | COVERED |
| LAV-31 | Guia como linha própria, ordenado junto, só o Guia sem a frase vazia | `aoVivoPresenca.test.tsx` › C | PASS | COVERED |
| LAV-32 | "Ninguém olhando uma joia agora." | `aoVivoPresenca.test.tsx` › C | PASS | COVERED |
| LAV-40 | faixas, quinta na linha inteira, ninguém, nota do Direto | `aoVivoPresenca.test.tsx` › D; `live/__tests__/buckets.test.ts` | PASS | COVERED |
| LAV-41 | só a faixa guardada | `presencaSchema.test.ts`; probe 01 | PASS | COVERED |
| LAV-45 | "{m} de {n}", "o resto…" some, aparelho pelo UA sem gravá-lo | `aoVivoPresenca.test.tsx` › E; `ping.test.ts`; probe 02 | PASS | COVERED |
| LAV-48 | Cidades | — (`Fica fora`, decisão do usuário) | — | DEFERRED |
| LAV-51 | quatro números, "Com sacola", "vs semana anterior" até o mesmo ponto | `access.test.ts`; `SecaoAcessos.test.tsx`; `acessosComSacola.test.tsx`; probe 04 | PASS | COVERED |
| LAV-60 | recusa `42501` no episódio do app (sem `lerComPapel`, D-10) | `presencaComClientReal.test.tsx`; `aoVivoPresenca.test.tsx` › estados | PASS | COVERED |
| LAV-61 | nada pelo relógio do aparelho | `aoVivoSemRelogioDoAparelho.test.ts` | PASS | COVERED |
| LAV-62 | `h1` e `document.title` em todos os estados | `aoVivoPresenca.test.tsx` › estados | PASS | COVERED |
| LAV-63 | `auto-fit` piso 9rem | `aoVivoPresenca.test.tsx` › D; `SecaoAcessos.test.tsx` | PASS | COVERED (forma; a medida é de navegador) |
| LAV-64 | movimento reduzido | `tomDaLojaAoVivo.test.ts` (par `motion-reduce:`) | PASS | COVERED |
| LAV-65 | sem dado de cliente | `aoVivoPresenca.test.tsx` › sem dado de cliente; `semDadoSensivelDeClienteNoApp` | PASS | COVERED |
| §6.2 / §7 | presença sem IP, UA, referrer ou URL; TTL; poda; 14 dias; Política | `presencaSchema.test.ts`; `hostCanonicoPareado.test.ts`; `visitasSchema`; `politicaDoContador.test.ts`; probes 01 e 04 | PASS | COVERED |
| §10.1 | Visitas e Vendas idênticos à faixa do Início | `acessosComSacola.test.tsx` | PASS | COVERED |
| §10.2 | olhando + sacola + checkout = total | `presence.test.ts`; probe 03 | PASS | COVERED |
| §10.3 | sem consentimento, robô, host interno ou opt-out não conta | `PresencePing.test.tsx`; `ping.test.ts`; probe 02 | PASS | COVERED |
| §10.4 | fechar a aba tira a pessoa em até 5 min | probe 01 (janela) e 03 (recorte) | PASS | COVERED |
| §10.5 | em segundo plano não lê | `inicioAgoraNaLoja.test.tsx`; `aoVivoPresenca.test.tsx`; `PresencePing.test.tsx` | PASS | COVERED |
| §10.6 | o banco não guarda IP, UA, referrer nem URL | `presencaSchema.test.ts` | PASS | COVERED |

**Coverage**: 30/30 critérios em escopo cobertos (100%); LAV-04 superado pela própria fase; LAV-48 em `Fica fora`.

## Afirmações caducadas na corrida

| Tarefa fechada | A afirmação | Quem a tornou falsa |
| --- | --- | --- |
| 01 | o barril de `core/live` importa `access.ts`, `card.ts` e `buckets.ts` | 02 apagou `card.ts` (o cartão da Fase 1); o barril passou a `access.ts`, `buckets.ts`, `presence.ts` e, com a 03, `screen.ts` |

## Premissas que valem além deste Work Item

- `store_visit_counter.history_since` (tarefa 04): a comparação da Semana e o "Com sacola" das comparações só aparecem para períodos medidos inteiros depois da publicação.
- `pageKind` mora fora do barril de `core/routes` (`@estrelinha/core/routes/pageKind`), porque o barril entra no grafo Deno de `menu`/`seo`/`sitemap`.
- Três cópias deliberadas SQL ↔ TS, cada uma com guarda que lê os dois do disco: o host canônico (`hostCanonicoPareado`), o funil e a janela (`funilComDonoUnico`), e a frase da janela (`screen.test.ts`).
- Ordem de publicação: migrations `20261104120000` → `130000` → `140000` → function `visit` → bundles da loja e do app; a aprovação da Adri do texto novo da Política é pré-condição.

## Fora do que a Validation prova

- Layout em navegador (390 × 844 a 100/130/200 %, 1440), o arrasto do puxar, o cartão com fonte grande — é do QA.
- A function `visit` publicada (o `Max-Age` no gateway hospedado).
- Documentação de módulo desatualizada: `apps/mobile-adm/CLAUDE.md` (cartão "Visitas hoje", Conversão em largura inteira), `packages/core/CLAUDE.md` (`card.ts`), `supabase/CLAUDE.md` (poda de 8 dias) e as baselines do `CLAUDE.md` da raiz — a atualizar no fecho da feature.

## Verdict

**PASS**.

---

## Validation 2 — fix tasks 05–08 (bugs da QA, rodada 1)

**Date**: 2026-11-02 · **Status**: PASS

| Workspace | Exit | Arquivos | Testes |
| --- | --- | --- | --- |
| core | 0 | 207 | 5229 |
| functions | 0 | 39 | 1431 |
| store | 0 | 353 | 6641 |
| backoffice | 0 | 272 | 4951 |
| mobile-adm | 0 | 148 | 2365 (+26/+5: `JoiasSendoVistas`, `rotulosECoresDaPresenca`, `aoVivoFrescor`, `inicioCartaoReleitura`, `CartaoAgoraNaLoja.forma`) |
| catalog-import | 0 | 23 | 512 |

**Tipos**: store 0 · store server 0 · mobile-adm 0 · backoffice 7 (os da baseline, de outra frente) · core 11 (herdados). **Lint**: store 2/2 · backoffice 23/5 · mobile-adm 0/0. **Build**: loja e app, exit 0.

| Bug | Tarefa | Prova (componente/página) | Revisão |
| --- | --- | --- | --- |
| BUG-003, BUG-001, BUG-007 | 05 | `CartaoAgoraNaLoja.forma.test.tsx`, `inicioCartaoReleitura.test.tsx` | 2 rodadas: a 1ª achou a cauda `shrink-0` transbordando a 200 % e o número escondido na falha (contra `MAI-18`); consertados, a 2ª serve |
| BUG-004 | 06 | `JoiasSendoVistas.test.tsx` | serve com correção (um caso-sensor tautológico apagado) |
| BUG-002, BUG-008 | 07 | `aoVivoFrescor.test.tsx` | serve com correção (dois identificadores de processo em comentário); as fixtures de `AoVivoPage.test.tsx` e `aoVivoComClientReal.test.tsx` passaram a responder `store_live` — a afirmação da 83 ("Atualizado agora" só com Acessos) caducou com D-14 |
| BUG-005, BUG-006 | 08 | `rotulosECoresDaPresenca.test.tsx` | serve |

**Caducou**: os testes de frescor da 83 que cobravam "Atualizado agora" com a presença sem dado (D-14 / BUG-002).
**Fora do que a Validation prova**: as medidas a 130/200 % em 390/360/320, as cores e a fonte calculadas, o BUG-001/002 de ponta a ponta — é o reteste da QA.
