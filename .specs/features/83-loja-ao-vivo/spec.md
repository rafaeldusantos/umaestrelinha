# 83 — Loja ao vivo, Fase 1 (Acessos)

> App do ateliê (`apps/mobile-adm`), programa `AD-056`. Branch `feature/83-loja-ao-vivo`, worktree
> `store-83-loja-ao-vivo`. Fonte: [`prd.md`](prd.md) (copiado do pedido do usuário em 2026-10-26) e o
> protótipo descrito em [`prototipo.md`](prototipo.md) (cópia em `prototipo/`). **O PRD manda sobre o
> protótipo**; onde esta spec diverge do PRD, a linha está em *Assumptions* com `n — confirmar`.
>
> Esta feature implementa **só a Fase 1** do PRD (seção 4): a tela `/ao-vivo` com a seção **Acessos**
> e o cartão do Início em modo **"Visitas hoje"**. Presença, funil, joias vistas, origem, aparelho e
> cidades (Fases 2–4) ficam fora — e nenhuma tabela de presença é antecipada.
>
> Decisão nova: `AD-066` (no `design.md`, levada ao `STATE.md` na task 14). `AD-065` é da `82`, em
> outra sessão. Backlog novo a partir de `BL-055`. Migration com prefixo `20261029120000`.
>
> **Portão antes de executar** (task `T00`, revisão adversarial do plano): cada linha `n — confirmar`
> que muda **copy ou número visível** é confirmada ou recusada pelo usuário antes da `T01`. A
> comparação de Hoje e a de Semana mudam o SQL, por isso o portão vem antes do banco.
>
> **Portão `T00` resolvido pelo orquestrador em 2026-10-26**, sem consulta ao usuário: em cada linha
> `n — confirmar` vale a **escolha escrita nela** (a recomendação), e **Semana = opção (a)** (sem
> variação nenhuma). Nenhuma linha muda de escolha, então nada se propaga ao design nem às tasks. As
> linhas **seguem `n — confirmar`** na tabela: a confirmação de verdade continua com o usuário (copy e
> números) e com a Adri (emenda à `VIS-28` e texto da política, pré-condição do deploy).

## Problem Statement

A Adri abre o app e vê, na faixa do Início, quantas visitas a loja teve hoje, ontem e na semana — e
nada além do total. Ela não sabe **a que horas** as pessoas chegam, se a semana está melhor ou pior
que a anterior, nem quanto das visitas virou venda. O banco não guarda a hora de visita nenhuma
(`VIS-28`, feature `71`), então hoje essa pergunta não tem resposta em lugar nenhum. A Fase 1 dá a
resposta com o menor dado possível: **a hora cheia de Brasília da primeira visita do dia**, e mais nada.

## Goals

- [ ] A Adri responde "como foi o movimento?" no celular, numa tela: Visitas, Vendas e Conversão de
      Hoje · Ontem · Semana, cada uma com a variação contra o período comparável, e a distribuição
      das visitas por faixa de 3 horas (Hoje, Ontem) ou por dia (Semana).
- [ ] O número de Visitas e o de Vendas da Loja ao vivo são **idênticos** aos da faixa do Início no
      mesmo período, por construção (a mesma leitura, a mesma chave de cache).
- [ ] Nenhum número, janela, faixa ou "agora" é decidido pelo relógio do aparelho (`LAV-61`).
- [ ] O banco passa a guardar **só** a hora (0–23) da primeira visita do dia — nenhum IP, user agent,
      referrer, URL ou instante — e a Política de Privacidade diz isso antes do deploy.

## Out of Scope

| O que | Por quê |
| --- | --- |
| Fase 2 inteira: presença, "Agora na loja" com pessoas, mini gráfico de 15/30 barras, "O que estão fazendo", "Joias sendo vistas agora", nota de checkout (`LAV-01`..`LAV-03`, `LAV-10`..`LAV-32`) | PRD §4 e §11. Nenhuma tabela, RPC ou pulso de presença entra aqui (§6.2) |
| Fase 3 (`LAV-40`..`LAV-45`: origem, aparelho) e Fase 4 (`LAV-48`: cidades) | PRD §4 |
| O número "Com sacola" (`LAV-51` item 2) | depende do agregado diário da presença (Fase 2). Na Fase 1 o cartão **não é desenhado** — nem com traço, nem com zero |
| `core/live` com `LIVE_WINDOW_MIN`, `funnelOf`, `sourceBucket`, `deviceBucket`, `pageKind` (PRD §6.3) | "Na Fase 1 entram só os que a Fase 1 usa" (PRD §6.3, última linha) |
| Variação "vs semana anterior" | a poda da `71` guarda hoje e os 7 dias anteriores (`VIS-30`); a semana anterior inteira não existe no banco. Ampliar a retenção está fora (PRD §11). Registrado em `BL-055` |
| Histórico além de 7 dias, mapa de calor, gravação de sessão, push de "alguém no checkout" | PRD §11 |
| Mudar o bloco "Movimento da loja" do Backoffice | a Fase 1 é do app. O painel só passa a ler as três notas do contador do dono único (`LAV-75`), sem mudar uma palavra do que mostra |
| Mudar o `VisitCounter` da loja ou a function `visit` | a hora é decidida **no banco**, dentro de `record_store_visit`, a partir do instante do servidor. Nada do navegador muda, e nada novo trafega |

---

## Assumptions & Open Questions

