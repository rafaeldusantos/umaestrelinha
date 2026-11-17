# Reteste — 104 (rodada 2, confirmação)

| Campo      | Valor                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| Rodada     | 2026-11-17 · início 16:49 · fim 16:53                                                                   |
| Ambiente   | painel http://localhost:8083/admin/menu · loja http://localhost:8082 · build não exposto (fixes citados: f3571f6b, 86452bf6) · Chromium (agent-browser 0.39.1, headless, sessão `retest`) |
| Bugs lidos | 2 de `issues/` com status `open`                                                                        |

Contagem: resolved 2 · still-open 0 · cannot-reproduce 0 · blocked 0

Rotas bloqueadas antes do primeiro `open`: `**/*.supabase.co/**` e `**/g/collect*`. A loja tentou imagens em `*.supabase.co` (banners da home) e as rotas as abortaram; nenhuma requisição a `g/collect`. Massa: item C "Personalizados" (os passos dos bugs usam "Sobre" e "Personalizados"; o briefing fixou o C para os dois). A, B e D só leitura.

## BUG-001 · [Menu da loja › editor do item] A prévia não mostra o ícone nem a cor escolhidos antes de Salvar

| Campo      | Valor                                                       |
| ---------- | ----------------------------------------------------------- |
| Resultado  | resolved                                                    |
| Persona    | PER-01 Adri, a dona · conta: admin (`QA_ADMIN_USUARIO`)     |
| Passos de  | `issues/BUG-001.md`                                         |
| Tentativas | 2 · 2                                                       |
| Viewport   | 1440 × 900 (a do bug; prévia em Computador 1024 × 768 e Celular 390 × 844) |

**Passos seguidos** — de um estado limpo, como estão no bug (item C no lugar de "Sobre", por causa da massa):

1. Entrar no painel como admin e abrir `/admin/menu`, prévia em Computador
2. Em "Personalizados", Ações › "Editar nome, ícone e banners"
3. Escolher "Etiqueta" em "Do sistema"
4. Digitar `#E8C77A` na barra e `#8A5A2B` na lista
5. Sem salvar, olhar a prévia e trocar para Celular

**Esperado:** antes de gravar, a prévia mostra o item com a Etiqueta: em Computador, o rótulo em `#E8C77A`; em Celular, a folha com o rótulo em `#8A5A2B`. Ela acompanha cada troca de cor sem recarregar.

**Observado:** nas duas tentativas, o editor abre como painel à esquerda e a prévia fica visível e operável à direita (Computador, Celular, Tela cheia e Recarregar continuam na árvore e respondem). Sem Salvar, a barra da prévia em Computador mostra "PERSONALIZADOS" com a Etiqueta e o rótulo dourado, no mesmo tom de "SOBRE" (os outros itens seguem no claro padrão). Ao trocar para Celular, a folha abre com "Personalizados" na Etiqueta e o rótulo marrom. A prévia acompanha a troca com um atraso curto (menos de um segundo, sem recarregar). Cancelar e fechar pelo X devolvem a prévia ao estado gravado (Gravação, sem cor), e reabrir o editor mostra os campos vazios: nada foi gravado.

**Entorno:**

| Onde                      | Resultado | Nota                                                                                  |
| ------------------------- | --------- | ------------------------------------------------------------------------------------- |
| Passo anterior da jornada | ok        | escolher ícone e cor no editor: Etiqueta marcada, frase "5,7:1 Contraste bom…" na barra |
| Passo seguinte da jornada | ok        | Cancelar e o X descartam o rascunho, a prévia volta a Gravação sem cor                |
| Mesma ação com outro dado | ok        | lista `#1F5F3A` e ícone "Presente": a prévia de Celular passou a mostrar o Presente em verde |

**Evidência:**

- `screenshots/retest-BUG-001.png` — editor aberto com Etiqueta e as duas cores não salvas; a barra da prévia em Computador com "PERSONALIZADOS" na Etiqueta e dourado
- `screenshots/retest-BUG-001-celular.png` — prévia em Celular com o editor aberto: "Personalizados" na Etiqueta e marrom
- `screenshots/retest-BUG-001-outro-dado.png` — outro dado: Presente e `#1F5F3A` na prévia de Celular
- `screenshots/retest-BUG-001-tentativa2.png` — segunda tentativa, de página recarregada: mesmo resultado em Celular
- console: nada · rede: imagens `*.supabase.co` abortadas pela rota (ambiente)

