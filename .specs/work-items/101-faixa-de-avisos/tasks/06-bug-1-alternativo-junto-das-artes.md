## 06 · [packages/core, apps/backoffice] BUG-001 — [Aviso de imagem] Falta do texto alternativo só aparece depois das duas artes — a dona

**Status:** done

`UC-02 · UC-03` — 101

**Objetivo.** No painel, o aviso de imagem incompleto mostra de uma vez tudo o que falta — as artes que faltam e o
texto alternativo —, para a dona corrigir numa volta só.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `packages/core/CLAUDE.md` e `apps/backoffice/CLAUDE.md` (as
seções da faixa de avisos e do molde dos formulários); `CLAUDE.md › O "defeito 01": dois donos do mesmo dado` ·
`CLAUDE.md › Os guardas — o que trava o quê` · `CLAUDE.md › Baselines`. Divergindo desta tarefa sobre COMO fazer, o
arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** 05 fechada (ela consome `announcementBarExists`, que se apoia na recusa que esta tarefa pode mexer).

### Critérios de aceite

### BUG-001 — [Aviso de imagem] Falta do texto alternativo só aparece depois das duas artes — a dona


## Resumo

A Adri monta o aviso de imagem da Black Friday no painel. Ela envia a arte do computador e ainda não preencheu o
texto alternativo. O painel recusa o aviso, mas só pede a arte do celular. Ela envia a segunda arte, e só então o
painel diz que falta descrever a arte. Ela esperava ver as duas pendências juntas e corrigir tudo de uma vez.

**Origem:** sessão CH-01

## Impacto

- **Nível:** Fricção. A dona corrige uma pendência e só depois descobre a outra. Pela tabela de ajustes, Fricção numa
  jornada P0 do plano (J-01) sobe um degrau, e por isso a severidade é `high`
- **Persona mais atingida:** PER-01 Adri. Outras: nenhuma
- **Jornada e passo:** J-01 (montar a faixa da Black Friday), passo 4 (subir a arte)
- **Frequência:** sempre que a dona envia uma arte só com o texto alternativo vazio. Foi observado uma vez, sem
  segunda tentativa a partir de um estado limpo. O passo seguinte do log mostra o mesmo comportamento: o motivo do
  texto alternativo só aparece depois da segunda arte
- **Contorno:** preencher o texto alternativo antes de enviar as artes. Como o Salvar fica desabilitado, nada de
  errado chega a ser gravado
- **Gravidade proposta na sessão:** medium. A sessão partiu de Cosmético e subiu um degrau pela jornada P0. Divergi
  porque o guia só sobe Cosmético em superfície de primeira impressão, e esta não é. O nível certo é Fricção: a
  correção em duas voltas é o mesmo tipo de esforço que "validação só no envio". Fricção numa jornada P0 sobe para
  `high`

## Ambiente

