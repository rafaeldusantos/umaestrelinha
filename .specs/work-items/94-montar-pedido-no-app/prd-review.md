# PRD Tech Review — WI 94

## Rodada r1

### Envelope

```json
{
  "schema": "prd-review/v1",
  "work_item_ref": "94",
  "round": 1,
  "prd_version": 1,
  "reviewed_at": "2026-11-07T20:28:02-03:00",
  "skill": "wi-workflow/prd-tech-review",
  "skill_version": "4.0.0",
  "summary": {
    "verdict": "changes_requested_blocking",
    "blocking": 2,
    "gaps": 6,
    "questions": 2,
    "tech_decisions": 10,
    "scenarios": [
      {
        "title": "A Adri escolhe uma cliente cadastrada, acrescenta duas peças com foto, aplica um cupom, cria o link e envia pelo WhatsApp; o histórico registra o envio",
        "type": "happy_path",
        "risk": "P0"
      },
      {
        "title": "Cliente nova: a Adri cola a conversa do WhatsApp, a leitura preenche contato e endereço marcados como 'Lido do texto — confira', o CEP corrige a rua e a cidade, e a ficha nasce ao criar o link",
        "type": "happy_path",
        "risk": "P0"
      },
      {
        "title": "O e-mail lido do texto já tem ficha: a tela oferece usar a ficha dela, e o endereço lido vira 'Outro endereço' sem trocar os dados da ficha",
        "type": "alternativo",
        "risk": "P1"
      },
      {
        "title": "A cliente preenche o endereço no link: a revisão diz que a entrega é escolhida por ela, sem prévia de frete",
        "type": "alternativo",
        "risk": "P1"
      },
      {
        "title": "Reabrir um pedido montado no dia seguinte: o link não pode ser mostrado de novo, e gerar outro invalida o anterior",
        "type": "alternativo",
        "risk": "P1"
      },
      {
        "title": "A leitura por IA está fora do ar ou a conta leu textos demais em pouco tempo: a frase diz isso e a Adri preenche à mão sem perder nada",
        "type": "erro",
        "risk": "P1"
      },
      {
        "title": "O preço de uma peça mudou entre a montagem e o 'Criar link': a recusa mostra o resumo relido e nada é gravado",
        "type": "erro",
        "risk": "P0"
      },
      {
        "title": "A gravação da proposta dá certo, mas o endereço não entra no cadastro da cliente: a tela diz qual parte falhou",
        "type": "erro",
        "risk": "P1"
      },
      {
        "title": "A Adri sai para o WhatsApp no meio da montagem e o Android fecha o app em segundo plano: a montagem recomeça, e nada fica guardado no celular",
        "type": "borda",
        "risk": "P1"
      },
      {
        "title": "Texto colado sem nenhum dado útil, ou com mais de 2.000 caracteres: a folha fica aberta e diz o motivo",
        "type": "borda",
        "risk": "P2"
      },
      {
        "title": "Desconto combinado que deixaria os itens abaixo de R$ 1,00: 'O desconto não pode zerar o pedido.' e o botão segue bloqueado com o motivo escrito",
        "type": "borda",
        "risk": "P1"
      },
      {
        "title": "Peça sem foto cadastrada aparece com o quadro vazio na busca, na sacola, na revisão e no pedido montado, e no link a cliente vê a mesma foto que a Adri conferiu",
        "type": "borda",
        "risk": "P2"
      },
      {
        "title": "Uma conta que perdeu o acesso ao painel tenta montar, ler um texto ou criar o link: recebe 'Esta conta não tem acesso ao painel.' e nenhum dado de cliente aparece",
        "type": "seguranca",
        "risk": "P0"
      },
      {
        "title": "O texto da conversa e o CPF não ficam no celular (armazenamento, endereço, título da aba, console) nem nos registros do servidor",
        "type": "seguranca",
        "risk": "P0"
      },
      {
        "title": "O texto da conversa, com nome, telefone, CPF e endereço, vai a um serviço de IA externo: a Política de Privacidade diz isso antes da publicação (ou a decisão de não dizer é registrada)",
        "type": "seguranca",
        "risk": "P0"
      },
      {
        "title": "No 4G, a busca de peças responde enquanto a Adri digita e a leitura do texto termina em poucos segundos, com 'Lendo o texto…' visível o tempo todo",
        "type": "performance",
        "risk": "P1"
      }
    ]
  },
  "findings": [
    {
      "id": "F1",
      "key": "escopo-implementar-ou-so-prototipo",
      "category": "blocking",
      "owner": "negocio",
      "severity": "high",
      "title": "O PRD e a Descrição dizem que nada será implementado — e o Work Item segue para implementação",
      "anchor": {
        "quote": "**Estado:** só planejamento e protótipo. Nada implementado.",
        "prefix": "do projeto *Uma Estrelinha - Backoffice*.\n",
        "suffix": "",
        "section": "Montar pedido no app do ateliê — planejamento do protótipo"
      },
      "body": "A Descrição do `item.md` termina com \"Não implementar nada, apenas planejamento de Prototipo com comportamentos\", e o PRD repete: \"só planejamento e protótipo. Nada implementado.\" O Work Item, porém, está em `fase: prd-review` com `entrada: prd`, e o próximo passo do fluxo é spec → tarefas → implementação. Se a entrega for só o protótipo (já existente no Claude Design: `Montar Pedido.dc.html` + `montado-dados.js`), não há lookup de código a fazer e o WI fecha aqui; se for implementação, o cabeçalho e a Descrição dizem o contrário do que vai acontecer. Nada no repositório implementa a montagem no app: `apps/mobile-adm/src/app/App.tsx:111-119` não tem rota de montagem nem de proposta, e não existe `features/order-proposal` no app.",
      "suggestion": "**Estado:** este Work Item implementa no app do ateliê o que o protótipo `Montar Pedido.dc.html` mostra. O protótipo é a referência de comportamento e de desenho; o que ele não mostra segue o que está escrito aqui.",
      "questions": [
        "A entrega deste Work Item é implementar no app (a recomendação), ou só o protótipo já feito no Claude Design?"
      ]
    },
    {
      "id": "F2",
      "key": "pedido-manual-proposta-ou-pago",
      "category": "question",
      "owner": "negocio",
      "severity": "high",
      "title": "\"Pedido manual\" da Descrição: proposta com link, ou também pedido já pago por fora",
      "anchor": {
        "quote": "**\"Pedido manual\" é a proposta com link, ou também um pedido já pago fora do Mercado Pago?**",
        "prefix": "## Pergunta em aberto\n\n1. ",
        "suffix": " O\n   protótipo assume a proposta",
        "section": "Pergunta em aberto"
      },
      "body": "A Descrição pede \"criar um pedido manual pelo APP\". O que existe no código é só a proposta: `order_proposals` (migration `20261103120000_89-pedido-montado.sql:32`) vira pedido apenas por `create_order_from_proposal` (`:440`), chamada pela function `checkout` quando a cliente conclui no link (`AD-070`). Não há caminho para gravar um pedido já pago fora do Mercado Pago: `pedidoComDonoUnico.test.ts` recusa escrita em `orders` pelos apps, e o único autor de pedido é a function `checkout` (`AD-035`). Um pedido já pago seria outra feature (meio de pagamento manual, conciliação, estoque, avisos). A pergunta está aberta no PRD e decide o escopo inteiro.",
      "suggestion": "1. **Pedido manual é a proposta com link.** A Adri monta, manda o link, e o pedido nasce quando a cliente confere e paga no link. Registrar pelo app um pedido já pago por fora (PIX direto, dinheiro) fica fora deste Work Item.",
      "questions": [
        "Confirma que \"pedido manual\" é a proposta com link (o pedido nasce quando a cliente paga), e que pedido já pago por fora fica para outro Work Item?"
      ]
    },
    {
      "id": "F3",
      "key": "cpf-e-endereco-no-app",
      "category": "blocking",
      "owner": "negocio",
      "severity": "high",
      "title": "O PRD pede CPF e endereço completo no app, e uma decisão vigente proíbe os dois",
      "anchor": {
        "quote": "(nome, e-mail, WhatsApp, CPF opcional)",
        "prefix": "**Colar texto da conversa**. Campos de contato\n  ",
        "suffix": " e de entrega; \"Salvar no cadastro da cliente\".",
        "section": "Passo 1 · Cliente"
      },
      "body": "A feature `76` decidiu (`MAC-29`, `AD-060`, registrado em `apps/mobile-adm/CLAUDE.md:324-328`) que o app do ateliê **nunca pede, guarda nem desenha** CPF nem endereço completo: \"nota de cliente e CPF ficam no Backoffice\". O guarda `apps/mobile-adm/src/shared/lib/__tests__/semDadoSensivelDeClienteNoApp.test.ts:57` recusa os termos `cpf`, `addresses` e `customer_document` em QUALQUER arquivo de produção do app. O PRD pede o contrário em cinco pontos: o campo CPF da cliente nova, a leitura por IA que extrai CPF, os endereços salvos da cliente cadastrada (\"outro salvo\", tabela `addresses`), o endereço digitado/lido, e a tela do pedido montado — a ação `get` da `order-proposals` devolve `customer_document` e o endereço inteiro (`supabase/functions/order-proposals/handlers.ts:108-127`), então eles atravessam a rede para o celular mesmo que a tela não os desenhe. Implementar como está escrito revoga parte de uma decisão de privacidade aprovada; isso é escolha de produto, não de código.",
      "suggestion": "Na montagem pelo app, a Adri pode digitar, ler do texto e conferir o CPF e o endereço de entrega da cliente, e ver os endereços salvos de uma cliente cadastrada — só dentro da montagem e da tela do pedido montado. Fora delas (aba Clientes, detalhe do pedido), o app continua sem mostrar CPF nem endereço completo. Nada disso fica guardado no celular: some ao fechar a montagem.",
      "questions": [
        "Autoriza o app a lidar com CPF e endereço completo dentro da montagem e do pedido montado (a recomendação), ou a montagem pelo app fica sem CPF (a cliente informa no link, como já acontece) e sem a lista de endereços salvos?"
      ]
    },
    {
      "id": "F4",
      "key": "politica-de-privacidade-texto-para-ia",
      "category": "question",
      "owner": "negocio",
      "severity": "high",
      "title": "O texto da conversa vai a um serviço de IA que a Política de Privacidade não nomeia",
      "anchor": {
        "quote": "**Política de Privacidade:** não entra nesta feature.",
        "prefix": "## Decisões (2026-11-02)\n\n- ",
        "suffix": "",
        "section": "Decisões (2026-11-02)"
      },
      "body": "O `item.md` registra a fala do usuário como \"isso aqui não precisa 3. O texto da conversa vai para a Anthropic. A Política de Privacidade precisa de um parágrafo sobre isso, aprovado pela Adri antes de publicar.\" — lida de um jeito, o item 3 foi dispensado; de outro, a segunda metade é uma exigência. O PRD ficou com a primeira leitura. O fato do código: a lista \"Com quem os seus dados são compartilhados\" (`apps/store/src/pages/PrivacyPolicyPage.tsx:53-60`) declara, no próprio comentário, que cada linha descreve um compartilhamento \"que acontece de verdade\", e hoje lista só pagamento, transportadora, e-mail e Google Analytics. A feature `61` entrou nessa lista justamente porque \"omiti-la deixaria a lista dizendo menos do que a loja faz\". Com esta feature, a conversa colada — nome, telefone, CPF, endereço e, numa loja memorial, possivelmente o contexto da perda — passa a ir a um processador novo. O precedente das features `71` e `83` foi o texto da Política aprovado pela Adri como pré-condição do deploy.",
      "suggestion": "**Política de Privacidade:** a lista \"Com quem os seus dados são compartilhados\" ganha uma linha sobre o serviço de inteligência artificial que lê, a pedido da Adri, a mensagem que ela cola para preencher o cadastro de um pedido. O texto é aprovado pela Adri e publicado junto com a leitura por IA.",
      "questions": [
        "\"isso aqui não precisa 3\" quis dizer que a Política não muda, ou que ela muda e o parágrafo precisa da aprovação da Adri antes de publicar?",
        "Se a Política não muda: aceita publicar a leitura por IA com a lista de compartilhamentos dizendo menos do que a loja faz?"
      ]
    },
    {
      "id": "F5",
      "key": "observacao-interna-na-montagem",
      "category": "gap",
      "owner": "negocio",
      "severity": "medium",
      "title": "A observação interna da proposta existe no painel e o PRD não diz se o app a tem",
      "anchor": {
        "quote": "- As peças aparecem com a foto, como na revisão.",
        "prefix": "A mensagem do WhatsApp aparece escrita.\n",
        "suffix": "\n- Copiar/WhatsApp registram",
        "section": "Pedido montado"
      },
      "body": "O WI `95` (observação do pedido) acrescentou à proposta a **Observação** interna: escrita na montagem do Backoffice e editável na página da proposta em qualquer status (`.specs/work-items/95-observacao-do-pedido/plan.md:47`, C-01), com a ação `note` na function (`supabase/functions/order-proposals/handlers.ts:988`, coluna `admin_note` em `:139`) e o campo no `save` (`:688`, `:738`). O mesmo plano já leva a observação ao detalhe do pedido no app (C-06, `:52`). O PRD da montagem no app não menciona o campo nem na montagem nem na tela do pedido montado; sem decisão, o app monta propostas sem observação e a tela do pedido montado não mostra a que o painel escreveu.",
      "suggestion": "- As peças aparecem com a foto, como na revisão.\n- A **observação interna** (a mesma do painel, só para quem administra) aparece e pode ser editada aqui em qualquer estado; na montagem, ela é um campo opcional no passo Revisar. A cliente nunca a vê.",
      "questions": [
        "A montagem e a tela do pedido montado no app têm a observação interna, como o painel?"
      ]
    },
    {
      "id": "F6",
      "key": "montagem-perdida-se-o-app-fechar",
      "category": "gap",
      "owner": "negocio",
      "severity": "medium",
      "title": "Sem nada guardado no celular, a montagem se perde quando o Android fecha o app em segundo plano",
      "anchor": {
        "quote": "Fechar a montagem com algo preenchido pede confirmação",
        "prefix": "Concluída: \"Ver o pedido #0262\".\n- ",
        "suffix": " (\"Nada foi gravado ainda\").",
        "section": "Pedido montado"
      },
      "body": "A regra do app é que nenhum dado de cliente fica no aparelho — armazenamento, URL, `history.state` além de `{ doApp: true }` (`MAC-28`, `apps/mobile-adm/src/shared/lib/__tests__/semDadoDeClienteNoAparelho.test.ts:10-19`). Com a montagem só em memória, um F5, a atualização automática do app (`registerType: 'autoUpdate'`) ou o Android descartando o PWA em segundo plano apagam o que foi preenchido. O fluxo do PRD provoca exatamente isso: a Adri sai para o WhatsApp para copiar a conversa e volta. O PRD só trata o fechamento voluntário.",
      "suggestion": "Fechar a montagem com algo preenchido pede confirmação (\"Nada foi gravado ainda\"). O que foi preenchido só existe enquanto o app está aberto: nada fica guardado no celular. Se o Android fechar o app em segundo plano, ou a página recarregar, a montagem recomeça do passo 1.",
      "questions": [
        "Aceita que a montagem se perca nesses casos (a recomendação, pela regra de nada guardado no celular), ou quer guardar no celular um rascunho só das peças e descontos, sem dado da cliente?"
      ]
    },
    {
      "id": "F7",
      "key": "voltar-do-android-entre-passos",
      "category": "gap",
      "owner": "tech_prd_edit",
      "severity": "medium",
      "title": "O PRD não diz o que o voltar do Android faz dentro dos 4 passos",
      "anchor": {
        "quote": "montagem em tela cheia em 4 passos",
        "prefix": "botão no topo de Pedidos, ",
        "suffix": " (Cliente ·\n   Peças · Descontos · Revisar)",
        "section": "O que é novo"
      },
      "body": "No app, o voltar do Android é o do navegador e nada é interceptado (`apps/mobile-adm/CLAUDE.md:534-535`); fluxos de vários passos empilham uma entrada por passo, como a recuperação (`MAF-24`, `features/recovery/model/passos.ts`) e as folhas (`useFolhaNoHistorico`). Decisão técnica: cada passo da montagem e cada folha (variação, leitura do texto) é uma entrada de histórico com o marcador só no `state`, sem dado da cliente; o voltar recua um passo, e do primeiro abre a mesma confirmação de fechar. Isso muda o comportamento observável e precisa estar no PRD.",
      "suggestion": "Decisão técnica: cada passo e cada folha da montagem é uma entrada do histórico do app, sem dado da cliente nela. Texto do PRD: montagem em tela cheia em 4 passos — o voltar do Android volta um passo (ou fecha a folha aberta), e no primeiro passo pede a mesma confirmação de fechar —"
    },
    {
      "id": "F8",
      "key": "cep-desconhecido-x-servico-fora",
      "category": "gap",
      "owner": "tech_prd_edit",
      "severity": "low",
      "title": "A tela não distingue CEP desconhecido de serviço de CEP fora do ar",
      "anchor": {
        "quote": "CEP desconhecido diz isso.",
        "prefix": "UF pelo serviço da loja; ",
        "suffix": "",
        "section": "Passo 1 · Cliente"
      },
      "body": "O serviço de CEP da loja é `useCepLookup` (`packages/core/src/hooks/useCepLookup.ts:33-58`, ViaCEP chamado do navegador), já em `core` desde a `89` e portanto alcançável pelo app. Ele junta CEP inexistente, resposta inválida e falha de rede num só resultado, `manual: true` (`:25-31`, `:44-55`). Decisão técnica: reaproveitar o hook sem mudá-lo (a loja e o painel dependem dele). Consequência observável: a frase é a mesma nos dois casos. A mesma regra vale para \"O CEP manda\": se o serviço não responde, rua, bairro e cidade ficam com o que o texto trouxe.",
      "suggestion": "Decisão técnica: o app usa o mesmo serviço de CEP da loja e do painel, sem distinguir os motivos da falha. Texto do PRD: CEP que o serviço não encontra — ou serviço de CEP fora do ar — libera rua, bairro, cidade e UF para digitar, e a tela diz que não encontrou o CEP."
    },
    {
      "id": "F9",
      "key": "limite-de-leituras-sem-frase",
      "category": "gap",
      "owner": "tech_prd_edit",
      "severity": "low",
      "title": "O limite de leituras por conta não tem estado nem frase no PRD",
      "anchor": {
        "quote": "A montagem nunca depende da IA.",
        "prefix": "nada do que você já fez se perde.\" ",
        "suffix": "\n- Nada é gravado pela leitura",
        "section": "Ler os dados de uma mensagem (IA)"
      },
      "body": "O plano técnico do próprio PRD pede \"limite por conta\" na `customer-parse`, no molde de `seo-suggest`, que responde `429 { reason: 'limited' }` depois de 30 chamadas por conta em 10 minutos (`supabase/functions/seo-suggest/index.ts:27`, `handlers.ts:129-131`; o teto é por isolate, `_shared/rateLimit.ts:17-19`). O PRD lista os estados de falha (prazo, 5xx, sem chave) mas não o de limite atingido, que é observável e precisa de frase.",
      "suggestion": "Decisão técnica: a `customer-parse` tem teto por conta no molde da `seo-suggest`. Texto do PRD: A montagem nunca depende da IA.\n- Muitas leituras seguidas pela mesma conta em pouco tempo: \"Você leu muitos textos em pouco tempo. Espere alguns minutos ou preencha à mão.\" A montagem segue igual."
    },
    {
      "id": "F10",
      "key": "foto-ausente-estrela-ou-areia",
      "category": "improvement",
      "owner": "negocio",
      "severity": "low",
      "title": "O quadro de peça sem foto no PRD é diferente do que o app já desenha",
      "anchor": {
        "quote": "Peça sem foto cadastrada: o quadro fica no fundo areia (`ground-deep`), como o card da loja",
        "prefix": "- ",
        "suffix": " — nunca um\n  ícone no lugar.",
        "section": "Passo 2 · Peças"
      },
      "body": "O app já tem uma miniatura de peça, `apps/mobile-adm/src/shared/ui/FotoDaPeca.tsx`, usada no detalhe do pedido e em \"Joias mais pedidas no mês\": fundo `ground-deep` **com a estrela da marca** quando não há foto (`:41`, `:57`), e ela já pede a rendição pelo dono único (`:47`, `renditionUrl`). O card da loja usa o fundo areia sem ícone (`apps/store/src/entities/product/ui/ProductCard.tsx:278`). Seguir o PRD dá dois desenhos de \"sem foto\" no mesmo app; reaproveitar a `FotoDaPeca` contradiz o \"nunca um ícone\".",
      "suggestion": "Peça sem foto cadastrada: o quadro fica no fundo areia com a estrela da marca, como as fotos do detalhe do pedido e de \"Joias mais pedidas\" no app",
      "questions": [
        "Sem foto, a montagem usa a moldura que o app já tem (fundo areia com a estrela) ou o quadro vazio, sem ícone, como no card da loja — e, nesse caso, o detalhe do pedido e a Início mudam junto?"
      ]
    },
    {
      "id": "F11",
      "key": "link-nao-se-recupera-ao-reabrir",
      "category": "gap",
      "owner": "tech_prd_edit",
      "severity": "medium",
      "title": "Reaberto depois, o pedido montado não consegue mostrar o link",
      "anchor": {
        "quote": "Cartão escuro com o link",
        "prefix": "### Pedido montado\n- ",
        "suffix": ", **Enviar pelo WhatsApp** (só com telefone)",
        "section": "Pedido montado"
      },
      "body": "O banco guarda só o hash do token (`SEG-01`); o link existe uma vez, na resposta de `save` ou `renew` (`supabase/functions/order-proposals/handlers.ts:729-777`). O painel o guarda em `sessionStorage` na aba (`apps/backoffice/src/features/order-proposal/model/linkMemory.ts:23-29`) e, sem ele, o cartão diz que o link não está disponível e oferece \"Gerar link novo\", que renova e mata o anterior (`ProposalLinkCard.tsx:36-46`). Decisão técnica para o app: o link vive só na memória da sessão do app (nada no armazenamento, coerente com `MAC-28`). Consequência observável: abrir um montado da lista \"Montados\" depois de fechar o app nunca mostra o link antigo. O PRD descreve o cartão como se o link estivesse sempre lá.",
      "suggestion": "Decisão técnica: o link fica só na memória do app enquanto ele está aberto. Texto do PRD: Cartão escuro com o link (logo depois de criar ou renovar; reaberto depois, o link não pode ser mostrado de novo — o cartão diz isso e oferece **Gerar link novo**, que troca o link e invalida o anterior)"
    },
    {
      "id": "F12",
      "key": "portas-de-function-no-app",
      "category": "blocking",
      "owner": "tech",
      "severity": "high",
      "title": "O app só pode invocar uma function, e a montagem precisa de três",
      "anchor": {
        "quote": "o app passa pela porta `gravarAcao`/`conferirPapel` (molde da `75`)",
        "prefix": "| já existe; ",
        "suffix": " |",
        "section": "Plano técnico (para a spec)"
      },
      "body": "`apps/mobile-adm/src/entities/order/api/__tests__/escritaSoPelaPorta.test.ts:10-19,38-56` aceita `functions.invoke` em UM arquivo (`features/push-notifications/api/portaDeAvisos.ts`) e só com o nome literal `atelie-avisos?action=…` (`INVOCACAO_ACEITA`), e fixa por igualdade os nove arquivos que importam o client (a mesma lista de `leituraSoComPapel.test.ts`). A montagem precisa invocar `order-proposals` (list/get/save/renew/cancel/log-sent/note), a nova `customer-parse` e `melhor-envio?action=quote` (a prévia da cotação, `apps/backoffice/src/features/order-proposal/api/shippingPreview.ts:47`). O molde citado no PRD está errado: `gravarAcao.ts` só entrega o client ao dono `core/order-actions` (`runAppAction`) e nunca invoca function. O molde certo é a porta dos avisos da `79` (um arquivo por function, nome literal por ação, 401/403 traduzidos por `conferirPapel` → `42501` é a recusa, rede é falha — `shared/api/recusa.ts`).",
      "suggestion": "Uma porta por function em `features/order-proposal/api/` (`portaDePropostas.ts`, `portaDeLeitura.ts` para a `customer-parse`, e a cotação), no molde de `portaDeAvisos.ts`: nome literal por ação, recusa só pelo `42501` de `conferirPapel`. Ampliar `escritaSoPelaPorta` (`INVOCACAO_ACEITA` por porta, `IMPORTAM_O_CLIENT`) e `leituraSoComPapel` com as entradas literais, e um `…ComClientReal.test.tsx` provando a recusa sobre o supabase-js real, como `avisosComClientReal`."
    },
    {
      "id": "F13",
      "key": "leituras-da-montagem-pelo-papel",
      "category": "gap",
      "owner": "tech",
      "severity": "high",
      "title": "A montagem do painel lê catálogo, promoções, cupom e pedidos direto do navegador; no app isso fura `lerComPapel`",
      "anchor": {
        "quote": "já existem pela `89`; o app só chama",
        "prefix": "`core/coupons/rules`, `payment/pricing` | ",
        "suffix": " |",
        "section": "Plano técnico (para a spec)"
      },
      "body": "As regras de preço estão em `core` (`priceProposalDraft`, `packages/core/src/proposals/pricing.ts`; `couponRefusal`, `core/coupons/rules.ts`), mas as ENTRADAS delas, no painel, são lidas por PostgREST no navegador: produtos e variações (`apps/backoffice/src/entities/product/api/useProductVariants.ts:98-120`), promoções (`useActivePromotions`, `packages/core/src/hooks/usePromotions.ts:150`), clientes e endereços (`apps/backoffice/src/entities/customer/api/useCustomerSearch.ts:75-128`). E o cupom é `validateCoupon` (`packages/core/src/hooks/useCoupons.ts:64-96`), que importa o client no próprio módulo e lê `coupons` e `orders` (para `first_order_only`) — no app, isso seria uma leitura de `orders` fora de `lerComPapel` (`AD-058`), que os guardas do app não veem porque o arquivo mora em `core`. A conta sem papel receberia, da RLS de `orders`, só os pedidos dela, e a resposta de \"já comprou?\" seria falsa sem erro (`MAI-23`).",
      "suggestion": "Uma ação nova `preview` na `order-proposals` (mesma `precificar` do `save`, `requireAdmin`, sem gravar) que devolve o resumo travável e a recusa do cupom com o texto da loja; o app manda só a escolha (peças, cupom, desconto, e-mail) e nunca lê promoções, cupons nem `orders`. O resumo vivo chama `preview` a cada mudança, com a anterior cancelada. As leituras que restam no app (busca de clientes, endereços salvos, peças e variações) entram em `lerComPapel`."
    },
    {
      "id": "F14",
      "key": "busca-de-produto-e-capas-sobem-ao-core",
      "category": "gap",
      "owner": "tech",
      "severity": "high",
      "title": "A busca de produto, as capas e a folha da variação são do Backoffice e o app não as alcança",
      "anchor": {
        "quote": "a mesma leitura de capas da montagem do Backoffice (`useProductCovers`, `AD-071`)",
        "prefix": "| Fotos das peças | ",
        "suffix": " e a imagem por variação da `81`",
        "section": "Plano técnico (para a spec)"
      },
      "body": "Pelo `AD-036` (`.specs/STATE.md:832-865`) o dono da busca é `apps/backoffice/src/entities/product`: `useProductPool` (leitura de todo o catálogo, ~137 KB, `useProductPool.ts:1-30`), `buscarProdutos` (`entities/product/lib/buscarProdutos.ts`) e a dobra de acento em `apps/backoffice/src/shared/lib/texto.ts`. As capas são `useProductCovers` (`entities/product/api/useProductCovers.ts:17-46`) e a peça com variações, estoque e capa é `useProductVariants.ts:98-160`; o seletor de variação com foto é o `VariantPicker` do painel. Nada disso é importável pelo app (app não importa de outro app). Pelo `AD-056`, a regra que dois apps leem sobe para `core` antes de o app consumi-la, e o painel reexporta por referência. O guarda `buscaDeProdutoComDonoUnico` tem escopo só no painel; a segunda busca no app nasceria sem guarda. A imagem por variação existe na coluna `product_variants.image_url` (`supabase/migrations/20260801120000_01-product-variants-pricing.sql:37`).",
      "suggestion": "Subir para `core` (com `.ts` explícito, pura): `buscarProdutos` + a dobra de busca, `capaDaLinha` e o mapeamento da peça para proposta (variações, estoque, capa da variação com recuo para a da peça); o painel reexporta por referência (`toBe`). As leituras ficam no app, dentro de `lerComPapel`, com as mesmas projeções. Ampliar `buscaDeProdutoComDonoUnico` (ou um par no app) para recusar a segunda busca. A foto continua pela `FotoDaPeca`/`renditionUrl`."
    },
    {
      "id": "F15",
      "key": "salvar-endereco-no-cadastro-pela-function",
      "category": "gap",
      "owner": "tech",
      "severity": "medium",
      "title": "\"Salvar no cadastro da cliente\" é escrita PostgREST do navegador no painel, e o app não pode escrever",
      "anchor": {
        "quote": "\"Salvar no cadastro da cliente\".",
        "prefix": "(nome, e-mail, WhatsApp, CPF opcional) e de entrega; ",
        "suffix": "",
        "section": "Passo 1 · Cliente"
      },
      "body": "A `order-proposals` não recebe o pedido de salvar o endereço: o painel grava em `addresses` (o nome da tabela é `addresses`, criada em `20260414121021_….sql:69`, policy de admin em `:214`) com `insert` direto do navegador DEPOIS do `save` (`apps/backoffice/src/entities/customer/api/useCustomerSearch.ts:145-165`, chamado em `apps/backoffice/src/pages/admin/AdminProposalBuilderPage.tsx:110-128`), e a falha vira o aviso \"A proposta foi gravada, mas não consegui salvar o endereço\" (`model/copy.ts:15`). No app, `escritaSoPelaPorta` recusa qualquer `insert`. A RPC `save_order_proposal` já cria a ficha da cliente nova (`20261103120000_89-pedido-montado.sql:291-301`) mas não grava endereço.",
      "suggestion": "O `save` da `order-proposals` aceita `save_address: true`, e a RPC `save_order_proposal`, recriada em migration nova, grava o endereço em `addresses` da ficha (a escolhida ou a recém-criada) na mesma transação da proposta. O painel passa a usar o mesmo campo e deixa de escrever em `addresses` pelo navegador (um dono da escrita). Os guardas que medem a RPC vigente (`pedidoMontadoSchema`, o da `95`) passam a ler a migration nova."
    },
    {
      "id": "F16",
      "key": "foto-do-link-diverge-da-montagem",
      "category": "gap",
      "owner": "tech",
      "severity": "medium",
      "title": "A foto gravada na proposta usa outra regra que a da montagem, e o link pode sair sem foto",
      "anchor": {
        "quote": "Na sacola, cada linha mostra a foto da variação escolhida — a mesma que a cliente verá no link.",
        "prefix": "\"Salvar\".\n- ",
        "suffix": "",
        "section": "Passo 2 · Peças"
      },
      "body": "A montagem do painel mostra a foto da variação ou, sem ela, a capa `images[0]` com recuo para a coluna antiga `image_url` (`apps/backoffice/src/entities/product/api/useProductVariants.ts:125-155`, `useProductCovers.ts:27-29`), e o comentário diz que \"o catálogo importado só tem a galeria\". A `order-proposals` grava no snapshot `product_image = variacao.image_url || produto.image_url` (`supabase/functions/order-proposals/handlers.ts:321,403`) — sem olhar `images`. Para a peça importada sem foto por variação, a Adri vê a capa e o link (que lê o snapshot, `supabase/functions/checkout/proposal.ts:211`) sai sem foto. A frase do PRD só fica verdadeira se a regra for uma.",
      "suggestion": "Um dono da regra \"qual foto vai na linha\" em `core` (variação → `images[0]` → `image_url`), chamado pela montagem do app, pela do painel e pela `precificar` da `order-proposals` (que passa a pedir `images->0->>url`). Probe contra o banco local com uma peça sem foto por variação."
    },
    {
      "id": "F17",
      "key": "lista-de-montados-no-app",
      "category": "gap",
      "owner": "tech",
      "severity": "medium",
      "title": "A ação `list` não traz as peças do cartão, e \"Montados\" não existe no endereço de Pedidos do app",
      "anchor": {
        "quote": "Cartão: número `P-0000`, estado, cliente",
        "prefix": "- ",
        "suffix": ", \"Montado há 2 dias · vale até 05/11\"",
        "section": "Pedidos · Montados"
      },
      "body": "`list` devolve só `COLUNAS_DA_LISTA` (id, número, estado, prazo, cliente, `items_total`…, `supabase/functions/order-proposals/handlers.ts:145-157`), com teto de 500 e sem paginação (`:526-557`) — sem as peças que o cartão do PRD mostra. \"Há 2 dias\" no app vem do relógio do servidor (`lido_em` de `atelie_clock`, `AD-058`), e a function não devolve o seu. A visão \"Montados\" é local do painel, fora de `ORDER_VIEWS` (`AD-070`); no app, `pedidosHref`/`recorteDoEndereco` só conhecem `ORDER_VIEWS` e caem no padrão para qualquer outro valor (`apps/mobile-adm/src/entities/order/model/pedidosHref.ts:32,48-64`), e a lista de Pedidos lê `order_list` por `lerComPapel` com cursor, outra fonte e outra paginação.",
      "suggestion": "A `list` ganha, por proposta, as linhas resumidas (nome, foto do snapshot, quantidade, até um teto) e o `agora` do servidor; a visão \"Montados\" entra em `pedidosHref` como destino próprio (`?visao=montados`, dono único do endereço) e é desenhada por um widget próprio que lê pela porta da `order-proposals`, sem cursor; o contador \"N abertos\" sai da mesma resposta."
    },
    {
      "id": "F18",
      "key": "customer-parse-no-molde-real",
      "category": "naming",
      "owner": "tech",
      "severity": "low",
      "title": "A porta do Claude é saída estruturada por JSON Schema, não tool use; e o modo de leitura precisa ir à function",
      "anchor": {
        "quote": "saída por *tool use* com esquema fixo",
        "prefix": "`claude-haiku-5-5`, ",
        "suffix": ", `has_role` antes de tudo",
        "section": "Plano técnico (para a spec)"
      },
      "body": "`supabase/functions/_shared/claudePort.ts:11-21` pede `schema` e a montagem manda `output_config.format: { type: 'json_schema' }` (`claudeRequest.ts:41-45`); não há tool use na porta (`AD-067`). A régua que confere a saída mora em `packages/core/src/customers/parse.ts` (novo) e precisa ser alcançável pelo Deno: o barril `packages/core/src/validators/index.ts:1-6` reexporta sem `.ts` e não serve; as folhas `cpf.ts`, `cep.ts`, `phone.ts`, `email.ts` servem, importadas por caminho com extensão (o `denoReach` de `core/customers` precisa cobrir o arquivo novo). O escopo \"só o endereço\" de cliente cadastrada precisa ser um parâmetro da chamada, para a function nem devolver contato. A regra \"o CEP manda\" depende do ViaCEP, chamado no navegador (`useCepLookup`), logo a fusão texto × CEP é uma função pura de `core` chamada pelo app, não pela function.",
      "suggestion": "`customer-parse` usa `createClaudeJson` com JSON Schema fixo, `claude-haiku-5-5` e esforço explícito, `requireAdmin` primeiro, 503 sem chave, teto por conta, log sem o texto (só tamanho e desfecho), e `mode: 'contact_and_address' | 'address'`. `core/customers/parse.ts` confere e normaliza (máscaras, dígito do CPF, e-mail) com imports `.ts` das folhas; `core/customers/mergeCep.ts` (puro) aplica \"o CEP manda\" no app."
    },
    {
      "id": "F19",
      "key": "link-precisa-da-origem-da-loja",
      "category": "gap",
      "owner": "tech",
      "severity": "medium",
      "title": "O app não tem a origem da loja para montar o link",
      "anchor": {
        "quote": "Link de 7 dias, token no fragmento, WhatsApp pelo `whatsappChatUrl`",
        "prefix": "- ",
        "suffix": ", a mensagem da `LNK-02` emendada.",
        "section": "O que muda em relação à 89"
      },
      "body": "A function devolve só o token; o link é montado no cliente por `proposalLink(origem, token)` (`packages/core/src/proposals/link.ts:14`), e o painel lê a origem de `VITE_STORE_URL` por um leitor único (`apps/backoffice/src/shared/lib/storeOrigin.ts`). O app não tem essa env (`apps/mobile-adm/.env.example` só declara as duas do Supabase); `turbo.json` já lista `VITE_STORE_URL` no `env`, mas o projeto Vercel do app não a teria.",
      "suggestion": "Um leitor único de `VITE_STORE_URL` em `apps/mobile-adm/src/shared/config/`, a env no `.env.example` e no projeto Vercel do app; sem ela, o cartão diz que o link não pôde ser montado (a mesma frase `LINK_WITHOUT_STORE` do painel, subida para `core/proposals`)."
    },
    {
      "id": "F20",
      "key": "guardas-do-app-a-ampliar",
      "category": "gap",
      "owner": "tech",
      "severity": "medium",
      "title": "Os guardas de privacidade, tom e movimento do app têm escopo literal e não alcançam a montagem",
      "anchor": {
        "quote": "o desenho e os guardas do app (tom memorial, `motion-reduce`, 44px, sem dado de cliente no aparelho)",
        "prefix": "visão em `PedidosPage` | ",
        "suffix": " |",
        "section": "Plano técnico (para a spec)"
      },
      "body": "`semDadoDeClienteNoAparelho.test.ts:35-43` varre só as pastas de Clientes (`PASTAS`, `PAGINAS`); `movimentoDosPedidos`, `tomMemorialDeClientes` e afins têm listas literais de arquivos (`apps/mobile-adm/CLAUDE.md:567,579-580`). Uma `features/order-proposal` nova ficaria fora de todos. `semDadoSensivelDeClienteNoApp.test.ts:57` varre o app inteiro e reprovaria o CPF e `addresses` da montagem; se `cpf-e-endereco-no-app` for aprovado, ele precisa de exceção literal por pasta, com o restante do app continuando proibido. A rota cheia precisa sumir a barra de abas (`barraNoCaminho`, `widgets/tab-bar/model/tabs.ts:51`) e entrar no bloco do `RequireAdmin` (`rotasSobGuarda`).",
      "suggestion": "Na mesma tarefa que cria cada pasta: incluí-la em `semDadoDeClienteNoAparelho` (pastas) e nos guardas de tom e movimento (com as âncoras subidas), exceção literal em `semDadoSensivelDeClienteNoApp` só para `features/order-proposal` e as duas páginas novas (se F3 aprovado), e `barraNoCaminho`/`rotasSobGuarda` com as rotas novas."
    },
    {
      "id": "F21",
      "key": "order-proposals-nao-sobe-local",
      "category": "gap",
      "owner": "tech",
      "severity": "medium",
      "title": "A `order-proposals` não sobe no edge runtime local, e a prova só pode ser local",
      "anchor": {
        "quote": "A gravação é pela function de admin `order-proposals`",
        "prefix": "o servidor recalcula (`PRC-01`/`PRC-02`).\n- ",
        "suffix": " — nunca escrita PostgREST do app",
        "section": "O que muda em relação à 89"
      },
      "body": "`supabase/CLAUDE.md:507-510`: `order-proposals` e `mercado-pago` falham no edge runtime local com `Failed resolving types` no `import type` de pacote de `packages/core/src/pricing/index.ts` e `grid.ts`; a prova da `89` trocou os imports por alias locais e restaurou. Testes e provas deste projeto rodam só contra o Supabase local. Sem consertar o grafo, toda prova em navegador do app (criar link, renovar, cancelar, a `preview`) e o probe da `customer-parse` (se ela importar `core/pricing`) dependem do mesmo remendo.",
      "suggestion": "Primeira tarefa do plano: tornar o grafo de `core/pricing` alcançável pelo Deno (tipo declarado em `core` e reexportado pelo pacote de tipos, no molde do `MenuPromo`), com `denoReach` cobrindo os dois arquivos, e conferir o boot local das duas functions antes de qualquer prova."
    },
    {
      "id": "F22",
      "key": "base-da-89-sem-verificacao",
      "category": "improvement",
      "owner": "none",
      "severity": "info",
      "title": "A montagem da 89, que o app herda, não passou por Verifier nem QA",
      "anchor": {
        "quote": "Busca do dono único (`AD-036`)",
        "prefix": "### Passo 2 · Peças\n- ",
        "suffix": ". Cada linha:",
        "section": "Passo 2 · Peças"
      },
      "body": "`apps/backoffice/CLAUDE.md:1384`: \"Prova: `.specs/features/89-pedido-montado-pelo-painel/prova-navegador.md`. Sem Verifier nem QA ainda.\" O app reaproveita a function e as regras da `89`; defeitos dela aparecem nas duas superfícies. A `first_order_only` é conferida pelo servidor contando qualquer pedido do e-mail (`order-proposals/handlers.ts:423-429`), a mesma régua da loja (`packages/core/src/hooks/useCoupons.ts:88-94`) — nada a decidir. O desconto do Compre Junto fica fora da proposta por decisão do WI `92` (`.specs/work-items/92-desconto-da-compra-casada/prd.md:34`, Q-07)."
    },
    {
      "id": "F23",
      "key": "plano-tecnico-no-prd",
      "category": "improvement",
      "owner": "none",
      "severity": "info",
      "title": "A tabela \"Plano técnico\" é detalhe de implementação dentro do PRD",
      "anchor": {
        "quote": "## Plano técnico (para a spec)",
        "prefix": "",
        "suffix": "",
        "section": "Plano técnico (para a spec)"
      },
      "body": "A seção nomeia functions, arquivos e hooks — conteúdo da spec, não do PRD. Ela é lida como premissa pela costura, e três células estão erradas ou incompletas contra o código: o molde da gravação (F12), a disponibilidade das capas e da busca para o app (F14) e o formato de saída do modelo (F18)."
    }
  ]
}
```

