# 64 · Lista de categorias na Home — Specification

> **Prévia de UI (fonte visual desta spec):** Paper, arquivo **Uma Estrelinha**, página
> **"64 · Lista de categorias na Home"**, três pranchetas:
>
> | Prancheta | O que mostra |
> | --- | --- |
> | **64 A · Loja 1440** | a faixa logo abaixo do Banner principal: título, 7 círculos visíveis, seta à direita, seta à esquerda oculta no início |
> | **64 B · Loja 390** | a mesma faixa no celular: ~3,5 círculos visíveis, o 4º cortado na borda convidando o arrasto, sem setas |
> | **64 C · Painel 1440** | `/admin/home` com o editor do bloco aberto: título da seção, item aberto (imagem, coleção, título), itens fechados (um deles órfão), "Adicionar categoria", e a prévia da loja no iframe com o bloco marcado "editando" |
>
> As medidas que a implementação deve reproduzir estão em **Medidas fixadas pela prévia**, abaixo —
> a prancheta é a referência de composição, a tabela é a referência de número (`L-024`).
>
> **Referência de estilo do usuário:** fileira de círculos cheios com a peça dentro e o nome embaixo,
> sem caixa em volta, setas pequenas nas pontas (print de loja de informática enviado em
> 2026-10-11). O primeiro pedido descrevia cartões com foto; o usuário **trocou** para o formato de
> círculo, esclareceu que **o conteúdo é a imagem de uma joia**, não um ícone, e por fim decidiu
> que **o círculo — com a cor dele — vem dentro da imagem que a dona envia**: uma arte circular em
> PNG com cantos transparentes. **A loja não pinta fundo nenhum** no espaço da imagem; nas pranchetas,
> o círculo bege tracejado é só a simulação dessa arte.

## Problem Statement

A Home não tem um jeito de a cliente **escolher pelo material** logo na primeira dobra. Os blocos que
existem ou são campanha (Banner principal), ou são fileiras de produto de uma coleção por vez, ou
são banners largos que dependem de arte por categoria (que nenhuma das 37 tem). Uma faixa curta de
círculos — "Leite materno", "Cinzas", "Mecha de cabelo"… —, cada um com a foto de uma peça e levando
à coleção, é o atalho de navegação que falta, e é o formato que a dona apontou como referência.

O catálogo da Home **já reserva o lugar** para isso: o tipo `category_grid` ("Grade de coleções")
está no `check` do banco desde a feature `24`, no catálogo do TypeScript e na bandeja do painel —
esmaecido, como "em breve", **sem renderer e sem editor**. Esta feature dá corpo a ele.

## Goals

- [ ] A dona monta, em `/admin/home`, um bloco **Lista de categorias** com quantas categorias quiser
      (até o teto), cada uma com **imagem** (arte circular da joia), **título** e **coleção de destino**, em qualquer
      posição da Home, sem deploy.
- [ ] Na loja, o bloco aparece como **fileira rolável de círculos** no formato da prévia, em 390 e em
      1440, **sem rolagem horizontal do `body`** e com alvo de toque ≥ 44px.
- [ ] Nenhuma Home muda no deploy: o bloco **nasce inexistente** até a dona acrescentá-lo.

## Out of Scope

