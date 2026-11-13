# Sessão CH-02 (continuação) · A cliente que vem do anúncio, no celular

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-02-cliente-no-celular.md` · exploratório · P0  |
| Status      | done (continuação limitada ao TC-FUNC-011; o orçamento acabou antes do checkout e das variações) |
| Persona     | PER-02 Bia · conta: anonima                                            |
| Tour · modo | Feature · por cenário (J-02, passos 1 e 4 e ramo J-02b)                |
| Rodada      | exploração (continuação da sessão `sessions/CH-02-cliente-no-celular.md`) |
| Orçamento   | 25 ações de browser de 25. Contei cada comando, inclusive o viewport, as rotas, as esperas e as leituras de medida |
| Ambiente    | http://localhost:8082 (worktree do WI 101, Supabase local) · build não exposto · Chromium headless (agent-browser 0.39.1, sessão `CH-02c`) · viewport 390 × 844 |
| Paridade    | dev local: o `<html>` vem sem `data-faixa` (esperado localmente). Por isso cada leitura de presença ou ausência foi feita depois de `wait --load networkidle`. Rotas bloqueadas: `*.supabase.co` e `**/g/collect*`. O toque é simulado com clique de mouse |

## Missão

Confirmar que a Bia, chegando por um anúncio direto num produto, no celular e com rede lenta, vê a Black Friday, consegue ler o aviso antes de ele trocar e chega às ofertas em um toque — e que a faixa não a acompanha até o pagamento.

Recorte desta continuação: só o TC-FUNC-011 (presença e ausência da faixa por rota).

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abriu a Home (`/`) | A região "Avisos da loja" fica acima do cabeçalho, com o A1 "Black Friday · novembro inteiro com joias em oferta · Ver ofertas" como um link só. Faixa em 0–52 px na largura toda (390), `<header>` com topo em 52, `scrollWidth` = 390 | `screenshots/CH-02c-01-home.png` |
| 02 | Abriu C1 (`/joias-afetivas`) | A faixa fica em 0–52 px na largura 390, o header em 52 e o link do A1 aparece no snapshot | — |
| 03 | Tocou no primeiro produto de C1 (`/produtos/pingente-afetivo-barquinho-com-cabelo`) | A faixa fica em 0–52 px na largura 390, com o header em 52 | — |
| 04 | Tocou em "Adicionar à sacola" (variação padrão "Folheado a ouro"), depois abriu `/checkout` direto | O `/checkout` levou de volta à Home (`/`), com a faixa e o A1. A tela do checkout não apareceu. A sessão não conferiu se a peça entrou na sacola (orçamento), então não dá para dizer se a sacola estava vazia | `screenshots/CH-02c-02-checkout.png` (mostra a Home depois do redirecionamento) |
| 05 | Abriu `/pedido-montado` direto | Apareceu a tela "Seu pedido" do pedido montado, sem a região "Avisos da loja" (nem o texto "Black Friday" na página) e com o `<header>` no topo (0) | — (medida por leitura da página) |

**Edge cases tentados:** abrir o checkout pela URL e não pela sacola: a loja levou à Home (ver Debrief)

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-FUNC-011 | skip | 01–05 | `screenshots/CH-02c-01-home.png`, `screenshots/CH-02c-02-checkout.png` | Parcial. Passo 1 pass: faixa acima do header, largura toda, um aviso, na Home, em C1 e no produto de C1. Passo 3 pass: `/pedido-montado` sem faixa. Passo 2 não concluído: o `/checkout` aberto pela URL foi para a Home, e o orçamento acabou antes de confirmar a sacola e de entrar no checkout pela sacola. Variações (404, `/pagar-com-cartao`, `/politica-de-privacidade`, voltar do checkout) não feitas, por orçamento. Sem falha observada |

Contagem: pass 0 · fail 0 · blocked 0 · skip 1

## Achados

nada

## Spec-gaps

nada

## Fora da cobertura

- TC-FUNC-011, passo 2 (checkout sem faixa): o checkout não foi alcançado. O `/checkout` aberto pela URL depois de "Adicionar à sacola" foi para a Home. Faltou orçamento para abrir a sacola, confirmar a peça e seguir pelo botão da sacola. Segue sem veredito, e é o ramo J-02b do P0
- Variações do TC-FUNC-011: 404 (`/caminho-que-nao-existe`), `/pagar-com-cartao`, `/politica-de-privacidade` (com faixa) e voltar do checkout. Motivo: orçamento
- Screenshot de `/pedido-montado`: a última ação do orçamento foi a leitura da página, e a tela não foi fotografada

## Debrief

- **Surpresas:** o `/checkout` aberto pela URL levou à Home logo depois de "Adicionar à sacola". Pode ser só a sacola vazia (o clique pode ter aberto a gaveta sem confirmar a peça) ou o checkout pode exigir entrar pela sacola. Isso não foi investigado, e não é achado até ser conferido
- **Próximo charter:** uma continuação curta, de cerca de 15 ações: produto → "Adicionar à sacola" → abrir a sacola e conferir a peça → botão de finalizar → checkout sem faixa → voltar (a faixa reaparece) → 404 → `/pagar-com-cartao` → `/politica-de-privacidade`
- **Padrão novo:** nada
