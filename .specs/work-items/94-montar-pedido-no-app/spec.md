# 94 · Montar pedido no app do ateliê, com a leitura dos dados da cliente por IA

Costura de 2026-11-07. PRD r1.

Registro do que se descobriu e decidiu nesta data — **não** descrição do estado atual do código.
Critérios de aceite: `prd.md`, ao lado. Convenção de cada repositório: o arquivo de instruções dele.

## Escopo

| UC | Título | Origem |
| -- | ------ | ------ |
| UC-01 | Pedidos do app: "Montar pedido" e a visão "Montados · N abertos" com os cartões | comportamento numerado nesta costura (PRD › Pedidos · Montados) |
| UC-02 | Montagem em tela cheia em 4 passos: barra com total e motivo de bloqueio, voltar do Android, confirmação de fechar, rascunho no celular | comportamento numerado nesta costura (PRD › O que é novo 1; Pedido montado, último item) |
| UC-03 | Passo 1, cliente cadastrada: busca, endereço padrão, outro salvo, "Outro endereço", "A cliente preenche no link" | comportamento numerado nesta costura (PRD › Passo 1) |
| UC-04 | Passo 1, cliente nova: contato e entrega, CPF, "Salvar no cadastro", e-mail com ficha (MON-03), CEP | comportamento numerado nesta costura (PRD › Passo 1) |
| UC-05 | Ler os dados de uma mensagem (IA) | comportamento numerado nesta costura (PRD › Ler os dados de uma mensagem) |
| UC-06 | Passo 2, peças: busca com foto, folha da variação, sacola com a foto, peça sem foto | comportamento numerado nesta costura (PRD › Passo 2) |
| UC-07 | Passo 3, descontos: cupom, desconto combinado, resumo vivo e PIX | comportamento numerado nesta costura (PRD › Passo 3) |
| UC-08 | Passo 4, revisar: peças com foto, cliente, entrega com prévia da cotação, observação interna, Criar link, PRC-02 | comportamento numerado nesta costura (PRD › Passo 4; Pedido montado › observação) |
| UC-09 | Pedido montado no app: link sempre disponível, WhatsApp e copiar com histórico, peças, observação, ações por estado | comportamento numerado nesta costura (PRD › Pedido montado) |
| UC-10 | Backoffice: link sempre no cartão do pedido montado, Renovar só depois de expirar, endereço salvo pela function | comportamento numerado nesta costura (PRD › Pedido montado, "no app e no painel"; resposta do gate `link-nao-se-recupera-ao-reabrir` e `salvar-endereco-no-cadastro-pela-function`) |

**Achados de eval que este Work Item resolve**

`nada`: o repositório não tem relatório de avaliação local (`.specs/evals/` não existe) e o WI não vem de um achado de eval.

**Anexos consultados**

| Insumo (caminho ou URL) | Tipo | O que se tirou | Alimenta |
| ----------------------- | ---- | -------------- | -------- |
| Claude Design `a780eec8-…` › `prompts/PRD - Montar pedido no app.md` | PRD (copiado em `prd.md`) | o PRD inteiro | todas |
| Claude Design `a780eec8-…` › `Montar Pedido.dc.html` + `montado-dados.js`, desenho base `Ateliê Admin.dc.html` | protótipo (fonte de design) | ver **Design** | UC-01..UC-09 |
| `.specs/features/89-pedido-montado-pelo-painel/spec.md` (`AD-070`, `AD-071`) | spec da montagem no painel | a proposta (não pedido), preço travado (PRC-01/02), link de 7 dias com token no fragmento e só hash no banco (SEG-01), a function `order-proposals`, a aba Montados fora de `ORDER_VIEWS` | UC-01, UC-07..UC-10 |
| Claude Design `e3957c10-…` › `Pedido - Montar.html` | protótipo do painel (fonte de design) | ver **Design** | UC-10 |
| `.specs/features/84-seo-do-produto-com-ia/` (`AD-067`) | spec da sugestão por IA | o molde `_shared/claude*.ts` + `seo-suggest` (JSON Schema, teto por conta, 503 sem chave) | UC-05 |

## Fora do escopo

Do `prd.md`, verbatim:

- "**Política de Privacidade:** não entra nesta feature (risco aceito: a lista de compartilhamentos da Política não cita o serviço de IA que lê o texto colado)."
- "**\"Colar texto\" no Backoffice:** sim, numa feature seguinte. Esta entrega é só o app; a function e a regra de `core` já nascem compartilháveis para o painel não precisar de uma segunda escrita."
- "Registrar pelo app um pedido já pago por fora (PIX direto, dinheiro) fica fora deste Work Item."

Máquina de estados da proposta (herdada da `89`, `packages/core/src/proposals/state.ts:16-60`): Aberta → Vista pela cliente → Concluída; Aberta/Vista → Expirada (prazo) · Cancelada (ação). "Vista" conta como aberta. **Muda neste WI**: Renovar só a partir de Expirada, salvo a aberta/vista sem cifra gravada, que renova pelo "Gerar link novo" (D-28; hoje `state.ts:55` renova também a aberta).

## Design

Fontes:
- Claude Design, projeto "Uma Estrelinha - Mobile Admin" (`a780eec8-8aba-4d6e-8b4c-2c485e2750c7`), `Montar Pedido.dc.html` + `montado-dados.js`, base `Ateliê Admin.dc.html` — veio de `item.md` › Insumos (o PRD também o cita no cabeçalho).
- Claude Design, projeto "Uma Estrelinha - Backoffice" (`e3957c10-bd49-4f3d-9256-04d72a7d0f41`), `Pedido - Montar.html` (`pedido-montar.jsx`; não há arquivo separado da página do pedido montado — é a `TelaProposta` dele) — veio de `item.md` › Insumos.

Não lidos, declarado pelos lookups: `pedidos-comum.jsx` e `montar-dados.jsx` do painel (casco e dados mockados); o script de `Ateliê Admin.dc.html` depois da linha 1000 (os rótulos de `viewChips`).

### Pedidos · Montados (app) → UC-01

- Topo numa linha: título "Pedidos" e botão primário "Montar pedido" com ícone de mais.
- Busca "Número, nome, e-mail ou rastreio" (no protótipo não filtra os montados).
- Chips com rolagem lateral: "Precisa de ação", "Tudo", "Montados · N aberto(s)", "Fila de material".
- Com "Montados": linha "N pedidos montados · os mais recentes primeiro" e a lista de cartões. Cartão: número `P-0042` e selo de estado; cliente com a meta embaixo e o total à direita; linha com as peças "Nome · variação" juntas por " · ".
- Meta por estado: Aberta/Vista "Montado há 2 dias · vale até 05/11"; Concluída "Virou o pedido #0262"; Expirada "Venceu em 31/10"; Cancelada "Cancelado · montado há 12 dias". Selos: Aberta, Vista pela cliente, Concluída, Expirada, Cancelada (tons progress, wait, done, neutral, alert). O contador do chip soma Aberta e Vista.
- Tocar no cartão abre o Pedido montado. "Montar pedido" abre a montagem vazia.
- O protótipo não mostra lista vazia, carregando, erro nem recusa; não há paginação.

### Montar pedido — casca → UC-02

- Cabeçalho: "x" (aria "Fechar a montagem"), "Montar pedido", "Passo n de 4 · Cliente/Peças/Descontos/Revisar".
- Indicador com 4 segmentos rotulados, cada um botão (aria "Passo n: Nome"); só navega até o passo mais alto já alcançado.
- Barra fixa: o motivo do bloqueio (cor de espera), "Itens · N peças · frete à parte" (sem peças "Nenhuma peça ainda") com o total (sem peças "—"), e o botão "Continuar" (passos 1–3) / "Criar link" → "Criando o link…" (passo 4).
- Botão desligado enquanto houver bloqueio, exceto no passo 3 (tocar marca a tentativa e só então o motivo aparece; "O desconto não pode zerar o pedido." aparece logo).
- Motivos: "Escolha a cliente para continuar." · "Confira o CEP do endereço novo." · "Falta o nome da cliente." · "Falta o e-mail da cliente — é por ele que o pedido chega a ela." · "Confira o e-mail da cliente." · "Este e-mail já tem ficha. Use a ficha dela ou corrija o e-mail." · "Acrescente ao menos uma peça." · "O desconto não pode zerar o pedido." · "Escreva o motivo do desconto combinado." No passo 4 vale a soma.
- "x" com algo preenchido (cliente, nome, e-mail, peças ou CEP; cupom e desconto não contam) abre "Sair sem criar o link?"; sem nada, fecha direto.
- Não mostra (lacuna): voltar do Android; o rascunho no aparelho.

