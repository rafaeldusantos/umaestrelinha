# Reteste — WI 103 · rodada 2 (confirmação)

| Campo      | Valor                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| Rodada     | 2026-11-17 · início 01:36 · fim 01:43                                                                   |
| Ambiente   | painel http://localhost:8083 · loja http://localhost:8082 (worktree store__feature-103) · build `não exposto` · Chromium headless (agent-browser 0.39.1, sessões `retest` e `retest-anon`) |
| Bugs lidos | 6 de `issues/` com status `open` (BUG-001 a BUG-006)                                                    |

Contagem: resolved 6 · still-open 0 · cannot-reproduce 0 · blocked 0

Rotas abortadas na sessão inteira: `**/*.supabase.co/**` e `**/g/collect*`. Fotos do Storage hospedado não aparecem, e isso não é achado.

## BUG-001 · [Editor do bloco] Gravar com peça acrescentada não dá "Salvo" e segue "Alterações não salvas"

| Campo      | Valor                                                          |
| ---------- | -------------------------------------------------------------- |
| Resultado  | resolved                                                       |
| Persona    | PER-01 Adri · conta: admin-loja-3 (QA_ADMIN_LOJA_3_*)          |
| Passos de  | `issues/BUG-001.md`                                            |
| Tentativas | 2 · 2                                                          |
| Viewport   | 1440 × 900                                                     |

**Passos seguidos.** Partem de um estado limpo, como estão no bug, sobre B-1, que já tinha "Dia das Mães" e P-3, P-1 e P-2:

1. Painel → Loja → Home → "Abrir Joias em oferta" (B-1)
2. Acrescentar "Anel Afetivo Coração com Leite Materno em Aço Inoxidável" pela lista "Acrescentar uma peça". O cabeçalho passa a mostrar "Alterações não salvas"
3. Clicar uma vez em "Salvar seção" e ler o cabeçalho
4. Segunda tentativa: acrescentar "QA103 Peça descartável 2", salvar e ler o cabeçalho

**Esperado:** o recibo "Salvo" no lugar de "Alterações não salvas".

**Observado:** nas duas tentativas, o botão passa a mostrar "Salvo ⌘S" e "Alterações não salvas" some. Depois o botão volta a "Salvar seção ⌘S", e o cabeçalho continua sem "Alterações não salvas". A rede mostra `DELETE /rest/v1/home_section_items → 204`, `POST /rest/v1/home_section_items → 201` e `GET /rest/v1/home_sections → 200`. O console não teve erro. Ao recarregar, o editor traz "5 de 12" com as peças na ordem salva.

**Entorno:**

| Onde                      | Resultado | Nota                                                                                                  |
| ------------------------- | --------- | ----------------------------------------------------------------------------------------------------- |
| Passo anterior da jornada | ok        | Ao abrir pela lista da Home, o editor chega com campanha, título e peças certos                        |
| Passo seguinte da jornada | ok        | Ao recarregar, o editor tem tudo salvo. A loja anônima mostra o bloco com as peças na ordem gravada    |
| Mesma ação com outro dado | ok        | Gravar só tirando peças (a apagada e P-FORA na devolução), a 1440 e a 390 com fonte 200 %, deu "Salvo" |

**Evidência:**

- `screenshots/retest-r2-BUG-001.png`: o editor com "Salvo" depois de acrescentar P-FORA (1ª tentativa)
- `screenshots/retest-r2-BUG-001-2.png`: o editor com "Salvo" depois de acrescentar P-APAG2 (2ª tentativa)
- console: `nada` · rede: `DELETE home_section_items → 204`, `POST home_section_items → 201`, `GET home_sections → 200`

## BUG-002 · [Home do painel] Linha do bloco Joias em oferta diz "No ar" quando ele não aparece na loja

| Campo      | Valor                                                          |
| ---------- | -------------------------------------------------------------- |
| Resultado  | resolved                                                       |
| Persona    | PER-01 Adri · conta: admin-loja-3 (QA_ADMIN_LOJA_3_*)          |
| Passos de  | `issues/BUG-002.md`. O estado vem de B-2 e B-3, que já existiam, como manda o briefing |
| Tentativas | 2 · 3                                                          |
| Viewport   | 1440 × 900                                                     |

**Passos seguidos:**

1. Painel → Loja → Home (`/admin/home`)
2. Ler as linhas dos três "Joias em oferta" e o cabeçalho "Seções da Home"
3. Recarregar e ler de novo. Ler outra vez no fim da sessão, com B-1 devolvido

**Esperado:** a linha do bloco que não aparece na loja não diz "No ar", e esse bloco não entra na conta das seções no ar.

