## 03 · [store (monorepo)] BUG-001 — [Menu da loja › editor do item] A prévia não mostra o ícone nem a cor escolhidos antes de Salvar
**Status:** done

`C-03, C-06` — WI 104 · fix task (QA rodada 1)

**Objetivo.** Com o editor do item aberto em `/admin/menu`, a dona vê na prévia da loja, antes de Salvar, o ícone e as cores do rótulo que acabou de escolher, e alterna Celular/Computador para conferir as duas superfícies.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `apps/backoffice/CLAUDE.md` (em especial `› Molde dos formulários`, `› A ponte da prévia (feature 25, e o segundo canal da 39)` e `› /admin/menu — o menu montado pela dona (feature 86, AD-068)`), `packages/core/CLAUDE.md`, e, do `CLAUDE.md` da raiz (grande demais para ler inteiro), as seções `CLAUDE.md › Feature-Sliced Design`, `CLAUDE.md › O "defeito 01": dois donos do mesmo dado`, `CLAUDE.md › Convenções que valem em todo o repositório`, `CLAUDE.md › Os guardas — o que trava o quê` e `CLAUDE.md › Baselines — o gate de qualquer feature`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** 01 e 02 (`done`): o seletor com os ícones do sistema e o bloco "Cor do texto" do editor existem e gravam.
**Habilita.** A 04 mexe no mesmo editor (estado dos campos de cor) e roda depois desta.

### Critérios de aceite

### BUG-001 — [Menu da loja › editor do item] A prévia não mostra o ícone nem a cor escolhidos antes de Salvar

#### Resumo

A dona abriu o item "Sobre" no Menu da loja, escolheu a Etiqueta no grupo "Do sistema" e deu ao rótulo `#E8C77A` na barra e `#8A5A2B` na lista. Antes de salvar, olhou a prévia ao lado para ver como fica e tentou trocar entre Celular e Computador. A prévia continuou com o ícone antigo e o rótulo claro de sempre. O editor fica por cima da prévia e escurece o resto da tela, e os botões Celular, Computador e Tela cheia não podem ser tocados. Ela só vê o efeito depois de Salvar, e a essa altura a cor já está na loja. Se não gostar, precisa reabrir o item e gravar de novo.

**Origem:** sessão CH-01 (continuação) · ambiente local (painel `:8083`, loja `:8082`, Supabase local)

#### Impacto

- **Nível:** Fricção
- **Persona mais atingida:** PER-01 Adri, a dona. Outras: nenhuma
- **Jornada e passo:** J-01, passo 5 (olhar a prévia em Celular e em Computador antes de salvar)
- **Frequência:** sempre (nas duas aberturas do editor da sessão)
- **Contorno:** salvar, conferir na prévia ou na loja e reabrir o item para corrigir. Cada gravação já vale na loja publicada
- **Gravidade proposta na sessão:** medium. Divergiu: o nível é Fricção, e o guia de severidade sobe um degrau quando ela acontece numa jornada P0 do plano. J-01 é P0, e este é o passo 5 do caminho principal, não um ramo. Por isso fica `high`. Uma observação para o Dev e para o Gate 3: o editor em diálogo sobre a prévia já existia antes deste Work Item, e antes dele o nome e o ícone também só chegavam à prévia depois de Salvar. O que este Work Item acrescentou foi a promessa da costura de que, no bloco novo de cor, "a prévia ao lado mostra o efeito". Se o humano ler essa frase como "depois de salvar", o caminho é descartar o bug no Gate 3 e ajustar o plano, não rebaixá-lo

#### Ambiente

- **URL:** http://localhost:8083/admin/menu
- **Tela:** Menu da loja (painel) · **Componente:** editor do item ("Editar “Sobre”") e a prévia da loja ao lado
- **Branch / build:** `feature/104`, HEAD `94a09c43`, segundo o `qa-report.md`. A sessão não expôs o build
- **Browser:** Chromium (agent-browser 0.39.1, headless) · **Viewport:** 1440 × 900
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Entre no painel como a dona (conta `admin`) e abra Loja › Menu da loja (`/admin/menu`), com a prévia em Computador
2. No item principal "Sobre", abra Ações › "Editar nome, ícone e banners"
3. No seletor de ícone, escolha "Etiqueta" no grupo "Do sistema"
4. Em "Na barra do computador (fundo escuro)", digite `#E8C77A`. Em "Na lista do celular (fundo branco)", digite `#8A5A2B`
5. Sem salvar, olhe a prévia à direita e tente trocar para Celular

#### Esperado

Antes de gravar, a prévia ao lado mostra o item com a Etiqueta: em Computador, o rótulo em `#E8C77A`; em Celular, a folha com o rótulo em `#8A5A2B`. Ela acompanha cada troca de cor sem recarregar.

**Fonte:** `plan.md` › Design › Editor do item ("a prévia ao lado mostra o efeito"); C-03 ("e na prévia do painel"); TC-FUNC-004 passos 1–3; J-01 passo 5, que vem antes de "salva"

#### Observado

O editor abre como diálogo sobre a página. Ele cobre a metade esquerda da prévia (o quadro vai de 705 a 1375 px, e o diálogo chega a ~980 px) e escurece o resto. Celular, Computador e Tela cheia saem da árvore de acessibilidade e não podem ser tocados. Na parte visível da barra da prévia, "SOBRE" continua com o ícone antigo e o rótulo claro, sem o dourado. Só depois de Salvar a prévia mostra o rótulo em `rgb(232, 199, 122)` com a Etiqueta. Quando a sessão trocou a cor da barra para `#F2E1B6` sem salvar, também não conseguiu ler nada na prévia com o editor aberto.

