# Reteste — WI 99 (frete grátis por região e prévia de frete na sacola) · rodada 2

| Campo      | Valor                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| Rodada     | 2026-11-14 · início 12:11 · fim 12:24 · confirmação depois das fix tasks 12, 13 e 14                     |
| Ambiente   | http://localhost:8092 (worktree `store__feature-99`, dev server) · build `não exposto` · Chromium headless (playwright-cli 0.1.24, sessão `retest`) |
| Bugs lidos | 7 de `issues/` com status `open`                                                                         |

Condições da sessão: cotação do Melhor Envio interceptada com a fixture A (PAC R$ 21,40 · SEDEX R$ 38,90), com CORS;
`https://*.supabase.co/**` e `**/g/collect*` bloqueados; ViaCEP liberado; viewport 390 × 844 com a fonte da raiz a 16 px
(100 %), e 1440 × 900 no entorno do BUG-004. Peça usada nos bugs da sacola: "Pingente Afetivo Barquinho com Cabelo"
(R$ 209,90), abaixo de R$ 450 com 1 unidade e acima com 3. O link do pedido montado da referência
`QA_PEDIDO_MONTADO_LINK` aponta para a porta 8082: só o host foi trocado para 8092, e o token é o mesmo.

Contagem: resolved 7 · still-open 0 · cannot-reproduce 0 · blocked 0

## BUG-001 · [Checkout · Entrega] Na segunda ida da sacola, a rua do endereço salvo é trocada — cliente com conta

| Campo      | Valor                                                                 |
| ---------- | --------------------------------------------------------------------- |
| Resultado  | resolved                                                              |
| Persona    | PER-04 Teresa · conta: `cliente-com-endereco` (`QA_CLIENTE_COM_ENDERECO_USUARIO`) |
| Passos de  | `issues/BUG-001.md`                                                   |
| Tentativas | 2 · 2 (e uma terceira ida, com o SEDEX, no entorno)                    |
| Viewport   | 390 × 844                                                             |

**Passos seguidos** — de um estado limpo, como estão no bug:

1. Entrar com a conta `cliente-com-endereco`. Em `/conta/dados`, o endereço salvo é "Rua dos Andradas, 1234, apto 501 ·
   CEP 90010-000". Sacola vazia. Abrir `/produtos/pingente-afetivo-barquinho-com-cabelo`
2. "Adicionar à sacola". Na gaveta, digitar 90010-000 e tocar em "Calcular"
3. Escolher a retirada no escritório e tocar em "Finalizar Pedido". O bloco Entrega mostra "Rua dos Andradas, 1234, apto
   501 · Centro Histórico · Porto Alegre/RS · CEP 90010-000", com a retirada marcada
4. Voltar pelo navegador, abrir a sacola, tocar em "Frete: Retirada no escritório… Ver as opções", escolher o PAC e
   tocar em "Finalizar Pedido"
5. Sem recarregar, ler o bloco Entrega (ponto onde o bug acontecia)

**Esperado:** quando o CEP da gaveta é igual ao do endereço salvo, o endereço salvo entra inteiro (rua, número e
complemento) e o bloco abre recolhido. Isso vale em toda ida ao checkout e também depois de recarregar.

**Observado:** nas duas tentativas, a segunda ida (com o PAC) mostrou "Rua dos Andradas, 1234, apto 501 · Centro
Histórico · Porto Alegre/RS · CEP 90010-000", com o PAC marcado e o Resumo em R$ 216,61. Depois de recarregar, o bloco
continua com a Rua dos Andradas. Com o bloco aberto por "Alterar", o campo Rua diz "Rua dos Andradas", o Número "1234",
o Complemento "apto 501", e o status "Trazido da sua sacola · Centro Histórico — Porto Alegre/RS". Para referência, a
busca do CEP 90010-000 devolve "Rua Siqueira Campos" (vista no entorno do BUG-002), e é essa a rua que não entra mais.

**Entorno:**

| Onde                      | Resultado | Nota                                                                                            |
| ------------------------- | --------- | ----------------------------------------------------------------------------------------------- |
| Passo anterior da jornada | ok        | primeira ida com a retirada: endereço salvo inteiro e retirada marcada                          |
| Passo seguinte da jornada | ok        | recarregar o checkout: a rua continua a salva, e o PAC continua marcado                         |
| Mesma ação com outro dado | ok        | terceira ida trocando o PAC pelo SEDEX: Rua dos Andradas, SEDEX marcado                          |

