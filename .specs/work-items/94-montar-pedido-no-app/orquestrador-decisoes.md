# Decisões do orquestrador — 94

Perguntas da sessão e quem respondeu: o árbitro (agente validador), a página de review técnico ou o humano.

## G1 — gate da página

- Etapa: Planejamento · humano respondeu na página · página web da wi-workflow

**Página:** /private/tmp/claude-503/-Users-rafael-santos-Projetos-uma-estrelinha-store/86242d0c-1cbd-43ad-87f9-74b12a2038fe/scratchpad/wi/94

**Respostas (answers.json):**

```json
{
  "wi": "94",
  "respostas": [
    {
      "id": "escopo-implementar-ou-so-prototipo",
      "escolha": "**Estado:** este Work Item implementa no app do ateliê o que o protótipo `Montar Pedido.dc.html` mostra. O protótipo é a referência de comportamento e de desenho; o que ele não mostra segue o que está escrito aqui.",
      "texto": ""
    },
    {
      "id": "cpf-e-endereco-no-app",
      "escolha": "Na montagem pelo app, a Adri pode digitar, ler do texto e conferir o CPF e o endereço de entrega da cliente, e ver os endereços salvos de uma cliente cadastrada — só dentro da montagem e da tela do pedido montado. Fora delas (aba Clientes, detalhe do pedido), o app continua sem mostrar CPF nem endereço completo. Nada disso fica guardado no celular: some ao fechar a montagem.",
      "texto": "Vamos guardar CPF e Endereço, são dados necessários para o processo."
    },
    {
      "id": "portas-de-function-no-app",
      "escolha": "Uma porta por function em `features/order-proposal/api/` (`portaDePropostas.ts`, `portaDeLeitura.ts` para a `customer-parse`, e a cotação), no molde de `portaDeAvisos.ts`: nome literal por ação, recusa só pelo `42501` de `conferirPapel`. Ampliar `escritaSoPelaPorta` (`INVOCACAO_ACEITA` por porta, `IMPORTAM_O_CLIENT`) e `leituraSoComPapel` com as entradas literais, e um `…ComClientReal.test.tsx` provando a recusa sobre o supabase-js real, como `avisosComClientReal`.",
      "texto": ""
    },
    {
      "id": "pedido-manual-proposta-ou-pago",
      "escolha": "1. **Pedido manual é a proposta com link.** A Adri monta, manda o link, e o pedido nasce quando a cliente confere e paga no link. Registrar pelo app um pedido já pago por fora (PIX direto, dinheiro) fica fora deste Work Item.",
      "texto": ""
    },
    {
      "id": "politica-de-privacidade-texto-para-ia",
      "escolha": "A Política não muda nesta feature (risco aceito de a lista dizer menos do que a loja faz)",
      "texto": ""
    },
    {
      "id": "observacao-interna-na-montagem",
      "escolha": "- As peças aparecem com a foto, como na revisão.\n- A **observação interna** (a mesma do painel, só para quem administra) aparece e pode ser editada aqui em qualquer estado; na montagem, ela é um campo opcional no passo Revisar. A cliente nunca a vê.",
      "texto": ""
    },
    {
      "id": "montagem-perdida-se-o-app-fechar",
      "escolha": "Guardar no celular um rascunho só das peças e descontos, sem dado da cliente",
      "texto": "vamos manter uma guarda em rascunho em caso de celular bloquear ou usuário sair da tela"
    },
    {
      "id": "voltar-do-android-entre-passos",
      "escolha": "Decisão técnica: cada passo e cada folha da montagem é uma entrada do histórico do app, sem dado da cliente nela. Texto do PRD: montagem em tela cheia em 4 passos — o voltar do Android volta um passo (ou fecha a folha aberta), e no primeiro passo pede a mesma confirmação de fechar —",
      "texto": ""
    },
    {
      "id": "cep-desconhecido-x-servico-fora",
      "escolha": "Decisão técnica: o app usa o mesmo serviço de CEP da loja e do painel, sem distinguir os motivos da falha. Texto do PRD: CEP que o serviço não encontra — ou serviço de CEP fora do ar — libera rua, bairro, cidade e UF para digitar, e a tela diz que não encontrou o CEP.",
      "texto": ""
    },
    {
      "id": "limite-de-leituras-sem-frase",
      "escolha": "É detalhe de implementação — não muda o PRD",
      "texto": ""
    },
    {
      "id": "link-nao-se-recupera-ao-reabrir",
      "escolha": "É detalhe de implementação — não muda o PRD",
      "texto": "Manter botão com copiar o link dentro de pedido montado, não há a necessidade de gerar um novo. Isso deve ser ajsutado no BAckoffice também."
    },
    {
      "id": "leituras-da-montagem-pelo-papel",
      "escolha": "Uma ação nova `preview` na `order-proposals` (mesma `precificar` do `save`, `requireAdmin`, sem gravar) que devolve o resumo travável e a recusa do cupom com o texto da loja; o app manda só a escolha (peças, cupom, desconto, e-mail) e nunca lê promoções, cupons nem `orders`. O resumo vivo chama `preview` a cada mudança, com a anterior cancelada. As leituras que restam no app (busca de clientes, endereços salvos, peças e variações) entram em `lerComPapel`.",
      "texto": ""
    },
    {
      "id": "busca-de-produto-e-capas-sobem-ao-core",
      "escolha": "Subir para `core` (com `.ts` explícito, pura): `buscarProdutos` + a dobra de busca, `capaDaLinha` e o mapeamento da peça para proposta (variações, estoque, capa da variação com recuo para a da peça); o painel reexporta por referência (`toBe`). As leituras ficam no app, dentro de `lerComPapel`, com as mesmas projeções. Ampliar `buscaDeProdutoComDonoUnico` (ou um par no app) para recusar a segunda busca. A foto continua pela `FotoDaPeca`/`renditionUrl`.",
      "texto": ""
    },
    {
      "id": "salvar-endereco-no-cadastro-pela-function",
      "escolha": "O `save` da `order-proposals` aceita `save_address: true`, e a RPC `save_order_proposal`, recriada em migration nova, grava o endereço em `addresses` da ficha (a escolhida ou a recém-criada) na mesma transação da proposta. O painel passa a usar o mesmo campo e deixa de escrever em `addresses` pelo navegador (um dono da escrita). Os guardas que medem a RPC vigente (`pedidoMontadoSchema`, o da `95`) passam a ler a migration nova.",
      "texto": ""
    },
    {
      "id": "foto-do-link-diverge-da-montagem",
      "escolha": "Um dono da regra \"qual foto vai na linha\" em `core` (variação → `images[0]` → `image_url`), chamado pela montagem do app, pela do painel e pela `precificar` da `order-proposals` (que passa a pedir `images->0->>url`). Probe contra o banco local com uma peça sem foto por variação.",
      "texto": ""
    },
    {
      "id": "lista-de-montados-no-app",
      "escolha": "A `list` ganha, por proposta, as linhas resumidas (nome, foto do snapshot, quantidade, até um teto) e o `agora` do servidor; a visão \"Montados\" entra em
```

