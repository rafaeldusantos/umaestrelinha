# Banner principal da Home — carrossel gerenciável

## Problem Statement

A Home abre hoje com a **Chamada principal** (`hero`): título em duas cores, parágrafo, um CTA e uma
figura ao lado. É um bloco de **texto do código com foto opcional** — a Adri não consegue anunciar uma
campanha subindo uma arte pronta, que é como ela trabalha (monta o banner no Canva, com o texto já
desenhado nele). A loja que está no ar hoje (`umaestrelinha.com.br`) abre com um **carrossel de arte
de largura cheia**, e é esse modelo que ela quer trazer.

Falta, portanto, um tipo de seção que a Home não tem: **arte enviada pela dona, uma por dispositivo,
apontando para uma coleção, uma peça ou um endereço**, adicionável na hora e em qualquer posição.

E falta a contrapartida: enquanto a Chamada principal for **indelével** (`HOME-08`, com trigger no
banco), o carrossel nunca pode ocupar o topo — ele entraria *abaixo* de um hero que a dona não pode
desligar.

## Goals

- [ ] A Adri adiciona um bloco **Banner principal** em `/admin/home`, em qualquer posição, quantas
      vezes quiser, e ele nasce **desligado** (a Home no ar não muda no dia do deploy).
- [ ] Cada slide tem **arte de computador**, **arte de celular**, **texto alternativo** e **destino**
      (coleção, peça ou endereço) — os quatro editáveis sem programador.
- [ ] Cada seção escolhe a largura: **`full`** (de borda a borda) ou **`wide`** (dentro do container).
- [ ] A **Chamada principal deixa de ser obrigatória** — vira opção como qualquer outro bloco — **sem**
      que a Home passe a poder ficar em branco.
- [ ] O carrossel **não custa métrica**: o primeiro slide pinta sem atraso e a seção não desloca nada
      abaixo dela (as duas dívidas que a feature `40` acabou de pagar na Home).

## Out of Scope

Explicitamente excluído. Documentado para impedir avanço de escopo.

| Item | Motivo |
| --- | --- |
| Título, subtítulo e CTA editáveis **sobrepostos** à arte | Decisão da dona (ver `context.md`): a arte já carrega o texto. Sobrepor exigiria véu de contraste e posicionamento de texto, e criaria um segundo dono do que a campanha diz |
| Vídeo como slide | A referência é imagem. Vídeo muda peso, LCP, `prefers-reduced-motion` e política de autoplay — é outra feature |
| Agendamento (banner que entra e sai por data) | Não pedido. Hoje a dona liga e desliga a seção, que é o controle que ela já entende |
| Transição configurável (fade × deslize, duração) | Número de código que ninguém depois consegue justificar. A transição é uma só, declarada aqui |
| Limpeza de arte órfã no Storage | Já é verdade hoje para a arte da Home e do menu; esta feature não piora nem conserta. Vira item de backlog se doer |
| Substituir a Chamada principal pelo carrossel na semente | A semente já rodou em produção. Mexer nela **não** desfaz o que está gravado e mudaria a Home de quem já a tem — a dona desliga o hero pela tela, que é o que esta feature libera |
| Trocar `banner_grid` (Grade de banners) por este bloco | São blocos diferentes: a grade é mosaico estático derivável das categorias; este é carrossel de arte curada |

---

## Assumptions & Open Questions

Toda ambiguidade está resolvida ou registrada aqui — nada fica silenciosamente indefinido.