**Evidência:**

- `screenshots/retest-r2-BUG-001-ida1-retirada.png`: primeira ida, retirada marcada, Rua dos Andradas
- `screenshots/retest-r2-BUG-001.png`: segunda ida com o PAC, sem recarregar, Rua dos Andradas (tentativa 1)
- `screenshots/retest-r2-BUG-001-recarregado.png`: depois de recarregar, Rua dos Andradas
- `screenshots/retest-r2-BUG-001-tentativa2.png`: segunda ida com o PAC na tentativa 2
- `screenshots/retest-r2-BUG-001-sedex.png`: terceira ida com o SEDEX
- console: `nada` (0 erros) · rede: `nada` fora do esperado

## BUG-002 · [Entrega] Trocar para um CEP não localizado mantém a rua e a cidade do CEP anterior

| Campo      | Valor                                                                  |
| ---------- | ---------------------------------------------------------------------- |
| Resultado  | resolved                                                               |
| Persona    | PER-02 Cida · conta: `cliente-salvador` (`QA_CLIENTE_SALVADOR_USUARIO`) |
| Passos de  | `issues/BUG-002.md`                                                    |
| Tentativas | 2 · 2 no checkout, e 2 · 2 no pedido montado (P-0046)                    |
| Viewport   | 390 × 844                                                              |

**Passos seguidos** — de um estado limpo, como estão no bug:

1. Entrar com a conta `cliente-salvador`, pôr uma peça na sacola (fixture A) e tocar em "Finalizar Pedido". O Contato
   já vem preenchido pela conta
2. No bloco Entrega, digitar 01310-100. Rua, Bairro, Cidade e UF se preenchem com "Avenida Paulista", "Bela Vista",
   "São Paulo" e "SP"
3. Trocar o CEP para 40020-000 (ponto onde o bug acontecia)
4. Repetir 2 e 3 no pedido montado (link da P-0046, só a etapa de Entrega)

**Esperado:** Rua, Bairro, Cidade e UF acompanham o CEP informado: preenchidos pela busca, ou limpos para preencher à mão
quando a busca não localiza o CEP. Nunca fica o endereço de outro CEP.

**Observado:** nas duas telas e nas duas tentativas, com 40020-000 a linha de status diz "Não localizamos esse CEP.
Preencha o endereço à mão — a cotação segue pelo CEP informado.", e Rua, Bairro, Cidade e UF ficam vazios e editáveis. O
número e o complemento também ficam vazios. A cotação acompanha: no pedido montado (R$ 455,70), o PAC passa de "Grátis"
com 01310-100 a R$ 21,40 com 40020-000. A ViaCEP responde `{"erro": true}` para 40020000, então o "Não localizamos" está
certo, e o segundo defeito que o bug deixava a confirmar não existe.

**Entorno:**

| Onde                      | Resultado | Nota                                                                                                    |
| ------------------------- | --------- | ------------------------------------------------------------------------------------------------------- |
| Passo anterior da jornada | ok        | o CEP 40020-000 da sacola chega ao checkout com "Trazido da sua sacola" e os campos vazios               |
| Passo seguinte da jornada | ok        | escolher o PAC depois da troca: Resumo em R$ 216,61, e "Continuar" desabilitado até o endereço ser preenchido |
| Mesma ação com outro dado | ok        | 01310-100 → 99999-999: campos limpos nas duas telas. 01310-100 → 90010-000 (dois CEPs localizados): os campos passam a "Rua Siqueira Campos · Centro Histórico · Porto Alegre · RS". 40020-000 → 01310-100: preenchidos de novo com o de São Paulo |

**Evidência:**

- `screenshots/retest-r2-BUG-002-checkout.png`: checkout com 40020-000, os campos vazios e a mensagem
- `screenshots/retest-r2-BUG-002-pedido-montado.png`: pedido montado com 40020-000, os campos vazios e o PAC cobrado
- console: `nada` · rede: `GET viacep.com.br/ws/40020000/json/ → 200` com `{"erro": true}`

## BUG-003 · [Sacola · rodapé] Com o frete escolhido, o rodapé mede 276 px no celular e passa do teto de 270 px

