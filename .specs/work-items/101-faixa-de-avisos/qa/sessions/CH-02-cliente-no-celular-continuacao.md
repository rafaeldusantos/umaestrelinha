# Sessão CH-02 · A cliente que vem do anúncio, no celular (r2, confirmação — continuação)

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-02-cliente-no-celular.md` · exploratório · P0  |
| Status      | done (o alvo, TC-FUNC-011, segue `blocked` por massa: a sacola não recebeu a peça) |
| Persona     | PER-02 Bia · conta: anonima                                            |
| Tour · modo | — (rodada de confirmação, sem tour) · por cenário (J-02)               |
| Rodada      | confirmação                                                            |
| Orçamento   | 21 ações de browser de 20 (mais 4 de configuração — rotas e viewport — fora da conta; a última screenshot passou 1 do teto e a sessão parou ali) |
| Ambiente    | http://localhost:8082 · HEAD f649a843 (worktree) · referência só leitura http://localhost:8092 (master, sem a faixa) · Chromium (agent-browser 0.39.1) · viewport 390 × 844 |
| Paridade    | rotas abortadas: `*.supabase.co`, `**/*.supabase.co/**` (imagens do Storage hospedado) e `**/g/collect*` (GA4) |

## Missão

Confirmar que a Bia, chegando por um anúncio direto num produto, no celular e com rede lenta, vê a Black Friday, consegue ler o aviso antes de ele trocar e chega às ofertas em um toque — e que a faixa não a acompanha até o pagamento.

Recorte desta continuação: só o TC-FUNC-011 — pôr o olho grego na sacola escolhendo cada opção e lendo a mensagem logo depois do toque; checkout sem faixa e o voltar; se não entrar, a mesma coisa no master (:8092) para separar regressão do WI de defeito anterior; com o que sobrasse, 404, `/pagar-com-cartao` e `/politica-de-privacidade` por URL direta.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abriu `:8082/produtos/pingente-olho-grego-folheado-a-ouro` (390 × 844), sem sessão | Faixa "Avisos da loja" acima do cabeçalho com A1 ("Black Friday · novembro inteiro com joias em oferta · Ver ofertas"). No bloco do produto: nome, R$ 64,90, R$ 60,36 com Pix, 3x de R$ 21,63, "Em estoque". **Nenhum seletor de opção na tela** (nem radio, nem select, nem botão de variação, no snapshot completo do bloco): a persona não tem opção a escolher | snapshot |
| 02 | Fechou o aviso de cookies e tocou em "Adicionar à sacola" (rodapé fixo); leu a região "Notifications" no mesmo comando | Região "Notifications" vazia: nenhum toast, nem de sucesso nem de "combinação indisponível". Console sem erro | `screenshots/CH-02-r2c-01-adicionar-8082.png` · `errors` vazio |
| 03 | Tocou em "Sacola" | Gaveta "Sua sacola" só com "Fechar sacola" e "Explorar joias" — a sacola vazia; sem botão de checkout | snapshot do dialog |
| 04 | Abriu o mesmo produto no `:8092` (master) | Página do produto sem a faixa (como esperado no master), "Em estoque", botão "Adicionar à sacola" | snapshot |
| 05 | Tocou em "Adicionar à sacola" e leu "Notifications" logo depois | Região "Notifications" vazia — o mesmo silêncio do :8082 | snapshot |
| 06 | Tocou em "Sacola" | O dialog da sacola não estava no snapshot logo depois do toque; o conteúdo da sacola no master não foi lido (teto). Screenshot tirada, não conferida | `screenshots/CH-02-r2c-02-sacola-8092.png` |

**Edge cases tentados:** nada (rodada de confirmação)

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-011 | blocked | 01–06 | `screenshots/CH-02-r2c-01-adicionar-8082.png`, `screenshots/CH-02-r2c-02-sacola-8092.png` | `blocked` por massa: a peça não entrou na sacola no :8082, então o checkout pela sacola e o voltar do checkout seguem sem conferir. A faixa apareceu de novo no produto (A1), acima do cabeçalho — reconfirma o passo 1. 404, `/pagar-com-cartao` e `/politica-de-privacidade` não conferidos (orçamento) |

Contagem: pass 0 · fail 0 · blocked 1 · skip 0

## Achados

### A-1 (continuação do A-1 da sessão anterior) · [Produto, celular] "Adicionar à sacola" no olho grego não dá retorno nem põe a peça na sacola — e a tela não oferece opção a escolher

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Bia                                                            |
| Jornada e passo     | J-02, ramo J-02b (ir ao checkout) · passos 01–06 deste log            |
| TC                  | — (bloqueia o TC-FUNC-011; fora da superfície da Mudança)             |
| Gravidade proposta  | high — a cliente anônima no celular não compra este produto, e não recebe nenhuma mensagem dizendo o que falta |
| Reproduziu          | sim no :8082 (agora 4 de 4 toques, somando a sessão anterior); no :8092 o toque também não mostrou mensagem, mas a sacola do master não foi lida — **regressão do WI não demonstrada; indício de defeito anterior ao WI** |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Sem sessão, sacola vazia, viewport 390 × 844, rotas `*.supabase.co` e `**/g/collect*` abortadas; abrir `http://localhost:8082/produtos/pingente-olho-grego-folheado-a-ouro`
2. Procurar uma opção a escolher no bloco do produto — não há
3. Tocar em "Adicionar à sacola" (botão fixo no rodapé) e olhar logo depois
4. Tocar em "Sacola"

