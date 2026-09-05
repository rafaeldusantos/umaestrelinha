# Validação — `37-frete-gratis-configuravel`

> **O AUTOR É O VERIFICADOR.** Quarta feature seguida (a `34`, a `35` e a `36` têm a mesma pendência).
> A execução foi inline, no mesmo contexto que implementou. Isso **reduz** o viés onde a evidência é
> medida — e há injeção de falha nos guardas novos —, mas não o elimina: ninguém conferiu esta spec
> com olhos frescos.

**Data**: 2026-09-05 · **Veredito**: PASS com pendência de navegador (ver §5)

---

## 1. O que foi medido, e como

| Medida | Resultado | Comando |
| --- | --- | --- |
| Testes — `core` | **1476 / 59 arquivos** (baseline 1444/57, **+32**) | `npx vitest run` em `packages/core` |
| Testes — `backoffice` | **1782 / 108 arquivos** (baseline 1773/108, **+9**) | `npx vitest run` em `apps/backoffice` |
| Testes — `store` | **1996 / 135 arquivos** (baseline corrigida 1951/134, **+45**) | `npx vitest run` em `apps/store` |
| Tipos — `store` | **0** | `npx tsc --noEmit -p apps/store/tsconfig.app.json` |
| Tipos — `backoffice` | **0** | `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` |
| Lint | **27 erros / 5 warnings** (baseline **mantida**) — backoffice 25/4 · store 2/1 | `pnpm lint` + `npx eslint .` em `apps/store` |
| Build | **2 de 2, exit 0** | `pnpm build` |
| Código de dinheiro | **0 arquivos alterados** | `git diff --name-only -- packages/core/src/payment supabase/functions` → vazio |

Cada workspace rodou **sozinho**, com exit code capturado — nunca `pnpm test | tail`, cujo código de
saída é o do `tail`.

**A soma dos deltas bate arquivo a arquivo**: `core +32` são os 26 de `freeShipping.test.ts` mais os 6
de `useFreeShipping.test.ts`; `backoffice +9` são os 9 casos novos de `AdminSettingsPage.test.tsx`.
Nenhum delta sobrou sem origem — que é a checagem que pega deleção silenciosa.

---

## 2. Contagem do `store`, e a contrapartida declarada

### A baseline do `CLAUDE.md` estava 8 testes e 1 arquivo curta — e o erro NÃO é desta feature

O `CLAUDE.md` dizia **1943 / 133**. O número medido na árvore **antes** de qualquer alteração desta
feature é **1951 / 134** — apurado por subtração de uma execução real: a suíte rodou logo após a T01
(que somou exatamente 6 casos a `storeSettingsDefaults.test.ts`, de 15 para 21) e devolveu 1957/134.

A diferença é de bookkeeping: a árvore de trabalho carrega as features `34`, `35` e `36` não
commitadas, e alguém acrescentou um arquivo de teste depois da última medição. **É a segunda vez que
isso acontece** — a `31` já havia registrado um número 3 testes curto. A lição do `CLAUDE.md` vale
literalmente: *baseline anotada de memória, ou de execução anterior à última alteração, mente sem
quebrar nada*.

### O delta fecha arquivo a arquivo

| Arquivo | Antes | Depois | Δ |
| --- | ---: | ---: | ---: |
| `freeShippingSingleOwner.test.ts` (**novo**) | — | 15 | **+15** |
| `cartStore.test.ts` | 30 | 36 | +6 |
| `CartDrawer.test.tsx` | 25 | 31 | +6 |
| `DeliveryBlock.test.tsx` | 37 | 43 | +6 |
| `storeSettingsDefaults.test.ts` | 15 | 21 | +6 |
| `OrderSummary.test.tsx` | 40 | 45 | +5 |
| `AuthOverlay.test.tsx` | 6 | 8 | +2 |
| `TrustBar.test.tsx` | 7 | 8 | +1 |
| `copyInstitucional.test.tsx` | — | — | +1 |
| `drawerFacts.test.ts` | 15 | 12 | **−3** |
| | | | **+45** |

`1951 + 45 = 1996`. Nenhum delta sobrou sem origem — que é a checagem que pega deleção silenciosa.