| Campo      | Valor                                                                  |
| ---------- | ---------------------------------------------------------------------- |
| Resultado  | resolved                                                               |
| Persona    | PER-01 Luana · conta: `cliente-salvador` (sem sessão anônima, por causa do charter em paralelo) |
| Passos de  | `issues/BUG-003.md`                                                    |
| Tentativas | 2 · 2                                                                  |
| Viewport   | 390 × 844, fonte da raiz 16 px                                         |

**Passos seguidos** — de um estado limpo, como estão no bug:

1. Sacola vazia, fixture A, 390 × 844. Pôr na sacola uma peça abaixo de R$ 450 (Barquinho, R$ 209,90)
2. Na gaveta, digitar 01310-100, "Calcular", tocar no PAC para recolher a lista
3. Medir o rodapé fixo da gaveta, da linha recolhida do frete até "Finalizar Pedido" (ponto onde o bug acontecia)

**Esperado:** rodapé com no máximo 270 px com o frete escolhido e a fonte a 100 %, sem nota abaixo do Total e sem rolagem
horizontal.

**Observado:** 266 px nas duas tentativas (`getBoundingClientRect().height` 266, `clientHeight` 265, de y 578 a 844).
Composição: linha recolhida 65 px (o prazo ainda em duas linhas), "Tem um cupom?" 45 px, Subtotal/Frete/Total 87 px,
"Finalizar Pedido" com a margem 68 px. Nenhuma nota abaixo do Total, e o `scrollWidth` é 390.

**Entorno:**

| Onde                      | Resultado | Nota                                                                             |
| ------------------------- | --------- | -------------------------------------------------------------------------------- |
| Passo anterior da jornada | ok        | calcular o frete abre a lista com PAC e SEDEX, e "Trocar CEP" volta ao campo       |
| Passo seguinte da jornada | ok        | "Finalizar Pedido" leva ao checkout com o frete escolhido                          |
| Mesma ação com outro dado | ok        | SEDEX: 266 px · retirada com 90010-000: 266 px · PAC grátis (3 peças, R$ 629,70): 266 px · Salvador acima de R$ 450 (PAC cobrado): 266 px · 1440 × 900: 261 px |

**Evidência:**

- `screenshots/retest-r2-BUG-003-007.png`: o rodapé com o PAC recolhido a 390
- `screenshots/retest-r2-BUG-003-retirada.png`: o rodapé com a retirada recolhida a 390
- medidas do DOM nas duas tentativas (266 e 266)
- console: `nada` · rede: `nada`

## BUG-004 · [Sacola · ⓘ do frete grátis] O balão abre com 288 px preso ao ⓘ, e não a 12 px de cada borda da gaveta

| Campo      | Valor                                                                  |
| ---------- | ---------------------------------------------------------------------- |
| Resultado  | resolved                                                               |
| Persona    | PER-01 Luana · conta: `cliente-salvador`                               |
| Passos de  | `issues/BUG-004.md`                                                    |
| Tentativas | 2 · 2 (nos dois estados da faixa)                                      |
| Viewport   | 390 × 844                                                              |

**Passos seguidos** — de um estado limpo, como estão no bug:

1. A 390 × 844, pôr uma peça abaixo de R$ 450 na sacola
2. Na gaveta, tocar no ⓘ "Sobre o frete grátis" da faixa "Faltam R$ 240,10 para o frete grátis"
3. Medir o balão contra as bordas da gaveta (ponto onde o bug acontecia)
4. Aumentar para 3 unidades (R$ 629,70), calcular com 01310-100 e repetir 2 e 3 na faixa "Frete grátis liberado"

**Esperado:** o balão fica logo abaixo da faixa, a 12 px de cada borda da gaveta, com 366 px de largura a 390.

**Observado:** nas duas tentativas, o balão (`role="tooltip"`) tem 366 px, a 12 px da esquerda e 12 px da direita, nos
dois estados. Faixa abaixo: y 98, 74 px de altura, logo abaixo da linha da faixa (que termina em y 96). Faixa liberada: y
99, 56 px de altura, texto "Entrega em São Paulo/SP, região Sudeste. A forma de envio mais barata sai sem custo." O
balão não muda mais de largura nem de posição conforme o estado. Esc fecha o balão e deixa a gaveta aberta.

**Entorno:**