| Item | Por quê |
| --- | --- |
| Destino que não seja **coleção** (produto, endereço livre) | O pedido é "direcionamento da categoria". `DestinoDoItem` oferece três ramos; este bloco usa só o de coleção |
| Ícone da biblioteca (`categories.icon`) como conteúdo do círculo | O usuário recusou explicitamente: o conteúdo é a **imagem enviada**. Sem imagem o item não se grava |
| Cor de fundo, borda ou recorte circular aplicados pela loja | Decisão do usuário: o círculo e a cor vêm **na própria arte**. A loja exibe a imagem como ela é (A-06) |
| Derivação automática ("mostrar as coleções sozinho" quando não há item) | Mesmo raciocínio do Banner principal: a foto é escolha da dona, ninguém a deriva. Sem item, o bloco não desenha |
| Arte por dispositivo (uma imagem para celular, outra para computador) | É a mesma arte nos dois, só em tamanhos diferentes (80 e 104px) |
| Remover o widget antigo `apps/store/src/widgets/category-grid` | Ele não tem consumidor hoje (código morto, deriva do catálogo, desenho de cartões). Removê-lo é limpeza que merece decisão própria — ver *Assumptions* |
| Ajuste de proporção/recorte da imagem no painel (crop) | A loja **contém** a imagem inteira; não há corte a ajustar. Arte fora do quadrado gera aviso de proporção, nunca recusa |
| Reordenar itens pelo teclado no painel | O mecanismo de arrasto reaproveitado (Banner principal) não tem; criar só aqui seria um segundo jeito de ordenar a curadoria. Se vier, vem para os dois |
| Animação automática (girar sozinho) | É uma lista de navegação, não um carrossel de campanha. Rola por gesto ou seta, nunca sozinha |

---

## Assumptions & Open Questions

| # | Assunto | Decisão adotada | Motivo | Confirmado? |
| --- | --- | --- | --- | --- |
| A-01 | Tipo do bloco | Usar o tipo **`category_grid` que já existe** no `check`, no catálogo e na bandeja; **rótulo novo: "Lista de categorias"** | Zero migration de tipo. O identificador é coluna; o que a dona lê é o rótulo — precedente exato: `product_carousel` se chama "Produtos em destaque" | **s** (usuário, 2026-10-11) |
| A-02 | Título por item | **Coluna nova** `home_section_items.title text` (até **28** caracteres) | Não há coluna que caiba: `alt` é descrição da imagem e `label_snapshot` é o nome congelado da coleção, lido só no caso órfão. Reaproveitar qualquer uma dá dois significados a uma coluna (o "defeito 01" no tamanho de um campo) | **s** (usuário, 2026-10-11) |
| A-03 | Título vazio | Cai no **nome atual da coleção** de destino | É o caso comum (a dona quer "Cinzas" sob a coleção Cinzas) e evita digitar o óbvio. O campo é opcional | **s** (usuário, 2026-10-11) |
| A-04 | Imagem | **Obrigatória** para gravar o item. PNG/JPG/WebP aceitos; a orientação pede **arte circular em PNG com cantos transparentes, quadrada, 800 × 800 px** | O usuário quer a joia dentro de um círculo que ele mesmo desenha; um item sem imagem não tem leitura na loja | **s** (usuário, 2026-10-11) |
| A-05 | Como a imagem ocupa a vaga | **Contida** (`object-contain`) numa vaga **quadrada** do tamanho do círculo, ocupando-a inteira, **sem folga e sem recorte** | A arte já traz o círculo; folga encolheria o círculo e `cover`/`rounded-full` cortariam o que a dona desenhou | **s** (usuário, 2026-10-11) |
| A-06 | Fundo do círculo | **Nenhum.** A loja não aplica cor, borda nem recorte circular na vaga; a cor do círculo é a da arte | Decisão do usuário: "a cor do círculo vem junto com a imagem". Duas cores (a da arte e a da loja) brigariam na borda | **s** (usuário, 2026-10-11) |
| A-07 | Teto de itens | **24** por bloco, cobrado como **recusa** no painel (não como corte na loja) | "Quantas quiser" na prática; o teto impede uma fileira de 200 imagens pesando a Home. Molde de `FEATURED_PRODUCTS_MAX` (recusa, não `config.limit`, para "quantos aparecem" ter um dono só) | **s** (usuário, 2026-10-11) |
| A-08 | Título da seção | `config.title`, **opcional**, até **60** caracteres. Vazio ⇒ a fileira aparece sem cabeçalho | A referência não tem título; a prévia mostra com título. As duas formas são válidas | **s** (usuário, 2026-10-11) |
| A-09 | Faixa que cabe inteira (poucos itens) | **Centralizada**, sem setas | É o que a referência faz. Implementação: centralizar a trilha por margem automática, **nunca** por `justify-content: center` num contêiner rolável (que corta o começo quando estoura) | **s** (usuário, 2026-10-11) |
| A-10 | Setas (computador) | Aparecem **só do lado em que há conteúdo além da borda**, pelo `useOverflowAffordance` que a barra do menu já usa (`BL-028`); clique rola uma "página" | Dono único da afordância de rolagem; seta desenhada sempre seria afirmação falsa no começo e no fim | **s** (usuário, 2026-10-11) |
| A-11 | Celular | Arrasto com o dedo, `scroll-snap` por item, **sem setas**; o último item visível fica cortado na borda como convite | ~90% dos acessos; seta pequena no celular é alvo de toque ruim e redundante com o gesto | **s** (usuário, 2026-10-11) |
| A-12 | Item cuja coleção foi apagada ou desativada | A loja **pula** o item; o painel o **nomeia** ("A coleção Penas foi apagada — não aparece na loja") | É o comportamento de toda curadoria da Home (`HOME-24`), com `label_snapshot` e `on delete set null` já existentes | **s** (usuário, 2026-10-11) |
| A-13 | Bloco único ou repetível | **Repetível** (já está fora de `UNIQUE_SECTION_TYPES`) | A dona pode querer uma fileira de materiais no topo e outra de "para quem" mais abaixo | **s** (usuário, 2026-10-11) |
| A-14 | Transparência da foto | O caminho de upload atual (canvas → WebP sem preencher fundo) **preserva o canal alfa**, e a rendição do Storage também — **a confirmar em navegador** | Lido no código (`shared/lib/uploadImage.ts`); não medido. **Com a A-06, isso deixou de ser detalhe**: se o alfa cair em algum passo, os cantos da arte viram um quadrado branco ou preto em volta do círculo, e só se vê renderizado | **s** (usuário, 2026-10-11) |
| A-15 | Widget antigo `widgets/category-grid` | **Não tocado** | Sem consumidor; o nome parecido com o tipo confunde, mas apagá-lo é outra decisão. O widget novo nasce com outro nome | **s** (usuário, 2026-10-11) |

