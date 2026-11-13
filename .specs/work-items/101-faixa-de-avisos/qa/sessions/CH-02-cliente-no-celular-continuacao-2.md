# Sessão CH-02 · A cliente que vem do anúncio, no celular (continuação 2)

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-02-cliente-no-celular.md` · exploratório · P0 |
| Status      | blocked (massa) |
| Persona     | PER-02 Bia · conta: anonima |
| Tour · modo | Feature · por cenário (J-02) — só TC-FUNC-011 |
| Rodada      | confirmação |
| Orçamento   | 22 ações de browser de 20 (2 acima: a espera pelo dialog da sacola e a screenshot da prova) |
| Ambiente    | http://localhost:8082 (worktree, HEAD f649a843) · build não exposto · Chromium (agent-browser 0.39.1, sessão `CH-02c2`) · viewport 390 × 844 |
| Paridade    | Supabase local; `*.supabase.co` e `**/g/collect*` abortados por rota (imagens do Storage hospedado não carregam) |

## Missão

Confirmar que a Bia, chegando por um anúncio direto num produto, no celular e com rede lenta, vê a Black Friday, consegue ler o aviso antes de ele trocar e chega às ofertas em um toque — e que a faixa não a acompanha até o pagamento.

Nesta peça: só TC-FUNC-011 — o checkout sem faixa, o voltar do checkout e as URLs diretas.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abriu `/produtos/memorial-afetivo-pet-pata-com-pelo` (estoque 99, sem opções, segundo o briefing) | Faixa "Avisos da loja" com A1 (Black Friday · novembro inteiro com joias em oferta · Ver ofertas) acima do cabeçalho; nenhum seletor de opção; botão "Adicionar à sacola" no rodapé | snapshot |
| 02 | Tocou em "Adicionar à sacola" | Nada mudou na tela; região "Notifications" vazia, sem toast | snapshot |
| 03 | Tocou em "Sacola" | Dialog "Sua sacola" com só "Fechar sacola" e "Explorar joias" — sacola vazia. A faixa girou para A2 enquanto isso | snapshot (`[role="dialog"]`) |
| 04 | Abriu `/produtos/pingente-menina-simples-em-folheado-a-ouro` (estoque 4) | Faixa presente; nenhum seletor de opção; "Adicionar à sacola" | snapshot |
| 05 | Tocou em "Adicionar à sacola" e depois em "Sacola" | Sem toast; dialog "Sua sacola" vazio ("Explorar joias") | `screenshots/CH-02-r2c2-01-sacola-vazia-pingente-menina.png` |

Parou aqui, como o briefing manda: a segunda peça também não entrou na sacola.

**Edge cases tentados:** nada (rodada de confirmação)

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-011 | blocked | 01–05 | `screenshots/CH-02-r2c2-01-sacola-vazia-pingente-menina.png` | `blocked` por massa: nenhuma peça entra na sacola, nem as com estoque e sem opção (agora 4 peças em 3 sessões), então o checkout sem faixa e o voltar do checkout seguem sem conferir. A faixa, acima do cabeçalho no produto, reconfirmada (passo 1 do TC) |

Contagem: pass 0 · fail 0 · blocked 1 · skip 0

## Achados

### A-1 (continuação do A-1 das sessões anteriores) · [Produto, celular] "Adicionar à sacola" não põe a peça na sacola nem dá retorno — também em peça com estoque e sem opção

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Bia                                                            |
| Jornada e passo     | J-02, ramo J-02b (ir ao checkout) · passos 02–05 deste log            |
| TC                  | — (bloqueia o TC-FUNC-011; fora da superfície da Mudança)             |
| Gravidade proposta  | high — a cliente anônima no celular não consegue comprar, e não recebe nenhuma mensagem dizendo por quê |
| Reproduziu          | sim (2 de 2 nesta sessão, em duas peças diferentes; 6 de 6 somando as sessões anteriores no :8082) |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Sem sessão, sacola vazia, viewport 390 × 844, rotas `*.supabase.co` e `**/g/collect*` abortadas; abrir `http://localhost:8082/produtos/memorial-afetivo-pet-pata-com-pelo`
2. Tocar em "Adicionar à sacola" (botão fixo no rodapé)
3. Tocar em "Sacola"

**Esperado:** a peça entra na sacola (ou a loja diz por que não entrou) — **fonte:** TC-FUNC-011 passo 2 ("Põe um produto na sacola e vai ao checkout"), TC-JOURNEY-001 ramo J-02b

**Observado:** sem toast; a sacola abre vazia, só com "Explorar joias". O mesmo em `/produtos/pingente-menina-simples-em-folheado-a-ouro`. Isso derruba a hipótese "variação com estoque 0" das sessões anteriores: o briefing descreve as duas peças como com estoque e sem opção. A comparação com o master (:8092) não foi refeita nesta sessão; continua em aberto se é regressão do WI ou defeito anterior (as sessões anteriores apontam para anterior). Uma hipótese para quem triar, não investigada: depende de algo que as rotas abortadas (`*.supabase.co`) cortam

**Evidência:**

- `screenshots/CH-02-r2c2-01-sacola-vazia-pingente-menina.png`: a sacola vazia logo depois de "Adicionar à sacola" no pingente menina
- console: não lido (orçamento)
- rede: não lida (orçamento)

## Spec-gaps

nada

## Fora da cobertura

- TC-FUNC-011 passo 2 (checkout sem faixa, 390 e 1440) e a variação "voltar do checkout": a sacola não recebe a peça (A-1)
- Variações 404 (`/caminho-que-nao-existe`), `/pagar-com-cartao` e `/politica-de-privacidade`: o briefing manda parar depois da segunda peça; ficam de novo sem conferir, e não dependem da sacola
- Console e rede depois de "Adicionar à sacola": orçamento
- Sem as rotas de aborto: proibido pelo ambiente

## Debrief

- **Surpresas:** nem peça com estoque 99 e sem opção entra na sacola; o problema não é a variação esgotada
- **Próximo charter:** as três URLs diretas (~6 ações); para o checkout, uma sacola já montada como massa, ou o A-1 resolvido antes. Ler `errors` e `network requests` logo depois do toque, no :8082 e no :8092, e testar sem as rotas de aborto se o ambiente permitir
- **Padrão novo:** nada
