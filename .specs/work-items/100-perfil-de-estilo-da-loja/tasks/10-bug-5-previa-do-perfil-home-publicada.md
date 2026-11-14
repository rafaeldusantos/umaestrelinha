## 10 · [apps/store, apps/backoffice, packages/core] BUG-005 — a prévia do perfil mostra a Home publicada

**Status:** done

`BUG-005` — 100 · fix task da QA (rodada 2)

**Objetivo.** o iframe de "Ver a loja com este perfil" mostra a Home que a cliente vê (os blocos publicados, lidos do banco), nas cores do perfil escolhido — sem mudar a prévia de `/admin/home`, que continua desenhando só o rascunho que o painel manda.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos · O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines; `apps/store/CLAUDE.md` › Modo prévia · home; `apps/backoffice/CLAUDE.md` › `/admin/home` e a ponte da prévia · Configurações; `packages/core/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** 05 (o recebedor do perfil na loja, `done`), 07 (o palco `StyleProfileLivePreview`, `done`).

### Causa (diagnóstico da thread principal, a conferir)

O palco do perfil carrega `previewSrc(STORE_URL)` = `/?preview=1`. Com `?preview=1` dentro de iframe, `useHomePreview` (`apps/store/src/entities/home/model/useHomePreview.ts`) liga o modo prévia da **Home** e `HomePage.tsx` desliga a leitura de `home_sections` (`useHomeSections({ enabled: !preview })`, `PRV-02` da feature 25) e desenha só o rascunho que chega por `postMessage` do `/admin/home`. A ponte do perfil (`useStyleProfilePreviewBridge`) manda só o perfil, nunca seções — então `rascunho` fica `[]` para sempre e a Home sai vazia entre o cabeçalho e o rodapé. O modo prévia é um só para quatro palcos (Home, menu, faixa, perfil), mas só o da Home tem quem mande a composição.

### Critérios de aceite

O corpo do bug, íntegro — é a definição de pronto e o que o QA vai retestar.

### BUG-005 · [Prévia do perfil] A prévia mostra a Home sem banners, vitrine nem produtos — a dona

##### Resumo

Adri quer conferir como fica a loja de Black Friday antes de ligar. Ela abre "Ver a loja com este perfil" e passa a
prévia para "Computador". O quadro mostra a faixa de avisos, o cabeçalho e a faixa de departamentos já em preto e ouro.
Logo abaixo vem uma faixa clara vazia, e depois "Siga-nos no Instagram" e o rodapé. Não aparece nenhum banner, vitrine,
produto nem a faixa de declaração da Home. O card logo acima promete que "Textos, blocos da Home, preços e menu
continuam iguais", e a prévia mostra uma loja vazia. Adri esperava ver a Home que a cliente vê, só que com as cores de
Black Friday.

**Origem:** sessão CH-07 (rodada 2, confirmação) · também na sessão CH-02 (rodada 1) · painel http://localhost:8183/admin

##### Impacto

- **Nível:** Dano à confiança
- **Persona mais atingida:** PER-01 Adri (a dona) — outras: nenhuma
- **Jornada e passo:** J-01, passo 4 (confere na prévia antes de salvar)
- **Frequência:** sempre (2 de 2 na rodada 2, mais as screenshots da rodada 1, em "Computador" e em "Celular")
- **Contorno:** salvar o perfil e abrir a loja publicada numa aba nova. A prévia deixa de servir para o que existe,
  que é conferir **sem** salvar
- **Gravidade proposta na sessão:** high — mantida. Nada se perde e a loja publicada está certa. Mas o instrumento
  que a dona usa para decidir mostra uma loja quebrada, e ela pode desistir de ligar a campanha ou achar que o perfil
  apaga a Home. Nenhum ajuste se aplica, porque o produto não se corrige sozinho: a prévia segue vazia depois de 15 s
  e depois de alternar o dispositivo

##### Ambiente

- **URL:** http://localhost:8183/admin/configuracoes/dados-da-loja (prévia: iframe de `http://localhost:8182/?preview=1`)
- **Tela:** Configurações › Dados da loja · **Componente:** modal da prévia do perfil ("A loja com o perfil …"),
  aberto pelo card "Perfil de estilo da loja"
- **Branch / build:** `feature/100` @ `90f751fa`, dev server do worktree
- **Browser:** Chromium (agent-browser 0.39.1) · **Viewport:** 1440 × 900 (prévia em "Computador", 1024 × 768 a
  60 %). Na rodada 1, também em "Celular", 390 × 844 a 55 %
- **Rede:** local, sem limitação; `*.supabase.co` e `**/g/collect*` abortados por rota, como em todas as sessões ·
  **Idioma:** pt-BR

