## 05 · [apps/mobile-adm · packages/core] App: a montagem em tela cheia e o passo 1 · Cliente (sem a leitura por IA)

**Status:** done

`UC-02, UC-03, UC-04` — 94

**Objetivo.** A Adri toca "Montar pedido", percorre os 4 passos com o voltar do Android recuando um passo, e no passo 1 escolhe uma cliente cadastrada ou cadastra uma nova, com a entrega decidida.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines, › CI e deploy; `apps/mobile-adm/CLAUDE.md`; `packages/core/CLAUDE.md` › Quando um código pertence a este pacote, › Pureza, › Os módulos, › Dinheiro, › customers, › proposals, › Convenções de tipo. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Montar pedido — casca; Passo 1 · Cliente); §7 · spec.md — Decisões (D-02, D-08, D-12, D-13, D-16, D-21, D-26). É o rastreio da tarefa até a costura: quem executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Depende de.** 04 — a porta de propostas (`features/order-proposal/api/portaDePropostas.ts`, ações `list`·`get`·`renew`·`cancel`·`log-sent`·`note`; `INVOCACAO_ACEITA` é um mapa por porta em `escritaSoPelaPorta`), `traduzir` em `shared/api/traduzir.ts` (com leitor de erro por porta), e as pastas `features/order-proposal/` e `widgets/proposal-list/` já nos guardas (`semDadoDeClienteNoAparelho`, o tom em `tomMemorialDosMontados.test.ts` e o movimento em `movimentoDosPedidos.test.ts`, lista literal). A exceção de `semDadoSensivelDeClienteNoApp` que a 04 criou é por arquivo e texto exatos (`PERMITIDAS`): só `customer_document: string | null` em `features/order-proposal/model/tipos.ts` e a leitura em `features/order-proposal/model/frases.ts` (`documentoDoMontado`); as colunas `address_*` não são termo recusado. Os arquivos da montagem que citarem o documento entram nessa lista aqui, com sensor. Confira que existe antes de começar.
**Habilita.** 06 (a folha "Colar texto" entra no passo 1), 07..09 (os passos 2..4 entram na casca).

### Critérios de aceite

1. **Montar pedido no app** — botão no topo de Pedidos, montagem em tela cheia em 4 passos — o voltar do Android volta um passo (ou fecha a folha aberta), e no primeiro passo pede a mesma confirmação de fechar — (Cliente ·
   Peças · Descontos · Revisar), barra de baixo com o total e o botão, motivo escrito quando ele está
   bloqueado (`MON-12`).

### Passo 1 · Cliente
- Segmento **Cliente cadastrada | Cliente nova**.
- Cadastrada: busca por nome, e-mail ou telefone (inclui convidadas). Escolhida, a entrega vem no
  endereço padrão; opções: outro salvo, **Outro endereço** (digitar ou "Colar de uma mensagem") ou **A
  cliente preenche no link**.
- Nova: cartão escuro "Tem os dados numa mensagem?" → **Colar texto da conversa**. Campos de contato
  (nome, e-mail, WhatsApp, CPF opcional) e de entrega; "Salvar no cadastro da cliente".
- Na montagem pelo app, a Adri pode digitar, ler do texto e conferir o CPF e o endereço de entrega da
  cliente, e ver os endereços salvos de uma cliente cadastrada — só dentro da montagem e da tela do
  pedido montado. Fora delas (aba Clientes, detalhe do pedido), o app continua sem mostrar CPF nem
  endereço completo. Nada disso fica guardado no celular: some ao fechar a montagem. O CPF e o endereço
  são guardados no cadastro da cliente — são dados necessários para o processo.
- E-mail que já tem ficha (digitado ou lido) → "já é de Juliana Prates · 2 pedidos" com **Usar a ficha
  dela** / **Corrigir o e-mail** (`MON-03`). Usar a ficha guarda o endereço lido como "Outro endereço".
- CEP com 8 dígitos completa rua, bairro, cidade e UF pelo serviço da loja; CEP que o serviço não encontra — ou serviço de CEP fora do ar — libera rua, bairro, cidade e UF para digitar, e a tela diz que não encontrou o CEP.

- Fechar a montagem com algo preenchido pede confirmação ("Nada foi gravado ainda").

### Design — o que a tela faz

