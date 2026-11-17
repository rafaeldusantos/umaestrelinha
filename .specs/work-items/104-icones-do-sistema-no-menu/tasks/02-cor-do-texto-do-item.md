## 02 · [store (monorepo): packages/core, apps/backoffice, apps/store] Editor do item do `/admin/menu` e o rótulo colorido na loja

**Status:** done

`C-06, C-07` — 104

**Objetivo.** A dona escolhe, por item principal do menu, a cor do rótulo na barra do computador e na folha do celular, com a cor ilegível recusada antes de gravar, e a loja desenha o rótulo nessas cores.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `packages/core/CLAUDE.md` › Pureza, › `menu`, › Convenções de tipo; `apps/backoffice/CLAUDE.md` › Molde dos formulários, › A ponte da prévia, › `/admin/menu — o menu montado pela dona`; `apps/store/CLAUDE.md` › Design system, › Menu (consumo), › Modo prévia; `DESIGN.md` §2 e §8; `CLAUDE.md` (raiz) › O "defeito 01", › Convenções, › Os guardas, › Baselines. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §5 · plan.md — Código — /Users/rafael.santos/Projetos/uma-estrelinha/store

**Habilita.** Nada que a 01 consuma (as duas rodam juntas).

### Critérios de aceite

- C-06 A dona escolhe, por item principal do menu (P-04), duas cores livres para o rótulo, num componente de escolha de cor: uma para a barra escura do computador e outra para a folha branca do celular (P-03). A loja desenha o rótulo na cor da superfície; cor não escolhida naquela superfície = como hoje.
- C-07 Uma cor que deixe o rótulo abaixo de 4,5:1 sobre o fundo da superfície dela — a barra nos perfis Padrão **e** Black Friday, a folha branca — é recusada antes de gravar, com a razão e a medida na frase; a regra mora em `core`, e um valor fora do formato `#RRGGBB` é lido como "sem cor".

### Design — o que a tela faz

- **Editor do item (painel, `MenuItemEditor`)** — só no item principal, abaixo do ícone: "Cor do texto", com dois campos — "Na barra do computador (fundo escuro)" e "Na lista do celular (fundo branco)". Cada um: componente de escolha de cor (`input type="color"`, 44px) + campo hex (`h-11`, `border-input`) + "Usar a cor padrão" + a medida de contraste vinda de `core` (verde ≥ 4,5:1, vermelha abaixo, com a frase). Recusa mostrada em `editor-recusa` e Salvar não grava. A prévia ao lado (a loja no iframe) mostra o efeito.
- **Loja** — o rótulo do item principal sai na cor que a dona escolheu para aquela superfície (a da barra no computador, a da folha no celular). Aberto e hover mantêm a cor da dona (P-05); a pista do aberto continua pela régua de 2px (computador) e pelo chevron (celular). Sem cor, as classes de hoje.

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `packages/core/src/menu/labelColor.ts`: `MenuLabelColors = { bar: string \| null; sheet: string \| null }`, `menuLabelColorsOf(bruto)`, `menuLabelColorFor(cores, superfície)`, `menuLabelColorRefusal(cores): string \| null`, e os fundos (barra `primary` nos perfis Padrão e Black Friday, folha branca) | VOCÊ CRIA | jsonb cru / cores | forma tolerante, cor da superfície, frase de recusa |
| `labelColors` em `MenuRootNode` (`core/menu/structure.ts › MenuRootNode`), lido em `parseRoot`, ausente em `legacyMenuDocument`; a cor da superfície em `MenuItem`, entregue pela porta `menuItems` | VOCÊ CRIA | documento v2 | `MenuItem.labelColor: string \| null` |
| `menuDocumentRefusal` (`core/menu/refusals.ts`) chamando `menuLabelColorRefusal` em cada item principal | VOCÊ ALTERA | documento | `string \| null` |
| `MenuNodePatch.labelColors` (`apps/backoffice/src/features/store-menu/model/documentOps.ts`), só na raiz; item novo nasce sem cor | VOCÊ ALTERA | patch | documento |
| `contrastRatio` (`packages/core/src/color/contrast.ts`), a ponte da prévia (`core/menu/preview.ts`, `useMenuPreviewBridge`), `useStoreMenu`, `useMenu` | JÁ EXISTE. Consuma; não altere a ponte. | | |

### Decisões já tomadas