## G2 — gate da página

- Etapa: Planejamento · humano respondeu na página · página web da wi-workflow

**Página:** /private/tmp/claude-503/-Users-rafael-santos-Projetos-uma-estrelinha-store/86242d0c-1cbd-43ad-87f9-74b12a2038fe/scratchpad/wi/94

**Respostas (answers.json):**

```json
{
  "wi": "94",
  "respostas": [
    {
      "id": "link-nao-se-recupera-ao-reabrir",
      "escolha": "Guardar o token cifrado no banco (coluna nova, chave só no servidor das functions); a ação get devolve o link enquanto a proposta está aberta; app e painel mostram Copiar sempre; Renovar continua trocando o link. O ajuste do painel entra neste WI.",
      "texto": "Renovar mostra apenas depois de inspirar o link atual"
    },
    {
      "id": "cpf-endereco-onde-guardar",
      "escolha": "Confirmo: guardados no cadastro da cliente, nunca no celular",
      "texto": ""
    }
  ],
  "enviadoEm": "2026-11-08T00:09:00.731Z"
}
```

## G3 — gate da página

- Etapa: Planejamento · humano respondeu na página · página web da wi-workflow

**Página:** /private/tmp/claude-503/-Users-rafael-santos-Projetos-uma-estrelinha-store/86242d0c-1cbd-43ad-87f9-74b12a2038fe/scratchpad/wi/94

**Respostas (answers.json):**

```json
{
  "wi": "94",
  "respostas": [
    {
      "id": "prototipo-contra-decisoes-do-gate",
      "escolha": "Valem as decisões do gate, com a frase nova da folha de renovar",
      "texto": ""
    },
    {
      "id": "rascunho-e-sair-voluntario",
      "escolha": "\"Sair\" apaga o rascunho; ele só serve para a volta involuntária",
      "texto": "Dar a opção de salvar rascunho ou descartar ao sair voluntário."
    },
    {
      "id": "motivo-do-desconto-no-rascunho",
      "escolha": "Não: o rascunho leva as peças, o cupom e o valor do desconto; o motivo é escrito de novo",
      "texto": ""
    },
    {
      "id": "endereco-falha-desfaz-tudo",
      "escolha": "Uma gravação só; a frase da falha parcial sai",
      "texto": ""
    },
    {
      "id": "endereco-informado-exige-campos",
      "escolha": "Exigir CEP, rua, número, bairro, cidade e UF (complemento opcional)",
      "texto": ""
    },
    {
      "id": "estoque-soma-a-sacola",
      "escolha": "Sim: o teto soma a mesma variação já na sacola (\"Só há N em estoque.\")",
      "texto": ""
    },
    {
      "id": "chip-montados-entre-os-chips",
      "escolha": "Montados entra ao fim, sem tirar nenhum chip de hoje",
      "texto": ""
    },
    {
      "id": "origem-montado-no-app",
      "escolha": "Uma origem só, \"Pedido montado\", nos dois apps",
      "texto": ""
    },
    {
      "id": "busca-de-cliente-com-cpf",
      "escolha": "Não: nome, e-mail ou telefone, como diz o PRD",
      "texto": ""
    },
    {
      "id": "catalogo-no-celular",
      "escolha": "Catálogo uma vez, mesma regra do painel (subida a core)",
      "texto": ""
    },
    {
      "id": "cifra-do-link",
      "escolha": "Igual, mas o secret é opcional (sem ele, comportamento de hoje)",
      "texto": ""
    },
    {
      "id": "core-pricing-ja-alcancavel",
      "escolha": "A tarefa vira: denoReach de pricing, boot local conferido das três functions e os dois CLAUDE.md corrigidos",
      "texto": ""
    },
    {
      "id": "cupom-primeira-compra-sem-email",
      "escolha": "Sem e-mail, o cupom de primeira compra é recusado no resumo: \"Este cupom pede o e-mail da cliente.\"",
      "texto": ""
    }
  ],
  "enviadoEm": "2026-11-08T00:24:54.271Z"
}
```