### Respostas da página, por `key`

- `escopo-implementar-ou-so-prototipo` — owner final `negocio` · **aplicado**
  - escolha (p1): **Estado:** este Work Item implementa no app do ateliê o que o protótipo `Montar Pedido.dc.html` mostra. O protótipo é a referência de comportamento e de desenho; o que ele não mostra segue o que está escrito aqui.
- `pedido-manual-proposta-ou-pago` — owner final `negocio` · **aplicado**
  - escolha (p1): 1. **Pedido manual é a proposta com link.** A Adri monta, manda o link, e o pedido nasce quando a cliente confere e paga no link. Registrar pelo app um pedido já pago por fora (PIX direto, dinheiro) fica fora deste Work Item.
- `cpf-e-endereco-no-app` — owner final `negocio` · **aplicado**
  - escolha (p1): Na montagem pelo app, a Adri pode digitar, ler do texto e conferir o CPF e o endereço de entrega da cliente, e ver os endereços salvos de uma cliente cadastrada — só dentro da montagem e da tela do pedido montado. Fora delas (aba Clientes, detalhe do pedido), o app continua sem mostrar CPF nem endereço completo. Nada disso fica guardado no celular: some ao fechar a montagem.
  - texto (p1): Vamos guardar CPF e Endereço, são dados necessários para o processo.
