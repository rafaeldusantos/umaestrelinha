## 05 · [apps/store] A loja aplica o perfil sem troca de cor diante da cliente, e a prévia recebe o rascunho

**Status:** done

`UC-01 · UC-03 (lado da loja) · RN-04 · CA-02 · CA-07` — 100

**Objetivo.** a loja respeita o perfil do HTML na carga, passa ao perfil salvo depois da primeira troca de rota (ou quando o atributo falta), e dentro do iframe da prévia aplica o rascunho do painel.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos · Alias de import · O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines; `apps/store/CLAUDE.md` › O HTML servido — `api/page` · A faixa de avisos · Modo prévia · Quem pode enquadrar a loja. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §5 · spec.md — Código (e §8 Decisões, R2, R11, H6). É o rastreio da tarefa até a costura: quem executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Depende de.** 01 — `STYLE_PROFILE_ATTRIBUTE`, `styleProfileOf`, o hook do perfil salvo e o canal da prévia em `@estrelinha/core/appearance`. Confira que existe antes de começar.
**Habilita.** a 07 conversa com o recebedor por `postMessage` pelo canal de `core`.

### Critérios de aceite

**UC-01 · Ligar o perfil Black Friday**
- Em **Configurações**, um card "Perfil de estilo da loja" com duas opções (Padrão, Black Friday), cada uma com uma
  amostra das cores, e "Salvar".
- Salvo, a próxima página que a cliente abrir já vem com o perfil (RN-04); quem já está com a loja aberta passa a ver o
  perfil novo em alguns minutos, ao trocar de página.
- O card diz o que muda ("só as cores; textos, blocos e preços continuam") e quanto tempo leva para todos verem.

**UC-03 · Conferir antes de ligar**
- Ao lado da chave, "Ver a loja com este perfil" abre a loja num iframe (a prévia de `/admin/home`) com o perfil
  escolhido e ainda não salvo.

- **RN-04 · Sem troca de cor diante da cliente.** A página chega já com o perfil em vigor. Se a página veio do cache com
  o perfil anterior, ela continua nele até a cliente trocar de página dentro da loja; a partir daí vale o perfil salvo.
  A cor nunca muda sozinha com a página parada.

- **CA-02** Com Black Friday salvo no painel, o primeiro HTML servido já traz o perfil: nenhuma pintura com a paleta
  Padrão antes (medido em navegador com rede lenta).
- **CA-07** "Ver a loja com este perfil" mostra o perfil escolhido sem salvar; fechar sem salvar não muda a loja.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| o utilitário "já houve troca de rota desde a carga" em `apps/store/src/shared/lib/` | VOCÊ CRIA (extraído de `useAnnouncementBar.ts:45-49, :75-80 › CHAVE_DA_CARGA / navegou`) | `location` | booleano |
| `widgets/announcement-bar/model/useAnnouncementBar.ts` | JÁ EXISTE. Passa a chamar o utilitário; comportamento idêntico | — | — |
| o aplicador do perfil em `apps/store/src/app/` (montado em `App.tsx` dentro do `BrowserRouter`) | VOCÊ CRIA | atributo da carga, perfil salvo, rascunho da prévia | `document.documentElement` com `data-perfil` |
| o recebedor do canal na loja | VOCÊ CRIA (molde `useAnnouncementPreview.ts`) | mensagens do `window.parent` | o perfil do rascunho |
| `RuntimeSettingsLoader.tsx` | JÁ EXISTE. Consuma; não altere (fica fora do `BrowserRouter`) | — | — |

Só o que ESTA tarefa cria ou consome. `JÁ EXISTE` é afirmação a conferir no código.

### Decisões já tomadas

- R2: na carga vale o atributo escrito pelo servidor; a configuração decide depois da primeira troca de rota, ou quando o atributo está ausente (dev, prévia, leitura que falhou). Voltar à entrada da carga não devolve a decisão ao atributo.
- R11: o rascunho do painel vale só em `isPreviewWindow` (`?preview=1` dentro de iframe), só vindo de `window.parent`, e o `ready` sai com a origem do `document.referrer`, nunca `'*'`.
- Use `STYLE_PROFILE_ATTRIBUTE` também nos testes (o guarda de dono único da 02 recusa o literal em produção).
- Escrever `data-perfil="padrao"` e removê-lo são equivalentes para o CSS; escolha uma forma e registre.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| regra de carga | `apps/store/src/widgets/announcement-bar/model/useAnnouncementBar.ts` |
| recebedor da prévia | `apps/store/src/widgets/announcement-bar/model/useAnnouncementPreview.ts` |

Abra o arquivo antes de escrever o seu.

### Testes

- Componente: na carga, o perfil do atributo vale e a configuração diferente não o troca enquanto não houver troca de rota.
- Componente: depois da primeira troca de rota vale a configuração; voltar à rota da carga não devolve a decisão ao atributo.
- Componente: sem atributo, decide a configuração; configuração desconhecida ⇒ `padrao`.
- Componente: em prévia dentro de iframe, a mensagem `draft` do pai aplica o perfil; com `?preview=1` fora de iframe, ou mensagem de outra janela, nada muda.
- Componente: a faixa de avisos decide igual depois da extração (a suíte dela intocada).

Escrever estes testes é parte da tarefa.

### Obrigações

- Rode a suíte inteira da loja e `npx tsc --noEmit -p apps/store/tsconfig.app.json`.
- `eslint` da loja sem erro novo (`npx eslint .` em `apps/store`, baseline 2/2).

### Não faça

- Não toque em `App.css`, `tailwind.config.ts` nem nos tokens (tarefa 02), em `core/page/**` e `server/**` (tarefa 04), em `apps/backoffice/**` (tarefa 07).
- Não aceite o perfil por parâmetro de URL fora da prévia.

### Pronto quando

- [ ] com o atributo `black-friday` na carga e a configuração `padrao`, a página não troca de cor até a primeira troca de rota (teste)
- [ ] em prévia, o rascunho aplica o perfil e fora da prévia não (teste)
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório (`CLAUDE.md` › Comandos e `.specs/project/PROJECT.md` › Comandos de verificação): o `tsc` de cada projeto tocado sem erro novo contra a baseline e a suíte do workspace tocado

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
