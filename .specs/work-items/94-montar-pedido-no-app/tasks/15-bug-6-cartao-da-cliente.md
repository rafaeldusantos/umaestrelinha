## 15 · [apps/mobile-adm] BUG-006 — [Montagem · Passo 1] O cartão da cliente escolhida não mostra o telefone nem "N pedidos na loja"

**Status:** done

`BUG-006` — 94

**Objetivo.** O cartão da cliente escolhida mostra o telefone e "N pedidos na loja".

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines; `apps/mobile-adm/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

### Critérios de aceite

### BUG-006 — [Montagem · Passo 1] O cartão da cliente escolhida não mostra o telefone nem "N pedidos na loja"

#### Resumo

A Adri busca a cliente pelo nome e a escolhe. Para ter certeza de que é a mesma pessoa da conversa, ela
confere o número do WhatsApp — mas o cartão "Cliente" mostra só o nome e "e-mail · N pedidos". O telefone só
aparece na revisão, três passos depois.

**Origem:** sessão CH-01 (e visto no CH-09) · ambiente local

#### Impacto

- **Nível:** Fricção
- **Persona mais atingida:** PER-01 Adri no WhatsApp — outras: nenhuma
- **Jornada e passo:** J-02, passo 1 (escolher a cliente)
- **Frequência:** sempre
- **Contorno:** seguir até a revisão para ver o telefone, ou conferir no painel
- **Gravidade proposta na sessão:** low — subiu para medium: com duas clientes de nome parecido ela pode montar
  para a pessoa errada e só descobrir no fim

#### Ambiente

- **URL:** `http://localhost:8084/pedidos/montar` (passo 1)
- **Tela:** Montar pedido · Passo 1 Cliente · **Componente:** cartão "Cliente" da cliente escolhida
- **Branch / build:** `feature/94` @ `09b5b575`
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 844
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Entre no app do ateliê com a conta de administração, em `/pedidos`, e toque em "Montar pedido"
2. Em "Cliente cadastrada", busque "marta" e escolha "Marta Lúcia QA Oitenta e Nove" (cliente com telefone)
3. Olhe o cartão "Cliente"

#### Esperado

Cartão "Cliente" com "Trocar": nome, "N pedidos na loja", e-mail e telefone (ou "sem telefone").

**Fonte:** spec › Design › Passo 1 ("Cadastrada, escolhida: cartão 'Cliente' com 'Trocar' (nome, 'N pedidos na
loja', e-mail, telefone ou 'sem telefone')"); TC-FUNC-006 passo 4

#### Observado

Nome e "marta.qa89@exemplo.invalid · 3 pedidos", sem telefone. A mesma cliente aparece com "(51) 98888-7777" na
revisão.

#### Evidência

- `screenshots/CH-09-10-cadastrada-escolhida.png` — o cartão "Cliente" com só nome e "e-mail · 0 pedidos" (outra cliente, mesma forma)

#### Ocorrências

| Sessão | Persona | Passo | Evidência |
| ------ | ------- | ----- | --------- |
| CH-01  | PER-01  | 05 (Marta) | — |
| CH-09  | PER-01  | 10 (Juliana Prates Ch02) | `screenshots/CH-09-10-cadastrada-escolhida.png` |

#### Relacionados

- **TC:** TC-FUNC-006
- **Charter:** CH-01
- **Critério:** UC-03
- **Bugs:** BUG-017 (passo 1, estrutura do desenho)

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `apps/mobile-adm/src/features/order-proposal/ui/PassoDaCliente.tsx` (o cartão da escolhida) | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/api/portaDeLeitura.ts` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-006 · [Montagem · Passo 1] O cartão da cliente escolhida não mostra o telefone nem "N pedidos na loja" · medium
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA
- As leituras do app passam por `lerComPapel` (guarda `leituraSoComPapel`); o app não lê `orders` (D-02) — o número de pedidos vem do que a leitura de clientes já expõe.
- `semDadoSensivelDeClienteNoApp`: a exceção literal vale só para a montagem e o pedido montado.

### Testes

- o cartão da cliente escolhida mostra o telefone e o número de pedidos dela na loja — componente/página (vitest)

### Não faça

- mudar a busca, o convite de colar e o formulário de endereço (tarefa 21)
- mudar a tipografia do nome (tarefa 20)
- tocar arquivo fora da posse desta tarefa sem registrar no retorno; outras tarefas da mesma onda rodam ao mesmo tempo na mesma árvore

### Pronto quando

- [ ] BUG-006: o **Esperado** do bug acontece seguindo os **Passos** dele
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu, vermelho antes do fix
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções do repositório

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