- P-03: "Cor livre (código hex), uma para cada fundo, recusada quando ficar ilegível" — "Com componente de escolha de cor".
- P-04: só os itens principais; submenu e "ver tudo em X" ficam no padrão.
- P-05: mantém a cor escolhida no hover e com o item aberto.
- P-06: os hex dos fundos são cópia deliberada em `labelColor.ts` (`core/menu` não pode importar `@estrelinha/ui`), com guarda NOVO na suíte da loja (`apps/store/src/shared/lib/__tests__/`) que lê `ESTRELINHA_PROFILES` e compara, com sensor.
- A cor na loja é aplicada por `style={{ color }}`, nunca `text-[#…]` (`arbitraryTextColor.test.ts`) nem classe `text-estrelinha-accent*` (`accentText.test.ts`).
- A régua de contraste e a frase vêm de `core`; o editor só mostra (defeito 01).

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| Régua de cor com a razão e a medida na frase | `packages/core/src/campaigns/refusals.ts › campaignColorsRefusal` e `limits.ts › CAMPAIGN_HEX`, `CAMPAIGN_CONTRAST_MIN` |
| Leitura tolerante de um campo do nó | `packages/core/src/menu/structure.ts › parseRoot` (o `icon`) e `packages/core/src/appearance/normalize.ts › styleProfileOf` |
| Componente de cor no painel (só a forma, não importe) | `apps/backoffice/src/features/campaign-form/ui/ColorsCard.tsx` |
| Campo só da raiz no patch | `apps/backoffice/src/features/store-menu/model/documentOps.ts › updateNode` (o laço de `icon`/`banners`) |
| Cor aplicada por `style` na loja | `apps/store/src/entities/campaign/ui/CampaignBand.tsx` |
| Teste de classe por token exato | `apps/store/src/widgets/header/ui/__tests__/MegaMenu.test.tsx › temToken` |
| Guarda que compara cópia com o dono | `apps/store/src/shared/lib/__tests__/contrast.test.ts` (lê `STYLE_PROFILES`/tokens) |

### Testes

- Unidade (core): `menuLabelColorsOf` aceita `#RRGGBB` e devolve `null` para o resto; `menuLabelColorRefusal` recusa a cor da barra abaixo de 4,5:1 no Padrão, a que só reprova no Black Friday, e a da folha abaixo de 4,5:1 sobre branco, com a medida na frase, e aceita a que atinge o piso; a leitura do documento preserva `labelColors` válido e descarta o inválido sem quebrar (ajustar a igualdade exata de `structure.test.ts` e as fixtures de `legacy.test.ts`); a porta entrega à barra a cor `bar` e à folha a cor `sheet`; `menuDocumentRefusal` recusa o documento com a cor ilegível; o rascunho da prévia carrega a cor.
- Guarda (loja): os fundos copiados em `labelColor.ts` são iguais aos de `ESTRELINHA_PROFILES` (barra = `primary` de cada perfil, folha = branco), com sensor que reprova uma cópia divergente.
- Componente (painel): o editor do item principal mostra os dois campos, grava `labelColors` no patch junto de nome e ícone (igualdade exata — ajustar `MenuItemEditor.test.tsx` onde o patch é comparado), mostra a medida e recusa antes da rede a cor ilegível; "Usar a cor padrão" volta a `null`; o item filho não mostra o campo nem leva `labelColors` no patch. `documentOps`: `labelColors` só na raiz, mesma cor devolve o mesmo documento. `useStoreMenu`: o documento gravado leva a cor.
- Componente (loja): a barra do computador pinta o rótulo na cor `bar`, também aberto; sem cor continua `on-primary`, e o ícone continua no tom dele (`MegaMenu.test.tsx`); a folha do celular pinta o rótulo na cor `sheet`, no link direto e no acordeão; sem cor continua como hoje (`MobileMenu.test.tsx`).
- Guardas rodados sem afrouxar: `contrast`, `accentText`, `arbitraryTextColor`, `previaUnica`, `menuDocumentoComDonoUnico`, `menuSemTeto`, `menuSemItemFixo`, `core/menu/__tests__/purity`.

### Obrigações

- `labelColor.ts`: sem React nem `@estrelinha/ui`; imports relativos com `.ts` explícito (`../color/contrast.ts`), `import type` incluso; reexportar em `core/menu/index.ts`.
- Veredito `string | null` (nunca união discriminada por booleano; `strictNullChecks: false`).
- Painel: controles com `h-11`/44px, campo com `border-input`, `<Label htmlFor>`; nenhum arquivo `…Preview` novo e nenhum `<iframe>` (`previaUnica`).
- Loja: cor por `style`; sem cor nada muda (a asserção de `on-primary` do `MegaMenu.test.tsx` continua).
- Prove a gravação: probe HTTP contra o Supabase local (`:54441`, `AD-012`) do `update` de `store_settings` com o documento contendo `labelColors`, relido igual — registre o resultado no retorno.

### Não faça

- Nada de ícones novos, `core/menu/icons.ts`, `packages/ui/src/icons/**`, `MenuIconPicker.tsx` e seus testes — são da tarefa 01.
- Cor nos itens do submenu, no "ver tudo em X", cor de fundo do item.
- Paleta fechada (foi trocada por cor livre no gate).
- Mexer na ponte da prévia.

### Pronto quando

- [ ] o editor do item principal grava `labelColors` e recusa, antes da rede, a cor abaixo de 4,5:1 em qualquer fundo/perfil
- [ ] a barra e a folha do celular desenham o rótulo na cor da superfície; sem cor, como hoje
- [ ] o guarda dos fundos compara a cópia com `ESTRELINHA_PROFILES`, com sensor
- [ ] a gravação provada por probe no Supabase local
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
