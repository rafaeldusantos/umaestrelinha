# 85 — Prova em navegador (T12)

**Data**: 2026-10-28 · **Ambiente**: Chromium (Playwright MCP), painel do worktree servido em `http://localhost:8093` (Vite dev),
Supabase local `:54441`. `**/*.supabase.co/**` e `**/g/collect*` abortados no contexto antes da primeira navegação.
Login `admin@umaestrelinha.dev`. Produtos: **6 fotos** `eb0d919d-…` e **9 fotos** `ff520070-…`.
Nada foi salvo: `products.updated_at` dos dois segue `2026-10-22 11:57:29` e `images` com 6 e 9 depois da prova.

Screenshots em `store/.playwright-mcp/` (raiz do repositório principal):
`85-t12-390-6fotos.png`, `85-t12-390-9fotos.png`, `85-t12-390-modal-midia.png`, `85-t12-390-zoom.png`,
`85-t12-390-apos-envio.png`, `85-t12-1024-9fotos.png`, `85-t12-1024-zoom-ver-mais.png`, `85-t12-1440-9fotos.png`
(e `85-t12-1024-6fotos.png`/`85-t12-1440-6fotos.png`, só imagem — as medidas daquela passada se perderam num `beforeunload`).

## Medidas por viewport

| Medida | 390×844 | 1024×768 | 1440×900 |
| --- | --- | --- | --- |
| `scrollWidth` do documento (sem modal) | **390** | **1024** | **1440** |
| `scrollWidth` com o modal Mídia aberto | **390** | — | — |
| `scrollWidth` com o zoom aberto | **390** | — | — |
| Principal "Ampliar imagem 1 de N": `bottom` sem rolar | **684** (6 e 9 fotos, sem o aviso de rascunho) · **854** com o aviso "Há um rascunho não salvo" | 891 (top 704) | 944 (top 618) |
| Largura da principal | 292 | 187 | 326 |
| Resumo antes das abas (< lg) | Resumo título `top` 510 / principal 392 < `tablist` 1174 (6f) / 1254 (9f) | coluna direita (left 788; abas 264–739) | coluna direita (left 1065; abas 264–1016) |
| Ordem da coluna direita (`top` do título) | — | Publicação 192 → Resumo 652 → Pronto para publicar 1646 | Publicação 168 → Resumo 566 → Pronto para publicar 1539 |
| Resumo no DOM | 1 | 1 | 1 |
| Abas | Geral, Perguntas, Preços & variações, SEO, Relacionados (sem Mídia) | idem | idem |
| Card "Prévia na loja" | ausente | ausente | ausente |
| Link "Abrir na loja ↗" no cabeçalho do Resumo | presente, `target=_blank` | — | presente |

O card Fornecedor não aparece porque nenhum dos dois produtos tem fornecedor (`SupplierSummaryCard` devolve `null`); a ordem
dele não foi medida.

## Miniaturas (RES-04, RES-09)

- 6 fotos: 5 miniaturas, todas **72×72**, mais "Adicionar imagens" 72×72.
- 9 fotos (390, 1024, 1440): **7 miniaturas 72×72** (imagens 2–8) + ladrilho **"+1"** 72×72 (`Ver mais 1 imagens`) + "Adicionar" 72×72.
  Em 390 embrulham 3 por linha (left 49/129/209), sem rolagem horizontal.
  O pedido falava em "+2"; pela spec (N = total − 8) com 9 fotos o correto é **+1**, e é o que aparece.
- O ladrilho (Enter) abre o zoom em **"9 / 9"**; `→` volta a "1 / 9"; Fechar devolve o foco a `Ver mais 1 imagens`.

## Zoom (ZOM-01..06)

| Passo | Resultado |
| --- | --- |
| Foco na 3ª miniatura + Enter (6 fotos com a principal removida ⇒ N = 5) | abre em **"3 / 5"** |
| `→` ×3 | 4 / 5 → 5 / 5 → **1 / 5** (volta à 1ª) |
| `←` em 1 | **5 / 5** |
| botão Próxima / Anterior | 2 / 5 / 1 / 5 |
| Esc | fecha; `activeElement` = **"Ampliar imagem 3 de 5"** |
| Gesto (PointerEvent touch sintético, 9 fotos) | −60px ⇒ 2/9 · −40px ⇒ fica 2/9 · +60 ⇒ 1/9 · +60 ⇒ 9/9 |
| Clique no fundo (10, 820) em 390 | fecha; foco volta a "Ampliar imagem 1 de 9" |
| Tamanho dos controles em 390 | Fechar **44×44**, Anterior **44×44**, Próxima **44×44** (o "Close" do pacote mede 0×0, escondido) |
| Diálogo em 390 | 390×844 |

## Modal Mídia (MOD-02, MOD-03, MOD-07)

- 390: o diálogo mede **390×844** em (0,0); `scrollWidth` 390; o conteúdo do diálogo `scrollWidth` 388 = `clientWidth` 388.
- **X ("Close") 44×44**, **Concluir 348×44**, campo de vídeo 348×44.
- Remover a imagem 1 no modal: a principal do Resumo (atrás do modal, ao vivo) passou de `…/1220655267.webp` "1 de 6" para
  `…/1220655263.webp` "1 de 5" — a mesma que virou primeira na galeria. Concluir mantém (não salvo).

## Envio real (ADI-01..04)

Dois PNG 400×400 sólidos. O POST do Storage foi atrasado 2 s por rota para tornar a janela observável.

