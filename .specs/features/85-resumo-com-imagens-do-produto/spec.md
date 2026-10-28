# 85 — O Resumo com as imagens do produto (coluna lateral do Backoffice)

**Protótipo:** Claude Design, projeto "Uma Estrelinha - Backoffice", arquivo `Produto - Resumo com imagens.html`
(https://claude.ai/design/p/e3957c10-bd49-4f3d-9256-04d72a7d0f41?file=Produto+-+Resumo+com+imagens.html).
As fotos são marcadores; o envio é simulado no navegador.

## Problem Statement

Na página do produto do painel (`/admin/produtos/:id`), as fotos — o que mais identifica uma joia
afetiva — só aparecem dentro da aba **Mídia**, uma de seis abas, e no card **Prévia na loja**, no fim
da coluna lateral, desenhado como uma segunda cópia do card da vitrine. No celular (~90% do uso) a
coluna lateral inteira fica **abaixo** de todas as abas: a Adri abre um produto e não vê a peça.
Acrescentar uma foto exige trocar de aba.

## Goals

- [ ] Abrir um produto e ver a foto principal **sem rolar e sem trocar de aba**, em 390×844 e em 1440.
- [ ] Acrescentar uma foto a partir da coluna lateral, por clique ou arrastando o arquivo, sem trocar de aba.
- [ ] Toda a edição de mídia (ordem, alt-text, remoção, vídeo) continua possível, num modal único — sem perder nenhum controle da aba Mídia de hoje.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Recorte/edição destrutiva de imagem | Já excluído pela feature de mídia original (`ImageGallery.tsx`, cabeçalho) |
| Upload de arquivo de vídeo | O vídeo continua sendo URL (YouTube/Vimeo), como hoje |
| Reordenar arrastando as miniaturas **no Resumo** | A ordem é editada no modal; o Resumo só mostra (ver Assumptions) |
| Mudança no modelo `{url, alt, source}` das imagens | Sem migration; o contrato da `07` fica intocado |
| Outras telas que usam `StorefrontPreview` | Só a página do produto perde o card |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Posição do Resumo no celular | **Antes das abas** (< `lg`); na coluna direita a partir de `lg` | Mobile é o caso principal | y (2026-10-27) |
| O botão "Adicionar imagens" do Resumo | Abre o **seletor de arquivo** e envia na hora, com progresso no card; **e** aceitar arquivo **arrastado** sobre o card | Escolha do usuário: "opção 1 mas adicionar Drag and Drop" | y (2026-10-27) |
| "Drag and drop" significa soltar arquivo, não reordenar | Soltar arquivo no card envia; reordenar fica no modal | Leitura da resposta; reordenar no card de 72px brigaria com o clique do zoom | y (2026-10-27) |
| Zoom | Visualizador em tela escura com setas, `←`/`→`, contador `n/N`, alt-text embaixo, `Esc` fecha, gesto de arrastar no celular | Escolha do usuário | y (2026-10-27) |
| O link "Abrir ↗" da Prévia na loja | Sobe para o cabeçalho do card **Resumo** (mesma URL, mesma regra de exibição) | Remover o card não pode remover o único atalho para a página pública | y (2026-10-27) |
| A aba **Mídia** | **Sai** da lista de abas; o conteúdo vira o modal "Mídia" aberto pelo Resumo | Pedido do usuário | y |
| Pendência do checklist "imagens" (`checklist.ts`, `tab: 'midia'`) | Clicar na pendência **abre o modal** de mídia | Hoje ela leva à aba que deixa de existir | y (2026-10-27) |
| Quantas miniaturas no Resumo | **1 principal + no máximo 7 miniaturas** | Decisão do usuário (2026-10-27) | y |
| O que sobra além das 8 | Um ladrilho "+N" (N = total − 8) **depois** das 7 miniaturas, que abre o visualizador na 9ª imagem; o zoom percorre todas | Sem ele a foto 9 em diante sumiria do Resumo sem aviso | y (2026-10-28, ao seguir para Design) |
| Edição de alt-text no modal | Mesmo comportamento do `ImageGallery` de hoje (estado "faltando", botão Gerar) | Nada é perdido | y |
| Gravação | Igual a hoje: imagens entram no formulário e gravam no **Salvar** | Upload vai ao Storage na hora; a lista de imagens é do rascunho | y |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Ver a peça no Resumo ⭐ MVP

**User Story**: Como a Adri, quero ver a foto principal e as outras fotos do produto no card Resumo,
logo ao abrir a página, para reconhecer a peça sem procurar.

**Acceptance Criteria**:

1. WHEN a página do produto abre THEN a coluna lateral SHALL mostrar, nesta ordem: Publicação → **Resumo** → Pronto para publicar → Fornecedor. (RES-01)
2. WHEN a página abre THEN o card **Prévia na loja** SHALL não existir. (RES-02)
3. WHEN o produto tem imagens THEN o Resumo SHALL mostrar a primeira imagem (`images[0]`) como principal, na largura do card, com proporção 1:1 e `object-cover`, e o `alt` dela (ou `Imagem 1` se vazio). (RES-03)
4. WHEN o produto tem mais de uma imagem THEN o Resumo SHALL mostrar as seguintes, na ordem, como miniaturas de **72×72px**, abaixo da principal, **no máximo 7** (imagens 2 a 8), embrulhando em linhas sem rolagem horizontal. (RES-04)
4a. WHEN o produto tem mais de 8 imagens THEN depois da 7ª miniatura o Resumo SHALL mostrar um ladrilho de 72×72px com "+N" (N = total − 8) e nome acessível "Ver mais N imagens" ("Ver mais 1 imagem" quando N = 1 — SPEC_DEVIATION/emenda de 2026-10-28, achado na prova em navegador), que abre o visualizador na 9ª imagem. Com 8 imagens ou menos, o ladrilho SHALL não existir. (RES-09)
5. WHEN o produto não tem imagens THEN o Resumo SHALL mostrar uma área vazia com a frase "Nenhuma imagem ainda" e o controle de adicionar (P2) no lugar da principal. (RES-05)
6. WHEN a largura é menor que `lg` THEN o Resumo SHALL aparecer **antes** das abas; a partir de `lg`, na coluna direita, com as demais cards da coluna inalteradas. O Resumo SHALL existir uma vez só no DOM. (RES-06)
7. WHEN há URL pública do produto THEN o cabeçalho do Resumo SHALL ter o link "Abrir ↗" que a Prévia tinha, em nova aba. (RES-07)
8. WHEN o Resumo mostra preço, margem, variações, estoque, imagens e peso THEN esses valores SHALL ser os mesmos de hoje (`summaryFacts`). (RES-08)

**Independent Test**: abrir um produto com 5 fotos em 390 e 1440 e ver principal + 4 miniaturas de 72px; abrir um sem foto e ver o vazio.

---

### P1: Zoom das imagens ⭐ MVP

**User Story**: Como a Adri, quero tocar numa foto do Resumo e vê-la grande, passando para as outras, para conferir detalhe da peça.

**Acceptance Criteria**:

1. WHEN a principal ou uma miniatura é clicada (ou ativada por `Enter`/`Espaço`) THEN SHALL abrir o visualizador na imagem clicada. Cada imagem do Resumo SHALL ser um botão com nome acessível "Ampliar imagem n de N". (ZOM-01)
2. WHEN o visualizador está aberto THEN SHALL mostrar a imagem inteira (`object-contain`), o contador `n / N` e o alt-text (ou nada, se vazio). (ZOM-02)
3. WHEN `→`/`←` ou as setas "Próxima"/"Anterior" THEN SHALL ir para a imagem seguinte/anterior; na última, "Próxima" volta à primeira (e o inverso). Com uma imagem só, as setas SHALL não aparecer. (ZOM-03)
4. WHEN o dedo arrasta horizontalmente mais de 48px THEN SHALL trocar de imagem no sentido do gesto. (ZOM-04)
5. WHEN `Esc`, o botão "Fechar" ou clique no fundo THEN SHALL fechar e devolver o foco à imagem que o abriu. (ZOM-05)
6. Setas e Fechar SHALL ter alvo de toque ≥ 44px. (ZOM-06)

---

### P2: Adicionar imagens pelo Resumo

**User Story**: Como a Adri, quero acrescentar fotos direto do Resumo, clicando ou soltando os arquivos, sem abrir aba nenhuma.

**Acceptance Criteria**:

1. WHEN "Adicionar imagens" é ativado THEN SHALL abrir o seletor de arquivo (múltiplos, `image/png,image/jpeg,image/webp` — o mesmo `accept` da galeria). (ADI-01)
   > **SPEC_DEVIATION (emenda, 2026-10-28)**: a letra dizia `image/*`. A galeria aceita só PNG, JPG e WebP, e o motor recusa o resto; o Resumo aceitar o que a galeria recusa seria oferecer um arquivo que falha depois. Achado pelo Verifier r1.
2. WHEN arquivos são soltos sobre o card Resumo THEN SHALL enviá-los do mesmo jeito; enquanto um arquivo é arrastado por cima, o card SHALL mostrar o estado "Solte para enviar". (ADI-02)
3. WHEN o envio corre THEN o card SHALL mostrar uma linha de progresso por arquivo, e o salvar do cabeçalho SHALL ficar desabilitado (mesma regra de `onUploadingChange`). (ADI-03)
4. WHEN o envio termina THEN as imagens novas SHALL entrar **no fim** da lista, com `alt: null` e `source: 'upload'`, e aparecer como miniaturas. (ADI-04)
5. WHEN um arquivo falha THEN SHALL aparecer o toast com a mensagem de `uploadFailureMessage`, e os outros do lote SHALL seguir. (ADI-05)
6. O motor de envio SHALL ser o mesmo da galeria (`uploadProductImages`) — sem segunda escrita. (ADI-06)

---

### P2: A mídia em modal

**User Story**: Como a Adri, quero um modal "Mídia", aberto pelo Resumo, onde reordeno, removo, escrevo a descrição (alt) de cada foto e informo o vídeo.

**Acceptance Criteria**:

1. WHEN a página abre THEN a lista de abas SHALL não ter "Mídia". (MOD-01)
2. WHEN "Editar mídia" é ativado no Resumo THEN SHALL abrir o modal "Mídia" com o mesmo conteúdo da aba de hoje: a galeria (envio, arrastar para ordenar, remover, alt-text com "faltando" e Gerar, selo de origem) e o campo de vídeo. (MOD-02)
3. WHEN algo muda no modal THEN a mudança SHALL refletir no Resumo **ao vivo** e marcar o formulário como alterado, como a aba fazia. Remover uma foto apontada por variação SHALL manter a regra de `clearMissingVariantImages`. (MOD-03)
4. WHEN o modal fecha THEN nada SHALL ser descartado (não há "Cancelar"; a gravação é o Salvar da página). (MOD-04)
5. WHEN há vídeo informado THEN o Resumo SHALL mostrar a linha "Vídeo · sim"; sem vídeo, "Vídeo · não". (MOD-05)
6. WHEN a pendência de imagens do "Pronto para publicar" é clicada THEN SHALL abrir o modal de mídia. (MOD-06)
7. WHEN 390px THEN o modal SHALL ocupar a tela sem rolagem horizontal, com alvo ≥ 44px nos controles. (MOD-07)
8. WHEN uma foto do modal tem os botões de ordem THEN cada foto SHALL ter "Mover para antes" (←), "Tornar principal" e "Mover para depois" (→), com nome acessível que cita a posição ("Mover a imagem 3 para antes"), alvo ≥ 44px e operáveis por teclado; "←" e "Tornar principal" desabilitados na 1ª, "→" desabilitado na última; mover leva `alt` e `source` junto e marca o formulário como alterado. (MOD-08)
9. WHEN uma foto é movida por esses botões THEN o foco SHALL ficar no mesmo botão da mesma foto na posição nova (ou no botão vizinho habilitado, se o mesmo ficou desabilitado), e uma região viva SHALL anunciar "Imagem movida para a posição n de N" (ou "Imagem n agora é a principal"). (MOD-09)
10. WHEN o modal está em 390px THEN as fotos SHALL ficar em 2 colunas (não 1), para que 28 fotos não virem uma lista de ~13.000px. (MOD-10)

> MOD-08..10 entram em 2026-10-28, a pedido do usuário, depois do QA (`BUG-20261028-ordenar-fotos-so-arrastando`). O protótipo já desenhava as três ações.

---

## Edge Cases

- WHEN uma imagem não carrega THEN a miniatura SHALL mostrar o fundo neutro com o número dela, sem quebrar a grade.
- WHEN o envio está em curso e o modal é aberto THEN o progresso SHALL continuar visível (estado único de envio).
- WHEN a principal é removida no modal THEN a próxima vira principal no Resumo imediatamente.
- WHEN o visualizador está aberto e a imagem atual é removida por outra via THEN SHALL fechar.

---

## Requirement Traceability

| ID | Story | Phase | Status |
| --- | --- | --- | --- |
| RES-01..09 | P1 Resumo | Design | Verified |
| ZOM-01..06 | P1 Zoom | Design | Verified |
| ADI-01..06 | P2 Adicionar | Design | Verified |
| MOD-01..07 | P2 Modal | Design | Verified |
| MOD-08..10 | P2 Modal (ordem pelo teclado) | Execute | Verified (navegador, 390/1440, fonte 100–200 %) |

**Coverage:** 31 total, 31 mapped to tasks.

---

## Success Criteria

- [ ] Em 390×844, a foto principal aparece acima da dobra ao abrir o produto.
- [ ] Nenhum controle da aba Mídia de hoje deixa de existir (inventário: envio, colar, ordenar, remover, alt, Gerar, selo, vídeo).
- [ ] Zero rolagem horizontal do body em 390, 1024 e 1440.
