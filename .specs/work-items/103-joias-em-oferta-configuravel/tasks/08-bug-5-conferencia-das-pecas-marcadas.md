## 08 · [apps/backoffice] BUG-005 — editor do bloco "Joias em oferta" · Peças escolhidas (conferência)

**Status:** done

`CA-04.3` — WI 103 · correção da rodada 1 de QA

**Objetivo.** Quando o editor do bloco não consegue ler as peças marcadas na campanha, ele deixa de ficar em "Conferindo…" e diz que não conseguiu conferir, sem tirar peça nenhuma.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` › Feature-Sliced Design, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines · `apps/backoffice/CLAUDE.md` › Molde dos formulários, › `/admin/home` — a composição, › Gravar NÃO desmonta a tela (VIV-05), › O movimento do painel, › A ponte da prévia. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

### Critérios de aceite

### BUG-005 — [Editor do bloco] Falha ao ler as peças da campanha deixa "Conferindo…" sem fim, sem aviso

#### Resumo

Adri abre o editor do bloco "Joias em oferta" num momento em que o painel não consegue ler as peças marcadas na
campanha. A lista das peças escolhidas fica intacta — certo —, mas abaixo dela o editor mostra "Conferindo as
peças marcadas na campanha…" para sempre: nunca diz que não conseguiu conferir, nem oferece tentar de novo. Ela
esperava saber que a conferência falhou; sem isso, fica esperando, ou salva achando que as peças foram
conferidas.

**Origem:** sessão CH-05 · local (painel http://localhost:8083)

#### Impacto

- **Nível:** Fricção
- **Persona mais atingida:** PER-01 Adri — outras: nenhuma
- **Jornada e passo:** J-04, ramo J-04a (abrir o editor)
- **Frequência:** sempre que a leitura das marcações falha (2 de 2); a falha em si é rara
- **Contorno:** recarregar o editor quando a leitura voltar
- **Gravidade proposta na sessão:** medium — mantida. Nada se perde (nenhuma peça sai, o editor não abre
  alterado) e o que a tela mostra não é falso, só incompleto; J-04 é P1 no plano, sem subida

#### Ambiente

- **URL:** http://localhost:8083/admin/home/<id do bloco>
- **Tela:** editor do bloco "Joias em oferta" · **Componente:** Peças escolhidas (conferência das peças marcadas
  na campanha)
- **Branch / build:** feature/103 (worktree store__feature-103; build não exposto pela sessão)
- **Browser:** Chromium (agent-browser 0.39.1, headless) · **Viewport:** 1440 × 900
- **Rede:** local; leitura de `**/rest/v1/product_campaigns*` abortada no browser · **Idioma:** pt-BR

#### Passos

1. Como PER-01 Adri, conta `admin-loja`, entrar no painel; ter o bloco "Joias em oferta" com a campanha "Dia das
   Mães" e peças escolhidas salvas
2. Fazer as leituras de peças marcadas na campanha falharem (no browser, abortar as requisições
   `**/rest/v1/product_campaigns*`)
3. Abrir o editor do bloco em `/admin/home/<id do bloco>` e esperar mais de 25 s

#### Esperado

Nenhuma peça sai da lista, o editor não abre alterado, e o editor diz que não conseguiu conferir a campanha.

**Fonte:** PRD CA-04.3 ("Se essa leitura falhar, nenhuma peça sai e o editor diz que não conseguiu conferir a
campanha") · spec.md D-08 (erro tipado que nunca vira "nenhuma") · TC-FUNC-017 passo 1

#### Observado

A lista fica intacta ("6 de 12") e o cabeçalho sem "Alterações não salvas" — certo. Abaixo das peças, "Conferindo
as peças marcadas na campanha…" fica na tela indefinidamente (mais de 50 s na primeira vez, 25 s na segunda), sem
mensagem de falha nem forma de tentar de novo. Console sem erro; a rede mostra `HEAD /rest/v1/product_campaigns`
abortada e repetida. Sem o bloqueio, o editor carrega com "18 na campanha" e nada alterado.

#### Evidência

- `screenshots/CH-05-08-editor-sem-leitura-campanha.png` — o editor parado em "Conferindo…" com as 6 peças

#### Perspectiva da persona

Adri usa o painel todo dia e tem "zero paciência para 'salvou?' sem resposta"; um "Conferindo…" que nunca termina
é a mesma falta de resposta, no momento em que ela abre o bloco para mexer nas peças. Ela não sabe se espera,
recarrega ou segue.

**Risco de abandono:** baixo — ela recarrega e, com a leitura de volta, o editor funciona; nada foi perdido.

#### Relacionados

- **TC:** TC-FUNC-017 (fail)
- **Charter:** CH-05
- **Critério:** CA-04.3 (quebra — a parte "o editor diz que não conseguiu conferir")
- **Protótipo:** nenhum
- **Bugs:** nenhum

### Contrato

| Item | Dono |
| ---- | ---- |
| `apps/backoffice/src/entities/campaign/api/campaignMarks.ts` › `useCampaignMarks` — a leitura das marcações e o estado de falha | ALTERA, se a causa estiver aqui |
| `apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.tsx` — o aviso "Conferindo as peças marcadas na campanha…" e o de falha | ALTERA |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-005 · [Editor do bloco] Falha ao ler as peças da campanha deixa "Conferindo…" sem fim, sem aviso · medium
- **Lote**: sozinho
- O que já está certo continua: na falha, nenhuma peça sai da lista e o editor não abre como alterado (CA-04.3)
- **Depende de.** fix tasks 05 (mesmo `CampaignOffersEditor.tsx`) e 06 (mesmo `campaignMarks.ts`): rode depois delas, sobre o que elas deixaram
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA
- Sem causa raiz presumida: o bug diz o sintoma; o diagnóstico é de quem executa

### Testes

- (componente, jsdom) com a leitura das marcações falhando (erro ou rede abortada no client dublado), o editor sai de "Conferindo…" e mostra o aviso de que não conseguiu conferir; nenhuma peça sai e o editor não fica alterado
- (componente, jsdom) com a leitura certa, o comportamento de hoje segue (as tiradas da campanha saem ao abrir)

### Obrigações

- Teste antes do código: o teste do comportamento do bug reprova antes do fix e passa depois, e o retorno diz isso
- Os guardas de fonte do repositório que leem os arquivos tocados seguem passando (tabela *Os guardas* do `CLAUDE.md`); nenhum se conserta afrouxando a asserção
- Todo texto novo em português, com acentuação e no tom memorial (sem urgência nem exclamação)

### Não faça

- Não altere o recibo "Salvo" nem a barra do topo (fix task 05) nem a linha da lista (fix task 06)
- Não tire peça da lista quando a leitura falha

### Pronto quando

- [ ] BUG-005: com a leitura das marcações falhando, o editor diz que não conseguiu conferir em vez de ficar em "Conferindo…", e nenhuma peça sai
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório
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
