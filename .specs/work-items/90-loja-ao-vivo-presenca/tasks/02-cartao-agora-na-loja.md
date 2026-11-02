## 02 · [supabase · packages/core · apps/mobile-adm] Início — cartão "Agora na loja"

**Status:** done

`UC-03, UC-04, UC-07 (funnelOf, LIVE_WINDOW_MIN, frases), UC-09 (parte)` — 90

**Objetivo.** A Adri abre o Início e vê quantas pessoas estão na loja agora, quantas com joia na sacola e no checkout, e o mini gráfico dos últimos 15 minutos; o toque abre a Loja ao vivo.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz: §O "defeito 01", §Convenções, §Os guardas, §Baselines, §CI e deploy); `DESIGN.md` › 2. Paleta; `apps/mobile-adm/CLAUDE.md` › A Início (feature 73) · A Loja ao vivo (feature 83) — Fase 1 · Os guardas do app · Testes; `packages/core/CLAUDE.md` › Pureza · `live`; `supabase/CLAUDE.md` › Migrations · RLS · `visit` (store_movement) · `store_overview`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Início — cartão "Agora na loja"); §4 · spec.md — Código; §6 · spec.md — Decisões D-03 (só a leitura), D-04, D-10, D-11, D-14..D-17, D-20.

**Depende de.** 01 — as tabelas da presença (estado efêmero, registro por minuto) e `pageKind`. Confira que existe antes de começar.
**Habilita.** 03 consome `store_live`, o hook `useStoreLive` (core + wrapper do app), `funnelOf`, `LIVE_WINDOW_MIN` e as frases da presença em `packages/core/src/live/`.

### Critérios de aceite

**LAV-01..LAV-05** (LAV-04 descreve a Fase 1, que esta tarefa substitui)

- **LAV-01** O cartão é um botão de largura inteira (alvo ≥ 44 px) que abre `/ao-vivo`. Nome acessível: "Agora na loja, {n} pessoas. Abrir loja ao vivo".
- **LAV-02** Conteúdo: eyebrow "Agora na loja" com ponto dourado (`accent`, **estático**, sem pulsar: o DESIGN.md proíbe animação infinita); número em `font-display` 30/700 `primary`; "pessoa" ou "pessoas"; linha "{x} com joia na sacola · {y} no checkout" (cada parte some quando é zero); mini gráfico de 15 barras (últimos 15 min, a barra atual em dourado); chevron.
- **LAV-03** Estados:
  - carregando: traços (`Traco`) no lugar do número e do gráfico;
  - falha: "Não consegui carregar." e "Tentar de novo", a mesma frase do resto do app;
  - **zero pessoas:** "Ninguém na loja agora" e o gráfico continua visível. Nunca esconder o cartão. Enquanto a loja não estiver sendo medida (antes do endereço de produção estar no ar, ou sem endereço configurado), o cartão e a seção dizem isso com a mesma frase que Acessos já usa, em vez de "Ninguém na loja agora".
- **LAV-04** **Fase 1 (sem presença):** o cartão mostra "Visitas hoje" com o número de `store_movement.periodos.hoje.visitas` e a linha "Ao vivo em breve" **não aparece**. O cartão só passa a "Agora na loja" quando a Fase 2 existir. Não pode haver número inventado.
- **LAV-05** Atualização: lê ao montar, a cada **30 s com a aba em primeiro plano** (Page Visibility) e no puxar para atualizar do Início. Em segundo plano, não lê.

**LAV-12, LAV-20 (item 4), LAV-21**

- **LAV-12** "Pessoa na loja" = visitante com batida nos **últimos 5 min**. A janela é uma constante única no `core` (`LIVE_WINDOW_MIN = 5`).
- **LAV-20** Quatro linhas. As três primeiras têm barra de proporção (largura = n ÷ total agora; com ninguém na loja, as três barras ficam vazias). "Compraram (últimos 30 min)" mostra só o número, sem barra, porque não faz parte de quem está na loja:
  1. "Olhando joias": presentes sem sacola;
  2. "Com joia na sacola": presentes com ao menos uma joia na sacola, inclusive a sacola guardada de uma visita anterior;
  3. "No checkout": quem está preenchendo os dados de compra, no checkout da sacola ou no de um pedido montado; quem está na tela de pagamento de um pedido já feito também conta aqui;
  4. "Compraram (últimos 30 min)": pedidos com `paid_at` nos últimos 30 min. Vem de `orders`, não da presença.
- **LAV-21** As três primeiras são **exclusivas e somam o total**. Quem está no checkout conta em "No checkout" e não em "Com joia na sacola". Deixar isso escrito no `core` com teste.

**§5.3 (os desta tela)**