| Caminho | Durante (700 ms) | Depois (~4,7 s) |
| --- | --- | --- |
| (a) `setInputFiles` no `summary-file-input` | Salvar rascunho / Salvar e publicar **desabilitados**; linha "t12-adicionar.png · enviando" | habilitados; "enviada"; 5 → **6** imagens, a última miniatura é `products/dd1a6e7e-….webp` |
| (b) `DragEvent` sintético dragenter/dragover/drop no card | véu **"Solte para enviar"** visível após dragover; depois do drop: salvar **desabilitado**, "t12-soltar.png · enviando" | habilitados; "enviada"; 6 → **7** imagens, a última é `products/65a5cca7-….webp` |

Limpeza: os dois objetos (`products/dd1a6e7e-45a4-4eef-a11e-2234d12a6195.webp`, `products/65a5cca7-aeca-49d1-bd4e-44ef5bca1e4a.webp`),
os únicos criados na última hora no bucket e os mesmos dos POSTs capturados, foram apagados pela API do Storage local
(service role); `storage.objects` conta 0 para eles depois.

## Console

**0 erros** na sessão inteira (Playwright: "Errors: 0"; nenhum `pageerror`). Avisos só do React Router (future flags) e do tiptap
(`Duplicate extension names found: ['link']`), anteriores a esta feature.

## Defeitos e achados

1. **MOD-07 não cumprido: controles do modal Mídia abaixo de 44px em 390.** Medido: "Remover imagem n" **18×18** (classe
   `absolute right-1 top-1 … p-0.5 opacity-0 group-hover:opacity-100` — além de pequeno, invisível sem hover, que no toque não
   existe), "Gerar" **73×24**, campo "Alt-text da imagem n" **328×32**. Nenhum tem `::before` de extensão de alvo. Vêm do
   `ImageGallery` reaproveitado sem mudança, mas a AC do modal pede ≥ 44px. Passos: 390×844, produto 6 fotos, "Editar mídia",
   medir `getBoundingClientRect()` dos botões do `[role=dialog]`.
   **CONSERTADO (2026-10-28)** em `ImageGallery.tsx`: remover sempre visível, `h-11 w-11` no canto de cima à direita (os selos
   ficam embaixo), com o círculo vermelho pequeno dentro; "Gerar" `h-11`; o alt `h-11`. Preso por
   `ImageGallery.test.tsx` › *alvos de toque de 44px no modal (MOD-07)* (token exato; vermelho antes do conserto). Medida em
   navegador não refeita.
2. **Fechar o modal Mídia devolve o foco ao `<body>`**, não ao "Editar mídia". Passos: focar "Editar mídia", Enter, Esc (ou
   Concluir) ⇒ `document.activeElement` = `BODY`. O zoom devolve corretamente; o modal não. Nenhuma AC escreve isso para o
   modal (ZOM-05 é do zoom), mas é regressão de acessibilidade em relação à troca de aba.
   **CONSERTADO (2026-10-28)** em `ProductMediaDialog.tsx`, com o padrão do `ImageLightbox` (guarda a origem em
   `onOpenAutoFocus`, refoca em `onCloseAutoFocus` com `preventDefault`). Preso por `AdminProductFormPage.midia.test.tsx` ›
   *o foco volta ao "Editar mídia" ao fechar o modal* (Concluir e Esc, pela página real; vermelho antes do conserto).
3. **Texto "Ver mais 1 imagens"** (plural com N = 1). A spec escreve o molde "Ver mais N imagens"; com 9 fotos sai no plural errado.
   **CONSERTADO (2026-10-28)** em `ProductMediaSummary.tsx` (singular com N = 1). Preso por `ProductMediaSummary.test.tsx` ›
   *9 imagens ⇒ "Ver mais 1 imagem"* e *10 imagens ⇒ "Ver mais 2 imagens"* (vermelho antes do conserto); o caso antigo do "+N"
   com 9 fotos foi reescrito para o rótulo no singular.
4. **Pré-existente (não é da 85): o formulário fica "Alterações não salvas" logo ao abrir, sem nenhuma edição**, e grava rascunho
   no `sessionStorage` em ~1,5 s. Reproduzido também no painel da `master` (`:8083`) nos dois produtos. Consequência para esta
   feature: na segunda visita na mesma aba aparece o aviso "Há um rascunho não salvo" (≈170px), e com ele a principal em 390
   termina em **854 > 844** — 10px abaixo da dobra. Sem o aviso, 684. Também é o que faz todo `goto` disparar `beforeunload`.
5. **A dobra em 1024 e 1440 (Goal, não AC):** o Goal diz "ver a foto principal sem rolar em 390×844 e em 1440". Em 1440×900 a
   principal começa em 618 e termina em 944 (282 de 326px visíveis); em 1024×768 começa em 704 (64 de 187px visíveis). O
   Success Criteria só exige 390, que passa.

## O que não foi provado

- **Arrasto de arquivo real do sistema operacional**: o drop foi um `DragEvent` sintético com `DataTransfer`; o caminho do código é
  o mesmo, mas o arrasto nativo do Finder não foi exercitado.
- **Gesto com dedo real**: o swipe foi `PointerEvent` sintético (`pointerType: 'touch'`), não toque de aparelho.
- **Pendência do checklist abrindo o modal (MOD-06)**: os dois produtos têm imagem, então a pendência não existe; não houve
  produto sem foto à mão sem editar dados.
- **Falha de envio (ADI-05)** e **estado vazio (RES-05)**: não forçados.
- **1024 com o produto de 6 fotos**: só screenshot, sem as medidas (perdidas no `beforeunload` da primeira passada); o de 9 fotos foi medido.
- Fonte do sistema a 130/200 %, leitor de tela e Android real.