| Suposição / decisão | Padrão escolhido | Racional | Confirmada? |
| --- | --- | --- | --- |
| Nome técnico do tipo | `hero_carousel` | Distingue de `banner_grid` e de `hero`; entra no `check` da migration e em `HOME_SECTION_TYPES` | n |
| Rótulo em português | **"Banner principal"** | Não colide com "Chamada principal" (hero) nem com "Grade de banners" (`banner_grid`) | n |
| Proporção da arte de **computador** | **1440 × 540** (8:3) | Cabe de borda a borda em 1440 sem cortar altura; é a faixa em que os temas de e-commerce desenham banner de topo. O painel **avisa** a divergência, não recusa (mesma régua de `HOME-27`) | **n — confirmar com uma arte real da Adri** |
| Proporção da arte de **celular** | **780 × 975** (4:5) | Retrato, porque ~90% dos acessos são de celular e uma arte 8:3 em 390px vira uma tira de 146px de altura, com o texto embutido ilegível | **n — confirmar com uma arte real da Adri** |
| Giro automático | **6 s por slide**, fixo, sem campo no painel | Duração configurável é número sem origem (a lição que tirou o teto do menu na `39`). 6 s é o tempo de ler uma arte com frase curta | n |
| Teto de slides por seção | **6**, com **recusa por motivo** (nunca botão apagado) | Cada slide é uma imagem baixada. A loja de referência usa 4. Difere do teto que a `39` removeu: aquele recusava **curadoria** (quais coleções aparecem no menu); este limita **peso de página**, e a dona contorna criando uma segunda seção | n |
| Largura padrão de uma seção nova | `full` | É o modelo da loja de referência, e é o que a dona pediu primeiro ("banner full") | n |
| A invariante de `HOME-08` | Generalizada para **"não é possível desligar nem apagar a última seção ativa"** | Ver `context.md`. O hero vira opção sem a Home poder ficar em branco | n |
| Corrida entre dois administradores desligando seções diferentes ao mesmo tempo | **Aceita e declarada** — o trigger conta linhas ativas e duas transações simultâneas podem passar | A loja tem uma administradora. Blindar exigiria `serializable` ou lock de tabela, caro para um risco que não existe na operação real | n |
| Arte que falta num dos dispositivos | **Usa a do outro**, e a loja **declara** que reaproveitou para o painel avisar | Idêntico a `NAV-34` (banner do menu). Sumir com o banner em metade dos acessos é pior, e é justamente o celular que costuma faltar | n |
| **Destino externo** (`BNR-27`, segunda metade) | **NÃO implementado — é inalcançável.** Todo slide leva a um caminho interno, com `<Link>` | Descoberto na T10, contra o código: `ctaHrefRefusal` **recusa** qualquer endereço que não comece com `/` (`HOME-23`, `AD-018`), e é a régua que `destinationRefusal` já aplica ao caminho livre. Um slide externo não passa pelo painel, então `target="_blank"` seria código para um estado que o sistema não produz. Escrever esse ramo é fingir cobertura: nenhum teste real o alcançaria. **Se um dia a loja quiser destino externo, a mudança é em `ctaHrefRefusal`, não aqui** | y — divergência declarada |

**Open questions:** nenhuma — as duas proporções ficam registradas como suposição a confirmar contra
uma arte real antes da fase de desenho; nada mais ficou em aberto.

---

## User Stories

### P1-A: O bloco existe e entra na Home ⭐ MVP

**User Story**: Como Adri, quero **adicionar um bloco "Banner principal"** em `/admin/home`, na
posição que eu escolher e quantas vezes precisar, para anunciar campanha sem depender de programador.

**Why P1**: Sem o bloco no catálogo não há o que editar nem o que desenhar. É a base das outras.

**Acceptance Criteria**:

1. WHEN a bandeja de blocos de `/admin/home` é aberta THEN o sistema SHALL oferecer o bloco
   **"Banner principal"** entre os disponíveis, **sem** a etiqueta "em breve".
2. WHEN a Adri acrescenta um "Banner principal" THEN o sistema SHALL criar a seção **desligada**
   (`active = false`), como todo bloco novo (`HOME-10`) — a Home no ar não muda sozinha.
3. WHEN a Home já tem um "Banner principal" THEN o sistema SHALL **permitir** acrescentar outro — o
   tipo é repetível e **não** entra em `UNIQUE_SECTION_TYPES`.
4. WHEN a Adri arrasta a seção THEN o sistema SHALL aceitá-la em **qualquer** posição da composição,
   inclusive acima da Chamada principal.
