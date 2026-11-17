## 03 · [apps/backoffice, packages/core] O editor do bloco "Joias em oferta" em `/admin/home` — título, descrição, campanha, peças e prévia

**Status:** done

`UC-01, UC-02, UC-03, UC-04, UC-05 (lado do editor)` — WI 103

**Objetivo.** Em `/admin/home`, a dona escreve título e descrição, escolhe a campanha e as peças daquela campanha no editor do bloco e confere na prévia antes de salvar.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` › Feature-Sliced Design, › O "defeito 01", › Convenções, › Os guardas, › Baselines · `apps/backoffice/CLAUDE.md` › Molde dos formulários, › `/admin/home` — a composição, › Editor de "Produtos em destaque", › A busca de produto: um dono, › Gravar NÃO desmonta a tela (VIV-05), › O movimento do painel, › A ponte da prévia · `packages/core/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código (UC-01..UC-05; Decisões F1, F2, F11, D-01, D-05, D-06, D-08)

**Depende de.** 02 — `home_sections.campaign_id`, `HomeSection.campaign_id`, as regras e frases de `core/home/campaignOffers.ts`, o dono "a campanha baixa esta peça?" em `core/campaigns` e o nome do índice por campanha. Confira que existe antes de começar.

**Habilita.** 04 consome o hook das marcações da campanha e a leitura do estado das peças escolhidas (fora do ar, fora da campanha, não barateada) que esta tarefa cria em `apps/backoffice/src/entities/campaign`.

### Critérios de aceite

**UC-01 · Escrever o título e a descrição do bloco**
- CA-01.1 O editor do bloco tem um campo de título e um de descrição, e a prévia mostra o texto digitado antes de salvar. [pedido]
- CA-01.2 Salvar mostra o recibo "Salvo" e não desmonta a prévia, como nos outros editores da Home. [código: apps/backoffice/CLAUDE.md › `VIV-05`]
- CA-01.5 Falha de gravação mantém o que a dona digitou na tela. [código: apps/backoffice/src/features/home-composition/model/sectionDraft.ts:1-5]
- CA-01.6 O título aceita até 60 caracteres e a descrição até 160; acima disso, salvar é recusado com o motivo e o número. [gate da descoberta: P-06]

**UC-02 · Escolher a campanha do bloco**
- CA-02.1 A lista oferece as campanhas em vigência e as agendadas, na ordem do início, cada uma com o estado e a vigência. Encerradas e desligadas não aparecem como opção; a campanha atual do bloco aparece escolhida mesmo encerrada ou desligada, com o estado. [prd-review r1: seletor-com-escolha-fora-da-lista-e-campanha-ja-usada] [código: apps/backoffice/src/entities/campaign/model/campaign.ts:37-44; gate: Q-01, P-03]
- CA-02.4 Todo bloco "Joias em oferta" tem uma campanha escolhida para aparecer na loja; o bloco sem campanha não aparece e o painel pede a escolha. O bloco acrescentado pela bandeja nasce desligado e sem campanha; o editor só salva com uma campanha escolhida, e enquanto não houver campanha a linha do bloco diz que ele não aparece na loja e pede a escolha (ligá-lo não o faz aparecer). [gate: Q-10 (c); prd-review r1: campanha-102-e-103-publicadas-juntas, bloco-novo-nasce-sem-campanha-pela-bandeja]
- CA-02.5 Se a campanha escolhida for apagada, o bloco fica sem campanha e não aparece na loja; a linha do bloco e o editor dizem que ele está sem campanha e pedem a escolha — a mesma mensagem do bloco que ainda não teve campanha. [prd-review r1: campanha-apagada-indistinguivel-de-sem-campanha]
- CA-02.6 A Home pode ter mais de um bloco "Joias em oferta", cada um com a sua campanha. Uma campanha que já tem outro bloco aparece desabilitada na lista, dizendo a posição e o título desse bloco; se mesmo assim duas gravações colidirem, salvar é recusado com a mesma frase. [gate: Q-06, P-07; prd-review r1: seletor-com-escolha-fora-da-lista-e-campanha-ja-usada]

