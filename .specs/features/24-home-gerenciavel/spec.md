# 24 · Home gerenciável — Especificação

> **A Home já é dinâmica; o que falta é ser editável.** A pergunta que abriu esta feature supunha uma
> Home cravada em código. A medição mostrou o contrário: `pickHomeCollections` tira as fileiras de
> `categories` por `sort_order`, `pickHomeBanners` tira a grade de quem tem `banner_url`, `TrustBar`
> tira os números de `store_settings`. **Nenhuma coleção, banner ou número está escrito no `.tsx`.**
> O que está escrito no `.tsx` é a *composição* — quais seções existem, em que ordem, com que texto e
> com que limite. É isso que esta feature move para o banco. Contexto da conversa e as decisões
> tomadas: [`context.md`](./context.md).

## Problem Statement

A Adri não consegue mexer na Home. Trocar a chamada do hero, subir um banner de Dia das Mães,
reordenar as fileiras de coleção sem mexer no menu, desligar a newsletter por uma semana — tudo isso
hoje é **deploy**, porque a composição da página é a ordem do JSX em
[`HomePage.tsx`](../../../apps/store/src/pages/HomePage.tsx) e os textos são literais dentro de cada
widget. Ela vem de um painel (Nuvemshop) onde isso era autoatendimento, e vai perder a capacidade na
migração.

Há dois efeitos colaterais concretos disso, e não são hipotéticos:

- **Banner só existe se for uma coleção.** `pickHomeBanners` deriva a grade de `categories.banner_url`.
  Campanha de data — "Dia das Mães", "Frete grátis esta semana" — não é categoria nenhuma, então não
  tem como existir.
- **`sort_order` é dono de duas coisas.** A mesma coluna ordena o menu do topo e as fileiras da Home.
  Reordenar a vitrine mexe no menu como efeito colateral, e vice-versa.

## Goals

- [ ] A composição da Home — quais seções, em que ordem, ligadas ou não — é dado editável em
      `/admin/home`, sem deploy.
- [ ] Os textos e as imagens de cada seção são editáveis pela dona.
- [ ] Existe banner de campanha que **não** é uma coleção.
- [ ] Reordenar a Home **não** reordena o menu do topo.
- [ ] **A Home não muda de aparência no dia em que a feature entra.** O estado inicial reproduz a
      página de hoje, seção por seção, na mesma ordem.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Cor, tipografia e tema editáveis pela dona | A paleta é declarada em dois arquivos com `palette.test.ts`, `contrast.test.ts` e `accentText.test.ts` guardando contraste. Um seletor de cor no painel desmonta os três **sem quebrar build nem teste** — e quem descobre é a cliente. É a diferença deliberada frente ao painel da Nuvemshop. |
| Contagem regressiva e prova social como blocos | Removidas de propósito na feature 20 (`DropCountdown`, `SocialProof`). Um catálogo genérico de seções as traz de volta pela porta do painel; `HOME-06` proíbe explicitamente. |
| Rascunho e Publicar, com prévia em iframe | Custo alto (toda leitura escolhendo entre duas versões + modo prévia na loja) para uma dona só editando. O `active` por seção já dá o "não publicar pela metade". Deferido em `context.md`. |
| Header, rodapé e outras páginas | Esta feature é a Home. Ampliar o alvo dobra a superfície sem fechar o problema. |
| Faixa rolante (`MarqueeBar`) como bloco | Existe no código, sem uso, mas trazia quatro números cravados no JSX e três já não batiam com as settings. Só voltaria com tokens resolvidos na leitura. |
| Agendar seção por data | Máquina de estado nova. Deferido. |
| Limpeza de imagem órfã no Storage | Dívida declarada: apagar seção apaga as linhas, não os arquivos. |
| Sitemap e dados estruturados | `BL-007`, e já era o passo seguinte da `23`. |

---

## Assumptions & Open Questions