**Observado:**

- B-2 ("Natal", agendada): "Ligada, mas não aparece na loja", com "A campanha escolhida ainda não começou. O bloco aparece na loja quando ela entrar em vigência."
- B-3 ("QA103 Virada", encerrada e desligada): "Ligada, mas não aparece na loja", com "A campanha escolhida já terminou, e o bloco não aparece na loja. Escolha outra campanha."
- B-1 ("Dia das Mães", em vigência): "No ar".
- O cabeçalho diz "18 seções · 10 no ar". As 10 são exatamente as linhas com "No ar", sem B-2 nem B-3.

As três leituras deram o mesmo resultado. O estado "sem campanha" não foi exercitado, porque a massa do briefing não permite criar bloco novo. Esse estado ficou de fora da confirmação.

**Entorno:**

| Onde                      | Resultado | Nota                                                                                                      |
| ------------------------- | --------- | --------------------------------------------------------------------------------------------------------- |
| Passo anterior da jornada | ok        | As outras 15 linhas mantêm "No ar" ou "Desligada", como antes                                              |
| Passo seguinte da jornada | ok        | A loja anônima (390) mostra o bloco de B-1 e não mostra "Natal QA" nem "Virada QA"                        |
| Mesma ação com outro dado | ok        | Com 2 peças de B-1 fora do ar, a linha de B-1 seguiu "No ar" e trouxe o aviso de peças (ver BUG-006)      |

**Evidência:**

- `screenshots/retest-r2-BUG-002.png`: a lista inteira, com B-2 e B-3 em "Ligada, mas não aparece na loja" e "18 seções · 10 no ar"
- console: `nada` · rede: `nada`

## BUG-003 · [Home da loja] No celular a página rola de lado na fileira de Joias em oferta — visitante

| Campo      | Valor                                                          |
| ---------- | -------------------------------------------------------------- |
| Resultado  | resolved                                                       |
| Persona    | PER-02 Marina · conta: nenhuma (visitante, sessão `retest-anon`) |
| Passos de  | `issues/BUG-003.md`                                            |
| Tentativas | 2 · 2                                                          |
| Viewport   | 390 × 844, fonte da raiz a 100 % e a 200 %                     |

**Passos seguidos:**

1. Sem login, a 390 × 844, abrir `http://localhost:8082/`. B-1 tem P-3, P-1 e P-2
2. Descer até "Algumas das peças em oferta"
3. Passar a fileira com "Próximo" e tentar rolar o corpo de lado. Medir o `scrollWidth` do documento a 100 % e a 200 %

**Esperado:** a fileira rola na horizontal, e o corpo da página não rola de lado a 390 px.

**Observado:**

- A 100 %, o documento mede 390 px nas duas tentativas (na rodada 1 eram 504). Com "Próximo", a fileira anda (`scrollLeft` 199 de 350), e o `scrollX` do corpo fica em 0. Tentar rolar o corpo de lado também deixa `scrollX` em 0.
- A 200 %, nenhum elemento do bloco "Joias em oferta" passa de x = 390. A fileira rola por dentro (326 de janela, 756 de conteúdo). O "De" do 3º cartão, que era a causa, não estoura mais.
- Ainda a 200 %, o documento mede 434 px (eram 568). Esses 44 px vêm do cabeçalho da loja (botão "Abrir menu", até x 426) e das setas da fileira "Decorativos", e não do bloco. O mesmo acontece em `/ofertas`, onde o bloco não existe: lá o documento mede 552. Por isso fica registrado como achado novo (N-2), separado deste bug.

**Entorno:**

| Onde                      | Resultado   | Nota                                                                                                                       |
| ------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| Passo anterior da jornada | ok          | Os banners e o cabeçalho do bloco ("Joias para guardar quem a gente ama") rolam por dentro (390 de janela, 780 de conteúdo) |
| Passo seguinte da jornada | ok          | A fileira anda com "Próximo". Os cartões levam a `/produtos/…`                                                              |
| Mesma ação com outro dado | quebra (N-2) | Outras fileiras da Home (Árvore da Vida, Bebê na Barriga, Pet, Dente de Leite, Batimento) rolam por dentro (358 de janela a 100 %, 326 a 200 %). A 200 %, o cabeçalho da loja e as setas de "Decorativos" estouram 44 px |

**Evidência:**

- `screenshots/retest-r2-BUG-003.png`: a Home a 390 com fonte 100 %, a fileira passada com "Próximo" e o corpo sem deslocamento
- `screenshots/retest-r2-BUG-003-390-100.png`: a Home a 390 com fonte 100 %, com o bloco na tela
- `screenshots/retest-r2-BUG-003-390-200.png`: o bloco a 390 com fonte 200 %
- console: `nada` · rede: `nada`