- **LAV-60** Uma leitura por ciclo com confirmação de papel (`lerComPapel`). Recusa `42501` cai no episódio único do app.
- **LAV-61** Nenhum número calculado no aparelho com o relógio do aparelho. Janelas, faixas e "agora" vêm do servidor.
- **LAV-62** O `h1` "Loja ao vivo" existe em todos os estados; `document.title = "Loja ao vivo · Ateliê"`.
- **LAV-63** Com a fonte do sistema grande, as grades 2×2 caem para uma coluna (`auto-fit`, piso `9rem`, como no `MovementHero`).
- **LAV-64** `prefers-reduced-motion`: as barras não animam a largura.
- **LAV-65** Sem dado de cliente: a tela nunca mostra nome, e-mail, cidade abaixo do mínimo ou qualquer coisa que identifique uma pessoa (teste-guarda `semDadoSensivelDeClienteNoApp`).

**§6.2 Leitura** (o campo `abandono_horas` está superado pela Decisão D-10)

- **Leitura:** `store_live(p_agora timestamptz default now())`, `security definer`, só admin, devolve:
```json
{ "lido_em": "...", "janela_min": 5,
  "agora": { "total": 7, "olhando": 4, "sacola": 2, "checkout": 1 },
  "compraram_30min": 0,
  "minutos": [3,4,4,…,7],
  "joias": [{ "id": "...", "nome": "...", "image_url": "...", "pessoas": 3 }],
  "origens": [{ "faixa": "instagram", "n": 3 }],
  "aparelho": { "celular": 6, "computador": 1, "tablet": 0 },
  "abandono_horas": 4 }
```


**§9 Textos**

## 9. Textos (copy)
- Cartão: "Agora na loja" · "{n} pessoas" · "{x} com joia na sacola" ("com joias" a partir de 2) · "{y} no checkout"; "1 pessoa" e "{n} pessoas" no número e no nome acessível do cartão · "Ninguém na loja agora".
- Tela: "Loja ao vivo" · "pessoas nos últimos 5 minutos" · "O que estão fazendo" · "Olhando joias" · "Com joia na sacola" · "No checkout" · "Compraram (últimos 30 min)" · "Joias sendo vistas agora" · "De onde vieram" · "No celular" · "Acessos" · "Visitas" · "Com sacola" · "Vendas" · "Conversão" · "Visitas por horário" · "Visitas por dia".
- Sem exclamação, sem emoji, sem "corra" ou "não perca".


**§10 (critérios 2, 5, 7 — o 7 deixa de valer: a Fase 2 existe)**

## 10. Critérios de aceite (resumo)
1. Os números de Visitas e Vendas da Loja ao vivo são **idênticos** aos da faixa do Início para o mesmo período.
2. A soma Olhando + Sacola + Checkout é igual ao total "Agora na loja".
3. Um navegador sem consentimento, robô, host interno ou com opt-out nunca aparece em nenhum número.
4. Fechar a aba da loja tira a pessoa do total em até 5 min.
5. Com o app em segundo plano, não sai nenhuma leitura.
6. O banco não guarda IP, user agent, referrer nem URL (teste de esquema).
7. O cartão do Início na Fase 1 não mostra nenhum número ao vivo.


### Design — o que a tela faz

Fonte: Claude Design, projeto `a780eec8-8aba-4d6e-8b4c-2c485e2750c7`, `Ateliê Admin.dc.html` (etag `1793064028832969`); cópia local `.specs/features/83-loja-ao-vivo/prototipo/Atelie-Admin.dc.html` e capturas em 390 na mesma pasta (`02-inicio-cartao-agora-na-loja.png`, `03-ao-vivo-topo-390.png`, `05-ao-vivo-fim-390.png`). **A UI segue o protótipo** (pedido do usuário) em estrutura, tokens e medidas; onde o protótipo diverge do `prd.md`, vale o `prd.md`.

- Lugar: logo abaixo da faixa escura do Início, antes de "Precisa de você"; área com padding 16 no topo e 20 nas laterais.
- `<button>` de largura inteira, `surface`, borda `line`, raio 20, padding 16, `shadow-soft`; linha com gap 14:
  1. texto (flex 1, gap 4): eyebrow com ponto 8×8 `accent` estático e "Agora na loja" (11/600, caixa alta, .1em, `ink-soft`); número `font-display` 700 30px −0.02em `primary` com "pessoa"/"pessoas" 14px `ink-soft`; linha do funil 13px `ink-soft`.
  2. mini gráfico 96×40, alinhado embaixo, gap 2, **15 barras**; altura relativa ao maior valor dos 30 min (piso 3, teto 40); a última `accent`, as outras `line`; raio 2.
  3. chevron `chevron-right` 20px `ink-soft`.