## G4 — aprovação da fila de 10 tarefas e do plano de ondas

- Etapa: Planejamento · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

> | 06 | `folha-colar-texto` | App: folha da leitura no passo 1 | `portaDeLeitura`, os dois escopos, marcas "Lido do texto — confira.", aviso com Ler outro texto e Desfazer, "o CEP manda", sem dados, fora do ar, limite | UC-05 | 03, 05 |
> | 07 | `passo-pecas` | App: passo 2 + folha da variação | leituras do catálogo pelo `lerComPapel` (catálogo uma vez), busca do dono em `core` e o guarda ampliado ao app, folha da variação com foto, teto de estoque somando a sacola, sacola com foto (D-22, D-27) | UC-06 | 01, 06 |
> | 08 | `passo-descontos-e-preview` | App: passo 3 | ação `preview` na `order-proposals`; cupom (a recusa sem e-mail), desconto combinado com motivo, resumo vivo e PIX (D-02, D-29) | UC-07 | 07 |
> | 09 | `revisar-e-criar-link` | App: passo 4 | revisão com fotos, prévia da cotação pela porta, observação opcional, `save` com `save_address` e PRC-02, "Editar" de uma proposta existente reabrindo a montagem preenchida | UC-08, UC-09 (Editar) | 02, 08 |
> | 10 | `rascunho-da-montagem` | App: rascunho e folha de sair | o dono do rascunho no aparelho (peças, cupom e valor do desconto, sem motivo e sem dado da cliente), a folha de sair com guardar ou descartar, a volta involuntária, e o guarda da chave nova; a chave e as baselines nos CLAUDE.md (D-15, D-18, D-19) | UC-02 (rascunho) | 09 |
> 
> **Fica fora:** nada além do que o PRD declara fora (a Política de Privacidade, "Colar texto" no Backoffice e o pedido já pago por fora). As tarefas 03 e 01 são agregados sem tela própria. Elas existem porque seus contratos são lidos por mais de uma tarefa (01) ou porque o servidor se verifica sozinho e libera paralelismo (03).
> 
> **Plano de ondas.** O grafo sai do campo "Depende de" de cada tarefa:
> - `01 → 02 → 04 → 05 → 06 → 07 → 08 → 09 → 10`
> - `06` depende também da `03`
> - `07` depende também da `01`
> - `09` depende também da `02`
> 
> ONDAS: 01,03 | 02 | 04 | 05 | 06 | 07 | 08 | 09 | 10
> 
> - **W1 (01, 03).** As duas não tocam os mesmos arquivos:
>   - 01: `packages/core/src/proposals/` (foto da linha e textos), o módulo de busca novo em `core`, `packages/core/src/pricing/__tests__/`, os reexports do painel em `entities/product/`, `shared/lib/texto.ts` e `features/order-proposal/model/copy.ts`, o teste `…NoCore`, `buscaDeProdutoComDonoUnico`, `packages/core/CLAUDE.md` e a linha do boot em `supabase/CLAUDE.md`;
>   - 03: `supabase/functions/customer-parse/`, `packages/core/src/customers/` (`parse`, `mergeCep` e o barril), `claudeSoNaPorta.test.ts` e `supabase/config.toml`.
> - **W2 a W9: uma tarefa por onda.** O app concentra arquivos que toda tarefa dele edita: `App.tsx`, `escritaSoPelaPorta`, `leituraSoComPapel`, `semDadoSensivelDeClienteNoApp`, `semDadoDeClienteNoAparelho`, `tabs.ts` e a pasta `features/order-proposal`. O `order-proposals/handlers.ts` é editado pela 02, pela 04 e pela 08, cada uma na sua onda.
> - **Nenhuma dependência foi relaxada.** A 02 precisa do código da regra da foto que a 01 cria. As tarefas do app compartilham os guardas.
> 
> Aprova a fila e o plano de ondas, e autoriza a execução? Recomendo aprovar como está.
> 
> [[WI:PLAN:ASK:aprovação da fila de 10 tarefas e do plano de ondas]]

**Resposta:**

Decidiu: **fila aprovada como está, plano de ondas aprovado, pode executar** depois de escrever a `tasks/` e passar pelo `wi-task-audit`. É decisão delegada pela política do humano ("Aprovação da fila e 'pode executar' […] aprovar depois da conferência de cobertura da costura"). Vai no mesmo sentido do precedente WI-01 ("fila aprovada, siga").

**O que conferi nos arquivos**
- **Os UCs.** Os 10 UCs de `spec.md:10-21` têm tarefa:
  - UC-01 → 04
  - UC-02 → 05 e 10
  - UC-03 e UC-04 → 05
  - UC-05 → 03 e 06
  - UC-06 → 07
  - UC-07 → 08
  - UC-08 → 09
  - UC-09 → 04 e 09
  - UC-10 → 02
- **As decisões.** D-01 a D-30 (`spec.md:300-333`) têm dono na fila. Alguns conferidos:
  - D-02 `preview` → 08
  - D-04 `save_address` → 02 e 09
  - D-05 → 01 e 02
  - D-14 e D-28 (a cifra) → 02 e 04
  - D-17 (a folha de renovar) → 02 e 04
  - D-24 → 01
  - D-29 → 08
  - D-30 (a observação) → 04 e 09
  - D-15, D-18 e D-19 → 10