| Assunção / decisão | Escolha | Razão | Confirmado? |
| --- | --- | --- | --- |
| **Emenda à `VIS-28`** (feature `71`): guardar a hora da primeira visita | `store_visits.first_hour smallint` (0–23), hora de **Brasília** do instante do **servidor** na inserção; a repetição do mesmo dia não altera. Sem minuto, sem instante, sem IP, user agent, página ou referrer | PRD §6.1 e §12 (pergunta 1, "seguimos com sim"). A hora cheia é o mínimo que responde "a que horas" | **n — confirmar** (Adri) |
| Texto novo da Política de Privacidade | o parágrafo do Apêndice A **desta** spec, que troca "esse código e a data" por "esse código, a data e a hora cheia da sua primeira visita naquele dia" e mantém o resto palavra por palavra | PRD §7. Declarar o que passa a ser guardado. **A aprovação da Adri é pré-condição do DEPLOY**, como na `71` | **n — aguarda a Adri** |
| Com quem **Hoje** se compara | **horas completas dos dois lados**: hoje de 0h até o início da hora atual (`first_hour < h`; vendas pagas antes de `início de hoje + h`) contra ontem no mesmo corte (`first_hour < h`; vendas antes de `início de ontem + h`). O número grande continua o **total** de hoje; só a variação usa o par. Texto: "vs ontem até as {h}h" (`h` = `comparacao.hoje.ate_hora`, do servidor) | comparar um dia em curso com um dia inteiro dá "−80% vs ontem" toda manhã. A primeira versão do plano ("ontem até o **fim** da hora atual") somava a hora corrente inteira de ontem contra minutos de hoje — às 15h02, 60 min contra 2: a mesma queda fabricada, em escala de hora (revisão adversarial). O protótipo e o PRD dizem "vs ontem" (dia inteiro) | **n — confirmar** |
| Hoje sem comparação possível | sem linha de variação quando: a hora atual é 0 (nenhuma hora completa); hoje **ou** ontem têm visita sem hora (as gravadas antes do deploy); a contagem começou em ontem ou depois; ou o teto (`capped_day`) caiu em hoje ou ontem | o corte por hora não existe para essas linhas, e um número parcial ou um piso seria falso | n — confirmar |
| **Semana** sem variação | padrão: os três números de Semana aparecem **sem** linha de variação. **Três opções no portão `T00`**: (a) sem variação nenhuma (padrão); (b) **Vendas** com "vs semana anterior" e Visitas/Conversão sem — `orders` não é podado, então a semana anterior até o mesmo ponto (de segunda até o mesmo dia e hora) é calculável; custo: uma tela em que um cartão compara e dois não, e duas colunas a mais no SQL; (c) as três, ampliando a retenção para 14 dias (fora do escopo, PRD §11) | a semana anterior das **visitas** não está no banco (retenção da `71`). `BL-055` | **n — confirmar (portão `T00`)** |
| Ontem contra anteontem | dia inteiro contra dia inteiro (os dois estão no banco); sem linha quando a contagem começou em anteontem ou depois | o PRD e o protótipo ("vs anteontem") | **s** (PRD) |
| Variação sem base | período anterior com `0` (ou indisponível) ⇒ **sem linha**, nunca "+∞%" nem "+100%" | não há percentual de zero | n — confirmar |
| Variação de `0%` | "0% vs …" em `ink-soft` | o protótipo pinta `≥ 0` de verde; "+0%" verde afirmaria uma alta que não houve | n — confirmar |
| Arredondamento da variação | metade **para longe do zero**, simétrico: `+12,5 ⇒ +13`, `−12,5 ⇒ −13` (`Math.sign(x) * Math.round(Math.abs(x))`) | `Math.round(-12.5)` dá `−12` e `Math.round(12.5)` dá `13`: altas e quedas iguais escreveriam números diferentes | n — confirmar |
| Visitas da comparação com o teto | `comparacao.*.visitas = null` quando o dia do teto (`capped_day`) é o dia comparado (ontem, anteontem) ou o dia exibido (hoje, ontem) | com o teto o número é um mínimo; comparar um piso com um valor real fabrica variação | n — confirmar |
| Faixas antes de `contagem_desde` | a faixa de Hoje ou Ontem que termina antes do início da contagem volta `null` do servidor e é desenhada como trilho vazio **sem número** (destaque `sem_contagem`), nunca `0` | um zero afirma "ninguém veio" onde nada foi contado. Só acontece no dia em que o contador começou | n — confirmar |
| Conversão acima de 100% | mostrada como calculada, sem teto | vendas incluem quem recusou estatísticas (não é contado em Visitas); a nota de consentimento (`LAV-67`) explica. Cortar em 100% esconderia o fato | n — confirmar |
| `LAV-60` sem `lerComPapel` | a tela lê **só** `store_movement`, que já recusa a conta sem papel com `42501` no próprio corpo (`has_role`). Não há tabela com RLS na leitura, e `atelie_clock` seria uma segunda ida sem ganho | precedente da Início (`MAI-23`, feature `73`): RPC admin confirma o papel por si. `SPEC_DEVIATION` do texto do PRD ("com confirmação de papel (`lerComPapel`)") | n — confirmar |
| Frescor "Atualizado agora / há {s} s" | volta **só nesta tela**, como o PRD pede, apesar da decisão de 2026-10-26 que tirou "Atualizado às" de todas as telas | a tela é de acompanhamento com releitura a cada 15 s; o frescor é o que diz que ela está viva. Com a releitura falhada, a linha vira "Não consegui atualizar agora." (`NAO_ATUALIZOU`) | **n — confirmar** |
| Como "há {s} s" é contado | **duração desde a chegada da resposta** (o mesmo `recebidoEm` local de `turnDelayMs`), nunca `Date.now() − lido_em` | comparar o instante do servidor com o relógio do aparelho erra com o aparelho adiantado ou atrasado (`LAV-61`). O PRD diz "calculada pelo `lido_em`" | n — confirmar |
| As três notas do contador ("Contando desde", teto, contador parado) | o **texto do painel**, levado a um dono único em `core/stats` e lido pelos dois apps — não os textos curtos do PRD ("Mais de 5.000 visitas neste dia — o número é um mínimo.", "Contando desde {data}.") | a mesma regra escrita em dois apps é o "defeito 01". Se a Adri preferir o texto do PRD, troca-se no dono e vale para os dois | **n — confirmar** |
| Resposta sem `acessos` (banco antigo) | o gráfico vira uma frase **estática, sem botão**: "O gráfico por horário ainda não está disponível." | "Tentar de novo" nunca daria certo com o banco antigo, e "Não consegui carregar." afirmaria uma falha de leitura que não houve | n — confirmar |
| Frase de falha do cartão do Início | "Não consegui carregar." + "Tentar de novo" (`FALHA_DE_LEITURA`, a frase que o app inteiro já usa) | o PRD diz "Não consegui ler agora." (`LAV-03`, Fase 2). Duas frases para a mesma falha no mesmo app divergem | n — confirmar |
| Desenho do cartão na Fase 1 (o protótipo não tem a variante) | a casca do protótipo (botão, raio 20, padding 16, sombra suave, chevron) com eyebrow **"Visitas hoje" sem o ponto dourado**, o número em display 30/700 `primary`, e a linha de apoio "Hoje, ontem e a semana, por horário" | o ponto dourado é o sinal "ao vivo" do protótipo; na Fase 1 nada é ao vivo (critério 7 do PRD) | **n — confirmar** |
| Releitura do Início a cada 30 s (`LAV-05`) | relê **a mesma leitura do movimento** (a faixa e o cartão juntos), só com a aba visível | o cartão e a faixa mostram o mesmo número; uma leitura separada poderia fazê-los discordar por segundos | n — confirmar |
| Leituras em segundo plano | **nenhuma** (critério 5 do PRD, ao pé da letra): além do intervalo, o timer da virada do dia e o aviso do Realtime **não leem** com a aba oculta — o timer pula a leitura e o Realtime invalida sem reler (`refetchType: 'none'`); a volta ao primeiro plano relê (`refetchOnWindowFocus`, `staleTime: 0`) | a primeira versão do plano prometia "nenhuma leitura" e só garantia "nenhuma **por intervalo**" (revisão adversarial). O timer e o Realtime mudam também para o painel, que lê o mesmo hook; lá a aba oculta também deixa de reler e relê ao voltar | n — confirmar |
| O intervalo com a leitura recusada | o `refetchInterval` é uma função que devolve `false` quando o erro da query é `42501` (`isAccessDenied`) | com o papel ainda admin a Início não desmonta, e um intervalo fixo martelaria a RPC recusada a cada ciclo | s (`MAI-22`) |
| Altura do seletor | **44 px** (o protótipo tem 40 px) | alvo de toque ≥ 44 px é regra do repositório | **s** (`CLAUDE.md`) |
| Visitas sem hora (gravadas antes do deploy) | ficam fora das faixas; com alguma, uma nota: "{n} visitas deste dia foram contadas antes da contagem por horário." | a soma das faixas tem de fechar com o total do dia — sem a nota, as barras somariam menos que "Visitas" sem explicação | n — confirmar |
| Soma das barras da Semana | pode **passar** do total de Visitas da semana: o mesmo navegador em dois dias conta em cada barra e uma vez na semana (`VIS-15`). A nota segue a do PRD ("Desde segunda-feira.") | regra da `71`. Se a Adri estranhar, a nota ganha a frase "Quem voltou em outro dia conta uma vez na semana." | **n — confirmar** |
| Período ao chegar do Início | vem no `history.state` da entrada (`{ doApp: true, periodo }`), nunca na URL; sem estado ou com valor fora do vocabulário ⇒ Hoje | sobrevive ao F5 e ao voltar; não suja o endereço | n — confirmar |
| Período do Início ao **voltar** | ao tocar o cartão, a Início grava o período na **própria** entrada (`history.replaceState`, molde de `useTermoDaEntrada`) e o lê ao remontar: voltar de `/ao-vivo` reabre a faixa no período em que a Adri saiu | sem isso, ir carrega o período e voltar o perde (a página desmonta) | n — confirmar |
| Os três cartões na largura padrão | Visitas e Vendas lado a lado; **Conversão em largura inteira** abaixo (`[&>*:last-child]:col-span-full`); a 200 % de fonte, uma coluna | o protótipo desenha 2 × 2 com quatro cartões; com três, o terceiro sozinho deixaria uma célula vazia | n — confirmar |
| "Pessoas" na Fase 2 × `VIS-41` | a Fase 1 recusa "pessoa(s)" nos **seus** arquivos (escopo literal); a Fase 2 do PRD escreve "pessoas" (presença conta pessoas; Visitas conta navegadores). O conflito vai para `BL-057`, a decidir antes da Fase 2 | o guarda da Fase 1 não pode nascer contradizendo o vocabulário que o PRD exige do mesmo módulo | s (registro) |
| O período do Início | a faixa do Início passa a ter o período **na página** (controlado), para o cartão levá-lo; o resto do comportamento da faixa não muda | `LAV-50` | **s** (PRD) |
| Hora da faixa em andamento e dos rótulos | do servidor (`faixa_atual`); rótulos fixos `0h 3h … 21h`; "hoje" na semana é o dia igual ao `hoje` do servidor | `LAV-61` | **s** (PRD) |
| Ontem no gráfico | as 8 faixas em `primary`, nenhuma dourada; sem faixa futura | o protótipo | **s** (protótipo) |
| Ordem de publicação | **migration → bundle** (o app novo lê a chave `acessos`). Com o banco antigo, a seção desenha os números e a falha do gráfico (`LAV-55`), nunca quebra | precedente da `66` e da `76` | **s** |