| Onde                      | Resultado | Nota                                                                                            |
| ------------------------- | --------- | ----------------------------------------------------------------------------------------------- |
| Passo anterior da jornada | ok        | a faixa e a barra de progresso mostram o valor que falta                                        |
| Passo seguinte da jornada | ok        | calcular e escolher o frete com o balão já fechado                                              |
| Mesma ação com outro dado | ok        | faixa "Frete grátis só para Sul e Sudeste" (40020-000, R$ 629,70): 366 px, 12/12. Em 1440 × 900 (gaveta de 440 px em x 1000): 415 px, 13 px da caixa da gaveta à esquerda e 12 à direita (o 1 px a mais é a borda esquerda da gaveta), dentro dela |

**Evidência:**

- `screenshots/retest-r2-BUG-004-abaixo.png`: o balão na faixa abaixo
- `screenshots/retest-r2-BUG-004-liberado.png`: o balão na faixa liberada, no mesmo lugar e com a mesma largura
- `screenshots/retest-r2-BUG-004-ba.png`: o balão na faixa de fora da região
- `screenshots/retest-r2-BUG-004-1440.png`: o balão em 1440 × 900
- console: `nada` · rede: `nada`

## BUG-005 · [Sacola · faixa do frete grátis] A faixa “Frete grátis liberado” mede 40 px, o protótipo pede 42 px

| Campo      | Valor                                                                  |
| ---------- | ---------------------------------------------------------------------- |
| Resultado  | resolved                                                               |
| Persona    | PER-01 Luana · conta: `cliente-salvador`                               |
| Passos de  | `issues/BUG-005.md`                                                    |
| Tentativas | 2 · 2                                                                  |
| Viewport   | 390 × 844                                                              |

**Passos seguidos** — de um estado limpo, como estão no bug:

1. A 390 × 844, pôr na sacola uma peça acima de R$ 450 no total. O bug usa R$ 259,90 × 2, e aqui foi o Barquinho
   R$ 209,90 × 3 = R$ 629,70: o que vale é passar da faixa
2. Na gaveta, digitar 01310-100 e "Calcular"
3. Medir a faixa "Frete grátis liberado" (ponto onde o bug acontecia)

**Esperado:** a linha com altura mínima de 22 px e padding de 10px 20px, o que dá uma faixa de 42 px.

**Observado:** nas duas tentativas, a faixa mede 42 px e a linha 22 px (`min-height: 22px`). Padding 10px 20px, fundo
`rgb(184, 148, 95)` (`#b8945f`), selo de 20 × 20 px, e texto 13px 700 em `rgb(35, 48, 58)`.

**Entorno:**

| Onde                      | Resultado | Nota                                                                       |
| ------------------------- | --------- | -------------------------------------------------------------------------- |
| Passo anterior da jornada | ok        | com R$ 419,80, a faixa ainda diz "Faltam R$ 30,20 para o frete grátis"      |
| Passo seguinte da jornada | ok        | o frete recolhido diz "PAC · Grátis", e o Total sem frete                   |
| Mesma ação com outro dado | ok        | CEP 90010-000 (Sul) com R$ 629,70: a faixa liberada mede 42 px, e a linha 22 px |

**Evidência:**

- `screenshots/retest-r2-BUG-005.png`: a faixa "Frete grátis liberado" a 390
- console: `nada` · rede: `nada`

## BUG-006 · [Sacola · Finalizar Pedido] O ícone da sacola no botão tem 16 px, o protótipo pede 20 px

| Campo      | Valor                                                                  |
| ---------- | ---------------------------------------------------------------------- |
| Resultado  | resolved                                                               |
| Persona    | PER-01 Luana · conta: `cliente-salvador`                               |
| Passos de  | `issues/BUG-006.md`                                                    |
| Tentativas | 2 · 2                                                                  |
| Viewport   | 390 × 844                                                              |

**Passos seguidos** — de um estado limpo, como estão no bug:

1. A 390 × 844, pôr uma peça na sacola
2. Com a gaveta aberta, medir o ícone do botão "Finalizar Pedido" (ponto onde o bug acontecia)

**Esperado:** ícone de sacola de 20 px, a 10 px do texto.

**Observado:** nas duas tentativas, o svg mede 20 × 20 px, e o texto começa 10 px depois dele (x 115,19 + 20 → texto em
x 145,19; `column-gap` 10px). O botão continua com 350 × 48 px, raio 12 px, fundo `rgb(52, 73, 94)` e texto 15px 700.

**Entorno:**