- **URL:** http://localhost:8083/admin/faixa-de-avisos
- **Tela:** painel › Faixa de avisos · **Componente:** aviso de imagem (o aviso aberto na lista, com "Enviar
  arte · 1440 × 48", "Enviar arte · 780 × 96" e "Texto alternativo")
- **Branch / build:** `feature/101` (último commit da fila `fe757bc5`), em dev local. O build não é exposto
- **Browser:** Chromium headless (agent-browser 0.39.1) · **Viewport:** 1440 × 900
- **Rede:** local, sem limite · **Idioma:** pt-BR

## Passos

1. Como PER-01 Adri, na conta `admin-loja`, entrar no painel e abrir **LOJA › Faixa de avisos**
2. Clicar em "+ Adicionar aviso" e trocar "Tipo do aviso" para **Imagem**
3. Em "Enviar arte · 1440 × 48", enviar uma arte de 1440 × 48. Não enviar a arte do celular e deixar "Texto
   alternativo" vazio
4. Ler as recusas do aviso
5. Em "Enviar arte · 780 × 96", enviar a arte do celular e deixar o texto alternativo ainda vazio (ou só com espaços)

## Esperado

No passo 4, o aviso é recusado com os dois motivos ao mesmo tempo: falta a arte do celular, e "Descreva a arte: é o
que o leitor de tela e o Google leem.". A barra mostra "Corrija o que está marcado para salvar." e o Salvar fica
desabilitado.

**Fonte:** TC-FUNC-002, passo 2. Spec H-19 ("Imagem: as duas artes e o texto alternativo obrigatórios"). PRD UC-02 e
UC-03

## Observado

No passo 4 aparece um alerta só: "Nº aviso: envie a arte do celular." (na sessão, "4º aviso: envie a arte do
celular."), mais "Corrija o que está marcado para salvar.", com o Salvar desabilitado. O motivo do texto alternativo
não aparece. Ele só surge no passo 5, depois de a segunda arte ser enviada: "4º aviso: Descreva a arte: é o que o
leitor de tela e o Google leem.".

## Evidência

- `screenshots/CH-01-08-imagem-sem-celular.png`: a arte do computador já enviada (a miniatura aparece), o texto
  alternativo vazio e um motivo só na tela

## Perspectiva da persona

A Adri é usuária ocasional do painel e monta a campanha de uma vez, entre uma peça e outra, com até 120 s de
paciência por tarefa. Cada volta de "corrigi, e agora aparece outra coisa" tira a confiança de que o painel diz tudo
o que falta. Ela fica sem saber se a próxima correção vai ser a última. Como os campos estão todos à vista, ela acaba
concluindo.

**Risco de abandono:** baixo. O Salvar desabilitado e o motivo seguinte acabam guiando a dona até o fim, só que em
duas voltas em vez de uma.

## Relacionados

- **TC:** TC-FUNC-002
- **Charter:** CH-01
- **Critério:** UC-02, UC-03 (prd). Spec H-19
- **Protótipo:** não conferido (CH-06 não rodou)
- **Bugs:** nenhum

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `packages/core/src/announcements/refusals.ts › announcementRefusal` | JÁ EXISTE. Hoje devolve UM motivo por aviso (o primeiro que falha: arte do computador, arte do celular, alternativo, nessa ordem) | o item, o índice | `string \| null` |
| `announcementsRefusal` e `announcementBarExists` (mesmo arquivo) | JÁ EXISTE. Consumidos pela loja (`apps/store/src/widgets/announcement-bar/model/useAnnouncementBar.ts`), pela função (`packages/core/src/page/serve.ts`, `apps/store/server/page.ts`) e pela normalização (`normalize.ts`). O veredito deles — o aviso é válido ou não — **não pode mudar** | | |
| `apps/backoffice/src/features/announcement-bar/` (`ui/AnnouncementFields.tsx`, `model/rascunho.ts`) e `apps/backoffice/src/pages/admin/AdminAnnouncementsPage.tsx` | JÁ EXISTE. Onde a recusa vira texto na tela | | |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-001 · [Aviso de imagem] Falta do texto alternativo só aparece depois das duas artes — a dona · high
- **Fechamento**: a tarefa fecha com o fix do bug; ele segue `open` até o reteste do QA
- **A regra** (spec H-19, verbatim): "Imagem: as duas artes e o texto alternativo obrigatórios; destino opcional."
- **Os textos dos motivos não mudam** — "envie a arte do computador.", "envie a arte do celular.", "Descreva a arte: é
  o que o leitor de tela e o Google leem." (com o ordinal "Nº aviso:" como hoje); o que muda é que os motivos que valem
  aparecem juntos.
- **Um dono só** (defeito 01): a regra de quais motivos valem fica em `core`; o painel não recalcula "falta a arte"
  por conta própria. Se a forma de devolver vários motivos exigir função nova em `core`, a que existe continua
  devolvendo o mesmo veredito para os outros consumidores (válido ⇔ `null`), e a mudança é aditiva.
- O aviso de **texto** fica como está (fora do bug).

### Testes

- Em `core`: aviso de imagem com só a arte do computador e o alternativo vazio ⇒ os dois motivos (arte do celular e
  alternativo); com as duas artes e o alternativo só com espaços ⇒ o motivo do alternativo; completo ⇒ nenhum. O
  veredito válido/inválido de `announcementBarExists` e `announcementsRefusal` não muda (casos existentes intocados).
- No painel, pela página real (`AdminAnnouncementsPage`): depois de enviar só a arte do computador, a tela mostra o
  motivo da arte do celular **e** o do alternativo ao mesmo tempo, e o Salvar fica desabilitado.
- O teste novo reprova antes do conserto (vermelho primeiro).

### Não faça

- Não mexa no widget da loja (`apps/store/src/widgets/announcement-bar/**`, é da 05) nem na função `api/page`.
- Não mude os textos das recusas nem a regra de validade do aviso de texto.
- Não adicione `maxLength` nem trave o upload (I-05: o contador e a recusa aparecem ao passar do teto).

### Pronto quando

- [ ] com só a arte do computador e o alternativo vazio, o painel mostra os dois motivos juntos e o Salvar desabilitado
- [ ] o veredito de validade do aviso para a loja e a função continua o mesmo
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
