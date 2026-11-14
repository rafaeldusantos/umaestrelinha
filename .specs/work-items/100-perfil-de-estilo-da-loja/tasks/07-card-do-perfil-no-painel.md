## 07 · [apps/backoffice, apps/store] Configurações › Dados da loja › card "Perfil de estilo da loja" com a prévia

**Status:** done

`UC-01 · UC-02 · UC-03 · RN-05 · CA-03 · CA-05 · CA-07` — 100

**Objetivo.** a dona escolhe entre Padrão e Black Friday em Configurações → Dados da loja, confere a loja no perfil escolhido sem salvar e salva.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos · Alias de import · O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines; `apps/backoffice/CLAUDE.md` › Molde dos formulários · `/admin/home` · O movimento do painel · A ponte da prévia · Configurações · `/admin/faixa-de-avisos`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Design (e §5 Código, §8 Decisões, H7..H11, R11, R12). É o rastreio da tarefa até a costura: quem executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Depende de.** 01 — o hook do perfil salvo, a cópia do card e o canal da prévia em `@estrelinha/core/appearance`; 02 — `ESTRELINHA_PROFILES` em `packages/ui/src/tokens/estrelinha.ts` para as amostras (forma: `ESTRELINHA_PROFILES[perfil][token]` dá o hex, ex. `ESTRELINHA_PROFILES['black-friday']['primary-strong']`; import por `@estrelinha/ui/tokens/estrelinha`). Confira que existe antes de começar.

### Critérios de aceite

**UC-01 · Ligar o perfil Black Friday**
- Em **Configurações**, um card "Perfil de estilo da loja" com duas opções (Padrão, Black Friday), cada uma com uma
  amostra das cores, e "Salvar".
- Salvo, a próxima página que a cliente abrir já vem com o perfil (RN-04); quem já está com a loja aberta passa a ver o
  perfil novo em alguns minutos, ao trocar de página.
- O card diz o que muda ("só as cores; textos, blocos e preços continuam") e quanto tempo leva para todos verem.

**UC-02 · Voltar ao Padrão**
- A mesma chave. Nenhum dado se perde: o perfil não apaga nem regrava conteúdo.

**UC-03 · Conferir antes de ligar**
- Ao lado da chave, "Ver a loja com este perfil" abre a loja num iframe (a prévia de `/admin/home`) com o perfil
  escolhido e ainda não salvo.

- **RN-05 · O cache do HTML.** Páginas fixas ficam até 1 hora no cache de borda (`s-maxage=3600`), produto e
  categoria 5 minutos. Ligar ou desligar o perfil leva até 1 hora para chegar a todas as páginas no primeiro acesso,
  e o UC-01 diz isso (D-02).

- **CA-03** Voltar ao Padrão no painel devolve a paleta de hoje, sem perder nenhum conteúdo.
- **CA-05** O painel e o app do ateliê não mudam de cor com o perfil ligado.
- **CA-07** "Ver a loja com este perfil" mostra o perfil escolhido sem salvar; fechar sem salvar não muda a loja.

### Design — o que a tela faz

