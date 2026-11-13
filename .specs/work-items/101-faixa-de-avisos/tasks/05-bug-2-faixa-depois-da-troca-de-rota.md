## 05 · [apps/store] BUG-002 — [Faixa da loja] Ligada, não aparece ao navegar a partir de página servida sem ela — a cliente

**Status:** done

`UC-01 · RN-02 · CA-08` — 101

**Objetivo.** Depois da primeira troca de rota no navegador, quem decide se a faixa existe é a configuração, qualquer
que seja o `data-faixa` com que a página de entrada chegou. Vale nos dois sentidos: `"0"` com a faixa ligada passa a
mostrá-la, e `"1"` com a faixa desligada passa a escondê-la.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `apps/store/CLAUDE.md › O HTML servido — a função api/page`
(o atributo `data-faixa`) e as seções que falam da faixa de avisos e de `A home não salta enquanto carrega`;
`CLAUDE.md › Feature-Sliced Design` · `CLAUDE.md › Os guardas — o que trava o quê` · `CLAUDE.md › Baselines`. Divergindo
desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

### Critérios de aceite

### BUG-002 — [Faixa da loja] Ligada, não aparece ao navegar a partir de página servida sem ela — a cliente


## Resumo

A Adri ligou a faixa da Black Friday. A primeira página que a cliente abre ainda é a guardada de antes da troca,
marcada como "sem faixa". Até aí está certo: na carga, a página não mostra a faixa. Depois, a cliente toca num link
da loja e vai para outra página. A faixa deveria aparecer a partir daí, mas não aparece, nem nessa página nem em
nenhuma outra da visita. Quem chega por uma página antiga atravessa a loja inteira sem ver a campanha. A Adri,
conferindo a loja, conclui que a faixa não funcionou.

**Origem:** sessão CH-05

## Impacto

- **Nível:** Dano à confiança. Nada quebra na tela, mas a campanha que a dona ligou não aparece para quem navega a
  partir de uma página antiga. A dona, ao conferir, tende a achar que não funcionou e a desligar e religar a faixa
  (hipótese de fricção 2 da PER-01)
- **Persona mais atingida:** PER-01 Adri. Outras: PER-02 Bia, que no intervalo do cache não descobre a campanha
  durante a visita (J-02)
- **Jornada e passo:** J-05, ramo J-05a (religar com páginas antigas no cache). Também afeta J-02, passo 1 (ver a
  campanha) para quem entra por uma página antiga
- **Frequência:** às vezes. Acontece no intervalo entre ligar a faixa e o cache renovar a página de entrada. Na
  simulação local, reproduziu 2 de 2 vezes
- **Contorno:** recarregar a página quando a versão no cache já estiver renovada. A cliente não sabe que precisa
  fazer isso
- **Gravidade proposta na sessão:** high · mantida

## Ambiente