##### Passos

1. Entrar como a dona (`admin-loja`) com o perfil Black Friday salvo e abrir Configurações › Dados da loja
2. No card "Perfil de estilo da loja", deixar Black Friday marcado e clicar em "Ver a loja com este perfil"
3. No modal, clicar em "Computador" e esperar o quadro carregar (15 s)
4. Olhar o corpo da Home dentro do quadro

##### Esperado

A Home da loja, com os mesmos blocos que a cliente vê (banners, vitrines de produtos, a faixa de declaração), nas
cores do perfil marcado. Só as cores mudam.

**Fonte:** PRD UC-03 ("abre a loja num iframe … com o perfil escolhido e ainda não salvo") · spec › Design, modal "A
loja com o perfil {nome}" ("corpo: a Home da loja num iframe") · texto do card ("Textos, blocos da Home, preços e menu
continuam iguais") · protótipo `Painel - Campanhas, faixa e perfil.html` › Configurações · perfil de estilo, cujo
modal remete a "Black Friday - Home" · TC-UI-001, passo 2 · TC-FUNC-005, passo 1

##### Observado

No quadro aparecem a faixa de avisos ("Black Friday · novembro inteiro com joias em oferta · Ver ofertas"), o cabeçalho
e a faixa de departamentos em preto e ouro. Logo depois vem uma faixa clara vazia, seguida de "Siga-nos no Instagram
@umaestrelinha.adri" e do rodapé, com as categorias listadas. Nenhum banner, vitrine, cartão de produto nem faixa de
declaração. Fica igual depois de 15 s e depois de alternar Celular → Computador. A Home publicada da mesma loja, com o
mesmo perfil, mostra todos esses blocos. Console e rede da sessão não foram lidos, e o iframe é de outra origem.

##### Evidência

- `screenshots/CH-07-02-previa-computador-bf-1440.png` — a prévia em "Computador" depois de 15 s: cabeçalho, uma faixa
  vazia, Instagram e rodapé
- `screenshots/CH-07-03-previa-computador-bf-repro.png` — a reprodução depois de alternar Celular → Computador
- `screenshots/2026-11-14-r1/CH-02-05-previa-bf-computador.png` — a mesma prévia vazia em "Computador" na rodada 1
- `screenshots/2026-11-14-r1/CH-02-02-previa-bf-celular.png` — a prévia em "Celular" na rodada 1, também sem os blocos
  entre o cabeçalho e o Instagram (tirada logo ao abrir o modal)
- `screenshots/2026-11-14-r1/CH-07-05-home-bf-1440.png` — a Home publicada em Black Friday, com banners, vitrines e
  declaração, para comparar

##### Ocorrências

| Sessão               | Persona     | Passo                                  | Evidência                                                     |
| -------------------- | ----------- | -------------------------------------- | ------------------------------------------------------------- |
| CH-07 (rodada 2)     | PER-01 Adri | 02 — abrir a prévia em Computador      | `screenshots/CH-07-02-previa-computador-bf-1440.png`          |
| CH-07 (rodada 2)     | PER-01 Adri | 03 — alternar Celular → Computador     | `screenshots/CH-07-03-previa-computador-bf-repro.png`         |
| CH-02 (rodada 1)     | PER-01 Adri | 07 — voltar ao painel e olhar a prévia | `screenshots/2026-11-14-r1/CH-02-05-previa-bf-computador.png` |
| CH-02 (rodada 1)     | PER-01 Adri | 03 — abrir a prévia em Celular         | `screenshots/2026-11-14-r1/CH-02-02-previa-bf-celular.png`    |

##### Relacionados

- **TC:** TC-UI-001 (falhou por este bug na rodada 2) · TC-FUNC-005 (não rodou nesta rodada; o passo 1 espera a Home
  no iframe)
- **Charter:** CH-07 · CH-02
- **Critério:** UC-03, CA-07
- **Protótipo:** Claude Design `4abe021d-d77e-4fe7-affd-524180315fa3`, `Painel - Campanhas, faixa e perfil.html` ›
  Configurações · perfil de estilo (modal da prévia) e `Black Friday - Home.html`
