## 12 · [apps/store] BUG-005 — [Bloco Compre junto] A forma "Na linha" não segue o desenho do protótipo da loja

**Status:** done

`CA-03.14`, `CA-03.11` — WI-01

**Objetivo.** O bloco Compre Junto, nas formas "Na linha" e "Com fórmula" (a lista abaixo da faixa), passa a ter o desenho do protótipo da loja (`Produto - Compre Junto.html`, `cj-loja.css` e `cj-loja-bloco.jsx`): superfície branca com borda e raio em volta, linhas na mesma superfície separadas por fio, caixa de marcar própria com alvo de 44 px, foto 64×80, nome em peso normal com o preço abaixo, rodapé do total sem caixa areia, "no Pix" no total. A frase do que falta de cada linha só aparece **depois** de a cliente tentar comprar, e o link "Ver opções"/"Esconder opções" some com a linha marcada.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` da raiz › O "defeito 01", › Os guardas, › Convenções, › Baselines; `apps/store/CLAUDE.md` › Página do produto; `DESIGN.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** as tarefas 03, 04, 07, 08, 09, 10 e 11 (o bloco, o botão único `useBuyAction`, as formas, a reserva, o anúncio do total, a frase do eixo, o aviso da gravação). Confira que existem.

### Critérios de aceite

### BUG-005 — [Bloco Compre junto] A forma "Na linha" não segue o desenho do protótipo da loja

O envelope completo está em `qa/issues/BUG-005.md` (tabela *Design × implementado*, linhas D1–D13 e a do momento da mensagem). Resumo do esperado, lido do protótipo (`cj-loja.css`, `cj-loja-bloco.jsx`, projeto Claude Design `69224d8a-17ae-4b1f-a251-a8105b41edc2`):

| # | Propriedade | Esperado (protótipo) | Hoje |
| - | ----------- | -------------------- | ---- |
| D1 | Contêiner do bloco (`.cj`) | `bg-estrelinha-surface`, borda 1px `line` em volta, raio `lg` (20px), padding `18px 16px 16px`, `22px 22px 20px` a partir de `lg` (1024); filhos com `gap` 14px | transparente, só `border-top`, sem raio, `pt-5` |
| D2 | Título "Compre junto" | `font-display` 20px, peso 400, `leading-[1.25]`, `tracking-[-0.02em]` | 17px · 600 |
| D3 | Frase "Peças que eu escolhi…" | 14px, peso 300 (`font-light`), `ink-soft`, 4px abaixo do título | peso 400 |
| D4 | Linhas (`.cj-item`) | na mesma superfície: `border-t line`, `py-3`, a primeira sem fio e sem `pt` | cada uma num cartão branco com borda, raio e padding |
| D5 | Caixa de marcar | caixa 24×24, borda 2px `field`, raio `sm` (6px), fundo `surface`; marcada: fundo e borda `primary` com o tique em `on-primary`; alvo de 44×44 | `input` nativo 20×20 com `accent-color` |
| D6 | Foto da linha | 64×80, raio `md` (12px) | 56×56 |
| D7 | Nome do adicional | `font-display` 15px, peso 400, `leading-[1.3]` | 600 · 20px |
| D8 | Preço da linha | **abaixo** do nome e do resumo, `font-display` 15px peso 700 `primary`; o preço da peça em foco, **sem prefixo** | à direita do nome, com "a partir de" |
| D9 | Rodapé "Total do conjunto" (`.cj-total`) | sem fundo, `border-t line`, `pt-3.5`, `gap` 10px; rótulo 14px `ink-soft` peso normal; valor `font-display` 22px peso 700 `primary` | caixa areia com raio |
| D11 | Linha do PIX no total | ícone + valor em 600 + "no Pix", alinhada à direita (`justify-end`), 6px mais perto do total | "com Pix", à esquerda |
| D13 | Link da linha | "Ver opções" / "Ver os N modelos" / "Esconder opções" **some** com a linha marcada (formas "Na linha" e "Com fórmula") | continua visível com a linha marcada |
| — | Frase do que falta da linha | só depois de a cliente **tentar comprar** com a linha marcada e incompleta (o `tentou` do protótipo): `falta = tentou && marcado ? faltaEm(...) : null`; no protótipo ela fica entre a linha e as escolhas, recuada 54px, 13px, cor `alert`, com um ponto de 6px | aparece logo ao marcar |