- **O que fica fora.** Bate com o que é dito fora em `prd.md:122-136` e `spec.md:37-44`: a Política de Privacidade, o "Colar texto" no Backoffice e o pedido já pago por fora.
- **O fatiamento.** Cada tarefa é uma tela; 01 e 03 são agregados com contrato próprio, que se verificam sozinhos. 01 serve a 02, 07 e 09. 03 tem um consumidor só neste WI, a 06, mas a function nasce compartilhável por decisão do PRD (`prd.md:115`, `prd.md:125-126`). A Regra 1 de `references/planning/tasks.md:13-16` aceita os dois casos.
- **As dependências e as ondas.** Estão coerentes. `order-proposals/handlers.ts` é editado pela 02, pela 04 e pela 08, cada uma na sua onda. As tarefas do app (04 a 10) correm em série.
- **A onda W1 (01 e 03).** Os arquivos listados não se cruzam. O barril `./customers` já existe em `packages/core/package.json:44`, então a 03 não toca o `package.json` de `core`. O módulo de busca novo da 01 vai precisar de uma entrada nova ali.

**Três pontos para escrever a `tasks/`.** Não bloqueiam a aprovação, mas precisam estar nos arquivos das tarefas:
1. **W1: os CLAUDE.md são da 01.** `packages/core/CLAUDE.md`, `supabase/CLAUDE.md` e `packages/core/package.json` ficam com a 01 nesta onda. A 03 não os edita. O registro da `customer-parse` e de `core/customers/parse.ts` nesses CLAUDE.md fica com a 06 (ou com uma tarefa depois de W1). Sem isso, as duas tarefas paralelas escreveriam no mesmo arquivo.
2. **D-25 no app.** A tarefa 04 deve dizer onde o app mostra a origem "Pedido montado": no histórico da proposta e, se for o caso, no detalhe do pedido que nasceu dela. Hoje "Montado pelo painel" só existe no painel (`apps/backoffice/src/pages/admin/AdminOrderPage.origem.test.tsx:97`).
3. **D-02 na tarefa 05.** A 05 deve citar que a busca de clientes e os endereços salvos são lidos dentro de `lerComPapel`, com as entradas literais em `leituraSoComPapel`.

**Próximo passo.** Escrever `tasks/01..10` (cada uma com `**Status:** pending`), rodar o `wi-task-audit` (a fila tem 10 tarefas) e corrigir o que ele achar. Feito isso, pode executar a fila a partir da W1 (01 e 03).

## G5 — renovar a proposta aberta sem cifra (conflito D 17 × D 28 achado pela auditoria)

- Etapa: Planejamento · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

> A auditoria saiu como "a fila serve com correção", com dois achados.
> 
> **Achado 2, já corrigido:** na tarefa 09 o critério do PRD estava cortado. Repus a segunda linha: "Expirada: Renovar prazo (folha de confirmação; o link antigo morre). Concluída: 'Ver o pedido #0262'."
> 
> **Achado 1, precisa de decisão:** duas decisões do gate não cabem juntas.
> - D-17 e o PRD dizem que Renovar só aparece depois de o link expirar, e a tarefa 02 faz o servidor recusar o `renew` da proposta aberta.
> - D-28 diz que, sem a chave da cifra, ou numa proposta aberta antes do deploy, o cartão segue com "Gerar link novo", como hoje.
> - Hoje "Gerar link novo" é o próprio renovar: o botão chama `renew` (`AdminProposalPage.tsx:98`, `ProposalLinkCard.tsx:42`).
> - Com as duas regras, essa proposta aberta fica sem link e sem como gerar outro. A tarefa 04 copia o mesmo recuo para o app.
> 
> Opções:
> - **A (recomendo).** O `renew` aceita a proposta aberta só quando ela não tem cifra, ou seja, quando o link não pode ser mostrado. Nesse caso o botão diz "Gerar link novo". Com cifra, a aberta não renova, e Renovar continua só para a expirada. Preserva as duas decisões, e o caso some sozinho quando as propostas antigas vencerem e a chave estiver configurada.
> - **B.** Renovar só na expirada, sem exceção. A proposta aberta sem cifra mostra "O link não pode ser mostrado de novo" e espera expirar, ou é cancelada e montada de novo.
> - **C.** Tornar o secret obrigatório no deploy. Sobra só a transição das propostas abertas antes do deploy, que segue a A ou a B.
> 
> Com a resposta, corrijo `spec.md` (D-28) e as tarefas 02 e 04, gravo `fase: implement` e fecho o planejamento.
> 
> ONDAS: 01,03 | 02 | 04 | 05 | 06 | 07 | 08 | 09 | 10
> [[WI:PLAN:ASK:renovar a proposta aberta sem cifra (conflito D-17 × D-28 achado pela auditoria)]]

**Resposta:**

Decidiu: **opção A**. O `renew` aceita a proposta aberta (ou vista) só quando ela não tem cifra gravada, e nesse caso o botão diz "Gerar link novo". Com cifra, a aberta não renova, e "Renovar prazo" continua só para a expirada.

Por que eu decido em vez de escalar: a escolha não é de produto. Ela é a única leitura em que as duas decisões do humano no gate principal continuam valendo.
- D-28 (`spec.md:331`) diz duas vezes, com as palavras do humano, que sem a chave e nas propostas abertas antes do deploy "o cartão segue com 'Gerar link novo' como hoje" ("sem ele, comportamento de hoje"). Hoje esse botão é o `renew` da proposta aberta.
- D-17 (`spec.md:320`) e o PRD (`prd.md:105`) tratam do Renovar da proposta que tem link para mostrar.
- B anularia D-28: a proposta ficaria sem link e sem botão, o que não é "como hoje".
- C tornaria obrigatório um secret que D-28 declarou opcional. Isso reverte o gate e é do humano.
- A não muda texto do PRD, não cria entidade, coluna nem endpoint (o `renew` já existe) e é reversível. O caso some quando as propostas antigas vencem e a chave está configurada, porque renovar uma aberta sem cifra com a chave presente já grava a cifra.

