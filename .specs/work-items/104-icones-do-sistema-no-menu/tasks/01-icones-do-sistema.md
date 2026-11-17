## 01 · [store (monorepo): packages/core, packages/ui, apps/backoffice, apps/store] Seletor de ícone do `/admin/menu` e o ícone do sistema na loja

**Status:** done

`C-01, C-02, C-03, C-04, C-05` — 104

**Objetivo.** A dona escolhe, no seletor de ícone do item do menu, um dos dez ícones do sistema (no estilo da casa), separados dos da marca, e a loja o desenha na barra do computador e na folha do celular.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `packages/ui/CLAUDE.md`, `packages/core/CLAUDE.md` › Pureza e › `menu`, `apps/backoffice/CLAUDE.md` › `/admin/menu — o menu montado pela dona`, `apps/store/CLAUDE.md` › Ícones e marca e › Menu (consumo), `DESIGN.md` §1 e §8, e `CLAUDE.md` (raiz) › Convenções, › Os guardas, › Baselines. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §5 · plan.md — Código — /Users/rafael.santos/Projetos/uma-estrelinha/store

**Habilita.** Nada que a 02 consuma (as duas rodam juntas).

### Critérios de aceite

- C-01 O seletor de ícone do item do menu em `/admin/menu` oferece, além dos ícones da marca, um conjunto de ícones do sistema (a lista de P-02).
- C-02 Os ícones do sistema são desenhados no estilo da casa (grade 24, traço 1,5, contorno `currentColor`, realce `ICON_ACCENT`) e passam em `icons.test.ts` e `menuIconCatalog.test.ts` sem afrouxar régua.
- C-03 A loja desenha o ícone do sistema escolhido onde o ícone do item principal já aparece — a barra do computador e a folha do celular — e na prévia do painel (que é a loja num iframe).
- C-04 O seletor separa os dois grupos com título ("Da Uma Estrelinha" e "Do sistema"), a cela "Sem ícone" continua fixa, e a busca por nome ou chave alcança os dois.
- C-05 Uma chave do sistema grava no documento v2 e é lida igual pela loja e pelo painel; os ícones já gravados não mudam.

### Design — o que a tela faz

Seletor de ícone (`MenuIconPicker`): a grade única vira cela "Sem ícone" (fixa, fora do filtro) → título "Da Uma Estrelinha" + grade → título "Do sistema" + grade, na mesma área que rola. A busca filtra as duas grades; grupo sem resultado some (com o título); nenhum resultado mostra a mensagem que já existe. O texto do cabeçalho deixa de dizer que são só os ícones desenhados para a loja. Os `data-testid` `icone-opcao-<chave>` continuam.

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `MENU_SYSTEM_ICON_KEYS` (as dez chaves do sistema, `as const`) e o grupo de cada chave, em `packages/core/src/menu/icons.ts` | VOCÊ CRIA | — | `MENU_ICON_KEYS` passa a ser marca + sistema; `MENU_ICON_LABELS` com os dez rótulos |
| Dez `packages/ui/src/icons/<Nome>Icon.tsx` + export/import/entrada em `ESTRELINHA_ICONS` | VOCÊ CRIA | — | `MENU_ICON_COMPONENTS` continua sendo `ESTRELINHA_ICONS` (mesmo objeto) |
| `menuIconKey` (`core/menu/icons.ts › menuIconKey`), `parseRoot` (`core/menu/structure.ts › parseRoot`), `MegaMenu.tsx › ItemIcon`, `MobileMenu.tsx › EntryIcon` | JÁ EXISTE. Consuma; não altere. | chave | componente |

### Decisões já tomadas