- `politica-de-privacidade-texto-para-ia` — owner final `negocio` · **aplicado**
  - escolha (p1): A Política não muda nesta feature (risco aceito de a lista dizer menos do que a loja faz)
- `observacao-interna-na-montagem` — owner final `negocio` · **aplicado**
  - escolha (p1): - As peças aparecem com a foto, como na revisão.
- A **observação interna** (a mesma do painel, só para quem administra) aparece e pode ser editada aqui em qualquer estado; na montagem, ela é um campo opcional no passo Revisar. A cliente nunca a vê.
- `montagem-perdida-se-o-app-fechar` — owner final `negocio` · **aplicado**
  - escolha (p1): Guardar no celular um rascunho só das peças e descontos, sem dado da cliente
  - texto (p1): vamos manter uma guarda em rascunho em caso de celular bloquear ou usuário sair da tela
- `voltar-do-android-entre-passos` — owner final `tech_prd_edit` · **aplicado**
  - escolha (p1): Decisão técnica: cada passo e cada folha da montagem é uma entrada do histórico do app, sem dado da cliente nela. Texto do PRD: montagem em tela cheia em 4 passos — o voltar do Android volta um passo (ou fecha a folha aberta), e no primeiro passo pede a mesma confirmação de fechar —
- `cep-desconhecido-x-servico-fora` — owner final `tech_prd_edit` · **aplicado**
  - escolha (p1): Decisão técnica: o app usa o mesmo serviço de CEP da loja e do painel, sem distinguir os motivos da falha. Texto do PRD: CEP que o serviço não encontra — ou serviço de CEP fora do ar — libera rua, bairro, cidade e UF para digitar, e a tela diz que não encontrou o CEP.