Correções exatas, antes de gravar `fase: implement`:

1. **`spec.md`, D-28 (`:331`)**: acrescentar que "Gerar link novo" chama `renew`. O `renew` aceita a proposta `open`/`viewed` só quando ela não tem cifra gravada, troca o hash e, com a chave configurada, grava a cifra no mesmo `update`. Com cifra, a aberta é recusada, como diz D-17.

2. **`tasks/02-link-sempre-e-endereco-no-painel.md`**:
   - `:44`: o `renew` recusa a não expirada **que tem cifra**. Aceita a aberta/vista sem cifra (o recuo de D-28). Nos dois casos troca hash e cifra (esta só com a chave) no mesmo `update`.
   - `:47`: trocar `renew: state === 'expired'` por `renew: state === 'expired' || (aberta/vista && sem link disponível)`. O `proposalActions` passa a receber essa entrada (por exemplo `linkAvailable`/`hasCipher`, vinda do `get`), e o rótulo é "Gerar link novo" no segundo caso e "Renovar prazo" no primeiro.
   - `:14`, `:22` (só no comentário de contexto, não no critério copiado do PRD), `:54` e `:96`: "Renovar só da expirada, **salvo o recuo sem cifra de D-28**".
   - `:71`: teste do `renew` em três casos:
     - recusa a aberta com cifra;
     - aceita a aberta sem cifra e, com a chave configurada, ela sai com cifra;
     - renova a expirada.
   - `:73`: o `proposalActions` só deixa renovar a expirada, ou a aberta sem link disponível. Precisa de um sensor de que a aberta com link **não** renova.
   - `:74`: deixar explícito que "Gerar link novo" sem token no `get` chama `renew` e mostra o link novo.

3. **`tasks/04-montados-e-pedido-montado-no-app.md`**:
   - `:13` e `:58`: acrescentar a mesma exceção ("salvo o recuo sem cifra de D-28").
   - `:37` já diz "Gerar link novo (= renovar)" e está certo.
   - `:78`: o teste da página real confere que, sem token, "Gerar link novo" chama `renew` e passa a mostrar o link.
   - `:98` continua valendo: o servidor é da 02.

As ondas não mudam: a 02 continua antes da 04.

## G6 — gate da página (1 item)

- Etapa: Plano de QA · humano respondeu na página · página web da wi-workflow

**Página:** http://127.0.0.1:8477/

**Respostas (answers.json):**

```json
{
  "wi": "94",
  "respostas": [
    {
      "id": "Q-01",
      "escolha": "Volta a Montados, com a montagem fora do histórico",
      "texto": ""
    }
  ],
  "enviadoEm": "2026-11-08T12:24:39.019Z"
}
```

## G7 — Gate 1 — aprovação do plano de QA

- Etapa: Plano de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

> - **Critérios cobertos:** os 10 de 10 (UC-01..UC-10 do `spec.md`); nenhum fica sem cobertura.
> - **Charters:** 7 exploratórios, um acima do teto de 6. CH-07 é o painel, em 1440. CH-05 é a conta sem papel de admin. Juntá-los a outro charter obrigaria a trocar de persona no meio da sessão.
> - **Automação:** e2e 41 (os 41 ainda não existem) · integration 1 · manual 16.
> - **Pastas:** `.specs/work-items/94-montar-pedido-no-app/qa/test-plans/` e `qa/test-cases/`, no worktree. O test-plan é `montar-pedido-no-app-test-plan.md`, versão 2, com `**Gate 1:** pendente`.
> 
> **Perguntas 🟡**
> - Montados vazio, carregando e com erro não têm desenho nem texto. O plano confere só o tom e que o estado não falha em silêncio.
> - A frase do limite de leituras (429) ficou para a implementação. O plano confere só o tom e a saída "Preencher à mão".
> - "Ver o pedido #NNNN", na Concluída, leva ao detalhe do pedido no app.
> - O ambiente local precisa destes itens, que bloqueiam TC se faltarem:
>   - `PROPOSAL_TOKEN_KEY` no `.env` das functions. O `session-summary.md` diz que ela falta; sem ela, os TC do link ficam bloqueados.
>   - `ANTHROPIC_API_KEY` no mesmo `.env`. Sem ela, os TC da leitura por IA ficam bloqueados, menos o caso "fora do ar".
>   - `VITE_STORE_URL` apontando para a loja local.
>   - A conta `cliente-sem-papel` criada no banco local.
>   - A proposta Expirada preparada com a validade passada no banco local.
> - O Android é simulado no browser: o voltar é `history.back`, a fonte do sistema é a fonte da raiz, e o processo encerrado é fechar a aba.
> 
> **Perguntas 🟢**
> - F5 durante o Editar recomeça como montagem vazia (D-41), e o Editar não tem rascunho. É candidato a backlog.
> - O selo de D-35 e a observação não editável de D-36 divergem do desenho e do PRD. As duas coisas foram decididas na costura.
> - A Política de Privacidade não cita o serviço de IA que lê o texto colado. Vale revisitar antes de publicar.
> 
> Aprova o plano para seguir para a execução? O modo `planejar` termina no Gate 1: nenhum charter foi executado e nada foi commitado.
> 
> [[WI:QA_REPORT:ASK:Gate 1 — aprovação do plano de QA]]

