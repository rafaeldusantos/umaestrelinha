## 07 · [apps/store] BUG-003 — Home da loja · bloco "Joias em oferta" — fileira das peças escolhidas

**Status:** done

`RNF-04, CA-03.3` — WI 103 · correção da rodada 1 de QA

**Objetivo.** Em 390 px, a Home da loja com o bloco "Joias em oferta" não rola de lado: só a fileira das peças rola dentro dela.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` › Feature-Sliced Design, › O "defeito 01", › Convenções que valem em todo o repositório (Mobile; grade com item largo e `minmax(0, …)`), › Os guardas, › Baselines · `apps/store/CLAUDE.md` › Mobile, › A Home é dado, › Produtos em destaque / ProductCarousel, › A home não salta. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

### Critérios de aceite

### BUG-003 — [Home da loja] No celular a página rola de lado na fileira de Joias em oferta — visitante

#### Resumo

Marina abre a loja pela primeira vez no celular, desce até o bloco "Joias em oferta" e tenta passar as peças de
lado. Quem anda é a página inteira: a Home desliza 114 px para a esquerda, corta o bloco e deixa uma faixa vazia
à direita, enquanto a fileira fica parada. Ela esperava que só a fileira rolasse.

**Origem:** sessão CH-02 · local (loja http://localhost:8082)

#### Impacto

- **Nível:** Fricção, subida um degrau por estar numa jornada P0 (J-02) → severidade `high`
- **Persona mais atingida:** PER-02 Marina — outras: qualquer visitante no celular (≈90 % dos acessos)
- **Jornada e passo:** J-02, passo 2 (passar as peças escolhidas)
- **Frequência:** sempre (2 de 2 no CH-02; de novo no CH-07, a 100 % e a 200 % de fonte)
- **Contorno:** passar a fileira pelas setas; arrastar a página de volta
- **Gravidade proposta na sessão:** high — mantida. É a hipótese de fricção 1 da persona; ela conclui, mas a
  página "solta" no celular, na Home, superfície de primeira impressão

#### Ambiente

- **URL:** http://localhost:8082/
- **Tela:** Home da loja · **Componente:** bloco "Joias em oferta" — fileira das peças escolhidas
- **Branch / build:** feature/103 (worktree store__feature-103; build não exposto pela sessão)
- **Browser:** Chromium (agent-browser 0.39.1, headless) · **Viewport:** 390 × 844 (fonte a 100 % e a 200 %)
- **Rede:** local, sem limitação · **Idioma:** pt-BR

#### Passos

1. Sem login, num celular de 390 × 844, com o bloco "Joias em oferta" da campanha em vigência configurado com
   três peças escolhidas (as da massa: Colméia, 6 Corações, Amor Mãe e Bebê), abrir `http://localhost:8082/`
2. Descer até "Algumas das peças em oferta", no bloco "Joias em oferta"
3. Arrastar de lado sobre a fileira de peças

#### Esperado

A fileira rola na horizontal; o corpo da página não rola de lado em 390 px.

**Fonte:** PRD RNF-04 ("Em 390 px o bloco e o editor não rolam na horizontal") · CA-03.3 ("no celular rola na
horizontal") · TC-UI-001 passo 2 · TC-CFR-002 · test-plan › Ambiente ("nenhuma rolagem horizontal do corpo")

#### Observado

O documento mede 504 px de largura numa janela de 390: a página rola 114 px de lado. Com a fonte da página a
200 %, 568 px (178 px de rolagem). Ao arrastar sobre um cartão, quem andou foi a página; a fileira ficou na
posição 0. O elemento que ultrapassa a janela é o texto oculto "De" do preço riscado do 3º cartão da fileira
(Amor Mãe e Bebê), em x = 503 — os textos "De" dos cartões 1 e 2 ficam dentro da janela. Pela seta "Próximo", a
fileira anda.

#### Evidência

- `screenshots/CH-02-02-corpo-rola-de-lado-390.png` — a Home deslocada 114 px, com o bloco cortado
- `screenshots/CH-02-03-fileira-passada-390.png` — a tentativa de passar a fileira deslocou a página
- `screenshots/CH-07-02-home-390-200.png` — a Home a 200 % de fonte, rolando 178 px de lado

#### Ocorrências

| Sessão | Persona       | Passo                                    | Evidência                                          |
| ------ | ------------- | ---------------------------------------- | -------------------------------------------------- |
| CH-02  | PER-02 Marina | 02–03 — 390 × 844, fonte 100 % (2 de 2)  | `screenshots/CH-02-02-corpo-rola-de-lado-390.png`   |
| CH-07  | anonima (CFR) | 07 — 390 × 844, fonte 100 % (504 px)     | —                                                  |
| CH-07  | anonima (CFR) | 08 — 390 × 844, fonte 200 % (568 px)     | `screenshots/CH-07-02-home-390-200.png`             |

#### Relacionados

- **TC:** TC-UI-001 (fail), TC-CFR-002 (fail)
- **Charter:** CH-02 · CH-07
- **Critério:** RNF-04 (quebra); CA-03.3 (a fileira deve rolar no celular)
- **Protótipo:** nenhum (o bloco da loja segue o componente da WI 102)
- **Bugs:** BUG-004 (mesmo sintoma — rolagem horizontal em 390 — noutra tela, o editor do painel)

### Contrato

| Item | Dono |
| ---- | ---- |
| `apps/store/src/widgets/campaign-offers/ui/CampaignOffers.tsx` — o bloco e a fileira das peças escolhidas | ALTERA, se a causa estiver aqui |
| `apps/store/src/widgets/product-carousel/` — o `ProductCarousel` que a fileira usa, e o cartão da peça com o preço riscado (texto só para leitor de tela) | ALTERA só se a causa estiver nele; as outras fileiras da Home e da loja não podem mudar de desenho |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-003 · [Home da loja] No celular a página rola de lado na fileira de Joias em oferta — visitante · high
- **Lote**: sozinho — a Home da loja não divide arquivo com os outros lotes
- O texto escondido para leitor de tela continua existindo: corrigir é contê-lo, não apagá-lo
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA
- Sem causa raiz presumida: o bug diz o sintoma; o diagnóstico é de quem executa

### Testes

- (fonte ou componente) a fileira do bloco contém o seu conteúdo: o que fazia o texto escondido do preço riscado escapar da área recortada é corrigido, conferido por classe — jsdom não mede layout; a medida real (`scrollWidth` da página em 390 px, a 100 % e a 200 %) é do reteste do QA
- os guardas da loja que leem a fileira e o cartão (`ProductCarouselLayout.test.tsx`, `cardSkeletonBox.test.ts`, `homeComposition.test.tsx`) seguem passando

### Obrigações

- Teste antes do código: o teste do comportamento do bug reprova antes do fix e passa depois, e o retorno diz isso
- Os guardas de fonte do repositório que leem os arquivos tocados seguem passando (tabela *Os guardas* do `CLAUDE.md`); nenhum se conserta afrouxando a asserção
- Todo texto novo em português, com acentuação e no tom memorial (sem urgência nem exclamação)

### Não faça

- Não toque no painel (`apps/backoffice/**`): é das fix tasks 05, 06 e 08
- Não mude as setas da fileira (40 px, estado no início): é sugestão de backlog
- Não troque o `row`/`slider` da fileira nem a ordem das peças

### Pronto quando

- [ ] BUG-003: em 390 px, a 100 % e a 200 % de fonte, a página não rola de lado e só a fileira rola
- [ ] as outras fileiras da Home seguem iguais (os testes delas passando)
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
