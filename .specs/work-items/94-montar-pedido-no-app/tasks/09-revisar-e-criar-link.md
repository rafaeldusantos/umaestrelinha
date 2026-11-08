## 09 · [apps/mobile-adm] App: o passo 4 · Revisar, Criar link e Editar um pedido montado

**Status:** done

`UC-08, UC-09 (Editar)` — 94

**Objetivo.** A Adri confere peças com foto, cliente e entrega com a prévia do frete, escreve a observação, cria o link (a ficha e o endereço nascem juntos) e, depois, edita um pedido montado aberto pela mesma montagem.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines, › CI e deploy; `apps/mobile-adm/CLAUDE.md`; `supabase/CLAUDE.md` › Migrations, › RLS — o molde que os guardas cobram, › Edge functions, › order-proposals e o pedido que nasce de uma proposta, › Secrets. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Passo 4 · Revisar; Pedido montado (app)); §7 · spec.md — Decisões (D-04, D-16, D-20, D-30). É o rastreio da tarefa até a costura: quem executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Depende de.** 02 (`save` com `save_address`, a RPC recriada) e 08 (o resumo pelo `preview`). Confira que existe antes de começar.
**Habilita.** 10 (o rascunho e a folha de sair sobre a montagem completa).

### Critérios de aceite

### Passo 4 · Revisar
- As **peças vêm primeiro**, cada uma com a foto da variação: a conferência final é visual. Depois,
  cliente ("Ficha nova · criada com o link") e entrega + prévia da cotação ("A cliente escolhe a entrega
  no link"), cada bloco com "Alterar".
- **Criar link** → "Criando o link…". Preço que mudou no servidor → recusa com o texto da `PRC-02` e o
  resumo relido.

- A **observação interna** (a mesma do painel, só para quem administra) aparece e pode ser editada aqui
  em qualquer estado; na montagem, ela é um campo opcional no passo Revisar. A cliente nunca a vê.

- Aberta: Editar, Cancelar (folha, `inkSolid`). Renovar só aparece depois de o link atual expirar.
  Expirada: Renovar prazo (folha de confirmação; o link antigo morre). Concluída: "Ver o pedido #0262".

### Design — o que a tela faz

Ordem: erro da criação (quando houver); "Sacola · N peças" com "Alterar" (vai ao passo 2; linhas com foto, "variação · N un. · gravação “X”", total; resumo, Total, PIX); "Cliente" com "Alterar" (passo 1; nome, e-mail ou "sem e-mail", telefone ou "sem telefone", etiqueta "Ficha nova · criada com o link"); "Entrega" com "Alterar" (endereço ou "A cliente preenche o endereço no link."; com CEP de 8 dígitos e rua, a prévia: uma linha por opção — nome, prazo em dias úteis, preço ou "grátis" — e "Prévia. A cliente escolhe a entrega no link."); a observação interna opcional (só para quem administra, a cliente nunca a vê); a nota "Os preços ficam travados como estão aqui. O link vale 7 dias, até 09/11. Nada é gravado antes de você criar o link." "Criar link" → "Criando o link…" desligado; sucesso abre o Pedido montado com toast "Link criado." / "Agora é só mandar para <nome>."; preço mudado: "Os preços mudaram enquanto você montava. Confira o resumo." no topo, com sacola e resumo relidos; outra falha: "Não consegui gravar o pedido. Nada foi enviado à cliente. Tente de novo." No passo 4 vale a soma dos bloqueios dos outros passos.

Editar (Pedido montado aberto ou vista): "Editar" ao lado de "Cancelar este pedido"; abre a montagem preenchida pelo `get` (peças, cliente, entrega, descontos, observação), e salvar mantém o link ("Alterações salvas. O link continua o mesmo."). O desenho do app não mostra o Editar de uma proposta existente (só um toast).

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `order-proposals?action=save` | JÁ EXISTE (02 com `save_address`). Consuma | rascunho da proposta + `save_address` + observação | proposta; 409 `prices_changed` + `summary` (`handlers.ts:708-712`) |
| `order-proposals?action=get` | JÁ EXISTE. Consuma (para Editar) |  |  |
| `melhor-envio?action=quote` | JÁ EXISTE. VOCÊ CRIA a porta do app para ela (`features/order-proposal/api/`), nome literal | `{ postal_code_to, products }` (corpo de `apps/backoffice/src/features/order-proposal/api/shippingPreview.ts › quoteBody`, `:26-53`; `core/shipping › toQuoteProducts`) | `ShippingQuote[]` |
| `portaDePropostas` (04) | JÁ EXISTE. VOCÊ ACRESCENTA a ação literal `save` |  |  |

### Decisões já tomadas

- D-04: o `save` leva `save_address` (o interruptor "Salvar no cadastro da cliente"); a ficha nova e o endereço nascem na mesma gravação.
- D-20: "Uma gravação só; a frase da falha parcial sai" — a falha diz "Não consegui gravar o pedido. Nada foi enviado à cliente. Tente de novo." (`PROPOSAL_SAVE_FAILED`, `core/proposals/link.ts`, a mesma do painel).
- D-16: CPF e endereço vão ao cadastro da cliente nesta gravação; nada fica no celular.
- D-30: a observação interna é um campo opcional no passo Revisar, enviado no `save`.
- D-01: a cotação é uma porta à parte, nome literal; recusa só pelo `42501` de `conferirPapel`.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| Porta de function no app | `apps/mobile-adm/src/features/order-proposal/api/portaDePropostas.ts` |
| Prévia da cotação | `apps/backoffice/src/features/order-proposal/api/shippingPreview.ts` |

### Testes

- Página real (app): a revisão mostra peças com foto primeiro, cliente e entrega, cada bloco com "Alterar" levando ao passo certo; a prévia da cotação aparece só com endereço completo.
- Página real (app): Criar link manda a escolha com `save_address` e a observação, abre o pedido montado; 409 mostra a frase da PRC-02 com o resumo relido; outra falha a frase de "nada foi enviado".
- Página real (app): Editar de um pedido montado aberto abre a montagem preenchida e salva mantendo o link.
- Client real (app): conta sem papel no `save` e na cotação ⇒ a recusa; rede caída é falha.
- Guardas: `escritaSoPelaPorta` (a porta da cotação e a ação `save`), tom e movimento.

### Obrigações

- Toda function do app por uma porta com nome literal por ação; recusa só pelo `42501` de `conferirPapel`; rede é falha, nunca recusa.
- Toda leitura do app por `lerComPapel`.
- Tom memorial (sem emoji, sem `!` nos literais do app, sem urgência) e `motion-reduce:` na mesma linha de toda animação.
- Prova de layout é de navegador (jsdom devolve 0): alvo de 44 px e `body` sem rolagem lateral se conferem na QA, não aqui.
- O gate inclui as suítes da loja e do painel (os guardas de lá varrem `apps/**`).

### Não faça

- Não escreva em tabela pelo app (o `save` é a única gravação).
- Não guarde nada em storage (é da 10).
- Não crie Duplicar.

### Pronto quando

- [ ] a Adri cria o link pela revisão, com a ficha e o endereço gravados juntos
- [ ] a recusa de preço e a falha têm as frases e não deixam nada pela metade
- [ ] Editar reabre a montagem preenchida e salva no mesmo link
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