- `limite-de-leituras-sem-frase` — owner final `tech (rebaixado de tech_prd_edit: "é detalhe de implementação")` · **aplicado**
  - escolha (p1): É detalhe de implementação — não muda o PRD
- `foto-ausente-estrela-ou-areia` — owner final `negocio` · **aplicado**
  - escolha (p1): Peça sem foto cadastrada: o quadro fica no fundo areia com a estrela da marca, como as fotos do detalhe do pedido e de "Joias mais pedidas" no app
- `link-nao-se-recupera-ao-reabrir` — owner final `tech_prd_edit (a ressalva da página 1 contradizia o rebaixamento; página 2 do mesmo gate)` · **aplicado**
  - escolha (p1): É detalhe de implementação — não muda o PRD
  - texto (p1): Manter botão com copiar o link dentro de pedido montado, não há a necessidade de gerar um novo. Isso deve ser ajsutado no BAckoffice também.
  - escolha (p2): Guardar o token cifrado no banco (coluna nova, chave só no servidor das functions); a ação get devolve o link enquanto a proposta está aberta; app e painel mostram Copiar sempre; Renovar continua trocando o link. O ajuste do painel entra neste WI.
  - texto (p2): Renovar mostra apenas depois de inspirar o link atual (lido como "expirar")
- `portas-de-function-no-app` — owner final `tech` · **aplicado**
  - escolha (p1): Uma porta por function em `features/order-proposal/api/` (`portaDePropostas.ts`, `portaDeLeitura.ts` para a `customer-parse`, e a cotação), no molde de `portaDeAvisos.ts`: nome literal por ação, recusa só pelo `42501` de `conferirPapel`. Ampliar `escritaSoPelaPorta` (`INVOCACAO_ACEITA` por porta, `IMPORTAM_O_CLIENT`) e `leituraSoComPapel` com as entradas literais, e um `…ComClientReal.test.tsx` provando a recusa sobre o supabase-js real, como `avisosComClientReal`.