| Assumption / decisão | Padrão escolhido | Racional | Confirmado? |
| --- | --- | --- | --- |
| Abrangência do painel | A Home inteira — as 7 seções de hoje mais as novas | Lista que mostra 3 de 7 mente: a dona reordena e a página não obedece. Mesmo argumento do `menuEntries` que não trunca | **y** |
| Como a alteração chega na loja | Um estado só; seção nova nasce `active = false`; prévia no painel | Dá o "não publicar pela metade" sem segunda cópia do documento | **y** |
| Curadoria | Override **por cima** da derivação, com volta ao automático | Preserva a derivação já escrita no disco e faz categoria nova aparecer sozinha | **y** |
| Banner de campanha | Aceita arte própria e destino livre; coleção é atalho | Campanha de data não é categoria. Precedência: banner da seção vence, senão deriva de `banner_url` | **y** |
| Hero | Aceita foto da dona; sem foto, a arte da marca | Foto de peça **real** não tem o defeito que a 20 recusou (ilustração genérica prometendo modelo inexistente) | **y** |
| Célula do mosaico | Só imagem + destino; o texto está dentro da arte | É como a loja já funciona — confirmado no print de 2026-08-12 | **y** |
| Mosaico no celular | Empilha em coluna, largura cheia; mosaico só no desktop | Mosaico proporcional de 4 daria **82px** por célula em 390px, e a arte tem texto embutido | **y** — medido |
| Prévia | Esquemática, no painel, com textos e imagens reais | Render real dos widgets traria os tokens da loja para dentro do backoffice, que tem paleta própria e teste guardando a separação | **y** |
| Item curado que saiu do ar | A loja pula o item; o painel avisa na linha | Nunca vazio na vitrine, nunca link quebrado; e não entra na Home item que a dona não escolheu | **y** |
| O que é "Destaque em coleções" | Faixa larga com **uma** coleção: imagem, título, texto curto e CTA — distinta da grade de fileiras | Interpretação do agente, apresentada na discussão e não contestada | **y** — fechado na Design (2026-08-15): nenhum dos 5 boards o desenha, então vale a forma da spec; é `collection_feature`, um item com FK, título/texto vazios caindo no nome e na descrição da coleção |
| Onde entra na sidebar | Grupo `Loja`, ao lado de "Menu da loja" | O CLAUDE.md já reservou o lugar: *"é o grupo onde entram banners da home, destaques e faixa de avisos"* | n — decisão do agente |
| Teto de seções na Home | 30 | Impede a Home de virar página infinita por acidente; folgado o bastante para nunca ser sentido | n — decisão do agente |
| Proporção da imagem | Declarada pela fileira; painel avisa quando o arquivo divergir, nunca recorta em silêncio | `object-cover` numa proporção diferente **corta o texto que está dentro da arte** | **y** |
| Trabalho não commitado no disco | `HomePage.tsx` modificado + `widgets/home-banners` e `widgets/home-collections` **untracked** entram em commit **antes** da primeira task | Senão o diff da 24 mistura com o passe visual, e a faixa de diff do Verifier não mede nada | **y** — feito em 2026-08-15: os 103 arquivos pendentes (features 22 e 23 + o passe visual) foram em **5 commits** (`226ddb1` ícones · `4152b18` material · `1770560` home · `8754d05` specs · `e22f368` chore), com o gate medido antes: 4019 testes / 225 arquivos, exit 0 |

**Open questions: nenhuma.** As duas que existiam foram fechadas na Design — a forma do "Destaque em
coleções" e o commit do trabalho em curso, ambas marcadas acima.

---

## Dimensions Sweep

Feature Large → todas as dimensões resolvem em requisito ou `N/A` justificado.

| Dimensão | Resolução |
| --- | --- |
| Input validation & bounds | `HOME-06` (tipo em enum), `HOME-21` (1–4 banners), `HOME-16`/`HOME-22` (`alt` obrigatório), teto de 30 seções |
| Failure / partial-failure | `HOME-24` — upload falho não grava seção pela metade; falha de gravação preserva o formulário |
| Idempotency / retry / dedup | `HOME-11` — reordenar manda posições absolutas das linhas alteradas, então repetir a chamada dá o mesmo resultado |
| Auth boundaries & rate limits | `HOME-05` — leitura pública só de seção ativa, escrita só `has_role(admin)`. Rate limit **N/A**: painel interno, sem superfície anônima de escrita |
| Concurrency / ordering | `HOME-12` — desempate determinístico (`position`, depois `id`); duas admins convergem por linha |
| Data lifecycle / expiry | `HOME-23` — apagar seção apaga em cascade o que pende dela. Arquivo no Storage fica órfão: **dívida declarada**, não requisito |
| Observability | **N/A** — o backoffice não tem telemetria hoje e esta feature não toca caminho de dinheiro nem de e-mail |
| External-dependency failure | `HOME-25` — imagem que não carrega não colapsa o layout: o contêiner mantém a proporção reservada |
| State-transition integrity | `HOME-08` (o hero não pode ser desligado nem removido, o que torna "Home com zero seções" impossível) e `HOME-09` (ativar seção que hoje não renderiza é **permitido**, com aviso — a fonte pode encher depois) |