Casca: cabeçalho "x" (aria "Fechar a montagem"), "Montar pedido", "Passo n de 4 · Cliente/Peças/Descontos/Revisar"; indicador de 4 segmentos-botão (aria "Passo n: Nome") que só navega até o passo mais alto alcançado; barra fixa com o motivo do bloqueio, "Itens · N peças · frete à parte" (sem peças "Nenhuma peça ainda") e o total (sem peças "—"), e "Continuar". Botão desligado com bloqueio (exceto no passo 3, regra da 08). Motivos do passo 1: "Escolha a cliente para continuar." · "Falta o nome da cliente." · "Falta o e-mail da cliente — é por ele que o pedido chega a ela." · "Confira o e-mail da cliente." · "Este e-mail já tem ficha. Use a ficha dela ou corrija o e-mail." · "Complete o endereço, ou escolha 'A cliente preenche no link'." (D-21). "x" com algo preenchido (cliente, nome, e-mail, peças ou CEP) abre "Sair sem criar o link?" / "Nada foi gravado ainda. A montagem se perde ao sair." ("Continuar montando" / "Sair", inkSolid) — o guardar/descartar rascunho é da 10; sem nada, fecha direto. "Montar pedido" (botão primário com ícone de mais) ao lado do título em Pedidos.

Passo 1: segmento "Cliente cadastrada | Cliente nova" (trocar limpa cliente, endereço e marcas). Cadastrada: busca "Nome, e-mail ou telefone" (casa também pelos dígitos do telefone), resultados com inicial, nome, "e-mail · N pedidos"; vazia lista todos; sem resultado "Ninguém com “q”. Se for a primeira compra, use **Cliente nova**."; escolhida: cartão "Cliente" com "Trocar" e cartão "Entrega" com "Endereço padrão", "Endereço salvo", "Outro endereço" ("Digite ou cole de uma mensagem."), "A cliente preenche no link" ("Ela informa o endereço ao concluir."); padrão ao escolher, ou "A cliente preenche" sem endereço salvo. Nova: (o cartão escuro "Tem os dados numa mensagem?" com "Colar texto da conversa" entra na 06) "Contato" (Nome "Como ela assina", E-mail, WhatsApp `(51) 99999-9999`, CPF (opcional) `000.000.000-00`), "Entrega" com "Informar o endereço agora" e "A cliente preenche no link". Formulário de endereço: CEP `00000-000`, Rua, Número + Complemento ("Opcional"), Bairro, Cidade + UF; interruptor "Salvar no cadastro da cliente" — "Só é gravado quando você criar o link." — ligado, também em "Outro endereço" da cadastrada. E-mail com ficha: "<e-mail> já é de <nome> · N pedidos. Para não nascer uma segunda ficha, use a dela." com "Usar a ficha dela" / "Corrigir o e-mail" (com CEP de 8 dígitos digitado, entrega em "Outro endereço" e toast "Usando a ficha de <nome>." / "O endereço lido do texto ficou como “Outro endereço”."; sem, padrão e toast "A entrega veio no endereço padrão dela."). CEP: 8 dígitos conhecido preenche e dica "Porto Alegre/RS · endereço completado pelo CEP."; não encontrado ou serviço fora: "Não achei este CEP. Confira, ou preencha o endereço à mão." e campos livres. O desenho não mostra carregando da busca e do CEP: use o padrão do app.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| rota da montagem (ex. `/pedidos/montar`) | VOCÊ CRIA em `apps/mobile-adm/src/app/App.tsx` (dentro do `RequireAdmin`, irmã auto-fechada) |  |  |
| estado da montagem e os passos como entradas do histórico | VOCÊ CRIA em `apps/mobile-adm/src/features/order-proposal/model/` |  |  |
| leitura de clientes (`customer_list`) e endereços salvos (`addresses`) da cliente | VOCÊ CRIA em `apps/mobile-adm/src/entities/customer/api/`, dentro de `lerComPapel` | termo / id | linhas |
| ficha por e-mail exato | VOCÊ CRIA (molde `apps/backoffice/src/entities/customer/api/useCustomerSearch.ts › lerClientePorEmail`, `:96-110`), dentro de `lerComPapel` | e-mail | ficha ou nada |
| `APP_CUSTOMER_SEARCH`/`buildAppCustomerSearch`/`limparTermoColado` (`packages/core/src/customers/search.ts:69-85`), `directoryEmailCondition`, `useCepLookup` (`packages/core/src/hooks/useCepLookup.ts`), `maskPhone`/`maskCep`, validador de CPF e e-mail | JÁ EXISTE. Consuma |  |  |

