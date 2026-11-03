## 15 · [apps/store] BUG-008 — [Gaveta da sacola] “Acompanha o …” aparece sem o traço dourado do protótipo

**Status:** done

`CA-05.1` — WI-01

**Objetivo.** Na gaveta da sacola, a linha "Acompanha o …" do adicional do Compre Junto fica no desenho do protótipo da loja (`cj-loja.css` › `.acomp i`): a frase em 12,5px `ink-soft`, precedida de um traço decorativo de 10×1px em `accent` (#b8945f). O texto, o nome completo e a quebra de linha continuam como estão.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` da raiz › O "defeito 01", › Os guardas, › Convenções, › Baselines; `apps/store/CLAUDE.md` › Carrinho; `DESIGN.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** a tarefa 04/05 (a frase "Acompanha o …" em `apps/store/src/widgets/cart-drawer/ui/CartDrawerRow.tsx`). Confira que existe.

### Critérios de aceite

### BUG-008 — [Gaveta da sacola] “Acompanha o …” aparece sem o traço dourado do protótipo

O envelope completo está em `qa/issues/BUG-008.md`. Corpo, íntegro:


## Resumo

A cliente leva o conjunto e a gaveta da sacola abre. Sob cada peça que veio pelo Compre Junto aparece
"Acompanha o QA Pingente Estrela", com o nome completo da joia, como a costura pede. No protótipo, a
frase vem precedida de um traço dourado curto; aqui ele não aparece.

**Origem:** sessão CH-08 · ambiente local

## Impacto

- **Nível:** Cosmético
- **Persona mais atingida:** PER-01 Marina — outras: nenhuma
- **Jornada e passo:** J-01, passo 6 (toca "Levar o conjunto" na barra fixa)
- **Frequência:** sempre
- **Contorno:** nenhum necessário
- **Gravidade proposta na sessão:** low — mantida

## Ambiente

- **URL:** http://localhost:8082/produtos/qa-pingente-estrela (gaveta aberta)
- **Tela:** página do produto · **Componente:** gaveta da sacola, linha "Acompanha o …"
- **Branch / build:** feature/WI-01 (HEAD 415af2b5) · dev server Vite
- **Browser:** Chromium headless (Playwright MCP), versão não registrada · **Viewport:** 390 × 844
- **Rede:** local · **Idioma:** pt-BR

## Passos

1. Anônima, sacola vazia, abrir http://localhost:8082/produtos/qa-pingente-estrela em 390 × 844
2. Marcar "QA Correntes" e escolher QA Corrente Veneziana · 40 cm. Marcar "QA Berloque Coração" · Prata 925
3. Tocar "Levar o conjunto" e olhar a linha "Acompanha o …" sob as duas peças

## Esperado

A frase em 12,5 px `ink-soft`, precedida de um traço 10×1 px `accent` (#b8945f).

**Fonte:** protótipo da loja, `cj-loja.css` `.acomp i`; TC-UI-002

## Observado

"Acompanha o QA Pingente Estrela" sem o traço. O texto e o nome completo conferem (CA-05.1).

## Design × implementado

| Propriedade               | Protótipo                              | Observado                          | Confere |
| ------------------------- | -------------------------------------- | ---------------------------------- | ------- |
| Traço antes da frase      | 10×1 px, `accent` #b8945f              | ausente                            | não     |
| Texto da frase            | "Acompanha o <nome completo>"          | "Acompanha o QA Pingente Estrela"  | sim     |

## Evidência

- `screenshots/CH-08-05-gaveta-390-acompanha.png` — as duas linhas "Acompanha o …" sem o traço

## Relacionados

- **TC:** TC-UI-002
- **Charter:** CH-08
- **Critério:** CA-05.1
- **Protótipo:** Claude Design, Uma Estrelinha - Loja, `Produto - Compre Junto.html` (gaveta)
- **Bugs:** nenhum

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `CartDrawerRow` (`apps/store/src/widgets/cart-drawer/ui/CartDrawerRow.tsx`, o `<p data-testid="acompanha">`) | JÁ EXISTE | | a frase em `text-[12.5px]` `text-estrelinha-ink-soft`, precedida de um `<span aria-hidden="true">` de 10×1px (`w-2.5 h-px`) com fundo `bg-estrelinha-accent`, em linha com o texto (`inline-block`, alinhado ao meio, folga à direita); o `textContent` do `<p>` segue exatamente a frase |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-008 · [Gaveta da sacola] “Acompanha o …” aparece sem o traço dourado do protótipo · low
- **Fechamento**: a tarefa fecha com o fix do bug; ele segue `open` até o reteste do QA
- **Premissa (orquestrador, sem humano)**: o traço é decorativo (`aria-hidden`, sem texto), em fundo `accent` — não é texto em ouro, então `accentText.test.ts` não o alcança. O tamanho da frase passa de 12px para 12,5px, que é o "Esperado" do bug. Raio de alcance: só a linha "Acompanha o …" da gaveta da sacola; a confirmação do pedido e o painel (`OrderItemsSummary`) não mudam.
- **Fora desta tarefa**: os demais bugs da QA; a frase do pedido (`OrderItemsSummary.tsx`); `companionPhrase`.

### Testes

- `apps/store/src/widgets/cart-drawer/ui/__tests__/CartDrawerAcompanha.test.tsx`, pela gaveta real:
  - a linha "Acompanha o …" tem, antes do texto, um elemento `aria-hidden="true"` com `bg-estrelinha-accent`, `w-2.5` e `h-px` (token exato, `L-034`), sem texto
  - o `<p>` tem `text-[12.5px]` e `text-estrelinha-ink-soft` (token exato)
  - o texto da linha segue exatamente "Acompanha o <nome completo>" (os casos existentes verdes, sem afrouxar)
- os guardas da loja seguem verdes (`accentText`, `contrast`, `arbitraryTextColor`, `touchTarget`)

### Não faça

- Não mexa nos outros bugs da QA
- Não mude `companionPhrase` nem a frase do pedido
- Não escreva o traço como caractere de texto (travessão ou hífen): ele não pode entrar no `textContent` nem ser lido pelo leitor de tela

### Pronto quando

- [ ] a linha "Acompanha o …" da gaveta com o traço 10×1px `accent` antes da frase em 12,5px `ink-soft`
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu, que reprovou antes do código
- [ ] a suíte inteira da loja (`pnpm --filter @estrelinha/store test --testTimeout=20000`) passando, exit 0 fora de pipe
- [ ] `npx tsc --noEmit -p apps/store/tsconfig.app.json` com 0 erros e `npx eslint` nos arquivos tocados sem erro novo
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