## BUG-004 · [Editor do bloco] Fonte a 200 % no celular empurra "Salvar seção" para fora da tela

| Campo      | Valor                                                          |
| ---------- | -------------------------------------------------------------- |
| Resultado  | resolved                                                       |
| Persona    | PER-01 Adri · conta: admin-loja-3 (QA_ADMIN_LOJA_3_*)          |
| Passos de  | `issues/BUG-004.md`                                            |
| Tentativas | 2 · 2                                                          |
| Viewport   | 390 × 844, fonte da raiz a 100 %, 130 % e 200 %                |

**Passos seguidos:**

1. A 390 × 844, abrir o editor de B-1 ("Dia das Mães")
2. Pôr a fonte da raiz a 200 % (e também a 100 % e a 130 %)
3. Procurar "Salvar seção" e medir o `scrollWidth` do documento

**Esperado:** o editor não rola na horizontal a 390 px e continua usável com a fonte a 200 %. "Salvar seção" fica ao alcance sem rolar de lado.

**Observado:**

| Fonte | Documento | "Salvar seção"                      |
| ----- | --------- | ----------------------------------- |
| 100 % | 390 px    | x 219–366, 147 × 40                 |
| 130 % | 390 px    | x 162–353, 191 × 52                 |
| 200 % | 390 px    | x 48–342, 294 × 80, em linha própria |

As duas tentativas a 200 % deram o mesmo resultado, e nenhum elemento do editor passa de x = 390. A 200 %, "Salvar seção" gravou a remoção da peça apagada e deu "Salvo".

**Entorno:**

| Onde                      | Resultado    | Nota                                                                                                                                                       |
| ------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Passo anterior da jornada | ok           | Título, descrição e campanha cabem a 200 %                                                                                                                 |
| Passo seguinte da jornada | quebra (N-1) | A 200 %, a barra fixa do editor, que agora quebra linha, ocupa 345 px. Com o cabeçalho do painel, cobre 457 dos 844 px da tela, e o "Salvar seção" fica por cima dos botões das peças quando elas estão no meio da tela |
| Mesma ação com outro dado | ok           | A 130 %, a barra mede 162 px e não há rolagem lateral                                                                                                      |

**Evidência:**

- `screenshots/retest-r2-BUG-004.png`: o editor a 390 com fonte 200 % e o "Salvar seção" inteiro na tela
- `screenshots/retest-r2-BUG-004-salvar-200.png`: o "Salvo" depois de gravar a 200 %
- console: `nada` · rede: `nada`

## BUG-005 · [Editor do bloco] Falha ao ler as peças da campanha deixa "Conferindo…" sem fim, sem aviso

| Campo      | Valor                                                          |
| ---------- | -------------------------------------------------------------- |
| Resultado  | resolved                                                       |
| Persona    | PER-01 Adri · conta: admin-loja-3 (QA_ADMIN_LOJA_3_*)          |
| Passos de  | `issues/BUG-005.md`                                            |
| Tentativas | 2 · 3                                                          |
| Viewport   | 1440 × 900                                                     |

**Passos seguidos:**

1. B-1 com "Dia das Mães" e peças salvas (5 na lista no momento)
2. Abortar no browser as requisições `**/rest/v1/product_campaigns*`
3. Abrir `/admin/home/<id de B-1>` e esperar o estado

**Esperado:** nenhuma peça sai da lista, o editor não abre alterado, e diz que não conseguiu conferir a campanha.

**Observado:**

- Nas duas aberturas (abrir e recarregar), "Conferindo…" some.
- No lugar aparece "Não foi possível conferir as peças da campanha. Nenhuma peça saiu da lista, e a busca volta quando a leitura der certo.", com o botão "Tentar de novo".
- A lista fica intacta ("5 de 12"), e o cabeçalho não mostra "Alterações não salvas".
- "Tentar de novo" com o bloqueio ativo mostra o aviso de novo. Sem o bloqueio, "Tentar de novo" recupera: aparecem "19 na campanha", a busca "Acrescentar uma peça" e os avisos das peças.
- A mensagem traz junto um texto técnico, que ficou registrado como achado novo (N-3).

**Entorno:**

| Onde                      | Resultado    | Nota                                                                                                                  |
| ------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------- |
| Passo anterior da jornada | ok           | A lista da Home carrega normalmente                                                                                   |
| Passo seguinte da jornada | ok           | Ao tirar o bloqueio, "Tentar de novo" volta ao editor completo, sem recarregar                                         |
| Mesma ação com outro dado | quebra (N-3) | A mensagem de falha mostra o erro técnico "ler as peças da campanha: TypeError: Failed to fetch" à dona da loja       |

