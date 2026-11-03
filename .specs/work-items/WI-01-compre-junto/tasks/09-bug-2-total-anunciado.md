## 09 · [apps/store] BUG-002 — [Bloco Compre junto] O novo total do conjunto não é anunciado para quem usa leitor de tela

**Status:** done

`RNF-06` — WI-01

**Objetivo.** Cada vez que o total do conjunto muda (marcar ou desmarcar um adicional, escolher a variação, mudar a variação ou a quantidade do principal), quem usa leitor de tela ouve o novo total, sem precisar navegar até o rodapé do bloco ou até a barra fixa.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` da raiz › O "defeito 01", › Os guardas, › Convenções, › Baselines; `apps/store/CLAUDE.md` › Página do produto. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** as tarefas 03, 04, 07 e 08 (o bloco, a barra fixa, a forma do bloco e a reserva). Confira que existem.

### Critérios de aceite

### BUG-002 — [Bloco Compre junto] O novo total do conjunto não é anunciado — para quem usa leitor de tela

# BUG-002 · [Bloco Compre junto] O novo total do conjunto não é anunciado — para quem usa leitor de tela

## Resumo

A cliente que usa teclado e leitor de tela marca um adicional e escolhe a variação. Ela ouve o nome da
caixa ("Levar junto: QA Berloque Coração, Prata 925"), mas não ouve o novo total. O "Total do conjunto"
passa de R$ 349,80 para R$ 419,70 sem nenhum anúncio. Para saber quanto vai pagar, ela precisa voltar
pela página até o rodapé do bloco ou até a barra fixa. Ela esperava ouvir o total a cada marca, como ouve
a mensagem de falta.

**Origem:** sessão CH-07 · ambiente local (dev server, Supabase local)

## Impacto

- **Nível:** Fricção, subida um degrau por estar num passo principal de uma jornada P0
- **Persona mais atingida:** PER-03 Helena (teclado, zoom 200 %, leitor de tela) — outras: nenhuma
- **Jornada e passo:** J-01, passo 4 (escolhe a peça e o comprimento)
- **Frequência:** sempre (3 de 3: Correntes, Berloque, Medalha)
- **Contorno:** voltar com a navegação até "Total do conjunto" ou até a barra fixa
- **Gravidade proposta na sessão:** medium. Subi para high pela regra de ajuste: é Fricção no passo do
  preço de uma jornada P0, e para esta persona o valor que ela vai pagar fica fora do que é anunciado

## Ambiente

- **URL:** http://localhost:8082/produtos/qa-pingente-estrela
- **Tela:** página do produto · **Componente:** bloco Compre junto (rodapé "Total do conjunto") e barra fixa
- **Branch / build:** feature/WI-01 (HEAD 415af2b5) · dev server Vite
- **Browser:** Chromium headless (Playwright MCP), versão não registrada · **Viewport:** 720 × 450 (1440 a 200 %)
- **Rede:** local, sem limitação · **Idioma:** pt-BR

## Passos

1. Anônima, sacola vazia, abrir http://localhost:8082/produtos/qa-pingente-estrela (forma do bloco "Na linha")
2. Só com o teclado, marcar "Levar junto: QA Berloque Coração" com Espaço
3. Tab até "Prata 925" e Espaço
4. Observar as regiões vivas da página (`aria-live`, `role=status`, `role=alert`) enquanto o total muda

## Esperado

O total muda num elemento anunciado (`status` ou região viva).

**Fonte:** TC-CFR-002, passo 3 e meta "mensagem de falta e total: anunciados (`status`/`alert`/região
viva)"; PRD RNF-06 (bloco acessível por teclado e leitor de tela)

## Observado

"Total do conjunto" passa de R$ 349,80 para R$ 419,70, e a barra fixa passa para "R$ 419,70 · Conjunto ·
3 peças". O valor está num parágrafo sem `aria-live` nem papel de status, e nenhuma região viva muda
durante a troca. O único nó vivo com texto na página é um contador "1". A mensagem de falta, em
contraste, é anunciada (`alert` "Falta uma escolha em 1 peça. Ela está marcada acima.").

## Evidência

- `screenshots/CH-07-06-total-sem-anuncio-720.png` — total R$ 419,70 com o Berloque marcado

## Relacionados

- **TC:** TC-CFR-002
- **Charter:** CH-07
- **Critério:** RNF-06
- **Protótipo:** nenhum
- **Bugs:** BUG-005 (o mesmo rodapé de total, fora do protótipo)

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `BuyTogetherBlock` (`apps/store/src/entities/product/ui/buy-together/BuyTogetherBlock.tsx`) | JÁ EXISTE. Ganha a região viva do total | `state: BuyTogether` (sem mudança) | o mesmo bloco, mais uma região `role="status"` |
| `useBuyTogether` (`apps/store/src/entities/product/model/useBuyTogether.ts`) | JÁ EXISTE. Consuma `total`, `markedCount`; não altere | | |
| `ProductBuyBar` (`apps/store/src/widgets/product-buy-bar/ui/ProductBuyBar.tsx`) | JÁ EXISTE. Não ganha região viva | | |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-002 · [Bloco Compre junto] O novo total do conjunto não é anunciado — para quem usa leitor de tela · high
- **Fechamento**: a tarefa fecha com o fix do bug; ele segue `open` até o reteste do QA
- **Causa raiz (a conferir)**: o rodapé "Total do conjunto" (`BuyTogetherBlock.tsx:58-78`) é um parágrafo comum e só é MONTADO quando `markedCount > 0`; não há região viva no bloco, e uma região viva montada junto com o texto não é anunciada pelos leitores de tela (a região precisa existir no DOM antes da mudança).
- **Direção escolhida (premissa do orquestrador, sem humano)**: uma região `role="status"` (polida) visualmente oculta (`sr-only`), montada sempre que o bloco está pronto (independente de haver marcação), dentro da `<section>` do bloco. O texto dela é derivado do mesmo `total`/`pix` que o rodapé desenha: com o total presente, "Total do conjunto: R$ X" e, havendo PIX, ", R$ Y com Pix"; sem marcação, vazio. Uma região só: a barra fixa mostra o mesmo valor e NÃO ganha uma segunda (duas regiões leriam o total duas vezes). O rodapé visível não muda de aparência. O texto respeita o tom memorial (`tomDoCompreJunto.test.ts`).

### Testes

- a região `role="status"` do bloco existe no DOM antes de qualquer marcação (vazia) — pela página real ou pelo bloco renderizado com o estado real
- marcar um adicional com variação escolhida põe o total novo na região, com o mesmo valor que o rodapé desenha; trocar a variação ou marcar outro atualiza o texto na MESMA região (o nó não é recriado)
- desmarcar tudo esvazia a região
- com PIX ligado, o texto inclui o valor com Pix; com PIX desligado, não
- a barra fixa não tem região viva própria com o total (uma região só)

### Não faça

- Não mude a aparência nem o texto visível do rodapé "Total do conjunto"
- Não ponha `aria-live` no rodapé que monta e desmonta (não anuncia)
- Não mexa nos outros bugs da QA (BUG-001, BUG-003..013) — em especial BUG-005 (o desenho do rodapé)

### Pronto quando

- [ ] o total novo é posto numa região viva que já existia antes da mudança
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
