## 08 · [apps/mobile-adm] O app do ateliê mostra o registro manual — detalhe do pedido

**Status:** done

`RNF-09` — 98

**Objetivo.** No app do ateliê, o detalhe do pedido mostra que o pagamento foi registrado à mão, o meio, a data e a observação, sem os comprovantes.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz — §O "defeito 01", §Os guardas, §Convenções, §Baselines, §CI e deploy), `apps/mobile-adm/CLAUDE.md` › Pedidos (74), Os guardas do app, Testes. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código (O que muda: detalhe do app).

**Depende de.** 01 — a tabela do registro manual. Confira que existe antes de começar.

### Critérios de aceite

**Não-funcionais**
- RNF-09 O app do ateliê mostra que o pagamento foi registrado à mão, o meio, a data e a observação; comprovantes só no painel. O app não registra [gate P-06; r1 o-que-o-app-mostra]

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| Leitura do registro manual (meio, data, observação, origem; sem comprovante) dentro do `lerComPapel` do detalhe | VOCÊ CRIA em `apps/mobile-adm/src/entities/order/api/usePedido.ts` e `entities/order/model/linha.ts` | | |
| Exibição em `widgets/order-detail/ui/BlocoValores.tsx` | VOCÊ ALTERA | | |
| Tabela do registro manual (`order_manual_payments`: `method`, `paid_at`, `note`, `created_by_name`, `undone_at`; o vivo é `undone_at is null`; só admin lê pela RLS) | JÁ EXISTE (01). Consuma | | |

### Decisões já tomadas

- O app mostra registro, meio, data e observação; comprovantes só no painel; o app não registra.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| Leitura nova no app | `apps/mobile-adm/src/entities/order/api/usePedido.ts` › leitura de `order_admin_notes` |

Abra o arquivo antes de escrever o seu.

### Testes

- Componente (app): o bloco mostra registro, meio, data e observação, e nunca comprovante.
- Recusa sobre o client real (`clientReal`): conta sem papel não vê o registro.

### Obrigações

- `leituraSoComPapel.test.ts`, `escritaSoPelaPorta.test.ts` (lista literal de quem importa o client), `semDadoSensivelDeClienteNoApp.test.ts` (nada de comprovante), `tomMemorial*`, `movimento*`.
- Gate: suíte do mobile-adm e da loja.

### Não faça

- Não acrescente ação de registrar nem de desfazer no app.
- Não leia comprovantes.

### Pronto quando

- [ ] o detalhe do app mostra o registro manual sem comprovante
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho de `CLAUDE.md` §Comandos/§Baselines (tipos do app tocado e de `packages/core`, na seção Comandos de verificação de `.specs/project/PROJECT.md`)

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