- Os dez, com chave e rótulo: `etiqueta` Etiqueta · `porcentagem` Porcentagem · `presente` Presente · `coracao` Coração · `cupom` Cupom · `frete` Frete · `calendario` Calendário · `informacao` Informação · `duvida` Dúvida · `inicio` Início (P-02, ratificada). Nenhum rótulo ou chave contém "mecha" nem "unha" (`MenuIconPicker.test.tsx` conta resultados dessas buscas).
- Desenho próprio no conjunto da casa, nunca componente `lucide-react` nem paths copiados dele (P-01). O comentário de `packages/ui/src/icons/index.ts` (cabeçalho, "o que o lucide resolve continua vindo de lá") e o de `core/menu/icons.ts` passam a declarar a exceção: o vocabulário do menu é composto pela dona e todo ícone dele precisa do mesmo traço e do realce.
- Fora: relógio, raio, estrela de cinco pontas (tom memorial; a estrela da casa é a da marca).
- Os títulos dos grupos: "Da Uma Estrelinha" e "Do sistema".

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| Ícone bicolor na grade 24 | `packages/ui/src/icons/SacolaIcon.tsx` (contorno `currentColor` + realce `ICON_ACCENT`) e `ParcelasIcon.tsx` |
| Registro do ícone | `packages/ui/src/icons/index.ts › ESTRELINHA_ICONS` |
| Chave + rótulo | `packages/core/src/menu/icons.ts › MENU_ICON_KEYS` / `MENU_ICON_LABELS` |
| Grade com rolagem e cela fixa | `apps/backoffice/src/features/store-menu/ui/MenuIconPicker.tsx` (o próprio) |

### Testes

- Unidade (core): o catálogo contém os dez do sistema, sem repetição, todos no formato `^[a-z][a-z0-9-]*$` e com rótulo; os grupos (marca e sistema) cobrem o catálogo sem sobreposição; uma chave do sistema é lida como ela mesma por `menuIconKey`. Ajustar a âncora cravada `toHaveLength(29)` em `packages/core/src/menu/__tests__/icons.test.ts`.
- Componente (painel): o seletor mostra os dois títulos e os ícones de cada grupo; a busca por rótulo ("etiqueta") e por chave acha no grupo do sistema; grupo sem resultado some; "Sem ícone" continua. Ajustar `MenuIconPicker.test.tsx` (contador e texto do cabeçalho, se mudarem).
- Componente (loja), arquivo NOVO (não edite `MegaMenu.test.tsx` nem `MobileMenu.test.tsx`, que são da 02): um documento com um item principal de ícone do sistema faz a barra do computador e a folha do celular desenharem esse ícone.
- Guardas rodados sem afrouxar: `apps/store/src/shared/lib/__tests__/icons.test.ts`, `menuIconCatalog.test.ts`, `core/menu/__tests__/purity.test.ts`.

### Obrigações

- Cada `*Icon.tsx`: `viewBox={ICON_VIEW_BOX}`, `strokeWidth={ICON_STROKE}`, `fill="none"` na raiz e nenhum outro `fill`, ao menos um `stroke="currentColor"`, realce só por `stroke={ICON_ACCENT}`, sem hex/rgb/`var(--` direto, sem `width`/`height`, `className={className}`, `aria-hidden={ariaHidden}`, `focusable="false"`, comentário JSDoc dizendo o que é (regras de `icons.test.ts`).
- `core/menu` sem React nem `@estrelinha/ui`; imports relativos com `.ts`.
- Rótulos neutros, sem urgência (`CLAUDE.md` raiz, tom memorial).
- Alvos de toque do seletor ≥ 44px (como já são).
- Ao acrescentar ícone, a suíte da loja é a que guarda (`packages/ui/CLAUDE.md`).
- Prove a gravação: probe HTTP contra o Supabase local (`:54441`, `AD-012`) do `update` de `store_settings` com um item principal de ícone do sistema, relido igual — registre no retorno.

### Não faça

- Nada de cor do rótulo, `labelColor(s)`, `structure.ts`, `refusals.ts`, `preview.ts`, `core/menu/index.ts`, `documentOps.ts`, `MenuItemEditor.tsx`, `MegaMenu.tsx`, `MobileMenu.tsx`, `navItem.ts` e os testes deles — são da tarefa 02.
- Ícone no submenu ou no painel do submenu.
- Importar `lucide-react` no vocabulário do menu.

### Pronto quando

- [ ] o seletor mostra "Da Uma Estrelinha" e "Do sistema" com os dez ícones novos, e a busca acha nos dois
- [ ] os dez desenhos passam em `icons.test.ts` e `menuIconCatalog.test.ts` sem mudança de régua
- [ ] um item com ícone do sistema aparece na barra e na folha do celular (teste novo)
- [ ] a gravação de uma chave do sistema provada por probe no Supabase local
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
