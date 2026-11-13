## 14 · [apps/backoffice · packages/core] BUG-005 — [Nova campanha] Sem nenhum percentual, a tela diz “10% já está na campanha.” e não o motivo

**Status:** done

`BUG-005` — 102 · fix task da QA, rodada 1 (`qa/qa-result.md`, lote L5)

**Objetivo.** Na nova campanha, sem nenhum percentual, a tela diz por que não salva ("Acrescente ao menos um percentual.") e não afirma um percentual que não existe.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · Feature-Sliced Design / Alias de import; `apps/backoffice/CLAUDE.md`; `packages/core/CLAUDE.md` › campaigns. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** nada desta rodada; as tarefas 01–09 (`done`) deixaram a campanha no ar.

**Onde mora.** Painel · Nova campanha · seção Percentuais (`apps/backoffice/src/features/campaign-form/ui/PercentsCard.tsx`, página `apps/backoffice/src/pages/admin/AdminCampaignFormPage.tsx`); as frases de recusa são de `packages/core/src/campaigns/refusals.ts`. Localização feita só para saber onde o bug mora — a causa é do diagnóstico de quem executa.

### Critérios de aceite

### BUG-005 — [Nova campanha] Sem nenhum percentual, a tela diz “10% já está na campanha.” e não o motivo

#### Resumo

A dona cadastra uma campanha, acrescenta 10 %, tenta acrescentar 10 % de novo (a tela recusa, certo) e depois tira o
10 %. A campanha fica sem percentual: a tela diz "Nenhum percentual ainda." e, logo abaixo, continua dizendo "10% já
está na campanha." — que já não está. O motivo de o Salvar estar desligado ("Acrescente ao menos um percentual.") não
aparece; o rodapé diz só "Corrija o que está marcado para salvar.". Ela tem de adivinhar o que corrigir.

**Origem:** sessão CH-02 · painel local do worktree `store__feature-102`

#### Impacto

- **Nível:** Fricção
- **Persona mais atingida:** PER-01 Adri — outras: nenhuma
- **Jornada e passo:** J-02, passo 1 (cadastrar a campanha); vale também para J-01, passo 2
- **Frequência:** sempre — o estado persistiu em três leituras seguidas da mesma tela (passos 05 a 09 do log)
- **Contorno:** acrescentar um percentual faz o Salvar voltar
- **Gravidade proposta na sessão:** medium — mantida. O achado veio como `intermitente (1 de 1)` por falta de uma
  segunda tentativa, mas a screenshot mostra as duas frases contraditórias na mesma tela, sem ambiguidade

#### Ambiente

- **URL:** `http://localhost:8093/admin/campanhas/nova`
- **Tela:** Painel · Nova campanha · **Componente:** seção Percentuais
- **Branch / build:** `feature/102`, HEAD `a1c6ea53`, Vite de dev do worktree
- **Browser:** Chromium headless (agent-browser 0.39.1) · **Viewport:** 1440 × 900
- **Rede:** local, sem limitação · **Idioma:** pt-BR

#### Passos

1. Como `admin-loja`, abrir `http://localhost:8093/admin/campanhas/nova`
2. Em "Novo percentual", digitar 10 e tocar em "Adicionar"
3. Digitar 10 de novo e tocar em "Adicionar" — aparece "10% já está na campanha." (certo)
4. Tocar em "Tirar 10%"

#### Esperado

"Nenhum percentual ainda." e o motivo "Acrescente ao menos um percentual."; Salvar desligado; a recusa do percentual
repetido some junto com o percentual.

**Fonte:** PRD CA-02 (nenhum percentual é recusado "com o motivo"); `spec.md` › Painel · Campanha · nova/editar
(Salvar desligado com nenhum percentual); TC-FUNC-002 passo 4

#### Observado

"Nenhum percentual ainda." e, abaixo do campo, ainda "10% já está na campanha."; o motivo "Acrescente ao menos um
percentual." não aparece; o rodapé mostra só "Corrija o que está marcado para salvar."; Salvar desligado.

#### Evidência

- `screenshots/CH-02-04-recusas-sem-percentual.png` — "Nenhum percentual ainda." junto de "10% já está na campanha."
  (na mesma tela, o selo de 15 caracteres e as cores sem contraste, das outras recusas da sessão)

#### Perspectiva da persona

A Adri cadastra a campanha sozinha, entre uma peça e outra no ateliê, e tem paciência zero para "salvou?" sem
resposta. Uma recusa que contradiz a tela a faz desconfiar do formulário no primeiro contato com Campanhas.

**Risco de abandono:** baixo — ela acaba acrescentando um percentual, que é o que a campanha precisa de qualquer jeito

#### Relacionados

- **TC:** TC-FUNC-002 (passo 4)
- **Charter:** CH-02
- **Critério:** CA-02
- **Protótipo:** —
- **Bugs:** nenhum

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-005 · [Nova campanha] Sem nenhum percentual, a tela diz “10% já está na campanha.” e não o motivo · medium
- **Fechamento**: a tarefa fecha com o fix do bug; o bug segue `open` até o reteste do QA
- TC-FUNC-002 passo 4 e `spec.md` (recusas do cadastro): sem nenhum percentual, o motivo literal é "Acrescente ao menos um percentual."; "10% já está na campanha." só vale quando o 10 % está mesmo na lista. A prévia do selo mostrando "−10%" sem percentual é **conforme a fonte** (`spec.md` › Prévia: "sem percentual usa 10") e não muda nesta tarefa.

### Testes

Teste antes do código: cada caso abaixo reprova antes do conserto e passa depois.
- Teste da página/`PercentsCard`: tirar todos os percentuais ⇒ aparece "Acrescente ao menos um percentual." e não aparece "10% já está na campanha."; vermelho antes do conserto. Se o conserto passar por `core/campaigns/refusals.ts`, o teste de `refusals` ganha o caso, sem perder nenhum.

### Obrigações

- Rode, em cada workspace tocado, a suíte (`pnpm --filter @estrelinha/<w> test --testTimeout=20000`, sem o `--`, exit capturado fora de pipe), `npx tsc --noEmit -p <projeto>` e `npx eslint .` no app; compare com as baselines do `CLAUDE.md` (sem regressão). Mudança em `packages/core` roda também a suíte da loja e a do painel (os guardas de lá varrem os dois apps).
- Os guardas do repositório (`touchTarget`, `contrast`, `accentText`, os de dono único) continuam verdes sem afrouxar asserção.
- `packages/core/src/payment/**` só muda se o diagnóstico mostrar que a causa está lá; mudando, a suíte de `payment` não perde caso.

### Não faça

- Não altere dado do banco local para "consertar" a massa (pedidos, marcações, campanhas da QA): corrija a escrita.
- Não mexa no `status` nem no corpo de `qa/issues/BUG-005.md` — é da QA.
- Não amplie o escopo para as sugestões de backlog do `qa-result.md`.
- Não commite: o orquestrador commita.

### Pronto quando

- O teste novo reprovava antes e passa depois; a suíte, os tipos e o lint dos workspaces tocados sem regressão.
- O comportamento esperado do BUG-005 foi visto funcionando no app local (relate como conferiu).

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