**Open questions:** nenhuma sem registro — todas acima, com a escolha padrão.

---

## User Stories

### P1: O cartão "Visitas hoje" no Início ⭐ MVP

**User Story**: Como a Adri, quero ver no Início quantas visitas a loja teve hoje, num cartão que abre
a Loja ao vivo, para chegar aos acessos com um toque.

**Why P1**: é a porta de entrada da tela; sem ela a tela só é alcançável por endereço.

**Acceptance Criteria**:

1. **LAV-04** WHEN a Início renderiza com o movimento lido THEN logo abaixo da faixa escura
   (`MovementHero`) SHALL existir um `<button>` de largura inteira, alvo ≥ 44 px, com eyebrow
   "Visitas hoje" (11 px, 600, caixa alta, `ink-soft`, **sem** ponto dourado), o número
   `store_movement.periodos.hoje.visitas` escrito em pt-BR (`1.240`, `formatCount` de `core/stats`)
   em display 30/700 `primary`, a linha "Hoje, ontem e a semana, por horário" (13 px `ink-soft`) e o
   chevron. A ordem no DOM SHALL ser: hero → **cartão** → `LinhaDeFrescor` (quando aparece) →
   `QueueTiles` ("Precisa de você"). Nome acessível por estado:
   - com dado: "Visitas hoje, {n}. Abrir loja ao vivo";
   - carregando: "Visitas hoje, carregando. Abrir loja ao vivo";
   - falha: "Visitas hoje: não consegui carregar. Tentar de novo".
   O cartão SHALL NOT mostrar "pessoa(s)", linha de sacola/checkout, mini gráfico de minutos nem a
   frase "Ao vivo em breve".
   - WHEN o cartão é tocado THEN o app SHALL gravar o período na entrada da Início
     (`history.replaceState`) e navegar a `/ao-vivo` com o estado `{ doApp: true, periodo }`, onde
     `periodo` é o período escolhido na faixa do Início naquele instante (`LAV-50`). WHEN a Adri volta
     THEN a faixa SHALL reabrir naquele período.
   - WHEN o movimento está carregando THEN o número SHALL ser um `Traco` (`aria-busy` no cartão) e o
     toque SHALL continuar abrindo `/ao-vivo`.
   - WHEN o movimento falhou sem dado (ou a leitura foi recusada) THEN o cartão SHALL mostrar
     "Não consegui carregar." no lugar do número, e o toque SHALL reler (não navegar); nunca um zero.
   - WHEN `hoje.visitas` é `0` THEN o cartão SHALL mostrar `0` — o cartão nunca some.
   - WHEN o número do cartão e o "Visitas" da faixa em Hoje são lidos na mesma tela THEN eles SHALL
     ser o mesmo valor (a mesma resposta).