## BUG-002 · [Menu da loja › Cor do texto] Apagar o código não tira a cor: a anterior segue valendo e volta ao campo

| Campo      | Valor                                                   |
| ---------- | ------------------------------------------------------- |
| Resultado  | resolved                                                |
| Persona    | PER-01 Adri, a dona · conta: admin (`QA_ADMIN_USUARIO`) |
| Passos de  | `issues/BUG-002.md`                                     |
| Tentativas | 2 · 2                                                   |
| Viewport   | 1440 × 900 (a do bug); loja conferida em 1440 × 900 e 390 × 844 |

**Passos seguidos** — de um estado limpo, como estão no bug:

1. Entrar no painel como admin e abrir `/admin/menu`
2. Em "Personalizados" (sem cor), Ações › "Editar nome, ícone e banners"
3. Digitar `#E8C77A` na lista do celular: aparece a recusa de 1,6:1
4. Apagar todo o código (tentativa 1: preenchimento vazio; tentativa 2: Backspace no teclado)
5. Digitar um caractere na barra do computador

**Esperado:** o campo vazio quer dizer "sem cor" naquela superfície. O seletor e a recusa da cor apagada somem, o código não volta, e Salvar grava a lista sem cor.

**Observado:** nas duas tentativas, a recusa de 1,6:1 aparece no passo 3 e some no passo 4. O campo fica em "PADRÃO", o seletor ao lado sai do dourado (valor `#000000`, o neutro) e "Usar a cor padrão" fica desabilitado. No passo 5 o campo da lista continua vazio, e o código não volta. Na tentativa 1, depois de esvaziar também a barra, Salvar gravou o item sem cor nas duas superfícies, o que é o estado original do item C. Reabrir o editor mostrou os dois campos vazios e "Gravação" marcado. Na loja, "Personalizados" aparece em Gravação, com o rótulo no tom padrão: `rgb(247, 243, 236)` na barra de 1440, igual a "Joias afetivas" e "Colar e correntes", e o escuro padrão na folha de 390. A tentativa 2 terminou em Cancelar.

**Entorno:**

| Onde                      | Resultado | Nota                                                                                 |
| ------------------------- | --------- | ------------------------------------------------------------------------------------ |
| Passo anterior da jornada | ok        | digitar a cor: recusa de 1,6:1 na lista, e "7,2:1 Contraste bom…" para `#F2E1B6` na barra |
| Passo seguinte da jornada | ok        | Salvar com os campos vazios grava sem cor; a loja em 1440 e 390 mostra o item sem cor |
| Mesma ação com outro dado | ok        | barra com a cor válida `#F2E1B6` apagada: a frase de contraste some e o seletor volta ao branco neutro; a lista com `#8A5A2B` continua independente (5,9:1) |

**Evidência:**

- `screenshots/retest-BUG-002.png` — tentativa 1: a lista vazia ("PADRÃO"), o seletor no neutro e sem a frase de recusa
- `screenshots/retest-BUG-002-teclado.png` — tentativa 2: apagada pelo teclado, e depois de digitar na barra a lista continua vazia
- `screenshots/retest-BUG-002-loja-1440.png` — loja depois do Salvar: "PERSONALIZADOS" em Gravação, no tom padrão
- `screenshots/retest-BUG-002-loja-390.png` — folha do celular: "Personalizados" em Gravação, no escuro padrão
- console: nada · rede: nada além das imagens `*.supabase.co` abortadas

## Achados novos no entorno

nada

Observação, sem achado: o "X" digitado na barra durante a tentativa 2 não mostrou a frase de formato enquanto o campo tinha foco. Ninguém conferiu o que acontece depois do blur. O editor foi cancelado em seguida. Isso fica fora do escopo dos dois bugs e não foi investigado.

Estado final da massa: o item C "Personalizados" está em `gravacao` e sem cor nas duas superfícies, conferido no editor e na loja (1440 e 390). A, B e D não foram tocados. A sessão `retest` foi fechada.
