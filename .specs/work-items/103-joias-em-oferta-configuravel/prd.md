> Gerado pela descoberta e ratificado no gate em 2026-11-14.

# Joias em oferta configurável — título, descrição, campanha e peças escolhidas

## Problema
O bloco "Joias em oferta" da Home hoje se monta sozinho a partir da campanha de desconto em vigência: o
título é o nome da campanha, o texto é uma frase fixa com os percentuais e as peças são as quatro
primeiras da campanha. A dona não consegue dizer com as próprias palavras o que o bloco apresenta, não
consegue preparar o bloco de uma campanha que ainda vai começar e não consegue escolher quais peças da
campanha aparecem na Home.

## Objetivo
Em `/admin/home`, no bloco "Joias em oferta", a dona escreve o título e a descrição, escolhe a campanha e
escolhe as peças daquela campanha que aparecem na Home, conferindo o resultado na prévia.

## Usuários e papéis
- Dona da loja (administra o painel): configura o bloco.
- Cliente da loja: vê o bloco na Home durante a vigência da campanha.

## Escopo
### Dentro
- Título e descrição do bloco, editáveis no painel.
- Escolha da campanha entre as campanhas em vigência e agendadas.
- Mais de um bloco "Joias em oferta" na Home, no máximo um por campanha — para deixar pronto o bloco da próxima campanha.
- Escolha e ordenação das peças, limitada às peças marcadas na campanha escolhida.
- O bloco na loja passa a usar o título, a descrição, a campanha e as peças escolhidas.
- Avisos no painel quando a campanha escolhida não está valendo ou quando uma peça escolhida deixou a
  campanha ou saiu do ar.
- O título, a descrição e as peças de um bloco preparado ficam guardados antes do início da campanha; a loja não os mostra até a campanha começar, mas eles não são segredo. [prd-review r1: texto-do-bloco-agendado-legivel-antes-do-inicio]
- Conferir e, se confirmado, consertar a loja (e a prévia) mostrando campanha fora de vigência a uma sessão de admin (UC-06).

### Fora
- Mudar o cadastro de campanhas, o selo, os preços, a vitrine `/ofertas` ou o cupom.
- Escolher peça que não está marcada na campanha.

## Casos de uso

### UC-01 · Escrever o título e a descrição do bloco
A dona abre o bloco "Joias em oferta" em `/admin/home` e escreve o título e a descrição que a cliente vai
ler na Home.

**Critérios de aceite**
- CA-01.1 O editor do bloco tem um campo de título e um de descrição, e a prévia mostra o texto digitado antes de salvar. [pedido]
- CA-01.2 Salvar mostra o recibo "Salvo" e não desmonta a prévia, como nos outros editores da Home. [código: apps/backoffice/CLAUDE.md › `VIV-05`]
- CA-01.3 Com o título vazio, o bloco mostra o nome da campanha (o comportamento de hoje); com a descrição vazia, mostra a frase dos percentuais de hoje. [código: apps/store/src/widgets/campaign-offers/ui/CampaignOffers.tsx:63-66] 
- CA-01.4 O rótulo acima do título continua sendo o texto do selo da campanha. [código: CampaignOffers.tsx:58]
- CA-01.6 O título aceita até 60 caracteres e a descrição até 160; acima disso, salvar é recusado com o motivo e o número. [gate da descoberta: P-06]
- CA-01.5 Falha de gravação mantém o que a dona digitou na tela. [código: apps/backoffice/src/features/home-composition/model/sectionDraft.ts:1-5]

### UC-02 · Escolher a campanha do bloco
A dona escolhe, numa lista, qual campanha o bloco apresenta.

