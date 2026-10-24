# 76 — validação

**Estado**: Verificador independente, **rodada 1/3: PASS** (2026-10-24, autor ≠ verificador). O QA
(`qa-report` + `qa-execution`) ainda não correu. Este arquivo guarda a evidência do gate de fecho (T31), das
provas das T29, T30 e T32 e, ao fim, a rodada 1 do Verificador.

## Gate de fecho (T31, 2026-10-24)

Um workspace por vez, exit code fora de pipe, `pnpm --filter @estrelinha/<w> test --testTimeout=20000`.

| Workspace | Entrada (`baseline.md`) | Fecho | Delta |
| --- | --- | --- | --- |
| core | 4219/166 | **4313/175** | +94/+9 |
| mobile-adm | 1102/76 | **1698/107** | +596/+31 |
| store | 5885/320 | **5908/322** | +23/+2 |
| backoffice | 3696/212 | **3706/213** | +10/+1 (só arquivo NOVO; nenhum teste antigo tocado) |
| functions | 957/21 | 957/21 | 0 |
| catalog-import | 512/23 | 512/23 | 0 |
| **Total** | 16371/818 | **17094/861** | +723/+43 |

Tipos: 0 em store (app e `tsconfig.server.json`), backoffice, mobile-adm (app e node) e catalog-import; 11
em `packages/core`, os mesmos herdados. Lint: mobile-adm 0/0, backoffice 23/5, store 2/2. Builds do
mobile-adm e do backoffice verdes. `packages/core/src/payment/**` sem alteração. Uma migration
(`20261025120000_76-clientes-em-aberto.sql`), prefixo único. Nenhuma RPC nova em `marcacaoSoPorAcao`.

## Provas

- **T29** `apps/mobile-adm/src/app/__tests__/clientesComClientReal.test.tsx` — 12 casos; 5 mutantes de
  `lerComPapel`/`useJanelaPaginada` mortos por asserção (SHA-256 conferido).
- **T30** `probes/03-paridade.*` — 42 `ok —`; 2 mutantes em `core/customers` mortos
  (`probes/03-paridade.mutantes.txt`).
- **T32** `prova-navegador.md` — 60 medidas de layout, percurso, privacidade, conta sem papel; nenhum defeito.

## Pendências declaradas

Verificador independente; QA; **Android real** (TQ10); as assunções `n — confirmar` da spec e do design que
o usuário ainda não confirmou; a aplicação da migration em produção (ver `supabase/CLAUDE.md`).

## Verificador independente — rodada 1 (2026-10-24): PASS

**Medição própria** (worktree sem alteração minha; um workspace por vez, exit fora de pipe,
`--testTimeout=20000`): core **4313/175**, mobile-adm **1698/107**, backoffice **3706/213**, store
**5908/322** — todos exit 0 e **idênticos** ao fecho do autor. `tsc`: 0 em store, backoffice e mobile-adm; 11
em `packages/core` (os herdados). Lint: store 2/2, backoffice 23/5, mobile-adm 0/0 (a baseline). Functions e
`packages/core/src/payment/**` sem alteração. O diff do painel é só `customerQuery.ts` e
`useAdminCustomerList.ts` (nenhum teste antigo do painel tocado: só o arquivo novo
`regrasDeClienteNoCore.test.ts`). Probes contra o banco local, reexecutados: `03-paridade.sh` **42 `ok —`**,
"TUDO OK" nas duas fases, banco restaurado 54/9/48; `02-em-aberto.sh` reproduz os ~7,9 s (ver observação).

**ACs**: os 38 `MAC-*` têm teste que os nomeia (de 1 a 8 arquivos cada); as de menor cobertura nominal
(`MAC-30`, `MAC-33`, `MAC-36`) foram sondadas por mutante (abaixo) e morrem por asserção.

**Sensor de discriminação**: 62 identificadores de mutante (um inválido, M51, descartado) nos arquivos de produção reais (core/customers,
migration, hooks, páginas, widgets, `lerComPapel`, `App.tsx`, painel, `BlocoCliente`), um por vez, SHA-256
conferido na restauração, execução dos testes do módulo. **56 mortos por asserção**, **0 por compilação**
(M09 e M24 inicialmente morreram por `ReferenceError` de mutação mal escrita e foram refeitos válidos), **5
sobreviventes, todos equivalentes** (provado por leitura do código):