**UC-03 · Escolher as peças da campanha**
- CA-03.1 A busca de peças do bloco mostra só as peças marcadas na campanha escolhida; sem campanha escolhida, a busca não está disponível e a tela diz por quê. [pedido]
- CA-03.2 As peças escolhidas aparecem numa lista que se reordena arrastando, com posição, nome e remover; a loja as mostra nessa ordem. [código: apps/backoffice/CLAUDE.md › editor de "Produtos em destaque"; FeaturedProducts.tsx:13-16]
- CA-03.3 Acima do teto de peças, salvar é recusado com o motivo e o número. O teto é 12 peças, como em "Produtos em destaque". Com peças escolhidas, a fileira mostra todas na ordem da dona: no celular rola na horizontal; no computador continua uma fita que rola, com as setas. Enquanto carrega, reserva uma vaga por peça escolhida. Sem peça escolhida, continua com as quatro primeiras da campanha, como hoje. [gate: Q-03; prd-review r1: doze-pecas-na-fileira-do-bloco]
- CA-03.4 Peça já escolhida aparece desabilitada na busca, dizendo que já está no bloco. [código: ProductSearchField.tsx:52-59]
- CA-03.6 Trocar a campanha com peças já escolhidas tira da lista as peças que não estão marcadas na nova campanha e diz quais saíram; as que estão marcadas nas duas ficam. Nada é gravado antes de salvar, e Cancelar desfaz a troca. [prd-review r1: troca-de-campanha-quais-pecas-saem]

**UC-04 · Peça escolhida que deixa de valer**
- CA-04.1 Peça escolhida que saiu do ar (despublicada ou apagada) não aparece na loja e o painel conta "N das M saíram do ar", nomeando a peça. [código: useAdminResolvedHome.ts:124-142; packages/core/src/home/types.ts:232-238]
- CA-04.3 Ao abrir o editor, depois de ler as peças da campanha, as peças escolhidas que foram tiradas da campanha saem da lista, e o editor diz quais saíram e que a remoção vale quando salvar (o editor abre como 'alterado'). Se essa leitura falhar, nenhuma peça sai e o editor diz que não conseguiu conferir a campanha. A peça apagada do catálogo sai da lista do mesmo jeito, e o editor a nomeia como apagada. [gate: Q-08; prd-review r1: remocao-ao-abrir-vira-pendencia-e-precisa-de-leitura]
- CA-04.4 Peça marcada cujo preço a campanha não baixa não aparece no bloco, como não aparece na vitrine; o editor e a linha do bloco dizem quais peças escolhidas não aparecem por esse motivo. [código: .specs/work-items/102-desconto-de-campanha/spec.md:416 (I-02); prd-review r1: peca-que-a-campanha-nao-barateia-some-sem-aviso]

**UC-05 · Conferir na prévia**
- CA-05.1 Com a campanha escolhida em vigência, a prévia mostra o bloco com o título, a descrição e as peças do rascunho, antes de salvar. [código: apps/backoffice/CLAUDE.md › A ponte da prévia]
- CA-05.2 Com uma campanha agendada escolhida, o editor avisa que a prévia só mostra o bloco a partir do início da campanha. [código: supabase/migrations/20261130120000_102-campanhas.sql:245-248] [gate: Q-07 — o aviso basta]

**RNF**
- RNF-04 Em 390 px o bloco e o editor não rolam na horizontal; o editor continua usável com a fonte do sistema a 200 %. [código: prd 102 RN-15; apps/store/CLAUDE.md › Mobile]
- RNF-05 Tom memorial: os textos fixos novos do bloco e do editor não usam urgência, contagem regressiva, escassez nem exclamação. [código: campaignOffers.ts:7-8; prd 102 RN-14]
- RNF-07 O editor não desenha vitrine: a lista é lista, e quem mostra como fica é a prévia. [código: apps/backoffice/CLAUDE.md › `AD-019`, `previaUnica.test.ts`]
- RNF-08 Os campos e o seletor têm rótulo acessível; a recusa é anunciada como alerta, com o motivo. [conhecimento]

### Design — o que a tela faz