### Passo 1 · Cliente → UC-03, UC-04

- Segmento "Cliente cadastrada | Cliente nova"; trocar limpa cliente, endereço, marcas e resultado da leitura.
- Cadastrada, antes de escolher: busca "Nome, e-mail ou telefone" (casa também só pelos dígitos do telefone); resultados com inicial, nome, "e-mail · N pedidos", seta; busca vazia lista todo mundo; sem resultado "Ninguém com “q”. Se for a primeira compra, use **Cliente nova**."
- Cadastrada, escolhida: cartão "Cliente" com "Trocar" (nome, "N pedidos na loja", e-mail, telefone ou "sem telefone"); cartão "Entrega" com "Endereço padrão", "Endereço salvo" (endereço · CEP), "Outro endereço" ("Digite ou cole de uma mensagem."), "A cliente preenche no link" ("Ela informa o endereço ao concluir."). Escolher a cliente põe a entrega no padrão; sem endereço salvo, em "A cliente preenche no link".
- Nova: cartão escuro "Tem os dados numa mensagem?" / "Cole a conversa do WhatsApp. Eu leio e preencho nome, contato e endereço — você confere antes de seguir." / "Colar texto da conversa" (some depois de uma leitura); "Contato": Nome ("Como ela assina"), E-mail, aviso de ficha, WhatsApp `(51) 99999-9999`, CPF (opcional) `000.000.000-00`; "Entrega" com "Informar o endereço agora" (escolhido) e "A cliente preenche no link".
- Formulário de endereço ("Outro endereço" ou "Informar o endereço agora"): "Endereço de entrega", link "Colar de uma mensagem" (só cadastrada), CEP `00000-000`, Rua, Número + Complemento ("Opcional"), Bairro, Cidade + UF (2 letras, maiúsculas); interruptor "Salvar no cadastro da cliente" — "Só é gravado quando você criar o link." — nasce ligado (também em "Outro endereço" da cadastrada).
- E-mail com ficha: "<e-mail> já é de <nome> · N pedidos. Para não nascer uma segunda ficha, use a dela." com "Usar a ficha dela" / "Corrigir o e-mail". Usar a ficha com CEP de 8 dígitos digitado: entrega em "Outro endereço", toast "Usando a ficha de <nome>." / "O endereço lido do texto ficou como “Outro endereço”."; sem CEP: endereço padrão, toast "A entrega veio no endereço padrão dela."
- E-mail: "Confira o e-mail." com "@", mais de 5 caracteres e inválido.
- CEP de 8 dígitos conhecido preenche rua, bairro, cidade e UF (dica "Porto Alegre/RS · endereço completado pelo CEP.") e tira a marca de leitura; não encontrado: "Não achei este CEP. Confira, ou preencha o endereço à mão."
- Não mostra: serviço de CEP fora do ar; carregando da busca e do CEP; validação de CPF; exigência de rua/número/bairro/cidade/UF.

### Folha · Colar texto → UC-05

- Alça; título/subtítulo por escopo — contato e endereço: "Colar o texto da conversa" / "Eu leio e preencho os campos da cliente e da entrega. Você confere tudo antes de seguir."; só endereço: "Colar o endereço" / "Eu leio só o endereço. Os dados da ficha dela não mudam."
- "Texto da conversa", dica "Cole aqui a mensagem com nome, e-mail, telefone e endereço", corte em 2.000 na digitação, "O texto não fica guardado." e contador n/2000.
- Botões: "Cancelar" (depois de erro vira "Preencher à mão", que fecha) e "Ler o texto" (desligado vazio e durante a leitura, "Lendo o texto…").
- Sucesso: a folha fecha, campos preenchidos com "Lido do texto — confira." (CEP: "Lido do texto — conferido no serviço de CEP."); editar tira a marca. Bloco no passo 1: "Preenchi N de M campos. Confira antes de seguir." / "Não achei: e-mail, CPF, complemento. O CEP conferiu rua, bairro e cidade." (variantes "Achei todos os campos." e "Não consegui conferir o CEP."), com "Ler outro texto" e "Desfazer" (toast "Leitura desfeita." / "Os campos voltaram ao que estava antes.").
- Sem dados: folha aberta, "Não encontrei nome, contato nem endereço neste texto. Confira se colou a mensagem certa, ou preencha à mão."
- Fora do ar: "A leitura está fora do ar agora. Feche e preencha à mão — nada do que você já fez se perde."
- Não mostra: o limite de leituras por conta; a recusa por papel.

### Passo 2 · Peças e folha da variação → UC-06

- Cartão "Sacola · N peças": foto (retrato 64×80, legenda da variação ou "capa"), nome, variação, "Gravação: <texto>", "q × R$", etiquetas "Pede material da cliente" e "<promoção> · 15%", total da linha, "Editar" e lixeira (aria "Editar <nome>", "Remover <nome>"; toast "Peça removida.").
- "Acrescentar peça", busca "Nome da joia ou SKU" (sem resultado "Nenhuma joia com “q”."), linhas com capa retrato 56×70, nome, "a partir de R$ X · N em estoque · pede material" ("a partir de" só com mais de uma variação; estoque somado) e ícone de mais.
- Folha da variação: foto grande 104×130 que troca por variação; nome, preço da variação, etiqueta "Promoção de outubro · 15% nesta peça"; "A foto troca com a variação escolhida.", rótulo do eixo, chips com miniatura redonda, nome e "N em estoque" (esgotada desligada, "Esgotada"); "Quantidade" (mínimo 1) e "N em estoque" → acima: "Só há N em estoque." e botão desligado; gravação só se a peça aceita ("O que gravar", "Nome, data ou uma palavra", contador n/teto, "Opcional. Deixe em branco se ela preferir a peça sem gravação."); material: "Pede material da cliente. Depois de pago, o pedido entra na fila de material como os da loja."; botão "Acrescentar · R$ X" / "Salvar · R$ X" (preço × quantidade, sem a promoção). Abre na primeira variação com estoque; confirmar fecha, limpa a busca, toast "Peça acrescentada." / "Peça atualizada." com "<nome> · <variação>".
- Foto ausente no protótipo: quadro listrado com "foto" (nota: "nunca um ícone no lugar") — ver Divergências.
- Não mostra: carregando/erro do catálogo; preço riscado; o teto somando a sacola.

### Passo 3 · Descontos → UC-07

- Cupom (maiúsculas, dica "Ex.: SAUDADE10") com "Aplicar" e "A mesma regra do checkout da loja, com o e-mail desta cliente."; com cupom, cartão com código, rótulo ("10% de desconto", "Frete grátis", "5% na primeira compra", "R$ 20 de desconto") e "Remover". Erros: "Digite o código do cupom." · "Cupom não encontrado." · "Este cupom vale só para a primeira compra."
- "Desconto combinado": interruptor ("O valor que você acertou com ela na conversa."), "Em reais | Em %", valor, "Motivo" (dica "Ex.: segunda peça da família", n/120; "Escreva o motivo — ele fica no histórico."; "Só para você. A cliente não vê o motivo."). Recusa: "O desconto não pode zerar o pedido." (itens abaixo de R$ 1,00, ou % ≥ 100).
- "Resumo": "Subtotal · N peças", promoção (−), "Cupom CODIGO" (− ou "frete grátis"), desconto combinado (−), Itens, "No PIX: R$ X nos itens (5% de desconto). Frete à parte." Ordem: promoção, cupom, combinado; PIX informativo.
- Não mostra: carregando/erro da validação do cupom.

