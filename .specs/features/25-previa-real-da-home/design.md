# 25 · Prévia real da Home — desenho

## O contrato mora em `core`, como toda regra que as duas pontas leem

`packages/core/src/home/preview.ts` — módulo **puro** (sem React, sem Supabase), pelo mesmo motivo de
`routes.ts` e `material`: as duas pontas precisam da mesma forma, e um guarda precisa importá-lo de
dentro de um teste de arquivo. Entra no barrel de `@estrelinha/core/home`; `catalog.test.ts` já
ancora a varredura em `>= 9` arquivos e passa a ver 10.

```ts
export const PREVIEW_SOURCE = 'estrelinha-home-preview'
export const PREVIEW_PARAM = 'preview'
export const PREVIEW_DEBOUNCE_MS = 200

export type PreviewMessage =
  | { source: typeof PREVIEW_SOURCE; type: 'ready' }                                  // loja → painel
  | { source: typeof PREVIEW_SOURCE; type: 'select'; sectionId: string }              // loja → painel
  | { source: typeof PREVIEW_SOURCE; type: 'draft'; sections: HomeSection[] }         // painel → loja
  | { source: typeof PREVIEW_SOURCE; type: 'highlight'; sectionId: string | null }    // painel → loja
```

Mais três funções puras, que são onde a regra fica testável sem DOM:

| função | responde |
| --- | --- |
| `isPreviewWindow(search, framed)` | `?preview=1` **e** dentro de iframe (`PRV-01`) |
| `parsePreviewMessage(data)` | `PreviewMessage` ou `null` — valida `source` e a forma (`PRV-04`) |
| `previewScale(available, deviceWidth)` | `min(1, available / width)`, e `1` quando `available <= 0` |

`previewScale` é função e não cálculo no componente porque em jsdom `clientWidth` é `0`: a regra
"sem medida, escala 1" precisa de teste, e no componente ela só existiria como efeito colateral.

## Loja — o modo prévia

**Detecção fora do router.** `isPreviewWindow(window.location.search, window.parent !== window)` é
chamada em `App.tsx` para **não montar o `AbandonedCartTracker`** (`PRV-05`), e no hook da Home. Não
depende de `useSearchParams` porque o `App` está acima das `Routes`.

**`useHomePreview()`** (`apps/store/src/entities/home/model/useHomePreview.ts`) devolve
`{ preview, sections, highlightId, onSectionClick }`:

- monta → `postMessage({ type: 'ready' }, '*')` ao pai. **`'*'` aqui é correto**: a loja ainda não
  sabe a origem do pai, e `ready` não carrega dado nenhum. O que nunca vai com `'*'` é o `draft`, que
  parte do painel e leva conteúdo (`PRV-07`).
- ouve `message`, descarta o que `parsePreviewMessage` recusar e o que não vier de `window.parent`.
- `sections` começa `[]` — e `[]` em modo prévia significa "ainda não chegou", não "Home vazia"
  (`PRV-03 AC 3`). O piso semeado **não** entra aqui: ele existe para erro de leitura, e em modo
  prévia não há leitura.

**`useHomeSections()` ganha `enabled`.** `HomePage` passa `enabled: !preview` — a consulta é
desligada, não filtrada depois (`PRV-02`).

**`HomeRenderer` ganha `preview?: PreviewProps`.** Sem ela, nada muda: cada seção continua saindo num
`Fragment`, porque `homeComposition.test.tsx` mede o **DOM renderizado** e um invólucro por seção
mudaria a árvore sem mudar um estilo. **Com** ela, cada seção sai dentro de
`<div data-home-section-id={id}>` — o invólucro que dá o alvo do clique e a caixa do contorno. A
regra do gate continua valendo: a T1 não perde asserção.

**Clique.** Um `onClickCapture` no invólucro da prévia, com `preventDefault()`, sobe pelo
`closest('[data-home-section-id]')` e devolve `select`. Captura, e não bolha: o `<Link>` do router
navega no handler dele, e só a fase de captura chega antes.

## Painel — a ponte e o palco

```
features/home-composition/
  ui/HomeLivePreview.tsx      ← palco: barra + alternador + iframe
  model/usePreviewBridge.ts   ← postMessage: envia draft/highlight, recebe ready/select
  ui/HomePreview.tsx          ← APAGADO (PRV-18)
shared/lib/storeOrigin.ts     ← STORE_URL + storeOrigin()
```

