## 03 · [packages/supabase, packages/core, apps/store, supabase/migrations] A configuração das regiões

**Status:** done

`RN-15; CA-19; UC-12 (o dado)` — 99

**Objetivo.** `store_settings.shipping` passa a ter `free_shipping_regions` (nasce com as cinco), e todo leitor da
configuração do frete grátis no navegador a carrega pelo leitor único.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › "O defeito 01", "Os guardas — o que trava
o quê" (as linhas de `storeSettingsDefaults` e `freeShippingSingleOwner`), "CI e deploy" (migration só no banco local),
"Baselines"; `supabase/CLAUDE.md` › "O deploy é AUTOMÁTICO", "Migrations"; `packages/core/CLAUDE.md` › "Pureza";
`apps/store/CLAUDE.md` › "Frete grátis — um interruptor e um dono só (feature 37)". Divergindo desta tarefa sobre COMO
fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código (e §7 Decisões D-02, D-03, D-07, D-15, D-18).

**Depende de.** Tarefa 01: `freeShippingConfigOf`, o estado com `granted`, `FREE_SHIPPING_REGIONS` em
`@estrelinha/core/shipping`. Confira que existe antes de começar.
**Habilita.** `useFreeShipping(subtotal, cep)` e o campo no tipo, consumidos pelas tarefas 05..09.

### Critérios de aceite

PRD 99 (verbatim):
- **RN-15 · Campo ausente = todas as regiões.** A configuração nova nasce com as cinco regiões marcadas, e a linha
  antiga (sem o campo) vale como as cinco, então o deploy **não muda nada** para quem já usa o frete grátis. Sul +
  Sudeste é uma escolha da dona no painel para a campanha. Lista vazia com o interruptor ligado deixa o frete grátis
  inativo (como a faixa ≤ 0), e o painel recusa gravá-la (r1, PR-02).
- **CA-19** Com as cinco regiões marcadas (o padrão), o comportamento é idêntico ao de hoje para qualquer CEP.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `ShippingSettings.free_shipping_regions` e `DEFAULT_SHIPPING` (`packages/supabase/src/types/settings.ts`) | VOCÊ ALTERA | — | campo opcional, lista de slugs; padrão as cinco (de `FREE_SHIPPING_REGIONS`, se o pacote puder importar de `core` sem ciclo; senão a lista literal, conferida por teste contra `core`) |
| migration nova em `supabase/migrations/` | VOCÊ CRIA | — | `value \|\| jsonb_build_object('free_shipping_regions', '["norte","nordeste","centro-oeste","sudeste","sul"]'::jsonb)` em `key = 'shipping' and not value ? 'free_shipping_regions'` |
| `useFreeShipping(subtotal = 0, cep?)` (`packages/core/src/hooks/useFreeShipping.ts`) | VOCÊ ALTERA | subtotal, CEP opcional | o estado de `freeShippingState` com destino; memoizado por primitivas (regiões por `join`) |
| `setRuntimeShippingSettings`/`runtimeFreeShippingConfig` (`packages/core/src/constants.ts`) e `RuntimeSettingsLoader.tsx` | VOCÊ ALTERA | as settings | hidratam também as regiões (pelo leitor único) |
| `cartStore.shippingCost` (`apps/store/src/entities/cart/model/cartStore.ts:274-283`) | VOCÊ ALTERA | — | lê `granted` (sem CEP: com regiões limitadas nunca zera) |
| `freeShippingConfigOf`, `freeShippingState` | JÁ EXISTE (tarefa 01). Consuma; não altere. | | |

### Decisões já tomadas

- D-02: ausente = as cinco; lista vazia com ligado = inativo.
- D-03: o hook e o caminho não-React montam a config por `freeShippingConfigOf`, nunca copiando campo a campo.
- D-07: o guarda de defaults ganha parser de lista e compara com `DEFAULT_SHIPPING.free_shipping_regions`; aditiva e
  idempotente; só a chave `shipping`; sensores com `mutar()` que lança.
- D-15: arquivo `supabase/migrations/<próximo prefixo livre>_99-frete-gratis-por-regiao.sql` (apure o maior prefixo na
  pasta na hora e some; nunca reuse prefixo); cabeçalho no molde da `63`; nenhuma escrita além do `update` aditivo.
- D-18: `cartStore.shippingCost` continua sem CEP e lê `granted`.
- Migration aplicada **só no banco local** (`supabase migration up` ou `psql` na 54442), nunca `--linked`.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| migration aditiva | `supabase/migrations/20261011120000_63-retirada.sql:36-39` (e o cabeçalho) |
| guarda da migration | `apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts:494-575` (o bloco da 63) e o `campoAditivo` de `:100-110` |
| hidratação do caminho não-React | `packages/core/src/constants.ts:10-16` (o comentário do caminho não-React) e `:18-32` (`setRuntimeShippingSettings`) |

### Testes

- unidade (core): `useFreeShipping` com CEP passa o destino; sem CEP igual a hoje; mudar só o CEP muda o estado; a
  referência é estável entre renders com as mesmas primitivas.
- unidade (core): `runtimeFreeShippingConfig` depois de `setRuntimeShippingSettings` traz as regiões; sem o campo, as cinco.
- unidade (store): `cartStore.shippingCost` com as cinco regiões e faixa alcançada zera (igual a hoje); com Sul + Sudeste
  e faixa alcançada, cobra (sem CEP não concede).
- guarda (store): `storeSettingsDefaults` — o bloco da migration nova: âncora (arquivo lido, `update` encontrado), o
  valor igual a `DEFAULT_SHIPPING.free_shipping_regions`, aditiva (`value ||`), idempotente (`not value ?`), só
  `shipping`, e sensores com `mutar()` que lança.
- probe local: aplicar a migration no banco local e conferir `select value->'free_shipping_regions' from store_settings
  where key = 'shipping'` (com e sem a chave antes; rodar duas vezes não muda nada). Registre a saída no retorno.

### Obrigações

- `freeShippingSingleOwner.test.ts` (`apps/store/src/shared/lib/__tests__`): allowlist fechado de dois
  (`ShippingMaterialSection.tsx` e `RuntimeSettingsLoader.tsx`); o `RuntimeSettingsLoader` **continua lendo
  `free_shipping_threshold` literalmente** (o guarda exige que a entrada do allowlist leia o campo) e passa também as
  regiões ao caminho não-React pelo leitor único; trocar essa leitura é decisão da tarefa 05, dona do guarda. **Não edite
  este guarda** (é da tarefa 05); ele precisa continuar verde.
- `packages/core/src/hooks` reexportado por `@estrelinha/core/hooks`: assinatura compatível (CEP opcional).
- Ordem de publicação (registrar no retorno): migration → functions → bundles.

### Não faça

- Não mexa no painel (`ShippingMaterialSection.tsx`, tarefa 05), nas functions e em `proposals` (tarefa 04), na gaveta,
  no checkout e nas superfícies (06..09).
- Não aplique migration no projeto hospedado.
- Não toque `packages/core/src/payment/**`.

### Pronto quando

- [ ] o tipo, o padrão e a migration têm `free_shipping_regions` com as cinco
- [ ] a migration aplicada no banco local e o probe registrado
- [ ] `useFreeShipping` aceita o CEP e, sem ele, devolve o de hoje
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