5. WHEN a Home já tem 30 seções THEN o sistema SHALL recusar o bloco com o motivo do teto
   (`sectionCapRefusal`), como qualquer outro tipo.
6. WHEN o catálogo de tipos do TypeScript é comparado com o `check (type in …)` da migration THEN os
   dois SHALL conter exatamente o mesmo conjunto, com âncora de contagem (`HOME-06`).

**Independent Test**: abrir `/admin/home`, acrescentar dois "Banner principal", arrastar um para o
topo e recarregar a página — as duas seções continuam lá, desligadas, na ordem escolhida; a loja não
mudou.

---

### P1-B: Cada slide tem arte por dispositivo, descrição e destino ⭐ MVP

**User Story**: Como Adri, quero **enviar a arte do computador e a do celular**, escrever a descrição
e escolher para onde o banner leva, para o mesmo anúncio funcionar nos dois dispositivos.

**Why P1**: É literalmente o pedido. Sem os quatro campos o bloco não é gerenciável.

**Acceptance Criteria**:

1. WHEN a Adri abre o editor de um "Banner principal" THEN o sistema SHALL oferecer, **por slide**:
   arte do computador, arte do celular, texto alternativo e destino.
2. WHEN a Adri escolhe o destino THEN o sistema SHALL oferecer **três** modos — **Coleção**, **Peça**
   e **Endereço** — e gravar **no máximo um** deles na linha (`category_id`, `product_id` ou `href`),
   respeitando o `check (num_nonnulls(...) <= 1)` que já existe.
3. WHEN a Adri escolhe uma coleção ou uma peça THEN o sistema SHALL congelar o nome do destino em
   `label_snapshot`, para o painel poder **nomear** o que se perdeu se ele for apagado depois
   (`HOME-24`).
4. WHEN um slide é salvo sem arte de computador **e** sem arte de celular THEN o sistema SHALL
   **recusar** a gravação com o motivo `«Nº banner: envie a arte. Sem imagem não há banner.»` — a
   mesma frase que a grade de banners já usa.
5. WHEN um slide é salvo com arte e **sem** texto alternativo THEN o sistema SHALL recusar com motivo
   próprio, porque a arte carrega o texto da campanha e sem `alt` ela é invisível para leitor de tela
   e para o Google.
6. WHEN um slide é salvo sem destino THEN o sistema SHALL recusar pela régua que já existe
   (`destinationRefusal`), **sem** uma segunda redação da regra.
7. WHEN a Adri tenta acrescentar o 7º slide THEN o sistema SHALL recusar **com motivo em texto**
   (nunca um botão apagado) dizendo o teto e o que fazer — criar uma segunda seção.
8. WHEN a arte enviada tem proporção diferente da vaga THEN o sistema SHALL **avisar** e **gravar
   assim mesmo** (`HOME-27`) — arte com texto embutido não pode ser recortada em silêncio.
9. WHEN o envio de uma arte falha THEN o sistema SHALL mostrar o motivo e **preservar** o resto do
   rascunho (`HOME-14`) — nada do que ela preencheu se perde.
10. WHEN a Adri reordena os slides THEN o sistema SHALL gravar a ordem da lista como `position`, e a
    loja SHALL girar nessa ordem.

**Independent Test**: criar uma seção, subir duas artes num slide, escolher uma coleção, salvar,
recarregar — as duas artes, o `alt` e o destino voltam; tentar salvar um slide sem `alt` é recusado
com motivo legível.

---

### P1-C: A loja desenha o carrossel, em `full` ou `wide` ⭐ MVP

**User Story**: Como cliente, quero **ver o banner da campanha** ocupando a largura que a loja
escolheu, com a arte certa para o meu dispositivo, para entender a oferta e chegar nela num toque.

**Why P1**: É o lado da loja do mesmo pedido — sem ele o painel edita algo que não aparece.

**Acceptance Criteria**:

1. WHEN a seção está ligada e tem ao menos um slide desenhável THEN a loja SHALL renderizar o
   carrossel na posição da seção.
