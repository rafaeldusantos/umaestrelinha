## 06 · [apps/mobile-adm · docs] App: a folha "Colar texto" do passo 1

**Status:** done

`UC-05` — 94

**Objetivo.** A Adri cola a conversa e o passo 1 se preenche com contato e/ou endereço marcados para conferir, com Desfazer, e nada muda numa ficha que já existe.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines, › CI e deploy; `apps/mobile-adm/CLAUDE.md`; `packages/core/CLAUDE.md` › Quando um código pertence a este pacote, › Pureza, › Os módulos, › Dinheiro, › customers, › proposals, › Convenções de tipo; `supabase/CLAUDE.md` › Migrations, › RLS — o molde que os guardas cobram, › Edge functions, › order-proposals e o pedido que nasce de uma proposta, › Secrets. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Folha · Colar texto; Passo 1 · Cliente); §7 · spec.md — Decisões (D-01, D-10, D-11). É o rastreio da tarefa até a costura: quem executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Depende de.** 03 (a function `customer-parse`, `core/customers/parse.ts` e `mergeCep.ts`) e 05 (o passo 1 e o formulário de endereço). Confira que existe antes de começar.
**Habilita.** 07 (a fila do app segue; nada desta tarefa é consumido além da folha).

### Critérios de aceite

- Nova: cartão escuro "Tem os dados numa mensagem?" → **Colar texto da conversa**. Campos de contato
  (nome, e-mail, WhatsApp, CPF opcional) e de entrega; "Salvar no cadastro da cliente".

### Ler os dados de uma mensagem (IA)
- Folha com a área de texto (até 2.000 caracteres, "O texto não fica guardado.") e **Ler o texto**.
- Escopo: em Cliente nova, lê contato + endereço; em "Outro endereço" de cliente cadastrada, lê **só o
  endereço** — nunca troca dados de uma ficha que existe.
- Durante a leitura: botão "Lendo o texto…" desligado. Depois: a folha fecha, os campos se preenchem e
  cada um diz **"Lido do texto — confira."**; editar o campo tira a marca.
- Aviso no topo: "Preenchi 7 de 11 campos. Confira antes de seguir. Não achei: e-mail, CPF,
  complemento. O CEP conferiu rua, bairro e cidade." com **Ler outro texto** e **Desfazer** (volta
  exatamente ao estado anterior).
- O CEP manda: quando o serviço conhece o CEP, rua/bairro/cidade/UF vêm dele, não do texto.
- Texto sem dados: a folha fica aberta — "Não encontrei nome, contato nem endereço neste texto…" e o
  botão secundário vira **Preencher à mão**.
- Leitura fora do ar (timeout, 5xx, sem chave): "A leitura está fora do ar agora. Feche e preencha à
  mão — nada do que você já fez se perde." A montagem nunca depende da IA.
- Nada é gravado pela leitura: a ficha e o endereço só nascem ao **Criar link**.

### Design — o que a tela faz

Pontos de entrada: em Cliente nova, o cartão escuro com ícone de mensagem, "Tem os dados numa mensagem?", "Cole a conversa do WhatsApp. Eu leio e preencho nome, contato e endereço — você confere antes de seguir." e o botão "Colar texto da conversa" (some depois de uma leitura); em "Outro endereço" da cadastrada, o link "Colar de uma mensagem" no formulário.

