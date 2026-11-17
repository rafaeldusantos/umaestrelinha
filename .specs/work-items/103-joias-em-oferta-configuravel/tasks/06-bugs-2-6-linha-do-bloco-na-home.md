## 06 · [apps/backoffice] BUG-002, BUG-006 — Home do painel · linha do bloco "Joias em oferta"

**Status:** done

`CA-02.3, CA-02.4, CA-04.1 (lado da linha)` — WI 103 · correção da rodada 1 de QA

**Objetivo.** Na lista de `/admin/home`, a linha do bloco "Joias em oferta" que não aparece na loja deixa de dizer "No ar" e de entrar na conta "N no ar", e a conta "N das M saíram do ar" inclui a peça escolhida que foi apagada.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` › Feature-Sliced Design, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines · `apps/backoffice/CLAUDE.md` › Molde dos formulários, › `/admin/home` — a composição, › Gravar NÃO desmonta a tela (VIV-05), › O movimento do painel, › A ponte da prévia · `packages/core/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

### Critérios de aceite

### BUG-002 — [Home do painel] Linha do bloco Joias em oferta diz "No ar" quando ele não aparece na loja

#### Resumo

Adri abre a Home do painel para saber se o bloco "Joias em oferta" está na loja. A linha do bloco diz, no texto,
que ele não aparece na loja (sem campanha, campanha agendada, desligada ou encerrada) — e, na mesma linha, o
estado é "No ar", o mesmo das seções que aparecem, e o cabeçalho conta o bloco entre as seções "no ar". Ela
esperava que a linha inteira dissesse a mesma coisa; com o selo e o aviso se contradizendo, não sabe em qual
confiar.

