# PRD Tech Review — Registro

**Work Item**: 90 — Loja ao vivo, Fases 2 e 3
**PRD**: `.specs/work-items/90-loja-ao-vivo-presenca/prd.md` · origem: Claude Design, projeto `a780eec8-8aba-4d6e-8b4c-2c485e2750c7`, `prompts/PRD - Loja ao vivo.md` (não editado)

Registro local do PRD Tech Review deste Work Item: uma seção por rodada, a mais recente no fim.

---

## Rodada r1

**Data**: 2026-11-01 · **PRD revisado**: versão 1 · **Gate**: página (2 itens). A pedido do humano ("Quero sua ajuda para resolver as questões em aberto do PRD, deixe apenas as que de fato vão precisar de uma decisão mais específica"), 23 achados foram resolvidos pelo agente com a sugestão do parecer, e só 2 itens foram à página.

### Envelope `prd-review/v1`

```json
{
 "schema": "prd-review/v1",
 "work_item_ref": "90",
 "round": 1,
 "prd_version": 1,
 "reviewed_at": "2026-11-01T21:01:41-03:00",
 "skill": "wi-workflow/prd-tech-review",
 "skill_version": "4.0.0",
 "summary": {
  "verdict": "changes_requested_gaps",
  "blocking": 0,
  "gaps": 11,
  "questions": 2,
  "tech_decisions": 10,
  "scenarios": [
   {
    "title": "Três pessoas navegam a loja com consentimento; o cartão do Início mostra 3 pessoas e a Loja ao vivo mostra o mesmo total, com Olhando + Sacola + Checkout somando 3",
    "type": "happy_path",
    "risk": "P0"
   },
   {
    "title": "Uma pessoa chega pelo link da bio do Instagram aberto no navegador do próprio app e aparece na faixa certa de 'De onde vieram'",
    "type": "alternativo",
    "risk": "P1"
   },
   {
    "title": "Uma pessoa fecha a aba da loja e some do total em até 5 minutos; quem só deixou a aba em segundo plano também sai",
    "type": "borda",
    "risk": "P1"
   },
   {
    "title": "A loja ainda não está no domínio próprio: o cartão não afirma 'Ninguém na loja agora' como se a loja estivesse vazia",
    "type": "borda",
    "risk": "P1"
   },
   {
    "title": "Muitas clientes na mesma rede de celular (mesmo endereço de saída) navegam ao mesmo tempo, e nem a presença nem a contagem diária de visitas deixam de contar ninguém",
    "type": "performance",
    "risk": "P1"
   },
   {
    "title": "Uma pessoa recusa estatísticas ou abre a loja com o 'não contar' e nunca aparece em nenhum número, nem na presença nem em 'Com sacola'",
    "type": "seguranca",
    "risk": "P0"
   },
   {
    "title": "Duas compras pagas nos últimos 30 minutos e ninguém na loja agora: a linha 'Compraram' aparece sem barra quebrada nem divisão por zero",
    "type": "borda",
    "risk": "P2"
   },
   {
    "title": "Só o Guia de envio do material tem gente olhando: a seção mostra a linha do Guia e não diz que ninguém está olhando",
    "type": "borda",
    "risk": "P2"
   },
   {
    "title": "A leitura da presença falha enquanto a de Acessos responde: cada seção mostra o seu próprio estado, sem esconder a outra",
    "type": "erro",
    "risk": "P1"
   },
   {
    "title": "Na Semana, Visitas, Com sacola, Vendas e Conversão comparam com a semana anterior até o mesmo ponto, e nenhuma variação aparece quando a semana anterior não foi contada inteira",
    "type": "alternativo",
    "risk": "P1"
   },
   {
    "title": "Uma conta sem papel de administração abre /ao-vivo e cai na recusa do app, sem ver nenhum número da presença",
    "type": "seguranca",
    "risk": "P0"
   }
  ]
 },
 "findings": [
  {
   "id": "F1",
   "key": "politica-de-privacidade-presenca-e-retencao",
   "category": "gap",
   "owner": "negocio",
   "severity": "high",
   "title": "A Política de Privacidade hoje afirma o contrário do que a presença vai guardar, e o PRD não diz o texto novo nem que a aprovação da Adri precede a publicação",
   "anchor": {
    "quote": "Atualizar a Política de Privacidade da loja para mencionar a medição de presença.",
    "prefix": "agregados por minuto vivem 1 hora.\n- ",
    "suffix": "\n\n## 8. Não funcionais",
    "section": "7. Privacidade (LGPD)"
   },
   "body": "O parágrafo vigente (`apps/store/src/pages/PrivacyPolicyPage.tsx:194-200`, texto fixado palavra por palavra em `apps/store/src/pages/__tests__/politicaDoContador.test.ts:31-32`) diz que o servidor registra 'esse código, a data e a hora cheia da sua primeira visita naquele dia — e nada mais: não guardo o seu IP junto dessa contagem, **nem as páginas que você viu**. Esses registros são apagados **depois de 8 dias**'. As Fases 2 e 3 guardam o tipo de página, a joia vista, a quantidade de itens da sacola, a faixa de origem e o tipo de aparelho (§6.2), e o `vs semana anterior` (`BL-056`, `.specs/BACKLOG.md:2103-2106`) exige guardar as visitas por 14 dias. As duas frases ficam falsas. Na Fase 1 a feature 83 tratou isso como pré-condição do deploy, com o texto escrito num apêndice para a Adri aprovar (`.specs/features/83-loja-ao-vivo/spec.md:64` e Apêndice A); o PRD só diz 'mencionar'. Sem o texto escrito, a implementação não tem o que o guarda da política conferir.",
   "suggestion": "Atualizar a Política de Privacidade da loja antes da publicação, com texto aprovado pela Adri, dizendo: que, enquanto a loja está aberta na tela, o navegador avisa a cada minuto que a pessoa está na loja; que, por até 30 minutos, fica registrado só o tipo de página que ela vê (joia, lista, sacola, checkout, guia), qual joia, quantos itens tem na sacola, de que tipo de lugar ela veio (Instagram, Google, WhatsApp, direto ou outros) e se usa celular, computador ou tablet — nunca o IP, o endereço completo da página ou de onde veio; que depois disso sobram só contagens sem identificação; e que os registros de visita passam a ser apagados depois de 14 dias. Sem essa aprovação, nada das Fases 2 e 3 vai ao ar.",
   "questions": []
  },
  {
   "id": "F2",
   "key": "historico-alem-de-7-dias-contradiz-escopo",
   "category": "gap",
   "owner": "negocio",
   "severity": "medium",
   "title": "O Fora do escopo proíbe o que o escopo decidido em 2026-11-01 pede (a semana anterior)",
   "anchor": {
    "quote": "Histórico além de 7 dias (a poda da feature 71 continua valendo).",
    "prefix": "combina mal com o tom memorial. Pode ser reavaliada como opção desligada por padrão.\n- ",
    "suffix": "\n\n## 12. Perguntas abertas",
    "section": "11. Fora do escopo"
   },
   "body": "A poda vigente guarda hoje e os 7 dias anteriores (`supabase/migrations/20261021120000_71-visitas-unicas.sql:127`, `delete … where day < p_dia - 7`). A semana anterior inteira começa na segunda passada, até 13 dias atrás. O item 90 (`item.md`, escopo) põe 'vs semana anterior' (`BL-056`) dentro, e o próprio LAV-51 já escreve '−5% vs semana anterior'. A feature 83 ficou sem variação na Semana justamente por esta linha (`.specs/features/83-loja-ao-vivo/spec.md:51,69`). Resposta única: a linha muda.",
   "suggestion": "Histórico além de 14 dias. As visitas passam a ficar guardadas por 14 dias, o necessário para comparar a semana atual com a anterior; nada além disso.",
   "questions": []
  },
  {
   "id": "F3",
   "key": "nota-do-checkout-promete-o-que-o-painel-nao-faz",
   "category": "gap",
   "owner": "negocio",
   "severity": "high",
   "title": "A nota do checkout promete que a sacola 'aparece como abandonada' depois de N horas, e nada no sistema faz essa passagem",
   "anchor": {
    "quote": "Se a compra não fechar em {threshold_hours} horas, a sacola aparece como abandonada no Backoffice.",
    "prefix": "aparece a nota: \"Alguém está no checkout agora. ",
    "suffix": "\" O número vem de `store_settings.abandoned_cart.threshold_hours`.",
    "section": "5.2 B. O que estão fazendo (Fase 2)"
   },
   "body": "`threshold_hours` só é lido pelo campo que o edita no painel (`apps/backoffice/src/features/settings/ui/SalesSection.tsx:163-165`); nenhuma migration, edge function ou tela muda uma sacola de `active` para `abandoned` por tempo (a única troca de status é manual, `apps/backoffice/src/entities/abandoned-cart/api/useAdminAbandonedCarts.ts:97-98`). A sacola entra em 'Carrinhos abandonados' (nome real no menu, `apps/backoffice/src/widgets/admin-layout/model/navItems.ts:71`) **na hora** em que a cliente digita o e-mail no checkout, com o status 'Ativo' (`apps/backoffice/src/pages/admin/AdminAbandonedCartsPage.tsx:104`), e não entra nunca se ela não digitar o e-mail (o próprio §2 do PRD diz isso). A frase do PRD é falsa nos três pontos: o prazo, o 'aparece como abandonada' e o 'Backoffice'. Isso também responde à pergunta 4 do §12. Escolha real de produto: corrigir a frase ao que existe, ou trazer para o escopo a passagem automática para 'abandonado' depois do prazo.",
   "suggestion": "Com alguém no checkout, aparece a nota: \"Alguém está no checkout agora. Se a compra não fechar e o e-mail já tiver sido preenchido, a sacola fica em Carrinhos abandonados, no painel.\" A nota não cita prazo.",
   "questions": [
    "A nota só descreve o que já acontece (sem prazo), ou a passagem automática para 'abandonado' depois das horas configuradas entra neste escopo?"
   ]
  },
  {
   "id": "F4",
   "key": "guia-de-envio-na-lista-de-joias",
   "category": "gap",
   "owner": "negocio",
   "severity": "low",
   "title": "O Guia de envio está decidido DENTRO, mas o PRD ainda o chama de opcional e não diz como ele convive com o limite de 5 linhas e com o estado vazio",
   "anchor": {
    "quote": "Exceção opcional: o \"Guia de envio do material\" pode aparecer como linha com ícone `envio`, por ser sinal de intenção de compra.",
    "prefix": "Páginas que não são de joia não entram nesta lista. ",
    "suffix": "\n- **LAV-32**",
    "section": "5.2 C. Joias sendo vistas agora (Fase 2)"
   },
   "body": "O escopo do item 90 decidiu que o Guia entra (fecha a pergunta 3 do §12). O texto continua 'opcional'. Duas lacunas observáveis: (1) o Guia conta dentro das 5 linhas ou é uma linha a mais? (2) com gente só no Guia e ninguém numa página de joia, LAV-32 manda dizer 'Ninguém olhando uma joia agora.' — junto com a linha do Guia, a tela se contradiz. O endereço do Guia é um só (`MATERIAL_GUIDE_PATH`, `packages/core/src/routes/routes.ts:141`, mais o legado `/como-enviar-o-material` em `apps/store/src/app/App.tsx:193`).",
   "suggestion": "O \"Guia de envio do material\" aparece na lista como uma linha própria, com o ícone `envio`, sempre que alguém estiver nele, além das até 5 joias, e ordenado junto delas pelo número de pessoas. Com gente só no Guia, a seção mostra a linha do Guia e não mostra \"Ninguém olhando uma joia agora.\"",
   "questions": []
  },
  {
   "id": "F5",
   "key": "com-sacola-definicao-do-periodo",
   "category": "gap",
   "owner": "negocio",
   "severity": "medium",
   "title": "'Com sacola' do período não diz se conta a pessoa uma vez no dia ou uma vez na semana, nem o que mostra antes de haver período anterior contado",
   "anchor": {
    "quote": "**Com sacola**: visitantes distintos do período com ≥ 1 item na sacola (agregado diário da presença; Fase 2). Na Fase 1 o número não aparece.",
    "prefix": "**Mesmo número da faixa do Início.**\n  2. ",
    "suffix": "\n  3. **Vendas**",
    "section": "5.2 G. Acessos (Fase 1)"
   },
   "body": "Visitas conta cada navegador uma vez no dia e uma vez na semana (`store_movement`, `count(distinct visitor_id)` por período, `supabase/migrations/20261029120000_83-loja-ao-vivo.sql:215`). 'Com sacola' ao lado de 'Visitas' só é comparável com a mesma régua; um agregado diário só de contagens (§6.2) soma a mesma pessoa em cada dia da semana e em cada retorno depois de 30 min — ver o achado técnico `com-sacola-contagem-distinta-por-dia`. Faltam também: 'Com sacola' nunca passa de 'Visitas' (o número só existe para quem já é contado em Visitas), o comportamento da variação nos primeiros dias depois da publicação (ontem e a semana anterior ainda não foram medidos) e se a variação de Hoje usa o mesmo corte de horas completas da Fase 1 ('vs ontem até as {h}h', `.specs/features/83-loja-ao-vivo/spec.md:66`).",
   "suggestion": "**Com sacola**: das visitas do período, quantas tiveram ao menos uma joia na sacola em algum momento — cada navegador conta uma vez no dia e uma vez na semana, como em Visitas, e o número nunca passa de Visitas. A variação segue as mesmas regras de Visitas (em Hoje, as horas completas contra ontem até a mesma hora) e não aparece enquanto o período anterior não tiver sido medido inteiro desde a publicação.",
   "questions": []
  },
  {
   "id": "F6",
   "key": "semana-anterior-ate-o-mesmo-ponto",
   "category": "gap",
   "owner": "negocio",
   "severity": "medium",
   "title": "'vs semana anterior' sem dizer contra que pedaço da semana anterior",
   "anchor": {
    "quote": "−5% vs semana anterior",
    "prefix": "(\"+12% vs ontem\", \"",
    "suffix": "\"; verde `done` para alta",
    "section": "5.2 G. Acessos (Fase 1)"
   },
   "body": "A Semana vai de segunda até agora (`store_week_start`, migration 71 linha 51; LAV-52). Comparar uma terça com a semana anterior inteira fabrica queda toda segunda e terça — o mesmo defeito que a Fase 1 recusou para Hoje ao comparar com o ontem inteiro (`.specs/features/83-loja-ao-vivo/spec.md:66`). `BL-056` já escreveu a saída ('até o mesmo dia e hora', `.specs/BACKLOG.md:2103-2105`). Hoje `comparacao.semana` é `null` por construção (`supabase/migrations/20261029120000_83-loja-ao-vivo.sql:122,329`). Resposta única coerente com a Fase 1.",
   "suggestion": "−5% vs semana anterior, comparando de segunda até agora com a semana anterior de segunda até o mesmo dia da semana e a mesma hora completa; vale para Visitas, Com sacola, Vendas e Conversão. Sem a semana anterior contada inteira até esse ponto, a variação não aparece",
   "questions": []
  },
  {
   "id": "F7",
   "key": "presenca-zerada-antes-do-dominio",
   "category": "gap",
   "owner": "negocio",
   "severity": "medium",
   "title": "Antes de a loja estar no domínio de produção, o cartão diria 'Ninguém na loja agora' como fato",
   "anchor": {
    "quote": "**zero pessoas:** \"Ninguém na loja agora\" e o gráfico continua visível. Nunca esconder o cartão.",
    "prefix": "\"Não consegui ler agora.\" + toque relê;\n  - ",
    "suffix": "\n- **LAV-04**",
    "section": "5.1 Cartão \"Agora na loja\" no Início"
   },
   "body": "O pulso herda a recusa do contador: fora do host de produção nada conta (`apps/store/src/shared/lib/visits/refusal.ts:52`, e a function recusa de novo, `supabase/functions/visit/handlers.ts:173-175`). O `CLAUDE.md` registra que o host gravado é o domínio próprio e que até o dia do DNS o contador não conta nada. Para Visitas o painel já diz isso ('O contador está parado…' / 'O contador só conta na loja em {host}', `packages/core/src/stats/counterNotes.ts:39-44`); para a presença o PRD só prevê o zero, e um zero afirma 'a loja está vazia' quando na verdade ninguém está sendo medido. O mesmo vale para quem recusou estatísticas, mas isso já é declarado pela nota de consentimento.",
   "suggestion": "**zero pessoas:** \"Ninguém na loja agora\" e o gráfico continua visível. Nunca esconder o cartão. Enquanto a loja não estiver sendo medida (antes do endereço de produção estar no ar, ou sem endereço configurado), o cartão e a seção dizem isso com a mesma frase que Acessos já usa, em vez de \"Ninguém na loja agora\".",
   "questions": []
  },
  {
   "id": "F8",
   "key": "frase-de-falha-do-cartao",
   "category": "naming",
   "owner": "negocio",
   "severity": "low",
   "title": "A frase de falha do cartão diverge da que o app inteiro usa",
   "anchor": {
    "quote": "falha: \"Não consegui ler agora.\" + toque relê;",
    "prefix": "no lugar do número e do gráfico;\n  - ",
    "suffix": "\n  - **zero pessoas:**",
    "section": "5.1 Cartão \"Agora na loja\" no Início"
   },
   "body": "O cartão da Fase 1 já usa 'Não consegui carregar.' + 'Tentar de novo' (`FALHA_DE_LEITURA`), decisão registrada na feature 83 para não haver duas frases da mesma falha no mesmo app (`.specs/features/83-loja-ao-vivo/spec.md:79`; rótulo acessível em `packages/core/src/live/card.ts:16`). Resposta única.",
   "suggestion": "falha: \"Não consegui carregar.\" e \"Tentar de novo\", a mesma frase do resto do app;",
   "questions": []
  },
  {
   "id": "F9",
   "key": "funil-barra-de-compraram-sem-base",
   "category": "gap",
   "owner": "negocio",
   "severity": "low",
   "title": "A barra de 'Compraram' divide por 'total agora', que não a contém e pode ser zero",
   "anchor": {
    "quote": "Quatro linhas com barra de proporção (largura = n ÷ total agora):",
    "prefix": "- **LAV-20** ",
    "suffix": "\n  1. \"Olhando joias\"",
    "section": "5.2 B. O que estão fazendo (Fase 2)"
   },
   "body": "'Compraram' vem de pedidos, não da presença (o próprio LAV-20 item 4), e inclui quem não aceitou estatísticas. Com 0 pessoas agora e 2 compras, a barra é 2 ÷ 0; com 1 pessoa e 3 compras, passa de 100%. O protótipo pinta as quatro barras (`.specs/features/83-loja-ao-vivo/prototipo.md:128-129`) sem dizer a base.",
   "suggestion": "Quatro linhas. As três primeiras têm barra de proporção (largura = n ÷ total agora; com ninguém na loja, as três barras ficam vazias). \"Compraram (últimos 30 min)\" mostra só o número, sem barra, porque não faz parte de quem está na loja:",
   "questions": []
  },
  {
   "id": "F10",
   "key": "no-checkout-quais-telas",
   "category": "question",
   "owner": "negocio",
   "severity": "medium",
   "title": "'No checkout' não diz quais telas contam: o checkout do carrinho, o do pedido montado e a tela de pagamento do PIX são três endereços",
   "anchor": {
    "quote": "\"No checkout\": presentes na rota de checkout;",
    "prefix": "presentes com ≥ 1 item na sacola;\n  3. ",
    "suffix": "\n  4. \"Compraram",
    "section": "5.2 B. O que estão fazendo (Fase 2)"
   },
   "body": "A loja tem `/checkout`, `/pedido-montado` (o checkout do pedido montado pelo painel, feature 89) e `/pedido/:id/pagamento` (o PIX de um pedido já criado), todos fora do layout normal (`apps/store/src/app/App.tsx:215,231,238`). Quem está no PIX já fez o pedido; quem está no pedido montado não usa a sacola dela. Cada escolha muda os números e a nota de checkout.",
   "suggestion": "\"No checkout\": quem está preenchendo os dados de compra, no checkout da sacola ou no de um pedido montado; quem está na tela de pagamento de um pedido já feito também conta aqui;",
   "questions": [
    "A tela de pagamento do PIX de um pedido já criado conta como 'No checkout'? E o checkout do pedido montado?"
   ]
  },
  {
   "id": "F11",
   "key": "sacola-guardada-conta-como-intencao",
   "category": "question",
   "owner": "negocio",
   "severity": "low",
   "title": "A sacola fica guardada no navegador entre visitas: quem volta dias depois com joia esquecida conta como 'Com joia na sacola'",
   "anchor": {
    "quote": "\"Com joia na sacola\": presentes com ≥ 1 item na sacola;",
    "prefix": "presentes sem sacola;\n  2. ",
    "suffix": "\n  3. \"No checkout\"",
    "section": "5.2 B. O que estão fazendo (Fase 2)"
   },
   "body": "A sacola é persistida no `localStorage` (`apps/store/src/entities/cart/model/cartStore.ts:101`, chave `estrelinha-cart`) sem prazo. O mesmo vale para 'Com sacola' em Acessos (LAV-51 item 2). Se a intenção é 'está montando a compra agora', a regra precisa dizer.",
   "suggestion": "\"Com joia na sacola\": presentes com ao menos uma joia na sacola, inclusive a sacola guardada de uma visita anterior;",
   "questions": [
    "Uma sacola montada em outro dia e ainda guardada conta como 'com joia na sacola', ou só conta quem pôs a joia nesta visita?"
   ]
  },
  {
   "id": "F12",
   "key": "origem-base-e-grade",
   "category": "gap",
   "owner": "negocio",
   "severity": "low",
   "title": "'De onde vieram' não diz de quem (agora ou hoje), e cinco faixas não cabem numa grade 2×2",
   "anchor": {
    "quote": "Barra empilhada + legenda em grade 2×2.",
    "prefix": "- **LAV-40** ",
    "suffix": " As faixas são fixas",
    "section": "5.2 D. De onde vieram (Fase 3)"
   },
   "body": "O contrato do §6.2 põe `origens` ao lado de `agora`, o que sugere 'quem está na loja agora' — com 2 pessoas presentes, a barra vira 50/50 e diz pouco. A seção 'No celular' tem a mesma ambiguidade. As faixas são cinco (Instagram, Google, WhatsApp, Direto, Outros) e a legenda é 2×2.",
   "suggestion": "Barra empilhada + legenda em grade de duas colunas (a quinta faixa ocupa a linha inteira), contando as pessoas que estão na loja agora — as mesmas do total \"Agora na loja\"; com ninguém na loja, a seção mostra \"Ninguém na loja agora.\"",
   "questions": []
  },
  {
   "id": "F13",
   "key": "origem-app-sem-referencia-vira-direto",
   "category": "gap",
   "owner": "negocio",
   "severity": "medium",
   "title": "Quem abre o link pelo app do WhatsApp ou do Instagram costuma chegar sem referência, e cairia em 'Direto'",
   "anchor": {
    "quote": "**WhatsApp** (`wa.me`, `api.whatsapp.com`, `utm_source=whatsapp`);",
    "prefix": "`utm_source=google`);\n  - ",
    "suffix": "\n  - **Direto**",
    "section": "5.2 D. De onde vieram (Fase 3)"
   },
   "body": "O app do WhatsApp abre o link sem enviar de onde veio, e o navegador interno do Instagram muitas vezes também. Sem marcação no próprio link, essas visitas viram 'Direto' — e são justamente as duas origens que a loja mais divulga. A marcação de origem é lida da URL de entrada; a loja hoje não lê `utm_*` em lugar nenhum fora do GA4 (`apps/store/src/shared/lib/visits/**` não lê a URL). A decisão de produto é se a Adri passa a divulgar links marcados e se a tela avisa que 'Direto' inclui esses casos.",
   "suggestion": "**WhatsApp** (`wa.me`, `api.whatsapp.com`, `utm_source=whatsapp`). Os links que a loja divulga no Instagram e no WhatsApp levam a marcação de origem; quem chega por um link sem marcação, aberto dentro desses apps, conta como \"Direto\", e a seção diz isso em letra pequena;",
   "questions": [
    "A Adri passa a divulgar os links da bio do Instagram e das mensagens do WhatsApp com marcação de origem?"
   ]
  },
  {
   "id": "F14",
   "key": "no-celular-tablet-no-resto",
   "category": "naming",
   "owner": "negocio",
   "severity": "low",
   "title": "'o resto pelo computador' fica falso com tablet, e o caso de zero pessoas não está escrito",
   "anchor": {
    "quote": "\"{m} de {n}\" + \"o resto pelo computador\".",
    "prefix": "- **LAV-45** ",
    "suffix": " O aparelho é só",
    "section": "5.2 E. No celular (Fase 3)"
   },
   "body": "O próprio LAV-45 classifica em `celular | computador | tablet`, e o contrato devolve `tablet` (§6.2). Com 1 tablet, 'o resto pelo computador' mente. Com 0 pessoas, '0 de 0' não diz nada.",
   "suggestion": "\"{m} de {n}\" + \"o resto pelo computador ou tablet\" (sem a segunda linha quando todos estão no celular). Com ninguém na loja, o bloco mostra \"Ninguém na loja agora.\"",
   "questions": []
  },
  {
   "id": "F15",
   "key": "plurais-da-presenca",
   "category": "naming",
   "owner": "negocio",
   "severity": "low",
   "title": "O PRD escreve 'com joia na sacola' e 'com joias na sacola' para a mesma linha, e o nome acessível só no plural",
   "anchor": {
    "quote": "\"{x} com joias na sacola · {y} no checkout\"",
    "prefix": "- Cartão: \"Agora na loja\" · \"{n} pessoas\" · ",
    "suffix": " · \"Ninguém na loja agora\".",
    "section": "9. Textos (copy)"
   },
   "body": "LAV-02 diz '{x} com joia na sacola'; o §9 diz 'com joias'; LAV-01 diz 'Agora na loja, {n} pessoas'. O protótipo faz o plural por número (`.specs/features/83-loja-ao-vivo/prototipo.md:74,218`). Resposta única: plural por número em todas.",
   "suggestion": "\"{x} com joia na sacola\" (\"com joias\" a partir de 2) · \"{y} no checkout\"; \"1 pessoa\" e \"{n} pessoas\" no número e no nome acessível do cartão",
   "questions": []
  },
  {
   "id": "F16",
   "key": "joia-vista-por-uma-pessoa",
   "category": "improvement",
   "owner": "negocio",
   "severity": "low",
   "title": "Uma joia vista por uma única pessoa, minutos depois de uma conversa no WhatsApp, identifica a cliente",
   "anchor": {
    "quote": "Até 5 linhas: foto (`image_url` da joia, molde do `TopJewels`), nome e \"{n} pessoa(s)\".",
    "prefix": "- **LAV-30** ",
    "suffix": " Ordem: mais pessoas primeiro",
    "section": "5.2 C. Joias sendo vistas agora (Fase 2)"
   },
   "body": "LAV-48 esconde Cidades abaixo de 3 pessoas 'para não identificar ninguém', e LAV-65 proíbe o que identifique uma pessoa. A lista de joias mostra '1 pessoa' numa joia específica, ao vivo. Num ateliê pequeno, em que a Adri conversa com a cliente pelo WhatsApp, isso pode identificar quem é. É escolha de produto manter ou aplicar um mínimo.",
   "suggestion": "Manter como está: a lista mostra a joia mesmo com uma pessoa, porque o nome da cliente nunca aparece e a Adri usa o sinal para acompanhar o interesse.",
   "questions": [
    "A lista de joias mostra a joia mesmo quando só uma pessoa a vê, ou segue a mesma régua de Cidades?"
   ]
  },
  {
   "id": "F17",
   "key": "barras-por-minuto-distintos-subcontam",
   "category": "gap",
   "owner": "tech_prd_edit",
   "severity": "medium",
   "title": "Com batida a cada 60 s, 'visitantes distintos com batida naquele minuto' oscila e nunca bate com o total; a barra 'agora' fica sempre abaixo do número grande",
   "anchor": {
    "quote": "Cada barra é o número de visitantes distintos com batida naquele minuto.",
    "prefix": "e as legendas \"30 min atrás\" e \"agora\". ",
    "suffix": "\n- **LAV-12**",
    "section": "5.2 A. Agora na loja (Fase 2)"
   },
   "body": "Um pulso a cada 60 s, mais um a cada troca de página, cai em minutos-relógio de forma irregular: uma pessoa presente o tempo todo pode não ter batida num minuto (10:00:59 → 10:02:00) e aparecer como ausente; o minuto corrente está sempre incompleto. O número grande usa a janela de 5 minutos (LAV-12). A Adri veria '7 pessoas' com a barra dourada em 2. Além disso, a tabela `store_presence_minutes` do §6.2 guarda um contador por minuto sem id: sem saber se aquela pessoa já bateu naquele minuto, o contador soma batidas, não pessoas. Decisão técnica: cada barra conta quem estava presente naquele minuto pela MESMA régua do total (batida nos 5 minutos até ele), com o registro de minutos guardando o necessário para não contar a mesma pessoa duas vezes e vivendo só os 35 minutos que a conta precisa.",
   "suggestion": "Decisão técnica: cada barra é calculada pela mesma janela de 5 minutos do total, e o registro por minuto não soma a mesma pessoa duas vezes. Substituir o trecho por: \"Cada barra é o número de pessoas na loja naquele minuto, pela mesma regra do número grande; a barra de agora é igual ao número grande.\"",
   "questions": []
  },
  {
   "id": "F18",
   "key": "id-do-visitante-na-presenca",
   "category": "gap",
   "owner": "tech",
   "severity": "high",
   "title": "Reusar 'o MESMO id aleatório do VisitCounter' contradiz VIS-12 e liga, pelo mesmo código, a visita do dia às páginas e joias vistas",
   "anchor": {
    "quote": "o MESMO id aleatório do VisitCounter",
    "prefix": "visitor_id   uuid primary key,          -- ",
    "suffix": "\n  last_seen_at",
    "section": "6.2 Fase 2 — presença"
   },
   "body": "VIS-12 diz que o id 'SHALL NOT ir em nenhuma outra requisição', e `apps/store/src/shared/lib/__tests__/idDoVisitanteSoNoEnvio.test.ts:18-22,33-35` prende isso: só `app/VisitCounter.tsx` lê o id e só `shared/lib/visits/send.ts` faz rede. Um `PresencePing` que o leia reprova o guarda. Mais que o guarda: o id é persistente entre dias (`apps/store/src/shared/lib/visits/visitor.ts:118-133`, só some na recusa), então a mesma chave junta `store_visits` (dia e hora da primeira visita, 14 dias com `BL-056`) com página, joia, aparelho e origem — um perfil de navegação pseudônimo, que é o que a política promete não guardar. Saídas: (a) um id próprio da presença, aleatório, guardado só na sessão do navegador e trocado ao fim dela — o total passa a contar sessões, e 'Com sacola' precisa de outro caminho para deduplicar no dia (achado `com-sacola-contagem-distinta-por-dia`); (b) o mesmo id, com emenda declarada a VIS-12, guarda novo e a política dizendo que as páginas vistas ficam associadas ao código por 30 minutos. A (a) preserva a régua da 71; a (b) é mais simples para 'Com sacola'.",
   "suggestion": "Id próprio da presença, de sessão, sem relação com o id do contador de visitas; VIS-12 e `idDoVisitanteSoNoEnvio` ficam como estão.",
   "questions": [
    "Id de presença próprio (sessão) ou o mesmo id do contador com emenda a VIS-12?"
   ]
  },
  {
   "id": "F19",
   "key": "com-sacola-contagem-distinta-por-dia",
   "category": "gap",
   "owner": "tech",
   "severity": "high",
   "title": "`store_presence_daily` com `with_cart int` não consegue contar visitantes distintos no dia nem na semana",
   "anchor": {
    "quote": "create table public.store_presence_daily (     -- para \"Com sacola\", sem id",
    "prefix": ");\n",
    "suffix": "\n  day date primary key",
    "section": "6.2 Fase 2 — presença"
   },
   "body": "Um contador por dia sem id só pode ser somado: a mesma pessoa que volta depois dos 30 min de TTL da presença conta de novo, e a Semana (que em Visitas é `count(distinct visitor_id)` sobre os dias, `supabase/migrations/20261029120000_83-loja-ao-vivo.sql:215`) vira soma de dias. A variação de Hoje 'até as {h}h' (Fase 1) também precisa de hora. A coluna `at_checkout` não é desenhada em lugar nenhum do PRD. Caminhos: (a) uma marca por (dia, visitante) — na própria `store_visits` (`had_cart` + hora da primeira sacola), o que reprova `visitasPorHoraSchema.test.ts:140-143` (colunas EXATAMENTE `day, visitor_id, first_hour`, em todas as migrations) e é nova emenda a VIS-28, só possível se o id da presença for o do contador (achado `id-do-visitante-na-presenca`); (b) uma tabela irmã (dia, id de sessão, hora) com a mesma poda de 14 dias, sem ligação com `store_visits`, que conta sessões com sacola — e aí 'Com sacola' deixa de ser comparável com Visitas (sessões × navegadores). A escolha entre (a) e (b) segue a do id; a consequência observável está em `com-sacola-definicao-do-periodo`.",
   "suggestion": "Se o id da presença for de sessão: 'Com sacola' por (dia, sessão, hora da primeira sacola), poda de 14 dias, e a regra de produto de F5 ajustada para dizer 'sessões'. Se for o id do contador: marca na própria visita do dia, com emenda a VIS-28 e o guarda de colunas acompanhando.",
   "questions": []
  },
  {
   "id": "F20",
   "key": "pulso-no-mesmo-teto-por-ip",
   "category": "gap",
   "owner": "tech",
   "severity": "high",
   "title": "O pulso no mesmo teto de 30/min por IP da `visit` esgota o balde e derruba a contagem diária de visitas",
   "anchor": {
    "quote": "com os mesmos portões (rate limit por IP sem gravar o IP, robô, origem, corpo validado por `core/visits`)",
    "prefix": "(ex.: `POST /visit?action=ping`) ",
    "suffix": " e a RPC `record_store_presence",
    "section": "6.2 Fase 2 — presença"
   },
   "body": "A `visit` cria UM limitador de 30 chamadas por minuto por IP (`supabase/functions/visit/index.ts:28`, `supabase/functions/_shared/rateLimit.ts:21-41`). A visita é uma chamada por dia por navegador; o pulso é uma por minuto por aba visível, mais uma por troca de página e por mudança da sacola. Atrás do mesmo IP de saída (operadora de celular com NAT compartilhado, que é ~90% do tráfego da loja, ou a rede do ateliê) duas dezenas de pessoas navegando esgotam o balde, e a visita do dia de quem chega depois recebe 429 — Visitas cai em silêncio. Além disso, cada requisição da `visit` lê `store_clock` antes de gravar (portão 3, `handlers.ts:162`), e o preflight de CORS sem `Access-Control-Max-Age` (`supabase/functions/_shared/http.ts:20-21`) dobra as invocações. O §8 ('Com o teto da feature 71 (5.000/dia)') cita um teto que só limita linhas de `store_visits`, não pulsos.",
   "suggestion": "Limitador separado para o pulso (e mais folgado), a visita mantendo o dela; o pulso não lê `store_clock` (a RPC de presença decide o instante); `Access-Control-Max-Age` no preflight da `visit`; e um teto de linhas na tabela de presença no lugar do 5.000 da 71.",
   "questions": []
  },
  {
   "id": "F21",
   "key": "contrato-do-corpo-do-pulso",
   "category": "gap",
   "owner": "tech",
   "severity": "medium",
   "title": "O corpo da `visit` é EXATAMENTE `{ id }`, e a origem precisa viajar no corpo",
   "anchor": {
    "quote": "As faixas são fixas, calculadas **no servidor**, no primeiro pulso da sessão:",
    "prefix": "Barra empilhada + legenda em grade 2×2. ",
    "suffix": "\n  - **Instagram**",
    "section": "5.2 D. De onde vieram (Fase 3)"
   },
   "body": "`visitBodyRefusal` recusa qualquer chave além de `id` (`packages/core/src/visits/visitor.ts:31-37`) e a `route` não olha a query (`supabase/functions/visit/handlers.ts:117-189`). O pulso precisa de um contrato novo, com validação própria (tipo de página do vocabulário fechado, id de joia, itens da sacola com teto). O `Referer` da requisição do pulso é a página da loja, não a de origem, então `document.referrer` e o `utm_source` da URL de entrada têm de ir no corpo; em SPA o `utm` some da URL na primeira navegação, então a loja precisa guardá-lo do pouso. 'Primeiro pulso da sessão' não tem definição técnica (a presença expira em 30 min). Duas opções: mandar referrer e utm crus e o servidor calcular `sourceBucket` (o que o PRD pede), ou a loja calcular a faixa e mandar só ela — com `sourceBucket` em `core` as duas pontas usam a mesma regra, e a segunda não faz o endereço externo trafegar. `pageKind` em `core/routes` também resolve: o barril é alcançável pelo Deno (`packages/core/src/routes/index.ts:1`). A joia: a URL tem o slug (`/produtos/:slug` e o legado `/produto/:slug`, `App.tsx:152-153`), não o id — a loja manda o id da joia carregada ou o servidor resolve o slug.",
   "suggestion": "Contrato próprio do pulso em `core/visits` (molde de `visitBody`/`visitBodyRefusal`), com a faixa de origem calculada na loja por `sourceBucket` e guardada desde o pouso; o servidor revalida a faixa contra o vocabulário e calcula só o aparelho pelo user agent.",
   "questions": []
  },
  {
   "id": "F22",
   "key": "leitura-da-presenca-e-confirmacao-de-papel",
   "category": "gap",
   "owner": "tech",
   "severity": "low",
   "title": "`lerComPapel` não se aplica a uma RPC admin, e a presença é uma segunda leitura por ciclo",
   "anchor": {
    "quote": "Uma leitura por ciclo com confirmação de papel (`lerComPapel`).",
    "prefix": "- **LAV-60** ",
    "suffix": " Recusa `42501` cai no episódio único do app.",
    "section": "5.3 Comportamentos gerais"
   },
   "body": "A Fase 1 lê só `store_movement`, que recusa com `42501` no próprio corpo (`supabase/migrations/20261029120000_83-loja-ao-vivo.sql:180`), e por isso dispensou `lerComPapel` (`apps/mobile-adm/src/pages/AoVivoPage.tsx:19-22`, `.specs/features/83-loja-ao-vivo/spec.md:74`). `store_live` nasce no mesmo molde (security definer + `has_role`). O Início passa a ter três leituras (movimento a 30 s, resumo, presença a 30 s) e a Loja ao vivo duas a 15 s; `useRecusaDePapel` já aceita várias (`InicioPage.tsx:64-67`). Alternativa: devolver a presença dentro de `store_movement`, como a Fase 1 fez com `acessos` — uma leitura, mas uma falha da presença apagaria Acessos.",
   "suggestion": "RPC própria `store_live` com `has_role` no corpo, chave de cache própria, sem `lerComPapel`; a recusa entra na mesma vigia; o desvio registrado como na 83.",
   "questions": []
  },
  {
   "id": "F23",
   "key": "frescor-pela-chegada-da-resposta",
   "category": "improvement",
   "owner": "tech",
   "severity": "low",
   "title": "O frescor 'calculado pelo lido_em' já foi implementado pela chegada da resposta",
   "anchor": {
    "quote": "calculada pelo `lido_em` do servidor (mesma régua de `LinhaDeFrescor`)",
    "prefix": "\"Atualizado agora\" / \"Atualizado há {s} s\", ",
    "suffix": ". Tem puxar para atualizar",
    "section": "5.2 Tela \"Loja ao vivo\" (`/ao-vivo`)"
   },
   "body": "Comparar `lido_em` com o relógio do aparelho violaria LAV-61; a 83 conta a duração desde a chegada (`.specs/features/83-loja-ao-vivo/spec.md:76`, `apps/mobile-adm/src/shared/lib/useSegundosDesde.ts`). Com duas leituras na tela, falta decidir de qual o frescor fala.",
   "suggestion": "Manter a régua da 83; o frescor da tela fala da leitura mais antiga das duas (molde de `maisAntigo` do Início).",
   "questions": []
  },
  {
   "id": "F24",
   "key": "foto-da-joia-pelo-molde-real",
   "category": "naming",
   "owner": "tech",
   "severity": "low",
   "title": "O molde do TopJewels não usa `image_url`",
   "anchor": {
    "quote": "foto (`image_url` da joia, molde do `TopJewels`)",
    "prefix": "- **LAV-30** Até 5 linhas: ",
    "suffix": ", nome e \"{n} pessoa(s)\".",
    "section": "5.2 C. Joias sendo vistas agora (Fase 2)"
   },
   "body": "`store_overview` devolve `products.images` cru e o app escolhe a foto com `primaryImage` + `itemPhoto` (`supabase/migrations/20261027120000_inicio-fotos-das-joias.sql:4-6,78`, `apps/mobile-adm/src/widgets/top-jewels/ui/TopJewels.tsx:2-3`). O `image_url` do contrato do §6.2 seguiria outra regra de foto. O protótipo desenha ícone (D17, `.specs/features/83-loja-ao-vivo/prototipo.md:209`); a foto já está decidida.",
   "suggestion": "`store_live` devolve `imagens` como `store_overview`, e o app usa `primaryImage`, como o TopJewels.",
   "questions": []
  },
  {
   "id": "F25",
   "key": "compraram-pela-regua-de-venda",
   "category": "gap",
   "owner": "tech",
   "severity": "low",
   "title": "'Compraram' por `paid_at` sozinho diverge da régua de venda do painel e do app",
   "anchor": {
    "quote": "\"Compraram (últimos 30 min)\": pedidos com `paid_at` nos últimos 30 min.",
    "prefix": "presentes na rota de checkout;\n  4. ",
    "suffix": " Vem de `orders`, não da presença.",
    "section": "5.2 B. O que estão fazendo (Fase 2)"
   },
   "body": "Vendas segue o par `payment_status = 'approved'` e `status <> 'cancelled'` (`AD-055`; guarda `visitasRegras.ts`). Um pedido pago e cancelado contaria em 'Compraram' e não em Vendas. A janela vem de `p_agora` do servidor (LAV-61). O Realtime citado no §2 (`useOrdersRealtime`) não é usado pela Loja ao vivo hoje (`AoVivoPage.tsx`); a leitura a 15 s basta.",
   "suggestion": "Mesma régua de venda de `store_movement`, janela pelo instante do servidor; sem canal de Realtime novo.",
   "questions": []
  },
  {
   "id": "F26",
   "key": "guardas-que-vao-reagir",
   "category": "gap",
   "owner": "tech",
   "severity": "medium",
   "title": "A lista de guardas do §8 deixa de fora os que as Fases 2–3 vão disparar",
   "anchor": {
    "quote": "**Testes-guarda que não podem quebrar:**",
    "prefix": "Aceitável para acompanhamento.\n- ",
    "suffix": " `contadorSemGa`",
    "section": "8. Não funcionais"
   },
   "body": "Vão reagir, por desenho: `idDoVisitanteSoNoEnvio` (se o pulso ler o id; F18); `politicaDoContador` (texto cravado, `pages/__tests__/politicaDoContador.test.ts:31`; F1); `visitasPorHoraSchema` (colunas de `store_visits`; F19) e `visitasSchema`/`visitasRegras` (a poda de 7 dias, para `BL-056`); `marcacaoSoPorAcao` (lista literal de RPCs, `apps/store/src/shared/lib/__tests__/marcacaoSoPorAcao.test.ts:182-195` — `record_store_presence` e `store_live` entram); `tomDaLojaAoVivo` (recusa 'pessoa(s)' nos arquivos da Fase 1, escopo literal, e prevê régua própria para a presença — `apps/mobile-adm/src/shared/lib/__tests__/tomDaLojaAoVivo.test.ts:10-13`, com `BL-058` fechado por 'pessoas'); `aoVivoSemRelogioDoAparelho` (varre `core/live/**` inteiro; arquivos novos do app entram na lista); `semPessoas` (painel; não muda se a presença não for ao painel); `visitanteComDonoUnico` (chave nova de armazenamento do pulso, se houver); `chaveDeServidorForaDoNavegador` e `wiringResolve` (a `visit` muda). Nenhum guarda de esquema existe para as tabelas novas (critério 6).",
   "suggestion": "Lista completa no design, com o que cada guarda passa a medir; guarda novo de esquema da presença no molde de `visitasSchema`; régua de tom própria para a presença com 'pessoas' permitido só nela.",
   "questions": []
  },
  {
   "id": "F27",
   "key": "poda-da-presenca-sem-pg-cron",
   "category": "improvement",
   "owner": "tech",
   "severity": "low",
   "title": "pg_cron é condicional; a poda da presença precisa funcionar sem ele",
   "anchor": {
    "quote": "efêmera: TTL 30 min; poda na gravação, na leitura e por pg_cron (se existir), molde da 71",
    "prefix": "-- ",
    "suffix": "\ncreate table public.store_presence (",
    "section": "6.2 Fase 2 — presença"
   },
   "body": "A 71 agenda o job só `if exists (pg_extension 'pg_cron')` (`supabase/migrations/20261021120000_71-visitas-unicas.sql:369-376`); se não houver, a poda roda na gravação e na leitura. Sem tráfego e sem leitura, linhas vencidas ficam — inofensivo para os números (a leitura recorta pela janela), mas a política promete 30 min. A poda na gravação de cada pulso é o caminho que não depende de nada.",
   "suggestion": "Poda na gravação e na leitura como fonte de verdade; o job do pg_cron só quando existir; a leitura sempre recorta pela janela, nunca confia na poda.",
   "questions": []
  },
  {
   "id": "F28",
   "key": "fase-1-ja-entregue",
   "category": "overlap",
   "owner": "none",
   "severity": "info",
   "title": "O §2, o §6.3 e o §13 descrevem como a fazer o que a feature 83 já entregou",
   "anchor": {
    "quote": "**Conclusão:** a parte de **Acessos** tem base quase pronta.",
    "prefix": "Útil para \"Compraram (últimos 30 min)\" |\n\n",
    "suffix": " Já a parte **ao vivo**",
    "section": "2. O que já existe (e vamos reaproveitar)"
   },
   "body": "Já existem: `store_visits.first_hour` e a chave `acessos` (`supabase/migrations/20261029120000_83-loja-ao-vivo.sql`); `accessDelta`, `conversion`, `freshnessLine`, `CONSENT_NOTE` ('Conta só quem aceitou cookies de estatística.', o texto que o §7 pede) em `packages/core/src/live/access.ts:23,30,43,173`; a tela `/ao-vivo` com ciclo de 15 s (`apps/mobile-adm/src/pages/AoVivoPage.tsx:11`); o Início a 30 s só com a aba visível (`InicioPage.tsx:54`); o cartão `CartaoVisitasHoje` (`apps/mobile-adm/src/widgets/visits-card/`). O §13 manda implementar a Fase 1. As decisões da 83 que divergem do texto do PRD (LAV-60 sem `lerComPapel`, frase de falha, frescor pela chegada, notas do contador do dono único, Hoje por horas completas) estão em `.specs/features/83-loja-ao-vivo/spec.md:60-100` e continuam valendo. Com a Fase 2, `VISITS_TODAY_*` de `packages/core/src/live/card.ts:9-16` perde o leitor.",
   "suggestion": "",
   "questions": []
  },
  {
   "id": "F29",
   "key": "aviso-do-prototipo-1-hora-ja-corrigido",
   "category": "naming",
   "owner": "none",
   "severity": "info",
   "title": "O aviso de que o protótipo diz '1 hora' já não vale",
   "anchor": {
    "quote": "⚠️ O protótipo diz \"1 hora\" e está errado: o padrão real é 4.",
    "prefix": "O número vem de `store_settings.abandoned_cart.threshold_hours`. ",
    "suffix": "\n\n#### C. Joias sendo vistas agora",
    "section": "5.2 B. O que estão fazendo (Fase 2)"
   },
   "body": "O protótipo atual já diz '4 horas' (`.specs/features/83-loja-ao-vivo/prototipo.md:130-131,208`, D16). O padrão de 4 está em `packages/supabase/src/types/settings.ts:215`. Ver F3: o número não decide nada no sistema.",
   "suggestion": "",
   "questions": []
  },
  {
   "id": "F30",
   "key": "pessoas-conta-navegadores",
   "category": "naming",
   "owner": "none",
   "severity": "info",
   "title": "'Pessoas' (decidido, fecha BL-058) continua contando navegadores ou sessões",
   "anchor": {
    "quote": "\"Pessoa na loja\" = visitante com batida nos **últimos 5 min**.",
    "prefix": "- **LAV-12** ",
    "suffix": " A janela é uma constante única",
    "section": "5.2 A. Agora na loja (Fase 2)"
   },
   "body": "O vocabulário foi decidido pelo humano. Registro: celular e computador da mesma cliente contam dois; com id de sessão (F18), duas abas que não compartilham a sessão também. Visitas, ao lado, segue dizendo navegadores (`VIS-41`, `apps/backoffice/src/widgets/store-movement/__tests__/semPessoas.test.ts`). Nada a decidir aqui.",
   "suggestion": "",
   "questions": []
  }
 ]
}
```

### Respostas, por `key`

| key | owner final | quem respondeu | estado | resposta |
| --- | --- | --- | --- | --- |
| `politica-de-privacidade-presenca-e-retencao` | negocio | agente, a pedido do humano | aplicado | Atualizar a Política de Privacidade da loja antes da publicação, com texto aprovado pela Adri, dizendo: que, enquanto a loja está aberta na tela, o navegador avisa a cada minuto que a pessoa está na loja; que, por até 30 minutos, fica registrado só o tipo de página que ela vê (joia, lista, sacola, checkout, guia), qual joia, quantos itens tem na sacola, de que tipo de lugar ela veio (Instagram, Google, WhatsApp, direto ou outros) e se usa celular, computador ou tablet — nunca o IP, o endereço completo da página ou de onde veio; que depois disso sobram só contagens sem identificação; e que os registros de visita passam a ser apagados depois de 14 dias. Sem essa aprovação, nada das Fases 2 e 3 vai ao ar. |
| `historico-alem-de-7-dias-contradiz-escopo` | negocio | agente, a pedido do humano | aplicado | Histórico além de 14 dias. As visitas passam a ficar guardadas por 14 dias, o necessário para comparar a semana atual com a anterior; nada além disso. |
| `nota-do-checkout-promete-o-que-o-painel-nao-faz` | negocio | agente, a pedido do humano | aplicado | Com alguém no checkout, aparece a nota: "Alguém está no checkout agora. Se a compra não fechar e o e-mail já tiver sido preenchido, a sacola fica em Carrinhos abandonados, no painel." A nota não cita prazo. |
| `guia-de-envio-na-lista-de-joias` | negocio | agente, a pedido do humano | aplicado | O "Guia de envio do material" aparece na lista como uma linha própria, com o ícone `envio`, sempre que alguém estiver nele, além das até 5 joias, e ordenado junto delas pelo número de pessoas. Com gente só no Guia, a seção mostra a linha do Guia e não mostra "Ninguém olhando uma joia agora." |
| `com-sacola-definicao-do-periodo` | negocio | decorre da resposta do humano | aplicado | decorre de id-do-visitante-na-presenca: no dia, uma vez por navegador; na Semana, soma dos dias, dito em letra pequena |
| `semana-anterior-ate-o-mesmo-ponto` | negocio | agente, a pedido do humano | aplicado | −5% vs semana anterior, comparando de segunda até agora com a semana anterior de segunda até o mesmo dia da semana e a mesma hora completa; vale para Visitas, Com sacola, Vendas e Conversão. Sem a semana anterior contada inteira até esse ponto, a variação não aparece |
| `presenca-zerada-antes-do-dominio` | negocio | agente, a pedido do humano | aplicado | **zero pessoas:** "Ninguém na loja agora" e o gráfico continua visível. Nunca esconder o cartão. Enquanto a loja não estiver sendo medida (antes do endereço de produção estar no ar, ou sem endereço configurado), o cartão e a seção dizem isso com a mesma frase que Acessos já usa, em vez de "Ninguém na loja agora". |
| `frase-de-falha-do-cartao` | negocio | agente, a pedido do humano | aplicado | falha: "Não consegui carregar." e "Tentar de novo", a mesma frase do resto do app; |
| `funil-barra-de-compraram-sem-base` | negocio | agente, a pedido do humano | aplicado | Quatro linhas. As três primeiras têm barra de proporção (largura = n ÷ total agora; com ninguém na loja, as três barras ficam vazias). "Compraram (últimos 30 min)" mostra só o número, sem barra, porque não faz parte de quem está na loja: |
| `no-checkout-quais-telas` | negocio | agente, a pedido do humano | aplicado | "No checkout": quem está preenchendo os dados de compra, no checkout da sacola ou no de um pedido montado; quem está na tela de pagamento de um pedido já feito também conta aqui; |
| `sacola-guardada-conta-como-intencao` | negocio | agente, a pedido do humano | aplicado | "Com joia na sacola": presentes com ao menos uma joia na sacola, inclusive a sacola guardada de uma visita anterior; |
| `origem-base-e-grade` | negocio | agente, a pedido do humano | aplicado | Barra empilhada + legenda em grade de duas colunas (a quinta faixa ocupa a linha inteira), contando as pessoas que estão na loja agora — as mesmas do total "Agora na loja"; com ninguém na loja, a seção mostra "Ninguém na loja agora." |
| `origem-app-sem-referencia-vira-direto` | negocio | agente, a pedido do humano | aplicado | **WhatsApp** (`wa.me`, `api.whatsapp.com`, `utm_source=whatsapp`). Quem chega por um link sem marcação de origem, aberto dentro do app do Instagram ou do WhatsApp, conta como "Direto", e a seção diz isso em letra pequena; |
| `no-celular-tablet-no-resto` | negocio | agente, a pedido do humano | aplicado | "{m} de {n}" + "o resto pelo computador ou tablet" (sem a segunda linha quando todos estão no celular). Com ninguém na loja, o bloco mostra "Ninguém na loja agora." |
| `plurais-da-presenca` | negocio | agente, a pedido do humano | aplicado | "{x} com joia na sacola" ("com joias" a partir de 2) · "{y} no checkout"; "1 pessoa" e "{n} pessoas" no número e no nome acessível do cartão |
| `joia-vista-por-uma-pessoa` | negocio | humano, pela página | aplicado | Mostrar a joia mesmo com uma pessoa (o nome da cliente nunca aparece; a Adri usa o sinal para acompanhar o interesse). |
| `barras-por-minuto-distintos-subcontam` | tech_prd_edit | agente, a pedido do humano | aplicado | Decisão técnica: cada barra é calculada pela mesma janela de 5 minutos do total, e o registro por minuto não soma a mesma pessoa duas vezes. Substituir o trecho por: "Cada barra é o número de pessoas na loja naquele minuto, pela mesma regra do número grande; a barra de agora é igual ao número grande." |
| `id-do-visitante-na-presenca` | tech | humano, pela página | aplicado | (Recomendado) Id próprio da presença, por navegador e por dia, sem ligação com o id do contador; ele troca à meia-noite de Brasília. 'Com sacola' conta cada navegador uma vez por dia, na mesma régua de Visitas no dia. Na Semana, 'Com sacola' é a soma dos dias (quem pôs joia na sacola em dois dias conta 2), dito em letra pequena. VIS-12 e o guarda ficam como estão. |
| `com-sacola-contagem-distinta-por-dia` | tech | decorre da resposta do humano | aplicado | decorre de id-do-visitante-na-presenca: contagem por (dia, id da presença) com o id diário; Semana = soma dos dias |
| `pulso-no-mesmo-teto-por-ip` | tech | agente, a pedido do humano | aplicado | Limitador separado para o pulso (e mais folgado), a visita mantendo o dela; o pulso não lê `store_clock` (a RPC de presença decide o instante); `Access-Control-Max-Age` no preflight da `visit`; e um teto de linhas na tabela de presença no lugar do 5.000 da 71. |
| `contrato-do-corpo-do-pulso` | tech | agente, a pedido do humano | aplicado | Contrato próprio do pulso em `core/visits` (molde de `visitBody`/`visitBodyRefusal`), com a faixa de origem calculada na loja por `sourceBucket` e guardada desde o pouso; o servidor revalida a faixa contra o vocabulário e calcula só o aparelho pelo user agent. |
| `leitura-da-presenca-e-confirmacao-de-papel` | tech | agente, a pedido do humano | aplicado | RPC própria `store_live` com `has_role` no corpo, chave de cache própria, sem `lerComPapel`; a recusa entra na mesma vigia; o desvio registrado como na 83. |
| `frescor-pela-chegada-da-resposta` | tech | agente, a pedido do humano | aplicado | Manter a régua da 83; o frescor da tela fala da leitura mais antiga das duas (molde de `maisAntigo` do Início). |
| `foto-da-joia-pelo-molde-real` | tech | agente, a pedido do humano | aplicado | `store_live` devolve `imagens` como `store_overview`, e o app usa `primaryImage`, como o TopJewels. |
| `compraram-pela-regua-de-venda` | tech | agente, a pedido do humano | aplicado | Mesma régua de venda de `store_movement`, janela pelo instante do servidor; sem canal de Realtime novo. |
| `guardas-que-vao-reagir` | tech | agente, a pedido do humano | aplicado | Lista completa no design, com o que cada guarda passa a medir; guarda novo de esquema da presença no molde de `visitasSchema`; régua de tom própria para a presença com 'pessoas' permitido só nela. |
| `poda-da-presenca-sem-pg-cron` | tech | agente, a pedido do humano | aplicado | Poda na gravação e na leitura como fonte de verdade; o job do pg_cron só quando existir; a leitura sempre recorta pela janela, nunca confia na poda. |
| `fase-1-ja-entregue` | none | — | sem item | — |
| `aviso-do-prototipo-1-hora-ja-corrigido` | none | — | sem item | — |
| `pessoas-conta-navegadores` | none | — | sem item | — |

### O que foi aplicado, e onde

**No `prd.md`** (trecho antes → depois):

- `politica-de-privacidade-presenca-e-retencao`
  - antes: Atualizar a Política de Privacidade da loja para mencionar a medição de presença.
  - depois: Atualizar a Política de Privacidade da loja antes da publicação, com texto aprovado pela Adri, dizendo: que, enquanto a loja está aberta na tela, o navegador avisa a cada minuto que a pessoa está na loja; que, por até 30 minutos, fica registrado só o tipo de página que ela vê (joia, lista, sacola, checkout, guia), qual joia, quantos itens tem na sacola, de que tipo de lugar ela veio (Instagram, Google, WhatsApp, direto ou outros) e se usa celular, computador ou tablet — nunca o IP, o endereço completo da página ou de onde veio; que depois disso sobram só contagens sem identificação; e que os registros de visita passam a ser apagados depois de 14 dias. Sem essa aprovação, nada das Fases 2 e 3 vai ao ar.
- `historico-alem-de-7-dias-contradiz-escopo`
  - antes: Histórico além de 7 dias (a poda da feature 71 continua valendo).
  - depois: Histórico além de 14 dias. As visitas passam a ficar guardadas por 14 dias, o necessário para comparar a semana atual com a anterior; nada além disso.
- `guia-de-envio-na-lista-de-joias`
  - antes: Exceção opcional: o "Guia de envio do material" pode aparecer como linha com ícone `envio`, por ser sinal de intenção de compra.
  - depois: O "Guia de envio do material" aparece na lista como uma linha própria, com o ícone `envio`, sempre que alguém estiver nele, além das até 5 joias, e ordenado junto delas pelo número de pessoas. Com gente só no Guia, a seção mostra a linha do Guia e não mostra "Ninguém olhando uma joia agora."
- `presenca-zerada-antes-do-dominio`
  - antes: **zero pessoas:** "Ninguém na loja agora" e o gráfico continua visível. Nunca esconder o cartão.
  - depois: **zero pessoas:** "Ninguém na loja agora" e o gráfico continua visível. Nunca esconder o cartão. Enquanto a loja não estiver sendo medida (antes do endereço de produção estar no ar, ou sem endereço configurado), o cartão e a seção dizem isso com a mesma frase que Acessos já usa, em vez de "Ninguém na loja agora".
- `frase-de-falha-do-cartao`
  - antes: falha: "Não consegui ler agora." + toque relê;
  - depois: falha: "Não consegui carregar." e "Tentar de novo", a mesma frase do resto do app;
- `funil-barra-de-compraram-sem-base`
  - antes: Quatro linhas com barra de proporção (largura = n ÷ total agora):
  - depois: Quatro linhas. As três primeiras têm barra de proporção (largura = n ÷ total agora; com ninguém na loja, as três barras ficam vazias). "Compraram (últimos 30 min)" mostra só o número, sem barra, porque não faz parte de quem está na loja:
- `no-checkout-quais-telas`
  - antes: "No checkout": presentes na rota de checkout;
  - depois: "No checkout": quem está preenchendo os dados de compra, no checkout da sacola ou no de um pedido montado; quem está na tela de pagamento de um pedido já feito também conta aqui;
- `sacola-guardada-conta-como-intencao`
  - antes: "Com joia na sacola": presentes com ≥ 1 item na sacola;
  - depois: "Com joia na sacola": presentes com ao menos uma joia na sacola, inclusive a sacola guardada de uma visita anterior;
- `origem-base-e-grade`
  - antes: Barra empilhada + legenda em grade 2×2.
  - depois: Barra empilhada + legenda em grade de duas colunas (a quinta faixa ocupa a linha inteira), contando as pessoas que estão na loja agora — as mesmas do total "Agora na loja"; com ninguém na loja, a seção mostra "Ninguém na loja agora."
- `no-celular-tablet-no-resto`
  - antes: "{m} de {n}" + "o resto pelo computador".
  - depois: "{m} de {n}" + "o resto pelo computador ou tablet" (sem a segunda linha quando todos estão no celular). Com ninguém na loja, o bloco mostra "Ninguém na loja agora."
- `nota-do-checkout-promete-o-que-o-painel-nao-faz`
  - antes: Se a compra não fechar em {threshold_hours} horas, a sacola aparece como abandonada no Backoffice." O número vem de `store_settings.abandoned_cart.threshold_hours`. ⚠️ O protótipo diz "1 hora" e está errado: o padrão real é 4.
  - depois: Se a compra não fechar e o e-mail já tiver sido preenchido, a sacola fica em Carrinhos abandonados, no painel." A nota não cita prazo.
- `com-sacola-definicao-do-periodo`
  - antes: **Com sacola**: visitantes distintos do período com ≥ 1 item na sacola (agregado diário da presença; Fase 2). Na Fase 1 o número não aparece.
  - depois: **Com sacola**: das visitas do período, quantas tiveram ao menos uma joia na sacola em algum momento. No dia, cada navegador conta uma vez, na mesma régua de Visitas, e o número nunca passa de Visitas. Na Semana, é a soma dos dias (quem pôs joia na sacola em dois dias conta duas vezes), e a tela diz isso em letra pequena. A variação segue as regras de Visitas (em Hoje, as horas completas contra ontem até a mesma hora) e não aparece enquanto o período anterior não tiver sido medido inteiro desde a publicação.
- `semana-anterior-ate-o-mesmo-ponto`
  - antes: "−5% vs semana anterior";
  - depois: "−5% vs semana anterior", que compara de segunda até a hora completa atual com a semana anterior de segunda até o mesmo dia e a mesma hora, nos quatro números, e não aparece sem a semana anterior contada até esse ponto;
- `origem-app-sem-referencia-vira-direto`
  - antes: **WhatsApp** (`wa.me`, `api.whatsapp.com`, `utm_source=whatsapp`);
  - depois: **WhatsApp** (`wa.me`, `api.whatsapp.com`, `utm_source=whatsapp`). Quem chega por um link sem marcação de origem, aberto dentro do app do Instagram ou do WhatsApp, conta como "Direto", e a seção diz isso em letra pequena;
- `plurais-da-presenca`
  - antes: "{x} com joias na sacola · {y} no checkout"
  - depois: "{x} com joia na sacola" ("com joias" a partir de 2) · "{y} no checkout"; "1 pessoa" e "{n} pessoas" no número e no nome acessível do cartão
- `barras-por-minuto-distintos-subcontam`
  - antes: Cada barra é o número de visitantes distintos com batida naquele minuto.
  - depois: Cada barra é o número de pessoas na loja naquele minuto, pela mesma regra do número grande; a barra de agora é igual ao número grande.
- `joia-vista-por-uma-pessoa`: sem edição — a resposta mantém LAV-30 como está (a joia aparece mesmo com uma pessoa).

**Para a seção Decisões da `spec.md`:**

- `barras-por-minuto-distintos-subcontam`: Decisão técnica: cada barra é calculada pela mesma janela de 5 minutos do total, e o registro por minuto não soma a mesma pessoa duas vezes. Substituir o trecho por: "Cada barra é o número de pessoas na loja naquele minuto, pela mesma regra do número grande; a barra de agora é igual ao número grande."
- `id-do-visitante-na-presenca`: (Recomendado) Id próprio da presença, por navegador e por dia, sem ligação com o id do contador; ele troca à meia-noite de Brasília. 'Com sacola' conta cada navegador uma vez por dia, na mesma régua de Visitas no dia. Na Semana, 'Com sacola' é a soma dos dias (quem pôs joia na sacola em dois dias conta 2), dito em letra pequena. VIS-12 e o guarda ficam como estão.
- `com-sacola-contagem-distinta-por-dia`: decorre de id-do-visitante-na-presenca: contagem por (dia, id da presença) com o id diário; Semana = soma dos dias
- `pulso-no-mesmo-teto-por-ip`: Limitador separado para o pulso (e mais folgado), a visita mantendo o dela; o pulso não lê `store_clock` (a RPC de presença decide o instante); `Access-Control-Max-Age` no preflight da `visit`; e um teto de linhas na tabela de presença no lugar do 5.000 da 71.
- `contrato-do-corpo-do-pulso`: Contrato próprio do pulso em `core/visits` (molde de `visitBody`/`visitBodyRefusal`), com a faixa de origem calculada na loja por `sourceBucket` e guardada desde o pouso; o servidor revalida a faixa contra o vocabulário e calcula só o aparelho pelo user agent.
- `leitura-da-presenca-e-confirmacao-de-papel`: RPC própria `store_live` com `has_role` no corpo, chave de cache própria, sem `lerComPapel`; a recusa entra na mesma vigia; o desvio registrado como na 83.
- `frescor-pela-chegada-da-resposta`: Manter a régua da 83; o frescor da tela fala da leitura mais antiga das duas (molde de `maisAntigo` do Início).
- `foto-da-joia-pelo-molde-real`: `store_live` devolve `imagens` como `store_overview`, e o app usa `primaryImage`, como o TopJewels.
- `compraram-pela-regua-de-venda`: Mesma régua de venda de `store_movement`, janela pelo instante do servidor; sem canal de Realtime novo.
- `guardas-que-vao-reagir`: Lista completa no design, com o que cada guarda passa a medir; guarda novo de esquema da presença no molde de `visitasSchema`; régua de tom própria para a presença com 'pessoas' permitido só nela.
- `poda-da-presenca-sem-pg-cron`: Poda na gravação e na leitura como fonte de verdade; o job do pg_cron só quando existir; a leitura sempre recorta pela janela, nunca confia na poda.

### Leitura humana

`changes_requested_gaps`: nenhum bloqueio. O PRD prometia o que o sistema não faz (a passagem da sacola para abandonada em N horas), contradizia a Política de Privacidade e o próprio escopo (14 dias) e deixava sem régua "Com sacola", "No checkout" e a semana anterior; tudo isso foi reescrito no `prd.md`. A decisão que mais pesa na execução é o id próprio da presença, por navegador e por dia: mantém VIS-12 e faz "Com sacola" na Semana ser a soma dos dias. A Política nova continua dependendo da aprovação da Adri antes de qualquer publicação.
