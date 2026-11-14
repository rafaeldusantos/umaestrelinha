## 05 · [apps/backoffice, apps/store (guarda)] Painel › Configurações › Frete e Material: as regiões

**Status:** done

`UC-12; CA-20` — 99

**Objetivo.** A dona escolhe, no painel, em quais regiões o frete grátis vale, e a loja passa a seguir a escolha sem
deploy; nenhuma outra tela lê o campo por conta própria.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › "O defeito 01", "Os guardas — o que trava
o quê" (`freeShippingSingleOwner`, `semAbaEmConfiguracoes`, `originZipNotRead`, `alvoDeToqueNaoRoubaPosicao`);
`apps/backoffice/CLAUDE.md` › "Configurações › quatro seções", "Configurações › Frete — o interruptor do frete grátis".
Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código (e §7 Decisões D-05, D-08).

**Depende de.** Tarefa 01 (`freeShippingRefusal` com a recusa de região, `FREE_SHIPPING_REGIONS`, rótulos e estados das
regiões em `@estrelinha/core/shipping`) e tarefa 03 (`free_shipping_regions` em `ShippingSettings`/`DEFAULT_SHIPPING`).
Confira que existem antes de começar.

### Critérios de aceite

PRD 99 (verbatim):
- **UC-12 · O painel**
  - Em **Configurações → Frete e Material**, ao lado do interruptor e da faixa de hoje: "Regiões com frete grátis",
    cinco caixas (Norte, Nordeste, Centro-Oeste, Sudeste, Sul).
  - Interruptor ligado com nenhuma região marcada é recusado ao salvar, com o motivo (mesmo formato de
    `freeShippingRefusal`).
  - O texto de ajuda diz quais estados cada região cobre.
- **CA-20** Painel: desmarcar todas as regiões com o interruptor ligado recusa o salvar com o motivo; salvar Sul +
  Sudeste vale na loja sem deploy.
- **RN-14** (trecho): `freeShippingSingleOwner.test.ts` continua valendo e ganha as asserções de região.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `apps/backoffice/src/features/settings/ui/ShippingMaterialSection.tsx` (`:43` leitura, `:59-66` salvar, `:62` título da recusa, `:85-118` interruptor e faixa) | VOCÊ ALTERA | as settings | as cinco caixas, a ajuda, a recusa por `core` e o upsert com `free_shipping_regions` |
| `apps/store/src/shared/lib/__tests__/freeShippingSingleOwner.test.ts` | VOCÊ ALTERA | — | as réguas de região (D-05) |
| `freeShippingRefusal`, `freeShippingConfigOf`, `FREE_SHIPPING_REGIONS` e rótulos/estados | JÁ EXISTE (tarefa 01). Consuma; não altere. | | |
| `@estrelinha/ui/checkbox` | JÁ EXISTE. Consuma; não altere. | | |

### Decisões já tomadas

- D-05: `freeShippingSingleOwner` passa a varrer também `supabase/functions`; recusa `free_shipping_regions` fora do
  painel (`ShippingMaterialSection.tsx`) — a loja e as functions o leem só por `freeShippingConfigOf`/`useFreeShipping`;
  recusa faixa numérica de CEP por região escrita fora de `packages/core/src/shipping/region.ts`; sensores para cada
  régua (CRLF, LF, o glob de dois asteriscos) e o inverso. O allowlist de `free_shipping_threshold` continua de dois,
  e o segundo sentido (entrada que não lê mais o campo) continua valendo — se a tarefa 03 tirou a leitura de
  `RuntimeSettingsLoader.tsx`, ajuste o allowlist ao que existe, nunca afrouxe. (Tarefa 03: o
  `RuntimeSettingsLoader.tsx` continua lendo `free_shipping_threshold` literalmente e passou a escrever também o token
  `free_shipping_regions` — `free_shipping_regions: frete.free_shipping_regions`, com `frete = freeShippingConfigOf(data.shipping)`,
  nunca o jsonb cru; e `packages/core/src/constants.ts` declara `free_shipping_regions` em `setRuntimeShippingSettings` e
  `runtimeFreeShippingConfig`. A régua nova de `free_shipping_regions` precisa contar com essas duas ocorrências.)
- D-08: o título do aviso de recusa vem do motivo de `freeShippingRefusal` (não o literal "Frete grátis sem valor
  mínimo"); as caixas leem as regiões por `freeShippingConfigOf` (padrão as cinco).
- D-02: com o interruptor desligado, lista vazia é gravável; as caixas ficam desabilitadas como a faixa quando o
  interruptor está desligado.
- Ordem das caixas: Norte, Nordeste, Centro-Oeste, Sudeste, Sul. Ajuda de cada caixa com os estados (D-04 em
  `region.ts`).

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| interruptor, ajuda e recusa no card | `ShippingMaterialSection.tsx:163-178` (retirada: `ToggleField` + `SWITCH_TAP_44` + `InfoBanner`) |
| caixas de seleção com rótulo | `apps/backoffice/src/features/order-notice/ui/NoticeEmails.tsx:9`, `:37-41` |
| teste pela página real, recusa provada pela ausência do upsert | `apps/backoffice/src/pages/admin/AdminSettingsPage.test.tsx:743-848`, `:1175-1280` |

### Testes

- página real (painel): as cinco caixas aparecem com a ajuda dos estados, marcadas por padrão (linha sem o campo).
- página real (painel): desmarcar todas com o interruptor ligado não chama o upsert e mostra o motivo de `core` como
  título/texto do aviso (CA-20).
- página real (painel): salvar Sul + Sudeste grava `free_shipping_regions: ['sudeste','sul']` (ou na ordem de
  `FREE_SHIPPING_REGIONS`) junto do resto de `shipping`.
- página real (painel): com o interruptor desligado, as caixas ficam desabilitadas e lista vazia é gravável.
- guarda (store): as réguas novas de `freeShippingSingleOwner` com âncora e sensores.

### Obrigações

- `AdminSettingsPage.test.tsx` `CFG-13` (nenhuma grade com colunas abaixo de `sm`, `:417`), `CFG-14` (controle com 44px,
  `:363-397`) e o inventário de campos (`:447-512`, acrescente as cinco caixas por extenso) continuam verdes.
- Cada caixa com `Label htmlFor` e alvo de 44px.
- `semAbaEmConfiguracoes` (nunca "aba"); `originZipNotRead` (a frase "Melhor Envio" fica em
  `ShippingMaterialSection.tsx:180-183`).
- Rode também a suíte da loja (`freeShippingSingleOwner` mora nela).

### Não faça

- Não mexa nas telas da loja, nas functions nem no `core`.
- Não aplique migration (é da tarefa 03).

### Pronto quando

- [ ] as cinco caixas no card de Frete, com a ajuda e o padrão
- [ ] a recusa com o motivo de `core`, provada pela ausência do upsert
- [ ] Sul + Sudeste gravado
- [ ] `freeShippingSingleOwner` com as réguas de região e sensores
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