| Mutante | Por que é equivalente |
| --- | --- |
| M18 `href = whatsappChatUrl(phone)` sem o guarda do telefone | `whatsappChatUrl` devolve `null` para número inválido: mesmo `href` |
| M34 remove `if (itens.error) return nomes` | com erro `data` é `null` e o laço usa `?? []`: mesmo mapa vazio |
| M53, M55 `recusada ? undefined` em `dado`/`janela` da ficha | `falhou = recusada || …` é testado antes e desenha a falha no lugar de todo o corpo |
| M60 sentinela ativa com `proximaFalhou` | com a falha, o rodapé troca a sentinela por `FalhaDoBloco`: o nó nem existe |

(Os 3 invalidados por alvo inexistente — M51 no-op, M28/M30 primeiros alvos em comentário — foram refeitos ou
descartados; mutante que vira no-op não conta.) Categorias cobertas: regra de "em aberto" (sem o par
`approved`, sem `separating`, na migration e em `core`), "recorrentes" (≥3), cursor (`gt`→`lt`, sem o ramo
dos nulos), escape de LIKE (`_`, `*`, `"`), vínculo por e-mail (curinga, sem `customer_id`), busca por dígitos,
ordem (`id`, `nullsFirst`), recorte sem `applyCustomerSlice`, `desduplicar`, recusa da RPC ignorada, selo por
`orders_paid`, contagem por `linhas.length`, `replace` do chip, `:id` fora de uuid indo à rede, trava do toque
duplo, recusa tratada como falha, pedidos sem `habilitada`, WhatsApp sem `target`/`rel`/sem telefone, máscara,
título do documento com o nome, `?recorte=` sem o vocabulário, título dos pedidos por `linhas.length`, link do
pedido, `cpf` na lista, `!` na copy, `transition-colors` sem par, query na URL da ficha, escrita no hook de
leitura, rota da ficha removida, limpeza do cache na troca de conta e no logout, `grant` e `security_invoker`
na migration.

**Observações (não bloqueiam)**:
1. `BL-053` (aberto pela feature, correto): `customer_list` custa ~7,9 s com 3.000 pessoas, **pré-existente** na
   definição da `34`. O Goal "funciona acima de 1.000 clientes" é satisfeito em corretude (janelas de 25 e
   contagem do servidor), não em latência; vale lembrar na decisão de deploy.
2. Pendentes declarados e fora do alcance deste ambiente: Android real (TQ10), QA, aplicação da migration em
   produção.

**Lições destiladas**: nenhuma — não houve falha fundamentada.

## Verificador independente — rodada pós-QA 1 (2026-10-24): FAIL por cobertura

Escopo: os consertos B01, B02, B04..B11 do QA (B03 e B12 seguem abertos, decisão humana).

**Medição própria** (um workspace por vez, exit fora de pipe, `--testTimeout=20000`): core **4337/175**,
mobile-adm **1736/110**, backoffice **3707/214**, store **5908/322**, todos exit 0 e **idênticos** ao
registrado em `tasks.md`. `tsc`: 0 em store, backoffice e mobile-adm; 11 em `packages/core` (os herdados).
Eslint: store 2/2, backoffice 23/5, mobile-adm 0/0.

**Mutantes novos** (escolhidos por mim, distintos dos 20 do autor; alvo único, SHA-256 conferido na
restauração, todos `sha ok`): 32 válidos, **25 mortos por asserção**, 0 por compilação, **7 sobreviventes**.
Os consertos de B01/B02 (espaço duplo, NBSP, `mailto:`, rótulo de telefone, `customerOrdersCondition`
no core e no painel), B06 (foco, `textarea`, barra no layout), B07, B08, B09, B10 e B11 morrem por asserção.

| Sobrevivente | Veredito | Significado |
| --- | --- | --- |
| V17 estado inicial do `useBuscaEmFoco` em `false` | equivalente | o efeito relê `document.activeElement` na montagem |
| V10 / V11 `leituraBoa` sem `!isError` (`ClientesPage`, `ClientePage` parcial) | lacuna menor | só muda o caso de erro NÃO-`42501` com dado antigo; custa no máximo uma reconferência extra, não laço |
| **W03 `InicioPage` com `leituraBoa = true`** | **lacuna real** | reintroduz o laço da B05 na Início; `recusaComPapelAdmin` anda só `/clientes`, `/clientes/:id` e `/pedidos` |
| **V12 `PedidoPage` com `leituraBoa = true`** | **lacuna real** | idem em `/pedidos/:id` |
| W04 `PedidoPage` sem o segundo argumento | lacuna | nenhum caso prova que uma SEGUNDA recusa depois de uma leitura boa reconfere na página do pedido |
| V01 invisível U+200D fora da classe; V04 `wpp` fora do rótulo | lacuna menor | o teste de `limparTermoColado` cobre um invisível e não percorre a lista fechada de rótulos |
| V02 pontuação final só `.`; V03 aspas dentro do token de e-mail | lacuna menor | `Fulana <a@b>` e `a@b.` morrem; `"a@b"` e `a@b!` / `a@b?` / `a@b:` não têm caso |

