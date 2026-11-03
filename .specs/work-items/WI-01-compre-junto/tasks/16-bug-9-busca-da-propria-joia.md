## 16 · [apps/backoffice] BUG-009 — [Painel · aba Compre junto do produto] Buscar a própria joia diz “Nenhuma peça com…”

**Status:** done

`CA-02.5` — WI-01

**Objetivo.** Na aba "Compre junto" do produto, a busca de peça de um adicional "Uma peça só" passa a **mostrar** a própria joia quando o termo a encontra, como linha **desabilitada** dizendo "É esta joia" — em vez de tirá-la do resultado e cair em "Nenhuma peça com …". O contador do catálogo passa a contá-la. As outras superfícies do `ProductSearchField` (produtos relacionados, Home, montagem do pedido) não mudam.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` da raiz › O "defeito 01", › Os guardas, › Convenções, › Baselines; `apps/backoffice/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** a tarefa 02 (`apps/backoffice/src/features/product-form/ui/BuyTogetherTab.tsx`, o `ProductChoice` que monta o `ProductSearchField` com `excluir={mainProductId ? [mainProductId] : undefined}`). Confira que existe.

### Critérios de aceite

### BUG-009 — [Painel · aba Compre junto do produto] Buscar a própria joia diz “Nenhuma peça com…”

O envelope completo está em `qa/issues/BUG-009.md`. Corpo, íntegro:

## Resumo

A dona está na aba "Compre junto" de uma joia, acrescenta um adicional "Uma peça só" e busca pelo nome da
própria joia. O painel responde "Nenhuma peça com “QA Joia Sem Compre”. Procure por outra palavra do nome —
a busca ignora acento e maiúscula." e a contagem do catálogo cai em um. A peça existe; o painel a tira da
busca sem dizer por quê, e a frase manda procurar de novo. Ela esperava ver a joia na lista, desabilitada,
com o motivo "É esta joia".

**Origem:** sessão CH-03 · ambiente local

## Impacto

- **Nível:** Fricção
- **Persona mais atingida:** PER-02 Adri — outras: nenhuma
- **Jornada e passo:** J-03, passo 6 (acrescenta um adicional "Uma peça só")
- **Frequência:** sempre (2 de 2: M-04 e M-06)
- **Contorno:** nenhum necessário; ela não consegue oferecer a joia junto de si mesma
- **Gravidade proposta na sessão:** low. Subi para medium: a frase afirma que a peça não existe e manda
  tentar outras palavras, o que custa tempo e pode fazê-la duvidar do cadastro. Não subi mais um degrau
  pela jornada P0 porque buscar a própria joia não é o caminho da jornada, é um desvio dela

## Ambiente

- **URL:** http://localhost:8083/admin/produtos/ee13bca9-19ec-4dd7-9a08-e5087ca3b832/editar (M-04), aba "Compre junto"
- **Tela:** formulário do produto, aba Compre junto · **Componente:** cartão do adicional, busca de peça ("Peça do adicional N")
- **Branch / build:** feature/WI-01 (HEAD 415af2b5) · dev server Vite
- **Browser:** Chromium headless (Playwright MCP), versão não registrada · **Viewport:** 1440 × 900
- **Rede:** local · **Idioma:** pt-BR

## Passos

1. Logada como `admin-painel`, abrir
   http://localhost:8083/admin/produtos/ee13bca9-19ec-4dd7-9a08-e5087ca3b832/editar (QA Joia Sem Compre
   Junto) e a aba "Compre junto"
2. "Acrescentar um adicional" › "Uma peça só"
3. Digitar "QA Joia Sem Compre" no campo "Peça do adicional 1"

## Esperado

O resultado "QA Joia Sem Compre Junto" aparece desabilitado, com o motivo "É esta joia".