2. WHEN `config.width` é `full` THEN a seção SHALL ocupar a **largura inteira da página**, **sem
   container** e **sem** produzir rolagem horizontal no `body`.
3. WHEN `config.width` é `wide` THEN a seção SHALL ocupar a largura do `container` da loja, com canto
   arredondado da escala de raio do projeto.
4. WHEN `config.width` está ausente THEN a loja SHALL desenhar como `full` (o padrão declarado).
5. WHEN a viewport é de celular THEN a loja SHALL usar a **arte de celular**; WHEN é de computador,
   a **arte de computador** — e a troca SHALL ser feita pelo próprio HTML da imagem, sem baixar as
   duas.
6. WHEN a arte de um dispositivo não existe THEN a loja SHALL desenhar a do outro, e o **predicado
   dessa herança** SHALL ter **um único dono** em `packages/core`, chamado tanto pela loja quanto pelo
   painel (é a mesma regra de `menuBannerArt`, e ela não pode ganhar uma segunda escrita).
7. WHEN a URL da arte vem do Storage do projeto THEN a loja SHALL pedir a **rendição** no tamanho da
   vaga por `@estrelinha/core/media` (`renditionUrl`/`renditionSrcSet`), **nunca** montando a URL à
   mão (`renditionSingleOwner.test.ts`).
8. WHEN a página carrega THEN o **primeiro slide** SHALL nascer com `loading="eager"` e
   `fetchpriority="high"`, e os demais com `loading="lazy"`.
9. WHEN a página carrega THEN o primeiro slide SHALL nascer **visível** — nenhum `opacity: 0`, em
   variant ou em prop inline, em nenhum ponto do caminho até ele (`PRF-19`, a dívida que a `40`
   pagou no hero).
10. WHEN a arte ainda não carregou THEN a vaga SHALL já ter **altura conhecida** pela proporção
    declarada do dispositivo — a seção não desloca nada abaixo dela.
11. WHEN o slide é clicado ou tocado THEN a loja SHALL navegar para o destino resolvido; WHEN o
    destino é externo, SHALL abrir com `target="_blank"` e `rel="noopener noreferrer"`.
12. WHEN o destino de um slide saiu do ar (coleção despublicada, peça apagada, órfão por
    `on delete set null`) THEN a loja SHALL **pular** aquele slide e desenhar os demais.
13. WHEN todos os slides estão indesenháveis, ou a seção não tem slide nenhum THEN a seção SHALL
    **não renderizar**, e `resolveHomeSections` SHALL devolver o **motivo legível** para a linha do
    painel (`HOME-09`).

**Independent Test**: ligar a seção com dois slides e abrir a loja em 390 e em 1440 — a arte muda de
recorte, o clique leva à coleção certa, o `body` não rola na horizontal e a seção não empurra nada
para baixo enquanto as imagens chegam.

---

### P1-D: O carrossel gira, e para quando a cliente pede ⭐ MVP

**User Story**: Como cliente, quero **ver os outros banners** sem ficar refém da rotação, para ler o
que me interessa no meu tempo.

**Why P1**: Carrossel sem controle e sem pausa é o defeito clássico do padrão. E esta loja fala com
quem acabou de perder alguém — nada aqui pode ter pressa fabricada.

**Acceptance Criteria**:

1. WHEN a seção tem **dois ou mais** slides desenháveis THEN a loja SHALL avançar automaticamente a
   cada **6 s**.
2. WHEN a seção tem **um** slide desenhável THEN a loja SHALL desenhá-lo **estático**, **sem**
   bolinhas, **sem** setas e **sem** giro.
3. WHEN o ponteiro está sobre o carrossel, ou o foco do teclado está dentro dele THEN o giro SHALL
   pausar, e SHALL retomar quando sair.
4. WHEN o sistema operacional pede menos movimento (`prefers-reduced-motion: reduce`) THEN a loja
   SHALL **não girar sozinha** e SHALL manter os controles funcionando.
5. WHEN há dois ou mais slides THEN a loja SHALL desenhar **bolinhas** de navegação, uma por slide,
   cada uma um `<button>` com rótulo acessível dizendo **qual** banner ela abre.
