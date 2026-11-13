# Sessão CH-02 · A cliente que vem do anúncio, no celular

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-02-cliente-no-celular.md` · exploratório · P0  |
| Status      | done (o orçamento acabou antes do fim; o que faltou está em Fora da cobertura) |
| Persona     | PER-02 Bia · conta: anonima                                            |
| Tour · modo | Feature · por cenário (J-02)                                           |
| Rodada      | exploração                                                             |
| Orçamento   | 56 ações de browser de 50. Contei cada comando, inclusive as esperas e as leituras de medida. O laço de rolagem do passo 05 gastou 27 ações e passou do teto |
| Ambiente    | http://localhost:8082 (worktree do WI 101, Supabase local) · build não exposto · Chromium headless (agent-browser 0.39.1) · viewport 390 × 844 |
| Paridade    | dev local: o `<html>` vem sem `data-faixa`, então a faixa pode entrar depois da primeira pintura (é o esperado local). Rotas bloqueadas: `*.supabase.co` e `**/g/collect*`. O toque é simulado com eventos de mouse (o driver não tem toque real) |

## Missão

Confirmar que a Bia, chegando por um anúncio direto num produto, no celular e com rede lenta, vê a Black Friday, consegue ler o aviso antes de ele trocar e chega às ofertas em um toque — e que a faixa não a acompanha até o pagamento.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abriu o link do anúncio `/produtos/pingente-olho-grego-folheado-a-ouro`, um produto de C2 (`/amuletos`) | O produto, com a região "Avisos da loja" acima do cabeçalho e o A1 "Black Friday · novembro inteiro com joias em oferta · Ver ofertas" como um link só. Faixa de 0 a 52 px na largura toda (390); o `<header>` começa em 52 | `screenshots/CH-02-01-produto-a1.png` |
| 02 | Ficou olhando a faixa (26 s, cada troca anotada) | A2 → A3 (t=3,0 s) → A4 (9,0 s) → A1 (15,0 s) → A2 (21,0 s): uma troca a cada 6,0 s, na ordem. Com os quatro avisos, a faixa tem 52 px, o topo do header fica em 52 e `scrollWidth` = 390. Os avisos A1, A2 e A4 têm um link cada; o A3 não tem link | — |
| 03 | Leu o aviso mais longo (A2, 90 caracteres) | Duas linhas (36 px de texto, `line-height` de 18). "Ver as peças" ficou inteiro numa linha só, sem nada cortado | `screenshots/CH-02-02-a2-390.png` |
| 04 | Esperou o A1 e tocou no começo do aviso, sobre "Black Friday" (x=18, y=26) | Abriu `/joias-afetivas` (C1), e a faixa continua lá em cima com o A1 | `screenshots/CH-02-03-c1-faixa.png` |
| 05 | Rolou a categoria para baixo aos poucos (20, 30, 60, 100, 200, 400 px), depois subiu (150, 300 px) e voltou ao topo num gesto rápido | A faixa sobe junto com o conteúdo, sem ficar presa no topo. O header é sticky: ele fica visível até a faixa sair da tela (y=110: faixa fora, header em 0) e só depois se recolhe (y=210: `translateY(-64)`). Ao subir, o header volta. No topo, a faixa fica de novo em 0–52 e o header em 52, sem vão e sem sobreposição | `screenshots/CH-02-04-c1-rolada.png` |

**Edge cases tentados:**
- toque no começo do aviso (destaque), e não no centro do link: navegou
- rolar devagar e voltar rápido ao topo: nenhuma sobreposição medida

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-JOURNEY-001 | pass | 01–05 | `screenshots/CH-02-01-produto-a1.png`, `screenshots/CH-02-03-c1-faixa.png` | Os passos 1 a 4 conferem. O ramo J-02b (checkout) não foi alcançado: ver TC-FUNC-011. O tempo de "em até" não foi medido sob rede lenta (local) |
| TC-FUNC-011 | skip | — | — | O orçamento acabou antes de checkout, `/pedido-montado`, 404, `/pagar-com-cartao`, `/politica-de-privacidade` e do voltar do checkout. A Home também não foi aberta. Só o produto e a categoria foram conferidos com faixa |
| TC-FUNC-012 | pass | 02 | — | Passo 1: troca a cada 6,0 s, A1→A2→A3→A4. Passos 2 e 3 em skip, porque o driver não tem toque prolongado (variação do próprio TC). Aba em segundo plano não tentada (orçamento) |
| TC-FUNC-013 | pass | 01, 02, 04 | `screenshots/CH-02-01-produto-a1.png` | Passos 1 e 2: sem setas, o A1 é um link só e o toque no destaque abre C1. Passo 3: o A3 não tem link (pela contagem de links na faixa, sem tocar nele). Passo 4 (tocar na arte do A4) e a variação de arrastar sobre a faixa não foram alcançados por orçamento. O snapshot mostra o A4 com um link |
| TC-FUNC-014 | pass | 05 | `screenshots/CH-02-04-c1-rolada.png` | Conferido com a fonte padrão, na categoria. A variação a 130 % não foi feita (orçamento) |
| TC-UI-001 | pass | 02, 03 | `screenshots/CH-02-02-a2-390.png` | Em 390: sem rolagem lateral com nenhum dos quatro avisos; o A2 em duas linhas com o rótulo inteiro; a altura e o topo do header iguais nas quatro trocas. A variação em 360 × 800 e as de 130 % e 200 % não foram feitas (orçamento) |

Contagem: pass 5 · fail 0 · blocked 0 · skip 1

## Achados

nada

## Spec-gaps

nada

## Fora da cobertura

- TC-FUNC-011 inteiro: checkout e `/pedido-montado` sem faixa, 404, `/pagar-com-cartao`, página fixa e o voltar do checkout. Motivo: orçamento. Fica para a continuação, e é P0
- TC-FUNC-012, passos 2 e 3 (pausa com o dedo segurando a faixa): o agent-browser no Chromium não faz toque prolongado. Só tem mouse down/up, e o mouse up sobre o link navegaria
- TC-FUNC-012, aba em segundo plano por 20 s: orçamento
- TC-FUNC-013, passo 4 (tocar na arte do A4) e a variação de arrastar o dedo sobre a faixa: o primeiro por orçamento, o segundo também precisa de toque real
- TC-UI-001 em 360 × 800 e com a fonte a 130 %; TC-FUNC-014 a 130 %: orçamento
- Rolar o produto (o charter pede o produto e a categoria): só a categoria foi rolada
- Rede lenta: o agent-browser não limita a rede. Os tempos de "em até" da J-02 não foram medidos nessa condição
- O aviso de cookies e o balão do WhatsApp em cima da faixa: não apareceu nada sobre a faixa nas screenshots tiradas. A conferência não foi dirigida

## Debrief

- **Surpresas:** o orçamento acabou rápido. Medir a rolagem em 9 posições, cada uma com rolar, esperar e ler, custou mais da metade do que sobrava
- **Próximo charter:** uma continuação curta do CH-02 (cerca de 20 ações): TC-FUNC-011 inteiro (checkout, pedido montado, 404, link de cartão, voltar), mais 360 × 800 e 130 %. O toque prolongado, num driver com toque real (dispositivo ou provider iOS)
- **Padrão novo:** um único `eval` que observa a faixa por 26 s e devolve trocas, altura, topo do header e `scrollWidth`. Cobriu de uma vez o TC-FUNC-012 passo 1 e o TC-UI-001 passos 2 e 3