- **URL:** http://localhost:8082/ → http://localhost:8082/busca (troca de rota, sem recarga)
- **Tela:** loja › Home e a página seguinte (Busca) · **Componente:** faixa de avisos da loja (a região "Avisos da
  loja", acima do cabeçalho)
- **Branch / build:** `feature/101` (último commit da fila `fe757bc5`), em dev local. O build não é exposto
- **Browser:** Chromium headless (agent-browser 0.39.1) · **Viewport:** 390 × 844
- **Rede:** local, sem limite · **Idioma:** pt-BR
- **Simulação:** localmente, a função que marca o documento não serve páginas. A página antiga do cache é simulada
  interceptando o documento da Home e devolvendo o HTML com `data-faixa="0"` no `<html>`, como a função faz. Esse é
  o método decidido em Q-02 do plano. As rotas `*.supabase.co` e `**/g/collect*` estavam abortadas

## Passos

1. Como PER-01 Adri, na conta `admin-loja`, deixar a faixa **ligada** no painel com os avisos (por exemplo, A1
   "Black Friday · novembro inteiro com joias em oferta · Ver ofertas") e salvar pela tela
2. Na loja, sem login, em 390 × 844: fazer a Home ser servida como a página guardada de antes de a faixa ligar.
   Localmente, interceptar só o documento de `http://localhost:8082/` e responder com o HTML da Home com
   `data-faixa="0"` no `<html>`
3. Abrir `http://localhost:8082/`. Não aparece faixa e o cabeçalho fica no topo. Isso está correto: na carga, o
   atributo decide
4. Tocar em "Novidades" (ou "Coleções") no rodapé, o que leva a `/busca` sem recarregar a página
5. Olhar o topo da página nova, e depois tocar em "Início" para voltar a `/`

## Esperado

Na página nova (passo 5), a faixa aparece acima do cabeçalho com os avisos ligados. Pela regra, na carga quem decide
é o atributo, e a partir da primeira troca de rota quem decide é a configuração. A troca de página já move o
conteúdo, então a faixa aparecer ali não é salto.

**Fonte:** spec H-03 ("A partir da primeira troca de rota no navegador, decide a configuração"), I-09. PRD RN-02 e
CA-08 ("depois de ligar, a faixa aparece em produto e categoria em até 5 minutos"). TC-FUNC-010, passo 4

## Observado

Em `/busca`, e de volta em `/`, não aparece nenhuma faixa. O `<header>` fica em y = 0 e
`document.documentElement.dataset.faixa` continua `"0"`. Uma navegação pelo link "Coleções" reproduziu o mesmo
resultado. No controle, o mesmo browser sem o atributo, recarregando `/`, mostra a faixa com o A1 em menos de 0,5 s
(`<header>` em y = 52). A configuração está ligada e chega à loja, mas não passa a decidir depois da troca de rota.

## Evidência

- `screenshots/CH-05-01-home-marcada-0-ligada.png`: a Home marcada `"0"`, sem faixa (estado de partida correto)
- `screenshots/CH-05-02-nav-interna-faixa-aparece.png`: depois da troca de rota para `/busca`, sem faixa. O nome
  do arquivo descreve o esperado, e a imagem prova o observado
- `screenshots/CH-05-03-nav-interna-sem-faixa-repro.png`: a segunda reprodução, pelo link "Coleções"

## Relacionados

- **TC:** TC-FUNC-010
- **Charter:** CH-05
- **Critério:** RN-02, CA-08 (prd). Spec H-03 e I-09
- **Protótipo:** não se aplica
- **Bugs:** nenhum. O caso simétrico (faixa desligada com a página marcada `"1"` e a vaga que deveria sumir na troca
  de rota) não foi testado, e está nos riscos do `qa-result.md`

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `apps/store/src/widgets/announcement-bar/model/useAnnouncementBar.ts › useAnnouncementBar` | JÁ EXISTE. É aqui que o bug mora: o atributo da carga, a chave da carga (`CHAVE_DA_CARGA`) e a trava `navegou` | `useLocation().key`, o atributo do `<html>`, a configuração publicada | `{ visible, items, preview, show }` |
| `@estrelinha/core/announcements › announcementBarExists` · `@estrelinha/core/page › ANNOUNCEMENT_BAR_ATTRIBUTE` | JÁ EXISTE. Consuma; não altere | | |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-002 · [Faixa da loja] Ligada, não aparece ao navegar a partir de página servida sem ela — a cliente · high
- **Fechamento**: a tarefa fecha com o fix do bug; ele segue `open` até o reteste do QA
- **A regra** (spec H-03, I-09, verbatim da costura): "Na carga do documento, o atributo decide (`"1"` mostra a faixa,
  `"0"` não); ausente (dev, prévia, leitura que falhou) ⇒ decide a configuração. Com o atributo "existe" e a
  configuração sem aviso válido, a faixa fica na vaga, ouro e sem texto, até a próxima troca de rota. **A partir da
  primeira troca de rota no navegador, decide a configuração**." I-09: "Chave do histórico diferente da chave da carga
  do documento, mais uma trava no componente".
- **O caso simétrico entra nesta tarefa** (decisão do Gate 3): faixa desligada, página de entrada marcada `"1"`, troca
  de rota ⇒ a vaga some. É a mesma regra, e o teste prova os dois sentidos.
- **Voltar pelo histórico à entrada da carga não devolve a decisão ao atributo** (a trava já existente): continua
  valendo.
- Sem causa raiz presumida aqui: o sintoma está no bug; o diagnóstico é de quem executa. A observação da QA é que,
  depois da troca de rota, `dataset.faixa` continua `"0"` e a faixa não aparece — confira se o problema é a detecção da
  troca (chave), a leitura do estado, ou quem mais olha o atributo (o componente `AnnouncementBar.tsx`, o recolhimento
  do cabeçalho).

### Testes

- A página de entrada marcada `"0"` com a configuração ligada e válida: na carga, sem faixa; depois de navegar para
  outra rota pelo roteador, a faixa aparece com os avisos (teste de componente sobre o widget montado com um roteador
  de memória que navega — nunca recriando a composição à mão).
- A página de entrada marcada `"1"` com a configuração desligada: na carga, a vaga ocupa o lugar; depois de navegar,
  a vaga some.
- Voltar pelo histórico à entrada da carga depois de ter navegado: quem decide segue sendo a configuração.
- O teste novo reprova antes do conserto (vermelho primeiro) e passa depois.

### Não faça

- Não mexa em `packages/core/src/announcements/**` (é da fix task 06) nem na função `api/page`/`core/page`.
- Não mude o comportamento da carga (o atributo decide na primeira pintura) nem a prévia do painel.
- Não toque no `Header.tsx` além do que o diagnóstico provar necessário.

### Pronto quando

- [ ] com a entrada `"0"` e a faixa ligada, a primeira troca de rota mostra a faixa
- [ ] com a entrada `"1"` e a faixa desligada, a primeira troca de rota tira a vaga
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
