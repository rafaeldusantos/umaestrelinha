## 04 · [apps/backoffice] A tela "Faixa de avisos" do painel

**Status:** done

`UC-03` — 101

**Objetivo.** A dona liga e desliga a faixa, monta até 5 avisos de texto ou de imagem e vê na loja de verdade como a
cliente vai ver, sem deploy.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `DESIGN.md` (§6–§8). Dos grandes demais, leia as seções:
`apps/backoffice/CLAUDE.md › A sidebar` · `› A coluna é FIXA` · `› O modo de foco` · `› Molde dos formulários` ·
`› Gravar NÃO desmonta` · `› O movimento do painel` · `› A ponte da prévia` · `› /admin/menu` · `CLAUDE.md ›
Feature-Sliced Design` · `CLAUDE.md › Convenções que valem em todo o repositório` · `CLAUDE.md › Os guardas — o que trava
o quê` (`rotasSobGuarda`, `navItems`, `focusRoutes`, `NavRail`, `previaUnica`, `animacaoRespeitaMovimento`) · `CLAUDE.md ›
Baselines`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (A tela "Faixa de avisos" do painel); §4 · spec.md — Código; §7 · spec.md —
Decisões (PR-5, PR-6, PR-7, H-05, H-08, H-09, H-14, H-15, H-19..H-23).

**Depende de.** 01 — `core/announcements` (tipos, tetos, recusas, `DEFAULT_ANNOUNCEMENTS`, vagas da arte, canal de
prévia) e a chave `announcements` em `useStoreSettings`. Confira que existe antes de começar.

### Critérios de aceite

### UC-03 · O painel
- Uma tela "Faixa de avisos": interruptor geral, a lista de avisos (arrastar para ordenar, até 5), e por aviso: tipo
  (texto ou imagem); texto: trecho em destaque, texto, rótulo do link, destino; imagem: as duas artes, texto
  alternativo, destino.
- O destino é um caminho da loja (`/ofertas`, `/aneis`), recusado pela mesma régua do Banner principal
  (`ctaHrefRefusal`): nada de endereço externo.
- Prévia: a faixa como a cliente vê, nos dois tamanhos.
- O texto de ajuda lembra o tom da loja (sem contagem regressiva, sem "últimas unidades", sem exclamação).

- **RN-03 · O tom da loja.** Nenhum tipo de aviso com contagem regressiva, estoque ou prova social, e o catálogo de
  tipos asserta a ausência (como `homeSections.test.ts`). O painel não impede o texto livre; o guia de tom fica na
  ajuda da tela.

- **CA-04** Destino externo é recusado no painel com o motivo; aviso sem destino é texto, sem link.

- **CA-08** Depois de ligar, a faixa aparece em produto e categoria em até 5 minutos e em todas as páginas em até 1
  hora; nenhuma página a mostra empurrando o conteúdo nesse meio-tempo.

### Design — o que a tela faz

- Casco: grupo **Loja** da sidebar (Home, Menu da loja, **Faixa de avisos**); trilha "Loja › Faixa de avisos"; título
  "Faixa de avisos"; subtítulo "A faixa fina acima do cabeçalho, em todas as páginas da loja (menos o checkout). Um
  aviso por vez, trocando a cada 6 segundos."
- Card do interruptor: "Faixa ligada", descrição "Desligada, a faixa some e o cabeçalho volta para o topo." (switch de
  44 px); ajuda fixa ao lado: "Pode levar até uma hora para a faixa aparecer ou sumir em todas as páginas da loja."
- Card "Como a cliente vê" (região "Prévia da faixa"): a loja num iframe, computador e celular 390; "Aviso N de M" com
  "Aviso anterior"/"Próximo aviso" (só com a faixa ligada e mais de um aviso). Desligada ou vazia: "A faixa está
  desligada: a loja abre sem ela."
- Card "Avisos": contador "N de 5"; ajuda "Sem contagem regressiva, sem “últimas unidades” e sem exclamação: o tom da
  loja vale aqui também."; lista sanfonada, um aviso aberto por vez (abrir um o põe na prévia); por aviso: número, o
  botão-resumo (mín. 44 px; linha 1 "destaque · texto", ou o texto alternativo, ou "Aviso de imagem"; linha 2
  "Texto|Imagem · <destino ou 'sem link'>", a primeira cortada com reticências), "Subir o aviso N" (desabilitado no
  1º), "Descer o aviso N" (desabilitado no último), "Tirar o aviso N" (sem confirmação), e arrastar para ordenar;
  "+ Adicionar aviso" cria um aviso de texto vazio, aberto e na prévia, e some com 5. Com o aviso recolhido e uma
  recusa, a recusa aparece abaixo do cabeçalho dele.