**Esperado:** a peça entra na sacola, ou a loja diz o que falta (o toast "Essa combinação está indisponível. Escolha outra." ou parecido, informado pelo briefing como o comportamento da loja) — **fonte:** TC-FUNC-011 passo 2 ("Põe um produto na sacola e vai ao checkout"), TC-JOURNEY-001 ramo J-02b

**Observado:** nenhuma opção visível para escolher; ao toque, a região "Notifications" fica vazia (nenhum toast); a sacola abre vazia ("Explorar joias"). Console sem erro. No master (:8092), o mesmo produto também não mostrou toast ao toque — o que sugere que o defeito é anterior ao WI; a confirmação (sacola do master vazia) ficou para depois por orçamento. Hipótese para quem triar, não investigada: o produto tem variação obrigatória (segundo o briefing, 1 no olho grego) que a tela não apresenta à cliente — talvez porque o seletor depende de imagem do Storage hospedado, abortada neste ambiente

**Evidência:**

- `screenshots/CH-02-r2c-01-adicionar-8082.png` (:8082, logo depois do toque)
- `screenshots/CH-02-r2c-02-sacola-8092.png` (:8092, depois de tocar em "Sacola")
- snapshot do passo 03: dialog "Sua sacola" com "Fechar sacola" e "Explorar joias"
- console: `nada` (`errors` vazio depois do passo 02)
- rede: não lida

## Spec-gaps

nada

## Fora da cobertura

- TC-FUNC-011 passo 2 (checkout sem faixa) e a variação "voltar do checkout": a sacola não recebeu a peça (A-1)
- A sacola do master depois do toque (passo 06): o dialog não estava no snapshot e o teto chegou; a separação "regressão × anterior ao WI" fica em indício
- Variações 404 (`/caminho-que-nao-existe`), `/pagar-com-cartao` e `/politica-de-privacidade` (com faixa): orçamento — a comparação com o master veio antes, como o briefing pediu
- Sem as rotas de aborto (imagens do Storage hospedado): proibido pelo ambiente

## Debrief

- **Surpresas:** o olho grego não mostra seletor de opção nenhum na tela, mas (segundo o briefing) tem variação; nem o :8082 nem o :8092 dão toast ao toque
- **Próximo charter:** as três URLs diretas (404, `/pagar-com-cartao`, `/politica-de-privacidade`) cabem em ~6 ações e não dependem da sacola; o checkout pela sacola precisa de um produto sem variação (ou de uma sacola já montada como massa) — e, antes, ler a sacola do master depois de "Adicionar à sacola" para fechar se o A-1 é anterior ao WI
- **Padrão novo:** nada