**Onde `VITE_STORE_URL` é lida.** Hoje quem a lê é `features/product-form/lib/storeUrl.ts`. Um
segundo `import.meta.env.VITE_STORE_URL` noutro arquivo seriam dois leitores da mesma env. A env passa
a ser lida em `@/shared/lib/storeOrigin.ts`, e `features/product-form/lib/storeUrl.ts` importa
`STORE_URL` de lá. **O arquivo não se move** — `SlugField.test.tsx` ancora o caminho
`features/product-form/lib/storeUrl.ts` numa lista de superfícies que precisam existir, e mover o
arquivo trocaria uma dívida por outra sem ganho.

**`usePreviewBridge`** recebe `{ iframeRef, sections, highlightId, onSelect }` e:

- ouve `message` **filtrando por `event.origin === storeOrigin()` e
  `event.source === iframeRef.current?.contentWindow`** (`PRV-08`);
- em `ready`, posta o `draft` imediatamente — é o que impede o quadro em branco de `PRV-03 AC 3`;
- reposta `draft` a cada mudança de `sections`, com debounce de `PREVIEW_DEBOUNCE_MS`;
- posta `highlight` **sem** debounce (é hover: atraso de 200 ms seria percebido como travamento).

**O rascunho.** `AdminHomePage` passa a segurar `draftDaSecaoAberta` e o `HomeSectionEditor` ganha
`onDraftChange`. A composição postada é `sections` com a seção em edição sobrescrita:

```ts
const rascunho = sections.map(s =>
  s.id === abertaId && draft ? { ...s, config: draft.config, items: aplicar(draft.items) } : s)
```

`aplicar` converte `DraftItem[]` em `HomeSectionItem[]` com `position` pelo índice e `id` = `key` —
ids de rascunho nunca chegam ao banco, e a loja só os usa como chave de React.

**Escala.** O iframe recebe `width={390} height={844}` **de verdade** (é o viewport que a loja mede) e
o invólucro aplica `transform: scale(k)` com `transformOrigin: 'top center'`, sendo `k =
previewScale(larguraDisponível, larguraDoDispositivo)`. A caixa externa reserva `w*k × h*k` para o
layout não sobrar. A largura disponível sai de um `ResizeObserver` no palco.

**Trocar de dispositivo não recarrega** (`PRV-14 AC 3`): só mudam `width`/`height`/`scale` do mesmo
nó. O `src` do iframe é montado **uma vez** (`useMemo` sem dependência de estado de dispositivo); se
entrasse no `src`, cada clique no alternador remontaria o documento e perderia o rascunho.

## Layout

```
lg+   grid-cols-[380px_minmax(0,1fr)]   rail primeiro no DOM
< lg  abas Seções / Prévia (como hoje)
```

`HomeSectionRow`: a palavra de estado (`Sempre no ar` / `No ar` / `Desligada`) passa de
`hidden sm:inline` para **`sr-only`**. O rail tem 380px e a palavra custava ~50px que o nome da seção
precisa; o interruptor e a opacidade da linha já dizem a mesma coisa visualmente, e
`HomeSectionList.test.tsx` (que assere `Sempre no ar` e `Desligada` por texto) continua medindo,
porque `sr-only` não tira do DOM.

## Segurança — quem confia em quem

| lado | o que faz | por quê |
| --- | --- | --- |
| painel → loja | `postMessage(draft, storeOrigin())` | conteúdo não salvo não vaza para um frame sequestrado |
| painel ← loja | exige `origin` da loja **e** `source === contentWindow` | o painel **age** (navega); é o lado sensível |
| loja ← painel | exige `source === window.parent` e a forma da mensagem | a loja só **desenha**; não escreve nada |
| loja | nenhuma escrita, sem `AbandonedCartTracker` | navegar a prévia não pode virar carrinho abandonado |

O modo prévia não expõe nada que a loja já não sirva publicamente: a composição chega do pai e o
catálogo é público. Por isso a loja é permissiva-mas-limitada e o painel é estrito.

## Riscos

| risco | mitigação |
| --- | --- |
| `homeComposition.test.tsx` (T1 da `24`) quebrar | o invólucro só existe em modo prévia; a T1 renderiza modo normal e não perde asserção |
| iframe cross-origin bloqueado por `X-Frame-Options` | dev é `localhost:8082` e não manda o header; produção precisa de `frame-ancestors` no `vercel.json` — **fica declarado, não implantado** (`C-08`: não há projeto Vercel) |
| jsdom não renderiza o conteúdo do iframe | por isso a cobertura da prévia mora em `core` (funções puras) e nos testes da loja; o painel testa a **ponte**, não o desenho |