2. **LAV-05** WHEN a Início está montada com a aba visível THEN o movimento SHALL ser relido a cada
   **30 s**; ao montar, no puxar para atualizar, na volta ao primeiro plano, no aviso do Realtime e
   na virada do dia, como já faz (`MAI-19`..`MAI-21`). WHEN a aba está em segundo plano THEN
   **nenhuma** leitura SHALL sair — nem do intervalo, nem do timer da virada do dia, nem do aviso do
   Realtime (que só invalida; a volta ao primeiro plano relê). WHEN a última leitura foi recusada
   (`42501`) THEN o intervalo SHALL parar.

**Independent Test**: montar o `<App />` em `/`, ler o cartão com `41` (o `hoje.visitas` do dublê),
tocar e ver `/ao-vivo` com o período da faixa; andar 30 s visível ⇒ +1 chamada de
`store_movement`; com o foco do React Query desligado, andar 90 s **atravessando a virada do dia** e
emitindo o aviso do Realtime ⇒ nenhuma.

---

### P1: A tela "Loja ao vivo" (casca) ⭐ MVP

**User Story**: Como a Adri, quero uma tela própria de acompanhamento, com voltar, título e a
indicação de que os números estão atualizados, que se atualiza sozinha enquanto eu olho.

**Why P1**: é a casa da seção Acessos e das fases seguintes.

**Acceptance Criteria**:

1. **LAV-06** WHEN a rota `/ao-vivo` é aberta THEN ela SHALL estar **dentro** do bloco do
   `RequireAdmin` (`rotasSobGuarda`), **sem** a barra de abas (`barraNoCaminho('/ao-vivo') === false`),
   e sem aba própria (a lista de `abasSaoAsRotas` passa a conhecê-la, com âncora e sensor).
   - WHEN o "Voltar" (44 × 44, `aria-label="Voltar"`) é tocado com `state.doApp` THEN o app SHALL
     voltar uma entrada (`navigate(-1)`); sem ele (link colado, F5 sem estado) SHALL ir a `/` por
     substituição.
2. **LAV-07** WHEN a tela renderiza THEN o cabeçalho SHALL ter 60 px de altura mínima, fundo
   `surface`, fio `line` embaixo, preso no topo (`sticky`), com o voltar, o `h1` "Loja ao vivo"
   (display 17/700) e a linha de frescor (12 px `ink-soft`):
   - "Atualizado agora" quando a última leitura boa chegou há **menos de 2 s**;
   - "Atualizado há {s} s" de 2 a 59 s; "Atualizado há {m} min" a partir de 60 s;
   - "Não consegui atualizar agora." quando a última releitura falhou com dado na tela;
   - nada enquanto não há dado. A duração é contada desde a chegada da resposta, nunca contra o
     relógio de parede do aparelho.
3. **LAV-08** WHEN a tela está montada com a aba visível THEN o movimento SHALL ser relido a cada
   **15 s**, no puxar para atualizar (`PullToRefresh`, só no topo), na volta ao primeiro plano e na
   virada do dia (o timer do hook). WHEN a aba está em segundo plano THEN nenhuma leitura SHALL sair
   (critério 5 do PRD) — nem do intervalo, nem do timer da virada. WHEN a última leitura foi recusada
   (`42501`) THEN o intervalo SHALL parar. Trocar de período SHALL NOT ler (`LAV-50`).