- Toque abre "Loja ao vivo" (`/ao-vivo`), preservando a gravação do período na entrada que o cartão da 83 já faz (`gravarPeriodoNaEntrada`).
- Estados não desenhados no protótipo, que seguem `apps/mobile-adm/src/shared/ui/leitura.tsx` e o PRD: carregando (traços no número e no gráfico), falha ("Não consegui carregar." + "Tentar de novo"), zero ("Ninguém na loja agora", gráfico visível), loja ainda não medida (a frase de Acessos, `emptyCounterLine`).

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `store_live(p_agora timestamptz default now())` — `security definer`, `has_role` como primeiro comando ⇒ `42501`, `execute` só a `authenticated`; devolve `lido_em`, `janela_min`, `agora { total, olhando, sacola, checkout }`, `compraram_30min`, `minutos` (30), `joias` (até 5, `id`, `nome`, `imagens`, `pessoas`), `guia` (pessoas), `origens`, `aparelho`, e o sinal de "não medida" | VOCÊ CRIA (migration nova) | | 02 e 03 |
| `useStoreLive` em `packages/core/src/hooks/` + wrapper em `apps/mobile-adm/src/entities/stats/api/leituras.ts` | VOCÊ CRIA | | 02 e 03 |
| `LIVE_WINDOW_MIN`, `funnelOf`, frases da presença (`liveCardLine`, plurais, nome acessível, `checkoutNote` sem prazo, estados vazios) em `packages/core/src/live/` | VOCÊ CRIA | | 02 e 03 |
| tabelas da presença, `pageKind`, `sourceBucket`, `deviceBucket` | JÁ EXISTE (tarefa 01). Consuma; não altere. | | |
| `emptyCounterLine` | JÁ EXISTE (`packages/core/src/stats/counterNotes.ts`). Consuma. | | |
| `store_overview` › `imagens`, `primaryImage` | JÁ EXISTE (`20261027120000_inicio-fotos-das-joias.sql`, `TopJewels.tsx`). Consuma. | | |

### Decisões já tomadas

- D-04: cada barra = pessoas presentes naquele minuto pela mesma janela de 5 min do total; a barra de agora é igual ao número grande.
- D-10: RPC própria `store_live` com `has_role` no corpo, chave de cache própria, sem `lerComPapel`; a recusa entra na mesma vigia (`useRecusaDePapel`); sem `abandono_horas` no contrato.
- D-11: "loja ainda não medida" = o mesmo sinal de Acessos (`emptyCounterLine`, `contagem_desde` nulo) e a mesma frase.
- D-15: `store_live` devolve `imagens` como `store_overview`; o app usa `primaryImage`.
- D-16: "Compraram (últimos 30 min)" pela régua de venda de `store_movement` (`payment_status = 'approved'` e `status <> 'cancelled'`), janela pelo instante do servidor, sem Realtime novo.
- D-17 / `BL-058`: "pessoas" é o vocabulário da presença; a régua de tom ganha uma regra própria que permite "pessoa(s)" só nos arquivos da presença e continua recusando nos da Fase 1. A mesma régua da presença aceita "últimos" **só** seguido de duração ("últimos 5 minutos", "últimos 30 min"), que é janela de tempo e não urgência; "últimas unidades", "corra", "não perca" continuam recusados em todo arquivo.
- D-18: a leitura sempre recorta pela janela (5 min, 30 min), nunca confia na poda.
- Frase de falha: "Não consegui carregar." + "Tentar de novo" (a do app, `FALHA_DE_LEITURA`/`TENTAR_DE_NOVO`).
- Plurais: "1 pessoa"/"{n} pessoas"; "{x} com joia na sacola" ("com joias" a partir de 2); cada parte da linha do funil some quando é zero.
- Releitura: 30 s com a aba visível, e no puxar do Início; em segundo plano não lê.
- Migration: prefixo único **maior que o da tarefa 01**; a tarefa 04 corre em paralelo e cria a sua com prefixo maior que o desta — use o prefixo da 01 + 1 hora (ex.: `…130000` se a 01 usou `…120000`).

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| RPC admin com portão `has_role` | `supabase/migrations/20261029120000_83-loja-ao-vivo.sql › store_movement` (o primeiro comando) |
| Foto na RPC | `supabase/migrations/20261027120000_inicio-fotos-das-joias.sql:78` — `p.images as imagens` |
| Hook admin com intervalo só visível e parada na recusa | `packages/core/src/hooks/useStoreMovement.ts` (`refetchInterval` função, `refetchIntervalInBackground: false`) |
| Wrapper do app | `apps/mobile-adm/src/entities/stats/api/leituras.ts › useMovimento` |
| Cartão-botão da Início | `apps/mobile-adm/src/widgets/visits-card/ui/CartaoVisitasHoje.tsx` |
| Início com várias leituras | `apps/mobile-adm/src/pages/InicioPage.tsx` (`useRecusaDePapel([…])`, `reler`, `maisAntigo`) |
| Frases puras | `packages/core/src/live/access.ts`, `card.ts` |
| Guarda de tom | `apps/mobile-adm/src/shared/lib/__tests__/tomDaLojaAoVivo.test.ts` |
| Client real | `apps/mobile-adm/src/app/__tests__/aoVivoComClientReal.test.tsx`, `src/test/clientReal.ts` |