**Evidência:**

- `screenshots/retest-r2-BUG-005.png`: o editor com o aviso de falha, "Tentar de novo" e as peças intactas
- console: `nada` · rede: `HEAD/GET /rest/v1/product_campaigns → abortada` (de propósito)

## BUG-006 · [Home do painel] Peça escolhida apagada fica fora da contagem "N das M saíram do ar"

| Campo      | Valor                                                          |
| ---------- | -------------------------------------------------------------- |
| Resultado  | resolved                                                       |
| Persona    | PER-01 Adri · conta: admin-loja-3 (QA_ADMIN_LOJA_3_*)          |
| Passos de  | `issues/BUG-006.md`                                            |
| Tentativas | 2 · 3                                                          |
| Viewport   | 1440 × 900                                                     |

**Passos seguidos.** São os do bug, com 5 peças em vez de 7. A = P-FORA, B = P-APAG2.

1. B-1 com "Dia das Mães" e 5 peças salvas: P-3, P-1, P-2, P-FORA e P-APAG2
2. Em `/admin/produtos`, Ações → Desativar em P-FORA. Ela vira "Rascunho"
3. Em `/admin/home`, a linha diz "1 das 5 saiu do ar: “Anel Afetivo Coração com Leite Materno em Aço Inoxidável”…"
4. Em `/admin/produtos`, Ações → Excluir → confirmar em "QA103 Peça descartável 2"
5. Voltar a `/admin/home` e ler a linha de B-1

**Esperado:** a linha conta as duas peças que saíram ("2 das 5") e nomeia a despublicada e a apagada.

**Observado:** "2 das 5 saíram do ar: “Anel Afetivo Coração com Leite Materno em Aço Inoxidável” e “QA103 Peça descartável 2”. A loja as pula enquanto elas não voltarem." Recarregar dá o mesmo texto. O editor repete a frase e acrescenta "“QA103 Peça descartável 2” foi apagada do catálogo e saiu da lista. A remoção vale quando você salvar." (lista "4 de 12").

Na leitura logo depois de navegar, antes de a página carregar inteira, a linha aparece por um instante sem aviso nenhum. Com a rede ociosa, aparece o "2 das 5".

**Entorno:**

| Onde                      | Resultado | Nota                                                                                                   |
| ------------------------- | --------- | ------------------------------------------------------------------------------------------------------ |
| Passo anterior da jornada | ok        | Só com a despublicada, a linha dizia "1 das 5 saiu do ar", com o nome                                   |
| Passo seguinte da jornada | ok        | O editor mostra a mesma contagem e o aviso da apagada. Salvar tira a apagada da lista                   |
| Mesma ação com outro dado | ok        | Ao republicar P-FORA e tirá-la do bloco, a linha de B-1 fica sem aviso, com "No ar"                     |

**Evidência:**

- `screenshots/retest-r2-BUG-006.png`: a linha de B-1 com "2 das 5 saíram do ar", nomeando as duas
- console: `nada` · rede: `nada`

## Achados novos no entorno

### N-1 · [Editor do bloco] Com a fonte a 200 % no celular, a barra fixa do topo cobre mais da metade da tela e fica por cima das peças — dona da loja

| Campo              | Valor                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| Perto de           | BUG-004                                                                                                       |
| Persona            | PER-01 Adri (na condição do CFR: fonte a 200 % no celular)                                                     |
| Jornada e passo    | J-01, passos de escolher e ordenar as peças, antes de salvar                                                   |
| Gravidade proposta | medium. É fricção: ela trabalha numa faixa de 387 px, e o toque no meio da tela cai no "Salvar seção"         |
| Reproduziu         | sim (2 de 2)                                                                                                  |

**Passos para reproduzir.** Partem de um estado limpo:

1. Entrar no painel a 390 × 844 e abrir o editor de um bloco "Joias em oferta" com peças
2. Pôr a fonte da raiz a 200 %
3. Rolar até "Peças escolhidas" e tocar em "Remover a 1ª peça" (ou subir/descer) com a peça no meio da tela

**Esperado:** o editor continua usável a 200 %. A barra fixa não cobre o conteúdo de forma que o toque nos controles das peças vá para outro botão. **Fonte:** PRD RNF-04 ("o editor continua usável com a fonte do sistema a 200 %") · test-plan › Ambiente.

**Observado:**