### Passo 4 · Revisar → UC-08

- Ordem: erro da criação (quando houver); "Sacola · N peças" com "Alterar" (linhas com foto, "variação · N un. · gravação “X”", total; resumo, Total, PIX); "Cliente" com "Alterar" (nome, e-mail ou "sem e-mail", telefone ou "sem telefone", etiqueta "Ficha nova · criada com o link"); "Entrega" com "Alterar" (endereço ou "A cliente preenche o endereço no link."; com endereço, prévia: PAC · Correios, SEDEX · Correios, "Retirada no escritório" para CEP do RS, prazo em dias úteis, preço ou "grátis", e "Prévia. A cliente escolhe a entrega no link."); nota "Os preços ficam travados como estão aqui. O link vale 7 dias, até 09/11. Nada é gravado antes de você criar o link."
- "Criar link" → "Criando o link…"; sucesso: Pedido montado com toast "Link criado." / "Agora é só mandar para <nome>."; preço mudado: "Os preços mudaram enquanto você montava. Confira o resumo." no topo, com sacola e resumo relidos.
- Não mostra: a observação interna; erro genérico de gravação; recusa por papel.

### Pedido montado (app) → UC-09

- Cabeçalho: voltar (aria "Voltar para Montados"), "Pedido montado P-0042", "Montado agora · vale até 09/11" ou "Montado há 2 dias", selo.
- Aberta/Vista: cartão escuro "Link para <primeiro nome>", link em caixa (`umaestrelinha.com.br/pedido-montado#<token>`), "Enviar pelo WhatsApp" (com telefone) ou "Sem telefone — copie o link.", "Copiar link", "Vale até 05/11. Quem tem o link pode pagar este pedido — não pode ver a conta dela."; cartão "Mensagem do WhatsApp": "Oi, <nome>! Montei seu pedido aqui na loja. É só conferir seus dados, escolher a entrega e o pagamento:" + link + "O link vale até 05/11."
- Faixas: Concluída "<nome> concluiu no link. O pedido **#0262** segue na fila como qualquer pedido da loja."; Expirada "O link venceu em 31/10. Renovar confere os preços de novo e gera um link novo."; Cancelada "Cancelado. Quem abrir o link lê que este pedido não está mais disponível."
- "Cliente" (nome, "e-mail · telefone"), "N peças" (foto 48×60, "nome · variação · N un.", resumo, "Total dos itens", "Frete: a cliente escolhe no link."), "Histórico" (mais recente primeiro): "Montado no app", "Ficha da cliente criada", "Endereço salvo no cadastro dela", "Link enviado · WhatsApp" / "Link enviado · copiado", "Aberto pela cliente", "Concluído pela cliente · pedido #0262", "Link venceu", "Cancelado por você", "Prazo renovado · link novo, o anterior parou de funcionar", "Montado no painel"; quando "agora", "ontem, 21:14", "há 2 dias".
- Ações Aberta/Vista: "Editar", "Renovar prazo" (ver Divergências), "Cancelar este pedido"; rodapé Expirada "Renovar"; Concluída "Ver o pedido #0262". Cancelada sem ação. Toasts do envio: "Abrindo o WhatsApp…" / "Conversa com <nome>, com a mensagem pronta."; "Link copiado." / "Cole na conversa com <nome>."
- Folhas: Descartar "Sair sem criar o link?" / "Nada foi gravado ainda. A montagem se perde ao sair." ("Continuar montando" / "Sair", inkSolid); Cancelar "Cancelar P-0042?" / "Quem abrir o link vai ler que este pedido não está mais disponível. Não dá para desfazer." ("Manter" / "Cancelar pedido", inkSolid; toast "Pedido montado cancelado." / "O link deixou de funcionar."); Renovar "Renovar o prazo de P-0042?" ("Agora não" / "Renovar"; toast "Prazo renovado." / "Mande o link novo — o anterior não abre mais.").
- Não mostra: observação interna; carregando/erro/recusa ao abrir; Editar de uma proposta existente (só toast); "Ver o pedido" não navega.

### Pedido montado (painel) → UC-10

- Trilha "Pedidos › Montados › {P-00NN}"; título com selo e "Para {nome} · criado hoje, 29/10, por Adri"; ações Editar, Duplicar, Cancelar.
- Cartão "Link para a cliente": validade ("Vale até {validade}" / "Venceu em {validade}" / "Link encerrado"), campo só leitura (seleciona ao focar), Copiar link, Enviar pelo WhatsApp ou "Sem telefone — copie o link", prévia da mensagem recolhível, dica "Precisa de mais tempo? Renovar o prazo — gera um link novo e o atual deixa de funcionar." (aberta); expirada: link morto e só "Renovar o prazo"; cancelada/concluída: link morto, sem ação.
- Diálogo "Renovar o prazo do link?" ("Voltar" / "Gerar link novo", "Gerando…"); "Cancelar o pedido montado {número}?" ("Voltar" / "Cancelar pedido montado", "Cancelando…").
- Montagem: "Endereço de entrega" ("Opcional — ela pode preencher no link"), endereços salvos com "Padrão", "Outro endereço", campos, caixa "Salvar no cadastro da cliente" marcada por padrão (só com cliente escolhida). Falha: "Não consegui gravar o pedido. Nada foi enviado à cliente. Tente de novo."
- Não mostra: falha ao copiar; carregando/erro ao obter o link de uma proposta reaberta; falha do endereço; a observação interna no painel; Duplicar (só toast "P3").

Divergências entre fontes e com o PRD (resolvidas no gate principal pelo humano, `prototipo-contra-decisoes-do-gate`: "Valem as decisões do gate, com a frase nova da folha de renovar"):
- Renovar com o link aberto (os dois protótipos) × PRD "Renovar só aparece depois de o link atual expirar" → **vale o PRD**; a folha de renovar diz "O link venceu em {dd/mm}. Os preços são conferidos de novo e sai um link novo, que vale até {dd/mm}. Mande o novo para {nome}."; rótulo "Renovar prazo" nos dois apps.
- Foto ausente listrada sem ícone (app) × PRD "fundo areia com a estrela da marca" → **vale o PRD** (`FotoDaPeca`).
- "A montagem se perde ao sair." × rascunho no celular → resolvido em `rascunho-e-sair-voluntario` (Decisões).
- Origem "Montado pelo painel" no toast do app × "Montado no app" no histórico → resolvido em `origem-montado-no-app` (uma origem só, "Pedido montado").
- Busca "Nome da joia ou SKU" filtrando só por nome no cliente → artifício; vale o dono da busca (`AD-036`).
- Artifícios do protótipo (link constante, validade fixa, CEP/cupom/cotação/leitura por tabela e regex, recusa de preço simulada, ids no navegador) → valem o servidor e os donos (`order-proposals`, `preview`, `customer-parse`, `useCepLookup`).

## Código — /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-94

- **Instruções** — `apps/mobile-adm/CLAUDE.md` (inteiro); `CLAUDE.md` › Alias de import, › O "defeito 01", › Convenções, › Os guardas, › CI e deploy; `apps/backoffice/CLAUDE.md` › A busca de produto (51, AD-036), › Montar pedido para a cliente (89, AD-070), › Dívidas; `supabase/CLAUDE.md` › Migrations, › RLS, › Edge functions, › order-proposals e o pedido que nasce de uma proposta, › Secrets, › As chaves do aviso no celular; `packages/core/CLAUDE.md` › Quando um código pertence a este pacote, › Pureza, › Os módulos, › Dinheiro, › customers, › order-actions, › proposals, › Convenções de tipo.
- **Recorte** — UC-01..UC-10 (todos).

**O que já serve**