6. WHEN há dois ou mais slides em viewport de computador THEN a loja SHALL desenhar **setas** de
   anterior e próximo, também rotuladas.
7. WHEN um controle é desenhado THEN seu alvo de toque SHALL ter **no mínimo 44 px** pela medida
   única do projeto (`TAP_44`/`TAP_ROW`) — `touchTarget.test.ts` não ganha exceção.
8. WHEN a cliente arrasta o dedo sobre o carrossel THEN a loja SHALL trocar de slide na direção do
   gesto, e o arrasto SHALL **não** sequestrar a rolagem vertical da página.
9. WHEN o slide muda THEN a região SHALL anunciar de forma educada (`aria-live="polite"`) qual banner
   está visível, e o carrossel SHALL se identificar como tal (`aria-roledescription`), com cada slide
   numerado ("1 de 4").
10. WHEN o slide sai de vista THEN ele SHALL sair também do alcance do teclado e do leitor de tela —
    nenhum link focável escondido atrás do slide visível.

**Independent Test**: com quatro slides, deixar a página parada 30 s (gira), passar o mouse (para),
navegar por Tab (para, e só o link visível recebe foco), ligar "reduzir movimento" (não gira, mas as
bolinhas continuam trocando).

---

### P1-E: A Chamada principal vira opção, e a Home continua não podendo ficar em branco ⭐ MVP

**User Story**: Como Adri, quero **desligar ou remover a Chamada principal**, para o Banner principal
poder ocupar o topo da Home.

**Why P1**: Enquanto o hero for indelével, o carrossel nunca é a abertura da loja — que é o pedido.

**Acceptance Criteria**:

1. WHEN a Adri desliga a Chamada principal e há **outra** seção ativa THEN o sistema SHALL aceitar, e
   a loja SHALL deixar de desenhar o hero.
2. WHEN a Adri remove a Chamada principal e há **outra** seção ativa THEN o sistema SHALL aceitar, e
   remover junto os itens dela (o `on delete cascade` que já existe).
3. WHEN a Adri tenta desligar a **última** seção ativa da Home THEN o banco SHALL recusar com
   `errcode = 23514` e mensagem legível, **qualquer que seja o tipo** dela.
4. WHEN a Adri tenta remover a **última** seção ativa da Home THEN o banco SHALL recusar do mesmo
   jeito.
5. WHEN a recusa acontece THEN o painel SHALL mostrar o motivo do banco, **sem** reescrevê-lo — a
   mensagem tem um dono só.
6. WHEN a migration é aplicada THEN ela SHALL **remover** `guard_hero_home_section` e o gatilho dele,
   criar o guarda generalizado no lugar, e SHALL ser **idempotente** (aplicar duas vezes não muda o
   resultado).
7. WHEN a migration é aplicada THEN ela SHALL **não** alterar nenhuma linha já semeada de
   `home_sections` — a Home de quem já a tem continua idêntica.

**Independent Test**: numa Home com hero + newsletter, desligar o hero (aceita), depois desligar a
newsletter (recusada, com motivo); reativar e apagar o hero (aceita).

---

### P2: O painel diz o que a loja vai fazer

**User Story**: Como Adri, quero que o painel **avise** o que a loja vai mostrar e o que não vai, para
eu não descobrir pela cliente.

**Why P2**: Sem isso a feature funciona, mas erra em silêncio — que é exatamente o defeito que a `39`
gastou uma reescrita inteira para tirar do menu.

**Acceptance Criteria**:

1. WHEN um slide tem arte de um dispositivo só THEN o painel SHALL avisar **qual** falta e que a loja
   vai reaproveitar a do outro, usando o **mesmo predicado** que a loja usa (`P1-C.6`).
2. WHEN o destino de um slide foi apagado THEN o painel SHALL nomear o que se perdeu pelo rótulo
   congelado (`«Prata 925» foi apagada`) e dizer que o slide não vai aparecer.