---

## User Stories

### P1: A Home passa a ser dado, sem mudar de aparência ⭐ MVP

**User Story**: Como desenvolvedor, quero que a loja monte a Home a partir do banco em vez da ordem do
JSX, para que o painel tenha o que editar — **sem que a cliente perceba diferença alguma no dia da
virada**.

**Why P1**: É a fundação. E o risco maior da feature inteira é a Home mudar de cara por acidente
numa refatoração de composição, o que `HOME-04` existe para impedir.

**Acceptance Criteria**:

1. **HOME-01** — WHEN a migration roda THEN o banco SHALL conter a lista de seções da Home com tipo,
   posição, estado ativo e configuração por seção.
2. **HOME-02** — WHEN a loja renderiza a Home THEN ela SHALL desenhar **somente** seções ativas, na
   ordem gravada.
3. **HOME-03** — WHEN uma seção está inativa THEN a loja SHALL não renderizar nada por ela — nem
   moldura, nem espaçamento, nem título.
4. **HOME-04** — WHEN a Home é renderizada com o estado semeado pela migration THEN a sequência de
   seções SHALL ser exatamente a de hoje (hero → vantagens → grade de banners → fileiras de coleção
   com a faixa institucional no meio → chips de tema → newsletter), e cada seção SHALL receber os
   mesmos textos e limites que hoje estão no `.tsx`.
5. **HOME-05** — WHEN uma requisição anônima lê as seções THEN o banco SHALL devolver apenas as
   ativas; WHEN uma requisição sem papel `admin` tenta escrever THEN o banco SHALL recusar.
6. **HOME-06** — WHEN o catálogo de tipos de seção do TypeScript divergir do que a migration aceita
   THEN a suíte SHALL falhar, com âncora de contagem — e o catálogo SHALL não conter tipo de contagem
   regressiva nem de prova social.
7. **HOME-07** — WHEN a leitura das seções falha THEN a loja SHALL renderizar a composição semeada
   como piso, nunca uma página em branco.

**Independent Test**: rodar `db reset`, abrir `/` e comparar com a Home de hoje — mesma sequência,
mesmos textos. Desativar uma seção direto no banco e recarregar: ela desaparece inteira.

---

### P1: `/admin/home` — ordem, liga/desliga e prévia ⭐ MVP

**User Story**: Como dona da loja, quero ver a lista das seções da minha Home, arrastar para
reordenar, ligar e desligar cada uma, e conferir o resultado antes de a cliente ver.

**Why P1**: É a feature, do ponto de vista de quem pediu. Sem esta tela, o P1 anterior é refatoração
invisível.

**Acceptance Criteria**:

1. **HOME-08** — WHEN a tela abre THEN ela SHALL listar todas as seções na ordem da Home, cada uma com
   tipo, um resumo do conteúdo e o estado ativo; AND o hero SHALL aparecer sem controle de desligar
   nem de remover.
2. **HOME-09** — WHEN uma seção ativa não tem o que renderizar (fonte vazia) THEN a linha SHALL dizer
   que ela não vai aparecer **e por quê**; AND ativar uma seção nessa condição SHALL ser permitido.
3. **HOME-10** — WHEN a dona cria uma seção THEN ela SHALL nascer inativa.
4. **HOME-11** — WHEN a dona reordena THEN a gravação SHALL enviar as posições absolutas **somente**
   das seções que mudaram de lugar, e repetir a mesma chamada SHALL produzir o mesmo resultado.
5. **HOME-12** — WHEN duas seções têm a mesma posição THEN a ordem exibida SHALL ser desempatada por
   um critério estável, e SHALL ser a mesma em dois carregamentos consecutivos.
6. **HOME-13** — WHEN a dona olha a prévia THEN ela SHALL ver os blocos empilhados na ordem real, com
   os textos e as imagens reais de cada seção, e um selo nas que não vão aparecer.
7. **HOME-14** — WHEN a gravação falha THEN a tela SHALL dizer o que não foi salvo e SHALL preservar o
   que a dona havia preenchido.
8. **HOME-15** — WHEN a tela é aberta em 390px THEN a lista, os controles de reordenar e a prévia
   SHALL ser operáveis, com alvo de toque de 44px.

