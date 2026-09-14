# Produtos em destaque, e o painel que não recarrega

> Três frentes numa feature porque compartilham **uma tela** (`/admin/home`) e **um defeito**: o
> painel desmonta o que está na frente da dona a cada gravação. A primeira frente acrescenta o bloco
> que ela pediu; a segunda e a terceira fazem com que usá-lo não custe um piscar de tela a cada
> clique.
>
> **Não há desenho no Paper para esta feature.** Onde a forma não estiver escrita aqui, vale o que as
> telas vizinhas já fazem (`HeroCarouselEditor`, `ProductCarousel`, `FormPageHeader`), e a divergência
> vira correção nesta spec — nunca um segundo padrão.

## Problem Statement

A Home só sabe mostrar produto **por coleção**: as fileiras saem de `categories` e mostram as quatro
primeiras peças de cada uma. Não existe bloco onde a Adri escolha **estas doze peças, nesta ordem** —
a vitrine de campanha, o lote que acabou de sair do forno, as peças que ela quer na frente no Dia das
Mães. O tipo `product_carousel` está no catálogo desde a feature `24` e no `check` da migration, mas
**sem renderer e sem editor**: a bandeja o mostra esmaecido, dizendo "em breve".

E o painel cobra caro por cada ajuste. Toda gravação de `/admin/home` e `/admin/menu` chama
`fetchSections()`/`fetchCategories()`, que fazem `setLoading(true)`; as duas páginas trocam a árvore
inteira por `<TableSkeleton/>` enquanto `loading` — e isso **desmonta o `<iframe>` da prévia**, que
remonta recarregando a loja. Ligar uma categoria no menu apaga a prévia, perde a posição de rolagem e
devolve a tela um segundo depois. O que pisca não é o navegador: é o React, e está no código.

## Goals

- [ ] A Home ganha o bloco **Produtos em destaque**: título, descrição, curadoria de até **12**
      produtos na ordem da dona, e a escolha entre **Slider** (a fita de hoje) e **Grade** (linhas de
      4, as sobras abaixo).
- [ ] **Nenhuma migration**: o tipo já é aceito pelo `check`, e `display` é valor em `config jsonb` —
      `homeSections.test.ts` segue verde sem afrouxar uma asserção.
- [ ] Gravar em `/admin/home` e `/admin/menu` **não desmonta a tela**: o esqueleto só existe na
      primeira carga, o `<iframe>` da prévia **não remonta**, e a rolagem da coluna de edição fica
      onde estava.
- [ ] Salvar uma seção **mantém o editor aberto**, com o selo virando `Salvo`.
- [ ] O painel ganha o vocabulário de movimento que ele não tem — `Salvando… → Salvo`, a linha que
      mudou acendendo, seção entrando e saindo da lista — **e nada disso se mexe para quem pediu
      `prefers-reduced-motion: reduce`**.
- [ ] A loja não ganha animação nenhuma, e `packages/core/src/payment/**` fecha a feature sem uma
      linha alterada.

## Out of Scope

| Item | Por quê |
| --- | --- |
| **Fonte automática** do bloco (`config.source`: mais vendidos, novidades, `is_featured`) | O pedido é "selecionar os produtos". Curadoria é a **presença** de itens; uma fonte automática ao lado seria o segundo dono de "quais produtos aparecem aqui", e um bloco com fonte E lista teria um estado que ninguém sabe ler |
| `category_grid` (**Grade de coleções**) | O outro tipo de P3 continua `comingSoon`. Implementar os dois porque estão na mesma linha do catálogo é escopo que ninguém pediu |
| Link **"Ver todos"** no bloco | Uma lista escolhida a dedo não tem página de destino. Inventar uma (uma categoria? uma busca?) é decidir o que a dona não pediu |
| Busca de produto **paginada no servidor** no seletor | `useAdminProducts` já carrega o catálogo para os seletores de três telas. O filtro do seletor novo é sobre a lista em memória. Trocar isso é a outra feature que o próprio `useAdminProducts` já declara em comentário |
| Trocar o padrão de dados do painel por React Query | Os `VIV-*` se resolvem dentro do padrão que as duas telas usam (`useState` + `fetch` explícito). Migrar o painel inteiro é refatoração de infraestrutura, não o pedido |
| Gravação otimista em **todas** as escritas do painel | Só o interruptor de seção entra (`VIV-10`, P2), que é onde a latência é sentida. Otimismo é dívida de reconciliação: cada escrita otimista precisa do caminho de volta |
| Animação na **loja** | O pedido é sobre "processos de salvamento", e a loja não salva nada. E o registro do negócio é memorial: movimento na vitrine é decisão de marca, não de painel |
| Redesenho do `ProductCard` | O bloco reusa o card da vitrine como está |
| Bloco com **paginação** ou rolagem infinita | Um bloco de home não é a página de categoria. O teto de 12 é a resposta |