#### Evidência

- `screenshots/CH-01b-02-editor-a-cores.png`: editor com a Etiqueta marcada e as duas cores, e à direita a barra da prévia com "SOBRE" ainda no ícone antigo e sem dourado
- `screenshots/CH-01b-03-previa-computador-nao-salvo.png`: o quadro da prévia com o editor aberto e as escolhas não salvas, metade coberto e "SOBRE" sem dourado

#### Perspectiva da persona

Adri escolhe a cor pelo olho, no seletor de cor, e não entende de contraste nem de código hex. A prévia é o único lugar onde ela vê o efeito sem publicar. Sem ela, cada tentativa de cor vai direto para a loja que as clientes estão vendo, durante a montagem de uma campanha, e cada ajuste custa reabrir o item.

**Risco de abandono:** baixo. A gravação funciona e a prévia mostra o efeito depois de salvar. O custo está nas idas e vindas e na cor provisória publicada.

#### Relacionados

- **TC:** TC-FUNC-004
- **Charter:** CH-01
- **Critério:** C-03, C-06
- **Protótipo:** nenhum ("Seguir sem design")
- **Bugs:** nenhum

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| A ponte da prévia do menu (`features/store-menu/model/useMenuPreviewBridge.ts`) e o rascunho `MenuPreviewDraft` (`packages/core/src/menu/preview.ts › MenuPreviewDraft`) — o documento inteiro vai à loja, que relê pela mesma porta | JÁ EXISTE. Consuma; não altere o formato da mensagem nem `core/menu` | `{ categories, document }` | a loja no iframe desenha o rascunho |
| `MenuLivePreview` (`features/store-menu/ui/MenuLivePreview.tsx`) — recebe o documento que desenha | JÁ EXISTE. Pode passar a receber o documento com a edição em curso aplicada | — | — |
| `MenuItemEditor` (`features/store-menu/ui/MenuItemEditor.tsx`) e `AdminMenuPage` (`pages/admin/AdminMenuPage.tsx`) | VOCÊ ALTERA | o rascunho do editor (nome, ícone, `labelColors`) | a prévia acompanha o rascunho antes de Salvar; o dispositivo da prévia (Celular/Computador) alcançável com o editor aberto |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-001 · [Menu da loja › editor do item] A prévia não mostra o ícone nem a cor escolhidos antes de Salvar · high
- **Fechamento**: a tarefa fecha com o fix do bug; o bug segue `open` até o reteste do QA
- Decisão do humano no Gate 3 da QA (2026-11-17): "resolver todos os bugs" — este bug é corrigido nesta etapa, mesmo o diálogo sobre a prévia sendo anterior ao WI. A frase da costura é `plan.md` › Design: "a prévia ao lado mostra o efeito".
- Rascunho não salvo **nunca** grava: a prévia mostra o rascunho, o documento gravado só muda no Salvar de hoje. Cancelar/fechar o editor devolve a prévia ao documento gravado.
- Cor recusada (abaixo de 4,5:1) ou fora de `#RRGGBB` não vai à prévia como cor válida — a prévia mostra o que a loja desenharia: o leitor da loja já trata cor fora do formato como "sem cor".
- A prévia continua sendo a loja num iframe (feature 25/39/47): nenhum desenho novo do menu no painel.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| Levar um estado de tela ao rascunho da prévia | `pages/admin/AdminMenuPage.tsx` › onde monta `<MenuLivePreview` (o documento e o `openId` que a prévia já recebe) e `MenuLivePreview.tsx` › `draft = useMemo(...)` |
| Aplicar uma edição ao documento sem gravar | `features/store-menu/model/documentOps.ts` (as operações puras sobre o documento que o Salvar já usa) |

### Testes

- Componente (painel): com o editor aberto, escolher um ícone do sistema e uma cor válida faz o rascunho entregue à prévia conter o ícone e a cor naquele item, sem chamar o Salvar (nenhuma gravação).
- Componente (painel): cancelar/fechar o editor sem salvar devolve à prévia o documento gravado.
- Componente (painel): com o editor aberto, o controle de dispositivo da prévia (Celular/Computador) continua alcançável (não fica sob a camada modal / fora da árvore de acessibilidade).
- Componente (painel): uma cor recusada não chega ao rascunho como cor do item.

### Obrigações

- `previaUnica.test.ts` (backoffice `features/home-composition`): nenhum `…Preview` novo, nenhum segundo `<iframe>`, nenhum desenho do menu no painel.
- `menuDocumentoComDonoUnico.test.ts`: a tela do menu continua falando só com `store_settings` e o documento continua lido pela porta `parseMenuDocument`.
- `animacaoRespeitaMovimento` / `touchTarget`: controle novo com alvo ≥ 44 px e movimento com par `motion-reduce:` se houver.
- A largura de 390 px é o alvo (o painel tem as abas "Itens do menu"/"Prévia" no celular): a solução não pode esconder o editor nem a prévia no celular.

### Não faça

- Não altere o formato da mensagem da ponte nem `packages/core/src/menu/preview.ts`.
- Não grave nada antes do Salvar (sem gravação automática).
- Não toque o estado dos campos de cor quando apagados (é o BUG-002, tarefa 04) nem `MenuLabelColorField.tsx`.
- Não mexa na loja (`apps/store/**`).

### Pronto quando

- [ ] com o editor aberto, a prévia mostra o ícone e as cores escolhidos antes de Salvar, em Computador e em Celular
- [ ] fechar sem salvar devolve a prévia ao gravado; nada grava antes do Salvar
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
