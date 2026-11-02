## 03 · [packages/core · apps/mobile-adm] Tela "Loja ao vivo" — blocos Agora na loja, O que estão fazendo, Joias sendo vistas, De onde vieram, No celular

**Status:** done

`UC-05, UC-09 (parte)` — 90

**Objetivo.** Na tela Loja ao vivo, acima de Acessos, a Adri vê quem está na loja agora, o que está fazendo, quais joias (e o Guia) estão sendo vistas, de onde vieram e por qual aparelho, relendo a cada 15 s.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz: §O "defeito 01", §Convenções, §Os guardas, §Baselines, §CI e deploy); `DESIGN.md` › 2. Paleta; `apps/mobile-adm/CLAUDE.md` › A Loja ao vivo (feature 83) — Fase 1 · Os guardas do app · Testes; `packages/core/CLAUDE.md` › `live`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Tela "Loja ao vivo"); §6 · spec.md — Decisões D-04, D-10, D-14, D-15, D-19, D-20.

**Depende de.** 02 — `store_live`, `useStoreLive` (core e wrapper do app), `funnelOf`, `LIVE_WINDOW_MIN` e as frases da presença em `packages/core/src/live/`. A 03 não depende da 04: só monta os blocos acima de `SecaoAcessos`, que já existe, e não a altera. Confira que existe antes de começar.

### Critérios de aceite

**§5.2 cabeçalho**

### 5.2 Tela "Loja ao vivo" (`/ao-vivo`)

Cabeçalho com voltar, título "Loja ao vivo" e a linha de frescor "Atualizado agora" / "Atualizado há {s} s", calculada pelo `lido_em` do servidor (mesma régua de `LinhaDeFrescor`). Tem puxar para atualizar e lê a cada 15 s enquanto visível.


**A–E**

#### A. Agora na loja (Fase 2)
- **LAV-10** Cartão `ink`: número grande (56/700) em **dourado sobre ink** (o único lugar onde o ouro vira texto, que a regra permite sobre ink); "pessoas nos últimos 5 minutos".
- **LAV-11** Gráfico de 30 barras, uma por minuto dos últimos 30 min, com a barra atual em dourado e as legendas "30 min atrás" e "agora". Cada barra é o número de pessoas na loja naquele minuto, pela mesma regra do número grande; a barra de agora é igual ao número grande.
- **LAV-12** "Pessoa na loja" = visitante com batida nos **últimos 5 min**. A janela é uma constante única no `core` (`LIVE_WINDOW_MIN = 5`).

#### B. O que estão fazendo (Fase 2)
- **LAV-20** Quatro linhas. As três primeiras têm barra de proporção (largura = n ÷ total agora; com ninguém na loja, as três barras ficam vazias). "Compraram (últimos 30 min)" mostra só o número, sem barra, porque não faz parte de quem está na loja:
  1. "Olhando joias": presentes sem sacola;
  2. "Com joia na sacola": presentes com ao menos uma joia na sacola, inclusive a sacola guardada de uma visita anterior;
  3. "No checkout": quem está preenchendo os dados de compra, no checkout da sacola ou no de um pedido montado; quem está na tela de pagamento de um pedido já feito também conta aqui;
  4. "Compraram (últimos 30 min)": pedidos com `paid_at` nos últimos 30 min. Vem de `orders`, não da presença.
- **LAV-21** As três primeiras são **exclusivas e somam o total**. Quem está no checkout conta em "No checkout" e não em "Com joia na sacola". Deixar isso escrito no `core` com teste.
- **LAV-22** Com alguém no checkout, aparece a nota: "Alguém está no checkout agora. Se a compra não fechar e o e-mail já tiver sido preenchido, a sacola fica em Carrinhos abandonados, no painel." A nota não cita prazo.

#### C. Joias sendo vistas agora (Fase 2)
- **LAV-30** Até 5 linhas: foto (`image_url` da joia, molde do `TopJewels`), nome e "{n} pessoa(s)". Ordem: mais pessoas primeiro, empate por nome.
- **LAV-31** Páginas que não são de joia não entram nesta lista. O "Guia de envio do material" aparece na lista como uma linha própria, com o ícone `envio`, sempre que alguém estiver nele, além das até 5 joias, e ordenado junto delas pelo número de pessoas. Com gente só no Guia, a seção mostra a linha do Guia e não mostra "Ninguém olhando uma joia agora."
- **LAV-32** Sem ninguém numa página de joia, a seção mostra "Ninguém olhando uma joia agora."