Os textos (título, frase, "Escolha a peça · N modelos", nota do total, nota de 1440) já conferem e não mudam.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `useBuyAction` (`apps/store/src/entities/product/model/useBuyAction.ts`) | JÁ EXISTE. Dono do `attempted` (a tentativa de levar o conjunto incompleto) | sem mudança | passa a expor `attempted: boolean` no `BuyAction` (o mesmo estado que já decide o `notice`) |
| `ProductInfo` (`apps/store/src/entities/product/ui/ProductInfo.tsx`) | JÁ EXISTE. Já tem `buy` (a ação da página ou a própria) | | passa `attempted={buy.attempted}` ao `BuyTogetherBlock` |
| `BuyTogetherBlock` (`entities/product/ui/buy-together/BuyTogetherBlock.tsx`) | JÁ EXISTE | nova prop opcional `attempted?: boolean` (padrão `false`), repassada ao `AddonRow` | o contêiner, o título, a frase, a lista e o rodapé do total no desenho D1–D4, D9, D11 |
| `AddonRow` (`buy-together/AddonRow.tsx`) | JÁ EXISTE | nova prop opcional `attempted?: boolean` | a linha em grade `44px 64px minmax(0,1fr)` (D5–D8, D13); fora da forma "Em folha", a frase do que falta só com `attempted && addon.marked && addon.missing !== null`, entre a linha e as escolhas |
| `AddonPanel` (`buy-together/AddonPanel.tsx`) | JÁ EXISTE. Compartilhado pelas três formas | nova prop opcional para **não** desenhar a frase do que falta (a linha passa a desenhá-la); o padrão mantém o comportamento de hoje | na folha/diálogo ("Em folha") nada muda — é o BUG-006 |
| `BuyTogetherSkeleton` (`buy-together/BuyTogetherSkeleton.tsx`) | JÁ EXISTE | | o mesmo contêiner de D1, mantendo `BUY_TOGETHER_RESERVED_MIN_H` (o BUG-001 continua resolvido) |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-005 · [Bloco Compre junto] A forma "Na linha" não segue o desenho do protótipo da loja · medium
- **Fechamento**: a tarefa fecha com o fix do bug; ele segue `open` até o reteste do QA
- **Causa raiz**: o bloco foi escrito sem ler `cj-loja.css` (o `spec.md` › Design registra que só o comportamento foi lido), e o `attempted` que o protótipo usa para a frase do que falta mora em `useBuyAction`, sem chegar ao bloco — então o `AddonPanel` desenha `addon.missing` sempre que a linha está marcada.
- **Caixa de marcar (premissa do orquestrador)**: continue com o `<input type="checkbox">` nativo (o nome acessível, `toBeChecked()`, `focusAddon` e as suítes que procuram `getByRole('checkbox')` seguem valendo), com `appearance-none` e o desenho de D5; o tique é um elemento `aria-hidden` irmão (`peer-checked:`), e o alvo de 44×44 é o `<label>` da célula de 44px. Foco visível com contorno 2px `primary`. Movimento da cor com par `motion-reduce:`. A foto e o texto da linha continuam clicáveis por um `<label htmlFor>` apontando para a caixa; o link "Ver opções" fica **fora** de qualquer `<label>`.
- **Preço da linha (premissa do orquestrador)**: `addon.price` quando a escolha está completa; antes disso, o preço da peça em foco (`(addon.piece ?? addon.pieces[0]).product.price`), sem prefixo — é o `precoDe(peça em foco)` do protótipo. O "a partir de" sai da linha. `fromPrice` pode ficar no modelo se outro leitor o usar; não o apague sem conferir.
- **Grafia do PIX (premissa do orquestrador)**: "no Pix" — a grafia que a barra fixa da loja já usa (`ProductBuyBar.tsx`, "no Pix"); o protótipo escreve "no PIX". O anúncio da região viva (`role="status"`, BUG-002) acompanha: `Total do conjunto: R$ X, R$ Y no Pix`, para o que se ouve ser o que se lê. Atualize as asserções existentes desse texto.
- **Escolhas na linha**: fora da forma "Em folha", o painel aparece com a linha marcada **ou** aberta pelo link (o protótipo: `marcado || aberto`), recuado 54px (`ml-[54px]`) para alinhar com o texto. A foto da linha passa a pedir a rendição de 240 (vaga de 64×80 a DPR 3); a foto dos cartões de peça não muda.
- **Fora desta tarefa**: a folha/diálogo e o link "Escolher" da forma "Em folha" (BUG-006), a faixa da forma "Com fórmula" (BUG-007), os cartões de peça em rolagem horizontal, e o texto do aviso do botão (`useBuyAction.notice`).