**Resposta:**

Aprovo o Gate 1 do plano de QA do WI 94. A decisão é delegada pela política do humano, na regra "QA local: aprovar o plano de QA (Gate 1) quando bate com o relatório dos agentes e com o que está em `qa/`".

O que conferi no worktree (`.specs/work-items/94-montar-pedido-no-app/`):
- **Casos e versão do plano:** há 58 TCs em `qa/test-cases/`, como no resumo da sessão. O test-plan está na versão 2, em modo revisar, com `**Gate 1:** pendente` (`qa/test-plans/montar-pedido-no-app-test-plan.md:81-82`).
- **Cobertura:** UC-01..UC-10 estão cobertos e o plano registra "**Sem cobertura:** nada" (test-plan:239-252).
- **Pergunta 🔴:** a única era a Q-01, e ela está ✅. A resposta virou D-43 (test-plan:270-274; `spec.md:346`). A D-43 entrou nos casos TC-FUNC-003, TC-FUNC-025 e TC-JOURNEY-001, nos charters CH-01 e CH-04 e nos riscos (test-plan:145, 158, 162, 242, 263). Fica coerente com o G6 desta etapa, que o humano respondeu na página.
- **Perguntas 🟡 e 🟢:** nenhuma pede decisão de produto antes da execução. As 🟡 de ambiente são critérios de entrada: se faltarem `PROPOSAL_TOKEN_KEY`, `ANTHROPIC_API_KEY`, `VITE_STORE_URL`, a conta sem papel ou a proposta Expirada, os casos ficam `blocked` e a rodada sai `partial`. As 🟢 vão para backlog ou já estão decididas na costura (D-35, D-36, D-41).
- **Charters:** são 9 arquivos. Os 7 exploratórios passam um do teto de 6, e a justificativa (troca de persona no CH-05 e no CH-07) é técnica e aceitável. Os outros dois são o de CFR (CH-08) e o design check (CH-09).

Uma correção no `item.md`, antes ou junto do registro do Gate 1:
- **A duplicata já não existe:** a tabela Gates tem uma linha só "qa-plano" (`item.md:31`).
- **O texto dessa linha está errado:** ela ainda diz "respondida no chat … · página expirada sem respostas", e isso contradiz o G6 (respondido na página) e a linha 32.
- **Como corrigir:** troque esse trecho por "1 pergunta 🔴 respondida na página (Q-01 → voltar leva a Montados, montagem fora do histórico; D-43)". Depois atualize o resultado da linha para registrar o Gate 1 aprovado pelo árbitro (política do humano).
- **O mesmo no plano:** mude `**Gate 1:** pendente` para aprovado (2026-11-08).

Depois disso, siga para a execução do QA (modo executar da `wi-qa-validation`). Os charters rodam em 390 primeiro, e o painel (CH-07) em 1440. Os testes rodam só contra o Supabase local, com `*.supabase.co` bloqueado.

## G8 — Gate 1 — aprovação do plano de QA

- Etapa: Plano de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

> O relatório com o pedido de aprovação do Gate 1 já foi entregue. O plano segue com o Gate 1 pendente, à espera da resposta.
> 
> [[WI:QA_REPORT:ASK:Gate 1 — aprovação do plano de QA]]

**Resposta:**

Decidiu: **Gate 1 aprovado**. O plano de QA segue para a execução (Fase 2), na ordem dos charters do plano: smoke primeiro (TC-SMOKE-001..003, que abre o CH-01), depois CH-01, CH-06, CH-02, CH-03, CH-04, CH-07, CH-05, CH-08 e CH-09.

Decisão delegada pela política do humano: "QA local: aprovar o plano de QA (Gate 1) quando bate com o relatório dos agentes e com o que está em `qa/`" (`~/.claude/feature/politica.md`).

O que conferi (pasta `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/`):
- **Contagens.** O plano declara 58 TC, 24 deles P0. Na pasta `qa/test-cases/` há 58 arquivos: FUNC 33, JOURNEY 6, CFR 4, INT 3, SEC 3, SMOKE 3, PERSONA 2, REG 2, UI 2. Encontrei 24 arquivos com prioridade P0 e 24 entradas `"priority": "P0"` no plano. Também batem os 9 charters em `test-plans/charters/` e as 6 jornadas em `test-plans/journeys/`.
- **Cobertura.** A seção Cobertura do `qa/test-plans/montar-pedido-no-app-test-plan.md` liga cada critério, de UC-01 a UC-10, a pelo menos um TC, e declara "Sem cobertura: nada". São os mesmos 10 UCs que o `qa-report.md` dá como COVERED.
- **Perguntas 🔴.** Nenhuma aberta. A Q-01 foi respondida pelo humano na página (G6, `answers.json` de 2026-11-08: "Volta a Montados, com a montagem fora do histórico"). A resposta virou a D-43 no `spec.md` e foi aplicada no plano v2: TC-FUNC-003, TC-FUNC-025, o passo 6b da TC-JOURNEY-001 e a ação "Deve tentar" no CH-01 e no CH-04. As perguntas que sobram são 🟡 ou 🟢, sem pergunta de produto pendente.
- **Validation.** O `qa-report.md` está com `Status: PASS`, o que cumpre o critério de entrada.
- **Exploratórios.** São 7, um acima do teto de 6, e o plano justifica: dois apps e uma recusa por papel nova (CH-05, CH-07). Aceito.