**Fonte:** PRD CA-02.5 ("um produto já escolhido aparece desabilitado com o motivo"); costura › Painel ›
aba Compre junto ("resultado desabilitado com 'É esta joia', 'Já está em outro adicional', 'Fora do
ar'"); TC-FUNC-036 passo 1

## Observado

Contador "0 de 746" (o editor de lista mostra 747 no catálogo) e "Nenhuma peça com “QA Joia Sem Compre”.
Procure por outra palavra do nome — a busca ignora acento e maiúscula.". O mesmo em M-06 com "Estrela
Guia". O caso "Já está em outro adicional" funciona como esperado.

## Evidência

- `screenshots/CH-03-08-busca-propria-joia.png` — a busca vazia com a frase "Nenhuma peça com…"

## Ocorrências

| Sessão | Persona     | Passo                         | Evidência                                     |
| ------ | ----------- | ----------------------------- | --------------------------------------------- |
| CH-03  | PER-02 Adri | 10 (M-04, "QA Joia Sem Compre") | `screenshots/CH-03-08-busca-propria-joia.png` |
| CH-03  | PER-02 Adri | 25 (M-06, "Estrela Guia")     | log da sessão                                 |

## Relacionados

- **TC:** TC-FUNC-036
- **Charter:** CH-03
- **Critério:** CA-02.5
- **Protótipo:** Claude Design, Uma Estrelinha - Backoffice, `Produto - Compre Junto.html`
- **Bugs:** BUG-010 (a mesma aba, fora do protótipo)


### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `ProductSearchField` (`apps/backoffice/src/entities/product/ui/ProductSearchField.tsx`) | JÁ EXISTE | uma prop nova, opcional (ex.: `bloqueados?: Readonly<Record<string, string>>` — id → motivo), padrão vazio | o id bloqueado aparece no resultado e na contagem como as demais peças, com o botão `disabled`, sem o ícone de acrescentar, e o motivo escrito na linha (no mesmo `<span>` de motivo que já existe, `data-testid="ja-escolhida-<id>"`); clicar não chama `onEscolher`. Sem a prop, o comportamento é byte a byte o de hoje |
| `ProductChoice` em `BuyTogetherTab.tsx` | JÁ EXISTE | | passa o principal pela prop nova com o motivo "É esta joia" e deixa de passá-lo em `excluir`; "Já está em outro adicional" (`selecionados`) e "Fora do ar" (`bloquearForaDoAr`) seguem como estão |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-009 · [Painel · aba Compre junto do produto] Buscar a própria joia diz “Nenhuma peça com…” · medium
- **Fechamento**: a tarefa fecha com o fix do bug; ele segue `open` até o reteste do QA
- **Premissa (orquestrador, sem humano)**: a costura (`spec.md` › Painel › aba Compre junto) nomeia "É esta joia" como motivo de resultado desabilitado, e é ela que manda aqui; o `excluir` (sumir) continua certo em produtos relacionados, onde o docstring do componente o justifica, e por isso a mudança é uma prop nova e não a troca do sentido de `excluir`. A recusa de `chooseProduct` para o principal fica como rede de baixo, intocada. Raio de alcance: só a busca de peça dos adicionais "Uma peça só" da aba Compre junto.
- **Fora desta tarefa**: os demais bugs da QA (inclusive BUG-010, na mesma aba); `RelatedProductsSelect`; `buscarProdutos`.

### Testes

- `apps/backoffice/src/entities/product/ui/ProductSearchField.test.tsx`:
  - com a prop nova, a peça bloqueada que casa o termo aparece, com o botão desabilitado e o motivo dado escrito na linha; clicar nela não chama `onEscolher`
  - a peça bloqueada entra no total do catálogo (o contador não cai em um)
  - sem a prop, os casos existentes seguem verdes sem afrouxar
- pela aba real (`AdminProductFormPage.compreJunto.test.tsx` ou o teste de `BuyTogetherTab`): acrescentar "Uma peça só" e digitar parte do nome da própria joia mostra a linha dela desabilitada com "É esta joia", e **não** a frase "Nenhuma peça com"
- `RelatedProductsSelect.test.tsx` (o produto editado SOME) segue verde sem alteração

### Não faça

- Não mexa nos outros bugs da QA
- Não mude o sentido de `excluir` nem o `RelatedProductsSelect`
- Não escreva uma segunda lista de resultados nem um segundo componente de busca

### Pronto quando

- [ ] a busca de peça do adicional mostra a própria joia desabilitada com "É esta joia"
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu, que reprovou antes do código
- [ ] a suíte inteira do painel (`pnpm --filter @estrelinha/backoffice test --testTimeout=20000`) e a da loja (`pnpm --filter @estrelinha/store test --testTimeout=20000`, os guardas varrem o painel) passando, exit 0 fora de pipe
- [ ] `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` com 0 erros e `npx eslint` nos arquivos tocados sem erro novo
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