**Independent Test**: desligar a newsletter no painel, abrir a loja: ela sumiu. Arrastar a faixa
institucional para o fim, recarregar a loja: ela está no fim. Recarregar o painel: a ordem persistiu.

---

### P1: Hero editável, com foto opcional ⭐ MVP

**User Story**: Como dona da loja, quero escrever a chamada da minha Home e, quando eu tiver uma foto
boa de uma peça real, usá-la em vez do desenho da marca.

**Why P1**: É a primeira dobra, e é o texto que a dona mais quer mudar. Um painel de Home que não
edita o hero não resolve o pedido.

**Acceptance Criteria**:

1. **HOME-16** — WHEN a dona edita o hero THEN ela SHALL poder alterar sobretítulo, as duas linhas do
   título, o parágrafo, o rótulo do CTA e o destino do CTA; AND as duas linhas do título SHALL
   continuar saindo em cores diferentes (`ink` e `primary`).
2. **HOME-17** — WHEN o hero não tem foto THEN a loja SHALL renderizar a arte da marca
   (`EstrelinhaSymbol` sobre o palco `serenity`), como hoje.
3. **HOME-18** — WHEN a dona envia uma foto para o hero THEN a loja SHALL renderizar a foto no lugar
   da arte; AND o `alt` SHALL ser obrigatório para salvar.
4. **HOME-19** — WHEN a dona remove a foto THEN a loja SHALL voltar à arte da marca, sem deixar buraco.
5. **HOME-20** — WHEN o destino do CTA é um caminho que a loja não serve THEN a tela SHALL recusar,
   dizendo qual é o problema — nunca gravar um CTA que leva a 404.
6. **HOME-21** — WHEN a foto do hero é renderizada em 390px THEN ela SHALL respeitar a proporção
   reservada e SHALL não empurrar o CTA abaixo da dobra.

**Independent Test**: trocar o título no painel, recarregar a loja, ler o título novo. Subir foto, ver
a foto; remover, ver a arte da marca de volta.

---

### P1: Grade de banners com banner livre ⭐ MVP

**User Story**: Como dona da loja, quero montar a grade de banners com a arte que eu subir e mandar
cada uma para onde eu quiser — uma coleção, um produto ou uma página da loja — para poder fazer
campanha de data, que não é coleção nenhuma.

**Why P1**: É a lacuna que a medição encontrou: hoje banner **só** existe se for uma categoria com
`banner_url`.

**Acceptance Criteria**:

1. **HOME-22** — WHEN a dona monta uma grade THEN ela SHALL poder incluir de 1 a 4 banners; AND cada
   banner SHALL exigir imagem, `alt` e destino para ser salvo.
2. **HOME-23** — WHEN a dona escolhe o destino de um banner THEN ela SHALL poder apontar para uma
   coleção, um produto ou um caminho da própria loja, e exatamente um deles SHALL ficar gravado.
3. **HOME-24** — WHEN a coleção ou o produto de destino é apagado THEN o banner SHALL parar de
   aparecer na loja (nunca virar imagem sem link nem link para 404) AND a linha no painel SHALL dizer
   que o destino se perdeu.
4. **HOME-25** — WHEN uma grade não tem banner próprio THEN a loja SHALL cair na derivação atual
   (`categories.banner_url` na ordem de `sort_order`, sem repetir arte que já abre uma fileira de
   coleção).
5. **HOME-26** — WHEN a grade é vista em 390px THEN os banners SHALL empilhar em coluna, cada um em
   largura cheia, na ordem da fileira; WHEN vista em desktop THEN SHALL formar o mosaico.
6. **HOME-27** — WHEN a dona envia um arquivo cuja proporção difere da declarada pela fileira THEN a
   tela SHALL avisar e mostrar o tamanho recomendado em pixels, e SHALL não recortar em silêncio.
7. **HOME-28** — WHEN o upload falha THEN a seção SHALL não ficar gravada com banner pela metade.
8. **HOME-29** — WHEN a imagem de um banner não carrega no navegador THEN o espaço reservado SHALL
   manter a proporção e o restante da Home SHALL não deslocar.
9. **HOME-30** — WHEN uma seção é apagada THEN os banners dela SHALL ser apagados junto.

**Independent Test**: criar uma grade com dois banners próprios (um para coleção, um para
`/como-enviar`), ativar, abrir a loja em 390px e ver os dois empilhados; apagar a coleção de destino e
ver o banner sair de cena com aviso no painel.