- Card com h2 **"Perfil de estilo da loja"** e o texto: "Muda só as cores da loja. Textos, blocos da Home, preços e menu continuam iguais, e voltar ao Padrão é a mesma escolha."
- Grupo de opções (radiogroup, rótulo acessível "Perfil de estilo"), duas opções lado a lado no computador e empilhadas abaixo de 1024 px; o cartão inteiro é clicável. Cada opção: uma miniatura da loja (faixa do cabeçalho na cor 1, faixa do menu na cor 2, três placeholders sobre #FAF8F4 e uma barra de ação na cor 2), a linha com o rádio, o nome em negrito e o selo **"Em uso"** (estilo do selo verde de "pago" do painel) no perfil salvo, a descrição e quatro quadradinhos de amostra (primary-strong, primary, accent, ground-deep, nessa ordem, lidos de `ESTRELINHA_PROFILES`).
  - "Padrão" — "Ardósia e ouro, a cara de sempre da loja."
  - "Black Friday" — "Preto e ouro, para a campanha."
- Aviso com ícone de relógio (H7): "Depois de salvar, quem abrir a loja já vê o perfil novo nas páginas de produto e de categoria em até 5 minutos, e nas outras páginas em até 1 hora. Quem já está com a loja aberta vê ao trocar de página."
- Ações: **"Ver a loja com este perfil"** (secundário, ícone de link externo; sempre habilitado) e **"Salvar"** (primário; desabilitado quando o escolhido é igual ao salvo).
- Voltar ao Padrão é marcar "Padrão" e salvar.
- Modal "A loja com o perfil {nome}" (o escolhido e não salvo), subtítulo "Prévia, sem salvar. A loja publicada não muda.", corpo com a loja num iframe, largura até 960 px, rodapé "Fechar"; fecha por "Fechar", pelo fundo ou por Esc; fechar não muda o escolhido nem o salvo.
- Estados (H9): carregando ⇒ opções desabilitadas até a configuração chegar; salvando/erro pelo molde do `SettingsSaveButton`/`useSettingsSave`; valor desconhecido gravado ⇒ "Padrão" com "Em uso". Sucesso (H8): "Perfil salvo. Quem abrir a loja vê o perfil novo em até 1 hora."

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| o card, o palco (`…LivePreview.tsx`) e a ponte em `apps/backoffice/src/features/style-profile/` | VOCÊ CRIA | o perfil salvo, o escolhido | gravação de `store_settings` `key='appearance'` `value={ profile }`; mensagens `draft` pelo canal de `core` |
| `apps/backoffice/src/features/settings/ui/StoreDataSection.tsx` | JÁ EXISTE. Monta o card como o último da seção (H11) | — | — |
| `useUpdateSettings` (`packages/core/src/hooks/useStoreSettings.ts:168-181`) | JÁ EXISTE. Consuma; não altere | chave + valor | upsert |
| `storeOrigin()` (`apps/backoffice/src/shared/lib/storeOrigin.ts`), `previewSrc`/`previewFrame`/`PREVIEW_DEVICES` (`core/home/preview.ts`), `useFullscreenStage` | JÁ EXISTE. Consuma; não altere | — | — |
| o recebedor na loja | criado pela 05; esta tarefa só manda mensagens pelo canal de `core` | — | — |

Só o que ESTA tarefa cria ou consome. `JÁ EXISTE` é afirmação a conferir no código.

### Decisões já tomadas

- H8: a mensagem de sucesso do card é a dele; a frase compartilhada de `useSettingsSave.ts:30` não muda para as outras telas.
- H10: `Dialog` do `@estrelinha/ui` (Esc, foco e retorno do Radix); alternância Computador/Celular por `PREVIEW_DEVICES`; o arquivo do palco termina em `LivePreview.tsx` e não se chama `PreviewModal`, `FullscreenPreview` nem `PreviewOverlay`.
- R11: o palco entra na lista de `previaUnica.test.ts` (que hoje só vigia três pastas — estenda à pasta nova) e de `folgaDoPalco.test.ts` (âncora `toEqual` dos palcos — reescreva com o quarto); um `<iframe>`, `previewSrc`, `previewFrame(`, sem import de `apps/store`; origem exata no `postMessage`, nunca `'*'`.
- UC-02: Salvar grava só `{ profile }` na chave `appearance`, sem tocar em nenhuma outra chave.
- R12/H13: Configurações tem 5 seções; nenhuma nasce.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| card autocontido em Configurações | `apps/backoffice/src/features/settings/ui/StoreDataSection.tsx:42-53` |
| escolha entre opções com rótulos de `core`, `disabled` sem mudança | `apps/backoffice/src/features/buy-together-lists/ui/BuyTogetherFormCard.tsx:19-97` (atenção: o `grid-cols-1` dele reprovaria a régua da seção) |
| palco | `apps/backoffice/src/features/announcement-bar/ui/AnnouncementLivePreview.tsx` |
| ponte | `apps/backoffice/src/features/announcement-bar/model/useAnnouncementsPreviewBridge.ts` |

Abra o arquivo antes de escrever o seu.

### Testes

- Componente: o card mostra as duas opções com as amostras do dono, marca "Em uso" a salva, e o valor desconhecido aparece como Padrão.
- Componente: Salvar grava `{ profile }` na chave `appearance` (payload por igualdade exata) e só ela; desabilitado sem mudança; a mensagem de sucesso é a de H8.
- Componente: o aviso diz 5 minutos e 1 hora (D-02) e a frase de quem está com a loja aberta.
- Componente: "Ver a loja com este perfil" abre o modal com UM iframe de `previewSrc`, manda `draft` com o perfil escolhido para a origem exata e não grava nada; fechar não chama a mutação (CA-07).
- Componente: sem `VITE_STORE_URL`, o passo de configuração aparece no lugar do palco.
- Página (`AdminSettingsPage.test.tsx`): o card aparece em Dados da loja; o inventário de rótulos ganha o rótulo novo; a régua de `grid-cols-*` sem breakpoint (`:399-445`) e a do botão de salvar (`:1144-1169`) continuam verdes; o dublê sem `appearance` não quebra o card.
- Guardas: `previaUnica.test.ts` e `folgaDoPalco.test.ts` com o quarto palco; `semAbaEmConfiguracoes.test.ts` verde.

Escrever estes testes é parte da tarefa.

### Obrigações

- Nada de `grid-cols-*` sem breakpoint dentro do painel da seção, inclusive `grid-cols-1` (`AdminSettingsPage.test.tsx:414-415`).
- `SettingsSaveButton` para o Salvar; alvo de toque ≥ 44 px; `motion-reduce:` em toda transição nova.
- Não chamar seção de "aba" (`semAbaEmConfiguracoes.test.ts`).
- Rode a suíte do painel e a da loja (os guardas da loja varrem `apps/**`), `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (baseline 7 herdados) e `npx eslint .` em `apps/backoffice` (baseline 23/5).

### Não faça

- Não crie uma quinta seção nem mude as existentes.
- Não mude a frase compartilhada de `useSettingsSave.ts`.
- Não toque em `apps/store/**` além dos testes de guarda que já leem o painel, nem em `packages/core/src/appearance/**` (tarefa 01).
- Não ligue o perfil ao calendário da campanha (D-03).

### Pronto quando

- [ ] escolher Black Friday e salvar grava `appearance = { profile: 'black-friday' }`; escolher Padrão e salvar grava `{ profile: 'padrao' }` (teste)
- [ ] a prévia manda o rascunho sem gravar, e fechar não grava (teste)
- [ ] `pnpm --filter @estrelinha/backoffice build` verde
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