- `leituras-da-montagem-pelo-papel` — owner final `tech` · **aplicado**
  - escolha (p1): Uma ação nova `preview` na `order-proposals` (mesma `precificar` do `save`, `requireAdmin`, sem gravar) que devolve o resumo travável e a recusa do cupom com o texto da loja; o app manda só a escolha (peças, cupom, desconto, e-mail) e nunca lê promoções, cupons nem `orders`. O resumo vivo chama `preview` a cada mudança, com a anterior cancelada. As leituras que restam no app (busca de clientes, endereços salvos, peças e variações) entram em `lerComPapel`.
- `busca-de-produto-e-capas-sobem-ao-core` — owner final `tech` · **aplicado**
  - escolha (p1): Subir para `core` (com `.ts` explícito, pura): `buscarProdutos` + a dobra de busca, `capaDaLinha` e o mapeamento da peça para proposta (variações, estoque, capa da variação com recuo para a da peça); o painel reexporta por referência (`toBe`). As leituras ficam no app, dentro de `lerComPapel`, com as mesmas projeções. Ampliar `buscaDeProdutoComDonoUnico` (ou um par no app) para recusar a segunda busca. A foto continua pela `FotoDaPeca`/`renditionUrl`.
- `salvar-endereco-no-cadastro-pela-function` — owner final `tech` · **aplicado**
  - escolha (p1): O `save` da `order-proposals` aceita `save_address: true`, e a RPC `save_order_proposal`, recriada em migration nova, grava o endereço em `addresses` da ficha (a escolhida ou a recém-criada) na mesma transação da proposta. O painel passa a usar o mesmo campo e deixa de escrever em `addresses` pelo navegador (um dono da escrita). Os guardas que medem a RPC vigente (`pedidoMontadoSchema`, o da `95`) passam a ler a migration nova.
