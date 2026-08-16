# 29 — Página Sobre · Validação

**Veredito: PASS.**

Passe independente (fallback standalone do `validate.md`: sem sub-agente, com verificação
spec-anchored + sensor de discriminação). Escopo Medium, executado inline.

## Gate

| Medida | Resultado | Baseline do `CLAUDE.md` |
| --- | --- | --- |
| `vitest` (workspace store) | **127 arquivos · 1793 testes, todos verdes** | 122/1712 no fecho da 27 |
| `tsc --noEmit -p apps/store/tsconfig.app.json` | **0** | 0 — mantida |
| `pnpm --filter @estrelinha/store lint` | **2 erros · 1 warning** | store 2/1 — mantida, **zero erro novo** |
| `packages/core/src/payment/**` | **intocado** | continua valendo |

A suíte somou **+11 testes** e **+1 arquivo** (`AboutPage.test.tsx`, 22; `icons.test.ts` ganhou 3).
Nenhum teste foi removido ou afrouxado.

**Uma falha intermediária, explicada e descartada:** a primeira execução completa acusou timeout em
`homeComposition.test.tsx`. É o flake de RTL sob carga que o `CLAUDE.md` documenta — passa isolado
(26/26) e passou na execução final. Não toca nenhum arquivo desta feature.

## Verificação spec-anchored (AC a AC)

| AC | Evidência |
| --- | --- |
| AC-1 | `monta as quatro faixas na ordem do artboard` + `cada faixa sai com o fundo medido` |
| AC-2 | `traz o título e a frase de abertura com o texto exato` — frase inteira, não fragmento |
| AC-3 | `sem foto, mostra o palco da marca e nenhum <img>` |
| AC-4 | `traz o texto da Adri na ordem escrita` — os 9 blocos por prefixo, em sequência |
| AC-5 | `nenhum TEXTO da faixa escura usa accent — só o traço da estrela` |
| AC-6 | `sem WhatsApp configurado, a ação some e a primária permanece` |
| AC-7 | `com WhatsApp, o link sai com os dígitos do número` |
| AC-8 | `declara /sobre e remove a tag ao desmontar` |
| AC-9 | `copyInstitucional.test.tsx` verde — **com uma edição, declarada abaixo** |
| AC-10 | `as duas ações têm 44px de altura mínima` |
| AC-11 | `abre a página com Início › Sobre` + `a trilha vem antes do hero` |
| AC-12 | `existe uma única vez no DOM` + `no DOM vem depois da foto; no desktop a grade a devolve` |
| AC-13 | `a vaga é 4:3 paisagem nos dois tamanhos, sem variante por breakpoint` |
| AC-14 | `estrela — o ornamento do logotipo`: 4 curvas, 0 retas, pontas nos eixos, concavidade simétrica |

### Lacuna de precisão da spec, corrigida

**AC-9 dizia "passa sem edição", e estava errada.** O mock de `copyInstitucional.test.tsx` substitui
o módulo `useStoreSettings` **inteiro**; como a Sobre passou a ler `useGeneralSettings`, o render
estourava antes de qualquer asserção. Foi acrescentado o hook ao mock — **nenhuma asserção de copy
foi alterada, removida ou afrouxada**. A AC foi reescrita para dizer o que de fato se exige: o guarda
continua verde e nenhuma asserção muda.

## Sensor de discriminação

Oito defeitos de comportamento injetados no fonte, testes rodados, mutação descartada. **Zero
sobreviventes** — cada um derrubou ao menos um teste:

| Mutante | Morto por |
| --- | --- |
| M1 · portão do WhatsApp `>= 10` → `>= 1` | `número curto demais é número não configurado` |
| M2 · versalete da assinatura volta a ouro | `o versalete da assinatura não é ouro` + `todo elemento em ouro é desenho` |
| M3 · botão primário perde `min-h-11` | `as duas ações têm 44px de altura mínima` |
| M4 · hero troca `ground-deep` por `ground` | `cada faixa sai com o fundo medido no artboard` |
| M5 · legenda vai para a coluna 2 | `no desktop a grade a devolve para a coluna de texto` |
| M6 · trilha perde `aria-current` | `abre a página com Início › Sobre` |
| M7 · ornamento vira losango (curvas → retas) | `é a faísca de quatro pontas, com os lados curvos` + concavidade |
| M8 · vaga da foto volta a retrato 4:5 | `a vaga é 4:3 paisagem nos dois tamanhos` (3 testes) |

## Defeito encontrado **pelo** gate, e corrigido

`accentText.test.ts` reprovou a primeira versão da página: o versalete `UMA ESTRELINHA` da assinatura
saía em `accent-strong` sobre `ground-deep` — **3,17:1**, que passa como traço (3:1) e reprova como
texto (4,5:1). O defeito veio do artboard, não do código. Corrigido para `ink-soft`, com a divergência
declarada no fonte e na spec, e travado por teste próprio (M2 acima) — porque `accentText` sozinha não
o pegaria de novo: o arquivo agora está na lista curta por causa dos ícones.

## Fora do alcance dos testes automáticos

- **A medida em 390×844 continua sendo auditoria em navegador.** jsdom devolve 0 para toda medida de
  layout; o que os testes travam são as **classes** (proporção, `minmax(0,…)`, `min-h-11`) como proxy.
  É a mesma decisão registrada para a `ProductPage` no `CLAUDE.md`.
- **A fotografia da Adri não existe no repositório.** A vaga entra com o palco da marca; `ADRI_PHOTO`
  é o ponto único de acendimento.