**Origem:** sessão CH-01 · local (painel http://localhost:8083)

#### Impacto

- **Nível:** Dano à confiança
- **Persona mais atingida:** PER-01 Adri — outras: nenhuma
- **Jornada e passo:** J-01, passo 1 (ler a lista da Home); J-03, passos 2 e 5 (ler a linha do bloco preparado)
- **Frequência:** sempre (7 de 7, em quatro estados: sem campanha, agendada, desligada, encerrada)
- **Contorno:** ler o aviso abaixo do nome e ignorar o selo; conferir na loja
- **Gravidade proposta na sessão:** medium (CH-01) e high (CH-04) — high. O selo e a contagem dizem o oposto do
  aviso na mesma linha; a dona que bate o olho no selo acha que o bloco está na loja. Divergiu do medium do CH-01
  pela regra "na dúvida, o maior" e porque o CH-04 e o CH-06 mostraram que vale para todos os estados fora de
  vigência, não só para "sem campanha"

#### Ambiente

- **URL:** http://localhost:8083/admin/home
- **Tela:** Home do painel · **Componente:** linha do bloco "Joias em oferta" (selo de estado e interruptor) e
  cabeçalho "Seções da Home"
- **Branch / build:** feature/103 (worktree store__feature-103; build não exposto pela sessão)
- **Browser:** Chromium (agent-browser 0.39.1, headless) · **Viewport:** 1440 × 900
- **Rede:** local, sem limitação · **Idioma:** pt-BR

#### Passos

1. Como PER-01 Adri, conta `admin-loja`, entrar no painel e abrir Loja → Home (`/admin/home`)
2. Na bandeja, acrescentar um bloco "Joias em oferta"; no editor que abre, clicar em Cancelar
3. Na lista, ligar o bloco novo pelo interruptor da linha
4. Ler a linha do bloco e o cabeçalho "Seções da Home"

#### Esperado

A linha diz que o bloco não aparece na loja — mesmo com o interruptor ligado —, sem um estado que diga o
contrário; o bloco que não aparece não entra na conta das seções no ar.

**Fonte:** PRD CA-02.4 ("enquanto não houver campanha a linha do bloco diz que ele não aparece na loja e pede a
escolha (ligá-lo não o faz aparecer)") · CA-02.3 ("se ela não está em vigência, diz que o bloco não vai aparecer
e por quê") · TC-FUNC-001 passo 1 · TC-FUNC-009 passo 2 · TC-FUNC-012 passo 1

#### Observado

A linha diz "Joias em oferta · sem campanha" e "O bloco está sem campanha e não aparece na loja. Escolha uma
campanha." — e o estado da linha é **"No ar"**, com o interruptor ligado. O cabeçalho diz "16 seções · 10 no
ar", contando o bloco. O mesmo "No ar" aparece ao lado de "A campanha escolhida ainda não começou. O bloco
aparece na loja quando ela entrar em vigência." (agendada), de "A campanha escolhida está desligada, e o bloco
não aparece na loja enquanto ela não for ligada." (desligada) e de "A campanha escolhida já terminou, e o bloco
não aparece na loja. Escolha outra campanha." (encerrada). A loja, em todos esses momentos, não mostra o bloco.

#### Evidência

- `screenshots/CH-01-01-linha-sem-campanha.png` — B-1 sem campanha: "No ar" e o aviso juntos
- `screenshots/CH-04-02-b2-ligado-no-ar.png` — bloco novo sem campanha, ligado, "No ar"
- `screenshots/CH-04-07-linha-b2-natal-agendada.png` — bloco de "Natal" (agendada), "No ar"
- `screenshots/CH-06-02-linha-b1-desligada.png` — B-1 com "Dia das Mães" desligada, "No ar"
- `screenshots/CH-06-04-linha-b3-agendada.png` — B-3 com campanha agendada, "No ar"
- `screenshots/CH-06-14-linha-b3-encerrada.png` — B-3 com campanha encerrada, "No ar"

#### Ocorrências

| Sessão | Persona     | Passo                                             | Evidência                                          |
| ------ | ----------- | ------------------------------------------------- | -------------------------------------------------- |
| CH-01  | PER-01 Adri | 01 — B-1 sem campanha (estado da migration)       | `screenshots/CH-01-01-linha-sem-campanha.png`       |
| CH-04  | PER-01 Adri | 02 — B-2 sem campanha, ligado                     | `screenshots/CH-04-02-b2-ligado-no-ar.png`          |
| CH-04  | PER-01 Adri | 08 — B-2 com "Natal" agendada                     | `screenshots/CH-04-07-linha-b2-natal-agendada.png`  |
| CH-04  | PER-01 Adri | 20 — B-3 sem campanha depois de apagar a campanha | —                                                  |
| CH-06  | PER-01 Adri | 04 — B-1 com a campanha desligada                 | `screenshots/CH-06-02-linha-b1-desligada.png`       |
| CH-06  | PER-01 Adri | 08 — B-3 com campanha agendada                    | `screenshots/CH-06-04-linha-b3-agendada.png`        |
| CH-06  | PER-01 Adri | 19 — B-3 com campanha encerrada                   | `screenshots/CH-06-14-linha-b3-encerrada.png`       |

#### Relacionados

- **TC:** nenhum falhou por ele — TC-FUNC-001, TC-FUNC-009, TC-FUNC-012 e TC-FUNC-021 passaram no texto do aviso;
  o selo contraditório foi registrado nas notas desses casos
- **Charter:** CH-01 · CH-04 · CH-06
- **Critério:** CA-02.3 e CA-02.4 (quebra — a linha diz que o bloco aparece e que não aparece)
- **Protótipo:** nenhum
- **Bugs:** BUG-006 (mesma linha, contagem de peças)

### BUG-006 — [Home do painel] Peça escolhida apagada fica fora da contagem "N das M saíram do ar"

#### Resumo

Adri escolheu 7 peças para o bloco "Joias em oferta". Uma sai do ar (despublicada) e outra é apagada do catálogo.
Na Home do painel, a linha do bloco diz "1 das 6 saiu do ar", nomeando só a despublicada: a apagada não é contada
nem nomeada, e o total caiu de 7 para 6 sem explicação. Ela esperava "2 das 7", com as duas peças pelo nome; só
descobre a apagada ao abrir o editor.

**Origem:** sessão CH-05 · local (painel http://localhost:8083)

#### Impacto

- **Nível:** Fricção
- **Persona mais atingida:** PER-01 Adri — outras: nenhuma (a cliente não vê a peça apagada, certo)
- **Jornada e passo:** J-04, passo 4 (ler a linha do bloco)
- **Frequência:** sempre (2 de 2 — na linha e na mesma frase dentro do editor)
- **Contorno:** abrir o editor, que nomeia a apagada ("foi apagada do catálogo e saiu da lista")
- **Gravidade proposta na sessão:** low — subida para medium. A contagem que a dona lê está errada (M = 6 quando
  ela escolheu 7) e a peça apagada não é nomeada na lista, que é exatamente o que CA-04.1 pede ao painel; ela só
  fica sabendo abrindo o editor, um passo a mais e um número que não bate com o que ela montou

#### Ambiente

- **URL:** http://localhost:8083/admin/home
- **Tela:** Home do painel · **Componente:** linha do bloco "Joias em oferta" (aviso "N das M saíram do ar");
  a mesma frase aparece no editor do bloco, em Peças escolhidas
- **Branch / build:** feature/103 (worktree store__feature-103; build não exposto pela sessão)
- **Browser:** Chromium (agent-browser 0.39.1, headless) · **Viewport:** 1440 × 900
- **Rede:** local, sem limitação · **Idioma:** pt-BR

#### Passos

1. Como PER-01 Adri, conta `admin-loja`, entrar no painel; ter o bloco "Joias em oferta" com a campanha "Dia das
   Mães" e 7 peças escolhidas salvas, entre elas duas peças descartáveis marcadas na campanha (A e B)
2. Em `/admin/produtos`, desativar a peça A (Ações → Desativar)
3. Abrir `/admin/home` e ler a linha do bloco: "1 das 7 saiu do ar", nomeando A
4. Em `/admin/produtos`, excluir a peça B (Ações → Excluir → confirmar)
5. Voltar a `/admin/home` e ler a linha do bloco

#### Esperado

A linha conta as duas peças que saíram — "2 das 7 saíram do ar" — e nomeia a despublicada e a apagada.

**Fonte:** PRD CA-04.1 ("Peça escolhida que saiu do ar (despublicada ou apagada) não aparece na loja e o painel
conta 'N das M saíram do ar', nomeando a peça") · TC-FUNC-016 passo 5

#### Observado

"1 das 6 saiu do ar: “Anel Afetivo Coração com Leite Materno em Aço Inoxidável”. A loja a pula enquanto ela não
voltar." — o total caiu de 7 para 6 e a apagada ("QA103 Peça descartável") não aparece. Ao abrir o editor, ele
diz "“QA103 Peça descartável” foi apagada do catálogo e saiu da lista." (certo), mas repete "1 das 6". A loja,
como visitante, pula as duas peças sem pôr outra no lugar (certo).

#### Evidência

- `screenshots/CH-05-07-editor-apagada-contagem.png` — o aviso da apagada ao lado da contagem "1 das 6"
- `screenshots/CH-05-06-loja-sem-fora-e-apag-390.png` — a loja sem as duas peças, sem substituta

#### Perspectiva da persona

Adri monta a curadoria peça a peça e volta à lista da Home para saber se está tudo no lugar. Um número que não
bate com o que ela escolheu, sem dizer qual peça sumiu, a obriga a abrir o bloco e comparar de memória.

**Risco de abandono:** baixo — o editor nomeia a apagada ao abrir.

#### Relacionados

- **TC:** TC-FUNC-016 (fail)
- **Charter:** CH-05
- **Critério:** CA-04.1 (quebra — a parte "conta e nomeia" para a peça apagada)
- **Protótipo:** nenhum
- **Bugs:** BUG-002 (mesma linha do bloco, selo "No ar")

### Contrato

| Item | Dono |
| ---- | ---- |
| `apps/backoffice/src/features/home-composition/ui/HomeSectionRow.tsx` — o selo de estado ("No ar"/"Desligada") e o aviso da linha | ALTERA |
| `apps/backoffice/src/features/home-composition/ui/HomeSectionList.tsx` — a conta "N seções · N no ar" | ALTERA |
| `apps/backoffice/src/entities/campaign/api/campaignMarks.ts` › `useCampaignPiecesState` e `apps/backoffice/src/entities/campaign/model/campaignPieces.ts` — o estado das peças escolhidas e a frase "N das M saíram do ar" | ALTERA, se a causa do BUG-006 estiver aqui |
| `packages/core/src/home/campaignOffers.ts` › `campaignOffersShows`, `campaignOffersHiddenReason` — a regra de quando o bloco aparece | JÁ EXISTE. Consuma; não altere a regra (é a mesma que a loja usa) |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-002 · [Home do painel] Linha do bloco Joias em oferta diz "No ar" quando ele não aparece na loja · high
- **Bug**: BUG-006 · [Home do painel] Peça escolhida apagada fica fora da contagem "N das M saíram do ar" · medium
- **Lote**: mesma tela `/admin/home` e mesmo componente, a linha do bloco "Joias em oferta" (`HomeSectionRow.tsx`): o estado e os avisos da linha
- "Está no ar?" do bloco de campanha responde pela mesma regra que a loja usa (`campaignOffersShows` em `core`): sem campanha, campanha agendada, desligada ou encerrada ⇒ não está no ar. Não escreva uma segunda regra na tela (o "defeito 01")
- O interruptor continua dizendo se o bloco está ligado: o que muda é o selo e a conta "no ar", não a gravação de `active`
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA
- Sem causa raiz presumida: o bug diz o sintoma; o diagnóstico é de quem executa

### Testes

- (componente, jsdom) a linha do bloco ligado sem campanha, com campanha agendada, desligada e encerrada não diz "No ar" e não entra na conta "N no ar"; ligado com campanha em vigência, diz e entra
- (componente, jsdom) os outros tipos de bloco seguem dizendo "No ar" quando ligados (sem regressão)
- (unidade ou componente) com uma peça escolhida despublicada e outra apagada, a frase diz "2 das 7 saíram do ar" e nomeia as duas; na linha e no editor

### Obrigações

- Teste antes do código: o teste do comportamento do bug reprova antes do fix e passa depois, e o retorno diz isso
- Os guardas de fonte do repositório que leem os arquivos tocados seguem passando (tabela *Os guardas* do `CLAUDE.md`); nenhum se conserta afrouxando a asserção
- Todo texto novo em português, com acentuação e no tom memorial (sem urgência nem exclamação)

### Não faça

- Não altere `HomeSectionEditor.tsx`, `FormPageHeader.tsx` nem o recibo "Salvo": são da fix task 05
- Não altere `useCampaignMarks` nem a conferência "Conferindo as peças marcadas…": são da fix task 08
- Não altere a regra de vigência em `packages/core` nem as views do banco

### Pronto quando

- [ ] BUG-002: nos quatro estados (sem campanha, agendada, desligada, encerrada) a linha não diz "No ar" e a conta "N no ar" não inclui o bloco
- [ ] BUG-006: a peça escolhida apagada entra na conta "N das M saíram do ar" e é nomeada, na linha e no editor
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
