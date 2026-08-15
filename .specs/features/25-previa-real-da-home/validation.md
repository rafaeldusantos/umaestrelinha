# 25 · Prévia real da Home — verificação

**Veredito: PASS**, com uma ressalva de método declarada abaixo.
**Data**: 2026-08-15 · **Faixa**: árvore de trabalho sobre `57e19e2` (fecho da `24`)

> **Ressalva de método, e ela é real.** A Skill pede **autor ≠ verificador**, com o Verifier num
> sub-agente fresco. Esta sessão **proíbe despachar sub-agentes sem pedido explícito do usuário**,
> então a verificação rodou como passe standalone (`validate.md`) — **pelo mesmo autor**. O sensor de
> discriminação foi executado de verdade, com mutações reais e reversão conferida, e é o que carrega
> o peso desta página; a checagem ancorada na spec herda o modelo mental do autor e vale menos do que
> valeria vinda de fora. **Fica registrado como o que é, não como equivalente.**

---

## Checagem ancorada na spec

| Req | Onde se prova | Veredito |
| --- | --- | --- |
| PRV-01 | `preview.test.ts` (5 casos) · `useHomePreview.test.tsx` (3) · `homePreview.test.tsx` (1) | ✅ as duas condições, e a negativa de cada uma |
| PRV-02 | `homePreview.test.tsx` — `enabled: false` afirmado na chamada, e o rascunho vencendo o retorno da consulta | ✅ |
| PRV-03 | `useHomePreview.test.tsx` (4) · `usePreviewBridge.test.tsx` (1) | ✅ inclusive `sections` inicial `[]` e **não** o piso |
| PRV-04 | `preview.test.ts` (7) · `useHomePreview.test.tsx` (3) | ✅ |
| PRV-05 | `homePreview.test.tsx` (3) · `App.tsx` sob `previewMode` | ⚠️ ver lacuna L1 |
| PRV-06 | `HomeRendererPreview.test.tsx` (3) | ✅ |
| PRV-07 | `usePreviewBridge.test.tsx` (3) | ✅ incluindo a varredura de **todas** as chamadas |
| PRV-08 | `usePreviewBridge.test.tsx` (5) | ✅ origem errada, janela errada e carimbo ausente, separados |
| PRV-09 | `usePreviewBridge.test.tsx` (2) · `AdminHomePage.test.tsx` (3) · `applyDraft.test.ts` (11) | ✅ |
| PRV-10 | `usePreviewBridge.test.tsx` (1) · `AdminHomePage.test.tsx` (1) | ✅ |
| PRV-11 | `AdminHomePage.test.tsx` (4) | ✅ inclusive a precedência editor > cursor |
| PRV-12 | `AdminHomePage.test.tsx` (1) | ✅ classe da grade **e** ordem dos filhos no DOM |
| PRV-13 | `AdminHomePage.test.tsx` (1) | ✅ identidade do nó |
| PRV-14 | `HomeLivePreview.test.tsx` (4) · `preview.test.ts` (6) | ✅ |
| PRV-15 | `HomeLivePreview.test.tsx` (4) · `preview.test.ts` (2) | ✅ |
| PRV-16 | `AdminHomePage.test.tsx` (4, herdados da `24`) | ✅ |
| PRV-17 | `HomeLivePreview.test.tsx` (4) | ✅ nomeia variável, arquivo e porta |
| PRV-18 | `previaUnica.test.ts` (9) | ✅ com âncora dupla |

### Lacunas

**L1 — `PRV-05 AC 3` (o rastreador não é montado em modo prévia) não tem teste.**
A condição está no `App.tsx` (`{!previewMode && <AbandonedCartTracker />}`), lida de um
`window.parent` avaliado **no escopo do módulo**. Testá-la exigiria recarregar o módulo `App` com o
`window` já falsificado — `vi.resetModules()` + `import()` dinâmico —, e o `App` arrasta o router, o
QueryClient e os providers inteiros. O custo é alto e a superfície testada seria quase toda alheia à
AC. **Declarada como não coberta em vez de coberta por um teste que não discrimina.** As outras duas
ACs de `PRV-05` estão cobertas.