**Veredito: FAIL por cobertura, nenhum defeito de produto.** Os 8 consertos verificados estão corretos
(código e testes lidos, mutantes mortos). A reprovação é a assinatura de sempre: o conserto de B05 foi
aplicado em CINCO páginas e provado em TRÊS (`/clientes`, `/clientes/:id`, `/pedidos`); Início e Pedido
perderiam o conserto sem que nada acusasse. Para fechar: (1) dois casos em `recusaComPapelAdmin` (ou
equivalentes) para `/` e `/pedidos/:id` com teto de requisições, e um de "segunda recusa depois de leitura
boa reconfere"; (2) casos de `limparTermoColado` para `"a@b"`, `a@b!`, `U+200D` e um item por rótulo da
lista fechada. Nenhum desses mexe em código de produto.

**Observações (não bloqueiam)**: (a) "Busca e recorte desfeitos." repete o mesmo texto se "Limpar" é
tocado duas vezes seguidas, e a região viva não o reanuncia (a segunda vez só acontece depois de a pessoa
refazer um filtro, então é raro); (b) em `PedidosDaCliente`, `esperando` fica armado se a página pedida
voltar vazia e `fim`, e uma releitura posterior poderia mover o foco; (c) B06/B07 seguem sem reteste em
navegador a 130 %/200 % e sem Android real (jsdom não mede layout), como o próprio `tasks.md` declara.

## Verificador independente — rodada pós-QA 2 (2026-10-24): FAIL por cobertura

Escopo: os consertos B13, B14 e B15, e o fecho das lacunas da rodada pós-QA 1.

**Medição própria** (um workspace por vez, exit fora de pipe, `--testTimeout=20000`): core **4365/175**,
mobile-adm **1752/111**, backoffice **3707/214**, store **5908/322**, todos exit 0. `tsc`: 0 em store,
backoffice e mobile-adm; 11 em `packages/core` (os herdados). Eslint: store 2/2, backoffice 23/5,
mobile-adm 0/0.

**Lacunas da rodada pós-QA 1 (W03, V12, W04, V01..V04)**: fechadas. 8 mutantes novos (Início e Pedido com
`leituraBoa = true`, Pedido sem o segundo argumento, invisível U+200D, aspas no token de e-mail, pontuação
final, rótulos `wpp` e `cel`), SHA-256 conferido: **8 mortos por asserção**.

**Mutantes novos de B13/B14/B15** (alvo único, SHA-256 conferido): 16 válidos, **12 mortos por asserção**,
0 por compilação, **4 sobreviventes**.

| Sobrevivente | Veredito | Significado |
| --- | --- | --- |
| **N02** `!(buscando && !naoAtualizou)` → `!buscando` (`ClientesPage`) | **lacuna real** | B13 diz que a linha de frescor sai com o teclado aberto "menos quando traz não atualizou"; nenhum caso prova essa exceção, e sem ela o aviso de falha de releitura some enquanto a pessoa digita |
| N08 guarda `document.activeElement === campo` removido (`CampoDeBusca`) | lacuna menor | nenhum caso tira o foco do campo nos 300 ms antes da subida |
| N10 `clearTimeout` removido no `onFocus` | lacuna menor | só duplicaria a subida; sem caso de dois focos seguidos |
| N13 `falhaNoToque.current = true` no toque | equivalente | o efeito zera a flag na mesma passada se não há falha na tela |

**Veredito: FAIL por cobertura, nenhum defeito de produto.** B13 (título `sr-only`, subida do campo, linha de
frescor), B14 (foco ao campo novo após "Limpar") e B15 (foco no "Tentar de novo" da falha nova, sem roubar
no repetido) estão corretos no código e morrem por asserção em 12 de 13 mutantes não equivalentes. Para fechar:
um caso em `clientesPage.test.tsx` com o campo em foco e a releitura falhada (`naoAtualizou`) em que "não
atualizou" segue na tela, e (menor) um com o foco saindo antes dos 300 ms e outro com dois focos seguidos.
Nada disso mexe em código de produto.

**Observações (não bloqueiam)**: B03 e B12 seguem abertos (decisão humana); B06/B07/B13 continuam sem reteste
em navegador a 130 %/200 % e sem Android real.

## Verificador independente — rodada pós-QA 3 (2026-10-24): FAIL por cobertura (uma lacuna menor)