Não há protótipo da tela (D-01). Molde: o editor de "Produtos em destaque". Do protótipo informado valem os padrões (D-01): contador "n / teto" ao lado do rótulo, recusa com ícone de alerta abaixo do campo, e lista ordenada com subir/descer/tirar como alternativa acessível ao arraste.
- FormCard **Conteúdo**: Título (até 60, contador `CharCounter`), Descrição (até 160, contador); a dica diz o recuo (vazio usa o nome da campanha / a frase dos percentuais).
- FormCard **Campanha**: seletor com rótulo acessível; opções em vigência + agendadas na ordem do início, cada uma com o estado e a vigência; a escolha atual aparece mesmo encerrada ou desligada, com o estado; campanha de outro bloco desabilitada, dizendo a posição e o título desse bloco. Avisos: sem campanha (o bloco não aparece na loja; escolha uma); agendada ("a prévia só mostra o bloco a partir do início"); encerrada/desligada.
- FormCard **Peças escolhidas**: sem campanha, a busca não aparece e a tela diz por quê; com campanha, busca restrita às marcadas; lista com posição, nome, remover e reordenação arrastando (o molde só tem o arraste, `FeaturedProductsEditor.tsx:188-246`; acrescente botões de subir e descer em cada linha, com `aria-label` e alvo de 44 px, como alternativa acessível — D-01); teto 12; avisos: "N das M saíram do ar" nomeando, peças tiradas da campanha (ao abrir, saem e o editor abre alterado), peça apagada nomeada como apagada, peças que a campanha não barateia. Leitura das marcações carregando / falhou ("não conseguiu conferir a campanha"; nada sai).
- Troca de campanha: as peças não marcadas na nova saem, o editor diz quais; nada grava antes de salvar; Cancelar desfaz.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| hook das marcações de uma campanha (ids de produto, paginado com `readAllPages`, erro tipado que nunca vira vazio) em `apps/backoffice/src/entities/campaign/api/` | VOCÊ CRIA | `campaign_id` | `product_id[]` |
| leitura do estado das peças escolhidas (no ar, preço, "de/por", variações) para perguntar ao dono "a campanha baixa esta peça?" | VOCÊ CRIA (em `entities/campaign` ou `entities/product/api`, respeitando BUS-23) | ids, campanha | por peça: fora do ar / fora da campanha / não barateada |
| recorte por ids em `ProductSearchField` e `core/product-search/search.ts › OpcoesDaBusca` | VOCÊ CRIA (parâmetro novo; o denominador `disponiveis` respeita o recorte) | ids permitidos | — |
| `SectionEditorProps` / `refusal` (`apps/backoffice/src/features/home-composition/ui/sectionEditors.tsx`) | JÁ EXISTE. Estenda: a campanha do rascunho e as outras seções | — | — |
| rascunho e prévia: `HomeSectionEditor.tsx`, `sectionDraft.ts › draftChanged/applyDraft` | JÁ EXISTE. Leve a campanha (`applyDraft` sobrescreve `campaign_id`) | — | — |
| gravação: `useAdminHomeSections.ts › updateSectionConfig` (chamada em `AdminHomePage.tsx`) | JÁ EXISTE. Grave `{ config, campaign_id }` antes de `curateSection`, com `'revalidar'` | — | `23505` do índice por campanha ⇒ a frase de `core` (D-05) |
| `mapSection` do painel (`useAdminHomeSections.ts`) | JÁ EXISTE (a 02 acrescentou `campaign_id`). Consuma | — | — |
| regras e frases do bloco (`packages/core/src/home/campaignOffers.ts`), dono "barateia?" (`core/campaigns`) | JÁ EXISTE (02). Consuma | — | — |
| `useCampaigns`, `campaignsOpenForMarking`, `CampaignStatusPill`, `campaignStatusLine`, `campaignPeriodLabel` | JÁ EXISTE. Consuma | — | — |
| `curateSection`, `toNewItems` (8 colunas) | JÁ EXISTE. Consuma; não altere (a campanha não entra em item) | — | — |

### Decisões já tomadas