- `foto-do-link-diverge-da-montagem` — owner final `tech` · **aplicado**
  - escolha (p1): Um dono da regra "qual foto vai na linha" em `core` (variação → `images[0]` → `image_url`), chamado pela montagem do app, pela do painel e pela `precificar` da `order-proposals` (que passa a pedir `images->0->>url`). Probe contra o banco local com uma peça sem foto por variação.
- `lista-de-montados-no-app` — owner final `tech` · **aplicado**
  - escolha (p1): A `list` ganha, por proposta, as linhas resumidas (nome, foto do snapshot, quantidade, até um teto) e o `agora` do servidor; a visão "Montados" entra em `pedidosHref` como destino próprio (`?visao=montados`, dono único do endereço) e é desenhada por um widget próprio que lê pela porta da `order-proposals`, sem cursor; o contador "N abertos" sai da mesma resposta.
- `customer-parse-no-molde-real` — owner final `tech` · **aplicado**
  - escolha (p1): `customer-parse` usa `createClaudeJson` com JSON Schema fixo, `claude-haiku-5-5` e esforço explícito, `requireAdmin` primeiro, 503 sem chave, teto por conta, log sem o texto (só tamanho e desfecho), e `mode: 'contact_and_address' | 'address'`. `core/customers/parse.ts` confere e normaliza (máscaras, dígito do CPF, e-mail) com imports `.ts` das folhas; `core/customers/mergeCep.ts` (puro) aplica "o CEP manda" no app.
