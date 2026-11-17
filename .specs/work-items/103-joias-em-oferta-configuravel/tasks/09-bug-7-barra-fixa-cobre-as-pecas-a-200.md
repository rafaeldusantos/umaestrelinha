## 09 · [apps/backoffice] BUG-007 — [Editor do bloco] A 200 % no celular, a barra fixa do topo cobre a lista de peças e o foco

**Status:** done

`RNF-04 (lado do editor)` — WI 103 · correção da rodada 2 de QA (confirmação) · regressão no entorno da fix task 05 (`65d16a85`)

**Objetivo.** No editor do bloco "Joias em oferta", com a fonte do sistema a 200 % no celular, a barra do topo (Cancelar e "Salvar seção") deixa de grudar no topo quando ela ficou alta demais para a tela, e por isso não cobre mais a lista de peças, o foco nem o toque nos controles das peças — sem voltar a rolagem lateral do BUG-004 e sem mudar nada a 100 % e a 130 %.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` › Feature-Sliced Design, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines · `apps/backoffice/CLAUDE.md` › Molde dos formulários, › `/admin/home` — a composição, › Gravar NÃO desmonta a tela (VIV-05), › O movimento do painel. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

### Critérios de aceite

### BUG-007 — [Editor do bloco] A 200 % no celular, a barra fixa do topo cobre a lista de peças e o foco

#### Resumo

Com a fonte do sistema a 200 % no celular, a dona abre o editor do bloco "Joias em oferta" para ordenar as peças.
Agora a barra do topo com "Cancelar" e "Salvar seção" cabe na largura, porque quebra linha (é a correção do
BUG-004). Mas ela continua grudada no topo e passou a ter 345 px de altura. Somada ao cabeçalho do painel, cobre
457 dos 844 px da tela, ou 54 %. A lista de "Peças escolhidas" fica visível só por uma fresta de 387 px. Quando
um controle de subir, descer ou remover para debaixo da barra, a dona não vê onde está o foco ao voltar com
Shift+Tab. E um toque nesse controle, que aparece pelo fundo translúcido, cai no "Salvar seção". O esperado é que
o editor continuasse usável a 200 %.

**Origem:** sessão CH-07 (rodada 2, confirmação) e reteste do BUG-004 (achado N-1 do entorno) · local (painel
http://localhost:8083)

Na rodada 1, a barra não quebrava linha e não cobria a lista. Os controles das peças estavam ao alcance a 200 %
(CH-07 da rodada 1, passo 02). O defeito nasceu da correção do BUG-004: é regressão no entorno da correção, e não
o BUG-004 de volta. A rolagem lateral do BUG-004 não voltou (o documento mede 390 px nas três fontes).

#### Impacto

- **Nível:** Fricção
- **Persona mais atingida:** quem usa a fonte do sistema a 200 % no celular, com toque ou teclado. Não há persona
  própria no plano, e o CFR cobre esse caso: é PER-01 Adri na condição do CFR. Outras: `nenhuma`
- **Jornada e passo:** J-01, escolher e ordenar as peças escolhidas, antes de salvar
- **Frequência:** sempre a 200 % (2 de 2 no CH-07 e 2 de 2 no reteste). A 130 % a barra mede 162 px. A 100 %,
  73 px
- **Contorno:** rolar até o controle ficar abaixo da barra, na faixa livre de 387 px, antes de tocar. Pelo
  teclado, avançar com Tab, porque para a frente o foco aparece no rodapé da tela. Outro contorno é reduzir a
  fonte
- **Gravidade proposta na sessão:** medium no CH-07 e no reteste, mantida. Ela conclui a ordenação, com esforço.
  O toque que cai no "Salvar seção" grava o rascunho que já está na tela e não remove a peça, então não há perda
  de dado. Não sobe um degrau por J-01 ser P0, pelo mesmo motivo do BUG-004: a persona da jornada trabalha no
  notebook, e o defeito existe só em 390 px com a fonte a 200 %, que é condição do CFR

#### Ambiente

- **URL:** http://localhost:8083/admin/home/<id do bloco>
- **Tela:** editor do bloco "Joias em oferta" · **Componente:** barra do topo do editor (Cancelar e "Salvar
  seção"), sobre a lista "Peças escolhidas"
- **Branch / build:** feature/103 depois das fix tasks 05–08 (worktree store__feature-103; a sessão não expõe o
  build)
- **Browser:** Chromium (agent-browser 0.39.1, headless) · **Viewport:** 390 × 844, fonte da raiz a 200 %
- **Rede:** local, sem limitação · **Idioma:** pt-BR

#### Passos

1. Como PER-01 Adri, com a conta `admin-loja`, num celular de 390 × 844, entrar no painel e abrir Loja → Home
2. Abrir um bloco "Joias em oferta" com três peças escolhidas (por exemplo, o da campanha "Dia das Mães")
3. Aumentar a fonte do sistema para 200 % (tamanho da fonte da raiz da página)
4. Rolar até "Peças escolhidas"
5. Pelo teclado: Tab até "Subir a 3ª peça", rolar a página para baixo e apertar Shift+Tab. O foco vai para
   "Remover a 2ª peça", debaixo da barra
6. Pelo toque: rolar até que "Remover a 1ª peça" fique no meio da tela (perto de y 378) e tocar nele. O toque cai
   no "Salvar seção"

#### Esperado

Com a fonte do sistema a 200 % no celular, o editor continua usável. O controle que recebe o foco fica à vista. A
barra fixa não cobre o conteúdo de um jeito que faça o toque num controle das peças ir para outro botão.

**Fonte:** PRD RNF-04 ("o editor continua usável com a fonte do sistema a 200 %") · TC-CFR-001 passos 1 e 2
("todo campo, o seletor, a lista e o Salvar alcançáveis" · "foco visível")

#### Observado

- Há duas barras grudadas no topo a 200 %. O cabeçalho do painel ocupa y 0–112. A barra do editor ("Loja › Home
  › Joias em oferta · Joias em oferta · Cancelar · Salvar seção") fica em y 112–457, com 345 px de altura e fundo
  translúcido (alfa 0,8). Juntas, cobrem 457 dos 844 px, ou 54 % da tela
- Quando o foco faz a página subir até um controle das peças, ele para em y 378–466. Ficam 9 px do botão à
  vista, e o centro dele está debaixo da barra. Isso aconteceu com 5 dos 8 controles focáveis. Com Shift+Tab, o
  foco em "Remover a 2ª peça" fica debaixo da barra. Com Tab, o foco em "Subir a 3ª peça" aparece no rodapé, em
  y 756–844
- Com "Remover a 1ª peça" centrado na tela (y 378), o ponto de toque cai no "Salvar seção" (y 352–432). O mesmo
  acontece com a 2ª e a 3ª peça. O clique automatizado em "Remover a 4ª peça" foi recusado porque o "Salvar
  seção" estava por cima
- Não há rolagem lateral: o `scrollWidth` é 390 a 100 %, 130 % e 200 %

#### Evidência

- `screenshots/CH-07-r2-02-shift-tab-foco-coberto-200.png` — o foco em "Remover a 2ª peça", debaixo da barra
- `screenshots/CH-07-r2-01-tab-frente-foco-visivel-200.png` — para comparar: com Tab para a frente, o foco fica à
  vista no rodapé
- `screenshots/retest-r2-BUG-004-salvar-sobre-pecas.png` — a barra fixa cobre a metade de cima da tela, com o
  "Salvar seção" sobre a lista de peças

#### Ocorrências

| Sessão                             | Persona                    | Passo                                       | Evidência                                                  |
| ---------------------------------- | -------------------------- | ------------------------------------------- | ---------------------------------------------------------- |
| CH-07 (rodada 2), achado A-1       | PER-01 Adri (CFR, 200 %)   | passos 03–07 (foco coberto, Shift+Tab)      | `screenshots/CH-07-r2-02-shift-tab-foco-coberto-200.png`   |
| Reteste do BUG-004, achado N-1     | PER-01 Adri (CFR, 200 %)   | entorno, passo seguinte (toque cai no Salvar) | `screenshots/retest-r2-BUG-004-salvar-sobre-pecas.png`   |

#### Perspectiva da persona

Quem usa a fonte grande no celular já lê com esforço e rola mais que os outros. Ela trabalha a lista de peças por
pouco menos da metade de baixo da tela. Pelo fundo translúcido, vê os controles que estão debaixo da barra, mas o
toque neles vai para o "Salvar seção". Isso grava o que ela ainda estava arrumando e a deixa sem saber se a peça
saiu. Pelo teclado, ao voltar um controle, ela perde de vista onde está o foco.

**Risco de abandono:** baixo a médio. Ela conclui rolando até a faixa livre e salvando de novo, mas pode deixar a
ordenação para o notebook.

#### Relacionados

- **TC:** TC-CFR-001 (fail na rodada 2)
- **Charter:** CH-07
- **Critério:** RNF-04 (quebra)
- **Protótipo:** nenhum
- **Bugs:** BUG-004. É a correção dele, a barra que agora quebra linha, que cria esta cobertura. O BUG-004 não
  volta: a rolagem lateral segue corrigida

### Contrato

| Item | Dono |
| ---- | ---- |
| `apps/backoffice/src/shared/ui/FormPageHeader.tsx` — a barra do topo, `sticky top-14 md:top-0`, com a fila de ações que quebra linha desde a fix task 05 | ALTERA: a barra só gruda enquanto cabe (ver Decisões) |
| `apps/backoffice/src/shared/ui/FormPageHeader.test.tsx` | ALTERA: acrescenta os testes do bug; os testes que existem seguem passando, sem afrouxar |
| `apps/backoffice/src/shared/lib/` — um hook pequeno de medida, se for preciso separar | CRIA, se precisar |
| Consumidores de `FormPageHeader` (`HomeSectionEditor.tsx`, `AdminPromotionFormPage.tsx`, `AdminCouponFormPage.tsx`) | JÁ EXISTEM. Consuma; não altere |
| `apps/backoffice/src/widgets/admin-layout/ui/AdminLayout.tsx` — a barra do celular (`sticky top-0 h-14`) | JÁ EXISTE. Não altere (o `AdminLayout.test.tsx` exige que ela seja `sticky`) |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-007 · [Editor do bloco] A 200 % no celular, a barra fixa do topo cobre a lista de peças e o foco · medium
- **Fechamento**: a tarefa fecha com o fix do bug; o bug segue `open` até o reteste do QA
- **Causa raiz** (lida no código, decisão do orquestrador): `FormPageHeader` é `sticky` em qualquer tamanho. A fix task 05 fez a fila de ações quebrar linha, então a 200 % em 390 px a barra fica com ~345 px e continua grudada. O defeito é a barra grudar mesmo quando ocupa boa parte da tela, não a quebra de linha (que fica: tirá-la traz de volta o BUG-004)
- **A regra**: a barra gruda no topo **só enquanto a altura dela é no máximo um quarto da altura da janela** (`window.innerHeight`). Acima disso ela fica no fluxo, no topo do formulário, sem `sticky`. Medido pelo QA: 73 px a 100 % e 162 px a 130 % em 844 px (gruda, como hoje); 345 px a 200 % (não gruda). A medida é reavaliada quando a altura da barra muda (`ResizeObserver`) e quando a janela muda de tamanho (`resize`); sem `ResizeObserver` disponível, fica como hoje (gruda). A regra mora num lugar só (no `FormPageHeader` ou num hook em `shared/lib`), e não se duplica nos consumidores
- Vale para os três consumidores: nos tamanhos de hoje nada muda para eles (gruda), e a 200 % no celular eles ganham o mesmo conserto
- Sem barra translúcida por cima do conteúdo quando ela não gruda: no fluxo, a translucidez não importa; não mude cor, borda, padding nem o `bleed`
- Premissa: ficar fora do `sticky` a 200 % é aceitável para RNF-04 ("o editor continua usável"): o "Salvar seção" continua alcançável rolando ao topo, e o `⌘S` segue valendo. Raio de alcance: só a barra de formulário do painel (`FormPageHeader`)

### Testes

- (componente, jsdom, com a altura da barra e `innerHeight` dublados) barra de 345 px numa janela de 844 px ⇒ a barra NÃO tem `sticky`; barra de 73 px e de 162 px na mesma janela ⇒ tem `sticky` (as classes de hoje: `sticky top-14 md:top-0 z-20`). Reprova antes do fix
- (componente, jsdom) a barra muda de altura depois de montar (o `ResizeObserver` avisa) ⇒ o estado acompanha, nos dois sentidos; a janela muda de altura (`resize`) ⇒ idem
- (componente, jsdom) sem `ResizeObserver` no ambiente ⇒ a barra gruda, como hoje
- (componente, jsdom) os dois `flex-wrap` da fix task 05 continuam (o BUG-004 não volta) — os testes que existem cobrem; não os mude

### Obrigações

- Teste antes do código: o teste do comportamento do bug reprova antes do fix e passa depois, e o retorno diz isso
- Os guardas de fonte do repositório que leem os arquivos tocados seguem passando (`animacaoRespeitaMovimento`, `AdminLayout.test.tsx` e os demais da tabela *Os guardas*); nenhum se conserta afrouxando a asserção
- O observador e o ouvinte de `resize` são desligados ao desmontar
- Todo texto novo em português, com acentuação

### Não faça

- Não tire o `flex-wrap` da fila de ações nem da linha de fora (é o fix do BUG-004)
- Não altere `AdminLayout.tsx`, a barra do celular nem o `main`
- Não altere `HomeSectionEditor.tsx`, `CampaignOffersEditor.tsx` nem os outros consumidores
- Não mude a altura do "Salvar seção" nem o rótulo dos botões

### Pronto quando

- [ ] BUG-007: a 390 × 844 com a fonte a 200 %, a barra do editor não gruda no topo, e por isso não cobre a lista de peças, o foco nem o toque nos controles das peças
- [ ] a 100 % e a 130 % a barra continua grudada como hoje
- [ ] o BUG-004 não volta (a fila de ações segue quebrando linha)
- [ ] os outros formulários que usam `FormPageHeader` seguem com os testes deles passando
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