#### D. De onde vieram (Fase 3)
- **LAV-40** Barra empilhada + legenda em grade de duas colunas (a quinta faixa ocupa a linha inteira), contando as pessoas que estão na loja agora — as mesmas do total "Agora na loja"; com ninguém na loja, a seção mostra "Ninguém na loja agora." As faixas são fixas, calculadas **no servidor**, no primeiro pulso da sessão:
  - **Instagram** (`instagram.com`, `l.instagram.com`, `utm_source=instagram`);
  - **Google** (busca e Shopping, `utm_source=google`);
  - **WhatsApp** (`wa.me`, `api.whatsapp.com`, `utm_source=whatsapp`). Quem chega por um link sem marcação de origem, aberto dentro do app do Instagram ou do WhatsApp, conta como "Direto", e a seção diz isso em letra pequena;
  - **Direto** (sem referência);
  - **Outros**.
  As regras moram numa função pura no `core` (`sourceBucket(referrer, utm)`) com teste.
- **LAV-41** Guarda só a **faixa**, nunca o referrer ou a URL de origem.

#### E. No celular (Fase 3)
- **LAV-45** "{m} de {n}" + "o resto pelo computador ou tablet" (sem a segunda linha quando todos estão no celular). Com ninguém na loja, o bloco mostra "Ninguém na loja agora." O aparelho é só `celular | computador | tablet`, calculado no servidor a partir do user agent, **sem gravar o user agent**.


**§5.3**

### 5.3 Comportamentos gerais
- **LAV-60** Uma leitura por ciclo com confirmação de papel (`lerComPapel`). Recusa `42501` cai no episódio único do app.
- **LAV-61** Nenhum número calculado no aparelho com o relógio do aparelho. Janelas, faixas e "agora" vêm do servidor.
- **LAV-62** O `h1` "Loja ao vivo" existe em todos os estados; `document.title = "Loja ao vivo · Ateliê"`.
- **LAV-63** Com a fonte do sistema grande, as grades 2×2 caem para uma coluna (`auto-fit`, piso `9rem`, como no `MovementHero`).
- **LAV-64** `prefers-reduced-motion`: as barras não animam a largura.
- **LAV-65** Sem dado de cliente: a tela nunca mostra nome, e-mail, cidade abaixo do mínimo ou qualquer coisa que identifique uma pessoa (teste-guarda `semDadoSensivelDeClienteNoApp`).

**§9 Textos**

## 9. Textos (copy)
- Cartão: "Agora na loja" · "{n} pessoas" · "{x} com joia na sacola" ("com joias" a partir de 2) · "{y} no checkout"; "1 pessoa" e "{n} pessoas" no número e no nome acessível do cartão · "Ninguém na loja agora".
- Tela: "Loja ao vivo" · "pessoas nos últimos 5 minutos" · "O que estão fazendo" · "Olhando joias" · "Com joia na sacola" · "No checkout" · "Compraram (últimos 30 min)" · "Joias sendo vistas agora" · "De onde vieram" · "No celular" · "Acessos" · "Visitas" · "Com sacola" · "Vendas" · "Conversão" · "Visitas por horário" · "Visitas por dia".
- Sem exclamação, sem emoji, sem "corra" ou "não perca".


**§10 (critérios 2, 4, 5)**

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

