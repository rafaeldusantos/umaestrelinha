## 21 · [apps/mobile-adm] BUG-017 — [Montagem · Passo 1] Resultados da busca, convite de colar e formulário de endereço com outra estrutura

**Status:** done

`BUG-017` — 94

**Objetivo.** Os resultados da busca, o convite de colar e o formulário de endereço seguem a estrutura do protótipo.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines; `apps/mobile-adm/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** 15 (`PassoDaCliente.tsx`). Confira que existe antes de começar.

### Critérios de aceite

### BUG-017 — [Montagem · Passo 1] Resultados da busca, convite de colar e formulário de endereço com outra estrutura

#### Resumo

No passo Cliente, a lista de clientes aparece solta (sem cartão), o convite "Tem os dados numa mensagem?" tem
título maior e ícone noutra cor, o e-mail não tem o exemplo "nome@email.com", e os campos do endereço da cliente
nova aparecem aninhados entre as duas opções de entrega, sem o título "Endereço de entrega".

**Origem:** sessão CH-09 · ambiente local

#### Impacto

- **Nível:** Cosmético
- **Persona mais atingida:** PER-01 Adri no WhatsApp — outras: nenhuma
- **Jornada e passo:** J-01/J-02, passo 1 (cliente)
- **Frequência:** sempre
- **Contorno:** nenhum necessário
- **Gravidade proposta na sessão:** low — mantida

#### Ambiente

- **URL:** `http://localhost:8084/pedidos/montar` (passo 1)
- **Tela:** Montar pedido · Passo 1 Cliente · **Componente:** resultados da busca de cliente, convite "Colar texto",
  campo E-mail, formulário de endereço
- **Branch / build:** `feature/94` @ `09b5b575`
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 844
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Entre no app do ateliê com a conta de administração, em `/pedidos`, e toque em "Montar pedido"
2. Em "Cliente cadastrada", busque "zzqxyw" e depois um nome que existe; olhe a lista
3. Toque em "Cliente nova"; olhe o convite, o campo E-mail e o endereço em "Informar o endereço agora"

#### Esperado

Ver a tabela abaixo.

**Fonte:** protótipo `Montar Pedido.dc.html`, Passo 1; spec › Design › Passo 1 (formulário de endereço com
"Endereço de entrega")

#### Observado

Ver a tabela abaixo.

#### Evidência

- `screenshots/CH-09-05-passo1-sem-resultado.png` — a busca de cliente
- `screenshots/CH-09-06-passo1-nova.png` — o convite, o e-mail e o endereço da cliente nova

#### Design × implementado

| Propriedade | Protótipo | Observado | Confere |
| ----------- | --------- | --------- | ------- |
| Contêiner dos resultados | cartão surface, borda, raio 20 | lista solta | não |
| Inicial do resultado | 44 px | 40 px | não |
| Título do convite | 15 px 500 | Libre Baskerville 18 px 700 | não |
| Ícone do convite | accent | on-primary | não |
| Padding do convite | 18 px | 16 px | não |
| Placeholder do E-mail | "nome@email.com" | vazio | não |
| Endereço da cliente nova | bloco próprio "Endereço de entrega" depois do cartão Entrega | aninhado entre as opções, sem título | não |

#### Relacionados

- **TC:** TC-UI-001
- **Charter:** CH-09
- **Critério:** UC-03, UC-04
- **Protótipo:** Claude Design `a780eec8-…` › `Montar Pedido.dc.html`, Passo 1
- **Bugs:** BUG-006 (o cartão da cliente escolhida, no mesmo passo)

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `apps/mobile-adm/src/features/order-proposal/ui/PassoDaCliente.tsx` (busca e convite) | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/ui/FormularioDeEndereco.tsx` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-017 · [Montagem · Passo 1] Resultados da busca, convite de colar e formulário de endereço com outra estrutura · low
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA
- A busca é por nome, e-mail ou telefone, sem CPF (gate do PRD).

### Testes

- a busca, o convite e o formulário de endereço na estrutura do protótipo — componente/página (vitest)

### Não faça

- mudar o cartão da cliente escolhida (tarefa 15)
- mudar o estado de erro do CEP (tarefa 19)
- tocar arquivo fora da posse desta tarefa sem registrar no retorno; outras tarefas da mesma onda rodam ao mesmo tempo na mesma árvore

### Pronto quando

- [ ] BUG-017: o **Esperado** do bug acontece seguindo os **Passos** dele
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
