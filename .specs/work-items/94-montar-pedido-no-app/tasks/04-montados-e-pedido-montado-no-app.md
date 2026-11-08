## 04 · [apps/mobile-adm · supabase · apps/store (guardas)] App: a visão "Montados" em Pedidos e a tela do Pedido montado

**Status:** done

`UC-01, UC-09` — 94

**Objetivo.** No app, a Adri vê os pedidos montados num chip de Pedidos e abre cada um para copiar ou enviar o link, ver as peças com foto, editar a observação interna, cancelar e (expirada) renovar.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines, › CI e deploy; `apps/mobile-adm/CLAUDE.md`; `supabase/CLAUDE.md` › Migrations, › RLS — o molde que os guardas cobram, › Edge functions, › order-proposals e o pedido que nasce de uma proposta, › Secrets. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Pedidos · Montados; Pedido montado (app)); §7 · spec.md — Decisões (D-01, D-06, D-07, D-08, D-17, D-23, D-25, D-30). É o rastreio da tarefa até a costura: quem executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Depende de.** 01 (`LINK_WITHOUT_STORE` em `core/proposals`) e 02 (`get` devolve o token enquanto aberta; Renovar só da expirada (salvo o recuo sem cifra de D-28: a aberta/vista sem cifra gravada renova pelo "Gerar link novo")). Confira que existe antes de começar.
**Habilita.** 05 (a porta de propostas, `traduzir` em `shared/api` e os guardas de porta já preparados; o botão "Montar pedido" entra na tela de Pedidos), 09 ("Editar" na tela do pedido montado).

### Critérios de aceite