| O que | Onde | Cobre |
| ----- | ---- | ----- |
| Regra de preço da proposta | `packages/core/src/proposals/pricing.ts › priceProposalDraft`, `PROPOSAL_ZERO_REFUSAL` (`:34`), `lockProposal` | UC-07 |
| Limites (motivo 120, 30 linhas, qtd 99) | `packages/core/src/proposals/limits.ts:8-22` | UC-07 |
| Recusa do cupom com `first_order_only` contada no servidor | `supabase/functions/order-proposals/handlers.ts:412-433` (`precificar`) | UC-07 |
| Link, prazo e texto do WhatsApp | `packages/core/src/proposals/link.ts › proposalLink` (`:14`), `proposalExpiryDate` (`:32`), `proposalWhatsappText` (`:54`) | UC-09 |
| `wa.me` com texto | `core/notifications › whatsappChatUrl` (uso em `ProposalLinkCard.tsx:50`) | UC-09 |
| Estado derivado e rótulos | `packages/core/src/proposals/state.ts › proposalState`, `PROPOSAL_STATE_LABELS` (`:16`) | UC-01, UC-09 |
| Ações `list · get · save · renew · cancel · log-sent · note`, `requireAdmin` | `order-proposals/handlers.ts:1070-1110 › route` | UC-08, UC-09 |
| Observação da proposta (95) | `supabase/migrations/20261109120000_95-observacao-da-proposta.sql` (coluna `:26-27`, `v_fora` `:52-55`); `handlers.ts › observacaoDoCorpo` (`:653`), `note` (`:988`) | UC-08, UC-09 |
| Ficha nova no `save` sem segunda ficha por e-mail, CPF gravado | `20261109120000_95…sql:100-124`, `:118-121` | UC-04 |
| Recusa de preço com resumo relido | `handlers.ts:708-712` (409 `prices_changed` + `summary`) | UC-08 |
| Busca de cliente do app | `packages/core/src/customers/search.ts › APP_CUSTOMER_SEARCH` (`:79-83`), `buildAppCustomerSearch` (`:85`), `limparTermoColado` (`:69`) | UC-03 |
| Ficha por e-mail exato | `core/customers › directoryEmailCondition`; molde `apps/backoffice/src/entities/customer/api/useCustomerSearch.ts › lerClientePorEmail` (`:96-110`) | UC-04 |
| Serviço de CEP | `packages/core/src/hooks/useCepLookup.ts` (`:33-59`; inexistente e falha em `manual: true`, `:25-31`) | UC-04 |
| Validadores sem import | `packages/core/src/validators/cpf.ts`, `phone.ts`, `email.ts`, `cep.ts` (o barril `index.ts:1-6` não serve ao Deno) | UC-05 |
| Leitura com papel | `apps/mobile-adm/src/shared/api/lerComPapel.ts › lerComPapel` (`:40`), `conferirPapel` (`:62`) | UC-03, UC-06 |
| Tradução de erro de function | `apps/mobile-adm/src/features/push-notifications/api/portaDeAvisos.ts › traduzir` (`:57-82`), `shared/api/recusa.ts` | UC-02..UC-09 |
| Folha no histórico | `apps/mobile-adm/src/features/order-actions/model/useFolhaNoHistorico.ts` | UC-02 |
| Moldura da foto com a estrela | `apps/mobile-adm/src/shared/ui/FotoDaPeca.tsx` (`:41`, `:47`, `:57`) | UC-06 |
| Porta do Claude e teto por conta | `supabase/functions/_shared/claudePort.ts › ClaudeJsonRequest` (`:11-21`), `seo-suggest/index.ts:18-28`, `seo-suggest/handlers.ts:125-131` | UC-05 |
| Chave da IA | `supabase/config.toml:515` `ANTHROPIC_API_KEY` | UC-05 |
| Prévia da cotação | `apps/backoffice/src/features/order-proposal/api/shippingPreview.ts › quoteBody`/`useShippingPreview` (`:26-53`), `core/shipping › toQuoteProducts` | UC-08 |
| RLS de admin em `addresses` | `supabase/migrations/20260414121021_…sql:214` | UC-03 |

**O que muda**

| O que | Onde | Mudança |
| ----- | ---- | ------- |
| Token só como hash (SEG-01) | `order-proposals/handlers.ts:26-30`, `:62`, `save` `:729-746`, `renew` `:859-877`; `token_hash` em `20261103120000_89…sql:41`; conferência em `checkout/proposal.ts:120` | coluna nova (cifra) em migration nova; `save` e `renew` gravam hash **e** cifra; `get` decifra e devolve o token só com `open`/`viewed`; `COLUNAS_DA_PROPOSTA` (`:108-143`) sem a cifra; log sem token; `checkout` segue pelo hash. Não existe cifra no repositório (só HMAC em `payment/webhookSignature.ts:84`) |
| `save_order_proposal` vigente | `20261109120000_95-observacao-da-proposta.sql:32-246` (as da 92, `20261110*`, não a recriam) | recriar em migration nova (prefixo depois de `20261110160000`); a coluna nova em `v_fora` (`:52-55`) e no `insert` (`:201-223`); `save_address` grava em `addresses` respeitando `addresses_one_default` (`20261004120000_59-minha-conta.sql:150-151`) |
| `save` | `order-proposals/handlers.ts › save` (`:662-779`) | ler `save_address` e passar à RPC |
| `list` | `handlers.ts › list` (`:526-557`), `COLUNAS_DA_LISTA` (`:145-157`), teto 500 (`:534`) | linhas resumidas por proposta (nome, `product_image`, quantidade, com teto) e `agora` |
| Ação `preview` | `handlers.ts:1087-1105` (o `switch`) | `case 'preview'`: `exigirAdmin` → `precificar` (`:314`) → `resumo` (`:448`), sem RPC; atualizar `:1104` e `index.ts:3` |
| Foto gravada na linha | `handlers.ts:403`, `select` de `:321` | pedir `capa:images->0->>url` e chamar o dono novo (variação → `images[0]` → `image_url`); hoje o painel mostra `v.image_url \|\| capa` (`useProductVariants.ts:144`, `useProductCovers.ts:28-29`) |
| Renovar | `packages/core/src/proposals/state.ts:55`; `handlers.ts:812` | `renew: state === 'expired' \|\| (aberta/vista && sem link disponível)` (D-28); `state.test.ts` e servidor juntos; o botão do painel (`AdminProposalPage.tsx:197-201`) e `RENEW_WARNING` aberto (`:215`) saem |
| Cartão do link no painel | `apps/backoffice/src/features/order-proposal/ui/ProposalLinkCard.tsx:36-47`; `model/linkMemory.ts:23-48`; `AdminProposalPage.tsx:56`, `:100-109`, `:136`, `:181-192` | o link vem do `get`; `linkMemory` e a chave `estrelinha.admin.proposal-link.*` perdem a razão; `LINK_NOT_IN_MEMORY` (`copy.ts:20`) sai |
| Endereço pelo navegador | `apps/backoffice/src/entities/customer/api/useCustomerSearch.ts › gravarEnderecoDaCliente` (`:145-165`); `AdminProposalBuilderPage.tsx:110-128` | o painel manda `save_address`; `gravarEnderecoDaCliente` sai |
| `LINK_WITHOUT_STORE` | `apps/backoffice/src/features/order-proposal/model/copy.ts:12` | sobe para `core/proposals`, o painel reexporta (`toBe`) |
| Busca, dobra, capa e peça | `apps/backoffice/src/entities/product/lib/buscarProdutos.ts`, `shared/lib/texto.ts › dobrarTexto`/`palavrasDoTermo`, `entities/product/api/useProductCovers.ts › capaDaLinha` (`:28`), `useProductVariants.ts › lerPecaParaProposta` (`:125-167`), `entities/product/lib/estoque.ts › textoDoEstoque` | partes puras sobem a `core` (`.ts` explícito; o mapeamento recebe a linha lida); o painel reexporta; leituras ficam em cada app (`lerPecaParaProposta` importa o client, `:23`, `:27`: só o mapeamento sobe) |
| Guarda da busca | `apps/backoffice/src/shared/lib/__tests__/buscaDeProdutoComDonoUnico.test.ts:33`, `:233`, `:137` | escopo a `apps/mobile-adm/src` e dono em `core` |
| Endereço de Pedidos | `apps/mobile-adm/src/entities/order/model/pedidosHref.ts` (`:32`, `:40`, `:55-57`, `:26`) | `?visao=montados` como destino próprio fora de `ORDER_VIEWS` |
| Rotas e barra de abas | `apps/mobile-adm/src/app/App.tsx:110-120`; `widgets/tab-bar/model/tabs.ts › barraNoCaminho` (`:51-52`) | rotas dentro do `RequireAdmin`, irmãs auto-fechadas; `/pedidos/montados/<id>` hoje mostra a barra (dois segmentos): o regex muda e `barraNoCaminho.test.ts` ganha os casos |
| Porta de function no app | `apps/mobile-adm/src/entities/order/api/__tests__/escritaSoPelaPorta.test.ts:40-56`, `:43`, `:110-113`, `:196-199` | `INVOCACAO_ACEITA` por porta, `IMPORTAM_O_CLIENT`, régua 2 por porta, âncoras |
| Leitura só com papel | `apps/mobile-adm/src/entities/order/api/__tests__/leituraSoComPapel.test.ts:27-46` | entradas literais novas |
| Sem CPF nem endereço no app | `apps/mobile-adm/src/shared/lib/__tests__/semDadoSensivelDeClienteNoApp.test.ts:57`, `:62` | exceção literal só para a montagem e o pedido montado, com sensor fora delas |
| Sem dado de cliente no aparelho | `apps/mobile-adm/src/shared/lib/__tests__/semDadoDeClienteNoAparelho.test.ts:36-44`; réguas 1, 5 e 6 (`:69`) | pastas novas; exceção estreita ao dono do rascunho; marcador de passo/folha no `state`; destino novo |
| Abas × rotas | `apps/mobile-adm/src/widgets/tab-bar/__tests__/abasSaoAsRotas.test.ts:27`, `:34`, `:42` | subrotas de `/pedidos` passam por `ehSubrota` |
| Guardas do Claude | `supabase/functions/_shared/__tests__/claudeSoNaPorta.test.ts:33`, `:119`, `:141-147` | `INDEXES` e a âncora com a `customer-parse` |
| Guarda do schema da proposta | `apps/store/src/shared/lib/__tests__/pedidoMontadoSchema.test.ts:293`, `:309-312`, `tokenSoHash` (`:153-156`) | a vigente é a migration nova; a régua do token passa a hash + cifra, nunca em claro |
| Guarda da observação | `apps/store/src/shared/lib/__tests__/observacaoDaPropostaSchema.test.ts:33-38`, `:182-191` | igualdade migrada para a vigente nova |
| Docs | `supabase/CLAUDE.md:216`, `:506-509`; `packages/core/CLAUDE.md:501-503` | atualizar SEG-01 e o boot local |
| Secrets | `supabase/config.toml:461-515`; `.github/workflows/supabase-deploy.yml:165-190` | a chave da cifra no `config.toml` e no `.env.example` (opcional — ver Decisões) |
| Env do app | `apps/mobile-adm/.env.example:11-12`; `turbo.json:29` | leitor único em `apps/mobile-adm/src/shared/config/` (molde `apps/backoffice/src/shared/lib/storeOrigin.ts`) |