**Critérios de aceite**
- CA-02.1 A lista oferece as campanhas em vigência e as agendadas, na ordem do início, cada uma com o estado e a vigência. Encerradas e desligadas não aparecem como opção; a campanha atual do bloco aparece escolhida mesmo encerrada ou desligada, com o estado. [prd-review r1: seletor-com-escolha-fora-da-lista-e-campanha-ja-usada] [código: apps/backoffice/src/entities/campaign/model/campaign.ts:37-44; gate: Q-01, P-03]
- CA-02.2 Durante a vigência da campanha escolhida, o bloco aparece na loja com os percentuais dela; fora da vigência (antes do início, depois do fim, ou desligada), o bloco não aparece. A loja decide comparando a campanha escolhida com a que o banco entrega como vigente. [gate: Q-01, P-04]
- CA-02.3 A linha do bloco na lista da Home diz qual campanha está escolhida e o estado dela; se ela não está em vigência, diz que o bloco não vai aparecer e por quê. [código: apps/backoffice/CLAUDE.md › `HOME-09`]
- CA-02.4 Todo bloco "Joias em oferta" tem uma campanha escolhida para aparecer na loja; o bloco sem campanha não aparece e o painel pede a escolha. O bloco acrescentado pela bandeja nasce desligado e sem campanha; o editor só salva com uma campanha escolhida, e enquanto não houver campanha a linha do bloco diz que ele não aparece na loja e pede a escolha (ligá-lo não o faz aparecer). [gate: Q-10 (c); prd-review r1: campanha-102-e-103-publicadas-juntas, bloco-novo-nasce-sem-campanha-pela-bandeja]
- CA-02.6 A Home pode ter mais de um bloco "Joias em oferta", cada um com a sua campanha. Uma campanha que já tem outro bloco aparece desabilitada na lista, dizendo a posição e o título desse bloco; se mesmo assim duas gravações colidirem, salvar é recusado com a mesma frase. [gate: Q-06, P-07; prd-review r1: seletor-com-escolha-fora-da-lista-e-campanha-ja-usada]
- CA-02.5 Se a campanha escolhida for apagada, o bloco fica sem campanha e não aparece na loja; a linha do bloco e o editor dizem que ele está sem campanha e pedem a escolha — a mesma mensagem do bloco que ainda não teve campanha. [prd-review r1: campanha-apagada-indistinguivel-de-sem-campanha]

### UC-03 · Escolher as peças da campanha
A dona escolhe quais peças da campanha aparecem no bloco e em que ordem.

**Critérios de aceite**
- CA-03.1 A busca de peças do bloco mostra só as peças marcadas na campanha escolhida; sem campanha escolhida, a busca não está disponível e a tela diz por quê. [pedido]
- CA-03.2 As peças escolhidas aparecem numa lista que se reordena arrastando, com posição, nome e remover; a loja as mostra nessa ordem. [código: apps/backoffice/CLAUDE.md › editor de "Produtos em destaque"; FeaturedProducts.tsx:13-16]
- CA-03.3 Acima do teto de peças, salvar é recusado com o motivo e o número. O teto é 12 peças, como em "Produtos em destaque". Com peças escolhidas, a fileira mostra todas na ordem da dona: no celular rola na horizontal; no computador continua uma fita que rola, com as setas. Enquanto carrega, reserva uma vaga por peça escolhida. Sem peça escolhida, continua com as quatro primeiras da campanha, como hoje. [gate: Q-03; prd-review r1: doze-pecas-na-fileira-do-bloco]
- CA-03.4 Peça já escolhida aparece desabilitada na busca, dizendo que já está no bloco. [código: ProductSearchField.tsx:52-59]
- CA-03.5 Sem nenhuma peça escolhida, o bloco mostra as primeiras peças da campanha automaticamente, como hoje. [código: useCampaignOfferProducts.ts:32-49; gate: Q-04]
- CA-03.6 Trocar a campanha com peças já escolhidas tira da lista as peças que não estão marcadas na nova campanha e diz quais saíram; as que estão marcadas nas duas ficam. Nada é gravado antes de salvar, e Cancelar desfaz a troca. [prd-review r1: troca-de-campanha-quais-pecas-saem]

### UC-04 · Peça escolhida que deixa de valer
**Critérios de aceite**
- CA-04.1 Peça escolhida que saiu do ar (despublicada ou apagada) não aparece na loja e o painel conta "N das M saíram do ar", nomeando a peça. [código: useAdminResolvedHome.ts:124-142; packages/core/src/home/types.ts:232-238]
- CA-04.2 Peça escolhida que foi tirada da campanha não aparece no bloco, e a vaga fica vazia — a loja não completa com outra peça. [código: apps/backoffice/CLAUDE.md › "A vaga que sobra fica VAZIA, e o painel AVISA"]
- CA-04.3 Ao abrir o editor, depois de ler as peças da campanha, as peças escolhidas que foram tiradas da campanha saem da lista, e o editor diz quais saíram e que a remoção vale quando salvar (o editor abre como 'alterado'). Se essa leitura falhar, nenhuma peça sai e o editor diz que não conseguiu conferir a campanha. A peça apagada do catálogo sai da lista do mesmo jeito, e o editor a nomeia como apagada. [gate: Q-08; prd-review r1: remocao-ao-abrir-vira-pendencia-e-precisa-de-leitura]
- CA-04.4 Peça marcada cujo preço a campanha não baixa não aparece no bloco, como não aparece na vitrine; o editor e a linha do bloco dizem quais peças escolhidas não aparecem por esse motivo. [código: .specs/work-items/102-desconto-de-campanha/spec.md:416 (I-02); prd-review r1: peca-que-a-campanha-nao-barateia-some-sem-aviso]
- CA-04.6 Os cartões de percentual continuam no bloco, como hoje, com ou sem peças escolhidas. [gate: Q-09]
- CA-04.5 Se todas as peças escolhidas deixaram de valer, o bloco mostra os cartões de percentual sem a fileira de peças. [código: CampaignOffers.tsx:95-96, 23-24]