### Testes

- página real (`ProductPageBuyTogether.test.tsx` ou um arquivo novo em `pages/__tests__`): marcar um adicional incompleto **não** mostra a frase do que falta; tocar "Levar o conjunto" com ele incompleto mostra a frase junto da linha; completar a escolha a tira
- o link "Ver opções"/"Ver os N modelos" some com a linha marcada (forma "Na linha") e volta ao desmarcar
- o rodapé do total diz "no Pix", sem "com Pix", e a região viva anuncia `…, R$ Y no Pix`
- o preço da linha não tem "a partir de" antes da escolha, e é o preço da peça em foco
- forma do desenho por token exato (`(?:^|\s)token(?![-\w])`, `L-034`): o contêiner com `bg-estrelinha-surface`, `border`, `rounded-lg`; a linha sem `rounded-md`/`bg-white`; a caixa de marcar com `appearance-none`, `h-6 w-6`, `border-2`, `border-estrelinha-field`, dentro de uma célula de 44px; a foto `h-20 w-16`; o rodapé sem `bg-estrelinha-ground-deep`
- a forma "Em folha" continua mostrando a frase do que falta na folha como antes (o caso existente segue verde, sem afrouxar)
- os guardas da loja (`touchTarget`, `fieldBorder`, `accentText`, `contrast`, `tomDoCompreJunto`, `semMaterialNaPaginaDoProduto`, `BuyTogetherBlockReserva`, `alvoDeToqueNaoRoubaPosicao`) seguem verdes

### Não faça

- Não mexa nos outros bugs da QA (BUG-006..013)
- Não troque o `<input type="checkbox">` por `<button role="checkbox">`
- Não escreva a frase do que falta em outro lugar além do modelo (`addon.missing`) — a linha só decide **quando** desenhá-la
- Não mude textos além de "com Pix" → "no Pix" no bloco

### Pronto quando

- [ ] o bloco "Na linha" tem o desenho D1–D13 da tabela, e a frase do que falta só aparece depois da tentativa
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — e a suíte inteira da loja (`pnpm --filter @estrelinha/store test --testTimeout=20000`), porque os guardas de lá varrem o bloco
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

### Fechamento (thread principal)

- Revisão adversarial: **serve com correção**, com dois achados de convenção contra `DESIGN.md` — o título em Libre Baskerville 400 (o `DESIGN.md` diz "Título é 700") e a foto da linha em `rounded-md` 12px (o `DESIGN.md` põe miniatura em `rounded-sm`). **Decisão do orquestrador (premissa, sem humano): mantidos os dois valores do protótipo.** O 400 é peso que a loja carrega (`libre-baskerville-v24-latin.woff2`; o `DESIGN.md` lista "400 e 700"), então não há o falso-negrito que motiva a regra; e o 12px é o que a dona aprovou no protótipo deste bloco (o mesmo raio das fotos da sacola no protótipo), que é o esperado do BUG-005 (D2, D6). Raio de alcance: só o título do bloco e a foto da linha. Se o humano preferir o `DESIGN.md`, são duas classes.
- Commit `20764d2d`.
