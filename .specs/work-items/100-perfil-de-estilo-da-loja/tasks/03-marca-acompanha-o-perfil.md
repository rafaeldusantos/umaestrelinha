## 03 · [packages/ui, apps/store] A marca desenhada acompanha o perfil

**Status:** done

`RN-06` — 100

**Objetivo.** a assinatura e o símbolo desenhados na loja passam a usar o tom escuro do perfil em vigor, e o painel e o ateliê seguem no ardósia de sempre.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos · Alias de import · O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines; `apps/store/CLAUDE.md` › Ícones e marca; `packages/ui/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §5 · spec.md — Código (O que muda: `BrandSvg.tsx`). É o rastreio da tarefa até a costura: quem executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Habilita.** a 02 declara `--estrelinha-primary-strong` e `--estrelinha-accent` por perfil; esta tarefa só lê a variável com recuo.

### Critérios de aceite

- **RN-06 · `theme-color`, favicon e imagem de compartilhamento não mudam:** são marca, não campanha. A marca desenhada
  nas páginas da loja (rodapé, menu do celular, cabeçalho do checkout, Home) acompanha o perfil, no tom escuro do perfil.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `packages/ui/src/brand/BrandSvg.tsx:17-25 › STROKE` | JÁ EXISTE. `brand` passa a `var(--estrelinha-primary-strong, #283A4A)` e `accent` a `var(--estrelinha-accent, #B8945F)` | — | — |
| `apps/store/src/shared/ui/brand/__tests__/brand.test.tsx:59-66` | JÁ EXISTE. Reescreva a asserção do `stroke` para a nova forma, com vizinha | — | — |

Só o que ESTA tarefa cria ou consome. `JÁ EXISTE` é afirmação a conferir no código.

### Decisões já tomadas

- O recuo hex dentro de `var()` é o que mantém o painel e o ateliê (que não declaram `--estrelinha-*`) iguais a hoje (CA-05).
- O tom claro (cabeçalho) não muda.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| SVG lendo `var(--estrelinha-*)` | `apps/store/src/widgets/material-guide/ui/GuideHeroArt.tsx:25-69` |

Abra o arquivo antes de escrever o seu.

### Testes

- Componente: o traço do tom `brand` é `var(--estrelinha-primary-strong, #283A4A)` e o de destaque é `var(--estrelinha-accent, #B8945F)`; o tom claro segue igual.
- Guarda: `paths.test.ts` (`apps/store/src/shared/ui/brand/__tests__`) continua verde.

Escrever estes testes é parte da tarefa.

### Obrigações

- Rode a suíte inteira da loja e `npx tsc --noEmit -p apps/store/tsconfig.app.json`, `-p apps/backoffice/tsconfig.app.json` e `-p apps/mobile-adm/tsconfig.app.json` (os três usam `BrandSvg`).

### Não faça

- Não toque em `packages/ui/src/tokens/**` nem no `App.css` (tarefa 02).
- Não mude favicon, `theme-color` nem a imagem de compartilhamento (RN-06).

### Pronto quando

- [ ] o `stroke` do tom `brand` lê a variável com recuo ardósia, provado por teste
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