---

## Assumptions & Open Questions

| # | Ambiguidade | Padrão escolhido | Racional | Confirmado? |
| --- | --- | --- | --- | --- |
| A-01 | O tipo é `product_carousel`, mas o bloco pode ser **grade** | **Reusar o tipo existente**, com o rótulo de tela **"Produtos em destaque"** | O `check` da migration já o aceita e o catálogo do TypeScript não pode divergir dele (`HOME-06`). O identificador é **coluna**, não texto de interface; renomeá-lo custaria migration destrutiva para não ganhar nada — o mesmo argumento que deixou `image_url` significando "a arte de computador" desde a `41`. O que a dona lê é o `label` | y |
| A-02 | **Grade no celular**: quantas colunas? | **2 colunas**, virando 4 a partir de `md` | O usuário respondeu *"seguir padrão dos outros itens na home atualmente"*. Na home **não existe grade de produto hoje** — as fileiras são fita horizontal no celular e `md:grid-cols-4` acima; o único lugar da loja onde produto aparece em grade é a página de categoria, que abre em `grid-cols-2` (o `dense`, que é o padrão). Duas colunas é portanto "o padrão da loja para grade de produto", e é o que faz a escolha da dona ser visível para os ~90% que entram pelo celular — com fita nos dois modos, Slider e Grade seriam **o mesmo bloco** no telefone | **parcial** — interpretação de uma resposta por analogia. A alternativa registrada é manter a fita no celular e tratar Grade como decisão só de computador |
| A-03 | Slider no **computador**: hoje `ProductCarousel` é `md:grid-cols-4` e as setas só rolam no celular | Slider vira **uma fileira que rola nos dois tamanhos**; Grade é quem embrulha | Com mais de 4 itens o componente de hoje **já embrulha** no computador — ninguém percebeu porque `HomeCollectionRow` sempre passa exatamente 4. Sem esta separação, "Slider" com 12 produtos seria 3 linhas, e as duas opções entregariam a mesma tela | y |
| A-04 | Teto de produtos | **12** | Resposta do usuário. 3 linhas de 4 na grade, e ainda legível como fita | y |
| A-05 | O teto é `config.limit` ou recusa de formulário? | **Recusa**, morando em `core/home` | `config.limit` é lido por `resolveHomeSections`, que **corta** a lista — e aí "quantos produtos aparecem" teria dois donos: a curadoria e o número. Molde de `heroCarouselSlidesRefusal` (feature `41`), que também é teto sem `limit` | y |
| A-06 | Título obrigatório? | **Sim**; descrição opcional | `SectionHeading` desenha o título; um bloco sem título abre na Home com uma faixa de produtos sem por quê. A descrição é apoio | y |
| A-07 | Onde vive `display`? | `config.display` (`slider` ou `grid`), com `featuredDisplay(valor)` em `core/home` — desconhecido ou ausente devolve `slider` | É **valor**, não referência: a fronteira do `config` é sobre id de categoria e de produto (`AD-014`). O resolvedor é o molde literal de `heroCarouselWidth`, e o recuo para `slider` é o que impede um `config` gravado por escrita direta de apagar o bloco | y |
| A-08 | Reusar `config.title` / `config.subtitle` ou criar chaves novas? | **Reusar** | As duas já existem e já significam exatamente isto em `trending_tags` e `newsletter`. Chave nova seria um segundo nome para o mesmo campo | y |
| A-09 | Salvar mantém o editor aberto — e o que acontece com o selo? | Editor aberto; `Alterações não salvas` dá lugar a `Salvo`, que some sozinho em ~2 s | Resposta do usuário. `Salvo` permanente viraria ruído: deixaria de significar "acabei de salvar" | y |
| A-10 | O que o esqueleto passa a medir | **Só a primeira carga**: `loading` vira `true` uma vez, e releitura de gravação não o liga | É a distinção que falta hoje — `fetchSections` é ao mesmo tempo "carregar" e "revalidar", e a tela só sabe ler a primeira | y |
| A-11 | Duas gravações em voo: qual releitura vence? | **A última pedida**, por token de sequência | Sem isso a releitura lenta da 1ª gravação chega **depois** da 2ª e devolve a tela ao estado anterior — o defeito clássico, e invisível porque nada quebra | y |
| A-12 | Produto escolhido que saiu do ar bloqueia a gravação? | **Não.** A loja pula, o painel avisa | Mesma régua de `HOME-34` e `HOME-39`: travar a gravação obrigaria a dona a mexer no catálogo para poder corrigir um título | y |
| A-13 | A prévia mostra produto escolhido **antes de salvar**? | **Sim** | A prévia existe para isso (`PRV-09`). Hoje o rascunho não carrega o `slug` do produto, e `resolveItem` trata "sem slug" como "fora do ar" — o bloco em edição apareceria vazio justamente enquanto ela escolhe. O **como** fica para o `design.md`; a AC é o comportamento (`DST-24`) | y |
| A-14 | Animação no painel usa o quê? | **CSS/Tailwind** (`tailwindcss-animate`, já no preset) por padrão; `framer-motion` só onde entrada e saída de lista exigirem | As duas já estão na raiz. Começar por CSS mantém o painel sem árvore de animação e sem custo de bundle onde uma transição resolve | y |