**Open questions:** nenhuma — as 15 decisões foram confirmadas pelo usuário em 2026-10-11.

---

## Medidas fixadas pela prévia

| Medida | Celular (390) | Computador (1440) |
| --- | --- | --- |
| Vaga da imagem (quadrada, sem fundo) | **80 × 80px** | **104 × 104px** |
| Largura do item (círculo + rótulo) | **96px** | **148px** |
| Espaço entre itens | **8px** | **8px** |
| Folga lateral da faixa | 16px (gutter da loja) | container de 1200px |
| Rótulo | Outfit 500, **14/18px**, `ink`, centralizado, até **2 linhas** | Outfit 500, **16/21px**, `ink`, centralizado, até **2 linhas** |
| Espaço círculo → rótulo | 10px | 14px |
| Título da seção | Libre Baskerville **22/28px**, `ink`, tracking −0,02em | Libre Baskerville **28/34px**, `ink`, tracking −0,02em |
| Itens visíveis sem rolar | ~3,5 (o 4º cortado na borda) | 7 com 8 itens; todos quando cabem |
| Seta | — | disco de **36px** (`surface`, borda `line`), área de toque **44px** |
| Fundo da seção | `ground` | `ground` |

---

## User Stories

### P1: A cliente navega pela fileira de categorias ⭐ MVP

**User Story**: Como cliente no celular, quero ver as categorias em círculos com a foto de uma peça e
tocar numa delas para ir direto à coleção.

**Why P1**: É o que a cliente vê; sem isto a feature não existe.

**Acceptance Criteria**:

1. **LCT-01** WHEN a Home contém uma seção `category_grid` ativa com ≥ 1 item resolvido THEN a loja
   SHALL renderizar, na posição da seção, uma lista de itens na ordem de `position`, cada um com um
   círculo contendo a foto e o rótulo abaixo dele.
2. **LCT-02** WHEN um item tem `title` não vazio (após aparar espaços) THEN o rótulo SHALL ser esse
   título; WHEN `title` é vazio ou ausente THEN o rótulo SHALL ser o **nome atual** da coleção de
   destino.
   > **SPEC_DEVIATION declarado (verificação independente, 2026-10-11):** entre o título e o nome
   > da coleção a implementação consulta o `alt` do item — título > `alt` > nome —, decisão do
   > `design.md` (R1) para que loja e painel leiam o rótulo de um só dono, `categoryListLabel`. O
   > editor nunca grava `alt` neste bloco, então pela tela o comportamento é exatamente o desta AC;
   > o degrau só age numa linha de escrita direta. Testado nos dois lados.
3. **LCT-03** WHEN a cliente toca ou clica em qualquer ponto do item (círculo ou rótulo) THEN a loja
   SHALL navegar para o caminho canônico da coleção (`categoryHref` de `@estrelinha/core/menu`).
4. **LCT-04** Cada item SHALL ser **um único link** cujo nome acessível é o rótulo; a imagem SHALL
   ter `alt=""` (o rótulo já nomeia o link, e repetir o nome no `alt` faria o leitor de tela ler duas
   vezes).
5. **LCT-05** A imagem SHALL ser exibida numa vaga **quadrada** de 80px no celular e 104px a partir
   de `md`, com `object-contain`, ocupando a vaga inteira. A vaga SHALL NOT ter cor de fundo, borda,
   sombra nem recorte (`rounded-full`, `overflow-hidden` com raio, `clip-path`) — o círculo e a cor
   são os da arte enviada (A-05, A-06). A régua é de **token exato** sobre as classes da vaga
   (`L-034`), com asserção positiva no celular **e** no `md` (`L-029`).
6. **LCT-06** A foto SHALL ser pedida no tamanho do círculo pelo dono da rendição
   (`renditionUrl`/`renditionSrcSet` de `core/media`), e a prioridade de carregamento SHALL sair de
   `imagePriority` — nunca de um `index < N` escrito no widget (`renditionSingleOwner`).
7. **LCT-07** WHEN `config.title` é não vazio THEN a seção SHALL mostrar esse título acima da fileira
   (Libre Baskerville, tabela de medidas); WHEN é vazio ou ausente THEN nenhum cabeçalho SHALL ser
   renderizado (nem um vazio que ocupe altura).
8. **LCT-08** No celular (< `md`) a fileira SHALL rolar **dentro do próprio contêiner** na horizontal,
   com `scroll-snap` por item, e SHALL NOT existir rolagem horizontal do `body` em 390×844.
9. **LCT-09** Cada item SHALL ter área de toque ≥ 44×44px (o item inteiro é o link, e já mede ≥ 96×
   108).
10. **LCT-10** O rótulo SHALL quebrar em no máximo **2 linhas**, centralizado; texto além disso SHALL
    ser cortado com reticências, sem empurrar a altura dos vizinhos de forma desigual (todos os itens
    da fileira alinham pelo topo do círculo).
11. **LCT-11** WHEN a seção não tem nenhum item resolvido (zero itens, ou todos com coleção apagada
    ou inativa) THEN a loja SHALL NOT renderizar nada para ela — nem título, nem faixa vazia.
12. **LCT-12** WHEN um item aponta para coleção apagada (`category_id` nulo) ou inativa THEN a loja
    SHALL pular **só aquele item** e renderizar os demais.
13. **LCT-13** O bloco SHALL NOT nascer invisível: nenhuma opacidade zero, `invisible` ou animação de
    entrada que comece transparente (mesma régua de `heroSemOpacidadeZero`).