- Sobreposição de tela cheia, fundo `ground`, sem a barra de abas. Cabeçalho 60px `surface` com borda `line`: Voltar 44×44 (`chevron-left` 22, `aria-label="Voltar"`), título "Loja ao vivo" (no app é `h1`, LAV-62; display 700 17px) e o frescor 12px `ink-soft` — o cabeçalho já existe (`CabecalhoAoVivo`).
- Corpo rolável, padding 16, gap 12. Ordem: A · B · C · D · E · Acessos (margem superior extra de 12).
- **A, "Agora na loja"**: `ink`, texto `on-primary`, raio 20, padding 20; eyebrow com ponto `accent` em `on-ink-strong`; número 56px display 700, line-height 1, −0.03em, **`accent`**; ao lado "{pessoa|pessoas} nos últimos 5 minutos" 15/300 `on-ink-strong`; gráfico de **30 barras** (56px, gap 3, raio 2, última `accent`, outras `on-ink-border`, proporcional ao maior, piso 3); legenda 11px `on-ink` "30 min atrás" · "agora".
- **B, "O que estão fazendo"**: cartão `surface` padding 16, `h3` 17px; linhas com rótulo 14px e número display 700 `primary`; trilho 6px `ground-deep` raio 999 com preenchimento `round(n ÷ max(1,total) × 100)%`; cores: "Olhando joias" `field`, "Com joia na sacola" `primary`, "No checkout" `accent`; **"Compraram (últimos 30 min)" só com o número, sem barra** (PRD). Nota condicional (checkout > 0): margem 14, padding-top 12, borda superior `line`, 13px/1.45 `ink-soft`, com o texto do LAV-22 (sem prazo).
- **C, "Joias sendo vistas agora"**: cartão padding 4/16, `h3` 17; linhas com padding vertical 10, gap 12, divisória `line` a partir da 2ª; caixa 40×40 raio 6 `ground-deep` com a **foto** da joia (PRD; `primaryImage`), e na linha do Guia o ícone `envio` 22px `primary`; nome 14px; "{n} pessoa(s)" 13px `ink-soft` sem quebra.
- **D, "De onde vieram"**: barra empilhada 10px raio 999, gap 2, `flex: n`; legenda em duas colunas (`auto-fit`, piso `9rem`), gap 8/12, 14px, quadrado 10×10 raio 3, número display 700 `primary`. Cores: Instagram `primary`, Google `primary-strong`, WhatsApp `accent`, Direto `field`; **Outros** (não está no protótipo) com um token neutro do design system, e a quinta faixa ocupando a linha inteira; faixa com zero some; a nota em letra pequena sobre o "Direto".
- **E, "No celular"**: cartão `surface` padding 16, linha inteira (D-19); eyebrow; "{m} de {n}" display 700 20px `primary`; "o resto pelo computador ou tablet" 12px `ink-soft`, só quando nem todos estão no celular.
- Estados não desenhados, que seguem `apps/mobile-adm/src/shared/ui/leitura.tsx` e o PRD: carregando (traços), falha do bloco ("Não consegui carregar." + "Tentar de novo"), ninguém na loja em A–E, "Ninguém olhando uma joia agora.", só gente no Guia, loja não medida; falha da presença com Acessos de pé, e o contrário.

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `store_live`, `useStoreLive` (wrapper do app), `funnelOf`, frases da presença | JÁ EXISTE (tarefa 02). Consuma; não altere a forma da resposta. Nomes reais: migration `20261104130000_presenca-leitura.sql`; o hook de `core` é `useStoreLive` (`@estrelinha/core/hooks/useStoreLive`, chave `STORE_LIVE_KEY`) e o wrapper do app é `usePresenca({ refetchInterval })` (`@/entities/stats`, que também exporta `STORE_LIVE_KEY`); o tipo é `StoreLive` e as frases/constantes estão em `packages/core/src/live/presence.ts`, pelo barril `@estrelinha/core/live`: `LIVE_WINDOW_MIN`, `funnelOf`/`funnelStage`, `peopleWord`/`peopleCount`, `CHECKOUT_NOTE` (o texto do LAV-22), `NOBODY_ON_JEWEL`, `NOBODY_IN_STORE` (sem ponto final — a frase do cartão), `liveNotMeasuredLine` (a frase de Acessos para a loja não medida). `origens` vem SEMPRE com as cinco faixas em ordem fixa, inclusive as de zero; `guia` é um número; a fixtura do app é `@/test/presenca`. O guarda de tom já tem a régua da presença (`ESCOPO_DA_PRESENCA` em `tomDaLojaAoVivo.test.ts`): os arquivos novos entram nela. | | |
| widgets dos blocos A–E em `apps/mobile-adm/src/widgets/` (slice novo, ex.: `store-live`) | VOCÊ CRIA | resposta de `store_live` | |
| `AoVivoPage` | JÁ EXISTE (`apps/mobile-adm/src/pages/AoVivoPage.tsx`). Altere: segundo hook, vigia, puxar com as duas chaves, frescor da mais antiga, blocos acima de `SecaoAcessos` | | |
| `CabecalhoAoVivo`, `SecaoAcessos`, `useSegundosDesde`, `leitura.tsx` | JÁ EXISTE. Consuma. | | |