3. WHEN a seção não vai renderizar THEN a linha da lista SHALL mostrar o motivo devolvido por
   `resolveHomeSections`, e não uma frase escrita na tela.
4. WHEN a seção tem mais slides do que o teto (estado alcançável por escrita direta) THEN o painel
   SHALL avisar quantos **não aparecem** e permitir apagá-los — estado gravado que nenhuma tela
   mostra é como dado errado sobrevive por meses.
5. WHEN a Adri edita a seção THEN a **prévia** SHALL ser a **própria loja num iframe** — o painel
   SHALL **não** ganhar um segundo desenho do carrossel (`previaUnica.test.ts` cobre as features `25`
   e `39`, e passa a cobrir esta).

**Independent Test**: subir só a arte do computador — o painel avisa; apagar a coleção de destino em
`/admin/categorias` e voltar — o painel nomeia a coleção apagada.

---

### P3: Voltar ao estado anterior num clique

**User Story**: Como Adri, quero **desligar a seção** sem apagar os slides, para reusar a campanha
depois.

**Why P3**: Já é o comportamento do `active` de qualquer seção; entra como AC só para não ser perdido
por acidente no editor novo.

**Acceptance Criteria**:

1. WHEN a Adri desliga uma seção "Banner principal" THEN os slides SHALL permanecer gravados, e
   religar SHALL trazê-los de volta na mesma ordem.

---

## Edge Cases

- WHEN a seção está ligada e **sem nenhum slide** THEN ela SHALL não renderizar, com motivo
  `«Não vai aparecer: nenhum banner enviado.»` na linha do painel.
- WHEN a arte responde 404 no navegador THEN a vaga SHALL manter a altura declarada e mostrar o
  `alt` — sem colapso e sem deslocar o resto da página.
- WHEN a leitura das seções falha THEN a Home SHALL cair no piso `DEFAULT_HOME_COMPOSITION`
  (`HOME-07`), que **não** inclui este tipo — piso é rede de segurança, não composição.
- WHEN dois slides apontam para o mesmo destino THEN o sistema SHALL aceitar — repetir destino é
  curadoria legítima (duas artes da mesma coleção).
- WHEN o `href` digitado é um caminho que a loja não serve THEN o sistema SHALL recusar pela régua que
  já existe, **sem** uma segunda redação dela.
- WHEN `config.width` chega com valor desconhecido (escrita direta) THEN a loja SHALL desenhar como
  `full` em vez de quebrar.
- WHEN a linha de `home_sections` tem um tipo que este código não conhece THEN a Home SHALL **pular**
  a seção, nunca derrubar a página (comportamento que já existe).
- WHEN a seção `full` é a primeira da Home THEN ela SHALL encostar no cabeçalho sem faixa de fundo
  entre os dois.
- WHEN a Adri troca a arte de um slide THEN a arte anterior SHALL continuar no Storage (não há
  limpeza — declarado em *Out of Scope*).

---

## Requirement Traceability

