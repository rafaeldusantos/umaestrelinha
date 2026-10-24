# 75 — prova em navegador (T31)

Medida em **2026-10-24** (~08h–08h40 de Brasília), Chromium dirigido pelo Playwright MCP, contra o
**build servido** (`pnpm --filter @estrelinha/mobile-adm build` + `vite preview --port 4375
--strictPort`, porta livre — 8082–8084 são de outras sessões), apontando para o **Supabase local**
(`VITE_SUPABASE_URL=http://127.0.0.1:54441`, o `.env` do app). Nada interceptado do banco:
`atelie_clock`, `order_list`, as escritas em `orders`/`order_status_history`, a RPC
`set_material_status`, o Realtime e a `send-notification` são os de verdade. `*.supabase.co` e
`**/g/collect*` bloqueados por rota (intercepção por caminho, não por domínio); a lista de requisições
do último carregamento não tem nenhum host fora de `localhost`/`127.0.0.1`. Conta: a admin do
`seed.sql`, sem tocar no papel dela.

**A `send-notification` local** não estava de pé (sem container de edge runtime desde a abertura,
`baseline.md`). Ela foi servida por `supabase functions serve --env-file <scratchpad>/probe75.env` a
partir do **worktree** — processo aditivo, sem `supabase stop`/`start` (as condições de TQ3 sobre
reiniciar não se aplicam), e **derrubado no fim** (o gateway voltou ao `503` de antes). O `.env` do
serve tem `RESEND_API_KEY` **inválida de propósito**: o evento é reivindicado em
`order_notifications` e o envio falha com `401 validation_error` — **nenhum e-mail saiu**. Por isso
as confirmações abaixo **não** citam e-mail (`sent !== true`, A11/TQ5): é o comportamento certo.

**Bundle servido** conferido pelo `<script>` carregado **e** contra o `dist/` (o único `index-*.js`)
a cada rebuild: `index-CFx71Gq3.js` (entrada), `index-CMCYA7W1.js` e `index-BrKq-eNc.js` (B01),
`index-NrbxY9IQ.js` (B02). O service worker e os `caches` foram limpos antes de cada medida (lição da
`73`).

Capturas em `prova/` (nomes de fixtura, `@exemplo.invalid`): `390-detalhe-rodape.png`,
`390-folha.png`, `390-detalhe-lembrete.png` (página inteira), `390-lista-fonte-200.png`.

## Fixturas e restauração do banco

`prova/fixturas.sql` (6 pedidos `P75-N1`..`P75-N6`, ids `00000000-0000-4000-d075-…`, `order_number`
explícito: N1 pago com material aguardando; N2 pago sem material, nome de 56 caracteres; N3 em
separação; N4 enviado sem código; N5 retirada em separação; N6 pago com material aguardando, criado
há 84 dias) e `prova/limpa.sql`. N2 e N5 foram devolvidos ao estado inicial entre as medidas do aviso
(um `update` de status no banco local).

| | antes | depois |
| --- | --- | --- |
| `orders` · `order_items` | 54 · 82 | **54 · 82** |
| `order_status_history` · `order_notifications` | 22 · 11 | **22 · 11** |
| `orders_number_seq` | 183/true | **183/true** |
| `auth.users` · `customers` | 9 · 9 | **9 · 9** |

## 1 e 2 — rodapé, rolagem e alvos (360 × 800, 390 × 844, 412 × 915, 1440 × 900; fonte 100/130/200 %)

Fonte trocada em `html { font-size }`. Telas: detalhe de N2 (rodapé "Iniciar separação"), N4 (rodapé
"Salvar rastreio" + "Informar" na Entrega), N1 depois de recebido, e `/pedidos?visao=tudo`. **48
combinações, todas** com `documentElement.scrollWidth == innerWidth`, nenhum botão novo com texto
cortado (`scrollWidth/Height > client…`), e:

| Medida | 100 % | 130 % | 200 % |
| --- | --- | --- | --- |
| rodapé × barra de abas (`rodapé.bottom − barra.top`) | 0 | 0 | 0 |
| último bloco do detalhe × topo do rodapé, página rolada ao fim | −152 (−132 em 1440) | −198/−199 | −344 (−264 em 1440) |
| menor alvo novo (rodapé, "Informar", botão do cartão, lembrete) | **44** | 57 | 88 |

Negativo = o Histórico termina ACIMA do rodapé (não é coberto). A lista rolada até o fim de verdade
(a sentinela real): **59 linhas, 59 ids**, a última linha termina 137–313 px acima da barra, 24
botões de cartão com menor altura 44/57/88–114. "Informar" mede 44 × 64 a 100 %. O cartão abre o
detalhe **fora** do botão: clique a 20 px do canto do link (346 × 128) ⇒ `/pedidos/<id de N2>`; o
botão (346 × 44) fica abaixo, irmão do link.

## 3 — a folha com o teclado virtual

O teclado foi emulado com um `visualViewport` **falso instalado antes da carga**
(`page.addInitScript`; altura = `innerHeight − teclado`, `resize` disparado), não pelo CDP — o
Chromium de mesa não reduz o `visualViewport` sem mudar o layout. **SPEC_DEVIATION de método**
(design §13, item 3). A primeira tentativa instalou o falso DEPOIS da carga e mediu a folha parada:
**erro do arnês**, não do app — `useTecladoVirtual` assina o `visualViewport` na montagem, e a folha
monta com a página; no aparelho o objeto é o mesmo desde o início.

| viewport | teclado | visível até | folha | campo | botões até | campo e botões visíveis | foco |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 360 × 800 | 320 | 480 | 217–480 | 352–400 | 464 | sim | `INPUT` |
| 390 × 844 | 338 | 506 | 243–506 | 378–426 | 490 | sim | `INPUT` |
| 412 × 915 | 366 | 549 | 286–549 | 421–469 | 533 | sim | `INPUT` |

"Agora não" e "Salvar": 48 px.

## 4 — o voltar do Android (`history.back()`) e o F5

| Percurso | Resultado |
| --- | --- |
| lista buscada ("Prova", 6 linhas) e rolada (`scrollY` 200) → N2 → "Marcar como enviado" → voltar | folha fechada, mesmo `pathname` |
| o voltar seguinte | `/pedidos?visao=tudo`, `scrollY` **200**, 6 linhas, busca "Prova" — mesmo recorte e posição |
| F5 com a folha aberta | abre **sem** folha, mesma URL, rodapé "Marcar como enviado" |
| o primeiro voltar depois do F5 — **antes do conserto** | ficava em `/pedidos/<id>` (o voltar morto) ⇒ **B01** |
| o primeiro voltar depois do F5 — **depois do B01** | `/pedidos?visao=tudo` |

Depois do F5 a posição da lista não volta (`scrollY` 0, 25 linhas): a memória da rolagem da `74` é em
módulo e não sobrevive a um recarregamento — comportamento herdado, igual sem a folha.

## 5 — menos movimento (`getAnimations()`)

| | ao abrir a folha | ao fechar | a confirmação |
| --- | --- | --- | --- |
| sem preferência | `enter` no fundo e na folha | 2 | — |
| `reduce` — **antes do conserto** | `enter` no **fundo** (`SheetOverlay`) | 1 | — |
| `reduce` — **depois do B02** | **nenhuma** | **0** | **nenhuma** (`Rastreio salvo.`) |

## 6 — a posição do `AvisoDaAcao`

A confirmação aparece e a fonte é trocada enquanto ela está na tela (some em 5 s).