**O que nasce**

| O que | Onde | Por que |
|---|---|---|
| Portas da montagem (propostas, `customer-parse`, cotação) | `apps/mobile-adm/src/features/order-proposal/api/` | o app só invoca `atelie-avisos` (`escritaSoPelaPorta.test.ts:43`); `traduzir` sobe para `shared/api/` |
| Telas da montagem e do pedido montado, widget "Montados" | `apps/mobile-adm/src/pages/` + `features/order-proposal/{model,ui}` | não há rota nem pasta (`App.tsx:111-119`) |
| Leituras do app (peças, capas, variações, clientes, endereços) | `apps/mobile-adm/src/entities/{product,customer}/api/` em `lerComPapel` | as do painel não são alcançáveis; o app só lê `images` por id (`usePedido.ts:64`) |
| Rascunho no aparelho com dono único e guarda | `apps/mobile-adm/src/features/order-proposal/model/` (molde `visitanteComDonoUnico`) | o app não usa storage hoje (zero fora de testes); a chave entra na lista do `CLAUDE.md` da raiz |
| Passos e folhas no histórico | `features/order-proposal/model/` (molde `features/recovery/model/passos.ts`, `useFolhaNoHistorico.ts`) | as existentes são de um fluxo cada |
| Dono "qual foto vai na linha" | `packages/core/src/proposals/` (folha sem import) | `capaDaLinha` é do painel; `core/media/index.ts` não é alcançável pelo Deno (`:72-74`); `orders/itemPhoto.ts` é outra regra |
| Busca + dobra, capa, mapeamento da peça | `packages/core/src/` | só o painel alcança hoje |
| `core/customers/parse.ts`, `core/customers/mergeCep.ts` | `packages/core/src/customers/` (com `denoReach`) | nada confere a saída da IA |
| Function `customer-parse` | `supabase/functions/customer-parse/{index,handlers}.ts` + `verify_jwt = false` | outra pergunta, no molde de `seo-suggest` |
| Cifra do token e a chave | `supabase/functions/_shared/` + secret novo | não há cifra no repositório |
| Migration nova | `supabase/migrations/<prefixo > 20261110160000>_94-…sql` | coluna da cifra + `save_order_proposal` recriada |
| Recusa sobre o client real | `apps/mobile-adm/src/app/__tests__/<montagem>ComClientReal.test.tsx` | molde `avisosComClientReal` |
| Guardas de tom e movimento da montagem | `apps/mobile-adm/src/shared/lib/__tests__/` | listas literais (`apps/mobile-adm/CLAUDE.md:566-588`) |

**Exemplares**

| Tipo | Siga | Por quê |
| ---- | ---- | ------- |
| Porta de function no app | `apps/mobile-adm/src/features/push-notifications/api/portaDeAvisos.ts` | nome literal por ação, `traduzir` com `conferirPapel` |
| Recusa sobre o client real | `apps/mobile-adm/src/app/__tests__/avisosComClientReal.test.tsx` | rede e 403 distintos |
| Leitura com papel | `apps/mobile-adm/src/entities/customer/api/useCliente.ts` + `shared/api/lerComPapel.ts` | aceita pelos guardas |
| Passos e folhas no histórico | `apps/mobile-adm/src/features/recovery/model/passos.ts`; `features/order-actions/model/useFolhaNoHistorico.ts` | voltar do Android, marcador no `state`, F5 |
| Function com IA | `supabase/functions/seo-suggest/{index,handlers}.ts` + `_shared/claudePort.ts` | `createClaudeJson`, teto, 503/429, log sem conteúdo |
| Ação nova na function | `order-proposals/handlers.ts › note` (`:988`) | `exigirAdmin`, corpo validado |
| Recriar RPC | `supabase/migrations/20261109120000_95-observacao-da-proposta.sql` | recriação byte a byte com as trocas, permissões, `notify pgrst` |
| Guarda da RPC recriada | `apps/store/src/shared/lib/__tests__/observacaoDaPropostaSchema.test.ts` | "vigente = a nova" e "desfeitas as trocas é a anterior" |
| Regra subida com reexport | `apps/backoffice/src/app/__tests__/regrasDoPedidoNoCore.test.ts` | `toBe` |
| Folha de `core` alcançável pelo Deno | `packages/core/src/customers/__tests__/denoReach.test.ts`; `packages/core/src/pricing/types.ts` | grafo com `.ts` |
| Storage com dono único | `apps/store/src/shared/lib/visits/visitor.ts` + `visitanteComDonoUnico.test.ts` | chave num arquivo só |
| Leitor único de env | `apps/backoffice/src/shared/lib/storeOrigin.ts` | `null` sem env |