- Corpo do aviso: "Tipo do aviso" (Texto/Imagem, radiogroup, padrão Texto); grade de 2 colunas que vira 1 abaixo de 1024.
  - Texto: "Trecho em destaque" (contador de 40), "Texto" (contador de 60), "Rótulo do link" (20, exemplo "Ver
    ofertas"), "Destino" (exemplo "/ofertas"; dica "Sem destino, o aviso é só texto."; recusa: a frase de
    `announcementRefusal` (core), que é a de `ctaHrefRefusal` com o prefixo do ordinal — externo: "1º aviso: O endereço
    precisa começar com “/”: a loja só aponta para páginas dela."; `//host` e `/\host`: "1º aviso: Este endereço leva
    para fora da loja. Use um caminho da loja, começando com uma só “/” — por exemplo, “/ofertas”."). Toda recusa de
    aviso vem de `core` com o prefixo "Nº aviso: ".
  - Imagem: "Enviar arte · 1440 × 48", "Enviar arte · 780 × 96" (a miniatura na proporção da vaga), "Texto alternativo"
    obrigatório (vazio: "Nº aviso: Descreva a arte: é o que o leitor de tela e o Google leem."; dica "O que está escrito na
    arte."), "Destino".
- Barra de salvar no fim: com recusa, "Corrija o que está marcado para salvar." e o Salvar desabilitado; depois de
  salvar, "Salvo. Pode levar até uma hora para a faixa aparecer ou sumir em todas as páginas da loja."

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| Rota `/admin/faixa-de-avisos`, auto-fechada dentro do bloco do `RequireAdmin` (`apps/backoffice/src/app/App.tsx:53-60`, `:160`), na posição que casa com `navGroups` | VOCÊ CRIA | — | — |
| Item "Faixa de avisos" em `navGroups.Loja` logo depois de "Menu da loja" (`apps/backoffice/src/widgets/admin-layout/model/navItems.ts:100-112`) e entrada em `FOCUS_ROUTES` (`focusRoutes.ts:27-37`) | VOCÊ ALTERA | — | — |
| A página em `apps/backoffice/src/pages/admin/` e `apps/backoffice/src/features/announcement-bar/{model,ui,lib}` (formulário, envio de arte, palco `…LivePreview.tsx` e ponte `use…PreviewBridge.ts`) | VOCÊ CRIA | — | — |
| Gravação: `useUpdateSettings` com `{ key: 'announcements', value }` por `upsert` (`packages/core/src/hooks/useStoreSettings.ts:164-177`) | JÁ EXISTE. Consuma; não altere | o valor validado | invalida `['store_settings']` |
| Envio de arte: `apps/backoffice/src/shared/lib/uploadImage.ts › validateImageFile` (:66), `uploadImageBlob` (:183), `deleteStorageImage` (:229), numa pasta própria do bucket de imagens da loja | JÁ EXISTE. Consuma; não altere | o arquivo | a URL pública |
| `core/announcements` (recusas, tetos, vagas, canal de prévia `draft`/`show`) | JÁ EXISTE (da 01). Consuma; não altere | — | — |
| `previewFrame`, `PREVIEW_DEVICES`, `previewSrc` (`packages/core/src/home/preview.ts:135-138, 200-225, 244-245`) | JÁ EXISTE. Consuma; não altere | — | — |

### Decisões já tomadas

- PR-5 e H-22: a prévia é a loja num iframe (`previewSrc`, `/?preview=1`) nos quadros 390 e 1024 de `previewFrame`; o
  painel nunca desenha a faixa. A faixa aparece sobre a Home vazia do modo prévia, e isso é aceito.
- H-21: a ponte manda duas mensagens pelo canal da 01: o rascunho (com atraso curto, como a ponte do menu) e "mostre o
  aviso N" (sem atraso), com origem exata. O recebedor da loja é da tarefa 03; aqui, prove a ponte com o iframe dublado.
- PR-6 e H-19: as recusas vêm de `core/announcements` e aparecem no campo antes de qualquer chamada de rede.
- H-09: o motivo aparece no campo **e** a barra diz "Corrija o que está marcado para salvar." com o Salvar desabilitado.
- H-08: arrastar **e** subir/descer, como `/admin/menu`.
- H-14 e H-15: as frases do atraso e "a cada 6 segundos", como no bloco Design.
- H-20: `/admin/faixa-de-avisos`, grupo Loja depois de "Menu da loja", rota de foco.
- H-23: carregando = o esqueleto do molde do painel; erro de leitura = `InfoBanner` com "Tentar de novo"; alteração não
  salva = o molde de `SettingsSaveButton`; falha de envio = a mensagem de `uploadImage` no campo.
- PR-7: nasce desligada (o padrão de `core`); nenhuma migration.
- Trocar o tipo mantém os campos do outro tipo só no rascunho; o que se grava é só o do tipo escolhido (a normalização
  da 01 descarta o resto).

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| Página com edição + prévia ao lado | `apps/backoffice/src/pages/admin/AdminMenuPage.tsx:356` (altura de tela), `:436` (abas abaixo de `lg`), `:463` (`lg:grid-cols-[560px_minmax(0,1fr)]`) |
| Palco da prévia | `apps/backoffice/src/features/store-menu/ui/MenuLivePreview.tsx` (:44-235) — `previewFrame`, `useFullscreenStage`, um `<iframe>`, "Recarregar" por `key` |
| Ponte da prévia | `apps/backoffice/src/features/store-menu/model/useMenuPreviewBridge.ts` (:46-118) |
| Gravar a chave inteira | `apps/backoffice/src/features/buy-together-lists/ui/BuyTogetherFormCard.tsx:22,31` + `pages/admin/AdminBuyTogetherForm.test.tsx` |
| Envio de arte | `apps/backoffice/src/features/store-menu/lib/uploadBannerImage.ts` (:21-53) — pasta própria, apagar o órfão |
| Miniatura na proporção da vaga | `apps/backoffice/src/features/home-composition/ui/HeroCarouselEditor.tsx:49-50, 242, 247` — as duas miniaturas com `aspectRatio` vindo da constante |
| Cards, contadores, interruptor e salvar | `shared/ui/FormCard.tsx`, `CharCounter.tsx:36`, `FieldGroup.tsx › ToggleField` (:71) + `SWITCH_TAP_44` (:52), `SettingsSaveButton.tsx` (`disabled?` :40), `InfoBanner.tsx:46`, `PageHeader.tsx` |
| Reordenar por arrasto e por botões | o editor do menu em `apps/backoffice/src/features/store-menu/` (a lista com arrastar e subir/descer) |

### Testes

- A página real grava `{ enabled, items }` em igualdade exata pelo `upsert` da chave `announcements` (componente, client
  dublado).
- Destino externo (`https://…`, `//host`) recusado com o motivo no campo antes de qualquer rede, e o Salvar desabilitado
  com a frase da barra (componente).
- Rótulo sem destino recusado; imagem sem texto alternativo recusada; contadores 40/60/20 e o teto conjunto (componente).
- "+ Adicionar aviso" some com 5; subir, descer e tirar mudam a ordem e a contagem; um aviso aberto por vez (componente).
- O interruptor mostra a ajuda do atraso; depois de salvar, a frase do atraso; a ajuda de tom está no card (componente).
- O envio de cada arte chama o motor de `uploadImage` e grava a URL no campo certo; falha de envio mostra a mensagem
  (componente).
- A ponte manda o rascunho com a origem exata da loja e "mostre o aviso N" ao tocar em anterior/próximo (componente,
  iframe dublado).
- A rota está sob o `RequireAdmin`, na ordem de `navGroups`, e é rota de foco (guardas `rotasSobGuarda`, `navItems`,
  `focusRoutes`, `NavRail`).
- `previaUnica` passa a varrer a pasta nova e aceita o terceiro palco com `<iframe>` (guarda ampliado).
- `animacaoRespeitaMovimento` com os arquivos de UI novos na lista literal e as âncoras subindo junto (guarda ampliado).
- Integração no ambiente local: probe HTTP contra o Supabase local (API 54441) — o `upsert` da chave com a sessão de
  admin grava e a leitura anônima a vê; a anônima não grava (`AD-012`). Nunca `*.supabase.co`.

### Obrigações

- Rota nova auto-fechada, dentro do bloco do `RequireAdmin` (um único `</Route>` no bloco, `rotasSobGuarda.test.ts`).
- Nada de `framer-motion` nem `matchMedia` no painel; transição com par `motion-reduce:` na mesma linha.
- O teste da página prova que grava (payload em igualdade exata), e o probe local prova o banco.
- Alvos de 44 px (o resumo, os ícones subir/descer/tirar, o interruptor com `SWITCH_TAP_44`).
- O gate inclui a suíte da loja (os guardas da loja varrem `apps/backoffice`).
- Atualize `apps/backoffice/CLAUDE.md` com a tela nova (sidebar, foco, a terceira ponte de prévia).

### Não faça

- O widget da loja e o recebedor da prévia (tarefa 03); a função `api/page` (tarefa 02); a regra em `core` (tarefa 01).
- Desenhar a faixa no painel.
- Agendamento por data, faixa por página, cor por aviso, contador de tempo (fora do PRD e D-03).
- Migration.

### Pronto quando

- [ ] A tela grava `{ enabled, items }` e a loja lê de volta pelo banco local.
- [ ] Destino externo é recusado com o motivo; aviso sem destino é aceito como texto.
- [ ] Até 5 avisos, ordenáveis, com tipo texto ou imagem e as duas artes.
- [ ] A prévia é a loja num iframe, com "Aviso N de M".
- [ ] A ajuda de tom e o aviso do atraso aparecem.
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório

---

### Confira cada citação desta tarefa quando for usá-la

Todo `caminho:linha` daqui — `Siga a forma de`, `Contrato`, `Obrigações`, `Design` — foi
escrito antes de qualquer tarefa rodar, e as tarefas anteriores mexeram na mesma árvore. Abra
cada um no momento em que ele é usado — o exemplar antes de escrever o artefato, o contrato
quando a fatia o consome —, e nenhuma linha se escreve apoiada em citação não conferida: a
linha deslocou, relocalize pelo alvo que a citação nomeia e siga, registrando no retorno; o
arquivo não está mais lá, é `citação morta` — a regra abaixo manda concluir e propagar sempre
que dê para concluir, e o histórico do Git ainda serve de exemplar.

### Se algo aqui não bater com o repositório

A rota `JÁ EXISTE` não está lá, o exemplar sumiu, a tabela tem outra forma. Dá para concluir
mesmo assim: siga, feche e propague. Não dá: pare e relate até onde chegou. Não conserte
contrato por conta, não improvise, não crie o que era de outra tarefa.

**Propagar** é corrigir, nos arquivos seguintes de `tasks/`, cada afirmação que a sua descoberta
tornou falsa — só a afirmação, e nada mais do arquivo. Feito isso, a divergência está resolvida:
ela vai no seu retorno como registro, não como pendência para alguém decidir.

**Propagar é só para frente.** Afirmação de tarefa de número MENOR, já fechada, que a sua
mudança tornou falsa **não se reescreve**: reescrever o `Pronto quando` de tarefa encerrada
apaga o registro do que de fato foi verificado quando ela fechou. Registre a caducidade na
linha `Caducou` do seu retorno — a tarefa, a afirmação e o que a tornou falsa — e siga.

### Se a verificação não fechar

Leia o erro, corrija, rode de novo. Continuando sem passar, não declare pronto: relate o que
falha, com a saída. Nunca desative teste, marque skip, afrouxe asserção, ignore lint ou
silencie erro de tipo.

### O que devolver no fim

```
Tarefa: <nn>
Caso: fechou limpo | fechou com divergência | parou
Instruções lidas: <os caminhos, raiz e módulos>
Testes escritos: <um por comportamento do bloco `Testes`, com o arquivo; o que ficou sem
  cobertura, e por quê>
Verificações: <o que rodou, e o resultado>
Árvore de trabalho: <o que você alterou; nada é commitado por você>
Citações conferidas: <quantas você abriu ao usá-las; a que deslocou, e a que estava morta>
Propagado: <a tarefa, e o que você corrigiu no arquivo dela>   (só se houve divergência)
Caducou: <tarefa já fechada · a afirmação dela que ficou falsa · o que a tornou falsa>
                                                               (só se houve; não se reescreve)
Bloqueio: <motivo · até onde você chegou>                      (só se parou)
```