O que a sessão precisa fazer na rodada:
1. Registrar como bug P1 a falha que o plano já prevê: o voltar depois de "Criar link" cai na montagem vazia, e pela D-43 deveria levar a Montados. Anexar as URLs e o `history.length` de cada voltar.
2. Se faltar `PROPOSAL_TOKEN_KEY` ou `ANTHROPIC_API_KEY` no ambiente local, marcar os casos afetados como `blocked`. Pelos critérios de saída do plano, isso deixa a rodada `partial`, e o veredito não pode sair como `pass`.
3. Usar só o ambiente local (Supabase 54441); nunca `*.supabase.co`.

## G9 — Gate 3 — confirmação do veredito de QA

- Etapa: Execução de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

> 
> **Lotes de correção sugeridos (no qa-result.md)**
> - L1: BUG-001 e BUG-007 (o voltar)
> - L2: BUG-002 e BUG-018 (folha da variação)
> - L3: BUG-003
> - L4: BUG-004, BUG-005, BUG-012 e BUG-013 (casca da montagem)
> - L5 a L13: um lote para cada bug medium e low restante
> 
> **Os TCs bloqueados**
> - **TC-INT-003:** o Mercado Pago foi tirado de propósito das functions locais, porque o token disponível é de produção (`APP_USR`) e um PIX criaria cobrança real.
> - **TC-FUNC-033:** não foi possível provocar a falha da gravação.
> - **TC-UI-002:** a massa não tem peça sem foto.
> 
> **Premissas de ambiente que tomei sozinho (raio: só o banco local e arquivos fora do git)**
> - Contas: as variáveis `QA_*` não existem nesta máquina. Usei o admin do `seed.sql` e criei uma conta sem papel, `sem-papel.qa94@exemplo.invalid`, só no banco local. As credenciais ficaram num arquivo do scratchpad, não no repositório.
> - Massa:
>   - criei o cupom `QA94PRIMEIRA`;
>   - venci no banco local o prazo do P-0035, criado nesta rodada pelo CH-04, para o CH-07 testar o pedido vencido;
>   - as sessões criaram os pedidos montados P-0034 a P-0037 para clientes sintéticas.
> - `PROPOSAL_TOKEN_KEY`: gerei uma chave local e a guardei num `.env` temporário no scratchpad. Esse `.env` não leva as chaves do Resend, do Mercado Pago nem as `SUPABASE_*`.
> - Arquivos `.env` dos apps: copiados do checkout principal para o worktree, com `VITE_STORE_URL=http://localhost:8082` acrescentado. Ficam fora do git.
> 
> Corrigi uma célula confusa na tabela de Sessões do qa-result.md (linha do CH-09). Nada foi commitado.
> 
> [[WI:QA_EXEC:ASK:Gate 3 — confirmação do veredito de QA]]

**Resposta:**

Decidi: Gate 3 confirmado. Aceito o veredito **fail** com os **20 bugs novos** e **sem transições**. É decisão delegada pela política do humano, na regra "QA local: confirmar o veredito (Gate 3) quando bate com o relatório dos agentes e com o que está em `qa/`". Também segue o precedente do WI 92, em que o humano respondeu "Siga" a esta mesma pergunta.

O que conferi em `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/qa/`:
- **Os casos de teste batem com o JSON do `qa-result.md`.** São 58 TCs: 13 fail, 3 blocked, 9 skip e 33 pass, os mesmos números do resumo. Todo TC `fail` aponta para um `bug_ref`.
- **Cobertura:** 3 critérios cobertos (UC-02, UC-03 e UC-05) e 7 parciais. Nenhum critério ficou sem TC. Os 3 bloqueados têm motivo escrito: no TC-INT-003, o Mercado Pago foi tirado de propósito para não gerar cobrança real.
- **Os bugs estão íntegros.** São 20 arquivos em `issues/`, todos com `"status": "open"`. A severidade de cada arquivo é a mesma da tabela: 4 high, 4 medium e 12 low.
- **Cada bug cita evidência que existe.** As screenshots citadas estão em `qa/screenshots/` (são 61) e a sessão de origem está em `qa/sessions/`. Por exemplo, o BUG-001 aparece no CH-01 e no CH-04, e o BUG-004 no CH-08 a 200 %.
- **As severidades seguem o impacto na persona.** Os 4 high são "Dano à confiança" nas jornadas P0 de montagem. As 12 divergências de desenho estão em low.
- **Transições:** nenhuma é correta. É a primeira rodada, não havia `issues/` antes e não houve reteste, então não existe `cannot-reproduce` a justificar.
- **Perguntas ao produto: 0, com justificativa no próprio `qa-result.md`.** O "Cancelar" durante a leitura tem base na spec e virou o BUG-003. A gravação no pedido montado e o cupom com promoção não impedem a Adri de concluir e foram para o backlog. O rascunho já está conforme D-15, D-18 e D-42. Nenhuma decisão com destino "escopo deste WI" ficou pendente.

**Próximo passo:** marcar `**Gate 3:** confirmado` no `qa-result.md` e seguir a skill para a correção pelos lotes L1 a L13. Cada fix task leva o bug íntegro como critério, com um repositório por lote.

Na rodada de correção, vale olhar estes pontos dos Riscos residuais (registro, não condição):
- o BUG-007 com cliente nova, que não foi testado;
- o passo 3 do TC-FUNC-033, também não testado;
- a divergência de frete na loja depois de editar, vista uma vez só.

## G10 — Gate 3 — confirmação do veredito de QA