**Independent Test**: com uma seção semeada no banco local (3 itens, um deles órfão), abrir `/` em
390×844 e ver 2 círculos com foto e nome, tocar no primeiro e cair em `/colecao/...`; medir
`document.body.scrollWidth === 390`.

---

### P1: A dona monta o bloco no painel ⭐ MVP

**User Story**: Como dona da loja, quero acrescentar o bloco "Lista de categorias" na Home, subir a
foto de uma joia para cada categoria, escrever o título e escolher a coleção, para criar o atalho de
navegação sem depender de ninguém.

**Why P1**: Sem editor o bloco não pode existir em produção.

**Acceptance Criteria**:

1. **LCT-14** A bandeja de blocos de `/admin/home` SHALL oferecer **"Lista de categorias"** como bloco
   disponível — **não** esmaecido, **não** marcado "em breve". `sectionMeta('category_grid')` SHALL
   devolver `comingSoon: false` e `label: 'Lista de categorias'`.
2. **LCT-15** WHEN a dona acrescenta o bloco THEN ele SHALL nascer **desligado** (`HOME-10`) e sem
   itens, e o editor SHALL abrir com o campo "Título da seção" e a lista vazia com o botão
   "Adicionar categoria".
3. **LCT-16** O editor SHALL ter o campo **"Título da seção"**, opcional, com contador `n / 60`
   (`CharCounter`) e o apoio "Vazio, a fileira aparece sem título."; o `maxLength` e o número do
   contador SHALL vir da **mesma constante** em `@estrelinha/core/home`.