**L2 — Nada prova a prévia num navegador de verdade.** jsdom não carrega o documento de um iframe, e
a canônica desta feature (o iframe cross-origin recebendo `postMessage`) só se prova em navegador.
É a mesma partição declarada na `23` para a tag canônica: o que dá para medir em teste está medido, e
o resto é UAT manual — `pnpm dev`, `VITE_STORE_URL=http://localhost:8082`, abrir `/admin/home`.

## Sensor de discriminação

Seis mutações injetadas no comportamento, executadas e revertidas (reversão conferida por `grep`).

| # | Mutação | Alvo | Resultado |
| --- | --- | --- | --- |
| M1 | `isPreviewWindow` deixa de exigir iframe | `preview.ts` | **morto** — 1 teste |
| M2 | `postMessage` passa a usar `'*'` | `usePreviewBridge.ts` | **morto** — 5 testes |
| M3 | `previewScale` deixa de limitar a 1 (amplia) | `preview.ts` | **morto** — 1 teste |
| M4 | invólucro da prévia emitido **sempre** | `HomeRenderer.tsx` | **sobreviveu na 1ª rodada** → corrigido, ver abaixo |
| M5 | consulta do banco sempre ligada | `HomePage.tsx` | **morto** — 1 teste |
| M6 | `position` do item fixa em `0` | `sectionDraft.ts` | **morto** — 1 teste |

### M4 — o mutante que expôs um teste tautológico

A primeira versão de `HomeRendererPreview.test.tsx` tinha um caso chamado *"a árvore é IDÊNTICA à de
antes da feature"* que comparava `renderHome(x)` com `renderHome(x, undefined)`. **São a mesma
chamada**: o teste passaria mesmo com o invólucro emitido nos dois modos — exatamente o defeito que
ele existia para pegar. Um `expect` verde sem poder de discriminação.

Foi **substituído por uma asserção diferencial** nos dois sentidos (o modo normal não contém o
marcador nem o `data-testid`; o modo prévia contém os dois) mais um caso novo garantindo que o texto
desenhado é igual nos dois modos — "a prévia **envolve**, não redesenha". Com a troca, M4 passou a
ser morto por **2** testes.

Vale registrar o que **não** pegou: `homeComposition.test.tsx`, o guarda de 14 asserções da `24`, é
cego a M4 — ele mede conteúdo (sequência, literais, limites, cores), não a ausência de invólucros.
Não é falha dele; é o motivo de a contrapartida ter virado teste próprio.

## Gate

| | medido |
| --- | --- |
| Testes | **4.595** em **259** arquivos · store 1562/116 · backoffice 1388/86 · core 1090/38 · functions 279/4 · catalog-import 276/15 |
| Exit codes | capturados por workspace via `PIPESTATUS`, nunca por `\| tail` |
| Lint | 30 erros / 8 warnings — **baseline exata** (backoffice 28/7 · store 2/1) |
| Tipos | store **0** · backoffice **0** |
| `packages/core/src/payment/` | **intocado** (`git status --porcelain` vazio) |

## Lições distiladas

1. **Teste que compara duas chamadas iguais é `expect` sem sensor.** `render(x)` vs `render(x,
   undefined)` parece uma asserção de regressão e é uma tautologia. Comparação de regressão precisa
   ser **diferencial** — os dois modos, nos dois sentidos — ou congelada contra um valor gravado.
2. **Ao apagar um componente, a queda de testes precisa de justificativa por asserção, não por
   número.** Os 14 que saíram mediam algo que virou verdadeiro por construção; escrever isso no
   `CLAUDE.md` é o que separa "deleção declarada" de "deleção silenciosa".
3. **AC cuja verificação exigiria recarregar o módulo raiz do app deve ser declarada não coberta.**
   Cobri-la com um teste que monta providers demais entrega verde sem discriminação — o defeito 1
   noutra forma.