---

### P2: Override de curadoria, com volta ao automático

**User Story**: Como dona da loja, quero poder escolher a dedo quais coleções e produtos aparecem em
cada seção, sem perder o comportamento automático quando eu não quiser escolher.

**Why P2**: A Home já funciona e já é editável sem isto — o automático de hoje é bom. Isto é controle
fino, e é o que desacopla a ordem da vitrine da ordem do menu.

**Acceptance Criteria**:

1. **HOME-31** — WHEN uma seção não tem curadoria explícita THEN a loja SHALL usar a derivação atual
   (`sort_order` para coleções, `is_featured`/mais recentes para produtos), AND categoria ou produto
   novo SHALL entrar sem ninguém tocar na Home.
2. **HOME-32** — WHEN a dona escolhe itens explicitamente THEN a loja SHALL usar a lista dela, na
   ordem dela, e SHALL ignorar a derivação.
3. **HOME-33** — WHEN a dona pede para voltar ao automático THEN a curadoria explícita SHALL ser
   descartada e a seção SHALL voltar ao comportamento de `HOME-31`.
4. **HOME-34** — WHEN um item escolhido a dedo é despublicado ou apagado THEN a loja SHALL pular o
   item sem completar a vaga com o automático, AND o painel SHALL informar quantos escolhidos saíram
   do ar.
5. **HOME-35** — WHEN a dona reordena itens dentro de uma seção THEN `categories.sort_order` SHALL
   permanecer intacta, e o menu do topo SHALL não mudar.
6. **HOME-36** — WHEN todos os itens escolhidos saíram do ar THEN a seção SHALL não renderizar, e a
   linha no painel SHALL dizer isso.

**Independent Test**: escolher três coleções fora da ordem de `sort_order`, conferir a Home; abrir
`/admin/menu` e confirmar que a barra do topo não mudou; voltar ao automático e ver a ordem original.

---

### P2: Destaque em coleção

**User Story**: Como dona da loja, quero uma faixa larga dedicada a **uma** coleção, com imagem,
texto e CTA, para dar peso à linha da vez.

**Why P2**: É seção nova de vitrine, não lacuna. A Home funciona sem ela.

**Acceptance Criteria**:

1. **HOME-37** — WHEN a dona cria um destaque THEN ela SHALL escolher a coleção, a imagem, o `alt`, o
   texto e o rótulo do CTA; AND a coleção SHALL ser obrigatória.
2. **HOME-38** — WHEN o título e o texto ficam vazios THEN a loja SHALL usar o nome e a descrição da
   própria coleção, sem exigir redigitação.
3. **HOME-39** — WHEN a coleção do destaque fica inativa ou é apagada THEN a seção SHALL não
   renderizar, AND o painel SHALL avisar.
4. **HOME-40** — WHEN o destaque é visto em 390px THEN imagem e texto SHALL empilhar, e o CTA SHALL
   manter 44px de alvo.

**Independent Test**: criar um destaque para uma coleção, deixar título e texto vazios, e ver a loja
usar o nome e a descrição da coleção.

---

### P2: Textos das seções de texto e limites

**User Story**: Como dona da loja, quero editar os títulos e subtítulos das seções e quantos itens
cada uma mostra.

**Acceptance Criteria**:

1. **HOME-41** — WHEN a dona edita uma seção THEN ela SHALL poder alterar título, subtítulo e o
   rótulo/destino do link de "ver todos", quando a seção tiver um.
2. **HOME-42** — WHEN a dona altera o limite de itens de uma seção THEN a loja SHALL respeitar o novo
   limite; AND limite fora da faixa aceita pela seção SHALL ser recusado na tela.
3. **HOME-43** — WHEN a dona edita a faixa institucional THEN ela SHALL poder alterar sobretítulo,
   título, parágrafo, o nome/assinatura e o link de escape.
4. **HOME-44** — WHEN a dona edita a faixa de vantagens THEN os **números** SHALL continuar saindo de
   `store_settings`, não de texto digitado.

**Independent Test**: mudar "Explore por tema" para outro título e o limite de 12 para 6; conferir a
loja. Mudar o frete grátis em Configurações e ver a faixa de vantagens acompanhar.

---

### P3: Carrossel de produtos e a grade de coleções como blocos disponíveis

**User Story**: Como dona da loja, quero acrescentar uma fileira de produtos ou a grade de coleções
onde eu quiser na Home.

