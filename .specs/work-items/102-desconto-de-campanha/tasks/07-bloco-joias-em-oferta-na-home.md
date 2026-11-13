## 07 · [packages/core · supabase · apps/store · apps/backoffice] Home — bloco "Joias em oferta"

**Status:** done

`UC-07` — 102

**Objetivo.** A dona acrescenta à Home o bloco "Joias em oferta", que mostra os percentuais e algumas peças da campanha em vigência e some sem campanha.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · CI e deploy · Feature-Sliced Design / Alias de import; `apps/store/CLAUDE.md` › (a seção da Home e dos blocos); `apps/backoffice/CLAUDE.md` › `/admin/home` e a ponte da prévia; `packages/core/CLAUDE.md` › `home`; `supabase/CLAUDE.md` › Migrations. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Home · "Joias em oferta"); §4 · spec.md — Código (Home); §7 · spec.md — Decisões (H-10).

**Depende de.** 01 — `core/campaigns` (texto da vitrine). 04 — `apps/store/src/entities/campaign/`, o preço efetivo e o selo. Confira que existem antes de começar.

### Critérios de aceite

### UC-07 · O bloco "Joias em oferta" na Home
- Os cartões de percentual da campanha (um por percentual, levando à vitrine com o filtro) e uma fileira de peças em
  oferta. O título e os percentuais vêm da campanha em vigência; sem campanha em vigência, o bloco não aparece.
- É um bloco da Home que a dona acrescenta pela bandeja e liga. Entra neste item (Decisão D-04).

- **RN-14 · Tom.** O selo diz o texto da campanha e o percentual; a vitrine diz até quando vale, por data ("até 30 de
  novembro"). Nada de contagem regressiva, "últimas horas" ou escassez — em nenhuma superfície da campanha.

- **CA-12** Uma campanha com outro nome ("Dia das Mães", texto do selo "DIA DAS MÃES") mostra esse texto no selo, na
  vitrine e no bloco da Home, sem mudança de código.

- **CA-15** Em 390×844 e 1440×900: o selo inteiro nos cartões de 173 e 220 px, sem rolagem horizontal; fonte a 200 %
  sem cortar o percentual; a tela de campanhas do painel sem rolagem lateral em 390.

### Design — o que a tela faz

Copie spec.md › Design › "Home · Joias em oferta". Rótulo e título vindos da campanha, texto "Peças selecionadas com {lista} de desconto. O valor de cada joia já aparece com o desconto.", um cartão por percentual (número grande, "de desconto", "Ver as peças →", nome acessível "Ver as peças com {n}% de desconto"; uma coluna no celular, três colunas a partir de 768 px; tons da paleta da loja), "Algumas das peças em oferta" + "Ver todas", fileira de cartões com a faixa.

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| tipo novo em `HOME_SECTION_TYPES` (único em `UNIQUE_SECTION_TYPES`) e rótulo "Joias em oferta" | VOCÊ CRIA | — | — |
| migration que recria o `check` de `home_sections.type` | VOCÊ CRIA | — | — |
| widget da loja e registro no renderer da Home | VOCÊ CRIA | a campanha em vigência e as peças marcadas | o bloco, ou nada |
| bandeja e linha do bloco no painel (`/admin/home`) | VOCÊ CRIA | — | — |
| `entities/campaign`, preço efetivo, selo | JÁ EXISTE (tarefa 04). Consuma; não altere. | `useLiveCampaign()` (leitura pública por `now()`; `LiveCampaign`: `id`, `name`, `badge_text`, `band_color`, `accent_color`, `ends_at` exclusivo, `percents` em ordem) e `mapDbToProduct` | a campanha em vigência ou `null`; `Product.price`/`compare_price` (e os das variações) já com a campanha, e `Product.campaign` (com `percent`) na peça cujo preço ela baixa — o `ProductCard` já desenha a faixa (`CampaignBand`) e o cheio riscado; o selo em linha é `CampaignBadgeInline` |

### Decisões já tomadas

- H-10 (verbatim): Bloco da Home: um cartão por percentual (1 a 5), cada um a `/ofertas?percentual=<p>`; "Ver todas" a `/ofertas`; sem campanha em vigência não renderiza; tipo único na Home, sem campos de configuração (título e percentuais vêm da campanha).
- H-09: título, rótulo e percentuais vêm da campanha; os tons dos cartões são os do protótipo (paleta da loja).
- O bloco nasce desligado, como todo bloco novo (`HOME-10`); a migration não semeia seção nenhuma.
- H-12: Migration: só no banco local (`supabase migration up --local`, nunca `--linked`). Nome `supabase/migrations/<prefixo>_102-<slug>.sql`; o prefixo é o próximo livre **a partir de** `20261130140000` (spec.md › Decisões H-12) — apure na hora com `ls supabase/migrations`, e se o WI 101 já tiver um prefixo igual na árvore, use o seguinte.

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| recriar o `check` e o guarda nos dois sentidos | `supabase/migrations/20260906120000_41-banner-principal-da-home.sql` + `apps/store/src/shared/lib/__tests__/homeSections.test.ts:46-62,150-171` |
| bloco de peças da Home | `packages/core/src/home/featured.ts`, `ProductCarousel` |
| catálogo | `packages/core/src/home/catalog.ts:11-22,36,99-105` |

### Testes

- `core/home`: o catálogo com o tipo novo (`catalog.test.ts`, âncora de 11 para 12) e o rótulo.
- `homeSections.test.ts`: o `check` vigente é o da migration nova e contém todos os tipos; nenhum tipo de contagem regressiva.
- Widget (componente): sem campanha, nada; com 3 percentuais, 3 cartões com os links `/ofertas?percentual=<p>`; com 1 e com 5; com "Dia das Mães", o nome da campanha.
- `HomeRenderer.test.tsx` exige componente para o tipo; a bandeja do painel oferece o bloco.

### Obrigações

- Nesta onda, só esta tarefa cria migration com hora `14` e edita `core/home/*`, o renderer da Home e `features/home-composition`; não edite `animacaoRespeitaMovimento.test.ts` (nesta onda é da tarefa 03) — se um arquivo de UI novo do painel tiver transição, ponha o par `motion-reduce:` na mesma linha e registre no retorno que o escopo literal do guarda ainda não o inclui.
- `previaUnica.test.ts` (o painel não desenha a Home) e `toNewItems.test.ts` verdes.

### Não faça

- A vitrine `/ofertas` (tarefa 06); o selo e o preço (tarefa 04); campos de configuração no bloco.

### Pronto quando

- [ ] UC-07 e o bloco de CA-12 provados por teste; a migration aplicada no banco local
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