**Contrapartida obrigatória**: `drawerFacts.test.ts` **perdeu 3 casos** (15 → 12), e os três
reapareceram em `packages/core/src/shipping/__tests__/freeShipping.test.ts`. É a migração de asserção
prevista pelo `CLAUDE.md` — "queda só vale se o número reaparece do outro lado". O terceiro deles
teve o **veredito invertido de propósito**: `freeShippingProgress(30, 0)` devolvia
`{ remaining: 0, percent: 100, reached: true }` ("frete grátis sempre"), e é essa leitura que custava
dinheiro. Hoje a mesma configuração devolve inativo.

`FreeShippingBar.tsx` foi apagado **sem perda de contagem**: nunca teve teste, porque nunca teve
consumidor.

---

## 3. Cobertura por critério de aceite

| AC | Onde se prova | Estado |
| --- | --- | --- |
| 1 · interruptor existe e reflete o gravado | `AdminSettingsPage.test.tsx` — "o interruptor existe e reflete o valor gravado", "nasce DESLIGADO quando o banco diz desligado" | ✔ |
| 2 · salva preservando o threshold | idem — "desligar e salvar manda `free_shipping_enabled: false` COM o threshold intacto" | ✔ |
| 3 · campo desabilitado exibindo o número | idem — "desligar PRESERVA o valor da faixa…" | ✔ |
| 4 · linha antiga cai no default | `useFreeShipping.test.ts` — "linha `shipping` antiga, sem o campo, cai no default DESLIGADO" | ✔ |
| 5 · `TrustBar` | `TrustBar.test.tsx` — "com o interruptor DESLIGADO, o envio continua prometendo o Brasil inteiro" | ✔ |
| 6 · `ProductTrustBadges` | coberto pelo guarda de leitura + o componente passou a depender de `active`; **sem teste de componente dedicado** — ver §6 | ⚠ |
| 7 · `/politicas` | `copyInstitucional.test.tsx` — "com o interruptor DESLIGADO, a promessa não aparece" | ✔ |
| 8 · gaveta (faixa + `CrossSell`) | `CartDrawer.test.tsx` — 6 casos novos, incluindo "a faixa 'Complete o frete grátis' some junto" | ✔ |
| 9 · resumo do checkout (2 variantes) | `OrderSummary.test.tsx` — 5 casos novos, incluindo o par sufixo-presente / sufixo-ausente | ✔ |
| 10 · `AuthOverlay` | `AuthOverlay.test.tsx` — "o valor do frete grátis é o das settings", "com o interruptor DESLIGADO, o item de frete grátis some" | ✔ |
| 11 · ligado segue igual | o par de cada caso acima (todo teste desligado tem um ligado ao lado) | ✔ |
| 12 · `DeliveryBlock` não zera | `DeliveryBlock.test.tsx` — "DESLIGADO: subtotal MUITO acima da faixa guardada não zera opção nenhuma" | ✔ |
| 13 · `cartStore.shippingCost()` | `cartStore.test.ts` — bloco novo de 6 casos (**a função não tinha teste nenhum**) | ✔ |
| 14 · cupom `free_shipping` intocado | `DeliveryBlock.test.tsx` — "DESLIGADO: o cupom de frete grátis CONTINUA zerando todas" | ✔ |
| 15 · ligado preserva SHP-06 | `DeliveryBlock.test.tsx` — os casos de threshold que já existiam, mantidos | ✔ |
| 16 · fonte única | `freeShippingSingleOwner.test.ts` — allowlist de 2 arquivos | ✔ |
| 17 · desligado ⇒ `reached: false` | `freeShipping.test.ts` — "invariante 1", 3 casos | ✔ |
| 18 · faixa ≤ 0 sem `NaN`/`Infinity` | `freeShipping.test.ts` — "invariante 2", 3 casos | ✔ |
| 19 · guarda de leitura direta | `freeShippingSingleOwner.test.ts` — âncora dupla + sensor | ✔ |
| 20 · pureza e extensão `.ts` | `freeShipping.test.ts` — bloco "é módulo puro e alcançável fora do Vite" | ✔ |
| 21 · migration aditiva | `storeSettingsDefaults.test.ts` — "a migration é ADITIVA" | ✔ |
| 22 · migration idempotente | idem — "a migration é IDEMPOTENTE" | ✔ |
| 23 · SQL ↔ TypeScript | idem — "nasce DESLIGADO no SQL e no TypeScript" | ✔ |
| 24 · recusa ligado-sem-faixa | `AdminSettingsPage.test.tsx` — "a recusa explica o motivo, sem linguagem festiva" | ✔ |
| 25 · recusa não escreve | idem — "ligado com o valor zerado não chega a escrever no banco", asserido pela **ausência** de chamada | ✔ |