**Obrigações transversais**

- Regra com dois consumidores mora em `core`; o painel reexporta por referência (`toBe`) — `CLAUDE.md › O "defeito 01"`.
- `core` alcançável pelo Deno: todo relativo com `.ts`, `import type` incluso, sem pacote; `denoReach` cobre os novos; comentário descreve a forma proibida, não a escreve — `CLAUDE.md › Alias de import`.
- `index.ts` só wiring, regra em `handlers.ts` injetável (`AD-004`); `requireAdmin` primeiro e `verify_jwt = false` declarado.
- Migration aplicada é imutável; recriação em migration nova com prefixo único; guardas apontam para a vigente; migration só no banco local.
- `supabase secrets set` mescla o `.env` local: gravar de um diretório sem `.env`.
- Mobile primeiro: prova em 390×844 e fonte a 130/200 %, alvo de 44 px, `body` sem rolagem lateral (jsdom não mede layout).
- Tom memorial e `motion-reduce:` na mesma linha, com guardas de lista literal e âncoras subidas.
- Toda leitura do app por `lerComPapel`; toda function por uma porta literal; recusa só pelo `42501`.
- Chave de storage nova com dono único, guarda e a chave listada no `CLAUDE.md` da raiz.
- Gravação provada contra o banco local, não por tipo (`AD-012`).
- O gate de uma mudança no app inclui as suítes da loja e do painel.
- Fronteiras FSD: só camada estritamente abaixo.

**Testes**

- Unidade (functions), `supabase/functions/order-proposals/__tests__/handlers.test.ts`: `preview` recusa sem papel antes de ler e não chama a RPC; `preview` devolve o resumo que o `save` gravaria e a recusa do cupom com o texto da loja; `list` com as linhas (teto) e `agora`; `get` devolve o token só com a proposta aberta, sem cifra nem hash, e o log sem eles; `save` passa `save_address`; `renew` recusa a aberta e troca hash e cifra na expirada; a foto gravada segue variação → `images[0]` → `image_url`.
- Unidade (functions), `supabase/functions/customer-parse/__tests__/`: `requireAdmin` primeiro; 503 sem chave; 429 no teto; modo `address` sem contato; log só com tamanho e desfecho; texto acima de 2.000 recusado; prazo e 5xx viram "fora do ar".
- Unidade (core): a busca movida com os casos de antes; a foto da linha nos três recuos; `parse` (máscaras, dígito do CPF, e-mail); `mergeCep`; `proposalActions` só renova a expirada; `denoReach`/`purity`.
- Página real (app), `montarApp`: os 4 passos; o voltar do Android; fechar pergunta; o motivo escrito; "Montados" pelo endereço; o cartão do link sempre, "Sem telefone — copie o link.", o envio registrado; o rascunho guarda só peças e descontos e reabre; a troca de conta limpa as chaves novas (`trocaDeContaLimpaCache`).
- Client real (app): conta sem papel em cada porta e leitura nova ⇒ a recusa da `72` e nenhum dado de cliente; rede caída é falha (molde `avisosComClientReal`).
- Página real (painel): o link vem do `get` sem "Gerar link novo"; Renovar só com a expirada; a montagem manda `save_address` e não escreve em `addresses` (`AdminProposalPage.test.tsx`, `AdminProposalBuilderPage.test.tsx`).
- Integração local (probe no molde de `.specs/features/89-pedido-montado-pelo-painel/probes/01-proposta.sql`): RPC recriada grava proposta e endereço na mesma transação (falha ⇒ nada), respeita `addresses_one_default`, não sobe a versão só pela cifra e pela observação, não cria segunda ficha; `get-proposal` abre pelo hash; peça sem foto por variação grava `images[0]`; boot local de `order-proposals`, `mercado-pago` e `customer-parse`.
- Guardas, na tarefa que cria cada pasta: `escritaSoPelaPorta`, `leituraSoComPapel`, `semDadoSensivelDeClienteNoApp`, `semDadoDeClienteNoAparelho`, `barraNoCaminho`, `rotasSobGuarda`, `abasSaoAsRotas`, `enderecoDePedidosComDonoUnico`, movimento e tom, `buscaDeProdutoComDonoUnico`, `pedidoMontadoSchema`, `observacaoDaPropostaSchema`, `claudeSoNaPorta`, `wiringResolve`, e o guarda novo do rascunho. `marcacaoSoPorAcao` não muda (`save_order_proposal` já está na lista, `:192`).

**Depende / Expõe** (app ↔ functions, no mesmo repositório)

| Direção | Dado | Formato | Momento | Rota |
|---|---|---|---|---|
| expõe | resumo travável e recusa do cupom | `resumo()` ou `{ error, code }` 422 | a cada mudança de peça ou desconto | `order-proposals?action=preview` (nasce) |
| expõe | linhas por proposta e `agora` | `{ proposals: [...+ items], agora }` | ao abrir Montados | `order-proposals?action=list` (`:526`) |
| expõe | o link enquanto aberta | `token` só com `open`/`viewed` | ao abrir o pedido montado | `order-proposals?action=get` (`:582`) |
| depende | `save_address` | booleano | Criar link | `order-proposals?action=save` (`:662`) |
| expõe | contato e/ou endereço lidos | JSON pelo schema; `mode`; 503 `not_configured`, 429 `limited` | "Ler o texto" | `customer-parse` (nasce) |
| depende | cotação | `{ postal_code_to, products }` → `ShippingQuote[]` | revisão com CEP | `melhor-envio?action=quote` |
| depende | origem da loja | `VITE_STORE_URL` | build do app | `apps/mobile-adm/.env.example` (nasce) |
| depende | chave da cifra | secret das functions | `save`, `renew`, `get` | `supabase/config.toml` (nasce) |
| depende | `ANTHROPIC_API_KEY` | secret | `customer-parse` | `supabase/config.toml:515` |

## Fronteira entre repositórios

`nada`: Topologia de repositório único (monorepo, conferência de fronteira `não` no `PROJECT.md`).

## Cobertura dos UCs

| UC | Reivindicado por |
|---|---|
| UC-01 | monorepo |
| UC-02 | monorepo |
| UC-03 | monorepo |
| UC-04 | monorepo |
| UC-05 | monorepo |
| UC-06 | monorepo |
| UC-07 | monorepo |
| UC-08 | monorepo |
| UC-09 | monorepo |
| UC-10 | monorepo |

## Decisões