### UC-05 · Conferir na prévia
**Critérios de aceite**
- CA-05.1 Com a campanha escolhida em vigência, a prévia mostra o bloco com o título, a descrição e as peças do rascunho, antes de salvar. [código: apps/backoffice/CLAUDE.md › A ponte da prévia]
- CA-05.2 Com uma campanha agendada escolhida, o editor avisa que a prévia só mostra o bloco a partir do início da campanha. [código: supabase/migrations/20261130120000_102-campanhas.sql:245-248] [gate: Q-07 — o aviso basta]

### UC-06 · A loja só mostra campanha em vigência, também para quem é admin
Defeito possível da WI 102, levantado na descoberta (X-01).

**Critérios de aceite**
- CA-06.1 Com uma sessão de admin aberta na loja ou na prévia, o bloco, o selo e os preços mostram só a campanha em vigência — nunca uma agendada, encerrada ou desligada. Primeiro se prova o defeito no ambiente local; confirmado, se conserta nesta WI. [código: apps/store/src/entities/campaign/api/useLiveCampaign.ts:47-55; supabase/migrations/20261130120000_102-campanhas.sql:251-255; gate: X-01]

## Requisitos não-funcionais
- RNF-01 O bloco sem campanha valendo não reserva espaço nem desenha nada; carregando, também não. [código: CampaignOffers.tsx:17-20; spec 102 I-10]
- RNF-02 A falha da leitura das peças não derruba a Home nem os cartões de percentual. [código: CampaignOffers.tsx:23-24; FeaturedProducts.tsx:18-19]
- RNF-03 A loja nunca decide a vigência pelo relógio do aparelho da cliente. [código: useLiveCampaign.ts:1-6; prd 102 RN-03]
- RNF-04 Em 390 px o bloco e o editor não rolam na horizontal; o editor continua usável com a fonte do sistema a 200 %. [código: prd 102 RN-15; apps/store/CLAUDE.md › Mobile]
- RNF-05 Tom memorial: os textos fixos novos do bloco e do editor não usam urgência, contagem regressiva, escassez nem exclamação. [código: campaignOffers.ts:7-8; prd 102 RN-14]
- RNF-06 Título e descrição têm teto de caracteres que caiba em 390 px sem cortar. Título até 60 caracteres e descrição até 160. [gate: P-06]
- RNF-07 O editor não desenha vitrine: a lista é lista, e quem mostra como fica é a prévia. [código: apps/backoffice/CLAUDE.md › `AD-019`, `previaUnica.test.ts`]
- RNF-08 Os campos e o seletor têm rótulo acessível; a recusa é anunciada como alerta, com o motivo. [conhecimento]