| | 100 % | 130 % | 200 % |
| --- | --- | --- | --- |
| 360 detalhe (rodapé fica) | 598–664, rodapé 672, folga 8 | 537–622, rodapé 634, folga 11 | 284–496, rodapé 512, folga 16 |
| 390 detalhe | 642–708, rodapé 716, folga 8 | 581–666, rodapé 678, folga 11 | 368–540, rodapé 556, folga 16 |
| 412 detalhe | 713–779, rodapé 787, folga 8 | 652–737, rodapé 749, folga 11 | 439–611, rodapé 627, folga 16 |
| 360 lista (sem rodapé) | 662–728, barra 736, folga 8 | 621–706, barra 717, folga 10 | 444–656, barra 672, folga 16 |
| 390 lista | 706–772, barra 780, folga 8 | 665–750, barra 761, folga 10 | 528–700, barra 716, folga 16 |
| 412 lista | 777–843, barra 851, folga 8 | 736–821, barra 832, folga 10 | 599–771, barra 787, folga 16 |

Nenhum dos três (aviso, rodapé, barra) se sobrepõe; `scrollWidth == innerWidth`; o toque no cartão
manteve a rota. **Observação** (não defeito): a 200 % em 360, aviso + rodapé + barra ocupam 516 dos
800 px. A área segura (`env(safe-area-inset-bottom) > 0`) **não** foi emulada — fica para o aparelho.

## 7 — o percurso contra o banco local

| Passo | Resultado |
| --- | --- |
| Início, "Aguardando material" | **19** |
| toque ⇒ `/pedidos?bloco=aguardando` → cartão de P75-N1 ("Recebi o material") → detalhe | rodapé "Recebi o material" |
| "Recebi o material" | "Material registrado. · O pedido #P75-N1 foi para a bancada." (`role="status"`), o rodapé passa a "Iniciar separação" |
| volta à Início | **18** |
| P75-N3 em separação → "Marcar como enviado" → `' an 1234 5678 9br '` → "Salvar" | "Rastreio salvo. · O código ficou no pedido."; Entrega "Rastreio AN123456789BR · Alterar"; sem rodapé |
| "Alterar" (folha com `AN123456789BR` preenchido) → `AN987654321BR` | "Rastreio salvo. · O código ficou no pedido."; Entrega com o código novo |
| banco: `order_notifications` de P75-N3 | **um** `order_shipped/email` (`failed`, 401 da chave inválida); `order_status_history` `separating → shipped` uma vez; `shipping_carrier` nulo (A9) |
| banco: P75-N1 | `material_recebido`, um `material_received/email` |

## 8 — a confirmação anunciada

`role="status"`; o foco **ficou** no botão do rodapé (o mesmo nó, relido com o rótulo novo
"Iniciar separação"); o aviso sumiu sozinho em ~5,3 s (o prazo de 5 s de TQ9 mais a espera da
medida). O erro `role="alert"` até a próxima ação é provado na suíte (`acoesDoPedido`), não aqui.

## 9 — o lembrete no WhatsApp

P75-N6 (aguardando há 84 dias): "Lembrar do envio no WhatsApp", 44 × 324, `target="_blank"`,
`rel="noopener noreferrer"`, `https://wa.me/5551999990006?text=…`. O mesmo pedido, lido do banco no
mesmo instante (`11:34:39.850Z`), passado ao `chargeMaterialUrl` **do painel**
(`prova/lembrete-do-painel.ts`, que importa o arquivo do painel) devolve **a mesma string, byte a
byte** (comparação de shell, SHA-256 `80eb6b357fa30385…`), com a frase de "faz um tempinho" (idade
`stale`) e sem nomear o material (`BL-015`). O painel não foi aberto num navegador ao lado; a
comparação é da função que ele chama.

## Defeitos achados e consertados (teste antes do conserto, reteste no navegador)

- **B01 — o F5 com a folha aberta deixava um voltar morto** (`MAA-32`, A23). Ver o `tasks.md`.
- **B02 — o fundo da folha animava com menos movimento** (`MAA-34`, R2). Ver o `tasks.md`.

## Pendente do usuário (TQ10, `n — confirmar`)

O **Android real**: o teclado de verdade sobre a folha, o voltar do sistema, a área segura, e a fonte
do sistema a 130/200 % pelo ajuste do aparelho (aqui ela foi emulada pelo `font-size` do `html`).