- F1: campanha apagada zera `campaign_id` (FK `set null`); o editor diz que o bloco está sem campanha e pede a escolha — a mesma mensagem do bloco que nunca teve campanha.
- F2: o editor só salva com campanha escolhida (a recusa vem de `core`).
- F11: recorte por ids no `ProductSearchField` (dono único da busca, BUS-23) + hook de marcações em `entities/campaign`.
- D-05: o painel reconhece o `23505` pelo nome do índice por campanha e mostra a frase de `core`; outro `23505` segue com a mensagem do banco (`AD-029`).
- D-06: "barateia?" é perguntado ao dono de `core/campaigns`, nunca reescrito no painel.
- D-08: leitura das marcações paginada; falha ⇒ nenhuma peça sai e o editor avisa.
- CA-04.3: ao abrir, depois de ler as marcações, as tiradas da campanha (e as apagadas do catálogo) saem e o editor abre como alterado.
- O seletor de campanha não é catálogo de produto (BUS-23 régua 3 fala do nome da variável — não use os nomes de `NOMES_DO_CATALOGO`).

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| editor | `apps/backoffice/src/features/home-composition/ui/FeaturedProductsEditor.tsx` (Conteúdo, Peças escolhidas) |
| teto na tela | `apps/backoffice/src/features/home-composition/ui/CategoryListEditor.tsx` + `shared/ui/CharCounter.tsx` |
| composição da recusa | `apps/backoffice/src/features/home-composition/model/sectionRefusals.ts › productCarouselRefusal` |
| leitura com erro tipado e paginação | `apps/store/src/entities/campaign/api/useLiveCampaign.ts`; `readAllPages` em `apps/backoffice/src/entities/product/api` (`useProductPool`) |
| filtro por campanha | `apps/backoffice/src/entities/product/api/useAdminProducts.ts:265-272` |
| probe de gravação | `.specs/work-items/102-desconto-de-campanha/probes/02-gravacao-do-painel.sh` |

### Testes

- O editor tem campo de título, de descrição (com contador) e o seletor de campanha com rótulo.
- O seletor mostra em vigência e agendadas na ordem do início com o estado; a escolha atual aparece mesmo encerrada; a campanha usada por outro bloco aparece desabilitada com a posição e o título.
- Sem campanha a busca de peças não aparece e a tela diz por quê; com campanha a busca oferece só as marcadas; contador, vazio e "já está no bloco" valem dentro do recorte (`ProductSearchField`).
- Sem campanha — inclusive a campanha que foi apagada —, o editor diz que o bloco está sem campanha e pede a escolha, com a mesma frase nos dois casos.
- Trocar de campanha tira as peças não marcadas na nova e diz quais; Cancelar desfaz.
- Ao abrir: as tiradas da campanha saem e o editor abre alterado; leitura falhando ⇒ nada sai e avisa; apagada sai nomeada como apagada.
- Avisos de "não barateia", "saíram do ar" e "prévia só a partir do início" (agendada).
- A recusa (sem campanha, tetos, repetida) provada pelo `HomeSectionEditor` real: `onSave` não é chamado e o rascunho fica.
- A gravação manda a seção (`config` e `campaign_id`) antes dos itens, com payload em igualdade exata; o `23505` do índice vira a frase de CA-02.6; outro `23505` não.
- `applyDraft` leva a campanha à prévia.
- Guardas: `previaUnica.test.ts` (editor novo na âncora do `DST-02`), `buscaDeProdutoComDonoUnico.test.ts`, `animacaoRespeitaMovimento.test.ts`, `toNewItems.test.ts` (inalterado) e `CampaignOffersEditor.test.tsx` invertido.
- Probe local `probes/03-gravacao-do-painel.sh` (HTTP no :54441 com token de admin): seção com `config` e `campaign_id`, depois os itens; a peça escolhida chega ao banco (`AD-012`); a leitura das marcações da campanha.

### Obrigações

- O editor não desenha vitrine: sem `<img>`, `grid-cols-N`, `snap-*`, `…Preview`, `<iframe>` (`previaUnica.test.ts`).
- Nenhum `products` filtrado por nome fora de `entities/product/api` (BUS-23).
- `motion-reduce:` na mesma linha de toda classe de `transition-*`/`animate-*` nos arquivos em escopo do guarda.
- Gravar não desmonta: a revalidação passa `'revalidar'` (`VIV-05`).
- FSD: `features/home-composition` consome `entities/campaign` e `entities/product` pelo barrel; nada lateral.

### Não faça

- Não mude a linha do bloco na lista da Home nem a bandeja (`HomeSectionRow.tsx`, `HomeSectionList.tsx`, `HomeBlockTray*`) — é da 04.
- Não mexa no widget da loja nem na migration (02) nem nas views (01).
- Não permita escolher peça não marcada na campanha (Fora do PRD).
- Não reescreva a mensagem do banco para outros `23505` (`AD-029`).

### Pronto quando

- [ ] o editor salva título, descrição, campanha e peças, e a prévia mostra o rascunho antes de salvar
- [ ] sem campanha não salva e diz por quê; campanha já usada aparece desabilitada e, na colisão, a frase de CA-02.6
- [ ] a busca só oferece as peças marcadas e a troca de campanha tira as que não estão na nova
- [ ] o probe prova que a seção e a peça escolhida chegam ao banco local
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