**Independent Test**: montar em `/ao-vivo` com `{ doApp: true }`, conferir `h1`, título do documento,
ausência da barra; andar 15 s ⇒ +1 chamada; voltar ⇒ a entrada anterior.

---

### P1: A seção Acessos ⭐ MVP

**User Story**: Como a Adri, quero ver Visitas, Vendas e Conversão de Hoje, Ontem e da Semana, com a
variação e o gráfico por horário ou por dia, para entender o movimento sem fazer conta.

**Why P1**: é a entrega da Fase 1.

**Acceptance Criteria**:

1. **LAV-50** WHEN a seção renderiza THEN ela SHALL ter o `h2` "Acessos" e um seletor segmentado
   Hoje / Ontem / Semana (fundo `ground-deep`, raio 12, padding 4; cada botão ≥ 44 px, `aria-pressed`;
   ligado: `surface` + `ink`; desligado: transparente + `ink-soft`).
   - O período inicial SHALL ser o `periodo` do `history.state` quando é `'hoje' | 'ontem' |
     'semana'`; qualquer outro valor, ou nenhum, ⇒ Hoje.
   - WHEN o período muda THEN nenhuma chamada SHALL sair: os três vêm da mesma resposta.
2. **LAV-51** WHEN um período está escolhido THEN SHALL aparecer **três** cartões, nesta ordem, cada
   um com eyebrow, número (display 22/700 `primary`) e, quando houver, a linha de variação (12 px):
   1. **Visitas** = `periodos[p].visitas` — o mesmo valor do "Visitas" da faixa do Início em `p`;
   2. **Vendas** = `periodos[p].vendas`;
   3. **Conversão** = `vendas ÷ visitas × 100` com **uma** casa decimal em pt-BR (`2,1%`; `0,0%`
      com vendas zero); **"—"** quando visitas = 0.
   - Visitas e Vendas lado a lado; a Conversão em largura inteira abaixo; a 200 % de fonte, uma coluna.
   - O cartão "Com sacola" SHALL NOT existir na Fase 1.
   - A variação SHALL ser `(atual − anterior) ÷ anterior × 100` arredondado a inteiro com a metade
     **para longe do zero** (`+12,5 ⇒ +13`, `−12,5 ⇒ −13`), escrita
     "+{p}% vs {anterior}" em `done` quando `p > 0`, "−{p}% vs {anterior}" (sinal U+2212) em
     `ink-soft` quando `p < 0`, e "0% vs {anterior}" em `ink-soft` quando `p = 0`. Nunca vermelho.
   - {anterior}: Hoje ⇒ "ontem até as {h}h" (`h` = `acessos.comparacao.hoje.ate_hora`); Ontem ⇒
     "anteontem"; Semana ⇒ **sem linha** (salvo a decisão do portão `T00`).
   - Em Hoje, o par comparado é `comparacao.hoje.base_hoje` × `comparacao.hoje` (horas completas dos
     dois lados); o número grande continua o total.
   - A variação da Conversão é relativa entre as duas conversões. Sem anterior (`null`), anterior
     `0`, ou conversão de qualquer lado indefinida ⇒ **sem linha** naquele cartão.
   - Cada cartão SHALL ser um `role="group"` com `aria-label` "{rótulo}, {período falado}, {valor}"
     (o período falado vem do dono único de `PERIODOS`) e, com variação, a frase da variação dentro do
     grupo. O teste o encontra por `getByRole('group', { name })`.
3. **LAV-52** WHEN o período é Hoje ou Ontem THEN o cartão do gráfico SHALL ter o `h3` "Visitas por
   horário" e **8** colunas `0h 3h 6h 9h 12h 15h 18h 21h`, cada uma com o valor (11 px) em cima, a
   barra (raio 6, altura `max(4, round(v ÷ máx × 84))` px numa área de 120 px) e o rótulo embaixo.
   - Hoje: a faixa `acessos.faixa_atual` em `accent` com rótulo `ink`; as anteriores em `primary`
     com rótulo `ink-soft`; as **futuras** (valor `null`) sem número, barra de 4 px em `line`.
   - Ontem: as 8 em `primary`, nenhuma dourada, nenhuma futura.
   - Hoje e Ontem: a faixa que o servidor devolve `null` **antes** da faixa atual (anterior ao início
     da contagem) é desenhada como a futura — trilho de 4 px em `line`, sem número —, nunca `0`.
   - Com a fonte grande, as colunas têm largura mínima em `rem` e o gráfico rola **dentro** do próprio
     cartão (`overflow-x-auto`); o valor nunca se sobrepõe ao vizinho e o `body` nunca rola.
   WHEN o período é Semana THEN o `h3` SHALL ser "Visitas por dia", com uma coluna por dia **de
   segunda até hoje** (`acessos.semana.por_dia`), rótulo `seg … dom` e, no último, "hoje" em `accent`.
   - WHEN todos os valores são `0` THEN todas as barras SHALL ter 4 px e o valor "0".
4. **LAV-53** WHEN o gráfico renderiza THEN a nota (12 px `ink-soft`) SHALL ser "Faixas de 3 horas,
   pela hora da primeira visita." em Hoje e Ontem, e "Desde segunda-feira." em Semana. WHEN o dia
   escolhido (Hoje ou Ontem) tem `sem_hora > 0` THEN SHALL aparecer também "{n} visitas deste dia
   foram contadas antes da contagem por horário." ("1 visita deste dia foi contada…" no singular).