- A barra fixa do editor (`header`, sticky em top 112) mede 345 px a 200 %. Ela mede 73 px a 100 % e 162 px a 130 %.
- Com o cabeçalho do painel (112 px), ficam cobertos 457 dos 844 px. O fundo da barra é translúcido (alfa 0,8).
- Com o botão "Remover a 1ª peça" centrado na tela (y 378), o ponto de toque cai no "Salvar seção" (y 352–432). O mesmo vale para a 2ª e a 3ª peça.
- O clique automatizado em "Remover a 4ª peça" foi recusado porque o "Salvar seção" estava por cima.
- Não há perda de dado: um toque ali grava o estado atual, e não remove a peça.

**Evidência:** `screenshots/retest-r2-BUG-004-salvar-sobre-pecas.png`. Mostra a 390 com fonte 200 % a barra fixa cobrindo a metade de cima, com "Salvar seção" sobre a lista de peças.

### N-2 · [Home da loja] Com a fonte a 200 % no celular, o cabeçalho da loja e as setas de "Decorativos" fazem a página rolar 44 px de lado — visitante

| Campo              | Valor                                                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Perto de           | BUG-003                                                                                                                |
| Persona            | PER-02 Marina (na condição do CFR: fonte a 200 %)                                                                      |
| Jornada e passo    | J-02, passo 1 (abrir a Home)                                                                                           |
| Gravidade proposta | medium. A página fica "solta" de lado a 200 %. Acontece também em `/ofertas` (552 px), então provavelmente vem de antes do WI 103 e está fora do bloco |
| Reproduziu         | sim (2 de 2)                                                                                                           |

**Passos para reproduzir.** Partem de um estado limpo:

1. Sem login, a 390 × 844, abrir `http://localhost:8082/`
2. Pôr a fonte da raiz a 200 %
3. Medir o `scrollWidth` do documento, ou arrastar a página de lado

**Esperado:** nenhuma rolagem horizontal do corpo a 390 px. **Fonte:** test-plan › Ambiente ("nenhuma rolagem horizontal do corpo") · PRD RNF-04 (para o bloco).

**Observado:** o documento mede 434 px numa janela de 390. Ficam fora sem recorte o grupo de ações do cabeçalho da loja (x 266–426, botão "Abrir menu" em x 354–426), as setas da fileira "Decorativos" (x 211–395, "Próximo" em x 315–395) e o halo do botão do WhatsApp (até x 414). Em `/ofertas`, a 200 %, o documento mede 552 px. A 100 %, a Home mede 390.

**Evidência:** `screenshots/retest-r2-BUG-003-390-200.png`. Mostra a Home a 390 com fonte 200 %, com o bloco certo e o corpo mais largo que a janela.

### N-3 · [Editor do bloco] A mensagem de falha da conferência mostra o erro técnico "TypeError: Failed to fetch" — dona da loja

| Campo              | Valor                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------- |
| Perto de           | BUG-005                                                                                     |
| Persona            | PER-01 Adri                                                                                 |
| Jornada e passo    | J-04, ramo J-04a (abrir o editor)                                                           |
| Gravidade proposta | low. É texto técnico ao lado de uma mensagem certa. Não confunde a ação, mas foge do tom    |
| Reproduziu         | sim (2 de 2)                                                                                |

**Passos para reproduzir.** Partem de um estado limpo:

1. Entrar no painel e abortar no browser `**/rest/v1/product_campaigns*`
2. Abrir o editor de um bloco "Joias em oferta" com campanha e peças

**Esperado:** a mensagem diz, em linguagem da loja, que não conseguiu conferir a campanha e oferece tentar de novo, sem detalhe técnico. **Fonte:** PRD CA-04.3 · spec D-08 (erro tipado) · tom memorial do produto.

**Observado:** "Não foi possível conferir as peças da campanha. Nenhuma peça saiu da lista, e a busca volta quando a leitura der certo. ler as peças da campanha: TypeError: Failed to fetch", seguido de "Tentar de novo".

**Evidência:** `screenshots/retest-r2-BUG-005.png`. Mostra a mensagem com o trecho técnico ao final.

## Estado final da massa

- **B-1:** ligado, "Dia das Mães", título "Joias para guardar quem a gente ama", peças P-3, P-1, P-2 nessa ordem. Conferido ao recarregar o editor ("3 de 12"), na linha da lista ("No ar", sem aviso) e na loja anônima.
- **P-FORA:** republicada ("Ativo" em `/admin/produtos`).
- **P-APAG2 ("QA103 Peça descartável 2"):** apagada pelo painel, como pedia o briefing.
- **B-2, B-3 e as campanhas:** não foram alterados.
- **Sessão:** saí da conta do painel. As sessões `retest` e `retest-anon` estão fechadas.
