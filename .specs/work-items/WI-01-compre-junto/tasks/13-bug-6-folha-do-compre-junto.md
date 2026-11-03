## 13 · [apps/store] BUG-006 — [Bloco Compre junto · Em folha] A folha repete o que falta e difere do protótipo

**Status:** done

`CA-09.1`, `CA-03.14` — WI-01

**Objetivo.** Na forma "Em folha", a frase do que falta aparece **uma vez**, no rodapé da folha (celular) e do diálogo (computador), acima de "Incluir no conjunto"; o diálogo do computador tem `min(520px, 100%)` de largura; e o link da linha de uma peça avulsa diz "Escolher", como no protótipo da loja (`cj-loja-bloco.jsx` › `Folha` e o `cj-acao` da forma `folha`).

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` da raiz › O "defeito 01", › Os guardas, › Convenções, › Baselines; `apps/store/CLAUDE.md` › Página do produto; `DESIGN.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** as tarefas 07 (a forma "Em folha", `AddonSheet.tsx`) e 12 (o `showMissing` do `AddonPanel`). Confira que existem.

### Critérios de aceite

### BUG-006 — [Bloco Compre junto · Em folha] A folha repete o que falta e difere do protótipo

O envelope completo está em `qa/issues/BUG-006.md`. Esperado, lido do protótipo (projeto Claude Design `69224d8a-17ae-4b1f-a251-a8105b41edc2`, `cj-loja-bloco.jsx`):

| Propriedade | Esperado (protótipo) | Hoje |
| ----------- | -------------------- | ---- |
| Frase do que falta na folha/diálogo | uma vez, no rodapé (`folha-ft`: `{falta && <p className="cj-erro">}` acima do botão); o corpo (`Escolhas`) não a desenha | duas vezes: o `AddonPanel` no corpo (`showMissing` padrão `true`) e o rodapé do `AddonSheet` |
| Largura do diálogo em ≥ `sm` (D14) | `min(520px, 100%)` | `max-w-lg` (512px) |
| Link da linha na forma "Em folha" (D15) | lista: `Ver os N modelos`; peça avulsa: `Escolher` | peça avulsa: `Ver opções` |

Raio do diálogo (20px) e "Incluir no conjunto" desabilitado enquanto falta já conferem e não mudam.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `AddonSheet` (`apps/store/src/entities/product/ui/buy-together/AddonSheet.tsx`) | JÁ EXISTE | | passa `showMissing={false}` ao `AddonPanel`; o rodapé (`pending`) continua o único lugar da frase; o `DialogContent` com largura de até 520px (`max-w-[520px]`, mantendo o `w-full` do primitivo) |
| `AddonRow` (`buy-together/AddonRow.tsx`) | JÁ EXISTE | | na forma `sheet`, o link de uma peça avulsa diz "Escolher"; as formas "Na linha" e "Com fórmula" seguem com "Ver opções"; o texto das listas não muda |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-006 · [Bloco Compre junto · Em folha] A folha repete o que falta e difere do protótipo · low
- **Fechamento**: a tarefa fecha com o fix do bug; ele segue `open` até o reteste do QA
- **Causa raiz**: a tarefa 12 criou `showMissing` no `AddonPanel` (padrão `true`) para a linha não repetir a frase, e o `AddonSheet.tsx` continuou chamando `<AddonPanel>` sem a prop, enquanto o rodapé dele também desenha `pending`; a largura veio do `max-w-lg` do primitivo do shadcn, e o rótulo do link é um só para as três formas em `AddonRow.tsx`, sem o ramo `Escolher` da forma `folha` do protótipo.
- **Premissa (orquestrador, sem humano)**: só o texto da peça avulsa na forma "Em folha" muda; "Esconder opções" e "Ver o modelo" ficam como estão (o protótipo não tem lista de uma peça nem estado aberto do link na folha, e a folha cobre a linha quando aberta). Raio de alcance: o rótulo de um botão na forma "Em folha".
- **Fora desta tarefa**: o texto da frase (BUG-003), a forma "Com fórmula" (BUG-007), os demais bugs.

### Testes

- página real (`apps/store/src/pages/__tests__/ProductPageBuyTogetherForma.test.tsx`): com a forma "Em folha", marcar um adicional incompleto abre a folha com a frase do que falta **exatamente uma vez**, e ela está no rodapé (o mesmo contêiner de "Incluir no conjunto"); idem no diálogo do computador
- o `DialogContent` com `max-w-[520px]` e sem `max-w-lg` (token exato, `L-034`)
- na forma "Em folha", a linha de peça avulsa tem o link "Escolher" e nenhum "Ver opções"; na forma "Na linha" o mesmo adicional segue com "Ver opções" (o par)
- os casos existentes que procuram "Ver opções" na forma "Em folha" passam a procurar "Escolher" (mudança de valor pedida pelo bug, sem afrouxar asserção)
- os guardas da loja seguem verdes

### Não faça

- Não mexa nos outros bugs da QA
- Não mude o texto da frase do que falta (vem de `addon.missing`)
- Não mexa no primitivo `packages/ui/src/dialog.tsx`

### Pronto quando

- [ ] a frase aparece uma vez, no rodapé, nos dois desenhos; o diálogo tem até 520px; o link da peça avulsa na folha diz "Escolher"
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

