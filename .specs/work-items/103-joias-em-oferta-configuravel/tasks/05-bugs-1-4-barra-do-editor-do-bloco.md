## 05 · [apps/backoffice] BUG-001, BUG-004 — editor do bloco "Joias em oferta" · barra do topo do editor

**Status:** done

`CA-01.2, RNF-04 (lado do editor)` — WI 103 · correção da rodada 1 de QA

**Objetivo.** No editor do bloco "Joias em oferta", gravar com peça acrescentada dá o recibo "Salvo" como os outros editores da Home, e a barra Cancelar/Salvar cabe em 390 px com a fonte a 200 %.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` › Feature-Sliced Design, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines · `apps/backoffice/CLAUDE.md` › Molde dos formulários, › `/admin/home` — a composição, › Gravar NÃO desmonta a tela (VIV-05), › O movimento do painel, › A ponte da prévia · `packages/core/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

### Critérios de aceite

### BUG-001 — [Editor do bloco] Gravar com peça acrescentada não dá "Salvo" e segue "Alterações não salvas"

#### Resumo

Adri escolhe as peças do bloco "Joias em oferta", escreve o título e clica em "Salvar seção". A gravação
acontece — a loja passa a mostrar o bloco com as peças dela, e reabrir o editor traz tudo salvo —, mas o editor
não mostra o recibo "Salvo": o cabeçalho continua "Alterações não salvas", sem mensagem nem alerta. Ela esperava
o "Salvo" que os outros editores da Home dão; a tela diz o contrário do que aconteceu.