| # | A pergunta | A resposta | Quem decidiu |
|---|---|---|---|
| D-01 | O app só pode invocar uma function, e a montagem precisa de três | "Uma porta por function em `features/order-proposal/api/` (`portaDePropostas.ts`, `portaDeLeitura.ts` para a `customer-parse`, e a cotação), no molde de `portaDeAvisos.ts`: nome literal por ação, recusa só pelo `42501` de `conferirPapel`. Ampliar `escritaSoPelaPorta` (`INVOCACAO_ACEITA` por porta, `IMPORTAM_O_CLIENT`) e `leituraSoComPapel` com as entradas literais, e um `…ComClientReal.test.tsx` provando a recusa sobre o supabase-js real, como `avisosComClientReal`." | humano no gate do PRD Tech Review (`portas-de-function-no-app` · `tech` · r1) |
| D-02 | A montagem do painel lê catálogo, promoções, cupom e pedidos direto do navegador; no app isso fura `lerComPapel` | "Uma ação nova `preview` na `order-proposals` (mesma `precificar` do `save`, `requireAdmin`, sem gravar) que devolve o resumo travável e a recusa do cupom com o texto da loja; o app manda só a escolha (peças, cupom, desconto, e-mail) e nunca lê promoções, cupons nem `orders`. O resumo vivo chama `preview` a cada mudança, com a anterior cancelada. As leituras que restam no app (busca de clientes, endereços salvos, peças e variações) entram em `lerComPapel`." | humano no gate do PRD Tech Review (`leituras-da-montagem-pelo-papel` · `tech` · r1) |
| D-03 | A busca de produto, as capas e a folha da variação são do Backoffice e o app não as alcança | "Subir para `core` (com `.ts` explícito, pura): `buscarProdutos` + a dobra de busca, `capaDaLinha` e o mapeamento da peça para proposta (variações, estoque, capa da variação com recuo para a da peça); o painel reexporta por referência (`toBe`). As leituras ficam no app, dentro de `lerComPapel`, com as mesmas projeções. Ampliar `buscaDeProdutoComDonoUnico` (ou um par no app) para recusar a segunda busca. A foto continua pela `FotoDaPeca`/`renditionUrl`." | humano no gate do PRD Tech Review (`busca-de-produto-e-capas-sobem-ao-core` · `tech` · r1) |
| D-04 | "Salvar no cadastro da cliente" é escrita PostgREST do navegador no painel, e o app não pode escrever | "O `save` da `order-proposals` aceita `save_address: true`, e a RPC `save_order_proposal`, recriada em migration nova, grava o endereço em `addresses` da ficha (a escolhida ou a recém-criada) na mesma transação da proposta. O painel passa a usar o mesmo campo e deixa de escrever em `addresses` pelo navegador (um dono da escrita). Os guardas que medem a RPC vigente (`pedidoMontadoSchema`, o da `95`) passam a ler a migration nova." | humano no gate do PRD Tech Review (`salvar-endereco-no-cadastro-pela-function` · `tech` · r1) |
| D-05 | A foto gravada na proposta usa outra regra que a da montagem | "Um dono da regra \"qual foto vai na linha\" em `core` (variação → `images[0]` → `image_url`), chamado pela montagem do app, pela do painel e pela `precificar` da `order-proposals` (que passa a pedir `images->0->>url`). Probe contra o banco local com uma peça sem foto por variação." | humano no gate do PRD Tech Review (`foto-do-link-diverge-da-montagem` · `tech` · r1) |
| D-06 | A ação `list` não traz as peças do cartão, e "Montados" não existe no endereço de Pedidos do app | "A `list` ganha, por proposta, as linhas resumidas (nome, foto do snapshot, quantidade, até um teto) e o `agora` do servidor; a visão \"Montados\" entra em `pedidosHref` como destino próprio (`?visao=montados`, dono único do endereço) e é desenhada por um widget próprio que lê pela porta da `order-proposals`, sem cursor; o contador \"N abertos\" sai da mesma resposta." | humano no gate do PRD Tech Review (`lista-de-montados-no-app` · `tech` · r1) |
| D-07 | O app não tem a origem da loja para montar o link | "Um leitor único de `VITE_STORE_URL` em `apps/mobile-adm/src/shared/config/`, a env no `.env.example` e no projeto Vercel do app; sem ela, o cartão diz que o link não pôde ser montado (a mesma frase `LINK_WITHOUT_STORE` do painel, subida para `core/proposals`)." | humano no gate do PRD Tech Review (`link-precisa-da-origem-da-loja` · `tech` · r1) |
| D-08 | Os guardas de privacidade, tom e movimento do app têm escopo literal e não alcançam a montagem | "Na mesma tarefa que cria cada pasta: incluí-la em `semDadoDeClienteNoAparelho` (pastas) e nos guardas de tom e movimento (com as âncoras subidas), exceção literal em `semDadoSensivelDeClienteNoApp` só para `features/order-proposal` e as duas páginas novas (se F3 aprovado), e `barraNoCaminho`/`rotasSobGuarda` com as rotas novas." (F3 aprovado.) | humano no gate do PRD Tech Review (`guardas-do-app-a-ampliar` · `tech` · r1) |
| D-09 | A `order-proposals` não sobe no edge runtime local | "Primeira tarefa do plano: tornar o grafo de `core/pricing` alcançável pelo Deno (tipo declarado em `core` e reexportado pelo pacote de tipos, no molde do `MenuPromo`), com `denoReach` cobrindo os dois arquivos, e conferir o boot local das duas functions antes de qualquer prova." — refinada no gate principal por D-24 | humano no gate do PRD Tech Review (`order-proposals-nao-sobe-local` · `tech` · r1) |
| D-10 | A porta do Claude é saída estruturada por JSON Schema, não tool use; o modo de leitura vai à function | "`customer-parse` usa `createClaudeJson` com JSON Schema fixo, `claude-haiku-5-5` e esforço explícito, `requireAdmin` primeiro, 503 sem chave, teto por conta, log sem o texto (só tamanho e desfecho), e `mode: 'contact_and_address' \| 'address'`. `core/customers/parse.ts` confere e normaliza (máscaras, dígito do CPF, e-mail) com imports `.ts` das folhas; `core/customers/mergeCep.ts` (puro) aplica \"o CEP manda\" no app." | humano no gate do PRD Tech Review (`customer-parse-no-molde-real` · `tech` · r1) |
| D-11 | O limite de leituras por conta não tem estado nem frase | "É detalhe de implementação — não muda o PRD" (a `customer-parse` tem teto por conta no molde da `seo-suggest`; a frase do 429 é decisão de implementação, no tom do app) | humano no gate do PRD Tech Review (`limite-de-leituras-sem-frase` · rebaixado a `tech` · r1) |
| D-12 | O voltar do Android entre os 4 passos | "Decisão técnica: cada passo e cada folha da montagem é uma entrada do histórico do app, sem dado da cliente nela." — trecho do `prd.md` trocado (Histórico de revisões r1) | humano no gate do PRD Tech Review (`voltar-do-android-entre-passos` · `tech_prd_edit` · r1) |
| D-13 | CEP desconhecido × serviço de CEP fora | "Decisão técnica: o app usa o mesmo serviço de CEP da loja e do painel, sem distinguir os motivos da falha." — trecho do `prd.md` trocado (r1) | humano no gate do PRD Tech Review (`cep-desconhecido-x-servico-fora` · `tech_prd_edit` · r1) |
| D-14 | Reaberto depois, o pedido montado não consegue mostrar o link | p1: "É detalhe de implementação — não muda o PRD" com a ressalva "Manter botão com copiar o link dentro de pedido montado, não há a necessidade de gerar um novo. Isso deve ser ajsutado no BAckoffice também."; p2: "Guardar o token cifrado no banco (coluna nova, chave só no servidor das functions); a ação get devolve o link enquanto a proposta está aberta; app e painel mostram Copiar sempre; Renovar continua trocando o link. O ajuste do painel entra neste WI." com a ressalva "Renovar mostra apenas depois de inspirar o link atual" (lido como "expirar") — trecho do `prd.md` trocado (r1) | humano no gate do PRD Tech Review (`link-nao-se-recupera-ao-reabrir` · `tech_prd_edit` · r1, 2 páginas) |
| D-15 | Rascunho no celular | "Guardar no celular um rascunho só das peças e descontos, sem dado da cliente" com a ressalva "vamos manter uma guarda em rascunho em caso de celular bloquear ou usuário sair da tela" — exceção estreita à MAC-28 | humano no gate do PRD Tech Review (`montagem-perdida-se-o-app-fechar` · `negocio` · r1) |
| D-16 | CPF e endereço: onde ficam guardados | "Confirmo: guardados no cadastro da cliente, nunca no celular" | humano no gate do PRD Tech Review (`cpf-endereco-onde-guardar` · confirmação · r1, p2) |
| D-17 | Onde os protótipos contradizem decisões do gate, vale o PRD? | "Valem as decisões do gate, com a frase nova da folha de renovar" — a folha: "O link venceu em {dd/mm}. Os preços são conferidos de novo e sai um link novo, que vale até {dd/mm}. Mande o novo para {nome}."; rótulo "Renovar prazo" nos dois apps | humano no gate principal |
| D-18 | O rascunho das peças sobrevive ao "Sair" voluntário? | "\"Sair\" apaga o rascunho; ele só serve para a volta involuntária" com a ressalva "Dar a opção de salvar rascunho ou descartar ao sair voluntário." — aplicada: ao fechar com algo preenchido, a folha oferece guardar o rascunho ou descartar (além de continuar montando); a frase "A montagem se perde ao sair." muda de acordo | humano no gate principal |
| D-19 | O motivo do desconto combinado entra no rascunho do celular? | "Não: o rascunho leva as peças, o cupom e o valor do desconto; o motivo é escrito de novo" | humano no gate principal |
| D-20 | Endereço e proposta na mesma gravação | "Uma gravação só; a frase da falha parcial sai" — a falha diz "Não consegui gravar o pedido. Nada foi enviado à cliente. Tente de novo."; `ADDRESS_SAVE_FAILED` (`copy.ts:14`) sai do painel | humano no gate principal |
| D-21 | Endereço informado agora: campos obrigatórios | "Exigir CEP, rua, número, bairro, cidade e UF (complemento opcional)" — motivo na barra: "Complete o endereço, ou escolha 'A cliente preenche no link'." | humano no gate principal |
| D-22 | O teto de estoque conta a sacola? | "Sim: o teto soma a mesma variação já na sacola (\"Só há N em estoque.\")" | humano no gate principal |
| D-23 | Onde o chip "Montados · N abertos" entra | "Montados entra ao fim, sem tirar nenhum chip de hoje" | humano no gate principal |
| D-24 | A tarefa do grafo Deno de `core/pricing` encolhe | "A tarefa vira: denoReach de pricing, boot local conferido das três functions e os dois CLAUDE.md corrigidos" (`packages/core/src/pricing/types.ts:1-35` já declara os tipos; `pricing/index.ts:19-25` importa de `./types.ts`) | humano no gate principal |
| D-25 | O pedido que nasce de uma proposta do app mostra que origem? | "Uma origem só, \"Pedido montado\", nos dois apps" — o rótulo "Montado pelo painel" da 89 vira "Pedido montado" no painel e no app; o histórico da proposta diz "Pedido montado" | humano no gate principal |
| D-26 | A busca de cliente da montagem procura também por CPF? | "Não: nome, e-mail ou telefone, como diz o PRD" (`APP_CUSTOMER_SEARCH` como está) | humano no gate principal |
| D-27 | Busca de peças no celular | "Catálogo uma vez, mesma regra do painel (subida a core)" | humano no gate principal |
| D-28 | Como o link fica guardado: forma da cifra e da chave | "Igual, mas o secret é opcional (sem ele, comportamento de hoje)" — AES-GCM pela Web Crypto, chave de 256 bits num secret novo das functions, **opcional**: sem ele, `save`/`renew` gravam só o hash e o cartão segue com "Gerar link novo" como hoje; com ele, `get` decifra só com a proposta aberta; o `checkout` continua abrindo pelo hash; propostas abertas antes do deploy (sem cifra) seguem com "Gerar link novo". "Gerar link novo" chama `renew`: o `renew` aceita a proposta `open`/`viewed` só quando ela não tem cifra gravada, troca o hash e, com a chave configurada, grava a cifra no mesmo `update`; com cifra, a aberta é recusada, como diz D-17 (conflito D-17 × D-28 achado pelo `wi-task-audit`, resolvido pela opção A) | humano no gate principal; a conciliação pelo árbitro do orquestrador (G5) |
| D-29 | Cupom de primeira compra antes de o e-mail existir | "Sem e-mail, o cupom de primeira compra é recusado no resumo: \"Este cupom pede o e-mail da cliente.\"" | humano no gate principal |
| D-30 | Observação interna na montagem e no pedido montado | aplicada ao `prd.md` (r1): campo opcional no passo Revisar; editável no pedido montado em qualquer estado, pela ação `note` (`handlers.ts:988`) | humano no gate do PRD Tech Review (`observacao-interna-na-montagem` · `negocio` · r1) |
| D-31 | O `get` devolve o link e diz se ele está disponível | `token` no nível de cima; `actions` de `proposalActions(state, { linkAvailable })`, com `linkAvailable` verdadeiro só quando a cifra existe e a chave a decifra; `renewLabel` ('Renovar prazo' · 'Gerar link novo') com dono em `core/proposals` | premissa da implementação (T02, raio: app e painel) |
| D-32 | O endereço salvo pela RPC | grava só com `save_address` e CEP e rua preenchidos; vira padrão só se a ficha não tem padrão; não duplica (CEP, rua, número, complemento). No painel, "Salvar no cadastro" vem marcada ao montar e desmarcada ao editar | premissa da implementação (T02, raio: cadastro da cliente e as duas montagens) |
| D-33 | Textos com dois leitores sobem a `core` | `proposalRenewText`, `PROPOSAL_ORIGIN_LABEL`, `PROPOSAL_SAVE_FAILED` e `LINK_WITHOUT_STORE` em `core/proposals/link.ts`; `couponLabel` em `core/coupons/label.ts`; o painel reexporta | premissa da implementação (T01, T02, T08) |
| D-34 | A `list` traz as peças | `lines` (até `LINHAS_NA_LISTA = 4`), `lines_count` e o `agora` do servidor; a leitura das peças que falha responde 502 | premissa da implementação (T04, raio: painel e app) |
| D-35 | O selo do estado no app | `PROPOSAL_STATE_LABELS` de `core` (a vista aparece "Aberta — vista pela cliente", não "Vista pela cliente" do desenho) | premissa da implementação (T04; a QA pode notar a diferença de texto) |
| D-36 | Observação na concluída | editável em todo estado menos na concluída, porque o servidor recusa com 409 `NOTE_ON_ORDER` | premissa da implementação (T04; diverge da letra de D-30 "em qualquer estado") |
| D-37 | Busca de peças no app | só por nome ("Nome da joia"), sem SKU: `buscarProdutos` de `core` não busca SKU | premissa da implementação (T07; diverge do desenho "Nome da joia ou SKU") |
| D-38 | Os textos do cupom recusado | os da loja ("Cupom inválido.", "Cupom válido apenas no primeiro pedido."), não os do desenho | premissa da implementação (T08) |
| D-39 | O combinado que zera o pedido | o `preview` responde 200 com o resumo sem o desconto e `manual_refusal`, não 422 | premissa da implementação (T08, contrato do `preview`) |
| D-40 | A cotação do passo 4 | porta própria (`melhor-envio?action=quote`) chamada dentro de `lerComPapel`, porque a `quote` é pública e nunca devolveria 403 | premissa da implementação (T09) |
| D-41 | Editar um pedido montado | a mesma rota `/pedidos/montar` com a proposta marcada em memória de módulo; F5 durante a edição recomeça como criação vazia | premissa da implementação (T09) |
| D-42 | O rascunho no aparelho | `localStorage` (`estrelinha-montagem-rascunho`), dono único `features/order-proposal/model/rascunho.ts`, preso à conta; guarda só peça, variação, quantidade, gravação, o cupom aplicado e o valor do combinado; a linha é refeita do catálogo ao retomar | premissa da implementação (T10; a sobrevivência no PWA instalado do Android fica para a QA) |
| D-43 | O voltar do Android logo depois de "Criar link" | leva a Montados (`/pedidos?visao=montados`) com a montagem fora do histórico: a criação do link substitui as entradas dos passos, e um segundo voltar não reabre a montagem | humano, Q-01 do plano de QA (2026-11-08) · o código de hoje cai na montagem vazia — a QA registra como bug |

## Não resolvido

- **A frase do limite de leituras (429)**: D-11 a deixou à implementação; fica escrita pela tarefa da folha de leitura, no tom do app.
- **O que o lookup não conferiu**: o boot local das functions hoje (sem shell na sessão do lookup); o grafo transitivo Deno de `order-proposals` além de `pricing`; se o projeto Vercel do app tem `VITE_STORE_URL`; o tipo exato de `order_proposal_items.product_image`; o `eslint.fsd.mjs`. Ficam para o preflight da corrida e para as tarefas que os tocam.
- Nada travado: nenhum item do handoff ficou "decido depois".
