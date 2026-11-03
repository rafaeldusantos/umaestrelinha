## 08 · [apps/store] BUG-001 — [Página do produto] Com rede lenta, o bloco Compre junto empurra o botão de compra duas vezes

**Status:** done

`RNF-02` — WI-01

**Objetivo.** Com rede lenta, a coluna de informação da página do produto aparece já com o bloco Compre Junto no lugar (ou sem ele, quando não há adicional), e o botão de compra e a linha de estoque não mudam de posição depois.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` da raiz › O "defeito 01", › Os guardas, › Convenções, › Baselines; `apps/store/CLAUDE.md` › Página do produto, › A home não salta. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** as tarefas 03, 04 e 07 (o bloco, o botão único e a forma do bloco). Confira que existem.

### Critérios de aceite

### BUG-001 — [Página do produto] Com rede lenta, o bloco Compre junto empurra o botão de compra duas vezes


# BUG-001 · [Página do produto] Com rede lenta, o bloco Compre junto empurra o botão de compra duas vezes

## Resumo

A cliente abre a página de um pingente com Compre Junto numa rede lenta. A página aparece inteira sem
nenhum espaço reservado para o bloco. Dois segundos depois surge um esqueleto e empurra o resto da
coluna. Mais dois segundos e chega o bloco de verdade, maior que o esqueleto, e empurra tudo de novo. O
botão "Adicionar à sacola" anda cerca de 520 px debaixo do dedo ou do cursor, em dois saltos. Ela
esperava que o espaço do bloco já estivesse reservado e que o botão e a linha de estoque não saíssem do
lugar.

**Origem:** sessão CH-07 · ambiente local (dev server, Supabase local)

## Impacto

- **Nível:** Fricção, subida um degrau por estar no passo 1 de uma jornada P0
- **Persona mais atingida:** PER-01 Marina (celular, rede móvel) — outras: PER-03 Helena (zoom 200 %, foco no botão)
- **Jornada e passo:** J-01, passo 1 (abre a página do pingente)
- **Frequência:** sempre, com rede lenta (2 de 2 em 390 e 1 de 1 em 1440)
- **Contorno:** esperar a página parar de se mexer antes de tocar
- **Gravidade proposta na sessão:** medium. Subi para high pela regra de ajuste: é Fricção no primeiro
  passo da jornada P0, na página de maior tráfego, onde ~90 % dos acessos vêm do celular. O CLS medido da
  carga foi 0,929 em 390 e 0,843 em 1440

## Ambiente

- **URL:** http://localhost:8082/produtos/qa-pingente-estrela
- **Tela:** página do produto · **Componente:** bloco Compre junto (estado carregando)
- **Branch / build:** feature/WI-01 (HEAD 415af2b5) · dev server Vite, não build de produção
- **Browser:** Chromium headless (Playwright MCP), versão não registrada · **Viewport:** 390 × 844 e 1440 × 900
- **Rede:** cada requisição a `/rest/v1/` atrasada 1,8 s (não é o perfil Slow 4G) · **Idioma:** pt-BR

## Passos

1. Anônima, sacola vazia, com rede lenta (cada requisição a `/rest/v1/` atrasada uns 2 s)
2. Abrir http://localhost:8082/produtos/qa-pingente-estrela em 1440 × 900 (ou 390 × 844)
3. Acompanhar a posição do botão "Adicionar à sacola" da coluna de informação e da linha "Em estoque"
   até a página parar de se mexer

## Esperado

O esqueleto ocupa o lugar do bloco desde que a coluna aparece, com a altura reservada (`aria-busy`). O
botão de compra e a linha de estoque não mudam de posição quando o bloco chega.

**Fonte:** PRD RNF-02 ("enquanto carregam, o espaço do bloco fica reservado (sem salto)"); costura ›
Loja › Estados ("carregando (`aria-busy`, altura mínima reservada de 320 px…)"); TC-CFR-003 (meta
"deslocamento do botão de compra quando o bloco chega: nenhum")

## Observado

- ~2,0 s: produto pintado sem esqueleto do bloco. "Adicionar à sacola" em y 584 (1440). Em 390, "Em
  estoque" em y 978
- ~3,9 s: aparece o esqueleto `aria-busy` de 320 px e empurra o botão para y 928 (390: "Em estoque" para 1322)
- ~5,7 s: o bloco real (497 px em 1440, 517 px em 390, sem nada marcado) troca o esqueleto e empurra o
  botão para y 1104 (390: para 1518)
- CLS da carga: 0,843 (1440) e 0,929 (390), contando a página inteira
- Com M-04 (joia sem Compre Junto) não aparece esqueleto e "Em estoque" fica parado em y 836: o salto vem
  só do bloco
- Rede: a leitura dos adicionais só começa depois que a do produto termina

## Evidência

- `screenshots/CH-07-07-esqueleto-390-rede-lenta.png` — o esqueleto que surge com a página já pintada

## Relacionados

- **TC:** TC-CFR-003
- **Charter:** CH-07
- **Critério:** RNF-02
- **Protótipo:** loja, `Produto - Compre Junto.html` (estado carregando)
- **Bugs:** nenhum

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `useBuyTogetherData` (`apps/store/src/entities/product/api/useBuyTogetherData.ts`) | JÁ EXISTE. Muda por dentro; a forma do retorno (`status`, `addons`, `lists`, `products`) fica | o slug da joia (era o id) | a mesma forma |
| `product_buy_together` e as FKs `product_buy_together_product_id_fkey`, `…_target_product_id_fkey`, `…_list_id_fkey` | JÁ EXISTE. Consuma; não altere | | |
| `ProductPage` (`apps/store/src/pages/ProductPage.tsx`) | JÁ EXISTE. Ganha a espera pelo Compre Junto | | |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-001 · [Página do produto] Com rede lenta, o bloco Compre junto empurra o botão de compra duas vezes · high
- **Fechamento**: a tarefa fecha com o fix do bug; ele segue `open` até o reteste do QA
- **Diagnóstico de quem abriu a tarefa (a conferir)**: a leitura é uma cascata de três idas ao banco — o produto (`useProduct`, por slug), depois a configuração (`useBuyTogetherData`, por `product.id`, só quando o produto chega) e depois os produtos dos adicionais (`useProductsByIds`, só quando a configuração chega). A página pinta depois da primeira; o esqueleto de 320 px entra depois da segunda; o bloco real, maior que o esqueleto, depois da terceira.
- **Direção escolhida (premissa do orquestrador, sem humano)**: (1) uma consulta só para o Compre Junto — a configuração com os produtos dos adicionais e das peças das listas embutidos (`PRODUCT_CARD_SELECT` dentro dos embeds da FK nomeada), filtrada pelo slug da joia (`!inner` na FK `product_buy_together_product_id_fkey`), para começar junto com a consulta do produto em vez de esperar por ela; (2) a `ProductPage` segura o corpo enquanto essa consulta ainda não respondeu pela primeira vez (o mesmo marcador `aria-busy` de quando o produto carrega), e o solta na resposta, no erro ou na primeira falha (sem esperar as novas tentativas do React Query). Assim a coluna nasce com o bloco já no tamanho real, sem esqueleto nem salto, e a primeira pintura não ganha ida ao banco: as duas consultas correm em paralelo. Joia sem adicional: a consulta volta vazia junto com o produto e a página fica como hoje. Provado o embed contra o banco local (curl em `/rest/v1/product_buy_together` com `main.slug=eq.qa-pingente-estrela`: 3 adicionais, as 5 peças da lista e os 2 alvos embutidos).

### Testes

- a leitura do Compre Junto é UMA ida ao banco, filtrada pelo slug, com os produtos embutidos, e devolve a mesma forma de antes (o principal fora dos produtos, peça fora do ar ausente) — unitário do hook contra o client dublado
- o hook diz "carregando" até a primeira resposta, e deixa de dizer na primeira falha
- a página não mostra a coluna de informação enquanto o Compre Junto não respondeu, e mostra quando ele responde, falha ou volta vazio — pela página real

### Não faça

- Não mude o PRODUCT_SELECT nem a consulta do produto (ele é compartilhado com listagem e recuperação de carrinho)
- Não reserve espaço na página de toda joia (a joia sem Compre Junto não pode ganhar salto)
- Não mexa nos outros bugs da QA (BUG-002..013)

### Pronto quando

- [ ] a consulta do Compre Junto começa junto com a do produto, e chega com os produtos dos adicionais
- [ ] a página só mostra a coluna de informação com o Compre Junto resolvido; erro ou falha não segura a página
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
