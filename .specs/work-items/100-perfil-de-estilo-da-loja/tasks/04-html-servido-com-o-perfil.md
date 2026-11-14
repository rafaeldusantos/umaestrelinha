## 04 · [packages/core, apps/store] O HTML servido já chega com o perfil

**Status:** done

`UC-01 · RN-04 · RN-05 · RN-07 · CA-02 · CA-06` — 100

**Objetivo.** toda resposta HTML da função `api/page` sai com `data-perfil` no `<html>` igual ao perfil salvo, e sem o atributo (e `no-store`) quando a leitura da configuração falha.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos · Alias de import · O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines; `apps/store/CLAUDE.md` › O HTML servido — `api/page` · A faixa de avisos; `packages/core/CLAUDE.md` › Pureza · Os módulos. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §5 · spec.md — Código (e §8 Decisões, R9, H6). É o rastreio da tarefa até a costura: quem executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Depende de.** 01 — `styleProfileOf`, `STYLE_PROFILE_ATTRIBUTE` e o tipo `StyleProfile` em `packages/core/src/appearance/`. Confira que existe antes de começar.
**Habilita.** a 05 lê o atributo da carga; a Validation prova CA-02 pelo `api/page.mjs` servido.

### Critérios de aceite

**UC-01 · Ligar o perfil Black Friday**
- Em **Configurações**, um card "Perfil de estilo da loja" com duas opções (Padrão, Black Friday), cada uma com uma
  amostra das cores, e "Salvar".
- Salvo, a próxima página que a cliente abrir já vem com o perfil (RN-04); quem já está com a loja aberta passa a ver o
  perfil novo em alguns minutos, ao trocar de página.
- O card diz o que muda ("só as cores; textos, blocos e preços continuam") e quanto tempo leva para todos verem.

- **RN-04 · Sem troca de cor diante da cliente.** A página chega já com o perfil em vigor. Se a página veio do cache com
  o perfil anterior, ela continua nele até a cliente trocar de página dentro da loja; a partir daí vale o perfil salvo.
  A cor nunca muda sozinha com a página parada.
- **RN-05 · O cache do HTML.** Páginas fixas ficam até 1 hora no cache de borda (`s-maxage=3600`), produto e
  categoria 5 minutos. Ligar ou desligar o perfil leva até 1 hora para chegar a todas as páginas no primeiro acesso,
  e o UC-01 diz isso (D-02).
- **RN-07 · Configuração com valor desconhecido ⇒ Padrão**, sem erro (molde de `featuredDisplay`).

- **CA-02** Com Black Friday salvo no painel, o primeiro HTML servido já traz o perfil: nenhuma pintura com a paleta
  Padrão antes (medido em navegador com rede lenta).
- **CA-06** Valor desconhecido gravado na configuração ⇒ a loja abre no Padrão.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `packages/core/src/page/head.ts › markStyleProfile` | VOCÊ CRIA (irmão de `markAnnouncementBar`, `:99-116`) | HTML, `StyleProfile \| null` | HTML com `data-perfil` substituído, nunca duplicado; `null` não escreve |
| `packages/core/src/page/serve.ts › PageSettings` (`:102-112`), o pós-processamento (`:220`, `:255-262 › marcarFaixa`) e `lerConfiguracoes` (`:401-414`) | JÁ EXISTE. Acrescente o perfil e marque toda resposta HTML | — | — |
| `apps/store/server/page.ts › readSettings` (`:203-219`) | JÁ EXISTE. `'appearance'` no `.in('key', …)` e o perfil pelo normalizador de `core` | — | — |

Só o que ESTA tarefa cria ou consome. `JÁ EXISTE` é afirmação a conferir no código.

### Decisões já tomadas

- R9 do `spec.md`: reusar o caminho da faixa; leitura que falha ⇒ sem atributo e `no-store`, como a faixa.
- H6: o servidor sempre escreve o atributo com o perfil normalizado (`padrao` ou `black-friday`); ausente só quando a leitura falhou.
- O cache por ramo (`PAGE_CACHE`) não muda (D-02).

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| marcação da tag `<html>` | `packages/core/src/page/head.ts:94-116 — ANNOUNCEMENT_BAR_ATTRIBUTE / markAnnouncementBar` |
| pós-processamento e leitura | `packages/core/src/page/serve.ts:251-262, :400-414` |
| leitura no servidor | `apps/store/server/page.ts:203-219 — readSettings` |

Abra o arquivo antes de escrever o seu.

### Testes

- Unidade (`head.test.ts`): `markStyleProfile` substitui o atributo existente, preserva `lang` e `data-faixa`, `null` não escreve, HTML sem `<html>` sai intacto.
- Unidade (`serve.test.ts`): produto, categoria, fixa, app, Home e 404 levam o perfil salvo; a configuração que falha tira os dois atributos e põe `no-store`; o 301 passa intacto; perfil desconhecido gravado sai `padrao`.
- Servidor (`server/__tests__/page.test.ts`): a leitura pede as quatro chaves numa consulta (lista por igualdade, `:284-303`), linha ausente ⇒ `padrao`, erro lança.

Escrever estes testes é parte da tarefa.

### Obrigações

- `core/page/**` é empacotado pelo esbuild fora do Vite: `.ts` explícito em todo especificador relativo.
- A lista do `.in` é comparada por igualdade em `page.test.ts`: reescreva com a chave nova, não afrouxe para `toContain`.
- Rode a suíte de `core` e a da loja, e `npx tsc --noEmit -p packages/core/tsconfig.json` e `-p apps/store/tsconfig.server.json`.

### Não faça

- Não mude o `Cache-Control` de nenhum ramo.
- Não toque em `packages/core/src/appearance/**` (tarefa 01) nem no aplicador da loja (tarefa 05).
- Não mude `theme-color` no shell.

### Pronto quando

- [ ] com `appearance = { profile: 'black-friday' }`, todo HTML servido traz `data-perfil="black-friday"` no `<html>`, provado por teste
- [ ] com a leitura falhando, o HTML sai sem o atributo e com `no-store`
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