**Open questions:** nenhuma. A `A-02` fica marcada **parcial** de propósito: é interpretação de uma
resposta por analogia, e está escrita com a alternativa ao lado para poder ser revogada numa linha.

### Varredura das dimensões implícitas (escopo Large — todas)

| Dimensão | Resolução |
| --- | --- |
| Validação de entrada e limites | `DST-07` (título), `DST-08` (teto de 12), `DST-09` (produto repetido), `DST-10` (`display` desconhecido), `DST-11` (lista vazia não salva) |
| Falha / falha parcial | `VIV-07` (releitura que falha não apaga a tela), `DST-12` (gravação recusada preserva o rascunho — `HOME-14`), `DST-13` (a curadoria apaga e reinsere: falha do `insert` deixa a seção **sem itens**, e a tela precisa dizer isso) |
| Idempotência / repetição | `DST-14` — salvar duas vezes o mesmo rascunho produz o mesmo estado, e a segunda gravação não duplica item |
| Fronteira de auth / limite de taxa | **N/A porque** não há rota, endpoint, policy nem RPC nova. A escrita continua sendo `home_sections`/`home_section_items` sob as policies de `has_role` da feature `24`; a leitura da loja é a RLS pública de `products` que a vitrine já usa |
| Concorrência / ordenação | `A-11`/`VIV-08` (releitura fora de ordem), `DST-15` (duas admins: a última curadoria gravada vence, e a tela mostra o que o banco devolveu) |
| Ciclo de vida do dado | `DST-16` — produto apagado zera a FK (`on delete set null`) e o item vira órfão; o painel o **nomeia** pelo `label_snapshot`, a loja o pula |
| Observabilidade | **N/A porque** nada aqui chama serviço externo nem cria superfície de log: o que falha, falha à vista, na tela. Mesma resolução da feature `47` |
| Falha de dependência externa | `DST-17` — a consulta de produtos da loja falhando **não pode derrubar a Home**: o bloco não desenha, o resto da página fica |
| Integridade de transição de estado | `VIV-03` e `VIV-09` (o `<iframe>` não remonta em transição nenhuma), `DST-18` (trocar Slider↔Grade não mexe na curadoria), `DST-19` (o guarda do banco da última seção ativa continua valendo — esta tela não o antecipa) |

---

## User Stories

### P1 · H1: O bloco Produtos em destaque ⭐ MVP

**User Story**: Como a Adri, quero escolher a dedo as peças que abrem a Home — com um título meu e a
opção de mostrá-las em fita ou em grade — para montar uma vitrine de campanha sem depender de como o
catálogo está organizado em coleções.

**Why P1**: É o pedido. E é o único bloco da Home que fala de **peça**, não de coleção.

**Acceptance Criteria**:

1. `DST-01` — WHEN a dona abre a bandeja de blocos de `/admin/home` THEN o sistema SHALL oferecer
   **"Produtos em destaque"** como bloco acrescentável (não mais esmaecido, não mais "em breve"), e
   SHALL permitir mais de um na mesma Home.
2. `DST-02` — WHEN ela abre o editor do bloco THEN o sistema SHALL apresentar **título**,
   **descrição**, o seletor **Slider / Grade** e a **lista de produtos escolhidos**, com acrescentar,
   remover e reordenar.