5. **LAV-54** WHEN o período escolhido começa antes da contagem THEN SHALL aparecer a linha
   "Contando desde {dd/mm} às {HHhMM}" (`countingSinceLine`, o dono único de `LAV-75`). WHEN o dia do
   teto (`teto_dia`) está dentro do período THEN SHALL aparecer a linha do teto (`cappedLine`). WHEN
   a contagem nunca começou (`contagem_desde` nulo) THEN SHALL aparecer a linha do contador parado
   (`emptyCounterLine`).
6. **LAV-55** Estados da seção, exclusivos (`L-063`):
   - carregando (sem dado): `aria-busy="true"`, `Traco` no lugar dos três números e do gráfico,
     o seletor desabilitado, **nenhum** número e nenhuma frase de falha;
   - falha sem dado: "Não consegui carregar." + "Tentar de novo" (relê), **nenhum** número, sem
     `aria-busy`;
   - com dado: os números; uma releitura falhada mantém os números e só muda a linha de frescor;
   - com dado e **sem** a chave `acessos` (banco antigo): os três números **sem** linha de variação, e
     no lugar do gráfico a frase estática "O gráfico por horário ainda não está disponível.", **sem**
     botão — nunca uma exceção, nunca "Tentar de novo".

**Independent Test**: com o dublê devolvendo um movimento com `acessos`, conferir os três cartões e
as 8 colunas em cada período, as notas, e que a troca de período não chama a RPC.

---

### P1: Os dados da Fase 1 (o banco)

**User Story**: Como a Adri, quero que o banco guarde o mínimo para responder "a que horas" — e que
os números novos venham do servidor na mesma leitura de sempre.

**Why P1**: sem o dado, a seção não tem o que mostrar.

**Acceptance Criteria**:

1. **LAV-70** WHEN a migration `20261029120000_83-loja-ao-vivo.sql` aplica THEN `store_visits` SHALL
   ganhar `first_hour smallint` com `check (first_hour between 0 and 23)`, **anulável** (linhas antigas
   ficam `null`), e nenhuma outra coluna. WHEN `record_store_visit` **insere** a linha do dia THEN
   `first_hour` SHALL ser a hora de Brasília do `p_agora` (via `store_hour`, que lê
   `store_time_zone()`). WHEN o mesmo `(dia, id)` volta mais tarde THEN `first_hour` SHALL NOT mudar
   (`on conflict do nothing`, nenhum `update` em `store_visits`). Os desfechos, o teto de 5.000, a
   poda e o `grant … to service_role` SHALL ficar idênticos.
2. **LAV-71** WHEN `store_movement` responde THEN a resposta SHALL ter, além de tudo o que já tem e
   **sem mudar** `periodos`, a chave `acessos` com:
   - `faixa_atual` = `greatest(store_hour(p_agora), max(first_hour) de hoje) / 3` (0..7) — a linha
     que comitou com hora acima do `p_agora` da leitura (visita das 15:00:00.001 contra leitura das
     14:59:59.999) puxa a faixa atual, nunca some do gráfico;
   - `hoje.por_faixa`: 8 valores; a faixa `f` conta as linhas do dia com `first_hour / 3 = f`; as
     faixas `f > faixa_atual` são `null`; as faixas que terminam antes de `contagem_desde` são `null`;
   - `ontem.por_faixa`: 8 valores, com o mesmo `null` antes de `contagem_desde`;
   - `hoje.sem_hora` e `ontem.sem_hora`: as linhas do dia com `first_hour` nulo;
   - tudo o que vem de `store_visits` (os `periodos`, as faixas, `sem_hora`, `por_dia`, a comparação)
     sai de **um único comando** SQL — um único snapshot em READ COMMITTED;
   - invariante: `soma(por_faixa) + sem_hora = periodos[dia].visitas`, nos dois dias (as faixas `null`
     antes da contagem não têm linha, então somam 0).
3. **LAV-72** WHEN `store_movement` responde THEN `acessos.semana.por_dia` SHALL ser a lista
   `[{ dia: 'AAAA-MM-DD', visitas }]` de `inicio_semana` até `hoje`, um item por dia, dia sem visita
   com `0`; o último item SHALL ter `dia = hoje` e `visitas = periodos.hoje.visitas`.
4. **LAV-73** WHEN `store_movement` responde THEN `acessos.comparacao` SHALL trazer:
   - `hoje`: `{ ate_hora, visitas, vendas, base_hoje: { visitas, vendas } }` com `ate_hora` = hora
     atual `h`; `visitas`/`vendas` de **ontem em horas completas** (`first_hour < h`;
     `paid_at < início de ontem + h`, a mesma régua de venda de `periodos`); `base_hoje` com o mesmo
     corte em hoje (`first_hour < h`; `paid_at < início de hoje + h`). `visitas` **e**
     `base_hoje.visitas` = `null` quando `h = 0`, quando hoje ou ontem têm linha sem hora, quando a
     contagem começou no dia de ontem ou depois (ou nunca começou), ou quando o teto caiu em hoje ou
     ontem; `vendas` e `base_hoje.vendas` = `null` quando `h = 0`;
   - `ontem`: `{ dia (anteontem), visitas, vendas }` do dia inteiro de anteontem, com `visitas = null`
     quando a contagem começou em anteontem ou depois (ou nunca começou), ou quando o teto caiu em
     ontem ou anteontem;
   - `semana`: `null`.
5. **LAV-74** WHEN as funções são recriadas THEN `store_movement` SHALL continuar recusando sem papel
   com `42501` **antes** de qualquer leitura, `security definer`, `search_path = ''`, `execute` só a
   `authenticated` (nunca `anon`/`public`), a poda com `least(…)`; `record_store_visit` e
   `store_hour` sem `execute` a `anon`/`authenticated`. Nenhuma tabela nova, nenhuma RPC nova chamada
   por app, nenhuma escrita de dado na migration, o fuso só por `store_time_zone()`.