## Expectativas de UI/UX
Nenhuma fonte de design nova informada. Referência do bloco na loja: protótipo da WI 102,
"Black Friday - Home.html" (https://claude.ai/design/p/4abe021d-d77e-4fe7-affd-524180315fa3?file=Black+Friday+-+Home.html).
Molde do editor no painel: "Produtos em destaque" (FormCards Conteúdo e Peças escolhidas).

## Cenários preliminares
| Cenário | Tipo | Risco |
| ------- | ---- | ----- |
| Campanha em vigência escolhida, título, descrição e 3 peças: a Home mostra os textos e as 3 peças na ordem | happy_path | P0 |
| Bloco acrescentado pela bandeja: nasce desligado e sem campanha; o editor recusa salvar sem campanha | erro | P1 |
| Sessão de admin aberta na loja com campanha agendada: bloco, selo, vitrine e preço mostram só a em vigência | seguranca | P0 |
| Abrir o editor com a leitura das marcações falhando: nenhuma peça é tirada | erro | P1 |
| Campanha agendada escolhida: nada na loja antes do início, e o bloco aparece sozinho no início | alternativo | P0 |
| A campanha escolhida termina ou é desligada: o bloco some, e a linha do painel diz por quê | alternativo | P0 |
| Outra campanha entra em vigência enquanto a escolhida está agendada: o bloco não mostra a outra | borda | P1 |
| Peça escolhida tirada da campanha: some do bloco, vaga vazia, o painel avisa | erro | P1 |
| Peça escolhida despublicada ou apagada: some, e o painel nomeia a peça | erro | P1 |
| Peça marcada cujo "de/por" já é menor que o preço da campanha: não aparece | borda | P2 |
| Campanha escolhida apagada: o bloco some da loja sem quebrar, e o painel pede outra campanha | borda | P1 |
| Trocar a campanha com peças escolhidas: aviso, e as peças antigas saem | alternativo | P1 |
| Peça repetida ou acima do teto: salvar recusado com o motivo | erro | P1 |
| Título vazio e descrição vazia: valem os padrões da campanha | borda | P1 |
| Prévia com campanha em vigência mostra o rascunho; com campanha agendada, o aviso | alternativo | P1 |
| Gravação de campanha e peças: a peça escolhida chega ao banco (probe, `AD-012`) | seguranca | P0 |
| Visitante (sem papel) não consegue gravar a seção nem ler campanha agendada | seguranca | P0 |
| 390 px e fonte 200 %: editor e bloco sem rolagem horizontal | performance | P1 |
| Fileira de peças escolhidas: uma leitura de produtos, sem esqueleto a mais | performance | P2 |

## Decisões do gate da descoberta (2026-11-14)
| Item | Resposta |
| ---- | -------- |
| Q-01 | (a) Em vigência + agendadas; fora da vigência o bloco não aparece na loja e o painel diz por quê |
| Q-02 | (a) O título substitui o nome da campanha e a descrição substitui a frase dos percentuais; vazios voltam ao texto de hoje; o rótulo do selo continua acima |
| Q-03 | (b) Até 12, como 'Produtos em destaque' |
| Q-04 | (a) Sim: as primeiras peças da campanha, como hoje |
| Q-05 | (a) Acompanha a campanha em vigência, como hoje — **substituída pela Q-10** |
| Q-06 | (b) Um por campanha, para deixar o da próxima pronto |
| Q-07 | (a) Sim, o aviso basta |
| Q-08 | (b) Tira da lista ao abrir o editor |
| Q-09 | (a) Sim, como hoje |
| P-01, P-02, P-03, P-04, P-05, P-06, P-08 | ratificadas (ver `discovery.md`) |
| P-07 | recusada: "usuário pode selecionar mais de 1 se quizer. Mas no máximo um a cada campanha" |
| X-01 | Conferir e consertar nesta WI (a sessão de admin na loja e na prévia ver campanha fora de vigência) |
| Q-10 | (c) O bloco sem campanha deixa de existir: o de hoje passa a apontar para a campanha em vigência na migration, e todo bloco novo exige escolher a campanha — **a gravação na migration foi superada pelo F3 do prd-review r1** (a migration não grava dado; o bloco de hoje fica sem campanha até a dona escolher, CA-02.4) (pergunta nova, aberta porque a Q-05 e a Q-06 juntas faziam a Home mostrar a mesma campanha duas vezes) |

---
Fonte: rascunho do `wi-discovery` em 2026-11-14, a partir do pedido em `item.md`.

## Histórico de revisões
- r1 · 2026-11-14 · campanha-apagada-indistinguivel-de-sem-campanha, bloco-novo-nasce-sem-campanha-pela-bandeja, campanha-102-e-103-publicadas-juntas, doze-pecas-na-fileira-do-bloco, remocao-ao-abrir-vira-pendencia-e-precisa-de-leitura, troca-de-campanha-quais-pecas-saem, seletor-com-escolha-fora-da-lista-e-campanha-ja-usada, texto-do-bloco-agendado-legivel-antes-do-inicio, peca-que-a-campanha-nao-barateia-some-sem-aviso
- handoff · 2026-11-16 · a linha Q-10 das Decisões do gate anotada como superada pelo F3 (D-02 do handoff, `spec.md`)