### Pedidos · Montados
- "Montar pedido" ao lado do título. A visão "Montados · N abertos" entra nos chips de Pedidos.
- Cartão: número `P-0000`, estado, cliente, "Montado há 2 dias · vale até 05/11" (ou "Virou o pedido
  #0262" / "Venceu em…"), total dos itens e as peças.

### Pedido montado
- Cartão escuro com o link — sempre disponível enquanto o pedido montado está aberto, também ao reabri-lo depois, no app e no painel; nunca é preciso gerar um link novo para copiar —, **Enviar pelo WhatsApp** (só com telefone) e **Copiar link**; sem telefone,
  "Sem telefone — copie o link." A mensagem do WhatsApp aparece escrita.
- As peças aparecem com a foto, como na revisão.
- A **observação interna** (a mesma do painel, só para quem administra) aparece e pode ser editada aqui
  em qualquer estado; na montagem, ela é um campo opcional no passo Revisar. A cliente nunca a vê.
- Copiar/WhatsApp registram "Link enviado · canal" no histórico.
- Aberta: Editar, Cancelar (folha, `inkSolid`). Renovar só aparece depois de o link atual expirar.
  Expirada: Renovar prazo (folha de confirmação; o link antigo morre). Concluída: "Ver o pedido #0262".

### Design — o que a tela faz

Pedidos · Montados: chip "Montados · N aberto(s)" **ao fim** dos chips de hoje (D-23); com ele, "N pedidos montados · os mais recentes primeiro" e cartões (número `P-0042` e selo; cliente com a meta; total à direita; peças "Nome · variação" juntas por " · "). Meta: Aberta/Vista "Montado há 2 dias · vale até 05/11"; Concluída "Virou o pedido #0262"; Expirada "Venceu em 31/10"; Cancelada "Cancelado · montado há 12 dias". Selos Aberta, Vista pela cliente, Concluída, Expirada, Cancelada; o contador soma Aberta e Vista. Tocar abre o pedido montado. O desenho não mostra vazio, carregando, erro nem recusa: use os estados que a lista de Pedidos do app já tem.

Pedido montado: cabeçalho com voltar (aria "Voltar para Montados"), "Pedido montado P-0042", "Montado agora · vale até 09/11" ou "Montado há 2 dias", selo. Aberta/Vista: cartão escuro "Link para <primeiro nome>", link em caixa, "Enviar pelo WhatsApp" (com telefone) ou "Sem telefone — copie o link.", "Copiar link", "Vale até 05/11. Quem tem o link pode pagar este pedido — não pode ver a conta dela."; cartão "Mensagem do WhatsApp" com o texto de `proposalWhatsappText`. Sem token no `get` (proposta sem cifra ou sem chave): o cartão diz que o link não pode ser mostrado e oferece "Gerar link novo" (= renovar). Sem `VITE_STORE_URL`: a frase `LINK_WITHOUT_STORE`. Faixas: Concluída "<nome> concluiu no link. O pedido **#0262** segue na fila como qualquer pedido da loja."; Expirada "O link venceu em 31/10. Renovar confere os preços de novo e gera um link novo."; Cancelada "Cancelado. Quem abrir o link lê que este pedido não está mais disponível." Cartões "Cliente", "N peças" (foto `FotoDaPeca`, "nome · variação · N un.", resumo, "Total dos itens", "Frete: a cliente escolhe no link."), observação interna editável em qualquer estado, "Histórico" (mais recente primeiro; o evento de criação diz "Pedido montado" — D-25; "Link enviado · WhatsApp" / "Link enviado · copiado"). Ações: Aberta/Vista "Cancelar este pedido" (folha "Cancelar P-0042?" / "Quem abrir o link vai ler que este pedido não está mais disponível. Não dá para desfazer.", "Manter" / "Cancelar pedido" inkSolid; toast "Pedido montado cancelado." / "O link deixou de funcionar."); Expirada: rodapé "Renovar prazo" (folha "Renovar o prazo de P-0042?" com "O link venceu em {dd/mm}. Os preços são conferidos de novo e sai um link novo, que vale até {dd/mm}. Mande o novo para {nome}.", "Agora não" / "Renovar"); Concluída: "Ver o pedido #0262" abre o detalhe do pedido. Toasts do envio: "Abrindo o WhatsApp…" / "Conversa com <nome>, com a mensagem pronta."; "Link copiado." / "Cole na conversa com <nome>."

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `order-proposals?action=list` | JÁ EXISTE (`handlers.ts › list`, `:526-557`, `COLUNAS_DA_LISTA` `:145-157`). VOCÊ ALTERA | — | + por proposta as linhas resumidas (nome, `product_image`, variação, quantidade, com teto) e `agora` do servidor |
| `get`, `renew`, `cancel`, `log-sent`, `note` | JÁ EXISTE (02 deixou o `get` com token). Consuma |  |  |
| `apps/mobile-adm/src/features/order-proposal/api/portaDePropostas.ts` | VOCÊ CRIA | ação literal + corpo | resposta ou erro traduzido |
| `traduzir` em `apps/mobile-adm/src/shared/api/` | VOCÊ MOVE de `features/push-notifications/api/portaDeAvisos.ts:57-82` (a porta de avisos passa a importar) |  |  |
| leitor único de `VITE_STORE_URL` | VOCÊ CRIA em `apps/mobile-adm/src/shared/config/` | env | origem ou `null` |
| `?visao=montados` | VOCÊ CRIA em `apps/mobile-adm/src/entities/order/model/pedidosHref.ts` (fora de `ORDER_VIEWS`) |  |  |
| rota do pedido montado (ex. `/pedidos/montados/:id`) | VOCÊ CRIA em `apps/mobile-adm/src/app/App.tsx` (dentro do `RequireAdmin`, irmã auto-fechada) |  |  |
| `proposalLink`, `proposalWhatsappText`, `proposalState`, `PROPOSAL_STATE_LABELS`, `proposalActions`, `whatsappChatUrl`, `LINK_WITHOUT_STORE` | JÁ EXISTE em `core`. Consuma |  |  |

### Decisões já tomadas

- D-01: "Uma porta por function em `features/order-proposal/api/` (`portaDePropostas.ts`, `portaDeLeitura.ts` para a `customer-parse`, e a cotação), no molde de `portaDeAvisos.ts`: nome literal por ação, recusa só pelo `42501` de `conferirPapel`. Ampliar `escritaSoPelaPorta` (`INVOCACAO_ACEITA` por porta, `IMPORTAM_O_CLIENT`) e `leituraSoComPapel` com as entradas literais, e um `…ComClientReal.test.tsx` provando a recusa sobre o supabase-js real, como `avisosComClientReal`." — aqui só a porta de propostas.
- D-06: "A `list` ganha, por proposta, as linhas resumidas (nome, foto do snapshot, quantidade, até um teto) e o `agora` do servidor; a visão \"Montados\" entra em `pedidosHref` como destino próprio (`?visao=montados`, dono único do endereço) e é desenhada por um widget próprio que lê pela porta da `order-proposals`, sem cursor; o contador \"N abertos\" sai da mesma resposta."
- D-07: leitor único de `VITE_STORE_URL`, a env no `apps/mobile-adm/.env.example`; sem ela, `LINK_WITHOUT_STORE`.
- D-08: incluir as pastas novas em `semDadoDeClienteNoAparelho` e nos guardas de tom e movimento (âncoras subidas); exceção literal em `semDadoSensivelDeClienteNoApp` só para `features/order-proposal` e as páginas da montagem e do pedido montado; `barraNoCaminho`/`rotasSobGuarda` com as rotas novas.
- D-17: Renovar só depois de expirar, com a folha nova (a frase é `proposalRenewText`, `core/proposals/link.ts`, a mesma do painel; o rótulo vem em `actions.renewLabel` do `get`); rótulo "Renovar prazo" (salvo o recuo sem cifra de D-28: a aberta/vista sem cifra gravada renova pelo "Gerar link novo").
- D-23: "Montados entra ao fim, sem tirar nenhum chip de hoje".
- D-25: "Uma origem só, \"Pedido montado\", nos dois apps" — no app, o evento de criação do histórico da proposta diz "Pedido montado"; se o detalhe do pedido do app mostrar a origem, usa o mesmo rótulo de `core` que a 02 deixou (`PROPOSAL_ORIGIN_LABEL`, `core/proposals/link.ts`); se não mostra, não crie exibição nova.
- D-30: a observação interna, editável em qualquer estado, pela ação `note`.
- D-14/D-28: o link vem do `get` enquanto aberta; sem token, "Gerar link novo" chama `renew` e passa a mostrar o link novo; o link vive só na tela (nada em storage).

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| Porta de function no app | `apps/mobile-adm/src/features/push-notifications/api/portaDeAvisos.ts` |
| Recusa sobre o client real | `apps/mobile-adm/src/app/__tests__/avisosComClientReal.test.tsx` |
| Folha no histórico | `apps/mobile-adm/src/features/order-actions/model/useFolhaNoHistorico.ts` |
| Leitor de env | `apps/backoffice/src/shared/lib/storeOrigin.ts` |
| Ação na function | `supabase/functions/order-proposals/handlers.ts › note` |

### Testes

- Unidade (functions): `list` traz as linhas resumidas com teto e o `agora`.
- Página real (app, `montarApp`): "Montados" pelo endereço `?visao=montados`, chip ao fim com a contagem de abertos; cartões com a meta por estado.
- Página real (app): o cartão do link mostra o link do `get`, "Sem telefone — copie o link." sem telefone; copiar e WhatsApp chamam `log-sent` e o histórico mostra "Link enviado · copiado"/"Link enviado · WhatsApp"; sem token, "Gerar link novo" chama `renew` e passa a mostrar o link novo; sem `VITE_STORE_URL`, `LINK_WITHOUT_STORE`.
- Página real (app): ações por estado (Aberta: Cancelar; Expirada: Renovar prazo com a frase nova; Concluída: Ver o pedido; Cancelada: nada); observação editável salva por `note`.
- Client real (app): conta sem papel em cada ação da porta ⇒ a recusa da `72` e nenhum dado de cliente em instante nenhum; rede caída é falha, nunca recusa.
- Guardas: `escritaSoPelaPorta` (`INVOCACAO_ACEITA` por porta, `IMPORTAM_O_CLIENT`), `leituraSoComPapel`, `semDadoSensivelDeClienteNoApp` (exceção literal com sensor fora dela, inclusive na aba Clientes), `semDadoDeClienteNoAparelho`, `barraNoCaminho` (`/pedidos/montados/<id>` sem a barra — regex de `widgets/tab-bar/model/tabs.ts:51-52`), `rotasSobGuarda`, `abasSaoAsRotas`, `enderecoDePedidosComDonoUnico`, tom e movimento com as pastas novas.

### Obrigações

- Toda function do app por uma porta com nome literal por ação; recusa só pelo `42501` de `conferirPapel`; rede é falha, nunca recusa.
- Toda leitura do app por `lerComPapel`.
- Tom memorial (sem emoji, sem `!` nos literais do app, sem urgência) e `motion-reduce:` na mesma linha de toda animação.
- Prova de layout é de navegador (jsdom devolve 0): alvo de 44 px e `body` sem rolagem lateral se conferem na QA, não aqui.
- O gate inclui as suítes da loja e do painel (os guardas de lá varrem `apps/**`).
- Na troca de conta, o que a tela guarda em memória some (`trocaDeContaLimpaCache`).
- Atualize `apps/mobile-adm/CLAUDE.md` com a visão Montados, a tela e os guardas ampliados.

### Não faça

- Não crie o botão "Montar pedido" nem a montagem (é da 05).
- Não crie "Editar" no pedido montado (é da 09).
- Não guarde o link nem dado da cliente em storage.
- Não altere `save`, `get` nem `renew` no servidor (são da 02).

### Pronto quando

- [ ] a Adri abre "Montados" pelo chip e vê os cartões com peças e meta
- [ ] no pedido montado aberto, copia ou envia o link e o histórico registra o envio
- [ ] cancela a aberta e renova a expirada pela folha
- [ ] a observação interna é editada
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório (e a seção Comandos de verificação do `.specs/project/PROJECT.md`)

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