- `link-precisa-da-origem-da-loja` — owner final `tech` · **aplicado**
  - escolha (p1): Um leitor único de `VITE_STORE_URL` em `apps/mobile-adm/src/shared/config/`, a env no `.env.example` e no projeto Vercel do app; sem ela, o cartão diz que o link não pôde ser montado (a mesma frase `LINK_WITHOUT_STORE` do painel, subida para `core/proposals`).
- `guardas-do-app-a-ampliar` — owner final `tech` · **aplicado**
  - escolha (p1): Na mesma tarefa que cria cada pasta: incluí-la em `semDadoDeClienteNoAparelho` (pastas) e nos guardas de tom e movimento (com as âncoras subidas), exceção literal em `semDadoSensivelDeClienteNoApp` só para `features/order-proposal` e as duas páginas novas (se F3 aprovado), e `barraNoCaminho`/`rotasSobGuarda` com as rotas novas.
- `order-proposals-nao-sobe-local` — owner final `tech` · **aplicado**
  - escolha (p1): Primeira tarefa do plano: tornar o grafo de `core/pricing` alcançável pelo Deno (tipo declarado em `core` e reexportado pelo pacote de tipos, no molde do `MenuPromo`), com `denoReach` cobrindo os dois arquivos, e conferir o boot local das duas functions antes de qualquer prova.