3. `DST-03` — WHEN ela procura um produto no seletor THEN o sistema SHALL filtrar o catálogo já
   carregado pelo nome digitado e SHALL permitir acrescentar o escolhido ao fim da lista.
4. `DST-04` — WHEN o bloco está ligado e tem produtos no ar THEN a loja SHALL desenhar o título, a
   descrição (quando houver) e os produtos **na ordem da dona**, usando o `ProductCard` da vitrine.
5. `DST-05` — WHEN `display` é `slider` THEN a loja SHALL desenhar **uma fileira** que rola na
   horizontal, no celular e no computador, com as setas do computador rolando a fileira.
6. `DST-06` — WHEN `display` é `grid` THEN a loja SHALL desenhar **4 por linha a partir de `md`** e
   **2 por linha abaixo de `md`**, embrulhando o que sobra para as linhas seguintes, **sem rolagem
   horizontal**.
7. `DST-07` — WHEN ela tenta salvar sem título THEN o sistema SHALL recusar com o motivo e SHALL
   preservar tudo o que ela preencheu.
8. `DST-08` — WHEN a lista chega a **12** produtos THEN o sistema SHALL recusar o 13º com uma
   mensagem que **nomeia o teto** e sugere um segundo bloco.
9. `DST-09` — WHEN ela acrescenta um produto que já está na lista THEN o sistema SHALL recusar a
   repetição, dizendo que aquela peça já está no bloco.
10. `DST-10` — WHEN `config.display` está ausente ou tem valor desconhecido THEN a loja e o painel
    SHALL ler `slider`, e nenhuma tela SHALL recusar a gravação por causa disso.
11. `DST-11` — WHEN a lista está vazia THEN o sistema SHALL recusar a gravação dizendo que um bloco
    sem peça escolhida não aparece na loja.
12. `DST-12` — WHEN a gravação falha THEN o sistema SHALL dizer o que não foi salvo **sem limpar o
    formulário** (`HOME-14`).
13. `DST-13` — WHEN a curadoria é reescrita e o `insert` falha depois do `delete` THEN o sistema
    SHALL informar que a lista ficou vazia e SHALL manter o rascunho na tela para ela salvar de novo.
14. `DST-14` — WHEN ela salva duas vezes o mesmo rascunho THEN o estado gravado SHALL ser o mesmo e a
    lista SHALL continuar com o mesmo número de itens.
15. `DST-15` — WHEN duas pessoas salvam a mesma seção THEN a última gravação SHALL vencer, e a tela
    de quem perdeu SHALL passar a mostrar o que o banco devolveu na releitura.
16. `DST-16` — WHEN um produto escolhido é apagado do catálogo THEN a loja SHALL pular aquele item e
    o painel SHALL dizer **quantos** escolhidos saíram do ar, nomeando-os pelo rótulo congelado.
17. `DST-17` — WHEN a consulta de produtos da loja falha THEN o bloco SHALL não desenhar e o resto da
    Home SHALL continuar de pé.
18. `DST-18` — WHEN ela troca Slider↔Grade THEN a curadoria SHALL permanecer intacta.
19. `DST-19` — WHEN o bloco é a última seção ativa e ela tenta desligá-lo ou removê-lo THEN a recusa
    SHALL vir **do banco** (`guard_last_active_home_section`), com a mensagem dele — esta tela não a
    antecipa (`AD-029`).
20. `DST-20` — WHEN nenhum produto escolhido está no ar THEN a seção SHALL não aparecer na loja e a
    linha do painel SHALL dizer **por quê**, distinguindo "nenhum escolhido" de "os escolhidos saíram
    do ar".
21. `DST-21` — WHEN a seção está carregando os produtos THEN a loja SHALL reservar a altura das vagas
    com esqueletos, no número de itens escolhidos (`PRF-17` — o CLS de 0,244 que a `40` mediu).
22. `DST-22` — WHEN o catálogo devolve os produtos em ordem qualquer THEN a loja SHALL reordená-los
    pela **posição da curadoria**, nunca pela ordem da resposta.
23. `DST-23` — WHEN a feature fecha THEN `HOME_SECTION_TYPES`, o `check` da migration e as contagens
    de `homeSections.test.ts` SHALL permanecer **inalterados**, e `catalog.test.ts` SHALL passar a
    asserir que **só `category_grid`** é `comingSoon`.
24. `DST-24` — WHEN ela acrescenta ou remove produtos **sem salvar** THEN a prévia SHALL mostrar o
    bloco com a lista do rascunho.