---

## 4. Sensor de discriminação — injeção de falha

O guarda novo (`freeShippingSingleOwner.test.ts`) teve a sensibilidade **medida**, não presumida:

| Mutação injetada | Resultado |
| --- | --- |
| `const injetado = useShippingSettings().free_shipping_threshold` em `TrustBar.tsx` | **REPROVOU** — "toda leitura está no allowlist, com motivo", `expected [ Array(1) ] to deeply equal []`. Revertido, e a reversão conferida por `grep -c` (0 ocorrências). |

O arquivo carrega ainda **quatro sensores embutidos**, que rodam a cada execução:

1. `comentário é REMOVIDO, com CRLF e com LF` — prova o stripper nos dois finais de linha **e** que
   o código em volta sobrevive (um stripper que apagasse tudo passaria só na primeira metade).
2. `a régua ENCONTRA o que procura` — se o extrator quebrar, as asserções de ausência passariam
   sozinhas.
3. `a régua DE FATO pegaria os dois nomes de volta` — fixture sintética com
   `freeShippingProgress` e `FreeShippingBar`.
4. `a régua DE FATO pegaria um literal desses` **e** `a régua NÃO acusa copy legítima` — o par que
   impede tanto régua cega quanto régua que casa tudo.

`storeSettingsDefaults.test.ts` ganhou o seu: `o parser DISCRIMINA — campo ausente devolve undefined`.
Sem ele, um `campoAditivo` que devolvesse sempre `false` faria a comparação SQL↔TS passar por
acidente.

---

## 4b. A migration foi APLICADA no banco local, e o efeito medido

Não por leitura de arquivo — `supabase migration up --local` contra a instância da porta 54341/54342.
É o padrão de prova que a `AD-012` exige ("probe contra o banco local, não inspeção de tipo").

| Probe | Resultado |
| --- | --- |
| Estado antes | `{origin_zip, handling_days, default_shipping_cost, free_shipping_threshold}` — **sem** o campo |
| `supabase migration up --local` | `Applying migration 20260905120000_37-…` · exit **0** |
| Estado depois — **é aditiva** | os **quatro** campos originais intactos, mais `"free_shipping_enabled": false` |
| Default gravado bate o TypeScript | `false` nos dois lados |
| **Idempotência, o probe que importa** | liguei o interruptor por SQL (`true`), reexecutei o arquivo inteiro da migration, e o valor **continuou `true`** — o `NOT value ? 'free_shipping_enabled'` impede que todo `db push` futuro desligue o que a Adri ligou |
| RLS incidental | `PATCH` em `store_settings` com a chave **publicável** devolve 204 e **não escreve** — a policy de escrita exige `has_role(admin)` |

Estado local restaurado ao default declarado (**desligado**) ao fim dos probes.

---

## 5. O que NÃO foi medido

- **Navegador real, em 390 e 1440, com o interruptor nos dois estados.** É a pendência aberta, e ela
  importa mais que o normal aqui: **jsdom devolve 0 para toda medida de layout**, e o que muda ao
  desligar é *presença de bloco* — a faixa some do topo da gaveta e do resumo, e a lista sobe. Se
  algum espaçamento dependia da faixa existir, nenhum teste desta feature acusaria.
- **A migration não foi aplicada no projeto HOSPEDADO** — só no local (§4b). Sai no `Supabase Deploy`
  do push.
- **O `RuntimeSettingsLoader` não tem teste** — ele já não tinha. A ponte é coberta indiretamente por
  `useFreeShipping.test.ts` (o hook) e por `cartStore.test.ts` (o consumidor), mas o efeito de copiar
  os três campos juntos é asserido só pela leitura do código.

---

## 6. Lacunas conhecidas

| Lacuna | Por que ficou | Risco |
| --- | --- | --- |
| `ProductTrustBadges` sem teste de componente dedicado ao interruptor | O componente não tem arquivo de teste próprio; ele é exercitado de lado por `ProductInfoPix`, `VariantSurfaces` e afins, cujos mocks foram atualizados para declarar `free_shipping_enabled: true` | Baixo — o selo depende de `freteGratis.active`, e a regra tem 26 casos. Mas AC 6 está provado por leitura, não por render. |
| `enabled: true` + faixa ≤ 0 é inexprimível como "frete grátis incondicional" | Nunca foi pedido; teria copy própria em cinco superfícies | Nenhum hoje. Se a Adri pedir, é AC nova, não redesenho. |
