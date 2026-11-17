## 04 · [apps/backoffice] A linha do bloco e a bandeja na lista da Home (`/admin/home`)

**Status:** done

`UC-02, UC-04 (lado da lista)` — WI 103

**Objetivo.** Na lista da Home, a linha de cada bloco "Joias em oferta" diz qual campanha ele mostra, em que estado, se não vai aparecer e por quê, e quais peças escolhidas não aparecem; e a bandeja permite acrescentar outro bloco.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` › Feature-Sliced Design, › O "defeito 01", › Os guardas, › Baselines · `apps/backoffice/CLAUDE.md` › `/admin/home` — a composição, › Gravar NÃO desmonta a tela (VIV-05), › O movimento do painel · `packages/core/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código (UC-02, UC-04; Decisões F1, F2)

**Depende de.** 03 — o hook das marcações da campanha e a leitura do estado das peças escolhidas em `apps/backoffice/src/entities/campaign`; 02 — o motivo de não aparecer e as frases em `core/home/campaignOffers.ts`, `campaign_offers` repetível. Confira que existem antes de começar.

### Critérios de aceite

**UC-02 · Escolher a campanha do bloco**
- CA-02.3 A linha do bloco na lista da Home diz qual campanha está escolhida e o estado dela; se ela não está em vigência, diz que o bloco não vai aparecer e por quê. [código: apps/backoffice/CLAUDE.md › `HOME-09`]
- CA-02.4 Todo bloco "Joias em oferta" tem uma campanha escolhida para aparecer na loja; o bloco sem campanha não aparece e o painel pede a escolha. O bloco acrescentado pela bandeja nasce desligado e sem campanha; o editor só salva com uma campanha escolhida, e enquanto não houver campanha a linha do bloco diz que ele não aparece na loja e pede a escolha (ligá-lo não o faz aparecer). [gate: Q-10 (c); prd-review r1: campanha-102-e-103-publicadas-juntas, bloco-novo-nasce-sem-campanha-pela-bandeja]
- CA-02.5 Se a campanha escolhida for apagada, o bloco fica sem campanha e não aparece na loja; a linha do bloco e o editor dizem que ele está sem campanha e pedem a escolha — a mesma mensagem do bloco que ainda não teve campanha. [prd-review r1: campanha-apagada-indistinguivel-de-sem-campanha]
- CA-02.6 A Home pode ter mais de um bloco "Joias em oferta", cada um com a sua campanha. Uma campanha que já tem outro bloco aparece desabilitada na lista, dizendo a posição e o título desse bloco; se mesmo assim duas gravações colidirem, salvar é recusado com a mesma frase. [gate: Q-06, P-07; prd-review r1: seletor-com-escolha-fora-da-lista-e-campanha-ja-usada]

**UC-04 · Peça escolhida que deixa de valer**
- CA-04.1 Peça escolhida que saiu do ar (despublicada ou apagada) não aparece na loja e o painel conta "N das M saíram do ar", nomeando a peça. [código: useAdminResolvedHome.ts:124-142; packages/core/src/home/types.ts:232-238]
- CA-04.4 Peça marcada cujo preço a campanha não baixa não aparece no bloco, como não aparece na vitrine; o editor e a linha do bloco dizem quais peças escolhidas não aparecem por esse motivo. [código: .specs/work-items/102-desconto-de-campanha/spec.md:416 (I-02); prd-review r1: peca-que-a-campanha-nao-barateia-some-sem-aviso]

**RNF**
- RNF-04 Em 390 px o bloco e o editor não rolam na horizontal; o editor continua usável com a fonte do sistema a 200 %. [código: prd 102 RN-15; apps/store/CLAUDE.md › Mobile]
- RNF-05 Tom memorial: os textos fixos novos do bloco e do editor não usam urgência, contagem regressiva, escassez nem exclamação. [código: campaignOffers.ts:7-8; prd 102 RN-14]
- RNF-08 Os campos e o seletor têm rótulo acessível; a recusa é anunciada como alerta, com o motivo. [conhecimento]

### Design — o que a tela faz