**Independent Test**: acrescentar o bloco em `/admin/home`, escolher 5 produtos, salvar, abrir a loja
e ver os 5 na ordem escolhida; trocar para Grade com 6 produtos e ver 4 + 2.

---

### P1 · H2: O painel para de recarregar ⭐ MVP

**User Story**: Como a Adri, quero que salvar uma opção não apague a tela que estou olhando, para não
perder a prévia, a rolagem e o lugar onde eu estava a cada clique.

**Why P1**: É metade do pedido, e é o que torna o bloco novo utilizável: montar uma curadoria de 12
peças com a tela piscando a cada passo é o defeito multiplicado por 12.

**Acceptance Criteria**:

1. `VIV-01` — WHEN qualquer gravação de `/admin/home` termina (ligar/desligar, arrastar, acrescentar,
   remover, curar, salvar o editor) THEN a tela SHALL **não** voltar ao esqueleto: ele SHALL aparecer
   somente enquanto **ainda não houve** primeira resposta.
2. `VIV-02` — WHEN qualquer gravação de `/admin/menu` termina THEN vale o mesmo.
3. `VIV-03` — WHEN uma gravação termina THEN o `<iframe>` da prévia SHALL ser o **mesmo elemento** de
   antes: não remonta, não recarrega, não volta ao topo.
4. `VIV-04` — WHEN uma gravação está em curso THEN a tela SHALL dizer que está salvando **onde se
   clicou** e SHALL continuar mostrando os dados que já tinha.
5. `VIV-05` — WHEN ela salva uma seção no editor de `/admin/home` THEN o editor SHALL **permanecer
   aberto**, com o selo `Alterações não salvas` **saindo** e o **botão de salvar** passando a dizer
   `Salvo`.
6. `VIV-06` — WHEN o `Salvo` aparece THEN ele SHALL sumir sozinho em ~2 s, e qualquer alteração nova
   SHALL devolver o selo de pendência.

> **Correção de texto feita na rodada 2 da verificação, e o motivo é regra do projeto.** A redação
> original de `VIV-05` dizia que o selo *"dava lugar a `Salvo`"*, enquanto `ANI-01` diz que quem passa
> por `Salvando… → Salvo` é **o botão**. Cumprir as duas ao pé da letra poria a palavra `Salvo` em
> **dois lugares** — dois donos do mesmo estado, que é o "defeito 01" no tamanho de uma palavra, e
> ainda tornaria ambígua toda busca por `Salvo` na tela. A divisão vigente é: **pendência no selo,
> gravação no botão**. O comportamento observável que `VIV-05` descrevia continua inteiro (a pendência
> sai, o `Salvo` aparece), e nenhuma asserção de `VIV-05`/`VIV-06` precisou mudar — mudou o lugar,
> não a promessa.
7. `VIV-07` — WHEN a releitura que segue uma gravação falha THEN a tela SHALL mostrar a faixa de erro
   **sem apagar** os dados que já estavam na tela.
8. `VIV-08` — WHEN duas gravações são pedidas em sequência rápida THEN a tela SHALL terminar
   mostrando o resultado da **última**, mesmo que a releitura da primeira responda depois.
9. `VIV-09` — WHEN a coluna da esquerda troca entre lista e editor THEN a prévia SHALL continuar
   sendo a mesma árvore de React (o que a feature `25` já garante, e que esta não pode perder).
10. `VIV-10` — *(P2)* WHEN ela liga ou desliga uma seção THEN o interruptor SHALL refletir a escolha
    **imediatamente** e SHALL voltar ao estado anterior se a gravação falhar, com o motivo do banco.
11. `VIV-11` — WHEN a página está na primeira carga THEN o esqueleto SHALL continuar aparecendo como
    hoje — a mudança é sobre revalidar, não sobre carregar.
12. `VIV-12` — WHEN uma gravação termina THEN a posição de rolagem da coluna de edição SHALL
    permanecer onde estava.

**Independent Test**: em `/admin/menu`, rolar a lista até o fim, ligar uma categoria e conferir que a
prévia não recarrega e a lista não volta ao topo.

---

### P2 · H3: As animações de salvamento

**User Story**: Como a Adri, quero que o painel mostre com suavidade o que acabou de acontecer, para
saber que salvou sem precisar procurar a confirmação.

**Why P2**: Sem os `VIV-*` não há o que animar — o que existe hoje é um corte seco entre dois
estados. Com eles, o movimento é o que dá a entender que a tela **mudou** em vez de **trocar**.

