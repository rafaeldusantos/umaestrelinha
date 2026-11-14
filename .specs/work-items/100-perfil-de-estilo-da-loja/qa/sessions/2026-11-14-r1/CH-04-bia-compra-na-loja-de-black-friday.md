# Sessão CH-04 · Bia percorre a loja de Black Friday do celular ao computador

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-04-bia-compra-na-loja-de-black-friday.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-02 Bia · conta: `cliente-qa` (`QA_CLIENTE_QA_USUARIO`, código pelo Mailpit) · anonima até o passo da conta |
| Tour · modo | Feature · por cenário (J-03)                                           |
| Rodada      | exploração                                                             |
| Orçamento   | 49 chamadas de browser de 70 (encadeadas; ~124 comandos individuais, contando login, logout e fechamento) |
| Ambiente    | http://localhost:8082 · build não exposto · Chromium (agent-browser 0.39.1) · viewports 390 × 844 · 1440 × 900 |
| Paridade    | dev server local; `*.supabase.co` e `**/g/collect*` abortados por rota; edge functions com chaves externas inválidas; `<html>` sem `data-perfil` na primeira pintura (perfil aplicado ao carregar a configuração — `data-perfil=black-friday` lido após a carga) |

## Missão

Como cliente no celular, confirmar que dá para ir da Home ao checkout com a loja de preto e ouro lendo tudo — e que o
desconto continua saltando aos olhos —, procurando texto que sumiu no fundo, selo de oferta confundido com os outros e
a marca com a cor errada.

## Passos