| ID | História | Fase | Status |
| --- | --- | --- | --- |
| BNR-01 | P1-A: bloco na bandeja, sem "em breve" | Design | Pending |
| BNR-02 | P1-A: nasce desligado | Design | Pending |
| BNR-03 | P1-A: repetível | Design | Pending |
| BNR-04 | P1-A: qualquer posição | Design | Pending |
| BNR-05 | P1-A: teto de 30 seções vale | Design | Pending |
| BNR-06 | P1-A: catálogo TS == `check` da migration | Design | Pending |
| BNR-07 | P1-B: quatro campos por slide | Design | Pending |
| BNR-08 | P1-B: destino coleção/peça/endereço, no máximo um | Design | Pending |
| BNR-09 | P1-B: `label_snapshot` do destino | Design | Pending |
| BNR-10 | P1-B: recusa sem arte nenhuma | Design | Pending |
| BNR-11 | P1-B: recusa sem `alt` | Design | Pending |
| BNR-12 | P1-B: recusa sem destino, régua existente | Design | Pending |
| BNR-13 | P1-B: teto de 6 slides, recusa por motivo | Design | Pending |
| BNR-14 | P1-B: aviso de proporção, grava assim mesmo | Design | Pending |
| BNR-15 | P1-B: falha de envio preserva o rascunho | Design | Pending |
| BNR-16 | P1-B: ordem dos slides = `position` | Design | Pending |
| BNR-17 | P1-C: renderiza na posição da seção | Design | Pending |
| BNR-18 | P1-C: `full` sem container e sem rolagem horizontal | Design | Pending |
| BNR-19 | P1-C: `wide` no container, com raio | Design | Pending |
| BNR-20 | P1-C: `width` ausente = `full` | Design | Pending |
| BNR-21 | P1-C: arte por dispositivo, uma só baixada | Design | Pending |
| BNR-22 | P1-C: herança de arte com **um dono** em `core` | Design | Pending |
| BNR-23 | P1-C: rendição pelo dono único | Design | Pending |
| BNR-24 | P1-C: 1º slide `eager` + `fetchpriority=high` | Design | Pending |
| BNR-25 | P1-C: 1º slide sem `opacity: 0` | Design | Pending |
| BNR-26 | P1-C: vaga com altura conhecida (sem CLS) | Design | Pending |
| BNR-27 | P1-C: clique navega; externo abre seguro | Design | Pending |
| BNR-28 | P1-C: slide com destino fora do ar é pulado | Design | Pending |
| BNR-29 | P1-C: seção vazia não renderiza, com motivo | Design | Pending |
| BNR-30 | P1-D: gira a cada 6 s com 2+ slides | Design | Pending |
| BNR-31 | P1-D: 1 slide = estático, sem controles | Design | Pending |
| BNR-32 | P1-D: pausa em hover e em foco | Design | Pending |
| BNR-33 | P1-D: `prefers-reduced-motion` não gira | Design | Pending |
| BNR-34 | P1-D: bolinhas rotuladas | Design | Pending |
| BNR-35 | P1-D: setas no computador, rotuladas | Design | Pending |
| BNR-36 | P1-D: alvo de toque ≥ 44 px | Design | Pending |
| BNR-37 | P1-D: arrasto troca slide sem sequestrar a rolagem | Design | Pending |
| BNR-38 | P1-D: anúncio educado + `aria-roledescription` | Design | Pending |
| BNR-39 | P1-D: slide oculto sai do teclado e do leitor | Design | Pending |
| BNR-40 | P1-E: desligar o hero é aceito | Design | Pending |
| BNR-41 | P1-E: remover o hero é aceito | Design | Pending |
| BNR-42 | P1-E: recusa ao desligar a última ativa | Design | Pending |
| BNR-43 | P1-E: recusa ao remover a última ativa | Design | Pending |
| BNR-44 | P1-E: painel mostra o motivo do banco, sem reescrever | Design | Pending |
| BNR-45 | P1-E: migration troca o guarda, idempotente | Design | Pending |
| BNR-46 | P1-E: migration não altera linha semeada | Design | Pending |
| BNR-47 | P2: aviso de arte reaproveitada, mesmo predicado | - | Pending |
| BNR-48 | P2: destino apagado é nomeado | - | Pending |
| BNR-49 | P2: motivo da seção vem de `resolveHomeSections` | - | Pending |
| BNR-50 | P2: aviso de slides excedentes | - | Pending |
| BNR-51 | P2: prévia é a loja no iframe, sem segundo desenho | - | Pending |
| BNR-52 | P3: desligar preserva os slides | - | Pending |

**Coverage:** 52 requisitos · 0 mapeados para tarefas · 52 sem tarefa ⚠️ (a fase de Tasks ainda não
rodou).

---

## Varredura das dimensões implícitas

Obrigatória em feature Large: cada dimensão vira requisito **ou** um `N/A porque…` explícito.