### Decisões já tomadas

- D-04: a barra de agora é igual ao número grande (vem assim do servidor; a tela não recalcula).
- D-14: frescor pela duração desde a chegada da resposta; na tela, o da leitura mais antiga das duas (`maisAntigo`).
- D-15: foto pela `imagens` + `primaryImage`, como o `TopJewels`.
- D-19: "No celular" ocupa a linha inteira (Cidades está fora).
- D-20: estados pelos componentes de `leitura.tsx` e as frases do PRD; movimento das barras com par `motion-reduce:` (ou sem transição nenhuma).
- Releitura: 15 s com a aba visível; puxar para atualizar relê `store_live` e `store_movement`; em segundo plano não lê.
- "pessoas" é o vocabulário da presença (`BL-058`, régua própria criada pela 02), e a mesma régua aceita "últimos" só seguido de duração ("últimos 5 minutos", "últimos 30 min").
- D-10: `store_live` é RPC admin com `has_role` no corpo e chave de cache própria, **sem `lerComPapel`** (desvio de LAV-60, como na 83); a recusa `42501` entra na mesma vigia (`useRecusaDePapel`).

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| Página com duas leituras e frescor da mais antiga | `apps/mobile-adm/src/pages/InicioPage.tsx` (`useRecusaDePapel([…])`, `maisAntigo`) |
| Lista com foto | `apps/mobile-adm/src/widgets/top-jewels/ui/TopJewels.tsx` |
| Bloco com estados | `apps/mobile-adm/src/widgets/store-access/ui/SecaoAcessos.tsx` e `shared/ui/leitura.tsx` (`Traco`, `FalhaDoBloco`) |
| Página da Loja ao vivo | `apps/mobile-adm/src/pages/AoVivoPage.tsx` |

### Testes

- Componente (`<App />` real sobre o `fakeSupabase`): a ordem A–E acima de Acessos; A com o número em dourado sobre ink, 30 barras e a última igual ao número; B com as três barras proporcionais, "Compraram" sem barra e a nota só com alguém no checkout, sem prazo; C com até 5 joias com foto, empate por nome, mais a linha do Guia ordenada junto, "Ninguém olhando uma joia agora." sem ninguém e só o Guia sem essa frase; D com as faixas, a quinta na linha inteira, faixa zero some, "Ninguém na loja agora." sem ninguém, a nota do Direto; E "{m} de {n}" e a segunda linha some quando todos estão no celular; estados de carregando, falha e não medida; falha da presença com Acessos de pé e o contrário; `h1` e `document.title` em todos os estados; releitura a 15 s só visível; puxar relê as duas; nenhum texto que identifique cliente.

### Obrigações

- `tomDaLojaAoVivo.test.ts` e `aoVivoSemRelogioDoAparelho.test.ts`: os arquivos novos entram nas listas literais (tom com a régua da presença, movimento com par).
- `semDadoSensivelDeClienteNoApp`: segue verde.
- Ouro como texto só sobre `ink` (bloco A); nos cartões claros os números são `primary`.
- `auto-fit`, piso `9rem`, em toda grade; o body nunca rola na horizontal.
- Nenhum relógio do aparelho além de `useSegundosDesde`.
- Gate: suítes de `apps/mobile-adm`, `packages/core`, `apps/store` e `apps/backoffice`, um workspace por vez, `--testTimeout=20000` sem o `--`, exit fora de pipe.

### Não faça

- Não mude `store_live`, o hook nem o cartão do Início (tarefa 02).
- Não mude `SecaoAcessos` nem as regras de Acessos (tarefa 04).
- Cidades (LAV-48): fora — sem bloco, sem espaço reservado.
- Nenhuma migration nesta tarefa.
- Nada de commit.

### Pronto quando

- [ ] os cinco blocos aparecem na ordem do protótipo, acima de Acessos, com os dados de `store_live`
- [ ] olhando + sacola + checkout = total e a barra atual = o número grande, na tela
- [ ] as joias têm foto, até 5, mais pessoas primeiro e empate por nome, com o Guia como linha própria
- [ ] cada bloco tem carregando, falha e vazio, e a falha de um não derruba o outro
- [ ] a tela relê a cada 15 s só visível, e o frescor é o da leitura mais antiga
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