- **Bugs:** nenhum

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-005 · [Prévia do perfil] A prévia mostra a Home sem banners, vitrine nem produtos — a dona · high
- **Lote**: de um
- **Fechamento**: a tarefa fecha com o fix; o bug segue `open` até o reteste do QA
- **Forma do conserto (premissa da thread principal)**: o endereço da prévia passa a dizer DE ONDE vem a Home. Um parâmetro novo, ao lado de `preview`, montado por `previewSrc` em `packages/core/src/home/preview.ts` (dono único do contrato da prévia), e lido por uma função pura irmã de `isPreviewWindow` (o mesmo dono — o `App.tsx` e o `useHomePreview` não podem ter dois detectores). Sem o parâmetro, o comportamento é o de hoje (rascunho, consulta desligada, `PRV-02` intacto) — é o que mantém `/admin/home`, `/admin/menu` e a faixa como estão. Só o palco do perfil passa o parâmetro. Com ele, a Home em prévia lê `home_sections` como a loja publicada (esqueleto enquanto carrega, piso em erro/lista vazia) e continua dentro do invólucro da prévia (o clique em captura que impede o iframe de navegar fica; o realce e o "select" para o painel são inofensivos ali). O `InstagramInvite` (sobreposição) continua fora da prévia. Rejeitado: o painel mandar a composição publicada pela ponte do perfil (seria um segundo leitor de `home_sections` no painel e um segundo dono do que é "a Home publicada"); e a loja ler o banco em toda prévia até chegar rascunho (pintaria a composição salva e depois trocaria pela do rascunho em `/admin/home` — o piscar que a feature 25 proíbe).
- **Raio de alcance**: a prévia da faixa (`AnnouncementLivePreview`) e a do menu (`MenuLivePreview`) têm o mesmo vazio na Home; ficam FORA desta tarefa (o bug é só do perfil). Registre no retorno.
- **Posse (arquivos onde o bug mora)**: `packages/core/src/home/preview.ts` e `packages/core/src/home/__tests__/preview.test.ts`; `apps/store/src/entities/home/model/useHomePreview.ts` e `apps/store/src/entities/home/model/__tests__/useHomePreview.test.tsx`; `apps/store/src/pages/HomePage.tsx` e `apps/store/src/pages/__tests__/homePreview.test.tsx`; `apps/backoffice/src/features/style-profile/ui/StyleProfileLivePreview.tsx` e `apps/backoffice/src/features/style-profile/ui/__tests__/StyleProfileCard.test.tsx`.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| o parâmetro e o leitor puro | `packages/core/src/home/preview.ts › PREVIEW_PARAM`, `› isPreviewWindow`, `› previewSrc` |
| a Home em prévia lendo o banco | o ramo `!preview` de `apps/store/src/pages/HomePage.tsx` (esqueleto com `isLoading`, `HomeRenderer` com as seções lidas) |
| o teste da página em prévia | `apps/store/src/pages/__tests__/homePreview.test.tsx` |

Abra o arquivo antes de escrever o seu.

### Testes

- Unidade (core): `previewSrc` sem opção continua `/?preview=1` (os casos de hoje intactos); com a Home publicada inclui o parâmetro novo, uma vez, sem barra dupla; o leitor puro diz "publicada" só com o parâmetro e "rascunho" sem ele / com valor desconhecido.
- Componente (loja): em iframe com `?preview=1` e o parâmetro da Home publicada, a `HomePage` LÊ `home_sections` e desenha os blocos lidos (o bug reproduzido: hoje sai vazia); em iframe com só `?preview=1` a consulta continua desligada e o rascunho manda (`PRV-02`, sem asserção afrouxada).
- Componente (painel): o iframe do palco do perfil carrega o endereço com a Home publicada (`previewSrc` com a opção), e trocar de dispositivo não muda o `src`.

Escrever estes testes é parte da tarefa — cada um vermelho antes do conserto.

### Obrigações

- `packages/core/src/home/preview.ts` é alcançado pelo Deno (via `core/menu`): todo especificador relativo com `.ts`; módulo puro, sem `window`.
- Não mexa no comportamento da prévia de `/admin/home`, de `/admin/menu` nem da faixa; os testes delas continuam verdes sem edição.
- Guardas a respeitar: `previaUnica.test.ts`, `homeComposition.test.tsx` (sem tocar asserção), `metaPorRota.test.ts`, `brandScan.test.ts`; descreva formas proibidas em comentário, não as escreva.
- Rode as suítes de core, loja e painel (um workspace por vez, `--testTimeout=20000` sem o `--`), `npx tsc --noEmit` dos três (store 0 · backoffice 7 herdados · core 11 herdados) e `npx eslint .` na loja e no painel (2/2 · 23/5).

### Não faça

- Não faça o painel ler `home_sections` nem mandar seções pela ponte do perfil.
- Não ligue a leitura do banco em toda prévia; não mude `isPreviewWindow`.
- Não toque nas outras pontes nem nos outros palcos; não abra escopo novo.

### Pronto quando

- [ ] cada passo de reprodução do BUG-005 dá o esperado do bug (teste que reprovava antes)
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] suítes de core, loja e painel, `tsc` sem erro novo contra a baseline e `eslint` na baseline

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