| Dimensão | Resolução |
| --- | --- |
| Validação e limites de entrada | `BNR-10`..`BNR-14` (arte, `alt`, destino, teto de 6, proporção). Tipo e tamanho de arquivo herdados de `validateImageFile`, no motor único de upload |
| Falha e falha parcial | `BNR-15` (envio falha, rascunho preservado). A gravação da seção já é "apaga e reescreve a lista inteira" — falha deixa o rascunho intacto na tela (`HOME-14`) |
| Idempotência / repetição | `BNR-45` (migration idempotente). A gravação de itens já é idempotente por construção: `curateSection` reescreve a lista, não faz merge |
| Fronteiras de autorização | N/A porque as políticas RLS de `home_sections` e `home_section_items` já exigem `has_role(auth.uid(), 'admin')` no `using` **e** no `with check`, e a coluna nova herda a política da tabela. O requisito é **não afrouxar**: nenhum `grant` novo pode alcançar `anon` |
| Limite de requisições | N/A porque não há chamada a serviço externo por cliente — a arte é servida pelo Storage e o resto é leitura de tabela |
| Concorrência e ordenação | Ordem dos slides em `BNR-16`. A corrida de dois administradores está **registrada e aceita** na tabela de suposições |
| Ciclo de vida do dado | `BNR-09`/`BNR-28`/`BNR-48`: destino apagado vira órfão por `on delete set null`, a loja pula e o painel nomeia. Apagar a seção leva os slides (`on delete cascade`). Arte órfã no Storage: **declarada fora de escopo** |
| Observabilidade | N/A porque o projeto não tem camada de log na loja nem no painel; toda falha vira recusa em tela, com motivo legível |
| Falha de dependência externa | `BNR-15` (o Storage recusa o envio) e o caso de borda da arte que responde 404 (a vaga mantém a altura e mostra o `alt`) |
| Integridade de transição de estado | `BNR-40`..`BNR-44`: o guarda generalizado no banco é a transição protegida — desligar ou remover só é possível enquanto sobrar uma seção ativa |

---

## O que esta feature toca (mapa para a fase de Design)

Não é desenho — é o inventário do que a spec obriga a mexer, para a fase seguinte não descobrir tarde.

| Camada | O que muda |
| --- | --- |
| `supabase/migrations` | tipo novo no `check`; coluna `home_section_items.image_mobile_url`; troca do guarda do hero pelo guarda da última seção ativa |
| `packages/core/home` | `HomeSectionType`, `HOME_SECTION_TYPES`, rótulo, vagas de proporção, teto de slides, `SOURCE_DRIVEN` + motivo de seção vazia, `ResolvedItem` com a arte de celular |
| `packages/core/media` | o **dono único** do predicado "arte desta superfície, com recuo para a da outra" — `menuBannerArt` passa a delegar nele em vez de o reescrever |
| `apps/store` | widget do carrossel + registro em `HOME_SECTION_RENDERERS` |
| `apps/backoffice` | editor do bloco + recusa própria; `DraftItem` e a gravação de itens ganham a arte de celular |
| Guardas | `homeSections.test.ts` (catálogo × `check`, guarda do banco), `previaUnica.test.ts` (sem segundo desenho), `touchTarget`, `renditionSingleOwner`, e um guarda novo de dono único para o predicado da arte |

---

## Success Criteria

- [ ] A Adri sobe duas artes, escolhe uma coleção e publica um banner de campanha **sem** abrir o
      código, em menos de 2 minutos.
- [ ] Com o carrossel ligado no topo em substituição ao hero, a Home mantém em 390 × 844, Slow 4G e
      CPU 4×: **CLS ≤ 0,1** e LCP **não pior** que a medição da feature `40` — a prova é do navegador,
      porque jsdom devolve 0 para toda medida de layout.
- [ ] Nenhum guarda existente é afrouxado para a feature passar; os que mudam de régua
      (`homeSections.test.ts`, no guarda do banco) mudam **junto com a regra** e ganham asserção nova.
- [ ] `packages/core/src/payment/**` não tem uma linha alterada, conferido por `git diff --name-only`.
- [ ] Baselines de lint, tipos e testes sem regressão, medidas **um workspace por vez** e com exit
      code capturado fora de pipe.