**Independent Test**: probe `probes/01-acessos.sql` contra o banco local (`begin … rollback`),
provando cada invariante nas bordas (02:59/03:00, 23:59 de Brasília = dia seguinte em UTC, segunda,
domingo, dia sem visita, linha sem hora, repetição), e as recusas de `anon` e de cliente.

---

### P1: Comportamentos gerais

**Acceptance Criteria**:

1. **LAV-60** WHEN `store_movement` responde `42501` THEN a tela SHALL entrar no episódio único da
   recusa (`useRecusaDePapel` → `RequireAdmin` → Login com a frase da `72`), sem desenhar número
   nenhum, nem o do cache. Erro de rede ou 500 SHALL ser falha, nunca recusa.
2. **LAV-61** WHEN qualquer número, faixa, faixa em andamento, dia da semana ou "hoje" é desenhado
   THEN ele SHALL vir da resposta do servidor; nenhum arquivo da seção ou do cartão SHALL ler
   `new Date(…)`, `Date.now()` ou `getHours` — exceto o hook de duração do frescor, que mede
   duração desde a chegada (`LAV-07`).
3. **LAV-62** WHEN `/ao-vivo` está aberta, em qualquer estado THEN o `h1` "Loja ao vivo" SHALL existir
   e `document.title` SHALL ser "Loja ao vivo · Ateliê"; na troca de rota o foco vai ao `h1`
   (`MAF-29`).
4. **LAV-63** WHEN a fonte do sistema é grande THEN a grade dos números SHALL cair para uma coluna
   (`grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))]`), sem número pintado sobre outro e sem
   rolagem horizontal do `body` em 360/390/412 a 100/130/200 %.
5. **LAV-64** WHEN `prefers-reduced-motion` está ligado THEN nada na seção SHALL animar; na Fase 1 as
   barras **não têm** transição nenhuma, e todo `transition-*`/`animate-*` dos arquivos novos tem o par
   `motion-reduce:` na mesma linha (o do `Traco` já tem).
6. **LAV-65** WHEN a tela e o cartão renderizam THEN nenhum literal SHALL ter nome, e-mail, cidade,
   emoji, `!`, urgência ("corra", "não perca", "últimas") nem "pessoa(s)"/"usuário(s)" (o número é de
   navegadores, `VIS-41`); `semDadoSensivelDeClienteNoApp` segue verde.

---

### P2: Privacidade

**Acceptance Criteria**:

1. **LAV-66** WHEN `/politica-de-privacidade` renderiza THEN a seção "Medição de audiência" SHALL
   conter o parágrafo do **Apêndice A** desta spec, palavra por palavra, no lugar do da `71`;
   `politicaDoContador.test.ts` SHALL cobrar o parágrafo novo e ganhar o sensor "sem a hora reprova".
2. **LAV-67** WHEN a seção Acessos renderiza com dado THEN ela SHALL terminar com a linha (12 px
   `ink-soft`) "Conta só quem aceitou cookies de estatística."

---

### P1: Dono único das notas do contador

**Acceptance Criteria**:

1. **LAV-75** WHEN o app desenha "Contando desde…", o teto do dia ou o contador parado THEN o texto
   SHALL vir de `countingSinceLine`, `cappedLine` e `emptyCounterLine` em `@estrelinha/core/stats`;
   o painel (`widgets/store-movement/model/labels.ts`) SHALL **reexportar** as três por referência
   (guarda com `toBe`) e a suíte do painel SHALL ficar idêntica em contagem e sem asserção tocada.

---

## Edge Cases

- WHEN hoje é segunda-feira THEN `por_dia` SHALL ter 1 item, e a Semana SHALL desenhar uma coluna.
- WHEN são 00:30 de Brasília THEN `faixa_atual = 0`, e as faixas 1..7 de hoje SHALL ser `null`.
- WHEN são 23:59 de Brasília (já o dia seguinte em UTC) THEN a linha gravada SHALL ter `day` de hoje
  e `first_hour = 23`, e `faixa_atual = 7`.
- WHEN 02:59 e 03:00 THEN `first_hour` 2 (faixa 0) e 3 (faixa 1).
- WHEN o mesmo navegador visita às 09h e às 15h THEN ele SHALL contar uma vez, na faixa 9h.
- WHEN a virada do dia acontece com a tela aberta THEN a releitura (timer do hook ou ciclo de 15 s)
  SHALL trocar Hoje e Ontem pelos do servidor; "Ontem" passa a ser o dia que era "Hoje".
- WHEN o dia do deploy tem visitas sem hora THEN as faixas somam menos que Visitas e a nota de
  `LAV-53` diz quantas.
- WHEN visitas = 0 e vendas > 0 THEN a Conversão SHALL ser "—" e sem variação.
- WHEN a resposta não traz `acessos` THEN `LAV-55`, último item.
- WHEN a conta perde o papel com a tela aberta THEN a próxima releitura recebe `42501` e `LAV-60`.
- WHEN o app vai para segundo plano e volta THEN uma leitura na volta (`refetchOnWindowFocus`), e o
  ciclo recomeça.
- WHEN dois `record_store_visit` simultâneos do mesmo id no mesmo dia THEN uma linha, com a hora do
  primeiro que inseriu (o outro é `repetida`) — provado por `concorrencia.sh` da `71` depois da `83`.
- WHEN a leitura é às 15h02 e ontem teve a mesma distribuição de hoje THEN a variação de Hoje SHALL
  ser `0%` (horas completas dos dois lados, `ate_hora = 15`), nunca uma queda; às 00h30 SHALL não
  haver linha de variação.
- WHEN uma visita comita com `first_hour` acima da hora do `p_agora` da leitura THEN ela SHALL contar
  no gráfico (a faixa atual sobe) e a invariante `soma + sem_hora = visitas` SHALL valer.
