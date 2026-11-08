## 10 · [apps/mobile-adm · docs] App: o rascunho da montagem no celular e a folha de sair

**Status:** done

`UC-02 (rascunho)` — 94

**Objetivo.** Se o celular bloquear ou a Adri sair da tela, a montagem volta com as peças e os descontos; ao fechar por vontade dela, ela escolhe guardar o rascunho ou descartar; nenhum dado da cliente fica no aparelho.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines, › CI e deploy; `apps/mobile-adm/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Montar pedido — casca); §7 · spec.md — Decisões (D-15, D-18, D-19). É o rastreio da tarefa até a costura: quem executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Depende de.** 09 (a montagem completa: passos 1 a 4 e o Criar link). Confira que existe antes de começar.
**Habilita.** nada (última da fila).

### Critérios de aceite

- Fechar a montagem com algo preenchido pede confirmação ("Nada foi gravado ainda").
- Para o caso de o celular bloquear ou a Adri sair da tela, a montagem guarda no celular um rascunho só
  das peças e dos descontos, sem dado da cliente.

### Design — o que a tela faz

Folha de fechar com algo preenchido: "Sair sem criar o link?" — com o rascunho, o texto deixa de dizer que tudo se perde e diz o que fica guardado (as peças e os descontos, neste celular) e o que não fica (os dados da cliente); botões "Continuar montando", guardar o rascunho e descartar (inkSolid). Voltar à montagem com um rascunho guardado: as peças, o cupom e o valor do desconto voltam; a cliente e o motivo do desconto se escolhem/escrevem de novo. Criar o link apaga o rascunho. A troca de conta apaga o rascunho.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| chave de storage do rascunho (nome no padrão `estrelinha-…`) | VOCÊ CRIA, num dono único em `apps/mobile-adm/src/features/order-proposal/model/` | peças (variação, quantidade, gravação), cupom, valor e tipo do desconto | o rascunho, ou nada |
| guarda da chave nova | VOCÊ CRIA (molde `apps/store/src/shared/lib/__tests__/visitanteComDonoUnico.test.ts`) |  |  |

### Decisões já tomadas

- D-15: "Guardar no celular um rascunho só das peças e descontos, sem dado da cliente" com a ressalva "vamos manter uma guarda em rascunho em caso de celular bloquear ou usuário sair da tela" — exceção estreita à MAC-28.
- D-18: "\"Sair\" apaga o rascunho; ele só serve para a volta involuntária" com a ressalva "Dar a opção de salvar rascunho ou descartar ao sair voluntário." — ao fechar com algo preenchido, a folha oferece guardar o rascunho ou descartar.
- D-19: "Não: o rascunho leva as peças, o cupom e o valor do desconto; o motivo é escrito de novo".

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| Storage com dono único | `apps/store/src/shared/lib/visits/visitor.ts` + `apps/store/src/shared/lib/__tests__/visitanteComDonoUnico.test.ts` |

### Testes

- Página real (app): com peças e desconto, a página recarrega (ou some e volta) e a montagem reabre com as peças, o cupom e o valor do desconto, sem a cliente e sem o motivo.
- Página real (app): fechar com algo preenchido oferece guardar ou descartar; descartar apaga o rascunho; guardar mantém; Criar link apaga.
- Página real (app): a troca de conta apaga o rascunho (`trocaDeContaLimpaCache`).
- Guardas: o dono único da chave (a chave fora dele reprova, testes inclusos); `semDadoDeClienteNoAparelho` com a exceção estreita ao dono do rascunho, e um sensor provando que nome, e-mail, telefone, CPF, endereço ou o motivo no rascunho reprovam.

### Obrigações

- Toda function do app por uma porta com nome literal por ação; recusa só pelo `42501` de `conferirPapel`; rede é falha, nunca recusa.
- Toda leitura do app por `lerComPapel`.
- Tom memorial (sem emoji, sem `!` nos literais do app, sem urgência) e `motion-reduce:` na mesma linha de toda animação.
- Prova de layout é de navegador (jsdom devolve 0): alvo de 44 px e `body` sem rolagem lateral se conferem na QA, não aqui.
- O gate inclui as suítes da loja e do painel (os guardas de lá varrem `apps/**`).
- Atualize `CLAUDE.md` da raiz › Convenções (a lista de chaves em uso, com o dono) e › Baselines (testes, tipos e lint medidos no fecho, um workspace por vez, exit fora de pipe), e `apps/mobile-adm/CLAUDE.md` com o rascunho.

### Não faça

- Não guarde dado da cliente nem o motivo do desconto.
- Não use `sessionStorage` para o que precisa sobreviver ao bloqueio do celular sem conferir que sobrevive no PWA instalado (registre a escolha no retorno).

### Pronto quando

- [ ] a montagem volta depois de uma saída involuntária com as peças e os descontos
- [ ] a saída voluntária pergunta guardar ou descartar
- [ ] nenhum dado da cliente no aparelho, provado pelo guarda
- [ ] as baselines e a lista de chaves atualizadas no `CLAUDE.md`
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