| Onde                      | Resultado | Nota                                                            |
| ------------------------- | --------- | --------------------------------------------------------------- |
| Passo anterior da jornada | ok        | a peça entra na sacola, e a gaveta abre com o Subtotal certo     |
| Passo seguinte da jornada | ok        | o botão leva ao checkout                                         |
| Mesma ação com outro dado | ok        | com o frete escolhido e com 3 peças, o botão mantém o ícone e a altura de 48 px |

**Evidência:**

- `screenshots/retest-r2-BUG-006.png`: o rodapé com o botão "Finalizar Pedido" a 390
- console: `nada` · rede: `nada`

## BUG-007 · [Sacola · frete escolhido] A linha recolhida do frete usa 12 px entre ícone, texto e valor, não 10 px

| Campo      | Valor                                                                  |
| ---------- | ---------------------------------------------------------------------- |
| Resultado  | resolved                                                               |
| Persona    | PER-01 Luana · conta: `cliente-salvador`                               |
| Passos de  | `issues/BUG-007.md`                                                    |
| Tentativas | 2 · 2 (PAC pago e PAC grátis, como no bug)                             |
| Viewport   | 390 × 844                                                              |

**Passos seguidos** — de um estado limpo, como estão no bug:

1. A 390 × 844, pôr uma peça na sacola
2. Na gaveta, digitar 01310-100, "Calcular" e tocar no PAC
3. Medir o espaço entre o ícone, o texto e o valor da linha recolhida (ponto onde o bug acontecia)

**Esperado:** 10 px entre ícone, texto e valor.

**Observado:** `column-gap: 10px`, com os 10 px medidos entre ícone e texto (40 → 50), texto e valor (271,09 → 281,09
com o PAC pago, 289,80 → 299,80 com o PAC grátis) e valor e chevron (344 → 354). Padding 7px 20px, linha de 65 px. O
prazo continua em duas linhas: o texto ganhou 4 px, e não chega a caber numa só.

**Entorno:**

| Onde                      | Resultado | Nota                                                                       |
| ------------------------- | --------- | -------------------------------------------------------------------------- |
| Passo anterior da jornada | ok        | a lista aberta com PAC e SEDEX                                              |
| Passo seguinte da jornada | ok        | tocar na linha recolhida reabre as opções com "Trocar CEP"                  |
| Mesma ação com outro dado | ok        | SEDEX e retirada no escritório: os mesmos 10 px                             |

**Evidência:**

- `screenshots/retest-r2-BUG-003-007.png`: a linha do PAC recolhida a 390
- `screenshots/retest-r2-BUG-003-retirada.png`: a linha da retirada recolhida
- console: `nada` · rede: `nada`

## Achados novos no entorno

### N-1 · [Checkout · Entrega] Ao abrir o bloco com o endereço salvo, o CEP aparece sem hífen ("90010000") — cliente com conta

| Campo              | Valor                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------- |
| Perto de           | BUG-001                                                                                |
| Persona            | PER-04 Teresa                                                                          |
| Jornada e passo    | J-05, passo 3 (segue ao checkout e confere a Entrega)                                  |
| Gravidade proposta | low. É só a máscara do campo: o resumo recolhido diz "CEP 90010-000", o CEP está certo, e nada atrapalha concluir |
| Reproduziu         | sim (2 de 2)                                                                           |

Este achado não vem do fix. O log da CH-03 da rodada 1 já registra "CEP 90010000" no formulário aberto (passos 23–24),
e nenhum bug foi aberto para isso. Fica aqui para o triager decidir.

**Passos para reproduzir** — de um estado limpo:

1. Entrar com a conta `cliente-com-endereco`, pôr uma peça na sacola, calcular com 90010-000 e escolher um frete
2. Tocar em "Finalizar Pedido" e, no bloco Entrega recolhido, tocar em "Alterar"

**Esperado:** o campo CEP com a máscara 00000-000 ("90010-000"), como o checkout mostra quando o CEP vem da sacola sem
endereço salvo ("40020-000") e como o placeholder pede. **Fonte:** o placeholder "00000-000" do próprio campo; TC-FUNC-001
(a máscara do CEP)

**Observado:** o campo CEP mostra "90010000", e logo abaixo o status diz "Trazido da sua sacola · Centro Histórico —
Porto Alegre/RS".

**Evidência:** snapshot do bloco aberto nas duas tentativas do BUG-001. Não há screenshot do bloco aberto.
`screenshots/retest-r2-BUG-001-recarregado.png` mostra o bloco recolhido logo antes de abri-lo