- WHEN a contagem começou hoje às 14h THEN as faixas 0h..9h de Hoje SHALL vir `null` (sem número),
  não `0`.

### Dimensões implícitas (sweep)

| Dimensão | Requisito |
| --- | --- |
| Validação e limites | `first_hour` 0..23 por `check`; período de entrada só do vocabulário (`LAV-50`); teto de 5.000 intacto (`LAV-70`) |
| Falha / falha parcial | `LAV-55` (três estados + resposta sem `acessos`), `LAV-07` (releitura falhada) |
| Idempotência / repetição | `LAV-70` (a repetição não altera a hora) |
| Autorização e limite de taxa | `LAV-60`, `LAV-74`; o limite por IP da function `visit` não muda |
| Concorrência / ordem | `on conflict do nothing` (edge case acima); resposta antiga descartada pelo React Query (chave única) |
| Ciclo de vida do dado | a poda da `71` (8 dias) vale para a coluna nova; sem retenção nova |
| Observabilidade | N/A porque a Fase 1 não acrescenta caminho de servidor novo além da RPC recriada; os probes são a prova |
| Dependência externa | N/A porque a Fase 1 não chama serviço externo |
| Transição de estado | N/A porque não há máquina de estado; a hora é escrita uma vez, na inserção |

---

## Requirement Traceability

| ID | História | Fase | Status |
| --- | --- | --- | --- |
| LAV-04 | P1 cartão | Tasks (09) | Pending |
| LAV-05 | P1 cartão | Tasks (09) | Pending |
| LAV-06 | P1 casca | Tasks (06, 08) | Pending |
| LAV-07 | P1 casca | Tasks (04, 08) | Pending |
| LAV-08 | P1 casca | Tasks (03, 08) | Pending |
| LAV-50 | P1 Acessos | Tasks (06, 07) | Pending |
| LAV-51 | P1 Acessos | Tasks (04, 07) | Pending |
| LAV-52 | P1 Acessos | Tasks (07) | Pending |
| LAV-53 | P1 Acessos | Tasks (04, 07) | Pending |
| LAV-54 | P1 Acessos | Tasks (05, 07) | Pending |
| LAV-55 | P1 Acessos | Tasks (07, 08) | Pending |
| LAV-60 | P1 gerais | Tasks (08, 11) | Pending |
| LAV-61 | P1 gerais | Tasks (02, 10) | Pending |
| LAV-62 | P1 gerais | Tasks (08) | Pending |
| LAV-63 | P1 gerais | Tasks (07, 13) | Pending |
| LAV-64 | P1 gerais | Tasks (10) | Pending |
| LAV-65 | P1 gerais | Tasks (10) | Pending |
| LAV-66 | P2 privacidade | Tasks (12) | Implemented |
| LAV-67 | P2 privacidade | Tasks (07) | Pending |
| LAV-70 | P1 dados | Tasks (01, 02) | Pending |
| LAV-71 | P1 dados | Tasks (01, 02) | Pending |
| LAV-72 | P1 dados | Tasks (01, 02) | Pending |
| LAV-73 | P1 dados | Tasks (01, 02) | Pending |
| LAV-74 | P1 dados | Tasks (01, 02) | Pending |
| LAV-75 | P1 dono único | Tasks (05) | Pending |

**Coverage:** 25 total, 25 mapeados a tasks, 0 sem task.

---

## Success Criteria

- [ ] Para cada período, Visitas e Vendas da Loja ao vivo == as da faixa do Início (a mesma chave
      `['store-movement']`), provado pelo `<App />` real **atravessando as duas telas**: ler a faixa
      nos três períodos em `/`, tocar o cartão e ler a seção nos três, com valores distintos por
      período e por campo na fixtura (`L-013`) — task `T09`.
- [ ] Com o app em segundo plano, **zero** chamadas de `store_movement` (Início e `/ao-vivo`) — nem
      do intervalo, nem do timer da virada do dia, nem do aviso do Realtime —, provado com o foco do
      React Query desligado, o relógio atravessando a virada e o aviso emitido.
- [ ] O banco não guarda IP, user agent, referrer, URL nem instante: `store_visits` tem exatamente
      `day`, `visitor_id`, `first_hour` — o guarda novo lê **todas** as migrations que alteram a tabela
      **e** o probe confere `information_schema.columns` no banco aplicado.
- [ ] O cartão do Início não mostra nenhum número ao vivo (critério 7 do PRD).
- [ ] No banco local, `soma(por_faixa) + sem_hora = visitas` em hoje e ontem, e o último `por_dia` =
      `hoje.visitas` (probe).
- [ ] A política declara a hora antes do deploy (guarda), e a Adri aprovou o texto.
- [ ] Em 390 × 844, a tela e o cartão sem rolagem horizontal, alvo ≥ 44 px, e a 200 % de fonte os
      números em uma coluna (prova em navegador).

---

## Apêndice A — o parágrafo da política (para a Adri aprovar)

Substitui o parágrafo da `71` na seção "Medição de audiência" de `/politica-de-privacidade`. A única
mudança é o trecho em negrito; o resto é o texto da `71`, palavra por palavra.

> Além disso, conto quantas visitas a loja recebe a cada dia. Para isso, o seu navegador guarda um
> código aleatório, que não identifica você pelo nome e não tem relação com os seus pedidos. Em cada
> dia em que você visita a loja, o meu servidor registra esse código, **a data e a hora cheia da sua
> primeira visita naquele dia (por exemplo, 14h)** — e nada mais: não guardo o seu IP junto dessa
> contagem, nem as páginas que você viu. Esses registros são apagados depois de 8 dias e não são
> compartilhados com ninguém, nem com o Google. Desligar “Estatísticas” também desliga essa contagem
> e apaga o código do seu navegador; limpar os dados do site no navegador tem o mesmo efeito.