**Acceptance Criteria**:

1. **HOME-45** — WHEN a dona acrescenta um carrossel de produtos THEN ela SHALL escolher a fonte
   (mais recentes, em destaque, de uma coleção, ou escolha manual), o título e o limite.
2. **HOME-46** — WHEN a fonte do carrossel não devolve produto nenhum THEN a seção SHALL não
   renderizar, AND o painel SHALL avisar.
3. **HOME-47** — WHEN a dona acrescenta a grade de coleções THEN ela SHALL aparecer na Home no lugar
   escolhido, respeitando a regra que pula o guarda-chuva.

---

## Edge Cases

- WHEN a Home tem zero seções ativas THEN isso SHALL ser impossível, porque o hero não pode ser
  desligado nem removido (`HOME-08`).
- WHEN a dona tenta acrescentar a 31ª seção THEN a tela SHALL recusar, dizendo o teto.
- WHEN uma seção única (hero, vantagens, newsletter, chips, faixa institucional, fileiras de coleção)
  já existe THEN o painel SHALL não oferecer uma segunda.
- WHEN o catálogo está vazio (depois de `db reset`, antes do import) THEN as seções que dependem de
  `categories`/`products` SHALL não renderizar, e o painel SHALL dizer que a fonte está vazia — nunca
  moldura vazia na loja.
- WHEN o `alt` de uma imagem é só espaço em branco THEN SHALL ser recusado como vazio.
- WHEN duas admins editam a mesma seção ao mesmo tempo THEN a última gravação SHALL vencer **naquela
  seção**, sem afetar as outras.
- WHEN duas admins reordenam ao mesmo tempo THEN a ordem final SHALL ser determinística e igual nas
  duas telas depois de recarregar (`HOME-12`).
- WHEN o destino de um banner é um caminho reservado ou inexistente THEN a tela SHALL recusar, usando
  `@estrelinha/core/routes` como fonte — a mesma que a `23` estabeleceu.

---

## Requirement Traceability

| ID | Story | Fase | Tasks | Status |
| --- | --- | --- | --- | --- |
| HOME-01..07 | P1: A Home passa a ser dado | Tasks | T1–T12, T17, T18 | Pending |
| HOME-08..15 | P1: `/admin/home` | Tasks | T4, T5, T7, T21–T25, T30 | Pending |
| HOME-16..21 | P1: Hero editável | Tasks | T6, T13, T27 | Pending |
| HOME-22..30 | P1: Grade de banners com banner livre | Tasks | T6, T7, T15, T26, T28 | Pending |
| HOME-31..36 | P2: Override de curadoria | Tasks | T5, T16, T31 | Pending |
| HOME-37..40 | P2: Destaque em coleção | Tasks | T32, T33 | Pending |
| HOME-41..44 | P2: Textos e limites | Tasks | T14, T16, T29 | Pending |
| HOME-45..47 | P3: Carrossel e grade como blocos | — | **deferido** | Deferred |

**Coverage:** 47 requisitos · **44 mapeados em 34 tasks** ([`tasks.md`](./tasks.md)) · 3 deferidos de
forma explícita (P3 — os dois tipos entram no catálogo, sem renderer nem editor, e aparecem na
bandeja do painel como "em breve").

---

## Success Criteria

- [ ] Depois da migration, a Home renderizada é indistinguível da de hoje — mesma sequência, mesmos
      textos, mesmos limites (`HOME-04`).
- [ ] A Adri reordena a Home, desliga uma seção, troca a chamada do hero e sobe um banner de campanha
      **sem deploy**, e sem abrir `/admin/categorias`.
- [ ] Reordenar a Home não altera a barra do topo — conferido em `/admin/menu` depois de reordenar.
- [ ] Nenhuma seção ativa produz moldura vazia na loja; toda seção que não vai aparecer está marcada
      no painel com o motivo.
- [ ] Zero erro novo de lint (baseline 30/8) e zero erro de tipo (baseline 0).
- [ ] `packages/core/src/payment/**` fecha a feature **sem uma linha alterada** — nada aqui toca
      dinheiro.
- [ ] Os guardas existentes seguem verdes, em especial `navItems.test.ts` (rota nova em `App.tsx` na
      mesma ordem de `navGroups`) e `reservedSlugs.test.ts`.
- [ ] Guarda nova: o catálogo de tipos em TypeScript e o que a migration aceita não podem divergir,
      com âncora de contagem (`HOME-06`).