Escopo: o fecho das lacunas da rodada pós-QA 2 (N02, N08, N10) e os consertos `bug-16` (primeiro toque em chip
com a busca em foco) e `bug-17` (linha do cliente a 200 %).

**Medição própria** (um workspace por vez, exit fora de pipe, `--testTimeout=20000`): core **4365/175**,
mobile-adm **1762/111**, backoffice **3707/214**, store **5908/322**, todos exit 0 e idênticos ao `tasks.md`.
`tsc`: 0 em store, backoffice e mobile-adm; 11 em `packages/core` (os herdados). Eslint: mobile-adm limpo;
store e backoffice nas baselines (2/2 e 23/5).

**Mutantes novos** (alvo único, SHA-256 conferido na restauração, todos `sha ok`): 14 válidos, **13 mortos por
asserção**, 0 por compilação, **1 sobrevivente**.

- Lacunas da rodada 2 fechadas: N02 (exceção "não atualizou" com o teclado aberto), N08 (guarda do foco antes
  da subida) e N10 (`clearTimeout` no segundo foco) — os três mortos.
- `bug-16` (`useBuscaEmFoco`): saída sempre imediata, `click` sem soltar, `pointercancel` sem soltar, sem o
  prazo após o `pointerup`, prazo de 1500 ms, `pendente` não zerado ao voltar o foco, toque que não arma
  `tocando` — 7 mortos.
- `bug-17` (`LinhaDoCliente`): sem `flex-wrap`, piso `min-w-0`, piso `12rem` sem o limite `min(100%, …)` —
  3 mortos.

| Sobrevivente | Veredito | Significado |
| --- | --- | --- |
| **B16g** `clearTimeout(prazo)` removido de `soltar` (`useBuscaEmFoco`) | lacuna menor | o prazo de 150 ms do `pointerup` sobrevive ao `click` que já soltou; num segundo toque dentro dessa janela (toque duplo), o prazo velho zera `tocando` no meio do toque novo e a saída do foco volta a ser imediata antes do clique. Nenhum caso encadeia dois toques |

**Veredito: FAIL por cobertura, nenhum defeito de produto aberto.** Os consertos `bug-16` e `bug-17` e o fecho
das três lacunas da rodada 2 estão corretos no código e morrem por asserção. Para fechar: um caso em
`useBuscaEmFoco.test.tsx` com `pointerdown` → `pointerup` → `click` → novo `pointerdown` antes dos 150 ms →
avançar o relógio, exigindo que o foco ainda esteja "em foco" até o segundo `click`. Não mexe em código de produto.

**Observações (não bloqueiam)**: B03 e B12 seguem abertos (decisão humana). `bug-16` (toque real, 390x844),
`bug-17` e B13 (130 %/200 %) seguem sem reteste em navegador, e sem Android real: jsdom não mede layout e o
guarda de `LinhaDoCliente` é régua de forma.

## Verificador independente — rodada pós-QA 4 (2026-10-24): PASS

Escopo: o fecho da lacuna B16g (rodada pós-QA 3) e o conserto `bug-18` (`useBuscaEmFoco`: o `focusin` do botão
tocado não solta o sinal).

**Medição própria** (um workspace por vez, exit fora de pipe, `--testTimeout=20000`): mobile-adm **1765/111**
e store **5908/322**, exit 0, idênticos ao `tasks.md`. `tsc` mobile-adm 0; eslint mobile-adm 0/0.

**Mutantes** (alvo único em `useBuscaEmFoco.ts`, SHA-256 conferido na restauração, sem divergência): 10,
**9 mortos por asserção**, 0 por compilação, 1 sobrevivente equivalente.

- B16g (`clearTimeout` removido de `soltar`): morto pelo caso do toque duplo.
- `bug-18`: sem a espera quando o foco chega a outro elemento com o dedo no vidro; `entrou` zerando o pendente;
  `saiu` sem armar o pendente; prazo de 150 ms trocado por 5000; sem o `click` ou o `pointercancel` soltando;
  campo de busca aceito por estar `tocando` — todos mortos.
- Sobrevivente M3 (`pendente = true` removido do ramo `tocando` de `entrou`): **equivalente** no navegador, pois
  o `focusout` do campo, que sempre precede o `focusin` do botão, já arma `pendente` em `saiu`; e se o foco não
  estava na busca não há sinal a segurar.

**Veredito: PASS.** `bug-18` está correto no código e coberto por asserção; B16g fechada.

**Observações (não bloqueiam)**: B03 e B12 seguem abertos (decisão humana). `bug-16`/`bug-18` (toque real,
390x844), `bug-17` e B13 (130 %/200 %) seguem sem reteste em navegador e sem Android real.