- `base-da-89-sem-verificacao` — owner `none` · **sem item**
- `plano-tecnico-no-prd` — owner `none` · **sem item**
- `cpf-endereco-onde-guardar` (item de confirmação da p2, sobre a ressalva de `cpf-e-endereco-no-app`) — **aplicado**: Confirmo: guardados no cadastro da cliente, nunca no celular

### O que foi aplicado, e onde

- `prd.md` (cópia; a origem no Claude Design não foi editada): os 10 keys da linha r1 do Histórico de revisões — o trecho depois de cada um está no `prd.md` com o texto da resposta.
- **Decisões** do `spec.md` (a escrever): `portas-de-function-no-app`, `leituras-da-montagem-pelo-papel`, `busca-de-produto-e-capas-sobem-ao-core`, `salvar-endereco-no-cadastro-pela-function`, `foto-do-link-diverge-da-montagem`, `lista-de-montados-no-app`, `link-precisa-da-origem-da-loja`, `guardas-do-app-a-ampliar` (com a exceção de CPF/endereço aprovada), `order-proposals-nao-sobe-local`, `customer-parse-no-molde-real`, `limite-de-leituras-sem-frase`, e a de `link-nao-se-recupera-ao-reabrir` (token cifrado no banco, `get` devolve o link enquanto aberta, ajuste do painel neste WI), `voltar-do-android-entre-passos`, `cep-desconhecido-x-servico-fora`, `montagem-perdida-se-o-app-fechar` (rascunho no aparelho só de peças e descontos — exceção estreita à MAC-28).

### Leitura

Veredito `changes_requested_blocking`, resolvido no gate: nenhum item ficou aberto. O WI implementa no app; o escopo cresce em dois pontos que o PRD não previa — o link recuperável (cifra do token, mudança de SEG-01, ajuste do painel) e o rascunho no aparelho. A Política de Privacidade não muda, com o risco aceito escrito no PRD.