- Etapa: Execução de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

>     — "Salvar no cadastro" marcada ao trocar para cliente sem endereço (painel)
>     — Editar no painel reabre o endereço salvo como salvo
>     — Investigar endereço salvo repetido na ficha da cliente
>     — Aviso de cookies sem cobrir o botão de pagar no celular
>     — Montados já atualizado na volta de um cancelamento
> Confirma o veredito, os bugs novos e as transições?
> ```
> 
> **Por que o veredito é partial e não pass:** os 13 TC que falharam na r1 passaram, e o TC-FUNC-033, que estava bloqueado, também passou. Dois casos seguem bloqueados pelo ambiente, sem defeito por trás:
> - **TC-INT-003 (P1):** o Mercado Pago não está configurado no local. Por isso não está provado que o pedido montado vira Concluída quando o PIX é aprovado.
> - **TC-UI-002 (P2):** a massa de teste não tem nenhuma peça sem foto.
> 
> Os 9 `skip` vêm da r1, e dois deles são P0: TC-FUNC-009 e TC-INT-001.
> 
> **Para decidir no Gate 3:**
> - **S-2:** a 320 × 568 com fonte a 200 %, o rótulo "ComplementoOpcional" rola a página 42 px de lado. Pela letra do TC-CFR-001 isso seria um `fail` de severidade baixa; o explorador deu `pass` com ressalva. A triagem manteve como sugestão de backlog, porque a r1 não mediu essa tela e então não conta como regressão.
> - **Divergência no `qa-report.md`:** o resumo da Validation 1 diz 21.005 testes, mas as linhas da tabela somam 22.005. A triagem usou a soma das linhas e anotou isso no resultado.
> 
> Confirmado o gate, eu gravo `status: resolved` e uma linha no Histórico de cada um dos 20 bugs, troco para `**Gate 3:** confirmado em 2026-11-08` no `qa-result.md`, acrescento a linha `QA · Gate 3 — veredito` no `item.md` e confiro tudo no disco.
> 
> Arquivos:
> - /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/qa/qa-result.md
> - /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94/.specs/work-items/94-montar-pedido-no-app/qa/retest.md
> 
> [[WI:QA_EXEC:ASK:Gate 3 — confirmação do veredito de QA]]

**Resposta:**

Decidi confirmar o Gate 3. Fica o veredito **partial**, com **0 bugs novos** e as **20 transições open → resolved** (BUG-001 a BUG-020), sem reabertura e sem `cannot-reproduce`. É decisão delegada pela política do humano, pela regra "QA local: confirmar o veredito (Gate 3) quando bate com o relatório dos agentes e com o que está em `qa/`". Segue também o precedente do WI 92 (Gate 3 → "Siga") e o G9 desta etapa.

O que conferi no disco, em `.specs/work-items/94-montar-pedido-no-app/qa/` do worktree `store__feature-94`:
- **Contagem dos TC.** A soma das contagens dos 7 logs da r2 em `sessions/` dá `fail 0` em todos (CH-01:53, CH-03:43, CH-04:49, CH-06:45, CH-07:42, CH-08:37, CH-09:43). Isso bate com o envelope do `qa-result.md`: pass 47 · fail 0 · blocked 2 (TC-INT-003 e TC-UI-002) · skip 9. Os 9 skips vêm da r1, e a seção *Fora da cobertura* declara os dois P0 (TC-FUNC-009 e TC-INT-001).
- **Reteste.** `retest.md:9` diz "resolved 20 · still-open 0 · cannot-reproduce 0 · blocked 0", com `Resultado | resolved` em cada um dos 20 blocos. As 20 linhas de *Transições propostas* repetem esse veredito e citam evidência `RT-r2-*`/`CH-*-r2-*`. Há 50 screenshots r2 em `screenshots/`.
- **Partial e não pass.** A causa é só ambiente: o Mercado Pago não está configurado no local (TC-INT-003) e a massa não tem peça sem foto (TC-UI-002). Os dois estão em *Riscos residuais* e em *Fora da cobertura*.

**S-2, o ponto que tem algo a ressalvar.** O TC-CFR-001 tem como meta `scrollWidth` igual à viewport em toda tela, inclusive a 320 × 568 (`test-cases/TC-CFR-001.md`). O CH-08 mediu 42 px de rolagem lateral nesse tamanho (`sessions/CH-08-cfr-montagem-e-pedido-montado.md:44`). Pela letra do TC, o `pass` dele é discutível. Mesmo assim, deixar S-2 como sugestão de backlog segue a regra da skill para a rodada de confirmação: só vira bug o que regrediu (TC que passava e agora falha) ou o achado novo `critical`/`high` (`wi-qa-validation/references/setup/workspace.md:76`). O TC-CFR-001 já falhava na r1, e S-2 é `low`. A ressalva já está escrita em *Riscos residuais* ("Leitura estrita do TC-CFR-001"), então não peço correção. A sugestão "Rótulo do Complemento quebra e separa o 'Opcional'" precisa estar no backlog levado ao fecho do WI.

A diferença de 21.005 contra 22.005 testes é do `qa-report.md` (Validation 1), não deste veredito. A triagem já a anotou no gate técnico. Não muda nada aqui.

Pode gravar: `status: resolved` e uma linha no Histórico de cada um dos 20 `issues/BUG-*.md`, `**Gate 3:** confirmado em 2026-11-08` no `qa-result.md` e a linha `QA · Gate 3 — veredito` no `item.md`. Depois confira no disco e registre esta decisão em `orquestrador-decisoes.md`.