Cores lidas por `getComputedStyle`; contraste calculado sobre o primeiro fundo opaco do ancestral (WCAG 2.1).

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | abre a Home em 390 | `data-perfil=black-friday`. Cabeçalho `#0D0C0B` com a marca em `#F7F3EC`; fundo `#FAF8F4`; texto `#161514` (17,19:1); faixa de departamentos `#161514` sobre `#FAF8F4`; parcelas `#57524B` 13 px (7,30:1); preço `#1C1A18`; "Ver todas" `#1C1A18`; "Conheça o ateliê" `#F7F3EC` sobre `#161514` (16,49:1); marca do rodapé `stroke #0D0C0B`. **`documentElement.scrollWidth` 748 em 390 e a página rola 358 px para o lado** (A-1) | `screenshots/2026-11-14-r1/CH-04-01-home-390.png` |
| 02 | abre o menu do celular | gaveta branca, marca `stroke #0D0C0B`, links `#161514` | `screenshots/2026-11-14-r1/CH-04-02-menu-390.png` |
| 03 | abre o produto em oferta e escolhe "Folheado a Ouro Branco" (a variação com de/por; a padrão "Folheado a Ouro" sai por R$ 264,90 sem desconto) | R$ 153,90 · "De R$ 199,90" `#57524B` (7,30:1) · "Economize R$ 46,00" `#1C1A18` 12 px (16,36:1); selo **"-23%" fundo `#C2A063`, texto `#161514`, 11 px (7,38:1)**; "Adicionar à sacola" `#F7F3EC` sobre `#1C1A18` (15,69:1); borda do CEP `#E3DCCE` | `screenshots/2026-11-14-r1/CH-04-03-produto-ouro-branco-390.png` |
| 04 | fonte do sistema a 130 % no produto | nenhum texto sobreposto no bloco de compra, sem rolagem horizontal (390/390) | `screenshots/2026-11-14-r1/CH-04-04-produto-fonte130-390.png` |
| 05 | põe na sacola (R$ 153,90, acima da faixa de R$ 150) | gaveta abre; barra `aria-valuenow=100`, preenchimento `#9A7A45`, 350/350 px; "R$ 153,90 / R$ 150,00" `#57524B` sobre `#F0EADF` 11 px (6,46:1); "Subtotal" `#57524B` (7,74:1); "Finalizar Pedido" `#FFFFFF` sobre `#1C1A18`. Elementos com fundo `#1C1A18`: só o contador "item", "Aplicar" e "Finalizar Pedido" — nenhum chip de desconto; nada em `#34495E` | `screenshots/2026-11-14-r1/CH-04-05-sacola-barra-390.png` |
| 06 | vai ao checkout | "Finalizar compra", "Resumo · 1 item · frete grátis R$ 143,13"; marca do cabeçalho `stroke #0D0C0B` sobre branco; nenhum texto visível abaixo de 4,5:1; borda dos campos `#857A6C`; textos de 12–13 px `#57524B` (6,46–7,74:1); "Pagar R$ 143,13 com PIX" desabilitado, `#FFFFFF` sobre `#1C1A18`; sem rolagem horizontal | — |
| 07 | preenche nome, WhatsApp e um e-mail inválido ("bia@") e tenta "Continuar" | "Continuar" fica desabilitado; nenhuma mensagem de erro, nenhum `aria-invalid`, a borda continua `#857A6C` (spec-gap) | `screenshots/2026-11-14-r1/CH-04-06-checkout-erro-390.png` |
| 08 | entra em `/conta` com o código do Mailpit | entrou ("Pedidos 1", pedido #0613 "Aguardando pagamento"); nenhum texto abaixo de 4,5:1; selo "Aguardando pagamento" `#6B4F24` sobre `#F4ECDF` 12 px (6,47:1); "Pagar com PIX" `#FFFFFF` sobre `#1C1A18` (não tocado); contador "1" do menu da conta `#0D0C0B` sobre **`#DCE6EC`** (spec-gap) | `screenshots/2026-11-14-r1/CH-04-07-conta-390.png` |
| 09 | abre a confirmação `/pedido/b97d…85be` (M1, #0613) | nenhum texto abaixo de 4,5:1; selo de situação `#6B4F24` sobre `#F4ECDF` (6,47:1); lista de passos com marcadores `#1C1A18` e ícone `#F7F3EC`, linha pendente `#E4DDD0`; textos `#57524B` 12–14 px (7,74:1). Nenhuma ação de pagamento tocada | `screenshots/2026-11-14-r1/CH-04-08-pedido-390.png` |
| 10 | procura um cartão com "-X%" (e "Novo"/"Últimas") em Personalizados, QA Promo Correntes e Coleção Amuletos | nenhum cartão com selo "-X%", "Novo" ou "Últimas" nas listas (o cartão do colar mostra a variação padrão, sem de/por) | — |
| 11 | abre "Brinco Búzios" (R$ 59,90) e toca "Adicionar à sacola" | com o aviso de cookies aberto e depois fechado, dois toques não puseram a peça na sacola ("Sacola, 1 item"); o botão da barra fixa estava em y=861–882 com viewport 844 (fora da tela). Depois de recarregar, a barra entrou e o toque funcionou (A-2) | — |
| 12 | tira o colar e fica só com o brinco (abaixo da faixa) | barra `aria-valuenow=40`, preenchimento `#9A7A45` 154/350 px, trilho `#FFFFFF`; "Faltam R$ 90,10 para frete grátis!" | `screenshots/2026-11-14-r1/CH-04-09-sacola-barra-parcial-390.png` |
| 13 | Home em 1440 | marca do cabeçalho `#F7F3EC`, a do rodapé `#0D0C0B`; sem rolagem horizontal (1440/1440); parcelas `#57524B` (7,30:1); "Ver todos" `#1C1A18` (16,36:1); o único texto abaixo do piso é um `label.sr-only` ("Seu e-mail"), invisível | `screenshots/2026-11-14-r1/CH-04-10-home-1440.png` |
| 14 | `<head>` (390 e 1440) | `theme-color` `#283A4A` (o tom do Padrão); ícones `/favicon.svg`, `/favicon.ico`, `/icon-512.png`, `/apple-touch-icon.png`; `og:image` `https://umaestrelinha.com.br/joia-afetiva-leite-materno-uma-estrelinha.jpg` — nada do perfil vazou para o `<head>` | — |
| 15 | produto em 1440, variação Ouro Branco | "-23%" fundo `#C2A063`, texto `#161514`, 11 px; sem rolagem horizontal | `screenshots/2026-11-14-r1/CH-04-11-produto-1440.png` |
| 16 | sai da conta | "Sair da conta" → "Entrar ou criar conta"; browser fechado | — |

**Edge cases tentados:**

- Sacola abaixo (40 %) e acima (100 %) da faixa do frete grátis: as duas em `#9A7A45`
- Menu do celular aberto: marca `#0D0C0B`
- Fonte a 130 % no produto: sem sobreposição nem corte
- Campo do checkout inválido: não aparece estado de erro (spec-gap)
- Confirmação: selo de situação sobre o fundo dele (6,47:1) e lista de passos
- Recarregar (passo 11): foi o que destravou a barra fixa do produto

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-JOURNEY-002 | pass | 01–06 | `screenshots/2026-11-14-r1/CH-04-01-home-390.png`, `CH-04-03-…`, `CH-04-05-…` | Bia chega ao checkout com a peça, tudo em preto e ouro e legível em 390. Tempo por passo não cronometrado (cada tela carregou na primeira espera, sem demora perceptível). O "-X%" em ouro nos cartões da categoria não aparece (ver TC-FUNC-009). Variação 1440: só Home e produto rodaram |
| TC-PERSONA-001 | skip | 01–15 | `screenshots/2026-11-14-r1/CH-04-07-conta-390.png`, `CH-04-08-pedido-390.png` | Em 390, as sete telas passaram, sem texto visível abaixo do piso. Em 1440 só Home e produto rodaram (orçamento). Variação "campo com erro" não alcançável: o formulário não envia nem mostra erro. Gaveta de material não aberta. A rolagem horizontal da Home em 390 (A-1) é intermitente |
| TC-FUNC-009 | blocked | 03, 10, 15 | `screenshots/2026-11-14-r1/CH-04-03-produto-ouro-branco-390.png`, `CH-04-11-produto-1440.png` | `massa`: nenhum cartão de lista exibe "-X%", "Novo" ou "Últimas" (o de/por está numa variação que não é a padrão). O passo 3 passa: o selo da galeria fica `#C2A063`/`#161514` em 390 e 1440 |
| TC-FUNC-010 | pass | 05, 12 | `screenshots/2026-11-14-r1/CH-04-05-sacola-barra-390.png`, `CH-04-09-sacola-barra-parcial-390.png` | barra parcial e completa `#9A7A45`; nenhum chip de desconto `#1C1A18`/`#34495E`. `/carrinho` e 1440 não rodaram |
| TC-FUNC-011 | pass | 01, 02, 06, 13, 14 | `screenshots/2026-11-14-r1/CH-04-02-menu-390.png` | rodapé, menu e cabeçalho do checkout `#0D0C0B`; `theme-color` `#283A4A`, ícones e `og:image` fixos. A marca do cabeçalho da Home fica `#F7F3EC` sobre o cabeçalho `#0D0C0B` (spec-gap). A comparação lado a lado com o Padrão não foi feita (8092 não aberta): o valor `#283A4A` é o do Padrão segundo o próprio TC |

Contagem: pass 3 · fail 0 · blocked 1 · skip 1

## Achados

### A-1 · [Home · 390] A página rola para o lado no celular — Bia arrasta a Home de lado

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Bia                                                            |
| Jornada e passo     | J-03, passo 1 (abre a Home) · passo 01 do log                         |
| TC                  | TC-PERSONA-001 (sem rolagem horizontal do body)                       |
| Gravidade proposta  | medium — Bia rola com o polegar e a Home escorrega para o lado; ela segue, com esforço |
| Reproduziu          | intermitente (3 leituras seguidas na mesma carga; não reconferido numa segunda carga) |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Anônima, sacola vazia, viewport 390 × 844, abrir `http://localhost:8082/`
2. Esperar a rede assentar
3. Rolar a página para a direita (ou ler `document.documentElement.scrollWidth`)

**Esperado:** sem rolagem horizontal do body em 390 — **fonte:** TC-PERSONA-001, passo 1 (PRD RN-08)

**Observado:** `documentElement.scrollWidth` = 748 com viewport 390 (`body.scrollWidth` = 390); `scrollTo(500,0)` deixou `scrollX` = 358. Nenhum elemento de fluxo sem recorte passa de 392 px. O único fora da largura é um `span` absoluto do botão flutuante (`animate-ping`, verde, direita em 401 px). Em 1440, e nas outras telas em 390, a largura bate.

**Evidência:**

- `screenshots/2026-11-14-r1/CH-04-01-home-390.png` — a Home em 390 na carga em que a medida foi feita
- console: nada lido
- rede: nada

### A-2 · [Produto · 390] "Adicionar à sacola" não responde até recarregar — Bia toca e a peça não entra

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Bia                                                            |
| Jornada e passo     | J-03, passo 4 (põe na sacola) · passo 11 do log                       |
| TC                  | —                                                                     |
| Gravidade proposta  | medium — dois toques sem resposta; ela só conclui recarregando, e com 30 s de paciência pode desistir |
| Reproduziu          | intermitente (1 de 2: depois de recarregar funcionou de primeira)     |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. `cliente-qa` logada, viewport 390 × 844, uma peça já na sacola; abrir `http://localhost:8082/amuletos`
2. Tocar no cartão "Brinco Búzios Folheado a Ouro"; o aviso de cookies aparece
3. Tocar "Adicionar à sacola"; fechar o aviso de cookies; tocar de novo

**Esperado:** a gaveta "Sua sacola" abre com a peça — **fonte:** TC-JOURNEY-002, passo 4 (comportamento do colar no passo 05 desta sessão)

**Observado:** nenhuma gaveta, nenhum aviso; o cabeçalho segue "Sacola, 1 item". Em 390, o botão visível é o da barra fixa (o do bloco de compra tem altura 0), e ele estava em y=861 e y=882, abaixo da viewport de 844. Depois de recarregar, a barra entrou (`translateY` animando até y=825) e o toque abriu a gaveta. Fora da superfície da Mudança. Provável pré-existente.

**Evidência:**

- sem screenshot do estado (lido pelo snapshot e pela posição do botão)
- console: nada lido
- rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| E-mail inválido no contato do checkout: "Continuar" só fica desabilitado, sem mensagem de erro nem `aria-invalid`, e a borda não muda. Bia não sabe o que corrigir | checkout · 07 | pré-existente |
| Contador "1" do menu da conta com fundo `#DCE6EC`, um tom azulado fora do preto e ouro, no Black Friday | `/conta` · 08 | polimento |
| A marca do cabeçalho da Home fica `#F7F3EC` (clara) sobre o cabeçalho `#0D0C0B`. O TC-FUNC-011 pede `#0D0C0B` para "a marca da Home", e nenhuma fonte define a marca sobre superfície escura | Home · 01, 13 | polimento |
| O texto dos botões escuros varia: `#FFFFFF` em "Finalizar Pedido", "Aplicar" e "Pagar com PIX"; `#F7F3EC` em "Adicionar à sacola" e "Conheça o ateliê" | sacola, checkout, conta · 05, 06, 08 | polimento |

## Fora da cobertura

- 1440 de categoria, sacola, checkout, conta e confirmação — orçamento (só Home, `<head>` e produto rodaram em 1440)
- Cartão com "-X%" e "Novo" juntos, e "Novo"/"Últimas" em lista — massa: nenhum cartão exibe esses selos (o de/por é de uma variação não padrão)
- Campo do checkout com erro (borda `field` e texto de erro) — o formulário não mostra estado de erro (spec-gap)
- Foco visível (Tab) no cabeçalho escuro e nos botões — orçamento
- Gaveta "Como enviar o material" — o link existe, não foi aberta (orçamento)
- Barra do frete em `/carrinho` — orçamento
- Comparação do `<head>` lado a lado com a loja de antes (8092) — orçamento; valores registrados para conferência
- Rede lenta da persona — o agent-browser não atrasa resposta
- Tempo por passo (4 s / 3 s) — não cronometrado; nenhuma espera passou da primeira tentativa por demora de tela

## Debrief

- **Surpresas:** o produto de/por só mostra o desconto na variação "Folheado a Ouro Branco". Na padrão, nenhum selo aparece, nem no cartão, e por isso o selo do cartão não foi conferível. O cookie banner apareceu depois do login e coincidiu com a barra fixa fora da tela (A-2)
- **Próximo charter:** completar 1440 (categoria, sacola, checkout, conta, confirmação) e o foco visível; reconferir A-1 numa carga limpa da Home em 390
- **Padrão novo:** medir `documentElement.scrollWidth` contra `body.scrollWidth` em toda tela de 390 — achou a rolagem lateral que o olho não pega no snapshot