4. **LCT-17** Cada item SHALL ter, nesta ordem: **Imagem** (obrigatória, com a orientação, literal:
   "Arte circular em PNG com cantos transparentes, quadrada (800 × 800 px). A loja mostra a imagem
   como ela é — sem fundo e sem recorte."; arte que não seja quadrada gera o aviso de proporção que
   `uploadHomeImage` já devolve, sem recusar), **Leva para a coleção** (seleção entre as coleções ativas, por `sort_order`) e
   **Título embaixo do círculo** (opcional, contador `n / 28`, apoio "Vazio, usa o nome da
   coleção.").
5. **LCT-18** WHEN a dona escolhe uma coleção THEN o `label_snapshot` do item SHALL ser congelado
   com o nome dela no mesmo gesto (o comportamento que `DestinoDoItem` já tem para coleção).
6. **LCT-19** WHEN a dona tenta salvar com um item **sem imagem** ou **sem coleção** THEN o painel SHALL
   recusar antes de qualquer gravação, nomeando o item pela posição ("A 3ª categoria está sem imagem.",
   "A 3ª categoria está sem coleção."), e SHALL preservar o rascunho.
7. **LCT-20** WHEN a lista já tem **24** itens THEN "Adicionar categoria" SHALL ficar indisponível com
   o motivo em texto ("Até 24 categorias por bloco."), e a recusa SHALL valer também na gravação
   (regra pura em `core/home`, chamada pela tela e pela validação de salvar).
8. **LCT-21** Os itens SHALL ser reordenáveis por arrasto, pelo mesmo mecanismo da lista de banners
   do Banner principal (`HeroCarouselEditor`), e a ordem salva SHALL ser a `position` gravada.
   *Reordenar por teclado não existe no mecanismo de hoje (conferido no código) e fica fora de
   escopo — ver Out of Scope.*
9. **LCT-22** Os itens SHALL ser **recolhíveis**: um aberto por vez; o fechado mostra miniatura da
   imagem, o título efetivo (LCT-02) e "Coleção · <nome>". Item órfão SHALL mostrar
   "A coleção <label_snapshot> foi apagada — não aparece na loja" no tom de aviso.
10. **LCT-23** A miniatura no painel SHALL mostrar a imagem enviada sobre o fundo **neutro do
    painel**, com `object-contain` — é conferência de upload, não desenho da loja: quem mostra o
    bloco de verdade é a **prévia da loja no iframe** (`AD-019`), e `previaUnica.test.ts` SHALL
    continuar verde sem edição de régua.
11. **LCT-24** WHEN a dona salva THEN a prévia ao lado SHALL refletir o bloco **sem recarregar o
    iframe** (comportamento da feature `50`), e a linha da seção na lista SHALL dizer por que ela não
    aparece quando for o caso: "Não vai aparecer: nenhuma categoria escolhida." (zero itens) ou a
    frase de "itens que saíram do ar" já existente (todos órfãos).
12. **LCT-25** O upload SHALL usar o caminho de imagem da Home que já existe (`uploadHomeImage`,
    bucket `home-images`), e falha de envio SHALL aparecer como texto no item, sem gravar meia
    curadoria.

**Independent Test**: no painel local, acrescentar o bloco, subir 3 PNGs, escolher 3 coleções,
deixar um título vazio, ligar a seção e salvar; a prévia mostra os 3 círculos, o do título vazio
com o nome da coleção.

---

### P1: O dado tem uma casa só ⭐ MVP

**User Story**: Como quem mantém a loja, quero que o título por item seja uma coluna de verdade, com
limite no banco e no TypeScript iguais, para que a tela e o banco não divirjam.

**Why P1**: É o pré-requisito de gravação do editor; sem a coluna o `insert` falha com `PGRST204`.

**Acceptance Criteria**:

1. **LCT-26** Uma migration nova (prefixo de timestamp **único**, posterior a `20261011120000`) SHALL
   acrescentar `home_section_items.title text` **nullable**, com `check (title is null or
   char_length(title) <= 28)`, por `add column if not exists`, **sem** escrever dado e **sem**
   `grant` a `anon`.
2. **LCT-27** O limite 28 SHALL existir em **uma** constante de `@estrelinha/core/home`, e um guarda
   SHALL ler a migration do disco e comparar o número (molde de `googleShoppingSchema`).
3. **LCT-28** `HomeSectionItem`, `DraftItem`, `toDraftItems`, `emptyDraftItem` e `toNewItems` SHALL
   carregar `title`; `toNewItems.test.ts` SHALL passar a asserir as **oito** colunas por igualdade
   de chaves (a régua continua sendo igualdade — só o conjunto ganha `title`).
4. **LCT-29** `homeSections.test.ts` SHALL continuar verde **sem nenhuma asserção afrouxada**: o
   catálogo de tipos não muda (o tipo já existia), e o guarda que listava `category_grid` como
   "em breve" SHALL ser **invertido** — `COMING_SOON` passa a ser vazio, e o teste assere isso, em
   vez de ser apagado (precedente da feature `50` com `product_carousel`).
5. **LCT-30** O teto de 24 itens SHALL existir como constante em `core/home` e ser lido pela recusa
   (LCT-20) — `config.limit` SHALL NOT ser usado por este tipo (seria o segundo dono de "quantos
   aparecem", o mesmo motivo que tirou `product_carousel` de `LIMITS`).

**Independent Test**: `supabase db reset` local, probe HTTP de `insert` em `home_section_items` com
`title` de 28 caracteres (201) e de 29 (400 com violação de `check`).

---

### P2: Setas no computador

**User Story**: Como cliente no computador, quero setas para passar pelas categorias sem precisar de
rolagem horizontal do mouse.

**Why P2**: Em 1440 a fileira cabe 7 itens; com mais que isso, sem seta, o resto fica escondido para
quem não tem trackpad.

**Acceptance Criteria**:

1. **LCT-31** A partir de `md`, WHEN há conteúdo além da borda direita THEN uma seta "Próximas
   categorias" SHALL aparecer à direita; WHEN há conteúdo além da borda esquerda THEN uma seta
   "Categorias anteriores" SHALL aparecer à esquerda; WHEN a fileira cabe inteira THEN nenhuma seta
   SHALL existir. O estado SHALL vir de `useOverflowAffordance` (posição real de rolagem, não
   contagem de itens).
2. **LCT-32** Clicar numa seta SHALL rolar a fileira em ~uma largura visível, com `behavior: 'smooth'`
   — e `'auto'` WHEN `prefers-reduced-motion: reduce`.
3. **LCT-33** As setas SHALL ter área de toque de 44px com disco visível de 36px (`TAP_44`, sem
   roubar a posição — `alvoDeToqueNaoRoubaPosicao`), rótulo acessível em texto, e SHALL NOT existir
   abaixo de `md`.
4. **LCT-34** WHEN a fileira cabe inteira THEN ela SHALL aparecer **centralizada** no container
   (A-09), sem cortar o primeiro item.

**Independent Test**: em 1440 com 12 itens, clicar na seta direita até o fim: a esquerda aparece
depois do primeiro clique, a direita some no fim; com 4 itens, nenhuma seta e a fileira centrada.

---

## Edge Cases

- **LCT-35** WHEN a imagem enviada tem fundo opaco (JPG, ou PNG sem alfa) THEN a loja SHALL exibi-la
  do mesmo jeito, como um quadrado — o painel **orienta** a arte circular transparente, não a exige,
  e a loja não "conserta" recortando.
- **LCT-36** WHEN a imagem não carrega na loja (404 do Storage) THEN a vaga SHALL manter o tamanho
  (vazia, sem fundo) e o rótulo SHALL continuar visível — o item não some, não desloca vizinhos e não mostra ícone de
  imagem quebrada com texto alternativo (o `alt` é vazio).
- **LCT-37** WHEN o título tem 28 caracteres sem espaço ("Pelodoseucompanheiroquerido") THEN o rótulo
  SHALL quebrar dentro da largura do item (`overflow-wrap: anywhere`) e respeitar as 2 linhas.
- **LCT-38** WHEN duas seções `category_grid` existem na Home THEN cada uma SHALL renderizar os
  próprios itens e o próprio estado de setas, sem compartilhar estado de rolagem.
- **LCT-39** WHEN a coleção de destino é renomeada THEN o rótulo de item **sem** título SHALL mostrar
  o nome novo (é lido ao vivo), e o de item **com** título SHALL manter o título.
- **LCT-40** WHEN a prévia do painel mostra um item **ainda não salvo** THEN o círculo SHALL usar a
  foto do rascunho (mesmo caminho dos outros blocos curados pela ponte da prévia).

## Implicit-requirement dimensions

| Dimensão | Requisito |
| --- | --- |
| Validação e limites | LCT-16, LCT-19, LCT-20, LCT-26, LCT-27, LCT-30, LCT-37 |
| Falha / falha parcial | LCT-19 (rascunho preservado), LCT-25 (upload), LCT-36 (foto que não carrega) |
| Idempotência / repetição | N/A — a gravação é `curateSection` (apaga e reescreve a lista), já idempotente; a migration é `if not exists` (LCT-26) |
| Autorização | LCT-26 (sem `grant` a `anon`); escrita segue as policies `has_role` de `home_section_items`, sem policy nova |
| Concorrência / ordem | N/A — mesma última-escrita-vence do resto da curadoria da Home; a ordem é `position` (LCT-21) |
| Ciclo de vida do dado | LCT-12, LCT-22, A-12: coleção apagada ⇒ `set null`, a foto fica no bucket, a loja pula, o painel nomeia |
| Observabilidade | N/A — bloco de leitura pública sem efeito colateral; o painel já explica por que uma seção não aparece (LCT-24) |
| Dependência externa | Rendição de imagem do Storage (LCT-06, A-14); falha de imagem tratada por LCT-36 |
| Integridade de transição | LCT-15 (nasce desligada), e o guarda da última seção ativa (`AD-029`) vale sem mudança |

---

## Requirement Traceability

| ID | Tasks | Status |
| --- | --- | --- |
| LCT-01 | T06, T07, T09 | Implementada — teste |
| LCT-02 | T05, T06, T07 | Implementada — teste |
| LCT-03 | T07 | Implementada — teste |
| LCT-04 | T07 | Implementada — teste |
| LCT-05 | T07, T16 | Implementada — teste + prova em navegador (T16) |
| LCT-06 | T07, T16 | Implementada — teste + prova em navegador (T16) |
| LCT-07 | T07 | Implementada — teste |
| LCT-08 | T07, T16 | Implementada — teste + prova em navegador (T16) |
| LCT-09 | T07, T16 | Implementada — teste + prova em navegador (T16) |
| LCT-10 | T07, T16 | Implementada — teste + prova em navegador (T16) |
| LCT-11 | T06, T09 | Implementada — teste |
| LCT-12 | T05, T06 | Implementada — teste |
| LCT-13 | T07, T09 | Implementada — teste |
| LCT-14 | T13 | Implementada — teste |
| LCT-15 | T12, T14 | Implementada — teste + prova em navegador (T16) |
| LCT-16 | T05, T12 | Implementada — teste |
| LCT-17 | T05, T12 | Implementada — teste |
| LCT-18 | T12 | Implementada — teste |
| LCT-19 | T04, T05, T11, T14 | Implementada — teste |
| LCT-20 | T05, T11, T12, T14 | Implementada — teste |
| LCT-21 | T12 | Implementada — teste |
| LCT-22 | T12 | Implementada — teste |
| LCT-23 | T12, T16 | Implementada — teste + prova em navegador (T16) |
| LCT-24 | T06, T14, T16 | Implementada — teste + prova em navegador (T16) |
| LCT-25 | T12 | Implementada — teste |
| LCT-26 | T01, T15 | Implementada — teste + probe no banco local (T15) + gravação pelo painel (T16) |
| LCT-27 | T01, T05 | Implementada — teste |
| LCT-28 | T02, T03, T10, T15 | Implementada — teste + probe no banco local (T15) + gravação pelo painel (T16) |
| LCT-29 | T13 | Implementada — teste |
| LCT-30 | T05, T13 | Implementada — teste |
| LCT-31 | T08, T16 | Implementada — teste + prova em navegador (T16) |
| LCT-32 | T08 | Implementada — teste + prova em navegador (T16) |
| LCT-33 | T08, T16 | Implementada — teste + prova em navegador (T16) |
| LCT-34 | T08, T16 | Implementada — teste + prova em navegador (T16) |
| LCT-35 | T07 | Implementada — teste |
| LCT-36 | T07 | Implementada — teste |
| LCT-37 | T07, T16 | Implementada — teste + prova em navegador (T16) |
| LCT-38 | T08 | Implementada — teste |
| LCT-39 | T05, T06 | Implementada — teste |
| LCT-40 | T07, T10 | Implementada — teste |

**Coverage:** 40 total, 40 mapeados para tasks (`tasks.md`), 40 implementados. Verifier independente ainda não rodou — o status acima é do autor (2026-10-12).

---

## Success Criteria

- [ ] A dona cria o bloco com 8 categorias em menos de 5 minutos, sem ajuda, e a prévia mostra o
      resultado sem recarregar.
- [ ] Em 390×844: zero rolagem horizontal do `body`, 3–4 círculos visíveis, toque em qualquer item
      leva à coleção certa.
- [ ] Em 1440: 7 círculos visíveis com 8 itens, setas só onde há conteúdo, fileira centrada quando
      cabe.
- [ ] Uma arte circular em PNG transparente aparece na loja **só como o círculo dela** — sem quadrado
      nos cantos e sem fundo da loja atrás (A-14 confirmada em navegador, em 390 e 1440).
- [ ] Nenhuma Home muda no deploy; nenhum guarda existente afrouxado; `packages/core/src/payment/**`
      com zero arquivos alterados.