### Testes

- Unidade `packages/core`: `funnelOf` (as três faixas exclusivas somam o total; quem está no checkout não conta em sacola); plurais e nome acessível; `checkoutNote` sem prazo; `purity` de `live` com o arquivo novo.
- Componente (`<App />` real sobre o `fakeSupabase`): cartão carregando com traços; falha com "Não consegui carregar." e "Tentar de novo" que relê; zero com "Ninguém na loja agora" e gráfico visível; não medida com a frase do contador; nome acessível com o plural certo; as partes de sacola e checkout somem no zero; a barra atual é a dourada e são 15; o toque abre `/ao-vivo`; a recusa `42501` da `store_live` leva à recusa do app sem número; nenhuma leitura em segundo plano; o puxar relê também a presença.
- Client REAL: `store_live` 403 `42501` ⇒ Login e nenhum número em instante algum; 500 ou rede caída ⇒ falha, nunca recusa.
- Integração local (probe `begin … rollback`): `store_live` dá `42501` sem papel; cada barra pela janela de 5 min e a última igual ao total; o funil soma o total; "Compraram" conta pago e não cancelado; recorta pela janela sem poda; `imagens` como `store_overview`.
- Guarda de tom com a régua da presença ("pessoas" permitido só nos arquivos dela).

### Obrigações

- `tomDaLojaAoVivo.test.ts`: o `ESCOPO` literal e a âncora "Visitas hoje" mudam com o cartão novo — atualize o escopo e a âncora para os arquivos e literais vigentes, sem afrouxar a régua; acrescente a régua própria da presença.
- `aoVivoSemRelogioDoAparelho.test.ts`: os arquivos novos do app entram na lista literal; `core/live/**` continua varrido inteiro (nada de `Date.now()`/`new Date()` ali).
- `packages/core/src/live/__tests__/purity.test.ts`: o barril importa exatamente a lista — acrescente o arquivo novo. **Esta tarefa é dona do barril `packages/core/src/live/index.ts`** (a 04 roda em paralelo e não o toca).
- `marcacaoSoPorAcao.test.ts`: acrescentar `store_live`.
- Ouro como texto só sobre `ink` (`DESIGN.md` › Paleta) — no cartão claro o número é `primary`, nunca `accent`.
- Toda `transition-*`/`animate-*` com o par `motion-reduce:` na mesma linha.
- `auto-fit` com piso `9rem` onde houver grade; prova de layout é do navegador, não do jsdom.
- `Migration nova em `supabase/migrations/`: apure o maior prefixo existente na hora (hoje o último é `20261103120000_89-pedido-montado.sql`) e use um prefixo maior e único; compare o **prefixo**, não o nome (`CLAUDE.md` › o merge da 48/49). Aplique só no local: `supabase migration up --local` (nunca `--linked`, nunca `supabase stop --all`). Confira `supabase status` antes; sem o local de pé, pare e relate.
- Gate: suítes de `packages/core`, `apps/mobile-adm`, `apps/store` e `apps/backoffice`, um workspace por vez, `--testTimeout=20000` sem o `--`, exit fora de pipe.

### Não faça

- Não desenhe os blocos A–E da tela `/ao-vivo` (tarefa 03).
- Não toque em `store_movement`, `prune_store_visits`, `SecaoAcessos`, `packages/core/src/live/access.ts` nem `packages/core/src/stats/movement.ts` (tarefa 04, em paralelo).
- Não mude as tabelas nem a gravação da presença (tarefa 01).
- Não use `lerComPapel` nem Realtime novo.
- Nada de commit, nada de `--linked`.

### Pronto quando

- [ ] o cartão mostra o total, a linha do funil com as partes que somem no zero e 15 barras com a atual dourada, a partir de `store_live`
- [ ] carregando, falha, zero e não medida têm o texto certo e o cartão nunca some
- [ ] o nome acessível é "Agora na loja, {n} pessoa(s). Abrir loja ao vivo" com o plural certo
- [ ] a leitura repete a cada 30 s só com a aba visível, e a recusa `42501` cai no episódio do app
- [ ] olhando + sacola + checkout = total, no `core` e no probe
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório (`CLAUDE.md` §Comandos e §Baselines; o que ele não declara, `.specs/project/PROJECT.md` › Comandos de verificação)

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