### Decisões já tomadas

- D-02: "As leituras que restam no app (busca de clientes, endereços salvos, peças e variações) entram em `lerComPapel`." — aqui a busca de clientes e os endereços salvos, com as entradas literais em `leituraSoComPapel`.
- D-12: "cada passo e cada folha da montagem é uma entrada do histórico do app, sem dado da cliente nela"; o voltar do Android recua um passo, fecha a folha aberta, e no primeiro passo pede a confirmação de fechar.
- D-13: o mesmo serviço de CEP da loja e do painel, sem distinguir os motivos da falha.
- D-16: CPF e endereço ficam no cadastro da cliente (gravados ao criar o link, na 09), nunca no celular; só a montagem e o pedido montado os mostram.
- D-21: "Exigir CEP, rua, número, bairro, cidade e UF (complemento opcional)" com "Informar o endereço agora" ou "Outro endereço".
- D-26: "Não: nome, e-mail ou telefone, como diz o PRD" — a busca de cliente não procura CPF.
- D-08: as pastas e páginas novas entram nos guardas de tom, movimento e `semDadoDeClienteNoAparelho`; o marcador de passo no `history.state` passa a ser aceito pela régua 5 dele (hoje só `{ doApp: true }`), sem dado de cliente.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| Passos no histórico | `apps/mobile-adm/src/features/recovery/model/passos.ts`; `apps/mobile-adm/src/features/order-actions/model/useFolhaNoHistorico.ts` |
| Leitura com papel | `apps/mobile-adm/src/entities/customer/api/useCliente.ts` + `apps/mobile-adm/src/shared/api/lerComPapel.ts` |

### Testes

- Página real (app): "Montar pedido" em Pedidos abre a montagem; o indicador só navega até o passo alcançado; o motivo do bloqueio aparece escrito na barra.
- Página real (app): o voltar do Android recua um passo, fecha a folha aberta e, no primeiro passo, pede a confirmação; fechar com algo preenchido pergunta antes, sem nada fecha direto.
- Página real (app): cliente cadastrada — busca por nome, e-mail e dígitos do telefone; entrega no padrão; outro salvo; outro endereço; a cliente preenche no link.
- Página real (app): cliente nova — contato com máscara; e-mail com ficha oferece Usar a ficha dela / Corrigir; CEP conhecido preenche; CEP não achado libera os campos com a frase; endereço incompleto bloqueia com o motivo.
- Client real (app): conta sem papel na busca de clientes e nos endereços ⇒ a recusa e nenhum dado de cliente.
- Guardas: `leituraSoComPapel` (entradas literais novas), `semDadoDeClienteNoAparelho` (régua 5 com o marcador de passo; sem storage), `rotasSobGuarda`, `barraNoCaminho` (`/pedidos/montar` sem a barra), tom e movimento.

### Obrigações

- Toda function do app por uma porta com nome literal por ação; recusa só pelo `42501` de `conferirPapel`; rede é falha, nunca recusa.
- Toda leitura do app por `lerComPapel`.
- Tom memorial (sem emoji, sem `!` nos literais do app, sem urgência) e `motion-reduce:` na mesma linha de toda animação.
- Prova de layout é de navegador (jsdom devolve 0): alvo de 44 px e `body` sem rolagem lateral se conferem na QA, não aqui.
- O gate inclui as suítes da loja e do painel (os guardas de lá varrem `apps/**`).
- Atualize `apps/mobile-adm/CLAUDE.md` com a montagem e o histórico por passo.

### Não faça

- Não implemente a folha "Colar texto" nem a chamada à `customer-parse` (é da 06): o cartão "Tem os dados numa mensagem?" e o link "Colar de uma mensagem" entram na 06.
- Não implemente os passos 2, 3 e 4 (07, 08, 09) além do esqueleto da casca.
- Não grave nada no servidor nem em storage (rascunho é da 10).
- Não busque cliente por CPF.

### Pronto quando

- [ ] a montagem abre de Pedidos, com os 4 passos e o voltar do Android
- [ ] o passo 1 escolhe cadastrada ou cadastra nova, com a entrega e o endereço obrigatório quando informado
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
