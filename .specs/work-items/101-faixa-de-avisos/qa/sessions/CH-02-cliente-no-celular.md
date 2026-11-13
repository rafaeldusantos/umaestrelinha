# Sessão CH-02 · A cliente que vem do anúncio, no celular (r2, confirmação)

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-02-cliente-no-celular.md` · exploratório · P0  |
| Status      | done (o alvo, TC-FUNC-011, ficou `blocked` por massa: a sacola não recebeu a peça) |
| Persona     | PER-02 Bia · conta: anonima                                            |
| Tour · modo | — (rodada de confirmação, sem tour) · por cenário (J-02)               |
| Rodada      | confirmação                                                            |
| Orçamento   | 31 ações de browser de 25 (passou do teto: as esperas e leituras de texto contadas no fim; a sessão parou ali) |
| Ambiente    | http://localhost:8082 · HEAD f649a843 (dev server do worktree) · Chromium (agent-browser 0.39.1) · viewport 390 × 844 |
| Paridade    | rotas abortadas: `*.supabase.co`, `**/*.supabase.co/**` (imagens do Storage hospedado) e `**/g/collect*` (GA4) |

## Missão

Confirmar que a Bia, chegando por um anúncio direto num produto, no celular e com rede lenta, vê a Black Friday, consegue ler o aviso antes de ele trocar e chega às ofertas em um toque — e que a faixa não a acompanha até o pagamento.

Recorte desta rodada: só o TC-FUNC-011 (skip na r1) — o checkout alcançado pela sacola, o voltar do checkout, 404, `/pagar-com-cartao` e `/politica-de-privacidade`.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abriu `/produtos/pingente-olho-grego-folheado-a-ouro` (390 × 844), sem sessão | A faixa "Avisos da loja" acima do cabeçalho, com A1 ("Black Friday · novembro inteiro com joias em oferta · Ver ofertas"). Produto sem opção a escolher, "Em estoque", R$ 64,90 | snapshot (sem screenshot) |
| 02 | Tocou em "Adicionar à sacola" (botão fixo no rodapé) | Nada mudou na tela: nenhum aviso em "Notifications", nenhuma gaveta, o botão "Sacola" sem contador | snapshot |
| 03 | Tocou em "Sacola" | Gaveta "Sua sacola" com "Sua sacola está vazia" — "Escolha uma peça — eu embalo com carinho." e "Explorar joias". Sem botão de checkout | snapshot (texto da gaveta) |
| 04 | Fechou a sacola, fechou o aviso de cookies (que fica sobre o rodapé no celular) e tocou de novo em "Adicionar à sacola" | De novo nada: nenhum aviso de "adicionado" em 25 s, nada nas notificações. Console sem erro | snapshot · `errors` vazio |
| 05 | Abriu `/produtos/pingente-afetivo-barquinho-com-cabelo` | Faixa com A2. Opção "Folheado a ouro (Prata 925)" já marcada (radio), "Prata 925" e "Chaveiro" disponíveis | snapshot |
| 06 | Tocou em "Adicionar à sacola" | Nada mudou: mesma URL, nenhuma gaveta nem aviso, "Sacola" sem contador. A sessão chegou ao teto aqui, sem reabrir a sacola | snapshot |

**Edge cases tentados:** nada (rodada de confirmação)

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-011 | blocked | 01–06 | snapshots dos passos 02–06 | `blocked` por massa: a peça não entrou na sacola em dois produtos (3 toques), então o checkout não foi alcançado pela sacola, e o voltar do checkout ficou sem conferir. 404, `/pagar-com-cartao` e `/politica-de-privacidade` também não foram conferidos (orçamento). Passos 1 e 3 já estavam `pass` na continuação da r1 (Home, C1, produto com faixa; `/pedido-montado` sem faixa). Nesta sessão a faixa apareceu nos dois produtos (A1, A2), o que confirma de novo o passo 1 |

Contagem: pass 0 · fail 0 · blocked 1 · skip 0

## Achados

### A-1 · [Produto, celular] "Adicionar à sacola" não põe a peça na sacola — a cliente anônima não chega ao checkout

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Bia                                                            |
| Jornada e passo     | J-02, ramo J-02b (ir ao checkout) · passos 02–06 do log               |
| TC                  | — (bloqueia o TC-FUNC-011; não é a superfície da Mudança)             |
| Gravidade proposta  | high — se reproduzir fora deste ambiente, ninguém compra pelo celular; pode ser do ambiente local (ver Observado) |
| Reproduziu          | sim (3 de 3 toques, em 2 produtos; a sacola vazia foi conferida depois do 1º) |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Sem sessão, sacola vazia, viewport 390 × 844, com as rotas `*.supabase.co` e `**/g/collect*` abortadas; abrir `http://localhost:8082/produtos/pingente-olho-grego-folheado-a-ouro`
2. Tocar em "Adicionar à sacola" (botão fixo no rodapé)
3. Tocar em "Sacola"

**Esperado:** a peça entra na sacola, e a sacola oferece seguir para o checkout — **fonte:** TC-FUNC-011 passo 2 ("Põe um produto na sacola e vai ao checkout"), TC-JOURNEY-001 ramo J-02b

**Observado:** nenhum retorno ao toque. A sacola mostra "Sua sacola está vazia". No `pingente-afetivo-barquinho-com-cabelo`, com a opção "Folheado a ouro (Prata 925)" já marcada, o toque também não deu retorno. A r1 viu o mesmo sintoma: o `/checkout` aberto depois de "Adicionar à sacola" levou à Home. Causa não investigada: pode ser o ambiente (o aborto de `*.supabase.co`, as imagens do Storage hospedado) ou o headless. Antes de abrir bug, conferir num browser comum sem as rotas

**Evidência:**

- sem screenshot (o teto da sessão chegou antes); snapshot do passo 03: heading "Sua sacola", texto "Sua sacola está vazia"
- console: `nada` (`errors` vazio depois do passo 04)
- rede: não lida

## Spec-gaps

nada

## Fora da cobertura

- TC-FUNC-011 passo 2 (checkout sem faixa) e a variação "voltar do checkout": a sacola não recebeu a peça (A-1)
- Variações 404 (`/caminho-que-nao-existe`), `/pagar-com-cartao` e `/politica-de-privacidade` (com faixa): a sessão gastou o orçamento tentando pôr a peça na sacola
- 1440 × 900: orçamento
- Screenshots `CH-02-r2-*`: nenhuma tirada; a evidência é o snapshot

## Debrief

- **Surpresas:** o "Adicionar à sacola" não dá retorno nenhum no celular, nem com a opção já marcada; o aviso de cookies fica sobre o rodapé fixo
- **Próximo charter:** uma continuação de umas 12 ações, de preferência com a sacola já com uma peça (ou com o ambiente conferido antes num browser comum, sem as rotas): sacola → checkout sem faixa → voltar (faixa reaparece) → 404 → `/pagar-com-cartao` → `/politica-de-privacidade`. As três variações de URL direta não dependem da sacola e podem ir antes
- **Padrão novo:** nada