Sem protótipo (D-01). A linha segue a forma das outras linhas da lista (`HomeSectionRow`): resumo com o nome da campanha e o estado; quando o bloco não vai aparecer, o aviso diz por quê (sem campanha — "escolha uma campanha" —, agendada, encerrada, desligada); a mesma mensagem para "perdeu" e "nunca teve"; "N das M saíram do ar" nomeando a peça; as peças que a campanha não barateia. A bandeja oferece "Joias em oferta" mesmo com outro bloco na Home; o novo nasce desligado e sem campanha.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| resumo da linha `campaign_offers` (`apps/backoffice/src/features/home-composition/ui/HomeSectionRow.tsx`) | JÁ EXISTE. Altere | seção, campanhas | campanha, estado, motivo |
| assinatura de "linha recém-salva" (`HomeSectionList.tsx`) | JÁ EXISTE. Inclua `campaign_id` (ANI-03) | — | — |
| motivo de não aparecer e frases (`packages/core/src/home/campaignOffers.ts`) | JÁ EXISTE (02). Consuma | — | — |
| hook das marcações e estado das peças escolhidas (`apps/backoffice/src/entities/campaign`: `useCampaignMarks(campaignId)` → `{ marks, ids, loading, error, retry }`; `useCampaignPiecesState(campaignId, productIds)` → `{ states, loading, error }`, cada estado `{ product_id, name, status: 'no-ar' \| 'apagada' \| 'fora-do-ar' \| 'fora-da-campanha' \| 'nao-barateada' }`; as frases `piecesOffAirText`, `piecesNotLoweredText`, `piecesOutOfCampaignText`) | JÁ EXISTE (03). Consuma | — | — |
| `useAdminResolvedHome` (`features/home-composition/model/useAdminResolvedHome.ts`) e `droppedCount` | JÁ EXISTE. Consuma | — | — |
| `createSection` / bandeja (`HomeBlockTray.tsx`) | JÁ EXISTE. Muda sozinha com `campaign_offers` repetível (02); confira | — | — |

### Decisões já tomadas

- F1: a mesma mensagem para o bloco que perdeu a campanha (apagada) e o que nunca teve.
- F2: o bloco acrescentado pela bandeja nasce desligado e sem campanha; ligá-lo não o faz aparecer, e a linha diz isso e pede a escolha.
- A linha decide "vai aparecer?" pelo estado da campanha (`campaignStatus` do painel, relógio do painel, como o resto do painel — I-11 da 102); a loja decide pelo banco.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| resumo e aviso de ausência na linha | `HomeSectionRow.tsx` (o resumo das outras seções e `avisoDeAusencia`) |
| estado da campanha | `CampaignStatusPill`, `core/campaigns/text.ts › campaignStatusLine` |

### Testes

- A linha diz a campanha escolhida e o estado; fora de vigência, que o bloco não vai aparecer e por quê; sem campanha (ou com a campanha apagada), a mesma frase pedindo a escolha, mesmo ligado.
- A linha conta "N das M saíram do ar" nomeando a peça e diz quais peças a campanha não barateia.
- A linha acende ao trocar a campanha (assinatura com `campaign_id`).
- A bandeja oferece o segundo "Joias em oferta" (a 02 já inverteu o caso em `HomeBlockTray.test.tsx`; confira) e o novo nasce desligado e sem campanha, com a linha pedindo a escolha.

### Obrigações

- `motion-reduce:` na mesma linha de classe que move.
- Tom memorial nos textos (vêm de `core`).
- 390 px: a linha não pode estourar a largura (texto longo embrulha dentro do próprio container).

### Não faça

- Não mude o editor do bloco (03), o widget da loja nem a migration (02).
- Não reescreva a regra "barateia?" no painel: pergunte ao dono de `core/campaigns` pelo hook da 03.

### Pronto quando

- [ ] a linha diz campanha, estado e o motivo de não aparecer, inclusive sem campanha
- [ ] a linha nomeia as peças fora do ar e as não barateadas
- [ ] a bandeja acrescenta outro bloco "Joias em oferta", desligado e sem campanha
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