**Acceptance Criteria**:

1. `ANI-01` — WHEN uma gravação começa e termina THEN o botão de salvar SHALL passar por
   `Salvando…` → `Salvo` com transição, sem mudar de largura a ponto de mover o que está ao lado.
2. `ANI-02` — WHEN o selo de pendência entra ou sai THEN ele SHALL aparecer e desaparecer com
   transição, **sem deslocar** o título nem as ações do cabeçalho.
3. `ANI-03` — WHEN uma linha da lista de seções acaba de ser gravada THEN ela SHALL acender por um
   instante e voltar ao normal.
4. `ANI-04` — WHEN uma seção é acrescentada ou removida da lista THEN ela SHALL entrar e sair com
   transição, e a lista SHALL acomodar o espaço sem salto.
5. `ANI-05` — WHEN o sistema pede `prefers-reduced-motion: reduce` THEN **nenhuma** das animações
   acima SHALL ocorrer: os estados mudam, o movimento não.
6. `ANI-06` — WHEN qualquer animação está em curso THEN nenhum controle interativo SHALL mudar de
   posição de um jeito que faça um clique cair noutro lugar.
7. `ANI-07` — WHEN uma gravação acontece THEN a animação SHALL **não atrasar** a gravação nem a
   releitura: nada espera uma transição terminar.
8. `ANI-08` — WHEN a lista está apenas revalidando, sem mudança de conteúdo, THEN **nada** SHALL
   piscar: revalidação silenciosa é o comportamento, e o aviso de "salvando" é do controle clicado.

**Independent Test**: salvar com `prefers-reduced-motion` desligado e depois ligado, conferindo que
os dois percursos mostram os mesmos estados e só um deles se move.

---

## Edge Cases

- WHEN a dona escolhe 12 produtos e um deles é despublicado depois THEN a loja mostra 11 e o painel
  diz "1 de 12 escolhidos saiu do ar".
- WHEN o bloco tem produtos mas está **desligado** THEN a linha do painel diz "Desligada: não aparece
  na loja" — o motivo de estar desligada vence o de estar vazia, que é a ordem que
  `resolveHomeSections` já pratica.
- WHEN há **dois** blocos "Produtos em destaque" na Home THEN os dois desenham, cada um com a sua
  curadoria e o seu `display`.
- WHEN `display` é `grid` e há **1** produto THEN a grade desenha uma célula — não estica o card para
  a linha inteira.
- WHEN `display` é `slider` e há **1** produto THEN as setas continuam existindo e não rolam nada.
- WHEN o título tem 120 caracteres THEN o `SectionHeading` embrulha e o bloco não estoura a largura
  em 390px.
- WHEN a releitura responde **enquanto** a dona digita no editor THEN o que ela digitou **não** é
  sobrescrito: o rascunho é estado do editor, semeado uma vez, e o `key={sectionId}` não pode passar
  a depender de nada que a releitura mude.
- Esta feature **não guarda preferência nenhuma** em `localStorage` ou `sessionStorage`.

---

## Requirement Traceability

| ID | História | Fase | Status |
| --- | --- | --- | --- |
| DST-01 … DST-24 | P1 · H1 — Produtos em destaque | Design | Pending |
| VIV-01 … VIV-09, VIV-11, VIV-12 | P1 · H2 — Painel sem recarga | Design | Pending |
| VIV-10 | P2 — interruptor otimista | Design | Pending |
| ANI-01 … ANI-08 | P2 · H3 — Animações | Design | Pending |

**Cobertura:** 44 requisitos — 24 `DST`, 12 `VIV`, 8 `ANI`. Mapeamento para tasks: pendente (fase
Tasks).

---

## Success Criteria

- [ ] A Adri monta um bloco de 12 peças em `/admin/home` **sem a tela piscar uma vez**, e vê o
      resultado na prévia antes de salvar.
- [ ] O mesmo bloco desenha na loja em Slider e em Grade, medido em **390×844 e 1440** — não só em
      jsdom, que devolve 0 para toda medida de layout.
- [ ] Zero migration nova; `homeSections.test.ts` verde sem uma asserção afrouxada.
- [ ] Baselines sem regressão, medidas **por workspace, com exit code capturado fora de pipe** e com
      `--testTimeout=20000` na loja e no painel.
- [ ] `packages/core/src/payment/**` sem uma linha alterada, conferido por `git diff --name-only`.