Folha: alça; contato e endereço — "Colar o texto da conversa" / "Eu leio e preencho os campos da cliente e da entrega. Você confere tudo antes de seguir."; só endereço — "Colar o endereço" / "Eu leio só o endereço. Os dados da ficha dela não mudam." Área "Texto da conversa", dica "Cole aqui a mensagem com nome, e-mail, telefone e endereço", corte em 2.000 na digitação, "O texto não fica guardado." e contador n/2000. Botões "Cancelar" (depois de erro, "Preencher à mão", que fecha) e "Ler o texto" (desligado vazio e durante a leitura, "Lendo o texto…"). Sucesso: a folha fecha; campos com "Lido do texto — confira." (CEP: "Lido do texto — conferido no serviço de CEP."); editar tira a marca. Bloco no passo 1: "Preenchi N de M campos. Confira antes de seguir." / "Não achei: … O CEP conferiu rua, bairro e cidade." (variantes "Achei todos os campos." e "Não consegui conferir o CEP."), com "Ler outro texto" (mesmo escopo) e "Desfazer" (volta exatamente ao estado de antes; toast "Leitura desfeita." / "Os campos voltaram ao que estava antes."). Sem dados: folha aberta, "Não encontrei nome, contato nem endereço neste texto. Confira se colou a mensagem certa, ou preencha à mão." Fora do ar: "A leitura está fora do ar agora. Feche e preencha à mão — nada do que você já fez se perde." Limite por conta (429): frase sua, no tom do app, com a montagem seguindo igual. E-mail lido que já tem ficha: o aviso de ficha da 05 ("Usar a ficha dela" transforma o resultado em leitura só de endereço; as marcas de contato saem junto).

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `apps/mobile-adm/src/features/order-proposal/api/portaDeLeitura.ts` | VOCÊ CRIA | `{ text, mode }` | campos ou erro traduzido |
| `customer-parse` | JÁ EXISTE (03). Consuma; não altere | `{ text, mode }` | 200 `{ contact?, address, found }` (`contact` só no modo `contact_and_address`; `found` 0 = texto sem dados); 503 `not_configured`; 502 `upstream` (prazo, 5xx, rede); 422 `refusal`/`truncated`/`invalid`; 429 `limited`; 413 `too_long`; 400 `bad_request`; 401/403 recusa |
| `mergeCep` (`mergeCep(address, cepAnswer \| null)` → `{ address, fromCep }`), `parseCustomerText`/`parsedFieldCount`/`CUSTOMER_PARSE_TEXT_MAX` (`packages/core/src/customers/parse.ts`, também no barril `@estrelinha/core/customers`), `useCepLookup` | JÁ EXISTE. Consuma |  |  |

### Decisões já tomadas

- D-10: modo `contact_and_address` em Cliente nova; `address` em "Outro endereço" da cadastrada — nunca troca dados de uma ficha.
- D-11: o 429 tem frase própria, no tom do app; a montagem segue igual.
- D-01: a porta da leitura é uma porta à parte, nome literal; recusa só pelo `42501` de `conferirPapel`.
- O registro da `customer-parse` e de `core/customers/parse.ts`/`mergeCep.ts` em `supabase/CLAUDE.md` e `packages/core/CLAUDE.md` é desta tarefa (a 03 não os editou).

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| Porta de function no app | `apps/mobile-adm/src/features/order-proposal/api/portaDePropostas.ts` (04) e `apps/mobile-adm/src/features/push-notifications/api/portaDeAvisos.ts` |
| Folha no histórico | `apps/mobile-adm/src/features/order-actions/model/useFolhaNoHistorico.ts` |

### Testes

- Página real (app): Cliente nova lê contato e endereço; "Outro endereço" da cadastrada lê só endereço e não muda a ficha.
- Página real (app): "Lendo o texto…" desligado durante a leitura; sucesso fecha a folha, marca os campos, editar tira a marca; o aviso conta os campos e nomeia os que faltaram; "Desfazer" volta exatamente ao estado anterior; "Ler outro texto" reabre no mesmo escopo.
- Página real (app): o CEP manda quando o serviço conhece; sem resposta do serviço, fica o que o texto trouxe.
- Página real (app): texto sem dados mantém a folha aberta com "Preencher à mão"; fora do ar (503, prazo, 5xx) e limite (429) com as frases; o voltar do Android fecha a folha.
- Client real (app): conta sem papel na porta da leitura ⇒ a recusa; rede caída é falha.
- Guardas: `escritaSoPelaPorta` (a porta da leitura, `INVOCACAO_ACEITA` e `IMPORTAM_O_CLIENT`), `semDadoDeClienteNoAparelho` (o texto nunca vai a storage, URL ou `history.state`), tom e movimento.

### Obrigações

- Toda function do app por uma porta com nome literal por ação; recusa só pelo `42501` de `conferirPapel`; rede é falha, nunca recusa.
- Toda leitura do app por `lerComPapel`.
- Tom memorial (sem emoji, sem `!` nos literais do app, sem urgência) e `motion-reduce:` na mesma linha de toda animação.
- Prova de layout é de navegador (jsdom devolve 0): alvo de 44 px e `body` sem rolagem lateral se conferem na QA, não aqui.
- O gate inclui as suítes da loja e do painel (os guardas de lá varrem `apps/**`).
- O texto colado só vive na memória da folha; nada em storage, log do app ou título.

### Não faça

- Não guarde o texto em lugar nenhum.
- Não grave nada no servidor (a ficha e o endereço nascem só ao Criar link, na 09).
- Não implemente o "Colar texto" no Backoffice (fora do escopo).

### Pronto quando

- [ ] a folha lê os dois escopos e preenche os campos marcados, com Desfazer
- [ ] os desfechos sem dados, fora do ar e limite têm frase e não perdem nada
- [ ] os CLAUDE.md registram a `customer-parse` e o `parse`/`mergeCep`
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