**Origem:** sessão CH-01 · local (painel http://localhost:8083)

#### Impacto

- **Nível:** Dano à confiança
- **Persona mais atingida:** PER-01 Adri — outras: nenhuma
- **Jornada e passo:** J-01, passo 8 (salvar); também J-03, passo 4 (salvar o bloco da próxima campanha)
- **Frequência:** sempre que a gravação acrescenta peça (4 de 4 em três sessões). Gravações sem peça nova
  mostraram "Salvo": só com a campanha (CH-01 passo 05), sem peças (CH-06 passo 07) e só tirando peças (CH-05
  passos 09, 13 e 17)
- **Contorno:** recarregar o editor ou abrir a loja para conferir que gravou
- **Gravidade proposta na sessão:** high — mantida. A persona tem "zero paciência para 'salvou?' sem resposta" e
  tende a salvar de novo, sair achando que perdeu, ou ir conferir na loja

#### Ambiente

- **URL:** http://localhost:8083/admin/home/<id do bloco>
- **Tela:** editor do bloco "Joias em oferta" · **Componente:** barra do topo do editor (indicador "Alterações
  não salvas" e "Salvar seção")
- **Branch / build:** feature/103 (worktree store__feature-103; build não exposto pela sessão)
- **Browser:** Chromium (agent-browser 0.39.1, headless) · **Viewport:** 1440 × 900
- **Rede:** local, sem limitação · **Idioma:** pt-BR

#### Passos

1. Como PER-01 Adri, conta `admin-loja`, entrar no painel e abrir Loja → Home (`/admin/home`); abrir o bloco
   "Joias em oferta" que já tem a campanha "Dia das Mães" salva e nenhuma peça escolhida
2. Em Peças escolhidas, acrescentar uma ou mais peças pela busca "Acrescentar uma peça" (ex.: "6 Corações",
   "Amor Mãe", "Colméia")
3. Clicar uma vez em "Salvar seção" e esperar 25 s
4. Ver o cabeçalho do editor

#### Esperado

O recibo "Salvo" no lugar de "Alterações não salvas", com o editor e a prévia na tela, como nos outros editores
da Home.

**Fonte:** PRD CA-01.2 · TC-FUNC-006 passo 1 · TC-JOURNEY-001 passo 5

#### Observado

O cabeçalho continua "Alterações não salvas" e o botão "Salvar seção ⌘S"; nenhum "Salvo", nenhuma mensagem,
nenhum alerta (25 s de espera). Console sem erro. A rede mostra a gravação concluída: `DELETE
/rest/v1/home_section_items → 204`, `POST /rest/v1/home_section_items → 201`, `GET /rest/v1/home_sections → 200`.
A loja sem login mostra o bloco com o título, a descrição e as peças na ordem salva, e reabrir o editor traz
tudo, sem "Alterações não salvas". Duplo clique no Salvar também grava uma vez só, sem duplicar peça.

#### Evidência

- `screenshots/CH-01-09-editor-sem-recibo-salvo.png` — o editor depois de salvar, ainda "Alterações não salvas"
- `screenshots/CH-01-10-loja-bloco-salvo-390.png` — a loja com o bloco gravado (o que prova que salvou)
- `screenshots/CH-04-06-b2-salvo-sem-recibo.png` — o mesmo no bloco de "Natal", com duas peças
- `screenshots/CH-05-01-editor-salvo-p-nb.png` — o mesmo ao acrescentar cinco peças a B-1

#### Ocorrências

| Sessão | Persona      | Passo                                                                 | Evidência                                         |
| ------ | ------------ | --------------------------------------------------------------------- | ------------------------------------------------- |
| CH-01  | PER-01 Adri  | 10 — três peças, título e descrição; duplo clique e depois um clique  | `screenshots/CH-01-09-editor-sem-recibo-salvo.png` |
| CH-04  | PER-01 Adri  | 07 — bloco novo de "Natal" com duas peças, um clique                  | `screenshots/CH-04-06-b2-salvo-sem-recibo.png`     |
| CH-05  | PER-01 Adri  | 02 — cinco peças acrescentadas a B-1, um clique                       | `screenshots/CH-05-01-editor-salvo-p-nb.png`       |

#### Relacionados

- **TC:** TC-FUNC-006 (fail), TC-JOURNEY-001 (fail); visto também em TC-FUNC-011
- **Charter:** CH-01 · CH-04 · CH-05
- **Critério:** CA-01.2 (quebra)
- **Protótipo:** nenhum
- **Bugs:** nenhum

### BUG-004 — [Editor do bloco] Fonte a 200 % no celular empurra "Salvar seção" para fora da tela

#### Resumo

Com a fonte do sistema a 200 % no celular, a dona abre o editor do bloco "Joias em oferta" para salvar. A barra
do topo, com Cancelar e "Salvar seção", não quebra linha: o botão "Salvar seção" fica com mais da metade fora da
tela e o editor inteiro passa a rolar de lado. Ela precisa arrastar a página para achar o Salvar. A 130 % e a
100 %, o editor cabe.

**Origem:** sessão CH-07 · local (painel http://localhost:8083)

#### Impacto

- **Nível:** Fricção
- **Persona mais atingida:** quem usa a fonte do sistema a 200 % no celular (sem persona própria no plano; o CFR
  a cobre) — PER-01 Adri na condição do CFR
- **Jornada e passo:** J-01, passo 8 (salvar o bloco)
- **Frequência:** sempre (2 de 2), só a 200 %
- **Contorno:** arrastar a página de lado até o botão; ou reduzir a fonte
- **Gravidade proposta na sessão:** medium — mantida. A subida de um degrau por jornada P0 não se aplica: a
  persona de J-01 trabalha no notebook (1440 × 900); o defeito só existe em 390 px com a fonte a 200 %, condição
  do CFR fora da persona da jornada. Ela conclui, com esforço

#### Ambiente

- **URL:** http://localhost:8083/admin/home/<id do bloco>
- **Tela:** editor do bloco "Joias em oferta" · **Componente:** barra do topo do editor (Cancelar e "Salvar
  seção")
- **Branch / build:** feature/103 (worktree store__feature-103; build não exposto pela sessão)
- **Browser:** Chromium (agent-browser 0.39.1, headless) · **Viewport:** 390 × 844, fonte da raiz a 200 %
- **Rede:** local, sem limitação · **Idioma:** pt-BR

#### Passos

1. Como PER-01 Adri, conta `admin-loja`, num celular de 390 × 844, entrar no painel e abrir Loja → Home
2. Abrir o bloco "Joias em oferta" da campanha "Dia das Mães"
3. Aumentar a fonte do sistema (tamanho da fonte da raiz da página) para 200 %
4. Procurar o botão "Salvar seção" no topo

#### Esperado

Em 390 px o editor não rola na horizontal e continua usável com a fonte a 200 %; o "Salvar seção" fica ao
alcance sem rolar de lado.

**Fonte:** PRD RNF-04 ("Em 390 px o bloco e o editor não rolam na horizontal; o editor continua usável com a
fonte do sistema a 200 %") · TC-CFR-001 passo 1 · test-plan › Ambiente ("nenhuma rolagem horizontal do corpo")

#### Observado

A página mede 541 px de largura numa janela de 390 (151 px de rolagem lateral). A barra do topo (Cancelar +
"Salvar seção") não quebra linha; "Salvar seção" ocupa de x 248 a x 541. O resto do editor quebra bem: título,
descrição, seletor de campanha e a lista de peças cabem; subir/descer medem 88 × 88. A 130 % não há rolagem
(Salvar em x 162–353).

#### Evidência

- `screenshots/CH-07-01-editor-390-200.png` — o editor a 200 %, com a barra do topo estourando a tela

#### Perspectiva da persona

Quem precisa da fonte grande no celular já lê com esforço; descobrir que o botão principal da tela está
escondido à direita, sem nada indicar que há conteúdo ali, custa tempo e dá a impressão de que o painel não foi
feito para ela. Ela chega ao Salvar arrastando, mas no último passo da tarefa.

**Risco de abandono:** médio — o botão está meio visível e a rolagem lateral acha o resto; quem não percebe a
metade cortada pode desistir de salvar no celular e deixar para o notebook.

#### Relacionados

- **TC:** TC-CFR-001 (fail)
- **Charter:** CH-07
- **Critério:** RNF-04 (quebra)
- **Protótipo:** nenhum
- **Bugs:** BUG-001 (mesma barra do topo, recibo "Salvo") · BUG-003 (mesmo sintoma, rolagem horizontal em 390,
  na Home da loja)

### Contrato

| Item | Dono |
| ---- | ---- |
| `apps/backoffice/src/features/home-composition/ui/HomeSectionEditor.tsx` — a página do editor, o `FormPageHeader` com o selo de pendência e o `Salvo` | ALTERA, se a causa estiver aqui |
| `apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.tsx` — o editor do bloco, o rascunho e o que ele informa como alterado | ALTERA, se a causa estiver aqui |
| `apps/backoffice/src/shared/ui/FormPageHeader.tsx` — a barra do topo, usada por outros cinco formulários do painel | ALTERA só o necessário para caber em 390 px a 200 %; os outros consumidores não podem mudar de comportamento |
| `supabase` / `home_sections` / `home_section_items` — a gravação | JÁ EXISTE. Consuma; não altere (a gravação funciona: só o recibo falha) |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-001 · [Editor do bloco] Gravar com peça acrescentada não dá "Salvo" e segue "Alterações não salvas" · high
- **Bug**: BUG-004 · [Editor do bloco] Fonte a 200 % no celular empurra "Salvar seção" para fora da tela · medium
- **Lote**: mesma tela `/admin/home/<id>` e mesmo componente, a barra do topo do editor — o indicador de alterações e o "Salvar seção" (`HomeSectionEditor.tsx` › `FormPageHeader`)
- O recibo é o mesmo dos outros editores da Home: "Salvo" sem desmontar a prévia (CA-01.2, VIV-05 de `apps/backoffice/CLAUDE.md`). Não invente um recibo novo
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA
- Sem causa raiz presumida: o bug diz o sintoma; o diagnóstico é de quem executa

### Testes

- (componente, jsdom) gravar o bloco com uma peça acrescentada ao rascunho termina com "Salvo" e sem "Alterações não salvas"; e mexer num campo depois disso volta a mostrar a pendência
- (componente, jsdom) as gravações que já davam "Salvo" (só a campanha, sem peças, só tirando peças) continuam dando
- (fonte) a barra do topo deixa de forçar largura maior que a tela: o que a faz estourar a 390 px com a fonte a 200 % é corrigido por classe (quebra de linha ou `min-w-0`/`flex-wrap`), conferido por leitura das classes — jsdom não mede layout, e a medida real é do reteste do QA

### Obrigações

- Teste antes do código: o teste do comportamento do bug reprova antes do fix e passa depois, e o retorno diz isso
- Os guardas de fonte do repositório que leem os arquivos tocados seguem passando (tabela *Os guardas* do `CLAUDE.md`); nenhum se conserta afrouxando a asserção
- Todo texto novo em português, com acentuação e no tom memorial (sem urgência nem exclamação)

### Não faça

- Não altere a linha do bloco na lista (`HomeSectionRow.tsx`, `HomeSectionList.tsx`) nem `entities/campaign/**`: são das fix tasks 06 e 08
- Não altere a conferência das peças marcadas ("Conferindo as peças marcadas na campanha…" em `CampaignOffersEditor.tsx`): é da fix task 08
- Não mude a altura do "Salvar seção" (40 px): é sugestão de backlog, fora deste lote
- Não acrescente `maxLength` nem recusa ao digitar no título e na descrição (decisão I-06)

### Pronto quando

- [ ] BUG-001: gravar com peça acrescentada mostra "Salvo" e tira "Alterações não salvas", com o editor e a prévia na tela
- [ ] BUG-004: a 390 px com a fonte a 200 %, Cancelar e "Salvar seção" ficam dentro da tela e o editor não rola de lado
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
